'use client';
/**
 * Shared dynamic-slot booking dialog.
 *
 * Used in:
 *   - /dashboard/book      – patient self-service doctor grid
 *   - /dashboard/doctors   – patients click "Book" on a doctor row
 *   - /dashboard/appointments – admin books on behalf of a patient
 *
 * Props:
 *   doctor     – the doctor to book with (DoctorResponse)
 *   open       – controls dialog visibility
 *   patientId  – the patient ID to book for;
 *                defaults to the currently-logged-in user's id (patient self-booking)
 *   onClose()  – called when the user dismisses
 *   onBooked() – called after a successful booking
 */
import * as React from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import dayjs, { type Dayjs } from 'dayjs';
import { utcTime } from '@/lib/fmt-time';

import { useUser } from '@/hooks/use-user';
import type { AvailabilityResponse, DoctorResponse, DoctorSlotsResponse, DynamicSlotItem } from '@/lib/api';
import { bookDynamicSlot } from '@/lib/api';

// ── helpers ────────────────────────────────────────────────────────────────────

/** Convert backend day_of_week (0=Monday) → dayjs .day() (0=Sunday). */
function backendDowToDayjs(dow: number): number {
  return (dow + 1) % 7;
}

function doctorInitials(name?: string): string {
  if (!name) return 'Dr';
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

/** Display slot times in UTC so they match the doctor's configured availability hours. */
const fmtTime = utcTime;

// ── Component ──────────────────────────────────────────────────────────────────

interface BookingDialogProps {
  doctor: DoctorResponse;
  open: boolean;
  /** Patient to book for. If omitted, defaults to the logged-in user's id. */
  patientId?: number;
  onClose: () => void;
  onBooked: () => void;
}

export function BookingDialog({
  doctor,
  open,
  patientId: patientIdProp,
  onClose,
  onBooked,
}: BookingDialogProps): React.JSX.Element {
  const { user } = useUser();
  const resolvedPatientId = patientIdProp ?? Number(user?.id);

  const [selectedDate, setSelectedDate] = React.useState<Dayjs | null>(null);
  const [availability, setAvailability] = React.useState<AvailabilityResponse[]>([]);
  const [availLoading, setAvailLoading] = React.useState(true);

  const [slotsData, setSlotsData] = React.useState<DoctorSlotsResponse | null>(null);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [slotsError, setSlotsError] = React.useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<DynamicSlotItem | null>(null);

  const [reason, setReason] = React.useState('');
  const [booking, setBooking] = React.useState(false);
  const [bookError, setBookError] = React.useState<string | null>(null);

  // Days this doctor is available (as dayjs .day() numbers, 0=Sunday)
  const availableDayjsDows = React.useMemo<Set<number>>(
    () => new Set(availability.map((a) => backendDowToDayjs(a.day_of_week))),
    [availability],
  );

  // Reset & fetch availability every time the dialog opens for a (possibly new) doctor
  React.useEffect(() => {
    if (!open) return;
    setSelectedDate(null);
    setSlotsData(null);
    setSlotsError(null);
    setSelectedSlot(null);
    setReason('');
    setBookError(null);
    setAvailLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
    const url = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/doctors/${doctor.id}/availability?_ts=${Date.now()}`;
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Failed to load availability' }));
          throw new Error((err as { detail?: string }).detail ?? 'Failed to load availability');
        }
        return res.json() as Promise<AvailabilityResponse[]>;
      })
      .then(setAvailability)
      .catch(() => setAvailability([]))
      .finally(() => setAvailLoading(false));
  }, [open, doctor.id]);

  // Fetch dynamic slots whenever the selected date changes
  React.useEffect(() => {
    if (!selectedDate) return;
    setSlotsData(null);
    setSlotsError(null);
    setSelectedSlot(null);
    setSlotsLoading(true);

    const dateStr = selectedDate.format('YYYY-MM-DD');
    const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
    const url = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/doctors/${doctor.id}/dynamic-slots?date=${dateStr}&only_available=false&_ts=${Date.now()}`;
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Failed to load slots' }));
          throw new Error((err as { detail?: string }).detail ?? 'Failed to load slots');
        }
        return res.json() as Promise<DoctorSlotsResponse>;
      })
      .then(setSlotsData)
      .catch((e: Error) => setSlotsError(e.message))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, doctor.id]);

  function shouldDisableDate(day: Dayjs): boolean {
    if (day.isBefore(dayjs(), 'day')) return true;
    if (availableDayjsDows.size > 0 && !availableDayjsDows.has(day.day())) return true;
    return false;
  }

  async function handleBook(): Promise<void> {
    if (!selectedSlot || !selectedDate || !resolvedPatientId) return;
    setBooking(true);
    setBookError(null);
    try {
      await bookDynamicSlot({
        doctor_id: doctor.id,
        patient_id: resolvedPatientId,
        clinic_id: doctor.clinic_id,
        start_time: selectedSlot.start_time,
        slots_requested: 1,
        reason_for_visit: reason.trim() || undefined,
      });
      onBooked();
    } catch (e: unknown) {
      setBookError(e instanceof Error ? e.message : 'Booking failed.');
    } finally {
      setBooking(false);
    }
  }

  const matchingAvail = selectedDate
    ? availability.find((a) => backendDowToDayjs(a.day_of_week) === selectedDate.day())
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      {/* Header */}
      <DialogTitle sx={{ pb: 0, pt: 2.5, px: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontSize: 14, fontWeight: 700 }}>
              {doctorInitials(doctor.doctor_name)}
            </Avatar>
            <Box>
              <Typography variant="h6" lineHeight={1.2}>
                {doctor.doctor_name ?? `Doctor #${doctor.id}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {doctor.specialty}
                {doctor.clinic_name ? ` · ${doctor.clinic_name}` : ''}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <XIcon size={18} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Divider sx={{ mt: 2 }} />

        {availLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : availability.length === 0 ? (
          <Box sx={{ p: 4 }}>
            <Alert severity="info">
              This doctor has no availability configured yet. Please check back later.
            </Alert>
          </Box>
        ) : (
          <Stack direction={{ xs: 'column', md: 'row' }} divider={<Divider orientation="vertical" flexItem />}>
            {/* Left: Calendar */}
            <Box sx={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', p: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateCalendar
                  value={selectedDate}
                  onChange={(d) => { setSelectedDate(d); }}
                  shouldDisableDate={shouldDisableDate}
                  disablePast
                  sx={{
                    '& .MuiPickersDay-root.Mui-disabled': { opacity: 0.35 },
                    '& .MuiPickersDay-root:not(.Mui-disabled)': { fontWeight: 600 },
                  }}
                />
              </LocalizationProvider>
            </Box>

            {/* Right: Slots + form */}
            <Box sx={{ flex: 1, minWidth: 0, p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <CalendarBlankIcon size={18} />
                <Typography variant="subtitle1" fontWeight={600}>
                  {selectedDate
                    ? selectedDate.format('dddd, MMMM D, YYYY')
                    : 'Select a date on the calendar'}
                </Typography>
              </Stack>

              {matchingAvail && selectedDate ? (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 2 }}>
                  <ClockIcon size={14} />
                  <Typography variant="caption" color="text.secondary">
                    {matchingAvail.start_time} – {matchingAvail.end_time}
                    {' · '}
                    {matchingAvail.slot_interval ?? 15} min slots
                  </Typography>
                </Stack>
              ) : null}

              {!selectedDate ? (
                <Box
                  sx={{
                    border: '1.5px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                  }}
                >
                  <CalendarBlankIcon size={36} style={{ opacity: 0.3 }} />
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    Click a highlighted date to see available time slots
                  </Typography>
                </Box>
              ) : slotsLoading ? (
                <Stack spacing={1}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rounded" height={36} />
                  ))}
                </Stack>
              ) : slotsError ? (
                <Alert severity="error">{slotsError}</Alert>
              ) : slotsData ? (() => {
                  // Slots are stored as "IST time in UTC field" (e.g. 10:00Z means 10:00 AM IST).
                  // To correctly detect past slots we shift now forward by the IST offset (+5:30)
                  // so it lives in the same coordinate space as the stored slot times.
                  const IST_OFFSET_MINUTES = 330; // UTC+5:30
                  const now = dayjs().add(IST_OFFSET_MINUTES, 'minute');
                  const visibleSlots = slotsData.slots.filter((s) => !dayjs(s.start_time).isBefore(now));
                  const visibleAvailable = visibleSlots.filter((s) => s.is_available).length;

                  if (visibleSlots.length === 0) {
                    return (
                      <Alert severity="warning">
                        No more slots available for today. Please choose another day.
                      </Alert>
                    );
                  }

                  if (visibleAvailable === 0) {
                    return (
                      <Alert severity="warning">
                        All remaining slots on this date are fully booked. Please choose another day.
                      </Alert>
                    );
                  }

                  return (
                    <>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        {visibleAvailable} of {visibleSlots.length} remaining slots available
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 1,
                          mb: 3,
                          maxHeight: 180,
                          overflowY: 'auto',
                          pr: 0.5,
                        }}
                      >
                        {visibleSlots.map((slot) => {
                          const isSelected = selectedSlot?.start_time === slot.start_time;
                          const isDisabled = !slot.is_available;
                          const tooltipTitle = !slot.is_available ? 'Already booked' : '';
                          return (
                            <Tooltip
                              key={slot.start_time}
                              title={tooltipTitle}
                              disableHoverListener={!isDisabled}
                            >
                              <span>
                                <Chip
                                  label={fmtTime(slot.start_time)}
                                  clickable={!isDisabled}
                                  disabled={isDisabled}
                                  onClick={
                                    !isDisabled
                                      ? () => { setSelectedSlot(slot); setBookError(null); }
                                      : undefined
                                  }
                                  variant={isSelected ? 'filled' : 'outlined'}
                                  color={isSelected ? 'primary' : !isDisabled ? 'success' : 'default'}
                                  size="medium"
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: '0.8rem',
                                    ...(isSelected && { boxShadow: '0 0 0 3px rgba(99,102,241,0.25)' }),
                                  }}
                                />
                              </span>
                            </Tooltip>
                          );
                        })}
                      </Box>

                      {selectedSlot ? (
                        <Box
                          sx={{
                            bgcolor: 'primary.50',
                            border: '1px solid',
                            borderColor: 'primary.200',
                            borderRadius: 2,
                            p: 1.5,
                            mb: 2,
                          }}
                        >
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            Selected: {selectedDate.format('MMM D')} at {fmtTime(selectedSlot.start_time)}
                            {' → '}
                            {fmtTime(selectedSlot.end_time)}
                          </Typography>
                        </Box>
                      ) : null}

                      <TextField
                        label="Reason for visit (optional)"
                        placeholder="e.g. Annual checkup, follow-up, consultation…"
                        fullWidth
                        multiline
                        minRows={2}
                        size="small"
                        value={reason}
                        onChange={(e) => { setReason(e.target.value); }}
                        sx={{ mb: 2 }}
                        disabled={!selectedSlot}
                      />

                      {bookError ? <Alert severity="error" sx={{ mb: 2 }}>{bookError}</Alert> : null}

                      <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={!selectedSlot || booking}
                        onClick={() => { void handleBook(); }}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                      >
                        {booking ? (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CircularProgress size={16} color="inherit" />
                            <span>Booking…</span>
                          </Stack>
                        ) : selectedSlot ? (
                          `Confirm Booking · ${selectedDate.format('MMM D')} at ${fmtTime(selectedSlot.start_time)}`
                        ) : (
                          'Select a time slot above'
                        )}
                      </Button>
                    </>
                  );
                })() : null}
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
