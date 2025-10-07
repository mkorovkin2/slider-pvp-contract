# Known Bottlenecks & Scalability Issues

## Overview

This document outlines potential performance bottlenecks and scalability concerns in the Slider PvP contract, particularly when handling concurrent operations at scale (100+ simultaneous wagers).

---

## 🚨 Critical Bottleneck: Fee Recipient Account Contention

### Problem

**Impact:** HIGH - Directly limits throughput  
**Severity:** CRITICAL at scale (100+ concurrent wagers)

When multiple `declare_winner()` transactions send funds to the **same fee_recipient account**, Solana must process these transactions **sequentially** due to account locking.

### Technical Details

```rust
// In declare_winner() - Line ~167-176
Transfer {
    from: ctx.accounts.wager.to_account_info(),
    to: ctx.accounts.fee_recipient.to_account_info(),  // ← SHARED ACCOUNT!
}
```

**Account Write Lock Behavior:**
- Solana locks accounts that are being written to
- Multiple transactions writing to the same account cannot execute in parallel
- They must be processed sequentially in different block slots

### Performance Impact

```
Single Fee Recipient:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10 concurrent declare_winner() calls:
- Ideal parallel: ~400ms total
- With contention: ~4 seconds total (10x slower)
- Each transaction waits for previous to complete

100 concurrent wagers:
- Serial processing only
- ~40 seconds instead of ~400ms
- Users experience delays and higher priority fees
```

### Solutions

#### Option 1: Multiple Fee Recipient Accounts (Recommended)

**Implementation:**
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
  
  // Deterministically assign fee recipient based on wager ID
  getFeeRecipient(wagerPda: PublicKey): PublicKey {
    const hash = wagerPda.toBuffer();
    const index = hash[0] % this.feeWallets.length;
    return this.feeWallets[index];
  }
  
  // Periodically consolidate all fee wallets to treasury
  async consolidateFees(): Promise<void> {
    for (const wallet of this.feeWallets) {
      await transferToMainTreasury(wallet);
    }
  }
}
```

**Benefits:**
- ✅ 5 fee wallets = 5x throughput improvement
- ✅ No contract changes required
- ✅ Easy to implement
- ✅ Can scale to 10-20 wallets if needed

**Tradeoffs:**
- ⚠️ Must manage multiple private keys (or use PDAs)
- ⚠️ Need periodic consolidation to main treasury
- ⚠️ Slightly more complex infrastructure

#### Option 2: Deferred Fee Collection

**Implementation:**
```rust
// Requires contract modification
pub struct Wager {
    // ... existing fields
    pub fee_collected: bool,  // NEW FIELD
}

// Modify declare_winner to NOT transfer fee
pub fn declare_winner(ctx: Context<DeclareWinner>, winner: u8) -> Result<()> {
    // ... existing winner transfer logic ...
    
    // Don't transfer fee here, just mark available for collection
    wager.fee_collected = false;
    Ok(())
}

// New instruction: collect fees in batches
pub fn collect_fee(ctx: Context<CollectFee>) -> Result<()> {
    let wager = &mut ctx.accounts.wager;
    require!(wager.is_settled, ErrorCode::WagerNotSettled);
    require!(!wager.fee_collected, ErrorCode::FeeAlreadyCollected);
    
    let fee_amount = /* calculate 5% */;
    // Transfer fee from wager PDA to fee_recipient
    // ...
    
    wager.fee_collected = true;
    Ok(())
}
```

**Benefits:**
- ✅ Winner declarations can all process in parallel
- ✅ Fee collection batched at convenient times
- ✅ Better user experience (faster winner declaration)

**Tradeoffs:**
- ❌ Requires contract redeployment
- ❌ More complex state management
- ❌ Fees must be collected separately (operational overhead)
- ⚠️ Wager PDAs remain rent-exempt until fee collected

#### Option 3: Fee Recipient PDAs

**Implementation:**
```rust
// Use unique PDA per wager for fees
#[derive(Accounts)]
pub struct DeclareWinner<'info> {
    // ... existing accounts ...
    
    #[account(
        init,
        payer = arbiter,
        space = 8,
        seeds = [b"fee", wager.key().as_ref()],
        bump
    )]
    pub fee_escrow: Account<'info, FeeEscrow>,
}

// Store fees in unique PDAs, collect later
```

**Benefits:**
- ✅ Perfect parallelism (unique account per wager)
- ✅ On-chain audit trail per wager

**Tradeoffs:**
- ❌ Requires major contract changes
- ❌ More complex fee collection process
- ❌ Higher rent costs (more accounts)

---

## ⚠️ Secondary Bottleneck: Single Arbiter Signing Load

### Problem

**Impact:** MEDIUM - Affects arbiter operations  
**Severity:** MODERATE at scale (50+ concurrent wagers)

A single arbiter wallet must sign all winner declaration transactions. While this doesn't cause Solana-level contention (arbiter is read-only), it creates client-side bottlenecks.

### Performance Impact

```
Single Arbiter Signing 100 Transactions:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Transaction signing: ~1-5ms per signature
- RPC submission rate limits: ~40 TPS typical
- Total time: 2-3 seconds for 100 transactions
- Not a blockchain bottleneck, but operational overhead
```

### Solutions

#### Option 1: Multiple Arbiter Wallets

```typescript
class ArbiterPool {
  private arbiters: Keypair[] = [
    arbiter1, arbiter2, arbiter3, arbiter4, arbiter5
  ];
  
  private currentIndex = 0;
  
  getNextArbiter(): Keypair {
    return this.arbiters[this.currentIndex++ % this.arbiters.length];
  }
  
