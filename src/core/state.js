import { Xoshiro128StarStar, mul32 } from './bit-generators.js'

/**
 * Holds the bit generator currently used by every sampling function.
 * Module level functions use the global generator (controlled by `seed`);
 * `Generator` instances temporarily install their own via `withSource`.
 * @private
 */
let globalSource = new Xoshiro128StarStar()
let current = globalSource

/**
 * Returns the active bit generator.
 * @returns {import('./bit-generators.js').BitGenerator}
 * @private
 */
export function getSource() {
    return current
}

/**
 * Replaces the global bit generator.
 * @param {import('./bit-generators.js').BitGenerator} source
 * @private
 */
export function setGlobalSource(source) {
    globalSource = source
    current = source
}

/**
 * Returns the global bit generator.
 * @private
 */
export function getGlobalSource() {
    return globalSource
}

/**
 * Runs `fn` with `source` as the active bit generator. Sampling is synchronous,
 * so the swap is safe.
 * @private
 */
export function withSource(source, fn) {
    const previous = current
    current = source
    try {
        return fn()
    } finally {
        current = previous
    }
}

/**
 * Uniform double in [0, 1) from the active bit generator.
 * @returns {number}
 * @private
 */
export function rand() {
    return current.random()
}

/**
 * Uniform double in (0, 1) from the active bit generator.
 * @returns {number}
 * @private
 */
export function randOpen() {
    let u = current.random()
    while (u === 0) {
        u = current.random()
    }
    return u
}

/**
 * Uniform unsigned 32-bit integer from the active bit generator.
 * @returns {number}
 * @private
 */
export function randUint32() {
    return current.nextUint32()
}

const TWO_POW_32 = 4294967296
const TWO_POW_53 = 9007199254740992

/**
 * Unbiased uniform integer in [0, range), for 1 <= range <= 2^53.
 *
 * Uses Lemire's nearly divisionless method, numpy's algorithm: with the PCG64 bit
 * generator the results are identical to `np.random.default_rng(seed).integers`.
 * @param {number} range
 * @returns {number}
 * @private
 */
export function randBelow(range) {
    if (range === 1) {
        return 0
    }
    if (current.name === 'function') {
        // user supplied [0, 1) functions may repeat values forever, so no rejection loop
        return Math.min(range - 1, Math.floor(current.random() * range))
    }
    if (range < TWO_POW_32) {
        let [hi, lo] = mul32(current.nextUint32(), range)
        if (lo < range) {
            const threshold = (TWO_POW_32 - range) % range
            while (lo < threshold) {
                [hi, lo] = mul32(current.nextUint32(), range)
            }
        }
        return hi
    }
    if (range === TWO_POW_32) {
        return current.nextUint32()
    }
    if (typeof current.nextUint64 === 'function') {
        return lemire64(range)
    }
    const limit = TWO_POW_53 - TWO_POW_53 % range
    let x = current.nextUint53()
    while (x >= limit) {
        x = current.nextUint53()
    }
    return x % range
}

const TWO_POW_64 = 1n << 64n

function lemire64(range) {
    const r = BigInt(range)
    let m = current.nextUint64() * r
    let leftover = m & TWO_POW_64 - 1n
    if (leftover < r) {
        const threshold = (TWO_POW_64 - r) % r
        while (leftover < threshold) {
            m = current.nextUint64() * r
            leftover = m & TWO_POW_64 - 1n
        }
    }
    return Number(m >> 64n)
}
