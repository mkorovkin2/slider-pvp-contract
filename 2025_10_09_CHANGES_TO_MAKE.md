# Slider PvP Contract Improvements

**Date:** October 9, 2025  
**Status:** Changes identified during devnet testing  
**Priority:** HIGH - Affects user experience and scalability

---

## 🎯 **Issue #1: Unfair Initialization Cost Distribution (HIGH PRIORITY)**

### **Current Problem:**
The contract deducts initialization costs (~0.002 SOL) from the player pool before calculating winner/fee splits. This penalizes players for operational costs.

### **Current Logic (BAD):**
```rust
// Line ~156-162 in declare_winner()
let total_pool = wager.wager_amount.checked_mul(2).unwrap();

// ❌ BAD: Deduct initialization cost from player pool
let distributable_pool = total_pool.checked_sub(wager.initialization_cost).unwrap();

let winner_amount = distributable_pool.checked_mul(WINNER_PERCENTAGE).unwrap().checked_div(100).unwrap();
let fee_amount = distributable_pool.checked_sub(winner_amount).unwrap();
```

### **Impact on Players:**
- **0.1 SOL wager example:**
  - Total pool: 0.2 SOL
  - After init cost deduction: 0.198 SOL 
  - Winner gets: 0.198 × 95% = **0.1881 SOL** (should be 0.19 SOL)
  - **Winner loses 0.0019 SOL** due to operational costs

### **Proposed Fix:**
```rust
// BETTER: Fee recipient absorbs initialization cost
let total_pool = wager.wager_amount.checked_mul(2).unwrap();

// Calculate from FULL pool (don't penalize players)
let winner_amount = total_pool.checked_mul(WINNER_PERCENTAGE).unwrap().checked_div(100).unwrap();
let gross_fee = total_pool.checked_mul(FEE_PERCENTAGE).unwrap().checked_div(100).unwrap();

// Fee recipient absorbs the operational cost
let net_fee = gross_fee.checked_sub(wager.initialization_cost).unwrap();

// Transfers
**ctx.accounts.vault.try_borrow_mut_lamports()? -= winner_amount;
**ctx.accounts.winner_account.try_borrow_mut_lamports()? += winner_amount;

**ctx.accounts.vault.try_borrow_mut_lamports()? -= net_fee;
**ctx.accounts.fee_recipient.try_borrow_mut_lamports()? += net_fee;

// Initialization cost stays in vault as rent (proper use)
```

### **Benefits of Fix:**
- ✅ **Fair to players:** Winners get full 95% of pool
- ✅ **Expected behavior:** 0.1 SOL deposit → 0.19 SOL payout for winner
- ✅ **Fee recipient responsibility:** Operational costs come from fee earnings
- ✅ **Better UX:** Players see exactly what they expect to win

### **Impact Examples:**
```
0.1 SOL wager (current vs fixed):
├── Current: Winner gets 0.1881 SOL (-0.0019 SOL penalty)
├── Fixed:   Winner gets 0.19 SOL (full amount)
├── Current: Fee recipient gets 0.0099 SOL  
└── Fixed:   Fee recipient gets 0.008 SOL (absorbs 0.002 cost)

1.0 SOL wager:
├── Current: Winner gets 1.881 SOL (-0.002 SOL penalty)
├── Fixed:   Winner gets 1.9 SOL (full amount)
├── Current: Fee recipient gets 0.099 SOL
└── Fixed:   Fee recipient gets 0.097 SOL (minimal impact)
```

---

## 🚨 **Issue #2: Fee Recipient Account Contention (SCALABILITY)**

### **Current Problem:**
All wagers send fees to the same wallet address, creating account write contention at scale.

### **Technical Details:**
```rust
// All declare_winner() calls write to same account
**ctx.accounts.fee_recipient.try_borrow_mut_lamports()? += fee_amount;
```

### **Performance Impact:**
```
10 concurrent wagers:
├── Ideal parallel: ~400ms
├── With contention: ~4 seconds (10x slower)
└── Each transaction waits for previous to complete

100 concurrent wagers:  
├── Ideal parallel: ~400ms
├── With contention: ~40 seconds (100x slower)
└── Essentially serial processing
```

### **Root Cause:**
Solana locks accounts during writes. Multiple transactions writing to the same fee recipient must be processed sequentially, not in parallel.

### **Proposed Solutions:**

#### **Option A: Fee Recipient Pool (RECOMMENDED)**
```typescript
// Frontend/Backend Implementation
class FeeRecipientPool {
  private feeWallets: PublicKey[] = [
    new PublicKey("FeeWallet1..."),
    new PublicKey("FeeWallet2..."), 
    new PublicKey("FeeWallet3..."),
    new PublicKey("FeeWallet4..."),
    new PublicKey("FeeWallet5..."),
  ];
  
  // Deterministically assign fee recipient
  getFeeRecipient(wagerPda: PublicKey): PublicKey {
    const hash = wagerPda.toBuffer();
    const index = hash[0] % this.feeWallets.length;
    return this.feeWallets[index];
  }
  
  // Periodically consolidate to main treasury
  async consolidateFees(): Promise<void> {
    for (const wallet of this.feeWallets) {
      await transferToMainTreasury(wallet);
    }
  }
}
```

**Benefits:**
- ✅ **5x throughput improvement** with 5 wallets
- ✅ **No contract changes** required
- ✅ **Easy to implement** in frontend/backend
- ✅ **Scalable:** Can expand to 10-20 wallets

