// Typed-array output and fit() must type check against the published declarations.
import { normal, poisson, createGenerator } from '../../types/index.js'

const buf = new Float32Array(10)
normal(0, 1, buf)
poisson(3, new Uint16Array(4))
createGenerator(1).gamma(2, 1, new Float64Array(3))

// fit() returns the family's distribution object
import { stats } from '../../types/index.js'
const fitted = stats.gamma.fit(new Float64Array([1, 2, 3]))
const m: number = fitted.mean()
const b = stats.binomial.fit([1, 2, 3], { n: 10 })
console.log(m, b.ppf(0.5))
