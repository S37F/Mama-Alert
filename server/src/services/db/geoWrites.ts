import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function insertPatientWithLocation(input: {
  healthWorkerId: string
  zoneId: string | null
  name: string
  age: number | null
  phonePrimary: string
  phoneSecondary: string | null
  village: string | null
  landmark: string | null
  lat: number
  lng: number
  weeksPregnant: number | null
  dueDate: Date | null
  prevPregnancies: number | null
  prevBirths: number | null
  prevCsection: boolean
  lastAncDate: Date | null
  bloodType: string | null
  language: string
  riskFlags: string[]
  medicationName: string | null
  emergencyContacts: Prisma.InputJsonValue
}): Promise<{ id: string; status_token: string }> {
  const rows = await prisma.$queryRaw<{ id: string; status_token: string }[]>`
    INSERT INTO public.patients (
      health_worker_id,
      zone_id,
      name,
      age,
      phone_primary,
      phone_secondary,
      village,
      landmark,
      location,
      weeks_pregnant,
      due_date,
      prev_pregnancies,
      prev_births,
      prev_csection,
      last_anc_date,
      blood_type,
      language,
      risk_flags,
      medication_name,
      emergency_contacts
    ) VALUES (
      ${input.healthWorkerId}::uuid,
      ${input.zoneId}::uuid,
      ${input.name},
      ${input.age}::int,
      ${input.phonePrimary},
      ${input.phoneSecondary},
      ${input.village},
      ${input.landmark},
      ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography,
      ${input.weeksPregnant}::int,
      ${input.dueDate}::date,
      ${input.prevPregnancies}::int,
      ${input.prevBirths}::int,
      ${input.prevCsection}::boolean,
      ${input.lastAncDate}::date,
      ${input.bloodType},
      ${input.language},
      ${input.riskFlags}::text[],
      ${input.medicationName},
      ${input.emergencyContacts}::jsonb
    )
    RETURNING id, status_token
  `
  const row = rows[0]
  if (!row) {
    throw new Error('patient insert returned no row')
  }
  return row
}

export async function insertVolunteerWithLocation(input: {
  zoneId: string
  name: string
  phone: string
  lat: number
  lng: number
  skills: string[]
  vehicle: string
  maxRadiusKm: number
  language: string
}): Promise<{ id: string }> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO public.volunteers (
      zone_id, name, phone, location, skills, vehicle, max_radius_km, language
    ) VALUES (
      ${input.zoneId}::uuid,
      ${input.name},
      ${input.phone},
      ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography,
      ${input.skills}::text[],
      ${input.vehicle},
      ${input.maxRadiusKm}::int,
      ${input.language}
    )
    RETURNING id
  `
  const row = rows[0]
  if (!row) {
    throw new Error('volunteer insert returned no row')
  }
  return row
}

export async function insertHospitalWithLocation(input: {
  zoneId: string
  name: string
  type: string
  lat: number
  lng: number
  phoneMain: string | null
  phoneEmergency: string | null
  services: string[]
  is24hr: boolean
  receiveAlerts: boolean
}): Promise<{ id: string }> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO public.hospitals (
      zone_id, name, type, location, phone_main, phone_emergency, services, is_24hr, receive_alerts
    ) VALUES (
      ${input.zoneId}::uuid,
      ${input.name},
      ${input.type},
      ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography,
      ${input.phoneMain},
      ${input.phoneEmergency},
      ${input.services}::text[],
      ${input.is24hr}::boolean,
      ${input.receiveAlerts}::boolean
    )
    RETURNING id
  `
  const row = rows[0]
  if (!row) {
    throw new Error('hospital insert returned no row')
  }
  return row
}
