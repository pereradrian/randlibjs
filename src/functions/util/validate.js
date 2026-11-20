/**
 * Parameter validation helpers shared by the distribution functions.
 * @private
 */

export function assertNumber(name, value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new Error(`${name} must be a number.`)
    }
}

export function assertFinite(name, value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`${name} must be a finite number.`)
    }
}

export function assertPositive(name, value) {
    assertNumber(name, value)
    if (!(value > 0)) {
        throw new Error(`${name} must be > 0.`)
    }
}

export function assertNonNegative(name, value) {
    assertNumber(name, value)
    if (!(value >= 0)) {
        throw new Error(`${name} must be >= 0.`)
    }
}

export function assertProbability(name, value) {
    assertNumber(name, value)
    if (!(value >= 0 && value <= 1)) {
        throw new Error(`${name} must be in [0, 1].`)
    }
}

export function assertNonNegativeInteger(name, value) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`${name} must be a non-negative integer.`)
    }
}

export function assertPositiveInteger(name, value) {
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new Error(`${name} must be a positive integer.`)
    }
}
