# Slider PvP Contract

A trustless wager/escrow smart contract for Solana that enables fair player-vs-player contests with automated payouts.

## Overview

This Solana smart contract acts as a trustless wager or escrow system between two participants. Both players deposit a fixed amount of SOL into the contract, and an authorized arbiter determines the winner within a 120-second window. The contract automatically distributes 95% of the pool to the winner and 5% to a fee recipient.

**Architecture:** Uses a single Wager PDA that handles both state management and secure SOL storage. Initialization rent costs are paid by the payer and fully refunded when the wager is settled.

**Key Safety Features:**
- If only one player deposits, they can get their funds back after 30 seconds (deposit timeout)
- If both players deposit but no winner is declared within 120 seconds, both can reclaim their deposits
- Funds are never locked; timeout mechanisms ensure recoverability

## 🚀 Mainnet Deployment

**✅ LIVE ON SOLANA MAINNET** (November 26, 2025)

**Mainnet Program ID:** `5Nz9sKCgrJ4ToYizMkud3pscBTGf5XJXmHvJvhEg4UgN`

- 🌐 **Explorer:** https://explorer.solana.com/address/5Nz9sKCgrJ4ToYizMkud3pscBTGf5XJXmHvJvhEg4UgN
- 📄 **Full Report:** [MAINNET_DEPLOYMENT_REPORT.md](MAINNET_DEPLOYMENT_REPORT.md)
- 🔧 **Upgrade Authority:** Maintained by development team
- ⚠️ **Status:** Production - Handle with care

## 🔒 Security Status

**✅ ALL CRITICAL VULNERABILITIES FIXED** (November 27, 2025)

This contract has undergone comprehensive security remediation. All 9 CRITICAL and HIGH severity issues identified in the security audit have been resolved:

- ✅ Fund theft prevention through account validation
- ✅ Permanent lockup prevention through proper error handling
- ✅ Account deletion prevention through balance validation
- ✅ Overflow attack prevention through wager limits
- ✅ Conflict of interest prevention

**Current Status:** ✅ Live on Mainnet  
**Documentation:** See [SECURITY_STATUS_CURRENT.md](SECURITY_STATUS_CURRENT.md) for full details

## Features

- ✅ **Trustless Escrow**: Funds held in the program-controlled Wager PDA
- ✅ **Unified PDA Architecture**: Efficient single-account design for state and funds
- ✅ **Automated Payouts**: 95% to winner, 5% to fee recipient
- ✅ **Rent Refund**: Initialization rent is fully refunded to the payer upon settlement
- ✅ **Deposit Timeout Protection**: 30-second window for both players to deposit
- ✅ **Game Timeout Protection**: 120-second window for arbiter to declare winner
- ✅ **No-Show Refunds**: If opponent doesn't deposit within 30 seconds, get your money back
- ✅ **Role-Based Access**: Only designated arbiter can declare winners
- ✅ **Transparent On-Chain**: All rules enforced by smart contract
- ✅ **Prevents Double-Spending**: Each player can only deposit once

## How It Works

### Normal Flow (Both Players Participate)

1. **Initialize**: Create a wager with two player addresses, an arbiter, a fee recipient, and a unique game ID.
   - Creates Wager PDA (stores game state and will hold funds)
   - Payer funds the rent for the PDA
2. **Deposit Phase** (30-second window): Both players deposit the agreed-upon SOL amount into the Wager PDA.
3. **Game Timer Starts**: Once both deposits are made, a 120-second countdown begins.
4. **Decision Window**: 
   - Arbiter can declare a winner (within 120 seconds)
   - Winner receives 95% of the wager pool
   - Fee recipient receives 5% of the wager pool
   - The Wager PDA is closed, and the rent is refunded to the original payer
5. **Game Timeout Refund** (if needed): 
   - If no winner is declared within 120 seconds
   - Anyone can trigger a refund
   - Both players receive their full deposits back
   - The Wager PDA is closed, and the rent is refunded to the original payer

### No-Show Protection (One Player Doesn't Deposit)

