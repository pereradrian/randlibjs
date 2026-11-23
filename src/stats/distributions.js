/**
 * Frozen probability distributions in the style of scipy.stats: each object exposes
 * density/mass, cumulative and quantile functions, moments and sampling.
 *
 * Every function accepts a number or a (nested) array of numbers and returns the same shape.
 *
 * @example
 * import { stats } from 'randlibjs'
 * const n = stats.normal(0, 1)
 * n.cdf(1.96)            // 0.9750021048517795
 * n.ppf([0.025, 0.975])  // [-1.959963984540054, 1.959963984540054]
 * n.interval(0.95)       // [-1.96, 1.96]
 * n.sample(5)            // five random draws
 *
 * @module stats
 */
import * as samplers from '../distributions.js'
import {
    logGamma, logBeta, logChoose, gammaP, gammaQ, gammaPInv, betaInc, betaIncInv,
    normalCDF, inverseNormalCDF, digamma,
} from './special.js'
import {
    assertFinite, assertPositive, assertNonNegative, assertProbability, assertNonNegativeInteger,
} from '../functions/util/validate.js'
import { makeFitters, toData } from './fit.js'
import { FAMILIES } from './families.js'
import { kstest, ks2samp, chisquareTest, andersonDarling, describe, gaussianKde } from './tests.js'

import { mapValues, ContinuousDistribution, DiscreteDistribution } from './base.js'

export { ContinuousDistribution, DiscreteDistribution }

// ---------------------------------------------------------------- continuous

class Normal extends ContinuousDistribution {
    constructor(loc = 0, scale = 1) {
        super()
        assertFinite('loc', loc)
        assertPositive('scale', scale)
        this.loc = loc
        this.scale = scale
    }
    _logpdf(x) {
        const z = (x - this.loc) / this.scale
        return -0.5 * z * z - Math.log(this.scale) - 0.9189385332046728
    }
    _cdf(x) { return normalCDF((x - this.loc) / this.scale) }
    _sf(x) { return normalCDF((this.loc - x) / this.scale) }
    _ppf(p) { return this.loc + this.scale * inverseNormalCDF(p) }
    _isf(q) { return this.loc - this.scale * inverseNormalCDF(q) }
    _sample(size) { return samplers.normal(this.loc, this.scale, size) }
    mean() { return this.loc }
    variance() { return this.scale * this.scale }
    entropy() { return 0.5 * Math.log(2 * Math.PI * Math.E * this.scale * this.scale) }
}

class Uniform extends ContinuousDistribution {
    constructor(low = 0, high = 1) {
        super()
        assertFinite('low', low)
        assertFinite('high', high)
        if (!(low < high)) throw new Error('low must be < high.')
        this.low = low
        this.high = high
    }
    get support() { return [this.low, this.high] }
    _logpdf(x) { return x >= this.low && x <= this.high ? -Math.log(this.high - this.low) : -Infinity }
    _cdf(x) { return Math.min(1, Math.max(0, (x - this.low) / (this.high - this.low))) }
    _ppf(p) { return this.low + p * (this.high - this.low) }
    _sample(size) { return samplers.uniform(this.low, this.high, size) }
    mean() { return (this.low + this.high) / 2 }
    variance() { return (this.high - this.low) ** 2 / 12 }
    entropy() { return Math.log(this.high - this.low) }
}

class Exponential extends ContinuousDistribution {
    constructor(rate = 1) {
        super()
        assertPositive('rate', rate)
        this.rate = rate
    }
    get support() { return [0, Infinity] }
    _logpdf(x) { return x < 0 ? -Infinity : Math.log(this.rate) - this.rate * x }
    _cdf(x) { return x <= 0 ? 0 : -Math.expm1(-this.rate * x) }
    _sf(x) { return x <= 0 ? 1 : Math.exp(-this.rate * x) }
    _ppf(p) { return -Math.log1p(-p) / this.rate }
    _isf(q) { return -Math.log(q) / this.rate }
    _sample(size) { return samplers.exponential(this.rate, size) }
    mean() { return 1 / this.rate }
    variance() { return 1 / (this.rate * this.rate) }
    entropy() { return 1 - Math.log(this.rate) }
}

class Gamma extends ContinuousDistribution {
    constructor(shape, scale = 1) {
        super()
        assertPositive('shape', shape)
        assertPositive('scale', scale)
        this.shape = shape
        this.scale = scale
    }
    get support() { return [0, Infinity] }
    _logpdf(x) {
        if (x < 0) return -Infinity
        if (x === 0) return this.shape < 1 ? Infinity : this.shape === 1 ? -Math.log(this.scale) : -Infinity
        const z = x / this.scale
        return (this.shape - 1) * Math.log(z) - z - logGamma(this.shape) - Math.log(this.scale)
    }
    _cdf(x) { return gammaP(this.shape, x / this.scale) }
    _sf(x) { return gammaQ(this.shape, x / this.scale) }
    _ppf(p) { return this.scale * gammaPInv(this.shape, p) }
    _isf(q) { return q > 0.5 ? this._ppf(1 - q) : refineTail(this, q, this._ppf(1 - q)) }
    _sample(size) { return samplers.gamma(this.shape, this.scale, size) }
    mean() { return this.shape * this.scale }
    variance() { return this.shape * this.scale * this.scale }
    entropy() { return this.shape + Math.log(this.scale) + logGamma(this.shape) + (1 - this.shape) * digamma(this.shape) }
}

