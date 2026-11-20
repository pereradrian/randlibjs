// Rough throughput benchmark: millions of samples per second.
// Run: node scripts/benchmark.mjs
import { createGenerator } from '../index.js'

const N = 1_000_000
const cases = [
  ['random', (g) => g.random(N)],
  ['integers(0, 100)', (g) => g.integers(0, 100, N)],
  ['standardNormal', (g) => g.standardNormal(N)],
  ['standardExponential', (g) => g.standardExponential(N)],
  ['gamma(2.5)', (g) => g.gamma(2.5, 1, N)],
  ['poisson(30)', (g) => g.poisson(30, N)],
  ['binomial(1000, 0.3)', (g) => g.binomial(1000, 0.3, N)],
]

console.log('bit generator  ' + cases.map(([name]) => name.padStart(20)).join(''))
for (const bg of ['xoshiro128**', 'pcg32', 'mt19937', 'pcg64']) {
  const g = createGenerator(1, bg)
  const row = cases.map(([, run]) => {
    run(g)
    const t0 = performance.now()
    run(g)
    const seconds = (performance.now() - t0) / 1000
    return `${(N / seconds / 1e6).toFixed(1)} M/s`.padStart(20)
  })
  console.log(bg.padEnd(15) + row.join(''))
}
const t0 = performance.now()
const baseline = Array.from({ length: N }, Math.random)
const rate = baseline.length / ((performance.now() - t0) / 1000) / 1e6
console.log('Math.random    ' + `${rate.toFixed(1)} M/s`.padStart(20))
