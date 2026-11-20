/**
 * The remaining numpy bit generators: SFC64, Philox (4x64-10) and PCG64DXSM, seeded through
 * {@link SeedSequence} exactly as numpy, so raw outputs and `random()` match numpy.
 * They use BigInt arithmetic: prefer them for cross-language reproducibility, not speed.
 *
 * @module numpy-bitgens
 */
import { BitGenerator, registerBitGenerator } from './bit-generators.js'
import { SeedSequence } from './numpy-compat.js'

const M64 = (1n << 64n) - 1n
const M128 = (1n << 128n) - 1n

function seedSequenceOf(seed) {
    return seed instanceof SeedSequence ? seed : new SeedSequence(seed)
}

/**
 * Base class: subclasses provide `next64()` returning a bigint; 32-bit outputs are buffered
 * (low half first) as numpy does.
 * @abstract
 */
export class NumpyBitGenerator64 extends BitGenerator {
    constructor() {
        super()
        this.hasUint32 = false
        this.uinteger = 0
        this.gauss = null
    }

    /** @returns {bigint} Next unsigned 64-bit output. */
    nextUint64() {
        return this.next64()
    }

    /** @returns {number[]} Next 64-bit output as [hi, lo] unsigned 32-bit numbers. */
    nextUint64Parts() {
        const v = this.next64()
        return [Number(v >> 32n), Number(v & 0xffffffffn)]
    }

    nextUint32() {
        if (this.hasUint32) {
            this.hasUint32 = false
            return this.uinteger
        }
        const v = this.next64()
        this.hasUint32 = true
        this.uinteger = Number(v >> 32n)
        return Number(v & 0xffffffffn)
    }

    random() {
        return Number(this.next64() >> 11n) / 9007199254740992
    }

    nextUint53() {
        return Number(this.next64() >> 11n)
    }

    /** @protected */
    baseState() {
        return { bitGenerator: this.name, hasUint32: this.hasUint32, uinteger: this.uinteger, gauss: this.gauss }
    }

    /** @protected */
    restoreBase(state) {
        this.hasUint32 = Boolean(state.hasUint32)
        this.uinteger = state.uinteger >>> 0
        this.gauss = state.gauss ?? null
    }
}

/**
 * SFC64, the Small Fast Chaotic generator by Chris Doty-Humphrey (numpy `SFC64`).
 */
export class SFC64 extends NumpyBitGenerator64 {
    /**
     * @param {number|bigint|number[]|SeedSequence} [seed] - Seed. Random if omitted.
     */
    constructor(seed) {
        super()
        const [a, b, c] = seedSequenceOf(seed).generateState64(3)
        this.s = [a, b, c, 1n]
        for (let i = 0; i < 12; i++) {
            this.next64()
        }
    }

    get name() {
        return 'sfc64'
    }

    next64() {
        const s = this.s
        const tmp = s[0] + s[1] + s[3] & M64
        s[3] = s[3] + 1n & M64
        s[0] = s[1] ^ s[1] >> 11n
        s[1] = s[2] + (s[2] << 3n) & M64
        s[2] = ((s[2] << 24n | s[2] >> 40n) & M64) + tmp & M64
        return tmp
    }

    getState() {
        return { ...this.baseState(), state: this.s.map(String) }
    }

    setState(state) {
        if (!state || !Array.isArray(state.state) || state.state.length !== 4) {
            throw new Error('Invalid sfc64 state.')
        }
        this.s = state.state.map((v) => BigInt(v) & M64)
        this.restoreBase(state)
    }
}

const PHILOX_M0 = 0xd2e7470ee14c6c93n
const PHILOX_M1 = 0xca5a826395121157n
const PHILOX_W0 = 0x9e3779b97f4a7c15n
const PHILOX_W1 = 0xbb67ae8584caa73bn

/**
 * Philox 4x64-10 counter-based generator (Salmon et al., 2011; numpy `Philox`).
 * `advance(n)` jumps n blocks of four outputs in O(1), and different keys give independent streams.
 */
export class Philox extends NumpyBitGenerator64 {
    /**
     * @param {number|bigint|number[]|SeedSequence} [seed] - Seed. Random if omitted.
     * @param {Object} [options]
     * @param {Array<bigint|number>} [options.key] - Explicit 2 x 64-bit key instead of a seed.
     * @param {Array<bigint|number>} [options.counter] - Initial 4 x 64-bit counter.
     */
    constructor(seed, { key, counter } = {}) {
        super()
        this.key = key ? key.map((v) => BigInt(v) & M64) : seedSequenceOf(seed).generateState64(2)
        this.counter = counter ? counter.map((v) => BigInt(v) & M64) : [0n, 0n, 0n, 0n]
        this.buffer = [0n, 0n, 0n, 0n]
        this.bufferPos = 4
    }

