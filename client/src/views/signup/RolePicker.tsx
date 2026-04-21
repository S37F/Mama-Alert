import type { MamaAlertRole } from '@/lib/mamaSession'
import { Button } from '@/components/ui/button'
import { ROLE_COPY } from '@/views/signup/constants'

export function RolePicker({
  selectedRole,
  onSelect,
  onContinue,
}: {
  selectedRole: MamaAlertRole | null
  onSelect: (role: MamaAlertRole) => void
  onContinue: () => void
}) {
  const roles = (Object.keys(ROLE_COPY) as MamaAlertRole[]).map((role) => ({
    role,
    ...ROLE_COPY[role],
  }))

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8F6A5C]">Step 1 of 2</p>
        <h2 className="font-serif text-3xl font-bold text-[#36251D]">Pick your role</h2>
        <p className="text-sm text-[#7B645A]">Choose the screen you need. You can always come back and switch it.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map((item) => {
          const active = selectedRole === item.role
          return (
            <button
              key={item.role}
              type="button"
              onClick={() => onSelect(item.role)}
              className={`rounded-3xl border px-5 py-6 text-left transition duration-150 ${
                active
                  ? `scale-[1.02] border-[#C4522A] ${item.colorClass} shadow-[0_18px_50px_rgba(196,82,42,0.16)]`
                  : 'border-[#E6D5C7] bg-white hover:border-[#C98B70] hover:shadow-[0_12px_36px_rgba(54,37,29,0.08)]'
              }`}
            >
              <span className={`mb-4 block h-10 w-10 rounded-full ${item.iconClass}`} aria-hidden />
              <h3 className="font-serif text-xl font-bold text-[#36251D]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#7B645A]">{item.description}</p>
            </button>
          )
        })}
      </div>

      <Button
        type="button"
        className="h-13 w-full rounded-xl bg-[#C4522A] text-base text-white hover:bg-[#A94625]"
        disabled={!selectedRole}
        onClick={onContinue}
      >
        Continue →
      </Button>
    </div>
  )
}
