const { spawnSync } = require('node:child_process')

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })
}

const requireMigrations =
  process.env.REQUIRE_DB_MIGRATIONS_ON_START === 'true' || process.argv.includes('--strict')
const migrationEnv = { ...process.env }

if (process.env.MIGRATION_DATABASE_URL) {
  migrationEnv.DIRECT_DATABASE_URL = process.env.MIGRATION_DATABASE_URL
}

const migrate = run('npx', ['prisma', 'migrate', 'deploy'], { env: migrationEnv })
if (migrate.status !== 0) {
  const message = `Prisma migrations failed with exit code ${migrate.status ?? 'unknown'}`
  if (requireMigrations) {
    console.error(message)
    process.exit(migrate.status ?? 1)
  }
  console.warn(`${message}; continuing API startup because REQUIRE_DB_MIGRATIONS_ON_START is not true`)
}

const app = run('node', ['dist/index.js'])
process.exit(app.status ?? 1)
