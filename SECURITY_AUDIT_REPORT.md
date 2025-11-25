# Security Audit Report - Slider PvP Contract

**Contract:** slider_pvp  
**Program ID:** HbatSgiDtdwtnEix8oJzCQMF3WXx4aj2uF7qRg89Brp5  
**Audit Date:** November 25, 2025  
**Auditor:** Comprehensive Security Analysis  

---

## Executive Summary

This security audit identified **15 security issues** ranging from **CRITICAL** to **LOW** severity. The contract has significant vulnerabilities that could lead to fund loss, unauthorized access, and denial of service attacks.

**Risk Level: HIGH** - Multiple critical issues require immediate attention before mainnet deployment.

### Issue Breakdown
- **CRITICAL**: 5 issues
- **HIGH**: 4 issues
- **MEDIUM**: 3 issues
- **LOW**: 3 issues

---

## CRITICAL SEVERITY ISSUES

### 🔴 CRITICAL-1: Missing Account Ownership Validation in `declare_winner`

**Location:** Lines 334-352 (DeclareWinner struct)

**Issue:** The `winner_account`, `fee_recipient`, and `payer_account` use `AccountInfo` with `/// CHECK:` comments but have **NO validation** that these accounts match the actual stored pubkeys in the wager state.

**Vulnerability:**
```rust
#[derive(Accounts)]
pub struct DeclareWinner<'info> {
    #[account(mut)]
    pub wager: Account<'info, Wager>,
    pub arbiter: Signer<'info>,
    /// CHECK: This is the winner account (either player1 or player2)
    #[account(mut)]
    pub winner_account: AccountInfo<'info>,  // ⚠️ NOT VALIDATED!
    /// CHECK: This is the fee recipient account
    #[account(mut)]
    pub fee_recipient: AccountInfo<'info>,   // ⚠️ NOT VALIDATED!
    /// CHECK: This is the payer who initialized the wager
    #[account(mut)]
    pub payer_account: AccountInfo<'info>,   // ⚠️ NOT VALIDATED!
}
```

**Attack Scenario:**
1. Malicious arbiter calls `declare_winner` 
2. Provides their own wallet as `winner_account` instead of actual player
3. Provides their own wallet as `fee_recipient` instead of legitimate fee recipient
4. Steals all funds from the wager

**Impact:** Complete loss of all wagered funds

**Recommendation:**
```rust
#[derive(Accounts)]
pub struct DeclareWinner<'info> {
    #[account(mut)]
    pub wager: Account<'info, Wager>,
    pub arbiter: Signer<'info>,
    /// CHECK: Validated in instruction logic
    #[account(
        mut,
        constraint = winner_account.key() == wager.player1 || winner_account.key() == wager.player2 
            @ ErrorCode::InvalidWinnerAccount
    )]
    pub winner_account: AccountInfo<'info>,
    /// CHECK: Validated against stored fee recipient
    #[account(
        mut,
        constraint = fee_recipient.key() == wager.fee_recipient @ ErrorCode::InvalidFeeRecipient
    )]
    pub fee_recipient: AccountInfo<'info>,
    /// CHECK: Validated against stored payer
    #[account(
        mut,
        constraint = payer_account.key() == wager.payer @ ErrorCode::InvalidPayerAccount
    )]
    pub payer_account: AccountInfo<'info>,
}
```

---

### 🔴 CRITICAL-2: Missing Account Ownership Validation in `refund`

**Location:** Lines 354-372 (Refund struct)

**Issue:** Similar to CRITICAL-1, the `player1`, `player2`, and `payer_account` are not validated against stored values.

**Vulnerability:**
```rust
#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub wager: Account<'info, Wager>,
    /// CHECK: Player 1 account for refund
    #[account(mut)]
    pub player1: AccountInfo<'info>,  // ⚠️ NOT VALIDATED!
    /// CHECK: Player 2 account for refund
    #[account(mut)]
    pub player2: AccountInfo<'info>,  // ⚠️ NOT VALIDATED!
    /// CHECK: This is the payer who initialized the wager
    #[account(mut)]
    pub payer_account: AccountInfo<'info>,  // ⚠️ NOT VALIDATED!
}
```

