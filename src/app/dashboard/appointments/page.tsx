'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
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
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { NotePencilIcon } from '@phosphor-icons/react/dist/ssr/NotePencil';
import { XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import dayjs from 'dayjs';

import type { UserRole } from '@/types/user';
import { useUser } from '@/hooks/use-user';
import { utcDateTime } from '@/lib/fmt-time';
import type {
  AppointmentResponse,
  AppointmentSlotResponse,
  ClinicResponse,
  DoctorResponse,
  DynamicAppointmentResponse,
  PaginatedResponse,
  PatientResponse,
} from '@/lib/api';
import {
  bookDynamicSlot,
  cancelDynamicAppointment,
  getDynamicAppointments,
  updateAppointmentNotes,
  getClinics,
  getMyDoctorDynamicAppointments,
  getDoctors,
  getMyDynamicAppointments,
  getMyPatientProfile,
  getPatients,
  getSlots,
} from '@/lib/api';
import { DynamicSlotPicker } from '@/components/dashboard/booking/dynamic-slot-picker';
import type { SelectedBookingSlot } from '@/components/dashboard/booking/dynamic-slot-picker';

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }
> = {
  pending:   { label: 'Pending',   color: 'warning' },
  booked:    { label: 'Booked',    color: 'info' },
  confirmed: { label: 'Confirmed', color: 'primary' },
  cancelled: { label: 'Cancelled', color: 'error' },
  completed: { label: 'Completed', color: 'success' },
  no_show:   { label: 'No Show',   color: 'default' },
  rejected:  { label: 'Rejected',  color: 'error' },
};

interface BookForm {
  patient_id: string;
  doctor_id: string;
  reason_for_visit: string;
}

type UnifiedAppointment = AppointmentResponse & { source: 'dynamic' };

function mapDynamicToUnified(appt: DynamicAppointmentResponse): UnifiedAppointment {
  return {
    id: appt.id,
    patient_id: appt.patient_id,
    doctor_id: appt.doctor_id,
    clinic_id: appt.clinic_id,
    slot_id: 0,
    status: appt.status as AppointmentResponse['status'],
    reason_for_visit: appt.reason_for_visit,
    notes: appt.notes,
    cancelled_at: appt.cancelled_at,
    cancelled_reason: appt.cancelled_reason,
    created_at: appt.created_at,
    slot_time: appt.start_time,
    source: 'dynamic',
  };
}

