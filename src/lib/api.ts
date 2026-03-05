'use client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('custom-auth-token');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers ?? {}) as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvailabilityInput {
  day_of_week: number; // 0 = Monday … 6 = Sunday
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
}

export interface AvailabilityResponse {
  id: number;
  doctor_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface DoctorResponse {
  id: number;
  user_id: number;
  clinic_id: number;
  specialty: string;
  license_number: string;
  qualifications?: string;
  experience_years: number;
  max_patients_per_day: number;
  consultation_duration_minutes: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  /** Enriched by service JOIN */
  doctor_name?: string;
  clinic_name?: string;
  availability?: AvailabilityResponse[];
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
  /** ISO-8601 datetime string */
  start_time: string;
  /** ISO-8601 datetime string */
  end_time: string;
  is_booked: boolean;
  capacity: number;
  booked_count: number;
  is_active: boolean;
  created_at?: string;
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

// ─── Doctor self-service ───────────────────────────────────────────────────────

export async function getDoctorProfile(): Promise<DoctorResponse> {
  return apiFetch<DoctorResponse>('/api/v1/doctors/profile');
}

export async function updateDoctorProfile(data: Partial<DoctorResponse>): Promise<DoctorResponse> {
  return apiFetch<DoctorResponse>('/api/v1/doctors/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getDoctorAppointments(skip = 0, limit = 100): Promise<AppointmentResponse[]> {
  return apiFetch<AppointmentResponse[]>(`/api/v1/doctors/appointments?skip=${skip}&limit=${limit}`);
}

// ─── Admin management (SUPER_ADMIN only) ──────────────────────────────────────

export interface AdminUserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  mobile_no?: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at?: string | null;
}

export async function getAdmins(): Promise<AdminUserResponse[]> {
  return apiFetch<AdminUserResponse[]>('/api/v1/admins');
}

export async function createAdmin(data: {
  name: string;
  email: string;
  password: string;
  mobile_no?: string;
}): Promise<AdminUserResponse> {
  return apiFetch<AdminUserResponse>('/api/v1/admins', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAdmin(id: number): Promise<void> {
  return apiFetch<void>(`/api/v1/admins/${id}`, { method: 'DELETE' });
}

// ─── Doctor management (ADMIN / SUPER_ADMIN) ──────────────────────────────────

export async function createDoctor(data: {
  user_id: number;
  clinic_id: number;
  specialty: string;
  license_number: string;
  qualifications?: string;
  experience_years?: number;
  max_patients_per_day?: number;
}): Promise<DoctorResponse> {
  return apiFetch<DoctorResponse>('/api/v1/doctors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function registerDoctor(data: {
  name: string;
  email: string;
  password: string;
  mobile_no?: string;
  clinic_id: number;
  specialty: string;
  license_number: string;
  qualifications?: string;
  experience_years?: number;
  max_patients_per_day?: number;
  consultation_duration_minutes?: number;
  availability?: AvailabilityInput[];
}): Promise<DoctorResponse> {
  return apiFetch<DoctorResponse>('/api/v1/doctors/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getDoctorAvailability(doctorId: number): Promise<AvailabilityResponse[]> {
  return apiFetch<AvailabilityResponse[]>(`/api/v1/doctors/${doctorId}/availability`);
}

export async function setDoctorAvailability(
  doctorId: number,
  availability: AvailabilityInput[]
): Promise<AvailabilityResponse[]> {
  return apiFetch<AvailabilityResponse[]>(`/api/v1/doctors/${doctorId}/availability`, {
    method: 'PUT',
    body: JSON.stringify(availability),
  });
}

export async function deleteDoctor(id: number): Promise<void> {
  return apiFetch<void>(`/api/v1/doctors/${id}`, { method: 'DELETE' });
}

// ─── Clinic management (ADMIN / SUPER_ADMIN) ──────────────────────────────────

export async function createClinic(data: {
  name: string;
  address: string;
  phone: string;
  city: string;
  state: string;
  zip_code: string;
  email?: string;
}): Promise<ClinicResponse> {
  return apiFetch<ClinicResponse>('/api/v1/clinics', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateClinic(
  id: number,
  data: Partial<Omit<ClinicResponse, 'id' | 'is_active' | 'created_at' | 'updated_at'>>
): Promise<ClinicResponse> {
  return apiFetch<ClinicResponse>(`/api/v1/clinics/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteClinic(id: number): Promise<void> {
  return apiFetch<void>(`/api/v1/clinics/${id}`, { method: 'DELETE' });
}
