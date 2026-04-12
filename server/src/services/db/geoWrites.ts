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
  registrationVerified?: boolean
  registrationSource?: string
}): Promise<{ id: string; status_token: string }> {
  const registrationVerified = input.registrationVerified ?? true
  const registrationSource = input.registrationSource ?? 'health_worker'
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
      emergency_contacts,
      registration_verified,
      registration_source
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
      ${input.emergencyContacts}::jsonb,
      ${registrationVerified}::boolean,
      ${registrationSource}
    )
    RETURNING id, status_token
  `
  const row = rows[0]
  if (!row) {
    throw new Error('patient insert returned no row')
  }
  return row
}

/** Update patient fields for an assigned health worker (location via raw SQL). */
export async function updatePatientForHealthWorker(input: {
  patientId: string
  healthWorkerId: string
  name?: string
  village?: string | null
  weeksPregnant?: number | null
  riskFlags?: string[]
  emergencyContacts?: Prisma.InputJsonValue
  registrationVerified?: boolean
  lat?: number
  lng?: number
}): Promise<void> {
  const existing = await prisma.patient.findFirst({
    where: { id: input.patientId, healthWorkerId: input.healthWorkerId },
    select: { id: true },
  })
  if (!existing) {
    throw Object.assign(new Error('Patient not found'), { statusCode: 404 })
  }

  const data: Prisma.PatientUpdateInput = {}
  if (input.name !== undefined) {
    data.name = input.name
  }
  if (input.village !== undefined) {
    data.village = input.village
  }
  if (input.weeksPregnant !== undefined) {
    data.weeksPregnant = input.weeksPregnant
  }
  if (input.riskFlags !== undefined) {
    data.riskFlags = input.riskFlags
  }
  if (input.emergencyContacts !== undefined) {
    data.emergencyContacts = input.emergencyContacts as Prisma.InputJsonValue
  }
  if (input.registrationVerified !== undefined) {
    data.registrationVerified = input.registrationVerified
  }

  if (Object.keys(data).length > 0) {
    await prisma.patient.update({
      where: { id: input.patientId },
      data,
    })
  }

  if (input.lat !== undefined && input.lng !== undefined) {
    await prisma.$executeRaw`
      UPDATE public.patients
      SET location = ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography
      WHERE id = ${input.patientId}::uuid AND health_worker_id = ${input.healthWorkerId}::uuid
    `
  }
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
