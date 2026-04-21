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
  dialCode: z.string().min(2),
  phoneLocal: z.string().min(6),
})

type FormValues = z.infer<typeof formSchema>

export function LoginForm() {
  const { login, isSubmitting, error, clearError } = useSignup()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dialCode: '+91',
      phoneLocal: '',
    },
  })

  const {
    handleSubmit,
    setValue,
    watch,
    register,
    formState: { errors },
  } = form

  const onSubmit = handleSubmit(
    async (values) => {
      clearError()
      await login(composePhone(values.dialCode, values.phoneLocal))
    },
    (invalid) => scrollToFirstError(invalid),
  )

  return (
    <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8F6A5C]">Phone login</p>
        <h2 className="font-serif text-3xl font-bold text-[#36251D]">Welcome back</h2>
        <p className="text-sm text-[#7B645A]">Enter your phone number and we’ll send you straight to the right dashboard.</p>
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
            placeholder="9876543210"
            className="h-12 rounded-xl border-[#D8C1B0] bg-white focus-visible:ring-[#C4522A]"
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
        {errors.phoneLocal ? <p className="text-sm text-red-600">Enter a valid phone number.</p> : null}
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <Button
        type="submit"
        className="h-13 w-full rounded-xl bg-[#C4522A] text-base text-white hover:bg-[#A94625]"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Loading…' : 'Login →'}
      </Button>
    </form>
  )
}
