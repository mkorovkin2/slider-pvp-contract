#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# SLIDER PVP - CONTRACT STATUS & MONITORING SCRIPT
# ═══════════════════════════════════════════════════════════════════════════
#
# 🎯 PURPOSE:
# Monitor and report on the current status of your deployed Slider PvP contract
# including program health, wallet balances, and recent activity.
#
# 📋 WHAT THIS DOES:
# • Checks program deployment status on devnet/mainnet
# • Reports current wallet balances
# • Shows program account details
# • Lists recent transactions
# • Monitors contract health
# • Provides troubleshooting information
#
# 🚀 USAGE:
# ```bash
# cd ~/workplace/slider-pvp-contract
# chmod +x scripts/contract-status.sh
# ./scripts/contract-status.sh [devnet|mainnet]
# ```
#
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROGRAM_ID="9EeZ1eFrs8QAop7c6ihE4CiXenjVpGPdmFyv6w3XnmcT"
NETWORK=${1:-devnet}

if [ "$NETWORK" = "mainnet" ]; then
    NETWORK_URL="https://api.mainnet-beta.solana.com"
    EXPLORER_BASE="https://explorer.solana.com"
else
    NETWORK_URL="https://api.devnet.solana.com"
    EXPLORER_BASE="https://explorer.solana.com"
fi

# Helper functions
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${CYAN}$1${NC}"
}

# Function to format SOL amounts
format_sol() {
    echo "scale=6; $1 / 1000000000" | bc -l | sed 's/\.000000$//'
}

# Function to check command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    fi
    return 0
}

echo -e "${CYAN}🔍 Slider PvP Contract Status Report${NC}"
echo "======================================"
echo ""
print_info "Network: $(echo $NETWORK | tr '[:lower:]' '[:upper:]')"
print_info "Program ID: $PROGRAM_ID"
print_info "Generated: $(date)"
echo ""

# Check dependencies
print_header "📋 Environment Check"
echo "-------------------"

if check_command "solana"; then
    print_status "Solana CLI found"
else
    print_error "Solana CLI required but not found"
    exit 1
fi

if check_command "jq"; then
    print_status "jq found"
else
    print_warning "jq not found - JSON output will be limited"
    JQ_AVAILABLE=false
fi

# Configure network
print_info "Setting Solana CLI to $NETWORK..."
solana config set --url $NETWORK_URL > /dev/null

print_header "🏗️  Program Status"
echo "-----------------"

# Check if program exists
if solana program show $PROGRAM_ID --output json > /tmp/program_info.json 2>/dev/null; then
    print_status "Program found on $NETWORK"
    
    if [ "$JQ_AVAILABLE" != "false" ]; then
        PROGRAM_SIZE=$(jq -r '.account.data | length' /tmp/program_info.json 2>/dev/null || echo "unknown")
        PROGRAM_LAMPORTS=$(jq -r '.account.lamports' /tmp/program_info.json 2>/dev/null || echo "0")
        PROGRAM_OWNER=$(jq -r '.account.owner' /tmp/program_info.json 2>/dev/null || echo "unknown")
        
        PROGRAM_SOL=$(format_sol $PROGRAM_LAMPORTS)
        
        echo "  • Size: $PROGRAM_SIZE bytes"
        echo "  • Balance: $PROGRAM_SOL SOL"
        echo "  • Owner: $PROGRAM_OWNER"
    fi
    
    print_info "Explorer: $EXPLORER_BASE/address/$PROGRAM_ID?cluster=$NETWORK"
else
    print_error "Program not found on $NETWORK"
    echo "  This could mean:"
    echo "  • Program not deployed to $NETWORK"
    echo "  • Network connectivity issues"
    echo "  • Program ID incorrect"
    exit 1
fi

print_header "👛 Wallet Balances"
echo "-----------------"

