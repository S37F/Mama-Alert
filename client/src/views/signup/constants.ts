import type { MamaAlertRole } from '@/lib/mamaSession'

export const DIAL_CODES = ['+91', '+233', '+234', '+254', '+255', '+256', '+1', '+44', '+33', '+351', '+55'] as const

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'fr', label: 'French' },
  { value: 'sw', label: 'Swahili' },
  { value: 'ar', label: 'Arabic' },
  { value: 'pt', label: 'Portuguese' },
] as const

export const ROLE_COPY: Partial<Record<
  MamaAlertRole,
  {
    title: string
    description: string
    colorClass: string
    iconClass: string
  }
>> = {
  patient: {
    title: 'I am a Patient',
    description: 'Register for emergency help',
    colorClass: 'border-rose-300 bg-rose-50/80',
    iconClass: 'bg-rose-500',
  },
  volunteer: {
    title: 'I am a Volunteer',
    description: 'Help women in my community',
    colorClass: 'border-emerald-300 bg-emerald-50/80',
    iconClass: 'bg-emerald-500',
  },
}

export const VOLUNTEER_SKILLS = [
  'Trained midwife',
  'Registered nurse',
  'Community health worker (ASHA/ANM)',
  'First aid certified',
  'Willing to help (no formal training)',
] as const
