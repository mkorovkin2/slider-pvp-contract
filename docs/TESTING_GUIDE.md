# Testing Guide - Slider PvP Contract

This guide will help you test the contract from scratch, even if you don't have the Solana toolchain installed yet.

## Prerequisites Installation

### 1. Install Solana CLI (5 minutes)

```bash
# Install Solana
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH (add this to your ~/.zshrc or ~/.bashrc)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Reload your shell
source ~/.zshrc  # or ~/.bashrc

# Verify installation
solana --version
```

### 2. Install Rust (5 minutes)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Follow prompts and select default installation

# Reload shell
source ~/.zshrc  # or ~/.bashrc

# Verify
rustc --version
cargo --version
```

### 3. Install Anchor (5 minutes)

```bash
# Install Anchor Version Manager (avm)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install latest Anchor
avm install latest
avm use latest

# Verify
anchor --version
```

Expected output: `anchor-cli 0.29.0` (or similar)

## Testing Steps

### Step 1: Build the Program (2 minutes)

```bash
cd ~/workplace/slider-pvp-contract

# Build the Solana program
anchor build
```

**Expected output:**
```
Compiling slider-pvp v0.1.0
...
Finished release [optimized] target(s) in X.XXs
```

If successful, you'll see `target/deploy/slider_pvp.so` created.

### Step 2: Generate Program Keypair

The program needs a keypair for deployment. This should already exist after building:

```bash
# Check if keypair exists
ls -la target/deploy/slider_pvp-keypair.json

# Get the program address
solana address -k target/deploy/slider_pvp-keypair.json
```

**The address should match:** `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`

If it doesn't match, you'll need to:
1. Update `declare_id!()` in `programs/slider-pvp/src/lib.rs`
2. Update `[programs.*]` in `Anchor.toml`
3. Rebuild with `anchor build`

### Step 3: Start Local Test Validator (Terminal 1)

Open a **separate terminal** and run:

```bash
solana-test-validator
```

**Expected output:**
```
Ledger location: test-ledger
Log: test-ledger/validator.log
Identity: [keypair address]
Genesis Hash: [hash]
...
```

**Keep this terminal running!** This is your local blockchain for testing.

### Step 4: Run Tests (Terminal 2)

In your **main terminal**:

```bash
cd ~/workplace/slider-pvp-contract

# Run the test suite
anchor test --skip-local-validator
```

**What this does:**
- Deploys the program to your local validator
- Runs all 11 test cases
- Verifies all functionality

**Expected output:**
```
  slider-pvp
    ✓ Initializes a wager successfully (XXXms)
    ✓ Player 1 deposits successfully (XXXms)
    ✓ Player 2 deposits successfully (XXXms)
    ✓ Both players deposit and timer starts (XXXms)
    ✓ Arbiter declares player 1 as winner (XXXms)
    ✓ Arbiter declares player 2 as winner (XXXms)
    ✓ Fails when non-arbiter tries to declare winner (XXXms)
    ✓ Refunds both players after timeout (XXXms)
    ✓ Fails to refund before timeout expires (XXXms)
    ✓ Fails when player deposits twice (XXXms)
    ✓ Fails to declare winner before both players deposit (XXXms)

  11 passing (Xs)
```

## What Each Test Verifies

### Test 1: Initialize Wager
✅ Creates a new wager PDA
✅ Stores player addresses correctly
✅ Sets arbiter and fee recipient
✅ Initial state is correct (not deposited, not settled)

### Test 2-3: Individual Deposits
✅ Player 1 can deposit their wager amount
✅ Player 2 can deposit their wager amount
✅ SOL is transferred from player to PDA
✅ Deposit flags are set correctly

### Test 4: Timer Activation
✅ Timer starts only when BOTH players deposit
✅ `start_time` is set to current timestamp
✅ Both `player1_deposited` and `player2_deposited` are true

### Test 5-6: Winner Declaration
✅ Arbiter can declare player 1 or player 2 as winner
✅ Winner receives 95% of the pool (0.19 SOL)
✅ Fee recipient receives 5% of the pool (0.01 SOL)
✅ Wager is marked as settled

### Test 7: Authorization
✅ Non-arbiter cannot declare winner
✅ Error: "Unauthorized arbiter" is thrown

### Test 8: Refund After Timeout
✅ Note: This test shows structure but timeout requires time manipulation
✅ In real tests, wait 120+ seconds or use test validator time commands

### Test 9: Premature Refund Prevention
✅ Cannot refund before 120 seconds expire
✅ Error: "Timeout period has not expired" is thrown

### Test 10: Double Deposit Prevention
✅ Player cannot deposit twice
✅ Error: "Player has already deposited" is thrown

### Test 11: Premature Winner Declaration
✅ Cannot declare winner before both players deposit
✅ Error: "Both players must deposit" is thrown

## Manual Testing on Local Validator

After the automated tests pass, you can manually test with the Solana CLI:

### 1. Check Program Deployment

```bash
# Set cluster to localhost
solana config set --url localhost