/** Newton refinement of an upper-tail quantile using the survival function. @private */
function refineTail(dist, q, x) {
    for (let i = 0; i < 50 && Number.isFinite(x); i++) {
        const f = Math.exp(dist._logpdf(x))
        if (!(f > 0)) break
        const dx = (dist._sf(x) - q) / f
        x += dx
        if (Math.abs(dx) <= 1e-15 * Math.abs(x)) break
    }
    return x
}

class ChiSquare extends Gamma {
    constructor(df) {
        assertPositive('df', df)
        super(df / 2, 2)
        this.df = df
    }
    _sample(size) { return samplers.chisquare(this.df, size) }
}

class Beta extends ContinuousDistribution {
    constructor(a, b) {
        super()
        assertPositive('a', a)
        assertPositive('b', b)
        this.a = a
        this.b = b
    }
    get support() { return [0, 1] }
    _logpdf(x) {
        if (x < 0 || x > 1) return -Infinity
        return (this.a - 1) * Math.log(x) + (this.b - 1) * Math.log1p(-x) - logBeta(this.a, this.b)
    }
    _cdf(x) {
        x = Math.min(1, Math.max(0, x))
        return x <= 0.5 ? betaInc(x, this.a, this.b) : 1 - betaInc(1 - x, this.b, this.a)
    }
    _sf(x) {
        x = Math.min(1, Math.max(0, x))
        return x <= 0.5 ? 1 - betaInc(x, this.a, this.b) : betaInc(1 - x, this.b, this.a)
    }
    _ppf(p) { return p <= 0.5 ? betaIncInv(p, this.a, this.b) : 1 - betaIncInv(1 - p, this.b, this.a) }
    _isf(q) { return q <= 0.5 ? 1 - betaIncInv(q, this.b, this.a) : betaIncInv(1 - q, this.a, this.b) }
    _sample(size) { return samplers.beta(this.a, this.b, size) }
    mean() { return this.a / (this.a + this.b) }
    variance() {
        const s = this.a + this.b
        return this.a * this.b / (s * s * (s + 1))
    }
}

class StudentT extends ContinuousDistribution {
    constructor(df, loc = 0, scale = 1) {
        super()
        assertPositive('df', df)
        assertFinite('loc', loc)
        assertPositive('scale', scale)
        this.df = df
        this.loc = loc
        this.scale = scale
    }
    _logpdf(x) {
        const z = (x - this.loc) / this.scale
        const v = this.df
        return logGamma((v + 1) / 2) - logGamma(v / 2) - 0.5 * Math.log(v * Math.PI) -
            (v + 1) / 2 * Math.log1p(z * z / v) - Math.log(this.scale)
    }
    _tailProb(z) {
        // P(T > |z|)
        const v = this.df
        return 0.5 * betaInc(v / (v + z * z), v / 2, 0.5)
    }
    _cdf(x) {
        const z = (x - this.loc) / this.scale
        const t = this._tailProb(z)
        return z >= 0 ? 1 - t : t
    }
    _sf(x) {
        const z = (x - this.loc) / this.scale
        const t = this._tailProb(z)
        return z >= 0 ? t : 1 - t
    }
    _standardQuantile(p) {
        // quantile for p <= 0.5 (negative side)
        const v = this.df
        const x = betaIncInv(2 * p, v / 2, 0.5)
        return -Math.sqrt(v * (1 - x) / x)
    }
    _ppf(p) {
        if (p === 0) return -Infinity
        if (p === 1) return Infinity
        if (p === 0.5) return this.loc
        const z = p < 0.5 ? this._standardQuantile(p) : -this._standardQuantile(1 - p)
        return this.loc + this.scale * z
    }
    _isf(q) { return 2 * this.loc - this._ppf(q) }
    _sample(size) { return samplers.studentT(this.df, this.loc, this.scale, size) }
    mean() { return this.df > 1 ? this.loc : NaN }
    variance() {
        if (this.df > 2) return this.scale * this.scale * this.df / (this.df - 2)
        return this.df > 1 ? Infinity : NaN
    }
}

class FDist extends ContinuousDistribution {
    constructor(dfnum, dfden) {
        super()
        assertPositive('dfnum', dfnum)
        assertPositive('dfden', dfden)
        this.d1 = dfnum
        this.d2 = dfden
    }
    get support() { return [0, Infinity] }
    _logpdf(x) {
        if (x < 0) return -Infinity
        const { d1, d2 } = this
        return 0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) - Math.log(x) - logBeta(d1 / 2, d2 / 2)
    }
    // cdf and sf use the incomplete beta on whichever argument is small: the other one
    // rounds to 1 in the far tails (e.g. sf(1e-190) with tiny degrees of freedom).
    _cdf(x) {
        if (x <= 0) return 0
        const { d1, d2 } = this
        const z = d1 * x / (d1 * x + d2)
        return z <= 0.5 ? betaInc(z, d1 / 2, d2 / 2) : 1 - betaInc(d2 / (d1 * x + d2), d2 / 2, d1 / 2)
    }
    _sf(x) {
        if (x <= 0) return 1
        const { d1, d2 } = this
        const z = d1 * x / (d1 * x + d2)
        return z <= 0.5 ? 1 - betaInc(z, d1 / 2, d2 / 2) : betaInc(d2 / (d1 * x + d2), d2 / 2, d1 / 2)
    }
    _ppf(p) {
        if (p > 0.5) return this._isf(1 - p)
        const { d1, d2 } = this
        const y = betaIncInv(p, d1 / 2, d2 / 2)
        return d2 * y / (d1 * (1 - y))
    }
    _isf(q) {
        if (q > 0.5) return this._ppf(1 - q)
        const { d1, d2 } = this
        // y = d2 / (d1 x + d2) is small in the upper tail, so x is computed without cancellation
        const y = betaIncInv(q, d2 / 2, d1 / 2)
        return d2 * (1 - y) / (d1 * y)
    }
    _sample(size) { return samplers.f(this.d1, this.d2, size) }
    mean() { return this.d2 > 2 ? this.d2 / (this.d2 - 2) : Infinity }
    variance() {
        const { d1, d2 } = this
        if (d2 <= 4) return Infinity
        return 2 * d2 * d2 * (d1 + d2 - 2) / (d1 * (d2 - 2) ** 2 * (d2 - 4))
    }
}

