'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { CameraIcon } from '@phosphor-icons/react/dist/ssr/Camera';

import { uploadProfileImage } from '@/lib/api';
import { useUser } from '@/hooks/use-user';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export function AccountInfo(): React.JSX.Element {
  const { user, checkSession } = useUser();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  // Local image state so avatar updates instantly without waiting for context
  const [localImage, setLocalImage] = React.useState<string | null>(null);

  // Sync local image whenever context user changes
  React.useEffect(() => {
    if (user?.image) setLocalImage(user.image as string);
  }, [user?.image]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const imageField = localImage ?? (user?.image as string | undefined);
  const avatarSrc = imageField ? `${API_BASE}${imageField}` : undefined;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadProfileImage(file) as Record<string, unknown>;
      // Update local state immediately from upload response
      if (result.image) setLocalImage(result.image as string);
      // Clear stale cache so checkSession fetches fresh data from server
      if (typeof window !== 'undefined') localStorage.removeItem('custom-auth-user');
      await checkSession?.();
    } catch {
      // noop
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          {/* Avatar with camera overlay */}
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <Avatar
              src={avatarSrc}
              sx={{ height: '80px', width: '80px', fontSize: '1.5rem', bgcolor: 'primary.main' }}
            >
              {!avatarSrc ? initials : null}
            </Avatar>

            {uploading ? (
              <Box
                sx={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0.4)',
                }}
              >
                <CircularProgress size={24} sx={{ color: '#fff' }} />
              </Box>
            ) : (
              <Tooltip title="Upload photo">
                <IconButton
                  size="small"
                  onClick={() => { fileInputRef.current?.click(); }}
                  sx={{
                    position: 'absolute', bottom: -4, right: -4,
                    bgcolor: 'background.paper', border: '2px solid',
                    borderColor: 'divider', p: '4px',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <CameraIcon fontSize="16px" />
                </IconButton>
              </Tooltip>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => { void handleFileChange(e); }}
            />
          </Box>

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
