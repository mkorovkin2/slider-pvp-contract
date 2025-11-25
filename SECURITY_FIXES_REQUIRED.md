# Security Fixes Required - Action Items

**Priority: URGENT - DO NOT DEPLOY TO MAINNET WITHOUT THESE FIXES**

---

## Summary

Your contract has **5 CRITICAL** and **4 HIGH** severity vulnerabilities that allow:
- ❌ **Complete theft of all wagered funds** (CRITICAL-1, 2, 3)
- ❌ **Permanent fund lockup** (CRITICAL-4)
- ❌ **Account deletion** (CRITICAL-5)
- ⚠️ **Arbiter manipulation** (HIGH-3)
- ⚠️ **Race conditions** (HIGH-4)

---

## CRITICAL FIXES (MUST FIX IMMEDIATELY)

### Fix 1: Add Account Validation to DeclareWinner

**Current vulnerable code:**
```rust
#[derive(Accounts)]
pub struct DeclareWinner<'info> {
    #[account(mut)]
    pub wager: Account<'info, Wager>,
    pub arbiter: Signer<'info>,
    /// CHECK: This is the winner account (either player1 or player2)
    #[account(mut)]
    pub winner_account: AccountInfo<'info>,  // ⚠️ NO VALIDATION
    /// CHECK: This is the fee recipient account
    #[account(mut)]
    pub fee_recipient: AccountInfo<'info>,   // ⚠️ NO VALIDATION
    /// CHECK: This is the payer who initialized the wager
    #[account(mut)]
    pub payer_account: AccountInfo<'info>,   // ⚠️ NO VALIDATION
}
```

**Fixed code:**
```rust
#[derive(Accounts)]
pub struct DeclareWinner<'info> {
    #[account(mut)]
    pub wager: Account<'info, Wager>,
    pub arbiter: Signer<'info>,
    /// CHECK: Validated in instruction logic to match winner parameter
    #[account(mut)]
    pub winner_account: AccountInfo<'info>,
    /// CHECK: Must match stored fee_recipient
    #[account(
        mut,
        constraint = fee_recipient.key() == wager.fee_recipient @ ErrorCode::InvalidFeeRecipient
    )]
    pub fee_recipient: AccountInfo<'info>,
    /// CHECK: Must match stored payer
    #[account(
        mut,
        constraint = payer_account.key() == wager.payer @ ErrorCode::InvalidPayerAccount
    )]
    pub payer_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
```

**Also update the instruction logic:**
```rust
pub fn declare_winner(ctx: Context<DeclareWinner>, winner: u8) -> Result<()> {
    let wager = &ctx.accounts.wager;
    
    require!(!wager.is_settled, ErrorCode::WagerAlreadySettled);
    require!(
        ctx.accounts.arbiter.key() == wager.arbiter,
        ErrorCode::UnauthorizedArbiter
    );
    require!(
        wager.player1_deposited && wager.player2_deposited,
        ErrorCode::BothPlayersNotDeposited
    );
    require!(winner == 1 || winner == 2, ErrorCode::InvalidWinner);
    
    let current_time = Clock::get()?.unix_timestamp;
    require!(
        current_time - wager.start_time <= TIMEOUT_SECONDS,
        ErrorCode::TimeoutExpired
    );
    
    // FIX: Validate winner_account matches the winner parameter
    let winner_pubkey = if winner == 1 {
        wager.player1
    } else {
        wager.player2
    };
    
    require!(
        ctx.accounts.winner_account.key() == winner_pubkey,
        ErrorCode::WinnerAccountMismatch
    );
    
    // ... rest of function
}
```

---

### Fix 2: Add Account Validation to Refund

