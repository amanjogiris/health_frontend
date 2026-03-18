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

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface AvailabilityInput {
  day_of_week: number; // 0 = Monday … 6 = Sunday
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
  slot_interval?: number; // minutes per slot (default 15)
}

export interface AvailabilityResponse {
  id: number;
  doctor_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_interval: number;  // minutes per slot (added by dynamic slot system)
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
  email?: string;
  mobile_no?: string;
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

export type SlotStatus = 'available' | 'booked' | 'cancelled' | 'blocked';

// ── Dynamic slot system ────────────────────────────────────────────────────────

export interface DynamicSlotItem {
  start_time: string;   // ISO-8601 UTC
  end_time: string;     // ISO-8601 UTC
  is_available: boolean;
  duration_minutes: number;
}

export interface DoctorSlotsResponse {
  doctor_id: number;
  date: string;           // YYYY-MM-DD
  slot_interval_minutes: number;
  total_slots: number;
  available_slots: number;
  slots: DynamicSlotItem[];
}

export interface DynamicAppointmentResponse {
  id: number;
  doctor_id: number;
  patient_id: number;
  clinic_id: number;
  start_time: string;
  end_time: string;
  status: string;
  slots_count: number;
  reason_for_visit?: string;
  notes?: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  created_at?: string;
}

export interface AppointmentSlotResponse {
  id: number;
  doctor_id: number;
  clinic_id: number;
  /** Calendar date string YYYY-MM-DD (denormalised) */
  date?: string;
  /** ISO-8601 datetime string */
  start_time: string;
  /** ISO-8601 datetime string */
  end_time: string;
  status: SlotStatus;
  is_booked: boolean;
  capacity: number;
  booked_count: number;
  is_active: boolean;
  created_at?: string;
}

export interface SlotToggleResponse {
  id: number;
  is_active: boolean;
  message: string;
}

export interface AppointmentResponse {
  id: number;
  patient_id: number;
  doctor_id: number;
  clinic_id: number;
  slot_id: number;
  status: 'pending' | 'booked' | 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'rejected';
  reason_for_visit?: string;
  notes?: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  created_at?: string;
  updated_at?: string;
  // Enriched join fields returned by the service layer
  patient_name?: string;
  doctor_name?: string;
  clinic_name?: string;
  slot_time?: string;
}

/** Envelope returned by POST /api/v1/appointments/book */
export interface BookingResponse {
  success: boolean;
  message: string;
  appointment_id?: number;
  appointment?: AppointmentResponse;
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
  // Enriched fields (admin list)
  patient_name?: string;
  email?: string;
  mobile_no?: string;
  address?: string;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export async function getDoctors(params?: { specialty?: string; clinic_id?: number; skip?: number; limit?: number; search?: string }): Promise<PaginatedResponse<DoctorResponse>> {
  const qs = new URLSearchParams();
  if (params?.specialty) qs.set('specialty', params.specialty);
  if (params?.clinic_id) qs.set('clinic_id', String(params.clinic_id));
  if (params?.skip !== undefined) qs.set('skip', String(params.skip));
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.search) qs.set('search', params.search);
  return apiFetch<PaginatedResponse<DoctorResponse>>(`/api/v1/doctors?${qs}`);
}

export async function getDoctor(id: number): Promise<DoctorResponse> {
  return apiFetch<DoctorResponse>(`/api/v1/doctors/${id}`);
}

export async function getClinics(params?: { city?: string; skip?: number; limit?: number; search?: string }): Promise<PaginatedResponse<ClinicResponse>> {
  const qs = new URLSearchParams();
  if (params?.city) qs.set('city', params.city);
  if (params?.skip !== undefined) qs.set('skip', String(params.skip));
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.search) qs.set('search', params.search);
  return apiFetch<PaginatedResponse<ClinicResponse>>(`/api/v1/clinics?${qs}`);
}

export async function getClinic(id: number): Promise<ClinicResponse> {
  return apiFetch<ClinicResponse>(`/api/v1/clinics/${id}`);
}

export async function getSlots(params?: {
  doctor_id?: number;
  clinic_id?: number;
  date_from?: string;
  date_to?: string;
  status?: SlotStatus;
  skip?: number;
  limit?: number;
  include_all?: boolean;
}): Promise<AppointmentSlotResponse[]> {
  const qs = new URLSearchParams();
  if (params?.doctor_id) qs.set('doctor_id', String(params.doctor_id));
  if (params?.clinic_id) qs.set('clinic_id', String(params.clinic_id));
  if (params?.date_from) qs.set('date_from', params.date_from);
  if (params?.date_to) qs.set('date_to', params.date_to);
  if (params?.status) qs.set('status', params.status);
  if (params?.skip !== undefined) qs.set('skip', String(params.skip));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.include_all) qs.set('include_all', 'true');
  return apiFetch<AppointmentSlotResponse[]>(`/api/v1/slots?${qs}`);
}

