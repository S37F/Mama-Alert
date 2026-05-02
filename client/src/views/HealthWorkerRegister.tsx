import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MapView } from '@/components/MapView'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useZoneId } from '@/hooks/useZoneId'
import { postRegisterPatient } from '@/services/api'
import { ErrorMessage } from '@/components/ErrorMessage'
import { NetworkOfflineBanner } from '@/components/NetworkOfflineBanner'

const langs = ['en', 'hi', 'fr', 'sw', 'ar', 'pt'] as const

const relationshipValues = ['husband', 'mother', 'sister', 'neighbour', 'other'] as const

const riskKeys = [
  'pre_eclampsia',
  'placenta_previa',
  'severe_anaemia',
  'gestational_diabetes',
  'multiple_pregnancy',
  'obstructed_labour_history',
  'hiv_positive',
  'on_medication',
] as const

const DRAFT_KEY = 'mamaalert_worker_patient_registration_draft_v1'

const formSchema = z
  .object({
    name: z.string().min(1),
    age: z.string().optional(),
    phone_primary: z.string().min(8).max(20).regex(/^\+?[0-9]{8,20}$/),
    phone_secondary: z.string().max(20).optional(),
    language: z.enum(langs),
    village: z.string().optional(),
    landmark: z.string().optional(),
    weeks_pregnant: z.string().optional(),
    due_date: z.string().optional(),
    prev_pregnancies: z.string().optional(),
    prev_births: z.string().optional(),
    prev_csection: z.boolean().optional(),
    last_anc_date: z.string().optional(),
    blood_type: z.string().max(8).optional(),
    medication_name: z.string().optional(),
    c1_name: z.string().min(1),
    c1_phone: z.string().min(8),
    c1_rel: z.enum(relationshipValues),
    c2_name: z.string().optional(),
    c2_phone: z.string().optional(),
    c2_rel: z.enum(relationshipValues),
  })
  .superRefine((val, ctx) => {
    const c2Name = val.c2_name?.trim() ?? ''
    const c2Phone = val.c2_phone?.trim() ?? ''
    if (!c2Name && !c2Phone) {
      return
    }
    if (!c2Name) {
      ctx.addIssue({ code: 'custom', message: 'Contact name required', path: ['c2_name'] })
    }
    if (!/^\+?[0-9]{8,20}$/.test(c2Phone)) {
      ctx.addIssue({ code: 'custom', message: 'Valid contact phone required', path: ['c2_phone'] })
    }
  })

type FormValues = z.infer<typeof formSchema>

function hasRegistrationDraftContent(values: Partial<FormValues>, riskMap: Record<string, boolean>): boolean {
  return (
    Object.values(values).some((value) => {
      if (typeof value === 'string') {
        return value.trim().length > 0
      }
      return value === true
    }) || Object.values(riskMap).some(Boolean)
  )
}

interface HealthWorkerRegisterProps {
  /** When true, omit landmark `main#main-content` (parent route already provides it). */
  embedded?: boolean
}

