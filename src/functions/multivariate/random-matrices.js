/**
 * Random matrices: Haar orthogonal groups, correlation matrices, Wishart family, matrix normal.
 * @module random-matrices
 */
import { standardNormal, standardGamma, betaSample } from '../../core/samplers.js'
import { normalizeSize, fillShape } from '../base-generator.js'
import { choleskyDecomposition } from '../util/cholesky.js'
import { matMul, transpose } from '../util/linalg.js'
import { assertPositiveInteger, assertPositive, assertNumber } from '../util/validate.js'

function sampler(sample, size) {
    const shape = normalizeSize(size)
    return shape === null ? sample() : fillShape(shape, sample)
}

function gaussianMatrix(rows, cols) {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => standardNormal()))
}

function assertSquare(name, m) {
    if (!Array.isArray(m) || m.length === 0 || m.some((row) => !Array.isArray(row) || row.length !== m.length)) {
        throw new Error(`${name} must be a non-empty square matrix.`)
    }
}

/**
 * Haar-distributed orthogonal matrix: QR of a Gaussian matrix with the R diagonal made
 * positive (Mezzadri, 2007), via twice-iterated modified Gram-Schmidt.
 * @private
 */
function haarOrthogonal(n) {
    const cols = transpose(gaussianMatrix(n, n))
    const q = []
    for (let j = 0; j < n; j++) {
        const v = cols[j].slice()
        for (let pass = 0; pass < 2; pass++) {
            for (const u of q) {
                let dot = 0
                for (let k = 0; k < n; k++) dot += u[k] * v[k]
                for (let k = 0; k < n; k++) v[k] -= dot * u[k]
            }
        }
        const norm = Math.hypot(...v)
        q.push(v.map((x) => x / norm))
    }
    return transpose(q)
}

/**
 * Determinant by Gaussian elimination with partial pivoting.
 * @param {number[][]} a
 * @returns {number}
 */
export function determinant(a) {
    const n = a.length
    const m = a.map((row) => row.slice())
    let det = 1
    for (let c = 0; c < n; c++) {
        let p = c
        for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r
        if (m[p][c] === 0) return 0
        if (p !== c) {
            [m[p], m[c]] = [m[c], m[p]]
            det = -det
        }
        det *= m[c][c]
        for (let r = c + 1; r < n; r++) {
            const f = m[r][c] / m[c][c]
            for (let k = c; k < n; k++) m[r][k] -= f * m[c][k]
        }
    }
    return det
}

/**
 * Inverse of a symmetric positive definite matrix through its Cholesky factor.
 * @param {number[][]} a
 * @returns {number[][]}
 */
export function inverseSPD(a) {
    const L = choleskyDecomposition(a)
    const n = a.length
    // invert L (lower triangular)
    const inv = Array.from({ length: n }, () => new Array(n).fill(0))
    for (let i = 0; i < n; i++) {
        if (L[i][i] === 0) throw new Error('Matrix is singular.')
        inv[i][i] = 1 / L[i][i]
        for (let j = 0; j < i; j++) {
            let s = 0
            for (let k = j; k < i; k++) s += L[i][k] * inv[k][j]
            inv[i][j] = -s / L[i][i]
        }
    }
    return matMul(transpose(inv), inv)
}

/**
 * Draws Haar-distributed (uniformly random) orthogonal matrices from O(n),
 * as `scipy.stats.ortho_group`.
 *
 * @param {number} dim - Matrix dimension.
 * @param {number|number[]|null} [size=null] - Output shape (each element is a matrix).
 * @returns {number[][]|Array}
 */
export function orthoGroup(dim, size = null) {
    assertPositiveInteger('dim', dim)
    return sampler(() => haarOrthogonal(dim), size)
}

/**
 * Draws Haar-distributed rotation matrices from SO(n) (determinant +1),
 * as `scipy.stats.special_ortho_group`.
 *
 * @param {number} dim - Matrix dimension.
 * @param {number|number[]|null} [size=null] - Output shape (each element is a matrix).
 * @returns {number[][]|Array}
 */
