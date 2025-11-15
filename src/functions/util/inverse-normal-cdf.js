import { X, Y } from './normal-cdf-data.js'
import { binarySearch } from './binary-search.js'

/**
 * Computes the inverse cumulative distribution function of a normal distribution.
 *
 * @param {number} value - The point to evaluate.
 */
export function inverseNormalCDF(value) {
    const lastIndex = X.length - 1
    const effectiveValue = (value <= X[lastIndex]) ? value : 1.0 - value
    let result = null

    if (effectiveValue <= X[0]) {
        result = Y[0]
    }
    else if (X[lastIndex] <= effectiveValue) {
        result = Y[lastIndex]
    }
    else {
        const indexLeft = binarySearch(X, effectiveValue)
        if (indexLeft == lastIndex) {
            result = Y[lastIndex]
        }
        else {
            const indexRight = indexLeft + 1
            result = ((effectiveValue - X[indexLeft])*Y[indexRight] + (X[indexRight] - effectiveValue)*Y[indexLeft]) / (X[indexRight] - X[indexLeft])
        }
    }

    // Apply symmetry
    return (value <= X[lastIndex]) ? result : - result
}
