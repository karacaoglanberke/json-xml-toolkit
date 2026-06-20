const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    target: 'node18',
    outfile: 'dist/extension.js',
    // Bundle ONLY our own source. All npm dependencies stay external and are
    // shipped inside the .vsix as node_modules, so VS Code's own loader runs
    // each package exactly as published. This avoids the whole class of
    // bundler-vs-dynamic-require() breakage (e.g. jsonc-parser's UMD build).
    packages: 'external',
    external: ['vscode'],
    logLevel: 'info'
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
