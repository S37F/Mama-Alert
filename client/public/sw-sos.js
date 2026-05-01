/**
 * MamaAlert Phase 5 — Background Sync for queued SOS (IndexedDB `mamaalert-offline`).
 * Loaded via Workbox `importScripts`. Tag: sync-sos
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sos') {
    event.waitUntil(processPendingSOS())
  }
})

const DB_NAME = 'mamaalert-offline'
const DB_VERSION = 2
const STORE = 'pending_alerts'
const META = 'meta'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: 'id' })
      }
    }
  })
}

function getApiBase(db) {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(META)) {
      resolve('')
      return
    }
    try {
      const tx = db.transaction(META, 'readonly')
      const q = tx.objectStore(META).get('apiBase')
      q.onsuccess = () => {
        const row = q.result
        resolve(typeof row?.value === 'string' ? row.value : '')
      }
      q.onerror = () => resolve('')
    } catch {
      resolve('')
    }
  })
}

function getAllPending(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const q = tx.objectStore(STORE).getAll()
    q.onsuccess = () => resolve(q.result || [])
    q.onerror = () => reject(q.error)
  })
}

function removePending(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function isSosPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return false
  }
  const method = payload.triggerMethod
  if (method !== 'pwa' && method !== 'sms' && method !== 'ussd') {
    return false
  }
  const token = payload.sosToken
  if (typeof token === 'string' && token.length >= 24) {
    return payload.incapacitationSuspected === undefined || typeof payload.incapacitationSuspected === 'boolean'
  }
  const phone = payload.phone
  return (
    typeof phone === 'string' &&
    phone.length >= 8 &&
    (payload.incapacitationSuspected === undefined || typeof payload.incapacitationSuspected === 'boolean')
  )
}

async function processPendingSOS() {
  let db
  try {
    db = await openDb()
  } catch {
    return
  }

  let base = await getApiBase(db)
  if (!base && self.location && self.location.origin) {
    base = self.location.origin
  }
  base = String(base).replace(/\/$/, '')

  let items
  try {
    items = await getAllPending(db)
  } catch {
    return
  }

  let cleared = 0
  for (const row of items) {
    if (!row || !row.id || !isSosPayload(row.payload)) {
      continue
    }
    const { sosToken, phone, incapacitationSuspected } = row.payload
    const url = `${base}/api/sos`
    const body =
      typeof sosToken === 'string' && sosToken.length >= 24
        ? {
            sosToken,
            triggerMethod: 'pwa',
            ...(typeof incapacitationSuspected === 'boolean'
              ? { incapacitationSuspected }
              : {}),
          }
        : {
            phone,
            triggerMethod: 'pwa',
            ...(typeof incapacitationSuspected === 'boolean'
              ? { incapacitationSuspected }
              : {}),
          }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'omit',
      })
      if (res.ok || res.status === 201 || res.status === 409) {
        await removePending(db, row.id)
        cleared += 1
      }
    } catch {
      /* leave in queue for next sync */
    }
  }

  if (
    cleared > 0 &&
    self.registration &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  ) {
    try {
      await self.registration.showNotification('MamaAlert', {
        body: 'Your emergency alert was sent.',
        tag: 'mamaalert-sos-sync',
      })
    } catch {
      /* ignore */
    }
  }
}