**Implementation:**
- Create 5-20 fee recipient wallets
- Assign fees deterministically based on wager PDA
- Run consolidation script daily/weekly

#### **Option B: Deferred Fee Collection**
```rust
// Contract modification required
pub fn declare_winner(ctx: Context<DeclareWinner>, winner: u8) -> Result<()> {
    // ... existing logic ...
    
    // Only transfer winner amount, leave fee in vault
    **ctx.accounts.vault.try_borrow_mut_lamports()? -= winner_amount;
    **ctx.accounts.winner_account.try_borrow_mut_lamports()? += winner_amount;
    
    // Don't transfer fee here - collect later in batch
    wager.fee_collected = false;
    wager.is_settled = true;
    
    Ok(())
}

// New instruction for batch fee collection
pub fn collect_fees(ctx: Context<CollectFees>) -> Result<()> {
    // Batch collect from multiple settled wagers
}
```

---

## 📊 **Priority Assessment**

### **Issue #1: Fee Structure (CRITICAL)**
- **Impact:** Directly affects user payouts
- **User Experience:** Players get less than advertised
- **Effort:** Medium (requires contract redeployment)
- **Timeline:** Should be fixed before mainnet

### **Issue #2: Scalability (IMPORTANT)**  
- **Impact:** Becomes critical at 10+ concurrent wagers
- **Current Scale:** Not an issue yet (single test user)
- **Effort:** Low (frontend/backend only for Option A)
- **Timeline:** Implement before significant user adoption

---

## 🛠️ **Implementation Plan**

### **Phase 1: Fix Fee Structure (Contract Change)**
1. **Modify `declare_winner()` logic:**
   - Calculate winner amount from full pool (95% of total)
   - Calculate net fee after subtracting initialization cost
   - Ensure players get full expected payouts

2. **Update constants if needed:**
   - Consider if FEE_PERCENTAGE needs adjustment 
   - Document the change in behavior

3. **Test on devnet:**
   - Verify winner gets exactly 95% of full pool
   - Verify fee recipient gets 5% minus init costs
   - Confirm no SOL is lost

4. **Update documentation:**
   - Revise payout calculations in README
   - Update frontend expectations

### **Phase 2: Address Scalability (Infrastructure)**
1. **Implement fee recipient pool:**
   - Generate 5-10 fee wallets
   - Modify frontend to distribute fees across wallets
   - Create consolidation script

2. **Monitor performance:**
   - Track transaction success rates
   - Measure latency under concurrent load
   - Scale wallet pool as needed

---

## 📝 **Technical Specifications**

### **Fixed declare_winner() Logic:**
```rust
pub fn declare_winner(ctx: Context<DeclareWinner>, winner: u8) -> Result<()> {
    let wager = &ctx.accounts.wager;
    
    // ... existing validation ...
    
    let total_pool = wager.wager_amount.checked_mul(2).unwrap();
    
    // NEW: Calculate from full pool, don't penalize players
    let winner_amount = total_pool.checked_mul(WINNER_PERCENTAGE).unwrap().checked_div(100).unwrap();
    let gross_fee = total_pool.checked_mul(FEE_PERCENTAGE).unwrap().checked_div(100).unwrap();
    
    // NEW: Fee recipient absorbs initialization cost
    let net_fee = gross_fee.checked_sub(wager.initialization_cost).unwrap();
    
    // Transfer winner amount (full 95%)
    **ctx.accounts.vault.try_borrow_mut_lamports()? -= winner_amount;
    **ctx.accounts.winner_account.try_borrow_mut_lamports()? += winner_amount;
    
    // Transfer net fee (5% minus costs)
    **ctx.accounts.vault.try_borrow_mut_lamports()? -= net_fee;
    **ctx.accounts.fee_recipient.try_borrow_mut_lamports()? += net_fee;
    
    // Remaining SOL stays in vault as rent (proper)
    
    wager.winner = Some(winner);
    wager.is_settled = true;
    
    Ok(())
}
```

### **Expected Results After Fix:**
```
0.1 SOL per player wager:
├── Total pool: 0.2 SOL
├── Winner gets: 0.19 SOL (95% of full pool)
├── Winner net: +0.09 SOL profit (exactly as advertised)
├── Fee recipient gets: 0.008 SOL (5% minus 0.002 init cost)
└── Vault retains: 0.002 SOL (rent reserve)
```

---

## ⏰ **Timeline & Next Steps**

### **Immediate (This Week):**
- [ ] Implement fee structure fix in contract
- [ ] Test on devnet with corrected payouts
- [ ] Verify players get full expected amounts

### **Before Production (Next 2 Weeks):**
- [ ] Implement fee recipient pool (5-10 wallets)
- [ ] Load test with 10+ concurrent wagers
- [ ] Set up fee consolidation automation

### **Before Mainnet (Before Launch):**
- [ ] Security audit with corrected fee logic
- [ ] Performance testing at scale
- [ ] Frontend integration with new payout expectations

---

## 🎯 **Success Metrics After Changes**

### **Fee Structure Fix:**
- ✅ Winner of 0.1 SOL wager gets exactly +0.09 SOL profit
- ✅ Players get full advertised percentage (95%)
- ✅ Fee recipient absorbs operational costs (fair)

### **Scalability Fix:** 
- ✅ 10 concurrent wagers process in <1 second
- ✅ No transaction failures due to account contention
- ✅ Linear performance scaling with fee wallet pool

**These changes will make the contract production-ready for real user adoption.**
