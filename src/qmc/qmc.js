/**
 * Quasi-Monte Carlo: low-discrepancy sequences and space filling designs,
 * in the spirit of scipy.stats.qmc.
 *
 * @example
 * import { qmc } from 'randlibjs'
 * const sobol = new qmc.Sobol(2, { scramble: false })
 * sobol.random(4)   // [[0, 0], [0.5, 0.5], [0.75, 0.25], [0.25, 0.75]]
 * qmc.scale(sobol.random(4), [-1, 0], [1, 10])
 *
 * @module qmc
 */
import { SOBOL_DIRECTIONS } from './sobol-directions.js'
import { rand, randBelow, withSource } from '../core/state.js'
import { standardNormal } from '../core/samplers.js'
import { assertPositiveInteger, assertPositive } from '../functions/util/validate.js'

const BITS = 30
const SCALE = 2 ** -BITS

/** Runs `fn` with the optional generator's bit generator, or the active one. */
function using(rng, fn) {
    return rng ? withSource(rng.bitGenerator, fn) : fn()
}

/**
 * Base class of the QMC engines.
 * @abstract
 */
class QMCEngine {
    constructor(d, options = {}) {
        assertPositiveInteger('d', d)
        this.d = d
        this.rng = options.rng
        this.numGenerated = 0
    }

    /**
     * Draws the next `n` points in [0, 1)^d.
     * @param {number} [n=1]
     * @returns {number[][]}
     */
    random(n = 1) {
        if (!Number.isInteger(n) || n < 0) {
            throw new Error('n must be a non-negative integer.')
        }
        const out = this._random(n)
        this.numGenerated += n
        return out
    }

    /**
     * Restarts the sequence (the scrambling, if any, is kept).
     * @returns {this}
     */
    reset() {
        this.numGenerated = 0
        this._reset()
        return this
    }

    /**
     * Skips the next `n` points.
     * @param {number} n
     * @returns {this}
     */
    fastForward(n) {
        this.random(n)
        return this
    }
}

/**
 * Sobol' low-discrepancy sequence (Joe–Kuo direction numbers, Gray code order), optionally
 * scrambled with a random linear matrix scramble and digital shift (as scipy). Supports up to
 * 256 dimensions with the bundled direction numbers, or more with `options.directions`.
 *
 * Unscrambled points are identical to `scipy.stats.qmc.Sobol(d, scramble=False)`.
 * Use sample sizes that are powers of 2 to keep the balance properties.
 */
export class Sobol extends QMCEngine {
    /**
     * @param {number} d - Dimension.
     * @param {Object} [options]
     * @param {boolean} [options.scramble=true] - Apply LMS + digital shift scrambling.
     * @param {Object} [options.rng] - `Generator` used for the scrambling (global generator otherwise).
     * @param {number[][]} [options.directions] - Custom direction numbers `[poly, m_1, ..., m_s]` per dimension.
     */
    constructor(d, options = {}) {
        super(d, options)
        const directions = options.directions ?? SOBOL_DIRECTIONS
        if (d > directions.length) {
            throw new Error(`Sobol' supports up to ${directions.length} dimensions with these direction numbers.`)
        }
        this.v = []
        for (let k = 0; k < d; k++) {
            this.v.push(directionNumbers(k === 0 ? [1] : directions[k]))
        }
        this.shift = new Array(d).fill(0)
        if (options.scramble ?? true) {
            using(this.rng, () => this._scramble())
        }
        this._reset()
    }

    /** @private */
    _scramble() {
        for (let k = 0; k < this.d; k++) {
            // random lower triangular binary matrix with unit diagonal (rows MSB first)
            const rows = []
            for (let i = 0; i < BITS; i++) {
                let row = 1 << BITS - 1 - i
                for (let j = 0; j < i; j++) {
                    if (rand() < 0.5) {
                        row |= 1 << BITS - 1 - j
                    }
                }
                rows.push(row)
            }
            this.v[k] = this.v[k].map((x) => {
                let out = 0
                for (let i = 0; i < BITS; i++) {
                    if (popcount(rows[i] & x) & 1) {
                        out |= 1 << BITS - 1 - i
                    }
                }
                return out >>> 0
            })
            this.shift[k] = randBelow(2 ** BITS)
        }
    }

    /** @private */
    _reset() {
        this.state = this.shift.slice()
        this.index = 0
    }

