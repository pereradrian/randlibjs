/**
 * Special functions used by the statistical distribution objects.
 * Accuracy is close to double precision (typically 1e-14 relative or better).
 *
 * @module special
 */
import { logGamma } from '../core/samplers.js'
import { erfc, normalCDF, inverseNormalCDF } from '../functions/util/inverse-normal-cdf.js'

export { logGamma, erfc, normalCDF, inverseNormalCDF }

const EPS = 1e-16
const FPMIN = 1e-300

/**
 * Error function.
 * @param {number} x
 * @returns {number}
 */
export function erf(x) {
    return 1 - erfc(x)
}

/**
 * Gamma function.
 * @param {number} x
 * @returns {number}
 */
export function gammaFn(x) {
    if (Number.isInteger(x) && x <= 0) {
        return NaN
    }
    if (x < 0.5) {
        return Math.PI / (Math.sin(Math.PI * x) * gammaFn(1 - x))
    }
    if (x > 171.7) {
        return Infinity
    }
    return Math.exp(logGamma(x))
}

/**
 * Logarithm of the beta function B(a, b).
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function logBeta(a, b) {
    return logGamma(a) + logGamma(b) - logGamma(a + b)
}

/**
 * log(n choose k) for real arguments.
 * @param {number} n
 * @param {number} k
 * @returns {number}
 */
export function logChoose(n, k) {
    return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1)
}

function gammaSeries(a, x) {
    let sum = 1 / a
    let term = sum
    let ap = a
    for (let n = 0; n < 10000; n++) {
        ap += 1
        term *= x / ap
        sum += term
        if (Math.abs(term) < Math.abs(sum) * EPS) {
            break
        }
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a))
}

function gammaContinuedFraction(a, x) {
    let b = x + 1 - a
    let c = 1 / FPMIN
    let d = 1 / b
    let h = d
    for (let i = 1; i < 10000; i++) {
        const an = -i * (i - a)
        b += 2
        d = an * d + b
        if (Math.abs(d) < FPMIN) d = FPMIN
        c = b + an / c
        if (Math.abs(c) < FPMIN) c = FPMIN
        d = 1 / d
        const del = d * c
        h *= del
        if (Math.abs(del - 1) < EPS) {
            break
        }
    }
    return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h
}

/**
 * Regularized lower incomplete gamma function P(a, x).
 * @param {number} a - Shape (> 0).
 * @param {number} x - (>= 0).
 * @returns {number}
 */
export function gammaP(a, x) {
    if (x <= 0) {
        return 0
    }
    if (x === Infinity) {
        return 1
    }
    return x < a + 1 ? gammaSeries(a, x) : 1 - gammaContinuedFraction(a, x)
}

/**
 * Regularized upper incomplete gamma function Q(a, x) = 1 - P(a, x), accurate in the upper tail.
 * @param {number} a
 * @param {number} x
 * @returns {number}
 */
export function gammaQ(a, x) {
    if (x <= 0) {
        return 1
    }
    if (x === Infinity) {
        return 0
    }
    return x < a + 1 ? 1 - gammaSeries(a, x) : gammaContinuedFraction(a, x)
}

/**
 * Inverse of P(a, ·): returns x with P(a, x) = p (Numerical Recipes `invgammp`, Halley steps).
 * @param {number} a
 * @param {number} p
 * @returns {number}
 */
export function gammaPInv(a, p) {
    if (p <= 0) return 0
    if (p >= 1) return Infinity
    const a1 = a - 1
    const gln = logGamma(a)
    let x
    let lna1 = 0
    let afac = 0
    if (a > 1) {
        lna1 = Math.log(a1)
        afac = Math.exp(a1 * (lna1 - 1) - gln)
        const pp = p < 0.5 ? p : 1 - p
        const t = Math.sqrt(-2 * Math.log(pp))
        let z = (2.30753 + t * 0.27061) / (1 + t * (0.99229 + t * 0.04481)) - t
        if (p < 0.5) z = -z
        x = Math.max(1e-3, a * Math.pow(1 - 1 / (9 * a) - z / (3 * Math.sqrt(a)), 3))
    } else {
        const t = 1 - a * (0.253 + a * 0.12)
        x = p < t ? Math.pow(p / t, 1 / a) : 1 - Math.log(1 - (p - t) / (1 - t))
    }
    for (let j = 0; j < 100; j++) {
        if (x <= 0) return 0
        const err = gammaP(a, x) - p
        const t0 = a > 1 ? afac * Math.exp(-(x - a1) + a1 * (Math.log(x) - lna1)) : Math.exp(-x + a1 * Math.log(x) - gln)
        if (t0 === 0) break
        const u = err / t0
        const dx = u / (1 - 0.5 * Math.min(1, u * (a1 / x - 1)))
        x -= dx
        if (x <= 0) x = 0.5 * (x + dx)
        if (Math.abs(dx) < 1e-14 * x) break
    }
    return x
}

