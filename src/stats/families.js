/**
 * Frozen distribution objects for the samplers that the core `stats` module does not cover.
 * Parameters follow the sampling function of the same name; each class notes the matching
 * scipy.stats distribution. Cumulative functions are computed on the side that avoids
 * cancellation (closed forms where they are stable, adaptive quadrature of the density or
 * series otherwise), so tail probabilities keep their relative accuracy.
 *
 * @module stats-families
 * @private
 */
import * as samplers from '../distributions.js'
import { ContinuousDistribution, DiscreteDistribution, mapValues } from './base.js'
import {
    logGamma, logBeta, logChoose, gammaP, gammaQ, gammaPInv, betaInc, betaIncInv, gammaFn,
    normalCDF, inverseNormalCDF, erf,
} from './special.js'
import { integrate, logNormalCDF, logBesselI, hurwitzZeta } from './numerics.js'
import { assertFinite, assertPositive, assertNonNegative, assertNonNegativeInteger } from '../functions/util/validate.js'

const LOG_SQRT_2PI = 0.9189385332046728
const EULER = 0.5772156649015329

/**
 * cdf and sf from the density by quadrature, each computed on its own side: the smaller of
 * the two keeps full relative accuracy, the larger is 1 minus it.
 * @private
 */
function tailsByQuadrature(pdf, x, lo, hi) {
    const left = integrate(pdf, lo, x)
    if (left <= 0.5) return [left, 1 - left]
    const right = integrate(pdf, x, hi)
    return [1 - right, right]
}

// ------------------------------------------------------------------- continuous

/** Half-normal: |N(0, 1)| scaled and shifted. scipy: halfnorm(loc, scale). */
export class HalfNormal extends ContinuousDistribution {
    constructor(scale = 1, loc = 0) {
        super()
        assertPositive('scale', scale)
        assertFinite('loc', loc)
        this.scale = scale
        this.loc = loc
    }
    get support() { return [this.loc, Infinity] }
    _logpdf(x) {
        if (x < this.loc) return -Infinity
        const z = (x - this.loc) / this.scale
        return Math.LN2 - 0.5 * z * z - LOG_SQRT_2PI - Math.log(this.scale)
    }
    _cdf(x) { return x <= this.loc ? 0 : erf((x - this.loc) / (this.scale * Math.SQRT2)) }
    _sf(x) { return x <= this.loc ? 1 : 2 * normalCDF(-(x - this.loc) / this.scale) }
    _isf(q) { return q === 0 ? Infinity : this.loc - this.scale * inverseNormalCDF(q / 2) }
    _sample(size) { return samplers.halfNormal(this.scale, this.loc, size) }
    mean() { return this.loc + this.scale * Math.sqrt(2 / Math.PI) }
    variance() { return this.scale * this.scale * (1 - 2 / Math.PI) }
}

/** Maxwell–Boltzmann. scipy: maxwell(scale=scale). */
export class Maxwell extends ContinuousDistribution {
    constructor(scale = 1) {
        super()
        assertPositive('scale', scale)
        this.scale = scale
    }
    get support() { return [0, Infinity] }
    _logpdf(x) {
        if (x < 0) return -Infinity
        const z = x / this.scale
        return 0.5 * Math.log(2 / Math.PI) + 2 * Math.log(z) - z * z / 2 - Math.log(this.scale)
    }
    _cdf(x) { return x <= 0 ? 0 : gammaP(1.5, (x / this.scale) ** 2 / 2) }
    _sf(x) { return x <= 0 ? 1 : gammaQ(1.5, (x / this.scale) ** 2 / 2) }
    _ppf(p) { return p > 0.5 ? this._isf(1 - p) : this.scale * Math.sqrt(2 * gammaPInv(1.5, p)) }
    _isf(q) { return this._isfBySf(q) }
    _sample(size) { return samplers.maxwell(this.scale, size) }
    mean() { return 2 * this.scale * Math.sqrt(2 / Math.PI) }
    variance() { return this.scale * this.scale * (3 * Math.PI - 8) / Math.PI }
}

/** Chi with df degrees of freedom. scipy: chi(df). */
export class Chi extends ContinuousDistribution {
    constructor(df) {
        super()
        assertPositive('df', df)
        this.df = df
    }
    get support() { return [0, Infinity] }
    _logpdf(x) {
        if (x < 0) return -Infinity
        const k = this.df
        return (1 - k / 2) * Math.LN2 - logGamma(k / 2) + (k - 1) * Math.log(x) - x * x / 2
    }
    _cdf(x) { return x <= 0 ? 0 : gammaP(this.df / 2, x * x / 2) }
    _sf(x) { return x <= 0 ? 1 : gammaQ(this.df / 2, x * x / 2) }
    _ppf(p) { return p > 0.5 ? this._isf(1 - p) : Math.sqrt(2 * gammaPInv(this.df / 2, p)) }
    _isf(q) { return this._isfBySf(q) }
    _sample(size) { return samplers.chi(this.df, size) }
    mean() { return Math.SQRT2 * Math.exp(logGamma((this.df + 1) / 2) - logGamma(this.df / 2)) }
    variance() { return this.df - this.mean() ** 2 }
}

