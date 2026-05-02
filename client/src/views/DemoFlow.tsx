import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ApiHttpError, postSos } from '@/services/api'
import { ErrorMessage } from '@/components/ErrorMessage'

const DEMO_SOS_TOKEN =
  typeof import.meta.env.VITE_DEMO_SOS_TOKEN === 'string' && import.meta.env.VITE_DEMO_SOS_TOKEN.trim().length >= 24
    ? import.meta.env.VITE_DEMO_SOS_TOKEN.trim()
    : ''

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
      if (DEMO_SOS_TOKEN.length < 24) {
        setDemoErr(t('demo.missingToken'))
        return
      }
      await postSos({ sosToken: DEMO_SOS_TOKEN, triggerMethod: 'pwa' })
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
    <main id="main-content" tabIndex={-1} className="mama-page mama-page-shell mama-page-shell--narrow space-y-6">
      <h1 className="mama-heading text-2xl">{t('demo.title')}</h1>

      {step === 0 ? (
        <div className="mama-panel-compact overflow-hidden">
          <p className="text-muted-foreground bg-muted px-2 py-1 text-xs">{t('demo.sosPreviewTitle')}</p>
          <iframe title={t('demo.sosPreviewTitle')} src="/sos" className="h-64 w-full border-0 bg-background" />
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

      <Button type="button" variant="destructive" className="w-full" disabled={demoBusy} onClick={() => void runRealDemo()}>
        {demoBusy ? t('common.loading') : t('demo.triggerReal')}
      </Button>
      {demoErr ? <ErrorMessage message={demoErr} /> : null}

      <p className="text-muted-foreground text-xs">
        {t('demo.tokenHint')}
      </p>
    </main>
  )
}
