# Slider PvP Contract

A trustless wager/escrow smart contract for Solana that enables fair player-vs-player contests with automated payouts.

## Overview

This Solana smart contract acts as a trustless wager or escrow system between two participants. Both players deposit a fixed amount of SOL into the contract, and an authorized arbiter determines the winner within a 120-second window. The contract automatically distributes 95% of the pool to the winner and 5% to a fee recipient. 

**Key Safety Features:**
- If only one player deposits, they can get their funds back after 30 seconds (deposit timeout)
- If both players deposit but no winner is declared within 120 seconds, both can reclaim their deposits

## Features

- ✅ **Trustless Escrow**: Funds are held in a Program Derived Address (PDA)
- ✅ **Automated Payouts**: 95% to winner, 5% to fee recipient
- ✅ **Deposit Timeout Protection**: 30-second window for both players to deposit
- ✅ **Game Timeout Protection**: 120-second window for arbiter to declare winner
- ✅ **No-Show Refunds**: If opponent doesn't deposit within 30 seconds, get your money back
- ✅ **Role-Based Access**: Only designated arbiter can declare winners
- ✅ **Transparent On-Chain**: All rules enforced by smart contract
- ✅ **Prevents Double-Spending**: Each player can only deposit once

## How It Works

### Normal Flow (Both Players Participate)

1. **Initialize**: Create a wager with two player addresses, an arbiter, and a fee recipient
2. **Deposit Phase** (30-second window): Both players deposit the agreed-upon SOL amount
3. **Game Timer Starts**: Once both deposits are made, a 120-second countdown begins
4. **Decision Window**: 
   - Arbiter can declare a winner (within 120 seconds)
   - Winner receives 95% of the pool
   - Fee recipient receives 5% of the pool
5. **Game Timeout Refund** (if needed): 
   - If no winner is declared within 120 seconds
   - Anyone can trigger a refund
   - Both players receive their original deposits back

### No-Show Protection (One Player Doesn't Deposit)

1. **Initialize**: Wager is created
2. **Partial Deposit**: Only one player deposits within the first 30 seconds
3. **Deposit Timeout**: After 30 seconds from wager creation
4. **Cancel & Refund**:
   - Anyone can call `cancel_wager()` after 30 seconds
   - The player who deposited receives their full amount back
   - No penalty for the depositing player

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

// Initialize wager
const wagerAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

const [wagerPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("wager"),
    player1.publicKey.toBuffer(),
    player2.publicKey.toBuffer(),
  ],
  program.programId
);

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
    systemProgram: SystemProgram.programId,
  })
  .signers([arbiter])
  .rpc();

// OR if opponent doesn't show up (after 30 seconds)
await program.methods
  .cancelWager()
  .accounts({
    wager: wagerPda,
    player1: player1.publicKey,
    player2: player2.publicKey,
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
- Can be called by anyone

**Behavior:**
- Refunds player 1 if they deposited
- Refunds player 2 if they deposited
- No action if neither deposited (just marks as settled)

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

**Note:** Some tests require time manipulation (30s and 120s timeouts). For full test coverage with actual time-based scenarios, use Solana test validator's `warp` feature or similar time control mechanisms.

## Security Features

1. **PDA-Based Escrow**: Funds held in Program Derived Address with no private key
2. **Role-Based Permissions**: Only arbiter can declare winner
3. **Dual Time-Lock Protection**: 
   - Deposit timeout (30s) protects against no-show opponents
   - Game timeout (120s) protects against arbiter failure
4. **State Validation**: Prevents double deposits and double settlements
5. **Deterministic PDAs**: Unique wager account per player pair
6. **No Fund Lockup**: Players can always retrieve funds via timeout mechanisms

## Configuration

### Constants (in `lib.rs`)

```rust
const TIMEOUT_SECONDS: i64 = 120;              // Game timeout: 2-minute window
const DEPOSIT_TIMEOUT_SECONDS: i64 = 30;       // Deposit timeout: 30-second window
const WINNER_PERCENTAGE: u64 = 95;             // 95% to winner
const FEE_PERCENTAGE: u64 = 5;                 // 5% to fee recipient
```

**Timeout Explanations:**
- `DEPOSIT_TIMEOUT_SECONDS`: How long to wait for both players to deposit before allowing cancellation
- `TIMEOUT_SECONDS`: How long arbiter has to declare winner after both players deposit

Modify these values before deployment to adjust contract behavior.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for:
- Local development
- Devnet deployment
- Mainnet deployment

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 6000 | `SamePlayer` | Player 1 and Player 2 cannot be the same |
| 6001 | `InvalidWagerAmount` | Wager amount must be greater than 0 |
| 6002 | `AlreadyDeposited` | Player has already deposited |
| 6003 | `UnauthorizedPlayer` | Unauthorized player |
| 6004 | `WagerAlreadySettled` | Wager has already been settled |
| 6005 | `BothPlayersNotDeposited` | Both players must deposit before declaring winner/refunding |
| 6006 | `UnauthorizedArbiter` | Unauthorized arbiter |
| 6007 | `InvalidWinner` | Invalid winner (must be 1 or 2) |
| 6008 | `TimeoutExpired` | Game timeout has expired, cannot declare winner |
| 6009 | `TimeoutNotExpired` | Game timeout has not expired yet, cannot refund |
| 6010 | `BothPlayersAlreadyDeposited` | Both players have already deposited, cannot cancel |
| 6011 | `DepositTimeoutNotExpired` | Deposit timeout has not expired yet, cannot cancel |

## Scalability & Performance

For production deployments handling high volumes (100+ concurrent wagers), see [BOTTLENECKS_TO_FIX.md](./BOTTLENECKS_TO_FIX.md) for:
- Known scalability bottlenecks
- Fee recipient account contention solutions
- Performance optimization strategies
- Throughput improvements (5x-20x with minimal changes)

**TL;DR:** For > 10 concurrent wagers, implement a fee recipient pool (5-20 wallets) to avoid account write contention.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**⚠️ Disclaimer**: This smart contract is provided as-is. Always conduct thorough testing and audits before deploying to mainnet with real funds.