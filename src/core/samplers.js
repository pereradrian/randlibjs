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

/**
 * Natural logarithm of the gamma function (Lanczos approximation, g = 7, n = 9).
 * Accurate to ~1e-15 for x > 0.
 * @param {number} x
 * @returns {number}
 */
export function logGamma(x) {
    if (x < 0.5) {
        return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x)
    }
    x -= 1
    let a = LANCZOS[0]
    const t = x + 7.5
    for (let i = 1; i < 9; i++) {
        a += LANCZOS[i] / (x + i)
    }
    return 0.9189385332046728 + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

// published Lanczos coefficients
const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]

const LOG_FACTORIAL_TABLE = (() => {
    const table = [0]
    for (let k = 1; k < 128; k++) {
        table.push(table[k - 1] + Math.log(k))
    }
    return table
})()

/**
 * log(k!) for non-negative integers.
 * @param {number} k
 * @returns {number}
 */
export function logFactorial(k) {
    if (k < 128) {
        return LOG_FACTORIAL_TABLE[k]
    }
    // Stirling series
    const x = k + 1
    return (x - 0.5) * Math.log(x) - x + 0.9189385332046728 + 1 / (12 * x) - 1 / (360 * x * x * x) + 1 / (1260 * x ** 5)
}

/**
 * Standard gamma deviate with shape `a` (scale 1).
 * Marsaglia & Tsang (2000) squeeze method, with the a < 1 boost u^(1/a).
 * @param {number} a - Shape (> 0). Returns 0 for a = 0.
 * @returns {number}
 */
export function standardGamma(a) {
    if (a === 0) {
        return 0
    }
    if (a < 1) {
        // Gamma(a) = Gamma(a + 1) * U^(1/a), computed in log space to avoid underflow
        const g = standardGamma(a + 1)
        const logU = Math.log(1 - rand()) / a
        return g * Math.exp(logU)
    }
    const d = a - 1 / 3
    const c = 1 / Math.sqrt(9 * d)
    for (;;) {
        let x
        let v
        do {
            x = standardNormal()
            v = 1 + c * x
        } while (v <= 0)
        v = v * v * v
        const u = 1 - rand()
        const x2 = x * x
        if (u < 1 - 0.0331 * x2 * x2) {
            return d * v
        }
        if (Math.log(u) < 0.5 * x2 + d * (1 - v + Math.log(v))) {
            return d * v
        }
    }
}

/**
 * Beta deviate. Jöhnk's algorithm when both parameters are <= 1 (robust in log space),
 * otherwise ratio of gammas.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function betaSample(a, b) {
    if (a <= 1 && b <= 1) {
        for (;;) {
            const u = rand()
            const v = rand()
            const x = Math.pow(u, 1 / a)
            const y = Math.pow(v, 1 / b)
            const xy = x + y
            if (xy <= 1 && u + v > 0) {
                if (xy > 0) {
                    return x / xy
                }
                let logX = Math.log(u) / a
                let logY = Math.log(v) / b
                const logM = Math.max(logX, logY)
                logX -= logM
                logY -= logM
                return Math.exp(logX - Math.log(Math.exp(logX) + Math.exp(logY)))
            }
        }
    }
    const x = standardGamma(a)
    const y = standardGamma(b)
    return x / (x + y)
}

/**
 * Poisson deviate. Multiplication method for lam < 10, otherwise the
 * PTRS transformed rejection method of Hörmann (1993), exact for any lam.
 * @param {number} lam
 * @returns {number}
 */
export function poissonSample(lam) {
    if (lam === 0) {
        return 0
    }
    if (lam < 10) {
        const limit = Math.exp(-lam)
        let k = 0
        let p = rand()
        while (p > limit) {
            k++
            p *= rand()
        }
        return k
    }
    const slam = Math.sqrt(lam)
    const loglam = Math.log(lam)
    const b = 0.931 + 2.53 * slam
    const a = -0.059 + 0.02483 * b
    const invalpha = 1.1239 + 1.1328 / (b - 3.4)
    const vr = 0.9277 - 3.6224 / (b - 2)
    for (;;) {
        const u = rand() - 0.5
        const v = rand()
        const us = 0.5 - Math.abs(u)
        const k = Math.floor((2 * a / us + b) * u + lam + 0.43)
        if (us >= 0.07 && v <= vr) {
            return k
        }
        if (k < 0 || us < 0.013 && v > us) {
            continue
        }
        if (Math.log(v) + Math.log(invalpha) - Math.log(a / (us * us) + b) <= -lam + k * loglam - logFactorial(k)) {
            return k
        }
    }
}

/**
 * Binomial deviate by inversion for small n * min(p, 1 - p), otherwise the
 * exact beta-splitting recursion (Knuth, TAOCP vol. 2, 3.4.1), which reduces the
 * problem size geometrically.
 * @param {number} n - Number of trials (non-negative integer).
 * @param {number} p - Success probability.
 * @returns {number}
 */
export function binomialSample(n, p) {
    if (n === 0 || p === 0) {
        return 0
    }
    if (p === 1) {
        return n
    }
    if (p > 0.5) {
        return n - binomialSample(n, 1 - p)
    }
    let offset = 0
    while (n * p >= 30) {
        const i = Math.floor((n + 1) / 2)
        const x = betaSample(i, n + 1 - i)
        if (x >= p) {
            n = i - 1
            p = p / x
        } else {
            offset += i
            n = n - i
            p = (p - x) / (1 - x)
        }
        if (p > 0.5) {
            return offset + n - binomialSample(n, 1 - p)
        }
    }
    return offset + binomialInversion(n, p)
}

function binomialInversion(n, p) {
    if (n === 0 || p === 0) {
        return 0
    }
    const q = 1 - p
    const qn = Math.exp(n * Math.log1p(-p))
    const np = n * p
    const bound = Math.min(n, np + 10 * Math.sqrt(np * q + 1))
    let x = 0
    let px = qn
    let u = rand()
    while (u > px) {
        x++
        if (x > bound) {
            x = 0
            px = qn
            u = rand()
        } else {
            u -= px
            px = (n - x + 1) * p * px / (x * q)
        }
    }
    return x
}
