import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSignup } from '@/hooks/useSignup'
import { DIAL_CODES, VOLUNTEER_SKILLS } from '@/views/signup/constants'
import { composePhone, sanitizeNumericInput, scrollToFirstError } from '@/views/signup/formUtils'

const formSchema = z.object({
  name: z.string().min(2),
  dialCode: z.string().min(2),
  phoneLocal: z.string().min(6),
  village: z.string().min(2),
  skills: z.array(z.string()).min(1),
  vehicle: z.enum(['motorcycle', 'car', 'bicycle', 'none']),
  availableHours: z.enum(['24/7', 'daytime', 'nights', 'weekends']),
  maxRadiusKm: z.enum(['2', '5', '10']),
})

type FormValues = z.infer<typeof formSchema>

export function VolunteerSignupForm({ onBack }: { onBack: () => void }) {
  const { signup, isSubmitting, error, clearError } = useSignup()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      dialCode: '+91',
      phoneLocal: '',
      village: '',
      skills: [],
      vehicle: 'none',
      availableHours: '24/7',
      maxRadiusKm: '5',
    },
  })

  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = form

  const selectedSkills = watch('skills')

  const onSubmit = handleSubmit(
    async (values) => {
      clearError()
      await signup(
        {
          role: 'volunteer',
          name: values.name.trim(),
          phone: composePhone(values.dialCode, values.phoneLocal),
          village: values.village.trim(),
          skills: values.skills,
          vehicle: values.vehicle,
          availableHours: values.availableHours,
          maxRadiusKm: Number.parseInt(values.maxRadiusKm, 10),
        },
        { captureLocation: true },
      )
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
          {...register('name')}
          onChange={(event) => {
            register('name').onChange(event)
            clearError()
          }}
        />
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
            {...register('phoneLocal')}
            onChange={(event) => {
              sanitizeNumericInput(event)
              register('phoneLocal').onChange(event)
              clearError()
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="village" className="mama-label">
          Village / area
        </Label>
        <Input
          id="village"
          className="mama-input"
          {...register('village')}
          onChange={(event) => {
            register('village').onChange(event)
            clearError()
          }}
        />
      </div>

      <div id="skills" className="mama-panel-compact space-y-3 p-4">
        <Label className="mama-label">Skills</Label>
        <div className="space-y-3">
          {VOLUNTEER_SKILLS.map((skill) => {
            const checked = selectedSkills.includes(skill)
            return (
              <label key={skill} className="flex items-start gap-3 text-sm text-foreground">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => {
                    const next = value ? [...selectedSkills, skill] : selectedSkills.filter((item) => item !== skill)
                    setValue('skills', next, { shouldDirty: true, shouldValidate: true })
                    clearError()
                  }}
                />
                <span>{skill}</span>
              </label>
            )
          })}
        </div>
        {errors.skills ? <p className="text-sm text-destructive">Select at least one skill.</p> : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="vehicle" className="mama-label">
            Vehicle
          </Label>
          <Select
            value={watch('vehicle')}
            onValueChange={(value) => {
              if (!value) {
                return
              }
              setValue('vehicle', value as FormValues['vehicle'], { shouldDirty: true, shouldValidate: true })
              clearError()
            }}
          >
            <SelectTrigger id="vehicle" className="mama-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="motorcycle">Motorcycle</SelectItem>
              <SelectItem value="car">Car</SelectItem>
              <SelectItem value="bicycle">Bicycle</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="availableHours" className="mama-label">
            Available hours
          </Label>
          <Select
            value={watch('availableHours')}
            onValueChange={(value) => {
              if (!value) {
                return
              }
              setValue('availableHours', value as FormValues['availableHours'], {
                shouldDirty: true,
                shouldValidate: true,
              })
              clearError()
            }}
          >
            <SelectTrigger id="availableHours" className="mama-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24/7">24/7</SelectItem>
              <SelectItem value="daytime">Daytime only</SelectItem>
              <SelectItem value="nights">Nights only</SelectItem>
              <SelectItem value="weekends">Weekends</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxRadiusKm" className="mama-label">
            Max radius
          </Label>
          <Select
            value={watch('maxRadiusKm')}
            onValueChange={(value) => {
              if (!value) {
                return
              }
              setValue('maxRadiusKm', value as FormValues['maxRadiusKm'], { shouldDirty: true, shouldValidate: true })
              clearError()
            }}
          >
            <SelectTrigger id="maxRadiusKm" className="mama-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 km</SelectItem>
              <SelectItem value="5">5 km</SelectItem>
              <SelectItem value="10">10 km</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? <p className="mama-error">{error}</p> : null}

      <Button type="submit" className="mama-primary-action" disabled={isSubmitting}>
        {isSubmitting ? 'Loading...' : 'Create Account >'}
      </Button>
    </form>
  )
}
