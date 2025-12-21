/**
 * Clean Cache Script
 * Removes all build caches, asset caches, and temporary files
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const dirsToRemove = [
  'android/app/build',
  'android/build',
  '.expo',
  'node_modules/.cache',
  // CMake cache directory (fixes bug 255965912)
  'android/app/.cxx',
  'android/.cxx',
  // Metro bundler cache locations
  path.join(os.homedir(), '.metro'),
  path.join(os.homedir(), '.expo'),
  // Android generated assets (will be regenerated)
  'android/app/src/main/res/mipmap-hdpi',
  'android/app/src/main/res/mipmap-mdpi',
  'android/app/src/main/res/mipmap-xhdpi',
  'android/app/src/main/res/mipmap-xxhdpi',
  'android/app/src/main/res/mipmap-xxxhdpi',
  'android/app/src/main/res/drawable-hdpi',
  'android/app/src/main/res/drawable-mdpi',
  'android/app/src/main/res/drawable-xhdpi',
  'android/app/src/main/res/drawable-xxhdpi',
  'android/app/src/main/res/drawable-xxxhdpi',
];

console.log('🧹 Cleaning all caches and generated assets...\n');

// Remove directories
dirsToRemove.forEach((dir) => {
  const fullPath = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    try {
      console.log(`Removing: ${dir}`);
      fs.rmSync(fullPath, { recursive: true, force: true });
    } catch (error) {
      console.log(`⚠️  Could not remove ${dir}: ${error.message}`);
    }
  } else {
    console.log(`Skipping (not found): ${dir}`);
  }
});

// Clear Metro bundler cache
console.log('\n🧹 Clearing Metro bundler cache...');
try {
  // Clear watchman cache if available
  try {
    execSync('watchman watch-del-all', { stdio: 'ignore' });
  } catch (e) {
    // Watchman not installed, that's okay
  }
  
  // Clear Metro cache
  const metroCachePath = path.join(os.tmpdir(), 'metro-*');
  try {
    if (process.platform === 'win32') {
      execSync(`for /d %i in ("${path.join(os.tmpdir(), 'metro-*')}") do @if exist "%i" rmdir /s /q "%i"`, { stdio: 'ignore' });
    } else {
      execSync(`rm -rf ${metroCachePath}`, { stdio: 'ignore' });
    }
  } catch (e) {
    // Ignore errors
  }
  console.log('✅ Metro cache cleared');
} catch (error) {
  console.log('⚠️  Metro cache clear had issues (continuing anyway)');
}

// Clean node_modules codegen directories (can cause CMake issues)
console.log('\n🧹 Cleaning node_modules codegen directories...');
const codegenDirs = [
  'node_modules/@react-native-async-storage/async-storage/android/build/generated/source/codegen',
  'node_modules/react-native-safe-area-context/android/build/generated/source/codegen',
  'node_modules/react-native-screens/android/build/generated/source/codegen',
];

codegenDirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    try {
      console.log(`Removing: ${dir}`);
      fs.rmSync(fullPath, { recursive: true, force: true });
    } catch (error) {
      console.log(`⚠️  Could not remove ${dir}: ${error.message}`);
    }
  }
});

// Clean Gradle cache
console.log('\n🧹 Cleaning Gradle cache...');
try {
  process.chdir('android');
  if (process.platform === 'win32') {
    execSync('gradlew.bat clean', { stdio: 'inherit' });
  } else {
    execSync('./gradlew clean', { stdio: 'inherit' });
  }
  process.chdir('..');
  console.log('✅ Gradle cache cleaned\n');
} catch (error) {
  console.log('⚠️  Gradle clean failed (this is okay if Gradle is not installed globally)\n');
  process.chdir('..');
}

console.log('✅ All caches and generated assets cleaned!');
console.log('📦 Assets will be regenerated on next build...');
console.log('💡 Run: npm run android:release\n');

