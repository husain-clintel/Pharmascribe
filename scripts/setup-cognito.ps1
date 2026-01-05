# PharmaScribe - AWS Cognito Setup Script (PowerShell)
# This script creates a Cognito User Pool, App Client, and admin user

$ErrorActionPreference = "Stop"

# Configuration
$POOL_NAME = "pharmascribe-users"
$CLIENT_NAME = "pharmascribe-web"
$ADMIN_EMAIL = "admin@pharmascribe.local"
$ADMIN_PASSWORD = "welcome"
$REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "PharmaScribe - Cognito Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Region: $REGION"
Write-Host ""

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
} catch {
    Write-Host "ERROR: AWS CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
}

# Check if AWS credentials are configured
try {
    aws sts get-caller-identity | Out-Null
} catch {
    Write-Host "ERROR: AWS credentials not configured. Run 'aws configure' first." -ForegroundColor Red
    exit 1
}

Write-Host "Step 1/5: Creating User Pool..." -ForegroundColor Yellow

$PasswordPolicy = @{
    PasswordPolicy = @{
        MinimumLength = 8
        RequireUppercase = $false
        RequireLowercase = $false
        RequireNumbers = $true
        RequireSymbols = $false
    }
} | ConvertTo-Json -Compress

$Schema = @(
    @{ Name = "email"; Required = $true; Mutable = $true }
    @{ Name = "name"; Required = $false; Mutable = $true }
) | ConvertTo-Json -Compress

$RecoverySetting = @{
    RecoveryMechanisms = @(
        @{ Priority = 1; Name = "verified_email" }
    )
} | ConvertTo-Json -Compress

$UserPoolResult = aws cognito-idp create-user-pool `
    --pool-name $POOL_NAME `
    --region $REGION `
    --auto-verified-attributes email `
    --username-attributes email `
    --policies $PasswordPolicy `
    --schema $Schema `
    --account-recovery-setting $RecoverySetting `
    --output json | ConvertFrom-Json

$USER_POOL_ID = $UserPoolResult.UserPool.Id

if (-not $USER_POOL_ID) {
    Write-Host "ERROR: Failed to create User Pool" -ForegroundColor Red
    exit 1
}

Write-Host "   User Pool ID: $USER_POOL_ID" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2/5: Creating App Client..." -ForegroundColor Yellow

$ClientResult = aws cognito-idp create-user-pool-client `
    --user-pool-id $USER_POOL_ID `
    --region $REGION `
    --client-name $CLIENT_NAME `
    --no-generate-secret `
    --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH `
    --supported-identity-providers COGNITO `
    --prevent-user-existence-errors ENABLED `
    --output json | ConvertFrom-Json

$CLIENT_ID = $ClientResult.UserPoolClient.ClientId

if (-not $CLIENT_ID) {
    Write-Host "ERROR: Failed to create App Client" -ForegroundColor Red
    exit 1
}

Write-Host "   Client ID: $CLIENT_ID" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3/5: Creating admin user..." -ForegroundColor Yellow

aws cognito-idp admin-create-user `
    --user-pool-id $USER_POOL_ID `
    --region $REGION `
    --username $ADMIN_EMAIL `
    --temporary-password "TempPass1!" `
    --user-attributes Name=email,Value=$ADMIN_EMAIL Name=email_verified,Value=true `
    --message-action SUPPRESS `
    --output json | Out-Null

Write-Host "   Admin user created: $ADMIN_EMAIL" -ForegroundColor Green

Write-Host ""
Write-Host "Step 4/5: Setting permanent password..." -ForegroundColor Yellow

aws cognito-idp admin-set-user-password `
    --user-pool-id $USER_POOL_ID `
    --region $REGION `
    --username $ADMIN_EMAIL `
    --password $ADMIN_PASSWORD `
    --permanent

Write-Host "   Password set to: $ADMIN_PASSWORD" -ForegroundColor Green

Write-Host ""
Write-Host "Step 5/5: Writing environment variables..." -ForegroundColor Yellow

$EnvFile = ".env.local"
$EnvContent = @()

# Read existing content (excluding Cognito vars)
if (Test-Path $EnvFile) {
    $EnvContent = Get-Content $EnvFile | Where-Object { $_ -notmatch "NEXT_PUBLIC_COGNITO" -and $_ -notmatch "# AWS Cognito" }
}

# Add Cognito vars
$EnvContent += ""
$EnvContent += "# AWS Cognito (added by setup script)"
$EnvContent += "NEXT_PUBLIC_COGNITO_USER_POOL_ID=$USER_POOL_ID"
$EnvContent += "NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID"

$EnvContent | Set-Content $EnvFile

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "User Pool ID: " -NoNewline; Write-Host $USER_POOL_ID -ForegroundColor Yellow
Write-Host "Client ID:    " -NoNewline; Write-Host $CLIENT_ID -ForegroundColor Yellow
Write-Host ""
Write-Host "Admin Login:" -ForegroundColor Cyan
Write-Host "  Email:    $ADMIN_EMAIL"
Write-Host "  Password: $ADMIN_PASSWORD"
Write-Host ""
Write-Host "Environment variables added to .env.local" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run: " -NoNewline; Write-Host "npm run dev" -ForegroundColor Yellow
Write-Host ""
