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
          role: params.role ?? 'patient',
          mobile_no: params.mobile_no,
          address: params.address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail ?? 'Registration failed' };
      }

      localStorage.setItem('custom-auth-token', data.access_token);
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
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: params.email, password: params.password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail ?? 'Invalid email or password' };
      }

      localStorage.setItem('custom-auth-token', data.access_token);
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

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/profile?token=${token}`);

      if (!response.ok) {
        localStorage.removeItem('custom-auth-token');
        return { data: null };
      }

      const user: User = await response.json();
      return { data: user };
    } catch {
      return { error: 'Network error. Please check if the server is running.' };
    }
  }

  async signOut(): Promise<{ error?: string }> {
    const token = localStorage.getItem('custom-auth-token');

    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout?token=${token}`, {
          method: 'POST',
        });
      } catch {
        // noop — still clear locally
      }
    }

    localStorage.removeItem('custom-auth-token');
    return {};
  }
}

export const authClient = new AuthClient();
