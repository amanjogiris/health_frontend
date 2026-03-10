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
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';

import { changePassword } from '@/lib/api';

export function UpdatePasswordForm(): React.JSX.Element {
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState('');

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < 8;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }}>
      <Card>
        <CardHeader subheader="Update your account password" title="Password" />
        <Divider />
        <CardContent>
          <Stack spacing={3} sx={{ maxWidth: 'sm' }}>
            <FormControl fullWidth>
              <InputLabel>Current Password</InputLabel>
              <OutlinedInput
                label="Current Password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); }}
                disabled={saving}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setShowCurrent((v) => !v); }} edge="end">
                      {showCurrent ? <EyeSlashIcon /> : <EyeIcon />}
                    </IconButton>
                  </InputAdornment>
                }
              />
            </FormControl>
            <FormControl fullWidth error={tooShort}>
              <InputLabel>New Password</InputLabel>
              <OutlinedInput
                label="New Password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); }}
                disabled={saving}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setShowNew((v) => !v); }} edge="end">
                      {showNew ? <EyeSlashIcon /> : <EyeIcon />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              {tooShort ? <FormHelperText>Must be at least 8 characters</FormHelperText> : null}
            </FormControl>
            <FormControl fullWidth error={mismatch}>
              <InputLabel>Confirm New Password</InputLabel>
              <OutlinedInput
                label="Confirm New Password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); }}
                disabled={saving}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setShowConfirm((v) => !v); }} edge="end">
                      {showConfirm ? <EyeSlashIcon /> : <EyeIcon />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              {mismatch ? <FormHelperText>Passwords do not match</FormHelperText> : null}
            </FormControl>
          </Stack>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end', gap: 1, px: 2, py: 1.5 }}>
          {success ? <Alert severity="success" sx={{ py: 0, flex: 1 }}>Password updated successfully.</Alert> : null}
          {error ? <Alert severity="error" sx={{ py: 0, flex: 1 }}>{error}</Alert> : null}
          <Button type="submit" variant="contained" disabled={saving || mismatch || tooShort}>
            {saving ? 'Updating…' : 'Update Password'}
          </Button>
        </CardActions>
      </Card>
    </form>
  );
}
