import type { ReactNode } from 'react'

interface PhoneMockupProps {
  /** 1–5 — matches How it works steps */
  step: number
}

function PhoneChrome({ children }: { children: ReactNode }) {
  return (
    <div
      className="landing-phone will-change-transform"
      style={{
        width: 280,
        maxWidth: '100%',
        margin: '0 auto',
        borderRadius: 36,
        border: '3px solid var(--color-charcoal)',
        background: 'var(--color-charcoal)',
        padding: 10,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          borderRadius: 28,
          overflow: 'hidden',
          background: 'var(--color-white)',
          aspectRatio: '375 / 812',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: 28,
            background: 'var(--color-cream)',
            borderBottom: '1px solid var(--color-sand-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: 'var(--color-muted)',
            fontFamily: 'var(--font-body)',
          }}
        >
          9:41
        </div>
        <div style={{ height: 'calc(100% - 28px)', overflow: 'hidden' }}>{children}</div>
      </div>
    </div>
  )
}

function ScreenPatientSos() {
  return (
    <iframe
      title="MamaAlert patient SOS preview"
      src="/sos"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        transform: 'scale(0.92)',
        transformOrigin: 'top center',
      }}
    />
  )
}

function ScreenSms() {
  return (
    <div
      style={{
        padding: 14,
        height: '100%',
        background: 'linear-gradient(180deg, #f0f4f8 0%, #e8eef5 100%)',
        fontFamily: 'var(--font-body)',
        fontSize: 12,
      }}
    >
      <p style={{ margin: '0 0 12px', color: 'var(--color-muted)', fontSize: 11 }}>Messages</p>
      <div
        style={{
          background: 'var(--color-white)',
          borderRadius: 14,
          padding: 12,
          border: '1px solid var(--color-sand-dark)',
          boxShadow: 'none',
        }}
      >
        <p style={{ margin: '0 0 6px', fontSize: 10, color: 'var(--color-muted)' }}>SMS · now</p>
        <p style={{ margin: 0, color: 'var(--color-charcoal)', lineHeight: 1.45 }}>
          MAMA ALERT: Priya Sharma, near the temple, 38 wks, B+. Reply YES to help.
        </p>
      </div>
    </div>
  )
}

function ScreenVolunteer() {
  return (
    <div
      style={{
        padding: 16,
        height: '100%',
        background: 'var(--color-cream)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <p style={{ fontWeight: 600, margin: '0 0 16px', fontSize: 14 }}>Active alert</p>
      <div className="landing-card" style={{ padding: 14, marginBottom: 16 }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>Priya Sharma</p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-warm-gray)' }}>1.2 km · needs transport</p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          style={{
            flex: 1,
            padding: '12px 8px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--color-forest)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          YES
        </button>
        <button
          type="button"
          style={{
            flex: 1,
            padding: '12px 8px',
            borderRadius: 8,
            border: '1px solid var(--color-sand-dark)',
            background: 'var(--color-white)',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          NO
        </button>
      </div>
    </div>
  )
}

function ScreenHospital() {
  return (
    <div
      style={{
        padding: 16,
        height: '100%',
        background: 'var(--color-cream)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <p style={{ fontWeight: 600, margin: '0 0 16px', fontSize: 14 }}>Inbox</p>
      <div className="landing-card" style={{ padding: 14, borderLeft: '4px solid var(--color-terra)' }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--color-terra)', fontWeight: 600 }}>
          PRE-ALERT
        </p>
        <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600 }}>Priya Sharma</p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-warm-gray)', lineHeight: 1.4 }}>
          B+ · 38 wks · Volunteer: Ravi · ETA 12 min
        </p>
      </div>
    </div>
  )
}

function ScreenFamily() {
  return (
    <div
      style={{
        padding: 20,
        height: '100%',
        background: 'var(--color-cream)',
        fontFamily: 'var(--font-body)',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 13, color: 'var(--color-warm-gray)', margin: '0 0 20px' }}>
        Family update
      </p>
      <div className="landing-card" style={{ padding: 18, textAlign: 'left' }}>
        <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: 'var(--color-forest)' }}>
          Priya has been helped.
        </p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-warm-gray)', lineHeight: 1.5 }}>
          Ravi is taking her to PHC Wai. Track status with one link — no login.
        </p>
      </div>
    </div>
  )
}

export function PhoneMockup({ step }: PhoneMockupProps) {
  let inner: React.ReactNode
  switch (step) {
    case 1:
      inner = <ScreenPatientSos />
      break
    case 2:
      inner = <ScreenSms />
      break
    case 3:
      inner = <ScreenVolunteer />
      break
    case 4:
      inner = <ScreenHospital />
      break
    default:
      inner = <ScreenFamily />
  }

  return <PhoneChrome>{inner}</PhoneChrome>
}
