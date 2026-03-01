'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useUser } from '@/hooks/use-user';

export function AccountInfo(): React.JSX.Element {
  const { user } = useUser();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <Card>
      <CardContent>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ height: '80px', width: '80px', fontSize: '1.5rem', bgcolor: 'primary.main' }}>
            {initials}
          </Avatar>
          <Stack spacing={1} sx={{ textAlign: 'center' }}>
            <Typography variant="h5">{user?.name ?? '—'}</Typography>
            <Typography color="text.secondary" variant="body2">
              {user?.email ?? ''}
            </Typography>
            {user?.role ? (
              <Chip
                label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                size="small"
                color={user.role === 'admin' ? 'error' : user.role === 'doctor' ? 'primary' : 'success'}
              />
            ) : null}
            {user?.address ? (
              <Typography color="text.secondary" variant="body2">
                {user.address}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
      <Divider />
    </Card>
  );
}
