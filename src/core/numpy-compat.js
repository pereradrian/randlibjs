/**
 * numpy compatible seeding (SeedSequence) and the PCG64 bit generator, so that
 * `createGenerator(seed, 'pcg64')` reproduces `np.random.default_rng(seed)` streams.
 *
 * @module numpy-compat
 */
import { BitGenerator, entropy, registerBitGenerator } from './bit-generators.js'

const INIT_A = 0x43b0d7e5
const MULT_A = 0x931e8875
const INIT_B = 0x8b51f9dd
const MULT_B = 0x58f38ded
const MIX_MULT_L = 0xca01f9dd
const MIX_MULT_R = 0x4973f715
const XSHIFT = 16
const POOL_SIZE = 4

/**
 * Splits a non-negative integer (number or bigint) into little-endian 32-bit words, as numpy.
 * @private
 */
function toUint32Words(value) {
    if (Array.isArray(value) || value instanceof Uint32Array) {
        const out = []
        for (const v of value) {
            out.push(...toUint32Words(v))
        }
        return out
    }
    let v
    if (typeof value === 'bigint') {
        v = value
    } else if (typeof value === 'number' && Number.isSafeInteger(value)) {
        v = BigInt(value)
    } else {
        throw new Error('SeedSequence entropy must be a non-negative integer, bigint or an array of them.')
    }
    if (v < 0n) {
        throw new Error('SeedSequence entropy must be non-negative.')
    }
    if (v === 0n) {
        return [0]
    }
    const words = []
    while (v > 0n) {
        words.push(Number(v & 0xffffffffn))
        v >>= 32n
    }
    return words
}

/**
 * numpy's `SeedSequence`: hashes arbitrary entropy into a well mixed pool and generates
 * any number of seed words. Bit-identical to `numpy.random.SeedSequence`.
 *
 * @example
 * new SeedSequence(42).generateState(4)   // same words as SeedSequence(42).generate_state(4, np.uint32)
 */
export class SeedSequence {
    /**
     * @param {number|bigint|number[]|bigint[]} [entropy] - Entropy. Random (crypto) when omitted.
     * @param {number[]} [spawnKey=[]] - Spawn key, as numpy.
     */
    constructor(entropySource, spawnKey = []) {
        if (entropySource === undefined || entropySource === null) {
            const words = entropy(4)
            entropySource = words.reduce((acc, w, i) => acc | BigInt(w) << BigInt(32 * i), 0n)
        }
        this.entropy = entropySource
        this.spawnKey = spawnKey
        this.nChildrenSpawned = 0
        this.pool = this.mixEntropy()
    }

    /** @private */
    mixEntropy() {
        let run = toUint32Words(this.entropy)
        const spawn = this.spawnKey.length > 0 ? toUint32Words(this.spawnKey) : []
        if (spawn.length > 0 && run.length < POOL_SIZE) {
            run = run.concat(new Array(POOL_SIZE - run.length).fill(0))
        }
        const data = run.concat(spawn)
        let hashConst = INIT_A
        const hashmix = (value) => {
            value = (value ^ hashConst) >>> 0
            hashConst = Math.imul(hashConst, MULT_A) >>> 0
            value = Math.imul(value, hashConst) >>> 0
            return (value ^ value >>> XSHIFT) >>> 0
        }
        const mix = (x, y) => {
            const r = Math.imul(MIX_MULT_L, x) - Math.imul(MIX_MULT_R, y) >>> 0
            return (r ^ r >>> XSHIFT) >>> 0
        }
        const pool = new Array(POOL_SIZE)
        for (let i = 0; i < POOL_SIZE; i++) {
            pool[i] = hashmix(i < data.length ? data[i] : 0)
        }
        for (let src = 0; src < POOL_SIZE; src++) {
            for (let dst = 0; dst < POOL_SIZE; dst++) {
                if (src !== dst) {
                    pool[dst] = mix(pool[dst], hashmix(pool[src]))
                }
            }
        }
        for (let src = POOL_SIZE; src < data.length; src++) {
            for (let dst = 0; dst < POOL_SIZE; dst++) {
                pool[dst] = mix(pool[dst], hashmix(data[src]))
            }
        }
        return pool
    }

    /**
     * Returns `n` unsigned 32-bit seed words (numpy `generate_state(n, np.uint32)`).
     * @param {number} n
     * @returns {number[]}
     */
    generateState(n) {
        let hashConst = INIT_B
        const out = new Array(n)
        for (let i = 0; i < n; i++) {
            let v = this.pool[i % POOL_SIZE]
            v = (v ^ hashConst) >>> 0
            hashConst = Math.imul(hashConst, MULT_B) >>> 0
            v = Math.imul(v, hashConst) >>> 0
            out[i] = (v ^ v >>> XSHIFT) >>> 0
        }
        return out
    }