export async function createSlot(data: {
  doctor_id: number;
  clinic_id: number;
  start_time: string;
  end_time: string;
  capacity?: number;
  status?: SlotStatus;
}): Promise<AppointmentSlotResponse> {
  return apiFetch<AppointmentSlotResponse>('/api/v1/slots', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSlot(
  slotId: number,
  data: {
    start_time?: string;
    end_time?: string;
    capacity?: number;
    status?: SlotStatus;
  },
  force = false,
): Promise<AppointmentSlotResponse> {
  const url = force ? `/api/v1/slots/${slotId}?force=true` : `/api/v1/slots/${slotId}`;
  return apiFetch<AppointmentSlotResponse>(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleSlotActive(slotId: number): Promise<SlotToggleResponse> {
  return apiFetch<SlotToggleResponse>(`/api/v1/slots/${slotId}/toggle-active`, { method: 'PATCH' });
}

export async function deleteSlot(slotId: number): Promise<void> {
  return apiFetch<void>(`/api/v1/slots/${slotId}`, { method: 'DELETE' });
}

export async function generateSlotsForDoctor(
  doctorId: number,
  params?: { days_ahead?: number; date_from?: string; date_to?: string },
): Promise<{ generated: number; date_from?: string; date_to?: string; days_ahead?: number }> {
  const qs = new URLSearchParams();
  if (params?.days_ahead) qs.set('days_ahead', String(params.days_ahead));
  if (params?.date_from) qs.set('date_from', params.date_from);
  if (params?.date_to) qs.set('date_to', params.date_to);
  return apiFetch(`/api/v1/doctors/${doctorId}/slots/generate?${qs}`, { method: 'POST' });
}

export async function getAppointments(skip = 0, limit = 10, search?: string, status?: string): Promise<PaginatedResponse<AppointmentResponse>> {
  const qs = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (search) qs.set('search', search);
  if (status && status !== 'all') qs.set('status', status);
  return apiFetch<PaginatedResponse<AppointmentResponse>>(`/api/v1/appointments?${qs}`);
}

export async function getPatientAppointments(patientId: number): Promise<AppointmentResponse[]> {
  return apiFetch<AppointmentResponse[]>(`/api/v1/patients/${patientId}/appointments`);
}

export async function getMyPatientAppointments(skip = 0, limit = 100): Promise<AppointmentResponse[]> {
  return apiFetch<AppointmentResponse[]>(`/api/v1/patients/me/appointments?skip=${skip}&limit=${limit}`);
}

export async function getPatient(patientId: number): Promise<PatientResponse> {
  return apiFetch<PatientResponse>(`/api/v1/patients/${patientId}`);
}

export async function updateMyProfile(data: { name?: string; mobile_no?: string; address?: string }): Promise<unknown> {
  const result = await apiFetch<unknown>('/api/v1/auth/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  // Update the localStorage cache so checkSession() picks up fresh data
  if (typeof window !== 'undefined') {
    localStorage.setItem('custom-auth-user', JSON.stringify(result));
  }
  return result;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiFetch<unknown>('/api/v1/auth/password', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function uploadProfileImage(file: File): Promise<unknown> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/auth/profile/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error((err as { detail?: string }).detail ?? 'Upload failed');
  }
  const result: unknown = await res.json();
  // Update the localStorage cache
  if (typeof window !== 'undefined') {
    localStorage.setItem('custom-auth-user', JSON.stringify(result));
  }
  return result;
}

export async function cancelAppointment(appointmentId: number, reason: string): Promise<AppointmentResponse> {
  return apiFetch<AppointmentResponse>(`/api/v1/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancelled_reason: reason }),
  });
}

export async function updateAppointmentNotes(appointmentId: number, notes: string): Promise<AppointmentResponse> {
  return apiFetch<AppointmentResponse>(`/api/v1/appointments/${appointmentId}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
}

export async function generateDoctorSlots(doctorId: number, daysAhead: number): Promise<{ generated: number; days_ahead: number }> {
  return apiFetch<{ generated: number; days_ahead: number }>(
    `/api/v1/doctors/${doctorId}/slots/generate?days_ahead=${daysAhead}`,
    { method: 'POST' },
  );
}

export async function updateAppointmentStatus(
  appointmentId: number,
  status: 'confirmed' | 'completed' | 'no_show' | 'rejected',
  notes?: string,
): Promise<AppointmentResponse> {
  return apiFetch<AppointmentResponse>(`/api/v1/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
}

export async function bookAppointment(data: {
  patient_id: number;
  doctor_id: number;
  clinic_id: number;
  slot_id: number;
  reason_for_visit?: string;
}): Promise<BookingResponse> {
  return apiFetch<BookingResponse>('/api/v1/appointments/book', {
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

export async function getAdmins(skip = 0, limit = 10): Promise<PaginatedResponse<AdminUserResponse>> {
  return apiFetch<PaginatedResponse<AdminUserResponse>>(`/api/v1/admins?skip=${skip}&limit=${limit}`);
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

/** Doctor role: update own availability (no doctor_id in URL). */
export async function setOwnAvailability(
  availability: AvailabilityInput[]
): Promise<AvailabilityResponse[]> {
  return apiFetch<AvailabilityResponse[]>(`/api/v1/doctors/availability`, {
    method: 'PUT',
    body: JSON.stringify(availability),
  });
}

export async function deleteDoctor(id: number): Promise<void> {
  return apiFetch<void>(`/api/v1/doctors/${id}`, { method: 'DELETE' });
}

export async function updateDoctor(
  id: number,
  data: {
    name?: string;
    email?: string;
    mobile_no?: string;
    clinic_id?: number;
    specialty?: string;
    license_number?: string;
    qualifications?: string;
    experience_years?: number;
    max_patients_per_day?: number;
    consultation_duration_minutes?: number;
  }
): Promise<DoctorResponse> {
  return apiFetch<DoctorResponse>(`/api/v1/doctors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ─── Patient management (ADMIN / SUPER_ADMIN) ─────────────────────────────────

export async function getPatients(skip = 0, limit = 10, search?: string): Promise<PaginatedResponse<PatientResponse>> {
  const qs = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (search) qs.set('search', search);
  return apiFetch<PaginatedResponse<PatientResponse>>(`/api/v1/patients?${qs}`);
}

export async function adminUpdatePatient(
  id: number,
  data: {
    name?: string;
    email?: string;
    mobile_no?: string;
    address?: string;
    date_of_birth?: string;
    blood_group?: string;
    allergies?: string;
    emergency_contact?: string;
  }
): Promise<PatientResponse> {
  return apiFetch<PatientResponse>(`/api/v1/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePatient(id: number): Promise<void> {
  return apiFetch<void>(`/api/v1/patients/${id}`, { method: 'DELETE' });
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

// ── Dynamic slot & booking ─────────────────────────────────────────────────────

export async function getDynamicSlots(
  doctorId: number,
  date: string,           // YYYY-MM-DD
  onlyAvailable = true,
): Promise<DoctorSlotsResponse> {
  const qs = new URLSearchParams({ date, only_available: String(onlyAvailable) });
  return apiFetch<DoctorSlotsResponse>(`/api/v1/doctors/${doctorId}/dynamic-slots?${qs}`);
}

export async function bookDynamicSlot(data: {
  doctor_id: number;
  patient_id: number;
  clinic_id: number;
  start_time: string;    // ISO-8601 UTC
  slots_requested?: number;
  reason_for_visit?: string;
}): Promise<DynamicAppointmentResponse> {
  return apiFetch<DynamicAppointmentResponse>('/api/v1/appointments/dynamic', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelDynamicAppointment(
  apptId: number,
  reason: string,
): Promise<DynamicAppointmentResponse> {
  return apiFetch<DynamicAppointmentResponse>(`/api/v1/appointments/dynamic/${apptId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancelled_reason: reason }),
  });
}

// ── Doctor leave / unavailability ────────────────────────────────────────────

export interface DoctorLeaveCreate {
  date: string;            // YYYY-MM-DD
  is_full_day: boolean;
  start_time?: string;     // HH:MM  (required when is_full_day=false)
  end_time?: string;       // HH:MM  (required when is_full_day=false)
  reason?: string;
}

export interface DoctorLeaveResponse {
  id: number;
  doctor_id: number;
  date: string;
  is_full_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
  created_at?: string | null;
}

export async function getDoctorLeaves(
  doctorId: number,
  params?: { date_from?: string; date_to?: string },
): Promise<DoctorLeaveResponse[]> {
  const qs = new URLSearchParams();
  if (params?.date_from) qs.set('date_from', params.date_from);
  if (params?.date_to) qs.set('date_to', params.date_to);
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<DoctorLeaveResponse[]>(`/api/v1/doctors/${doctorId}/leaves${query}`);
}

export async function createDoctorLeave(
  doctorId: number,
  data: DoctorLeaveCreate,
): Promise<DoctorLeaveResponse> {
  return apiFetch<DoctorLeaveResponse>(`/api/v1/doctors/${doctorId}/leaves`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteDoctorLeave(doctorId: number, leaveId: number): Promise<void> {
  return apiFetch<void>(`/api/v1/doctors/${doctorId}/leaves/${leaveId}`, {
    method: 'DELETE',
  });
}
