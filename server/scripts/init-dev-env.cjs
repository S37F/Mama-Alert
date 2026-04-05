const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const root = path.join(__dirname, '..')
const dest = path.join(root, '.env')
const example = path.join(root, 'dev.env.example')

if (fs.existsSync(dest)) {
  process.exit(0)
}
if (!fs.existsSync(example)) {
  console.warn('[init-dev-env] dev.env.example missing, skip')
  process.exit(0)
}

let content = fs.readFileSync(example, 'utf8')
content = content.replace(/__GENERATE_JWT_SECRET__/g, crypto.randomBytes(32).toString('hex'))
fs.writeFileSync(dest, content, 'utf8')
console.log('[init-dev-env] wrote server/.env — set real SUPABASE_* when you connect to a project.')
