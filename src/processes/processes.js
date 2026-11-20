/**
 * Simulation of stochastic processes.
 *
 * Continuous-time processes are simulated exactly on a regular grid of `n` steps over [0, T]
 * and return `{ t, x }` where `t` holds the n + 1 grid times and `x` the path (or an array of
 * paths when `paths` is given).
 *
 * @module processes
 */
import { rand, randBelow } from '../core/state.js'
import { standardNormal, standardExponential, poissonSample } from '../core/samplers.js'
import { assertPositive, assertPositiveInteger, assertFinite, assertNonNegative, assertProbability } from '../functions/util/validate.js'

function grid(T, n) {
    assertPositive('T', T)
    assertPositiveInteger('n', n)
    return Array.from({ length: n + 1 }, (_, i) => T * i / n)
}

function manyPaths(paths, simulate) {
    if (paths === undefined || paths === null) {
        return simulate()
    }
    assertPositiveInteger('paths', paths)
    return Array.from({ length: paths }, simulate)
}

/**
 * Simple random walk: steps of +stepSize with probability p and -stepSize otherwise.
 *
 * @example
 * randomWalk(100)                     // 101 positions starting at 0
 * randomWalk(10, { p: 0.6, start: 5 })
 *
 * @param {number} steps - Number of steps.
 * @param {Object} [options]
 * @param {number} [options.start=0] - Starting position.
 * @param {number} [options.p=0.5] - Probability of an up step.
 * @param {number} [options.stepSize=1] - Step size.
 * @param {number} [options.paths] - Number of independent paths.
 * @returns {number[]|number[][]} Positions (steps + 1 values per path).
 */
export function randomWalk(steps, { start = 0, p = 0.5, stepSize = 1, paths } = {}) {
    assertPositiveInteger('steps', steps)
    assertFinite('start', start)
    assertProbability('p', p)
    return manyPaths(paths, () => {
        const x = [start]
        for (let i = 0; i < steps; i++) {
            x.push(x[i] + (rand() < p ? stepSize : -stepSize))
        }
        return x
    })
}

/**
 * Brownian motion (Wiener process) with drift: dX = mu dt + sigma dW.
 *
 * @param {Object} [options]
 * @param {number} [options.T=1] - Time horizon.
 * @param {number} [options.n=100] - Number of time steps.
 * @param {number} [options.mu=0] - Drift.
 * @param {number} [options.sigma=1] - Volatility.
 * @param {number} [options.x0=0] - Starting value.
 * @param {number} [options.paths] - Number of independent paths.
 * @returns {{t: number[], x: number[]|number[][]}}
 */
export function brownianMotion({ T = 1, n = 100, mu = 0, sigma = 1, x0 = 0, paths } = {}) {
    const t = grid(T, n)
    assertNonNegative('sigma', sigma)
    const dt = T / n
    const sd = sigma * Math.sqrt(dt)
    const x = manyPaths(paths, () => {
        const path = [x0]
        for (let i = 0; i < n; i++) path.push(path[i] + mu * dt + sd * standardNormal())
        return path
    })
    return { t, x }
}

/**
 * Brownian bridge from `a` at time 0 to `b` at time T.
 *
 * @param {Object} [options]
 * @param {number} [options.T=1]
 * @param {number} [options.n=100]
 * @param {number} [options.a=0] - Start value.
 * @param {number} [options.b=0] - End value.
 * @param {number} [options.sigma=1] - Volatility.
 * @param {number} [options.paths] - Number of independent paths.
 * @returns {{t: number[], x: number[]|number[][]}}
 */
export function brownianBridge({ T = 1, n = 100, a = 0, b = 0, sigma = 1, paths } = {}) {
    const t = grid(T, n)
    const x = manyPaths(paths, () => {
        const w = brownianMotion({ T, n, sigma }).x
        const wT = w[n]
        return w.map((v, i) => a + v - t[i] / T * wT + t[i] / T * (b - a))
    })
    return { t, x }
}

/**
 * Geometric Brownian motion dS = mu S dt + sigma S dW, simulated exactly:
 * S_t = S_0 exp((mu - sigma²/2) t + sigma W_t). The Black–Scholes stock price model.
 *
 * @param {Object} [options]
 * @param {number} [options.s0=1] - Initial value (> 0).
 * @param {number} [options.mu=0] - Drift.
 * @param {number} [options.sigma=0.2] - Volatility.
 * @param {number} [options.T=1]
 * @param {number} [options.n=100]
 * @param {number} [options.paths] - Number of independent paths.
 * @returns {{t: number[], x: number[]|number[][]}}
 */
export function geometricBrownianMotion({ s0 = 1, mu = 0, sigma = 0.2, T = 1, n = 100, paths } = {}) {
    assertPositive('s0', s0)
    const t = grid(T, n)
    const dt = T / n
    const drift = (mu - sigma * sigma / 2) * dt
    const sd = sigma * Math.sqrt(dt)
    const x = manyPaths(paths, () => {
        const path = [s0]
        let logS = Math.log(s0)
        for (let i = 0; i < n; i++) {
            logS += drift + sd * standardNormal()
            path.push(Math.exp(logS))
        }
        return path
    })
    return { t, x }
}

