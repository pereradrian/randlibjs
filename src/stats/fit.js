/**
 * Maximum likelihood estimation for the `stats` families (scipy's `dist.fit`).
 * Each fitter takes validated data and returns the constructor arguments of the family.
 * Closed forms where they exist, Newton iterations for gamma / chi-square / beta / Weibull,
 * and Nelder–Mead on the log-likelihood for the remaining location-scale families.
 *
 * @module fit
 * @private
 */
import { digamma, trigamma } from './special.js'

/**
 * Converts data to a plain array of finite numbers and checks its size.
 * @param {ArrayLike<number>} data
 * @param {number} [min=2] - Minimum number of observations.
 * @returns {number[]}
 */
export function toData(data, min = 2) {
    if (data === null || typeof data !== 'object' || typeof data.length !== 'number') {
        throw new Error('data must be an array or typed array of numbers.')
    }
    const xs = Array.from(data)
    if (xs.length < min) {
        throw new Error(`fit needs at least ${min} observations, got ${xs.length}.`)
    }
    for (const x of xs) {
        if (typeof x !== 'number' || !Number.isFinite(x)) {
            throw new Error('data must contain only finite numbers.')
        }
    }
    return xs
}

const sum = (xs, f = (x) => x) => xs.reduce((s, x) => s + f(x), 0)
const mean = (xs, f) => sum(xs, f) / xs.length

/** Population standard deviation (the normal MLE). */
function sd(xs) {
    const m = mean(xs)
    return Math.sqrt(mean(xs, (x) => (x - m) ** 2))
}

function median(xs) {
    const s = [...xs].sort((a, b) => a - b)
    const m = s.length >> 1
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function quantile(sorted, q) {
    const pos = (sorted.length - 1) * q
    const lo = Math.floor(pos)
    const hi = Math.ceil(pos)
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

function requirePositive(xs, family) {
    if (xs.some((x) => x <= 0)) throw new Error(`${family}.fit needs strictly positive data.`)
}

function requireSpread(xs, family) {
    if (xs.every((x) => x === xs[0])) throw new Error(`${family}.fit needs data that are not all equal.`)
}

function requireIntegers(xs, family, min = 0) {
    if (xs.some((x) => !Number.isInteger(x) || x < min)) {
        throw new Error(`${family}.fit needs integer data >= ${min}.`)
    }
}

/**
 * Newton iteration for a scalar root with a positivity constraint: steps that would leave
 * (0, ∞) are halved.
 * @private
 */
function newtonPositive(f, df, x0, family) {
    let x = x0
    for (let i = 0; i < 200; i++) {
        let step = f(x) / df(x)
        while (x - step <= 0) step /= 2
        x -= step
        // quadratic convergence: once the step is this small the next one is below rounding
        if (Math.abs(step) <= 1e-12 * x) return x
    }
    throw new Error(`${family}.fit did not converge.`)
}

/**
 * Minimises f with the Nelder–Mead simplex method (adaptive coefficients, Gao & Han 2012),
 * restarting from the best point until the restart no longer improves it.
 * @param {function(number[]): number} f
 * @param {number[]} x0
 * @returns {number[]}
 */
export function nelderMead(f, x0, { step = 0.1, maxIter = 4000, tol = 1e-12 } = {}) {
    const n = x0.length
    const alpha = 1
    const beta = 1 + 2 / n
    const gamma = 0.75 - 1 / (2 * n)
    const delta = 1 - 1 / n
    let best = x0.slice()
    let fBest = f(best)
    for (let restart = 0; restart < 5; restart++) {
        let pts = [best.slice()]
        for (let i = 0; i < n; i++) {
            const p = best.slice()
            p[i] += p[i] === 0 ? step : step * Math.max(1, Math.abs(p[i]))
            pts.push(p)
        }
        let vals = pts.map(f)
        for (let it = 0; it < maxIter; it++) {
            const order = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b])
            pts = order.map((i) => pts[i])
            vals = order.map((i) => vals[i])
            // converged when the values agree to `tol` (relative) or the simplex has collapsed to
            // ~1e-9 relative in every coordinate, whichever comes first
            const spread = Math.abs(vals[n] - vals[0])
            const size = Math.max(...pts.slice(1).map((p) => Math.max(...p.map((v, j) => Math.abs(v - pts[0][j]) / (1 + Math.abs(pts[0][j]))))))
            if (spread <= tol * (Math.abs(vals[0]) + tol) || size <= 1e-9) break
            const c = new Array(n).fill(0)
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c[j] += pts[i][j] / n
            const move = (t) => c.map((cj, j) => cj + t * (pts[n][j] - cj))
            const xr = move(-alpha)
            const fr = f(xr)
            if (fr < vals[0]) {
                const xe = move(-alpha * beta)
                const fe = f(xe)
                if (fe < fr) { pts[n] = xe; vals[n] = fe } else { pts[n] = xr; vals[n] = fr }
            } else if (fr < vals[n - 1]) {
                pts[n] = xr; vals[n] = fr
            } else {
                const outside = fr < vals[n]
                const xc = move(outside ? -alpha * gamma : gamma)
                const fc = f(xc)
                if (fc < (outside ? fr : vals[n])) {
                    pts[n] = xc; vals[n] = fc
                } else {
                    for (let i = 1; i <= n; i++) {
                        pts[i] = pts[i].map((v, j) => pts[0][j] + delta * (v - pts[0][j]))
                        vals[i] = f(pts[i])
                    }
                }
            }
        }
        const improved = vals[0] < fBest - tol * (Math.abs(fBest) + tol)
        if (vals[0] <= fBest) {
            best = pts[0]
            fBest = vals[0]
        }
        if (!improved && restart > 0) break
    }
    return best
}

