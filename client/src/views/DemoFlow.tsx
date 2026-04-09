import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ApiHttpError, postSos } from '@/services/api'
import { ErrorMessage } from '@/components/ErrorMessage'

const DEMO_PHONE =
  typeof import.meta.env.VITE_DEMO_PHONE === 'string' && import.meta.env.VITE_DEMO_PHONE.trim().length >= 8
    ? import.meta.env.VITE_DEMO_PHONE.trim()
    : '+15551230000'

export function DemoFlow() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(false)
  const [demoErr, setDemoErr] = useState<string | null>(null)
  const [demoBusy, setDemoBusy] = useState(false)

  const steps = [
    t('demo.step1'),
    t('demo.step2'),
    t('demo.step3'),
    t('demo.step4'),
    t('demo.step5'),
    t('demo.step6'),
  ] as const

  const runRealDemo = async () => {
    setDemoErr(null)
    setDemoBusy(true)
    try {
      await postSos({ phone: DEMO_PHONE, triggerMethod: 'pwa' })
    } catch (e) {
      if (e instanceof ApiHttpError && e.statusCode === 409) {
        setDemoErr(t('sos.duplicateDetail'))
        return
      }
      setDemoErr(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setDemoBusy(false)
    }
  }

  useEffect(() => {
    if (!auto) {
      return
    }
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % steps.length)
    }, 4000)
    return () => window.clearInterval(id)
  }, [auto, steps.length])

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-lg space-y-6 p-6 outline-none">
      <h1 className="text-2xl font-bold">{t('demo.title')}</h1>

      {step === 0 ? (
        <div className="overflow-hidden rounded-md border">
          <p className="text-muted-foreground bg-muted px-2 py-1 text-xs">{t('demo.sosPreviewTitle')}</p>
          <iframe title={t('demo.sosPreviewTitle')} src="/" className="h-64 w-full border-0 bg-background" />
        </div>
      ) : null}

      <label htmlFor="demo-auto-advance" className="flex items-center gap-2 text-sm">
        <input
          id="demo-auto-advance"
          type="checkbox"
          checked={auto}
          onChange={(e) => setAuto(e.target.checked)}
        />
        {t('demo.autoAdvance')}
      </label>

      <Card>
        <CardContent className="pt-6">
          <p className="text-lg leading-relaxed">{steps[step]}</p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-sm">
        {t('demo.stepCounter', { current: step + 1, total: steps.length })}
      </p>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          {t('demo.prev')}
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={step >= steps.length - 1}
          onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
        >
          {t('demo.next')}
        </Button>
      </div>

      <Button type="button" className="w-full bg-red-600 text-white hover:bg-red-700" disabled={demoBusy} onClick={() => void runRealDemo()}>
        {demoBusy ? t('common.loading') : t('demo.triggerReal')}
      </Button>
      {demoErr ? <ErrorMessage message={demoErr} /> : null}

      <p className="text-muted-foreground text-xs">{t('demo.seedHint', { phone: DEMO_PHONE })}</p>
    </main>
  )
}
