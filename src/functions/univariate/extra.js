/**
 * Distributions beyond numpy.random, mostly from scipy.stats.
 * @module extra-distributions
 */
import { rand, randOpen } from '../../core/state.js'
import {
    standardNormal as sNormal,
    standardExponential as sExponential,
    standardGamma as sGamma,
    betaSample,
    poissonSample,
    binomialSample,
} from '../../core/samplers.js'
import { baseGenerator, normalizeSize, fillShape } from '../base-generator.js'
import {
    assertNumber,
    assertFinite,
    assertPositive,
    assertNonNegative,
    assertNonNegativeInteger,
    assertPositiveInteger,
} from '../util/validate.js'

const SQRT_2PI = Math.sqrt(2 * Math.PI)

/** Truncated standard normal on [a, b] with 0 <= a < b (Robert, 1995/2009). */
function truncatedTail(a, b) {
    const sqrtTerm = Math.sqrt(a * a + 4)
    const alpha = (a + sqrtTerm) / 2
    const useExponential = b === Infinity ||
        b > a + 2 * Math.sqrt(Math.E) / (a + sqrtTerm) * Math.exp((a * a - a * sqrtTerm) / 4)
    if (useExponential) {
        for (;;) {
            const z = a + sExponential() / alpha
            if (z > b) {
                continue
            }
            if (Math.log(randOpen()) <= -(z - alpha) * (z - alpha) / 2) {
                return z
            }
        }
    }
    for (;;) {
        const z = a + (b - a) * rand()
        if (Math.log(randOpen()) <= (a * a - z * z) / 2) {
            return z
        }
    }
}

function truncatedStandard(a, b) {
    if (a >= 0) {
        return truncatedTail(a, b)
    }
    if (b <= 0) {
        return -truncatedTail(-b, -a)
    }
    if (b - a >= SQRT_2PI) {
        for (;;) {
            const z = sNormal()
            if (z >= a && z <= b) {
                return z
            }
        }
    }
    for (;;) {
        const z = a + (b - a) * rand()
        if (Math.log(randOpen()) <= -z * z / 2) {
            return z
        }
    }
}