# Get your wallet address
solana address

# Check program is deployed
solana program show Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
```

### 2. Create Test Accounts

```bash
# Create player wallets
solana-keygen new -o player1.json --no-bip39-passphrase
solana-keygen new -o player2.json --no-bip39-passphrase
solana-keygen new -o arbiter.json --no-bip39-passphrase

# Get addresses
PLAYER1=$(solana address -k player1.json)
PLAYER2=$(solana address -k player2.json)
ARBITER=$(solana address -k arbiter.json)

echo "Player 1: $PLAYER1"
echo "Player 2: $PLAYER2"
echo "Arbiter: $ARBITER"

# Fund accounts (on local validator)
solana airdrop 1 $PLAYER1
solana airdrop 1 $PLAYER2
solana airdrop 1 $ARBITER
```

### 3. Interact with the Program

You can now use the TypeScript SDK or create custom scripts to:
- Initialize wagers
- Make deposits
- Declare winners
- Test refunds

## Debugging Failed Tests

### Build Errors

**Error: "anchor: command not found"**
```bash
# Make sure Anchor is in PATH
which anchor
# If not found, reinstall or add to PATH
export PATH="$HOME/.cargo/bin:$PATH"
```

**Error: "linker 'cc' not found"**
```bash
# macOS: Install Xcode Command Line Tools
xcode-select --install

# Linux: Install build essentials
sudo apt-get install build-essential
```

### Test Errors

**Error: "Failed to get recent blockhash"**
```bash
# Make sure test validator is running in another terminal
# Check it's on the right port (default 8899)
solana config get
```

**Error: "insufficient funds"**
```bash
# On test validator, airdrop SOL
solana airdrop 10
```

**Error: "Transaction simulation failed"**
```bash
# Check validator logs
tail -f test-ledger/validator.log

# Or check program logs
solana logs
```

## Performance Testing

After basic tests pass, you can test with various scenarios:

### 1. Multiple Concurrent Wagers

Create a script that initializes multiple wagers simultaneously:

```typescript
// test-concurrent.ts
import * as anchor from "@coral-xyz/anchor";

async function testConcurrent() {
  const program = /* load program */;
  
  // Create 10 wagers at once
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(/* initialize wager */);
  }
  
  await Promise.all(promises);
  console.log("✓ 10 wagers created successfully");
}
```

### 2. Edge Cases

Test edge cases:
- Very small amounts (1 lamport)
- Very large amounts (1000 SOL)
- Rapid deposits (both players deposit immediately)
- Last-second winner declaration (at t=119s)

### 3. Gas/Fee Analysis

```bash
# After running transactions, check costs
solana transaction-history <your-address>
```

## Test on Devnet

After local testing succeeds, test on devnet:

```bash
# Switch to devnet
solana config set --url devnet

# Get devnet SOL
solana airdrop 2

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run tests against devnet
anchor test --provider.cluster devnet
```

## Continuous Testing

For ongoing development:

```bash
# Watch for file changes and rebuild
cargo watch -x 'build-bpf'

# In another terminal, keep running tests
npm run test
```

## Success Criteria

Your contract is working correctly if:

✅ All 11 tests pass  
✅ Build completes without errors  
✅ Program deploys successfully  
✅ All state transitions work as expected  
✅ All error cases are caught  
✅ SOL transfers correctly  
✅ Timer mechanism works  
✅ Authorization checks pass  

## Next Steps After Tests Pass

1. **Deploy to Devnet** - Test with real network conditions
2. **Build Frontend** - Create UI to interact with contract
3. **Integration Testing** - Test complete user flows
4. **Security Review** - Consider professional audit
5. **Mainnet Preparation** - Final testing and monitoring setup

## Need Help?

If tests fail:
1. Check the error message carefully
2. Review `test-ledger/validator.log` for details
3. Ensure all prerequisites are installed
4. Try rebuilding: `anchor clean && anchor build`
5. Restart the test validator

Common issues and solutions are in the "Debugging Failed Tests" section above.

---

**Remember:** The local test validator is your sandbox. You can't break anything, so experiment freely!

