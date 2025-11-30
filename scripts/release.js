const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');
const releaseDir = path.resolve(__dirname, '../release');

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: ${srcDir} does not exist. Please run "npm run build" first.`);
    process.exit(1);
  }
  fs.readdirSync(srcDir, { withFileTypes: true }).forEach((entry) => {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      // .mapファイルは除外
      if (!entry.name.endsWith('.map')) {
        copyFile(srcPath, destPath);
      }
    }
  });
}

// releaseディレクトリをクリーンアップ
if (fs.existsSync(releaseDir)) {
  fs.rmSync(releaseDir, { recursive: true, force: true });
}

// distディレクトリの内容をreleaseにコピー
copyDir(distDir, releaseDir);

console.log('✅ Release folder created successfully: release/');
console.log('   Ready for GitHub commit and push!');

