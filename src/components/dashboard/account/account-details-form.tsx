'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';

import { updateMyProfile } from '@/lib/api';
import { useUser } from '@/hooks/use-user';

export function AccountDetailsForm(): React.JSX.Element {
  const { user, checkSession } = useUser();
  const isEditable = user?.role === 'patient' || user?.role === 'doctor';

  const [name, setName] = React.useState(user?.name ?? '');
  const [mobileNo, setMobileNo] = React.useState(user?.mobile_no ?? '');
  const [address, setAddress] = React.useState(user?.address ?? '');
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState('');

  // Sync state when user object loads/changes
  React.useEffect(() => {
    setName(user?.name ?? '');
    setMobileNo(user?.mobile_no ?? '');
    setAddress(user?.address ?? '');
  }, [user?.name, user?.mobile_no, user?.address]);

  async function handleSave(): Promise<void> {
    setSaving(true);
    setSuccess(false);
    setError('');
    try {
      await updateMyProfile({ name, mobile_no: mobileNo, address });
      // Clear stale cache so checkSession fetches fresh data from server
      if (typeof window !== 'undefined') localStorage.removeItem('custom-auth-user');
      await checkSession?.();
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

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
                <OutlinedInput
                  label="Full Name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); }}
                  readOnly={!isEditable}
                  disabled={saving}
                />
              </FormControl>
            </Grid>
            <Grid size={{ md: 6, xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Email address</InputLabel>
                <OutlinedInput
                  label="Email address"
                  value={user?.email ?? ''}
                  type="email"
                  readOnly
                />
              </FormControl>
            </Grid>
            <Grid size={{ md: 6, xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Mobile Number</InputLabel>
                <OutlinedInput
                  label="Mobile Number"
                  value={mobileNo}
                  onChange={(e) => { setMobileNo(e.target.value); }}
                  type="tel"
                  readOnly={!isEditable}
                  disabled={saving}
                />
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
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Address</InputLabel>
                <OutlinedInput
                  label="Address"
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); }}
                  readOnly={!isEditable}
                  disabled={saving}
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
        <CardActions sx={{ justifyContent: 'flex-end', gap: 1, px: 2, py: 1.5 }}>
          {isEditable ? (
            <>
              {success ? <Alert severity="success" sx={{ py: 0, flex: 1 }}>Changes saved successfully.</Alert> : null}
              {error ? <Alert severity="error" sx={{ py: 0, flex: 1 }}>{error}</Alert> : null}
              <Button variant="contained" onClick={() => { void handleSave(); }} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Alert severity="info" sx={{ py: 0, flex: 1 }}>Profile updates are managed by your administrator.</Alert>
          )}
        </CardActions>
      </Card>
    </div>
  );
}