    /** @private */
    _random(n) {
        const out = []
        for (let i = 0; i < n; i++) {
            if (this.index >= 2 ** BITS) {
                throw new Error('Sobol sequence exhausted (2^30 points).')
            }
            if (this.index > 0) {
                const c = lowestZeroBit(this.index - 1)
                for (let k = 0; k < this.d; k++) {
                    this.state[k] = (this.state[k] ^ this.v[k][c]) >>> 0
                }
            }
            out.push(this.state.map((s) => s * SCALE))
            this.index++
        }
        return out
    }
}

function popcount(x) {
    x -= x >>> 1 & 0x55555555
    x = (x & 0x33333333) + (x >>> 2 & 0x33333333)
    return Math.imul(x + (x >>> 4) & 0x0f0f0f0f, 0x01010101) >>> 24
}

function lowestZeroBit(n) {
    let c = 0
    while (n & 1) {
        n >>>= 1
        c++
    }
    return c
}

/** Direction numbers V_j (scaled to BITS bits) from [poly, m_1..m_s]. */
function directionNumbers(entry) {
    const m = new Array(BITS)
    if (entry.length === 1) {
        m.fill(1)
    } else {
        const p = entry[0]
        const s = Math.floor(Math.log2(p))
        for (let j = 0; j < s; j++) {
            m[j] = entry[j + 1]
        }
        for (let j = s; j < BITS; j++) {
            let value = m[j - s]
            let pow2 = 1
            for (let k = 0; k < s; k++) {
                pow2 *= 2
                if (p >> s - 1 - k & 1) {
                    value ^= pow2 * m[j - k - 1]
                }
            }
            m[j] = value
        }
    }
    return m.map((mj, j) => mj * 2 ** (BITS - 1 - j) >>> 0)
}

const PRIMES = (() => {
    const primes = []
    for (let n = 2; primes.length < 1000; n++) {
        if (primes.every((p) => p * p > n || n % p !== 0)) {
            primes.push(n)
        }
    }
    return primes
})()

/**
 * Halton sequence (van der Corput radical inverses in the first `d` prime bases), optionally
 * scrambled with random digit permutations. Unscrambled points are identical to
 * `scipy.stats.qmc.Halton(d, scramble=False)`.
 */
export class Halton extends QMCEngine {
    /**
     * @param {number} d - Dimension (up to 1000).
     * @param {Object} [options]
     * @param {boolean} [options.scramble=true] - Apply random digit permutations.
     * @param {Object} [options.rng] - `Generator` used for the scrambling.
     */
    constructor(d, options = {}) {
        super(d, options)
        if (d > PRIMES.length) {
            throw new Error(`Halton supports up to ${PRIMES.length} dimensions.`)
        }
        this.bases = PRIMES.slice(0, d)
        this.perms = null
        if (options.scramble ?? true) {
            this.perms = using(this.rng, () => this.bases.map((b) => {
                const digits = Math.ceil(53 / Math.log2(b))
                return Array.from({ length: digits }, () => permutationOf(b))
            }))
        }
        this._reset()
    }

    /** @private */
    _reset() {
        this.index = 0
    }

    /** @private */
    _random(n) {
        const out = []
        for (let i = 0; i < n; i++) {
            out.push(this.bases.map((b, k) => radicalInverse(this.index, b, this.perms ? this.perms[k] : null)))
            this.index++
        }
        return out
    }
}

function permutationOf(b) {
    const p = Array.from({ length: b }, (_, i) => i)
    for (let i = b - 1; i > 0; i--) {
        const j = randBelow(i + 1)
        const t = p[i]
        p[i] = p[j]
        p[j] = t
    }
    return p
}

function radicalInverse(index, base, perms) {
    let result = 0
    let f = 1 / base
    let i = index
    if (!perms) {
        while (i > 0) {
            result += f * (i % base)
            i = Math.floor(i / base)
            f /= base
        }
        return result
    }
    for (let k = 0; k < perms.length; k++) {
        result += f * perms[k][i % base]
        i = Math.floor(i / base)
        f /= base
    }
    return Math.min(result, 1 - Number.EPSILON / 2)
}

/**
 * Latin hypercube sampling: each of the `n` equal-width strata of every axis contains exactly
 * one point. Each call to `random(n)` produces an independent design.
 */