export function specialOrthoGroup(dim, size = null) {
    assertPositiveInteger('dim', dim)
    return sampler(() => {
        const q = haarOrthogonal(dim)
        if (determinant(q) < 0) {
            for (const row of q) row[0] = -row[0]
        }
        return q
    }, size)
}

/**
 * Draws random correlation matrices with the given eigenvalues (Davies & Higham, 2000),
 * as `scipy.stats.random_correlation`.
 *
 * @param {number[]} eigs - Non-negative eigenvalues summing to their count.
 * @param {number|number[]|null} [size=null] - Output shape (each element is a matrix).
 * @returns {number[][]|Array}
 */
export function randomCorrelation(eigs, size = null) {
    if (!Array.isArray(eigs) || eigs.length === 0 || eigs.some((e) => typeof e !== 'number' || !(e >= 0))) {
        throw new Error('eigs must be a non-empty array of non-negative numbers.')
    }
    const d = eigs.length
    const total = eigs.reduce((a, b) => a + b, 0)
    if (Math.abs(total - d) > 1e-10 * d) {
        throw new Error('The eigenvalues must sum to their number.')
    }
    return sampler(() => {
        const q = haarOrthogonal(d)
        const m = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => {
            let s = 0
            for (let k = 0; k < d; k++) s += q[i][k] * eigs[k] * q[j][k]
            return s
        }))
        return toCorrelation(m)
    }, size)
}

function givensToOne(aii, ajj, aij) {
    const aiid = aii - 1
    const ajjd = ajj - 1
    if (ajjd === 0) return [0, 1]
    const dd = Math.sqrt(Math.max(aij * aij - aiid * ajjd, 0))
    const t = (aij + Math.sign(aij || 1) * dd) / ajjd
    const c = 1 / Math.sqrt(1 + t * t)
    return [c, c === 0 ? 1 : c * t]
}

function toCorrelation(m) {
    const d = m.length
    for (let i = 0; i < d - 1; i++) {
        if (m[i][i] === 1) continue
        let j = i + 1
        if (m[i][i] > 1) {
            while (j < d - 1 && !(m[j][j] < 1)) j++
        } else {
            while (j < d - 1 && !(m[j][j] > 1)) j++
        }
        const [c, s] = givensToOne(m[i][i], m[j][j], m[i][j])
        // m = G^T m G with G = I, G[i][i] = G[j][j] = c, G[i][j] = s, G[j][i] = -s
        for (let k = 0; k < d; k++) {
            const a = m[i][k]
            const b = m[j][k]
            m[i][k] = c * a - s * b
            m[j][k] = s * a + c * b
        }
        for (let k = 0; k < d; k++) {
            const a = m[k][i]
            const b = m[k][j]
            m[k][i] = c * a - s * b
            m[k][j] = s * a + c * b
        }
    }
    for (let i = 0; i < d; i++) {
        m[i][i] = 1
        for (let j = 0; j < i; j++) {
            const v = Math.max(-1, Math.min(1, (m[i][j] + m[j][i]) / 2))
            m[i][j] = v
            m[j][i] = v
        }
    }
    return m
}

/**
 * Draws correlation matrices from the LKJ distribution (Lewandowski, Kurowicka & Joe, 2009),
 * with density proportional to det(R)^(eta - 1). `eta = 1` is uniform over correlation
 * matrices; larger `eta` concentrates around the identity. The usual prior in Bayesian models.
 *
 * @param {number} dim - Matrix dimension.
 * @param {number} [eta=1] - Concentration (> 0).
 * @param {number|number[]|null} [size=null] - Output shape (each element is a matrix).
 * @param {boolean} [cholesky=false] - Return the lower Cholesky factor instead of the matrix.
 * @returns {number[][]|Array}
 */