/** Nakagami-m with spread omega. scipy: nakagami(nu=m, scale=sqrt(omega)). */
export class Nakagami extends ContinuousDistribution {
    constructor(m, omega = 1) {
        super()
        if (!(m >= 0.5)) throw new Error('m must be >= 0.5.')
        assertPositive('omega', omega)
        this.m = m
        this.omega = omega
    }
    get support() { return [0, Infinity] }
    _logpdf(x) {
        if (x < 0) return -Infinity
        const { m, omega } = this
        return Math.LN2 + m * Math.log(m) - logGamma(m) - m * Math.log(omega) + (2 * m - 1) * Math.log(x) - m * x * x / omega
    }
    _cdf(x) { return x <= 0 ? 0 : gammaP(this.m, this.m * x * x / this.omega) }
    _sf(x) { return x <= 0 ? 1 : gammaQ(this.m, this.m * x * x / this.omega) }
    _ppf(p) { return p > 0.5 ? this._isf(1 - p) : Math.sqrt(this.omega * gammaPInv(this.m, p) / this.m) }
    _isf(q) { return this._isfBySf(q) }
    _sample(size) { return samplers.nakagami(this.m, this.omega, size) }
    mean() { return Math.exp(logGamma(this.m + 0.5) - logGamma(this.m)) * Math.sqrt(this.omega / this.m) }
    variance() { return this.omega - this.mean() ** 2 }
}

/** Lévy (one-sided stable, α = 1/2). scipy: levy(loc, scale). */
export class Levy extends ContinuousDistribution {
    constructor(loc = 0, scale = 1) {
        super()
        assertFinite('loc', loc)
        assertPositive('scale', scale)
        this.loc = loc
        this.scale = scale
    }
    get support() { return [this.loc, Infinity] }
    _logpdf(x) {
        const y = x - this.loc
        if (y <= 0) return -Infinity
        return 0.5 * Math.log(this.scale) - LOG_SQRT_2PI - 1.5 * Math.log(y) - this.scale / (2 * y)
    }
    _cdf(x) { return x <= this.loc ? 0 : 2 * normalCDF(-Math.sqrt(this.scale / (x - this.loc))) }
    _sf(x) { return x <= this.loc ? 1 : erf(Math.sqrt(this.scale / (2 * (x - this.loc)))) }
    _ppf(p) { return p === 0 ? this.loc : this.loc + this.scale / inverseNormalCDF(p / 2) ** 2 }
    _isf(q) { return this._isfBySf(q) }
    _sample(size) { return samplers.levy(this.loc, this.scale, size) }
    mean() { return Infinity }
    variance() { return Infinity }
}

/** Fréchet (inverse Weibull). scipy: invweibull(alpha, loc, scale). */
export class Frechet extends ContinuousDistribution {
    constructor(alpha, scale = 1, loc = 0) {
        super()
        assertPositive('alpha', alpha)
        assertPositive('scale', scale)
        assertFinite('loc', loc)
        this.alpha = alpha
        this.scale = scale
        this.loc = loc
    }
    get support() { return [this.loc, Infinity] }
    _logpdf(x) {
        const z = (x - this.loc) / this.scale
        if (z <= 0) return -Infinity
        return Math.log(this.alpha / this.scale) - (1 + this.alpha) * Math.log(z) - Math.pow(z, -this.alpha)
    }
    _cdf(x) { return x <= this.loc ? 0 : Math.exp(-Math.pow((x - this.loc) / this.scale, -this.alpha)) }
    _sf(x) { return x <= this.loc ? 1 : -Math.expm1(-Math.pow((x - this.loc) / this.scale, -this.alpha)) }
    _ppf(p) { return this.loc + this.scale * Math.pow(-Math.log(p), -1 / this.alpha) }
    _isf(q) { return this.loc + this.scale * Math.pow(-Math.log1p(-q), -1 / this.alpha) }
    _sample(size) { return samplers.frechet(this.alpha, this.scale, this.loc, size) }
    mean() { return this.alpha > 1 ? this.loc + this.scale * gammaFn(1 - 1 / this.alpha) : Infinity }
    variance() {
        const a = this.alpha
        return a > 2 ? this.scale ** 2 * (gammaFn(1 - 2 / a) - gammaFn(1 - 1 / a) ** 2) : Infinity
    }
}

/** Log-logistic (Fisk). scipy: fisk(c, scale=scale). */
export class LogLogistic extends ContinuousDistribution {
    constructor(c, scale = 1) {
        super()
        assertPositive('c', c)
        assertPositive('scale', scale)
        this.c = c
        this.scale = scale
    }
    get support() { return [0, Infinity] }
    _logpdf(x) {
        if (x <= 0) return -Infinity
        const lz = Math.log(x / this.scale)
        const c = this.c
        // log(1 + z^c) computed without overflow
        const l1p = c * lz > 0 ? c * lz + Math.log1p(Math.exp(-c * lz)) : Math.log1p(Math.exp(c * lz))
        return Math.log(c / this.scale) + (c - 1) * lz - 2 * l1p
    }
    _cdf(x) { return x <= 0 ? 0 : 1 / (1 + Math.pow(x / this.scale, -this.c)) }
    _sf(x) { return x <= 0 ? 1 : 1 / (1 + Math.pow(x / this.scale, this.c)) }
    _ppf(p) { return this.scale * Math.pow(p / (1 - p), 1 / this.c) }
    _isf(q) { return this.scale * Math.pow((1 - q) / q, 1 / this.c) }
    _sample(size) { return samplers.logLogistic(this.c, this.scale, size) }
    mean() {
        const b = Math.PI / this.c
        return this.c > 1 ? this.scale * b / Math.sin(b) : Infinity
    }
    variance() {
        const b = Math.PI / this.c
        return this.c > 2 ? this.scale ** 2 * (2 * b / Math.sin(2 * b) - b * b / Math.sin(b) ** 2) : Infinity
    }
}