  // Assign arbiter round-robin during wager initialization
  async initializeWager(player1, player2, wagerAmount): Promise<void> {
    const arbiter = this.getNextArbiter();
    await program.methods
      .initializeWager(player1, player2, arbiter.publicKey, ...)
      .rpc();
  }
}
```

**Benefits:**
- ✅ Distributes signing load
- ✅ 5 arbiters = 5x signing throughput
- ✅ No contract changes required

**Tradeoffs:**
- ⚠️ Must secure multiple private keys
- ⚠️ Need robust key management system
- ⚠️ Game server must track which arbiter for which wager

#### Option 2: Batch Transaction Signing

```typescript
async function batchDeclareWinners(results: WagerResult[]) {
  // Sign all transactions first
  const transactions = results.map(r => 
    program.methods
      .declareWinner(r.winner)
      .accounts({ /* ... */ })
      .transaction()
  );
  
  // Use versioned transactions for better performance
  const versionedTxs = await Promise.all(
    transactions.map(tx => createVersionedTransaction(tx))
  );
  
  // Submit in parallel with Jito bundles or similar
  await submitBundleTransactions(versionedTxs);
}
```

---

## 📊 Theoretical Maximum Throughput

### Current Implementation (Single Fee Recipient)

```
Bottleneck: Fee recipient account writes
Maximum TPS: ~2,500 theoretical, ~500-1,000 practical
Concurrent Wagers: Limited by sequential processing
```

### With Fee Recipient Pool (5 wallets)

```
Improvement: 5x throughput
Maximum TPS: ~2,500-5,000 practical
Concurrent Wagers: 1,000+ simultaneously no problem
```

### With Fee Recipient Pool (20 wallets)

```
Improvement: 20x throughput
Maximum TPS: ~10,000+ practical
Concurrent Wagers: 10,000+ simultaneously
Approaching Solana's theoretical limits
```

---

## 🎯 Recommendations by Scale

### Small Scale (< 10 concurrent wagers)

**Action:** None required  
**Reason:** Current implementation handles this easily

### Medium Scale (10-100 concurrent wagers)

**Action:** Implement Fee Recipient Pool (5 wallets)  
**Priority:** HIGH  
**Effort:** Low (frontend/backend only, no contract changes)

### Large Scale (100-1,000 concurrent wagers)

**Action:** 
1. Fee Recipient Pool (10-20 wallets)
2. Multiple Arbiter Wallets (5+)
3. Transaction batching and optimization

**Priority:** CRITICAL  
**Effort:** Medium

### Massive Scale (1,000+ concurrent wagers)

**Action:**
1. Fee Recipient Pool (20+ wallets)
2. Deferred Fee Collection (contract upgrade)
3. Dedicated infrastructure with Jito/MEV optimization
4. Multiple RPC endpoints

**Priority:** CRITICAL  
**Effort:** High (requires contract redeployment)

---

## 📝 Implementation Checklist

### Phase 1: Quick Wins (No Contract Changes)
- [ ] Implement fee recipient pool (5 wallets)
- [ ] Add fee consolidation cron job
- [ ] Monitor throughput metrics
- [ ] Load test with 50 concurrent wagers

### Phase 2: Scaling Up (If Needed)
- [ ] Expand fee recipient pool to 10-20 wallets
- [ ] Implement multiple arbiter wallets
- [ ] Add transaction batching
- [ ] Use versioned transactions (v0)
- [ ] Integrate Jito bundles for guaranteed execution

### Phase 3: Contract Upgrade (If Massive Scale)
- [ ] Implement deferred fee collection
- [ ] Add fee_collected field to Wager struct
- [ ] Create collect_fee instruction
- [ ] Deploy to devnet for testing
- [ ] Migrate mainnet with state transition plan

---

## 🔍 Monitoring & Metrics

### Key Metrics to Track

```typescript
// Track these metrics in your monitoring system
interface PerformanceMetrics {
  // Transaction Success Rate
  declareWinnerSuccessRate: number;
  declareWinnerFailureRate: number;
  
  // Timing Metrics
  averageDeclareWinnerLatency: number;  // Should be < 1 second
  p95DeclareWinnerLatency: number;      // Should be < 2 seconds
  p99DeclareWinnerLatency: number;      // Should be < 5 seconds
  
  // Throughput Metrics
  concurrentWagers: number;
  wagersPerMinute: number;
  
  // Fee Distribution
  feeRecipientBalances: Map<PublicKey, number>;
  lastConsolidationTime: Date;
}
```

### Alerts to Set Up

1. **Critical:** `declareWinnerSuccessRate < 95%`
2. **Warning:** `p95DeclareWinnerLatency > 3 seconds`
3. **Warning:** `concurrentWagers > 50` (without fee pool)
4. **Info:** `Any fee_recipient balance > 10 SOL` (needs consolidation)

---

## 💡 Additional Optimization Ideas

### 1. Optimistic UI Updates
```typescript
// Don't wait for transaction confirmation for UI updates
// Use websocket subscriptions for real-time state
```

### 2. RPC Load Balancing
```typescript
const rpcEndpoints = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana",
];
// Rotate through endpoints to avoid rate limits
```

### 3. Priority Fees During High Contention
```typescript
// Dynamically adjust priority fees based on contention
const priorityFee = calculateOptimalPriorityFee(
  concurrentWagers,
  feeRecipientContention
);
```

---

## 📚 References

- [Solana Account Locking](https://docs.solana.com/implemented-proposals/readonly-accounts)
- [Sealevel Parallel Runtime](https://docs.solana.com/cluster/synchronization)
- [Versioned Transactions](https://docs.solana.com/developing/versioned-transactions)
- [Jito MEV](https://jito.wtf/)

---

**Last Updated:** 2025-10-07  
**Status:** Bottlenecks identified, solutions proposed  
**Next Action:** Implement Fee Recipient Pool for medium scale deployment

