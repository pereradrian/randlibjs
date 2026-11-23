/**
 * Statistical tests and descriptive statistics in the style of scipy.stats: kstest, ks2samp,
 * chisquareTest, andersonDarling, describe and gaussianKde.
 *
 * @module stats-tests
 * @private
 */
import * as samplers from '../distributions.js'
import { mapValues } from './base.js'
import { logGamma, gammaQ, normalCDF } from './special.js'
import { toData } from './fit.js'

const logChooseInt = (n, k) => logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1)

// ------------------------------------------------------------ Kolmogorov–Smirnov

/**
 * P(D_n^+ >= d), the exact one-sided Smirnov tail (Birnbaum & Tingey, 1951).
 * @private
 */
export function smirnovSf(n, d) {
    if (d <= 0) return 1
    if (d >= 1) return 0
    // d Σ_{j=0}^{⌊n(1-d)⌋} C(n,j) (1 - d - j/n)^(n-j) (d + j/n)^(j-1)
    const jmax = Math.floor(n * (1 - d) + 1e-12)
    let sum = 0
    for (let j = 0; j <= jmax; j++) {
        const a = 1 - d - j / n
        if (a <= 0) continue
        sum += Math.exp(logChooseInt(n, j) + (n - j) * Math.log(a) + (j - 1) * Math.log(d + j / n))
    }
    return Math.min(1, d * sum)
}

/**
 * P(D_n < d) for the two-sided statistic, exact (Marsaglia, Tsang & Wang 2003).
 * @private
 */
export function kolmogorovCdfExact(n, d) {
    const k = Math.floor(n * d) + 1
    const m = 2 * k - 1
    const h = k - n * d
    // H matrix
    const H = Array.from({ length: m }, () => new Float64Array(m))
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < m; j++) H[i][j] = i - j + 1 < 0 ? 0 : 1
    }
    for (let i = 0; i < m; i++) {
        H[i][0] -= Math.pow(h, i + 1)
        H[m - 1][i] -= Math.pow(h, m - i)
    }
    H[m - 1][0] += 2 * h - 1 > 0 ? Math.pow(2 * h - 1, m) : 0
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < m; j++) {
            if (i - j + 1 > 0) {
                for (let g = 1; g <= i - j + 1; g++) H[i][j] /= g
            }
        }
    }
    // H^n with exponent tracking (powers of 1e140 kept separately)
    const mul = (A, B) => {
        const C = Array.from({ length: m }, () => new Float64Array(m))
        for (let i = 0; i < m; i++) {
            for (let l = 0; l < m; l++) {
                const a = A[i][l]
                if (a === 0) continue
                const Bl = B[l]
                const Ci = C[i]
                for (let j = 0; j < m; j++) Ci[j] += a * Bl[j]
            }
        }
        return C
    }
    let result = null
    let resultExp = 0
    let base = H
    let baseExp = 0
    let e = n
    while (e > 0) {
        if (e & 1) {
            if (result === null) {
                result = base
                resultExp = baseExp
            } else {
                result = mul(result, base)
                resultExp += baseExp
            }
            const c = result[k - 1][k - 1]
            if (c > 1e140) {
                for (const row of result) for (let j = 0; j < m; j++) row[j] *= 1e-140
                resultExp += 140
            }
        }
        e = Math.floor(e / 2)
        if (e > 0) {
            base = mul(base, base)
            baseExp *= 2
            if (base[k - 1][k - 1] > 1e140) {
                for (const row of base) for (let j = 0; j < m; j++) row[j] *= 1e-140
                baseExp += 140
            }
        }
    }
    // n! / n^n * H^n[k-1][k-1]
    const logS = Math.log(result[k - 1][k - 1]) + resultExp * Math.log(10) + logGamma(n + 1) - n * Math.log(n)
    return Math.exp(logS)
}

/**
 * Two-sided P(D_n >= d). Exact for moderate n·d, one-sided bound 2 S⁺ in the far tail (where
 * it is exact to the shown precision), Pelz–Good asymptotics for very large n.
 * @private
 */
