'use client';

import type { User } from '@/types/user';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface SignUpParams {
  name: string;
  email: string;
  password: string;
  role?: string;
  mobile_no?: string;
  address?: string;
}

export interface SignInWithOAuthParams {
  provider: 'google' | 'discord';
}

export interface SignInWithPasswordParams {
  email: string;
  password: string;
}

export interface ResetPasswordParams {
  email: string;
}

class AuthClient {
  async signUp(params: SignUpParams): Promise<{ error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: params.name,
          email: params.email,
          password: params.password,
          // role is always patient for public registration
          mobile_no: params.mobile_no,
          address: params.address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail ?? 'Registration failed' };
      }

      localStorage.setItem('custom-auth-token', data.access_token);
      localStorage.setItem('custom-auth-user', JSON.stringify(data.user));
      return {};
    } catch {
      return { error: 'Network error. Please check if the server is running.' };
    }
  }

  async signInWithOAuth(_: SignInWithOAuthParams): Promise<{ error?: string }> {
    return { error: 'Social authentication not implemented' };
  }

  async signInWithPassword(params: SignInWithPasswordParams): Promise<{ error?: string }> {
    try {
      // OAuth2PasswordRequestForm requires application/x-www-form-urlencoded
      const body = new URLSearchParams();
      body.set('grant_type', 'password');
      body.set('username', params.email);
      body.set('password', params.password);

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail ?? 'Invalid email or password' };
      }

      localStorage.setItem('custom-auth-token', data.access_token);
      // Cache user data to avoid extra profile fetch on every page load
      localStorage.setItem('custom-auth-user', JSON.stringify(data.user));
      return {};
    } catch {
      return { error: 'Network error. Please check if the server is running.' };
    }
  }

  async resetPassword(_: ResetPasswordParams): Promise<{ error?: string }> {
    return { error: 'Password reset not implemented' };
  }

  async updatePassword(_: ResetPasswordParams): Promise<{ error?: string }> {
    return { error: 'Update reset not implemented' };
  }

  async getUser(): Promise<{ data?: User | null; error?: string }> {
    const token = localStorage.getItem('custom-auth-token');

    if (!token) {
      return { data: null };
    }

    // Return cached user immediately if available to avoid latency
    const cached = localStorage.getItem('custom-auth-user');
    if (cached) {
      try {
        return { data: JSON.parse(cached) as User };
      } catch { /* ignore parse errors */ }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        localStorage.removeItem('custom-auth-token');
        localStorage.removeItem('custom-auth-user');
        return { data: null };
      }

      const user: User = await response.json();
      localStorage.setItem('custom-auth-user', JSON.stringify(user));
      return { data: user };
    } catch {
      return { error: 'Network error. Please check if the server is running.' };
    }
  }

  async signOut(): Promise<{ error?: string }> {
    const token = localStorage.getItem('custom-auth-token');

    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch {
        // noop — still clear locally
      }
    }

    localStorage.removeItem('custom-auth-token');
    localStorage.removeItem('custom-auth-user');
    return {};
  }
}

export const authClient = new AuthClient();