/** Kumaraswamy on [0, 1] (no scipy equivalent; closed forms). */
export class Kumaraswamy extends ContinuousDistribution {
    constructor(a, b) {
        super()
        assertPositive('a', a)
        assertPositive('b', b)
        this.a = a
        this.b = b
    }
    get support() { return [0, 1] }
    _logpdf(x) {
        if (x <= 0 || x >= 1) return -Infinity
        const { a, b } = this
        return Math.log(a * b) + (a - 1) * Math.log(x) + (b - 1) * Math.log1p(-Math.pow(x, a))
    }
    _cdf(x) { return x <= 0 ? 0 : x >= 1 ? 1 : -Math.expm1(this.b * Math.log1p(-Math.pow(x, this.a))) }
    _sf(x) { return x <= 0 ? 1 : x >= 1 ? 0 : Math.exp(this.b * Math.log1p(-Math.pow(x, this.a))) }
    _ppf(p) { return Math.pow(-Math.expm1(Math.log1p(-p) / this.b), 1 / this.a) }
    _isf(q) { return Math.pow(-Math.expm1(Math.log(q) / this.b), 1 / this.a) }
    _sample(size) { return samplers.kumaraswamy(this.a, this.b, size) }
    _moment(r) { return this.b * Math.exp(logBeta(1 + r / this.a, this.b)) }
    mean() { return this._moment(1) }
    variance() { return this._moment(2) - this._moment(1) ** 2 }
}

/** Beta prime (beta of the second kind). scipy: betaprime(a, b). */
export class BetaPrime extends ContinuousDistribution {
    constructor(a, b) {
        super()
        assertPositive('a', a)
        assertPositive('b', b)
        this.a = a
        this.b = b
    }
    get support() { return [0, Infinity] }
    _logpdf(x) {
        if (x <= 0) return -Infinity
        return (this.a - 1) * Math.log(x) - (this.a + this.b) * Math.log1p(x) - logBeta(this.a, this.b)
    }
    _cdf(x) { return x <= 0 ? 0 : betaInc(x / (1 + x), this.a, this.b) }
    _sf(x) { return x <= 0 ? 1 : betaInc(1 / (1 + x), this.b, this.a) }
    _ppf(p) {
        if (p > 0.5) return this._isf(1 - p)
        const y = betaIncInv(p, this.a, this.b)
        return y / (1 - y)
    }
    _isf(q) {
        if (q > 0.5) return this._ppf(1 - q)
        const y = betaIncInv(q, this.b, this.a)
        return (1 - y) / y
    }
    _sample(size) { return samplers.betaPrime(this.a, this.b, size) }
    mean() { return this.b > 1 ? this.a / (this.b - 1) : Infinity }
    variance() {
        const { a, b } = this
        return b > 2 ? a * (a + b - 1) / ((b - 2) * (b - 1) ** 2) : Infinity
    }
}

/** Inverse gamma. scipy: invgamma(shape, scale=scale). */
export class InverseGamma extends ContinuousDistribution {
    constructor(shape, scale = 1) {
        super()
        assertPositive('shape', shape)
        assertPositive('scale', scale)
        this.shape = shape
        this.scale = scale
    }
    get support() { return [0, Infinity] }
    _logpdf(x) {
        if (x <= 0) return -Infinity
        const { shape: a, scale: s } = this
        return a * Math.log(s) - logGamma(a) - (a + 1) * Math.log(x) - s / x
    }
    _cdf(x) { return x <= 0 ? 0 : gammaQ(this.shape, this.scale / x) }
    _sf(x) { return x <= 0 ? 1 : gammaP(this.shape, this.scale / x) }
    _ppf(p) { return p > 0.5 ? this._isf(1 - p) : super._ppf(p) }
    _isf(q) { return q === 0 ? Infinity : this.scale / gammaPInv(this.shape, q) }
    _sample(size) { return samplers.inverseGamma(this.shape, this.scale, size) }
    mean() { return this.shape > 1 ? this.scale / (this.shape - 1) : Infinity }
    variance() {
        const a = this.shape
        return a > 2 ? this.scale ** 2 / ((a - 1) ** 2 * (a - 2)) : Infinity
    }
}

/** Log-uniform (reciprocal). scipy: loguniform(low, high). */
export class LogUniform extends ContinuousDistribution {
    constructor(low, high) {
        super()
        assertPositive('low', low)
        if (!(high > low)) throw new Error('high must be > low.')
        this.low = low
        this.high = high
        this.la = Math.log(low)
        this.span = Math.log(high) - this.la
    }
    get support() { return [this.low, this.high] }
    _logpdf(x) { return x < this.low || x > this.high ? -Infinity : -Math.log(x) - Math.log(this.span) }
    _cdf(x) { return x <= this.low ? 0 : x >= this.high ? 1 : (Math.log(x) - this.la) / this.span }
    _sf(x) { return x <= this.low ? 1 : x >= this.high ? 0 : (this.la + this.span - Math.log(x)) / this.span }
    _ppf(p) { return Math.exp(this.la + p * this.span) }
    _isf(q) { return Math.exp(this.la + this.span - q * this.span) }
    _sample(size) { return samplers.loguniform(this.low, this.high, size) }
    mean() { return (this.high - this.low) / this.span }
    variance() { return (this.high ** 2 - this.low ** 2) / (2 * this.span) - this.mean() ** 2 }
}

