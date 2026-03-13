const fs = require('node:fs');
const path = require('node:path');

const rootDir = __dirname;

const pathsToClean = [
  '.nx/cache',
  'packages/*/dist',
  'packages/*/node_modules/.cache',
  'apps/*/dist',
  'apps/*/node_modules/.cache',
  'packages/playground/static',
  'ios/static',
];

function deleteDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      const stats = fs.statSync(dirPath);
      if (stats.isDirectory()) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`Deleted directory: ${dirPath}`);
      } else {
        fs.unlinkSync(dirPath);
        console.log(`Deleted file: ${dirPath}`);
      }
    }
  } catch (error) {
    console.error(`Error deleting ${dirPath}:`, error.message);
  }
}

function cleanGlob(pattern) {
  try {
    if (pattern.includes('*')) {
      const parts = pattern.split('/');
      let globIndex = -1;

      for (let i = 0; i < parts.length; i++) {
        if (parts[i].includes('*')) {
          globIndex = i;
          break;
        }
      }

      if (globIndex === -1) {
        deleteDirectory(path.join(rootDir, pattern));
        return;
      }

      const baseDir = path.join(rootDir, ...parts.slice(0, globIndex));
      const remainingParts = parts.slice(globIndex + 1);

      if (fs.existsSync(baseDir)) {
        const entries = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subPath = path.join(baseDir, entry.name, ...remainingParts);
            if (remainingParts.length === 0 || fs.existsSync(subPath)) {
              deleteDirectory(subPath);
            }
          }
        }
      }
    } else {
      deleteDirectory(path.join(rootDir, pattern));
    }
  } catch (error) {
    console.error(`Error cleaning ${pattern}:`, error.message);
  }
}

console.log('Starting cleanup...\n');

for (const pattern of pathsToClean) {
  cleanGlob(pattern);
}

console.log('\nCleanup complete!');
