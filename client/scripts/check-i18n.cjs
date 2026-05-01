const fs = require('node:fs')
const path = require('node:path')

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales')
const baseName = 'en.json'

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'))
}

function flatten(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix]
  }
  return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key))
}

const baseKeys = new Set(flatten(readJson(baseName)))
let failed = false

for (const file of fs.readdirSync(localesDir).filter((f) => f.endsWith('.json') && f !== baseName).sort()) {
  const keys = new Set(flatten(readJson(file)))
  const missing = [...baseKeys].filter((key) => !keys.has(key))
  const extra = [...keys].filter((key) => !baseKeys.has(key))
  if (missing.length || extra.length) {
    failed = true
    console.error(`${file}: missing=${missing.length} extra=${extra.length}`)
    if (missing.length) {
      console.error(`  missing: ${missing.slice(0, 20).join(', ')}`)
    }
    if (extra.length) {
      console.error(`  extra: ${extra.slice(0, 20).join(', ')}`)
    }
  }
}

if (failed) {
  process.exit(1)
}

console.log('i18n locale keys match en.json')
