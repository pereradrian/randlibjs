import { getRandomGenerator } from '../seed.js'
import { baseGenerator } from '../base-generator.js'
import { normal } from './normal.js'
import { POISSON_LAMBDA_NORMAL_APPROXIMATION_THRESHOLD } from '../util/constants.js'


function generatePoisson(lambda) {
    const L = Math.exp(-lambda)
    let k = 0
    let p = 1.0
    do {
        k++
        p *= getRandomGenerator()()
    } while (p > L)
    return k - 1
}

function estimatePoissonForLargeLambda(lambda) {
    return Math.round(normal(lambda, Math.sqrt(lambda)))
}

/**
 * Generates random numbers following a Poisson distribution with a given mean (lambda).
 * The Poisson distribution models the number of events occurring in a fixed interval of time
 * or space, given the events occur independently and at a constant average rate.
 *
 * Algorithm: Knuth's method is used for generating Poisson-distributed random numbers.
 * For lambda <= 30, Knuth's algorithm is efficient and accurate. For larger lambda the normal approximation is used.
 *
 * @param {number} lambda - The mean number of occurrences (lambda > 0).
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single Poisson random value is returned.
 *   - If a number, a 1D array of the specified size is returned.
 *   - If an array (e.g., [m, n]), a multidimensional array of the specified shape is returned.
 * @returns {number|Array} A Poisson random number, an array of random numbers, or a multidimensional array.
 *
 * @throws {Error} If lambda is not a positive number.
 */
export function poisson(lambda, size = null) {
    if ( lambda <= 0 ) {
        throw new Error("Lambda must be a positive number.")
    }

    let generator = null
    if ( POISSON_LAMBDA_NORMAL_APPROXIMATION_THRESHOLD < lambda ){
        generator = () => estimatePoissonForLargeLambda(lambda)
    }
    else {
        generator = () => generatePoisson(lambda)
    }

    // Use baseGenerator to handle the shape of the output.
    return baseGenerator(generator, size)
}

