/**
 * Core scalar samplers shared by the public distribution functions.
 * They draw from the active bit generator (see `state.js`) and do no validation.
 * @private
 */
import { getSource, rand } from './state.js'

/**
 * Standard normal deviate using the Marsaglia polar method. The second deviate of
 * each pair is cached on the bit generator, exactly as numpy's legacy `gauss`, so an
 * MT19937 generator reproduces `np.random.RandomState(seed).standard_normal()`.
 * @returns {number}
 */
export function standardNormal() {
    const source = getSource()
    if (source.gauss !== null && source.gauss !== undefined) {
        const cached = source.gauss
        source.gauss = null
        return cached
    }
    let x1
    let x2
    let r2
    do {
        x1 = 2 * source.random() - 1
        x2 = 2 * source.random() - 1
        r2 = x1 * x1 + x2 * x2
    } while (r2 >= 1 || r2 === 0)
    const f = Math.sqrt(-2 * Math.log(r2) / r2)
    source.gauss = f * x1
    return f * x2
}

/**
 * Standard exponential deviate (rate 1) by inversion.
 * @returns {number}
 */
export function standardExponential() {
    return -Math.log(1 - rand())
}
