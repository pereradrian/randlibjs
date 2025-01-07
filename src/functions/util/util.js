/**
 * Performs binary search on a sorted array of floating-point numbers.
 * Returns the index of the largest element that is smaller than the search value.
 * If no such element exists, returns -1.
 *
 * @param {number[]} array - The sorted array of floating-point numbers.
 * @param {number} value - The value to search for.
 * @returns {number} The index of the largest element smaller than the search value.
 */
export function binarySearch(array, value) {
    let indexLeft = 0;
    let indexRight = array.length - 1;
    let indexResult = -1;

    while (indexLeft <= indexRight) {
        const indexMiddle = Math.floor((indexLeft + indexRight) / 2);

        if (array[indexMiddle] < value) {
            indexResult = indexMiddle; // If the current value is smaller, it may be the result
            indexLeft = indexMiddle + 1; // Continue searching to the right
        } else {
            indexRight = indexMiddle - 1; // If the current value is greater or equal, search to the left
        }
    }

    return indexResult;
}