export class LatinHypercube extends QMCEngine {
    /**
     * @param {number} d - Dimension.
     * @param {Object} [options]
     * @param {boolean} [options.centered=false] - Put points at the centre of the strata.
     * @param {Object} [options.rng] - `Generator` to draw from.
     */
    constructor(d, options = {}) {
        super(d, options)
        this.centered = Boolean(options.centered)
    }

    /** @private */
    _reset() {}

    /** @private */
    _random(n) {
        return using(this.rng, () => {
            const columns = Array.from({ length: this.d }, () => permutationOf(n))
            const out = []
            for (let i = 0; i < n; i++) {
                out.push(columns.map((perm) => (perm[i] + (this.centered ? 0.5 : rand())) / n))
            }
            return out
        })
    }
}

/**
 * Poisson disk sampling (Bridson's algorithm) in the unit hypercube: random points that are
 * never closer than `radius` to each other, giving blue-noise designs.
 */
export class PoissonDisk extends QMCEngine {
    /**
     * @param {number} d - Dimension.
     * @param {Object} [options]
     * @param {number} [options.radius=0.05] - Minimal distance between points.
     * @param {number} [options.ncandidates=30] - Candidates tried around each active point.
     * @param {Object} [options.rng] - `Generator` to draw from.
     */
    constructor(d, options = {}) {
        super(d, options)
        this.radius = options.radius ?? 0.05
        assertPositive('radius', this.radius)
        this.ncandidates = options.ncandidates ?? 30
        assertPositiveInteger('ncandidates', this.ncandidates)
        this.cell = this.radius / Math.sqrt(d)
        this.gridSize = Math.ceil(1 / this.cell)
        this._reset()
    }

    /** @private */
    _reset() {
        this.points = []
        this.active = []
        this.grid = new Map()
        this.started = false
    }

    /** @private */
    _key(p) {
        return p.map((x) => Math.min(this.gridSize - 1, Math.floor(x / this.cell))).join(',')
    }

    /** @private */
    _fits(p) {
        const base = p.map((x) => Math.floor(x / this.cell))
        const reach = Math.ceil(Math.sqrt(this.d)) + 1
        const r2 = this.radius * this.radius
        const visit = (dim, idx) => {
            if (dim === this.d) {
                const q = this.grid.get(idx.join(','))
                if (!q) return true
                let dist = 0
                for (let k = 0; k < this.d; k++) dist += (p[k] - q[k]) ** 2
                return dist >= r2
            }
            for (let o = -reach; o <= reach; o++) {
                const c = base[dim] + o
                if (c < 0 || c >= this.gridSize) continue
                idx.push(c)
                const ok = visit(dim + 1, idx)
                idx.pop()
                if (!ok) return false
            }
            return true
        }
        return visit(0, [])
    }

    /** @private */
    _add(p) {
        this.points.push(p)
        this.active.push(p)
        this.grid.set(this._key(p), p)
    }

    /** @private */
    _random(n) {
        return using(this.rng, () => {
            const out = []
            if (!this.started && n > 0) {
                const p = Array.from({ length: this.d }, () => rand())
                this._add(p)
                out.push(p)
                this.started = true
            }
            while (out.length < n && this.active.length > 0) {
                const i = randBelow(this.active.length)
                const center = this.active[i]
                let placed = false
                for (let c = 0; c < this.ncandidates && !placed; c++) {
                    // uniform in the spherical shell [r, 2r] around the centre
                    const dir = Array.from({ length: this.d }, () => standardNormal())
                    const norm = Math.hypot(...dir) || 1
                    const r = this.radius * Math.pow(1 + (2 ** this.d - 1) * rand(), 1 / this.d)
                    const radius = Math.min(r, 2 * this.radius)
                    const q = center.map((x, k) => x + radius * dir[k] / norm)
                    if (q.every((x) => x >= 0 && x < 1) && this._fits(q)) {
                        this._add(q)
                        out.push(q)
                        placed = true
                    }
                }
                if (!placed) {
                    this.active.splice(i, 1)
                }
            }
            return out
        })
    }

    /**
     * Fills the hypercube until no more points fit.
     * @returns {number[][]}
     */
    fillSpace() {
        return this.random(Number.MAX_SAFE_INTEGER)
    }
}