class LogNormal extends ContinuousDistribution {
    constructor(mu = 0, sigma = 1) {
        super()
        assertFinite('mu', mu)
        assertPositive('sigma', sigma)
        this.mu = mu
        this.sigma = sigma
    }
    get support() { return [0, Infinity] }
    _logpdf(x) {
        if (x <= 0) return -Infinity
        const z = (Math.log(x) - this.mu) / this.sigma
        return -0.5 * z * z - Math.log(x * this.sigma) - 0.9189385332046728
    }
    _cdf(x) { return x <= 0 ? 0 : normalCDF((Math.log(x) - this.mu) / this.sigma) }
    _sf(x) { return x <= 0 ? 1 : normalCDF((this.mu - Math.log(x)) / this.sigma) }
    _ppf(p) { return Math.exp(this.mu + this.sigma * inverseNormalCDF(p)) }
    _isf(q) { return Math.exp(this.mu - this.sigma * inverseNormalCDF(q)) }
    _sample(size) { return samplers.lognormal(this.mu, this.sigma, size) }
    mean() { return Math.exp(this.mu + this.sigma * this.sigma / 2) }
    variance() { return Math.expm1(this.sigma * this.sigma) * Math.exp(2 * this.mu + this.sigma * this.sigma) }
    median() { return Math.exp(this.mu) }
}

class Cauchy extends ContinuousDistribution {
    constructor(loc = 0, scale = 1) {
        super()
        assertFinite('loc', loc)
        assertPositive('scale', scale)
        this.loc = loc
        this.scale = scale
    }
    _logpdf(x) {
        const z = (x - this.loc) / this.scale
        return -Math.log(Math.PI * this.scale * (1 + z * z))
    }
    _cdf(x) { return 0.5 + Math.atan((x - this.loc) / this.scale) / Math.PI }
    _sf(x) { return 0.5 - Math.atan((x - this.loc) / this.scale) / Math.PI }
    _ppf(p) {
        // -cot(pi p) keeps full precision in both tails, unlike tan(pi (p - 0.5))
        if (p === 0) return -Infinity
        if (p === 1) return Infinity
        return p < 0.5 ? this.loc - this.scale / Math.tan(Math.PI * p) : this.loc + this.scale / Math.tan(Math.PI * (1 - p))
    }
    _isf(q) { return 2 * this.loc - this._ppf(q) }
    _sample(size) { return samplers.cauchy(this.loc, this.scale, size) }
    variance() { return NaN }
    median() { return this.loc }
}

class Laplace extends ContinuousDistribution {
    constructor(loc = 0, scale = 1) {
        super()
        assertFinite('loc', loc)
        assertPositive('scale', scale)
        this.loc = loc
        this.scale = scale
    }
    _logpdf(x) { return -Math.abs(x - this.loc) / this.scale - Math.log(2 * this.scale) }
    _cdf(x) {
        const z = (x - this.loc) / this.scale
        return z < 0 ? 0.5 * Math.exp(z) : 1 - 0.5 * Math.exp(-z)
    }
    _sf(x) { return this._cdf(2 * this.loc - x) }
    _ppf(p) { return p < 0.5 ? this.loc + this.scale * Math.log(2 * p) : this.loc - this.scale * Math.log(2 - 2 * p) }
    _isf(q) { return 2 * this.loc - this._ppf(q) }
    _sample(size) { return samplers.laplace(this.loc, this.scale, size) }
    mean() { return this.loc }
    variance() { return 2 * this.scale * this.scale }
}

class Logistic extends ContinuousDistribution {
    constructor(loc = 0, scale = 1) {
        super()
        assertFinite('loc', loc)
        assertPositive('scale', scale)
        this.loc = loc
        this.scale = scale
    }
    _logpdf(x) {
        const z = -Math.abs((x - this.loc) / this.scale)
        return z - 2 * Math.log1p(Math.exp(z)) - Math.log(this.scale)
    }
    _cdf(x) { return 1 / (1 + Math.exp(-(x - this.loc) / this.scale)) }
    _sf(x) { return 1 / (1 + Math.exp((x - this.loc) / this.scale)) }
    _ppf(p) { return this.loc + this.scale * Math.log(p / (1 - p)) }
    _isf(q) { return this.loc - this.scale * Math.log(q / (1 - q)) }
    _sample(size) { return samplers.logistic(this.loc, this.scale, size) }
    mean() { return this.loc }
    variance() { return (Math.PI * this.scale) ** 2 / 3 }
}