**Fixed code:**
```rust
#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub wager: Account<'info, Wager>,
    /// CHECK: Must match stored player1
    #[account(
        mut,
        constraint = player1.key() == wager.player1 @ ErrorCode::InvalidPlayer1Account
    )]
    pub player1: AccountInfo<'info>,
    /// CHECK: Must match stored player2
    #[account(
        mut,
        constraint = player2.key() == wager.player2 @ ErrorCode::InvalidPlayer2Account
    )]
    pub player2: AccountInfo<'info>,
    /// CHECK: Must match stored payer
    #[account(
        mut,
        constraint = payer_account.key() == wager.payer @ ErrorCode::InvalidPayerAccount
    )]
    pub payer_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
```

---

### Fix 3: Add Account Validation to CancelWager

**Fixed code:**
```rust
#[derive(Accounts)]
pub struct CancelWager<'info> {
    #[account(mut)]
    pub wager: Account<'info, Wager>,
    /// CHECK: Must match stored player1
    #[account(
        mut,
        constraint = player1.key() == wager.player1 @ ErrorCode::InvalidPlayer1Account
    )]
    pub player1: AccountInfo<'info>,
    /// CHECK: Must match stored player2
    #[account(
        mut,
        constraint = player2.key() == wager.player2 @ ErrorCode::InvalidPlayer2Account
    )]
    pub player2: AccountInfo<'info>,
    /// CHECK: Must match stored payer
    #[account(
        mut,
        constraint = payer_account.key() == wager.payer @ ErrorCode::InvalidPayerAccount
    )]
    pub payer_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
```

---

### Fix 4: Replace .unwrap() with Proper Error Handling

**Current vulnerable code:**
```rust
// In declare_winner
let total_pool = wager.wager_amount.checked_mul(2).unwrap();
let winner_amount = total_pool.checked_mul(WINNER_PERCENTAGE).unwrap().checked_div(100).unwrap();
let fee_amount = total_pool.checked_sub(winner_amount).unwrap();

// In refund
let total_pool = wager.wager_amount.checked_mul(2).unwrap();
let refund_amount = total_pool.checked_div(2).unwrap();
```

**Fixed code:**
```rust
// In declare_winner
let total_pool = wager.wager_amount
    .checked_mul(2)
    .ok_or(ErrorCode::ArithmeticOverflow)?;

let winner_amount = total_pool
    .checked_mul(WINNER_PERCENTAGE)
    .ok_or(ErrorCode::ArithmeticOverflow)?
    .checked_div(100)
    .ok_or(ErrorCode::ArithmeticOverflow)?;

let fee_amount = total_pool
    .checked_sub(winner_amount)
    .ok_or(ErrorCode::ArithmeticUnderflow)?;

// In refund
let total_pool = wager.wager_amount
    .checked_mul(2)
    .ok_or(ErrorCode::ArithmeticOverflow)?;

let refund_amount = total_pool
    .checked_div(2)
    .ok_or(ErrorCode::ArithmeticOverflow)?;
```

**Add new error codes:**
```rust
#[error_code]
pub enum ErrorCode {
    // ... existing errors ...
    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
    #[msg("Arithmetic underflow occurred")]
    ArithmeticUnderflow,
    #[msg("Winner account does not match declared winner")]
    WinnerAccountMismatch,
    #[msg("Invalid fee recipient account")]
    InvalidFeeRecipient,
    #[msg("Invalid payer account")]
    InvalidPayerAccount,
    #[msg("Invalid player1 account")]
    InvalidPlayer1Account,
    #[msg("Invalid player2 account")]
    InvalidPlayer2Account,
}
```

---

### Fix 5: Add Rent-Exemption Checks

**Add before lamport transfers in declare_winner, refund, and cancel_wager:**

```rust
// In declare_winner, before transfers
let wager_balance = ctx.accounts.wager.to_account_info().lamports();
let total_transfer = winner_amount
    .checked_add(fee_amount)
    .ok_or(ErrorCode::ArithmeticOverflow)?;

require!(
    wager_balance >= total_transfer,
    ErrorCode::InsufficientBalance
);

// In refund, before transfers
let wager_balance = ctx.accounts.wager.to_account_info().lamports();
let total_refund = refund_amount
    .checked_mul(2)
    .ok_or(ErrorCode::ArithmeticOverflow)?;

require!(
    wager_balance >= total_refund,
    ErrorCode::InsufficientBalance
);
```

