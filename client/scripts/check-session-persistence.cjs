const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const vm = require('node:vm')

const sourcePath = path.join(__dirname, '..', 'src', 'lib', 'mamaSession.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText

const store = new Map()
const sessionModule = { exports: {} }
const context = {
  module: sessionModule,
  exports: sessionModule.exports,
  Event: function Event(type) {
    this.type = type
  },
  window: {
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null
      },
      setItem(key, value) {
        store.set(key, String(value))
      },
      removeItem(key) {
        store.delete(key)
      },
    },
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  },
}

vm.runInNewContext(transpiled, context, { filename: sourcePath })

const {
  MAMA_ALERT_SESSION_KEY,
  readMamaAlertSession,
  writeMamaAlertSession,
} = sessionModule.exports

writeMamaAlertSession({
  phone: '+15550000001',
  role: 'volunteer',
  profileId: '11111111-1111-4111-8111-111111111111',
  name: 'Volunteer Test',
  signedInAt: 1710000000000,
  sessionToken: 'session-token-test',
  zoneId: '22222222-2222-4222-8222-222222222222',
  volunteerPortalToken: 'volunteer-portal-token-test',
})

const raw = store.get(MAMA_ALERT_SESSION_KEY)
assert.ok(raw, 'session should be persisted')

const persisted = JSON.parse(raw)
assert.equal(persisted.sessionToken, 'session-token-test')
assert.equal(persisted.volunteerPortalToken, 'volunteer-portal-token-test')

const readBack = readMamaAlertSession()
assert.equal(readBack.sessionToken, 'session-token-test')
assert.equal(readBack.volunteerPortalToken, 'volunteer-portal-token-test')

console.log('session persistence check passed')
