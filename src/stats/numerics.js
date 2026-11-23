/**
 * Numerical building blocks for the distribution objects: adaptive quadrature, modified
 * Bessel functions of integer order, the Hurwitz zeta function and log Φ.
 *
 * @module numerics
 * @private
 */
import { logGamma } from './special.js'
import { normalCDF } from '../functions/util/inverse-normal-cdf.js'

// Gauss–Kronrod 7-15 nodes (non-negative half) and weights
const XGK = [
    0.9914553711208126, 0.9491079123427585,
    0.8648644233597691, 0.7415311855993945,
    0.5860872354676911, 0.4058451513773972,
    0.20778495500789848, 0,
]
const WGK = [
    0.022935322010529224, 0.06309209262997856,
    0.10479001032225019, 0.14065325971552592,
    0.1690047266392679, 0.19035057806478542,
    0.20443294007529889, 0.20948214108472782,
]
const WG = [0.1294849661688697, 0.27970539148927664,
    0.3818300505051189, 0.4179591836734694]

function gk15(f, a, b) {
    const c = (a + b) / 2
    const h = (b - a) / 2
    const fc = f(c)
    let k = fc * WGK[7]
    let g = fc * WG[3]
    for (let j = 0; j < 7; j++) {
        const dx = h * XGK[j]
        const f1 = f(c - dx)
        const f2 = f(c + dx)
        k += WGK[j] * (f1 + f2)
        if (j % 2 === 1) g += WG[(j - 1) / 2] * (f1 + f2)
    }
    return [k * h, Math.abs((k - g) * h)]
}

/**
 * Adaptive Gauss–Kronrod quadrature of f over [a, b]; infinite limits are mapped to a finite
 * interval. Designed for positive integrands (densities), relative tolerance `epsrel`.
 * @param {function(number): number} f
 * @param {number} a
 * @param {number} b
 * @param {number} [epsrel=1e-13]
 * @returns {number}
 */
export function integrate(f, a, b, epsrel = 1e-13) {
    if (a === b) return 0
    if (a > b) return -integrate(f, b, a, epsrel)
    // map infinite limits: x = a + t / (1 - t) on [0, 1), and symmetric forms
    if (!Number.isFinite(a) && !Number.isFinite(b)) {
        return integrate(f, -Infinity, 0, epsrel) + integrate(f, 0, Infinity, epsrel)
    }
    if (!Number.isFinite(b)) {
        return integrate((t) => (t >= 1 ? 0 : f(a + t / (1 - t)) / ((1 - t) * (1 - t))), 0, 1, epsrel)
    }
    if (!Number.isFinite(a)) {
        return integrate((t) => (t >= 1 ? 0 : f(b - t / (1 - t)) / ((1 - t) * (1 - t))), 0, 1, epsrel)
    }
    const g = (x) => {
        const v = f(x)
        return Number.isFinite(v) ? v : 0
    }
    // adaptive bisection, keeping the interval with the largest error estimate
    let intervals = [[a, b, ...gk15(g, a, b)]]
    for (let it = 0; it < 2000; it++) {
        let total = 0
        let err = 0
        let worst = 0
        for (let i = 0; i < intervals.length; i++) {
            total += intervals[i][2]
            err += intervals[i][3]
            if (intervals[i][3] > intervals[worst][3]) worst = i
        }
        if (err <= epsrel * Math.abs(total) || err < 1e-300) return total
        const [lo, hi] = intervals[worst]
        const mid = (lo + hi) / 2
        if (mid <= lo || mid >= hi) return total
        intervals.splice(worst, 1, [lo, mid, ...gk15(g, lo, mid)], [mid, hi, ...gk15(g, mid, hi)])
    }
    return intervals.reduce((s, iv) => s + iv[2], 0)
}

/**
 * log Φ(z), accurate far into the lower tail (where Φ underflows).
 * @param {number} z
 * @returns {number}
 */
