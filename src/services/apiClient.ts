/**
 * Centralised API client for the Health Services backend.
 * All requests automatically attach the stored Bearer token.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('custom-auth-token');
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers ?? {}) as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    const message = Array.isArray(err.detail)
      ? err.detail.map((e: { msg: string }) => e.msg).join(', ')
      : (err.detail ?? 'Request failed');
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
