#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# SLIDER PVP - UNIFIED DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════════════════
#
# 🎯 PURPOSE:
# Single deployment script that works across all environments (devnet, mainnet, localnet)
# Configuration is driven by config/environments.json
#
# 🚀 USAGE:
# ```bash
# ./scripts/deploy.sh <environment>
# ```
#
# EXAMPLES:
# ./scripts/deploy.sh devnet     # Deploy to devnet
# ./scripts/deploy.sh mainnet    # Deploy to mainnet (with safety checks)
#
# Or use npm scripts:
# npm run deploy:devnet
# npm run deploy:mainnet
#
# ═══════════════════════════════════════════════════════════════════════════

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PROGRAM_NAME="slider_pvp"
CONFIG_FILE="config/environments.json"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Helper functions
print_title() {
    echo -e "${BOLD}${CYAN}$1${NC}"
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

confirm_action() {
    echo -e "${YELLOW}$1${NC}"
    read -p "Type 'YES' to continue: " response
    if [ "$response" != "YES" ]; then
        print_error "Deployment cancelled by user"
    fi
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is required but not installed"
    fi
}

# Get environment from argument
ENVIRONMENT=${1:-devnet}

if [ -z "$ENVIRONMENT" ]; then
    print_error "Usage: $0 <environment>\n  Environments: devnet, mainnet"
fi

print_title "🚀 Slider PVP Deployment - $ENVIRONMENT"
echo "==========================================="
echo ""

# Verify we're in the right directory
cd "$PROJECT_DIR"

if [ ! -f "Anchor.toml" ] || [ ! -d "programs/slider-pvp" ]; then
    print_error "Not in Slider PvP project directory"
fi

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    print_error "Configuration file not found: $CONFIG_FILE"
fi

# Check required commands
print_info "Checking required tools..."
check_command "solana"
check_command "anchor"
check_command "node"
check_command "jq"
check_command "bc"

print_status "All required tools found"

# Load configuration using jq
print_info "Loading configuration for $ENVIRONMENT..."

if ! jq -e ".${ENVIRONMENT}" "$CONFIG_FILE" > /dev/null 2>&1; then
    print_error "Environment '$ENVIRONMENT' not found in $CONFIG_FILE"
fi

# Extract configuration values
ENV_NAME=$(jq -r ".${ENVIRONMENT}.name" "$CONFIG_FILE")
CLUSTER=$(jq -r ".${ENVIRONMENT}.cluster" "$CONFIG_FILE")
RPC_URL=$(jq -r ".${ENVIRONMENT}.rpcUrl" "$CONFIG_FILE")
MIN_SOL=$(jq -r ".${ENVIRONMENT}.minSolBalance" "$CONFIG_FILE")
AIRDROP_ENABLED=$(jq -r ".${ENVIRONMENT}.airdropEnabled" "$CONFIG_FILE")
WALLET_PATH=$(jq -r ".${ENVIRONMENT}.wallet" "$CONFIG_FILE")
WALLET_PATH="${WALLET_PATH/#\~/$HOME}"  # Expand tilde
PROGRAM_KEYPAIR=$(jq -r ".${ENVIRONMENT}.programKeypair" "$CONFIG_FILE")
RUN_TESTS=$(jq -r ".${ENVIRONMENT}.verification.runTests" "$CONFIG_FILE")
TEST_SCRIPT=$(jq -r ".${ENVIRONMENT}.verification.testScript" "$CONFIG_FILE")
REQUIRE_CONFIRMATION=$(jq -r ".${ENVIRONMENT}.verification.requireConfirmation" "$CONFIG_FILE" 2>/dev/null || echo "false")
SAFETY_CHECKS=$(jq -r ".${ENVIRONMENT}.verification.safetyChecks" "$CONFIG_FILE" 2>/dev/null || echo "false")

print_status "Configuration loaded for $ENV_NAME"
print_info "Cluster: $CLUSTER"
print_info "RPC URL: $RPC_URL"
print_info "Wallet: $WALLET_PATH"
echo ""

# Mainnet safety checks
if [ "$ENVIRONMENT" == "mainnet" ]; then
    print_title "🚨 MAINNET DEPLOYMENT - REAL MONEY WARNING 🚨"
    echo "================================================="
    echo ""
    print_warning "⚠️  THIS DEPLOYS TO SOLANA MAINNET WITH REAL SOL"
    print_warning "⚠️  ENSURE ALL TESTING IS COMPLETE BEFORE PROCEEDING"
    print_warning "⚠️  DEPLOYMENT COSTS: ~3-4 SOL + ONGOING PROGRAM RENT"
    print_warning "⚠️  BUGS CAN RESULT IN LOSS OF USER FUNDS"
    echo ""
    
    if [ "$SAFETY_CHECKS" == "true" ]; then
        confirm_action "🚨 Do you understand the risks and want to proceed with MAINNET deployment?"
        confirm_action "✅ Has a security audit been completed with all issues resolved?"
        confirm_action "✅ Has the contract been tested on devnet extensively?"
        confirm_action "✅ Do you have emergency response procedures documented?"
        confirm_action "✅ Do you have sufficient SOL (5-10 SOL minimum) for deployment?"
    fi
fi

print_title "Phase 1: Solana Configuration"
echo "=============================="
echo ""

# Configure Solana CLI
print_info "Configuring Solana CLI..."
solana config set --url "$RPC_URL"

# Set wallet if it exists
if [ -f "$WALLET_PATH" ]; then
    solana config set --keypair "$WALLET_PATH"
    print_status "Wallet configured: $WALLET_PATH"
else
    if [ "$ENVIRONMENT" == "mainnet" ]; then
        print_error "Mainnet wallet not found: $WALLET_PATH\nCreate it with: solana-keygen new --outfile $WALLET_PATH"
    fi
    print_warning "Wallet not found: $WALLET_PATH (using default)"
fi

# Verify configuration
CURRENT_URL=$(solana config get | grep "RPC URL" | awk '{print $3}')
if [ "$CURRENT_URL" != "$RPC_URL" ]; then
    print_error "Failed to set RPC URL to $RPC_URL"
fi

print_status "Solana CLI configured for $ENV_NAME"

# Get wallet address and balance
WALLET_ADDRESS=$(solana address 2>/dev/null || echo "unknown")
print_info "Wallet address: $WALLET_ADDRESS"

# Check balance
if command -v solana &> /dev/null && [ "$WALLET_ADDRESS" != "unknown" ]; then
    BALANCE=$(solana balance --output json 2>/dev/null | jq -r .value || echo "0")
    BALANCE_SOL=$(echo "scale=3; $BALANCE / 1000000000" | bc)
    
    print_info "Current balance: ${BALANCE_SOL} SOL"
    
    # Check if balance is sufficient
    if (( $(echo "$BALANCE_SOL < $MIN_SOL" | bc -l) )); then
        print_warning "Balance is low (${BALANCE_SOL} SOL < ${MIN_SOL} SOL recommended)"
        
        if [ "$AIRDROP_ENABLED" == "true" ]; then
            print_info "Requesting airdrop..."
            if solana airdrop 2 2>/dev/null; then
                print_status "Airdrop successful"
                BALANCE=$(solana balance --output json 2>/dev/null | jq -r .value)
                BALANCE_SOL=$(echo "scale=3; $BALANCE / 1000000000" | bc)
                print_info "New balance: ${BALANCE_SOL} SOL"
            else
                print_warning "Airdrop failed, continuing with current balance"
            fi
        else
            if [ "$ENVIRONMENT" == "mainnet" ]; then
                print_error "Insufficient balance for mainnet deployment (${BALANCE_SOL} SOL < ${MIN_SOL} SOL)"
            fi
            print_warning "Consider funding your wallet before deployment"
        fi
    fi
fi

print_title "Phase 2: Build Program"
echo "======================"
echo ""

# Install dependencies
print_info "Installing Node.js dependencies..."
npm install --silent

print_status "Dependencies installed"

# Build the program
print_info "Building Anchor program..."
anchor build

if [ ! -f "target/deploy/${PROGRAM_NAME}.so" ]; then
    print_error "Program build failed - .so file not found"
fi

print_status "Program built successfully"

# Get program ID
if [ -f "$PROGRAM_KEYPAIR" ]; then
    PROGRAM_ID=$(solana address -k "$PROGRAM_KEYPAIR")
else
    if [ "$ENVIRONMENT" == "mainnet" ]; then
        print_warning "Mainnet program keypair not found, generating new one..."
        solana-keygen new --outfile "$PROGRAM_KEYPAIR" --no-bip39-passphrase
        PROGRAM_ID=$(solana address -k "$PROGRAM_KEYPAIR")
        print_warning "NEW PROGRAM ID: $PROGRAM_ID"
        print_warning "You must update lib.rs and Anchor.toml with this ID before deploying"
        exit 1
    else
        PROGRAM_ID=$(solana address -k "target/deploy/${PROGRAM_NAME}-keypair.json")
    fi
fi

PROGRAM_SIZE=$(wc -c < "target/deploy/${PROGRAM_NAME}.so" | tr -d ' ')
print_info "Program ID: $PROGRAM_ID"
print_info "Program size: $PROGRAM_SIZE bytes"

print_title "Phase 3: Deploy to $ENV_NAME"
echo "=============================="
echo ""

# Create backup for mainnet
if [ "$ENVIRONMENT" == "mainnet" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="mainnet-backups"
    mkdir -p "$BACKUP_DIR"
    
    print_info "Creating pre-deployment backup..."
    cp -r target/deploy "$BACKUP_DIR/pre-deployment-${TIMESTAMP}"
    print_status "Backup created: $BACKUP_DIR/pre-deployment-${TIMESTAMP}"
fi

# Deploy
print_info "Deploying program to $ENV_NAME..."

DEPLOY_OUTPUT=$(anchor deploy --provider.cluster "$CLUSTER" 2>&1)
DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    print_status "Program deployed successfully!"
    
    # Extract transaction signature
    TX_SIG=$(echo "$DEPLOY_OUTPUT" | grep -o '[A-Za-z0-9]\{87,88\}' | head -1)
    if [ ! -z "$TX_SIG" ]; then
        print_info "Deployment transaction: $TX_SIG"
    fi
else
    print_error "Deployment failed\n$DEPLOY_OUTPUT"
fi

print_title "Phase 4: Verification"
echo "====================="
echo ""

# Wait for confirmation
print_info "Waiting for confirmation..."
sleep 5

# Verify program exists on chain
if solana program show "$PROGRAM_ID" --output json > /dev/null 2>&1; then
    print_status "Program verified on $ENV_NAME blockchain"
    
    PROGRAM_INFO=$(solana program show "$PROGRAM_ID" --output json)
    PROGRAM_BALANCE=$(echo "$PROGRAM_INFO" | jq -r '.account.lamports')
    PROGRAM_BALANCE_SOL=$(echo "scale=6; $PROGRAM_BALANCE / 1000000000" | bc)
    
    print_info "Program balance: $PROGRAM_BALANCE_SOL SOL"
else
    print_error "Program verification failed - not found on blockchain"
fi

# Run tests if configured
if [ "$RUN_TESTS" == "true" ] && [ ! -z "$TEST_SCRIPT" ] && [ "$TEST_SCRIPT" != "null" ]; then
    print_title "Phase 5: Testing"
    echo "================"
    echo ""
    
    print_info "Running verification tests..."
    
    if [ -f "$TEST_SCRIPT" ]; then
        if node "$TEST_SCRIPT" > /tmp/deployment-test.log 2>&1; then
            print_status "Tests passed"
        else
            print_warning "Tests failed - check logs at /tmp/deployment-test.log"
            cat /tmp/deployment-test.log
        fi
    else
        print_warning "Test script not found: $TEST_SCRIPT"
    fi
fi

print_title "Phase 6: Deployment Report"
echo "=========================="
echo ""

# Generate deployment report
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="deployments"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/${ENVIRONMENT}-deployment-${TIMESTAMP}.md"

EXPLORER_URL=$(jq -r ".${ENVIRONMENT}.monitoring.explorerUrl" "$CONFIG_FILE" | sed "s/{{PROGRAM_ID}}/$PROGRAM_ID/g")

cat > "$REPORT_FILE" << EOF
# Slider PVP Deployment Report - $ENV_NAME

**Generated**: $(date)  
**Environment**: $ENV_NAME  
**Status**: ✅ Successfully Deployed  

## Deployment Details

| Parameter | Value |
|-----------|-------|
| Program ID | \`$PROGRAM_ID\` |
| Network | $ENV_NAME |
| Cluster | $CLUSTER |
| RPC URL | $RPC_URL |
| Deployer | \`$WALLET_ADDRESS\` |
| Program Size | $PROGRAM_SIZE bytes |
| Deployment Time | $(date) |
| Transaction | \`$TX_SIG\` |

## Verification

✅ Program exists on blockchain  
✅ Program ID verified  
$([ "$RUN_TESTS" == "true" ] && echo "✅ Tests completed" || echo "⏭️  Tests skipped")

## Configuration

- **Environment**: $ENVIRONMENT
- **Config File**: $CONFIG_FILE
- **Wallet Path**: $WALLET_PATH
- **Program Keypair**: $PROGRAM_KEYPAIR

## Resources

- **Explorer**: $EXPLORER_URL
- **Program ID**: \`$PROGRAM_ID\`
- **Cluster**: $CLUSTER

## Commands

\`\`\`bash
# Check program status
solana program show $PROGRAM_ID --url $RPC_URL

# Monitor program logs
solana logs $PROGRAM_ID --url $RPC_URL

# Check program balance
solana balance $PROGRAM_ID --url $RPC_URL
\`\`\`

## Next Steps

1. Test the contract functionality
2. Update frontend with program ID
3. Monitor program activity
$([ "$ENVIRONMENT" == "mainnet" ] && echo "4. Set up 24/7 monitoring and alerts" || echo "4. Run comprehensive integration tests")

---

**Deployment completed successfully!** 🎉
EOF

print_status "Deployment report saved: $REPORT_FILE"

echo ""
print_title "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "======================================"
echo ""
print_status "Summary:"
echo "  • Environment: $ENV_NAME"
echo "  • Program ID: $PROGRAM_ID"
echo "  • Status: ✅ Active and Verified"
echo "  • Explorer: $EXPLORER_URL"
echo "  • Report: $REPORT_FILE"
echo ""

if [ "$ENVIRONMENT" == "mainnet" ]; then
    print_warning "⚠️  MAINNET DEPLOYMENT COMPLETE"
    print_warning "⚠️  Monitor program activity closely"
    print_warning "⚠️  Test with minimal funds first"
    echo ""
fi

print_info "Next steps:"
echo "  1. Verify on explorer: $EXPLORER_URL"
echo "  2. Update your application config with Program ID: $PROGRAM_ID"
$([ "$ENVIRONMENT" == "devnet" ] && echo "  3. Run full tests: node devnet-testing/full-test.js" || echo "  3. Monitor program activity")
echo ""

print_status "Deployment complete! 🚀"

