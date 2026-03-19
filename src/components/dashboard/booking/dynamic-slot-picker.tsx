'use client';
/**
 * DynamicSlotPicker – embeddable calendar + slot-chips panel.
 *
 * Used inside dialogs where the doctor is already selected (e.g. admin
 * appointment booking).  Renders a DateCalendar and, once a date is clicked,
 * fetches and shows dynamic slot chips.  Calls `onSlotChange` whenever the
 * selection changes (null when nothing is selected yet).
 */
import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import dayjs, { type Dayjs } from 'dayjs';

import { utcTime } from '@/lib/fmt-time';

import type { AvailabilityResponse, DoctorSlotsResponse, DynamicSlotItem } from '@/lib/api';
import { getDoctorAvailability } from '@/lib/api';

function backendDowToDayjs(dow: number): number {
  return (dow + 1) % 7;
}

// ── helpers ────────────────────────────────────────────────────────────────────
/** Display slot times in UTC so they match the doctor's configured availability hours. */
const fmtTime = utcTime;

// ── Component ──────────────────────────────────────────────────────────────────

export interface SelectedBookingSlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

interface DynamicSlotPickerProps {
  /** Doctor whose dynamic-slot endpoint to call */
  doctorId: number;
  /** Called whenever the patient selects (or deselects) a slot */
  onSlotChange: (slot: SelectedBookingSlot | null) => void;
}

export function DynamicSlotPicker({ doctorId, onSlotChange }: DynamicSlotPickerProps): React.JSX.Element {
  const [availability, setAvailability] = React.useState<AvailabilityResponse[]>([]);
  const [availLoading, setAvailLoading] = React.useState(true);

  const [selectedDate, setSelectedDate] = React.useState<Dayjs | null>(null);
  const [slotsData, setSlotsData] = React.useState<DoctorSlotsResponse | null>(null);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [slotsError, setSlotsError] = React.useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<DynamicSlotItem | null>(null);

  // Re-fetch availability whenever doctorId changes
  React.useEffect(() => {
    setAvailLoading(true);
    setSelectedDate(null);
    setSlotsData(null);
    setSelectedSlot(null);
    onSlotChange(null);
    getDoctorAvailability(doctorId)
      .then(setAvailability)
      .catch(() => setAvailability([]))
      .finally(() => setAvailLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  const availableDayjsDows = React.useMemo<Set<number>>(
    () => new Set(availability.map((a) => backendDowToDayjs(a.day_of_week))),
    [availability],
  );

  // Fetch slots when date changes
  React.useEffect(() => {
    if (!selectedDate) return;
    setSlotsData(null);
    setSlotsError(null);
    setSelectedSlot(null);
    onSlotChange(null);
    setSlotsLoading(true);

    const dateStr = selectedDate.format('YYYY-MM-DD');
    const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
    const url = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/doctors/${doctorId}/dynamic-slots?date=${dateStr}&only_available=false`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, doctorId]);

  function shouldDisableDate(day: Dayjs): boolean {
    if (day.isBefore(dayjs(), 'day')) return true;
    if (availableDayjsDows.size > 0 && !availableDayjsDows.has(day.day())) return true;
    return false;
  }

  function selectSlot(slot: DynamicSlotItem): void {
    setSelectedSlot(slot);
    onSlotChange({ start_time: slot.start_time, end_time: slot.end_time, duration_minutes: slot.duration_minutes });
  }

  const matchingAvail = selectedDate
    ? availability.find((a) => backendDowToDayjs(a.day_of_week) === selectedDate.day())
    : null;

  if (availLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (availability.length === 0) {
    return (
      <Alert severity="info">
        This doctor has no availability configured. An admin must set their working hours first.
      </Alert>
    );
  }

  return (
    <Stack>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        divider={<Divider orientation="vertical" flexItem />}
        spacing={0}
      >
        {/* Calendar */}
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

        {/* Slot panel */}
        <Box sx={{ flex: 1, minWidth: 0, p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <CalendarBlankIcon size={16} />
            <Typography variant="subtitle2" fontWeight={600}>
              {selectedDate ? selectedDate.format('ddd, MMM D, YYYY') : 'Pick a date'}
            </Typography>
          </Stack>

          {matchingAvail && selectedDate ? (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5 }}>
              <ClockIcon size={13} />
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
                p: 3,
                textAlign: 'center',
              }}
            >
              <CalendarBlankIcon size={28} style={{ opacity: 0.25 }} />
              <Typography color="text.secondary" variant="caption" display="block" sx={{ mt: 0.5 }}>
                Click a highlighted date
              </Typography>
            </Box>
          ) : slotsLoading ? (
            <Stack spacing={0.75}>
              {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={32} />)}
            </Stack>
          ) : slotsError ? (
            <Alert severity="error" sx={{ mt: 1 }}>{slotsError}</Alert>
          ) : slotsData && slotsData.slots.filter((s) => s.is_available).length === 0 ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              All slots on this date are booked. Choose another day.
            </Alert>
          ) : slotsData ? (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {slotsData.available_slots} / {slotsData.total_slots} available
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, maxHeight: 200, overflowY: 'auto' }}>
                {slotsData.slots.map((slot) => {
                  const isSelected = selectedSlot?.start_time === slot.start_time;
                  return (
                    <Tooltip
                      key={slot.start_time}
                      title={slot.is_available ? '' : 'Already booked'}
                      disableHoverListener={slot.is_available}
                    >
                      <span>
                        <Chip
                          label={fmtTime(slot.start_time)}
                          clickable={slot.is_available}
                          disabled={!slot.is_available}
                          onClick={slot.is_available ? () => { selectSlot(slot); } : undefined}
                          variant={isSelected ? 'filled' : 'outlined'}
                          color={isSelected ? 'primary' : slot.is_available ? 'success' : 'default'}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </span>
                    </Tooltip>
                  );
                })}
              </Box>
              {selectedSlot ? (
                <Box
                  sx={{
                    mt: 1.5,
                    px: 1.5,
                    py: 1,
                    bgcolor: 'primary.50',
                    border: '1px solid',
                    borderColor: 'primary.200',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" fontWeight={600} color="primary.main">
                    ✓ {selectedDate?.format('MMM D')} · {fmtTime(selectedSlot.start_time)} → {fmtTime(selectedSlot.end_time)}
                  </Typography>
                </Box>
              ) : null}
            </>
          ) : null}
        </Box>
      </Stack>
    </Stack>
  );
}
