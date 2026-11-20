/**
 * Bit generators: the low level sources of randomness.
 *
 * Every bit generator exposes the same interface:
 *  - `nextUint32()`  a uniformly distributed unsigned 32-bit integer.
 *  - `random()`      a uniformly distributed double in [0, 1) with 53 bits of resolution.
 *  - `getState()` / `setState(state)` to snapshot and restore the stream.
 *  - `clone()`       an independent copy positioned at the same point of the stream.
 *
 * All generators are implemented with 32-bit integer arithmetic only (no BigInt),
 * so they are fast in every JavaScript engine.
 *
 * @module bit-generators
 */

const TWO_POW_32 = 4294967296
const TWO_POW_26 = 67108864
const TWO_POW_53 = 9007199254740992

/**
 * Converts any supported seed into an array of unsigned 32-bit words.
 *
 * @param {number|bigint|string|number[]|Uint32Array} seed
 * @returns {number[]}
 * @private
 */
export function seedToWords(seed) {
    if (typeof seed === 'number') {
        if (!Number.isFinite(seed)) {
            throw new Error('Seed must be a finite number.')
        }
        let value = Math.abs(Math.trunc(seed))
        const words = [value % TWO_POW_32 >>> 0]
        value = Math.floor(value / TWO_POW_32)
        while (value > 0) {
            words.push(value % TWO_POW_32 >>> 0)
            value = Math.floor(value / TWO_POW_32)
        }
        if (seed < 0) {
            words.push(0x9e3779b9)
        }
        return words
    }
    if (typeof seed === 'bigint') {
        let value = seed < 0n ? -seed : seed
        const words = [Number(value & 0xffffffffn)]
        value >>= 32n
        while (value > 0n) {
            words.push(Number(value & 0xffffffffn))
            value >>= 32n
        }
        if (seed < 0n) {
            words.push(0x9e3779b9)
        }
        return words
    }
    if (typeof seed === 'string') {
        const words = []
        for (let i = 0; i < seed.length; i++) {
            words.push(seed.charCodeAt(i) >>> 0)
        }
        return words.length > 0 ? words : [0]
    }
    if (Array.isArray(seed) || seed instanceof Uint32Array) {
        if (seed.length === 0) {
            throw new Error('Seed array must not be empty.')
        }
        return Array.from(seed, (word) => {
            if (!Number.isInteger(word) || word < 0 || word >= TWO_POW_32) {
                throw new Error('Seed arrays must contain unsigned 32-bit integers.')
            }
            return word >>> 0
        })
    }
    throw new Error('Seed must be a number, a bigint, a string or an array of unsigned 32-bit integers.')
}

/**
 * Produces `count` well mixed 32-bit words from a seed, using a SplitMix32 style
 * finalizer over all the seed words. Used to initialise generator states.
 *
 * @param {number[]} words - Seed words.
 * @param {number} count - Number of words to produce.
 * @returns {number[]}
 * @private
 */
export function expandSeed(words, count) {
    let h = 0x6a09e667 ^ words.length
    for (const word of words) {
        h = Math.imul(h ^ word, 0x85ebca6b)
        h = (h << 13 | h >>> 19) >>> 0
        h = Math.imul(h, 0xc2b2ae35) >>> 0
    }
    const out = []
    let state = h >>> 0
    for (let i = 0; i < count; i++) {
        state = state + 0x9e3779b9 >>> 0
        let z = state
        z = Math.imul(z ^ z >>> 16, 0x21f0aaad)
        z = Math.imul(z ^ z >>> 15, 0x735a2d97)
        out.push((z ^ z >>> 15) >>> 0)
    }
    return out
}

/**
 * Returns 32-bit words from a cryptographically secure source if available,
 * otherwise from `Math.random`.
 *
 * @param {number} count
 * @returns {number[]}
 * @private
 */
export function entropy(count) {
    const crypto = globalThis.crypto
    if (crypto && typeof crypto.getRandomValues === 'function') {
        return Array.from(crypto.getRandomValues(new Uint32Array(count)))
    }
    return Array.from({ length: count }, () => Math.floor(Math.random() * TWO_POW_32) >>> 0)
}

/**
 * Base class implementing the shared helpers on top of `nextUint32`.
 * @abstract
 */
export class BitGenerator {
    /**
     * Uniform double in [0, 1) with 53 random bits.
     * @returns {number}
     */
    random() {
        const a = this.nextUint32() >>> 5
        const b = this.nextUint32() >>> 6
        return (a * TWO_POW_26 + b) / TWO_POW_53
    }

