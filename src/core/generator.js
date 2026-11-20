import * as distributions from '../distributions.js'
import { BitGenerator, createBitGenerator, Xoshiro128StarStar } from './bit-generators.js'
import { withSource } from './state.js'

/**
 * A random number generator with its own independent stream, like numpy's
 * `np.random.Generator`. Every sampling function of the library is available as a method
 * with the same signature (`rng.normal(0, 1, 10)`, `rng.choice(...)`, `rng.dirichlet(...)` ...),
 * and does not touch the global generator controlled by `seed()`.
 *
 * @example
 * const rng = createGenerator(42)
 * rng.normal(0, 1, 5)
 * rng.integers(0, 10, [2, 3])
 * const saved = rng.getState()
 * const a = rng.random()
 * rng.setState(saved)
 * rng.random() === a // true
 */
export class Generator {
    /**
     * @param {BitGenerator} [bitGenerator] - The underlying bit generator. A randomly seeded
     *   xoshiro128** is used when omitted.
     */
    constructor(bitGenerator) {
        if (bitGenerator === undefined) {
            bitGenerator = new Xoshiro128StarStar()
        }
        if (!(bitGenerator instanceof BitGenerator)) {
            throw new Error('Generator expects a BitGenerator instance.')
        }
        this._bitGenerator = bitGenerator
    }

    /**
     * The underlying bit generator.
     * @type {BitGenerator}
     */
    get bitGenerator() {
        return this._bitGenerator
    }

    /**
     * Returns a JSON serialisable snapshot of the generator state.
     * @returns {Object}
     */
    getState() {
        return this._bitGenerator.getState()
    }

    /**
     * Restores a snapshot returned by {@link Generator#getState}.
     * @param {Object} state
     * @returns {this}
     */
    setState(state) {
        this._bitGenerator.setState(state)
        return this
    }

    /**
     * Returns an independent copy positioned at the same point of the stream.
     * @returns {Generator}
     */
    clone() {
        return new Generator(this._bitGenerator.clone())
    }

    /**
     * Creates `n` child generators with statistically independent streams, seeded from this
     * generator (deterministic when this generator is seeded). Useful for parallel simulations.
     *
     * @param {number} n - Number of children.
     * @returns {Generator[]}
     */
    spawn(n) {
        if (!Number.isInteger(n) || n < 0) {
            throw new Error('n must be a non-negative integer.')
        }
        const name = this._bitGenerator.name === 'function' ? 'xoshiro128**' : this._bitGenerator.name
        return Array.from({ length: n }, () => {
            const words = Array.from({ length: 8 }, () => this._bitGenerator.nextUint32())
            return new Generator(createBitGenerator(name, words))
        })
    }

    /**
     * Runs `fn` with this generator installed as the source of every module level sampling
     * function, so third party code built on the global functions uses this stream.
     *
     * @param {Function} fn
     * @returns {*} The value returned by `fn`.
     */
    run(fn) {
        return withSource(this._bitGenerator, fn)
    }
}

for (const [name, fn] of Object.entries(distributions)) {
    if (typeof fn !== 'function') {
        continue
    }
    Object.defineProperty(Generator.prototype, name, {
        value: function (...args) {
            return withSource(this._bitGenerator, () => fn(...args))
        },
        writable: true,
        configurable: true,
    })
}

/**
 * Creates a new {@link Generator}, numpy's `default_rng` equivalent.
 *
 * @example
 * const rng = createGenerator(2024)               // xoshiro128**
 * const legacy = createGenerator(42, 'mt19937')   // numpy RandomState compatible streams
 * legacy.random()                                 // 0.3745401188473625
 *
 * @param {number|bigint|string|number[]|BitGenerator} [seed] - Seed, or an existing bit generator.
 *   Random when omitted.
 * @param {string} [bitGenerator='xoshiro128**'] - Bit generator name: `'xoshiro128**'`, `'pcg32'` or `'mt19937'`.
 * @returns {Generator}
 */
export function createGenerator(seed, bitGenerator = 'xoshiro128**') {
    if (seed instanceof BitGenerator) {
        return new Generator(seed)
    }
    return new Generator(createBitGenerator(bitGenerator, seed))
}

/**
 * Alias of {@link createGenerator}, named after numpy's `default_rng`.
 * @function
 * @param {number|bigint|string|number[]|BitGenerator} [seed]
 * @param {string} [bitGenerator='xoshiro128**']
 * @returns {Generator}
 */
export const defaultRng = createGenerator