class Gumbel extends ContinuousDistribution {
    constructor(loc = 0, scale = 1) {
        super()
        assertFinite('loc', loc)
        assertPositive('scale', scale)
        this.loc = loc
        this.scale = scale
    }
    _logpdf(x) {
        const z = (x - this.loc) / this.scale
        return -(z + Math.exp(-z)) - Math.log(this.scale)
    }
    _cdf(x) { return Math.exp(-Math.exp(-(x - this.loc) / this.scale)) }
    _sf(x) { return -Math.expm1(-Math.exp(-(x - this.loc) / this.scale)) }
    _ppf(p) { return this.loc - this.scale * Math.log(-Math.log(p)) }
    _isf(q) { return this.loc - this.scale * Math.log(-Math.log1p(-q)) }
    _sample(size) { return samplers.gumbel(this.loc, this.scale, size) }
    mean() { return this.loc + 0.5772156649015329 * this.scale }
    variance() { return (Math.PI * this.scale) ** 2 / 6 }
}

class Weibull extends ContinuousDistribution {
    constructor(shape, scale = 1) {
        super()
        assertPositive('shape', shape)
        assertPositive('scale', scale)
        this.k = shape
        this.scale = scale
    }
    get support() { return [0, Infinity] }
    _logpdf(x) {
        if (x < 0) return -Infinity
        const z = x / this.scale
        return Math.log(this.k / this.scale) + (this.k - 1) * Math.log(z) - Math.pow(z, this.k)
    }
    _cdf(x) { return x <= 0 ? 0 : -Math.expm1(-Math.pow(x / this.scale, this.k)) }
    _sf(x) { return x <= 0 ? 1 : Math.exp(-Math.pow(x / this.scale, this.k)) }
    _ppf(p) { return this.scale * Math.pow(-Math.log1p(-p), 1 / this.k) }
    _isf(q) { return this.scale * Math.pow(-Math.log(q), 1 / this.k) }
    _sample(size) { return mapValues(samplers.weibull(this.k, size), (v) => v * this.scale) }
    mean() { return this.scale * Math.exp(logGamma(1 + 1 / this.k)) }
    variance() {
        const g1 = Math.exp(logGamma(1 + 1 / this.k))
        const g2 = Math.exp(logGamma(1 + 2 / this.k))
        return this.scale * this.scale * (g2 - g1 * g1)
    }
}

class Pareto extends ContinuousDistribution {
    constructor(alpha, xm = 1) {
        super()
        assertPositive('alpha', alpha)
        assertPositive('xm', xm)
        this.alpha = alpha
        this.xm = xm
    }
    get support() { return [this.xm, Infinity] }
    _logpdf(x) { return x < this.xm ? -Infinity : Math.log(this.alpha) + this.alpha * Math.log(this.xm) - (this.alpha + 1) * Math.log(x) }
    _cdf(x) { return x <= this.xm ? 0 : -Math.expm1(this.alpha * Math.log(this.xm / x)) }
    _sf(x) { return x <= this.xm ? 1 : Math.pow(this.xm / x, this.alpha) }
    _ppf(p) { return this.xm * Math.pow(1 - p, -1 / this.alpha) }
    _isf(q) { return this.xm * Math.pow(q, -1 / this.alpha) }
    _sample(size) { return samplers.pareto(this.alpha, this.xm, size) }
    mean() { return this.alpha > 1 ? this.alpha * this.xm / (this.alpha - 1) : Infinity }
    variance() {
        const a = this.alpha
        return a > 2 ? this.xm * this.xm * a / ((a - 1) ** 2 * (a - 2)) : Infinity
    }
}

class Triangular extends ContinuousDistribution {
    constructor(low, high, mode) {
        super()
        if (![low, high, mode].every(Number.isFinite) || !(low <= mode && mode <= high && low < high)) {
            throw new Error('Parameters must satisfy low <= mode <= high and low < high.')
        }
        this.a = low
        this.b = high
        this.c = mode
    }
    get support() { return [this.a, this.b] }
    _logpdf(x) {
        const { a, b, c } = this
        if (x < a || x > b) return -Infinity
        const v = x < c ? 2 * (x - a) / ((b - a) * (c - a)) : x === c ? 2 / (b - a) : 2 * (b - x) / ((b - a) * (b - c))
        return Math.log(v)
    }
    _cdf(x) {
        const { a, b, c } = this
        if (x <= a) return 0
        if (x >= b) return 1
        return x <= c ? (x - a) ** 2 / ((b - a) * (c - a)) : 1 - (b - x) ** 2 / ((b - a) * (b - c))
    }
    _ppf(p) {
        const { a, b, c } = this
        const fc = (c - a) / (b - a)
        return p < fc ? a + Math.sqrt(p * (b - a) * (c - a)) : b - Math.sqrt((1 - p) * (b - a) * (b - c))
    }
    _sample(size) { return samplers.triangular(this.a, this.b, this.c, size) }
    mean() { return (this.a + this.b + this.c) / 3 }
    variance() {
        const { a, b, c } = this
        return (a * a + b * b + c * c - a * b - a * c - b * c) / 18
    }
}

class Rayleigh extends ContinuousDistribution {
    constructor(scale = 1) {
        super()
        assertPositive('scale', scale)
        this.scale = scale
    }
    get support() { return [0, Infinity] }
    _logpdf(x) {
        if (x < 0) return -Infinity
        const s2 = this.scale * this.scale
        return Math.log(x / s2) - x * x / (2 * s2)
    }
    _cdf(x) { return x <= 0 ? 0 : -Math.expm1(-x * x / (2 * this.scale * this.scale)) }
    _sf(x) { return x <= 0 ? 1 : Math.exp(-x * x / (2 * this.scale * this.scale)) }
    _ppf(p) { return this.scale * Math.sqrt(-2 * Math.log1p(-p)) }
    _isf(q) { return this.scale * Math.sqrt(-2 * Math.log(q)) }
    _sample(size) { return samplers.rayleigh(this.scale, size) }
    mean() { return this.scale * Math.sqrt(Math.PI / 2) }
    variance() { return (4 - Math.PI) / 2 * this.scale * this.scale }
}

