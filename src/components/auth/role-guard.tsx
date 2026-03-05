'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';

import type { UserRole } from '@/types/user';
import { paths } from '@/paths';
import { logger } from '@/lib/default-logger';
import { useUser } from '@/hooks/use-user';

export interface RoleGuardProps {
  /** Allowed roles. If the user's role is not in this list they are redirected. */
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/**
 * Wraps a page/section and renders children only if the authenticated user
 * has one of the `allowedRoles`.  Redirects to the dashboard overview
 * otherwise so the user lands somewhere appropriate.
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps): React.JSX.Element | null {
  const router = useRouter();
  const { user, error, isLoading } = useUser();
  const [isChecking, setIsChecking] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace(paths.auth.signIn);
      return;
    }

    if (!allowedRoles.includes(user.role as UserRole)) {
      logger.debug(`[RoleGuard]: role "${user.role}" not in [${allowedRoles.join(', ')}], redirecting`);
      router.replace(paths.dashboard.overview);
      return;
    }

    setIsChecking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roles are constant
  }, [user, error, isLoading]);

  if (isChecking) {
    return null;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return <React.Fragment>{children}</React.Fragment>;
}
