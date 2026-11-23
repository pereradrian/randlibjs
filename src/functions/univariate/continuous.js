import { rand } from '../../core/state.js'
import {
    standardNormal as sNormal,
    standardExponential as sExponential,
    standardGamma as sGamma,
    betaSample,
    poissonSample,
} from '../../core/samplers.js'
import { baseGenerator } from '../base-generator.js'
import { assertNumber, assertPositive, assertNonNegative, assertFinite } from '../util/validate.js'

/**
 * Draws samples from the standard exponential distribution (rate 1, mean 1).
 *
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function standardExponential(size = null) {
    return baseGenerator(sExponential, size)
}

/**
 * Draws samples from a standard gamma distribution with the given shape (scale 1).
 *
 * @param {number} shape - Shape `k` (>= 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function standardGamma(shape, size = null) {
    assertNonNegative('shape', shape)
    return baseGenerator(() => sGamma(shape), size)
}

/**
 * Draws samples from a Gamma distribution with shape `k` and scale `theta`
 * (mean k·theta, variance k·theta²). Exact Marsaglia–Tsang method.
 *
 * @example
 * gamma(2, 3, 1000)   // shape 2, scale 3
 *
 * @param {number} shape - Shape `k` (>= 0).
 * @param {number} [scale=1] - Scale `theta` (>= 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function gamma(shape, scale = 1.0, size = null) {
    assertNonNegative('shape', shape)
    assertNonNegative('scale', scale)
    return baseGenerator(() => scale * sGamma(shape), size)
}

/**
 * Draws samples from a Beta distribution on [0, 1].
 *
 * @param {number} a - Alpha (> 0).
 * @param {number} b - Beta (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function beta(a, b, size = null) {
    assertPositive('a', a)
    assertPositive('b', b)
    return baseGenerator(() => betaSample(a, b), size)
}

function chisq(df) {
    return 2 * sGamma(df / 2)
}

/**
 * Draws samples from an F (Fisher–Snedecor) distribution.
 *
 * @param {number} dfnum - Degrees of freedom of the numerator (> 0).
 * @param {number} dfden - Degrees of freedom of the denominator (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function f(dfnum, dfden, size = null) {
    assertPositive('dfnum', dfnum)
    assertPositive('dfden', dfden)
    return baseGenerator(() => chisq(dfnum) * dfden / (chisq(dfden) * dfnum), size)
}

function noncentralChisq(df, nonc) {
    if (nonc === 0) {
        return chisq(df)
    }
    if (df > 1) {
        const n = sNormal() + Math.sqrt(nonc)
        return chisq(df - 1) + n * n
    }
    const i = poissonSample(nonc / 2)
    return chisq(df + 2 * i)
}

/**
 * Draws samples from a noncentral chi-square distribution.
 *
 * @param {number} df - Degrees of freedom (> 0).
 * @param {number} nonc - Non-centrality (>= 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function noncentralChisquare(df, nonc, size = null) {
    assertPositive('df', df)
    assertNonNegative('nonc', nonc)
    return baseGenerator(() => noncentralChisq(df, nonc), size)
}

/**
 * Draws samples from a noncentral F distribution.
 *
 * @param {number} dfnum - Numerator degrees of freedom (> 0).
 * @param {number} dfden - Denominator degrees of freedom (> 0).
 * @param {number} nonc - Non-centrality (>= 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function noncentralF(dfnum, dfden, nonc, size = null) {
    assertPositive('dfnum', dfnum)
    assertPositive('dfden', dfden)
    assertNonNegative('nonc', nonc)
    return baseGenerator(() => noncentralChisq(dfnum, nonc) * dfden / (chisq(dfden) * dfnum), size)
}

/**
 * Draws samples from Student's t distribution with `df` degrees of freedom.
 *
 * @param {number} df - Degrees of freedom (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function standardT(df, size = null) {
    assertPositive('df', df)
    return baseGenerator(() => {
        const num = sNormal()
        const denom = sGamma(df / 2)
        return Math.sqrt(df / 2) * num / Math.sqrt(denom)
    }, size)
}

/**
 * Draws samples from Student's t distribution with location and scale.
 *
 * @param {number} df - Degrees of freedom (> 0).
 * @param {number} [loc=0] - Location.
 * @param {number} [scale=1] - Scale (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function studentT(df, loc = 0, scale = 1, size = null) {
    assertPositive('df', df)
    assertFinite('loc', loc)
    assertPositive('scale', scale)
    return baseGenerator(() => loc + scale * Math.sqrt(df / 2) * sNormal() / Math.sqrt(sGamma(df / 2)), size)
}

/**
 * Draws samples from the standard Cauchy distribution (median 0, scale 1).
 *
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function standardCauchy(size = null) {
    return baseGenerator(() => {
        let d
        do {
            d = sNormal()
        } while (d === 0)
        return sNormal() / d
    }, size)
}

/**
 * Draws samples from the Laplace (double exponential) distribution.
 *
 * @param {number} [loc=0] - Location (mean / median).
 * @param {number} [scale=1] - Scale (>= 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function laplace(loc = 0, scale = 1, size = null) {
    assertNumber('loc', loc)
    assertNonNegative('scale', scale)
    return baseGenerator(() => {
        let u
        do {
            u = rand()
        } while (u === 0)
        return u >= 0.5 ? loc - scale * Math.log(2 - 2 * u) : loc + scale * Math.log(2 * u)
    }, size)
}

/**
 * Draws samples from the logistic distribution.
 *
 * @param {number} [loc=0] - Location (mean).
 * @param {number} [scale=1] - Scale (>= 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function logistic(loc = 0, scale = 1, size = null) {
    assertNumber('loc', loc)
    assertNonNegative('scale', scale)
    return baseGenerator(() => {
        let u
        do {
            u = rand()
        } while (u === 0)
        return loc + scale * Math.log(u / (1 - u))
    }, size)
}

/**
 * Draws samples from the Gumbel (type I extreme value) distribution.
 *
 * @param {number} [loc=0] - Location (mode).
 * @param {number} [scale=1] - Scale (>= 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function gumbel(loc = 0, scale = 1, size = null) {
    assertNumber('loc', loc)
    assertNonNegative('scale', scale)
    return baseGenerator(() => {
        let u
        do {
            u = 1 - rand()
        } while (u >= 1)
        return loc - scale * Math.log(-Math.log(u))
    }, size)
}

/**
 * Draws samples from a Weibull distribution with shape `a` and scale 1 (numpy's `weibull`).
 * Multiply by a scale `lambda` to obtain the two-parameter Weibull.
 *
 * @param {number} a - Shape (>= 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function weibull(a, size = null) {
    assertNonNegative('a', a)
    return baseGenerator(() => (a === 0 ? 0 : Math.pow(sExponential(), 1 / a)), size)
}

/**
 * Draws samples from the Rayleigh distribution.
 *
 * @param {number} [scale=1] - Scale / mode (>= 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function rayleigh(scale = 1, size = null) {
    assertNonNegative('scale', scale)
    return baseGenerator(() => scale * Math.sqrt(2 * sExponential()), size)
}

/**
 * Draws samples in [0, 1] from a power distribution with positive exponent a - 1
 * (density a·x^(a-1)).
 *
 * @param {number} a - Exponent parameter (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function power(a, size = null) {
    assertPositive('a', a)
    return baseGenerator(() => Math.pow(-Math.expm1(-sExponential()), 1 / a), size)
}

/**
 * Draws samples from a Wald (inverse Gaussian) distribution.
 *
 * @param {number} mean - Distribution mean (> 0).
 * @param {number} scale - Shape parameter lambda (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function wald(mean, scale, size = null) {
    assertPositive('mean', mean)
    assertPositive('scale', scale)
    return baseGenerator(() => {
        const mu2l = mean / (2 * scale)
        let y = sNormal()
        y = mean * y * y
        const x = mean + mu2l * (y - Math.sqrt(4 * scale * y + y * y))
        const u = rand()
        return u <= mean / (mean + x) ? x : mean * mean / x
    }, size)
}

/**
 * Draws samples from the von Mises (circular normal) distribution on [-pi, pi]
 * using the Best–Fisher algorithm.
 *
 * @param {number} mu - Mode / center of the distribution.
 * @param {number} kappa - Concentration (>= 0). 0 gives the uniform distribution on the circle.
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function vonmises(mu, kappa, size = null) {
    assertFinite('mu', mu)
    assertNonNegative('kappa', kappa)
    return baseGenerator(() => sampleVonMises(mu, kappa), size)
}

function wrapAngle(x) {
    const twoPi = 2 * Math.PI
    let r = (x + Math.PI) % twoPi
    if (r < 0) {
        r += twoPi
    }
    return r - Math.PI
}

function sampleVonMises(mu, kappa) {
    if (kappa < 1e-8) {
        return Math.PI * (2 * rand() - 1)
    }
    if (kappa > 1e6) {
        return wrapAngle(mu + Math.sqrt(1 / kappa) * sNormal())
    }
    let s
    if (kappa < 1e-5) {
        s = 1 / kappa + kappa
    } else {
        const r = 1 + Math.sqrt(1 + 4 * kappa * kappa)
        const rho = (r - Math.sqrt(2 * r)) / (2 * kappa)
        s = (1 + rho * rho) / (2 * rho)
    }
    let w
    for (;;) {
        const u = rand()
        const z = Math.cos(Math.PI * u)
        w = (1 + s * z) / (s + z)
        const y = kappa * (s - w)
        const v = rand()
        if (y * (2 - y) - v >= 0 || Math.log(y / v) + 1 - y >= 0) {
            break
        }
    }
    let result = Math.acos(w)
    if (rand() < 0.5) {
        result = -result
    }
    return wrapAngle(result + mu)
}
