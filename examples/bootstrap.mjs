// Bootstrap confidence interval of a median and a permutation A/B test.
// Run: node examples/bootstrap.mjs
import { seed, lognormal, normal, bootstrap, permutationTest } from '../index.js'

seed(1)
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const incomes = lognormal(10, 0.8, 200)
const { estimate, confidenceInterval, standardError } = bootstrap(incomes, median, { nResamples: 4999 })
console.log(`median income ${estimate.toFixed(0)}, 95% BCa CI [${confidenceInterval.map((v) => v.toFixed(0)).join(', ')}], SE ${standardError.toFixed(0)}`)

const control = normal(0.10, 0.05, 60)
const variant = normal(0.12, 0.05, 60)
const { statistic, pvalue } = permutationTest(variant, control, undefined, { alternative: 'greater' })
console.log(`uplift ${statistic.toFixed(4)}, one-sided p-value ${pvalue.toFixed(4)}`)
