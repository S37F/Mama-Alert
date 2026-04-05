const fs = require('fs')
const path = require('path')

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

fs.copyFileSync(example, dest)
console.log('[init-dev-env] wrote client/.env — set real VITE_SUPABASE_* when you connect to a project.')
