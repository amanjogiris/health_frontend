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
import IconButton from '@mui/material/IconButton';
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
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import dayjs from 'dayjs';

import { RoleGuard } from '@/components/auth/role-guard';
import type { AdminUserResponse } from '@/lib/api';
import { createAdmin, deleteAdmin, getAdmins } from '@/lib/api';

interface CreateAdminForm {
  name: string;
  email: string;
  password: string;
  mobile_no: string;
}

function AdminsContent(): React.JSX.Element {
  const [admins, setAdmins] = React.useState<AdminUserResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage] = React.useState(10);

  // Create dialog state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CreateAdminForm>({ name: '', email: '', password: '', mobile_no: '' });

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = React.useState<AdminUserResponse | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback((): void => {
    setLoading(true);
    setError(null);
    getAdmins()
      .then(setAdmins)
      .catch((err: Error) => { setError(err.message); })
      .finally(() => { setLoading(false); });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const paginated = admins.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function handleCreateOpen(): void {
    setForm({ name: '', email: '', password: '', mobile_no: '' });
    setCreateError(null);
    setCreateOpen(true);
  }

  function handleCreateClose(): void {
    if (!creating) setCreateOpen(false);
  }

  async function handleCreateSubmit(): Promise<void> {
    if (!form.name || !form.email || !form.password) {
      setCreateError('Name, email and password are required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createAdmin({ name: form.name, email: form.email, password: form.password, mobile_no: form.mobile_no || undefined });
      setCreateOpen(false);
      load();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create admin.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdmin(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate admin.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
          <Typography variant="h4">Admin Management</Typography>
          <Typography color="text.secondary" variant="body2">
            {loading ? 'Loading...' : `${admins.length} admin${admins.length !== 1 ? 's' : ''} total`}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2}>
          <Button
            startIcon={<ArrowClockwiseIcon fontSize="var(--icon-fontSize-md)" />}
            variant="outlined"
            onClick={load}
          >
            Refresh
          </Button>
          <Button
            startIcon={<PlusIcon fontSize="var(--icon-fontSize-md)" />}
            variant="contained"
            onClick={handleCreateOpen}
          >
            Add Admin
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Typography color="error" variant="body2">Error: {error}</Typography>
      ) : null}

      <Card>
        <CardHeader title="All Admins" subheader="Users with admin role — managed by Super Admins only" />
        <Divider />
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: '700px' }}>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Verified</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary">Loading admins...</Typography>
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary">No admins found. Add one to get started.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((admin) => (
                  <TableRow key={admin.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'var(--mui-palette-primary-main)', width: 36, height: 36 }}>
                          <UserCircleIcon fontSize="var(--icon-fontSize-sm)" />
                        </Avatar>
                        <Typography variant="subtitle2">{admin.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.mobile_no ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={admin.is_verified ? 'Verified' : 'Unverified'}
                        color={admin.is_verified ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={admin.is_active ? 'Active' : 'Inactive'}
                        color={admin.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {admin.created_at ? dayjs(admin.created_at).format('MMM D, YYYY') : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Deactivate admin">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => { setDeleteTarget(admin); }}
                          disabled={!admin.is_active}
                        >
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
          count={admins.length}
          onPageChange={(_, p) => { setPage(p); }}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10]}
        />
      </Card>

      {/* Create Admin Dialog */}
      <Dialog open={createOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Admin</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {createError ? (
              <Typography color="error" variant="body2">{createError}</Typography>
            ) : null}
            <TextField
              label="Full Name"
              fullWidth
              required
              value={form.name}
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); }}
              disabled={creating}
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={form.email}
              onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); }}
              disabled={creating}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              value={form.password}
              onChange={(e) => { setForm((f) => ({ ...f, password: e.target.value })); }}
              disabled={creating}
            />
            <TextField
              label="Phone (optional)"
              fullWidth
              value={form.mobile_no}
              onChange={(e) => { setForm((f) => ({ ...f, mobile_no: e.target.value })); }}
              disabled={creating}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose} disabled={creating}>Cancel</Button>
          <Button onClick={() => { void handleCreateSubmit(); }} variant="contained" disabled={creating}>
            {creating ? 'Creating…' : 'Create Admin'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => { if (!deleting) setDeleteTarget(null); }} maxWidth="xs">
        <DialogTitle>Deactivate Admin</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to deactivate <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})?
            They will lose admin access immediately.
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
    <RoleGuard allowedRoles={['super_admin']}>
      <AdminsContent />
    </RoleGuard>
  );
}
