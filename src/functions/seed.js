let randomGenerator = Math.random; // Default generator

/**
 * Seeds the random number generator with a specified value.
 *
 * @param {number} seedValue - An integer value to initialize the random generator.
 * @returns {void}
 */
function seed(seedValue) {
    if (!Number.isInteger(seedValue)) {
        throw new Error("Seed value must be an integer.");
    }


    randomGenerator = mulberry32(seedValue);
}

function mulberry32(seed) {
    return function () {
        seed |= 0; // Convert to 32-bit integer
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/**
 * Returns the current random generator function.
 *
 * @returns {function} The random number generator function.
 */
function getRandomGenerator() {
    return randomGenerator;
}

module.exports = { seed, getRandomGenerator };
