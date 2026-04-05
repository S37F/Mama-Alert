import { Router } from 'express'
import { asyncHandler } from '@/lib/asyncHandler'
import { supabaseAdmin } from '@/services/supabase'

export const statusRouter = Router()

statusRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const token = req.params.token
    if (!token) {
      res.status(400).json({ error: 'Missing token' })
      return
    }

    const { data: patient, error } = await supabaseAdmin
      .from('patients')
      .select('id, name')
      .eq('status_token', token)
      .maybeSingle()

    if (error || !patient) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const { data: latest } = await supabaseAdmin
      .from('alerts')
      .select('status, triggered_at, updated_at, responding_volunteer_id, nearest_hospital_id')
      .eq('patient_id', patient.id)
      .order('triggered_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const firstName = patient.name.split(/\s+/)[0] ?? patient.name

    let volunteerName: string | null = null
    let hospitalName: string | null = null
    let alertStatus = 'none'
    let lastUpdated: string | null = null

    if (latest) {
      alertStatus = latest.status
      lastUpdated = latest.updated_at ?? latest.triggered_at
      if (latest.responding_volunteer_id) {
        const { data: v } = await supabaseAdmin
          .from('volunteers')
          .select('name')
          .eq('id', latest.responding_volunteer_id)
          .maybeSingle()
        volunteerName = v?.name ?? null
      }
      if (latest.nearest_hospital_id) {
        const { data: h } = await supabaseAdmin
          .from('hospitals')
          .select('name')
          .eq('id', latest.nearest_hospital_id)
          .maybeSingle()
        hospitalName = h?.name ?? null
      }
    }

    res.json({
      patientFirstName: firstName,
      alertStatus,
      volunteerName,
      hospitalName,
      lastUpdated,
    })
  }),
)
