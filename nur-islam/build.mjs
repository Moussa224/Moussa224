// Empaquette src/ → app.js (IIFE unique, compatible file://). Usage : node build.mjs [--watch]
import * as esbuild from 'esbuild';
const watch = process.argv.includes('--watch');
const opts = {
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: ['es2020', 'chrome95', 'safari15', 'firefox95'],
  outfile: 'app.js',
  minify: !watch,
  sourcemap: false,
  legalComments: 'none',
  loader: { '.json': 'json' },
  logLevel: 'info',
};
if (watch) { const ctx = await esbuild.context(opts); await ctx.watch(); console.log('Surveillance…'); }
else await esbuild.build(opts);
