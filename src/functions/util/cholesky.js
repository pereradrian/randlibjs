/**
 * Computes the Cholesky decomposition of a symmetric positive semi-definite matrix.
 *
 * Given a matrix A, returns a lower triangular matrix L such that A = L * L^T.
 * Singular (positive semi-definite) matrices are accepted: pivots within a relative
 * tolerance of zero produce zero columns, as needed for degenerate covariance matrices.
 *
 * @param {number[][]} matrix - The symmetric positive (semi-)definite matrix to decompose.
 * @param {number} [tol=1e-10] - Relative tolerance used to decide that a pivot is zero.
 * @returns {number[][]} Lower triangular matrix L.
 * @throws Will throw an error if the matrix is not square, not symmetric or not positive semi-definite.
 *
 * References:
 * - [Cholesky Decomposition](https://en.wikipedia.org/wiki/Cholesky_decomposition)
 */
export function choleskyDecomposition(matrix, tol = 1e-10) {
    const n = matrix.length

    if (!matrix.every(row => Array.isArray(row) && row.length === n)) {
        throw new Error("Matrix must be square.")
    }
    let scale = 0
    for (let i = 0; i < n; i++) {
        scale = Math.max(scale, Math.abs(matrix[i][i]))
        for (let j = 0; j < i; j++) {
            if (Math.abs(matrix[i][j] - matrix[j][i]) > tol * Math.max(1, Math.abs(matrix[i][j]))) {
                throw new Error("Matrix must be symmetric.")
            }
        }
    }
    const eps = tol * Math.max(scale, Number.MIN_VALUE)

    const L = Array.from({ length: n }, () => new Array(n).fill(0))
    for (let j = 0; j < n; j++) {
        let sum = 0
        for (let k = 0; k < j; k++) {
            sum += L[j][k] * L[j][k]
        }
        const diag = matrix[j][j] - sum
        if (diag < -eps) {
            throw new Error("Matrix is not positive semi-definite.")
        }
        if (diag <= eps) {
            // zero pivot: the remaining entries of this column must vanish
            for (let i = j + 1; i < n; i++) {
                let s = 0
                for (let k = 0; k < j; k++) {
                    s += L[i][k] * L[j][k]
                }
                if (Math.abs(matrix[i][j] - s) > Math.sqrt(eps) * Math.max(1, Math.sqrt(scale))) {
                    throw new Error("Matrix is not positive semi-definite.")
                }
            }
            continue
        }
        const ljj = Math.sqrt(diag)
        L[j][j] = ljj
        for (let i = j + 1; i < n; i++) {
            let s = 0
            for (let k = 0; k < j; k++) {
                s += L[i][k] * L[j][k]
            }
            L[i][j] = (matrix[i][j] - s) / ljj
        }
    }
    return L
}