export function kolmogorovSf(n, d) {
    if (d <= 0) return 1
    if (d >= 1) return 0
    if (d <= 1 / (2 * n)) return 1
    const twoSided = 2 * smirnovSf(n, d)
    // exact matrix method costs ~m³ log2(n) with m = 2⌊nd⌋ + 1: use it while that stays small
    const m = 2 * Math.floor(n * d) + 1
    if (n <= 140 || m ** 3 * Math.log2(n) <= 2e7) {
        return twoSided < 1e-12 ? twoSided : Math.max(0, 1 - kolmogorovCdfExact(n, d))
    }
    // tail: P(D >= d) = 2 S⁺ - P(D⁺ >= d and D⁻ >= d), the overlap being ~2 exp(-8 n d²);
    // accurate to ~1e-6 relative below p = 0.1 (checked against the exact method)
    if (twoSided < 0.1) return Math.max(0, twoSided - 2 * Math.exp(-8 * n * d * d))
    // centre: Pelz–Good expansion, ~1e-5 relative for n > 140
    return pelzGoodSf(n, d)
}

/**
 * Pelz–Good asymptotic expansion of the two-sided tail, to order 1/n^(3/2) (Simard &
 * L'Ecuyer 2011), for large n.
 * @private
 */
export function pelzGoodSf(n, d) {
    const z = Math.sqrt(n) * d
    const z2 = z * z
    const z4 = z2 * z2
    const z6 = z4 * z2
    const pi2 = Math.PI * Math.PI
    const pi4 = pi2 * pi2
    const pi6 = pi4 * pi2
    const qlog = -pi2 / 8 / z2
    if (qlog < -745) return 1
    let q = Math.exp(qlog)
    const k1a = -z2
    const k1b = pi2 / 4
    const k2a = 6 * z6 + 2 * z4
    const k2b = (2 * z4 - 5 * z2) * pi2 / 4
    const k2c = pi4 * (1 - 2 * z2) / 16
    const k3d = pi6 * (5 - 30 * z2) / 64
    const k3c = pi4 * (-60 * z2 + 212 * z4) / 16
    const k3b = pi2 * (135 * z4 - 96 * z6) / 4
    const k3a = -30 * z6 - 90 * z4 * z4
    const K = [0, 0, 0, 0]
    // Horner scheme over odd m = 2k - 1: Σ c(m) q^(m²)
    const maxk = Math.ceil(16 * z / Math.PI)
    for (let k = maxk; k >= 1; k--) {
        const m = 2 * k - 1
        const m2 = m * m
        const qp = Math.pow(q, 8 * k)
        const c = [1, k1a + k1b * m2, k2a + k2b * m2 + k2c * m2 * m2, k3a + k3b * m2 + k3c * m2 * m2 + k3d * m2 * m2 * m2]
        for (let i = 0; i < 4; i++) K[i] = K[i] * qp + c[i]
    }
    const sqrt2pi = Math.sqrt(2 * Math.PI)
    const div = [z, 6 * z4, 72 * z4 * z2 * z, 6480 * z6 * z4]
    for (let i = 0; i < 4; i++) K[i] = K[i] * q * sqrt2pi / div[i]
    // remaining sums over all integers k
    q = Math.exp(-pi2 / 2 / z2)
    const sqrt3z = Math.sqrt(3) * z
    let k2extra = 0
    let k3extra = 0
    for (let k = maxk; k >= 1; k--) {
        const k2 = k * k
        const qk = Math.pow(q, k2)
        k2extra += k2 * qk
        const kpi = Math.PI * k
        k3extra += (sqrt3z + kpi) * (sqrt3z - kpi) * k2 * qk
    }
    K[2] += k2extra * pi2 * sqrt2pi / (-72 * z2 * z)
    K[3] += k3extra * pi2 * sqrt2pi / (216 * z6)
    let cdf = 0
    for (let i = 0; i < 4; i++) cdf += K[i] / Math.pow(n, i / 2)
    return Math.min(1, Math.max(0, 1 - cdf))
}

function asCdf(dist) {
    if (typeof dist === 'function') return dist
    if (dist && typeof dist.cdf === 'function') return (x) => dist.cdf(x)
    throw new Error('Pass a stats distribution object or a cdf function.')
}

