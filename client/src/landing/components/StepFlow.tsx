export interface FlowStep {
  id: string
  label: string
  title: string
  body: string
  /** Merged onto each step for scroll / intersection (e.g. from `useInView`). */
  observeRef?: (node: HTMLDivElement | null) => void
}

interface StepFlowProps {
  steps: FlowStep[]
  activeIndex: number
}

export function StepFlow({ steps, activeIndex }: StepFlowProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {steps.map((s, i) => {
        const active = i === activeIndex
        return (
          <article
            key={s.id}
            ref={s.observeRef}
            id={s.id}
            style={{
              opacity: active ? 1 : 0.55,
              transition: 'opacity 0.35s ease',
              scrollMarginTop: 120,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-3xl)',
                fontWeight: 700,
                color: active ? 'var(--color-terra)' : 'var(--color-muted)',
                display: 'block',
                marginBottom: 8,
              }}
            >
              {s.label}
            </span>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 700,
                color: 'var(--color-charcoal)',
                margin: '0 0 12px',
                lineHeight: 1.25,
              }}
            >
              {s.title}
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                color: 'var(--color-warm-gray)',
                lineHeight: 1.65,
                margin: 0,
                maxWidth: 440,
              }}
            >
              {s.body}
            </p>
          </article>
        )
      })}
    </div>
  )
}
