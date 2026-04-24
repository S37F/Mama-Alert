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
        <p className="mama-kicker">Step 1 of 2</p>
        <h2 className="mama-heading text-3xl">Pick your role</h2>
        <p className="mama-copy text-sm">Choose the screen you need. You can always come back and switch it.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map((item) => {
          const active = selectedRole === item.role
          return (
            <button
              key={item.role}
              type="button"
              onClick={() => onSelect(item.role)}
              className={`rounded-2xl border px-5 py-6 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${
                active
                  ? `scale-[1.02] border-primary ${item.colorClass} shadow-lg`
                  : 'border-border bg-white hover:border-primary/50 hover:shadow-md'
              }`}
            >
              <span className={`mb-4 block h-10 w-10 rounded-full ${item.iconClass}`} aria-hidden />
              <h3 className="mama-heading text-xl">{item.title}</h3>
              <p className="mama-copy mt-2 text-sm leading-6">{item.description}</p>
            </button>
          )
        })}
      </div>

      <Button type="button" className="mama-primary-action" disabled={!selectedRole} onClick={onContinue}>
        Continue &gt;
      </Button>
    </div>
  )
}
