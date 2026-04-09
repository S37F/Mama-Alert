import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { fadeUpChildVariants } from '@/landing/hooks/useScrollReveal'

interface StatBlockProps {
  stat: ReactNode
  label: ReactNode
}

export function StatBlock({ stat, label }: StatBlockProps) {
  return (
    <motion.article
      variants={fadeUpChildVariants}
      style={{
        background: 'transparent',
        borderLeft: '3px solid var(--color-terra)',
        paddingLeft: 24,
        minHeight: '100%',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 6vw, var(--text-7xl))',
          fontWeight: 700,
          color: 'var(--color-terra)',
          lineHeight: 1.1,
          marginBottom: 16,
        }}
      >
        {stat}
      </div>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-base)',
          color: 'var(--color-warm-gray)',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {label}
      </p>
    </motion.article>
  )
}
