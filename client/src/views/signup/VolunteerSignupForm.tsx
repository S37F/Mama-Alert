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
import { composePhone, scrollToFirstError } from '@/views/signup/formUtils'

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
      </div>

      <div id="skills" className="space-y-3 rounded-2xl border border-[#E6D5C7] bg-[#FFFDFC] p-4">
        <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8F6A5C]">Skills</Label>
        <div className="space-y-3">
          {VOLUNTEER_SKILLS.map((skill) => {
            const checked = selectedSkills.includes(skill)
            return (
              <label key={skill} className="flex items-start gap-3 text-sm text-[#5C463A]">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => {
                    const next = value
                      ? [...selectedSkills, skill]
                      : selectedSkills.filter((item) => item !== skill)
                    setValue('skills', next, { shouldDirty: true, shouldValidate: true })
                    clearError()
                  }}
                />
                <span>{skill}</span>
              </label>
            )
          })}
        </div>
        {errors.skills ? <p className="text-sm text-red-600">Select at least one skill.</p> : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="vehicle" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8F6A5C]">
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
            <SelectTrigger id="vehicle" className="h-12 rounded-xl border-[#D8C1B0] bg-white focus:ring-[#C4522A]">
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
          <Label
            htmlFor="availableHours"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8F6A5C]"
          >
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
            <SelectTrigger
              id="availableHours"
              className="h-12 rounded-xl border-[#D8C1B0] bg-white focus:ring-[#C4522A]"
            >
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
          <Label
            htmlFor="maxRadiusKm"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8F6A5C]"
          >
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
            <SelectTrigger
              id="maxRadiusKm"
              className="h-12 rounded-xl border-[#D8C1B0] bg-white focus:ring-[#C4522A]"
            >
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