    /**
     * Returns `n` unsigned 64-bit seed words as bigints (numpy `generate_state(n, np.uint64)`).
     * @param {number} n
     * @returns {bigint[]}
     */
    generateState64(n) {
        const words = this.generateState(2 * n)
        return Array.from({ length: n }, (_, i) => BigInt(words[2 * i]) | BigInt(words[2 * i + 1]) << 32n)
    }

    /**
     * Creates `n` independent child sequences (numpy `spawn`).
     * @param {number} n
     * @returns {SeedSequence[]}
     */
    spawn(n) {
        return Array.from({ length: n }, () => new SeedSequence(this.entropy, [...this.spawnKey, this.nChildrenSpawned++]))
    }
}

const MASK128 = (1n << 128n) - 1n
const PCG64_MULT = 0x2360ed051fc65da44385df649fccf645n
const TWO_POW_32 = 4294967296
// multiplier limbs, least significant first
const M0 = 0x9fccf645
const M1 = 0x4385df64
const M2 = 0x1fc65da4
const M3 = 0x2360ed05

let HI = 0
let LO = 0

/** 32 x 32 -> 64-bit product into (HI, LO). @private */
function mulTo(a, b) {
    const a0 = a & 0xffff
    const a1 = a >>> 16
    const b0 = b & 0xffff
    const b1 = b >>> 16
    const p00 = a0 * b0
    const p01 = a0 * b1
    const p10 = a1 * b0
    const mid = (p00 >>> 16) + (p01 & 0xffff) + (p10 & 0xffff)
    LO = ((mid & 0xffff) << 16 | p00 & 0xffff) >>> 0
    HI = a1 * b1 + (p01 >>> 16) + (p10 >>> 16) + (mid >>> 16)
}

function limbsToBigInt(l) {
    return BigInt(l[3]) << 96n | BigInt(l[2]) << 64n | BigInt(l[1]) << 32n | BigInt(l[0])
}

function bigIntToLimbs(v) {
    v &= MASK128
    return [Number(v & 0xffffffffn), Number(v >> 32n & 0xffffffffn), Number(v >> 64n & 0xffffffffn), Number(v >> 96n)]
}

/**
 * PCG64 (PCG-XSL-RR 128/64), numpy's default bit generator. Seeded through
 * {@link SeedSequence} exactly as numpy, so `new PCG64(seed).random()` equals
 * `np.random.default_rng(seed).random()`. Uses BigInt 128-bit arithmetic, so it is slower
 * than the 32-bit generators; prefer it when cross-language reproducibility matters.
 */
export class PCG64 extends BitGenerator {
    /**
     * @param {number|bigint|number[]|SeedSequence} [seed] - Seed or SeedSequence. Random if omitted.
     */
    constructor(seed) {
        super()
        const seq = seed instanceof SeedSequence ? seed : new SeedSequence(seed)
        const [s0, s1, i0, i1] = seq.generateState64(4)
        this.seedState(s0 << 64n | s1, i0 << 64n | i1)
    }

    get name() {
        return 'pcg64'
    }

    /** @private */
    seedState(initState, initSeq) {
        this.state = 0n
        this.inc = (initSeq << 1n | 1n) & MASK128
        this.step()
        this.state = this.state + initState & MASK128
        this.step()
        this.hasUint32 = false
        this.uinteger = 0
        this.outHi = 0
        this.outLo = 0
        this.gauss = null
    }

    // The 128-bit state and increment are stored as 32-bit limbs (s0 least significant);
    // the BigInt accessors are only used for seeding, advance() and state snapshots.
    get state() {
        return limbsToBigInt([this.s0, this.s1, this.s2, this.s3])
    }

    set state(value) {
        [this.s0, this.s1, this.s2, this.s3] = bigIntToLimbs(value)
    }

    get inc() {
        return limbsToBigInt([this.c0, this.c1, this.c2, this.c3])
    }

    set inc(value) {
        [this.c0, this.c1, this.c2, this.c3] = bigIntToLimbs(value)
    }