class TruncatedNormal extends ContinuousDistribution {
    constructor(loc = 0, scale = 1, low = -Infinity, high = Infinity) {
        super()
        assertFinite('loc', loc)
        assertPositive('scale', scale)
        if (!(low < high)) throw new Error('low must be < high.')
        this.loc = loc
        this.scale = scale
        this.low = low
        this.high = high
        this.a = (low - loc) / scale
        this.b = (high - loc) / scale
        // work on the side with the smaller mass to keep precision in the tails
        this.flip = this.a > 0
        const [a, b] = this.flip ? [-this.b, -this.a] : [this.a, this.b]
        this.Phi = (z) => normalCDF(this.flip ? -z : z)
        this.za = normalCDF(a)
        this.zb = normalCDF(b)
        this.mass = this.zb - this.za
        this.sa = a
        this.sb = b
    }
    get support() { return [this.low, this.high] }
    _logpdf(x) {
        if (x < this.low || x > this.high) return -Infinity
        const z = (x - this.loc) / this.scale
        return -0.5 * z * z - 0.9189385332046728 - Math.log(this.scale * this.mass)
    }
    _cdf(x) {
        if (x <= this.low) return 0
        if (x >= this.high) return 1
        const z = (x - this.loc) / this.scale
        return this.flip ? (this.zb - normalCDF(-z)) / this.mass : (normalCDF(z) - this.za) / this.mass
    }
    _sf(x) {
        if (x <= this.low) return 1
        if (x >= this.high) return 0
        const z = (x - this.loc) / this.scale
        return this.flip ? (normalCDF(-z) - this.za) / this.mass : (this.zb - normalCDF(z)) / this.mass
    }
    _ppf(p) {
        if (this.flip) {
            const z = -inverseNormalCDF(this.zb - p * this.mass)
            return Math.min(this.high, Math.max(this.low, this.loc + this.scale * z))
        }
        const z = inverseNormalCDF(this.za + p * this.mass)
        return Math.min(this.high, Math.max(this.low, this.loc + this.scale * z))
    }
    _sample(size) { return samplers.truncatedNormal(this.loc, this.scale, this.low, this.high, size) }
    mean() {
        const phi = (z) => (Number.isFinite(z) ? Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI) : 0)
        return this.loc + this.scale * (phi(this.a) - phi(this.b)) / this.mass
    }
    variance() {
        const phi = (z) => (Number.isFinite(z) ? Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI) : 0)
        const za = Number.isFinite(this.a) ? this.a * phi(this.a) : 0
        const zb = Number.isFinite(this.b) ? this.b * phi(this.b) : 0
        const d = (phi(this.a) - phi(this.b)) / this.mass
        return this.scale * this.scale * (1 + (za - zb) / this.mass - d * d)
    }
}

// ---------------------------------------------------------------- discrete

class Binomial extends DiscreteDistribution {
    constructor(n, p) {
        super()
        assertNonNegativeInteger('n', n)
        assertProbability('p', p)
        this.n = n
        this.p = p
    }
    get support() { return [0, this.n] }
    _logpmf(k) {
        const { n, p } = this
        if (k < 0 || k > n) return -Infinity
        if (p === 0) return k === 0 ? 0 : -Infinity
        if (p === 1) return k === n ? 0 : -Infinity
        return logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p)
    }
    _cdf(x) {
        const k = Math.floor(x)
        if (k < 0) return 0
        if (k >= this.n) return 1
        return betaInc(1 - this.p, this.n - k, k + 1)
    }
    _sf(x) {
        const k = Math.floor(x)
        if (k < 0) return 1
        if (k >= this.n) return 0
        return betaInc(this.p, k + 1, this.n - k)
    }
    _sample(size) { return samplers.binomial(this.n, this.p, size) }
    mean() { return this.n * this.p }
    variance() { return this.n * this.p * (1 - this.p) }
}

class Poisson extends DiscreteDistribution {
    constructor(lambda) {
        super()
        assertNonNegative('lambda', lambda)
        this.lambda = lambda
    }
    get support() { return [0, Infinity] }
    _logpmf(k) {
        if (k < 0) return -Infinity
        if (this.lambda === 0) return k === 0 ? 0 : -Infinity
        return k * Math.log(this.lambda) - this.lambda - logGamma(k + 1)
    }
    _cdf(x) {
        const k = Math.floor(x)
        if (k < 0) return 0
        return this.lambda === 0 ? 1 : gammaQ(k + 1, this.lambda)
    }
    _sf(x) {
        const k = Math.floor(x)
        if (k < 0) return 1
        return this.lambda === 0 ? 0 : gammaP(k + 1, this.lambda)
    }
    _sample(size) { return samplers.poisson(this.lambda, size) }
    mean() { return this.lambda }
    variance() { return this.lambda }
}

