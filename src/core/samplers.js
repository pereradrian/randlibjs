/**
 * Core scalar samplers shared by the public distribution functions.
 * They draw from the active bit generator (see `state.js`) and do no validation.
 * @private
 */
import { getSource, rand } from './state.js'
import { zigguratNormal, zigguratExponential } from './ziggurat.js'

/**
 * Bit generators that use numpy's legacy algorithms (polar normal, inversion exponential):
 * MT19937, to reproduce `RandomState`, and user supplied float functions.
 * @private
 */
function usesLegacy(source) {
    return source.name === 'mt19937' || source.name === 'function'
}

/**
 * Standard normal deviate. Uses numpy's 256-layer ziggurat (bit-identical to
 * `default_rng(seed).standard_normal()` with PCG64), or numpy's legacy polar method for
 * MT19937 (bit-identical to `RandomState(seed).standard_normal()`).
 * @returns {number}
 */
export function standardNormal() {
    const source = getSource()
    return usesLegacy(source) ? legacyGauss(source) : zigguratNormal(source)
}

/**
 * Marsaglia polar method; the second deviate of each pair is cached on the bit generator,
 * as numpy's legacy `gauss`.
 * @private
 */
function legacyGauss(source) {
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
 * Standard exponential deviate (rate 1): numpy's ziggurat, or inversion -log(1 - U) for the
 * legacy bit generators (as `RandomState.standard_exponential`).
 * @returns {number}
 */
export function standardExponential() {
    const source = getSource()
    return usesLegacy(source) ? -Math.log(1 - source.random()) : zigguratExponential(source)
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

const LOGGAM_A = [8.333333333333333e-02, -2.777777777777778e-03, 7.936507936507937e-04,
    -5.952380952380952e-04, 8.417508417508418e-04, -1.917526917526918e-03, 6.410256410256410e-03,
    -2.955065359477124e-02, 1.796443723688307e-01, -1.39243221690590e+00]

/**
 * log Gamma(x) for x > 0 with numpy's `random_loggam` (Stirling series), used where numpy
 * uses it so that rejection decisions match numpy exactly.
 * @param {number} x
 * @returns {number}
 */
export function randomLoggam(x) {
    if (x === 1 || x === 2) {
        return 0
    }
    const n = x < 7 ? Math.trunc(7 - x) : 0
    let x0 = x + n
    const x2 = 1 / x0 * (1 / x0)
    let gl0 = LOGGAM_A[9]
    for (let k = 8; k >= 0; k--) {
        gl0 *= x2
        gl0 += LOGGAM_A[k]
    }
    let gl = gl0 / x0 + 0.5 * 1.8378770664093453 + (x0 - 0.5) * Math.log(x0) - x0
    if (x < 7) {
        for (let k = 1; k <= n; k++) {
            gl -= Math.log(x0 - 1)
            x0 -= 1
        }
    }
    return gl
}

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
 * Standard gamma deviate with shape `a` (scale 1), numpy's algorithm: Marsaglia and Tsang (2000)
 * for a > 1 and the Ahrens-Dieter GS rejection method for a < 1.
 * @param {number} a - Shape (>= 0).
 * @returns {number}
 */
export function standardGamma(a) {
    if (a === 1) {
        return standardExponential()
    }
    if (a === 0) {
        return 0
    }
    if (a < 1) {
        for (;;) {
            const u = rand()
            const v = standardExponential()
            if (u <= 1 - a) {
                const x = Math.pow(u, 1 / a)
                if (x <= v) {
                    return x
                }
            } else {
                const y = -Math.log((1 - u) / a)
                const x = Math.pow(1 - a + a * y, 1 / a)
                if (x <= v + y) {
                    return x
                }
            }
        }
    }
    const b = a - 1 / 3
    const c = 1 / Math.sqrt(9 * b)
    for (;;) {
        let x
        let v
        do {
            x = standardNormal()
            v = 1 + c * x
        } while (v <= 0)
        v = v * v * v
        const u = rand()
        if (u < 1 - 0.0331 * (x * x) * (x * x)) {
            return b * v
        }
        if (Math.log(u) < 0.5 * x * x + b * (1 - v + Math.log(v))) {
            return b * v
        }
    }
}

/**
 * Beta deviate together with its complement, both computed without cancellation:
 * returns [x, 1 - x] where 1 - x keeps full relative precision even when x is close to 1.
 * Jöhnk's algorithm when both parameters are <= 1 (robust in log space), otherwise
 * ratio of gammas.
 * @param {number} a
 * @param {number} b
 * @returns {number[]}
 */
export function betaPair(a, b) {
    if (a <= 1 && b <= 1) {
        for (;;) {
            const u = rand()
            const v = rand()
            const x = Math.pow(u, 1 / a)
            const y = Math.pow(v, 1 / b)
            const xy = x + y
            if (xy <= 1 && u + v > 0) {
                if (xy > 0) {
                    return [x / xy, y / xy]
                }
                let logX = Math.log(u) / a
                let logY = Math.log(v) / b
                const logM = Math.max(logX, logY)
                logX -= logM
                logY -= logM
                const logSum = Math.log(Math.exp(logX) + Math.exp(logY))
                return [Math.exp(logX - logSum), Math.exp(logY - logSum)]
            }
        }
    }
    const x = standardGamma(a)
    const y = standardGamma(b)
    return [x / (x + y), y / (x + y)]
}

/**
 * Beta deviate.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function betaSample(a, b) {
    return betaPair(a, b)[0]
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
        if (Math.log(v) + Math.log(invalpha) - Math.log(a / (us * us) + b) <= -lam + k * loglam - randomLoggam(k + 1)) {
            return k
        }
    }
}

/**
 * Binomial deviate with numpy's algorithms: inversion when min(p, 1 - p) * n <= 30 and the
 * BTPE triangle-parallelogram-exponential rejection method (Kachitvichyanukul and Schmeiser,
 * 1988) otherwise. Exact, O(1) expected time for any n.
 * @param {number} n - Number of trials (non-negative integer).
 * @param {number} p - Success probability.
 * @returns {number}
 */
export function binomialSample(n, p) {
    if (n === 0 || p === 0) {
        return 0
    }
    if (p <= 0.5) {
        return p * n <= 30 ? binomialInversion(n, p) : binomialBtpe(n, p)
    }
    const q = 1 - p
    return n - (q * n <= 30 ? binomialInversion(n, q) : binomialBtpe(n, q))
}

function binomialInversion(n, p) {
    const q = 1 - p
    const qn = Math.exp(n * Math.log(q))
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

const btpeCache = { n: -1, p: -1 }

/** BTPE for p <= 0.5. @private */
function binomialBtpe(n, p) {
    const c0 = btpeCache
    if (c0.n !== n || c0.p !== p) {
        const r = p
        const q = 1 - r
        const fm = n * r + r
        const m = Math.floor(fm)
        const p1 = Math.floor(2.195 * Math.sqrt(n * r * q) - 4.6 * q) + 0.5
        const xm = m + 0.5
        const xl = xm - p1
        const xr = xm + p1
        const c = 0.134 + 20.5 / (15.3 + m)
        let a = (fm - xl) / (fm - xl * r)
        const laml = a * (1 + a / 2)
        a = (xr - fm) / (xr * q)
        const lamr = a * (1 + a / 2)
        const p2 = p1 * (1 + 2 * c)
        const p3 = p2 + c / laml
        const p4 = p3 + c / lamr
        Object.assign(c0, { n, p, r, q, m, p1, xm, xl, xr, c, laml, lamr, p2, p3, p4 })
    }
    const { r, q, m, p1, xm, xl, xr, c, laml, lamr, p2, p3, p4 } = c0
    const nrq = n * r * q
    for (;;) {
        const u = rand() * p4
        let v = rand()
        let y
        if (u <= p1) {
            return Math.floor(xm - p1 * v + u)
        }
        if (u <= p2) {
            const x = xl + (u - p1) / c
            v = v * c + 1 - Math.abs(m - x + 0.5) / p1
            if (v > 1) continue
            y = Math.floor(x)
        } else if (u <= p3) {
            y = Math.floor(xl + Math.log(v) / laml)
            if (y < 0 || v === 0) continue
            v = v * (u - p2) * laml
        } else {
            y = Math.floor(xr - Math.log(v) / lamr)
            if (y > n || v === 0) continue
            v = v * (u - p3) * lamr
        }
        const k = Math.abs(y - m)
        if (!(k > 20 && k < nrq / 2 - 1)) {
            const s = r / q
            const a = s * (n + 1)
            let f = 1
            if (m < y) {
                for (let i = m + 1; i <= y; i++) f *= a / i - s
            } else if (m > y) {
                for (let i = y + 1; i <= m; i++) f /= a / i - s
            }
            if (v > f) continue
            return y
        }
        const rho = k / nrq * ((k * (k / 3 + 0.625) + 0.16666666666666666) / nrq + 0.5)
        const t = -k * k / (2 * nrq)
        const A = Math.log(v)
        if (A < t - rho) return y
        if (A > t + rho) continue
        const x1 = y + 1
        const f1 = m + 1
        const z = n + 1 - m
        const w = n - y + 1
        const x2 = x1 * x1
        const f2 = f1 * f1
        const z2 = z * z
        const w2 = w * w
        const bound = xm * Math.log(f1 / x1) + (n - m + 0.5) * Math.log(z / w) + (y - m) * Math.log(w * r / (x1 * q)) +
            (13680 - (462 - (132 - (99 - 140 / f2) / f2) / f2) / f2) / f1 / 166320 +
            (13680 - (462 - (132 - (99 - 140 / z2) / z2) / z2) / z2) / z / 166320 +
            (13680 - (462 - (132 - (99 - 140 / x2) / x2) / x2) / x2) / x1 / 166320 +
            (13680 - (462 - (132 - (99 - 140 / w2) / w2) / w2) / w2) / w / 166320
        if (A > bound) continue
        return y
    }
}

function logChoose(n, k) {
    return logFactorial(n) - logFactorial(k) - logFactorial(n - k)
}

/**
 * Hypergeometric deviate: number of good items in a sample of `n` drawn without
 * replacement from `good` good and `bad` bad items. Exact inversion starting at the
 * mode and searching outwards, O(standard deviation) expected time.
 * @param {number} good
 * @param {number} bad
 * @param {number} n
 * @returns {number}
 */
export function hypergeometricSample(good, bad, n) {
    const total = good + bad
    if (n > total / 2) {
        return good - hypergeometricSample(good, bad, total - n)
    }
    if (good > bad) {
        return n - hypergeometricSample(bad, good, n)
    }
    const lo = Math.max(0, n - bad)
    const hi = Math.min(n, good)
    if (lo === hi) {
        return lo
    }
    const mode = Math.min(hi, Math.max(lo, Math.floor((n + 1) * (good + 1) / (total + 2))))
    const pMode = Math.exp(logChoose(good, mode) + logChoose(bad, n - mode) - logChoose(total, n))
    // ratio p(k + 1) / p(k)
    const ratio = (k) => (good - k) * (n - k) / ((k + 1) * (bad - n + k + 1))
    for (;;) {
        let u = rand() - pMode
        if (u <= 0) {
            return mode
        }
        let up = mode
        let down = mode
        let pUp = pMode
        let pDown = pMode
        while (up < hi || down > lo) {
            if (up < hi) {
                pUp *= ratio(up)
                up++
                u -= pUp
                if (u <= 0) {
                    return up
                }
            }
            if (down > lo) {
                down--
                pDown /= ratio(down)
                u -= pDown
                if (u <= 0) {
                    return down
                }
            }
        }
        // only reachable through floating point round-off: retry
    }
}