/** Wigner semicircle on [-radius, radius]. scipy: semicircular(scale=radius). */
export class Semicircle extends ContinuousDistribution {
    constructor(radius = 1) {
        super()
        assertPositive('radius', radius)
        this.radius = radius
    }
    get support() { return [-this.radius, this.radius] }
    _logpdf(x) {
        const r = this.radius
        if (Math.abs(x) >= r) return -Infinity
        return Math.log(2 / (Math.PI * r * r)) + 0.5 * Math.log((r - x) * (r + x))
    }
    _cdf(x) {
        const z = x / this.radius
        if (z <= -1) return 0
        if (z >= 1) return 1
        return 0.5 + (z * Math.sqrt(1 - z * z) + Math.asin(z)) / Math.PI
    }
    _sf(x) { return this._cdf(-x) }
    _isf(q) { return -this._ppf(q) }
    _sample(size) { return samplers.semicircle(this.radius, size) }
    mean() { return 0 }
    variance() { return this.radius ** 2 / 4 }
}

/** Burr type XII. scipy: burr12(c, d, scale=scale). */
export class Burr12 extends ContinuousDistribution {
    constructor(c, d, scale = 1) {
        super()
        assertPositive('c', c)
        assertPositive('d', d)
        assertPositive('scale', scale)
        this.c = c
        this.d = d
        this.scale = scale
    }
    get support() { return [0, Infinity] }
    _l1pzc(x) {
        const lz = this.c * Math.log(x / this.scale)
        return lz > 0 ? lz + Math.log1p(Math.exp(-lz)) : Math.log1p(Math.exp(lz))
    }
    _logpdf(x) {
        if (x <= 0) return -Infinity
        const { c, d, scale } = this
        return Math.log(c * d / scale) + (c - 1) * Math.log(x / scale) - (d + 1) * this._l1pzc(x)
    }
    _cdf(x) { return x <= 0 ? 0 : -Math.expm1(-this.d * this._l1pzc(x)) }
    _sf(x) { return x <= 0 ? 1 : Math.exp(-this.d * this._l1pzc(x)) }
    _ppf(p) { return this.scale * Math.pow(Math.expm1(-Math.log1p(-p) / this.d), 1 / this.c) }
    _isf(q) { return this.scale * Math.pow(Math.expm1(-Math.log(q) / this.d), 1 / this.c) }
    _sample(size) { return samplers.burr12(this.c, this.d, this.scale, size) }
    _moment(r) {
        const { c, d } = this
        return c * d > r ? this.scale ** r * d * Math.exp(logBeta(d - r / c, 1 + r / c)) : Infinity
    }
    mean() { return this._moment(1) }
    variance() { return this._moment(2) - this._moment(1) ** 2 }
}

/** Generalized extreme value, xi = shape (xi > 0: Fréchet type). scipy: genextreme(c=-xi, loc, scale). */
export class GeneralizedExtremeValue extends ContinuousDistribution {
    constructor(xi = 0, loc = 0, scale = 1) {
        super()
        assertFinite('xi', xi)
        assertFinite('loc', loc)
        assertPositive('scale', scale)
        this.xi = xi
        this.loc = loc
        this.scale = scale
    }
    get support() {
        const { xi, loc, scale } = this
        if (xi > 0) return [loc - scale / xi, Infinity]
        if (xi < 0) return [-Infinity, loc - scale / xi]
        return [-Infinity, Infinity]
    }
    /** -log t(x), where cdf = exp(-t): z for xi = 0, log1p(xi z) / xi otherwise. */
    _mlogt(x) {
        const z = (x - this.loc) / this.scale
        return this.xi === 0 ? z : Math.log1p(this.xi * z) / this.xi
    }
    _inSupport(x) {
        const [lo, hi] = this.support
        return x > lo && x < hi
    }
    _logpdf(x) {
        if (!this._inSupport(x)) return -Infinity
        const m = this._mlogt(x)
        return -Math.log(this.scale) - (1 + this.xi) * m - Math.exp(-m)
    }
    _cdf(x) {
        const [lo, hi] = this.support
        if (x <= lo) return 0
        if (x >= hi) return 1
        return Math.exp(-Math.exp(-this._mlogt(x)))
    }
    _sf(x) {
        const [lo, hi] = this.support
        if (x <= lo) return 1
        if (x >= hi) return 0
        return -Math.expm1(-Math.exp(-this._mlogt(x)))
    }
    _fromT(lt) {
        // t = exp(lt) = -log cdf; x = loc + scale (t^(-xi) - 1) / xi
        const { xi } = this
        return this.loc + this.scale * (xi === 0 ? -lt : Math.expm1(-xi * lt) / xi)
    }
    _ppf(p) { return this._fromT(Math.log(-Math.log(p))) }
    _isf(q) { return this._fromT(Math.log(-Math.log1p(-q))) }
    _sample(size) { return samplers.generalizedExtremeValue(this.xi, this.loc, this.scale, size) }
    mean() {
        const { xi } = this
        if (xi >= 1) return Infinity
        return this.loc + this.scale * (xi === 0 ? EULER : (gammaFn(1 - xi) - 1) / xi)
    }
    variance() {
        const { xi } = this
        if (xi >= 0.5) return Infinity
        if (xi === 0) return this.scale ** 2 * Math.PI ** 2 / 6
        return this.scale ** 2 * (gammaFn(1 - 2 * xi) - gammaFn(1 - xi) ** 2) / (xi * xi)
    }
}

