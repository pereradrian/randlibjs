# Roadmap

Ideas under consideration, not promises. Open an issue to discuss one or to suggest another.

## Under consideration

- `stats` families for `lomax`, `rademacher` and `categorical`, the univariate samplers without one.
- Discrete and multivariate additions to `fit()`.
- A smaller npm package: the tarball grew in 2.2.0.
- A faster standard normal for the default generator, without changing existing streams.
- TypeScript 7, once its declarations for JSDoc sources are as precise as those of 5.x.

## Not planned

- Cryptographic randomness: use `crypto.getRandomValues()`.
- Runtime dependencies.
- Changing seeded streams within a major version.