/**
 * Ornstein–Uhlenbeck process dX = theta (mu - X) dt + sigma dW, simulated with its exact
 * Gaussian transition (no discretisation error). Mean reverting (Vasicek model).
 *
 * @param {Object} [options]
 * @param {number} [options.x0=0] - Starting value.
 * @param {number} [options.theta=1] - Mean reversion speed (> 0).
 * @param {number} [options.mu=0] - Long term mean.
 * @param {number} [options.sigma=1] - Volatility.
 * @param {number} [options.T=1]
 * @param {number} [options.n=100]
 * @param {number} [options.paths] - Number of independent paths.
 * @returns {{t: number[], x: number[]|number[][]}}
 */
export function ornsteinUhlenbeck({ x0 = 0, theta = 1, mu = 0, sigma = 1, T = 1, n = 100, paths } = {}) {
    assertPositive('theta', theta)
    const t = grid(T, n)
    const dt = T / n
    const decay = Math.exp(-theta * dt)
    const sd = sigma * Math.sqrt(-Math.expm1(-2 * theta * dt) / (2 * theta))
    const x = manyPaths(paths, () => {
        const path = [x0]
        for (let i = 0; i < n; i++) path.push(mu + (path[i] - mu) * decay + sd * standardNormal())
        return path
    })
    return { t, x }
}

/**
 * Arrival times of a homogeneous Poisson process with the given rate on [0, T].
 *
 * @param {number} rate - Events per unit time (>= 0).
 * @param {number} [T=1] - Time horizon.
 * @returns {number[]} Sorted arrival times.
 */
export function poissonProcess(rate, T = 1) {
    assertNonNegative('rate', rate)
    assertPositive('T', T)
    const times = []
    if (rate === 0) return times
    let time = standardExponential() / rate
    while (time <= T) {
        times.push(time)
        time += standardExponential() / rate
    }
    return times
}

/**
 * Arrival times of an inhomogeneous Poisson process with intensity `intensity(t)` bounded by
 * `maxRate` on [0, T], by Lewis–Shedler thinning.
 *
 * @param {function(number): number} intensity - Rate function.
 * @param {number} maxRate - Upper bound of the intensity on [0, T].
 * @param {number} [T=1] - Time horizon.
 * @returns {number[]} Sorted arrival times.
 */
export function inhomogeneousPoissonProcess(intensity, maxRate, T = 1) {
    if (typeof intensity !== 'function') throw new Error('intensity must be a function.')
    return poissonProcess(maxRate, T).filter((time) => {
        const lambda = intensity(time)
        if (lambda > maxRate * (1 + 1e-12)) throw new Error('intensity exceeds maxRate.')
        return rand() * maxRate < lambda
    })
}

/**
 * Number of events of a compound-free Poisson process at the grid times: N(t) on [0, T].
 *
 * @param {number} rate
 * @param {Object} [options]
 * @param {number} [options.T=1]
 * @param {number} [options.n=100]
 * @returns {{t: number[], x: number[]}}
 */
export function poissonCountingProcess(rate, { T = 1, n = 100 } = {}) {
    assertNonNegative('rate', rate)
    const t = grid(T, n)
    const x = [0]
    for (let i = 0; i < n; i++) x.push(x[i] + poissonSample(rate * T / n))
    return { t, x }
}

/**
 * Simulates a discrete-time Markov chain.
 *
 * @example
 * const P = [[0.9, 0.1], [0.5, 0.5]]
 * markovChain(P, 10, 0)   // 11 states starting at 0
 *
 * @param {number[][]} transition - Row-stochastic transition matrix.
 * @param {number} steps - Number of transitions.
 * @param {number|number[]} [start=0] - Initial state, or an initial distribution.
 * @returns {number[]} The visited states (steps + 1 values).
 */
export function markovChain(transition, steps, start = 0) {
    if (!Array.isArray(transition) || transition.length === 0 || transition.some((row) => !Array.isArray(row) || row.length !== transition.length)) {
        throw new Error('transition must be a square matrix.')
    }
    const k = transition.length
    const cumulative = transition.map((row) => {
        let s = 0
        const c = row.map((p) => {
            if (!(p >= 0)) throw new Error('Transition probabilities must be non-negative.')
            s += p
            return s
        })
        if (Math.abs(s - 1) > 1e-9) throw new Error('Each row of the transition matrix must sum to 1.')
        return c
    })
    assertPositiveInteger('steps', steps)
    const draw = (c) => {
        const u = rand() * c[c.length - 1]
        let i = 0
        while (i < k - 1 && u >= c[i]) i++
        return i
    }
    let state
    if (Array.isArray(start)) {
        if (start.length !== k) throw new Error('Initial distribution has the wrong length.')
        let s = 0
        state = draw(start.map((p) => (s += p)))
    } else {
        if (!Number.isInteger(start) || start < 0 || start >= k) throw new Error('Invalid initial state.')
        state = start
    }
    const chain = [state]
    for (let i = 0; i < steps; i++) {
        state = draw(cumulative[state])
        chain.push(state)
    }
    return chain
}

/**
 * Returns a bootstrap resample (sampling with replacement) of the data.
 *
 * @param {Array} data
 * @param {number} [size=data.length]
 * @returns {Array}
 */
export function resample(data, size = data?.length) {
    if (!Array.isArray(data) || data.length === 0) throw new Error('data must be a non-empty array.')
    assertPositiveInteger('size', size)
    return Array.from({ length: size }, () => data[randBelow(data.length)])
}
