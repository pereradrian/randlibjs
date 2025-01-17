import { uniform } from '../functions/uniform'
import { randint } from '../functions/randint'

export function logo(size) {
  
    let numberOfLayers = randint(3, 10)
    const centers = []
    const radius = []
  
    for (let layer = 0; layer < numberOfLayers; layer++) {
      while (1 / (layer + 1) / (layer + 1) < uniform()) {
        // Compute center and radius
        const centerAngle = uniform(0, Math.PI / 2)
        const centerRadius = uniform(layer, layer + 1) / numberOfLayers
        const x = centerRadius * Math.cos(centerAngle)
        const y = 1.0 - centerRadius * Math.sin(centerAngle)
        centers.push([size * x, size * y])
  
        const circleRadius = uniform(
          1 / (layer + 2) / (layer + 2),
          1 / (layer + 1) / (layer + 1)
        )
        radius.push(size * circleRadius)
      }
    }
  
    // Base rectangle SVG element
    const baseRectangle = `<rect x="0" y="0" width="${size}" height="${size}" rx="${size/4}" ry="${size/4}" fill="yellow" />`
  
    // Generate circles based on centers and radius
    const circles = centers
      .map(([cx, cy], index) => {
        const r = radius[index]
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="black" />`
      }).join("")
  
    // Complete SVG as a string
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" className="randlib-logo" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" viewBox="0 0 ${size} ${size}">
        <defs>
          <clipPath id="clip-rect">
            ${baseRectangle}
          </clipPath>
        </defs>
        ${baseRectangle}
        <g clip-path="url(#clip-rect)">
          <circle cx="0" cy="${size}" r="${size/4}" fill="black" />
          ${circles}
        </g>
      </svg>
    `
    return svg
  }
  