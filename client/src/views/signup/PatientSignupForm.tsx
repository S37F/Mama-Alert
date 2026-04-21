import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSignup } from '@/hooks/useSignup'
import { DIAL_CODES, LANGUAGE_OPTIONS } from '@/views/signup/constants'
import { composePhone, scrollToFirstError } from '@/views/signup/formUtils'

const formSchema = z.object({
  name: z.string().min(2),
  dialCode: z.string().min(2),
  phoneLocal: z.string().min(6),
  weeksPregnant: z.string().min(1),
  village: z.string().min(2),
  landmark: z.string().optional(),
  language: z.string().min(2),
})

type FormValues = z.infer<typeof formSchema>

export function PatientSignupForm({ onBack }: { onBack: () => void }) {
  const { signup, isSubmitting, error, clearError } = useSignup()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      dialCode: '+91',
      phoneLocal: '',
      weeksPregnant: '',
      village: '',
      landmark: '',
      language: 'en',
    },
  })

  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = form

  const onSubmit = handleSubmit(
    async (values) => {
      clearError()
      const weeksPregnant = Number.parseInt(values.weeksPregnant, 10)
      await signup(
        {
          role: 'patient',
          name: values.name.trim(),
          phone: composePhone(values.dialCode, values.phoneLocal),
          weeksPregnant,
          village: values.village.trim(),
          landmark: values.landmark?.trim() || undefined,
          language: values.language,
        },
        { captureLocation: true, weeksPregnant },
      )
    },
    (invalid) => scrollToFirstError(invalid),
  )

  return (
    <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
      <Button type="button" variant="ghost" className="-ml-3 text-[#7B645A]" onClick={onBack}>
        ← Back
      </Button>

      <div className="space-y-2">
        <Label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8F6A5C]">
          Full name
        </Label>
        <Input
          id="name"
          className="h-12 rounded-xl border-[#D8C1B0] bg-white focus-visible:ring-[#C4522A]"
          {...register('name')}
          onChange={(event) => {
            register('name').onChange(event)
            clearError()
          }}
        />
        {errors.name ? <p className="text-sm text-red-600">Please enter your full name.</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneLocal" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8F6A5C]">
          Phone number
        </Label>
        <div className="grid grid-cols-[118px_1fr] gap-3">
          <Select
            value={watch('dialCode')}
            onValueChange={(value) => {
              if (!value) {
                return
              }
              setValue('dialCode', value, { shouldDirty: true, shouldValidate: true })
              clearError()
            }}
          >
            <SelectTrigger className="h-12 rounded-xl border-[#D8C1B0] bg-white focus:ring-[#C4522A]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIAL_CODES.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id="phoneLocal"
            inputMode="tel"
            autoComplete="tel"
            className="h-12 rounded-xl border-[#D8C1B0] bg-white focus-visible:ring-[#C4522A]"
            placeholder="9876543210"
            {...register('phoneLocal')}
            onChange={(event) => {
              register('phoneLocal').onChange({
                ...event,
                target: { ...event.target, value: event.target.value.replace(/\D/g, '') },
              })
              clearError()
            }}
          />
        </div>
        {errors.phoneLocal ? <p className="text-sm text-red-600">Please enter a valid phone number.</p> : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor="weeksPregnant"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8F6A5C]"
          >
            Weeks pregnant
          </Label>
          <Input
            id="weeksPregnant"
            inputMode="numeric"
            min={1}
            max={44}
            className="h-12 rounded-xl border-[#D8C1B0] bg-white focus-visible:ring-[#C4522A]"
            {...register('weeksPregnant')}
            onChange={(event) => {
              register('weeksPregnant').onChange({
                ...event,
                target: { ...event.target, value: event.target.value.replace(/\D/g, '').slice(0, 2) },
              })
              clearError()
            }}
          />
          {errors.weeksPregnant ? <p className="text-sm text-red-600">Enter a number between 1 and 44.</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="language" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8F6A5C]">
            Language
          </Label>
          <Select
            value={watch('language')}
            onValueChange={(value) => {
              if (!value) {
                return
              }
              setValue('language', value, { shouldDirty: true, shouldValidate: true })
              clearError()
            }}
          >
            <SelectTrigger id="language" className="h-12 rounded-xl border-[#D8C1B0] bg-white focus:ring-[#C4522A]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((language) => (
                <SelectItem key={language.value} value={language.value}>
                  {language.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="village" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8F6A5C]">
          Village / area
        </Label>
        <Input
          id="village"
          className="h-12 rounded-xl border-[#D8C1B0] bg-white focus-visible:ring-[#C4522A]"
          {...register('village')}
          onChange={(event) => {
            register('village').onChange(event)
            clearError()
          }}
        />
        {errors.village ? <p className="text-sm text-red-600">Please enter your village or area.</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="landmark" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8F6A5C]">
          Nearest landmark
        </Label>
        <Input
          id="landmark"
          className="h-12 rounded-xl border-[#D8C1B0] bg-white focus-visible:ring-[#C4522A]"
          {...register('landmark')}
          onChange={(event) => {
            register('landmark').onChange(event)
            clearError()
          }}
        />
      </div>

      <p className="text-sm leading-6 text-[#7B645A]">
        We’ll try to capture your location silently so responders can reach you faster. If your phone blocks it, we’ll
        still save your account.
      </p>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <Button
        type="submit"
        className="h-13 w-full rounded-xl bg-[#C4522A] text-base text-white hover:bg-[#A94625]"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Loading…' : 'Create Account →'}
      </Button>
    </form>
  )
}
