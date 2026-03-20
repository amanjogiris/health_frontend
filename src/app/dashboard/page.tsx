'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import dayjs from 'dayjs';
import { utcDateStr, utcDateTimeLong } from '@/lib/fmt-time';
import RouterLink from 'next/link';

import type { AppointmentResponse, ClinicResponse, DoctorResponse, DynamicAppointmentResponse } from '@/lib/api';
import {
  getAppointments,
  getClinics,
  getDoctors,
  getDoctorAppointments,
  getDoctorProfile,
  getDynamicAppointments,
  getPatientAppointments,
} from '@/lib/api';
import type { UserRole } from '@/types/user';
import { ROLE_LABELS } from '@/types/user';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }
> = {
  booked: { label: 'Booked', color: 'primary' },
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

function AppointmentTable({
  appointments,
  loading,
  title = 'Appointments',
  doctors = [],
  showPatient = false,
}: {
  appointments: AppointmentResponse[];
  loading: boolean;
  title?: string;
  doctors?: DoctorResponse[];
  showPatient?: boolean;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader title={title} />
      <Divider />
      <Box sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{showPatient ? 'Patient' : 'Doctor'}</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Appointment Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">Loading…</Typography></TableCell></TableRow>
            ) : appointments.length === 0 ? (
              <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">No appointments found.</Typography></TableCell></TableRow>
            ) : (
              appointments.slice(0, 8).map((appt) => {
                const cfg = statusConfig[appt.status] ?? { label: appt.status, color: 'default' as const };
                const doc = doctors.find((d) => d.id === appt.doctor_id);
                const primaryLabel = showPatient
                  ? (appt.patient_name ?? `Patient #${appt.patient_id}`)
                  : (doc?.doctor_name ?? (doc ? `Doctor #${doc.id}` : `Doctor #${appt.doctor_id}`))
                const subLabel = (!showPatient && doc) ? doc.specialty : null;
                return (
                  <TableRow key={appt.id} hover>
                    <TableCell>
                      <Stack spacing={0}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{primaryLabel}</Typography>
                        {subLabel ? <Typography variant="caption" color="text.secondary">{subLabel}</Typography> : null}
                      </Stack>
                    </TableCell>
                    <TableCell><Chip label={cfg.label} color={cfg.color} size="small" /></TableCell>
                    <TableCell>{appt.reason_for_visit ?? '—'}</TableCell>
                    <TableCell>{appt.slot_time ? utcDateTimeLong(appt.slot_time) : appt.created_at ? dayjs(appt.created_at).format('MMM D, YYYY') : '—'}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
}

// ─── PATIENT dashboard ────────────────────────────────────────────────────────

function PatientDashboard({ userId }: { userId: number }): React.JSX.Element {
  const [appointments, setAppointments] = React.useState<AppointmentResponse[]>([]);
  const [doctors, setDoctors] = React.useState<DoctorResponse[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [appts, docs] = await Promise.all([getPatientAppointments(userId), getDoctors({ skip: 0, limit: 200 })]);
        setAppointments(appts);
        setDoctors(docs.items);
      } catch { /* noop */ } finally { setLoading(false); }
    }
    void load();
  }, [userId]);

  const booked = appointments.filter((a) => a.status === 'booked').length;
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="h5">Welcome back 👋</Typography>
          <Chip label="Patient" color="info" size="small" />
        </Stack>
      </Grid>
      <Grid size={{ lg: 4, sm: 6, xs: 12 }}>
        <StatCard title="Total Appointments" value={loading ? '…' : appointments.length}
          icon={<CalendarBlankIcon fontSize="var(--icon-fontSize-lg)" />}
          color="var(--mui-palette-primary-main)" />
      </Grid>
      <Grid size={{ lg: 4, sm: 6, xs: 12 }}>
        <StatCard title="Booked" value={loading ? '…' : booked}
          icon={<CheckCircleIcon fontSize="var(--icon-fontSize-lg)" />}
          color="var(--mui-palette-success-main)" />
      </Grid>
      <Grid size={{ lg: 4, sm: 6, xs: 12 }}>
        <StatCard title="Cancelled" value={loading ? '…' : cancelled}
          icon={<XCircleIcon fontSize="var(--icon-fontSize-lg)" />}
          color="var(--mui-palette-error-main)" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Stack direction="row" spacing={2}>
          <Button component={RouterLink} href={paths.dashboard.appointments} variant="contained">View All Appointments</Button>
          <Button component={RouterLink} href={paths.dashboard.doctors} variant="outlined">Find Doctors</Button>
        </Stack>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <AppointmentTable appointments={appointments} loading={loading} title="My Appointment History" doctors={doctors} />
      </Grid>
    </Grid>
  );
}

// ─── DOCTOR dashboard ─────────────────────────────────────────────────────────

function DoctorDashboard(): React.JSX.Element {
  const [appointments, setAppointments] = React.useState<AppointmentResponse[]>([]);
  const [doctor, setDoctor] = React.useState<DoctorResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([getDoctorProfile(), getDoctorAppointments()])
      .then(([doc, appts]) => { setDoctor(doc); setAppointments(appts); })
      .catch(() => { /* noop */ })
      .finally(() => { setLoading(false); });
  }, []);

  const todaysDate = new Date().toISOString().slice(0, 10);
  const todaysAppts = appointments.filter((a) =>
    a.slot_time
      ? utcDateStr(a.slot_time) === todaysDate
      : a.created_at
        ? dayjs(a.created_at).format('YYYY-MM-DD') === todaysDate
        : false
  ).length;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="h5">Doctor Dashboard</Typography>
          <Chip label="Doctor" color="secondary" size="small" />
          {doctor ? <Chip label={doctor.specialty} variant="outlined" size="small" /> : null}
        </Stack>
      </Grid>
      <Grid size={{ lg: 4, sm: 6, xs: 12 }}>
        <StatCard title="Total Appointments" value={loading ? '…' : appointments.length}
          icon={<CalendarBlankIcon fontSize="var(--icon-fontSize-lg)" />} color="var(--mui-palette-primary-main)" />
      </Grid>
      <Grid size={{ lg: 4, sm: 6, xs: 12 }}>
        <StatCard title="Today" value={loading ? '…' : todaysAppts}
          icon={<ClockIcon fontSize="var(--icon-fontSize-lg)" />} color="var(--mui-palette-success-main)" />
      </Grid>
      <Grid size={{ lg: 4, sm: 6, xs: 12 }}>
        <StatCard title="Cancelled" value={loading ? '…' : appointments.filter((a) => a.status === 'cancelled').length}
          icon={<XCircleIcon fontSize="var(--icon-fontSize-lg)" />} color="var(--mui-palette-error-main)" />
      </Grid>
      {doctor ? (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="My Profile" />
            <Divider />
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1}><Typography variant="subtitle2">Specialty:</Typography><Typography>{doctor.specialty}</Typography></Stack>
                <Stack direction="row" spacing={1}><Typography variant="subtitle2">License:</Typography><Typography>{doctor.license_number}</Typography></Stack>
                <Stack direction="row" spacing={1}><Typography variant="subtitle2">Experience:</Typography><Typography>{doctor.experience_years} years</Typography></Stack>
                {doctor.qualifications ? <Stack direction="row" spacing={1}><Typography variant="subtitle2">Qualifications:</Typography><Typography>{doctor.qualifications}</Typography></Stack> : null}
              </Stack>
              <Box sx={{ mt: 2 }}><Button component={RouterLink} href={paths.dashboard.account} variant="outlined" size="small">Edit Profile</Button></Box>
            </CardContent>
          </Card>
        </Grid>
      ) : null}
      <Grid size={{ xs: 12 }}>
        <AppointmentTable appointments={appointments} loading={loading} title="My Assigned Appointments" showPatient />
      </Grid>
    </Grid>
  );
}

