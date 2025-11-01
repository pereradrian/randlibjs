import { randint } from './randint.js'

function swap(array, i, j) {
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
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
export function shuffle(array) {
    if (!Array.isArray(array)) {
        throw new Error("Input must be an array.")
    }
    for (let i = array.length - 1; i > 0; i--) {
        const j = randint(i+1) // Random index from 0 to i
        swap(array, i, j)
    }
    return array
}
