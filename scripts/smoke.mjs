// Smoke test of the installed package on the oldest Node that `engines` allows: the development
// tools need a newer one. It has no dependencies; CI copies it next to an unpacked tarball.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import * as esm from 'randlibjs'

const cjs = createRequire(import.meta.url)('randlibjs')

for (const lib of [esm, cjs]) {
    // the same streams as everywhere else (first values of numpy's default_rng(1) and RandomState(42))
    assert.equal(lib.createGenerator(1, 'pcg64').random(), 0.5118216247002567)
    assert.equal(lib.createGenerator(42, 'mt19937').random(), 0.3745401188473625)
    lib.seed(1)
    const xs = lib.normal(0, 1, 2000)
    assert.ok(Math.abs(xs.reduce((s, x) => s + x, 0) / xs.length) < 0.1)
    assert.ok(Math.abs(lib.stats.f(5, 10).isf(1e-12) / 819.5395711513377 - 1) < 1e-14)
    assert.ok(lib.stats.kstest(xs, lib.stats.normal(0, 1)).pvalue > 1e-4)
    assert.ok(lib.stats.gamma.fit(lib.gamma(2, 1, 500)).mean() > 1)
    assert.equal(lib.claytonCopula(2, 2, 10).length, 10)
    assert.equal(lib.normal(0, 1, new Float32Array(5)).length, 5)
    assert.ok(lib.logo(32, { seed: 7 }).startsWith('<svg'))
}
esm.seed(3)
cjs.seed(3)
assert.equal(esm.poisson(4), cjs.poisson(4))
console.log(`randlibjs works on Node ${process.version} (ESM and CommonJS)`)
