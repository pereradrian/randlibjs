/**
 * Computes the Cholesky decomposition of a symmetric, positive-definite matrix.
 *
 * Given a matrix A, returns a lower triangular matrix L such that:
 * A = L * L^T
 *
 * @param {number[][]} matrix - The symmetric, positive-definite matrix to decompose.
 * @returns {number[][]} Lower triangular matrix L.
 *
 * @throws Will throw an error if the matrix is not square or not positive-definite.
 *
 * References:
 * - [Cholesky Decomposition](https://en.wikipedia.org/wiki/Cholesky_decomposition)
 */
export function choleskyDecomposition(matrix) {
    const n = matrix.length

    // Verify the matrix is square
    if (!matrix.every(row => row.length === n)) {
        throw new Error("Matrix must be square.")
    }

    const L = Array.from({ length: n }, () => Array(n).fill(0))

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0
            if (j === i) {
                // Diagonal elements
                for (let k = 0; k < j; k++) {
                    sum += L[j][k] ** 2
                }
                const diagValue = matrix[j][j] - sum
                if (diagValue <= 0) {
                    throw new Error("Matrix is not positive-definite.")
                }
                L[j][j] = Math.sqrt(diagValue)
            } else {
                // Off-diagonal elements
                for (let k = 0; k < j; k++) {
                    sum += L[i][k] * L[j][k]
                }
                L[i][j] = (matrix[i][j] - sum) / L[j][j]
            }
        }
    }
    return L
}
