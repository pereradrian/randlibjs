/**
 * Returns an array of integers from `start` (inclusive) to `stop` (exclusive),
 * incrementing by `step`.
 *
 * If only one argument is provided, it is interpreted as `stop`, and `start` is assumed to be 0.
 * If `step` is not provided, it defaults to 1.
 *
 * @function
 * @param {number} a - `stop` if it's the only argument, or `start` if there are two or more.
 * @param {number} [b] - `stop` if two arguments are provided.
 * @param {number} [c] - `step`, optional. Defaults to 1. Cannot be 0.
 * @returns {number[]} Array of integers from `start` to `stop`, excluding `stop`.
 *
 * @example
 * range(5);        // [0, 1, 2, 3, 4]
 * range(3, 7);     // [3, 4, 5, 6]
 * range(10, 2, -2) // [10, 8, 6, 4]
 */
export function range(a, b, c = 1) {
    let start, end, step;
  
    if (b === undefined) {
      start = 0;
      end = a;
      step = 1;
    } else if (c === undefined) {
      start = a;
      end = b;
      step = 1;
    } else {
      start = a;
      end = b;
      step = c;
    }
  
    if (step === 0) {
      throw new Error("Step cannot be 0");
    }
  
    const result = [];
    if (step > 0) {
      for (let i = start; i < end; i += step) {
        result.push(i);
      }
    } else {
      for (let i = start; i > end; i += step) {
        result.push(i);
      }
    }
  
    return result;
  }
  