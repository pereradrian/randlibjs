/**
 * Base classes of the frozen distributions (see the `stats` module).
 *
 * @module stats-base
 * @private
 */
import * as samplers from '../distributions.js'

export function mapValues(x, fn) {
    if (Array.isArray(x)) {
        return x.map((v) => mapValues(v, fn))
    }
    return fn(x)
}

export function checkProbability(q) {
    if (typeof q !== 'number' || Number.isNaN(q) || q < 0 || q > 1) {
        return false
    }
    return true
}

/**
 * Base class of the continuous distributions.
 */
export class ContinuousDistribution {
    /** Lower end of the support. */
    get support() {
        return [-Infinity, Infinity]
    }

    /**
     * Probability density function.
     * @param {number|Array} x
     * @returns {number|Array}
     */
    pdf(x) {
        return mapValues(x, (v) => Math.exp(this._logpdf(v)))
    }

    /**
     * Logarithm of the probability density function.
     * @param {number|Array} x
     * @returns {number|Array}
     */
    logpdf(x) {
        return mapValues(x, (v) => this._logpdf(v))
    }

    /**
     * Cumulative distribution function P(X <= x).
     * @param {number|Array} x
     * @returns {number|Array}
     */
    cdf(x) {
        return mapValues(x, (v) => this._cdf(v))
    }

    /**
     * Survival function P(X > x) = 1 - cdf(x), computed accurately in the upper tail.
     * @param {number|Array} x
     * @returns {number|Array}
     */
    sf(x) {
        return mapValues(x, (v) => this._sf(v))
    }

    /**
     * Logarithm of the cumulative distribution function.
     * @param {number|Array} x
     * @returns {number|Array}
     */
    logcdf(x) {
        return mapValues(x, (v) => Math.log(this._cdf(v)))
    }

    /**
     * Logarithm of the survival function.
     * @param {number|Array} x
     * @returns {number|Array}
     */
    logsf(x) {
        return mapValues(x, (v) => Math.log(this._sf(v)))
    }

    /**
     * Percent point function (quantile, inverse of the cdf).
     * @param {number|Array} q - Probabilities in [0, 1].
     * @returns {number|Array}
     */
    ppf(q) {
        return mapValues(q, (p) => (checkProbability(p) ? this._ppf(p) : NaN))
    }

    /**
     * Inverse survival function: x such that sf(x) = q.
     * @param {number|Array} q - Probabilities in [0, 1].
     * @returns {number|Array}
     */
    isf(q) {
        return mapValues(q, (p) => (checkProbability(p) ? this._isf(p) : NaN))
    }

    /**
     * Draws random samples.
     * @param {number|number[]|null} [size=null] - Output shape.
     * @param {Object} [rng] - Optional `Generator` to draw from instead of the global generator.
     * @returns {number|Array}
     */
    sample(size = null, rng = undefined) {
        return rng ? rng.run(() => this._sample(size)) : this._sample(size)
    }

    /** Alias of {@link ContinuousDistribution#sample} (scipy name). */
    rvs(size = null, rng = undefined) {
        return this.sample(size, rng)
    }

    /** @returns {number} The mean. */
    mean() {
        return NaN
    }

    /** @returns {number} The variance. */
    variance() {
        return NaN
    }

    /** @returns {number} The standard deviation. */
    std() {
        return Math.sqrt(this.variance())
    }

    /** @returns {number} The median. */
    median() {
        return this._ppf(0.5)
    }

    /**
     * Equal-tail interval containing a fraction `confidence` of the probability mass.
     * @param {number} confidence - In [0, 1].
     * @returns {number[]} [lower, upper]
     */
    interval(confidence) {
        if (!checkProbability(confidence)) {
            throw new Error('confidence must be in [0, 1].')
        }
        const alpha = (1 - confidence) / 2
        return [this._ppf(alpha), this._isf(alpha)]
    }

    /** @protected */
    _sf(x) {
        return 1 - this._cdf(x)
    }

    /** @protected */
    _isf(q) {
        return this._ppf(1 - q)
    }

    /**
     * Generic quantile by bracketing and bisection on the cdf.
     * @protected
     */
    _ppf(p) {
        const [lo0, hi0] = this.support
        if (p === 0) return lo0
        if (p === 1) return hi0
        let lo = Number.isFinite(lo0) ? lo0 : -1
        let hi = Number.isFinite(hi0) ? hi0 : 1
        while (!Number.isFinite(lo0) && this._cdf(lo) > p) lo *= 2
        while (!Number.isFinite(hi0) && this._cdf(hi) < p) hi *= 2
        for (let i = 0; i < 200; i++) {
            const mid = (lo + hi) / 2
            if (mid === lo || mid === hi) break
            if (this._cdf(mid) < p) lo = mid
            else hi = mid
        }
        return (lo + hi) / 2
    }

