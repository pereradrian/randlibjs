// Generates TypeScript declarations from the JSDoc into types/ and adds the
// sampling methods that Generator installs at runtime.
import { execFileSync } from 'node:child_process'
import { appendFileSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

rmSync(new URL('../types', import.meta.url), { recursive: true, force: true })
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.types.json'], { stdio: 'inherit' })

appendFileSync(new URL('../types/src/core/generator.d.ts', import.meta.url), `
type SamplingFunctions = typeof import('../distributions.js')
/** Every sampling function of the library is available as a method of Generator. */
export interface Generator extends SamplingFunctions {}
`)

// CommonJS mirror: every X.d.ts gets an X.d.cts with relative '.js' specifiers
// rewritten to '.cjs', so `require('randlibjs')` resolves CommonJS-flavoured types
// (TypeScript node16/nodenext treats .d.ts files in a "type": "module" package as ESM).
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.d.ts') ? [join(dir, e.name)] : [])
for (const file of walk(fileURLToPath(new URL('../types', import.meta.url)))) {
    const cts = readFileSync(file, 'utf8').replace(/(['"])(\.{1,2}\/[^'"]*?)\.js\1/g, '$1$2.cjs$1')
    writeFileSync(file.replace(/\.d\.ts$/, '.d.cts'), cts)
}
