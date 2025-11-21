# Slider PvP Contract - Web3 Developer Integration Guide

**Trustless SOL wager/escrow smart contract on Solana with automatic winner payouts**

## 🎯 Quick Overview

The Slider PvP contract enables **trustless 1v1 wagers** where:
- Two players deposit equal SOL amounts into escrow
- An arbiter declares the winner within 120 seconds  
- Winner gets **95%**, fee recipient gets **5%** automatically
- **No funds can be stolen** - all controlled by smart contract logic

**Program ID:** `9EeZ1eFrs8QAop7c6ihE4CiXenjVpGPdmFyv6w3XnmcT`

---

## 🏗️ Architecture: Dual-PDA System

### Wager PDA (State Storage)
- **Seeds:** `["wager", player1_pubkey, player2_pubkey]`
- **Purpose:** Stores game state, players, arbiter, timing, settlement status
- **Size:** 175 bytes (~0.00116 SOL rent)

### Vault PDA (SOL Storage)  
- **Seeds:** `["vault", player1_pubkey, player2_pubkey]`
- **Purpose:** Holds deposited SOL only (no data)
- **Size:** 0 bytes (~0.00089 SOL rent)

**Why Dual PDAs?** Solana requires separate accounts for data vs SOL storage for efficient transfers.

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

**Accounts:**
- `wager` (write, PDA) - Created wager account
- `vault` (write, PDA) - Created vault account
- `payer` (write, signer) - Transaction fee payer
- `system_program` - Solana System Program

### 2. `deposit_player1` / `deposit_player2`
Players deposit their wager amounts.

**Accounts:**
- `wager` (write, PDA) - Wager state account
- `vault` (write, PDA) - Receives SOL deposit
- `player1/player2` (write, signer) - Depositing player
- `system_program` - System Program

**Timing:** Both players have 30 seconds from wager creation to deposit.

### 3. `declare_winner`
Arbiter declares winner within 120-second window.

**Parameters:**
- `winner: u8` - 1 for player1, 2 for player2

**Accounts:**
- `wager` (write, PDA) - Wager account
- `vault` (write, PDA) - Source of payout
- `arbiter` (signer) - Must match wager.arbiter
- `winner_account` (write) - Receives 95% of distributable pool
- `fee_recipient` (write) - Receives 5% of distributable pool
- `system_program` - System Program

### 4. `refund`
Refunds both players after 120-second timeout expires.

**Accounts:**
- `wager` (write, PDA) - Wager account
- `vault` (write, PDA) - Source of refunds
- `player1` (write) - Refund recipient
- `player2` (write) - Refund recipient  
- `system_program` - System Program

**Timing:** Can only be called after 120 seconds from when both players deposited.

### 5. `cancel_wager`
Cancels wager and refunds deposited player if opponent doesn't show.

**Accounts:** Same as refund

**Timing:** Can only be called after 30 seconds from wager creation if not both players deposited.

---

## 💰 Economics & Cost Structure

### Initialization Cost
- **Wager PDA rent:** ~0.00116 SOL
- **Vault PDA rent:** ~0.00089 SOL
- **Total:** ~0.00205 SOL per wager

### Distribution Formula
```javascript
const totalPool = wagerAmount * 2;
const distributablePool = totalPool - initializationCost;
const winnerAmount = distributablePool * 0.95;
const feeAmount = distributablePool * 0.05;
```

### Examples
| Wager Size | Total Pool | Init Cost | Winner Gets | Fee Gets |
|------------|------------|-----------|-------------|----------|
| 0.1 SOL    | 0.2 SOL    | 0.002 SOL | 0.188 SOL   | 0.010 SOL |
| 0.5 SOL    | 1.0 SOL    | 0.002 SOL | 0.948 SOL   | 0.050 SOL |
| 10 SOL     | 20.0 SOL   | 0.002 SOL | 18.998 SOL  | 1.000 SOL |

---

## 🚀 Integration Examples

### Basic Setup (TypeScript)
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { SliderPvp } from './idl/slider_pvp';
import idl from './idl/slider_pvp.json';

const PROGRAM_ID = new PublicKey('9EeZ1eFrs8QAop7c6ihE4CiXenjVpGPdmFyv6w3XnmcT');

// Initialize program
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
const program = new Program<SliderPvp>(idl as any, PROGRAM_ID, provider);

