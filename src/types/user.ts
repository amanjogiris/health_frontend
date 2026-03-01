export interface User {
  id: number | string;
  name?: string;
  email?: string;
  role?: string;
  mobile_no?: string;
  address?: string;
  is_verified?: boolean;
  is_active?: boolean;
  last_login?: string | null;
  created_at?: string | null;
  avatar?: string;

  [key: string]: unknown;
}