/**
 * One-sample Kolmogorov–Smirnov test (scipy.stats.kstest).
 *
 * @example
 * kstest(data, stats.normal(0, 1))             // { statistic, pvalue }
 * kstest(data, (x) => 1 - Math.exp(-x), { alternative: 'greater' })
 *
 * @param {ArrayLike<number>} data
 * @param {import('./base.js').ContinuousDistribution|function(number): number} dist - Hypothesised distribution or cdf.
 * @param {Object} [options]
 * @param {string} [options.alternative='two-sided'] - 'two-sided', 'less' or 'greater'.
 * @returns {{statistic: number, pvalue: number}}
 */
export function kstest(data, dist, { alternative = 'two-sided' } = {}) {
    const xs = toData(data, 1).sort((a, b) => a - b)
    const cdf = asCdf(dist)
    const n = xs.length
    let dPlus = 0
    let dMinus = 0
    for (let i = 0; i < n; i++) {
        const f = cdf(xs[i])
        dPlus = Math.max(dPlus, (i + 1) / n - f)
        dMinus = Math.max(dMinus, f - i / n)
    }
    if (alternative === 'greater') return { statistic: dPlus, pvalue: smirnovSf(n, dPlus) }
    if (alternative === 'less') return { statistic: dMinus, pvalue: smirnovSf(n, dMinus) }
    if (alternative !== 'two-sided') throw new Error('alternative must be "two-sided", "less" or "greater".')
    const d = Math.max(dPlus, dMinus)
    return { statistic: d, pvalue: kolmogorovSf(n, d) }
}

/**
 * Two-sample Kolmogorov–Smirnov test (scipy.stats.ks_2samp), two-sided. Exact p-value by
 * lattice-path counting when n·m <= 1e6, asymptotic otherwise.
 *
 * @param {ArrayLike<number>} x
 * @param {ArrayLike<number>} y
 * @returns {{statistic: number, pvalue: number}}
 */
export function ks2samp(x, y) {
    const a = toData(x, 1).sort((p, q) => p - q)
    const b = toData(y, 1).sort((p, q) => p - q)
    const n = a.length
    const m = b.length
    // statistic: max |F_a - F_b| over the pooled points (ties handled by advancing both)
    let i = 0
    let j = 0
    let d = 0
    while (i < n && j < m) {
        const v = Math.min(a[i], b[j])
        while (i < n && a[i] === v) i++
        while (j < m && b[j] === v) j++
        d = Math.max(d, Math.abs(i / n - j / m))
    }
    let pvalue
    if (n * m <= 1e6) {
        pvalue = ksTwoSampleExactSf(n, m, d)
    } else {
        const en = Math.sqrt(n * m / (n + m))
        pvalue = kolmogorovAsymptoticSf(en * d)
    }
    return { statistic: d, pvalue: Math.min(1, Math.max(0, pvalue)) }
}

/** P(D_{n,m} >= d) by counting monotone lattice paths that stay inside the band. @private */
function ksTwoSampleExactSf(n, m, d) {
    // work with integers: |i m - j n| < d n m  (strictly inside); tolerance for rounding
    const lim = d * n * m - 1e-7 * Math.max(n, m)
    // probability-normalised path counts, row by row (j = 0..m)
    let prev = new Float64Array(m + 1)
    let cur = new Float64Array(m + 1)
    // P(path passes through (i, j) without leaving the band); each step weighted so that
    // the total over all paths is 1: step right (i+1) with weight (n - i)/(n + m - i - j)
    prev[0] = 1
    for (let j = 1; j <= m; j++) {
        prev[j] = Math.abs(0 * m - j * n) < lim ? prev[j - 1] * (m - j + 1) / (n + m - j + 1) : 0
    }
    for (let i = 1; i <= n; i++) {
        cur.fill(0)
        for (let j = 0; j <= m; j++) {
            if (Math.abs(i * m - j * n) >= lim) continue
            let v = prev[j] * (n - i + 1) / (n + m - i - j + 1)
            if (j > 0) v += cur[j - 1] * (m - j + 1) / (n + m - i - j + 1)
            cur[j] = v
        }
        ;[prev, cur] = [cur, prev]
    }
    return 1 - prev[m]
}

function kolmogorovAsymptoticSf(z) {
    if (z < 0.2) return 1
    let s = 0
    for (let k = 1; k < 100; k++) {
        const t = Math.exp(-2 * k * k * z * z)
        s += (k % 2 ? 1 : -1) * t
        if (t < 1e-18) break
    }
    return Math.min(1, 2 * s)
}

