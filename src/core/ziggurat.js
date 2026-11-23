/**
 * 256-layer ziggurat samplers for the standard normal and standard exponential
 * distributions (Marsaglia & Tsang, 2000), with the exact tables and bit usage of numpy's
 * `Generator`: a PCG64 stream reproduces `default_rng(seed).standard_normal()` and
 * `standard_exponential()` bit for bit. About twice as fast as the polar method.
 *
 * @module ziggurat
 * @private
 */
import { WI, WE } from './ziggurat-tables.js'

const TWO_POW_23 = 8388608
const TWO_POW_21 = 2097152
const TWO_POW_52 = 4503599627370496
const TWO_POW_53 = 9007199254740992

const NOR_R = 3.654152885361009
const NOR_INV_R = 0.2736612373297583
const EXP_R = 7.69711747013105

// Acceptance thresholds (ki, ke) and densities (fi, fe). They only steer the rare slow path,
// so they are computed here rather than stored.
const KI = new Float64Array(256)
const FI = new Float64Array(256)
const KE = new Float64Array(256)
const FE = new Float64Array(256)
{
    const v = 0.00492867323397465
    let dn = NOR_R
    let tn = dn
    const q = v / Math.exp(-0.5 * dn * dn)
    KI[0] = Math.floor(dn / q * TWO_POW_52)
    FI[0] = 1
    FI[255] = Math.exp(-0.5 * dn * dn)
    for (let i = 254; i >= 1; i--) {
        dn = Math.sqrt(-2 * Math.log(v / dn + Math.exp(-0.5 * dn * dn)))
        KI[i + 1] = Math.floor(dn / tn * TWO_POW_52)
        tn = dn
        FI[i] = Math.exp(-0.5 * dn * dn)
    }
    const ve = 0.003949659822581557
    let de = EXP_R
    let te = de
    const qe = ve / Math.exp(-de)
    KE[0] = Math.floor(de / qe * TWO_POW_53)
    FE[0] = 1
    FE[255] = Math.exp(-de)
    for (let i = 254; i >= 1; i--) {
        de = -Math.log(ve / de + Math.exp(-de))
        KE[i + 1] = Math.floor(de / te * TWO_POW_53)
        te = de
        FE[i] = Math.exp(-de)
    }
}

let ZH = 0
let ZL = 0

/**
 * Loads the next 64 random bits into (ZH, ZL) as unsigned 32-bit halves, without allocating.
 * @private
 */
function next64(source) {
    if (typeof source.next === 'function' && source.outHi !== undefined) {
        source.next()
        ZH = source.outHi
        ZL = source.outLo
        return
    }
    if (typeof source.nextUint64Parts === 'function') {
        [ZH, ZL] = source.nextUint64Parts()
        return
    }
    ZH = source.nextUint32()
    ZL = source.nextUint32()
}

/**
 * Standard normal deviate (numpy `random_standard_normal`).
 * @param {Object} source - Bit generator.
 * @returns {number}
 */
export function zigguratNormal(source) {
    for (;;) {
        next64(source)
        const hi = ZH
        const lo = ZL
        const idx = lo & 0xff
        const rabs = (hi & 0x1fffffff) * TWO_POW_23 + (lo >>> 9)
        let x = rabs * WI[idx]
        if (lo & 0x100) {
            x = -x
        }
        if (rabs < KI[idx]) {
            return x
        }
        if (idx === 0) {
            for (;;) {
                const xx = -NOR_INV_R * Math.log1p(-source.random())
                const yy = -Math.log1p(-source.random())
                if (yy + yy > xx * xx) {
                    return lo >>> 17 & 1 ? -(NOR_R + xx) : NOR_R + xx
                }
            }
        }
        if ((FI[idx - 1] - FI[idx]) * source.random() + FI[idx] < Math.exp(-0.5 * x * x)) {
            return x
        }
    }
}

/**
 * Standard exponential deviate (numpy `random_standard_exponential`).
 * @param {Object} source - Bit generator.
 * @returns {number}
 */
export function zigguratExponential(source) {
    for (;;) {
        next64(source)
        const hi = ZH
        const lo = ZL
        const idx = lo >>> 3 & 0xff
        const r = hi * TWO_POW_21 + (lo >>> 11)
        const x = r * WE[idx]
        if (r < KE[idx]) {
            return x
        }
        if (idx === 0) {
            return EXP_R - Math.log1p(-source.random())
        }
        if ((FE[idx - 1] - FE[idx]) * source.random() + FE[idx] < Math.exp(-x)) {
            return x
        }
    }
}