/**
 * Draws samples from a normal distribution truncated to [low, high]. Exact and efficient
 * for every interval, including far tails (Robert's mixed rejection algorithm), where naive
 * rejection or inverse-CDF methods fail.
 *
 * @example
 * truncatedNormal(0, 1, 0, Infinity)   // half-normal
 * truncatedNormal(0, 1, 8, 9)          // deep tail, still fast and exact
 *
 * @param {number} [loc=0] - Mean of the parent normal distribution.
 * @param {number} [scale=1] - Standard deviation of the parent normal distribution (> 0).
 * @param {number} [low=-Infinity] - Lower bound.
 * @param {number} [high=Infinity] - Upper bound (> low).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function truncatedNormal(loc = 0, scale = 1, low = -Infinity, high = Infinity, size = null) {
    assertFinite('loc', loc)
    assertPositive('scale', scale)
    assertNumber('low', low)
    assertNumber('high', high)
    if (!(low < high)) {
        throw new Error('low must be < high.')
    }
    const a = (low - loc) / scale
    const b = (high - loc) / scale
    return baseGenerator(() => Math.min(high, Math.max(low, loc + scale * truncatedStandard(a, b))), size)
}

/**
 * Draws samples from the half-normal distribution |N(0, scale²)|, shifted by `loc`.
 *
 * @param {number} [scale=1] - Scale (> 0).
 * @param {number} [loc=0] - Location.
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function halfNormal(scale = 1, loc = 0, size = null) {
    assertPositive('scale', scale)
    assertFinite('loc', loc)
    return baseGenerator(() => loc + scale * Math.abs(sNormal()), size)
}

/**
 * Draws samples from the skew-normal distribution (Azzalini).
 *
 * @param {number} [loc=0] - Location.
 * @param {number} [scale=1] - Scale (> 0).
 * @param {number} [shape=0] - Skewness parameter alpha; 0 gives the normal distribution.
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function skewNormal(loc = 0, scale = 1, shape = 0, size = null) {
    assertFinite('loc', loc)
    assertPositive('scale', scale)
    assertFinite('shape', shape)
    const delta = shape / Math.sqrt(1 + shape * shape)
    const comp = Math.sqrt(1 - delta * delta)
    return baseGenerator(() => {
        const u0 = sNormal()
        const v = sNormal()
        const u1 = delta * u0 + comp * v
        return loc + scale * (u0 >= 0 ? u1 : -u1)
    }, size)
}

/**
 * Draws samples from the Lévy distribution (stable with alpha = 1/2).
 *
 * @param {number} [loc=0] - Location.
 * @param {number} [scale=1] - Scale (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function levy(loc = 0, scale = 1, size = null) {
    assertFinite('loc', loc)
    assertPositive('scale', scale)
    return baseGenerator(() => {
        let z
        do {
            z = sNormal()
        } while (z === 0)
        return loc + scale / (z * z)
    }, size)
}

/**
 * Draws samples from the Fréchet (inverse Weibull, type II extreme value) distribution.
 *
 * @param {number} alpha - Shape (> 0).
 * @param {number} [scale=1] - Scale (> 0).
 * @param {number} [loc=0] - Location (minimum).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function frechet(alpha, scale = 1, loc = 0, size = null) {
    assertPositive('alpha', alpha)
    assertPositive('scale', scale)
    assertFinite('loc', loc)
    return baseGenerator(() => loc + scale * Math.pow(sExponential(), -1 / alpha), size)
}

/**
 * Draws samples from the generalized extreme value distribution with shape `xi`
 * (xi > 0 Fréchet type, xi = 0 Gumbel, xi < 0 reversed Weibull). Note scipy's
 * `genextreme` uses c = -xi.
 *
 * @param {number} [xi=0] - Shape.
 * @param {number} [loc=0] - Location.
 * @param {number} [scale=1] - Scale (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function generalizedExtremeValue(xi = 0, loc = 0, scale = 1, size = null) {
    assertFinite('xi', xi)
    assertFinite('loc', loc)
    assertPositive('scale', scale)
    return baseGenerator(() => {
        const e = sExponential() || Number.MIN_VALUE
        return xi === 0 ? loc - scale * Math.log(e) : loc + scale * Math.expm1(-xi * Math.log(e)) / xi
    }, size)
}

/**
 * Draws samples from the generalized Pareto distribution (peaks over threshold).
 *
 * @param {number} [xi=0] - Shape; 0 gives the exponential distribution.
 * @param {number} [loc=0] - Location (threshold).
 * @param {number} [scale=1] - Scale (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function generalizedPareto(xi = 0, loc = 0, scale = 1, size = null) {
    assertFinite('xi', xi)
    assertFinite('loc', loc)
    assertPositive('scale', scale)
    return baseGenerator(() => {
        const e = sExponential()
        return xi === 0 ? loc + scale * e : loc + scale * Math.expm1(xi * e) / xi
    }, size)
}

/**
 * Draws samples from the inverse gamma distribution.
 *
 * @param {number} shape - Shape (> 0).
 * @param {number} [scale=1] - Scale (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function inverseGamma(shape, scale = 1, size = null) {
    assertPositive('shape', shape)
    assertPositive('scale', scale)
    return baseGenerator(() => scale / sGamma(shape), size)
}

/**
 * Draws samples from the beta prime (beta of the second kind) distribution.
 *
 * @param {number} a - Shape (> 0).
 * @param {number} b - Shape (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function betaPrime(a, b, size = null) {
    assertPositive('a', a)
    assertPositive('b', b)
    return baseGenerator(() => sGamma(a) / sGamma(b), size)
}

/**
 * Draws samples from the Kumaraswamy distribution on [0, 1], CDF 1 - (1 - x^a)^b.
 *
 * @param {number} a - Shape (> 0).
 * @param {number} b - Shape (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function kumaraswamy(a, b, size = null) {
    assertPositive('a', a)
    assertPositive('b', b)
    return baseGenerator(() => Math.pow(-Math.expm1(-sExponential() / b), 1 / a), size)
}

/**
 * Draws samples from the Erlang distribution: the sum of `k` exponential variables with rate `rate`.
 *
 * @param {number} k - Shape (positive integer).
 * @param {number} [rate=1] - Rate (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function erlang(k, rate = 1, size = null) {
    assertPositiveInteger('k', k)
    assertPositive('rate', rate)
    return baseGenerator(() => sGamma(k) / rate, size)
}

/**
 * Draws samples from the chi distribution (square root of a chi-square variable).
 *
 * @param {number} df - Degrees of freedom (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function chi(df, size = null) {
    assertPositive('df', df)
    return baseGenerator(() => Math.sqrt(2 * sGamma(df / 2)), size)
}

/**
 * Draws samples from the Maxwell–Boltzmann distribution.
 *
 * @param {number} [scale=1] - Scale (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function maxwell(scale = 1, size = null) {
    assertPositive('scale', scale)
    return baseGenerator(() => scale * Math.sqrt(2 * sGamma(1.5)), size)
}

/**
 * Draws samples from the Nakagami-m distribution.
 *
 * @param {number} m - Shape (>= 0.5).
 * @param {number} [omega=1] - Spread, E[X²] (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function nakagami(m, omega = 1, size = null) {
    assertNumber('m', m)
    if (!(m >= 0.5)) {
        throw new Error('m must be >= 0.5.')
    }
    assertPositive('omega', omega)
    return baseGenerator(() => Math.sqrt(sGamma(m) * omega / m), size)
}

/**
 * Draws samples from the log-uniform (reciprocal) distribution on [low, high]:
 * log(X) is uniform on [log(low), log(high)].
 *
 * @param {number} low - Lower bound (> 0).
 * @param {number} high - Upper bound (> low).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function loguniform(low, high, size = null) {
    assertPositive('low', low)
    assertPositive('high', high)
    if (!(low < high)) {
        throw new Error('low must be < high.')
    }
    const a = Math.log(low)
    const b = Math.log(high)
    return baseGenerator(() => Math.min(high, Math.exp(a + (b - a) * rand())), size)
}

/**
 * Draws samples from the Burr type XII (Singh–Maddala) distribution, CDF 1 - (1 + x^c)^-d.
 *
 * @param {number} c - Shape (> 0).
 * @param {number} d - Shape (> 0).
 * @param {number} [scale=1] - Scale (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function burr12(c, d, scale = 1, size = null) {
    assertPositive('c', c)
    assertPositive('d', d)
    assertPositive('scale', scale)
    return baseGenerator(() => scale * Math.pow(Math.expm1(sExponential() / d), 1 / c), size)
}

/**
 * Draws samples from the log-logistic (Fisk) distribution, CDF 1 / (1 + (x/scale)^-c).
 *
 * @param {number} c - Shape (> 0).
 * @param {number} [scale=1] - Scale / median (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function logLogistic(c, scale = 1, size = null) {
    assertPositive('c', c)
    assertPositive('scale', scale)
    return baseGenerator(() => {
        const u = randOpen()
        return scale * Math.pow(u / (1 - u), 1 / c)
    }, size)
}

/**
 * Draws samples from the Wigner semicircle distribution on [-radius, radius].
 *
 * @param {number} [radius=1] - Radius (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function semicircle(radius = 1, size = null) {
    assertPositive('radius', radius)
    return baseGenerator(() => radius * (2 * betaSample(1.5, 1.5) - 1), size)
}

/**
 * Draws samples from the exponentially modified Gaussian (ex-Gaussian) distribution:
 * N(mu, sigma²) + Exponential(rate lambda).
 *
 * @param {number} [mu=0] - Mean of the normal component.
 * @param {number} [sigma=1] - Standard deviation of the normal component (> 0).
 * @param {number} [lambda=1] - Rate of the exponential component (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function exGaussian(mu = 0, sigma = 1, lambda = 1, size = null) {
    assertFinite('mu', mu)
    assertPositive('sigma', sigma)
    assertPositive('lambda', lambda)
    return baseGenerator(() => mu + sigma * sNormal() + sExponential() / lambda, size)
}

/**
 * Draws samples from the beta-binomial distribution: binomial with a Beta(a, b) success probability.
 *
 * @param {number} n - Number of trials (non-negative integer).
 * @param {number} a - Alpha (> 0).
 * @param {number} b - Beta (> 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function betaBinomial(n, a, b, size = null) {
    assertNonNegativeInteger('n', n)
    assertPositive('a', a)
    assertPositive('b', b)
    return baseGenerator(() => binomialSample(n, betaSample(a, b)), size)
}

/**
 * Draws samples from the Skellam distribution: the difference of two independent Poisson variables.
 *
 * @param {number} mu1 - Mean of the first Poisson variable (>= 0).
 * @param {number} mu2 - Mean of the second Poisson variable (>= 0).
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function skellam(mu1, mu2, size = null) {
    assertNonNegative('mu1', mu1)
    assertNonNegative('mu2', mu2)
    return baseGenerator(() => poissonSample(mu1) - poissonSample(mu2), size)
}

/**
 * Draws samples from the Rademacher distribution: -1 or 1 with equal probability.
 *
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function rademacher(size = null) {
    return baseGenerator(() => (rand() < 0.5 ? -1 : 1), size)
}

/**
 * Draws category indices 0..k-1 with the given probabilities (or non-negative weights).
 * Uses Walker's alias method: O(k) setup, O(1) per sample.
 *
 * @param {number[]} p - Probabilities or weights of each category.
 * @param {number|Array|ArrayBufferView|null} [size=null] - Output shape.
 * @returns {number|Array}
 */
