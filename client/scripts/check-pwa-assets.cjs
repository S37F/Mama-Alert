const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function readPngSize(relativePath) {
  const filePath = path.join(root, relativePath)
  const data = fs.readFileSync(filePath)
  assert.ok(data.length >= 24, `${relativePath} is too small to be a valid PNG`)
  assert.ok(data.subarray(0, 8).equals(pngSignature), `${relativePath} is not a PNG`)
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
  }
}

for (const [file, expected] of [
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
]) {
  const size = readPngSize(file)
  assert.deepEqual(size, { width: expected, height: expected }, `${file} must be ${expected}x${expected}`)
}

const viteConfig = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8')
const favicon = fs.readFileSync(path.join(root, 'public/favicon.svg'), 'utf8')

assert.match(viteConfig, /src:\s*['"]\/icon-192\.png['"]/)
assert.match(viteConfig, /src:\s*['"]\/icon-512\.png['"]/)
assert.match(viteConfig, /theme_color:\s*['"]#C4522A['"]/)
assert.match(favicon, /#C4522A/)
assert.match(favicon, /MamaAlert/)

console.log('PWA asset check passed')