/** Generalized Pareto, xi = shape. scipy: genpareto(c=xi, loc, scale). */
export class GeneralizedPareto extends ContinuousDistribution {
    constructor(xi = 0, loc = 0, scale = 1) {
        super()
        assertFinite('xi', xi)
        assertFinite('loc', loc)
        assertPositive('scale', scale)
        this.xi = xi
        this.loc = loc
        this.scale = scale
    }
    get support() {
        return [this.loc, this.xi < 0 ? this.loc - this.scale / this.xi : Infinity]
    }
    /** -log sf for x in the support. */
    _h(x) {
        const z = (x - this.loc) / this.scale
        return this.xi === 0 ? z : Math.log1p(this.xi * z) / this.xi
    }
    _logpdf(x) {
        const [lo, hi] = this.support
        if (x < lo || x > hi) return -Infinity
        const z = (x - this.loc) / this.scale
        if (this.xi === 0) return -Math.log(this.scale) - z
        return -Math.log(this.scale) - (1 + 1 / this.xi) * Math.log1p(this.xi * z)
    }
    _cdf(x) {
        const [lo, hi] = this.support
        return x <= lo ? 0 : x >= hi ? 1 : -Math.expm1(-this._h(x))
    }
    _sf(x) {
        const [lo, hi] = this.support
        return x <= lo ? 1 : x >= hi ? 0 : Math.exp(-this._h(x))
    }
    _fromH(h) {
        const { xi } = this
        return this.loc + this.scale * (xi === 0 ? h : Math.expm1(xi * h) / xi)
    }
    _ppf(p) { return this._fromH(-Math.log1p(-p)) }
    _isf(q) { return this._fromH(-Math.log(q)) }
    _sample(size) { return samplers.generalizedPareto(this.xi, this.loc, this.scale, size) }
    mean() { return this.xi < 1 ? this.loc + this.scale / (1 - this.xi) : Infinity }
    variance() {
        const { xi } = this
        return xi < 0.5 ? this.scale ** 2 / ((1 - xi) ** 2 * (1 - 2 * xi)) : Infinity
    }
}

/** Skew-normal (Azzalini). scipy: skewnorm(a=shape, loc, scale). */
export class SkewNormal extends ContinuousDistribution {
    constructor(loc = 0, scale = 1, shape = 0) {
        super()
        assertFinite('loc', loc)
        assertPositive('scale', scale)
        assertFinite('shape', shape)
        this.loc = loc
        this.scale = scale
        this.shape = shape
        this.delta = shape / Math.sqrt(1 + shape * shape)
    }
    _logpdf(x) {
        const z = (x - this.loc) / this.scale
        return Math.LN2 - 0.5 * z * z - LOG_SQRT_2PI + logNormalCDF(this.shape * z) - Math.log(this.scale)
    }
    _tails(x) {
        const a = this.shape
        const std = (t) => 2 * Math.exp(-0.5 * t * t + logNormalCDF(a * t) - LOG_SQRT_2PI)
        return tailsByQuadrature(std, (x - this.loc) / this.scale, -Infinity, Infinity)
    }
    _cdf(x) { return this._tails(x)[0] }
    _sf(x) { return this._tails(x)[1] }
    _isf(q) { return this._isfBySf(q) }
    _sample(size) { return samplers.skewNormal(this.loc, this.scale, this.shape, size) }
    mean() { return this.loc + this.scale * this.delta * Math.sqrt(2 / Math.PI) }
    variance() { return this.scale ** 2 * (1 - 2 * this.delta ** 2 / Math.PI) }
}

/** Exponentially modified Gaussian. scipy: exponnorm(K=1/(sigma lambda), loc=mu, scale=sigma). */
export class ExGaussian extends ContinuousDistribution {
    constructor(mu = 0, sigma = 1, lambda = 1) {
        super()
        assertFinite('mu', mu)
        assertPositive('sigma', sigma)
        assertPositive('lambda', lambda)
        this.mu = mu
        this.sigma = sigma
        this.lambda = lambda
    }
    /** log of exp(-λ(x-μ) + λ²σ²/2) Φ(z - λσ), the exponential component. */
    _logExpTerm(x) {
        const { mu, sigma, lambda } = this
        const z = (x - mu) / sigma
        return -lambda * (x - mu) + lambda * lambda * sigma * sigma / 2 + logNormalCDF(z - lambda * sigma)
    }
    _logpdf(x) { return Math.log(this.lambda) + this._logExpTerm(x) }
    _sf(x) {
        // both terms are positive: no cancellation in the upper tail
        return normalCDF(-(x - this.mu) / this.sigma) + Math.exp(this._logExpTerm(x))
    }
    _cdf(x) {
        const sf = this._sf(x)
        if (sf < 0.5) return 1 - sf
        return integrate((t) => Math.exp(this._logpdf(t)), -Infinity, x)
    }
    _isf(q) { return this._isfBySf(q) }
    _sample(size) { return samplers.exGaussian(this.mu, this.sigma, this.lambda, size) }
    mean() { return this.mu + 1 / this.lambda }
    variance() { return this.sigma ** 2 + 1 / this.lambda ** 2 }
}

