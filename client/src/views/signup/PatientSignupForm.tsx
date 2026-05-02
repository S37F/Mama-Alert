import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSignup } from '@/hooks/useSignup'
import { DIAL_CODES, LANGUAGE_OPTIONS } from '@/views/signup/constants'
import { composePhone, sanitizeNumericInput, scrollToFirstError } from '@/views/signup/formUtils'

const formSchema = z.object({
  role: z.literal('patient'),
  name: z.string().min(2),
  dialCode: z.string().min(2),
  phoneLocal: z.string().min(6),
  weeksPregnant: z.string().regex(/^\d+$/).refine((value) => {
    const weeks = Number.parseInt(value, 10)
    return weeks >= 1 && weeks <= 44
  }),
  village: z.string().min(2),
  landmark: z.string().optional(),
  language: z.string().min(2),
})

type FormValues = z.infer<typeof formSchema>

export function PatientSignupForm({ onBack }: { onBack: () => void }) {
  const { signup, isSubmitting, error, clearError } = useSignup()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      role: 'patient',
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
    control,
    formState: { errors },
  } = form
  const dialCode = useWatch({ control, name: 'dialCode' })
  const language = useWatch({ control, name: 'language' })
  const roleField = register('role')
  const nameField = register('name')
  const phoneLocalField = register('phoneLocal')
  const weeksPregnantField = register('weeksPregnant')
  const villageField = register('village')
  const landmarkField = register('landmark')

  const onSubmit = handleSubmit(
    async (values) => {
      clearError()
      const weeksPregnant = Number.parseInt(values.weeksPregnant, 10)
      await signup(
        {
          role: values.role,
          name: values.name.trim(),
          phone: composePhone(values.dialCode, values.phoneLocal),
          weeksPregnant,
          village: values.village.trim(),
          landmark: values.landmark?.trim() || undefined,
          language: values.language,
        },
        { captureBestEffort: true, weeksPregnant },
      )
    },
    (invalid) => scrollToFirstError(invalid),
  )

  return (
    <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
      <input type="hidden" {...roleField} />
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
            value={dialCode}
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
        {errors.phoneLocal ? <p className="text-sm text-destructive">Please enter a valid phone number.</p> : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="weeksPregnant" className="mama-label">
            Weeks pregnant
          </Label>
          <Input
            id="weeksPregnant"
            inputMode="numeric"
            min={1}
            max={44}
            className="mama-input"
            {...weeksPregnantField}
            onChange={(event) => {
              sanitizeNumericInput(event, 2)
              weeksPregnantField.onChange(event)
              clearError()
            }}
          />
          {errors.weeksPregnant ? <p className="text-sm text-destructive">Enter a number between 1 and 44.</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="language" className="mama-label">
            Language
          </Label>
          <Select
            value={language}
            onValueChange={(value) => {
              if (!value) {
                return
              }
              setValue('language', value, { shouldDirty: true, shouldValidate: true })
              clearError()
            }}
          >
            <SelectTrigger id="language" className="mama-select">
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
        <Label htmlFor="village" className="mama-label">
          Village / area
        </Label>
        <Input
          id="village"
          className="mama-input"
          {...villageField}
          onChange={(event) => {
            villageField.onChange(event)
            clearError()
          }}
        />
        {errors.village ? <p className="text-sm text-destructive">Please enter your village or area.</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="landmark" className="mama-label">
          Nearest landmark
        </Label>
        <Input
          id="landmark"
          className="mama-input"
          {...landmarkField}
          onChange={(event) => {
            landmarkField.onChange(event)
            clearError()
          }}
        />
      </div>

      <p className="mama-copy text-sm leading-6">
        We'll ask your phone for location so responders can reach you. If location is blocked, account creation will stop
        until it is shared.
      </p>

      {error ? <p className="mama-error">{error}</p> : null}

      <Button type="submit" className="mama-primary-action" disabled={isSubmitting}>
        {isSubmitting ? 'Loading...' : 'Create Account >'}
      </Button>
    </form>
  )
}