    /**
     * Generic upper quantile by bracketing and bisection on the survival function, accurate
     * far into the upper tail when `_sf` is.
     * @protected
     */
    _isfBySf(q) {
        if (q >= 0.5) return this._ppf(1 - q)
        const [lo0, hi0] = this.support
        if (q === 0) return hi0
        let lo = Number.isFinite(lo0) ? lo0 : -1
        let hi = Number.isFinite(hi0) ? hi0 : 1
        while (!Number.isFinite(lo0) && this._sf(lo) < q) lo *= 2
        while (!Number.isFinite(hi0) && this._sf(hi) > q) hi = hi > 0 ? hi * 2 : 1
        for (let i = 0; i < 2100; i++) {
            const mid = (lo + hi) / 2
            if (mid === lo || mid === hi) break
            if (this._sf(mid) > q) lo = mid
            else hi = mid
        }
        return (lo + hi) / 2
    }

    /** @protected */
    _sample(size) {
        return mapValues(samplers.random(size), (u) => this._ppf(u))
    }
}

/**
 * Base class of the discrete distributions (support on integers).
 */
export class DiscreteDistribution extends ContinuousDistribution {
    /**
     * Probability mass function.
     * @param {number|Array} k
     * @returns {number|Array}
     */
    pmf(k) {
        return mapValues(k, (v) => (Number.isInteger(v) ? Math.exp(this._logpmf(v)) : 0))
    }

    /**
     * Logarithm of the probability mass function.
     * @param {number|Array} k
     * @returns {number|Array}
     */
    logpmf(k) {
        return mapValues(k, (v) => (Number.isInteger(v) ? this._logpmf(v) : -Infinity))
    }

    /**
     * Not available: discrete distributions have a {@link DiscreteDistribution#pmf}.
     * @param {number|Array} _x
     * @returns {number|Array}
     * @throws {Error}
     */
    // eslint-disable-next-line no-unused-vars
    pdf(_x) {
        throw new Error('Discrete distributions have a pmf, not a pdf.')
    }

    /** @protected */
    _cdf(x) {
        const [lo, hi] = this.support
        const k = Math.floor(x)
        if (k < lo) return 0
        if (k >= hi) return 1
        let s = 0
        for (let i = lo; i <= k; i++) s += Math.exp(this._logpmf(i))
        return Math.min(1, s)
    }

    /**
     * Smallest integer k with cdf(k) >= p.
     * @protected
     */
    _ppf(p) {
        const [lo, hi] = this.support
        if (p === 0) return lo - 1
        if (p === 1) return hi
        // relative tolerance so exact ties (cdf(k) == p in exact arithmetic) resolve correctly
        const target = p * (1 - 1e-12)
        let k = Math.round(this.mean() || 0)
        if (!Number.isFinite(k)) k = Number.isFinite(lo) ? lo : 0
        k = Math.min(Math.max(k, lo), hi)
        const sd0 = Math.sqrt(this.variance())
        // an infinite or undefined variance (e.g. Zipf with a <= 3) still needs a finite step
        const sd = Number.isFinite(sd0) && sd0 > 0 ? sd0 : 1
        let step = Math.max(1, Math.ceil(sd))
        // bracket
        let a = k
        let b = k
        while (a > lo && this._cdf(a - 1) >= target) {
            b = a
            a = Math.max(lo, a - step)
            step *= 2
        }
        step = Math.max(1, Math.ceil(sd))
        while (this._cdf(b) < target) {
            a = b
            b = Math.min(hi, b + step)
            step *= 2
            if (b === hi) break
        }
        // binary search for the smallest k in [a, b] with cdf(k) >= p
        while (a < b) {
            const mid = Math.floor((a + b) / 2)
            if (this._cdf(mid) >= target) b = mid
            else a = mid + 1
        }
        return a
    }

    /** @protected */
    _isf(q) {
        // smallest k with sf(k) <= q
        const [lo, hi] = this.support
        if (q === 1) return lo - 1
        if (q === 0) return hi
        const target = q * (1 + 1e-12)
        // start near the answer, then bracket with doubling steps and bisect on sf: ppf(1 - q)
        // cannot resolve tiny q, and the answer can be very far out (heavy tails)
        let k = this._ppf(Math.min(1, Math.max(0, 1 - q)))
        if (!Number.isFinite(k)) k = Number.isFinite(lo) ? lo : 0
        let a = k // sf(a) > target, or a = lo - 1
        let b = k // sf(b) <= target
        let step = 1
        while (a >= lo && this._sf(a) <= target) {
            b = a
            a = a - step < lo ? lo - 1 : a - step
            step *= 2
        }
        step = 1
        while (b < hi && this._sf(b) > target) {
            a = b
            b = Math.min(hi, b + step)
            step *= 2
        }
        while (b - a > 1) {
            const mid = Math.floor((a + b) / 2)
            if (this._sf(mid) <= target) b = mid
            else a = mid
        }
        return b
    }

    median() {
        return this._ppf(0.5)
    }
}
