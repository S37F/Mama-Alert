import { useCallback, useEffect, useState } from 'react'
import {
  clearInstallPrompt,
  getInstallPrompt,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from '@/landing/installPromptStore'

export function usePWAInstall() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(() =>
    getInstallPrompt(),
  )
  const [isInstalled, setIsInstalled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
  )
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    const sync = () => setInstallEvent(getInstallPrompt())
    const unsubscribe = subscribeInstallPrompt(sync)
    const onAppInstalled = () => {
      setIsInstalled(true)
      clearInstallPrompt()
      setInstallEvent(null)
    }
    const standaloneMedia =
      typeof window !== 'undefined' ? window.matchMedia('(display-mode: standalone)') : null
    const onDisplayModeChange = () => setIsInstalled(Boolean(standaloneMedia?.matches))

    window.addEventListener('appinstalled', onAppInstalled)
    standaloneMedia?.addEventListener('change', onDisplayModeChange)

    return () => {
      unsubscribe()
      window.removeEventListener('appinstalled', onAppInstalled)
      standaloneMedia?.removeEventListener('change', onDisplayModeChange)
    }
  }, [])

  const install = useCallback(async () => {
    const ev = getInstallPrompt()
    if (!ev) {
      window.location.assign(isInstalled ? '/sos' : '/signup')
      return
    }
    setIsInstalling(true)
    try {
      await ev.prompt()
      const { outcome } = await ev.userChoice
      if (outcome === 'accepted') setIsInstalled(true)
      clearInstallPrompt()
      setInstallEvent(null)
    } finally {
      setIsInstalling(false)
    }
  }, [isInstalled])

  return { install, isInstalled, isInstalling, canInstall: !!installEvent }
}
