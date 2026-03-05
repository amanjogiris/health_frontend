/**
 * Auth service – wraps register, login, logout and profile endpoints.
 */
import { apiFetch } from './apiClient';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: 'patient' | 'admin' | 'doctor';
  mobile_no?: string;
  address?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  mobile_no?: string;
  address?: string;
  is_verified: boolean;
  is_active: boolean;
  last_login?: string;
  created_at?: string;
}

function storeToken(token: string): void {
  localStorage.setItem('custom-auth-token', token);
}

function clearToken(): void {
  localStorage.removeItem('custom-auth-token');
}

export async function register(payload: RegisterPayload): Promise<AuthToken> {
  const data = await apiFetch<AuthToken>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...payload, role: payload.role ?? 'patient' }),
  });
  storeToken(data.access_token);
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthToken> {
  const data = await apiFetch<AuthToken>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  storeToken(data.access_token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' });
  } finally {
    clearToken();
  }
}

export async function getProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/v1/auth/profile');
}
