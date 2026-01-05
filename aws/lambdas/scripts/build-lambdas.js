const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LAMBDAS = [
  'agent-orchestrator',
  'memory-manager',
  'section-writer',
  'table-generator',
  'qc-agent'
];

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Clean dist directory
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// Build each Lambda
for (const lambda of LAMBDAS) {
  console.log(`Building ${lambda}...`);

  const outDir = path.join(DIST_DIR, lambda);
  fs.mkdirSync(outDir, { recursive: true });

  const entryPoint = path.join(ROOT_DIR, lambda, 'index.ts');
  const outFile = path.join(outDir, 'index.js');

  try {
    execSync(`npx esbuild ${entryPoint} --bundle --platform=node --target=node20 --outfile=${outFile} --external:@aws-sdk/*`, {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    });

    console.log(`✓ Built ${lambda}`);
  } catch (error) {
    console.error(`✗ Failed to build ${lambda}:`, error.message);
    process.exit(1);
  }
}

console.log('\nAll Lambdas built successfully!');
