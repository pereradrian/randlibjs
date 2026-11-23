# Contributing to randlibjs

Thanks for helping. Bug reports, new distributions, accuracy fixes and documentation are all welcome.

## Setup

```bash
git clone https://github.com/pereradrian/randlibjs.git
cd randlibjs
npm install
npm test
```

Node 20 or newer. Python with numpy and scipy is only needed to regenerate reference data.

## Before opening a pull request

```bash
npm run lint
npm test
npm run build          # dist/ bundles and types/
npm run check:package  # publint + Are the Types Wrong on the packed package
npm run size           # bundle size budgets
```

CI runs all of these on Node 20, 22 and 24.

## Adding a distribution

1. **Exact algorithm.** Use a published, exact method and cite it in the JSDoc
   (`@see` or a comment). If numpy implements the distribution, match its algorithm so
   seeded streams can agree with numpy.
2. **Validation.** Parameters go through the helpers in `src/functions/util/validate.js`
   and produce clear error messages.
3. **API shape.** Follow the existing convention: parameters first, then `size`
   (a number, a shape array or `null` for a single value).
4. **Export it** from `src/distributions.js` (so `Generator` gets it as a method) and
   from `index.js`.
5. **Tests.** Add a goodness-of-fit test against the exact distribution (see
   `test/helpers/stats.js` and `test/reference.test.js`), plus parameter validation
   tests. If scipy has the distribution, add it to `scripts/make_reference.py` and
   regenerate the fixtures.
6. **Docs.** JSDoc with an `@example`, a row in the README table and a line in
   `CHANGELOG.md` under *Unreleased*.

## numpy reproducibility

With the `pcg64` (and `pcg64dxsm`, `sfc64`, `philox`, `mt19937`) bit generators,
randlibjs reproduces numpy streams. Changes to samplers used by numpy must keep
`test/numpy-compat.test.js` passing. The **numpy parity** CI workflow regenerates
the reference values from Python on every change to make sure the fixtures are real.

## Commits

Small, atomic commits with [Conventional Commit](https://www.conventionalcommits.org/)
prefixes (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`).

## Releases (maintainers)

Bump `version` in `package.json` and `CHANGELOG.md`, then push a `vX.Y.Z` tag. The
release workflow tests, builds and stages the version on npm with provenance; a
maintainer approves it with 2FA on npmjs.com (Staged Packages) or with
`npm stage approve <stage-id>`.
