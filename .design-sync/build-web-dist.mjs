// Builds the react-native-web dist the design-sync converter consumes as its --entry.
// RN primitives are aliased to react-native-web; react/react-dom stay external so the
// converter's _vendor provides ONE React instance (RNW's Pressable uses hooks — two
// React copies would throw "Invalid hook call").
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repo = '/Users/Abdullah/Projects/potion-sort';
const require = createRequire(path.join(repo, '.ds-sync/'));
const esbuild = require('esbuild');

// react-native-web injects <style id="react-native-stylesheet">. That id starts with
// "r", so the design-sync render-check's `[id^="r"]` selector grabs the (empty) style
// element as the mount root and false-flags every non-portal card as "root empty".
// Rename it to a non-"r" id — purely cosmetic for RNW, functionally identical.
const renameRnwSheet = {
  name: 'rename-rnw-sheet',
  setup(build) {
    build.onLoad({ filter: /react-native-web[/\\].*StyleSheet[/\\]dom[/\\]index\.js$/ }, async (args) => {
      const src = await readFile(args.path, 'utf8');
      return { contents: src.replace(/'react-native-stylesheet'/g, "'ds-rnw-stylesheet'"), loader: 'js' };
    });
  },
};

await esbuild.build({
  entryPoints: [path.join(repo, '.design-sync/web-entry.ts')],
  bundle: true,
  format: 'esm',
  outfile: path.join(repo, '.design-sync/.cache/web-dist/index.js'),
  alias: { 'react-native': 'react-native-web' },
  external: ['react', 'react-dom'],
  tsconfig: path.join(repo, 'tsconfig.json'),
  absWorkingDir: repo,
  nodePaths: [path.join(repo, 'node_modules')],
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' },
  plugins: [renameRnwSheet],
  logLevel: 'info',
});
console.log('web dist built');
