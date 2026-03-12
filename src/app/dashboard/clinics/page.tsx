'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { EnvelopeIcon } from '@phosphor-icons/react/dist/ssr/Envelope';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import type { UserRole } from '@/types/user';
import { useUser } from '@/hooks/use-user';
import type { ClinicResponse } from '@/lib/api';
import { createClinic, deleteClinic, getClinics, updateClinic } from '@/lib/api';

interface ClinicForm {
  name: string;
  address: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  zip_code: string;
}

const BLANK: ClinicForm = { name: '', address: '', phone: '', email: '', city: '', state: '', zip_code: '' };

function toForm(c: ClinicResponse): ClinicForm {
  return { name: c.name, address: c.address, phone: c.phone, email: c.email ?? '', city: c.city, state: c.state, zip_code: c.zip_code };
}

export default function Page(): React.JSX.Element {
  const { user } = useUser();
  const role = user?.role as UserRole | undefined;
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  const [clinics, setClinics] = React.useState<ClinicResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage] = React.useState(12);
  const [total, setTotal] = React.useState(0);

  // Create dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [createForm, setCreateForm] = React.useState<ClinicForm>(BLANK);

  // Edit dialog
  const [editTarget, setEditTarget] = React.useState<ClinicResponse | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<ClinicForm>(BLANK);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<ClinicResponse | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback((): void => {
    setLoading(true);
    getClinics({ skip: page * rowsPerPage, limit: rowsPerPage, search: search || undefined })
      .then((result) => { setClinics(result.items); setTotal(result.total); })
      .catch((err: Error) => { setError(err.message); })
      .finally(() => { setLoading(false); });
  }, [page, rowsPerPage, search]);

  React.useEffect(() => { load(); }, [load]);

  // Server handles filtering; clinics = current page's data

  // ── Create ─────────────────────────────────────────────────────────────────
  async function handleCreate(): Promise<void> {
    if (!createForm.name || !createForm.address || !createForm.phone || !createForm.city || !createForm.state || !createForm.zip_code) {
      setCreateError('Name, address, phone, city, state and zip code are required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createClinic({ ...createForm, email: createForm.email || undefined });
      setCreateOpen(false);
      load();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create clinic.');
    } finally {
      setCreating(false);
    }
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  function openEdit(clinic: ClinicResponse): void {
    setEditTarget(clinic);
    setEditForm(toForm(clinic));
    setEditError(null);
  }

  async function handleEdit(): Promise<void> {
    if (!editTarget) return;
    if (!editForm.name || !editForm.address || !editForm.phone || !editForm.city || !editForm.state || !editForm.zip_code) {
      setEditError('All fields except email are required.');
      return;
    }
    setEditing(true);
    setEditError(null);
    try {
      await updateClinic(editTarget.id, { ...editForm, email: editForm.email || undefined });
      setEditTarget(null);
      load();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update clinic.');
    } finally {
      setEditing(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClinic(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete clinic.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Stack spacing={3}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
          <Typography variant="h4">Clinics</Typography>
          <Typography color="text.secondary" variant="body2">
            {loading ? 'Loading...' : `${total} clinic${total !== 1 ? 's' : ''} found`}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <OutlinedInput
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search name, city, state…"
            size="small"
            startAdornment={
              <InputAdornment position="start">
                <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
              </InputAdornment>
            }
            sx={{ width: '240px' }}
          />
          {isAdmin ? (
            <Button
              startIcon={<PlusIcon fontSize="var(--icon-fontSize-md)" />}
              variant="contained"
              onClick={() => { setCreateForm(BLANK); setCreateError(null); setCreateOpen(true); }}
            >
              Add Clinic
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {error ? <Typography color="error" variant="body2">Error: {error}</Typography> : null}

      {/* ── Clinic cards ────────────────────────────────────────────────── */}
      {loading ? (
        <Typography color="text.secondary">Loading clinics from /api/v1/clinics…</Typography>
      ) : clinics.length === 0 ? (
        <Typography color="text.secondary">No clinics found.</Typography>
      ) : (
        <>
          <Grid container spacing={3}>
            {clinics.map((clinic) => (
            <Grid key={clinic.id} size={{ lg: 4, md: 6, xs: 12 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                      <Avatar sx={{ bgcolor: 'var(--mui-palette-primary-main)', width: 48, height: 48 }}>
                        <BuildingsIcon fontSize="var(--icon-fontSize-lg)" />
                      </Avatar>
                      <Stack spacing={0.5} sx={{ flex: 1 }}>
                        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="h6">{clinic.name}</Typography>
                          <Chip
                            label={clinic.is_active ? 'Active' : 'Inactive'}
                            color={clinic.is_active ? 'success' : 'error'}
                            size="small"
                          />
                        </Stack>
                        <Typography color="text.secondary" variant="caption">Clinic #{clinic.id}</Typography>
                      </Stack>
                    </Stack>

                    <Divider />

                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                        <MapPinIcon color="var(--mui-palette-neutral-500)" fontSize="var(--icon-fontSize-md)" />
                        <Stack>
                          <Typography variant="body2">{clinic.address}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {clinic.city}, {clinic.state} {clinic.zip_code}
                          </Typography>
                        </Stack>
                      </Stack>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <PhoneIcon color="var(--mui-palette-neutral-500)" fontSize="var(--icon-fontSize-md)" />
                        <Typography variant="body2">{clinic.phone}</Typography>
                      </Stack>
                      {clinic.email ? (
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <EnvelopeIcon color="var(--mui-palette-neutral-500)" fontSize="var(--icon-fontSize-md)" />
                          <Typography variant="body2" noWrap>{clinic.email}</Typography>
                        </Stack>
                      ) : null}
                    </Stack>
                  </Stack>
                </CardContent>

                {isAdmin ? (
                  <>
                    <Divider />
                    <CardActions sx={{ justifyContent: 'flex-end', px: 2, py: 1 }}>
                      <Tooltip title="Edit clinic">
                        <IconButton size="small" color="primary" onClick={() => { openEdit(clinic); }}>
                          <PencilSimpleIcon fontSize="var(--icon-fontSize-md)" />
                        </IconButton>
                      </Tooltip>
                      {isSuperAdmin ? (
                        <Tooltip title="Delete clinic">
                          <IconButton size="small" color="error" onClick={() => { setDeleteTarget(clinic); }}>
                            <TrashIcon fontSize="var(--icon-fontSize-md)" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </CardActions>
                  </>
                ) : null}
              </Card>
            </Grid>
            ))}
          </Grid>
          <TablePagination
            component="div"
            count={total}
            onPageChange={(_, p) => { setPage(p); }}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[12]}
          />
        </>
      )}

      {/* ── Create Clinic Dialog ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => { if (!creating) setCreateOpen(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Clinic</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {createError ? <Typography color="error" variant="body2">{createError}</Typography> : null}
            <TextField label="Clinic Name" required fullWidth value={createForm.name}
              onChange={(e) => { setCreateForm((f) => ({ ...f, name: e.target.value })); }} disabled={creating} />
            <TextField label="Address" required fullWidth value={createForm.address}
              onChange={(e) => { setCreateForm((f) => ({ ...f, address: e.target.value })); }} disabled={creating} />
            <Stack direction="row" spacing={2}>
              <TextField label="City" required fullWidth value={createForm.city}
                onChange={(e) => { setCreateForm((f) => ({ ...f, city: e.target.value })); }} disabled={creating} />
              <TextField label="State" required fullWidth value={createForm.state}
                onChange={(e) => { setCreateForm((f) => ({ ...f, state: e.target.value })); }} disabled={creating} />
              <TextField label="ZIP Code" required sx={{ width: '140px' }} value={createForm.zip_code}
                onChange={(e) => { setCreateForm((f) => ({ ...f, zip_code: e.target.value })); }} disabled={creating} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Phone" required fullWidth value={createForm.phone}
                onChange={(e) => { setCreateForm((f) => ({ ...f, phone: e.target.value })); }} disabled={creating} />
              <TextField label="Email (optional)" type="email" fullWidth value={createForm.email}
                onChange={(e) => { setCreateForm((f) => ({ ...f, email: e.target.value })); }} disabled={creating} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); }} disabled={creating}>Cancel</Button>
          <Button onClick={() => { void handleCreate(); }} variant="contained" disabled={creating}>
            {creating ? 'Creating…' : 'Add Clinic'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Clinic Dialog ───────────────────────────────────────────── */}
      <Dialog open={Boolean(editTarget)} onClose={() => { if (!editing) setEditTarget(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Clinic — {editTarget?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editError ? <Typography color="error" variant="body2">{editError}</Typography> : null}
            <TextField label="Clinic Name" required fullWidth value={editForm.name}
              onChange={(e) => { setEditForm((f) => ({ ...f, name: e.target.value })); }} disabled={editing} />
            <TextField label="Address" required fullWidth value={editForm.address}
              onChange={(e) => { setEditForm((f) => ({ ...f, address: e.target.value })); }} disabled={editing} />
            <Stack direction="row" spacing={2}>
              <TextField label="City" required fullWidth value={editForm.city}
                onChange={(e) => { setEditForm((f) => ({ ...f, city: e.target.value })); }} disabled={editing} />
              <TextField label="State" required fullWidth value={editForm.state}
                onChange={(e) => { setEditForm((f) => ({ ...f, state: e.target.value })); }} disabled={editing} />
              <TextField label="ZIP Code" required sx={{ width: '140px' }} value={editForm.zip_code}
                onChange={(e) => { setEditForm((f) => ({ ...f, zip_code: e.target.value })); }} disabled={editing} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Phone" required fullWidth value={editForm.phone}
                onChange={(e) => { setEditForm((f) => ({ ...f, phone: e.target.value })); }} disabled={editing} />
              <TextField label="Email (optional)" type="email" fullWidth value={editForm.email}
                onChange={(e) => { setEditForm((f) => ({ ...f, email: e.target.value })); }} disabled={editing} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditTarget(null); }} disabled={editing}>Cancel</Button>
          <Button onClick={() => { void handleEdit(); }} variant="contained" disabled={editing}>
            {editing ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm Dialog ────────────────────────────────────────── */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => { if (!deleting) setDeleteTarget(null); }} maxWidth="xs">
        <DialogTitle>Delete Clinic</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to deactivate <strong>{deleteTarget?.name}</strong>?
            Doctors linked to this clinic will still exist but the clinic will be hidden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteTarget(null); }} disabled={deleting}>Cancel</Button>
          <Button onClick={() => { void handleDelete(); }} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