// Derive PDAs
function getPDAs(player1: PublicKey, player2: PublicKey) {
  const [wagerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('wager'), player1.toBuffer(), player2.toBuffer()],
    PROGRAM_ID
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), player1.toBuffer(), player2.toBuffer()],
    PROGRAM_ID
  );
  return { wagerPda, vaultPda };
}
```

### Create Wager
```typescript
async function createWager(
  player1: PublicKey,
  player2: PublicKey,
  arbiter: PublicKey,
  feeRecipient: PublicKey,
  wagerAmountSol: number
) {
  const { wagerPda, vaultPda } = getPDAs(player1, player2);
  const wagerAmount = new BN(wagerAmountSol * web3.LAMPORTS_PER_SOL);

  return await program.methods
    .initializeWager(player1, player2, arbiter, feeRecipient, wagerAmount)
    .accounts({
      wager: wagerPda,
      vault: vaultPda,
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
  isPlayer1: boolean
) {
  const { wagerPda, vaultPda } = getPDAs(player1, player2);
  const method = isPlayer1 ? 'depositPlayer1' : 'depositPlayer2';
  const playerKey = isPlayer1 ? 'player1' : 'player2';

  return await program.methods[method]()
    .accounts({
      wager: wagerPda,
      vault: vaultPda,
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
  winner: 1 | 2
) {
  const { wagerPda, vaultPda } = getPDAs(player1, player2);
  
  // Fetch wager data to get winner address and fee recipient
  const wagerAccount = await program.account.wager.fetch(wagerPda);
  const winnerAccount = winner === 1 ? wagerAccount.player1 : wagerAccount.player2;

  return await program.methods
    .declareWinner(winner)
    .accounts({
      wager: wagerPda,
      vault: vaultPda,
      arbiter: provider.wallet.publicKey,
      winnerAccount,
      feeRecipient: wagerAccount.feeRecipient,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();
}
```

### Get Wager Status
```typescript
async function getWagerStatus(player1: PublicKey, player2: PublicKey) {
  const { wagerPda } = getPDAs(player1, player2);
  
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

## 🎮 Ready-Made TypeScript Client

For easier integration, use the provided `SliderPvpClient`:

```typescript
import { SliderPvpClient } from './SliderPvpClient';

const client = new SliderPvpClient(connection, wallet);

// Auto-detects program ID based on network
// Provides typed methods for all operations
// Handles PDA derivation automatically
// Built-in error parsing
// Real-time subscriptions

// Usage examples:
const { signature, wagerPda } = await client.initializeWager(
  player1, player2, arbiter, feeRecipient, 0.1
);

await client.depositPlayer1(player1, player2);
await client.declareWinner(player1, player2, 1);

const status = await client.getWagerStatus(player1, player2);
const subscription = await client.subscribeToWager(player1, player2, callback);
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
- **Anyone** can trigger refunds/cancellations after timeouts
- **No admin keys** - all rules enforced by contract

### Timeout Protection
- **30 seconds** for both players to deposit (prevents no-shows)
- **120 seconds** for arbiter to declare winner (prevents stalling)
- **Automatic refunds** available after timeouts expire

### Fund Safety
- **PDA escrow** - no private keys can access funds
- **Deterministic addresses** - unique per player pair
- **State validation** - prevents double spending, invalid states
- **Fair cost distribution** - initialization costs shared by players

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
- **Per wager:** 175 bytes (Wager PDA) + 0 bytes (Vault PDA)
- **Cleanup:** Accounts remain after settlement (hold rent)

---

## 🛠️ React Integration Example

```jsx
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SliderPvpClient } from './SliderPvpClient';

function WagerComponent() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [client, setClient] = useState(null);
  const [wagerStatus, setWagerStatus] = useState(null);

  useEffect(() => {
    if (wallet.publicKey && wallet.signTransaction) {
      const newClient = new SliderPvpClient(connection, wallet);
      setClient(newClient);
    }
  }, [connection, wallet]);

  const createWager = async () => {
    const player2 = new PublicKey('PLAYER2_ADDRESS');
    const arbiter = new PublicKey('ARBITER_ADDRESS'); 
    const feeRecipient = new PublicKey('FEE_WALLET_ADDRESS');
    
    try {
      const { signature } = await client.initializeWager(
        wallet.publicKey, player2, arbiter, feeRecipient, 0.1
      );
      console.log('Wager created:', signature);
    } catch (error) {
      console.error('Error:', client.parseError(error));
    }
  };

  return (
    <div>
      <button onClick={createWager} disabled={!wallet.publicKey}>
        Create 0.1 SOL Wager
      </button>
      {wagerStatus && (
        <div>
          <p>Status: {wagerStatus.isSettled ? 'Settled' : 'Active'}</p>
          <p>Winner: {wagerStatus.winner ? `Player ${wagerStatus.winner}` : 'TBD'}</p>
        </div>
      )}
    </div>
  );
}
```

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
  return await client.initializeWager(predictor1, predictor2, oracleWallet, feeWallet, amount);
}
```

### 3. Skill-Based Challenges
```typescript
// Challenge system with stake
class SkillChallenge {
  async createChallenge(challenger: PublicKey, challenged: PublicKey, skillType: string) {
    // Skill-specific arbiter validates results
    const arbiter = SKILL_ARBITERS[skillType];
    return await client.initializeWager(challenger, challenged, arbiter, platformWallet, stake);
  }
}
```

---

## 🔗 Resources & Support

### Development Tools
- **IDL:** `/target/idl/slider_pvp.json`
- **Types:** `/target/types/slider_pvp.ts`  
- **Client:** `/slider-pvp-client/src/SliderPvpClient.ts`
- **Examples:** `/example-frontend/`

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
- **Examples:** Check `/example-frontend/` directory

---

**Ready to integrate? Start with the `SliderPvpClient` for the fastest setup, or build custom integration using the examples above.**

**Contract Version:** 1.0.0  
**Last Updated:** January 2025
**License:** MIT
