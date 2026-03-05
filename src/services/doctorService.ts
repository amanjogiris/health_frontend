/**
 * Doctor service – search, fetch and manage doctors.
 */
import { apiFetch } from './apiClient';

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
}

export interface DoctorCreate {
  user_id: number;
  clinic_id: number;
  specialty: string;
  license_number: string;
  qualifications?: string;
  experience_years?: number;
  max_patients_per_day?: number;
}

export interface DoctorUpdate {
  clinic_id?: number;
  specialty?: string;
  qualifications?: string;
  experience_years?: number;
  max_patients_per_day?: number;
}

export async function getDoctors(params?: {
  specialty?: string;
  clinic_id?: number;
  skip?: number;
  limit?: number;
}): Promise<DoctorResponse[]> {
  const qs = new URLSearchParams();
  if (params?.specialty) qs.set('specialty', params.specialty);
  if (params?.clinic_id) qs.set('clinic_id', String(params.clinic_id));
  if (params?.skip !== undefined) qs.set('skip', String(params.skip));
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  return apiFetch<DoctorResponse[]>(`/api/v1/doctors?${qs}`);
}

export async function getDoctor(id: number): Promise<DoctorResponse> {
  return apiFetch<DoctorResponse>(`/api/v1/doctors/${id}`);
}

export async function createDoctor(data: DoctorCreate): Promise<DoctorResponse> {
  return apiFetch<DoctorResponse>('/api/v1/doctors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDoctor(id: number, data: DoctorUpdate): Promise<DoctorResponse> {
  return apiFetch<DoctorResponse>(`/api/v1/doctors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
