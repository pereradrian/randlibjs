/* eslint-disable no-loss-of-precision -- coefficients are reproduced verbatim from the published algorithms */
/**
 * Inverse of the standard normal cumulative distribution function (quantile function).
 *
 * Implements Wichura's algorithm AS 241 (PPND16), accurate to about 1 part in 10^16.
 *
 * Reference: M. J. Wichura (1988), "Algorithm AS 241: The Percentage Points of the
 * Normal Distribution", Applied Statistics 37(3), 477-484.
 *
 * @param {number} p - Probability in [0, 1].
 * @returns {number} The value `x` such that P(Z <= x) = p for Z ~ N(0, 1).
 *   Returns -Infinity for p = 0, Infinity for p = 1 and NaN outside [0, 1].
 */
export function inverseNormalCDF(p) {
    if (Number.isNaN(p) || p < 0 || p > 1) {
        return NaN
    }
    if (p === 0) {
        return -Infinity
    }
    if (p === 1) {
        return Infinity
    }
    const q = p - 0.5
    if (Math.abs(q) <= 0.425) {
        const r = 0.180625 - q * q
        return q * (((((((r * 2509.0809287301226727 +
            33430.575583588128105) * r + 67265.770927008700853) * r +
            45921.953931549871457) * r + 13731.693765509461125) * r +
            1971.5909503065514427) * r + 133.14166789178437745) * r +
            3.387132872796366608) /
            (((((((r * 5226.495278852545925 +
            28729.085735721942674) * r + 39307.89580009271061) * r +
            21213.794301586595867) * r + 5394.1960214247511077) * r +
            687.1870074920579083) * r + 42.313330701600911252) * r + 1)
    }
    let r = q < 0 ? p : 1 - p
    r = Math.sqrt(-Math.log(r))
    let value
    if (r <= 5) {
        r -= 1.6
        value = (((((((r * 7.7454501427834140764e-4 +
            0.0227238449892691845833) * r + 0.24178072517745061177) * r +
            1.27045825245236838258) * r + 3.64784832476320460504) * r +
            5.7694972214606914055) * r + 4.6303378461565452959) * r +
            1.42343711074968357734) /
            (((((((r * 1.05075007164441684324e-9 +
            5.475938084995344946e-4) * r + 0.0151986665636164571966) * r +
            0.14810397642748007459) * r + 0.68976733498510000455) * r +
            1.6763848301838038494) * r + 2.05319162663775882187) * r + 1)
    } else {
        r -= 5
        value = (((((((r * 2.01033439929228813265e-7 +
            2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r +
            0.026532189526576123093) * r + 0.29656057182850489123) * r +
            1.7848265399172913358) * r + 5.4637849111641143699) * r +
            6.6579046435011037772) /
            (((((((r * 2.04426310338993978564e-15 +
            1.4215117583164458887e-7) * r + 1.8463183175100546818e-5) * r +
            7.868691311456132591e-4) * r + 0.0148753612908506148525) * r +
            0.13692988092273580531) * r + 0.59983220655588793769) * r + 1)
    }
    return q < 0 ? -value : value
}

/**
 * Standard normal cumulative distribution function, computed through a
 * high precision complementary error function (W. J. Cody's rational approximations).
 *
 * @param {number} x
 * @returns {number} P(Z <= x) for Z ~ N(0, 1).
 */
export function normalCDF(x) {
    if (Number.isNaN(x)) {
        return NaN
    }
    return 0.5 * erfc(-x / Math.SQRT2)
}

/**
 * Complementary error function, relative accuracy ~1e-15 (W. J. Cody, 1969).
 *
 * @param {number} x
 * @returns {number}
 */
export function erfc(x) {
    const ax = Math.abs(x)
    let result
    if (ax < 0.5) {
        const t = x * x
        const top = (((0.185777706184603153 * t + 3.16112374387056560) * t + 113.864154151050156) * t + 377.485237685302021) * t + 3209.37758913846947
        const bot = (((t + 23.6012909523441209) * t + 244.024637934444173) * t + 1282.61652607737228) * t + 2844.23683343917062
        return 1 - x * top / bot
    } else if (ax < 4) {
        const top = (((((((2.15311535474403846e-8 * ax + 0.564188496988670089) * ax + 8.88314979438837594) * ax + 66.1191906371416295) * ax + 298.635138197400131) * ax + 881.952221241769090) * ax + 1712.04761263407058) * ax + 2051.07837782607147) * ax + 1230.33935479799725
        const bot = (((((((ax + 15.7449261107098347) * ax + 117.693950891312499) * ax + 537.181101862009858) * ax + 1621.38957456669019) * ax + 3290.79923573345963) * ax + 4362.61909014324716) * ax + 3439.36767414372164) * ax + 1230.33935480374942
        result = Math.exp(-ax * ax) * top / bot
    } else {
        const z = 1 / (ax * ax)
        const top = ((((0.0163153871373020978 * z + 0.305326634961232344) * z + 0.360344899949804439) * z + 0.125781726111229246) * z + 0.0160837851487422766) * z + 6.58749161529837803e-4
        const bot = ((((z + 2.56852019228982242) * z + 1.87295284992346725) * z + 0.527905102951428412) * z + 0.0605183413124413191) * z + 2.33520497626869185e-3
        result = Math.exp(-ax * ax) / ax * (0.564189583547756287 - z * top / bot)
    }
    return x < 0 ? 2 - result : result
}
