<p align="center"><img src="https://raw.githubusercontent.com/randlibjs/randlibjs/master/.github/assets/logo.svg" alt="randlibjs logo: a bell curve packed with random circles" width="128" height="128"></p>

# randlibjs

Seedable, reproducible random numbers and statistics for JavaScript. Exact samplers for 75+ probability distributions, distribution objects with densities, CDFs, quantiles and maximum likelihood fitting, statistical tests, copulas, quasi-Monte Carlo, random matrices, stochastic processes and resampling. Zero dependencies, ~50 kB gzipped in full (~5 kB tree-shaken to `seed` + `normal`), runs in browsers and Node.js, ships TypeScript types.

[![npm](https://img.shields.io/npm/v/randlibjs.svg)](https://www.npmjs.com/package/randlibjs)
[![Downloads](https://img.shields.io/npm/dm/randlibjs.svg)](https://www.npmjs.com/package/randlibjs)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/randlibjs/badge)](https://www.jsdelivr.com/package/npm/randlibjs)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/randlibjs)](https://bundlephobia.com/package/randlibjs)
[![Types](https://img.shields.io/npm/types/randlibjs)](https://www.npmjs.com/package/randlibjs)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)
[![License](https://img.shields.io/npm/l/randlibjs.svg)](LICENSE)

[![CI](https://github.com/randlibjs/randlibjs/actions/workflows/ci.yml/badge.svg)](https://github.com/randlibjs/randlibjs/actions/workflows/ci.yml)
[![numpy parity](https://github.com/randlibjs/randlibjs/actions/workflows/numpy-parity.yml/badge.svg)](https://github.com/randlibjs/randlibjs/actions/workflows/numpy-parity.yml)
[![Codecov](https://codecov.io/gh/randlibjs/randlibjs/branch/master/graph/badge.svg)](https://codecov.io/gh/randlibjs/randlibjs)
[![CodeQL](https://github.com/randlibjs/randlibjs/actions/workflows/codeql.yml/badge.svg)](https://github.com/randlibjs/randlibjs/actions/workflows/codeql.yml)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/17029/badge)](https://www.bestpractices.dev/projects/17029)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/randlibjs/randlibjs/badge)](https://scorecard.dev/viewer/?uri=github.com/randlibjs/randlibjs)
[![npm provenance](https://img.shields.io/badge/npm-provenance-blue?logo=npm)](https://www.npmjs.com/package/randlibjs#provenance)

- **Exact samplers.** Exact algorithms rather than approximations: ziggurat normals, PTRS Poisson, BTPE binomial (O(1) for any n), hypergeometric for populations of billions, truncated normals deep in the tails, and more. Every univariate sampler passes goodness-of-fit tests against reference distributions.
- **Distribution objects** with `pdf`, `cdf`, `ppf`, `sf`, `isf`, moments and intervals, including finite mixtures. Tails are computed on the accurate side: `stats.f(5, 10).isf(1e-12)` is exact to 16 digits.
- **Serious bit generators:** xoshiro128** (default), PCG32, PCG64, PCG64DXSM, SFC64, Philox and MT19937, with state save/restore, cloning, independent child streams (`spawn`) and jumps.
- **Reproducible across languages.** With the `'pcg64'` bit generator the streams follow numpy's `default_rng(seed)`, and with `'mt19937'` `RandomState(seed)`: the random bits, uniforms, integers and ordinary normals are identical, and values that go through `Math.log`, `exp` or `pow` (exponential, gamma, beta, the ziggurat tail) agree to 1e-13, so a simulation can be prototyped in Python and replayed in the browser, or the other way round.
- **Beyond sampling:** copulas, statistical tests (Kolmogorov–Smirnov, chi-square, Anderson–Darling) and kernel densities, quasi-Monte Carlo (Sobol, Halton, Latin hypercube, Poisson disk), random matrices (Haar orthogonal, LKJ, Wishart, …), stochastic processes (Brownian motion, GBM, Ornstein–Uhlenbeck, Poisson processes, Markov chains) and resampling (bootstrap BCa, permutation tests).

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
| a typed array (`new Float32Array(n)`, `new Int32Array(n)`, ...) | filled in place and returned |

Multivariate samplers return one vector (or matrix) per element.

Typed-array output gives exactly the same values as `size = n`. Use it to halve memory with
`Float32Array`, to store counts compactly in integer arrays, or to hand samples straight to WebGL /
WebGPU buffers, Web Workers (transferable, no copy), WebAssembly or canvas:

```js
const noise = normal(0, 1, new Float32Array(1_000_000))   // 4 MB instead of 8 MB
const counts = poisson(3, new Uint16Array(4096))
worker.postMessage(noise, [noise.buffer])                 // zero-copy transfer
```

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

### Fitting distributions to data

`fit(data)` returns the distribution with maximum likelihood parameters, like scipy's `dist.fit`:

```js
const d = stats.gamma.fit(waitingTimes)   // Gamma { shape, scale }
d.ppf(0.95)                               // 95th percentile of the fitted model
stats.weibull.fit(lifetimes).mean()
stats.binomial.fit(successes, { n: 20 })  // known number of trials
```

Closed forms where they exist (normal, uniform, exponential, lognormal, rayleigh, pareto, laplace,
poisson, geometric, bernoulli, binomial and negativeBinomial with known `n`), Newton iterations for
gamma, chisquare, beta and weibull (solved to rounding, slightly more precise than scipy's numerical
fit for weibull), and Nelder–Mead on the likelihood for logistic, gumbel, cauchy and studentT. Families
without a location parameter here (gamma, weibull, ...) match scipy's fit with `floc=0`.
Results are checked against scipy in the test suite.

Every univariate family has a distribution object, with the same parameters as the sampler (the exceptions are `lomax`, `rademacher` and `categorical`):

Continuous: `normal` (`norm`), `uniform`, `exponential`, `gamma`, `erlang`, `chisquare` (`chi2`), `chi`, `beta`, `betaPrime`, `kumaraswamy`, `studentT` (`t`), `f`, `noncentralChisquare`, `noncentralF`, `lognormal`, `cauchy`, `laplace`, `logistic`, `gumbel`, `weibull`, `frechet`, `generalizedExtremeValue`, `generalizedPareto`, `pareto`, `burr12`, `logLogistic`, `triangular`, `rayleigh`, `maxwell`, `nakagami`, `halfNormal`, `truncatedNormal`, `skewNormal`, `exGaussian`, `wald`, `levy`, `inverseGamma`, `loguniform`, `power`, `semicircle`, `vonmises`.
Discrete: `binomial`, `poisson`, `geometric`, `negativeBinomial`, `hypergeometric`, `bernoulli`, `randint`, `betaBinomial`, `logseries`, `zipf`, `skellam`.

All are checked against scipy.stats, including quantiles down to 1e-12; tail probabilities are
computed on the side that does not cancel. (For the von Mises 1e-12 quantile randlibjs agrees with
mpmath where scipy is 16% off.)

The `special` namespace exports the special functions behind them: `gammaFn`, `logGamma`, `logBeta`, `digamma`, `trigamma`, `erf`, `erfc`, `gammaP`, `gammaQ`, `gammaPInv`, `betaInc`, `betaIncInv`, `normalCDF`, `inverseNormalCDF`.

### Statistical tests and density estimation

```js
const data = stats.gamma(2, 1.5).sample(500)

stats.kstest(data, stats.gamma(2, 1.5))         // { statistic, pvalue }, exact p-value
stats.kstest(data, (x) => 1 - Math.exp(-x), { alternative: 'greater' })
stats.ks2samp(groupA, groupB)                   // two-sample, exact for n·m <= 1e6
stats.chisquareTest([16, 18, 16, 14, 12, 12])   // Pearson goodness of fit
stats.andersonDarling(data)                     // normality: statistic, critical values, p-value
stats.describe(data)                            // nobs, min, max, mean, variance, skewness, kurtosis

const kde = stats.gaussianKde(data)             // Scott's rule; 'silverman' or a factor
kde.pdf([1, 2, 3]); kde.cdf(2); kde.sample(100)
```

Together with `fit` this gives the whole fit, check and compare workflow. Results match scipy.stats
(KS p-values exact for small samples, ~1e-7 in the tails and ~1e-5 elsewhere for large ones).

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

## Copulas

Random vectors with uniform margins and a chosen dependence; map each coordinate through any
`ppf` to get dependent variables with arbitrary margins:

```js
import { gaussianCopula, tCopula, claytonCopula, gumbelCopula, frankCopula, copulaTheta, stats } from 'randlibjs'

const [u, v] = gaussianCopula([[1, 0.7], [0.7, 1]])
const loss = stats.lognormal(0, 1).ppf(u)          // dependent margins
const rate = stats.gamma(2, 0.5).ppf(v)

tCopula(corr, 4, 10000)                            // joint extremes (tail dependence)
claytonCopula(copulaTheta('clayton', 0.5), 3, 1000) // Kendall's τ = 0.5, 3 dimensions
gumbelCopula(2, 2, 1000)                            // upper tail dependence
frankCopula(5, 2, 1000)
```

The Archimedean families are sampled exactly in any dimension (Marshall–Olkin). `copulaTau` and
`copulaTheta` convert between each family's parameter and Kendall's τ.

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

Rough throughput on Node 22 (`node scripts/benchmark.mjs`), in millions of samples per second (range of three runs on one laptop):

| | random | integers | normal | exponential | gamma | poisson | binomial |
|---|---|---|---|---|---|---|---|
| xoshiro128** (default) | 61–79 | 24–52 | 18–28 | 21–32 | 13–21 | 9–15 | 12–17 |
| pcg64 (numpy parity) | 5–10 | 8–10 | 5–6 | 5–7 | 2.6–3.6 | 2.2–3.2 | 2.4–3.4 |

## Compared with other libraries

| | randlibjs | [stdlib](https://github.com/stdlib-js/stdlib) | [d3-random](https://github.com/d3/d3-random) | [jStat](https://github.com/jstat/jstat) | [seedrandom](https://github.com/davidbau/seedrandom) |
|---|---|---|---|---|---|
| Seedable | ✅ | ✅ | ✅ (LCG source) | ✅ (`setRandom`) | ✅ |
| Streams that reproduce numpy | ✅ | ❌ | ❌ | ❌ | ❌ |
| Densities, CDFs, quantiles | ✅ same package | ✅ separate packages | ❌ | ✅ | ❌ |
| Quasi-Monte Carlo, random matrices, processes | ✅ | partly | ❌ | ❌ | ❌ |
| Distributions | 75+ | dozens | 17 | about 20 | uniform only |

Throughput in millions of samples per second, one draw per call (Node 22, `cd bench && npm install && npm run bench`; range of three runs on one machine, compare within a row):

| | randlibjs | stdlib | d3-random | jStat | seedrandom |
|---|---|---|---|---|---|
| uniform | 124–136 | 78–79 | 143–145 | 51–60 | 35–37 |
| normal | 27–31 | 37–46 | 24–37 | 13–22 | — |
| gamma(2.5) | 13–20 | 11–13 | 27–28 | 6.7–7.4 | — |
| beta(2, 5) | 8–11 | 4.1–5 | 7.3–14 | 2.2–3.7 | — |
| poisson(4) | 7.5–13 | 2.2–5.4 | 5–9.2 | — | — |
| binomial(100, 0.3) | 3.5–4.5 | 5.5–8.6 | 2.2–3.5 | — | — |
| binomial(1e9, 0.3) | 15–24 | 6.9–11 | 1–1.5 | — | — |

No library is fastest at everything. In this table randlibjs leads on Poisson and on huge binomials,
which are O(1) here; d3-random leads on uniform and gamma, and stdlib on normal and on
binomial(100, 0.3). d3-random is timed with its seedable source, a 32-bit LCG, which is much weaker
statistically than xoshiro128\*\* or PCG. randlibjs also pays a little
for drawing every normal from 64 random bits, which is what makes reproducing numpy streams possible.

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

- [Interactive showcase](https://randlibjs.github.io/randlibjs/)
- [API reference](https://randlibjs.github.io/randlibjs/docs/)
- [Changelog](CHANGELOG.md)

## Development

```bash
npm install
npm test               # 800+ tests, including goodness-of-fit tests against scipy
npm run lint
npm run build          # dist/ bundles and types/
npm run check:package  # publint + Are the Types Wrong on the packed package
npm run size           # bundle size budgets
npm run check:claims   # claims of this README against the build
npm run coverage
npm run docs           # JSDoc API reference into docs/docs
```

`python scripts/numpy_parity.py > parity.json && node scripts/check-numpy-parity.mjs parity.json`
checks that randlibjs reproduces the installed numpy (CI runs it on every change and weekly; Dependabot bumps the pinned numpy).
See [CONTRIBUTING.md](CONTRIBUTING.md) for adding distributions and using AI tools.

The reference data in `test/fixtures` is generated with numpy/scipy by `python scripts/make_reference.py` and `python scripts/make_stats_reference.py`.

### How it is built

Parts of the code, tests and documentation are written with AI assistance (Claude Code). What backs the
results is the verification: goodness-of-fit tests, reference values from scipy, numpy and mpmath, the numpy
parity check and the checks above. A maintainer approves every release. See
[AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md#using-ai).

Also: [code of conduct](CODE_OF_CONDUCT.md), [governance](GOVERNANCE.md), [roadmap](ROADMAP.md) and
[security policy](SECURITY.md).

## License

BSD-3-Clause © [Adrián Muñoz Perera](https://pereradrian.github.io/)
