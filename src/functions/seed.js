let randomGenerator = Math.random; // Default generator

/**
 * PCG64 Random Number Generator
 * 
 * A JavaScript implementation of the Permuted Congruential Generator (PCG).
 * This algorithm was introduced by Melissa E. O'Neill in her paper:
 * "PCG: A Family of Simple Fast Space-Efficient Statistically Good Algorithms for Random Number Generation" (2014).
 * 
 * Reference:
 * - Paper: https://www.pcg-random.org/pdf/toms-oneill-pcg-family-v1.02.pdf
 * - Website: https://www.pcg-random.org/
 *
 * Constants used (multiplier and increment) are based on the PCG64 default configuration:
 * - Multiplier: 6364136223846793005 (prime relative to 2^64, ensures full period).
 * - Increment: 1442695040888963407 (odd, ensures proper state transitions).
 * 
 * This implementation generates 64-bit random numbers and maps them to the range [0, 1).
 *
 * @param {number|bigint} seed - The initial seed for the random generator.
 * @returns {function} - A function that generates random numbers in [0, 1).
 */
function pcg64(seed) {
    let state = BigInt(seed); // Use BigInt for 64-bit arithmetic
    const multiplier = 6364136223846793005n; // PCG multiplier
    const increment = 1442695040888963407n; // PCG increment

    return function () {
        // Update the internal state
        state = state * multiplier + increment & 0xFFFFFFFFFFFFFFFFn;

        // Extract high-order bits for randomness
        const result = Number(state >> 32n) / 0xFFFFFFFF;

        // Normalize to [0, 1)
        return result >= 0 ? result : result + 1;
    };
}

/**
 * Seeds the random number generator with a specified value.
 *
 * @param {number} seedValue - Value to initialize the random generator.
 * @returns {void}
 */
export function seed(seedValue) {
    const numericSeed = typeof seedValue === 'bigint' || typeof seedValue === 'number'
        ? BigInt(seedValue)
        : hashSeed(seedValue);
    randomGenerator = pcg64(numericSeed);
}

/**
 * Returns the current random generator function.
 *
 * @returns {function} The random number generator function.
 */
export function getRandomGenerator() {
    return randomGenerator;
}
