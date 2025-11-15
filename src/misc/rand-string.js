import { baseGenerator } from '../functions/base-generator.js'
import { randint } from '../functions/univariate/randint.js'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'

/**
 * Generates random strings or arrays of random strings.
 *
 * @param {number} length - The length of each generated string.
 * @param {string} [chars=CHARS] - The characters to use for generating the string.
 * @param {number|Array|null} [size=null] - The shape of the output:
 *   - If `null`, a single string is returned.
 *   - If a number, a 1D array of strings of that length is returned.
 *   - If an array (e.g. [m, n]), a multidimensional array of strings is returned.
 * @throws {Error} Throws if:
 *   - `length` is not a positive integer.
 *   - `chars` is not a non-empty string.
 *   - `size` is not `null`, a number, or an array of numbers.
 * @returns {string|Array} A single string or an array of random strings.
 */
export function randString(length, chars = CHARS, size = null) {
  if (!Number.isInteger(length) || length < 0) {
    throw new Error('Parameter "length" must be a positive integer.')
  }
  if (typeof chars !== 'string' || chars.length === 0) {
    throw new Error('Parameter "chars" must be a non-empty string.')
  }

  const generator = () => {
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randint(chars.length))
    }
    return result
  }

  return baseGenerator(generator, size)
}