**Attack Scenario:**
1. Anyone waits for timeout to expire
2. Calls `refund()` with their own wallets as `player1` and `player2`
3. Steals both players' deposits

**Impact:** Complete loss of all wagered funds

**Recommendation:**
```rust
#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub wager: Account<'info, Wager>,
    /// CHECK: Validated against stored player1
    #[account(
        mut,
        constraint = player1.key() == wager.player1 @ ErrorCode::InvalidPlayer1Account
    )]
    pub player1: AccountInfo<'info>,
    /// CHECK: Validated against stored player2
    #[account(
        mut,
        constraint = player2.key() == wager.player2 @ ErrorCode::InvalidPlayer2Account
    )]
    pub player2: AccountInfo<'info>,
    /// CHECK: Validated against stored payer
    #[account(
        mut,
        constraint = payer_account.key() == wager.payer @ ErrorCode::InvalidPayerAccount
    )]
    pub payer_account: AccountInfo<'info>,
}
```

---

### 🔴 CRITICAL-3: Missing Account Ownership Validation in `cancel_wager`

**Location:** Lines 374-392 (CancelWager struct)

**Issue:** Same vulnerability as CRITICAL-1 and CRITICAL-2.

**Attack Scenario:**
1. Wait 30 seconds after wager creation (deposit timeout)
2. Call `cancel_wager()` with attacker's wallets
3. Steal any deposited funds

**Impact:** Loss of deposited funds

**Recommendation:** Add constraints similar to CRITICAL-2.

---

### 🔴 CRITICAL-4: Unchecked Arithmetic Operations with `.unwrap()`

**Location:** Lines 158-161, 214-215

**Issue:** Using `.unwrap()` on `checked_*` operations defeats the purpose of checked arithmetic.

**Vulnerable Code:**
```rust
// Line 158-161 in declare_winner
let total_pool = wager.wager_amount.checked_mul(2).unwrap();  // ⚠️ Will panic if overflow
let winner_amount = total_pool.checked_mul(WINNER_PERCENTAGE).unwrap().checked_div(100).unwrap();
let fee_amount = total_pool.checked_sub(winner_amount).unwrap();

// Line 214-215 in refund
let total_pool = wager.wager_amount.checked_mul(2).unwrap();  // ⚠️ Will panic if overflow
let refund_amount = total_pool.checked_div(2).unwrap();
```

**Attack Scenario:**
1. Create wager with `wager_amount = u64::MAX / 2 + 1`
2. When `checked_mul(2)` returns `None`, program panics
3. Funds locked forever in the PDA

**Impact:** Permanent fund lockup (denial of service)

**Recommendation:**
```rust
// Replace .unwrap() with proper error handling
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
```

Add new error codes:
```rust
#[error_code]
pub enum ErrorCode {
    // ... existing errors ...
    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
    #[msg("Arithmetic underflow occurred")]
    ArithmeticUnderflow,
}
```

---

### 🔴 CRITICAL-5: PDA Rent-Exemption Violation Risk

**Location:** Lines 171-176, 188-190, 218-223, 232-234

**Issue:** Direct lamport manipulation can drain accounts below rent-exemption threshold, causing account deletion.

**Vulnerable Code:**
```rust
// Lines 171-176
**ctx.accounts.wager.to_account_info().try_borrow_mut_lamports()? -= winner_amount;
**ctx.accounts.winner_account.try_borrow_mut_lamports()? += winner_amount;

**ctx.accounts.wager.to_account_info().try_borrow_mut_lamports()? -= fee_amount;
**ctx.accounts.fee_recipient.try_borrow_mut_lamports()? += fee_amount;
```

**Issue:** No check that wager PDA maintains minimum rent-exempt balance before transfers.

**Attack Scenario:**
1. If `winner_amount + fee_amount > total_deposits`, the wager PDA goes below rent exemption
2. Account gets garbage collected
3. Subsequent refund or cancel operations fail

**Impact:** Account deletion, state loss, fund recovery impossible

**Recommendation:**
```rust
// Before any lamport transfer, validate sufficient balance
let wager_balance = ctx.accounts.wager.to_account_info().lamports();
let total_transfer = winner_amount.checked_add(fee_amount)
    .ok_or(ErrorCode::ArithmeticOverflow)?;

require!(
    wager_balance >= total_transfer,
    ErrorCode::InsufficientBalance
);
```

