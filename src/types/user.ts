export type UserRole = 'super_admin' | 'admin' | 'doctor' | 'patient';

export interface User {
  id: number | string;
  name?: string;
  email?: string;
  role?: UserRole;
  mobile_no?: string;
  address?: string;
  image?: string;
  is_verified?: boolean;
  is_active?: boolean;
  last_login?: string | null;
  created_at?: string | null;
  avatar?: string;

  [key: string]: unknown;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  doctor: 'Doctor',
  patient: 'Patient',
};
