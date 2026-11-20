// Monte Carlo price of a European call under Black-Scholes, compared with the closed form.
// Run: node examples/option-pricing.mjs
import { createGenerator, geometricBrownianMotion, stats } from '../index.js'

const S0 = 100, K = 105, r = 0.03, sigma = 0.25, T = 1
const rng = createGenerator(7)

// risk-neutral paths: drift r
const { x: paths } = rng.run(() => geometricBrownianMotion({ s0: S0, mu: r, sigma, T, n: 50, paths: 50000 }))
const payoffs = paths.map((p) => Math.max(p[p.length - 1] - K, 0))
const discount = Math.exp(-r * T)
const mean = payoffs.reduce((a, b) => a + b, 0) / payoffs.length
const sd = Math.sqrt(payoffs.reduce((s, v) => s + (v - mean) ** 2, 0) / (payoffs.length - 1))
const price = discount * mean
const halfWidth = 1.96 * discount * sd / Math.sqrt(payoffs.length)

const N = stats.normal()
const d1 = (Math.log(S0 / K) + (r + sigma ** 2 / 2) * T) / (sigma * Math.sqrt(T))
const d2 = d1 - sigma * Math.sqrt(T)
const exact = S0 * N.cdf(d1) - K * Math.exp(-r * T) * N.cdf(d2)

console.log(`Monte Carlo:   ${price.toFixed(4)} ± ${halfWidth.toFixed(4)}`)
console.log(`Black-Scholes: ${exact.toFixed(4)}`)
