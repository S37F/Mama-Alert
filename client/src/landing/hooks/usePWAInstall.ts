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
    return subscribeInstallPrompt(sync)
  }, [])

  const install = useCallback(async () => {
    const ev = getInstallPrompt()
    if (!ev) {
      window.location.href = '/sos'
      return
    }
    setIsInstalling(true)
    await ev.prompt()
    const { outcome } = await ev.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setIsInstalling(false)
    clearInstallPrompt()
  }, [])

  return { install, isInstalled, isInstalling, canInstall: !!installEvent }
}
