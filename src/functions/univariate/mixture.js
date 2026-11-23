import { normalizeSize, fillShape } from '../base-generator.js'
import { AliasTable } from './extra.js'

function toSampler(component, index) {
    if (typeof component === 'function') {
        return component
    }
    if (component && typeof component.sample === 'function') {
        return () => component.sample()
    }
    throw new Error(`Component ${index} must be a function or a distribution object with a sample() method.`)
}

/**
 * Draws samples from a finite mixture: each sample comes from component i with
 * probability weights[i]. Components are zero-argument sampling functions or distribution
 * objects such as `stats.normal(0, 1)`; they may even be multivariate.
 * Component selection is O(1) (alias method).
 *
 * See {@link stats}.mixture for the density, cdf, quantiles and moments of a mixture.
 *
 * @example
 * // bimodal: 70% N(0, 1), 30% N(5, 2²)
 * mixture([stats.normal(0, 1), stats.normal(5, 2)], [0.7, 0.3], 1000)
 * mixture([() => exponential(1), () => uniform(2, 3)], [1, 3], 10)   // weights are normalised
 *
 * // keep the component of each sample (e.g. to test clustering algorithms)
 * const { values, labels } = mixture([stats.normal(-2, 1), stats.normal(2, 1)], [0.5, 0.5], 100, { returnLabels: true })
 *
 * @param {Array<Function|Object>} generators - The mixture components.
 * @param {number[]} priors - Non-negative weights of the components (normalised automatically).
 * @param {number|number[]|null} [size=null] - Output shape.
 * @param {Object} [options]
 * @param {boolean} [options.returnLabels=false] - Also return the index of the component of
 *   each sample, as `{ values, labels }`.
 * @returns {*|Array|{values: *, labels: *}} The samples (and labels).
 * @throws {Error} If the components or weights are invalid, or a component throws when sampled.
 */
export function mixture(generators, priors, size = null, { returnLabels = false } = {}) {
    if (!Array.isArray(generators) || generators.length === 0) {
        throw new Error("generators must be a non-empty array.")
    }
    if (!Array.isArray(priors) || generators.length !== priors.length) {
        throw new Error("The number of priors must match the number of generators.")
    }
    const samplers = generators.map(toSampler)
    const table = new AliasTable(priors)
    const shape = normalizeSize(size)
    const draw = () => {
        const i = table.sample()
        return [samplers[i](), i]
    }
    const pairs = shape === null ? draw() : fillShape(shape, draw)
    if (shape === null) {
        return returnLabels ? { values: pairs[0], labels: pairs[1] } : pairs[0]
    }
    const values = mapShape2(pairs, 0, shape.length)
    if (!returnLabels) {
        return values
    }
    return { values, labels: mapShape2(pairs, 1, shape.length) }
}

/** Picks element `k` of every [value, label] pair at depth `depth`. @private */
function mapShape2(x, k, depth) {
    return depth === 0 ? x[k] : x.map((v) => mapShape2(v, k, depth - 1))
}
