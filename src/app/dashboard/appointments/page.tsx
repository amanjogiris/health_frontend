'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
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
import Typography from '@mui/material/Typography';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import dayjs from 'dayjs';

import type { AppointmentResponse } from '@/lib/api';
import { getAppointments } from '@/lib/api';

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }
> = {
  pending: { label: 'Pending', color: 'warning' },
  confirmed: { label: 'Confirmed', color: 'info' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
  no_show: { label: 'No Show', color: 'default' },
};

export default function Page(): React.JSX.Element {
  const [appointments, setAppointments] = React.useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage] = React.useState(10);

  const load = React.useCallback((): void => {
    setLoading(true);
    setError(null);
    getAppointments(0, 200)
      .then(setAppointments)
      .catch((err: Error) => { setError(err.message); })
      .finally(() => { setLoading(false); });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtered = appointments.filter(
    (a) => statusFilter === 'all' || a.status === statusFilter
  );

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
          <Typography variant="h4">Appointments</Typography>
          <Typography color="text.secondary" variant="body2">
            {loading ? 'Loading...' : `${filtered.length} appointment${filtered.length !== 1 ? 's' : ''}`}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="no_show">No Show</MenuItem>
            </Select>
          </FormControl>
          <Button
            startIcon={<ArrowClockwiseIcon fontSize="var(--icon-fontSize-md)" />}
            variant="outlined"
            onClick={load}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Card>
        <CardHeader
          title="All Appointments"
          subheader="Fetched from /api/v1/appointments (admin required)"
        />
        <Divider />
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: '900px' }}>
            <TableHead>
              <TableRow>
                <TableCell>#ID</TableCell>
                <TableCell>Patient ID</TableCell>
                <TableCell>Doctor ID</TableCell>
                <TableCell>Clinic ID</TableCell>
                <TableCell>Slot ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reason for Visit</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Cancelled Reason</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Typography variant="body2" color="text.secondary">Loading appointments...</Typography>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Stack spacing={1}>
                      <Typography variant="body2" color="error">
                        {error}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        This endpoint requires admin access. Log in with an admin account to view all appointments.
                      </Typography>
                    </Stack>
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
                      <TableCell>
                        <Typography variant="subtitle2">#{appt.id}</Typography>
                      </TableCell>
                      <TableCell>#{appt.patient_id}</TableCell>
                      <TableCell>#{appt.doctor_id}</TableCell>
                      <TableCell>#{appt.clinic_id}</TableCell>
                      <TableCell>#{appt.slot_id}</TableCell>
                      <TableCell>
                        <Chip label={cfg.label} color={cfg.color} size="small" />
                      </TableCell>
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
                        <Typography variant="body2" noWrap sx={{ maxWidth: '140px' }}>
                          {appt.cancelled_reason ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {appt.created_at ? dayjs(appt.created_at).format('MMM D, YYYY HH:mm') : '—'}
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
    </Stack>
  );
}
