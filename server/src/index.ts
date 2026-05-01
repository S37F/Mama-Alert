import 'dotenv/config'
import { validateEnv } from '@/config/env'
validateEnv()

import { createApp } from '@/app'
import { startDelayedJobPoller } from '@/services/delayedJobProcessor'

const PORT = Number(process.env.PORT) || 3000
const app = createApp()

app.listen(PORT, () => {
  console.log(`MamaAlert server running on port ${PORT}`)
  startDelayedJobPoller()
})