---

## HIGH SEVERITY ISSUES

### 🟠 HIGH-1: Missing Signer Check for Winner Correspondence

**Location:** Lines 138-195 (declare_winner function)

**Issue:** The code calculates `_winner_pubkey` but never uses it to validate the provided `winner_account`.

**Vulnerable Code:**
```rust
let _winner_pubkey = if winner == 1 {  // Line 163-167
    wager.player1
} else {
    wager.player2
};
// Variable calculated but NEVER USED! ⚠️
```

**Issue:** Even if you add constraints to DeclareWinner struct (per CRITICAL-1), an arbiter could still send funds to player2 while declaring player1 as winner (or vice versa).

**Recommendation:**
```rust
let winner_pubkey = if winner == 1 {
    wager.player1
} else {
    wager.player2
};

require!(
    ctx.accounts.winner_account.key() == winner_pubkey,
    ErrorCode::WinnerAccountMismatch
);
```

---

### 🟠 HIGH-2: No Maximum Wager Amount Limit

**Location:** Lines 17-29 (initialize_wager function)

**Issue:** No upper bound on `wager_amount` allows edge cases with arithmetic operations.

**Risk:**
- Very large wagers could cause integer overflow in calculations
- No protection against typos (e.g., entering lamports instead of SOL)
- Could exceed practical PDA balance limits

**Current Validation:**
```rust
require!(wager_amount > 0, ErrorCode::InvalidWagerAmount);  // Only checks > 0
```

**Recommendation:**
```rust
const MAX_WAGER_AMOUNT: u64 = 1_000_000_000_000; // 1000 SOL max

require!(wager_amount > 0, ErrorCode::InvalidWagerAmount);
require!(wager_amount <= MAX_WAGER_AMOUNT, ErrorCode::WagerAmountTooLarge);
```

---

### 🟠 HIGH-3: Arbiter Can Be Same as Player or Fee Recipient

**Location:** Lines 17-29 (initialize_wager function)

**Issue:** No validation that arbiter, players, and fee recipient are different entities.

**Attack Scenario:**
```
player1 = Alice
player2 = Bob
arbiter = Alice  // ⚠️ Conflict of interest!
fee_recipient = Alice  // ⚠️ Alice gets both winner payout AND fees
```

**Impact:** Arbiter with financial interest can unfairly declare themselves winner.

**Recommendation:**
```rust
require!(player1 != player2, ErrorCode::SamePlayer);
require!(arbiter != player1, ErrorCode::ArbiterCannotBePlayer);
require!(arbiter != player2, ErrorCode::ArbiterCannotBePlayer);
require!(fee_recipient != player1, ErrorCode::FeeRecipientCannotBePlayer);
require!(fee_recipient != player2, ErrorCode::FeeRecipientCannotBePlayer);
require!(arbiter != fee_recipient, ErrorCode::ArbiterCannotBeFeeRecipient);
```

---

### 🟠 HIGH-4: Race Condition in Dual Deposit Logic

**Location:** Lines 89-95, 127-132

**Issue:** Both `deposit_player1` and `deposit_player2` check and set `start_time` independently without atomic locking.

**Vulnerable Code:**
```rust
// deposit_player1 (lines 89-95)
if wager.player2_deposited {
    wager.start_time = Clock::get()?.unix_timestamp;  // Set time
}

// deposit_player2 (lines 127-132)
if wager.player1_deposited {
    wager.start_time = Clock::get()?.unix_timestamp;  // Set time again!
}
```

**Issue:** If deposits happen in quick succession, `start_time` gets set twice with different values.

**Scenario:**
1. Player1 deposits at timestamp 1000
2. Player2 deposits at timestamp 1001
3. `start_time` = 1001 (not 1000)
4. Time advantage given to player2 by 1 second

**Recommendation:**
```rust
// Only set start_time once, when transitioning to "both deposited" state
if wager.player2_deposited && wager.start_time == 0 {
    wager.start_time = Clock::get()?.unix_timestamp;
}
```

---

## MEDIUM SEVERITY ISSUES

