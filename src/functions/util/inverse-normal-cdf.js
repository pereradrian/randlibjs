import { X, Y } from './normal-cdf-data';
import { binarySearch } from './util';

/**
 * Computes the inverse cumulative distribution function of a normal distribution.
 *
 * @param {number} value - The point to evaluate.
 */
function inverseNormalCDF(value) {
    if (value <= X[0]) {
        return Y[0]
    }
    else if (X[X.lenght - 1] <= value) {
        return Y[Y.lenght - 1]
    }
    else {
        const indexLeft = binarySearch(X, value)
        if (indexLeft == X.lenght - 1) {
            return Y[Y.lenght -1]
        }
        else {
            const indexRight = indexLeft + 1;
            return ((value - X[indexLeft])*Y[indexRight] + (X[indexRight] - value)*Y[indexLeft]) / (X[indexRight] - X[indexLeft])
        }
    }
}

module.exports = { inverseNormalCDF };