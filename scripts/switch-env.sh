#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# SLIDER PVP - ENVIRONMENT SWITCHER
# ═══════════════════════════════════════════════════════════════════════════
#
# 🎯 PURPOSE:
# Quickly switch between Solana environments (devnet, mainnet, localnet)
# Updates Solana CLI configuration and Anchor.toml
#
# 🚀 USAGE:
# ./scripts/switch-env.sh <environment>
#
# EXAMPLES:
# ./scripts/switch-env.sh devnet
# ./scripts/switch-env.sh mainnet
#
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

ENVIRONMENT=${1:-devnet}
CONFIG_FILE="config/environments.json"

if [ ! -f "$CONFIG_FILE" ]; then
    print_error "Configuration file not found: $CONFIG_FILE"
fi

# Check if environment exists in config
if ! jq -e ".${ENVIRONMENT}" "$CONFIG_FILE" > /dev/null 2>&1; then
    print_error "Environment '$ENVIRONMENT' not found in $CONFIG_FILE\nAvailable: devnet, mainnet"
fi

# Load configuration
ENV_NAME=$(jq -r ".${ENVIRONMENT}.name" "$CONFIG_FILE")
CLUSTER=$(jq -r ".${ENVIRONMENT}.cluster" "$CONFIG_FILE")
RPC_URL=$(jq -r ".${ENVIRONMENT}.rpcUrl" "$CONFIG_FILE")
WALLET_PATH=$(jq -r ".${ENVIRONMENT}.wallet" "$CONFIG_FILE")
WALLET_PATH="${WALLET_PATH/#\~/$HOME}"

echo ""
print_info "Switching to $ENV_NAME..."
echo ""

# Update Solana CLI configuration
print_info "Configuring Solana CLI..."
solana config set --url "$RPC_URL"

if [ -f "$WALLET_PATH" ]; then
    solana config set --keypair "$WALLET_PATH"
    print_status "Wallet: $WALLET_PATH"
else
    print_info "Wallet not found: $WALLET_PATH (using default)"
fi

# Update Anchor.toml provider section
print_info "Updating Anchor.toml..."

# Capitalize cluster name for Anchor.toml
if [ "$CLUSTER" == "devnet" ]; then
    ANCHOR_CLUSTER="Devnet"
else
    ANCHOR_CLUSTER="Mainnet"
fi

# Update the cluster in Anchor.toml
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/^cluster = .*/cluster = \"$ANCHOR_CLUSTER\"/" Anchor.toml
else
    # Linux
    sed -i "s/^cluster = .*/cluster = \"$ANCHOR_CLUSTER\"/" Anchor.toml
fi

print_status "Anchor.toml updated"

# Display current configuration
echo ""
print_status "Environment switched to $ENV_NAME"
echo ""
print_info "Current configuration:"
echo "  • Environment: $ENV_NAME"
echo "  • Cluster: $CLUSTER"
echo "  • RPC URL: $RPC_URL"
echo "  • Wallet: $(solana address 2>/dev/null || echo 'default')"
echo ""

# Show balance if connected
if command -v solana &> /dev/null; then
    BALANCE=$(solana balance 2>/dev/null || echo "N/A")
    echo "  • Balance: $BALANCE"
    echo ""
fi

print_info "Ready to deploy!"
echo "  Run: npm run deploy:${ENVIRONMENT}"
echo ""