### 🟡 MEDIUM-1: No Validation for System Program Account

**Location:** All instruction contexts

**Issue:** The `system_program` account is included but never validated or used in most functions.

**Current Code:**
```rust
pub struct DeclareWinner<'info> {
    // ... accounts ...
    pub system_program: Program<'info, System>,  // Passed but unused
}
```

**Risk:** 
- Wasted transaction space and compute
- Could be exploited if future code assumes it's present

**Recommendation:**
- Remove `system_program` from structs where it's not used (DeclareWinner, Refund, CancelWager)
- Only keep it in InitializeWager, DepositPlayer1, DepositPlayer2 where transfers occur

---

### 🟡 MEDIUM-2: Insufficient Event Logging for Audit Trail

**Location:** All functions

**Issue:** Contract uses `msg!()` for logging but doesn't emit structured events.

**Problem:**
- `msg!()` logs are not indexable or queryable
- No way to efficiently track wager history on-chain
- Difficult to verify payout amounts after settlement

**Recommendation:**
```rust
#[event]
pub struct WagerInitialized {
    pub wager_pda: Pubkey,
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub wager_amount: u64,
    pub game_id: u64,
}

#[event]
pub struct WagerSettled {
    pub wager_pda: Pubkey,
    pub winner: u8,
    pub winner_amount: u64,
    pub fee_amount: u64,
    pub timestamp: i64,
}

// Emit in functions:
emit!(WagerInitialized { ... });
emit!(WagerSettled { ... });
```

---

### 🟡 MEDIUM-3: Front-Running Risk in Refund/Cancel Operations

**Location:** Lines 198-239, 242-288

**Issue:** `refund()` and `cancel_wager()` can be called by **anyone** after timeout, creating MEV opportunity.

**Attack Scenario:**
1. Player1 submits refund transaction
2. MEV bot sees transaction in mempool
3. Bot front-runs with higher fee, calling refund first
4. Bot doesn't gain funds but causes player's transaction to fail
5. Griefing attack / denial of service

**Recommendation:**
```rust
// Add optional signer check with incentive
pub fn refund(ctx: Context<Refund>) -> Result<()> {
    // ... existing checks ...
    
    // Optional: Give small incentive to caller
    let caller_incentive = 1_000_000; // 0.001 SOL
    **ctx.accounts.wager.to_account_info().try_borrow_mut_lamports()? -= caller_incentive;
    **ctx.accounts.caller.try_borrow_mut_lamports()? += caller_incentive;
    
    // Then do refunds minus incentive
}
```

Or restrict to authorized parties:
```rust
require!(
    ctx.accounts.caller.key() == wager.player1 ||
    ctx.accounts.caller.key() == wager.player2 ||
    ctx.accounts.caller.key() == wager.arbiter,
    ErrorCode::UnauthorizedRefundCaller
);
```

---

## LOW SEVERITY ISSUES

### 🟢 LOW-1: Magic Numbers Used Instead of Constants

**Location:** Lines 160-161

**Issue:** Hardcoded values `95` and `100` instead of using declared constants.

**Current Code:**
```rust
const WINNER_PERCENTAGE: u64 = 95;
const FEE_PERCENTAGE: u64 = 5;

// But then in code:
let winner_amount = total_pool.checked_mul(WINNER_PERCENTAGE).unwrap().checked_div(100).unwrap();
//                                                                              ^^^ Magic number
```

**Recommendation:**
```rust
const PERCENTAGE_DENOMINATOR: u64 = 100;

let winner_amount = total_pool
    .checked_mul(WINNER_PERCENTAGE)
    .ok_or(ErrorCode::ArithmeticOverflow)?
    .checked_div(PERCENTAGE_DENOMINATOR)
    .ok_or(ErrorCode::ArithmeticOverflow)?;
```

---

### 🟢 LOW-2: Inconsistent Error Messages

**Location:** Error codes section (lines 414-440)

**Issue:** Some errors are very specific, others are generic.

**Examples:**
```rust
#[msg("Unauthorized player")]  // Generic
#[msg("Unauthorized arbiter")]  // Generic
#[msg("Timeout period has expired, cannot declare winner")]  // Very specific
```

**Recommendation:** Standardize error message format for better UX.