    /**
     * Uniform unsigned integer in [0, 2^53).
     * @returns {number}
     */
    nextUint53() {
        const a = this.nextUint32() >>> 5
        const b = this.nextUint32() >>> 6
        return a * TWO_POW_26 + b
    }

    /**
     * Independent copy positioned at the same point of the stream.
     * @returns {BitGenerator}
     */
    clone() {
        const copy = Object.create(Object.getPrototypeOf(this))
        copy.setState(this.getState())
        return copy
    }
}

/**
 * xoshiro128** 1.1 by David Blackman and Sebastiano Vigna (2018).
 * Period 2^128 - 1, passes BigCrush. This is the default bit generator.
 *
 * Reference: https://prng.di.unimi.it/
 */
export class Xoshiro128StarStar extends BitGenerator {
    /**
     * @param {number|bigint|string|number[]} [seed] - Seed. Random if omitted.
     */
    constructor(seed) {
        super()
        const words = seed === undefined || seed === null ? entropy(4) : seedToWords(seed)
        this.s = expandSeed(words, 4)
        if ((this.s[0] | this.s[1] | this.s[2] | this.s[3]) === 0) {
            this.s[0] = 1
        }
        this.gauss = null
    }

    get name() {
        return 'xoshiro128**'
    }

    nextUint32() {
        const s = this.s
        const m = Math.imul(s[1], 5)
        const r = Math.imul(m << 7 | m >>> 25, 9) >>> 0
        const t = s[1] << 9
        s[2] ^= s[0]
        s[3] ^= s[1]
        s[1] ^= s[2]
        s[0] ^= s[3]
        s[2] ^= t
        s[3] = s[3] << 11 | s[3] >>> 21
        return r
    }

    /**
     * Advances the stream by 2^64 steps. Calling `jump` on clones yields
     * 2^64 non-overlapping sub-streams, useful for parallel simulations.
     * @returns {this}
     */
    jump() {
        const JUMP = [0x8764000b, 0xf542d2d3, 0x6fa035c3, 0x77f2db5b]
        let s0 = 0
        let s1 = 0
        let s2 = 0
        let s3 = 0
        for (const word of JUMP) {
            for (let b = 0; b < 32; b++) {
                if (word & 1 << b) {
                    s0 ^= this.s[0]
                    s1 ^= this.s[1]
                    s2 ^= this.s[2]
                    s3 ^= this.s[3]
                }
                this.nextUint32()
            }
        }
        this.s = [s0 >>> 0, s1 >>> 0, s2 >>> 0, s3 >>> 0]
        this.gauss = null
        return this
    }

    getState() {
        return { bitGenerator: this.name, state: this.s.map((x) => x >>> 0), gauss: this.gauss }
    }

    setState(state) {
        if (!state || !Array.isArray(state.state) || state.state.length !== 4) {
            throw new Error('Invalid xoshiro128** state.')
        }
        this.s = state.state.map((x) => x >>> 0)
        this.gauss = state.gauss ?? null
    }
}

/**
 * Multiplies two unsigned 32-bit integers returning the full 64-bit product as [hi, lo].
 * @private
 */
export function mul32(a, b) {
    const a0 = a & 0xffff
    const a1 = a >>> 16
    const b0 = b & 0xffff
    const b1 = b >>> 16
    const p00 = a0 * b0
    const p01 = a0 * b1
    const p10 = a1 * b0
    const p11 = a1 * b1
    const mid = (p00 >>> 16) + (p01 & 0xffff) + (p10 & 0xffff)
    const lo = ((mid & 0xffff) << 16 | p00 & 0xffff) >>> 0
    const hi = p11 + (p01 >>> 16) + (p10 >>> 16) + (mid >>> 16) >>> 0
    return [hi, lo]
}

const PCG_MULT_HI = 0x5851f42d
const PCG_MULT_LO = 0x4c957f2d

/**
 * PCG32 (PCG-XSH-RR 64/32) by Melissa E. O'Neill (2014).
 * 64-bit state, 2^63 selectable streams, period 2^64.
 * Output is bit-identical to the reference C implementation `pcg32_random_r`.
 *
 * Reference: https://www.pcg-random.org/
 */