/** Power function on [0, 1], density a x^(a-1). scipy: powerlaw(a). */
export class PowerLaw extends ContinuousDistribution {
    constructor(a) {
        super()
        assertPositive('a', a)
        this.a = a
    }
    get support() { return [0, 1] }
    _logpdf(x) { return x <= 0 || x > 1 ? -Infinity : Math.log(this.a) + (this.a - 1) * Math.log(x) }
    _cdf(x) { return x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(x, this.a) }
    _sf(x) { return x <= 0 ? 1 : x >= 1 ? 0 : -Math.expm1(this.a * Math.log(x)) }
    _ppf(p) { return Math.pow(p, 1 / this.a) }
    _isf(q) { return Math.exp(Math.log1p(-q) / this.a) }
    _sample(size) { return samplers.power(this.a, size) }
    mean() { return this.a / (this.a + 1) }
    variance() { return this.a / ((this.a + 1) ** 2 * (this.a + 2)) }
}

/** Wald (inverse Gaussian) with mean and shape `scale`. scipy: invgauss(mu=mean/scale, scale=scale). */
export class Wald extends ContinuousDistribution {
    constructor(mean, scale) {
        super()
        assertPositive('mean', mean)
        assertPositive('scale', scale)
        this.mu = mean
        this.lambda = scale
    }
    get support() { return [0, Infinity] }
    _logpdf(x) {
        if (x <= 0) return -Infinity
        const { mu, lambda } = this
        return 0.5 * Math.log(lambda / (2 * Math.PI * x ** 3)) - lambda * (x - mu) ** 2 / (2 * mu * mu * x)
    }
    _cdf(x) {
        if (x <= 0) return 0
        const { mu, lambda } = this
        const r = Math.sqrt(lambda / x)
        const c = normalCDF(r * (x / mu - 1)) + Math.exp(2 * lambda / mu + logNormalCDF(-r * (x / mu + 1)))
        if (c <= 0.5) return c
        return 1 - integrate((t) => Math.exp(this._logpdf(t)), x, Infinity)
    }
    _sf(x) {
        if (x <= 0) return 1
        const c = this._cdf(x)
        if (c < 0.5) return 1 - c
        return integrate((t) => Math.exp(this._logpdf(t)), x, Infinity)
    }
    _isf(q) { return this._isfBySf(q) }
    _sample(size) { return samplers.wald(this.mu, this.lambda, size) }
    mean() { return this.mu }
    variance() { return this.mu ** 3 / this.lambda }
}

