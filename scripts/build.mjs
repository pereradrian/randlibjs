// Builds the distributable bundles into dist/:
//   randlib.mjs      ES module bundle
//   randlib.cjs      CommonJS bundle (require)
//   randlib.js       IIFE exposing the global `randlib` (browsers, <script>)
//   randlib.min.js   minified IIFE, the file served by jsDelivr / unpkg
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
  build({ ...common, format: 'esm', outfile: 'dist/randlib.mjs' }),
  build({ ...common, format: 'cjs', outfile: 'dist/randlib.cjs' }),
  build({ ...common, format: 'iife', globalName: 'randlib', outfile: 'dist/randlib.js' }),
  build({ ...common, format: 'iife', globalName: 'randlib', minify: true, sourcemap: true, outfile: 'dist/randlib.min.js' }),
])
