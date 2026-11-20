// Estimating pi: pseudo-random points versus a scrambled Sobol' sequence.
// Run: node examples/monte-carlo-pi.mjs
import { createGenerator, qmc } from '../index.js'

const rng = createGenerator(2024)
const insideFraction = (points) => points.filter(([x, y]) => x * x + y * y <= 1).length / points.length

console.log('     n   pseudo-random error   Sobol error')
for (const m of [8, 12, 16]) {
  const n = 2 ** m
  const mc = 4 * insideFraction(rng.random([n, 2]))
  const sobol = 4 * insideFraction(new qmc.Sobol(2, { rng }).random(n))
  console.log(`${String(n).padStart(6)}   ${Math.abs(mc - Math.PI).toExponential(2).padStart(19)}   ${Math.abs(sobol - Math.PI).toExponential(2).padStart(11)}`)
}
