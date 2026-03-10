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
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import dayjs from 'dayjs';

import { RoleGuard } from '@/components/auth/role-guard';
import type { PatientResponse } from '@/lib/api';
import { getPatients, adminUpdatePatient, deletePatient } from '@/lib/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface EditForm {
  // User-level
  name: string;
  email: string;
  mobile_no: string;
  address: string;
  // Patient-profile
  date_of_birth: string;
  blood_group: string;
  allergies: string;
  emergency_contact: string;
}

const BLANK_EDIT: EditForm = {
  name: '', email: '', mobile_no: '', address: '',
  date_of_birth: '', blood_group: '', allergies: '', emergency_contact: '',
};

function PatientsContent(): React.JSX.Element {
  const [patients, setPatients] = React.useState<PatientResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage] = React.useState(10);

  // Edit dialog
  const [editTarget, setEditTarget] = React.useState<PatientResponse | null>(null);
  const [editForm, setEditForm] = React.useState<EditForm>(BLANK_EDIT);
  const [editing, setEditing] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<PatientResponse | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback((): void => {
    setLoading(true);
    setError(null);
    getPatients()
      .then(setPatients)
      .catch((err: Error) => { setError(err.message); })
      .finally(() => { setLoading(false); });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.patient_name ?? '').toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      (p.blood_group ?? '').toLowerCase().includes(q) ||
      String(p.id).includes(q)
    );
  });
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function openEdit(patient: PatientResponse): void {
    setEditTarget(patient);
    setEditError(null);
    setEditForm({
      name: patient.patient_name ?? '',
      email: patient.email ?? '',
      mobile_no: patient.mobile_no ?? '',
      address: patient.address ?? '',
      date_of_birth: patient.date_of_birth ?? '',
      blood_group: patient.blood_group ?? '',
      allergies: patient.allergies ?? '',
      emergency_contact: patient.emergency_contact ?? '',
    });
  }

  async function handleEdit(): Promise<void> {
    if (!editTarget) return;
    setEditing(true);
    setEditError(null);
    try {
      await adminUpdatePatient(editTarget.id, {
        name: editForm.name || undefined,
        email: editForm.email || undefined,
        mobile_no: editForm.mobile_no || undefined,
        address: editForm.address || undefined,
        date_of_birth: editForm.date_of_birth || undefined,
        blood_group: editForm.blood_group || undefined,
        allergies: editForm.allergies || undefined,
        emergency_contact: editForm.emergency_contact || undefined,
      });
      setEditTarget(null);
      load();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update patient.');
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePatient(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete patient.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
          <Typography variant="h4">Patients</Typography>
          <Typography color="text.secondary" variant="body2">
            {loading ? 'Loading...' : `${filtered.length} patient${filtered.length !== 1 ? 's' : ''} found`}
          </Typography>
        </Stack>
        <Tooltip title="Refresh">
          <IconButton onClick={load} disabled={loading}>
            <ArrowClockwiseIcon fontSize="var(--icon-fontSize-md)" />
          </IconButton>
        </Tooltip>
      </Stack>

      {error ? <Typography color="error" variant="body2">Error: {error}</Typography> : null}

      <Card>
        <CardHeader
          title="All Patients"
          subheader="Patient records from the health portal"
          action={
            <OutlinedInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search name, email, blood group…"
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
          <Table sx={{ minWidth: '900px' }}>
            <TableHead>
              <TableRow>
                <TableCell>Patient</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Date of Birth</TableCell>
                <TableCell>Blood Group</TableCell>
                <TableCell>Allergies</TableCell>
                <TableCell>Emergency Contact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Registered</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Typography variant="body2" color="text.secondary">Loading patients…</Typography>
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Typography variant="body2" color="text.secondary">No patients found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((patient) => (
                  <TableRow key={patient.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'var(--mui-palette-primary-main)', width: 36, height: 36 }}>
                          <UserIcon fontSize="var(--icon-fontSize-sm)" />
                        </Avatar>
                        <Stack>
                          <Typography variant="subtitle2">
                            {patient.patient_name ?? `Patient #${patient.id}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">ID #{patient.id}</Typography>
                        </Stack>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0}>
                        <Typography variant="body2">{patient.email ?? '—'}</Typography>
                        {patient.mobile_no ? (
                          <Typography variant="caption" color="text.secondary">{patient.mobile_no}</Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {patient.date_of_birth ? dayjs(patient.date_of_birth).format('MMM D, YYYY') : '—'}
                    </TableCell>
                    <TableCell>
                      {patient.blood_group ? (
                        <Chip label={patient.blood_group} size="small" color="error" variant="outlined" />
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: '140px' }}>
                        {patient.allergies ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {patient.emergency_contact ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={patient.is_active ? 'Active' : 'Inactive'}
                        color={patient.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {patient.created_at ? dayjs(patient.created_at).format('MMM D, YYYY') : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit patient">
                        <IconButton color="primary" size="small" onClick={() => { openEdit(patient); }}>
                          <PencilSimpleIcon fontSize="var(--icon-fontSize-md)" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Deactivate patient">
                        <IconButton color="error" size="small" onClick={() => { setDeleteTarget(patient); }}>
                          <TrashIcon fontSize="var(--icon-fontSize-md)" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
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

      {/* ── Edit Patient Dialog ───────────────────────────────────────────── */}
      <Dialog open={Boolean(editTarget)} onClose={() => { if (!editing) setEditTarget(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Patient — {editTarget?.patient_name ?? `Patient #${editTarget?.id}`}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editError ? <Typography color="error" variant="body2">{editError}</Typography> : null}

            <Typography variant="subtitle2" color="text.secondary">Account Information</Typography>

            <TextField
              label="Full Name"
              fullWidth
              value={editForm.name}
              onChange={(e) => { setEditForm((f) => ({ ...f, name: e.target.value })); }}
              disabled={editing}
              inputProps={{ maxLength: 150 }}
            />

            <TextField
              label="Email"
              type="email"
              fullWidth
              value={editForm.email}
              onChange={(e) => { setEditForm((f) => ({ ...f, email: e.target.value })); }}
              disabled={editing}
            />

            <TextField
              label="Phone Number"
              fullWidth
              value={editForm.mobile_no}
              onChange={(e) => { setEditForm((f) => ({ ...f, mobile_no: e.target.value })); }}
              disabled={editing}
              inputProps={{ maxLength: 20 }}
            />

            <TextField
              label="Address"
              fullWidth
              multiline
              rows={2}
              value={editForm.address}
              onChange={(e) => { setEditForm((f) => ({ ...f, address: e.target.value })); }}
              disabled={editing}
            />

            <Typography variant="subtitle2" color="text.secondary">Medical Information</Typography>

            <TextField
              label="Date of Birth"
              type="date"
              fullWidth
              value={editForm.date_of_birth}
              onChange={(e) => { setEditForm((f) => ({ ...f, date_of_birth: e.target.value })); }}
              disabled={editing}
              InputLabelProps={{ shrink: true }}
              helperText="Format: YYYY-MM-DD"
            />

            <FormControl fullWidth disabled={editing}>
              <InputLabel>Blood Group</InputLabel>
              <Select
                value={editForm.blood_group}
                label="Blood Group"
                onChange={(e) => { setEditForm((f) => ({ ...f, blood_group: e.target.value })); }}
              >
                <MenuItem value=""><em>Not specified</em></MenuItem>
                {BLOOD_GROUPS.map((bg) => (
                  <MenuItem key={bg} value={bg}>{bg}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Allergies"
              fullWidth
              multiline
              rows={2}
              value={editForm.allergies}
              onChange={(e) => { setEditForm((f) => ({ ...f, allergies: e.target.value })); }}
              disabled={editing}
              placeholder="e.g. Penicillin, Peanuts"
            />

            <TextField
              label="Emergency Contact"
              fullWidth
              value={editForm.emergency_contact}
              onChange={(e) => { setEditForm((f) => ({ ...f, emergency_contact: e.target.value })); }}
              disabled={editing}
              inputProps={{ maxLength: 20 }}
              placeholder="Phone number"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditTarget(null); }} disabled={editing}>Cancel</Button>
          <Button onClick={() => { void handleEdit(); }} variant="contained" disabled={editing}>
            {editing ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        maxWidth="xs"
      >
        <DialogTitle>Deactivate Patient</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to deactivate{' '}
            <strong>{deleteTarget?.patient_name ?? `Patient #${deleteTarget?.id}`}</strong>
            {deleteTarget?.email ? ` (${deleteTarget.email})` : ''}?
            {' '}This will remove their access to the portal.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteTarget(null); }} disabled={deleting}>Cancel</Button>
          <Button onClick={() => { void handleDelete(); }} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={['admin', 'super_admin']}>
      <PatientsContent />
    </RoleGuard>
  );
}
