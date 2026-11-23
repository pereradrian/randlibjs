/**
 * Copulas: random vectors with uniform margins and a chosen dependence structure. Map each
 * coordinate through any quantile function (`stats.<family>(...).ppf`) to get dependent
 * variables with arbitrary margins.
 *
 * Elliptical copulas (Gaussian, Student t) take a correlation matrix; the Archimedean ones
 * (Clayton, Gumbel, Frank) take θ and a dimension and are sampled exactly with the
 * Marshall–Olkin frailty construction. `copulaTheta` converts a Kendall's τ into the
 * parameter of each family.
 *
 * @module copulas
 */
import { standardNormal, standardExponential, standardGamma } from '../../core/samplers.js'
import { randOpen } from '../../core/state.js'
import { normalizeSize, fillShape } from '../base-generator.js'
import { choleskyDecomposition } from '../util/cholesky.js'
import { normalCDF, betaInc } from '../../stats/special.js'
import { integrate } from '../../stats/numerics.js'
import { logseries } from '../univariate/discrete.js'
import { assertPositive, assertPositiveInteger } from '../util/validate.js'

function sampler(sample, size) {
    const shape = normalizeSize(size)
    return shape === null ? sample() : fillShape(shape, sample)
}

function correlationFactor(corr) {
    if (!Array.isArray(corr) || corr.length < 2 || corr.some((row) => !Array.isArray(row) || row.length !== corr.length)) {
        throw new Error('corr must be a square correlation matrix of dimension >= 2.')
    }
    corr.forEach((row, i) => {
        if (Math.abs(row[i] - 1) > 1e-9) throw new Error('corr must have a unit diagonal.')
        row.forEach((v, j) => {
            if (!(Math.abs(v - corr[j][i]) <= 1e-12)) throw new Error('corr must be symmetric.')
        })
    })
    return choleskyDecomposition(corr)
}

function correlatedNormals(L) {
    const d = L.length
    const z = Array.from({ length: d }, () => standardNormal())
    return L.map((row) => {
        let s = 0
        for (let j = 0; j < d; j++) s += row[j] * z[j]
        return s
    })
}

/** Student t cdf through the regularised incomplete beta. @private */
function studentTCdf(t, df) {
    const x = df / (df + t * t)
    const tail = 0.5 * betaInc(x, df / 2, 0.5)
    return t > 0 ? 1 - tail : tail
}

/**
 * Gaussian copula: uniforms Φ(Z) with Z ~ N(0, corr).
 *
 * @example
 * // two dependent uniforms with correlation 0.7, then any margins
 * const [u, v] = gaussianCopula([[1, 0.7], [0.7, 1]])
 * const x = stats.gamma(2, 1).ppf(u), y = stats.lognormal(0, 0.5).ppf(v)
 *
 * @param {number[][]} corr - Correlation matrix (positive semi-definite, unit diagonal).
 * @param {number|Array|null} [size=null] - Output shape; each element is a vector.
 * @returns {number[]|Array}
 */
export function gaussianCopula(corr, size = null) {
    const L = correlationFactor(corr)
    return sampler(() => correlatedNormals(L).map(normalCDF), size)
}

/**
 * Student t copula: uniforms T_df(Z / sqrt(W / df)), Z ~ N(0, corr), W ~ χ²(df). Unlike the
 * Gaussian copula it has tail dependence (joint extremes).
 *
 * @param {number[][]} corr - Correlation matrix.
 * @param {number} df - Degrees of freedom (> 0).
 * @param {number|Array|null} [size=null]
 * @returns {number[]|Array}
 */
export function tCopula(corr, df, size = null) {
    assertPositive('df', df)
    const L = correlationFactor(corr)
    return sampler(() => {
        const s = Math.sqrt(2 * standardGamma(df / 2) / df)
        return correlatedNormals(L).map((z) => studentTCdf(z / s, df))
    }, size)
}

function archimedean(dim, size, frailty, generatorInverse) {
    assertPositiveInteger('dim', dim)
    if (dim < 2) throw new Error('dim must be >= 2.')
    return sampler(() => {
        const v = frailty()
        return Array.from({ length: dim }, () => generatorInverse(standardExponential() / v))
    }, size)
}

/**
 * Clayton copula (lower tail dependence), θ > 0: Kendall's τ = θ / (θ + 2).
 *
 * @param {number} theta - Dependence parameter (> 0).
 * @param {number} [dim=2] - Dimension.
 * @param {number|Array|null} [size=null]
 * @returns {number[]|Array}
 */
