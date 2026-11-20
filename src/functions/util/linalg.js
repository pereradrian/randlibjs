/**
 * Minimal dense linear algebra helpers (row-major nested arrays).
 * @module linalg
 */

/**
 * Multiplies a matrix by a vector.
 *
 * @param {number[][]} matrix - m x n matrix.
 * @param {number[]} vector - Vector of length n.
 * @returns {number[]} Vector of length m.
 */
export function matVec(matrix, vector) {
    const out = new Array(matrix.length)
    for (let i = 0; i < matrix.length; i++) {
        const row = matrix[i]
        let sum = 0
        for (let j = 0; j < row.length; j++) {
            sum += row[j] * vector[j]
        }
        out[i] = sum
    }
    return out
}

/**
 * Multiplies two matrices.
 *
 * @param {number[][]} a - m x k matrix.
 * @param {number[][]} b - k x n matrix.
 * @returns {number[][]} m x n matrix.
 */
export function matMul(a, b) {
    const m = a.length
    const k = b.length
    const n = k > 0 ? b[0].length : 0
    const out = Array.from({ length: m }, () => new Array(n).fill(0))
    for (let i = 0; i < m; i++) {
        for (let p = 0; p < k; p++) {
            const aip = a[i][p]
            if (aip === 0) continue
            const bp = b[p]
            const oi = out[i]
            for (let j = 0; j < n; j++) {
                oi[j] += aip * bp[j]
            }
        }
    }
    return out
}

/**
 * Transposes a matrix.
 *
 * @param {number[][]} a
 * @returns {number[][]}
 */
export function transpose(a) {
    const m = a.length
    const n = m > 0 ? a[0].length : 0
    const out = Array.from({ length: n }, () => new Array(m))
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            out[j][i] = a[i][j]
        }
    }
    return out
}
