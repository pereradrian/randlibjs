import { baseGenerator } from '../functions/base-generator.js'
import { uniform } from '../functions/univariate/uniform.js'
import { randint } from '../functions/univariate/randint.js'

function chooseOneWeighted(array, weights, totalWeight) {
    const n = array.length
    const threshold = uniform(0.0, totalWeight)
    let accum = 0
    for (let i = 0; i < n; i++) {
        accum += weights[i]
        if (threshold < accum) {
            return array[i]
        }
    }

    // Fallback for floating precision
    return array[array.length - 1]
}

function chooseOneUniform(array) {
    return array[randint(array.length)]
}


/**
 * Shuffles the elements of an array along the first axis in-place.
 *
 * For N-dimensional arrays, this function only shuffles the order of the top-level sub-arrays.
 * The content and order within each sub-array remain unchanged.
 *
 * @param {Array} array - The array to shuffle. Must be N-dimensional.
 * @returns {Array} A new shuffled array if a deep copy is required, otherwise in-place modification.
 */
export function choice(array, weights = null, size = null) {
    if (!Array.isArray(array) || array.length === 0) {
        throw new Error("Items array can not be empty.")
    }
    
    if (weights !== null) {
        if (!Array.isArray(weights) || weights.length !== array.length) {
            throw new Error("array.length != weights.length.")
        }
        const totalWeight = weights.reduce((accumulatedWeight, weight) => accumulatedWeight + weight, 0);
        return baseGenerator(() => chooseOneWeighted(array, weights, totalWeight), size)
    }
    else {
        return baseGenerator(() => chooseOneUniform(array), size)
    }
}
