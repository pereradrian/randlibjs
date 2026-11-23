# randlibjs

Seedable, reproducible random number generation for JavaScript. Exact samplers for 75+ probability distributions, distribution objects with densities, CDFs and quantiles, quasi-Monte Carlo, random matrices, stochastic processes and resampling. Zero dependencies, ~29 kB gzipped, runs in browsers and Node.js, ships TypeScript types.

[![npm](https://img.shields.io/npm/v/randlibjs.svg)](https://www.npmjs.com/package/randlibjs)
[![Downloads](https://img.shields.io/npm/dm/randlibjs.svg)](https://www.npmjs.com/package/randlibjs)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/randlibjs/badge)](https://www.jsdelivr.com/package/npm/randlibjs)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/randlibjs)](https://bundlephobia.com/package/randlibjs)
[![Types](https://img.shields.io/npm/types/randlibjs)](https://www.npmjs.com/package/randlibjs)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)
[![License](https://img.shields.io/npm/l/randlibjs.svg)](LICENSE)

[![CI](https://github.com/pereradrian/randlibjs/actions/workflows/ci.yml/badge.svg)](https://github.com/pereradrian/randlibjs/actions/workflows/ci.yml)
[![numpy parity](https://github.com/pereradrian/randlibjs/actions/workflows/numpy-parity.yml/badge.svg)](https://github.com/pereradrian/randlibjs/actions/workflows/numpy-parity.yml)
[![Codecov](https://codecov.io/gh/pereradrian/randlibjs/branch/master/graph/badge.svg)](https://codecov.io/gh/pereradrian/randlibjs)
[![CodeQL](https://github.com/pereradrian/randlibjs/actions/workflows/codeql.yml/badge.svg)](https://github.com/pereradrian/randlibjs/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/pereradrian/randlibjs/badge)](https://scorecard.dev/viewer/?uri=github.com/pereradrian/randlibjs)
[![npm provenance](https://img.shields.io/badge/npm-provenance-blue?logo=npm)](https://www.npmjs.com/package/randlibjs#provenance)

- **Exact samplers.** No approximations or lookup tables: ziggurat normals, PTRS Poisson, BTPE binomial (O(1) for any n), hypergeometric for populations of billions, truncated normals deep in the tails, and more. Every sampler passes goodness-of-fit tests against reference implementations.
- **Distribution objects** with `pdf`, `cdf`, `ppf`, `sf`, `isf`, moments and intervals, including finite mixtures. Tails are computed on the accurate side: `stats.f(5, 10).isf(1e-12)` is exact to 16 digits.
- **Serious bit generators:** xoshiro128** (default), PCG32, PCG64, PCG64DXSM, SFC64, Philox and MT19937, with state save/restore, cloning, independent child streams (`spawn`) and jumps.
- **Reproducible across languages.** With the `'pcg64'` bit generator the streams are identical to numpy's `default_rng(seed)`, and with `'mt19937'` to `RandomState(seed)`, so a simulation can be prototyped in Python and replayed in the browser, or the other way round.
- **Beyond sampling:** quasi-Monte Carlo (Sobol, Halton, Latin hypercube, Poisson disk), random matrices (Haar orthogonal, LKJ, Wishart, …), stochastic processes (Brownian motion, GBM, Ornstein–Uhlenbeck, Poisson processes, Markov chains) and resampling (bootstrap BCa, permutation tests).

If you know numpy and scipy you will feel at home: the reference tables below list the equivalent of every function.

## Installation

```bash
npm install randlibjs
```

```js
import { seed, normal, createGenerator, stats } from 'randlibjs'   // ES modules
const { seed, normal } = require('randlibjs')                       // CommonJS
```

### Browser (CDN)

```html
<script src="https://cdn.jsdelivr.net/npm/randlibjs@2/dist/randlib.min.js"></script>
<script>
  randlib.seed(12345)
  console.log(randlib.normal(0, 1, 10))
</script>
```

The bundle is also available from `https://unpkg.com/randlibjs@2/dist/randlib.min.js`. You can use it as an ES module too:

```html
<script type="module">
  import { normal } from 'https://cdn.jsdelivr.net/npm/randlibjs@2/dist/randlib.mjs'
</script>
```

## Quick start

```js
import { seed, uniform, normal, integers, choice, createGenerator, stats } from 'randlibjs'

seed(42)                          // reproducible global stream
uniform(0, 10, 5)                 // 5 floats in [0, 10)
normal(0, 1, [2, 3])              // 2x3 nested array
integers(1, 6, 10, true)          // 10 dice rolls in [1, 6]
choice(['a', 'b', 'c'], [0.5, 0.3, 0.2], 4)   // weighted choice
choice(52, null, 5, false)        // 5 distinct cards

// Independent generators (numpy's default_rng)
const rng = createGenerator(2024)
rng.gamma(2, 1.5, 1000)
rng.dirichlet([1, 1, 1])

// Distribution objects (scipy.stats)
const t = stats.studentT(10)
t.ppf(0.975)                      // 2.228138851986275
t.cdf([-1, 0, 1])
stats.binomial(20, 0.3).pmf(6)
```

Every sampling function takes its parameters followed by an optional `size`:

| `size` | result |
|---|---|
| `null` / omitted | a single value |
| `n` | an array of `n` values |
| `[m, n, ...]` | a nested array with that shape |

Multivariate samplers return one vector (or matrix) per element.

## Reproducibility and generators

```js
import { seed, getState, setState, createGenerator, random } from 'randlibjs'

seed(7)                           // seeds the global generator (xoshiro128** by default)
seed(7, 'pcg32')                  // or choose the bit generator
seed('any string or [array, of, ints] or 123n')

const snapshot = getState()       // JSON-serialisable
random()
setState(snapshot)                // replay

const rng = createGenerator(1)
const [a, b, c] = rng.spawn(3)    // independent child streams for parallel work
rng.run(() => someCodeUsingTheGlobalFunctions())  // redirect global functions to rng
```

| Bit generator | Name | Notes |
|---|---|---|
| `Xoshiro128StarStar` | `'xoshiro128**'` | Default. Fast 32-bit arithmetic, period 2^128 − 1, `jump()` for 2^64 non-overlapping streams |
| `PCG32` | `'pcg32'` | Bit-identical to the reference `pcg32_random_r`, 2^63 selectable streams |
| `MT19937` | `'mt19937'` | Mersenne Twister with numpy `RandomState` seeding |
| `PCG64` | `'pcg64'` | numpy's default generator with `SeedSequence` seeding and `advance()` |
| `PCG64DXSM`, `SFC64`, `Philox` | `'pcg64dxsm'`, `'sfc64'`, `'philox'` | The other numpy bit generators, bit-identical to numpy (Philox is counter based with O(1) `advance`) |

`setRandomSource(fn)` installs any function returning floats in [0, 1), such as `Math.random` or a cryptographic source.

### Reproducing numpy streams

```js
createGenerator(42, 'pcg64').random()       // 0.7739560485559633 === np.random.default_rng(42).random()
createGenerator(42, 'pcg64').integers(0, 10, 5)  // [0, 7, 6, 4, 4] === default_rng(42).integers(0, 10, 5)
createGenerator(42, 'pcg64').standardNormal()    // 0.30471707975443135 === default_rng(42).standard_normal()

seed(42, 'mt19937')
standardNormal(3)   // [0.4967141530112327, -0.13826430117118466, 0.6476885381006925]
                    // === np.random.RandomState(42).standard_normal(3)
```

## Distributions

### Continuous

| Function | numpy / scipy equivalent |
|---|---|
| `random(size)`, `uniform(low=0, high=1, size)` | `random`, `uniform` |
| `normal(loc=0, scale=1, size)`, `standardNormal(size)` | `normal`, `standard_normal` |
| `exponential(rate=1, size)`, `standardExponential(size)` | `exponential(1/rate)`, `standard_exponential` |
| `gamma(shape, scale=1, size)`, `standardGamma(shape, size)` | `gamma`, `standard_gamma` |
| `beta(a, b, size)` | `beta` |
| `chisquare(df, size)`, `noncentralChisquare(df, nonc, size)` | `chisquare`, `noncentral_chisquare` |
| `f(dfnum, dfden, size)`, `noncentralF(dfnum, dfden, nonc, size)` | `f`, `noncentral_f` |
| `standardT(df, size)`, `studentT(df, loc=0, scale=1, size)` | `standard_t`, `scipy.stats.t` |
| `cauchy(loc, scale, size)`, `standardCauchy(size)` | `scipy.stats.cauchy`, `standard_cauchy` |
| `lognormal(mean=0, sigma=1, size)` | `lognormal` |
| `laplace`, `logistic`, `gumbel` `(loc=0, scale=1, size)` | same names |
| `weibull(a, size)`, `rayleigh(scale=1, size)`, `power(a, size)` | same names |
| `wald(mean, scale, size)`, `vonmises(mu, kappa, size)` | same names |
| `pareto(alpha, xm=1, size)` (Pareto I), `lomax(a, size)` | `scipy.stats.pareto`, numpy `pareto` |
| `triangular(low, high, mode, size)` | `triangular(left, mode, right)`. Note the different argument order |
| `truncatedNormal(loc, scale, low, high, size)` | `scipy.stats.truncnorm` (exact in any tail) |
| `halfNormal(scale, loc, size)`, `skewNormal(loc, scale, shape, size)` | `halfnorm`, `skewnorm` |
| `levy`, `frechet`, `generalizedExtremeValue`, `generalizedPareto` | `levy`, `invweibull`, `genextreme` (c = −xi), `genpareto` |
| `inverseGamma`, `betaPrime`, `kumaraswamy`, `erlang`, `chi`, `maxwell`, `nakagami` | `invgamma`, `betaprime`, –, `erlang`, `chi`, `maxwell`, `nakagami` |
| `loguniform`, `burr12`, `logLogistic`, `semicircle`, `exGaussian` | `loguniform`, `burr12`, `fisk`, `semicircular`, `exponnorm` |

### Discrete

| Function | numpy / scipy equivalent |
|---|---|
| `integers(low, high, size, endpoint=false)`, `randint(low, high, size)` | `integers`, `randint` |
| `binomial(n, p, size)`, `bernoulli(p, size)` | `binomial`, `scipy.stats.bernoulli` |
| `poisson(lambda=1, size)` | `poisson` |
| `geometric(p, size)` (support 1, 2, …) | `geometric` |
| `negativeBinomial(n, p, size)` | `negative_binomial` |
| `hypergeometric(ngood, nbad, nsample, size)` | `hypergeometric` |
| `logseries(p, size)`, `zipf(a, size)` | same names |
| `betaBinomial(n, a, b, size)`, `skellam(mu1, mu2, size)` | `betabinom`, `skellam` |
| `categorical(p, size)`, `rademacher(size)`, `new AliasTable(weights).sample(size)` | O(1) sampling with Walker's alias method |

### Multivariate and random matrices

| Function | Equivalent |
|---|---|
| `multivariateNormal(mean, cov, size)` (accepts singular covariances) | `multivariate_normal` |
| `multivariateUniform`, `multivariateTriangular(mean, cov, alpha, size)`, `multivariate(mean, cov, noise, size)` | – |
| `dirichlet(alpha, size)` | `dirichlet` (stays exact for tiny alphas, where numpy rounds components to 0) |
| `multinomial(n, pvals, size)`, `multivariateHypergeometric(colors, nsample, size)` | same names |
| `uniformSphere(dim, size)`, `uniformBall(dim, radius, size)` | – |
| `orthoGroup(dim, size)`, `specialOrthoGroup(dim, size)` | `ortho_group`, `special_ortho_group` |
| `randomCorrelation(eigs, size)`, `lkjCorrelation(dim, eta, size, cholesky)` | `random_correlation`, LKJ prior (Stan) |
| `wishart(df, scale, size)`, `invWishart(df, scale, size)`, `matrixNormal(M, U, V, size)` | `wishart`, `invwishart`, `matrix_normal` |
| `mixture(components, weights, size, { returnLabels })` | finite mixtures of stats objects or functions (see `stats.mixture`) |

### Sampling and permutations

| Function | Description |
|---|---|
| `choice(a, weights=null, size=null, replace=true)` | `a` is an array or an integer n. Supports weighted sampling without replacement |
| `shuffle(x, axis=0)` | In place, along any axis |
| `permutation(x, axis=0)` | Shuffled copy, or a permutation of `range(n)` |
| `permuted(x, axis=null, inPlace=false)` | Independent shuffles along an axis |
| `bytes(n)`, `randString(length, chars, size)`, `uuid4(size)` | Random bytes, strings and RFC 4122 v4 UUIDs |

## Distribution objects (`stats`)

```js
import { stats } from 'randlibjs'

const g = stats.gamma(2.5, 2)
g.pdf(3); g.logpdf(3); g.cdf(3); g.sf(3)
g.ppf(0.99); g.isf(1e-9)
g.mean(); g.variance(); g.std(); g.median(); g.entropy()
g.interval(0.95)                 // equal-tail interval
g.sample(1000)                   // or g.rvs(1000, rng)

stats.poisson(4).pmf([0, 1, 2])  // arrays (and nested arrays) are mapped element-wise
```

Mixtures: `stats.mixture([stats.normal(0, 1), stats.normal(5, 2)], [0.7, 0.3])` has the same methods (continuous or discrete components).

Continuous: `normal` (`norm`), `uniform`, `exponential`, `gamma`, `chisquare` (`chi2`), `beta`, `studentT` (`t`), `f`, `lognormal`, `cauchy`, `laplace`, `logistic`, `gumbel`, `weibull`, `pareto`, `triangular`, `rayleigh`, `truncatedNormal`.
Discrete: `binomial`, `poisson`, `geometric`, `negativeBinomial`, `hypergeometric`, `bernoulli`, `randint`.

The `special` namespace exports the special functions behind them: `gammaFn`, `logGamma`, `logBeta`, `digamma`, `erf`, `erfc`, `gammaP`, `gammaQ`, `gammaPInv`, `betaInc`, `betaIncInv`, `normalCDF`, `inverseNormalCDF`.

## Quasi-Monte Carlo (`qmc`)

```js
import { qmc, createGenerator } from 'randlibjs'

const sobol = new qmc.Sobol(2, { scramble: true, rng: createGenerator(0) })
const points = sobol.random(256)                       // use powers of 2
qmc.scale(points, [-1, 0], [1, 10])
qmc.discrepancy(points)                                 // 'CD', 'WD', 'MD' or 'L2-star'

new qmc.Halton(3).random(100)
new qmc.LatinHypercube(4).random(20)
new qmc.PoissonDisk(2, { radius: 0.05 }).fillSpace()   // blue noise
```

Unscrambled Sobol and Halton points and the discrepancies are identical to `scipy.stats.qmc`.

## Stochastic processes and resampling

```js
import { brownianMotion, geometricBrownianMotion, ornsteinUhlenbeck, poissonProcess,
         markovChain, randomWalk, bootstrap, permutationTest } from 'randlibjs'

const { t, x } = geometricBrownianMotion({ s0: 100, mu: 0.05, sigma: 0.2, T: 1, n: 252, paths: 1000 })
ornsteinUhlenbeck({ theta: 2, mu: 1, sigma: 0.3 })     // exact transition, no discretisation error
brownianMotion({ T: 1, n: 1000 }); poissonProcess(5, 10); randomWalk(100)
markovChain([[0.9, 0.1], [0.5, 0.5]], 100, 0)

bootstrap(data, median, { nResamples: 9999 }).confidenceInterval   // BCa by default
permutationTest(control, treatment).pvalue
```

## Performance

Rough throughput on Node 22 (`node scripts/benchmark.mjs`), in millions of samples per second:

| | random | integers | normal | exponential | gamma | poisson | binomial |
|---|---|---|---|---|---|---|---|
| xoshiro128** (default) | ~70 | ~44 | ~25–30 | ~20 | ~15–20 | ~12 | ~15 |
| pcg64 (numpy parity) | ~9 | ~12 | ~4.5 | ~6 | ~3 | ~3 | ~3 |

## Examples

The [`examples/`](examples) folder has runnable scripts:

| Example | |
|---|---|
| [`monte-carlo-pi.mjs`](examples/monte-carlo-pi.mjs) | Estimating π with pseudo-random and Sobol points |
| [`numpy-reproducibility.mjs`](examples/numpy-reproducibility.mjs) | The same random numbers as numpy |
| [`option-pricing.mjs`](examples/option-pricing.mjs) | Monte Carlo pricing of a European call with geometric Brownian motion |
| [`bootstrap.mjs`](examples/bootstrap.mjs) | Confidence intervals and A/B testing |
| [`bayesian-beta-binomial.mjs`](examples/bayesian-beta-binomial.mjs) | Posterior sampling and credible intervals |
| [`browser.html`](examples/browser.html) | Using the CDN bundle in a web page |

Run them with `node examples/<name>.mjs`.

## Documentation

- [Interactive showcase](https://pereradrian.github.io/randlibjs/)
- [API reference](https://pereradrian.github.io/randlibjs/docs/)
- [Changelog](CHANGELOG.md)

## Development

```bash
npm install
npm test            # 490+ tests, including goodness-of-fit tests against scipy
npm run lint
npm run build       # dist/ bundles and types/
npm run coverage
npm run docs        # JSDoc API reference into docs/docs
```

The reference data in `test/fixtures` is generated with numpy/scipy by `python scripts/make_reference.py` and `python scripts/make_stats_reference.py`.

## License

BSD-3-Clause © [Adrián Muñoz Perera](https://pereradrian.github.io/)
