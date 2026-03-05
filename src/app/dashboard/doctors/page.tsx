'use client';

import * as React from 'react';
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
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { StethoscopeIcon } from '@phosphor-icons/react/dist/ssr/Stethoscope';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import type { UserRole } from '@/types/user';
import { useUser } from '@/hooks/use-user';
import type { AvailabilityInput, ClinicResponse, DoctorResponse } from '@/lib/api';
import { deleteDoctor, getClinics, getDoctors, registerDoctor } from '@/lib/api';

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

  const [doctors, setDoctors] = React.useState<DoctorResponse[]>([]);
  const [clinics, setClinics] = React.useState<ClinicResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage] = React.useState(10);

  // Create dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<RegisterDoctorForm>(BLANK_FORM);
  const [availRows, setAvailRows] = React.useState<AvailabilityRow[]>([]);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = React.useState<DoctorResponse | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const loadDoctors = React.useCallback((): void => {
    setLoading(true);
    getDoctors()
      .then(setDoctors)
      .catch((err: Error) => { setError(err.message); })
      .finally(() => { setLoading(false); });
  }, []);

  React.useEffect(() => { loadDoctors(); }, [loadDoctors]);

  function openCreateDialog(): void {
    setForm(BLANK_FORM);
    setAvailRows([]);
    setCreateError(null);
    setCreateOpen(true);
    if (clinics.length === 0) {
      getClinics()
        .then(setClinics)
        .catch(() => { /* non-fatal */ });
    }
  }

  const filtered = doctors.filter((d) => {
    const q = search.toLowerCase();
    return (
      (d.doctor_name ?? '').toLowerCase().includes(q) ||
      d.specialty.toLowerCase().includes(q) ||
      d.license_number.toLowerCase().includes(q) ||
      (d.clinic_name ?? '').toLowerCase().includes(q)
    );
  });
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
          <Typography variant="h4">Doctors</Typography>
          <Typography color="text.secondary" variant="body2">
            {loading ? 'Loading...' : `${filtered.length} doctor${filtered.length !== 1 ? 's' : ''} found`}
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
                {isAdmin ? <TableCell align="right">Actions</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 10 : 9}>
                    <Typography variant="body2" color="text.secondary">Loading doctors...</Typography>
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 10 : 9}>
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
                        <Tooltip title="Delete doctor">
                          <IconButton color="error" size="small" onClick={() => { setDeleteTarget(doctor); }}>
                            <TrashIcon fontSize="var(--icon-fontSize-md)" />
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
          count={filtered.length}
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
    </Stack>
  );
}
