'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { StethoscopeIcon } from '@phosphor-icons/react/dist/ssr/Stethoscope';
import { XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import dayjs from 'dayjs';

import type { AppointmentResponse, ClinicResponse, DoctorResponse } from '@/lib/api';
import { getAppointments, getClinics, getDoctors, getSlots } from '@/lib/api';

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

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps): React.JSX.Element {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }} spacing={3}>
            <Stack spacing={1}>
              <Typography color="text.secondary" variant="overline">
                {title}
              </Typography>
              <Typography variant="h4">{value}</Typography>
              {subtitle ? (
                <Typography color="text.secondary" variant="caption">
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
            <Avatar sx={{ backgroundColor: color, height: '56px', width: '56px' }}>{icon}</Avatar>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Page(): React.JSX.Element {
  const [doctors, setDoctors] = React.useState<DoctorResponse[]>([]);
  const [clinics, setClinics] = React.useState<ClinicResponse[]>([]);
  const [appointments, setAppointments] = React.useState<AppointmentResponse[]>([]);
  const [availableSlots, setAvailableSlots] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        const [docs, clins, slots] = await Promise.all([getDoctors(), getClinics(), getSlots()]);
        setDoctors(docs);
        setClinics(clins);
        setAvailableSlots(slots.filter((s) => !s.is_booked).length);
        try {
          const appts = await getAppointments();
          setAppointments(appts);
        } catch {
          // appointments endpoint is admin-only; ignore error
        }
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
    appointments.forEach((a) => {
      if (counts[a.status] !== undefined) counts[a.status]++;
    });
    return counts;
  }, [appointments]);

  const recentAppointments = appointments.slice(0, 8);

  return (
    <Grid container spacing={3}>
      {/* Stat Cards */}
      <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
        <StatCard
          title="Total Doctors"
          value={loading ? '...' : doctors.length}
          icon={<StethoscopeIcon fontSize="var(--icon-fontSize-lg)" />}
          color="var(--mui-palette-primary-main)"
          subtitle={`${doctors.filter((d) => d.is_active).length} active`}
        />
      </Grid>
      <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
        <StatCard
          title="Total Clinics"
          value={loading ? '...' : clinics.length}
          icon={<BuildingsIcon fontSize="var(--icon-fontSize-lg)" />}
          color="var(--mui-palette-success-main)"
          subtitle={`${clinics.filter((c) => c.is_active).length} active`}
        />
      </Grid>
      <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
        <StatCard
          title="Available Slots"
          value={loading ? '...' : availableSlots}
          icon={<ClockIcon fontSize="var(--icon-fontSize-lg)" />}
          color="var(--mui-palette-warning-main)"
          subtitle="Open for booking"
        />
      </Grid>
      <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
        <StatCard
          title="Total Appointments"
          value={loading ? '...' : appointments.length}
          icon={<CalendarBlankIcon fontSize="var(--icon-fontSize-lg)" />}
          color="var(--mui-palette-info-main)"
          subtitle={appointments.length > 0 ? `${statusCounts.pending} pending` : 'Admin view'}
        />
      </Grid>

      {/* Appointment Status Breakdown */}
      <Grid size={{ lg: 4, md: 6, xs: 12 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Appointments by Status" />
          <Divider />
          <CardContent>
            {appointments.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                {loading ? 'Loading...' : 'No appointments data (admin access required)'}
              </Typography>
            ) : (
              <Stack spacing={2}>
                {Object.entries(statusCounts).map(([status, count]) => {
                  const cfg = statusConfig[status];
                  const pct = appointments.length > 0 ? Math.round((count / appointments.length) * 100) : 0;
                  return (
                    <Stack key={status} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Chip label={cfg.label} color={cfg.color} size="small" sx={{ minWidth: '90px' }} />
                      <Box sx={{ flex: 1, mx: 2, height: 8, bgcolor: 'var(--mui-palette-neutral-100)', borderRadius: 4, overflow: 'hidden' }}>
                        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: `var(--mui-palette-${cfg.color === 'default' ? 'neutral-400' : `${cfg.color}-main`})` }} />
                      </Box>
                      <Typography variant="body2" sx={{ minWidth: '24px', textAlign: 'right' }}>
                        {count}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Clinics Overview */}
      <Grid size={{ lg: 4, md: 6, xs: 12 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Clinics Overview" />
          <Divider />
          <CardContent>
            {loading ? (
              <Typography color="text.secondary" variant="body2">Loading...</Typography>
            ) : clinics.length === 0 ? (
              <Typography color="text.secondary" variant="body2">No clinics found.</Typography>
            ) : (
              <Stack spacing={2}>
                {clinics.slice(0, 5).map((clinic) => (
                  <Stack key={clinic.id} direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                    <Avatar sx={{ bgcolor: 'var(--mui-palette-primary-main)', width: 36, height: 36 }}>
                      <BuildingsIcon fontSize="var(--icon-fontSize-sm)" />
                    </Avatar>
                    <Stack spacing={0} sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>{clinic.name}</Typography>
                      <Typography color="text.secondary" variant="caption">{clinic.city}, {clinic.state}</Typography>
                    </Stack>
                    {clinic.is_active ? (
                      <CheckCircleIcon color="var(--mui-palette-success-main)" />
                    ) : (
                      <XCircleIcon color="var(--mui-palette-error-main)" />
                    )}
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Doctors Overview */}
      <Grid size={{ lg: 4, md: 6, xs: 12 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Doctors by Specialty" />
          <Divider />
          <CardContent>
            {loading ? (
              <Typography color="text.secondary" variant="body2">Loading...</Typography>
            ) : doctors.length === 0 ? (
              <Typography color="text.secondary" variant="body2">No doctors found.</Typography>
            ) : (
              <Stack spacing={2}>
                {Array.from(
                  doctors.reduce((map, d) => {
                    map.set(d.specialty, (map.get(d.specialty) ?? 0) + 1);
                    return map;
                  }, new Map<string, number>())
                )
                  .slice(0, 6)
                  .map(([specialty, count]) => (
                    <Stack key={specialty} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{specialty}</Typography>
                      <Chip label={count} size="small" color="primary" />
                    </Stack>
                  ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Appointments Table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title="Recent Appointments" />
          <Divider />
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Patient ID</TableCell>
                  <TableCell>Doctor ID</TableCell>
                  <TableCell>Clinic ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary">Loading...</Typography>
                    </TableCell>
                  </TableRow>
                ) : recentAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary">
                        No appointments to display. Admin access required to view all appointments.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentAppointments.map((appt) => {
                    const cfg = statusConfig[appt.status] ?? { label: appt.status, color: 'default' as const };
                    return (
                      <TableRow key={appt.id} hover>
                        <TableCell>#{appt.id}</TableCell>
                        <TableCell>#{appt.patient_id}</TableCell>
                        <TableCell>#{appt.doctor_id}</TableCell>
                        <TableCell>#{appt.clinic_id}</TableCell>
                        <TableCell>
                          <Chip label={cfg.label} color={cfg.color} size="small" />
                        </TableCell>
                        <TableCell>{appt.reason_for_visit ?? '—'}</TableCell>
                        <TableCell>{appt.created_at ? dayjs(appt.created_at).format('MMM D, YYYY') : '—'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>
        </Card>
      </Grid>
    </Grid>
  );
}