class Geometric extends DiscreteDistribution {
    constructor(p) {
        super()
        if (typeof p !== 'number' || !(p > 0 && p <= 1)) throw new Error('p must be in (0, 1].')
        this.p = p
    }
    get support() { return [1, Infinity] }
    _logpmf(k) { return k < 1 ? -Infinity : this.p === 1 ? (k === 1 ? 0 : -Infinity) : (k - 1) * Math.log1p(-this.p) + Math.log(this.p) }
    _cdf(x) {
        const k = Math.floor(x)
        return k < 1 ? 0 : -Math.expm1(k * Math.log1p(-this.p))
    }
    _sf(x) {
        const k = Math.floor(x)
        return k < 1 ? 1 : Math.exp(k * Math.log1p(-this.p))
    }
    _ppf(p) {
        if (p === 0) return 0
        if (p === 1) return Infinity
        const k = Math.max(1, Math.ceil(Math.log1p(-p) / Math.log1p(-this.p)))
        // guard against floating point at the boundary
        return this._cdf(k - 1) >= p ? k - 1 : k
    }
    _sample(size) { return samplers.geometric(this.p, size) }
    mean() { return 1 / this.p }
    variance() { return (1 - this.p) / (this.p * this.p) }
}

class NegativeBinomial extends DiscreteDistribution {
    constructor(n, p) {
        super()
        assertPositive('n', n)
        if (typeof p !== 'number' || !(p > 0 && p <= 1)) throw new Error('p must be in (0, 1].')
        this.n = n
        this.p = p
    }
    get support() { return [0, Infinity] }
    _logpmf(k) {
        if (k < 0) return -Infinity
        if (this.p === 1) return k === 0 ? 0 : -Infinity
        return logGamma(k + this.n) - logGamma(k + 1) - logGamma(this.n) + this.n * Math.log(this.p) + k * Math.log1p(-this.p)
    }
    _cdf(x) {
        const k = Math.floor(x)
        return k < 0 ? 0 : betaInc(this.p, this.n, k + 1)
    }
    _sf(x) {
        const k = Math.floor(x)
        return k < 0 ? 1 : betaInc(1 - this.p, k + 1, this.n)
    }
    _sample(size) { return samplers.negativeBinomial(this.n, this.p, size) }
    mean() { return this.n * (1 - this.p) / this.p }
    variance() { return this.n * (1 - this.p) / (this.p * this.p) }
}

class Hypergeometric extends DiscreteDistribution {
    constructor(ngood, nbad, nsample) {
        super()
        assertNonNegativeInteger('ngood', ngood)
        assertNonNegativeInteger('nbad', nbad)
        assertNonNegativeInteger('nsample', nsample)
        if (nsample > ngood + nbad) throw new Error('nsample must be <= ngood + nbad.')
        this.good = ngood
        this.bad = nbad
        this.n = nsample
    }
    get support() { return [Math.max(0, this.n - this.bad), Math.min(this.n, this.good)] }
    _logpmf(k) {
        const [lo, hi] = this.support
        if (k < lo || k > hi) return -Infinity
        return logChoose(this.good, k) + logChoose(this.bad, this.n - k) - logChoose(this.good + this.bad, this.n)
    }
    _sf(x) {
        const k = Math.floor(x)
        const [lo, hi] = this.support
        if (k < lo) return 1
        if (k >= hi) return 0
        let s = 0
        for (let i = k + 1; i <= hi; i++) s += Math.exp(this._logpmf(i))
        return Math.min(1, s)
    }
    _sample(size) { return samplers.hypergeometric(this.good, this.bad, this.n, size) }
    mean() { return this.n * this.good / (this.good + this.bad) }
    variance() {
        const N = this.good + this.bad
        if (N <= 1) return 0
        return this.n * this.good / N * this.bad / N * (N - this.n) / (N - 1)
    }
}

class Bernoulli extends Binomial {
    constructor(p) {
        super(1, p)
    }
    _sample(size) { return samplers.bernoulli(this.p, size) }
}

class DiscreteUniform extends DiscreteDistribution {
    constructor(low, high) {
        super()
        if (!Number.isSafeInteger(low) || !Number.isSafeInteger(high) || !(low < high)) {
            throw new Error('low and high must be integers with low < high (high excluded).')
        }
        this.low = low
        this.high = high
    }
    get support() { return [this.low, this.high - 1] }
    _logpmf(k) { return k >= this.low && k < this.high ? -Math.log(this.high - this.low) : -Infinity }
    _cdf(x) {
        const k = Math.floor(x)
        return Math.min(1, Math.max(0, (k - this.low + 1) / (this.high - this.low)))
    }
    _ppf(p) {
        if (p === 0) return this.low - 1
        const k = this.low + Math.ceil(p * (this.high - this.low) * (1 - 1e-12)) - 1
        return Math.min(this.high - 1, Math.max(this.low, k))
    }
    _sample(size) { return samplers.integers(this.low, this.high, size) }
    mean() { return (this.low + this.high - 1) / 2 }
    variance() { return ((this.high - this.low) ** 2 - 1) / 12 }
}

// ---------------------------------------------------------------- mixtures

function mixtureWeights(components, weights, Base) {
    if (!Array.isArray(components) || components.length === 0) {
        throw new Error('components must be a non-empty array of distributions.')
    }
    if (!Array.isArray(weights) || weights.length !== components.length) {
        throw new Error('weights must have one entry per component.')
    }
    components.forEach((c, i) => {
        if (!(c instanceof Base)) {
            throw new Error(`Component ${i} is not a ${Base === DiscreteDistribution ? 'discrete' : 'continuous'} stats distribution.`)
        }
    })
    let total = 0
    for (const w of weights) {
        if (typeof w !== 'number' || !(w >= 0) || !Number.isFinite(w)) {
            throw new Error('weights must be non-negative finite numbers.')
        }
        total += w
    }
    if (!(total > 0)) {
        throw new Error('weights must not all be zero.')
    }
    return weights.map((w) => w / total)
}

