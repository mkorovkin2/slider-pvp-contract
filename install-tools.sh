#!/bin/bash
# Installation script for Solana development tools
# Usage: ./install-tools.sh

set -e

echo "🚀 Installing Solana Development Tools"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check OS
OS="$(uname -s)"
echo "🖥️  Detected OS: $OS"
echo ""

# 1. Install Rust
echo "📦 Step 1/3: Installing Rust..."
if command_exists rustc; then
    echo -e "${GREEN}✓${NC} Rust already installed: $(rustc --version)"
else
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    echo -e "${GREEN}✓${NC} Rust installed successfully"
fi
echo ""

# 2. Install Solana
echo "⛓️  Step 2/3: Installing Solana CLI..."
if command_exists solana; then
    echo -e "${GREEN}✓${NC} Solana already installed: $(solana --version)"
else
    echo "Installing Solana..."
    sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    echo -e "${GREEN}✓${NC} Solana installed successfully"
fi
echo ""

# 3. Install Anchor
echo "⚓ Step 3/3: Installing Anchor Framework..."
if command_exists anchor; then
    echo -e "${GREEN}✓${NC} Anchor already installed: $(anchor --version)"
else
    echo "Installing Anchor (this may take 5-10 minutes)..."
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
    echo -e "${GREEN}✓${NC} Anchor installed successfully"
fi
echo ""

# Add to PATH instructions
echo "📝 Configuration"
echo "==============="
echo ""
echo "Add these lines to your shell configuration file (~/.zshrc or ~/.bashrc):"
echo ""
echo -e "${YELLOW}export PATH=\"\$HOME/.local/share/solana/install/active_release/bin:\$PATH\"${NC}"
echo -e "${YELLOW}export PATH=\"\$HOME/.cargo/bin:\$PATH\"${NC}"
echo ""
echo "Then reload your shell:"
echo -e "${YELLOW}source ~/.zshrc${NC}  # or ~/.bashrc"
echo ""

# Verify installations
echo "🔍 Verification"
echo "==============="
echo ""

if command_exists solana; then
    echo -e "${GREEN}✓${NC} Solana CLI: $(solana --version)"
else
    echo -e "${RED}✗${NC} Solana CLI not found"
fi

if command_exists rustc; then
    echo -e "${GREEN}✓${NC} Rust: $(rustc --version)"
else
    echo -e "${RED}✗${NC} Rust not found"
fi

if command_exists anchor; then
    echo -e "${GREEN}✓${NC} Anchor: $(anchor --version)"
else
    echo -e "${RED}✗${NC} Anchor not found"
fi

if command_exists cargo; then
    echo -e "${GREEN}✓${NC} Cargo: $(cargo --version)"
else
    echo -e "${RED}✗${NC} Cargo not found"
fi

echo ""
echo "🎉 Installation Complete!"
echo ""
echo "Next steps:"
echo "1. Reload your shell: source ~/.zshrc (or ~/.bashrc)"
echo "2. Build the program: anchor build"
echo "3. Run tests: anchor test"
echo ""
echo "For detailed testing instructions, see TESTING_GUIDE.md"

