'use client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('custom-auth-token');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const url = new URL(`${API_BASE_URL}${path}`);
  if (token) url.searchParams.set('token', token);

  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail ?? 'Request failed');
  }

  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DoctorResponse {
  id: number;
  user_id: number;
  clinic_id: number;
  specialty: string;
  license_number: string;
  qualifications?: string;
  experience_years: number;
  max_patients_per_day: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClinicResponse {
  id: number;
  name: string;
  address: string;
  phone: string;
  email?: string;
  city: string;
  state: string;
  zip_code: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentSlotResponse {
  id: number;
  doctor_id: number;
  clinic_id: number;
  slot_datetime: string;
  duration_minutes: number;
  is_booked: boolean;
  capacity: number;
  booked_count: number;
  available_slots: number;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentResponse {
  id: number;
  patient_id: number;
  doctor_id: number;
  clinic_id: number;
  slot_id: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  reason_for_visit?: string;
  notes?: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PatientResponse {
  id: number;
  user_id: number;
  date_of_birth?: string;
  blood_group?: string;
  allergies?: string;
  emergency_contact?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export async function getDoctors(params?: { specialty?: string; clinic_id?: number }): Promise<DoctorResponse[]> {
  const qs = new URLSearchParams();
  if (params?.specialty) qs.set('specialty', params.specialty);
  if (params?.clinic_id) qs.set('clinic_id', String(params.clinic_id));
  return apiFetch<DoctorResponse[]>(`/api/v1/doctors?${qs}`);
}

export async function getDoctor(id: number): Promise<DoctorResponse> {
  return apiFetch<DoctorResponse>(`/api/v1/doctors/${id}`);
}

export async function getClinics(city?: string): Promise<ClinicResponse[]> {
  const qs = city ? `?city=${encodeURIComponent(city)}` : '';
  return apiFetch<ClinicResponse[]>(`/api/v1/clinics${qs}`);
}

export async function getClinic(id: number): Promise<ClinicResponse> {
  return apiFetch<ClinicResponse>(`/api/v1/clinics/${id}`);
}

export async function getSlots(params?: {
  doctor_id?: number;
  clinic_id?: number;
  date_from?: string;
  date_to?: string;
}): Promise<AppointmentSlotResponse[]> {
  const qs = new URLSearchParams();
  if (params?.doctor_id) qs.set('doctor_id', String(params.doctor_id));
  if (params?.clinic_id) qs.set('clinic_id', String(params.clinic_id));
  if (params?.date_from) qs.set('date_from', params.date_from);
  if (params?.date_to) qs.set('date_to', params.date_to);
  return apiFetch<AppointmentSlotResponse[]>(`/api/v1/slots?${qs}`);
}

export async function getAppointments(skip = 0, limit = 100): Promise<AppointmentResponse[]> {
  return apiFetch<AppointmentResponse[]>(`/api/v1/appointments?skip=${skip}&limit=${limit}`);
}

export async function getPatientAppointments(patientId: number): Promise<AppointmentResponse[]> {
  return apiFetch<AppointmentResponse[]>(`/api/v1/patients/${patientId}/appointments`);
}

export async function getPatient(patientId: number): Promise<PatientResponse> {
  return apiFetch<PatientResponse>(`/api/v1/patients/${patientId}`);
}

export async function cancelAppointment(appointmentId: number, reason: string): Promise<AppointmentResponse> {
  return apiFetch<AppointmentResponse>(`/api/v1/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancelled_reason: reason }),
  });
}

export async function bookAppointment(data: {
  patient_id: number;
  doctor_id: number;
  clinic_id: number;
  slot_id: number;
  reason_for_visit?: string;
}): Promise<AppointmentResponse> {
  return apiFetch<AppointmentResponse>('/api/v1/appointments/book', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
