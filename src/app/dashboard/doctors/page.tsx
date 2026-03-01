'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { StethoscopeIcon } from '@phosphor-icons/react/dist/ssr/Stethoscope';

import type { DoctorResponse } from '@/lib/api';
import { getDoctors } from '@/lib/api';

export default function Page(): React.JSX.Element {
  const [doctors, setDoctors] = React.useState<DoctorResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage] = React.useState(10);

  React.useEffect(() => {
    getDoctors()
      .then(setDoctors)
      .catch((err: Error) => { setError(err.message); })
      .finally(() => { setLoading(false); });
  }, []);

  const filtered = doctors.filter((d) =>
    d.specialty.toLowerCase().includes(search.toLowerCase()) ||
    d.license_number.toLowerCase().includes(search.toLowerCase()) ||
    (d.qualifications ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
          <Typography variant="h4">Doctors</Typography>
          <Typography color="text.secondary" variant="body2">
            {loading ? 'Loading...' : `${filtered.length} doctor${filtered.length !== 1 ? 's' : ''} found`}
          </Typography>
        </Stack>
      </Stack>

      <Card>
        <CardHeader
          title="All Doctors"
          subheader="Fetched from /api/v1/doctors"
          action={
            <OutlinedInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search specialty, license…"
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
                <TableCell>Doctor</TableCell>
                <TableCell>Specialty</TableCell>
                <TableCell>License No.</TableCell>
                <TableCell>Qualifications</TableCell>
                <TableCell>Experience</TableCell>
                <TableCell>Max Patients/Day</TableCell>
                <TableCell>Clinic ID</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography variant="body2" color="text.secondary">Loading doctors...</Typography>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography variant="body2" color="error">Error: {error}</Typography>
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
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
                        <Typography variant="subtitle2">Doctor #{doctor.id}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={doctor.specialty} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{doctor.license_number}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: '180px' }}>
                        {doctor.qualifications ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{doctor.experience_years} yr{doctor.experience_years !== 1 ? 's' : ''}</TableCell>
                    <TableCell>{doctor.max_patients_per_day}</TableCell>
                    <TableCell>#{doctor.clinic_id}</TableCell>
                    <TableCell>
                      <Chip
                        label={doctor.is_active ? 'Active' : 'Inactive'}
                        color={doctor.is_active ? 'success' : 'error'}
                        size="small"
                      />
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
    </Stack>
  );
}