export default function Page(): React.JSX.Element {
  const { user } = useUser();
  const role = user?.role as UserRole | undefined;
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isDoctor = role === 'doctor';
  const isPatient = role === 'patient';

  const [appointments, setAppointments] = React.useState<UnifiedAppointment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = React.useState<UnifiedAppointment | null>(null);
  const [cancelReason, setCancelReason] = React.useState('');
  const [cancelling, setCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  // Edit notes (prescription) dialog — doctors only
  const [notesTarget, setNotesTarget] = React.useState<UnifiedAppointment | null>(null);
  const [notesText, setNotesText] = React.useState('');
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [notesError, setNotesError] = React.useState<string | null>(null);

  // Book dialog
  const [bookOpen, setBookOpen] = React.useState(false);
  const [booking, setBooking] = React.useState(false);
  const [bookError, setBookError] = React.useState<string | null>(null);
  const [bookForm, setBookForm] = React.useState<BookForm>({ patient_id: '', doctor_id: '', reason_for_visit: '' });
  const [bookSelectedSlot, setBookSelectedSlot] = React.useState<SelectedBookingSlot | null>(null);
  const [doctors, setDoctors] = React.useState<DoctorResponse[]>([]);
  const [clinics, setClinics] = React.useState<ClinicResponse[]>([]);
  const [allSlots, setAllSlots] = React.useState<AppointmentSlotResponse[]>([]); // for table id→time lookup
  const [doctorSearch, setDoctorSearch] = React.useState('');
  // Real patient.id (patients table PK) – needed for correct booking
  const [myPatientId, setMyPatientId] = React.useState<number | null>(null);

  // Fetch real patient profile ID once on mount (patient role only)
  React.useEffect(() => {
    if (isPatient) {
      getMyPatientProfile()
        .then((p) => { setMyPatientId(p.id); })
        .catch(() => { /* non-fatal */ });
    }
  }, [isPatient]);

  // Patient search (for admin/doctor booking)
  const [patientSearch, setPatientSearch] = React.useState('');
  const [patients, setPatients] = React.useState<PatientResponse[]>([]);
  const [patientsLoading, setPatientsLoading] = React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<PatientResponse | null>(null);

  // Success / error snackbar
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const load = React.useCallback((): void => {
    if (!user) return;
    setLoading(true);
    setError(null);
    if (isPatient) {
      getMyDynamicAppointments(0, 1000)
        .then((dynamic) => {
          const dynamicOnly = [...dynamic.map(mapDynamicToUnified)]
            .sort((a, b) => dayjs(b.slot_time ?? b.created_at).valueOf() - dayjs(a.slot_time ?? a.created_at).valueOf());
          setAppointments(dynamicOnly);
          setTotal(dynamicOnly.length);
        })
        .catch((err: Error) => {
          setError(err.message);
        })
        .finally(() => { setLoading(false); });
    } else if (isDoctor) {
      getMyDoctorDynamicAppointments(0, 1000)
        .then((dynamic) => {
          const dynamicOnly = [...dynamic.map(mapDynamicToUnified)]
            .sort((a, b) => dayjs(b.slot_time ?? b.created_at).valueOf() - dayjs(a.slot_time ?? a.created_at).valueOf());
          setAppointments(dynamicOnly);
          setTotal(dynamicOnly.length);
        })
        .catch((err: Error) => {
          setError(err.message);
        })
        .finally(() => { setLoading(false); });
    } else {
      getDynamicAppointments(0, 1000)
        .then((dynamic) => {
          const dynamicOnly = [...dynamic.map(mapDynamicToUnified)]
            .sort((a, b) => dayjs(b.slot_time ?? b.created_at).valueOf() - dayjs(a.slot_time ?? a.created_at).valueOf());
          setAppointments(dynamicOnly);
          setTotal(dynamicOnly.length);
        })
        .catch((err: Error) => {
          setError(err.message);
        })
        .finally(() => { setLoading(false); });
    }
  }, [user, isPatient, isDoctor]);

  // Load lookup data (doctors, clinics, slots) once so the table can resolve IDs to names
  React.useEffect((): void => {
    void Promise.all([getDoctors({ skip: 0, limit: 200 }), getClinics({ skip: 0, limit: 200 }), getSlots({ limit: 1000, include_all: true })])
      .then(([d, c, s]) => { setDoctors(d.items); setClinics(c.items); setAllSlots(s); })
      .catch(() => { /* non-fatal */ });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Lookup helpers — prefer enriched fields returned by the backend, fall back to local arrays
  const doctorName = (appt: UnifiedAppointment): string => {
    if (appt.doctor_name) return appt.doctor_name;
    const d = doctors.find((x) => x.id === appt.doctor_id);
    return d?.doctor_name ?? `Doctor #${appt.doctor_id}`;
  };
  const clinicName = (appt: UnifiedAppointment): string => {
    if (appt.clinic_name) return appt.clinic_name;
    const c = clinics.find((x) => x.id === appt.clinic_id);
    return c?.name ?? `Clinic #${appt.clinic_id}`;
  };
  const slotTime = (appt: UnifiedAppointment): string => {
    // Use UTC formatter so dynamic-slot times match the doctor's configured hours.
    if (appt.slot_time) return utcDateTime(appt.slot_time);
    const s = allSlots.find((x) => x.id === appt.slot_id);
    if (!s) return `Slot #${appt.slot_id}`;
    return utcDateTime(s.start_time);
  };

  // For patient/doctor views: filter and paginate client-side.
  // For admin view: the server already returns the correct page.
  const clientFiltered = appointments.filter((a) => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesStatus;
    const matchesSearch =
      (a.patient_name ?? `Patient #${a.patient_id}`).toLowerCase().includes(q) ||
      doctorName(a).toLowerCase().includes(q) ||
      clinicName(a).toLowerCase().includes(q) ||
      (a.reason_for_visit ?? '').toLowerCase().includes(q) ||
      (a.notes ?? '').toLowerCase().includes(q) ||
      (a.cancelled_reason ?? '').toLowerCase().includes(q) ||
      slotTime(a).toLowerCase().includes(q) ||
      a.status.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });
  const paginated = clientFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const paginationCount = clientFiltered.length;

  // ── Cancel helpers ─────────────────────────────────────────────────────────
  function openCancelDialog(appt: UnifiedAppointment): void {
    setCancelTarget(appt);
    setCancelReason('');
    setCancelError(null);
  }

  async function handleCancel(): Promise<void> {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelDynamicAppointment(cancelTarget.id, cancelReason || 'Cancelled by user');
      setCancelTarget(null);
      load();
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel.');
    } finally {
      setCancelling(false);
    }
  }

  const canCancel = (appt: UnifiedAppointment): boolean =>
    appt.status !== 'cancelled' && (isAdmin || isDoctor || isPatient);

  // ── Notes / Prescription helpers (doctor / admin) ──────────────────────────
  function openNotesDialog(appt: UnifiedAppointment): void {
    setNotesTarget(appt);
    setNotesText(appt.notes ?? '');
    setNotesError(null);
  }

  async function handleSaveNotes(): Promise<void> {
    if (!notesTarget) return;
    setSavingNotes(true);
    setNotesError(null);
    try {
      await updateAppointmentNotes(notesTarget.id, notesText);
      setNotesTarget(null);
      load();
      setSnackbar({ open: true, message: 'Prescription / notes saved.', severity: 'success' });
    } catch (err: unknown) {
      setNotesError(err instanceof Error ? err.message : 'Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  }

  // ── Book helpers (admin) ────────────────────────────────────────────────────
  function openBookDialog(): void {
    // Use the real patients-table ID (myPatientId), not user.id, to ensure
    // the booking links to the correct patient record.
    setBookForm({ patient_id: isPatient ? String(myPatientId ?? '') : '', doctor_id: '', reason_for_visit: '' });
    setBookSelectedSlot(null);
    setDoctorSearch('');
    setPatientSearch('');
    setSelectedPatient(null);
    setBookError(null);
    setBookOpen(true);
    const fetches: Promise<unknown>[] = [getDoctors({ skip: 0, limit: 200 }), getClinics({ skip: 0, limit: 200 })];
    if (!isPatient) {
      setPatientsLoading(true);
      fetches.push(
        getPatients(0, 100)
          .then((result) => { setPatients(result.items); })
          .catch(() => { /* non-fatal */ })
          .finally(() => { setPatientsLoading(false); })
      );
    }
    Promise.all(fetches.slice(0, 2)).then(([d, c]) => {
      setDoctors((d as PaginatedResponse<DoctorResponse>).items);
      setClinics((c as PaginatedResponse<ClinicResponse>).items);
    }).catch(() => { /* non-fatal */ });
  }

  function onDoctorChange(doctorId: string): void {
    setBookForm((f) => ({ ...f, doctor_id: doctorId }));
    setBookSelectedSlot(null);
  }

  function getClinicNameForDoctor(doctorId: string): string {
    const doctor = doctors.find((d) => String(d.id) === doctorId);
    if (!doctor) return '—';
    const clinic = clinics.find((c) => c.id === doctor.clinic_id);
    return clinic ? `${clinic.name} (${clinic.city})` : `Clinic #${doctor.clinic_id}`;
  }

  async function handleBook(): Promise<void> {
    const { patient_id, doctor_id } = bookForm;
    if (!patient_id || !doctor_id || !bookSelectedSlot) {
      setBookError('Patient, doctor and a time slot are required.');
      return;
    }
    const doctor = doctors.find((d) => String(d.id) === doctor_id);
    if (!doctor) { setBookError('Doctor not found.'); return; }

    setBooking(true);
    setBookError(null);
    try {
      console.log('Booking dynamic slot:', {
        patient_id: Number(patient_id),
        doctor_id: Number(doctor_id),
        clinic_id: doctor.clinic_id,
        start_time: bookSelectedSlot.start_time,
        reason_for_visit: bookForm.reason_for_visit,
      });
      const result = await bookDynamicSlot({
        patient_id: Number(patient_id),
        doctor_id: Number(doctor_id),
        clinic_id: doctor.clinic_id,
        start_time: bookSelectedSlot.start_time,
        slots_requested: 1,
        reason_for_visit: bookForm.reason_for_visit || undefined,
      });
      console.log('Booking result:', result);
      setBookOpen(false);
      setSnackbar({ open: true, message: 'Appointment booked successfully.', severity: 'success' });
      // Give the server a moment to persist, then reload
      setTimeout(() => { load(); }, 500);
    } catch (err: unknown) {
      console.error('Booking error:', err);
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
            {loading ? 'Loading...' : `${paginationCount} appointment${paginationCount !== 1 ? 's' : ''}`}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search patient, doctor, clinic…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            sx={{ minWidth: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="booked">Booked</MenuItem>
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
                {isAdmin ? <TableCell>Patient</TableCell> : null}
                <TableCell>{isDoctor ? 'Patient' : 'Doctor'}</TableCell>
                {!isDoctor ? <TableCell>Clinic</TableCell> : null}
                <TableCell>Slot Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reason for Visit</TableCell>
                <TableCell>Notes / Reason</TableCell>
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
                    <TableRow key={`${appt.source}-${appt.id}`} hover>
                      {isAdmin ? (
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {appt.patient_name ?? `Patient #${appt.patient_id}`}
                          </Typography>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Typography variant="body2">
                          {isDoctor
                            ? (appt.patient_name ?? `Patient #${appt.patient_id}`)
                            : doctorName(appt)}
                        </Typography>
                      </TableCell>
                      {!isDoctor ? (
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: '140px' }}>{clinicName(appt)}</Typography>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Typography variant="body2" noWrap>{slotTime(appt)}</Typography>
                      </TableCell>
                      <TableCell><Chip label={cfg.label} color={cfg.color} size="small" /></TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: '180px' }}>
                          {appt.reason_for_visit ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: '200px' }}>
                          {appt.notes ?? appt.cancelled_reason ?? '—'}
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
          count={paginationCount}
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

      {/* ── Edit Prescription / Notes Dialog (doctor / admin) ──────────────── */}
      <Dialog
        open={Boolean(notesTarget)}
        onClose={() => { if (!savingNotes) setNotesTarget(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Prescription / Notes — Appointment #{notesTarget?.id}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {notesTarget ? (
              <Typography variant="body2" color="text.secondary">
                Patient: <strong>{notesTarget.patient_name ?? `Patient #${notesTarget.patient_id}`}</strong>
              </Typography>
            ) : null}
            {notesError ? <Typography color="error" variant="body2">{notesError}</Typography> : null}
            <TextField
              label="Prescription / Notes"
              multiline
              rows={6}
              fullWidth
              placeholder="Enter prescription details, medication, follow-up instructions…"
              value={notesText}
              onChange={(e) => { setNotesText(e.target.value); }}
              disabled={savingNotes}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setNotesTarget(null); }} disabled={savingNotes}>Cancel</Button>
          <Button onClick={() => { void handleSaveNotes(); }} variant="contained" disabled={savingNotes}>
            {savingNotes ? 'Saving…' : 'Save Prescription'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Book Appointment Dialog ───────────────────────────────────────── */}
      <Dialog
        open={bookOpen}
        onClose={() => { if (!booking) setBookOpen(false); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Book Appointment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {bookError ? <Typography color="error" variant="body2">{bookError}</Typography> : null}

            {!isPatient ? (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Patient *</Typography>
                <TextField
                  label="Search by name, email or phone"
                  fullWidth
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatient(null); setBookForm((f) => ({ ...f, patient_id: '' })); }}
                  disabled={booking}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {patientsLoading ? <CircularProgress size={16} /> : <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />}
                      </InputAdornment>
                    ),
                  }}
                  helperText={selectedPatient ? undefined : 'Type to search then click a patient to select'}
                />

                {/* search results */}
                {!selectedPatient && patientSearch.trim().length > 0 ? (() => {
                  const q = patientSearch.trim().toLowerCase();
                  const matched = patients.filter((p) =>
                    (p.patient_name ?? '').toLowerCase().includes(q) ||
                    (p.email ?? '').toLowerCase().includes(q) ||
                    (p.mobile_no ?? '').toLowerCase().includes(q)
                  );
                  if (patientsLoading) return null;
                  if (matched.length === 0) {
                    return (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        No patients match "{patientSearch}".
                      </Typography>
                    );
                  }
                  return (
                    <Box
                      sx={{
                        mt: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1,
                        maxHeight: 220, overflowY: 'auto',
                      }}
                    >
                      {matched.slice(0, 20).map((p) => (
                        <Box
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p);
                            setBookForm((f) => ({ ...f, patient_id: String(p.id) }));
                            setPatientSearch(p.patient_name ?? String(p.id));
                          }}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            px: 1.5, py: 1, cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                            borderBottom: '1px solid', borderColor: 'divider',
                            '&:last-child': { borderBottom: 'none' },
                          }}
                        >
                          <Avatar sx={{ width: 32, height: 32, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                            {(p.patient_name ?? '#')[0].toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {p.patient_name ?? `Patient #${p.id}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {[p.email, p.mobile_no].filter(Boolean).join(' · ')}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">ID #{p.id}</Typography>
                        </Box>
                      ))}
                    </Box>
                  );
                })() : null}

                {/* selected patient details card */}
                {selectedPatient ? (
                  <Box
                    sx={{
                      mt: 1, p: 1.5, border: '2px solid', borderColor: 'primary.main',
                      borderRadius: 1, bgcolor: 'primary.50',
                      display: 'flex', alignItems: 'flex-start', gap: 1.5,
                    }}
                  >
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                      {(selectedPatient.patient_name ?? '#')[0].toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700}>
                        {selectedPatient.patient_name ?? `Patient #${selectedPatient.id}`}
                      </Typography>
                      {selectedPatient.email ? (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {selectedPatient.email}
                        </Typography>
                      ) : null}
                      {selectedPatient.mobile_no ? (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {selectedPatient.mobile_no}
                        </Typography>
                      ) : null}
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                        {selectedPatient.blood_group ? (
                          <Chip label={`Blood: ${selectedPatient.blood_group}`} size="small" color="error" variant="outlined" />
                        ) : null}
                        {selectedPatient.date_of_birth ? (
                          <Chip label={`DOB: ${dayjs(selectedPatient.date_of_birth).format('MMM D, YYYY')}`} size="small" variant="outlined" />
                        ) : null}
                        <Chip label={`ID #${selectedPatient.id}`} size="small" color="primary" />
                      </Stack>
                    </Box>
                    <Button size="small" onClick={() => { setSelectedPatient(null); setBookForm((f) => ({ ...f, patient_id: '' })); setPatientSearch(''); }}>
                      Change
                    </Button>
                  </Box>
                ) : null}
              </Box>
            ) : null}

            {/* ── Doctor search ───────────────────────────────────────────── */}
            <TextField
              label="Search doctor by name or specialty"
              fullWidth
              value={doctorSearch}
              onChange={(e) => { setDoctorSearch(e.target.value); }}
              disabled={booking}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
                  </InputAdornment>
                ),
              }}
            />

            {(() => {
              const q = doctorSearch.trim().toLowerCase();
              const matched = doctors.filter((d) => d.is_active && (
                q === '' ||
                (d.doctor_name ?? '').toLowerCase().includes(q) ||
                d.specialty.toLowerCase().includes(q)
              ));
              if (matched.length === 0 && q !== '') {
                return <Typography variant="body2" color="text.secondary">No doctors match "{doctorSearch}".</Typography>;
              }
              return (
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  gap={1}
                  sx={{ maxHeight: 130, overflowY: 'auto', p: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                >
                  {matched.map((d) => {
                    const selected = bookForm.doctor_id === String(d.id);
                    return (
                      <Chip
                        key={d.id}
                        label={`${d.doctor_name ?? `Doctor #${d.id}`} — ${d.specialty}`}
                        onClick={() => { onDoctorChange(String(d.id)); }}
                        color={selected ? 'primary' : 'default'}
                        variant={selected ? 'filled' : 'outlined'}
                        disabled={booking}
                        size="small"
                      />
                    );
                  })}
                </Stack>
              );
            })()}

            {bookForm.doctor_id ? (
              <TextField
                label="Clinic"
                fullWidth
                value={getClinicNameForDoctor(bookForm.doctor_id)}
                InputProps={{ readOnly: true }}
                disabled
              />
            ) : null}

            {/* ── Dynamic calendar slot picker ──────────────────────────── */}
            {bookForm.doctor_id ? (
              <DynamicSlotPicker
                doctorId={Number(bookForm.doctor_id)}
                onSlotChange={(slot) => { setBookSelectedSlot(slot); }}
              />
            ) : null}

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
          <Button onClick={() => { void handleBook(); }} variant="contained" disabled={booking || !bookForm.doctor_id || !bookSelectedSlot}>
            {booking ? 'Booking…' : 'Book Appointment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Success / Error Snackbar ───────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => { setSnackbar((s) => ({ ...s, open: false })); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => { setSnackbar((s) => ({ ...s, open: false })); }}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
