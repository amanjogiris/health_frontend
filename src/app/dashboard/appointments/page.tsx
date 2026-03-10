'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { CalendarPlusIcon } from '@phosphor-icons/react/dist/ssr/CalendarPlus';
import { XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import dayjs from 'dayjs';

import type { UserRole } from '@/types/user';
import { useUser } from '@/hooks/use-user';
import type { AppointmentResponse, AppointmentSlotResponse, ClinicResponse, DoctorResponse } from '@/lib/api';
import {
  bookAppointment,
  cancelAppointment,
  getAppointments,
  getClinics,
  getDoctorAppointments,
  getDoctors,
  getPatientAppointments,
  getSlots,
} from '@/lib/api';

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }
> = {
  pending: { label: 'Pending', color: 'warning' },
  cancelled: { label: 'Cancelled', color: 'error' },
};

interface BookForm {
  patient_id: string;
  doctor_id: string;
  slot_id: string;
  reason_for_visit: string;
}

export default function Page(): React.JSX.Element {
  const { user } = useUser();
  const role = user?.role as UserRole | undefined;
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isDoctor = role === 'doctor';
  const isPatient = role === 'patient';

  const [appointments, setAppointments] = React.useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage] = React.useState(10);

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = React.useState<AppointmentResponse | null>(null);
  const [cancelReason, setCancelReason] = React.useState('');
  const [cancelling, setCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  // Book dialog
  const [bookOpen, setBookOpen] = React.useState(false);
  const [booking, setBooking] = React.useState(false);
  const [bookError, setBookError] = React.useState<string | null>(null);
  const [bookForm, setBookForm] = React.useState<BookForm>({ patient_id: '', doctor_id: '', slot_id: '', reason_for_visit: '' });
  const [doctors, setDoctors] = React.useState<DoctorResponse[]>([]);
  const [clinics, setClinics] = React.useState<ClinicResponse[]>([]);
  const [allSlots, setAllSlots] = React.useState<AppointmentSlotResponse[]>([]); // for table id→time lookup
  const [availableSlots, setAvailableSlots] = React.useState<AppointmentSlotResponse[]>([]); // for book dialog
  const [slotsLoading, setSlotsLoading] = React.useState(false);

  const load = React.useCallback((): void => {
    if (!user) return;
    setLoading(true);
    setError(null);
    let fetchFn: Promise<AppointmentResponse[]>;
    if (isPatient) {
      fetchFn = getPatientAppointments(Number(user.id));
    } else if (isDoctor) {
      fetchFn = getDoctorAppointments(0, 100);
    } else {
      fetchFn = getAppointments(0, 100);
    }
    fetchFn
      .then(setAppointments)
      .catch((err: Error) => { setError(err.message); })
      .finally(() => { setLoading(false); });
  }, [user, isPatient, isDoctor]);

  // Load lookup data (doctors, clinics, slots) once so the table can resolve IDs to names
  React.useEffect((): void => {
    void Promise.all([getDoctors(), getClinics(), getSlots()])
      .then(([d, c, s]) => { setDoctors(d); setClinics(c); setAllSlots(s); })
      .catch(() => { /* non-fatal */ });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Lookup helpers
  const doctorName = (id: number): string => {
    const d = doctors.find((x) => x.id === id);
    return d?.doctor_name ?? `Doctor #${id}`;
  };
  const clinicName = (id: number): string => {
    const c = clinics.find((x) => x.id === id);
    return c?.name ?? `Clinic #${id}`;
  };
  const slotTime = (id: number): string => {
    const s = allSlots.find((x) => x.id === id);
    if (!s) return `Slot #${id}`;
    return dayjs(s.start_time).format('MMM D, HH:mm');
  };

  const filtered = appointments.filter((a) => statusFilter === 'all' || a.status === statusFilter);
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // ── Cancel helpers ─────────────────────────────────────────────────────────
  function openCancelDialog(appt: AppointmentResponse): void {
    setCancelTarget(appt);
    setCancelReason('');
    setCancelError(null);
  }

  async function handleCancel(): Promise<void> {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelAppointment(cancelTarget.id, cancelReason || 'Cancelled by user');
      setCancelTarget(null);
      load();
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel.');
    } finally {
      setCancelling(false);
    }
  }

  const canCancel = (appt: AppointmentResponse): boolean =>
    appt.status !== 'cancelled' && (isAdmin || isDoctor || isPatient);

  // ── Book helpers (admin) ────────────────────────────────────────────────────
  function openBookDialog(): void {
    // Pre-fill patient_id automatically when the current user is a patient
    setBookForm({ patient_id: isPatient ? String(user?.id ?? '') : '', doctor_id: '', slot_id: '', reason_for_visit: '' });
    setAvailableSlots([]);
    setBookError(null);
    setBookOpen(true);
    // Pre-load doctors and clinics
    Promise.all([getDoctors(), getClinics()]).then(([d, c]) => {
      setDoctors(d);
      setClinics(c);
    }).catch(() => { /* non-fatal */ });
  }

  function onDoctorChange(doctorId: string): void {
    setBookForm((f) => ({ ...f, doctor_id: doctorId, slot_id: '' }));
    setAvailableSlots([]);
    if (!doctorId) return;
    setSlotsLoading(true);
    getSlots({ doctor_id: Number(doctorId) })
      .then((data) => { setAvailableSlots(data.filter((s) => !s.is_booked && s.is_active)); })
      .catch(() => { /* non-fatal */ })
      .finally(() => { setSlotsLoading(false); });
  }

  function getClinicNameForDoctor(doctorId: string): string {
    const doctor = doctors.find((d) => String(d.id) === doctorId);
    if (!doctor) return '—';
    const clinic = clinics.find((c) => c.id === doctor.clinic_id);
    return clinic ? `${clinic.name} (${clinic.city})` : `Clinic #${doctor.clinic_id}`;
  }

  async function handleBook(): Promise<void> {
    const { patient_id, doctor_id, slot_id } = bookForm;
    if (!patient_id || !doctor_id || !slot_id) {
      setBookError('Patient ID, doctor and slot are required.');
      return;
    }
    const doctor = doctors.find((d) => String(d.id) === doctor_id);
    if (!doctor) { setBookError('Doctor not found.'); return; }

    setBooking(true);
    setBookError(null);
    try {
      await bookAppointment({
        patient_id: Number(patient_id),
        doctor_id: Number(doctor_id),
        clinic_id: doctor.clinic_id,
        slot_id: Number(slot_id),
        reason_for_visit: bookForm.reason_for_visit || undefined,
      });
      setBookOpen(false);
      load();
    } catch (err: unknown) {
      setBookError(err instanceof Error ? err.message : 'Failed to book appointment.');
    } finally {
      setBooking(false);
    }
  }

  const pageTitle = isPatient ? 'My Appointments' : isDoctor ? 'My Patient Appointments' : 'All Appointments';
  const pageSubheader = isPatient
    ? 'Your booked appointments'
    : isDoctor
    ? 'Appointments assigned to you'
    : 'All system appointments (admin view)';

  return (
    <Stack spacing={3}>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
          <Typography variant="h4">{pageTitle}</Typography>
          <Typography color="text.secondary" variant="body2">
            {loading ? 'Loading...' : `${filtered.length} appointment${filtered.length !== 1 ? 's' : ''}`}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <Button
            startIcon={<ArrowClockwiseIcon fontSize="var(--icon-fontSize-md)" />}
            variant="outlined"
            onClick={load}
          >
            Refresh
          </Button>
          {isAdmin || isPatient ? (
            <Button
              startIcon={<CalendarPlusIcon fontSize="var(--icon-fontSize-md)" />}
              variant="contained"
              onClick={openBookDialog}
            >
              {isPatient ? 'Book Appointment' : 'Book Appointment'}
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {/* ── Appointments table ───────────────────────────────────────────── */}
      <Card>
        <CardHeader title={pageTitle} subheader={pageSubheader} />
        <Divider />
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: '900px' }}>
            <TableHead>
              <TableRow>
                <TableCell>#ID</TableCell>
                {isAdmin ? <TableCell>Patient ID</TableCell> : null}
                <TableCell>Doctor</TableCell>
                <TableCell>Clinic</TableCell>
                <TableCell>Slot Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reason for Visit</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Booked On</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Typography variant="body2" color="text.secondary">Loading...</Typography>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Typography variant="body2" color="error">Error: {error}</Typography>
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Typography variant="body2" color="text.secondary">No appointments found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((appt) => {
                  const cfg = statusConfig[appt.status] ?? { label: appt.status, color: 'default' as const };
                  return (
                    <TableRow key={appt.id} hover>
                      <TableCell><Typography variant="subtitle2">#{appt.id}</Typography></TableCell>
                      {isAdmin ? <TableCell>Patient #{appt.patient_id}</TableCell> : null}
                      <TableCell>
                        <Typography variant="body2">{doctorName(appt.doctor_id)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: '140px' }}>{clinicName(appt.clinic_id)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>{slotTime(appt.slot_id)}</Typography>
                      </TableCell>
                      <TableCell><Chip label={cfg.label} color={cfg.color} size="small" /></TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: '180px' }}>
                          {appt.reason_for_visit ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: '140px' }}>
                          {appt.notes ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {appt.created_at ? dayjs(appt.created_at).format('MMM D, YYYY HH:mm') : '—'}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {canCancel(appt) ? (
                            <Tooltip title="Cancel appointment">
                              <IconButton color="error" size="small" onClick={() => { openCancelDialog(appt); }}>
                                <XCircleIcon fontSize="var(--icon-fontSize-md)" />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Box>
        <Divider />
        <TablePagination
          component="div"
          count={filtered.length}
          onPageChange={(_, p) => { setPage(p); }}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10]}
        />
      </Card>

      {/* ── Cancel Appointment Dialog ────────────────────────────────────── */}
      <Dialog
        open={Boolean(cancelTarget)}
        onClose={() => { if (!cancelling) setCancelTarget(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Appointment #{cancelTarget?.id}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {cancelError ? <Typography color="error" variant="body2">{cancelError}</Typography> : null}
            <Typography variant="body2">Are you sure? This action cannot be undone.</Typography>
            <TextField
              label="Cancellation Reason (optional)"
              multiline
              rows={3}
              fullWidth
              value={cancelReason}
              onChange={(e) => { setCancelReason(e.target.value); }}
              disabled={cancelling}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCancelTarget(null); }} disabled={cancelling}>Keep Appointment</Button>
          <Button onClick={() => { void handleCancel(); }} color="error" variant="contained" disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Cancel Appointment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Book Appointment Dialog (admin) ──────────────────────────────── */}
      <Dialog
        open={bookOpen}
        onClose={() => { if (!booking) setBookOpen(false); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Book Appointment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {bookError ? <Typography color="error" variant="body2">{bookError}</Typography> : null}

            {isPatient ? (
              <Alert severity="info" sx={{ py: 0 }}>Booking as Patient #{user?.id}</Alert>
            ) : (
              <TextField
                label="Patient ID"
                required
                fullWidth
                type="number"
                value={bookForm.patient_id}
                onChange={(e) => { setBookForm((f) => ({ ...f, patient_id: e.target.value })); }}
                disabled={booking}
                helperText="Enter the patient's numeric ID"
              />
            )}

            <FormControl fullWidth required disabled={booking}>
              <InputLabel>Doctor</InputLabel>
              <Select
                value={bookForm.doctor_id}
                label="Doctor"
                onChange={(e) => { onDoctorChange(String(e.target.value)); }}
              >
                {doctors.length === 0 ? (
                  <MenuItem value="" disabled>Loading doctors…</MenuItem>
                ) : (
                  doctors.filter((d) => d.is_active).map((d) => (
                    <MenuItem key={d.id} value={String(d.id)}>
                      {d.doctor_name ?? `Doctor #${d.id}`} — {d.specialty}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            {bookForm.doctor_id ? (
              <TextField
                label="Clinic"
                fullWidth
                value={getClinicNameForDoctor(bookForm.doctor_id)}
                InputProps={{ readOnly: true }}
                disabled
              />
            ) : null}

            <FormControl fullWidth required disabled={booking || !bookForm.doctor_id}>
              <InputLabel>Slot</InputLabel>
              <Select
                value={bookForm.slot_id}
                label="Slot"
                onChange={(e) => { setBookForm((f) => ({ ...f, slot_id: String(e.target.value) })); }}
              >
                {slotsLoading ? (
                  <MenuItem value="" disabled>Loading slots…</MenuItem>
                ) : availableSlots.length === 0 ? (
                  <MenuItem value="" disabled>
                    {bookForm.doctor_id ? 'No available slots' : 'Select a doctor first'}
                  </MenuItem>
                ) : (
                  availableSlots.map((s) => (
                    <MenuItem key={s.id} value={String(s.id)}>
                      {dayjs(s.start_time).format('MMM D, YYYY HH:mm')}
                      {' → '}
                      {dayjs(s.end_time).format('HH:mm')}
                      {` (${s.capacity - s.booked_count} left)`}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <TextField
              label="Reason for Visit (optional)"
              multiline
              rows={2}
              fullWidth
              value={bookForm.reason_for_visit}
              onChange={(e) => { setBookForm((f) => ({ ...f, reason_for_visit: e.target.value })); }}
              disabled={booking}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setBookOpen(false); }} disabled={booking}>Cancel</Button>
          <Button onClick={() => { void handleBook(); }} variant="contained" disabled={booking}>
            {booking ? 'Booking…' : 'Book Appointment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
