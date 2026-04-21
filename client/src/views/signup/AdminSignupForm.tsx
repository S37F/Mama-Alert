import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSignup } from '@/hooks/useSignup'
import { DIAL_CODES } from '@/views/signup/constants'
import { composePhone, scrollToFirstError } from '@/views/signup/formUtils'

const formSchema = z.object({
  name: z.string().min(2),
  dialCode: z.string().min(2),
  phoneLocal: z.string().min(6),
  organisation: z.string().min(2),
  zone: z.string().min(2),
  adminCode: z.string().min(1),
})

type FormValues = z.infer<typeof formSchema>

export function AdminSignupForm({ onBack }: { onBack: () => void }) {
  const { signup, isSubmitting, error, clearError } = useSignup()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      dialCode: '+91',
      phoneLocal: '',
      organisation: '',
      zone: '',
      adminCode: '',
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
      await signup({
        role: 'admin',
        name: values.name.trim(),
        phone: composePhone(values.dialCode, values.phoneLocal),
        organisation: values.organisation.trim(),
        zone: values.zone.trim(),
        adminCode: values.adminCode.trim(),
      })
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
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor="organisation"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8F6A5C]"
          >
            Organisation name
          </Label>
          <Input
            id="organisation"
            className="h-12 rounded-xl border-[#D8C1B0] bg-white focus-visible:ring-[#C4522A]"
            {...register('organisation')}
            onChange={(event) => {
              register('organisation').onChange(event)
              clearError()
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zone" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8F6A5C]">
            Zone / district
          </Label>
          <Input
            id="zone"
            className="h-12 rounded-xl border-[#D8C1B0] bg-white focus-visible:ring-[#C4522A]"
            {...register('zone')}
            onChange={(event) => {
              register('zone').onChange(event)
              clearError()
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminCode" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8F6A5C]">
          Admin access code
        </Label>
        <Input
          id="adminCode"
          type="password"
          autoComplete="one-time-code"
          className="h-12 rounded-xl border-[#D8C1B0] bg-white focus-visible:ring-[#C4522A]"
          {...register('adminCode')}
          onChange={(event) => {
            register('adminCode').onChange(event)
            clearError()
          }}
        />
        {errors.adminCode ? <p className="text-sm text-red-600">Enter the admin access code.</p> : null}
      </div>

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
