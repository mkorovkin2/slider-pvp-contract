# Slider PvP Contract Architecture

## Overview

The Slider PvP contract uses a **Unified PDA architecture** to enable trustless SOL escrow for player-vs-player wagers with efficient state and fund management.

## Architecture Components

### 1. Wager PDA (State + Funds)

**Purpose:** Stores all game state, validation logic, and holds the deposited SOL.

**Seeds:** `["wager", player1_pubkey, player2_pubkey, game_id_bytes]`

**Data Structure:**
```rust
pub struct Wager {
    pub player1: Pubkey,              // 32 bytes
    pub player2: Pubkey,              // 32 bytes
    pub arbiter: Pubkey,              // 32 bytes
    pub fee_recipient: Pubkey,        // 32 bytes
    pub payer: Pubkey,                // 32 bytes
    pub wager_amount: u64,            // 8 bytes
    pub game_id: u64,                 // 8 bytes
    pub player1_deposited: bool,      // 1 byte
    pub player2_deposited: bool,      // 1 byte
    pub creation_time: i64,           // 8 bytes
    pub start_time: i64,              // 8 bytes
    pub winner: Option<u8>,           // 2 bytes
    pub is_settled: bool,             // 1 byte
    pub bump: u8,                     // 1 byte
    pub initialization_cost: u64,     // 8 bytes
}
```

**Rent Cost:** ~0.002 SOL (Exact amount depends on Solana rent schedule)

**Role:** 
- Tracks player participation
- Enforces time-based rules
- Validates authorization
- Holds escrowed funds securely

## Key Design Decisions

### Why Unified PDA Architecture?

**Design:** A single PDA handles both the state and the funds.

**Benefits:**
- ✅ **Simplicity**: Reduced number of accounts to manage in client and contract.
- ✅ **Efficiency**: Fewer account checks and lower transaction size.
- ✅ **Atomic**: State changes and fund transfers happen in the same account context.

### Rent Management

**Initialization:**
- The `payer` (initializer) pays the rent exemption for the Wager PDA.

**Settlement:**
- When the wager is settled (Winner Declared, Refunded, or Cancelled), the Wager PDA is closed.
- The rent lamports are **fully refunded** to the `payer`.
- The wager funds (deposits) are distributed independently (Winner/Fee or Refund to players).

**Why this approach:**
- ✅ **Clean Up**: Ensures no "dust" accounts are left on-chain.
- ✅ **Fairness**: The person who pays for storage gets their storage fee back.
- ✅ **Separation**: Wager funds are kept distinct from rent costs.

## Account Flow

### Initialization
```
Payer calls initialize_wager()
    ↓
Creates Wager PDA
    ↓
Payer transfers Rent → Wager PDA
    ↓
Wager PDA ready (balance = rent)
```

### Deposit Flow
```
Player calls deposit_player1() or deposit_player2()
    ↓
Validates player authorization
    ↓
Transfers SOL: Player → Wager PDA
    ↓
Updates player_deposited flag in Wager PDA
    ↓
If both deposited: set start_time
```

### Winner Declaration Flow
```
Arbiter calls declare_winner(1 or 2)
    ↓
Validates arbiter + timeout
    ↓
Transfer 1: Wager PDA → Winner (95% of wager pool)
    ↓
Transfer 2: Wager PDA → Fee Recipient (5% of wager pool)
    ↓
Transfer 3: Wager PDA (Rent) → Payer
    ↓
Closes Wager PDA
```

### Refund Flow
```
Anyone calls refund() after timeout
    ↓
Validates timeout expired
    ↓
Transfer 1: Wager PDA → Player1 (100% of deposit)
    ↓
Transfer 2: Wager PDA → Player2 (100% of deposit)
    ↓
Transfer 3: Wager PDA (Rent) → Payer
    ↓
Closes Wager PDA
```

## Security Features

### 1. Program-Controlled Funds
- No private keys for funds
- Program-controlled addresses (PDA)
- Deterministic derivation

### 2. Time-Lock Mechanisms
- **Deposit timeout**: 30 seconds for both players
- **Game timeout**: 120 seconds for arbiter decision
- Automatic refund if timeouts expire

### 3. Authorization Checks
- Only arbiter can declare winner
- Only correct players can deposit
- Arbiter can cancel/refund if deposits fail

### 4. State Validation
- Prevents double deposits
- Prevents double settlements
- Validates winner values (1 or 2 only)
- Checks timeout windows

### 5. Economic Guarantees
- Winner always gets 95% of wager pool
- Fee recipient always gets 5%
- Refunds always fair (100% of deposit)
- Rent is recovered by initializer

## Performance Characteristics

### Account Writes
- Each transaction writes to 1-3 accounts
- No account contention between different wagers (unique PDAs per game ID)
- Highly parallelizable

### Scalability
- **Bottlenecks**: Fee recipient account (write contention with >10 concurrent wagers settling in same block)
- **Solutions**: Use fee recipient pool or rely on eventual consistency/retry for fee transfers.

## Upgradeability

**Current Design**: Program is upgradeable by the authority (development team) to fix critical bugs or improve functionality.

## Deployment

### Networks
- **Localnet**: Development and testing
- **Devnet**: Public testnet for integration testing
- **Mainnet-beta**: Production deployment

### Program ID
Current: `5Nz9sKCgrJ4ToYizMkud3pscBTGf5XJXmHvJvhEg4UgN`

## Summary

The Slider PvP contract achieves **trustless escrow** through:
- **Unified PDA** for state and funds
- **Automatic rent refunds** for clean on-chain state
- **Time-based validation** for security
- **Role-based access** for control

This architecture is **production-ready**, **gas-efficient**, and follows **Solana best practices**.
