// Bayesian conversion rates: Beta posterior, credible intervals and P(B > A).
// Run: node examples/bayesian-beta-binomial.mjs
import { createGenerator, stats } from '../index.js'

const rng = createGenerator(3)
const prior = { a: 1, b: 1 }
const A = { conversions: 48, visitors: 1000 }
const B = { conversions: 63, visitors: 1000 }

const posterior = ({ conversions, visitors }) =>
  stats.beta(prior.a + conversions, prior.b + visitors - conversions)

for (const [name, data] of [['A', A], ['B', B]]) {
  const p = posterior(data)
  const [lo, hi] = p.interval(0.95)
  console.log(`${name}: mean ${p.mean().toFixed(4)}, 95% credible interval [${lo.toFixed(4)}, ${hi.toFixed(4)}]`)
}

const draws = 100000
const a = posterior(A).sample(draws, rng)
const b = posterior(B).sample(draws, rng)
const pBetter = a.filter((_, i) => b[i] > a[i]).length / draws
console.log(`P(B > A) = ${pBetter.toFixed(3)}`)
