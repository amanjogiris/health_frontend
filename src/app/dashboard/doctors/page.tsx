'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
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
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
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
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { MinusCircleIcon } from '@phosphor-icons/react/dist/ssr/MinusCircle';
import { CalendarPlusIcon } from '@phosphor-icons/react/dist/ssr/CalendarPlus';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { StethoscopeIcon } from '@phosphor-icons/react/dist/ssr/Stethoscope';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import dayjs from 'dayjs';

import type { UserRole } from '@/types/user';
import { useUser } from '@/hooks/use-user';
import { useDebounce } from '@/hooks/use-debounce';
import type { AppointmentSlotResponse, AvailabilityInput, ClinicResponse, DoctorResponse } from '@/lib/api';
import { bookAppointment, deleteDoctor, getClinics, getDoctors, getSlots, registerDoctor, updateDoctor } from '@/lib/api';

const DOW_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface AvailabilityRow {
  day_of_week: string; // stored as string for <Select>
  start_time: string;
  end_time: string;
}

interface RegisterDoctorForm {
  name: string;
  email: string;
  password: string;
  mobile_no: string;
  clinic_id: string;
  specialty: string;
  license_number: string;
  qualifications: string;
  experience_years: string;
  max_patients_per_day: string;
  consultation_duration_minutes: string;
}

const BLANK_FORM: RegisterDoctorForm = {
  name: '',
  email: '',
  password: '',
  mobile_no: '',
  clinic_id: '',
  specialty: '',
  license_number: '',
  qualifications: '',
  experience_years: '0',
  max_patients_per_day: '20',
  consultation_duration_minutes: '15',
};

const BLANK_AVAIL: AvailabilityRow = { day_of_week: '0', start_time: '09:00', end_time: '17:00' };