---

### 🟢 LOW-3: No Program Upgrade Authority Check

**Location:** Program declaration (line 5)

**Issue:** `declare_id!()` is set but there's no explicit upgrade authority configuration in code.

**Risk:**
- If upgrade authority is retained, contract can be changed post-deployment
- Users have no on-chain guarantee of immutability

**Recommendation:**
- Document upgrade authority status
- If keeping upgrade authority, implement timelock or multisig
- If removing, explicitly revoke authority and document in code comments

---

## ADDITIONAL OBSERVATIONS

### Missing Input Validation

1. **No validation of `game_id`:** Could be 0, could collide if same players use same ID twice
2. **No validation that players/arbiter/fee_recipient are not system program ID**
3. **No checks for PDA derivation correctness in client code**

### Denial of Service Vectors

1. **Clock manipulation:** Relies on `Clock::get()?.unix_timestamp` which can be manipulated on test networks
2. **Account size:** No validation that account has enough space for data

### Best Practice Violations

1. **Comments used instead of proper validation:** Multiple `/// CHECK:` comments without actual validation
2. **Unused variables:** `_winner_pubkey` calculated but never used (line 163)
3. **No program versioning:** Cannot track which version is deployed
4. **No feature flags:** Cannot disable functionality if bugs found

---

## RECOMMENDED FIXES PRIORITY

### Immediate (Before ANY Deployment)
1. ✅ Fix CRITICAL-1, 2, 3: Add account validation constraints
2. ✅ Fix CRITICAL-4: Replace `.unwrap()` with proper error handling
3. ✅ Fix CRITICAL-5: Add rent-exemption checks
4. ✅ Fix HIGH-1: Validate winner account matches winner parameter

### Before Mainnet
5. ✅ Fix HIGH-2: Add maximum wager limit
6. ✅ Fix HIGH-3: Prevent arbiter/fee recipient conflicts of interest
7. ✅ Fix HIGH-4: Fix race condition in start_time setting
8. ✅ Fix MEDIUM-1: Remove unused system_program parameters
9. ✅ Fix MEDIUM-2: Add structured event emissions

### Before Production Scale
10. ✅ Fix MEDIUM-3: Add front-running protection
11. ✅ Fix LOW-1: Replace magic numbers with constants
12. ✅ Comprehensive testing with all edge cases
13. ✅ Third-party security audit
14. ✅ Bug bounty program

---

## TESTING RECOMMENDATIONS

### Required Test Cases

```typescript
// Test CRITICAL-1 fix
it("Rejects declare_winner with wrong winner_account", async () => {
  // Try to pass attacker wallet as winner_account
  // Should fail with InvalidWinnerAccount error
});

it("Rejects declare_winner with wrong fee_recipient", async () => {
  // Try to pass attacker wallet as fee_recipient  
  // Should fail with InvalidFeeRecipient error
});

// Test CRITICAL-4 fix
it("Handles maximum wager amount without overflow", async () => {
  const maxWager = new BN("18446744073709551615"); // u64::MAX
  // Should fail gracefully with ArithmeticOverflow
});

// Test HIGH-3 fix
it("Rejects initialization when arbiter == player1", async () => {
  // Should fail with ArbiterCannotBePlayer
});

// Test HIGH-4 fix
it("Sets start_time only once during concurrent deposits", async () => {
  // Deposit both players rapidly
  // Verify start_time is not overwritten
});
```

---

## CONCLUSION

This contract has **serious security vulnerabilities** that must be addressed before deployment. The most critical issues involve:

1. **Missing account validation** - allows fund theft
2. **Unchecked arithmetic** - allows DoS via panic
3. **Improper lamport handling** - risks account deletion
4. **Conflict of interest scenarios** - allows arbiter manipulation

**Status: NOT PRODUCTION READY**

**Estimated Remediation Time:** 2-3 days for fixes + 1 week for comprehensive testing

---

**Next Steps:**
1. Implement all CRITICAL and HIGH severity fixes
2. Write test cases for each vulnerability
3. Conduct internal code review
4. Consider third-party security audit
5. Deploy to devnet for extended testing (minimum 1 week)
6. Bug bounty program before mainnet

---

*End of Security Audit Report*

