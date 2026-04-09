import type { CSSProperties } from 'react'

/** Simplified equirectangular-style map — decorative, no external assets. */
const DOTS: { cx: number; cy: number; delay: string }[] = [
  { cx: 620, cy: 220, delay: '0s' },
  { cx: 480, cy: 280, delay: '0.3s' },
  { cx: 500, cy: 270, delay: '0.6s' },
  { cx: 540, cy: 250, delay: '0.2s' },
  { cx: 640, cy: 210, delay: '0.5s' },
  { cx: 660, cy: 235, delay: '0.8s' },
  { cx: 520, cy: 300, delay: '0.4s' },
  { cx: 530, cy: 240, delay: '1s' },
  { cx: 340, cy: 320, delay: '0.35s' },
  { cx: 720, cy: 290, delay: '0.55s' },
]

export function WorldMapStatic() {
  return (
    <div style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>
      <svg
        viewBox="0 0 800 400"
        role="img"
        aria-label="World map with alert locations"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <rect width="800" height="400" fill="var(--color-cream)" />
        <path
          fill="var(--color-sand)"
          stroke="var(--color-sand-dark)"
          strokeWidth="1"
          d="M120,180 Q200,120 280,150 T420,140 Q500,100 600,130 T760,160 L760,280 Q680,320 600,300 T420,310 Q300,340 200,300 T80,260 Z M100,200 Q140,220 160,260 Q120,280 100,260 Z M640,200 Q700,190 720,230 Q680,250 640,230 Z"
        />
        <path
          fill="none"
          stroke="var(--color-sand-dark)"
          strokeWidth="0.8"
          opacity="0.6"
          d="M0,200 H800 M400,0 V400 M100,100 Q400,80 700,100 M100,300 Q400,320 700,300"
        />
        {DOTS.map((d, i) => (
          <circle
            key={i}
            cx={d.cx}
            cy={d.cy}
            r="6"
            fill="var(--color-terra)"
            className="landing-map-pulse"
            style={{ animationDelay: d.delay } as CSSProperties}
          />
        ))}
      </svg>
      <style>{`
        .landing-map-pulse {
          animation: landing-map-dot 2s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes landing-map-dot {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.25); }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-map-pulse { animation: none; opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
