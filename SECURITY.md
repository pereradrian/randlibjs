# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 2.x | ✅ |
| < 2.0 | ❌ |

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's private vulnerability reporting:
[Report a vulnerability](https://github.com/randlibjs/randlibjs/security/advisories/new).
You will get an answer within a week.

## Scope

randlibjs generates **statistical** pseudo-random numbers. None of its bit generators
(xoshiro128\*\*, PCG, SFC64, Philox, MT19937) is cryptographically secure, and that is
not a vulnerability. For tokens, passwords or keys, use `crypto.getRandomValues()`, or
plug a cryptographic source into the library with `setRandomSource()`.

In scope: incorrect output that a user could not reasonably detect (for example a
seeded stream that silently differs from the documented one), denial of service through
crafted parameters, and supply-chain issues with the published package.

## Release integrity

Releases are built by GitHub Actions and published with
[npm provenance](https://docs.npmjs.com/generating-provenance-statements), so you can
verify which commit and workflow produced each version:

```bash
npm audit signatures
```
