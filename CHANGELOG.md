# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- `logo()` escapes `background` and `foreground` and rejects a `size` that is not a positive number, so
  untrusted options can no longer inject markup into the SVG.
- `npm run docs` works again; the published API reference had been stuck since 2026-11-20.
- README claims that measurement did not support: the bundle is ~50 kB gzipped (it said ~29 kB), numpy
  parity is exact for some samplers and within 1e-13 for others, jStat can be seeded, ziggurat does use
  lookup tables, and randlibjs is not ahead of every library on gamma.
- Correction to the 2.2.0 notes: `lomax`, `rademacher` and `categorical` have no `stats` family, and that
  release made the npm tarball larger (279 kB to 338 kB).

### Added

- `AGENTS.md` and rules for AI-assisted contributions, after the 4D AI Fluency framework, and
  `npm run check:claims`, which checks the README against the built library in CI.

## [2.2.1] - 2026-11-24

### Changed

- **New logo** ([#35](https://github.com/randlibjs/randlibjs/issues/35)): `logo()` now draws a bell curve
  filled with a random circle packing whose centres are normal draws, with a few samples falling in from
  above. It takes `{ seed, background, foreground, rounded }`; with a seed the logo is reproducible and
  the global stream is left untouched. `npm run logo` writes the official mark to `.github/assets`.
- **New home**: the project moved to the [randlibjs](https://github.com/randlibjs) GitHub organization;
  the site is now https://randlibjs.github.io/randlibjs/ and the package links point there.

## [2.2.0] - 2026-11-23

### Added

- **27 more distribution objects** ([#31](https://github.com/randlibjs/randlibjs/issues/31)): every
  univariate sampler now has a `stats` family (halfNormal, maxwell, chi, nakagami, levy, frechet,
  logLogistic, kumaraswamy, betaPrime, inverseGamma, loguniform, semicircle, burr12, erlang,
  generalizedExtremeValue, generalizedPareto, skewNormal, exGaussian, power, wald, vonmises,
  noncentralChisquare, noncentralF, logseries, zipf, skellam, betaBinomial), checked against scipy.
- **Statistical tests** ([#32](https://github.com/randlibjs/randlibjs/issues/32)): `stats.kstest`,
  `stats.ks2samp`, `stats.chisquareTest`, `stats.andersonDarling`, `stats.describe` and
  `stats.gaussianKde`, checked against scipy.
- **Copulas** ([#33](https://github.com/randlibjs/randlibjs/issues/33)): `gaussianCopula`, `tCopula`,
  `claytonCopula`, `gumbelCopula`, `frankCopula`, plus `copulaTau` / `copulaTheta`.

### Changed

- Faster single draws ([#34](https://github.com/randlibjs/randlibjs/issues/34)): `normal()` ~20 →
  ~29 M/s, `uniform()` ~30 → ~137 M/s, with identical streams.

### Fixed

- Discrete quantiles never terminated for distributions with infinite variance, and far upper
  quantiles of heavy-tailed discrete distributions were slow.

## [2.1.0] - 2026-11-23

### Added

- **Typed-array output** ([#26](https://github.com/randlibjs/randlibjs/issues/26)): every
  univariate sampler accepts a typed array as `size` and fills it in place
  (`normal(0, 1, new Float32Array(n))`), with exactly the same values as `size = n`.
- **`fit()`** ([#27](https://github.com/randlibjs/randlibjs/issues/27)): maximum likelihood fitting
  for 20 `stats` families (`stats.gamma.fit(data)`, `stats.binomial.fit(data, { n })`), checked
  against scipy.stats.
- `special.trigamma`.

### Changed

- Smaller npm package (tarball 370 kB → 265 kB, unpacked 1.4 MB → 950 kB): `dist/randlib.mjs` is
  now minified, the readable `dist/randlib.js` is only attached to GitHub releases, and the source
  map of `randlib.min.js` is no longer shipped. The browser bundle is 33 kB brotli with the new
  `fit` (31 kB before); tree-shaken imports only pull what they use (`seed` + `normal`: 5 kB).

## [2.0.1] - 2026-11-23

### Fixed

- `stats.f(...).sf(x)` and `cdf(x)` in the far tails: for tiny x with small degrees of freedom
  the survival function returned exactly 1 (found by the new property-based tests).
- TypeScript projects using `require('randlibjs')` with `moduleResolution: node16`/`nodenext`
  now get CommonJS declarations (`types/index.d.cts`) instead of ESM ones.
- Documentation: `standard_normal` matches numpy bit for bit except for the rare draws from the
  ziggurat tail (|x| > 3.654), which can differ in the last bit because they use `log1p`.

### Added

- Property-based tests with fast-check (reproducibility, supports, quantile/cdf consistency).
- CI: numpy parity check against the current numpy release, publint, Are the Types Wrong,
  bundle size budgets, coverage upload, CodeQL and OpenSSF Scorecard.

## [2.0.0] - 2026-11-20

A complete rewrite that turns randlibjs into a numpy.random + scipy.stats equivalent for JavaScript.

### Added

- **Bit generators**: xoshiro128** (new default), PCG32, MT19937 (numpy `RandomState` seeding) and
  PCG64 with numpy's `SeedSequence`, plus numpy's PCG64DXSM, SFC64 and Philox. They support state snapshots, cloning, `jump`/`advance` and
  `spawn`. The global generator accepts numbers, bigints, strings or arrays as seeds, and a
  bit generator name: `seed(42, 'pcg64')`.
- **numpy compatibility**: `createGenerator(seed, 'pcg64')` reproduces `np.random.default_rng(seed)`:
  `random`, `uniform`, `integers`, `standard_normal`/`normal` (numpy's exact 256-layer ziggurat),
  `binomial` (inversion + BTPE) and `poisson` bit for bit, and `standard_exponential`, `gamma`, `beta`,
  `chisquare`, `dirichlet`, ... up to last-bit differences between `Math.log`/`Math.pow` and C's libm.
  `'mt19937'` reproduces `RandomState(seed)` (`random_sample`, `standard_normal`,
  `standard_exponential`, `standard_gamma`).
- **Generator objects** (`createGenerator` / `defaultRng`) with every sampling function as a method,
  plus `getState`/`setState`/`clone`/`spawn`/`run`.
- **numpy distributions**: `random`, `integers`, `standardNormal`, `standardExponential`,
  `standardGamma`, `gamma`, `beta`, `f`, `noncentralChisquare`, `noncentralF`, `standardT`,
  `studentT`, `standardCauchy`, `laplace`, `logistic`, `gumbel`, `weibull`, `rayleigh`, `power`,
  `wald`, `vonmises`, `lomax`, `negativeBinomial`, `hypergeometric`, `logseries`, `zipf`,
  `dirichlet`, `multinomial`, `multivariateHypergeometric`, `bytes`, `permuted`.
- **Beyond numpy**: `truncatedNormal` (exact in any tail), `halfNormal`, `skewNormal`, `levy`,
  `frechet`, `generalizedExtremeValue`, `generalizedPareto`, `inverseGamma`, `betaPrime`,
  `kumaraswamy`, `erlang`, `chi`, `maxwell`, `nakagami`, `loguniform`, `burr12`, `logLogistic`,
  `semicircle`, `exGaussian`, `betaBinomial`, `skellam`, `bernoulli`, `rademacher`, `categorical`,
  `AliasTable`, `uniformSphere`, `uniformBall`, `uuid4`.
- **`stats`**: scipy.stats-style frozen distributions (`pdf`/`pmf`, `logpdf`, `cdf`, `sf`, `ppf`,
  `isf`, `mean`, `variance`, `std`, `median`, `interval`, `entropy`, `sample`) for 25 families, and
  a **`special`** namespace (incomplete gamma/beta and their inverses, digamma, erf, …).
- **`qmc`**: Sobol (scrambled or not), Halton, Latin hypercube, Poisson disk, `scale`, `discrepancy`.
- **Random matrices**: `orthoGroup`, `specialOrthoGroup`, `randomCorrelation`, `lkjCorrelation`,
  `wishart`, `invWishart`, `matrixNormal`.
- **Stochastic processes**: `randomWalk`, `brownianMotion`, `brownianBridge`,
  `geometricBrownianMotion`, `ornsteinUhlenbeck`, `poissonProcess`, `inhomogeneousPoissonProcess`,
  `poissonCountingProcess`, `markovChain`.
- **Resampling**: `resample`, `bootstrap` (BCa and percentile intervals) and `permutationTest`.
- **Mixtures**: `mixture(components, weights, size, { returnLabels })` takes stats objects or
  functions with unnormalised weights, and `stats.mixture(components, weights)` gives their
  pdf/pmf, cdf, quantiles and moments.
- `choice` supports integer populations and sampling without replacement (weighted too).
  `shuffle`/`permutation` take an `axis`.
- `getState`, `setState` and `setRandomSource` for the global generator.
- **Distribution bundles** in `dist/` (ESM, CommonJS and a minified IIFE exposing `randlib`), so the
  jsDelivr/unpkg CDN links work, plus `require('randlibjs')` support.
- **TypeScript declarations**.
- Examples in `examples/`, and goodness-of-fit tests against scipy for every sampler.

### Changed (breaking)

- The default generator is xoshiro128**, so seeded sequences differ from 1.x.
- `normal` uses the exact polar method instead of an interpolated lookup table, so seeded values
  differ and the tails are correct.
- `poisson` is exact for every lambda (PTRS) instead of a rounded normal approximation above 37.
- `binomial` is exact and O(log n), and validates `n` and `p`.
- `randint`/`choice`/`shuffle` use unbiased bounded integers (Lemire's method).
- `permutation(array)` returns a shuffled copy and no longer modifies its argument (as numpy).
- `multivariate*` functions follow numpy's `size` semantics: `size = 1` returns `[[...]]`, and
  shapes are accepted.
- `scale = 0` is allowed in `normal` (returns `loc`), and `chisquare` accepts non-integer degrees of
  freedom.
- `pareto(alpha, xm)` gets a default `xm = 1`. `exponential(rate)` gets a default `rate = 1`.
- `mixture` weights are normalised instead of having to sum to 1.

### Fixed

- The old "pcg64" was a plain LCG without the PCG output function, and could return exactly 1.0.
- `geometric` could return 0.
- `triangular` did not validate its mode.
- `multivariateTriangular` produced three times the requested covariance.
- Dirichlet components with tiny alphas no longer round to 0 (numpy loses this precision).
- `choice` documentation described `shuffle`.
- The `publish` npm script re-ran `npm publish` recursively.

### Removed

- The `mathjs` dependency. The library now has no runtime dependencies.
- The 216 kB normal lookup table.

## [1.0.23] and earlier

See the [git history](https://github.com/randlibjs/randlibjs/commits/master).
