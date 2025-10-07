# Quick Start Guide

Get up and running with the Slider PvP Contract in 5 minutes.

## Prerequisites Check

```bash
# Check if Solana is installed
solana --version

# Check if Rust is installed
rustc --version

# Check if Anchor is installed
anchor --version

# Check if Node.js is installed
node --version
yarn --version
```

If any are missing, see the installation section below.

## Installation (If Needed)

### Install Solana CLI
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Install Anchor
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### Install Node.js & Yarn
```bash
# macOS
brew install node
npm install -g yarn

# Linux
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g yarn
```

## Step-by-Step Setup

### 1. Install Dependencies (30 seconds)

```bash
cd ~/workplace/slider-pvp-contract
yarn install
```

### 2. Build the Program (2 minutes)

```bash
anchor build
```

Expected output:
```
Compiling slider-pvp v0.1.0
Finished release [optimized] target(s)
```

### 3. Get Program ID

```bash
solana address -k target/deploy/slider_pvp-keypair.json
```

Copy this address (it should match `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS` or you need to update it).

### 4. Configure Solana (10 seconds)

```bash
# Set to devnet
solana config set --url devnet

# Check your wallet
solana address

# Get some devnet SOL
solana airdrop 2
```

### 5. Run Tests (1 minute)

```bash
# Start local validator in a separate terminal
solana-test-validator

# In the main terminal, run tests
anchor test --skip-local-validator
```

Expected output:
```
  slider-pvp
    ✓ Initializes a wager successfully
    ✓ Player 1 deposits successfully
    ✓ Player 2 deposits successfully
    ✓ Both players deposit and timer starts
    ✓ Arbiter declares player 1 as winner
    ✓ Arbiter declares player 2 as winner
    ✓ Fails when non-arbiter tries to declare winner
    ✓ Refunds both players after timeout
    ✓ Fails to refund before timeout expires
    ✓ Fails when player deposits twice
    ✓ Fails to declare winner before both players deposit

  11 passing
```

## Deploy to Devnet (Optional)

```bash
# Make sure you're on devnet
solana config set --url devnet

# Get SOL for deployment
solana airdrop 2

# Deploy
anchor deploy --provider.cluster devnet
```

The program is now live on Solana devnet! 🎉

## Quick Test

Here's a minimal test to verify everything works:

```typescript
// test.ts - Quick verification script
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function quickTest() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SliderPvp as Program<any>;

  // Generate test accounts
  const player1 = Keypair.generate();
  const player2 = Keypair.generate();
  const arbiter = Keypair.generate();
  const feeRecipient = Keypair.generate();

  console.log("✓ Generated test accounts");

  // Derive wager PDA
  const [wagerPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("wager"),
      player1.publicKey.toBuffer(),
      player2.publicKey.toBuffer(),
    ],
    program.programId
  );

  console.log("✓ Derived wager PDA:", wagerPda.toString());

  // Initialize wager
  const wagerAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
  
  await program.methods
    .initializeWager(
      player1.publicKey,
      player2.publicKey,
      arbiter.publicKey,
      feeRecipient.publicKey,
      wagerAmount
    )
    .accounts({
      wager: wagerPda,
      payer: provider.wallet.publicKey,
    })
    .rpc();

  console.log("✓ Initialized wager");

  // Fetch and display wager account
  const wagerAccount = await program.account.wager.fetch(wagerPda);
  console.log("✓ Wager details:", {
    player1: wagerAccount.player1.toString(),
    player2: wagerAccount.player2.toString(),
    wagerAmount: wagerAccount.wagerAmount.toString(),
    isSettled: wagerAccount.isSettled,
  });

  console.log("\n🎉 Quick test passed!");
}

quickTest().catch(console.error);
```

Run it:
```bash
npx ts-node test.ts
```

## Troubleshooting

### Error: "anchor: command not found"
```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$HOME/.cargo/bin:$PATH"
source ~/.bashrc  # or ~/.zshrc
```

### Error: "insufficient funds"
```bash
# Get more SOL
solana airdrop 2
```

### Error: "Account does not exist"
```bash
# Make sure you initialized the wager first
# Check the PDA is derived correctly
```

### Error: "Transaction simulation failed"
```bash
# Check Solana logs for details
solana logs

# Verify your cluster setting
solana config get
```

### Build fails with "error: linker 'cc' not found"
```bash
# Install build essentials (Linux)
sudo apt-get install build-essential

# Install Xcode Command Line Tools (macOS)
xcode-select --install
```

## Next Steps

Now that you have the contract running:

1. **Read the Documentation**
   - `README.md` - Complete project overview
   - `CONTRACT_FLOW.md` - Visual flow diagrams
   - `DEPLOYMENT.md` - Production deployment guide

2. **Explore the Code**
   - `programs/slider-pvp/src/lib.rs` - Main contract logic
   - `tests/slider-pvp.ts` - Test suite with examples

3. **Build Your Integration**
   - Create a frontend to interact with the contract
   - Set up an arbiter bot to declare winners
   - Monitor your fee recipient wallet

4. **Customize**
   - Adjust `TIMEOUT_SECONDS` (currently 120)
   - Modify fee split (currently 95/5)
   - Add custom validation logic

## Common Use Cases

### 1. Gaming Platform
```
Player 1 vs Player 2 in a game
↓
Frontend calls initialize_wager()
↓
Both players deposit
↓
Game backend (arbiter) watches game outcome
↓
Arbiter calls declare_winner() with result
```

### 2. Prediction Market
```
Two people bet on opposite outcomes
↓
Both deposit their wagers
↓
Oracle/arbiter verifies real-world outcome
↓
Winner receives payout
```

### 3. Tournament Bracket
```
Multiple wagers for different matches
↓
Each match has own wager PDA
↓
Tournament organizer is arbiter
↓
Declares winners as matches complete
```

## Support

- **Issues**: Open a GitHub issue
- **Questions**: Check `README.md` and `CONTRACT_FLOW.md`
- **Contributions**: Pull requests welcome!

## Security Reminder

⚠️ **Before Mainnet Deployment:**
- Get a professional security audit
- Test thoroughly on devnet
- Start with small wager amounts
- Monitor deployed program activity
- Have an incident response plan

---

**Ready to build something awesome?** 🚀

Start by modifying the test file to understand how the contract works, then build your frontend integration!

