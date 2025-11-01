import { getRandomGenerator } from './seed.js'
import { baseGenerator } from './base-generator.js'

/**
 * Generates random numbers or arrays of random numbers for a binomial distribution.
 *
 * @param {number} n - Number of trials.
 * @param {number} p - Probability of success in each trial.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @returns {number|Array} A single sample, an array, or a multidimensional array of binomial numbers.
 *
 */
export function binomial(n, p, size=null) {
    // Use baseGenerator to handle the shape of the output.
    return baseGenerator(() => sampleBinomial(n,p), size)
}
function sampleBinomial(n, p) {
    let successes = 0
    for (let i = 0; i < n; i++) {
        if (getRandomGenerator()() < p) {
            successes++
        }
    }
    return successes
}