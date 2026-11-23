// Builds the distributable bundles into dist/:
//   randlib.mjs      minified ES module bundle (CDN <script type="module">)
//   randlib.cjs      CommonJS bundle (require), readable for clear stack traces
//   randlib.min.js   minified IIFE exposing the global `randlib`, served by jsDelivr / unpkg
//   randlib.js       readable IIFE, attached to GitHub releases only (not published to npm)
// npm consumers of the ES module import the tree-shakable sources (index.js, src/).
import { build } from 'esbuild'
import { readFileSync, rmSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const banner = `/*! randlibjs v${pkg.version} | ${pkg.license} | ${pkg.homepage} */`

rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true })

const common = {
  entryPoints: ['index.js'],
  bundle: true,
  target: 'es2020',
  banner: { js: banner },
  sourcemap: false,
  logLevel: 'info',
}

await Promise.all([
  build({ ...common, format: 'esm', minify: true, outfile: 'dist/randlib.mjs' }),
  build({ ...common, format: 'cjs', outfile: 'dist/randlib.cjs' }),
  build({ ...common, format: 'iife', globalName: 'randlib', outfile: 'dist/randlib.js' }),
  build({ ...common, format: 'iife', globalName: 'randlib', minify: true, outfile: 'dist/randlib.min.js' }),
])
