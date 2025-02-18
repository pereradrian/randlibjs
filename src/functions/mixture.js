import { getRandomGenerator } from './seed'
import { baseGenerator }  from './base-generator'
import { inverseNormalCDF } from './util/inverse-normal-cdf'
import { EPS } from './util/constants'
import { uniform } from './uniform'

/**
 * Generates random numbers or arrays of random numbers for a mixture of given distributions.
 *
 * @param {Array} [generators] - The list of generators corresponding to each distribution.
 * @param {number} [priors] - The list of priors, one per distribution, must sum to 1.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single number is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @throws {Error} If any of the generators raise an error on sampling. 
 * @returns {number|Array} A single sample, an array, or a multidimensional array of numbers accoirding to the mixture of the distributions provided.
 *
 */
export function mixture(generators, priors, size) {
    if (generators.length !== priors.length) {
        throw new Error("The number of priors must match the number of generators.");
    }

    const sumPriors = priors.reduce((acc, p) => acc + p, 0);
    if (Math.abs(sumPriors - 1) > EPS) {
        throw new Error("Priors must sum to 1.");
    }

    function pickGenerator() {
        const threshold = uniform();
        let cumulative = 0
        for (let indexDistribution = 0; indexDistribution < priors.length; indexDistribution++) {
            cumulative += priors[indexDistribution]
            if (threshold < cumulative) {
                return generators[indexDistribution]
            }
        }
        return generators[generators.length - 1];
    }

    return baseGenerator(() => pickGenerator()(), size)
}