/**
 * Fits a location-scale family by minimising its negative log-likelihood over (loc, log scale).
 * @private
 */
function fitLocScale(xs, make, loc0, scale0) {
    const nll = ([loc, logScale]) => {
        const d = make(loc, Math.exp(logScale))
        let s = 0
        for (const x of xs) s -= d._logpdf(x)
        return Number.isFinite(s) ? s : Infinity
    }
    const [loc, logScale] = nelderMead(nll, [loc0, Math.log(scale0)])
    return [loc, Math.exp(logScale)]
}

function robustScale(xs) {
    const s = [...xs].sort((a, b) => a - b)
    const iqr = quantile(s, 0.75) - quantile(s, 0.25)
    if (iqr > 0) return iqr
    const s0 = sd(xs)
    return s0 > 0 ? s0 : 1
}

/**
 * The fitters. `classes` gives access to the distribution constructors for the numerical fits.
 * @param {Object} classes
 * @returns {Object<string, function(number[], Object): number[]>}
 */
export function makeFitters(classes) {
    return {
        normal(xs) {
            requireSpread(xs, 'normal')
            const m = mean(xs)
            return [m, Math.sqrt(mean(xs, (x) => (x - m) ** 2))]
        },
        uniform(xs) {
            requireSpread(xs, 'uniform')
            return [Math.min(...xs), Math.max(...xs)]
        },
        exponential(xs) {
            if (xs.some((x) => x < 0)) throw new Error('exponential.fit needs non-negative data.')
            const m = mean(xs)
            if (!(m > 0)) throw new Error('exponential.fit needs data with a positive mean.')
            return [1 / m]
        },
        lognormal(xs) {
            requirePositive(xs, 'lognormal')
            requireSpread(xs, 'lognormal')
            const logs = xs.map(Math.log)
            const m = mean(logs)
            return [m, Math.sqrt(mean(logs, (x) => (x - m) ** 2))]
        },
        gamma(xs) {
            requirePositive(xs, 'gamma')
            requireSpread(xs, 'gamma')
            const m = mean(xs)
            const s = Math.log(m) - mean(xs, Math.log)
            const k0 = (3 - s + Math.sqrt((s - 3) ** 2 + 24 * s)) / (12 * s)
            const k = newtonPositive((k) => Math.log(k) - digamma(k) - s, (k) => 1 / k - trigamma(k), k0, 'gamma')
            return [k, m / k]
        },
        chisquare(xs) {
            requirePositive(xs, 'chisquare')
            const c = mean(xs, Math.log) - Math.LN2
            const df = newtonPositive((v) => digamma(v / 2) - c, (v) => trigamma(v / 2) / 2, Math.max(mean(xs), 0.1), 'chisquare')
            return [df]
        },
        beta(xs) {
            if (xs.some((x) => !(x > 0 && x < 1))) throw new Error('beta.fit needs data in the open interval (0, 1).')
            requireSpread(xs, 'beta')
            const l1 = mean(xs, Math.log)
            const l2 = mean(xs, (x) => Math.log1p(-x))
            const m = mean(xs)
            const v = mean(xs, (x) => (x - m) ** 2)
            const common = m * (1 - m) / v - 1
            let a = common > 0 ? m * common : 1
            let b = common > 0 ? (1 - m) * common : 1
            for (let i = 0; i < 200; i++) {
                const tab = trigamma(a + b)
                const g1 = digamma(a) - digamma(a + b) - l1
                const g2 = digamma(b) - digamma(a + b) - l2
                const j11 = trigamma(a) - tab
                const j22 = trigamma(b) - tab
                const j12 = -tab
                const det = j11 * j22 - j12 * j12
                let da = (j22 * g1 - j12 * g2) / det
                let db = (j11 * g2 - j12 * g1) / det
                while (a - da <= 0 || b - db <= 0) { da /= 2; db /= 2 }
                a -= da
                b -= db
                if (Math.abs(da) <= 1e-12 * a && Math.abs(db) <= 1e-12 * b) return [a, b]
            }
            throw new Error('beta.fit did not converge.')
        },
        weibull(xs) {
            requirePositive(xs, 'weibull')
            requireSpread(xs, 'weibull')
            // work with y = x / max(x) so that y^k never overflows; the shape equation is unchanged
            const top = Math.max(...xs)
            const ly = xs.map((x) => Math.log(x / top))
            const ml = mean(ly)
            const sdLog = Math.sqrt(mean(ly, (l) => (l - ml) ** 2))
            const moments = (k) => {
                let s0 = 0, s1 = 0, s2 = 0
                for (const l of ly) {
                    const w = Math.exp(k * l)
                    s0 += w
                    s1 += w * l
                    s2 += w * l * l
                }
                return [s0, s1 / s0, s2 / s0]
            }
            const k = newtonPositive(
                (k) => { const [, a] = moments(k); return a - 1 / k - ml },
                (k) => { const [, a, b] = moments(k); return b - a * a + 1 / (k * k) },
                Math.PI / Math.sqrt(6) / sdLog, 'weibull')
            return [k, top * Math.pow(moments(k)[0] / xs.length, 1 / k)]
        },
        rayleigh(xs) {
            if (xs.some((x) => x < 0)) throw new Error('rayleigh.fit needs non-negative data.')
            const s = Math.sqrt(mean(xs, (x) => x * x) / 2)
            if (!(s > 0)) throw new Error('rayleigh.fit needs data that are not all zero.')
            return [s]
        },
        pareto(xs) {
            requirePositive(xs, 'pareto')
            requireSpread(xs, 'pareto')
            const xm = Math.min(...xs)
            return [xs.length / sum(xs, (x) => Math.log(x / xm)), xm]
        },
        laplace(xs) {
            requireSpread(xs, 'laplace')
            const m = median(xs)
            return [m, mean(xs, (x) => Math.abs(x - m))]
        },
        logistic(xs) {
            requireSpread(xs, 'logistic')
            return fitLocScale(xs, (l, s) => new classes.Logistic(l, s), median(xs), sd(xs) * Math.sqrt(3) / Math.PI || 1)
        },
        gumbel(xs) {
            requireSpread(xs, 'gumbel')
            const b0 = sd(xs) * Math.sqrt(6) / Math.PI
            return fitLocScale(xs, (l, s) => new classes.Gumbel(l, s), mean(xs) - 0.5772156649015329 * b0, b0)
        },
        cauchy(xs) {
            requireSpread(xs, 'cauchy')
            return fitLocScale(xs, (l, s) => new classes.Cauchy(l, s), median(xs), robustScale(xs) / 2)
        },
        studentT(xs) {
            requireSpread(xs, 'studentT')
            const nll = ([logDf, loc, logScale]) => {
                const d = new classes.StudentT(Math.exp(logDf), loc, Math.exp(logScale))
                let s = 0
                for (const x of xs) s -= d._logpdf(x)
                return Number.isFinite(s) ? s : Infinity
            }
            const [logDf, loc, logScale] = nelderMead(nll, [Math.log(5), median(xs), Math.log(robustScale(xs) / 1.349)])
            return [Math.exp(logDf), loc, Math.exp(logScale)]
        },
        // discrete
        poisson(xs) {
            requireIntegers(xs, 'poisson')
            return [mean(xs)]
        },
        geometric(xs) {
            requireIntegers(xs, 'geometric', 1)
            return [1 / mean(xs)]
        },
        bernoulli(xs) {
            if (xs.some((x) => x !== 0 && x !== 1)) throw new Error('bernoulli.fit needs data of 0s and 1s.')
            return [mean(xs)]
        },
        binomial(xs, { n } = {}) {
            if (!Number.isInteger(n) || n < 1) throw new Error('binomial.fit needs the number of trials: fit(data, { n }).')
            requireIntegers(xs, 'binomial')
            if (xs.some((x) => x > n)) throw new Error('binomial.fit: every observation must be <= n.')
            return [n, mean(xs) / n]
        },
        negativeBinomial(xs, { n } = {}) {
            if (!(typeof n === 'number' && n > 0)) throw new Error('negativeBinomial.fit needs the number of successes: fit(data, { n }).')
            requireIntegers(xs, 'negativeBinomial')
            return [n, n / (n + mean(xs))]
        },
    }
}
