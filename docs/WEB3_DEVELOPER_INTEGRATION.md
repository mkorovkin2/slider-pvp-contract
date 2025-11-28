# Slider PvP Contract - Web3 Developer Integration Guide

**Trustless SOL wager/escrow smart contract on Solana with automatic winner payouts**

## 🎯 Quick Overview

The Slider PvP contract enables **trustless 1v1 wagers** where:
- Two players deposit equal SOL amounts into escrow
- An arbiter declares the winner within 120 seconds  
- Winner gets **95%**, fee recipient gets **5%** automatically
- **No funds can be stolen** - all controlled by smart contract logic

**Program ID:** `5Nz9sKCgrJ4ToYizMkud3pscBTGf5XJXmHvJvhEg4UgN`

---

## 🏗️ Architecture: Unified PDA System

### Wager PDA (State & Funds)
- **Seeds:** `["wager", player1_pubkey, player2_pubkey, game_id_bytes]`
- **Purpose:** Stores game state, players, arbiter, timing, settlement status AND holds the deposited SOL.
- **Size:** ~175 bytes
- **Rent:** Paid by payer at initialization, fully refunded to payer at settlement.

**Why Unified PDA?** Reduces complexity and transaction size by keeping state and funds in a single account.

---

## 🔧 Core Instructions

### 1. `initialize_wager`
Creates a new wager between two players.

**Parameters:**
- `player1: Pubkey` - First player's address
- `player2: Pubkey` - Second player's address  
- `arbiter: Pubkey` - Authorized winner declarer
- `fee_recipient: Pubkey` - Receives 5% of pool
- `wager_amount: u64` - Amount each player deposits (lamports)
- `game_id: u64` - Unique identifier for the game

**Accounts:**
- `wager` (write, PDA) - Created wager account
- `payer` (write, signer) - Transaction fee payer (pays rent)
- `system_program` - Solana System Program

### 2. `deposit_player1` / `deposit_player2`
Players deposit their wager amounts.

**Accounts:**
- `wager` (write, PDA) - Wager state account (receives SOL)
- `player1/player2` (write, signer) - Depositing player
- `system_program` - System Program

**Timing:** Both players have 30 seconds from wager creation to deposit.

### 3. `declare_winner`
Arbiter declares winner within 120-second window.

**Parameters:**
- `winner: u8` - 1 for player1, 2 for player2

**Accounts:**
- `wager` (write, PDA) - Wager account (source of payout)
- `arbiter` (signer) - Must match wager.arbiter
- `winner_account` (write) - Receives 95% of distributable pool
- `fee_recipient` (write) - Receives 5% of distributable pool
- `payer_account` (write) - Receives rent refund
- `system_program` - System Program

### 4. `refund`
Refunds both players after 120-second timeout expires.

**Accounts:**
- `wager` (write, PDA) - Wager account (source of refunds)
- `arbiter` (signer) - Must match wager.arbiter (in current version)
- `player1` (write) - Refund recipient
- `player2` (write) - Refund recipient  
- `payer_account` (write) - Receives rent refund
- `system_program` - System Program

**Timing:** Can only be called after 120 seconds from when both players deposited.

### 5. `cancel_wager`
Cancels wager and refunds deposited player if opponent doesn't show.

**Accounts:** Same as refund

**Timing:** Can only be called after 30 seconds from wager creation if not both players deposited.

---

## 💰 Economics & Cost Structure

### Initialization Cost
- **Wager PDA rent:** ~0.002 SOL (Paid by Payer)
- **Refund:** Fully refunded to Payer upon settlement (Winner Declared, Refund, or Cancel).

### Distribution Formula
```javascript
const totalPool = wagerAmount * 2;
// Rent is handled separately (returned to payer)
const winnerAmount = totalPool * 0.95;
const feeAmount = totalPool * 0.05;
```

### Examples
| Wager Size | Total Pool | Winner Gets | Fee Gets | Payer Gets |
|------------|------------|-------------|----------|------------|
| 0.1 SOL    | 0.2 SOL    | 0.19 SOL    | 0.01 SOL | +Rent Refund |
| 0.5 SOL    | 1.0 SOL    | 0.95 SOL    | 0.05 SOL | +Rent Refund |
| 10 SOL     | 20.0 SOL   | 19.0 SOL    | 1.00 SOL | +Rent Refund |

---

## 🚀 Integration Examples

### Basic Setup (TypeScript)
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { SliderPvp } from './idl/slider_pvp';
import idl from './idl/slider_pvp.json';

