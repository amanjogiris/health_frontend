/**
 * Appointment service – slots, booking and cancellation.
 */
import { apiFetch } from './apiClient';

export interface SlotResponse {
  id: number;
  doctor_id: number;
  clinic_id: number;
  start_time: string;
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
}

export interface BookPayload {
  patient_id: number;
  doctor_id: number;
  slot_id: number;
  clinic_id: number;
  reason_for_visit?: string;
}

// ── Slots ──────────────────────────────────────────────────────────────────────

export async function getSlots(params?: {
  doctor_id?: number;
  clinic_id?: number;
  date_from?: string;
  date_to?: string;
}): Promise<SlotResponse[]> {
  const qs = new URLSearchParams();
  if (params?.doctor_id) qs.set('doctor_id', String(params.doctor_id));
  if (params?.clinic_id) qs.set('clinic_id', String(params.clinic_id));
  if (params?.date_from) qs.set('date_from', params.date_from);
  if (params?.date_to) qs.set('date_to', params.date_to);
  return apiFetch<SlotResponse[]>(`/api/v1/slots?${qs}`);
}

export async function createSlot(data: {
  doctor_id: number;
  clinic_id: number;
  start_time: string;
  end_time: string;
  capacity?: number;
}): Promise<SlotResponse> {
  return apiFetch<SlotResponse>('/api/v1/slots', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteSlot(slotId: number): Promise<void> {
  return apiFetch<void>(`/api/v1/slots/${slotId}`, { method: 'DELETE' });
}

// ── Appointments ──────────────────────────────────────────────────────────────

export async function bookAppointment(data: BookPayload): Promise<AppointmentResponse> {
  return apiFetch<AppointmentResponse>('/api/v1/appointments/book', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelAppointment(
  appointmentId: number,
  reason: string
): Promise<AppointmentResponse> {
  return apiFetch<AppointmentResponse>(`/api/v1/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancelled_reason: reason }),
  });
}

export async function getAppointment(id: number): Promise<AppointmentResponse> {
  return apiFetch<AppointmentResponse>(`/api/v1/appointments/${id}`);
}

export async function getPatientAppointments(
  patientId: number
): Promise<AppointmentResponse[]> {
  return apiFetch<AppointmentResponse[]>(`/api/v1/patients/${patientId}/appointments`);
}

export async function listAllAppointments(
  skip = 0,
  limit = 100
): Promise<AppointmentResponse[]> {
  return apiFetch<AppointmentResponse[]>(`/api/v1/appointments?skip=${skip}&limit=${limit}`);
}
