const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

const LAMBDAS = [
  'agent-orchestrator',
  'memory-manager',
  'section-writer',
  'table-generator',
  'qc-agent'
];

const REGION = 'us-east-1';
const ROLE_ARN = 'arn:aws:iam::660309491335:role/pharmascribe-lambda-role';
const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Helper to run AWS CLI
function awsCli(command) {
  const fullCommand = `powershell.exe -Command "& 'C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe' ${command}"`;
  try {
    return execSync(fullCommand, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    if (error.stdout) return error.stdout;
    throw error;
  }
}

// Create zip file for Lambda
function createZip(lambdaName) {
  const sourceDir = path.join(DIST_DIR, lambdaName);
  const zipPath = path.join(DIST_DIR, `${lambdaName}.zip`);

  // Use PowerShell to create zip
  execSync(`powershell.exe -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${zipPath}' -Force"`, {
    encoding: 'utf8'
  });

  return zipPath;
}

// Check if Lambda exists
function lambdaExists(functionName) {
  try {
    awsCli(`lambda get-function --function-name ${functionName} --region ${REGION}`);
    return true;
  } catch {
    return false;
  }
}

// Create or update Lambda
async function deployLambda(lambdaName) {
  const functionName = `pharmascribe-${lambdaName}`;
  const zipPath = createZip(lambdaName);

  console.log(`Deploying ${functionName}...`);

  if (lambdaExists(functionName)) {
    // Update existing function
    console.log(`  Updating existing function...`);
    awsCli(`lambda update-function-code --function-name ${functionName} --zip-file fileb://${zipPath} --region ${REGION}`);
  } else {
    // Create new function
    console.log(`  Creating new function...`);
    awsCli(`lambda create-function --function-name ${functionName} --runtime nodejs20.x --role ${ROLE_ARN} --handler index.handler --zip-file fileb://${zipPath} --timeout 120 --memory-size 512 --region ${REGION} --environment "Variables={DYNAMODB_MEMORY_TABLE=pharmascribe-agent-memory,AWS_NODEJS_CONNECTION_REUSE_ENABLED=1}"`);
  }

  console.log(`✓ Deployed ${functionName}`);
}

// Main
async function main() {
  console.log('Deploying Lambda functions...\n');

  // Wait for IAM role propagation
  console.log('Waiting for IAM role propagation...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  for (const lambda of LAMBDAS) {
    try {
      await deployLambda(lambda);
    } catch (error) {
      console.error(`✗ Failed to deploy ${lambda}:`, error.message);
    }
  }

  console.log('\nDeployment complete!');
}

main().catch(console.error);
