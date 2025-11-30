const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.resolve(__dirname, '../dist');
const packageJson = require('../package.json');
const version = packageJson.version;
const zipFileName = `eds-site-inspector-v${version}.zip`;
const zipPath = path.resolve(__dirname, '..', zipFileName);

// distディレクトリが存在するか確認
if (!fs.existsSync(distDir)) {
  console.error('Error: dist/ directory does not exist. Please run "npm run build" first.');
  process.exit(1);
}

// 既存のZIPファイルを削除
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
  console.log(`Removed existing ${zipFileName}`);
}

// ZIPファイルを作成
try {
  process.chdir(distDir);
  execSync(`zip -r "${zipPath}" . -x "*.DS_Store" "*.map"`, {
    stdio: 'inherit',
  });
  console.log(`\n✅ Package created successfully: ${zipFileName}`);
  console.log(`   Location: ${zipPath}`);
  console.log(`\n📦 Ready for Chrome Web Store upload!`);
} catch (error) {
  console.error('Error creating ZIP file:', error.message);
  process.exit(1);
}

