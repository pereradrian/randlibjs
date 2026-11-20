// The same random numbers as numpy, bit for bit.
// Run: node examples/numpy-reproducibility.mjs
import { createGenerator, seed, random, standardNormal } from '../index.js'

// np.random.default_rng(42)
const rng = createGenerator(42, 'pcg64')
console.log('default_rng(42).random(3)         ', rng.random(3))
console.log('default_rng(42).integers(0, 10, 5)', createGenerator(42, 'pcg64').integers(0, 10, 5))

// np.random.seed(42) / np.random.RandomState(42)
seed(42, 'mt19937')
console.log('RandomState(42).random_sample(3)  ', random(3))
seed(42, 'mt19937')
console.log('RandomState(42).standard_normal(3)', standardNormal(3))

// Python check:
//   >>> import numpy as np
//   >>> np.random.default_rng(42).random(3)
//   array([0.77395605, 0.43887844, 0.85859792])