// ------------------------------------------------------------------ chi-square

/**
 * Pearson's chi-square goodness-of-fit test (scipy.stats.chisquare).
 *
 * @param {number[]} observed - Observed counts.
 * @param {number[]} [expected] - Expected counts (uniform when omitted); rescaled to the observed total.
 * @param {Object} [options]
 * @param {number} [options.ddof=0] - Extra degrees of freedom removed (e.g. fitted parameters).
 * @returns {{statistic: number, pvalue: number, df: number}}
 */
export function chisquareTest(observed, expected = null, { ddof = 0 } = {}) {
    const o = toData(observed, 1)
    const k = o.length
    const total = o.reduce((s, v) => s + v, 0)
    let e = expected === null ? new Array(k).fill(total / k) : toData(expected, 1)
    if (e.length !== k) throw new Error('observed and expected must have the same length.')
    const et = e.reduce((s, v) => s + v, 0)
    if (Math.abs(et - total) > 1e-8 * total) {
        throw new Error('observed and expected must have the same total (scipy rule); rescale expected first.')
    }
    if (e.some((v) => !(v > 0))) throw new Error('expected counts must be positive.')
    const statistic = o.reduce((s, v, i) => s + (v - e[i]) ** 2 / e[i], 0)
    const df = k - 1 - ddof
    if (!(df > 0)) throw new Error('degrees of freedom k - 1 - ddof must be positive.')
    return { statistic, pvalue: gammaQ(df / 2, statistic / 2), df }
}

// ------------------------------------------------------------- Anderson–Darling

/**
 * Anderson–Darling test for normality with estimated mean and variance (scipy.stats.anderson,
 * dist='norm'), plus an approximate p-value (D'Agostino & Stephens 1986).
 *
 * @param {ArrayLike<number>} data
 * @returns {{statistic: number, criticalValues: number[], significanceLevels: number[], pvalue: number}}
 */
export function andersonDarling(data) {
    const xs = toData(data, 3).sort((a, b) => a - b)
    const n = xs.length
    const mean = xs.reduce((s, x) => s + x, 0) / n
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1))
    if (!(sd > 0)) throw new Error('andersonDarling needs data that are not all equal.')
    let s = 0
    for (let i = 0; i < n; i++) {
        const zi = (xs[i] - mean) / sd
        const zr = (xs[n - 1 - i] - mean) / sd
        // log Φ(z_i) + log(1 - Φ(z_{n+1-i})), each on its accurate side
        s += (2 * i + 1) * (Math.log(normalCDF(zi)) + Math.log(normalCDF(-zr)))
    }
    const statistic = -n - s / n
    // critical values of the modified statistic (Stephens 1974), as scipy.stats.anderson
    const adj = 1 + 0.75 / n + 2.25 / (n * n)
    const criticalValues = [0.561, 0.631, 0.752, 0.873, 1.035].map((c) => Math.round(c / adj * 1000) / 1000)
    const a2 = statistic * adj
    let pvalue
    if (a2 >= 0.6) pvalue = Math.exp(1.2937 - 5.709 * a2 + 0.0186 * a2 * a2)
    else if (a2 >= 0.34) pvalue = Math.exp(0.9177 - 4.279 * a2 - 1.38 * a2 * a2)
    else if (a2 >= 0.2) pvalue = 1 - Math.exp(-8.318 + 42.796 * a2 - 59.938 * a2 * a2)
    else pvalue = 1 - Math.exp(-13.436 + 101.14 * a2 - 223.73 * a2 * a2)
    return { statistic, criticalValues, significanceLevels: [15, 10, 5, 2.5, 1], pvalue: Math.min(1, Math.max(0, pvalue)) }
}

// ----------------------------------------------------------------- descriptive

/**
 * Summary statistics (scipy.stats.describe): skewness and kurtosis are the biased (moment)
 * estimators by default, kurtosis in Fisher's definition (normal = 0).
 *
 * @param {ArrayLike<number>} data
 * @param {Object} [options]
 * @param {boolean} [options.bias=true] - false applies the small-sample corrections.
 * @returns {{nobs: number, min: number, max: number, mean: number, variance: number, skewness: number, kurtosis: number}}
 */
