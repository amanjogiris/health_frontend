import type { NavItemConfig } from '@/types/nav';
import type { UserRole } from '@/types/user';
import { paths } from '@/paths';

/** All possible nav items with the roles that can see each one. */
const ALL_NAV_ITEMS: (NavItemConfig & { roles?: UserRole[] })[] = [
  // Visible to ALL authenticated roles
  { key: 'overview', title: 'Overview', href: paths.dashboard.overview, icon: 'chart-pie' },
  { key: 'account', title: 'Account', href: paths.dashboard.account, icon: 'user' },

  // PATIENT only
  { key: 'appointments', title: 'My Appointments', href: paths.dashboard.appointments, icon: 'calendar-blank', roles: ['patient'] },
  { key: 'find-doctors', title: 'Find Doctors', href: paths.dashboard.doctors, icon: 'stethoscope', roles: ['patient'] },
  { key: 'clinics-patient', title: 'Clinics', href: paths.dashboard.clinics, icon: 'buildings', roles: ['patient'] },

  // DOCTOR only
  { key: 'doctor-appointments', title: 'My Appointments', href: paths.dashboard.appointments, icon: 'calendar-blank', roles: ['doctor'] },

  // ADMIN / SUPER_ADMIN
  { key: 'doctors', title: 'Doctors', href: paths.dashboard.doctors, icon: 'stethoscope', roles: ['admin', 'super_admin'] },
  { key: 'clinics', title: 'Clinics', href: paths.dashboard.clinics, icon: 'buildings', roles: ['admin', 'super_admin'] },
  { key: 'all-appointments', title: 'Appointments', href: paths.dashboard.appointments, icon: 'calendar-blank', roles: ['admin', 'super_admin'] },

  // SUPER_ADMIN only
  { key: 'admins', title: 'Admins', href: paths.dashboard.admins, icon: 'users', roles: ['super_admin'] },

  // All roles
  { key: 'settings', title: 'Settings', href: paths.dashboard.settings, icon: 'gear-six' },
];

/**
 * Returns the nav items visible for a given role.
 * Items with no `roles` restriction are shown to everyone.
 */
export function getNavItems(role?: UserRole | string): NavItemConfig[] {
  return ALL_NAV_ITEMS.filter(({ roles }) => {
    if (!roles) return true;
    if (!role) return false;
    return roles.includes(role as UserRole);
  });
}

/** Backwards-compatible default (all items, for SSR / unknown role). */
export const navItems: NavItemConfig[] = ALL_NAV_ITEMS;