export function categorical(p, size = null) {
    const table = new AliasTable(p)
    return table.sample(size)
}

/**
 * Walker / Vose alias table for O(1) sampling from a fixed discrete distribution.
 * Build once and sample many times.
 *
 * @example
 * const table = new AliasTable([0.1, 0.2, 0.7])
 * table.sample(1000)   // indices 0, 1, 2
 */
export class AliasTable {
    /**
     * @param {number[]} weights - Non-negative weights (normalised automatically).
     */
    constructor(weights) {
        if (!Array.isArray(weights) || weights.length === 0) {
            throw new Error('weights must be a non-empty array.')
        }
        const n = weights.length
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
        this.n = n
        this.prob = new Float64Array(n)
        this.alias = new Uint32Array(n)
        const scaled = weights.map((w) => w * n / total)
        const small = []
        const large = []
        scaled.forEach((s, i) => (s < 1 ? small : large).push(i))
        while (small.length > 0 && large.length > 0) {
            const s = small.pop()
            const l = large.pop()
            this.prob[s] = scaled[s]
            this.alias[s] = l
            scaled[l] = scaled[l] + scaled[s] - 1
            ;(scaled[l] < 1 ? small : large).push(l)
        }
        for (const i of large) {
            this.prob[i] = 1
        }
        for (const i of small) {
            this.prob[i] = 1
        }
    }

