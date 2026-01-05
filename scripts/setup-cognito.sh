#!/bin/bash

# PharmaScribe - AWS Cognito Setup Script
# This script creates a Cognito User Pool, App Client, and admin user

set -e

# Configuration
POOL_NAME="pharmascribe-users"
CLIENT_NAME="pharmascribe-web"
ADMIN_EMAIL="admin@pharmascribe.local"
ADMIN_PASSWORD="welcome"
REGION="${AWS_REGION:-us-east-1}"

echo "=========================================="
echo "PharmaScribe - Cognito Setup"
echo "=========================================="
echo ""
echo "Region: $REGION"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI is not installed. Please install it first."
    echo "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "ERROR: AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

echo "Step 1/5: Creating User Pool..."
USER_POOL_RESULT=$(aws cognito-idp create-user-pool \
    --pool-name "$POOL_NAME" \
    --region "$REGION" \
    --auto-verified-attributes email \
    --username-attributes email \
    --policies '{
        "PasswordPolicy": {
            "MinimumLength": 8,
            "RequireUppercase": false,
            "RequireLowercase": false,
            "RequireNumbers": true,
            "RequireSymbols": false
        }
    }' \
    --schema '[
        {"Name": "email", "Required": true, "Mutable": true},
        {"Name": "name", "Required": false, "Mutable": true}
    ]' \
    --account-recovery-setting '{
        "RecoveryMechanisms": [
            {"Priority": 1, "Name": "verified_email"}
        ]
    }' \
    --output json)

USER_POOL_ID=$(echo "$USER_POOL_RESULT" | grep -o '"Id": "[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_POOL_ID" ]; then
    echo "ERROR: Failed to create User Pool"
    exit 1
fi

echo "   User Pool ID: $USER_POOL_ID"

echo ""
echo "Step 2/5: Creating App Client..."
CLIENT_RESULT=$(aws cognito-idp create-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --region "$REGION" \
    --client-name "$CLIENT_NAME" \
    --no-generate-secret \
    --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --supported-identity-providers COGNITO \
    --prevent-user-existence-errors ENABLED \
    --output json)

CLIENT_ID=$(echo "$CLIENT_RESULT" | grep -o '"ClientId": "[^"]*"' | cut -d'"' -f4)

if [ -z "$CLIENT_ID" ]; then
    echo "ERROR: Failed to create App Client"
    exit 1
fi

echo "   Client ID: $CLIENT_ID"

echo ""
echo "Step 3/5: Creating admin user..."
aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --region "$REGION" \
    --username "$ADMIN_EMAIL" \
    --temporary-password "TempPass1!" \
    --user-attributes Name=email,Value="$ADMIN_EMAIL" Name=email_verified,Value=true \
    --message-action SUPPRESS \
    --output json > /dev/null

echo "   Admin user created: $ADMIN_EMAIL"

echo ""
echo "Step 4/5: Setting permanent password..."
aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --region "$REGION" \
    --username "$ADMIN_EMAIL" \
    --password "$ADMIN_PASSWORD" \
    --permanent

echo "   Password set to: $ADMIN_PASSWORD"

echo ""
echo "Step 5/5: Writing environment variables..."

# Create or update .env.local
ENV_FILE=".env.local"
if [ -f "$ENV_FILE" ]; then
    # Remove existing Cognito vars if present
    grep -v "NEXT_PUBLIC_COGNITO" "$ENV_FILE" > "$ENV_FILE.tmp" || true
    mv "$ENV_FILE.tmp" "$ENV_FILE"
fi

echo "" >> "$ENV_FILE"
echo "# AWS Cognito (added by setup script)" >> "$ENV_FILE"
echo "NEXT_PUBLIC_COGNITO_USER_POOL_ID=$USER_POOL_ID" >> "$ENV_FILE"
echo "NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID" >> "$ENV_FILE"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "User Pool ID: $USER_POOL_ID"
echo "Client ID:    $CLIENT_ID"
echo ""
echo "Admin Login:"
echo "  Email:    $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo ""
echo "Environment variables added to .env.local"
echo ""
echo "You can now run: npm run dev"
echo ""
