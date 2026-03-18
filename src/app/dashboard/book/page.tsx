'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { StethoscopeIcon } from '@phosphor-icons/react/dist/ssr/Stethoscope';

import { RoleGuard } from '@/components/auth/role-guard';
import { BookingDialog } from '@/components/dashboard/booking/booking-dialog';
import type { DoctorResponse } from '@/lib/api';
import { getDoctorAvailability, getDoctors } from '@/lib/api';

// ── helpers ────────────────────────────────────────────────────────────────────

function doctorInitials(name?: string): string {
  if (!name) return 'Dr';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ── DoctorCard ─────────────────────────────────────────────────────────────────

// BookingDialog is imported from '@/components/dashboard/booking/booking-dialog' above.


interface DoctorCardProps {
  doctor: DoctorResponse;
  onBook: (doctor: DoctorResponse) => void;
}

function DoctorCard({ doctor, onBook }: DoctorCardProps): React.JSX.Element {
  return (
    <Card
      sx={{
        height: '100%',
        transition: 'box-shadow 0.2s, transform 0.15s',
        '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
        borderRadius: 3,
      }}
    >
      <CardActionArea
        onClick={() => { onBook(doctor); }}
        sx={{ height: '100%', alignItems: 'flex-start', p: 0 }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                width: 48,
                height: 48,
                fontSize: 16,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {doctorInitials(doctor.doctor_name)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {doctor.doctor_name ?? `Doctor #${doctor.id}`}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {doctor.specialty}
              </Typography>
              {doctor.clinic_name ? (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {doctor.clinic_name}
                </Typography>
              ) : null}

              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }} gap={0.5}>
                {doctor.experience_years > 0 ? (
                  <Chip
                    label={`${doctor.experience_years} yrs exp`}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                ) : null}
                <Chip
                  label={`${doctor.consultation_duration_minutes} min consult`}
                  size="small"
                  variant="outlined"
                />
              </Stack>

              {/* Availability day pills */}
              {doctor.availability && doctor.availability.length > 0 ? (
                <Stack direction="row" spacing={0.4} flexWrap="wrap" sx={{ mt: 1 }} gap={0.4}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, idx) => {
                    const has = doctor.availability!.some((a) => a.day_of_week === idx);
                    return (
                      <Typography
                        key={label}
                        variant="caption"
                        sx={{
                          px: 0.8,
                          py: 0.2,
                          borderRadius: 1,
                          bgcolor: has ? 'success.100' : 'grey.100',
                          color: has ? 'success.800' : 'text.disabled',
                          fontWeight: has ? 700 : 400,
                          fontSize: '0.65rem',
                        }}
                      >
                        {label}
                      </Typography>
                    );
                  })}
                </Stack>
              ) : null}

              <Button
                variant="contained"
                size="small"
                sx={{ mt: 2, borderRadius: 2, fontWeight: 700, width: '100%' }}
                onClick={(e) => { e.stopPropagation(); onBook(doctor); }}
              >
                Book Appointment
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ── Main page content ──────────────────────────────────────────────────────────

function BookContent(): React.JSX.Element {
  const [doctors, setDoctors] = React.useState<DoctorResponse[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState('');
  const [specialty, setSpecialty] = React.useState('');
  const [page, setPage] = React.useState(0);
  const rowsPerPage = 12;

  // Booking dialog
  const [bookTarget, setBookTarget] = React.useState<DoctorResponse | null>(null);

  // Snackbar
  const [snack, setSnack] = React.useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({
    open: false,
    severity: 'success',
    message: '',
  });

  // Debounce search 400ms
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); }, 400);
    return () => { clearTimeout(timer); };
  }, [search]);

  const fetchDoctors = React.useCallback((): void => {
    setLoading(true);
    setError(null);
    getDoctors({
      skip: page * rowsPerPage,
      limit: rowsPerPage,
      search: debouncedSearch || undefined,
      specialty: specialty || undefined,
    })
      .then((res) => {
        setTotal(res.total);
        // Enrich with availability for the day-of-week pills (parallel, non-blocking)
        return Promise.all(
          res.items.map((d) =>
            getDoctorAvailability(d.id)
              .then((avail) => ({ ...d, availability: avail }))
              .catch(() => d),
          ),
        );
      })
      .then((enriched) => { setDoctors(enriched); })
      .catch((e: Error) => { setError(e.message); })
      .finally(() => { setLoading(false); });
  }, [page, debouncedSearch, specialty]);

  React.useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  // Unique specialties from current page for the filter
  const specialties = React.useMemo(
    () => [...new Set(doctors.map((d) => d.specialty).filter(Boolean))].sort(),
    [doctors],
  );

  const totalPages = Math.ceil(total / rowsPerPage);

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <StethoscopeIcon size={28} />
        <Box>
          <Typography variant="h4">Book an Appointment</Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a doctor, pick a date, and select a time slot
          </Typography>
        </Box>
      </Stack>

      {/* Search + filter bar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <OutlinedInput
          placeholder="Search by name…"
          startAdornment={
            <InputAdornment position="start">
              <MagnifyingGlassIcon size={18} />
            </InputAdornment>
          }
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ flex: 1, borderRadius: 2 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Specialty</InputLabel>
          <Select
            label="Specialty"
            value={specialty}
            onChange={(e) => { setSpecialty(e.target.value); setPage(0); }}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="">All Specialties</MenuItem>
            {specialties.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Error */}
      {error ? <Alert severity="error">{error}</Alert> : null}

      {/* Doctor grid */}
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : doctors.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            border: '1.5px dashed',
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          <StethoscopeIcon size={48} style={{ opacity: 0.25 }} />
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            No doctors found. Try adjusting your search or filters.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {doctors.map((doctor) => (
            <Grid key={doctor.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <DoctorCard doctor={doctor} onBook={setBookTarget} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <Stack direction="row" justifyContent="center" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            disabled={page === 0}
            onClick={() => { setPage((p) => p - 1); }}
            sx={{ borderRadius: 2 }}
          >
            Previous
          </Button>
          <Typography variant="body2" sx={{ px: 2, py: 1 }}>
            Page {page + 1} of {totalPages}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            disabled={page >= totalPages - 1}
            onClick={() => { setPage((p) => p + 1); }}
            sx={{ borderRadius: 2 }}
          >
            Next
          </Button>
        </Stack>
      ) : null}

      {/* Booking dialog */}
      {bookTarget ? (
        <BookingDialog
          doctor={bookTarget}
          open={Boolean(bookTarget)}
          onClose={() => { setBookTarget(null); }}
          onBooked={() => {
            setBookTarget(null);
            setSnack({ open: true, severity: 'success', message: 'Appointment booked successfully! 🎉' });
          }}
        />
      ) : null}

      {/* Success snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => { setSnack((s) => ({ ...s, open: false })); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => { setSnack((s) => ({ ...s, open: false })); }}
          sx={{ minWidth: 320, borderRadius: 2 }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

// ── Page export ────────────────────────────────────────────────────────────────

export default function Page(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={['patient', 'admin', 'super_admin']}>
      <BookContent />
    </RoleGuard>
  );
}
