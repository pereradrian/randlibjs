// Compiled with `npm run typecheck` to make sure the published declarations are usable.
import {
  seed, normal, createGenerator, stats, qmc, Generator, PCG64, brownianMotion, choice, dirichlet,
} from '../../types/index.js'

seed(42, 'mt19937')
const x: number | any[] = normal(0, 1, 10)
const rng: Generator = createGenerator(1, 'pcg64')
const y = rng.normal(0, 1, 3)
const z = rng.integers(0, 10, [2, 2], true)
const p: number = stats.normal(0, 1).cdf(1.96) as number
const pts: number[][] = new qmc.Sobol(2, { scramble: false }).random(4)
const path = brownianMotion({ T: 1, n: 10 })
const b = new PCG64(42).nextUint64()
const c = choice(['a', 'b'], null, 3, false)
const d = dirichlet([1, 1])
export { x, y, z, p, pts, path, b, c, d }