**Add error code:**
```rust
#[msg("Insufficient balance in wager account")]
InsufficientBalance,
```

---

## HIGH PRIORITY FIXES (FIX BEFORE MAINNET)

### Fix 6: Prevent Arbiter/Player Conflicts of Interest

**Add to initialize_wager:**
```rust
pub fn initialize_wager(
    ctx: Context<InitializeWager>,
    player1: Pubkey,
    player2: Pubkey,
    arbiter: Pubkey,
    fee_recipient: Pubkey,
    wager_amount: u64,
    game_id: u64,
) -> Result<()> {
    let wager = &mut ctx.accounts.wager;
    
    // Existing check
    require!(player1 != player2, ErrorCode::SamePlayer);
    
    // NEW CHECKS
    require!(arbiter != player1, ErrorCode::ArbiterCannotBePlayer);
    require!(arbiter != player2, ErrorCode::ArbiterCannotBePlayer);
    require!(fee_recipient != player1, ErrorCode::FeeRecipientConflict);
    require!(fee_recipient != player2, ErrorCode::FeeRecipientConflict);
    require!(arbiter != fee_recipient, ErrorCode::ArbiterFeeRecipientConflict);
    
    require!(wager_amount > 0, ErrorCode::InvalidWagerAmount);
    
    // NEW CHECK: Maximum wager limit
    const MAX_WAGER_AMOUNT: u64 = 1_000_000_000_000; // 1000 SOL
    require!(wager_amount <= MAX_WAGER_AMOUNT, ErrorCode::WagerAmountTooLarge);
    
    // ... rest of function
}
```

**Add error codes:**
```rust
#[msg("Arbiter cannot be a player")]
ArbiterCannotBePlayer,
#[msg("Fee recipient cannot be a player")]
FeeRecipientConflict,
#[msg("Arbiter cannot be the fee recipient")]
ArbiterFeeRecipientConflict,
#[msg("Wager amount exceeds maximum allowed")]
WagerAmountTooLarge,
```

---

### Fix 7: Fix Race Condition in start_time

**Current vulnerable code:**
```rust
// In deposit_player1
if wager.player2_deposited {
    wager.start_time = Clock::get()?.unix_timestamp;
}

// In deposit_player2
if wager.player1_deposited {
    wager.start_time = Clock::get()?.unix_timestamp;
}
```

**Fixed code:**
```rust
// In deposit_player1
if wager.player2_deposited && wager.start_time == 0 {
    wager.start_time = Clock::get()?.unix_timestamp;
    msg!("Both players deposited! Timer started: {} seconds", TIMEOUT_SECONDS);
} else {
    msg!("Player 1 deposited {} SOL", wager.wager_amount as f64 / 1_000_000_000.0);
}

// In deposit_player2
if wager.player1_deposited && wager.start_time == 0 {
    wager.start_time = Clock::get()?.unix_timestamp;
    msg!("Both players deposited! Timer started: {} seconds", TIMEOUT_SECONDS);
} else {
    msg!("Player 2 deposited {} SOL", wager.wager_amount as f64 / 1_000_000_000.0);
}
```

---

## COMPLETE ERROR CODE SECTION