function logSumExp(values) {
    const m = Math.max(...values)
    if (!Number.isFinite(m)) return m
    let s = 0
    for (const v of values) s += Math.exp(v - m)
    return m + Math.log(s)
}

/** Shared behaviour of continuous and discrete mixtures. @private */
const mixtureMethods = {
    _cdf(x) {
        return this.components.reduce((s, c, i) => s + this.weights[i] * c._cdf(x), 0)
    },
    _sf(x) {
        return this.components.reduce((s, c, i) => s + this.weights[i] * c._sf(x), 0)
    },
    _sample(size) {
        return samplers.mixture(this.components, this.weights, size)
    },
    mean() {
        return this.components.reduce((s, c, i) => s + this.weights[i] * c.mean(), 0)
    },
    variance() {
        const mu = this.mean()
        const second = this.components.reduce((s, c, i) => s + this.weights[i] * (c.variance() + c.mean() ** 2), 0)
        return second - mu * mu
    },
}

function mixtureSupport(components) {
    return [Math.min(...components.map((c) => c.support[0])), Math.max(...components.map((c) => c.support[1]))]
}

/**
 * Finite mixture of continuous distributions: density sum_i w_i f_i(x).
 */
class Mixture extends ContinuousDistribution {
    constructor(components, weights) {
        super()
        this.weights = mixtureWeights(components, weights, ContinuousDistribution)
        this.components = components
        if (components.some((c) => c instanceof DiscreteDistribution)) {
            throw new Error('Mixtures cannot combine discrete and continuous components.')
        }
    }
    get support() { return mixtureSupport(this.components) }
    _logpdf(x) { return logSumExp(this.components.map((c, i) => Math.log(this.weights[i]) + c._logpdf(x))) }
    _cdf(x) { return mixtureMethods._cdf.call(this, x) }
    _sf(x) { return mixtureMethods._sf.call(this, x) }
    _sample(size) { return mixtureMethods._sample.call(this, size) }
    mean() { return mixtureMethods.mean.call(this) }
    variance() { return mixtureMethods.variance.call(this) }
    /** Upper-tail quantile by bisection on the survival function (keeps tail precision). */
    _isf(q) {
        if (q > 0.5) return this._ppf(1 - q)
        const [lo0, hi0] = this.support
        if (q === 0) return hi0
        let lo = this._ppf(0.5)
        let hi = Number.isFinite(hi0) ? hi0 : Math.max(1, Math.abs(lo)) * 2
        while (!Number.isFinite(hi0) && this._sf(hi) > q) hi = hi * 2 + 1
        for (let i = 0; i < 300; i++) {
            const mid = (lo + hi) / 2
            if (mid === lo || mid === hi) break
            if (this._sf(mid) > q) lo = mid
            else hi = mid
        }
        return Math.max(lo0, (lo + hi) / 2)
    }
}

/**
 * Finite mixture of discrete distributions: mass sum_i w_i p_i(k).
 */
class DiscreteMixture extends DiscreteDistribution {
    constructor(components, weights) {
        super()
        this.weights = mixtureWeights(components, weights, DiscreteDistribution)
        this.components = components
    }
    get support() { return mixtureSupport(this.components) }
    _logpmf(k) { return logSumExp(this.components.map((c, i) => Math.log(this.weights[i]) + c._logpmf(k))) }
    _cdf(x) { return mixtureMethods._cdf.call(this, x) }
    _sf(x) { return mixtureMethods._sf.call(this, x) }
    _sample(size) { return mixtureMethods._sample.call(this, size) }
    mean() { return mixtureMethods.mean.call(this) }
    variance() { return mixtureMethods.variance.call(this) }
}

function makeMixture(components, weights) {
    if (Array.isArray(components) && components.length > 0 && components.every((c) => c instanceof DiscreteDistribution)) {
        return new DiscreteMixture(components, weights)
    }
    return new Mixture(components, weights)
}