# Check wallet balances if wallet files exist
check_wallet_balance() {
    local wallet_name="$1"
    local wallet_file="$2"
    local wallet_desc="$3"
    
    if [ -f "$wallet_file" ]; then
        local address=$(solana address -k "$wallet_file" 2>/dev/null || echo "error")
        if [ "$address" != "error" ]; then
            local balance=$(solana balance "$address" --output json 2>/dev/null | jq -r '.value' 2>/dev/null || echo "0")
            local balance_sol=$(format_sol $balance)
            echo "  • $wallet_name: $balance_sol SOL"
            echo "    Address: $address"
            echo "    Role: $wallet_desc"
        else
            print_warning "$wallet_name: Could not read wallet file"
        fi
    else
        print_info "$wallet_name: Wallet file not found ($wallet_file)"
    fi
    echo ""
}

# Check main wallet (standard Solana CLI location)
MAIN_WALLET="$HOME/.config/solana/id.json"
check_wallet_balance "Main Wallet" "$MAIN_WALLET" "Arbiter & Fee Recipient"

# Check test players
check_wallet_balance "Test Player 1" "./devnet-testing/test-player1.json" "Test participant"
check_wallet_balance "Test Player 2" "./devnet-testing/test-player2.json" "Test participant"

print_header "🔧 Contract Testing"
echo "------------------"

# Try to run basic contract test
if [ -f "./devnet-testing/simple-test.js" ]; then
    print_info "Running basic contract connectivity test..."
    
    if timeout 30 node ./devnet-testing/simple-test.js > /tmp/test_output.log 2>&1; then
        print_status "Basic contract test passed"
        echo "  • Program accessible"
        echo "  • PDA derivation working"
        echo "  • Wallet loading successful"
    else
        print_warning "Basic contract test failed"
        echo "  • Check network connectivity"
        echo "  • Verify program deployment"
        echo "  • See test output:"
        tail -5 /tmp/test_output.log | sed 's/^/    /'
    fi
else
    print_info "Contract test script not found"
    echo "  • Create devnet-testing/simple-test.js for automated testing"
fi

print_header "📊 Recent Activity"
echo "-----------------"

# Try to get recent transactions (this requires additional setup)
print_info "Program Explorer Links:"
echo "  • Program Account: $EXPLORER_BASE/address/$PROGRAM_ID?cluster=$NETWORK"
if [ -f "$MAIN_WALLET" ]; then
    MAIN_ADDRESS=$(solana address -k "$MAIN_WALLET" 2>/dev/null || echo "")
    if [ ! -z "$MAIN_ADDRESS" ]; then
        echo "  • Main Wallet: $EXPLORER_BASE/address/$MAIN_ADDRESS?cluster=$NETWORK"
    fi
fi

print_header "🛠️  Development Tools"
echo "--------------------"

echo "Useful commands for development:"
echo ""
echo "• View program logs:"
echo "  solana logs $PROGRAM_ID"
echo ""
echo "• Check specific address balance:"
echo "  solana balance <ADDRESS>"
echo ""
echo "• Run full contract test:"
echo "  node devnet-testing/full-test.js"
echo ""
echo "• Export wallet keys for Phantom:"
echo "  node scripts/export-wallet-keys.js"
echo ""

print_header "🚨 Troubleshooting"
echo "-----------------"

echo "If you encounter issues:"
echo ""
echo "• Program not found:"
echo "  - Check network setting: solana config get"
echo "  - Verify program ID is correct"
echo "  - Ensure program was deployed to current network"
echo ""
echo "• Connection errors:"
echo "  - Check internet connectivity"
echo "  - Try different RPC endpoint"
echo "  - Wait and retry (network may be busy)"
echo ""
echo "• Test failures:"
echo "  - Ensure wallets have sufficient balance"
echo "  - Check program is deployed and active"
echo "  - Verify network matches deployment"
echo ""

print_header "📞 Support Resources"
echo "-------------------"

echo "• Documentation: docs/"
echo "• Contract source: programs/slider-pvp/src/lib.rs"
echo "• Test suite: devnet-testing/"
echo "• Solana Explorer: $EXPLORER_BASE"
echo "• Network status: https://status.solana.com/"
echo ""

# Clean up temporary files
rm -f /tmp/program_info.json /tmp/test_output.log

print_status "Status report completed!"
echo ""
print_info "Contract appears to be $(if solana program show $PROGRAM_ID --output json > /dev/null 2>&1; then echo 'ACTIVE'; else echo 'INACTIVE'; fi) on $NETWORK"
