// Generates TypeScript declarations from the JSDoc into types/ and adds the
// sampling methods that Generator installs at runtime.
import { execFileSync } from 'node:child_process'
import { appendFileSync, rmSync } from 'node:fs'

rmSync(new URL('../types', import.meta.url), { recursive: true, force: true })
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.types.json'], { stdio: 'inherit' })

appendFileSync(new URL('../types/src/core/generator.d.ts', import.meta.url), `
type SamplingFunctions = typeof import('../distributions.js')
/** Every sampling function of the library is available as a method of Generator. */
export interface Generator extends SamplingFunctions {}
`)