1. **Initialize**: Wager PDA is created.
2. **Partial Deposit**: Only one player deposits into the Wager PDA within the first 30 seconds.
3. **Deposit Timeout**: After 30 seconds from wager creation.
4. **Cancel & Refund**:
   - Anyone can call `cancel_wager()` after 30 seconds
   - The player who deposited receives their full amount back
   - The Wager PDA is closed, and the rent is refunded to the original payer

## Project Structure

```
slider-pvp-contract/
├── programs/
│   └── slider-pvp/
│       ├── src/
│       │   └── lib.rs          # Main program logic
│       ├── Cargo.toml
│       └── Xargo.toml
├── tests/
│   └── slider-pvp.ts           # Comprehensive test suite
├── Anchor.toml                 # Anchor configuration
├── Cargo.toml                  # Workspace configuration
├── package.json                # Node.js dependencies
├── DEPLOYMENT.md               # Deployment guide
└── README.md                   # This file
```

## Quick Start

### Prerequisites

- Rust (latest stable)
- Solana CLI (v1.14+)
- Anchor CLI (v0.29+)
- Node.js (v16+) and Yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd slider-pvp-contract

# Install dependencies
yarn install

# Build the program
anchor build

# Run tests
anchor test
```

## Usage Example

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Mainnet Program ID
const PROGRAM_ID = new PublicKey("5Nz9sKCgrJ4ToYizMkud3pscBTGf5XJXmHvJvhEg4UgN");

// Initialize wager
const wagerAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL); // 0.5 SOL per player
const gameId = new anchor.BN(12345); // Unique game identifier

// Derive wager PDA (stores game state and funds)
const [wagerPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("wager"),
    player1.publicKey.toBuffer(),
    player2.publicKey.toBuffer(),
    gameId.toArrayLike(Buffer, "le", 8),
  ],
  program.programId
);

await program.methods
  .initializeWager(
    player1.publicKey,
    player2.publicKey,
    arbiter.publicKey,
    feeRecipient.publicKey,
    wagerAmount,
    gameId
  )
  .accounts({
    wager: wagerPda,
    payer: payer.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Players deposit
await program.methods
  .depositPlayer1()
  .accounts({
    wager: wagerPda,
    player1: player1.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([player1])
  .rpc();

// Arbiter declares winner
await program.methods
  .declareWinner(1) // 1 for player1, 2 for player2
  .accounts({
    wager: wagerPda,
    arbiter: arbiter.publicKey,
    winnerAccount: player1.publicKey,
    feeRecipient: feeRecipient.publicKey,
    payerAccount: payer.publicKey, // Receives rent refund
    systemProgram: SystemProgram.programId,
  })
  .signers([arbiter])
  .rpc();

// OR if opponent doesn't show up (after 30 seconds)
await program.methods
  .cancelWager()
  .accounts({
    wager: wagerPda,
    arbiter: arbiter.publicKey,
    player1: player1.publicKey, // Required for refund if deposited
    player2: player2.publicKey, // Required for refund if deposited
    payerAccount: payer.publicKey, // Receives rent refund
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Contract Instructions

### 1. `initialize_wager`
Creates a new wager escrow account.

**Parameters:**
- `player1`: Pubkey - First player's wallet address
- `player2`: Pubkey - Second player's wallet address
- `arbiter`: Pubkey - Authorized arbiter wallet
- `fee_recipient`: Pubkey - Fee recipient wallet
- `wager_amount`: u64 - Amount each player must deposit (in lamports)
- `game_id`: u64 - Unique identifier for the game

### 2. `deposit_player1`
Player 1 deposits their wager amount.

**Requirements:**
- Must be signed by player1
- Player1 must not have already deposited
- Wager must not be settled

### 3. `deposit_player2`
Player 2 deposits their wager amount.

**Requirements:**
- Must be signed by player2
- Player2 must not have already deposited
- Wager must not be settled

### 4. `declare_winner`
Arbiter declares the winner within the timeout window.

**Parameters:**
- `winner`: u8 - 1 for player1, 2 for player2

**Requirements:**
- Must be signed by arbiter
- Both players must have deposited
- Within 120-second timeout window
- Wager must not be settled

### 5. `refund`
Refunds both players after game timeout expires.

**Requirements:**
- Game timeout period (120 seconds) must have passed since both players deposited
- Both players must have deposited
- Wager must not be settled
- Can be called by anyone

### 6. `cancel_wager`
Cancels the wager and refunds any deposited player if the other player fails to deposit.

**Requirements:**
- Deposit timeout (30 seconds) must have passed since wager creation
- NOT both players have deposited (at least one missing)
- Wager must not be settled
- Can be called by arbiter

**Behavior:**
- Refunds player 1 if they deposited
- Refunds player 2 if they deposited
- Closes Wager PDA and refunds rent to payer

## Testing

The project includes a comprehensive test suite covering:

- ✅ Wager initialization
- ✅ Player deposits (both players)
- ✅ Timer activation after both deposits
- ✅ Winner declaration (both players)
- ✅ Fee distribution (95%/5% split)
- ✅ Game timeout refund (both players)
- ✅ Deposit timeout cancellation (one player no-show)
- ✅ Authorization checks (arbiter/player validation)
- ✅ Double deposit prevention
- ✅ Premature refund prevention
- ✅ Premature cancellation prevention

Run tests:
```bash
anchor test
```

## Security Features

1. **Unified PDA Architecture**: 
   - Single Wager PDA holds both state and funds, reducing complexity and CPI overhead.
   - No private keys - all funds controlled by program logic.
2. **Role-Based Permissions**: Only arbiter can declare winner.
3. **Dual Time-Lock Protection**: 
   - Deposit timeout (30s) protects against no-show opponents.
   - Game timeout (120s) protects against arbiter failure.
4. **State Validation**: Prevents double deposits and double settlements.
5. **Deterministic PDAs**: Unique wager accounts per player pair and game ID.
6. **No Fund Lockup**: Players can always retrieve funds via timeout mechanisms.
7. **Rent Refund**: Initialization rent is returned to the payer, ensuring no dust is lost.

## Configuration

### Constants (in `lib.rs`)

```rust
const TIMEOUT_SECONDS: i64 = 120;              // Game timeout: 2-minute window
const DEPOSIT_TIMEOUT_SECONDS: i64 = 30;       // Deposit timeout: 30-second window
const WINNER_PERCENTAGE: u64 = 95;             // 95% to winner
const FEE_PERCENTAGE: u64 = 5;                 // 5% to fee recipient
const MAX_WAGER_AMOUNT: u64 = 1_000_000_000_000; // 1000 SOL
```

## Cost Structure

### Initialization Costs
When a wager is created, the Wager PDA is initialized:
- **Wager PDA** rent: ~0.00116 SOL (paid by payer)

### Cost Distribution
- **Rent**: Paid by `payer` at initialization, fully refunded to `payer` at settlement.
- **Wager**: Paid by `player1` and `player2`.
- **Payout**: Winner receives 95% of total wager pool, Fee Recipient receives 5%.

**Example: 0.5 SOL per player**
```
Total deposited: 1.0 SOL (0.5 + 0.5)
Payer Rent Deposit: ~0.00116 SOL

On Settlement:
Winner (95%): 0.95 SOL
Fee (5%): 0.05 SOL
Payer Refund: ~0.00116 SOL
```

## Deployment

### Mainnet (Production)

The contract is deployed on Solana mainnet:

**Program ID:** `5Nz9sKCgrJ4ToYizMkud3pscBTGf5XJXmHvJvhEg4UgN`

**Connect to mainnet:**
```typescript
import { Connection, clusterApiUrl } from "@solana/web3.js";

const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
const PROGRAM_ID = new PublicKey("5Nz9sKCgrJ4ToYizMkud3pscBTGf5XJXmHvJvhEg4UgN");
```

### Development & Testing

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Full Deployment Report:** [MAINNET_DEPLOYMENT_REPORT.md](MAINNET_DEPLOYMENT_REPORT.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
