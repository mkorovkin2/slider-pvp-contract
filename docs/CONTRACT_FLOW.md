# Contract Flow Diagram

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         WAGER LIFECYCLE                         │
└─────────────────────────────────────────────────────────────────┘

Phase 1: INITIALIZATION
┌──────────────────────────────────────────────────────────────┐
│  Anyone (typically game frontend)                            │
│  Calls: initialize_wager()                                   │
│                                                              │
│  Parameters:                                                 │
│  • player1: Pubkey                                          │
│  • player2: Pubkey                                          │
│  • arbiter: Pubkey                                          │
│  • fee_recipient: Pubkey                                    │
│  • wager_amount: u64 (e.g., 0.1 SOL)                       │
│                                                              │
│  Result: Wager PDA created                                   │
│  State: player1_deposited = false                           │
│         player2_deposited = false                           │
│         start_time = 0                                       │
│         is_settled = false                                   │
└──────────────────────────────────────────────────────────────┘
                          ↓

Phase 2: DEPOSITS (Order doesn't matter)
┌──────────────────────────────────────────────────────────────┐
│  Player 1                    │  Player 2                     │
│  Calls: deposit_player1()    │  Calls: deposit_player2()     │
│  Transfers: 0.1 SOL → PDA    │  Transfers: 0.1 SOL → PDA     │
│                              │                               │
│  State: player1_deposited    │  State: player2_deposited     │
│         = true               │         = true                │
└──────────────────────────────────────────────────────────────┘
                          ↓
              When BOTH deposit:
              start_time = current_timestamp
              
                          ↓

Phase 3: DECISION WINDOW (120 seconds)
┌──────────────────────────────────────────────────────────────┐
│                     ⏱️  TIMER RUNNING                         │
│                                                              │
│  PDA Balance: 0.2 SOL (0.1 from each player)                │
│  Start Time: Unix timestamp                                  │
│  Deadline: start_time + 120 seconds                         │
└──────────────────────────────────────────────────────────────┘
                          ↓
                   ┌──────┴──────┐
                   │             │
            Path A ↓             ↓ Path B

┌─────────────────────────┐   ┌─────────────────────────┐
│  WINNER DECLARED        │   │  TIMEOUT EXPIRES        │
│  (within 120 seconds)   │   │  (after 120 seconds)    │
└─────────────────────────┘   └─────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATH A: WINNER DECLARED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────────────────────────────────┐
│  Arbiter                                                     │
│  Calls: declare_winner(winner: 1 or 2)                      │
│                                                              │
│  Validation:                                                 │
│  ✓ Caller == arbiter                                        │
│  ✓ current_time - start_time <= 120 seconds                │
│  ✓ Both players deposited                                   │
│  ✓ Wager not already settled                               │
│  ✓ Winner is 1 or 2                                        │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  DISTRIBUTION                                                │
│                                                              │
│  Total Pool: 0.2 SOL                                        │
│                                                              │
│  Transfer 1: 0.19 SOL (95%) → Winner                        │
│  Transfer 2: 0.01 SOL (5%)  → Fee Recipient                │
│                                                              │
│  State: winner = 1 or 2                                     │
│         is_settled = true                                    │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  ✅ SETTLEMENT COMPLETE                                      │
│                                                              │
│  Winner Balance: +0.19 SOL                                  │
│  Fee Recipient Balance: +0.01 SOL                           │
│  Loser Balance: -0.1 SOL                                    │
│  PDA Balance: ~0 SOL (may have rent-exempt minimum)        │
└──────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATH B: TIMEOUT EXPIRES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────────────────────────────────┐
│  Anyone (any wallet)                                         │
│  Calls: refund()                                            │
│                                                              │
│  Validation:                                                 │
│  ✓ current_time - start_time > 120 seconds                 │
│  ✓ Both players deposited                                   │
│  ✓ Wager not already settled                               │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  REFUND                                                      │
│                                                              │
│  Total Pool: 0.2 SOL                                        │
│                                                              │
│  Transfer 1: 0.1 SOL → Player 1                             │
│  Transfer 2: 0.1 SOL → Player 2                             │
│                                                              │
│  State: is_settled = true                                    │
│         winner = None                                        │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  ✅ REFUND COMPLETE                                          │
│                                                              │
│  Player 1 Balance: ±0 SOL (refunded)                        │
│  Player 2 Balance: ±0 SOL (refunded)                        │
│  PDA Balance: ~0 SOL (may have rent-exempt minimum)        │
└──────────────────────────────────────────────────────────────┘
```

## State Transition Diagram

```
                    UNINITIALIZED
                         │
                         │ initialize_wager()
                         ↓
                    INITIALIZED
                (player1_deposited=false)
                (player2_deposited=false)
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        │ deposit_       │                │ deposit_
        │ player1()      │                │ player2()
        │                │                │
        ↓                ↓                ↓
    PLAYER1_        BOTH_           PLAYER2_
    DEPOSITED       DEPOSITED       DEPOSITED
        │                │                │
        │ deposit_       │                │ deposit_
        │ player2()      │                │ player1()
        │                │                │
        └────────────────┼────────────────┘
                         │
                         │ (Timer starts: start_time set)
                         ↓
                  ACTIVE_WAGER
                 (120 sec window)
                         │
            ┌────────────┴────────────┐
            │                         │
    declare_winner()            (timeout expires)
    (within 120s)                     │
            │                         │
            ↓                         ↓
    WINNER_DECLARED            TIMEOUT_REACHED
    (winner = 1 or 2)          (refund available)
    (is_settled = true)               │
            │                    refund()
            │                         │
            │                         ↓
            │                  REFUNDED
            │                  (is_settled = true)
            │                         │
            └─────────────┬───────────┘
                          ↓
                      SETTLED
                (Final state, cannot be changed)
```

## Role Permissions

```
┌─────────────────────────────────────────────────────────────┐
│  ROLE             │  CAN DO                                  │
├─────────────────────────────────────────────────────────────┤
│  Anyone           │  • initialize_wager()                    │
│                   │  • refund() (after timeout)              │
├─────────────────────────────────────────────────────────────┤
│  Player 1         │  • deposit_player1() (once)              │
├─────────────────────────────────────────────────────────────┤
│  Player 2         │  • deposit_player2() (once)              │
├─────────────────────────────────────────────────────────────┤
│  Arbiter          │  • declare_winner() (within 120s)        │
├─────────────────────────────────────────────────────────────┤
│  Fee Recipient    │  • Receives 5% of pool when winner       │
│                   │    is declared                           │
└─────────────────────────────────────────────────────────────┘
```

## Time Constraints

```
Timeline:
─────────────────────────────────────────────────────────────────

t=0         Player deposits complete
│           start_time = current_timestamp
│
│  ┌─────── DECISION WINDOW (120 seconds) ──────┐
│  │                                             │
│  │  Arbiter CAN declare winner                │
│  │  Refund CANNOT be called                   │
│  │                                             │
│  └─────────────────────────────────────────────┘
│
t=120s      Timeout expires
│           
│  ┌─────── REFUND WINDOW (indefinite) ─────────┐
│  │                                             │
│  │  Arbiter CANNOT declare winner             │
│  │  Refund CAN be called by anyone            │
│  │                                             │
│  └─────────────────────────────────────────────┘
```

## Error Flow

```
┌───────────────────────────────────────────────────────────┐
│  COMMON ERROR SCENARIOS                                   │
└───────────────────────────────────────────────────────────┘

1. Double Deposit Attempt
   Player 1 deposits → ✓ Success
   Player 1 deposits again → ❌ AlreadyDeposited

2. Unauthorized Arbiter
   Random wallet calls declare_winner() → ❌ UnauthorizedArbiter

3. Early Refund Attempt
   Someone calls refund() at t=60s → ❌ TimeoutNotExpired

4. Late Winner Declaration
   Arbiter calls declare_winner() at t=121s → ❌ TimeoutExpired

5. Wrong Player Deposit
   Player 2's wallet calls deposit_player1() → ❌ UnauthorizedPlayer

6. Invalid Winner Value
   Arbiter calls declare_winner(3) → ❌ InvalidWinner

7. Premature Winner Declaration
   Only Player 1 deposited, arbiter tries → ❌ BothPlayersNotDeposited

8. Same Player Initialization
   initialize_wager(alice, alice, ...) → ❌ SamePlayer
```

## Fund Flow Diagram

```
SCENARIO 1: Winner Declared (Player 1 Wins)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Player 1 Wallet                 Player 2 Wallet
     │                               │
     │ -0.1 SOL                     │ -0.1 SOL
     ↓                               ↓
              Wager PDA (Escrow)
                  0.2 SOL
                     │
         ┌───────────┴───────────┐
         │                       │
         │ 0.19 SOL (95%)       │ 0.01 SOL (5%)
         ↓                       ↓
    Player 1 Wallet         Fee Recipient
    NET: +0.09 SOL         NET: +0.01 SOL


SCENARIO 2: Timeout Refund
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Player 1 Wallet                 Player 2 Wallet
     │                               │
     │ -0.1 SOL                     │ -0.1 SOL
     ↓                               ↓
              Wager PDA (Escrow)
                  0.2 SOL
                     │
         ┌───────────┴───────────┐
         │                       │
         │ 0.1 SOL              │ 0.1 SOL
         ↓                       ↓
    Player 1 Wallet         Player 2 Wallet
    NET: ±0 SOL             NET: ±0 SOL
```

## Integration Points

```
┌────────────────────────────────────────────────────────────┐
│  TYPICAL SYSTEM ARCHITECTURE                               │
└────────────────────────────────────────────────────────────┘

    Frontend (React/Vue/etc)
           │
           │ User interactions
           ↓
    ┌──────────────────┐
    │  Wallet Adapter  │  (Phantom, Solflare, etc)
    └──────────────────┘
           │
           │ Sign transactions
           ↓
    ┌──────────────────┐
    │  Anchor Client   │  (TypeScript SDK)
    └──────────────────┘
           │
           │ RPC calls
           ↓
    ┌──────────────────┐
    │  Solana RPC Node │  (Devnet/Mainnet)
    └──────────────────┘
           │
           │ Program execution
           ↓
    ┌──────────────────┐
    │  Slider PvP      │  (On-chain program)
    │  Contract        │
    └──────────────────┘
           │
           │ Transfers
           ↓
    ┌──────────────────┐
    │  System Program  │  (Native Solana)
    └──────────────────┘
```

## Best Practices

### For Frontend Developers

1. **Poll Wager State**: Check `start_time` to display countdown timer
2. **Enable Buttons Conditionally**: 
   - Deposit buttons only if not already deposited
   - Declare winner button only for arbiter within timeout
   - Refund button only after timeout expires
3. **Handle Errors Gracefully**: Show user-friendly messages for all error codes
4. **Confirm Transactions**: Wait for transaction confirmation before updating UI

### For Arbiter Implementation

1. **Be Quick**: You have only 120 seconds to decide
2. **Monitor Timer**: Track time remaining and warn before expiry
3. **Batch if Needed**: If handling multiple wagers, prioritize by time remaining
4. **Error Recovery**: Have fallback mechanism if first attempt fails

### For Game Developers

1. **Choose Arbiter Wisely**: Could be:
   - Trusted server with private key
   - Multi-sig wallet
   - On-chain oracle (future enhancement)
2. **Set Reasonable Wager Amounts**: Consider transaction fees
3. **Communicate Clearly**: Players should understand rules before depositing
4. **Monitor Fee Wallet**: Track revenue from 5% fees

---

*This flow diagram is part of the Slider PvP Contract documentation.*
*For implementation details, see `programs/slider-pvp/src/lib.rs`*
*For deployment instructions, see `DEPLOYMENT.md`*