export function claytonCopula(theta, dim = 2, size = null) {
    assertPositive('theta', theta)
    // frailty V ~ Gamma(1/θ), ψ(t) = (1 + t)^(-1/θ)
    return archimedean(dim, size, () => standardGamma(1 / theta), (t) => Math.exp(-Math.log1p(t) / theta))
}

/**
 * Gumbel copula (upper tail dependence), θ >= 1: Kendall's τ = 1 - 1/θ.
 *
 * @param {number} theta - Dependence parameter (>= 1; 1 is independence).
 * @param {number} [dim=2]
 * @param {number|Array|null} [size=null]
 * @returns {number[]|Array}
 */
export function gumbelCopula(theta, dim = 2, size = null) {
    if (typeof theta !== 'number' || !(theta >= 1)) throw new Error('theta must be >= 1.')
    const alpha = 1 / theta
    // frailty V positive stable with Laplace transform exp(-t^α) (Kanter's representation)
    const stable = () => {
        if (alpha === 1) return 1
        const u = Math.PI * randOpen()
        const e = standardExponential()
        return Math.sin(alpha * u) / Math.pow(Math.sin(u), 1 / alpha) * Math.pow(Math.sin((1 - alpha) * u) / e, (1 - alpha) / alpha)
    }
    return archimedean(dim, size, stable, (t) => Math.exp(-Math.pow(t, alpha)))
}

/**
 * Frank copula (no tail dependence, symmetric), θ > 0.
 *
 * @param {number} theta - Dependence parameter (> 0).
 * @param {number} [dim=2]
 * @param {number|Array|null} [size=null]
 * @returns {number[]|Array}
 */
export function frankCopula(theta, dim = 2, size = null) {
    assertPositive('theta', theta)
    // frailty V ~ logarithmic series with p = 1 - e^-θ, ψ(t) = -log(1 - (1 - e^-θ) e^-t) / θ
    const p = -Math.expm1(-theta)
    return archimedean(dim, size, () => logseries(p), (t) => -Math.log1p(-p * Math.exp(-t)) / theta)
}

/**
 * Kendall's τ of each copula family as a function of its parameter.
 * @param {string} family - 'gaussian', 't', 'clayton', 'gumbel' or 'frank'.
 * @param {number} param - ρ (gaussian, t), or θ.
 * @returns {number}
 */
export function copulaTau(family, param) {
    switch (family) {
        case 'gaussian':
        case 't':
            return 2 / Math.PI * Math.asin(param)
        case 'clayton':
            return param / (param + 2)
        case 'gumbel':
            return 1 - 1 / param
        case 'frank': {
            if (param === 0) return 0
            // 1 - 4/θ (1 - D1(θ)), D1 the Debye function
            const d1 = integrate((t) => (t === 0 ? 1 : t / Math.expm1(t)), 0, param) / param
            return 1 - 4 / param * (1 - d1)
        }
        default:
            throw new Error('family must be "gaussian", "t", "clayton", "gumbel" or "frank".')
    }
}

/**
 * The parameter of a copula family with the given Kendall's τ: ρ = sin(πτ/2) for the
 * elliptical families, θ for the Archimedean ones (Frank by numerical inversion).
 *
 * @example
 * claytonCopula(copulaTheta('clayton', 0.5), 2, 1000)   // τ = 0.5
 *
 * @param {string} family - 'gaussian', 't', 'clayton', 'gumbel' or 'frank'.
 * @param {number} tau - Kendall's τ in (0, 1) (or (-1, 1) for gaussian / t).
 * @returns {number}
 */
export function copulaTheta(family, tau) {
    if (typeof tau !== 'number' || !(tau > -1 && tau < 1)) throw new Error('tau must be in (-1, 1).')
    switch (family) {
        case 'gaussian':
        case 't':
            return Math.sin(Math.PI * tau / 2)
        case 'clayton':
            if (!(tau > 0)) throw new Error('clayton needs tau > 0.')
            return 2 * tau / (1 - tau)
        case 'gumbel':
            if (!(tau >= 0)) throw new Error('gumbel needs tau >= 0.')
            return 1 / (1 - tau)
        case 'frank': {
            if (!(tau > 0)) throw new Error('frank needs tau > 0 (positive dependence).')
            // copulaTau is increasing in θ: bisection on a bracket
            let lo = 1e-9
            let hi = 1
            while (copulaTau('frank', hi) < tau) hi *= 2
            for (let i = 0; i < 200; i++) {
                const mid = (lo + hi) / 2
                if (mid === lo || mid === hi) break
                if (copulaTau('frank', mid) < tau) lo = mid
                else hi = mid
            }
            return (lo + hi) / 2
        }
        default:
            throw new Error('family must be "gaussian", "t", "clayton", "gumbel" or "frank".')
    }
}
