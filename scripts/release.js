const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.resolve(__dirname, '../dist');
const releaseDir = path.resolve(__dirname, '../release');
const zipFileName = 'eds-site-inspector-release.zip';
const zipPath = path.resolve(__dirname, '..', zipFileName);

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

// releaseフォルダの内容をZIP化
if (!fs.existsSync(releaseDir)) {
  console.error(`Error: ${releaseDir} does not exist.`);
  process.exit(1);
}

// 既存のZIPファイルを削除
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
  console.log(`Removed existing ${zipFileName}`);
}

// ZIPファイルを作成
try {
  process.chdir(releaseDir);
  execSync(`zip -r "${zipPath}" . -x "*.DS_Store" "*.map"`, {
    stdio: 'inherit',
  });
  console.log(`\n✅ Release ZIP created successfully: ${zipFileName}`);
  console.log(`   Location: ${zipPath}`);
  console.log(`\n📦 Ready for GitHub Release upload!`);
} catch (error) {
  console.error('Error creating ZIP file:', error.message);
  process.exit(1);
}