export default function Page(): React.JSX.Element {
  const { user } = useUser();
  const role = user?.role as UserRole | undefined;
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isPatient = role === 'patient';

  const [doctors, setDoctors] = React.useState<DoctorResponse[]>([]);
  const [clinics, setClinics] = React.useState<ClinicResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage] = React.useState(10);
  const [total, setTotal] = React.useState(0);

  // Debounce search so the API is only called after the user stops typing (400 ms)
  const debouncedSearch = useDebounce(search, 400);

  // Success / info snackbar
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Create dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<RegisterDoctorForm>(BLANK_FORM);
  const [availRows, setAvailRows] = React.useState<AvailabilityRow[]>([]);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = React.useState<DoctorResponse | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = React.useState<DoctorResponse | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState({ name: '', email: '', mobile_no: '', license_number: '', specialty: '', qualifications: '', experience_years: '0', max_patients_per_day: '20', consultation_duration_minutes: '15', clinic_id: '' });

  // Patient book-from-doctor dialog
  const [bookTarget, setBookTarget] = React.useState<DoctorResponse | null>(null);
  const [bookSlots, setBookSlots] = React.useState<AppointmentSlotResponse[]>([]);
  const [bookSlotId, setBookSlotId] = React.useState('');
  const [bookReason, setBookReason] = React.useState('');
  const [bookSlotsLoading, setBookSlotsLoading] = React.useState(false);
  const [bookingInProgress, setBookingInProgress] = React.useState(false);
  const [bookError, setBookError] = React.useState<string | null>(null);

  const loadDoctors = React.useCallback((): void => {
    setLoading(true);
    getDoctors({ skip: page * rowsPerPage, limit: rowsPerPage, search: debouncedSearch || undefined })
      .then((result) => { setDoctors(result.items); setTotal(result.total); })
      .catch((err: Error) => { setError(err.message); })
      .finally(() => { setLoading(false); });
  }, [page, rowsPerPage, debouncedSearch]);

  React.useEffect(() => { loadDoctors(); }, [loadDoctors]);

  function openCreateDialog(): void {
    setForm(BLANK_FORM);
    setAvailRows([]);
    setCreateError(null);
    setCreateOpen(true);
    if (clinics.length === 0) {
      getClinics({ skip: 0, limit: 200 })
        .then((result) => setClinics(result.items))
        .catch(() => { /* non-fatal */ });
    }
  }

  // Server already filtered and paginated
  const paginated = doctors;

  function setField(key: keyof RegisterDoctorForm, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addAvailRow(): void {
    setAvailRows((rows) => [...rows, { ...BLANK_AVAIL }]);
  }

  function removeAvailRow(idx: number): void {
    setAvailRows((rows) => rows.filter((_, i) => i !== idx));
  }

  function setAvailField(idx: number, key: keyof AvailabilityRow, value: string): void {
    setAvailRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r))
    );
  }

  async function handleCreate(): Promise<void> {
    if (!form.name || !form.email || !form.password || !form.clinic_id || !form.specialty || !form.license_number) {
      setCreateError('Name, email, password, clinic, specialty and license number are required.');
      return;
    }
    // Validate availability rows
    for (const row of availRows) {
      if (row.start_time >= row.end_time) {
        setCreateError('Each availability row must have start time before end time.');
        return;
      }
    }
    setCreating(true);
    setCreateError(null);
    try {
      const availability: AvailabilityInput[] = availRows.map((r) => ({
        day_of_week: Number(r.day_of_week),
        start_time: r.start_time,
        end_time: r.end_time,
      }));
      await registerDoctor({
        name: form.name,
        email: form.email,
        password: form.password,
        mobile_no: form.mobile_no || undefined,
        clinic_id: Number(form.clinic_id),
        specialty: form.specialty,
        license_number: form.license_number,
        qualifications: form.qualifications || undefined,
        experience_years: Number(form.experience_years),
        max_patients_per_day: Number(form.max_patients_per_day),
        consultation_duration_minutes: Number(form.consultation_duration_minutes),
        availability: availability.length > 0 ? availability : undefined,
      });
      setCreateOpen(false);
      loadDoctors();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create doctor.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoctor(deleteTarget.id);
      setDeleteTarget(null);
      loadDoctors();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete doctor.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function openEditDialog(doctor: DoctorResponse): void {
    setEditTarget(doctor);
    setEditError(null);
    setEditForm({
      name: doctor.doctor_name ?? '',
      email: doctor.email ?? '',
      mobile_no: doctor.mobile_no ?? '',
      license_number: doctor.license_number,
      specialty: doctor.specialty,
      qualifications: doctor.qualifications ?? '',
      experience_years: String(doctor.experience_years),
      max_patients_per_day: String(doctor.max_patients_per_day),
      consultation_duration_minutes: String(doctor.consultation_duration_minutes),
      clinic_id: String(doctor.clinic_id),
    });
    if (clinics.length === 0) {
      getClinics({ skip: 0, limit: 200 })
        .then((result) => setClinics(result.items))
        .catch(() => { /* non-fatal */ });
    }
  }

  async function handleEdit(): Promise<void> {
    if (!editTarget) return;
    setEditing(true);
    setEditError(null);
    try {
      await updateDoctor(editTarget.id, {
        name: editForm.name || undefined,
        email: editForm.email || undefined,
        mobile_no: editForm.mobile_no || undefined,
        license_number: editForm.license_number || undefined,
        specialty: editForm.specialty || undefined,
        qualifications: editForm.qualifications || undefined,
        experience_years: editForm.experience_years ? Number(editForm.experience_years) : undefined,
        max_patients_per_day: editForm.max_patients_per_day ? Number(editForm.max_patients_per_day) : undefined,
        consultation_duration_minutes: editForm.consultation_duration_minutes ? Number(editForm.consultation_duration_minutes) : undefined,
        clinic_id: editForm.clinic_id ? Number(editForm.clinic_id) : undefined,
      });
      setEditTarget(null);
      loadDoctors();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update doctor.');
    } finally {
      setEditing(false);
    }
  }

  function openBookDialog(doctor: DoctorResponse): void {
    setBookTarget(doctor);
    setBookSlotId('');
    setBookReason('');
    setBookError(null);
    setBookSlots([]);
    setBookSlotsLoading(true);
    getSlots({ doctor_id: doctor.id, limit: 1000 })
      .then((slots) => { setBookSlots(slots.filter((s) => !s.is_booked && s.is_active)); })
      .catch(() => { setBookError('Failed to load available slots.'); })
      .finally(() => { setBookSlotsLoading(false); });
  }

  async function handleBook(): Promise<void> {
    if (!bookTarget || !bookSlotId || !user?.id) return;
    setBookingInProgress(true);
    setBookError(null);
    try {
      const result = await bookAppointment({
        patient_id: Number(user.id),
        doctor_id: bookTarget.id,
        clinic_id: bookTarget.clinic_id,
        slot_id: Number(bookSlotId),
        reason_for_visit: bookReason || undefined,
      });
      if (result.success) {
        setBookTarget(null);
        setSnackbar({ open: true, message: result.message, severity: 'success' });
      } else {
        setBookError(result.message);
      }
    } catch (err: unknown) {
      setBookError(err instanceof Error ? err.message : 'Booking failed.');
    } finally {
      setBookingInProgress(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
          <Typography variant="h4">Doctors</Typography>
          <Typography color="text.secondary" variant="body2">
            {loading ? 'Loading...' : `${total} doctor${total !== 1 ? 's' : ''} found`}
          </Typography>
        </Stack>
        {isAdmin ? (
          <Button
            startIcon={<PlusIcon fontSize="var(--icon-fontSize-md)" />}
            variant="contained"
            onClick={openCreateDialog}
          >
            Add Doctor
          </Button>
        ) : null}
      </Stack>

      {error ? <Typography color="error" variant="body2">Error: {error}</Typography> : null}

      <Card>
        <CardHeader
          title="All Doctors"
          subheader="Fetched from /api/v1/doctors"
          action={
            <OutlinedInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search name, specialty, clinic\u2026"
              size="small"
              startAdornment={
                <InputAdornment position="start">
                  <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
                </InputAdornment>
              }
              sx={{ width: '260px' }}
            />
          }
        />
        <Divider />
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: '1000px' }}>
            <TableHead>
              <TableRow>
                <TableCell>Doctor</TableCell>
                <TableCell>Clinic</TableCell>
                <TableCell>Specialty</TableCell>
                <TableCell>License No.</TableCell>
                <TableCell>Qualifications</TableCell>
                <TableCell>Experience</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Max Pts/Day</TableCell>
                <TableCell>Status</TableCell>
                {isAdmin || isPatient ? <TableCell align="right">Actions</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin || isPatient ? 10 : 9}>
                    <Typography variant="body2" color="text.secondary">Loading doctors...</Typography>
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin || isPatient ? 10 : 9}>
                    <Typography variant="body2" color="text.secondary">No doctors found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((doctor) => (
                  <TableRow key={doctor.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'var(--mui-palette-primary-main)', width: 36, height: 36 }}>
                          <StethoscopeIcon fontSize="var(--icon-fontSize-sm)" />
                        </Avatar>
                        <Stack>
                          <Typography variant="subtitle2">
                            {doctor.doctor_name ?? `Doctor #${doctor.id}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">ID #{doctor.id}</Typography>
                        </Stack>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {doctor.clinic_name ?? `Clinic #${doctor.clinic_id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={doctor.specialty} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{doctor.license_number}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: '160px' }}>
                        {doctor.qualifications ?? '\u2014'}
                      </Typography>
                    </TableCell>
                    <TableCell>{doctor.experience_years} yr{doctor.experience_years !== 1 ? 's' : ''}</TableCell>
                    <TableCell>{doctor.consultation_duration_minutes} min</TableCell>
                    <TableCell>{doctor.max_patients_per_day}</TableCell>
                    <TableCell>
                      <Chip
                        label={doctor.is_active ? 'Active' : 'Inactive'}
                        color={doctor.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    {isAdmin ? (
                      <TableCell align="right">
                        <Tooltip title="Edit doctor">
                          <IconButton color="primary" size="small" onClick={() => { openEditDialog(doctor); }}>
                            <PencilSimpleIcon fontSize="var(--icon-fontSize-md)" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete doctor">
                          <IconButton color="error" size="small" onClick={() => { setDeleteTarget(doctor); }}>
                            <TrashIcon fontSize="var(--icon-fontSize-md)" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    ) : isPatient ? (
                      <TableCell align="right">
                        <Tooltip title="Book appointment">
                          <IconButton color="primary" size="small" onClick={() => { openBookDialog(doctor); }}>
                            <CalendarPlusIcon fontSize="var(--icon-fontSize-md)" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
        <Divider />
        <TablePagination
          component="div"
          count={total}
          onPageChange={(_, p) => { setPage(p); }}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10]}
        />
      </Card>

      {/* ── Add Doctor Dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => { if (!creating) setCreateOpen(false); }} maxWidth="md" fullWidth>
        <DialogTitle>Add New Doctor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {createError ? <Typography color="error" variant="body2">{createError}</Typography> : null}

            {/* Account */}
            <Typography variant="subtitle2" color="text.secondary">Account credentials</Typography>
            <TextField
              label="Full Name" required fullWidth value={form.name}
              onChange={(e) => { setField('name', e.target.value); }} disabled={creating}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Email" type="email" required fullWidth value={form.email}
                onChange={(e) => { setField('email', e.target.value); }} disabled={creating}
              />
              <TextField
                label="Phone" fullWidth value={form.mobile_no}
                onChange={(e) => { setField('mobile_no', e.target.value); }} disabled={creating}
              />
            </Stack>
            <TextField
              label="Password" type="password" required fullWidth value={form.password}
              onChange={(e) => { setField('password', e.target.value); }} disabled={creating}
              helperText="Minimum 6 characters"
            />

            {/* Profile */}
            <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>Doctor profile</Typography>
            <FormControl fullWidth required disabled={creating}>
              <InputLabel>Clinic</InputLabel>
              <Select
                value={form.clinic_id} label="Clinic"
                onChange={(e) => { setField('clinic_id', String(e.target.value)); }}
              >
                {clinics.length === 0 ? (
                  <MenuItem value="" disabled>Loading clinics\u2026</MenuItem>
                ) : (
                  clinics.map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>{c.name} \u2014 {c.city}</MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Specialty" required fullWidth value={form.specialty}
                onChange={(e) => { setField('specialty', e.target.value); }} disabled={creating}
              />
              <TextField
                label="License Number" required fullWidth value={form.license_number}
                onChange={(e) => { setField('license_number', e.target.value); }} disabled={creating}
              />
            </Stack>
            <TextField
              label="Qualifications" fullWidth value={form.qualifications}
              onChange={(e) => { setField('qualifications', e.target.value); }} disabled={creating}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Experience (years)" type="number" fullWidth value={form.experience_years}
                onChange={(e) => { setField('experience_years', e.target.value); }}
                disabled={creating} inputProps={{ min: 0, max: 80 }}
              />
              <TextField
                label="Max Patients / Day" type="number" fullWidth value={form.max_patients_per_day}
                onChange={(e) => { setField('max_patients_per_day', e.target.value); }}
                disabled={creating} inputProps={{ min: 1, max: 100 }}
              />
              <TextField
                label="Consultation Duration (min)" type="number" fullWidth value={form.consultation_duration_minutes}
                onChange={(e) => { setField('consultation_duration_minutes', e.target.value); }}
                disabled={creating} inputProps={{ min: 5, max: 120 }}
                helperText="Slot length in minutes"
              />
            </Stack>

            {/* Availability */}
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Weekly Availability (generates 30-day slots automatically)
              </Typography>
              <Button
                size="small"
                startIcon={<PlusIcon fontSize="var(--icon-fontSize-sm)" />}
                onClick={addAvailRow}
                disabled={creating}
              >
                Add Day
              </Button>
            </Stack>

            {availRows.length > 0 ? (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'var(--mui-palette-background-level1)' }}>
                      <TableCell>Day</TableCell>
                      <TableCell>Start Time</TableCell>
                      <TableCell>End Time</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {availRows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ minWidth: 140 }}>
                          <FormControl fullWidth size="small" disabled={creating}>
                            <Select
                              value={row.day_of_week}
                              onChange={(e) => { setAvailField(idx, 'day_of_week', String(e.target.value)); }}
                            >
                              {DOW_LABELS.map((label, i) => (
                                <MenuItem key={i} value={String(i)}>{label}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell sx={{ minWidth: 130 }}>
                          <TextField
                            type="time" size="small" fullWidth value={row.start_time}
                            onChange={(e) => { setAvailField(idx, 'start_time', e.target.value); }}
                            disabled={creating}
                            inputProps={{ step: 300 }}
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 130 }}>
                          <TextField
                            type="time" size="small" fullWidth value={row.end_time}
                            onChange={(e) => { setAvailField(idx, 'end_time', e.target.value); }}
                            disabled={creating}
                            inputProps={{ step: 300 }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" color="error" onClick={() => { removeAvailRow(idx); }} disabled={creating}>
                            <MinusCircleIcon fontSize="var(--icon-fontSize-md)" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No availability added. Click \u201cAdd Day\u201d to define working hours.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); }} disabled={creating}>Cancel</Button>
          <Button onClick={() => { void handleCreate(); }} variant="contained" disabled={creating}>
            {creating ? 'Creating\u2026' : 'Add Doctor'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Doctor Dialog ─────────────────────────────────────────────── */}
      <Dialog open={Boolean(editTarget)} onClose={() => { if (!editing) setEditTarget(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Doctor — {editTarget?.doctor_name ?? `Doctor #${editTarget?.id}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editError ? <Typography color="error" variant="body2">{editError}</Typography> : null}
            <Typography variant="subtitle2" color="text.secondary">Account Information</Typography>
            <TextField label="Full Name" fullWidth value={editForm.name} onChange={(e) => { setEditForm((f) => ({ ...f, name: e.target.value })); }} disabled={editing} inputProps={{ maxLength: 150 }} />
            <TextField label="Email" type="email" fullWidth value={editForm.email} onChange={(e) => { setEditForm((f) => ({ ...f, email: e.target.value })); }} disabled={editing} />
            <TextField label="Phone Number" fullWidth value={editForm.mobile_no} onChange={(e) => { setEditForm((f) => ({ ...f, mobile_no: e.target.value })); }} disabled={editing} inputProps={{ maxLength: 20 }} />
            <Typography variant="subtitle2" color="text.secondary">Professional Information</Typography>
            <TextField label="License Number" fullWidth value={editForm.license_number} onChange={(e) => { setEditForm((f) => ({ ...f, license_number: e.target.value })); }} disabled={editing} inputProps={{ maxLength: 50 }} />
            <FormControl fullWidth disabled={editing}>
              <InputLabel>Clinic</InputLabel>
              <Select value={editForm.clinic_id} label="Clinic" onChange={(e) => { setEditForm((f) => ({ ...f, clinic_id: String(e.target.value) })); }}>
                {clinics.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>{c.name} — {c.city}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Specialty" fullWidth value={editForm.specialty} onChange={(e) => { setEditForm((f) => ({ ...f, specialty: e.target.value })); }} disabled={editing} />
            <TextField label="Qualifications" fullWidth value={editForm.qualifications} onChange={(e) => { setEditForm((f) => ({ ...f, qualifications: e.target.value })); }} disabled={editing} />
            <Stack direction="row" spacing={2}>
              <TextField label="Experience (years)" type="number" fullWidth value={editForm.experience_years} onChange={(e) => { setEditForm((f) => ({ ...f, experience_years: e.target.value })); }} disabled={editing} inputProps={{ min: 0, max: 80 }} />
              <TextField label="Max Patients / Day" type="number" fullWidth value={editForm.max_patients_per_day} onChange={(e) => { setEditForm((f) => ({ ...f, max_patients_per_day: e.target.value })); }} disabled={editing} inputProps={{ min: 1, max: 100 }} />
              <TextField label="Duration (min)" type="number" fullWidth value={editForm.consultation_duration_minutes} onChange={(e) => { setEditForm((f) => ({ ...f, consultation_duration_minutes: e.target.value })); }} disabled={editing} inputProps={{ min: 5, max: 120 }} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditTarget(null); }} disabled={editing}>Cancel</Button>
          <Button onClick={() => { void handleEdit(); }} variant="contained" disabled={editing}>{editing ? 'Saving…' : 'Save Changes'}</Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        maxWidth="xs"
      >
        <DialogTitle>Delete Doctor</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to deactivate{' '}
            <strong>{deleteTarget?.doctor_name ?? `Doctor #${deleteTarget?.id}`}</strong>
            {' '}(License: {deleteTarget?.license_number})?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteTarget(null); }} disabled={deleting}>Cancel</Button>
          <Button onClick={() => { void handleDelete(); }} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting\u2026' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Book Appointment Dialog (patient) ─────────────────────────────── */}
      <Dialog
        open={Boolean(bookTarget)}
        onClose={() => { if (!bookingInProgress) setBookTarget(null); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Book Appointment — {bookTarget?.doctor_name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {bookError ? <Typography color="error" variant="body2">{bookError}</Typography> : null}

            {/* Clinic info */}
            <Typography variant="body2" color="text.secondary">
              <strong>Clinic:</strong> {bookTarget?.clinic_name ?? '—'}
            </Typography>

            {/* Week calendar */}
            {bookSlotsLoading ? (
              <Typography variant="body2" color="text.secondary">Loading available slots…</Typography>
            ) : bookSlots.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No available slots for this doctor in the next 7 days.</Typography>
            ) : (() => {
              // Group slots by date string (YYYY-MM-DD)
              const byDay = new Map<string, typeof bookSlots>();
              for (const s of bookSlots) {
                const key = dayjs(s.start_time).format('YYYY-MM-DD');
                if (!byDay.has(key)) byDay.set(key, []);
                byDay.get(key)!.push(s);
              }
              const days = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
              return (
                <Box sx={{ overflowX: 'auto' }}>
                  <Stack direction="row" spacing={1} sx={{ minWidth: days.length * 120 }}>
                    {days.map(([dateKey, slots]) => (
                      <Box
                        key={dateKey}
                        sx={{
                          flex: '1 0 110px',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Day header */}
                        <Box sx={{ bgcolor: 'primary.main', px: 1, py: 0.75, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: 'primary.contrastText', fontWeight: 700, display: 'block' }}>
                            {dayjs(dateKey).format('ddd')}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'primary.contrastText' }}>
                            {dayjs(dateKey).format('MMM D')}
                          </Typography>
                        </Box>
                        {/* Slots */}
                        <Stack spacing={0.5} sx={{ p: 0.75 }}>
                          {slots.map((s) => {
                            const selected = bookSlotId === String(s.id);
                            return (
                              <Box
                                key={s.id}
                                onClick={() => { if (!bookingInProgress) setBookSlotId(String(s.id)); }}
                                sx={{
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                  bgcolor: selected ? 'primary.main' : 'action.hover',
                                  color: selected ? 'primary.contrastText' : 'text.primary',
                                  border: '1px solid',
                                  borderColor: selected ? 'primary.dark' : 'transparent',
                                  '&:hover': { bgcolor: selected ? 'primary.dark' : 'action.selected' },
                                  transition: 'background-color 0.15s',
                                }}
                              >
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                                  {dayjs(s.start_time).format('HH:mm')}
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.8 }}>
                                  {dayjs(s.end_time).format('HH:mm')}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              );
            })()}

            {bookSlotId ? (
              <Typography variant="body2" color="primary.main">
                Selected: {(() => { const s = bookSlots.find((x) => String(x.id) === bookSlotId); return s ? `${dayjs(s.start_time).format('ddd, MMM D')} at ${dayjs(s.start_time).format('HH:mm')} – ${dayjs(s.end_time).format('HH:mm')}` : ''; })()}
              </Typography>
            ) : null}

            <TextField
              label="Reason for Visit (optional)"
              multiline
              rows={2}
              fullWidth
              value={bookReason}
              onChange={(e) => { setBookReason(e.target.value); }}
              disabled={bookingInProgress}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setBookTarget(null); }} disabled={bookingInProgress}>Cancel</Button>
          <Button
            onClick={() => { void handleBook(); }}
            variant="contained"
            disabled={bookingInProgress || !bookSlotId}
          >
            {bookingInProgress ? 'Booking…' : 'Book Appointment'}
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
