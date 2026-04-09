export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let stored: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function captureInstallPrompt(e: Event): void {
  e.preventDefault()
  stored = e as BeforeInstallPromptEvent
  listeners.forEach((fn) => fn())
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return stored
}

export function clearInstallPrompt(): void {
  stored = null
  listeners.forEach((fn) => fn())
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
