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
  name: z.string().min(2),
  dialCode: z.string().min(2),
  phoneLocal: z.string().min(6),
  roleTitle: z.enum(['ASHA', 'ANM', 'Nurse', 'Doctor', 'Community volunteer']),
  organisation: z.string().min(2),
  zone: z.string().min(2),
})

type FormValues = z.infer<typeof formSchema>

export function HealthWorkerSignupForm({ onBack }: { onBack: () => void }) {
  const { signup, isSubmitting, error, clearError } = useSignup()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      dialCode: '+91',
      phoneLocal: '',
      roleTitle: 'ASHA',
      organisation: '',
      zone: '',
    },
  })

  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = form
  const nameField = register('name')
  const phoneLocalField = register('phoneLocal')
  const organisationField = register('organisation')
  const zoneField = register('zone')

  const onSubmit = handleSubmit(
    async (values) => {
      clearError()
      await signup({
        role: 'health_worker',
        name: values.name.trim(),
        phone: composePhone(values.dialCode, values.phoneLocal),
        roleTitle: values.roleTitle,
        organisation: values.organisation.trim(),
        zone: values.zone.trim(),
      })
    },
    (invalid) => scrollToFirstError(invalid),
  )

  return (
    <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
      <Button type="button" variant="ghost" className="-ml-3 text-muted-foreground" onClick={onBack}>
        Back
      </Button>

      <div className="space-y-2">
        <Label htmlFor="name" className="mama-label">
          Full name
        </Label>
        <Input
          id="name"
          className="mama-input"
          {...nameField}
          onChange={(event) => {
            nameField.onChange(event)
            clearError()
          }}
        />
        {errors.name ? <p className="text-sm text-destructive">Please enter your full name.</p> : null}
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
            className="mama-input"
            placeholder="9876543210"
            {...phoneLocalField}
            onChange={(event) => {
              sanitizeNumericInput(event)
              phoneLocalField.onChange(event)
              clearError()
            }}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="roleTitle" className="mama-label">
            Role title
          </Label>
          <Select
            value={watch('roleTitle')}
            onValueChange={(value) => {
              if (!value) {
                return
              }
              setValue('roleTitle', value as FormValues['roleTitle'], { shouldDirty: true, shouldValidate: true })
              clearError()
            }}
          >
            <SelectTrigger id="roleTitle" className="mama-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ASHA">ASHA</SelectItem>
              <SelectItem value="ANM">ANM</SelectItem>
              <SelectItem value="Nurse">Nurse</SelectItem>
              <SelectItem value="Doctor">Doctor</SelectItem>
              <SelectItem value="Community volunteer">Community volunteer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="organisation" className="mama-label">
            Organisation / facility
          </Label>
          <Input
            id="organisation"
            className="mama-input"
            {...organisationField}
            onChange={(event) => {
              organisationField.onChange(event)
              clearError()
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="zone" className="mama-label">
          Zone / district covered
        </Label>
        <Input
          id="zone"
          className="mama-input"
          {...zoneField}
          onChange={(event) => {
            zoneField.onChange(event)
            clearError()
          }}
        />
        {errors.zone ? <p className="text-sm text-destructive">Please enter a zone or district.</p> : null}
      </div>

      {error ? <p className="mama-error">{error}</p> : null}

      <Button type="submit" className="mama-primary-action" disabled={isSubmitting}>
        {isSubmitting ? 'Loading...' : 'Create Account >'}
      </Button>
    </form>
  )
}
