import { createBitGenerator, FunctionBitGenerator } from '../core/bit-generators.js'
import { getGlobalSource, setGlobalSource } from '../core/state.js'

/**
 * Seeds the global random number generator used by all the module level functions.
 *
 * Calling `seed` with the same value always reproduces the same sequence of samples.
 *
 * @example
 * seed(42)
 * uniform()                // always the same value
 * seed(42, 'mt19937')
 * random()                 // 0.3745401188473625, same as np.random.RandomState(42).random_sample()
 *
 * @param {number|bigint|string|number[]} [seedValue] - Seed value. When omitted the generator is
 *   re-seeded from a secure entropy source (crypto.getRandomValues when available).
 * @param {string} [bitGenerator='xoshiro128**'] - Bit generator: `'xoshiro128**'` (default), `'pcg32'` or `'mt19937'`.
 * @returns {void}
 * @throws {Error} If the seed is not a number, bigint, string or array of unsigned 32-bit integers.
 */
export function seed(seedValue, bitGenerator = 'xoshiro128**') {
    setGlobalSource(createBitGenerator(bitGenerator, seedValue))
}

/**
 * Replaces the global source of randomness by a function returning uniform doubles in [0, 1),
 * for example `Math.random` or a custom/secure generator. The state of such a source cannot be saved.
 *
 * @param {function(): number} fn - Uniform [0, 1) generator.
 * @returns {void}
 */
export function setRandomSource(fn) {
    setGlobalSource(new FunctionBitGenerator(fn))
}

/**
 * Returns the state of the global generator, which can later be restored with {@link setState}.
 *
 * @returns {Object} A JSON serialisable snapshot of the global generator.
 */
export function getState() {
    return getGlobalSource().getState()
}

/**
 * Restores a state previously obtained with {@link getState}.
 *
 * @param {Object} state - Snapshot returned by `getState`.
 * @returns {void}
 */
export function setState(state) {
    const source = createBitGenerator(state.bitGenerator, 0)
    source.setState(state)
    setGlobalSource(source)
}

/**
 * Returns the current global random generator as a function returning doubles in [0, 1).
 *
 * @returns {function(): number} The random number generator function.
 */
export function getRandomGenerator() {
    const source = getGlobalSource()
    return () => source.random()
}