export function logNormalCDF(z) {
    if (z > -20) return Math.log(normalCDF(z))
    // Φ(z) = φ(z)/|z| (1 - 1/z² + 3/z⁴ - 15/z⁶ + 105/z⁸ - 945/z¹⁰ + ...)
    const t = 1 / (z * z)
    const series = 1 - t * (1 - t * (3 - t * (15 - t * (105 - t * 945))))
    return -0.5 * z * z - Math.log(-z) - 0.9189385332046728 + Math.log(series)
}

/**
 * log of the modified Bessel function of the first kind I_n(x), integer n >= 0, x >= 0.
 * Power series in log space for moderate x, Hankel's asymptotic expansion for large x.
 * @param {number} n
 * @param {number} x
 * @returns {number}
 */
export function logBesselI(n, x) {
    n = Math.abs(n)
    if (x === 0) return n === 0 ? 0 : -Infinity
    if (x > 60 + n * n / 2) {
        // I_n(x) ~ e^x / sqrt(2πx) Σ (-1)^k a_k / x^k, a_k = Π (4n² - (2j-1)²) / (k! 8^k)
        const mu = 4 * n * n
        let term = 1
        let sum = 1
        for (let k = 1; k < 30; k++) {
            term *= -(mu - (2 * k - 1) ** 2) / (k * 8 * x)
            sum += term
            if (Math.abs(term) < 1e-17 * Math.abs(sum)) break
        }
        return x - 0.5 * Math.log(2 * Math.PI * x) + Math.log(sum)
    }
    // Σ_m (x/2)^(2m+n) / (m! (m+n)!), summed relative to its largest term
    const lh = Math.log(x / 2)
    const logTerm = (m) => (2 * m + n) * lh - logGamma(m + 1) - logGamma(m + n + 1)
    // the largest term is near m* = (sqrt(n² + x²) - n) / 2
    const mStar = Math.max(0, Math.round((Math.sqrt(n * n + x * x) - n) / 2))
    const top = logTerm(mStar)
    // the largest term contributes exactly 1; the rest is summed separately for log1p
    let sum = 0
    for (let m = mStar + 1; ; m++) {
        const t = Math.exp(logTerm(m) - top)
        sum += t
        if (t < 1e-17) break
    }
    for (let m = mStar - 1; m >= 0; m--) {
        const t = Math.exp(logTerm(m) - top)
        sum += t
        if (t < 1e-17) break
    }
    return top + Math.log1p(sum)
}

/**
 * Hurwitz zeta function ζ(s, q) = Σ_{k>=0} (k + q)^(-s), s > 1, q > 0 (Euler–Maclaurin).
 * @param {number} s
 * @param {number} q
 * @returns {number}
 */
export function hurwitzZeta(s, q) {
    if (!(s > 1) || !(q > 0)) return NaN
    const N = 12
    let sum = 0
    for (let k = 0; k < N; k++) sum += Math.pow(q + k, -s)
    const a = q + N
    // tail: a^(1-s)/(s-1) + a^(-s)/2 + Σ B_2j / (2j)! s(s+1)...(s+2j-2) a^(-s-2j+1)
    const B = [1 / 6, -1 / 30, 1 / 42, -1 / 30, 5 / 66, -691 / 2730, 7 / 6, -3617 / 510, 43867 / 798]
    let tail = Math.pow(a, 1 - s) / (s - 1) + Math.pow(a, -s) / 2
    let fact = 1
    let rising = s
    let pow = Math.pow(a, -s - 1)
    for (let j = 1; j <= B.length; j++) {
        fact *= (2 * j - 1) * (2 * j)
        const t = B[j - 1] / fact * rising * pow
        tail += t
        if (Math.abs(t) < 1e-17 * Math.abs(tail)) break
        rising *= (s + 2 * j - 1) * (s + 2 * j)
        pow /= a * a
    }
    return sum + tail
}