const PROGRAM_ID = new PublicKey('5Nz9sKCgrJ4ToYizMkud3pscBTGf5XJXmHvJvhEg4UgN');

// Initialize program
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
const program = new Program<SliderPvp>(idl as any, PROGRAM_ID, provider);

// Derive PDA
function getWagerPDA(player1: PublicKey, player2: PublicKey, gameId: BN) {
  const [wagerPda] = PublicKey.findProgramAddressSync(
    [
        Buffer.from('wager'), 
        player1.toBuffer(), 
        player2.toBuffer(),
        gameId.toArrayLike(Buffer, 'le', 8)
    ],
    PROGRAM_ID
  );
  return wagerPda;
}
```

### Create Wager
```typescript
async function createWager(
  player1: PublicKey,
  player2: PublicKey,
  arbiter: PublicKey,
  feeRecipient: PublicKey,
  wagerAmountSol: number,
  gameId: number
) {
  const gameIdBn = new BN(gameId);
  const wagerPda = getWagerPDA(player1, player2, gameIdBn);
  const wagerAmount = new BN(wagerAmountSol * web3.LAMPORTS_PER_SOL);

  return await program.methods
    .initializeWager(player1, player2, arbiter, feeRecipient, wagerAmount, gameIdBn)
    .accounts({
      wager: wagerPda,
      payer: provider.wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
}
```

### Player Deposits
```typescript
async function playerDeposit(
  player1: PublicKey, 
  player2: PublicKey, 
  gameId: number,
  isPlayer1: boolean
) {
  const gameIdBn = new BN(gameId);
  const wagerPda = getWagerPDA(player1, player2, gameIdBn);
  const method = isPlayer1 ? 'depositPlayer1' : 'depositPlayer2';
  const playerKey = isPlayer1 ? 'player1' : 'player2';

  return await program.methods[method]()
    .accounts({
      wager: wagerPda,
      [playerKey]: provider.wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
}
```

### Declare Winner
```typescript
async function declareWinner(
  player1: PublicKey,
  player2: PublicKey, 
  gameId: number,
  winner: 1 | 2
) {
  const gameIdBn = new BN(gameId);
  const wagerPda = getWagerPDA(player1, player2, gameIdBn);
  
  // Fetch wager data to get winner address and fee recipient
  const wagerAccount = await program.account.wager.fetch(wagerPda);
  const winnerAccount = winner === 1 ? wagerAccount.player1 : wagerAccount.player2;

  return await program.methods
    .declareWinner(winner)
    .accounts({
      wager: wagerPda,
      arbiter: provider.wallet.publicKey,
      winnerAccount,
      feeRecipient: wagerAccount.feeRecipient,
      payerAccount: wagerAccount.payer,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
}
```

### Get Wager Status
```typescript
async function getWagerStatus(player1: PublicKey, player2: PublicKey, gameId: number) {
  const gameIdBn = new BN(gameId);
  const wagerPda = getWagerPDA(player1, player2, gameIdBn);
  
  try {
    const wagerAccount = await program.account.wager.fetch(wagerPda);
    const now = Math.floor(Date.now() / 1000);
    
    // Calculate time remaining
    let timeRemaining: number | null = null;
    if (wagerAccount.player1Deposited && wagerAccount.player2Deposited) {
      const startTime = wagerAccount.startTime.toNumber();
      const elapsed = now - startTime;
      timeRemaining = Math.max(0, 120 - elapsed);
    }
    
    return {
      exists: true,
      player1: wagerAccount.player1,
      player2: wagerAccount.player2,
      arbiter: wagerAccount.arbiter,
      feeRecipient: wagerAccount.feeRecipient,
      wagerAmount: wagerAccount.wagerAmount.toNumber() / web3.LAMPORTS_PER_SOL,
      player1Deposited: wagerAccount.player1Deposited,
      player2Deposited: wagerAccount.player2Deposited,
      isSettled: wagerAccount.isSettled,
      winner: wagerAccount.winner,
      timeRemaining,
      creationTime: wagerAccount.creationTime.toNumber(),
      startTime: wagerAccount.startTime.toNumber(),
    };
  } catch (error) {
    return { exists: false };
  }
}
```

---

## ⚠️ Error Handling

### Common Errors & Solutions

| Error Code | Error Message | Cause | Solution |
|------------|---------------|--------|----------|
| 6000 | SamePlayer | player1 == player2 | Use different addresses |
| 6001 | InvalidWagerAmount | wager_amount == 0 | Set amount > 0 |
| 6002 | AlreadyDeposited | Player deposited twice | Check deposit status first |
| 6003 | UnauthorizedPlayer | Wrong player depositing | Use correct player wallet |
| 6004 | WagerAlreadySettled | Modifying settled wager | Check settlement status |
| 6006 | UnauthorizedArbiter | Wrong arbiter declaring | Use correct arbiter wallet |
| 6008 | TimeoutExpired | Declaring after timeout | Use refund() instead |
| 6009 | TimeoutNotExpired | Refunding too early | Wait for timeout |

### Error Parsing
```typescript
function parseContractError(error: any): string {
  if (error.error?.errorMessage) {
    return error.error.errorMessage;
  }
  if (error.message) {
    return error.message;
  }
  return 'Unknown error occurred';
}
```

---

## 🔒 Security Considerations

### Access Control
- **Only arbiter** can declare winners
- **Only players** can make their own deposits  
- **No admin keys** - all rules enforced by contract

### Timeout Protection
- **30 seconds** for both players to deposit (prevents no-shows)
- **120 seconds** for arbiter to declare winner (prevents stalling)
- **Automatic refunds** available after timeouts expire

### Fund Safety
- **PDA escrow** - no private keys can access funds
- **Deterministic addresses** - unique per player pair
- **State validation** - prevents double spending, invalid states
- **Rent Refund** - initialization costs returned to payer

---

## 🚀 Production Deployment

### Networks
- **Localnet:** `http://127.0.0.1:8899`
- **Devnet:** `https://api.devnet.solana.com` 
- **Mainnet:** `https://api.mainnet-beta.solana.com`

### Pre-Launch Checklist
- [ ] Security audit completed
- [ ] Extended testing on devnet
- [ ] Fee recipient wallet configured
- [ ] Arbiter infrastructure ready
- [ ] Monitoring/alerting setup
- [ ] Legal compliance reviewed

### Integration Testing
Use the provided test scripts in `/devnet-testing/`:
```bash
# Test contract deployment
node simple-test.js

# Fund test wallets  
node fund-players.js

# Execute full wager flow with real SOL
node full-test.js
```

---

## 📊 Performance & Limits

### Transaction Costs
- **Initialize:** ~15,000 compute units (~0.000005 SOL)
- **Deposit:** ~8,000 compute units (~0.000005 SOL)  
- **Declare Winner:** ~10,000 compute units (~0.000005 SOL)

### Scalability
- **No global state** - unlimited parallel wagers
- **Account contention:** Fee recipient only (use multiple wallets for scale)
- **Throughput:** Limited by Solana TPS, not contract design

### Storage
- **Per wager:** ~175 bytes (Wager PDA)
- **Cleanup:** Account closed and rent refunded after settlement

---

## 🎯 Common Integration Patterns

### 1. Gaming Platform
```typescript
// Track multiple wagers, manage tournaments
class WagerManager {
  async createTournamentWager(gameId: string, players: PublicKey[]) {
    // Create wager with game-specific arbiter
  }
  
  async handleGameResult(gameId: string, winner: number) {
    // Arbiter declares winner based on game outcome
  }
}
```

### 2. Prediction Market
```typescript
// Use wagers for event predictions
async function createPredictionWager(eventId: string, predictor1: PublicKey, predictor2: PublicKey) {
  // Oracle acts as arbiter
  const oracleWallet = new PublicKey('ORACLE_ADDRESS');
  return await createWager(predictor1, predictor2, oracleWallet, feeWallet, amount, eventId);
}
```

### 3. Skill-Based Challenges
```typescript
// Challenge system with stake
class SkillChallenge {
  async createChallenge(challenger: PublicKey, challenged: PublicKey, skillType: string) {
    // Skill-specific arbiter validates results
    const arbiter = SKILL_ARBITERS[skillType];
    return await createWager(challenger, challenged, arbiter, platformWallet, stake, challengeId);
  }
}
```

---

## 🔗 Resources & Support

### Development Tools
- **IDL:** `/target/idl/slider_pvp.json`
- **Types:** `/target/types/slider_pvp.ts`  
- **Examples:** `/devnet-testing/`

### Testing
- **Unit Tests:** `anchor test`
- **Integration Tests:** `/devnet-testing/`
- **Test Wallets:** Pre-funded keypairs in testing directory

### Documentation
- **Architecture:** `/docs/ARCHITECTURE.md`
- **Deployment:** `/docs/DEPLOYMENT.md`
- **Testing Guide:** `/devnet-testing/TESTING_GUIDE.md`

### Getting Help
- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions  

---

**Contract Version:** 1.1.0 (Unified PDA)
**Last Updated:** November 2025
**License:** MIT