function betaContinuedFraction(x, a, b) {
    const qab = a + b
    const qap = a + 1
    const qam = a - 1
    let c = 1
    let d = 1 - qab * x / qap
    if (Math.abs(d) < FPMIN) d = FPMIN
    d = 1 / d
    let h = d
    for (let m = 1; m < 10000; m++) {
        const m2 = 2 * m
        let aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d
        if (Math.abs(d) < FPMIN) d = FPMIN
        c = 1 + aa / c
        if (Math.abs(c) < FPMIN) c = FPMIN
        d = 1 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d
        if (Math.abs(d) < FPMIN) d = FPMIN
        c = 1 + aa / c
        if (Math.abs(c) < FPMIN) c = FPMIN
        d = 1 / d
        const del = d * c
        h *= del
        if (Math.abs(del - 1) < EPS) {
            break
        }
    }
    return h
}

/**
 * Regularized incomplete beta function I_x(a, b).
 * @param {number} x - In [0, 1].
 * @param {number} a - (> 0).
 * @param {number} b - (> 0).
 * @returns {number}
 */
export function betaInc(x, a, b) {
    if (x <= 0) return 0
    if (x >= 1) return 1
    const lbt = a * Math.log(x) + b * Math.log1p(-x) - logBeta(a, b)
    if (x < (a + 1) / (a + b + 2)) {
        return Math.exp(lbt) * betaContinuedFraction(x, a, b) / a
    }
    return 1 - Math.exp(lbt) * betaContinuedFraction(1 - x, b, a) / b
}

/**
 * Inverse of I_·(a, b): returns x with I_x(a, b) = p (Numerical Recipes `invbetai`, Halley steps).
 * @param {number} p
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function betaIncInv(p, a, b) {
    if (p <= 0) return 0
    if (p >= 1) return 1
    const a1 = a - 1
    const b1 = b - 1
    let x
    if (a >= 1 && b >= 1) {
        const pp = p < 0.5 ? p : 1 - p
        const t = Math.sqrt(-2 * Math.log(pp))
        let z = (2.30753 + t * 0.27061) / (1 + t * (0.99229 + t * 0.04481)) - t
        if (p < 0.5) z = -z
        const al = (z * z - 3) / 6
        const h = 2 / (1 / (2 * a - 1) + 1 / (2 * b - 1))
        const w = z * Math.sqrt(al + h) / h - (1 / (2 * b - 1) - 1 / (2 * a - 1)) * (al + 5 / 6 - 2 / (3 * h))
        x = a / (a + b * Math.exp(2 * w))
    } else {
        const lna = Math.log(a / (a + b))
        const lnb = Math.log(b / (a + b))
        const t = Math.exp(a * lna) / a
        const u = Math.exp(b * lnb) / b
        const w = t + u
        x = p < t / w ? Math.pow(a * w * p, 1 / a) : 1 - Math.pow(b * w * (1 - p), 1 / b)
    }
    const afac = -logBeta(a, b)
    for (let j = 0; j < 200; j++) {
        if (x === 0 || x === 1) return x
        const err = betaInc(x, a, b) - p
        let t = Math.exp(a1 * Math.log(x) + b1 * Math.log1p(-x) + afac)
        const u = err / t
        t = u / (1 - 0.5 * Math.min(1, u * (a1 / x - b1 / (1 - x))))
        x -= t
        if (x <= 0) x = 0.5 * (x + t)
        if (x >= 1) x = 0.5 * (x + t + 1)
        if (Math.abs(t) < 1e-15 * x && j > 0) break
    }
    return x
}

/**
 * Digamma function ψ(x) = d/dx log Γ(x).
 * @param {number} x
 * @returns {number}
 */
export function digamma(x) {
    let result = 0
    if (x <= 0 && Number.isInteger(x)) {
        return NaN
    }
    if (x < 0) {
        return digamma(1 - x) - Math.PI / Math.tan(Math.PI * x)
    }
    while (x < 12) {
        result -= 1 / x
        x += 1
    }
    const f = 1 / (x * x)
    return result + Math.log(x) - 0.5 / x - f * (1 / 12 - f * (1 / 120 - f * (1 / 252 - f * (1 / 240 - f / 132))))
}
