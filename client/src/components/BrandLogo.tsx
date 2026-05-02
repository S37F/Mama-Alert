import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type BrandTone = 'light' | 'dark' | 'solid'

interface LogoMarkProps {
  size?: number
  tone?: BrandTone
  animated?: boolean
  className?: string
  style?: CSSProperties
}

interface BrandLogoProps {
  tone?: BrandTone
  size?: 'sm' | 'md' | 'lg'
  tagline?: boolean
  stacked?: boolean
  animated?: boolean
  className?: string
  style?: CSSProperties
}

const toneColors = {
  light: {
    mark: '#C4522A',
    pulse: '#FDFAF6',
    mama: '#2C2416',
    alert: '#C4522A',
    tagline: '#A89080',
  },
  dark: {
    mark: '#E8835A',
    pulse: '#FFFFFF',
    mama: '#F5EDE0',
    alert: '#E8835A',
    tagline: '#A89080',
  },
  solid: {
    mark: '#FFFFFF',
    pulse: '#C4522A',
    mama: '#FFFFFF',
    alert: 'rgba(255,255,255,0.75)',
    tagline: 'rgba(255,255,255,0.72)',
  },
} as const

const sizeMap = {
  sm: { mark: 32, word: 'text-xl', tag: 'text-[10px]' },
  md: { mark: 42, word: 'text-2xl', tag: 'text-xs' },
  lg: { mark: 58, word: 'text-4xl', tag: 'text-sm' },
} as const

export function LogoMark({ size = 40, tone = 'light', animated = false, className, style }: LogoMarkProps) {
  const colors = toneColors[tone]
  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={Math.round(size * 1.2)}
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M50,8 C88,8 90,80 50,112 C10,80 12,8 50,8 Z" fill={colors.mark} />
      <polyline
        points="22,43 30,43 33,37 36,43 38,50 41,24 44,56 47,43 55,43 58,37 62,43 75,43"
        fill="none"
        stroke={colors.pulse}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="75" cy="43" r="2.9" fill={colors.pulse}>
        {animated ? <animate attributeName="opacity" values="1;0.15;1" dur="1.8s" repeatCount="indefinite" /> : null}
      </circle>
      {animated ? (
        <circle cx="75" cy="43" r="2" fill="none" stroke={colors.pulse} strokeWidth="1.2" opacity="0">
          <animate attributeName="r" values="2;11" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values=".65;0" dur="1.8s" repeatCount="indefinite" />
        </circle>
      ) : null}
    </svg>
  )
}

export function AppIcon({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-[22%] bg-[var(--mama-terra)]', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <LogoMark size={Math.round(size * 0.68)} tone="solid" />
    </span>
  )
}

export function BrandLogo({
  tone = 'light',
  size = 'md',
  tagline = false,
  stacked = false,
  animated = false,
  className,
  style,
}: BrandLogoProps) {
  const colors = toneColors[tone]
  const sizes = sizeMap[size]
  const label = tagline ? 'MamaAlert, Community maternal emergency network' : 'MamaAlert'

  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center',
        stacked ? 'flex-col gap-2 text-center' : 'gap-3',
        className,
      )}
      style={style}
      aria-label={label}
    >
      <LogoMark size={sizes.mark} tone={tone} animated={animated} className="shrink-0" />
      <span className={cn('min-w-0', stacked && 'text-center')}>
        <span
          className={cn('block truncate leading-none tracking-normal', sizes.word)}
          style={{ fontFamily: 'var(--font-display)', letterSpacing: 0 }}
        >
          <span style={{ color: colors.mama, fontWeight: 400 }}>Mama</span>
          <span style={{ color: colors.alert, fontWeight: 700 }}>Alert</span>
        </span>
        {tagline ? (
          <span
            className={cn('mt-1 block truncate font-medium tracking-[0.03em]', sizes.tag)}
            style={{ color: colors.tagline }}
          >
            Community maternal emergency network
          </span>
        ) : null}
      </span>
    </span>
  )
}
