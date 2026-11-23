// Throughput comparison with other JavaScript random libraries, one scalar draw per call.
// Usage: cd bench && npm install && npm run bench
import { performance } from 'node:perf_hooks'
import * as R from '../index.js'
import seedrandom from 'seedrandom'
import * as d3 from 'd3-random'
import jStatPkg from 'jstat'
import stdUniform from '@stdlib/random-base-uniform'
import stdNormal from '@stdlib/random-base-normal'
import stdGamma from '@stdlib/random-base-gamma'
import stdPoisson from '@stdlib/random-base-poisson'
import stdBinomial from '@stdlib/random-base-binomial'
import stdBeta from '@stdlib/random-base-beta'

const { jStat } = jStatPkg
const N = 2_000_000

R.seed(1)
const lcg = d3.randomLcg(0.1)
const s = { seed: 1 }

// one closure per library and distribution; null when the library has no sampler
const CASES = {
    'uniform': {
        randlibjs: () => R.uniform(),
        stdlib: ((f) => () => f(0, 1))(stdUniform.factory(s)),
        'd3-random': d3.randomUniform.source(lcg)(0, 1),
        jStat: () => jStat.uniform.sample(0, 1),
        seedrandom: seedrandom('1'),
    },
    'normal': {
        randlibjs: () => R.normal(0, 1),
        stdlib: ((f) => () => f(0, 1))(stdNormal.factory(s)),
        'd3-random': d3.randomNormal.source(lcg)(0, 1),
        jStat: () => jStat.normal.sample(0, 1),
    },
    'gamma(2.5)': {
        randlibjs: () => R.gamma(2.5, 1),
        stdlib: ((f) => () => f(2.5, 1))(stdGamma.factory(s)),
        'd3-random': d3.randomGamma.source(lcg)(2.5, 1),
        jStat: () => jStat.gamma.sample(2.5, 1),
    },
    'beta(2, 5)': {
        randlibjs: () => R.beta(2, 5),
        stdlib: ((f) => () => f(2, 5))(stdBeta.factory(s)),
        'd3-random': d3.randomBeta.source(lcg)(2, 5),
        jStat: () => jStat.beta.sample(2, 5),
    },
    'poisson(4)': {
        randlibjs: () => R.poisson(4),
        stdlib: ((f) => () => f(4))(stdPoisson.factory(s)),
        'd3-random': d3.randomPoisson.source(lcg)(4),
        jStat: null,
    },
    'binomial(100, 0.3)': {
        randlibjs: () => R.binomial(100, 0.3),
        stdlib: ((f) => () => f(100, 0.3))(stdBinomial.factory(s)),
        'd3-random': d3.randomBinomial.source(lcg)(100, 0.3),
        jStat: null,
    },
    'binomial(1e9, 0.3)': {
        randlibjs: () => R.binomial(1e9, 0.3),
        stdlib: ((f) => () => f(1e9, 0.3))(stdBinomial.factory(s)),
        'd3-random': d3.randomBinomial.source(lcg)(1e9, 0.3),
        jStat: null,
    },
}

function rate(fn, n) {
    let sink = 0
    const t0 = performance.now()
    for (let i = 0; i < n; i++) sink += fn()
    const ms = performance.now() - t0
    if (Number.isNaN(sink)) throw new Error('NaN')
    return n / ms / 1000 // million samples per second
}

const LIBS = ['randlibjs', 'stdlib', 'd3-random', 'jStat', 'seedrandom']
const rows = []
for (const [dist, libs] of Object.entries(CASES)) {
    const cells = LIBS.map((lib) => {
        const fn = libs[lib]
        if (!fn) return '—'
        // very slow samplers (O(n) binomial) get fewer iterations
        const probe = rate(fn, 2000)
        const n = Math.max(2000, Math.min(N, Math.round(probe * 1e6 * 0.4)))
        rate(fn, Math.min(n, 100_000)) // warm up
        const best = Math.max(rate(fn, n), rate(fn, n), rate(fn, n))
        return best >= 10 ? best.toFixed(0) : best >= 0.1 ? best.toFixed(1) : best.toExponential(1)
    })
    rows.push(`| ${dist} | ${cells.join(' | ')} |`)
    console.error(`done ${dist}`)
}
console.log(`Node ${process.version}, million samples per second (higher is better), one draw per call:\n`)
console.log(`| | ${LIBS.join(' | ')} |`)
console.log(`|---|${LIBS.map(() => '---').join('|')}|`)
console.log(rows.join('\n'))