    get name() {
        return 'philox'
    }

    /** @private */
    block() {
        let [c0, c1, c2, c3] = this.counter
        let k0 = this.key[0]
        let k1 = this.key[1]
        for (let round = 0; round < 10; round++) {
            if (round > 0) {
                k0 = k0 + PHILOX_W0 & M64
                k1 = k1 + PHILOX_W1 & M64
            }
            const p0 = PHILOX_M0 * c0
            const p1 = PHILOX_M1 * c2
            const next0 = p1 >> 64n ^ c1 ^ k0
            const next2 = p0 >> 64n ^ c3 ^ k1
            c1 = p1 & M64
            c3 = p0 & M64
            c0 = next0
            c2 = next2
        }
        return [c0, c1, c2, c3]
    }

    next64() {
        if (this.bufferPos < 4) {
            return this.buffer[this.bufferPos++]
        }
        const ctr = this.counter
        for (let i = 0; i < 4; i++) {
            ctr[i] = ctr[i] + 1n & M64
            if (ctr[i] !== 0n) break
        }
        this.buffer = this.block()
        this.bufferPos = 1
        return this.buffer[0]
    }

    /**
     * Advances the counter by `delta` blocks (4 outputs each), as numpy `advance`.
     * @param {number|bigint} delta
     * @returns {this}
     */
    advance(delta) {
        let carry = BigInt(delta)
        for (let i = 0; i < 4 && carry > 0n; i++) {
            const sum = this.counter[i] + (carry & M64)
            this.counter[i] = sum & M64
            carry = (carry >> 64n) + (sum >> 64n)
        }
        this.bufferPos = 4
        this.hasUint32 = false
        this.gauss = null
        return this
    }

    getState() {
        return {
            ...this.baseState(),
            counter: this.counter.map(String),
            key: this.key.map(String),
            buffer: this.buffer.map(String),
            bufferPos: this.bufferPos,
        }
    }

    setState(state) {
        if (!state || !Array.isArray(state.counter) || !Array.isArray(state.key)) {
            throw new Error('Invalid philox state.')
        }
        this.counter = state.counter.map((v) => BigInt(v) & M64)
        this.key = state.key.map((v) => BigInt(v) & M64)
        this.buffer = (state.buffer ?? [0, 0, 0, 0]).map((v) => BigInt(v) & M64)
        this.bufferPos = state.bufferPos ?? 4
        this.restoreBase(state)
    }
}

const CHEAP_MULT = 0xda942042e4dd58b5n
const PCG64_MULT = 0x2360ed051fc65da44385df649fccf645n

/**
 * PCG64DXSM (numpy `PCG64DXSM`): PCG with a 64-bit multiplier and the DXSM output function,
 * the variant numpy recommends for heavily parallel workloads.
 */
export class PCG64DXSM extends NumpyBitGenerator64 {
    /**
     * @param {number|bigint|number[]|SeedSequence} [seed] - Seed. Random if omitted.
     */
    constructor(seed) {
        super()
        const [s0, s1, i0, i1] = seedSequenceOf(seed).generateState64(4)
        // numpy seeds it with the same routine as PCG64 (128-bit multiplier); the cheap
        // multiplier is only used when generating
        this.state = 0n
        this.inc = ((i0 << 64n | i1) << 1n | 1n) & M128
        this.seedStep()
        this.state = this.state + (s0 << 64n | s1) & M128
        this.seedStep()
    }

    /** @private */
    seedStep() {
        this.state = this.state * PCG64_MULT + this.inc & M128
    }

    get name() {
        return 'pcg64dxsm'
    }

    /** @private */
    step() {
        this.state = this.state * CHEAP_MULT + this.inc & M128
    }

    next64() {
        let hi = this.state >> 64n
        const lo = this.state & M64 | 1n
        hi ^= hi >> 32n
        hi = hi * CHEAP_MULT & M64
        hi ^= hi >> 48n
        hi = hi * lo & M64
        this.step()
        return hi
    }

    getState() {
        return { ...this.baseState(), state: this.state.toString(), inc: this.inc.toString() }
    }

    setState(state) {
        if (!state || state.state === undefined || state.inc === undefined) {
            throw new Error('Invalid pcg64dxsm state.')
        }
        this.state = BigInt(state.state) & M128
        this.inc = BigInt(state.inc) & M128
        this.restoreBase(state)
    }
}

registerBitGenerator('sfc64', SFC64)
registerBitGenerator('philox', Philox)
registerBitGenerator('pcg64dxsm', PCG64DXSM)
