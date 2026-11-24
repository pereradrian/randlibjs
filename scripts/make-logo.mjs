// Draws the official randlibjs logo with the library itself and writes the SVG and PNG files.
//   npm run logo
// The PNG conversion uses @resvg/resvg-js, a dev dependency: nothing here ships in the package.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { logo } from '../index.js'

/** The seed of the official mark: changing it changes the logo everywhere. */
export const LOGO_SEED = 7

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, '.github', 'assets')
mkdirSync(out, { recursive: true })

function write(name, svg, pngSize) {
    writeFileSync(join(out, `${name}.svg`), svg + '\n')
    if (pngSize) {
        const png = new Resvg(svg, { fitTo: { mode: 'width', value: pngSize } }).render().asPng()
        writeFileSync(join(out, `${name}.png`), png)
    }
    console.log(`.github/assets/${name}.svg${pngSize ? ` + ${name}.png (${pngSize}px)` : ''}`)
}

// README and general use: rounded corners
write('logo', logo(512, { seed: LOGO_SEED }), 512)
// avatar for the GitHub and npm organizations: square, the sites round it themselves
write('avatar', logo(512, { seed: LOGO_SEED, rounded: false }), 1024)
// favicon: same drawing, small enough to stay crisp
write('favicon', logo(32, { seed: LOGO_SEED }))
