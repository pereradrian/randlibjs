// Typed-array output must type check for the published declarations.
import { normal, poisson, createGenerator } from '../../types/index.js'

const buf = new Float32Array(10)
normal(0, 1, buf)
poisson(3, new Uint16Array(4))
createGenerator(1).gamma(2, 1, new Float64Array(3))