/**
 * Factories of frozen distributions, scipy.stats style. Parameters use the same names and
 * conventions as the corresponding sampling functions of the library.
 *
 * Most families also have `fit(data, options)`, which returns the distribution with maximum
 * likelihood parameters (scipy's `dist.fit`; families without a location parameter in this
 * library correspond to scipy with `floc=0`): `stats.gamma.fit(data)`. `binomial.fit` and
 * `negativeBinomial.fit` need the known `n`: `stats.binomial.fit(data, { n: 20 })`.
 * Families without `fit`: f, triangular, truncatedNormal, hypergeometric, randint, mixture.
 *
 * @namespace stats
 * @property {function(number=, number=): ContinuousDistribution} normal - normal(loc, scale)
 * @property {function(number=, number=): ContinuousDistribution} uniform - uniform(low, high)
 * @property {function(number=): ContinuousDistribution} exponential - exponential(rate)
 * @property {function(number, number=): ContinuousDistribution} gamma - gamma(shape, scale)
 * @property {function(number): ContinuousDistribution} chisquare - chisquare(df)
 * @property {function(number, number): ContinuousDistribution} beta - beta(a, b)
 * @property {function(number, number=, number=): ContinuousDistribution} studentT - studentT(df, loc, scale)
 * @property {function(number, number): ContinuousDistribution} f - f(dfnum, dfden)
 * @property {function(number=, number=): ContinuousDistribution} lognormal - lognormal(mu, sigma)
 * @property {function(number=, number=): ContinuousDistribution} cauchy - cauchy(loc, scale)
 * @property {function(number=, number=): ContinuousDistribution} laplace - laplace(loc, scale)
 * @property {function(number=, number=): ContinuousDistribution} logistic - logistic(loc, scale)
 * @property {function(number=, number=): ContinuousDistribution} gumbel - gumbel(loc, scale)
 * @property {function(number, number=): ContinuousDistribution} weibull - weibull(shape, scale)
 * @property {function(number, number=): ContinuousDistribution} pareto - pareto(alpha, xm)
 * @property {function(number, number, number): ContinuousDistribution} triangular - triangular(low, high, mode)
 * @property {function(number=): ContinuousDistribution} rayleigh - rayleigh(scale)
 * @property {function(number=, number=, number=, number=): ContinuousDistribution} truncatedNormal - truncatedNormal(loc, scale, low, high)
 * @property {function(number, number): DiscreteDistribution} binomial - binomial(n, p)
 * @property {function(number): DiscreteDistribution} poisson - poisson(lambda)
 * @property {function(number): DiscreteDistribution} geometric - geometric(p), support 1, 2, ...
 * @property {function(number, number): DiscreteDistribution} negativeBinomial - negativeBinomial(n, p)
 * @property {function(number, number, number): DiscreteDistribution} hypergeometric - hypergeometric(ngood, nbad, nsample)
 * @property {function(number): DiscreteDistribution} bernoulli - bernoulli(p)
 * @property {function(number, number): DiscreteDistribution} randint - randint(low, high), high excluded
 * @property {function(Array, number[]): ContinuousDistribution} mixture - mixture(components, weights):
 *   finite mixture of stats distributions (all continuous or all discrete), weights normalised.
 */
const FIT = makeFitters({ Logistic, Gumbel, Cauchy, StudentT })

/**
 * Attaches `fit(data, options)` to a family factory: maximum likelihood estimates of the
 * parameters, returned as a frozen distribution of the family.
 * @template {(...args: any[]) => any} F
 * @param {F} factory
 * @param {function(number[], Object): number[]} fitter
 * @param {number} [min=2] - Minimum number of observations.
 * @returns {F & { fit: (data: ArrayLike<number>, options?: { n?: number }) => ReturnType<F> }}
 * @private
 */
function withFit(factory, fitter, min = 2) {
    return Object.assign(factory, {
        fit: (data, options = {}) => factory(...fitter(toData(data, min), options)),
    })
}

export const stats = Object.freeze({
    normal: withFit((loc, scale) => new Normal(loc, scale), FIT.normal),
    norm: withFit((loc, scale) => new Normal(loc, scale), FIT.normal),
    uniform: withFit((low, high) => new Uniform(low, high), FIT.uniform),
    exponential: withFit((rate) => new Exponential(rate), FIT.exponential, 1),
    gamma: withFit((shape, scale) => new Gamma(shape, scale), FIT.gamma),
    chisquare: withFit((df) => new ChiSquare(df), FIT.chisquare),
    chi2: withFit((df) => new ChiSquare(df), FIT.chisquare),
    beta: withFit((a, b) => new Beta(a, b), FIT.beta),
    studentT: withFit((df, loc, scale) => new StudentT(df, loc, scale), FIT.studentT, 3),
    t: withFit((df, loc, scale) => new StudentT(df, loc, scale), FIT.studentT, 3),
    f: (dfnum, dfden) => new FDist(dfnum, dfden),
    lognormal: withFit((mu, sigma) => new LogNormal(mu, sigma), FIT.lognormal),
    cauchy: withFit((loc, scale) => new Cauchy(loc, scale), FIT.cauchy),
    laplace: withFit((loc, scale) => new Laplace(loc, scale), FIT.laplace),
    logistic: withFit((loc, scale) => new Logistic(loc, scale), FIT.logistic),
    gumbel: withFit((loc, scale) => new Gumbel(loc, scale), FIT.gumbel),
    weibull: withFit((shape, scale) => new Weibull(shape, scale), FIT.weibull),
    pareto: withFit((alpha, xm) => new Pareto(alpha, xm), FIT.pareto),
    triangular: (low, high, mode) => new Triangular(low, high, mode),
    rayleigh: withFit((scale) => new Rayleigh(scale), FIT.rayleigh, 1),
    truncatedNormal: (loc, scale, low, high) => new TruncatedNormal(loc, scale, low, high),
    binomial: withFit((n, p) => new Binomial(n, p), FIT.binomial, 1),
    poisson: withFit((lambda) => new Poisson(lambda), FIT.poisson, 1),
    geometric: withFit((p) => new Geometric(p), FIT.geometric, 1),
    negativeBinomial: withFit((n, p) => new NegativeBinomial(n, p), FIT.negativeBinomial, 1),
    hypergeometric: (ngood, nbad, nsample) => new Hypergeometric(ngood, nbad, nsample),
    bernoulli: withFit((p) => new Bernoulli(p), FIT.bernoulli, 1),
    randint: (low, high) => new DiscreteUniform(low, high),
    mixture: (components, weights) => makeMixture(components, weights),
    erlang: (k, rate = 1) => new Gamma(k, 1 / rate),
    ...FAMILIES,
    // statistical tests and descriptive statistics (scipy.stats names in camelCase)
    kstest,
    ks2samp,
    chisquareTest,
    andersonDarling,
    describe,
    gaussianKde,
})

