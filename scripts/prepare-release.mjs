#!/usr/bin/env node

/**
 * Release preparation script
 * Automates version bumping, changelog generation, and release preparation
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const RELEASE_TYPES = ['patch', 'minor', 'major'];

function getCurrentVersion() {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

function updateVersion(type) {
  console.log(`🔄 Bumping ${type} version...`);
  execSync(`npm version ${type} --no-git-tag-version`, { stdio: 'inherit' });
  return getCurrentVersion();
}

function generateChangelog(version) {
  const changelog = `# Changelog

## [${version}] - ${new Date().toISOString().split('T')[0]}

### ✨ Added
- 電圧・I/O規格プルダウン選択機能
- スマート連携機能（電圧変更時のI/O規格自動更新）
- バッチ操作機能の大幅強化
- 差動ペア管理機能
- リアルタイム検証機能

### 🔧 Changed
- UI/UXの大幅改善
- パフォーマンス最適化
- プロジェクト構造の整理

### 🐛 Fixed
- ソート機能の初期化エラー修正
- 型安全性の向上
- バリデーション機能の安定性改善

### 📚 Documentation
- README.md全面更新
- コントリビューションガイド追加
- 技術仕様書の更新

---

## Previous Versions

### [0.1.0] - 初期リリース
- 基本的なピン管理機能
- CSV読み込み・出力機能
- 基本的なUI実装
`;

  writeFileSync('CHANGELOG.md', changelog);
  console.log('📝 Changelog generated');
}

function createGitTag(version) {
  console.log(`🏷️ Creating git tag v${version}...`);
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "release: v${version}"`, { stdio: 'inherit' });
  execSync(`git tag v${version}`, { stdio: 'inherit' });
  console.log(`✅ Tag v${version} created`);
}

function runPreReleaseChecks() {
  console.log('🧪 Running pre-release checks...');
  
  try {
    execSync('npm run type-check', { stdio: 'inherit' });
    execSync('npm run test:run', { stdio: 'inherit' });
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ All checks passed');
  } catch (error) {
    console.error('❌ Pre-release checks failed');
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const releaseType = args[0];

  if (!releaseType || !RELEASE_TYPES.includes(releaseType)) {
    console.error('❌ Invalid release type. Use: patch, minor, or major');
    console.log('Usage: npm run release:patch | npm run release:minor | npm run release:major');
    process.exit(1);
  }

  console.log('🚀 Starting release preparation...');
  
  // Pre-release checks
  runPreReleaseChecks();
  
  // Update version
  const newVersion = updateVersion(releaseType);
  console.log(`🎉 Version updated to ${newVersion}`);
  
  // Generate changelog
  generateChangelog(newVersion);
  
  // Create git tag
  createGitTag(newVersion);
  
  console.log('🎉 Release preparation complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Push changes: git push origin master');
  console.log('2. Push tags: git push origin --tags');
  console.log('3. GitHub Actions will automatically create the release');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
