/** Phase 5 — Background Sync tag must match `public/sw-sos.js` and CURSOR_PROMPT.md. */
const SYNC_TAG = 'sync-sos'

export async function registerSosBackgroundSync(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }
  try {
    const reg = await navigator.serviceWorker.ready
    type RegWithSync = ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> }
    }
    await (reg as RegWithSync).sync?.register(SYNC_TAG)
  } catch {
    /* Sync API unsupported or permission denied */
  }
}
