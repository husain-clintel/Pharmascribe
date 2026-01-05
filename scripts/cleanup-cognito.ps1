# PharmaScribe - AWS Cognito Cleanup Script (PowerShell)
# This script deletes the Cognito User Pool created by setup-cognito.ps1

$ErrorActionPreference = "Stop"

$REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "PharmaScribe - Cognito Cleanup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Read User Pool ID from .env.local
$EnvFile = ".env.local"
if (-not (Test-Path $EnvFile)) {
    Write-Host "ERROR: .env.local not found" -ForegroundColor Red
    exit 1
}

$USER_POOL_ID = (Get-Content $EnvFile | Where-Object { $_ -match "NEXT_PUBLIC_COGNITO_USER_POOL_ID" } | ForEach-Object { $_.Split("=")[1] })

if (-not $USER_POOL_ID) {
    Write-Host "ERROR: User Pool ID not found in .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "User Pool ID: $USER_POOL_ID"
Write-Host ""

$confirm = Read-Host "Are you sure you want to delete this User Pool? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Deleting User Pool..." -ForegroundColor Yellow

aws cognito-idp delete-user-pool `
    --user-pool-id $USER_POOL_ID `
    --region $REGION

Write-Host "User Pool deleted." -ForegroundColor Green
Write-Host ""
Write-Host "Don't forget to remove the Cognito variables from .env.local" -ForegroundColor Yellow
