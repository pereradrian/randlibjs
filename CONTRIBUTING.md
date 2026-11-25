# Contributing to randlibjs

Thanks for helping. Bug reports, new distributions, accuracy fixes and documentation are all welcome.

## Setup

```bash
git clone https://github.com/randlibjs/randlibjs.git
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

CI runs the tests on Node 20, 22 and 24, and a smoke test of the packed package on Node 18, the oldest
version the library supports.

By contributing you agree that your work is released under the BSD-3-Clause license of the project. See also
the [code of conduct](CODE_OF_CONDUCT.md), the [governance](GOVERNANCE.md) and the [roadmap](ROADMAP.md).

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
the reference values from Python on every change to make sure the fixtures are real. It installs
numpy from `scripts/parity/requirements.txt` (pinned with hashes, bumped by Dependabot to every new
numpy release).

## Using AI

AI tools are welcome. You are the author of what you submit, whatever wrote it. These rules follow the
4Ds of the [AI Fluency framework](https://academy.claude.com/collections/ai-fluency), by Rick Dakan and
Joseph Feller with Anthropic; [AGENTS.md](AGENTS.md) has the version for the tools themselves.

- **Delegation.** Decide what to hand over. Drafts, tests, refactors and reference scripts are good
  candidates. Choosing an algorithm, changing a seeded stream and anything about releases or security
  settings need a person to decide.
- **Description.** Point the tool to `AGENTS.md` and say what the goal is, who it is for and what must
  not change.
- **Discernment.** Polished output deserves more checking, not less. Validate numbers against an
  independent source (scipy, numpy, mpmath or a paper you have opened), open every citation, and rerun
  any benchmark or size before quoting it.
- **Diligence.** Say in the pull request when AI wrote a substantial part and how you checked it.
  Never paste secrets, private data or an undisclosed vulnerability into a tool, and make sure the code
  is compatible with the BSD-3-Clause license.

## Commits

Small, atomic commits with [Conventional Commit](https://www.conventionalcommits.org/)
prefixes (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`).

## Releases (maintainers)

Bump `version` in `package.json` and `CHANGELOG.md`, then push a `vX.Y.Z` tag. The
release workflow tests, builds and stages the version on npm with provenance; a
maintainer approves it with 2FA on npmjs.com (Staged Packages) or with
`npm stage approve <stage-id>`.