// ─── ADMIN dashboard ──────────────────────────────────────────────────────────

function AdminDashboard(): React.JSX.Element {
  const [doctors, setDoctors] = React.useState<DoctorResponse[]>([]);
  const [clinics, setClinics] = React.useState<ClinicResponse[]>([]);
  const [appointments, setAppointments] = React.useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [docs, clins] = await Promise.all([getDoctors({ skip: 0, limit: 200 }), getClinics({ skip: 0, limit: 200 })]);
        setDoctors(docs.items); setClinics(clins.items);
        try { setAppointments((await getAppointments(0, 200)).items); } catch { /* admin-only */ }
      } finally { setLoading(false); }
    }
    void load();
  }, []);

  const statusCounts = React.useMemo(() => {
    const c: Record<string, number> = { booked: 0, cancelled: 0 };
    appointments.forEach((a) => { if (c[a.status] !== undefined) c[a.status]++; });
    return c;
  }, [appointments]);

  // Derive unique patient rows from appointment data
  const patientRows = React.useMemo(() => {
    const map = new Map<number, { id: number; name: string; appointmentCount: number; lastStatus: string; lastDate: string }>();
    appointments.forEach((a) => {
      const existing = map.get(a.patient_id);
      if (existing) {
        existing.appointmentCount += 1;
        if (!existing.lastDate || (a.created_at && a.created_at > existing.lastDate)) {
          existing.lastStatus = a.status;
          existing.lastDate = a.created_at ?? '';
        }
      } else {
        map.set(a.patient_id, {
          id: a.patient_id,
          name: a.patient_name ?? `Patient #${a.patient_id}`,
          appointmentCount: 1,
          lastStatus: a.status,
          lastDate: a.created_at ?? '',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.appointmentCount - a.appointmentCount);
  }, [appointments]);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="h5">Admin Dashboard</Typography>
          <Chip label="Admin" color="warning" size="small" />
        </Stack>
      </Grid>
      <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
        <StatCard title="Doctors" value={loading ? '…' : doctors.length} icon={<StethoscopeIcon fontSize="var(--icon-fontSize-lg)" />} color="var(--mui-palette-primary-main)" subtitle={`${doctors.filter((d) => d.is_active).length} active`} />
      </Grid>
      <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
        <StatCard title="Clinics" value={loading ? '…' : clinics.length} icon={<BuildingsIcon fontSize="var(--icon-fontSize-lg)" />} color="var(--mui-palette-success-main)" subtitle={`${clinics.filter((c) => c.is_active).length} active`} />
      </Grid>
      <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
        <StatCard title="Patients" value={loading ? '…' : patientRows.length} icon={<UserIcon fontSize="var(--icon-fontSize-lg)" />} color="var(--mui-palette-warning-main)" subtitle="Unique patients" />
      </Grid>
      <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
        <StatCard title="Appointments" value={loading ? '…' : appointments.length} icon={<CalendarBlankIcon fontSize="var(--icon-fontSize-lg)" />} color="var(--mui-palette-info-main)" subtitle={`${statusCounts.pending} pending`} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button component={RouterLink} href={paths.dashboard.doctors} variant="contained">Manage Doctors</Button>
          <Button component={RouterLink} href={paths.dashboard.patients} variant="outlined">Manage Patients</Button>
          <Button component={RouterLink} href={paths.dashboard.clinics} variant="outlined">Manage Clinics</Button>
          <Button component={RouterLink} href={paths.dashboard.appointments} variant="outlined">View Appointments</Button>
        </Stack>
      </Grid>
      <Grid size={{ lg: 4, md: 6, xs: 12 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Appointments by Status" />
          <Divider />
          <CardContent>
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
                    <Typography variant="body2" sx={{ minWidth: '24px', textAlign: 'right' }}>{count}</Typography>
                  </Stack>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ lg: 4, md: 6, xs: 12 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Doctors by Specialty" />
          <Divider />
          <CardContent>
            {loading ? <Typography color="text.secondary" variant="body2">Loading…</Typography> : (
              <Stack spacing={2}>
                {Array.from(doctors.reduce((m, d) => { m.set(d.specialty, (m.get(d.specialty) ?? 0) + 1); return m; }, new Map<string, number>()))
                  .slice(0, 6).map(([sp, cnt]) => (
                    <Stack key={sp} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{sp}</Typography>
                      <Chip label={cnt} size="small" color="primary" />
                    </Stack>
                  ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ lg: 4, md: 6, xs: 12 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Clinics" />
          <Divider />
          <CardContent>
            {loading ? <Typography color="text.secondary" variant="body2">Loading…</Typography> : (
              <Stack spacing={2}>
                {clinics.slice(0, 5).map((c) => (
                  <Stack key={c.id} direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                    <Avatar sx={{ bgcolor: 'var(--mui-palette-primary-main)', width: 36, height: 36 }}><BuildingsIcon fontSize="var(--icon-fontSize-sm)" /></Avatar>
                    <Stack spacing={0} sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>{c.name}</Typography>
                      <Typography color="text.secondary" variant="caption">{c.city}, {c.state}</Typography>
                    </Stack>
                    {c.is_active ? <CheckCircleIcon color="var(--mui-palette-success-main)" /> : <XCircleIcon color="var(--mui-palette-error-main)" />}
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <AppointmentTable appointments={appointments} loading={loading} title="Recent Appointments" doctors={doctors} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title="Patient Details" />
          <Divider />
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>Appointments</TableCell>
                  <TableCell>Last Status</TableCell>
                  <TableCell>Last Visit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">Loading…</Typography></TableCell></TableRow>
                ) : patientRows.length === 0 ? (
                  <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">No patients found.</Typography></TableCell></TableRow>
                ) : (
                  patientRows.slice(0, 10).map((p) => {
                    const cfg = statusConfig[p.lastStatus] ?? { label: p.lastStatus, color: 'default' as const };
                    return (
                      <TableRow key={p.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'var(--mui-palette-primary-main)' }}>
                              <UserIcon fontSize="var(--icon-fontSize-sm)" />
                            </Avatar>
                            <Stack spacing={0}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{p.name}</Typography>
                              <Typography variant="caption" color="text.secondary">ID #{p.id}</Typography>
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell>{p.appointmentCount}</TableCell>
                        <TableCell><Chip label={cfg.label} color={cfg.color} size="small" /></TableCell>
                        <TableCell>{p.lastDate ? dayjs(p.lastDate).format('MMM D, YYYY') : '—'}</TableCell>
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

// ─── SUPER ADMIN dashboard ────────────────────────────────────────────────────

function SuperAdminDashboard(): React.JSX.Element {
  const [doctors, setDoctors] = React.useState<DoctorResponse[]>([]);
  const [clinics, setClinics] = React.useState<ClinicResponse[]>([]);
  const [appointments, setAppointments] = React.useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [docs, clins] = await Promise.all([getDoctors({ skip: 0, limit: 200 }), getClinics({ skip: 0, limit: 200 })]);
        setDoctors(docs.items); setClinics(clins.items);
        try { setAppointments((await getAppointments(0, 200)).items); } catch { /* noop */ }
      } finally { setLoading(false); }
    }
    void load();
  }, []);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="h5">Super Admin Dashboard</Typography>
          <Chip label="Super Admin" color="error" size="small" />
        </Stack>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          Full system access — manage admins, doctors, clinics and appointments.
        </Typography>
      </Grid>
      <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
        <StatCard title="Doctors" value={loading ? '…' : doctors.length} icon={<StethoscopeIcon fontSize="var(--icon-fontSize-lg)" />} color="var(--mui-palette-primary-main)" />
      </Grid>
      <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
        <StatCard title="Clinics" value={loading ? '…' : clinics.length} icon={<BuildingsIcon fontSize="var(--icon-fontSize-lg)" />} color="var(--mui-palette-success-main)" />
      </Grid>
      <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
        <StatCard title="Appointments" value={loading ? '…' : appointments.length} icon={<CalendarBlankIcon fontSize="var(--icon-fontSize-lg)" />} color="var(--mui-palette-info-main)" />
      </Grid>
      <Grid size={{ lg: 3, sm: 6, xs: 12 }}>
        <StatCard title="System" value="Online" icon={<UserIcon fontSize="var(--icon-fontSize-lg)" />} color="var(--mui-palette-success-main)" subtitle="All services running" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button component={RouterLink} href={paths.dashboard.admins} variant="contained" color="error">Manage Admins</Button>
          <Button component={RouterLink} href={paths.dashboard.doctors} variant="contained">Manage Doctors</Button>
          <Button component={RouterLink} href={paths.dashboard.clinics} variant="outlined">Manage Clinics</Button>
          <Button component={RouterLink} href={paths.dashboard.appointments} variant="outlined">View Appointments</Button>
        </Stack>
      </Grid>
      <Grid size={{ lg: 6, xs: 12 }}>
        <Card>
          <CardHeader title="Doctors" action={<Button component={RouterLink} href={paths.dashboard.doctors} size="small">View all</Button>} />
          <Divider />
          <CardContent>
            {loading ? <Typography color="text.secondary">Loading…</Typography> : (
              <Stack spacing={1}>
                {doctors.slice(0, 5).map((d) => (
                  <Stack key={d.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Avatar sx={{ width: 28, height: 28 }}><StethoscopeIcon fontSize="12" /></Avatar>
                      <Typography variant="body2">Doctor #{d.id}</Typography>
                    </Stack>
                    <Chip label={d.specialty} size="small" variant="outlined" />
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ lg: 6, xs: 12 }}>
        <Card>
          <CardHeader title="Clinics" action={<Button component={RouterLink} href={paths.dashboard.clinics} size="small">View all</Button>} />
          <Divider />
          <CardContent>
            {loading ? <Typography color="text.secondary">Loading…</Typography> : (
              <Stack spacing={1}>
                {clinics.slice(0, 5).map((c) => (
                  <Stack key={c.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Avatar sx={{ width: 28, height: 28 }}><BuildingsIcon fontSize="12" /></Avatar>
                      <Typography variant="body2">{c.name}</Typography>
                    </Stack>
                    <Typography color="text.secondary" variant="caption">{c.city}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Page(): React.JSX.Element {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <Typography color="text.secondary">Loading dashboard…</Typography>
      </Stack>
    );
  }

  const role = user?.role as UserRole | undefined;

  if (role === 'patient') return <PatientDashboard userId={Number(user?.id)} />;
  if (role === 'doctor') return <DoctorDashboard />;
  if (role === 'super_admin') return <SuperAdminDashboard />;
  return <AdminDashboard />;
}

