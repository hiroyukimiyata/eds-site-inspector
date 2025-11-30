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
    entryPoints: [
      path.resolve(__dirname, '../src/background.js'),
      path.resolve(__dirname, '../src/content.js'),
      path.resolve(__dirname, '../src/devtools.js'),
      path.resolve(__dirname, '../src/panel.js'),
      path.resolve(__dirname, '../src/popup.js'),
    ],
    bundle: true,
    outdir,
    minify: false,
    sourcemap: true,
    target: 'chrome118',
    format: 'iife',
    platform: 'browser',
    external: [],
  });

  await esbuild.build({
    entryPoints: [
      path.resolve(__dirname, '../src/styles/content.css'),
      path.resolve(__dirname, '../src/styles/panel.css'),
      path.resolve(__dirname, '../src/styles/popup.css'),
    ],
    bundle: true,
    outdir,
    minify: false,
    sourcemap: false,
    loader: { '.css': 'css' },
  });

  copyFile(path.resolve(__dirname, '../src/manifest.json'), path.join(outdir, 'manifest.json'));
  copyFile(path.resolve(__dirname, '../src/devtools.html'), path.join(outdir, 'devtools.html'));
  copyFile(path.resolve(__dirname, '../src/panel.html'), path.join(outdir, 'panel.html'));
  copyFile(path.resolve(__dirname, '../src/popup.html'), path.join(outdir, 'popup.html'));
  copyDir(path.resolve(__dirname, '../public'), outdir);
  copyDir(path.resolve(__dirname, '../src/panel/data'), path.join(outdir, 'panel/data'));
  copyDir(path.resolve(__dirname, '../src/icons'), path.join(outdir, 'icons'));

  console.log('Build complete. Load the dist/ directory as an unpacked extension.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