    /**
     * Draws category indices.
     * @param {number|Array|null} [size=null] - Output shape.
     * @returns {number|Array}
     */
    sample(size = null) {
        return baseGenerator(() => {
            const u = rand() * this.n
            const i = Math.floor(u)
            return u - i < this.prob[i] ? i : this.alias[i]
        }, size)
    }
}

function vectorSampler(sample, size) {
    const shape = normalizeSize(size)
    return shape === null ? sample() : fillShape(shape, sample)
}

function unitVector(dim) {
    for (;;) {
        const v = new Array(dim)
        let norm = 0
        for (let i = 0; i < dim; i++) {
            v[i] = sNormal()
            norm += v[i] * v[i]
        }
        if (norm > 0) {
            norm = Math.sqrt(norm)
            return v.map((x) => x / norm)
        }
    }
}

/**
 * Draws points uniformly distributed on the surface of the unit sphere in `dim` dimensions
 * (random directions / unit vectors).
 *
 * @param {number} [dim=3] - Dimension (positive integer).
 * @param {number|Array|null} [size=null] - Output shape (each element is a vector).
 * @returns {number[]|Array}
 */
export function uniformSphere(dim = 3, size = null) {
    assertPositiveInteger('dim', dim)
    return vectorSampler(() => unitVector(dim), size)
}

/**
 * Draws points uniformly distributed inside the ball of the given radius in `dim` dimensions.
 *
 * @param {number} [dim=3] - Dimension (positive integer).
 * @param {number} [radius=1] - Radius (> 0).
 * @param {number|Array|null} [size=null] - Output shape (each element is a vector).
 * @returns {number[]|Array}
 */
export function uniformBall(dim = 3, radius = 1, size = null) {
    assertPositiveInteger('dim', dim)
    assertPositive('radius', radius)
    return vectorSampler(() => {
        const r = radius * Math.pow(rand(), 1 / dim)
        return unitVector(dim).map((x) => x * r)
    }, size)
}

/**
 * Generates RFC 4122 version 4 (random) UUID strings.
 *
 * @param {number|Array|null} [size=null] - Output shape.
 * @returns {string|Array}
 */
export function uuid4(size = null) {
    const hex = (n) => n.toString(16).padStart(8, '0')
    return baseGenerator(() => {
        const a = Math.floor(rand() * 4294967296)
        const b = Math.floor(rand() * 4294967296)
        const c = Math.floor(rand() * 4294967296)
        const d = Math.floor(rand() * 4294967296)
        const s = hex(a) + hex((b & 0xffff0fff | 0x00004000) >>> 0) + hex((c & 0x3fffffff | 0x80000000) >>> 0) + hex(d)
        return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
    }, size)
}
