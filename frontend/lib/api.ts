import axios from 'axios'

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
  headers: { 'Content-Type': 'application/json' },
})

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Patient {
  id: number
  name: string
  age: number
  gender: string
  contact: string
  chronic_conditions?: string
  medical_history?: string
}

export interface Doctor {
  id: number
  name: string
  specialization: string
  experience_years: number
  availability_slots: string
  rating: number
}

export interface Appointment {
  id: number
  patient_id: number
  doctor_id: number
  reason_for_visit: string
  appointment_datetime: string
  status: string
  no_show_probability: number
}

export interface TriageResult {
  disease: string
  specialization: string
  confidence: number | null
}

export interface NoShowResult {
  patient_id: number
  no_show_probability: number
  risk_level: string
  waiting_days: number
}

export interface SummaryResult {
  summary: string
  backend: string
}

// ── Patient APIs ───────────────────────────────────────────────────────────────

export const createPatient = async (data: Omit<Patient, 'id'>) => {
  const res = await API.post('/patients/', data)
  return res.data as Patient
}

export const getPatients = async () => {
  const res = await API.get('/patients/')
  return res.data as Patient[]
}

export const getPatient = async (id: number) => {
  const res = await API.get(`/patients/${id}`)
  return res.data as Patient
}

// ── Doctor APIs ────────────────────────────────────────────────────────────────

export const createDoctor = async (data: Omit<Doctor, 'id'>) => {
  const res = await API.post('/doctors/', data)
  return res.data as Doctor
}

export const getDoctors = async () => {
  const res = await API.get('/doctors/')
  return res.data as Doctor[]
}

export const getDoctorsBySpecialization = async (spec: string) => {
  const res = await API.get(`/doctors/specialization/${spec}`)
  return res.data as Doctor[]
}

// ── Appointment APIs ───────────────────────────────────────────────────────────

export const createAppointment = async (data: {
  patient_id: number
  doctor_id: number
  reason_for_visit: string
  appointment_datetime?: string
}) => {
  const res = await API.post('/appointments/', data)
  return res.data as Appointment
}

export const getAppointments = async () => {
  const res = await API.get('/appointments/')
  return res.data as Appointment[]
}

export const updateAppointment = async (id: number, data: Partial<Appointment>) => {
  const res = await API.patch(`/appointments/${id}`, data)
  return res.data as Appointment
}

export const deleteAppointment = async (id: number) => {
  const res = await API.delete(`/appointments/${id}`)
  return res.data
}

// ── ML APIs ────────────────────────────────────────────────────────────────────

export const predictSpecialization = async (symptoms: string[]) => {
  const res = await API.post('/predict-specialization', { symptoms })
  return res.data as TriageResult
}

export const predictNoShow = async (data: {
  patient_id: number
  appointment_datetime: string
  sms_received?: number
  scholarship?: number
  hipertension?: number
  diabetes?: number
  alcoholism?: number
  handcap?: number
}) => {
  const res = await API.post('/appointments/predict-noshow', data)
  return res.data as NoShowResult
}

// endpoint is /generate-summary not /appointments/generate-summary
export const generateSummary = async (notes: string) => {
  const res = await API.post('/generate-summary', { notes })
  return res.data as SummaryResult
}