export function describe(data, { bias = true } = {}) {
    const xs = toData(data, 1)
    const n = xs.length
    const mean = xs.reduce((s, x) => s + x, 0) / n
    let m2 = 0
    let m3 = 0
    let m4 = 0
    let min = Infinity
    let max = -Infinity
    for (const x of xs) {
        const d = x - mean
        m2 += d * d
        m3 += d * d * d
        m4 += d * d * d * d
        if (x < min) min = x
        if (x > max) max = x
    }
    m2 /= n
    m3 /= n
    m4 /= n
    let skewness = m2 > 0 ? m3 / Math.pow(m2, 1.5) : NaN
    let kurtosis = m2 > 0 ? m4 / (m2 * m2) - 3 : NaN
    if (!bias && n > 3) {
        skewness *= Math.sqrt(n * (n - 1)) / (n - 2)
        kurtosis = ((n + 1) * kurtosis + 6) * (n - 1) / ((n - 2) * (n - 3))
    }
    return { nobs: n, min, max, mean, variance: n > 1 ? m2 * n / (n - 1) : NaN, skewness, kurtosis }
}

// ---------------------------------------------------------------- kernel density

/**
 * One-dimensional Gaussian kernel density estimate (scipy.stats.gaussian_kde).
 */
export class GaussianKde {
    /**
     * @param {ArrayLike<number>} data
     * @param {Object} [options]
     * @param {string|number} [options.bandwidth='scott'] - 'scott', 'silverman' or a factor
     *   multiplying the data standard deviation (scipy's bw_method).
     */
    constructor(data, { bandwidth = 'scott' } = {}) {
        this.data = toData(data, 2)
        const n = this.data.length
        const mean = this.data.reduce((s, x) => s + x, 0) / n
        const sd = Math.sqrt(this.data.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1))
        if (!(sd > 0)) throw new Error('gaussianKde needs data that are not all equal.')
        let factor
        if (bandwidth === 'scott') factor = Math.pow(n, -1 / 5)
        else if (bandwidth === 'silverman') factor = Math.pow(n * 3 / 4, -1 / 5)
        else if (typeof bandwidth === 'number' && bandwidth > 0) factor = bandwidth
        else throw new Error('bandwidth must be "scott", "silverman" or a positive number.')
        this.factor = factor
        this.bandwidth = factor * sd
    }

    /**
     * Density estimate at x.
     * @param {number|Array} x
     * @returns {number|Array}
     */
    pdf(x) {
        const h = this.bandwidth
        const c = 1 / (this.data.length * h * Math.sqrt(2 * Math.PI))
        return mapValues(x, (v) => {
            let s = 0
            for (const xi of this.data) {
                const z = (v - xi) / h
                s += Math.exp(-0.5 * z * z)
            }
            return c * s
        })
    }

    /**
     * log of the density estimate.
     * @param {number|Array} x
     * @returns {number|Array}
     */
    logpdf(x) {
        return mapValues(this.pdf(x), Math.log)
    }

    /**
     * Cumulative distribution of the estimate (mean of normal cdfs).
     * @param {number|Array} x
     * @returns {number|Array}
     */
    cdf(x) {
        const h = this.bandwidth
        return mapValues(x, (v) => this.data.reduce((s, xi) => s + normalCDF((v - xi) / h), 0) / this.data.length)
    }

    /**
     * Draws from the estimate: a random data point plus Gaussian noise (scipy's resample).
     * @param {number|Array|null} [size=null]
     * @returns {number|Array}
     */
    sample(size = null) {
        const pick = () => this.data[samplers.integers(0, this.data.length)] + this.bandwidth * samplers.standardNormal()
        if (size === null) return pick()
        return mapValues(samplers.random(size), () => pick())
    }
}

/**
 * Gaussian kernel density estimate (scipy.stats.gaussian_kde), one-dimensional.
 *
 * @example
 * const kde = gaussianKde(data)          // Scott's rule
 * kde.pdf([0, 1, 2]); kde.cdf(1); kde.sample(100)
 *
 * @param {ArrayLike<number>} data
 * @param {Object} [options]
 * @param {string|number} [options.bandwidth='scott']
 * @returns {GaussianKde}
 */
export function gaussianKde(data, options) {
    return new GaussianKde(data, options)
}
