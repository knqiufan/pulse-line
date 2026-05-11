const { spawnSync } = require('child_process');
const { readdirSync } = require('fs');
const { join } = require('path');

const testDir = join(__dirname, '..', 'dist', 'test');
const files = readdirSync(testDir)
  .filter(f => f.endsWith('.test.js'))
  .map(f => join(testDir, f));

if (files.length === 0) {
  console.error('No test files found in dist/test/');
  process.exit(1);
}

const result = spawnSync('node', ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
