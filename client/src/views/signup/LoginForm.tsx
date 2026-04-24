import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSignup } from '@/hooks/useSignup'
import { DIAL_CODES } from '@/views/signup/constants'
import { composePhone, sanitizeNumericInput, scrollToFirstError } from '@/views/signup/formUtils'

const formSchema = z.object({
  dialCode: z.string().min(2),
  phoneLocal: z.string().min(6),
})

type FormValues = z.infer<typeof formSchema>

export function LoginForm() {
  const { login, isSubmitting, error, clearError } = useSignup()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
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
  const phoneLocalField = register('phoneLocal')

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
        <p className="mama-kicker">Phone login</p>
        <h2 className="mama-heading text-3xl">Welcome back</h2>
        <p className="mama-copy text-sm">
          Enter your phone number and we'll send you straight to the right dashboard.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneLocal" className="mama-label">
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
            <SelectTrigger className="mama-select">
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
            className="mama-input"
            {...phoneLocalField}
            onChange={(event) => {
              sanitizeNumericInput(event)
              phoneLocalField.onChange(event)
              clearError()
            }}
          />
        </div>
        {errors.phoneLocal ? <p className="text-sm text-destructive">Enter a valid phone number.</p> : null}
      </div>

      {error ? <p className="mama-error">{error}</p> : null}

      <Button type="submit" className="mama-primary-action" disabled={isSubmitting}>
        {isSubmitting ? 'Loading...' : 'Login >'}
      </Button>
    </form>
  )
}
