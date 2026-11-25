// Checks the factual claims of the README against the built library, so they cannot go stale.
//   npm run build && npm run check:claims
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import * as lib from '../index.js'
import * as samplers from '../src/distributions.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url))
const readme = read('README.md').toString()
const failures = []

function claim(name, ok, detail) {
    console.log(`${ok ? '✓' : '✗'} ${name}: ${detail}`)
    if (!ok) failures.push(name)
}

// bundle size, within 5 %
const said = Number(/~(\d+) kB gzipped/.exec(readme)?.[1])
const actual = gzipSync(read('dist/randlib.min.js')).length / 1000
claim('gzipped size', Math.abs(actual - said) / actual < 0.05, `README ~${said} kB, measured ${actual.toFixed(1)} kB`)

// number of distributions: the samplers that are not utilities, generic builders or aliases of a family
const NOT_A_DISTRIBUTION = [
    'bytes', 'choice', 'permutation', 'permuted', 'randString', 'shuffle', 'uuid4', 'random', 'integers',
    'mixture', 'multivariate', 'standardCauchy', 'standardExponential', 'standardGamma', 'standardNormal', 'standardT',
]
const distributions = Object.keys(samplers).filter((n) => !NOT_A_DISTRIBUTION.includes(n))
const atLeast = Number(/(\d+)\+ probability distributions/.exec(readme)?.[1])
claim('distributions', distributions.length >= atLeast, `README ${atLeast}+, counted ${distributions.length}`)

// the stats families the README lists exist, and the list is complete
const section = readme.slice(readme.indexOf('## Distribution objects'), readme.indexOf('The `special` namespace'))
const listed = [...section.matchAll(/^(?:Continuous|Discrete): (.*)$/gm)]
    .flatMap((m) => [...m[1].matchAll(/`(\w+)`/g)].map((x) => x[1]))
const TESTS = ['kstest', 'ks2samp', 'chisquareTest', 'andersonDarling', 'describe', 'gaussianKde']
const families = Object.keys(lib.stats).filter((n) => !TESTS.includes(n) && n !== 'mixture')
const missing = listed.filter((n) => !families.includes(n))
const unlisted = families.filter((n) => !listed.includes(n))
claim('stats families', listed.length > 0 && !missing.length && !unlisted.length,
    `${listed.length} listed, missing [${missing}], unlisted [${unlisted}]`)

// the far-tail example, against mpmath (40 digits): 819.539571151337733
const isf = lib.stats.f(5, 10).isf(1e-12)
claim('f(5, 10).isf(1e-12)', Math.abs(isf / 819.5395711513377 - 1) < 1e-14, String(isf))

// the npm description says the same, and there are no dependencies
const { dependencies = {}, description } = JSON.parse(read('package.json').toString())
claim('npm description', description.includes(`${atLeast}+ probability distributions`), `${atLeast}+ distributions`)
claim('zero dependencies', Object.keys(dependencies).length === 0, `${Object.keys(dependencies).length} dependencies`)

if (failures.length) {
    console.error(`\n${failures.length} claim(s) in the README do not hold: ${failures.join(', ')}`)
    process.exit(1)
}
