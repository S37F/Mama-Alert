import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DB_NAME = 'mamaalert-offline'
const STORE = 'pending_alerts'
const META_STORE = 'meta'
const DB_VERSION = 2

interface MamaAlertDB extends DBSchema {
  [STORE]: {
    key: string
    value: { id: string; payload: unknown; createdAt: string }
  }
  [META_STORE]: {
    key: string
    value: { id: string; value: string }
  }
}

let dbPromise: Promise<IDBPDatabase<MamaAlertDB>> | null = null

function getDb(): Promise<IDBPDatabase<MamaAlertDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MamaAlertDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' })
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

/** Persisted for `public/sw-sos.js` Background Sync (Phase 5). */
export async function setOfflineApiBase(url: string): Promise<void> {
  const trimmed = url.trim().replace(/\/$/, '')
  const db = await getDb()
  await db.put(META_STORE, { id: 'apiBase', value: trimmed })
}

export async function queueOfflineAlert(payload: unknown): Promise<string> {
  const base = typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : ''
  if (base.length > 0) {
    await setOfflineApiBase(base)
  }

  const id = crypto.randomUUID()
  const db = await getDb()
  await db.put(STORE, {
    id,
    payload,
    createdAt: new Date().toISOString(),
  })
  return id
}

export async function listPendingAlerts(): Promise<
  { id: string; payload: unknown; createdAt: string }[]
> {
  const db = await getDb()
  return db.getAll(STORE)
}

export async function removePendingAlert(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}
