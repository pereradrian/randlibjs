/**
 * The randlibjs logo, drawn by the library itself: a bell curve filled with a random circle
 * packing. Candidate centres are normal draws, so the circles crowd in the middle and thin
 * out into the tails, and each circle grows until it touches a neighbour or the curve.
 * Every seed gives a different, equally valid logo.
 *
 * @module logo
 */
import { createGenerator } from '../core/generator.js'

const round = (v) => Math.round(v * 100) / 100

/**
 * Generates the randlibjs logo as an SVG string.
 *
 * @example
 * logo(512)                       // a new random logo every call
 * logo(512, { seed: 7 })          // the official mark
 * logo(64, { rounded: false })    // square corners, e.g. for an avatar
 *
 * @param {number} [size=512] - Width and height in pixels.
 * @param {Object} [options]
 * @param {number|string} [options.seed] - Seed for a reproducible logo; random when omitted.
 * @param {string} [options.background='#F7DF1E'] - Background colour ('none' for transparent).
 * @param {string} [options.foreground='#111111'] - Colour of the circles.
 * @param {boolean} [options.rounded=true] - Round the corners of the background.
 * @returns {string} The SVG markup.
 */
export function logo(size = 512, options = {}) {
    const { seed, background = '#F7DF1E', foreground = '#111111', rounded = true } = options
    const rng = createGenerator(seed)

    // the bell: baseline, peak height and spread, in a unit square
    const left = 0.06
    const right = 0.94
    const base = 0.78
    const height = 0.56
    const sigma = 0.15
    const curve = (x) => base - height * Math.exp(-((x - 0.5) ** 2) / (2 * sigma * sigma))
    const steps = 600
    const dxStep = (right - left) / steps
    const polyline = []
    for (let i = 0; i <= steps; i++) {
        const x = left + dxStep * i
        polyline.push([x, curve(x)])
    }

    /** Distance from (x, y) to the border of the region under the curve, capped at `max`. */
    function room(x, y, max) {
        if (x < left || x > right || y > base || y < curve(x)) return -1
        let d = Math.min(base - y, x - left, right - x, max)
        // only the stretch of the curve within d of x can be closer than d
        const from = Math.max(1, Math.floor((x - d - left) / dxStep))
        const to = Math.min(steps, Math.ceil((x + d - left) / dxStep) + 1)
        for (let i = from; i <= to; i++) {
            const [ax, ay] = polyline[i - 1]
            const [bx, by] = polyline[i]
            const dx = bx - ax
            const dy = by - ay
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
            d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy))
        }
        return d
    }

    const gap = 0.004
    const circles = []
    // coarse to fine: big circles first, then smaller ones fill what is left
    for (const cap of [0.08, 0.055, 0.038, 0.026, 0.018, 0.0125, 0.0088, 0.0062, 0.0045]) {
        for (let attempt = 0; attempt < 2500; attempt++) {
            const x = rng.normal(0.5, sigma * 1.25)
            const y = rng.uniform(curve(x), base)
            const min = cap * 0.55
            let r = cap
            for (const c of circles) {
                r = Math.min(r, Math.hypot(x - c[0], y - c[1]) - c[2] - gap)
                if (r < min) break
            }
            if (r < min) continue
            r = Math.min(r, room(x, y, cap + gap) - gap)
            if (r < min) continue
            circles.push([x, y, r])
        }
    }

    // a light rain of draws above the curve, thinning out with height: samples on their way in
    const rain = []
    for (let attempt = 0; attempt < 400 && rain.length < 26; attempt++) {
        const x = rng.normal(0.5, sigma)
        const top = curve(x)
        const y = top - 0.03 - rng.exponential(0.1)
        if (y < 0.07 || x < left + 0.05 || x > right - 0.05) continue
        // smaller the higher they are
        const r = 0.0105 * (1 - (top - y) / 0.75) ** 1.5
        if (r < 0.0035) continue
        const clear = [...circles, ...rain].every((c) => Math.hypot(x - c[0], y - c[1]) > c[2] + r + 0.012)
        if (clear) rain.push([x, y, r])
    }
    circles.push(...rain)

    const s = size
    const corner = rounded ? round(s * 0.22) : 0
    const back = background === 'none' ? '' : `<rect width="${s}" height="${s}" rx="${corner}" fill="${background}"/>`
    const dots = circles
        .map(([x, y, r]) => `<circle cx="${round(x * s)}" cy="${round(y * s)}" r="${round(r * s)}"/>`)
        .join('')
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" role="img" aria-label="randlibjs">` +
        `${back}<g fill="${foreground}">${dots}</g></svg>`
    )
}
