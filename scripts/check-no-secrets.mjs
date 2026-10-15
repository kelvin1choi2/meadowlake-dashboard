// Fails the build if anything that looks like a Home Assistant token ended up in dist/.
// Home Assistant long-lived tokens are JWTs, which always start with "eyJ".
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const jwt = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/
const bad = []
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (jwt.test(readFileSync(p, 'utf8'))) bad.push(p)
  }
}
walk('dist')
const envLeak = Object.keys(process.env).filter((k) => k.startsWith('VITE_HA'))
if (bad.length || envLeak.length) {
  if (bad.length) console.error('Token-like string found in:', bad.join(', '))
  if (envLeak.length) console.error('Home Assistant env vars must not be set at build time:', envLeak.join(', '))
  process.exit(1)
}
console.log('No Home Assistant tokens in dist/.')