    /** state = state * multiplier + inc (mod 2^128), with 32-bit limbs. @private */
    step() {
        const s0 = this.s0
        const s1 = this.s1
        const s2 = this.s2
        const s3 = this.s3
        let a0 = this.c0
        let a1 = this.c1
        let a2 = this.c2
        let a3 = this.c3 + (Math.imul(s0, M3) >>> 0) + (Math.imul(s1, M2) >>> 0) + (Math.imul(s2, M1) >>> 0) + (Math.imul(s3, M0) >>> 0)
        mulTo(s0, M0); a0 += LO; a1 += HI
        mulTo(s0, M1); a1 += LO; a2 += HI
        mulTo(s1, M0); a1 += LO; a2 += HI
        mulTo(s0, M2); a2 += LO; a3 += HI
        mulTo(s1, M1); a2 += LO; a3 += HI
        mulTo(s2, M0); a2 += LO; a3 += HI
        let carry = Math.floor(a0 / TWO_POW_32)
        this.s0 = a0 - carry * TWO_POW_32
        a1 += carry
        carry = Math.floor(a1 / TWO_POW_32)
        this.s1 = a1 - carry * TWO_POW_32
        a2 += carry
        carry = Math.floor(a2 / TWO_POW_32)
        this.s2 = a2 - carry * TWO_POW_32
        this.s3 = (a3 + carry) % TWO_POW_32
    }

    /** Steps and stores the next 64-bit output in (outHi, outLo). @private */
    next() {
        this.step()
        const xh = (this.s3 ^ this.s1) >>> 0
        const xl = (this.s2 ^ this.s0) >>> 0
        const rot = this.s3 >>> 26
        if (rot === 0) {
            this.outHi = xh
            this.outLo = xl
        } else if (rot < 32) {
            this.outHi = (xh >>> rot | xl << 32 - rot) >>> 0
            this.outLo = (xl >>> rot | xh << 32 - rot) >>> 0
        } else if (rot === 32) {
            this.outHi = xl
            this.outLo = xh
        } else {
            const r = rot - 32
            this.outHi = (xl >>> r | xh << 32 - r) >>> 0
            this.outLo = (xh >>> r | xl << 32 - r) >>> 0
        }
    }

    /**
     * Next 64-bit output as [hi, lo] unsigned 32-bit numbers (XSL-RR output function).
     * @returns {number[]}
     */
    nextUint64Parts() {
        this.next()
        return [this.outHi, this.outLo]
    }

    /**
     * Next unsigned 64-bit output as a bigint.
     * @returns {bigint}
     */
    nextUint64() {
        this.next()
        return BigInt(this.outHi) << 32n | BigInt(this.outLo)
    }

    /**
     * Unsigned 32-bit output; uses both halves of each 64-bit output (low half first), as numpy.
     * @returns {number}
     */
    nextUint32() {
        if (this.hasUint32) {
            this.hasUint32 = false
            return this.uinteger
        }
        this.next()
        this.hasUint32 = true
        this.uinteger = this.outHi
        return this.outLo
    }

    /**
     * Uniform double in [0, 1) from the top 53 bits of one 64-bit output (numpy `random`).
     * @returns {number}
     */
    random() {
        this.next()
        return (this.outHi * 2097152 + (this.outLo >>> 11)) / 9007199254740992
    }

    nextUint53() {
        this.next()
        return this.outHi * 2097152 + (this.outLo >>> 11)
    }

    /**
     * Advances the state by `delta` steps in O(log delta) (numpy `advance`).
     * @param {number|bigint} delta
     * @returns {this}
     */
    advance(delta) {
        let d = BigInt(delta) & MASK128
        let accMult = 1n
        let accPlus = 0n
        let curMult = PCG64_MULT
        let curPlus = this.inc
        while (d > 0n) {
            if (d & 1n) {
                accMult = accMult * curMult & MASK128
                accPlus = accPlus * curMult + curPlus & MASK128
            }
            curPlus = (curMult + 1n) * curPlus & MASK128
            curMult = curMult * curMult & MASK128
            d >>= 1n
        }
        this.state = accMult * this.state + accPlus & MASK128
        this.hasUint32 = false
        this.gauss = null
        return this
    }

    getState() {
        return {
            bitGenerator: this.name,
            state: this.state.toString(),
            inc: this.inc.toString(),
            hasUint32: this.hasUint32,
            uinteger: this.uinteger,
            gauss: this.gauss,
        }
    }

    setState(state) {
        if (!state || state.state === undefined || state.inc === undefined) {
            throw new Error('Invalid pcg64 state.')
        }
        this.state = BigInt(state.state) & MASK128
        this.inc = BigInt(state.inc) & MASK128
        this.hasUint32 = Boolean(state.hasUint32)
        this.uinteger = state.uinteger >>> 0
        this.gauss = state.gauss ?? null
    }
}

registerBitGenerator('pcg64', PCG64)
