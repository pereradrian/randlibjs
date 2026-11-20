import { randBelow } from '../core/state.js'

function swap(array, i, j) {
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
}

/**
 * Returns a uniformly random permutation of [0, ..., n-1] (Fisher-Yates).
 * @param {number} n
 * @returns {number[]}
 * @private
 */
export function randomPermutationIndices(n) {
    const p = Array.from({ length: n }, (_, i) => i)
    for (let i = n - 1; i > 0; i--) {
        swap(p, i, randBelow(i + 1))
    }
    return p
}

function applyAlongAxis(array, axis, perm) {
    if (axis === 0) {
        const copy = array.slice()
        for (let i = 0; i < perm.length; i++) {
            array[i] = copy[perm[i]]
        }
        return
    }
    for (const sub of array) {
        if (!Array.isArray(sub)) {
            throw new Error("axis is out of bounds for the array.")
        }
        applyAlongAxis(sub, axis - 1, perm)
    }
}

function axisLength(array, axis) {
    let node = array
    for (let d = 0; d < axis; d++) {
        if (!Array.isArray(node) || node.length === 0) {
            return 0
        }
        node = node[0]
    }
    if (!Array.isArray(node)) {
        throw new Error("axis is out of bounds for the array.")
    }
    return node.length
}

/**
 * Shuffles an array in place (Fisher-Yates) along the given axis and returns it.
 *
 * For nested arrays only the order of the slices along `axis` changes; the same permutation
 * is applied to every slice, so rows (axis 0) or columns (axis 1) move as a whole, as numpy.
 *
 * @example
 * shuffle([1, 2, 3, 4])
 * shuffle([[1, 2], [3, 4]], 1)   // swaps columns
 *
 * @param {Array} array - The array to shuffle in place.
 * @param {number} [axis=0] - Axis along which to shuffle.
 * @returns {Array} The same array, shuffled.
 */
export function shuffle(array, axis = 0) {
    if (!Array.isArray(array)) {
        throw new Error("Input must be an array.")
    }
    if (!Number.isInteger(axis) || axis < 0) {
        throw new Error("axis must be a non-negative integer.")
    }
    if (axis === 0) {
        for (let i = array.length - 1; i > 0; i--) {
            swap(array, i, randBelow(i + 1))
        }
        return array
    }
    applyAlongAxis(array, axis, randomPermutationIndices(axisLength(array, axis)))
    return array
}