export function lkjCorrelation(dim, eta = 1, size = null, cholesky = false) {
    assertPositiveInteger('dim', dim)
    assertPositive('eta', eta)
    return sampler(() => {
        const L = Array.from({ length: dim }, () => new Array(dim).fill(0))
        L[0][0] = 1
        if (dim === 1) return cholesky ? L : [[1]]
        // canonical partial correlations, vine construction (as Stan's lkj_corr_cholesky_rng)
        let alpha = eta + 0.5 * (dim - 1)
        const acc = new Array(dim).fill(1)
        for (let i = 0; i < dim - 1; i++) {
            alpha -= 0.5
            if (i > 0) L[i][i] = Math.sqrt(acc[i])
            for (let j = i + 1; j < dim; j++) {
                const cpc = 2 * betaSample(alpha, alpha) - 1
                L[j][i] = cpc * Math.sqrt(acc[j])
                acc[j] *= 1 - cpc * cpc
            }
        }
        L[dim - 1][dim - 1] = Math.sqrt(acc[dim - 1])
        if (cholesky) return L
        const R = matMul(L, transpose(L))
        for (let i = 0; i < dim; i++) R[i][i] = 1
        return R
    }, size)
}

function bartlett(df, L) {
    const d = L.length
    const A = Array.from({ length: d }, () => new Array(d).fill(0))
    for (let i = 0; i < d; i++) {
        A[i][i] = Math.sqrt(2 * standardGamma((df - i) / 2))
        for (let j = 0; j < i; j++) A[i][j] = standardNormal()
    }
    const LA = matMul(L, A)
    return matMul(LA, transpose(LA))
}

/**
 * Draws matrices from the Wishart distribution W(df, scale) using the Bartlett decomposition,
 * as `scipy.stats.wishart`. The mean is df * scale.
 *
 * @param {number} df - Degrees of freedom (> dim - 1).
 * @param {number[][]} scale - Symmetric positive definite scale matrix.
 * @param {number|number[]|null} [size=null] - Output shape (each element is a matrix).
 * @returns {number[][]|Array}
 */
export function wishart(df, scale, size = null) {
    assertSquare('scale', scale)
    assertNumber('df', df)
    if (!(df > scale.length - 1)) throw new Error('df must be > dim - 1.')
    const L = choleskyDecomposition(scale)
    return sampler(() => bartlett(df, L), size)
}

/**
 * Draws matrices from the inverse Wishart distribution, as `scipy.stats.invwishart`.
 * The mean is scale / (df - dim - 1) for df > dim + 1.
 *
 * @param {number} df - Degrees of freedom (> dim - 1).
 * @param {number[][]} scale - Symmetric positive definite scale matrix.
 * @param {number|number[]|null} [size=null] - Output shape (each element is a matrix).
 * @returns {number[][]|Array}
 */
export function invWishart(df, scale, size = null) {
    assertSquare('scale', scale)
    assertNumber('df', df)
    if (!(df > scale.length - 1)) throw new Error('df must be > dim - 1.')
    const L = choleskyDecomposition(inverseSPD(scale))
    return sampler(() => inverseSPD(bartlett(df, L)), size)
}

/**
 * Draws matrices from the matrix normal distribution MN(mean, rowCov, colCov):
 * X = mean + A Z Bᵀ with rowCov = A Aᵀ, colCov = B Bᵀ and Z standard normal,
 * as `scipy.stats.matrix_normal`.
 *
 * @param {number[][]} mean - n x p mean matrix.
 * @param {number[][]} rowCov - n x n among-row covariance.
 * @param {number[][]} colCov - p x p among-column covariance.
 * @param {number|number[]|null} [size=null] - Output shape (each element is a matrix).
 * @returns {number[][]|Array}
 */
export function matrixNormal(mean, rowCov, colCov, size = null) {
    if (!Array.isArray(mean) || mean.length === 0 || !Array.isArray(mean[0])) {
        throw new Error('mean must be a matrix.')
    }
    const n = mean.length
    const p = mean[0].length
    assertSquare('rowCov', rowCov)
    assertSquare('colCov', colCov)
    if (rowCov.length !== n || colCov.length !== p) {
        throw new Error('Covariance shapes do not match the mean.')
    }
    const A = choleskyDecomposition(rowCov)
    const Bt = transpose(choleskyDecomposition(colCov))
    return sampler(() => {
        const X = matMul(matMul(A, gaussianMatrix(n, p)), Bt)
        return X.map((row, i) => row.map((x, j) => x + mean[i][j]))
    }, size)
}