/** Von Mises on [mu - π, mu + π]. scipy: vonmises(kappa, loc=mu). */
export class VonMises extends ContinuousDistribution {
    constructor(mu, kappa) {
        super()
        assertFinite('mu', mu)
        assertNonNegative('kappa', kappa)
        this.mu = mu
        this.kappa = kappa
        // log(2π I0(κ)) - κ, for a density written as exp(κ (cos - 1)) / (2π I0(κ) e^-κ)
        this.logNorm = Math.log(2 * Math.PI) + logBesselI(0, kappa) - kappa
    }
    get support() { return [this.mu - Math.PI, this.mu + Math.PI] }
    _logpdf(x) {
        const d = x - this.mu
        if (Math.abs(d) > Math.PI) return -Infinity
        return this.kappa * (Math.cos(d) - 1) - this.logNorm
    }
    _cdf(x) {
        const [lo, hi] = this.support
        if (x <= lo) return 0
        if (x >= hi) return 1
        const f = (t) => Math.exp(this._logpdf(t))
        // integrate from the nearer end; the density is symmetric about mu
        return x <= this.mu ? integrate(f, lo, x) : 1 - integrate(f, x, hi)
    }
    _sf(x) { return this._cdf(2 * this.mu - x) }
    _isf(q) { return 2 * this.mu - this._ppf(q) }
    _sample(size) {
        // the sampler wraps to [-π, π] like numpy; map into this object's support
        const wrap = (v) => this.mu + (((v - this.mu + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
        return mapValues(samplers.vonmises(this.mu, this.kappa, size), wrap)
    }
    mean() { return this.mu }
    variance() {
        // linear variance on the support (as scipy.stats.vonmises.var)
        return integrate((t) => t * t * Math.exp(this._logpdf(this.mu + t)), -Math.PI, Math.PI)
    }
}

/** Noncentral chi-square: Poisson(nonc/2) mixture of chi-squares. scipy: ncx2(df, nc). */
export class NoncentralChisquare extends ContinuousDistribution {
    constructor(df, nonc) {
        super()
        assertPositive('df', df)
        assertNonNegative('nonc', nonc)
        this.df = df
        this.nonc = nonc
    }
    get support() { return [0, Infinity] }
    /** Σ_j w_j term(j) over the Poisson(nonc/2) weights, summed outwards from the mode. */
    _mix(term) {
        const h = this.nonc / 2
        if (h === 0) return term(0)
        const logw = (j) => -h + j * Math.log(h) - logGamma(j + 1)
        const mode = Math.floor(h)
        let sum = 0
        for (let j = mode; ; j++) {
            const w = Math.exp(logw(j))
            const t = w * term(j)
            sum += t
            if (w < 1e-17 && j > h) break
        }
        for (let j = mode - 1; j >= 0; j--) {
            const w = Math.exp(logw(j))
            sum += w * term(j)
            if (w < 1e-17) break
        }
        return sum
    }
    _logpdf(x) {
        if (x <= 0) return x === 0 && this.df < 2 ? Infinity : (x === 0 && this.df === 2 ? Math.log(0.5 * Math.exp(-this.nonc / 2)) : -Infinity)
        const y = x / 2
        const dens = this._mix((j) => {
            const a = this.df / 2 + j
            return Math.exp((a - 1) * Math.log(y) - y - logGamma(a)) / 2
        })
        return Math.log(dens)
    }
    _cdf(x) { return x <= 0 ? 0 : Math.min(1, this._mix((j) => gammaP(this.df / 2 + j, x / 2))) }
    _sf(x) { return x <= 0 ? 1 : Math.min(1, this._mix((j) => gammaQ(this.df / 2 + j, x / 2))) }
    _isf(q) { return this._isfBySf(q) }
    _sample(size) { return samplers.noncentralChisquare(this.df, this.nonc, size) }
    mean() { return this.df + this.nonc }
    variance() { return 2 * (this.df + 2 * this.nonc) }
}

/** Noncentral F. scipy: ncf(dfn, dfd, nc). */
export class NoncentralF extends ContinuousDistribution {
    constructor(dfnum, dfden, nonc) {
        super()
        assertPositive('dfnum', dfnum)
        assertPositive('dfden', dfden)
        assertNonNegative('nonc', nonc)
        this.d1 = dfnum
        this.d2 = dfden
        this.nonc = nonc
        this.mixer = new NoncentralChisquare(1, nonc)
    }
    get support() { return [0, Infinity] }
    _logpdf(x) {
        if (x <= 0) return -Infinity
        const { d1, d2 } = this
        const y = d1 * x / (d1 * x + d2)
        const ly = Math.log(y)
        const l1y = Math.log(d2 / (d1 * x + d2))
        const jac = Math.log(d1 * d2) - 2 * Math.log(d1 * x + d2)
        const dens = this.mixer._mix((j) => {
            const a = d1 / 2 + j
            const b = d2 / 2
            return Math.exp((a - 1) * ly + (b - 1) * l1y - logBeta(a, b) + jac)
        })
        return Math.log(dens)
    }
    _cdf(x) {
        if (x <= 0) return 0
        const { d1, d2 } = this
        const y = d1 * x / (d1 * x + d2)
        const cy = d2 / (d1 * x + d2)
        return Math.min(1, this.mixer._mix((j) => (y <= 0.5 ? betaInc(y, d1 / 2 + j, d2 / 2) : 1 - betaInc(cy, d2 / 2, d1 / 2 + j))))
    }
    _sf(x) {
        if (x <= 0) return 1
        const { d1, d2 } = this
        const y = d1 * x / (d1 * x + d2)
        const cy = d2 / (d1 * x + d2)
        return Math.min(1, this.mixer._mix((j) => (cy <= 0.5 ? betaInc(cy, d2 / 2, d1 / 2 + j) : 1 - betaInc(y, d1 / 2 + j, d2 / 2))))
    }
    _isf(q) { return this._isfBySf(q) }
    _sample(size) { return samplers.noncentralF(this.d1, this.d2, this.nonc, size) }
    mean() {
        const { d1, d2, nonc } = this
        return d2 > 2 ? d2 * (d1 + nonc) / (d1 * (d2 - 2)) : Infinity
    }
    variance() {
        const { d1, d2, nonc } = this
        if (d2 <= 4) return Infinity
        return 2 * (d2 / d1) ** 2 * ((d1 + nonc) ** 2 + (d1 + 2 * nonc) * (d2 - 2)) / ((d2 - 2) ** 2 * (d2 - 4))
    }
}

// --------------------------------------------------------------------- discrete

/** Logarithmic series on 1, 2, .... scipy: logser(p). */
export class LogSeries extends DiscreteDistribution {
    constructor(p) {
        super()
        if (!(p > 0 && p < 1)) throw new Error('p must be in (0, 1).')
        this.p = p
        this.c = -1 / Math.log1p(-p)
    }
    get support() { return [1, Infinity] }
    _logpmf(k) { return k < 1 ? -Infinity : Math.log(this.c) + k * Math.log(this.p) - Math.log(k) }
    _sample(size) { return samplers.logseries(this.p, size) }
    mean() { return this.c * this.p / (1 - this.p) }
    variance() {
        const { p, c } = this
        return c * p * (1 - c * p) / (1 - p) ** 2
    }
}

/** Zipf (zeta) on 1, 2, ..., a > 1. scipy: zipf(a). */
export class Zipf extends DiscreteDistribution {
    constructor(a) {
        super()
        if (!(a > 1)) throw new Error('a must be > 1.')
        this.a = a
        this.logZeta = Math.log(hurwitzZeta(a, 1))
    }
    get support() { return [1, Infinity] }
    _logpmf(k) { return k < 1 ? -Infinity : -this.a * Math.log(k) - this.logZeta }
    _sf(x) {
        const k = Math.floor(x)
        return k < 1 ? 1 : Math.exp(Math.log(hurwitzZeta(this.a, k + 1)) - this.logZeta)
    }
    _cdf(x) {
        const k = Math.floor(x)
        if (k < 1) return 0
        const sf = this._sf(k)
        return sf < 0.5 ? 1 - sf : super._cdf(k)
    }
    _sample(size) { return samplers.zipf(this.a, size) }
    mean() { return this.a > 2 ? hurwitzZeta(this.a - 1, 1) / Math.exp(this.logZeta) : Infinity }
    variance() {
        if (this.a <= 3) return Infinity
        return hurwitzZeta(this.a - 2, 1) / Math.exp(this.logZeta) - this.mean() ** 2
    }
}

/** Skellam: difference of two independent Poissons. scipy: skellam(mu1, mu2). */
export class Skellam extends DiscreteDistribution {
    constructor(mu1, mu2) {
        super()
        assertPositive('mu1', mu1)
        assertPositive('mu2', mu2)
        this.mu1 = mu1
        this.mu2 = mu2
    }
    get support() { return [-Infinity, Infinity] }
    _logpmf(k) {
        const { mu1, mu2 } = this
        return -(mu1 + mu2) + k / 2 * Math.log(mu1 / mu2) + logBesselI(Math.abs(k), 2 * Math.sqrt(mu1 * mu2))
    }
    // cdf and sf through the noncentral chi-square, as scipy
    _cdf(x) {
        const k = Math.floor(x)
        const { mu1, mu2 } = this
        if (k < 0) return new NoncentralChisquare(-2 * k, 2 * mu1)._cdf(2 * mu2)
        return new NoncentralChisquare(2 * (k + 1), 2 * mu2)._sf(2 * mu1)
    }
    _sf(x) {
        const k = Math.floor(x)
        const { mu1, mu2 } = this
        if (k < 0) return new NoncentralChisquare(-2 * k, 2 * mu1)._sf(2 * mu2)
        return new NoncentralChisquare(2 * (k + 1), 2 * mu2)._cdf(2 * mu1)
    }
    _sample(size) { return samplers.skellam(this.mu1, this.mu2, size) }
    mean() { return this.mu1 - this.mu2 }
    variance() { return this.mu1 + this.mu2 }
}

/** Beta-binomial. scipy: betabinom(n, a, b). */
export class BetaBinomial extends DiscreteDistribution {
    constructor(n, a, b) {
        super()
        assertNonNegativeInteger('n', n)
        assertPositive('a', a)
        assertPositive('b', b)
        this.n = n
        this.a = a
        this.b = b
    }
    get support() { return [0, this.n] }
    _logpmf(k) {
        const { n, a, b } = this
        if (k < 0 || k > n) return -Infinity
        return logChoose(n, k) + logBeta(k + a, n - k + b) - logBeta(a, b)
    }
    _sf(x) {
        const k = Math.floor(x)
        if (k < 0) return 1
        if (k >= this.n) return 0
        let s = 0
        for (let i = this.n; i > k; i--) s += Math.exp(this._logpmf(i))
        return Math.min(1, s)
    }
    _sample(size) { return samplers.betaBinomial(this.n, this.a, this.b, size) }
    mean() { return this.n * this.a / (this.a + this.b) }
    variance() {
        const { n, a, b } = this
        return n * a * b * (a + b + n) / ((a + b) ** 2 * (a + b + 1))
    }
}

/** Factories, merged into `stats`. */
export const FAMILIES = {
    halfNormal: (scale, loc) => new HalfNormal(scale, loc),
    maxwell: (scale) => new Maxwell(scale),
    chi: (df) => new Chi(df),
    nakagami: (m, omega) => new Nakagami(m, omega),
    levy: (loc, scale) => new Levy(loc, scale),
    frechet: (alpha, scale, loc) => new Frechet(alpha, scale, loc),
    logLogistic: (c, scale) => new LogLogistic(c, scale),
    kumaraswamy: (a, b) => new Kumaraswamy(a, b),
    betaPrime: (a, b) => new BetaPrime(a, b),
    inverseGamma: (shape, scale) => new InverseGamma(shape, scale),
    loguniform: (low, high) => new LogUniform(low, high),
    semicircle: (radius) => new Semicircle(radius),
    burr12: (c, d, scale) => new Burr12(c, d, scale),
    generalizedExtremeValue: (xi, loc, scale) => new GeneralizedExtremeValue(xi, loc, scale),
    generalizedPareto: (xi, loc, scale) => new GeneralizedPareto(xi, loc, scale),
    skewNormal: (loc, scale, shape) => new SkewNormal(loc, scale, shape),
    exGaussian: (mu, sigma, lambda) => new ExGaussian(mu, sigma, lambda),
    power: (a) => new PowerLaw(a),
    wald: (mean, scale) => new Wald(mean, scale),
    vonmises: (mu, kappa) => new VonMises(mu, kappa),
    noncentralChisquare: (df, nonc) => new NoncentralChisquare(df, nonc),
    noncentralF: (dfnum, dfden, nonc) => new NoncentralF(dfnum, dfden, nonc),
    logseries: (p) => new LogSeries(p),
    zipf: (a) => new Zipf(a),
    skellam: (mu1, mu2) => new Skellam(mu1, mu2),
    betaBinomial: (n, a, b) => new BetaBinomial(n, a, b),
}