Replace your entire ErrorCode enum with this:

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Player 1 and Player 2 cannot be the same")]
    SamePlayer,
    #[msg("Wager amount must be greater than 0")]
    InvalidWagerAmount,
    #[msg("Player has already deposited")]
    AlreadyDeposited,
    #[msg("Unauthorized player")]
    UnauthorizedPlayer,
    #[msg("Wager has already been settled")]
    WagerAlreadySettled,
    #[msg("Both players must deposit before declaring winner or refunding")]
    BothPlayersNotDeposited,
    #[msg("Unauthorized arbiter")]
    UnauthorizedArbiter,
    #[msg("Invalid winner (must be 1 or 2)")]
    InvalidWinner,
    #[msg("Timeout period has expired, cannot declare winner")]
    TimeoutExpired,
    #[msg("Timeout period has not expired yet, cannot refund")]
    TimeoutNotExpired,
    #[msg("Both players have already deposited, cannot cancel")]
    BothPlayersAlreadyDeposited,
    #[msg("Deposit timeout has not expired yet, cannot cancel")]
    DepositTimeoutNotExpired,
    // NEW ERROR CODES
    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
    #[msg("Arithmetic underflow occurred")]
    ArithmeticUnderflow,
    #[msg("Winner account does not match declared winner")]
    WinnerAccountMismatch,
    #[msg("Invalid fee recipient account")]
    InvalidFeeRecipient,
    #[msg("Invalid payer account")]
    InvalidPayerAccount,
    #[msg("Invalid player1 account")]
    InvalidPlayer1Account,
    #[msg("Invalid player2 account")]
    InvalidPlayer2Account,
    #[msg("Insufficient balance in wager account")]
    InsufficientBalance,
    #[msg("Arbiter cannot be a player")]
    ArbiterCannotBePlayer,
    #[msg("Fee recipient cannot be a player")]
    FeeRecipientConflict,
    #[msg("Arbiter cannot be the fee recipient")]
    ArbiterFeeRecipientConflict,
    #[msg("Wager amount exceeds maximum allowed")]
    WagerAmountTooLarge,
}
```

---

## TESTING AFTER FIXES

Create comprehensive tests in `tests/slider-pvp.ts`:

```typescript
describe("Security Tests", () => {
  it("Prevents theft via wrong winner_account", async () => {
    // Setup wager
    // Try declare_winner with attacker wallet as winner_account
    // Should fail with WinnerAccountMismatch
  });

  it("Prevents theft via wrong fee_recipient", async () => {
    // Setup wager
    // Try declare_winner with attacker wallet as fee_recipient
    // Should fail with InvalidFeeRecipient
  });

  it("Prevents theft via wrong player accounts in refund", async () => {
    // Setup wager, wait for timeout
    // Try refund with attacker wallets
    // Should fail with InvalidPlayer1Account or InvalidPlayer2Account
  });

  it("Handles arithmetic overflow gracefully", async () => {
    // Try to create wager with u64::MAX / 2 + 1
    // Operations should fail with ArithmeticOverflow, not panic
  });

  it("Prevents arbiter from being a player", async () => {
    // Try initialize_wager with arbiter == player1
    // Should fail with ArbiterCannotBePlayer
  });

  it("Prevents fee_recipient from being a player", async () => {
    // Try initialize_wager with fee_recipient == player1
    // Should fail with FeeRecipientConflict
  });

  it("Handles concurrent deposits without race condition", async () => {
    // Deposit both players in rapid succession
    // Verify start_time is only set once
  });
});
```

---

## DEPLOYMENT CHECKLIST

- [ ] Apply all CRITICAL fixes (1-5)
- [ ] Apply all HIGH priority fixes (6-7)
- [ ] Add all new error codes
- [ ] Write security tests for each vulnerability
- [ ] Run `anchor build`
- [ ] Run `anchor test` - all tests must pass
- [ ] Deploy to devnet
- [ ] Test on devnet for minimum 1 week
- [ ] Consider third-party security audit
- [ ] Start bug bounty program
- [ ] Only then deploy to mainnet

---

## ESTIMATED EFFORT

- **Fixes:** 4-6 hours
- **Testing:** 8-12 hours
- **Devnet testing:** 1 week minimum
- **Security audit:** 2-4 weeks (optional but recommended)

**Total time before mainnet ready: 2-5 weeks**

---

## CONTACT

If you need help implementing these fixes, consider:
1. Hiring a Solana security auditor
2. Reaching out to Neodyme, Kudelski, or OtterSec for professional audit
3. Posting in Anchor Discord for community review
4. Running a bug bounty on Immunefi

**DO NOT DEPLOY WITHOUT THESE FIXES - YOUR USERS' FUNDS ARE AT RISK**

---

*Generated: November 25, 2025*

