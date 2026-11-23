// Compares randlibjs streams with the ones numpy produced (scripts/numpy_parity.py).
// Usage: python scripts/numpy_parity.py > parity.json && node scripts/check-numpy-parity.mjs parity.json
import { readFileSync } from 'node:fs'
import { createGenerator } from '../index.js'

const file = process.argv[2]
if (!file) {
    console.error('usage: node scripts/check-numpy-parity.mjs parity.json')
    process.exit(2)
}
const { numpy, streams } = JSON.parse(readFileSync(file, 'utf8'))

// "ulp" cases differ from numpy only through libm rounding in Math.log/exp/pow
const ULP_TOLERANCE = 1e-13
// ziggurat tail: |z| beyond the last layer, sampled with log1p (libm rounding)
const ZIGGURAT_R = 3.6541528853610088
let failures = 0
let values = 0
for (const s of streams) {
    const rng = createGenerator(s.seed, s.bitGenerator)
    const actual = [].concat(rng[s.method](...s.args))
    const bad = s.values.findIndex((expected, i) => {
        const a = actual[i]
        if (s.mode === 'exact') return a !== expected
        if (s.mode === 'ziggurat') {
            const [loc, scale] = s.method === 'normal' ? s.args : [0, 1]
            if (Math.abs((expected - loc) / scale) <= ZIGGURAT_R) return a !== expected
        }
        return !(Math.abs(a - expected) <= ULP_TOLERANCE * Math.max(1, Math.abs(expected)))
    })
    values += s.values.length
    if (bad !== -1 || actual.length !== s.values.length) {
        failures++
        console.error(`✗ ${s.bitGenerator}(${s.seed}).${s.method}(${s.args.join(', ')}) [${s.mode}]: ` +
            `index ${bad}: randlibjs ${actual[bad]} vs numpy ${s.values[bad]}`)
    }
}
console.log(`numpy ${numpy}: ${streams.length - failures}/${streams.length} streams match (${values} values).`)
process.exit(failures ? 1 : 0)
