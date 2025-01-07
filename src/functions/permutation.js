import shuffle from './shuffle'

/**
 * Generates a random permutation of an array or a range of integers.
 *
 * @param {Array|number} x - If an array, it is shuffled and returned. 
 *   If a number `n`, returns a random permutation of integers `[0, 1, ..., n-1]`.
 * @returns {Array} A randomly permuted array.
 */
function permutation(x) {
    if (typeof x === "number") {
        if (x <= 0 || !Number.isInteger(x)) {
            throw new Error("If x is a number, it must be a positive integer.");
        }
        // Create an array [0, 1, ..., x-1]
        x = Array.from({ length: x }, (_, i) => i);
    } else if (!Array.isArray(x)) {
        throw new Error("Input must be an array or a positive integer.");
    }
    // Shuffle the array in-place
    shuffle(x)

    return x;
}

module.exports = permutation;
