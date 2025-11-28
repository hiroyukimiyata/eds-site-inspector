const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outdir = path.resolve(__dirname, '../dist');

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.readdirSync(srcDir, { withFileTypes: true }).forEach((entry) => {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  });
}

async function build() {
  fs.rmSync(outdir, { recursive: true, force: true });

  await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/background.js'), path.resolve(__dirname, '../src/content.js')],
    bundle: true,
    outdir,
    minify: false,
    sourcemap: true,
    target: 'chrome118',
    format: 'iife',
  });

  await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/styles/content.css')],
    bundle: true,
    outdir,
    minify: false,
    sourcemap: false,
    loader: { '.css': 'css' },
  });

  copyFile(path.resolve(__dirname, '../src/manifest.json'), path.join(outdir, 'manifest.json'));
  copyDir(path.resolve(__dirname, '../public'), outdir);

  console.log('Build complete. Load the dist/ directory as an unpacked extension.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
