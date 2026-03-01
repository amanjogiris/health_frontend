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
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { EnvelopeIcon } from '@phosphor-icons/react/dist/ssr/Envelope';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';

import type { ClinicResponse } from '@/lib/api';
import { getClinics } from '@/lib/api';

export default function Page(): React.JSX.Element {
  const [clinics, setClinics] = React.useState<ClinicResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    getClinics()
      .then(setClinics)
      .catch((err: Error) => { setError(err.message); })
      .finally(() => { setLoading(false); });
  }, []);

  const filtered = clinics.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase()) ||
    c.state.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={1} sx={{ flex: '1 1 auto' }}>
          <Typography variant="h4">Clinics</Typography>
          <Typography color="text.secondary" variant="body2">
            {loading ? 'Loading...' : `${filtered.length} clinic${filtered.length !== 1 ? 's' : ''} found`}
          </Typography>
        </Stack>
        <OutlinedInput
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          placeholder="Search name, city, state…"
          size="small"
          startAdornment={
            <InputAdornment position="start">
              <MagnifyingGlassIcon fontSize="var(--icon-fontSize-md)" />
            </InputAdornment>
          }
          sx={{ width: '260px' }}
        />
      </Stack>

      {error ? (
        <Card>
          <CardContent>
            <Typography color="error">Error: {error}</Typography>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary">Loading clinics from /api/v1/clinics…</Typography>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary">No clinics found.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filtered.map((clinic) => (
            <Grid key={clinic.id} size={{ lg: 4, md: 6, xs: 12 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
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
                        <Typography color="text.secondary" variant="caption">
                          Clinic #{clinic.id}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Divider />

                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                        <MapPinIcon color="var(--mui-palette-neutral-500)" fontSize="var(--icon-fontSize-md)" />
                        <Stack spacing={0}>
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
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