export function HealthWorkerRegister({ embedded = false }: HealthWorkerRegisterProps) {
  const { t } = useTranslation()
  const zoneId = useZoneId()
  const { lat, lng, error: geoErr, isLoading: geoLoading, capture: captureLocation } = useGeolocation()
  const [risk, setRisk] = useState<Record<(typeof riskKeys)[number], boolean>>(
    () =>
      Object.fromEntries(riskKeys.map((k) => [k, false])) as Record<
        (typeof riskKeys)[number],
        boolean
      >,
  )
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    id: string
    status_token: string
    sos_token: string
    phone_primary: string
  } | null>(null)
  const [draftSaved, setDraftSaved] = useState(false)

  const wrapPage = (inner: ReactNode) =>
    embedded ? (
      inner
    ) : (
      <main id="main-content" tabIndex={-1} className="mama-page outline-none">
        {inner}
      </main>
    )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone_primary: '',
      phone_secondary: '',
      language: 'en',
      village: '',
      landmark: '',
      prev_csection: false,
      c1_name: '',
      c1_phone: '',
      c1_rel: 'husband',
      c2_name: '',
      c2_phone: '',
      c2_rel: 'mother',
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) {
        return
      }
      const parsed = JSON.parse(raw) as { values?: Partial<FormValues>; risk?: Partial<typeof risk> }
      if (parsed.values) {
        form.reset({ ...form.getValues(), ...parsed.values })
      }
      if (parsed.risk) {
        setRisk((prev) => ({ ...prev, ...parsed.risk }))
      }
      setDraftSaved(true)
    } catch {
      /* ignore malformed drafts */
    }
    // Restore once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const sub = form.watch((values) => {
      try {
        if (!hasRegistrationDraftContent(values, risk)) {
          localStorage.removeItem(DRAFT_KEY)
          setDraftSaved(false)
          return
        }
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, risk, savedAt: new Date().toISOString() }))
        setDraftSaved(true)
      } catch {
        /* private mode / quota */
      }
    })
    return () => sub.unsubscribe()
  }, [form, risk])

  useEffect(() => {
    try {
      const values = form.getValues()
      if (!hasRegistrationDraftContent(values, risk)) {
        localStorage.removeItem(DRAFT_KEY)
        setDraftSaved(false)
        return
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, risk, savedAt: new Date().toISOString() }))
      setDraftSaved(true)
    } catch {
      /* private mode / quota */
    }
  }, [form, risk])

  const lang = watch('language')

  const onSubmit = async (values: FormValues) => {
    setSubmitErr(null)
    if (lat === null || lng === null) {
      setSubmitErr(t('register.locationRequired'))
      return
    }
    const ageNum = values.age?.trim() ? Number(values.age) : undefined
    const weeks = values.weeks_pregnant?.trim() ? Number(values.weeks_pregnant) : undefined
    const prevP = values.prev_pregnancies?.trim() ? Number(values.prev_pregnancies) : undefined
    const prevB = values.prev_births?.trim() ? Number(values.prev_births) : undefined

    const risk_flags = riskKeys.filter((k) => risk[k])
    const emergency_contacts = [
      { name: values.c1_name.trim(), phone: values.c1_phone.trim(), relationship: values.c1_rel },
    ]
    const c2Name = values.c2_name?.trim() ?? ''
    const c2Phone = values.c2_phone?.trim() ?? ''
    if (c2Name && c2Phone) {
      emergency_contacts.push({ name: c2Name, phone: c2Phone, relationship: values.c2_rel })
    }

    try {
      const out = await postRegisterPatient({
        name: values.name,
        age: ageNum !== undefined && !Number.isNaN(ageNum) ? ageNum : null,
        phone_primary: values.phone_primary.trim(),
        phone_secondary: values.phone_secondary?.trim() || null,
        village: values.village?.trim() || null,
        landmark: values.landmark?.trim() || null,
        lat,
        lng,
        weeks_pregnant: weeks !== undefined && !Number.isNaN(weeks) ? weeks : null,
        due_date: values.due_date?.trim() || null,
        prev_pregnancies: prevP !== undefined && !Number.isNaN(prevP) ? prevP : null,
        prev_births: prevB !== undefined && !Number.isNaN(prevB) ? prevB : null,
        prev_csection: values.prev_csection ?? false,
        last_anc_date: values.last_anc_date?.trim() || null,
        blood_type: values.blood_type?.trim() || null,
        language: values.language,
        zone_id: zoneId,
        risk_flags,
        medication_name: risk.on_medication ? values.medication_name?.trim() || null : null,
        emergency_contacts,
      })
      localStorage.removeItem(DRAFT_KEY)
      setDraftSaved(false)
      setSuccess({ ...out, phone_primary: values.phone_primary.trim() })
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const statusPath = useMemo(() => {
    if (!success) {
      return ''
    }
    return `${window.location.origin}/status/${success.status_token}`
  }, [success])

  const sosPath = useMemo(() => {
    if (!success) {
      return ''
    }
    const u = new URL(`${window.location.origin}/sos`)
    u.searchParams.set('token', success.sos_token)
    u.searchParams.set('setup', success.phone_primary)
    u.searchParams.set('phone', success.phone_primary)
    return u.toString()
  }, [success])

  if (success) {
    return wrapPage(
      <div className="mx-auto max-w-lg space-y-6 p-6">
        <h1 className="mama-heading text-2xl">{t('register.success')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('register.patientId')}: <span className="font-mono text-foreground">{success.id}</span>
        </p>
        <p className="text-sm font-medium text-foreground">Patient SOS link (share with the patient; keep private)</p>
        <p className="break-all font-mono text-xs">
          <a href={sosPath} className="text-primary underline">
            {sosPath}
          </a>
        </p>
        <p className="text-sm">
          {t('register.statusLink')}:{' '}
          <a href={statusPath} className="text-primary underline">
            {statusPath}
          </a>
        </p>
        <Button
          type="button"
          onClick={() => {
            setSuccess(null)
            form.reset({
              name: '',
              phone_primary: '',
              phone_secondary: '',
              language: 'en',
              village: '',
              landmark: '',
              prev_csection: false,
              c1_name: '',
              c1_phone: '',
              c1_rel: 'husband',
              c2_name: '',
              c2_phone: '',
              c2_rel: 'mother',
            })
            setRisk(
              Object.fromEntries(riskKeys.map((k) => [k, false])) as Record<
                (typeof riskKeys)[number],
                boolean
              >,
            )
            localStorage.removeItem(DRAFT_KEY)
            setDraftSaved(false)
          }}
        >
          {t('register.another')}
        </Button>
      </div>,
    )
  }

  return wrapPage(
    <form className="mx-auto max-w-2xl space-y-6 p-6 pb-24" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
      <NetworkOfflineBanner variant="formSubmit" />
      <h1 className="mama-heading text-2xl">{t('register.title')}</h1>

      {submitErr ? <ErrorMessage message={submitErr} onRetry={() => setSubmitErr(null)} /> : null}
      {draftSaved ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t('worker.draftSaved')}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('register.sections.identity')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">{t('register.fields.name')}</Label>
            <Input id="name" {...register('name')} />
            {errors.name ? <p className="text-destructive text-xs">{t('register.validation.required')}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">{t('register.fields.age')}</Label>
            <Input id="age" type="number" {...register('age')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">{t('register.fields.language')}</Label>
            <Select value={lang} onValueChange={(v) => setValue('language', v as FormValues['language'])}>
              <SelectTrigger id="language" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {langs.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone_primary">{t('register.fields.phonePrimary')}</Label>
            <Input id="phone_primary" type="tel" {...register('phone_primary')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone_secondary">{t('register.fields.phoneSecondary')}</Label>
            <Input id="phone_secondary" type="tel" {...register('phone_secondary')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('register.sections.location')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button type="button" variant="secondary" disabled={geoLoading} onClick={captureLocation}>
            {geoLoading ? t('common.loading') : t('register.captureLocation')}
          </Button>
          {geoErr ? <p className="text-destructive text-sm">{geoErr}</p> : null}
          {lat !== null && lng !== null ? (
            <>
              <p className="text-muted-foreground text-sm">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
              <MapView
                center={[lat, lng]}
                zoom={14}
                patients={[{ id: 'capture', name: '', lat, lng }]}
                className="h-48 w-full rounded-md"
              />
            </>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="village">{t('register.fields.village')}</Label>
            <Input id="village" {...register('village')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="landmark">{t('register.fields.landmark')}</Label>
            <Input id="landmark" {...register('landmark')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('register.sections.pregnancy')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="weeks">{t('register.fields.weeksPregnant')}</Label>
            <Input id="weeks" type="number" min={1} max={44} {...register('weeks_pregnant')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due">{t('register.fields.dueDate')}</Label>
            <Input id="due" type="date" {...register('due_date')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prev_p">{t('register.fields.prevPregnancies')}</Label>
            <Input id="prev_p" type="number" min={0} {...register('prev_pregnancies')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prev_b">{t('register.fields.prevBirths')}</Label>
            <Input id="prev_b" type="number" min={0} {...register('prev_births')} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="csection"
              checked={watch('prev_csection') ?? false}
              onCheckedChange={(c) => setValue('prev_csection', c === true)}
            />
            <Label htmlFor="csection">{t('register.fields.prevCsection')}</Label>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="anc">{t('register.fields.lastAnc')}</Label>
            <Input id="anc" type="date" {...register('last_anc_date')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blood">{t('register.fields.bloodType')}</Label>
            <Input id="blood" {...register('blood_type')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('register.sections.risks')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {riskKeys.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <Checkbox
                id={k}
                checked={risk[k]}
                onCheckedChange={(c) => setRisk((prev) => ({ ...prev, [k]: c === true }))}
              />
              <Label htmlFor={k} className="font-normal">
                {t(`register.risks.${k}`)}
              </Label>
            </div>
          ))}
          {risk.on_medication ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="med">{t('register.fields.medicationName')}</Label>
              <Input id="med" {...register('medication_name')} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('register.sections.contacts')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('register.contact.n', { n: 1 })}</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c1n">{t('register.fields.contactName')}</Label>
              <Input id="c1n" {...register('c1_name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c1p">{t('register.fields.contactPhone')}</Label>
              <Input id="c1p" type="tel" {...register('c1_phone')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('register.fields.relationship')}</Label>
              <Select
                value={watch('c1_rel')}
                onValueChange={(v) => setValue('c1_rel', v as FormValues['c1_rel'])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {relationshipValues.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`register.relationship.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>
                {t('register.contact.n', { n: 2 })} {t('register.contact.optional')}
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c2n">{t('register.fields.contactName')}</Label>
              <Input id="c2n" {...register('c2_name')} />
              {errors.c2_name ? <p className="text-destructive text-xs">{t('register.validation.required')}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="c2p">{t('register.fields.contactPhone')}</Label>
              <Input id="c2p" type="tel" {...register('c2_phone')} />
              {errors.c2_phone ? <p className="text-destructive text-xs">{t('worker.volunteerReg.phoneInvalid')}</p> : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('register.fields.relationship')}</Label>
              <Select
                value={watch('c2_rel')}
                onValueChange={(v) =>
                  setValue('c2_rel', v as FormValues['c2_rel'], { shouldValidate: true })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {relationshipValues.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`register.relationship.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? t('common.loading') : t('register.submit')}
      </Button>
    </form>,
  )
}
