'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useUser } from '@/hooks/use-user';

export function AccountDetailsForm(): React.JSX.Element {
  const { user } = useUser();

  return (
    <div>
      <Card>
        <CardHeader subheader="Your profile information from the Health Portal" title="Profile" />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ md: 6, xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Full Name</InputLabel>
                <OutlinedInput defaultValue={user?.name ?? ''} label="Full Name" name="name" readOnly />
              </FormControl>
            </Grid>
            <Grid size={{ md: 6, xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Email address</InputLabel>
                <OutlinedInput defaultValue={user?.email ?? ''} label="Email address" name="email" type="email" readOnly />
              </FormControl>
            </Grid>
            <Grid size={{ md: 6, xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Mobile Number</InputLabel>
                <OutlinedInput defaultValue={user?.mobile_no ?? ''} label="Mobile Number" name="mobile_no" type="tel" readOnly />
              </FormControl>
            </Grid>
            <Grid size={{ md: 6, xs: 12 }}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">Role</Typography>
                {user?.role ? (
                  <Chip
                    label={user.role === 'super_admin' ? 'Super Admin' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    color={
                      user.role === 'super_admin' ? 'error' :
                      user.role === 'admin' ? 'warning' :
                      user.role === 'doctor' ? 'primary' : 'success'
                    }
                    sx={{ alignSelf: 'flex-start' }}
                  />
                ) : (
                  <Typography variant="body2">—</Typography>
                )}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Address</InputLabel>
                <OutlinedInput defaultValue={user?.address ?? ''} label="Address" name="address" readOnly />
              </FormControl>
            </Grid>
            <Grid size={{ md: 6, xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Account Status</InputLabel>
                <OutlinedInput
                  value={user?.is_active ? 'Active' : 'Inactive'}
                  label="Account Status"
                  readOnly
                  inputProps={{ style: { color: user?.is_active ? 'green' : 'red' } }}
                />
              </FormControl>
            </Grid>
            <Grid size={{ md: 6, xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Member Since</InputLabel>
                <OutlinedInput
                  value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  label="Member Since"
                  readOnly
                />
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
          <Alert severity="info" sx={{ py: 0, flex: 1 }}>Profile updates are managed by your administrator.</Alert>
        </CardActions>
      </Card>
    </div>
  );
}