export class PCG32 extends BitGenerator {
    /**
     * @param {number|bigint|string|number[]} [seed] - Seed. Random if omitted.
     * @param {number|bigint} [stream] - Stream selector (sequence constant). Derived from the seed if omitted.
     */
    constructor(seed, stream) {
        super()
        let initState
        let initSeq
        if (seed === undefined || seed === null) {
            const e = entropy(4)
            initState = [e[0], e[1]]
            initSeq = [e[2], e[3]]
        } else if ((typeof seed === 'number' || typeof seed === 'bigint') && stream !== undefined) {
            initState = splitHiLo(seed)
            initSeq = splitHiLo(stream)
        } else {
            const e = expandSeed(seedToWords(seed), 4)
            initState = [e[0], e[1]]
            initSeq = stream === undefined ? [e[2], e[3]] : splitHiLo(stream)
        }
        this.seed(initState, initSeq)
    }

    get name() {
        return 'pcg32'
    }

    /** @private */
    seed([stateHi, stateLo], [seqHi, seqLo]) {
        this.hi = 0
        this.lo = 0
        // inc = (initseq << 1) | 1
        this.incHi = (seqHi << 1 | seqLo >>> 31) >>> 0
        this.incLo = (seqLo << 1 | 1) >>> 0
        this.step()
        const lo = this.lo + stateLo >>> 0
        const carry = lo < this.lo ? 1 : 0
        this.hi = this.hi + stateHi + carry >>> 0
        this.lo = lo
        this.step()
        this.gauss = null
    }

    /** @private */
    step() {
        const [phi, plo] = mul32(this.lo, PCG_MULT_LO)
        const hi = phi + Math.imul(this.hi, PCG_MULT_LO) + Math.imul(this.lo, PCG_MULT_HI) >>> 0
        const lo = plo + this.incLo >>> 0
        const carry = lo < plo ? 1 : 0
        this.hi = hi + this.incHi + carry >>> 0
        this.lo = lo
    }

    nextUint32() {
        const h = this.hi
        const l = this.lo
        this.step()
        const xhi = (h >>> 18 ^ h) >>> 0
        const xlo = ((l >>> 18 | h << 14) ^ l) >>> 0
        const xorshifted = (xlo >>> 27 | xhi << 5) >>> 0
        const rot = h >>> 27
        return (xorshifted >>> rot | xorshifted << (-rot & 31)) >>> 0
    }

    getState() {
        return { bitGenerator: this.name, state: [this.hi, this.lo], inc: [this.incHi, this.incLo], gauss: this.gauss }
    }

    setState(state) {
        if (!state || !Array.isArray(state.state) || !Array.isArray(state.inc)) {
            throw new Error('Invalid pcg32 state.')
        }
        ;[this.hi, this.lo] = state.state.map((x) => x >>> 0)
        ;[this.incHi, this.incLo] = state.inc.map((x) => x >>> 0)
        this.gauss = state.gauss ?? null
    }
}

/** @private */
function splitHiLo(value) {
    if (typeof value === 'bigint') {
        const v = BigInt.asUintN(64, value)
        return [Number(v >> 32n), Number(v & 0xffffffffn)]
    }
    if (!Number.isInteger(value) || value < 0) {
        throw new Error('PCG32 seed and stream must be non-negative integers.')
    }
    return [Math.floor(value / TWO_POW_32) >>> 0, value % TWO_POW_32 >>> 0]
}

const MT_N = 624
const MT_M = 397

/**
 * Mersenne Twister MT19937 by Matsumoto and Nishimura (1998).
 *
 * Seeding with a single integer in [0, 2^32) uses `init_genrand`, and seeding with an
 * array uses `init_by_array`, exactly as numpy's legacy `RandomState`. Combined with the
 * library's `random`, `normal` and `exponential` samplers this reproduces numpy's
 * `np.random.RandomState(seed)` `random_sample`, `standard_normal` and
 * `standard_exponential` streams bit for bit.
 */
export class MT19937 extends BitGenerator {
    /**
     * @param {number|bigint|string|number[]} [seed] - Seed. Random if omitted.
     */
    constructor(seed) {
        super()
        this.mt = new Uint32Array(MT_N)
        this.index = MT_N + 1
        if (seed === undefined || seed === null) {
            this.initByArray(entropy(MT_N))
        } else if (typeof seed === 'number' && Number.isInteger(seed) && seed >= 0 && seed < TWO_POW_32) {
            this.initGenrand(seed)
        } else {
            this.initByArray(seedToWords(seed))
        }
        this.gauss = null
    }

    get name() {
        return 'mt19937'
    }

