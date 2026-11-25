# Governance

randlibjs is maintained by one person, [@pereradrian](https://github.com/pereradrian), in the
[randlibjs](https://github.com/randlibjs) organization.

## Roles

- **Contributors** open issues and pull requests. No agreement is needed: contributions are accepted under
  the license of the project, BSD-3-Clause.
- **Maintainers** review and merge, decide what goes in, handle security reports and approve releases.

## Decisions

Decisions are made in the open, in issues and pull requests, and the maintainer has the last word. Three
things weigh most: the results are correct, seeded streams do not change within a major version, and the
package stays small.

## Changes and releases

Changes go through a pull request with the required checks: tests on three Node versions, package checks,
numpy parity and CodeQL; administrators can bypass them. With a single maintainer there is no independent
review, so the checks matter more.
A version is built and staged by GitHub Actions from a tag, and published only after a maintainer approves
it on npm with two-factor authentication.

## Continuity

The GitHub and npm organizations each have two owner accounts, and the GitHub organization requires
two-factor authentication. Contributors who take part regularly may be invited as maintainers.
