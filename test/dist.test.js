import { describe, test, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const dist = new URL('../dist/', import.meta.url)
const built = existsSync(new URL('randlib.min.js', dist))

describe.skipIf(!built)('dist bundles (run `npm run build` first)', () => {
  test('minified IIFE defines the global randlib', () => {
    const context = { crypto: globalThis.crypto }
    vm.createContext(context)
    vm.runInContext(readFileSync(new URL('randlib.min.js', dist), 'utf8'), context)
    const { randlib } = context
    randlib.seed(42, 'mt19937')
    expect(randlib.random()).toBe(0.3745401188473625)
    expect(randlib.createGenerator(1).normal(0, 1, 3)).toHaveLength(3)
  })

  test('CommonJS bundle can be required', () => {
    const require = createRequire(import.meta.url)
    const lib = require('../dist/randlib.cjs')
    lib.seed(42, 'mt19937')
    expect(lib.random()).toBe(0.3745401188473625)
  })

  test('ESM bundle exports the same API as index.js', async () => {
    const bundle = await import('../dist/randlib.mjs')
    const source = await import('../index.js')
    expect(Object.keys(bundle).sort()).toEqual(Object.keys(source).sort())
  })
})