    /** @private */
    initGenrand(s) {
        const mt = this.mt
        mt[0] = s >>> 0
        for (let i = 1; i < MT_N; i++) {
            const prev = mt[i - 1] ^ mt[i - 1] >>> 30
            mt[i] = Math.imul(1812433253, prev) + i
        }
        this.index = MT_N
    }

    /** @private */
    initByArray(key) {
        const mt = this.mt
        this.initGenrand(19650218)
        let i = 1
        let j = 0
        let k = Math.max(MT_N, key.length)
        for (; k > 0; k--) {
            const prev = mt[i - 1] ^ mt[i - 1] >>> 30
            mt[i] = (mt[i] ^ Math.imul(prev, 1664525)) + key[j] + j
            i++
            j++
            if (i >= MT_N) {
                mt[0] = mt[MT_N - 1]
                i = 1
            }
            if (j >= key.length) {
                j = 0
            }
        }
        for (k = MT_N - 1; k > 0; k--) {
            const prev = mt[i - 1] ^ mt[i - 1] >>> 30
            mt[i] = (mt[i] ^ Math.imul(prev, 1566083941)) - i
            i++
            if (i >= MT_N) {
                mt[0] = mt[MT_N - 1]
                i = 1
            }
        }
        mt[0] = 0x80000000
        this.index = MT_N
    }

    /** @private */
    twist() {
        const mt = this.mt
        for (let kk = 0; kk < MT_N; kk++) {
            const y = mt[kk] & 0x80000000 | mt[(kk + 1) % MT_N] & 0x7fffffff
            mt[kk] = mt[(kk + MT_M) % MT_N] ^ y >>> 1 ^ (y & 1 ? 0x9908b0df : 0)
        }
        this.index = 0
    }

    nextUint32() {
        if (this.index >= MT_N) {
            this.twist()
        }
        let y = this.mt[this.index++]
        y ^= y >>> 11
        y ^= y << 7 & 0x9d2c5680
        y ^= y << 15 & 0xefc60000
        y ^= y >>> 18
        return y >>> 0
    }

    getState() {
        return { bitGenerator: this.name, state: Array.from(this.mt), index: this.index, gauss: this.gauss }
    }

    setState(state) {
        if (!state || !Array.isArray(state.state) || state.state.length !== MT_N) {
            throw new Error('Invalid mt19937 state.')
        }
        this.mt = Uint32Array.from(state.state)
        this.index = state.index
        this.gauss = state.gauss ?? null
    }
}

/**
 * Wraps any function returning doubles in [0, 1) (e.g. `Math.random`) as a bit generator.
 * Its state cannot be saved or restored.
 */
export class FunctionBitGenerator extends BitGenerator {
    /**
     * @param {function(): number} fn - Function returning uniform doubles in [0, 1).
     */
    constructor(fn) {
        super()
        if (typeof fn !== 'function') {
            throw new Error('FunctionBitGenerator expects a function.')
        }
        this.fn = fn
        this.gauss = null
    }

    get name() {
        return 'function'
    }

    nextUint32() {
        return Math.floor(this.fn() * TWO_POW_32) >>> 0
    }

    random() {
        return this.fn()
    }

    getState() {
        return { bitGenerator: this.name, gauss: this.gauss }
    }

    setState(state) {
        this.gauss = state?.gauss ?? null
    }

    clone() {
        return new FunctionBitGenerator(this.fn)
    }
}

/**
 * Registry of the bit generators by name.
 * @type {Object<string, Function>}
 */
export const BIT_GENERATORS = {
    'xoshiro128**': Xoshiro128StarStar,
    xoshiro128: Xoshiro128StarStar,
    pcg32: PCG32,
    mt19937: MT19937,
}

/**
 * Registers an additional bit generator constructor under a name.
 * @param {string} name
 * @param {Function} ctor - Constructor taking a seed.
 * @private
 */
export function registerBitGenerator(name, ctor) {
    BIT_GENERATORS[name] = ctor
}

/**
 * Creates a bit generator by name.
 *
 * @param {string} [name='xoshiro128**'] - One of `'xoshiro128**'`, `'pcg32'`, `'mt19937'`, `'pcg64'`.
 * @param {number|bigint|string|number[]} [seed] - Seed. Random if omitted.
 * @returns {BitGenerator}
 */
export function createBitGenerator(name = 'xoshiro128**', seed) {
    const Ctor = BIT_GENERATORS[String(name).toLowerCase()]
    if (!Ctor) {
        throw new Error(`Unknown bit generator "${name}". Available: ${Object.keys(BIT_GENERATORS).join(', ')}.`)
    }
    return new Ctor(seed)
}
