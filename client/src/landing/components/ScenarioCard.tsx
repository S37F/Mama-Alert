import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { fadeUpChildVariants } from '@/landing/hooks/useScrollReveal'

interface ScenarioCardProps {
  tag: string
  nameBlock: ReactNode
  situation: string
  withoutTitle: string
  withoutBody: string
  fatalDelay: string
  withTitle: string
  withBody: string
  responseLabel: string
  triggerLabel: string
  triggerIcon: ReactNode
}

export function ScenarioCard({
  tag,
  nameBlock,
  situation,
  withoutTitle,
  withoutBody,
  fatalDelay,
  withTitle,
  withBody,
  responseLabel,
  triggerLabel,
  triggerIcon,
}: ScenarioCardProps) {
  return (
    <motion.article
      className="landing-card"
      variants={fadeUpChildVariants}
      style={{
        padding: 32,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <span
        className="landing-tag"
        style={{
          background: 'var(--color-sand)',
          color: 'var(--color-warm-gray)',
          marginBottom: 20,
          alignSelf: 'flex-start',
        }}
      >
        {tag}
      </span>

      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          fontWeight: 700,
          color: 'var(--color-charcoal)',
          marginBottom: 16,
          lineHeight: 1.3,
        }}
      >
        {nameBlock}
      </div>

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-warm-gray)',
          lineHeight: 1.6,
          margin: '0 0 20px',
        }}
      >
        <strong style={{ color: 'var(--color-charcoal)' }}>Situation:</strong>
        <br />
        {situation}
      </p>

      <div
        style={{
          borderTop: '1px solid var(--color-sand-dark)',
          paddingTop: 20,
          marginTop: 'auto',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            margin: '0 0 8px',
          }}
        >
          {withoutTitle}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-warm-gray)',
            margin: '0 0 12px',
            lineHeight: 1.55,
          }}
        >
          {withoutBody}
        </p>
        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: 'rgba(220, 38, 38, 0.25)',
            borderLeft: '3px solid var(--color-alert)',
            paddingLeft: 8,
            marginBottom: 20,
          }}
        />
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-alert)',
            fontWeight: 600,
            margin: '0 0 20px',
          }}
        >
          {fatalDelay}
        </p>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            margin: '0 0 8px',
          }}
        >
          {withTitle}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-warm-gray)',
            margin: '0 0 12px',
            lineHeight: 1.55,
          }}
        >
          {withBody}
        </p>
        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: 'rgba(45, 106, 79, 0.2)',
            borderLeft: '3px solid var(--color-forest)',
            paddingLeft: 8,
            marginBottom: 8,
          }}
        />
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-forest)',
            fontWeight: 600,
            margin: 0,
          }}
        >
          {responseLabel}
        </p>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--color-sand-dark)',
          marginTop: 24,
          paddingTop: 20,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-muted)',
            margin: '0 0 12px',
          }}
        >
          How she triggered it:
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flexShrink: 0, color: 'var(--color-terra)' }} aria-hidden>
            {triggerIcon}
          </div>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-warm-gray)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {triggerLabel}
          </p>
        </div>
      </div>
    </motion.article>
  )
}
