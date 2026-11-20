import { expect } from 'vitest'

export function mean(xs) {
  let s = 0
  for (const x of xs) s += x
  return s / xs.length
}

export function variance(xs) {
  const m = mean(xs)
  let s = 0
  for (const x of xs) s += (x - m) ** 2
  return s / (xs.length - 1)
}

/**
 * Kolmogorov-Smirnov statistic of the sample against a continuous CDF.
 */
export function ksStatistic(xs, cdf) {
  const sorted = [...xs].sort((a, b) => a - b)
  const n = sorted.length
  let d = 0
  for (let i = 0; i < n; i++) {
    const f = cdf(sorted[i])
    d = Math.max(d, (i + 1) / n - f, f - i / n)
  }
  return d
}

/**
 * Asserts the sample is compatible with the CDF at significance level ~0.001.
 */
export function expectKS(xs, cdf) {
  const d = ksStatistic(xs, cdf)
  expect(d).toBeLessThan(1.95 / Math.sqrt(xs.length))
}

/**
 * Asserts a discrete sample is compatible with the given pmf using a chi-square
 * goodness-of-fit test (significance ~0.001). Cells with expected count < 5 are pooled.
 *
 * @param {number[]} xs - Integer sample.
 * @param {function(number): number} pmf
 * @param {number} lo - Smallest support value to consider.
 * @param {number} hi - Largest support value to consider (tail beyond is pooled).
 */
export function expectChiSquare(xs, pmf, lo, hi) {
  const n = xs.length
  const counts = new Map()
  for (const x of xs) counts.set(x, (counts.get(x) || 0) + 1)
  const cells = []
  let accExp = 0
  let accObs = 0
  let totalP = 0
  for (let k = lo; k <= hi; k++) {
    const p = pmf(k)
    totalP += p
    accExp += n * p
    accObs += counts.get(k) || 0
    if (accExp >= 5) {
      cells.push([accObs, accExp])
      accExp = 0
      accObs = 0
    }
  }
  let observedInRange = 0
  for (const [k, c] of counts) if (k >= lo && k <= hi) observedInRange += c
  accObs += n - observedInRange
  accExp += n * Math.max(0, 1 - totalP)
  if (cells.length > 0 && accExp < 5) {
    const last = cells.pop()
    accObs += last[0]
    accExp += last[1]
  }
  cells.push([accObs, accExp])
  let stat = 0
  for (const [o, e] of cells) if (e > 0) stat += (o - e) ** 2 / e
  const k = Math.max(cells.length - 1, 1)
  const z = 3.09
  const critical = k * (1 - 2 / (9 * k) + z * Math.sqrt(2 / (9 * k))) ** 3
  expect(stat).toBeLessThan(critical)
}

export function lgamma(x) {
  const g = 7
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x)
  x -= 1
  let a = c[0]
  const t = x + g + 0.5
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

export function logChoose(n, k) {
  return lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1)
}

/** Regularized lower incomplete gamma P(a, x). */
export function gammaP(a, x) {
  if (x <= 0) return 0
  if (x < a + 1) {
    let sum = 1 / a
    let term = sum
    for (let n = 1; n < 1000; n++) {
      term *= x / (a + n)
      sum += term
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break
    }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a))
  }
  let b = x + 1 - a
  let c = 1e300
  let d = 1 / b
  let h = d
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < 1e-300) d = 1e-300
    c = b + an / c
    if (Math.abs(c) < 1e-300) c = 1e-300
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 1e-15) break
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h
}

/** Regularized incomplete beta I_x(a, b). */
export function betaI(x, a, b) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  const cf = (x, a, b) => {
    let c = 1
    let d = 1 - (a + b) * x / (a + 1)
    if (Math.abs(d) < 1e-300) d = 1e-300
    d = 1 / d
    let h = d
    for (let m = 1; m < 1000; m++) {
      const m2 = 2 * m
      let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2))
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300
      c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300
      d = 1 / d; h *= d * c
      aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1))
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300
      c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300
      d = 1 / d
      const del = d * c
      h *= del
      if (Math.abs(del - 1) < 1e-15) break
    }
    return h
  }
  if (x < (a + 1) / (a + b + 2)) return bt * cf(x, a, b) / a
  return 1 - bt * cf(1 - x, b, a) / b
}