/**
 * Scales a sample from the unit hypercube to [lower, upper] bounds (or back, with `reverse`).
 *
 * @param {number[][]} sample - Points.
 * @param {number[]} lower - Lower bounds per dimension.
 * @param {number[]} upper - Upper bounds per dimension.
 * @param {boolean} [reverse=false] - Map from the bounds back to the unit hypercube.
 * @returns {number[][]}
 */
export function scale(sample, lower, upper, reverse = false) {
    if (!Array.isArray(lower) || !Array.isArray(upper) || lower.length !== upper.length) {
        throw new Error('lower and upper must be arrays of the same length.')
    }
    if (lower.some((l, k) => !(l < upper[k]))) {
        throw new Error('Each lower bound must be smaller than the upper bound.')
    }
    return sample.map((p) => {
        if (p.length !== lower.length) {
            throw new Error('Sample dimension does not match the bounds.')
        }
        return p.map((x, k) => (reverse ? (x - lower[k]) / (upper[k] - lower[k]) : lower[k] + x * (upper[k] - lower[k])))
    })
}

/**
 * Discrepancy of a sample in the unit hypercube (lower is more uniform), as
 * `scipy.stats.qmc.discrepancy`.
 *
 * @param {number[][]} sample - Points in [0, 1]^d.
 * @param {string} [method='CD'] - 'CD' (centered L2), 'WD' (wrap-around), 'MD' (mixture) or 'L2-star'.
 * @returns {number} The squared discrepancy.
 */
export function discrepancy(sample, method = 'CD') {
    const n = sample.length
    if (n === 0) {
        throw new Error('sample must not be empty.')
    }
    const d = sample[0].length
    if (sample.some((p) => p.length !== d || p.some((x) => x < 0 || x > 1))) {
        throw new Error('sample must be a list of points in the unit hypercube.')
    }
    let single = 0
    let pairs = 0
    switch (method) {
        case 'CD': {
            for (const p of sample) {
                let prod = 1
                for (const x of p) prod *= 1 + 0.5 * Math.abs(x - 0.5) - 0.5 * Math.abs(x - 0.5) ** 2
                single += prod
            }
            for (const p of sample) {
                for (const q of sample) {
                    let prod = 1
                    for (let k = 0; k < d; k++) {
                        prod *= 1 + 0.5 * Math.abs(p[k] - 0.5) + 0.5 * Math.abs(q[k] - 0.5) - 0.5 * Math.abs(p[k] - q[k])
                    }
                    pairs += prod
                }
            }
            return (13 / 12) ** d - 2 / n * single + pairs / (n * n)
        }
        case 'WD': {
            for (const p of sample) {
                for (const q of sample) {
                    let prod = 1
                    for (let k = 0; k < d; k++) {
                        const t = Math.abs(p[k] - q[k])
                        prod *= 1.5 - t * (1 - t)
                    }
                    pairs += prod
                }
            }
            return -((4 / 3) ** d) + pairs / (n * n)
        }
        case 'MD': {
            for (const p of sample) {
                let prod = 1
                for (const x of p) prod *= 5 / 3 - 0.25 * Math.abs(x - 0.5) - 0.25 * Math.abs(x - 0.5) ** 2
                single += prod
            }
            for (const p of sample) {
                for (const q of sample) {
                    let prod = 1
                    for (let k = 0; k < d; k++) {
                        prod *= 15 / 8 - 0.25 * Math.abs(p[k] - 0.5) - 0.25 * Math.abs(q[k] - 0.5) -
                            0.75 * Math.abs(p[k] - q[k]) + 0.5 * Math.abs(p[k] - q[k]) ** 2
                    }
                    pairs += prod
                }
            }
            return (19 / 12) ** d - 2 / n * single + pairs / (n * n)
        }
        case 'L2-star': {
            for (const p of sample) {
                let prod = 1
                for (const x of p) prod *= 1 - x * x
                single += prod
            }
            for (const p of sample) {
                for (const q of sample) {
                    let prod = 1
                    for (let k = 0; k < d; k++) prod *= 1 - Math.max(p[k], q[k])
                    pairs += prod
                }
            }
            return Math.sqrt((1 / 3) ** d - 2 ** (1 - d) / n * single + pairs / (n * n))
        }
        default:
            throw new Error(`Unknown discrepancy method "${method}".`)
    }
}

/**
 * Quasi-Monte Carlo namespace.
 * @namespace qmc
 */
export const qmc = Object.freeze({ Sobol, Halton, LatinHypercube, PoissonDisk, scale, discrepancy })

