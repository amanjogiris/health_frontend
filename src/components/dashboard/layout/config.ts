import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';

export const navItems = [
  { key: 'overview', title: 'Overview', href: paths.dashboard.overview, icon: 'chart-pie' },
  { key: 'doctors', title: 'Doctors', href: paths.dashboard.doctors, icon: 'stethoscope' },
  { key: 'clinics', title: 'Clinics', href: paths.dashboard.clinics, icon: 'buildings' },
  { key: 'appointments', title: 'Appointments', href: paths.dashboard.appointments, icon: 'calendar-blank' },
  { key: 'settings', title: 'Settings', href: paths.dashboard.settings, icon: 'gear-six' },
  { key: 'account', title: 'Account', href: paths.dashboard.account, icon: 'user' },
] satisfies NavItemConfig[];
