# Web3 Integration Guide

## Overview
This guide shows how to integrate the Slider PvP smart contract into your web3 application.

## Architecture Overview

The contract uses a **Unified PDA architecture**:

1. **Wager PDA** (`seeds: ["wager", player1, player2, game_id]`)
   - Stores game state (player addresses, arbiter, amounts, timestamps, etc.)
   - Holds the deposited SOL
   - Rent: ~0.002 SOL (Paid by initializer, refunded to initializer on settlement)

**Payout Structure:**
- **Winner**: 95% of the wager pool
- **Fee Recipient**: 5% of the wager pool

## Prerequisites

### 1. Install Dependencies
```bash
npm install @solana/web3.js @coral-xyz/anchor
# For wallet adapter (recommended)
npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
```

### 2. Get Your Program ID
Your program ID is: `5Nz9sKCgrJ4ToYizMkud3pscBTGf5XJXmHvJvhEg4UgN`

### 3. Generate IDL
After building your program, the IDL will be at `target/idl/slider_pvp.json`. Copy this to your frontend project.

---

## Integration Approaches

### Approach 1: Using Anchor Client (Recommended)
This is the easiest and most type-safe approach.

```typescript
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { SliderPvp } from './idl/slider_pvp';
import idl from './idl/slider_pvp.json';

// Initialize the program
const programId = new web3.PublicKey('5Nz9sKCgrJ4ToYizMkud3pscBTGf5XJXmHvJvhEg4UgN');

// Setup provider (with wallet)
const provider = new AnchorProvider(
  connection,
  wallet,
  { commitment: 'confirmed' }
);

const program = new Program<SliderPvp>(idl as any, programId, provider);

// Helper function to derive PDA
function deriveWagerPDA(player1: web3.PublicKey, player2: web3.PublicKey, gameId: BN, programId: web3.PublicKey) {
  const [wagerPda] = web3.PublicKey.findProgramAddressSync(
    [
        Buffer.from('wager'), 
        player1.toBuffer(), 
        player2.toBuffer(),
        gameId.toArrayLike(Buffer, 'le', 8)
    ],
    programId
  );
  return wagerPda;
}

// 1. Initialize a Wager
async function initializeWager(
  player1: web3.PublicKey,
  player2: web3.PublicKey,
  arbiter: web3.PublicKey,
  feeRecipient: web3.PublicKey,
  wagerAmountSol: number,
  gameId: number
) {
  const gameIdBn = new BN(gameId);
  const wagerPda = deriveWagerPDA(player1, player2, gameIdBn, programId);

  // Convert SOL to lamports
  const wagerAmount = new BN(wagerAmountSol * web3.LAMPORTS_PER_SOL);

  const tx = await program.methods
    .initializeWager(
      player1,
      player2,
      arbiter,
      feeRecipient,
      wagerAmount,
      gameIdBn
    )
    .accounts({
      wager: wagerPda,
      payer: provider.wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  return { transaction: tx, wagerPda };
}

// 2. Player 1 Deposits
async function depositPlayer1(
  player1: web3.PublicKey,
  player2: web3.PublicKey,
  gameId: number
) {
  const gameIdBn = new BN(gameId);
  const wagerPda = deriveWagerPDA(player1, player2, gameIdBn, programId);

  const tx = await program.methods
    .depositPlayer1()
    .accounts({
      wager: wagerPda,
      player1: provider.wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// 3. Player 2 Deposits
async function depositPlayer2(
  player1: web3.PublicKey,
  player2: web3.PublicKey,
  gameId: number
) {
  const gameIdBn = new BN(gameId);
  const wagerPda = deriveWagerPDA(player1, player2, gameIdBn, programId);

  const tx = await program.methods
    .depositPlayer2()
    .accounts({
      wager: wagerPda,
      player2: provider.wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// 4. Arbiter Declares Winner
async function declareWinner(
  player1: web3.PublicKey,
  player2: web3.PublicKey,
  gameId: number,
  winner: 1 | 2 // 1 for player1, 2 for player2
) {
  const gameIdBn = new BN(gameId);
  const wagerPda = deriveWagerPDA(player1, player2, gameIdBn, programId);

  // Fetch wager account to get winner, fee recipient, and payer
  const wagerAccount = await program.account.wager.fetch(wagerPda);
  
  const winnerAccount = winner === 1 ? wagerAccount.player1 : wagerAccount.player2;

  const tx = await program.methods
    .declareWinner(winner)
    .accounts({
      wager: wagerPda,
      arbiter: provider.wallet.publicKey,
      winnerAccount: winnerAccount,
      feeRecipient: wagerAccount.feeRecipient,
      payerAccount: wagerAccount.payer, // Rent refund goes here
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// 5. Refund (after timeout)
async function refundWager(
  player1: web3.PublicKey,
  player2: web3.PublicKey,
  gameId: number
) {
  const gameIdBn = new BN(gameId);
  const wagerPda = deriveWagerPDA(player1, player2, gameIdBn, programId);

  const wagerAccount = await program.account.wager.fetch(wagerPda);

  const tx = await program.methods
    .refund()
    .accounts({
      wager: wagerPda,
      arbiter: provider.wallet.publicKey, // Must be arbiter to trigger refund? No, anyone according to docs, but code says arbiter check.
                                          // Wait, checking code...
                                          // Code: require!(ctx.accounts.arbiter.key() == wager.arbiter, ErrorCode::UnauthorizedArbiter);
                                          // YES, only Arbiter can call refund() in current code.
      player1: player1,
      player2: player2,
      payerAccount: wagerAccount.payer,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// 6. Cancel Wager (deposit timeout)
async function cancelWager(
  player1: web3.PublicKey,
  player2: web3.PublicKey,
  gameId: number
) {
  const gameIdBn = new BN(gameId);
  const wagerPda = deriveWagerPDA(player1, player2, gameIdBn, programId);
  
  const wagerAccount = await program.account.wager.fetch(wagerPda);

  const tx = await program.methods
    .cancelWager()
    .accounts({
      wager: wagerPda,
      arbiter: provider.wallet.publicKey, // Only arbiter
      player1: player1,
      player2: player2,
      payerAccount: wagerAccount.payer,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// Fetch Wager Data
async function getWagerData(
  player1: web3.PublicKey,
  player2: web3.PublicKey,
  gameId: number
) {
  const gameIdBn = new BN(gameId);
  const wagerPda = deriveWagerPDA(player1, player2, gameIdBn, programId);

  const wagerAccount = await program.account.wager.fetch(wagerPda);
  
  return {
    player1: wagerAccount.player1,
    player2: wagerAccount.player2,
    arbiter: wagerAccount.arbiter,
    feeRecipient: wagerAccount.feeRecipient,
    wagerAmount: wagerAccount.wagerAmount.toNumber() / web3.LAMPORTS_PER_SOL,
    player1Deposited: wagerAccount.player1Deposited,
    player2Deposited: wagerAccount.player2Deposited,
    creationTime: wagerAccount.creationTime.toNumber(),
    startTime: wagerAccount.startTime.toNumber(),
    winner: wagerAccount.winner,
    isSettled: wagerAccount.isSettled,
  };
}
```

---

### Approach 2: React with Wallet Adapter

```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { SliderPvp } from './idl/slider_pvp';
import idl from './idl/slider_pvp.json';

function WagerComponent() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const getProgram = () => {
    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed' }
    );
    
    const programId = new web3.PublicKey('5Nz9sKCgrJ4ToYizMkud3pscBTGf5XJXmHvJvhEg4UgN');
    return new Program<SliderPvp>(idl as any, programId, provider);
  };

  const createWager = async () => {
    if (!wallet.publicKey) return;

    const program = getProgram();
    
    const player1 = wallet.publicKey; // current user
    const player2 = new web3.PublicKey('PLAYER2_ADDRESS_HERE');
    const arbiter = new web3.PublicKey('ARBITER_ADDRESS_HERE');
    const feeRecipient = new web3.PublicKey('FEE_RECIPIENT_HERE');
    const gameId = new BN(Date.now()); // Example game ID
    
    const [wagerPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('wager'),
        player1.toBuffer(),
        player2.toBuffer(),
        gameId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    const wagerAmount = new BN(0.5 * web3.LAMPORTS_PER_SOL);

    try {
      const tx = await program.methods
        .initializeWager(player1, player2, arbiter, feeRecipient, wagerAmount, gameId)
        .accounts({
          wager: wagerPda,
          payer: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      
      console.log('Transaction signature:', tx);
      alert('Wager created successfully!');
    } catch (error) {
      console.error('Error creating wager:', error);
      alert('Failed to create wager');
    }
  };

  const deposit = async () => {
    if (!wallet.publicKey) return;

    const program = getProgram();
    
    const player1 = new web3.PublicKey('PLAYER1_ADDRESS_HERE');
    const player2 = new web3.PublicKey('PLAYER2_ADDRESS_HERE');
    const gameId = new BN(12345); // Use actual game ID
    
    const [wagerPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('wager'),
        player1.toBuffer(),
        player2.toBuffer(),
        gameId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    // Determine which player is depositing
    const isPlayer1 = wallet.publicKey.equals(player1);
    
    try {
      const tx = await program.methods[isPlayer1 ? 'depositPlayer1' : 'depositPlayer2']()
        .accounts({
          wager: wagerPda,
          [isPlayer1 ? 'player1' : 'player2']: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      
      console.log('Deposit transaction:', tx);
      alert('Deposit successful!');
    } catch (error) {
      console.error('Error depositing:', error);
      alert('Failed to deposit');
    }
  };

  return (
    <div>
      <button onClick={createWager}>Create Wager</button>
      <button onClick={deposit}>Deposit</button>
    </div>
  );
}
```

---

## Real-World Usage Example

Here's a complete example showing a typical game flow:

```typescript
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN, Wallet } from '@coral-xyz/anchor';
import { SliderPvp } from './idl/slider_pvp';
import idl from './idl/slider_pvp.json';

class WagerManager {
  private program: Program<SliderPvp>;
  private provider: AnchorProvider;
  
  constructor(connection: Connection, wallet: Wallet) {
    this.provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const programId = new web3.PublicKey('5Nz9sKCgrJ4ToYizMkud3pscBTGf5XJXmHvJvhEg4UgN');
    this.program = new Program<SliderPvp>(idl as any, programId, this.provider);
  }

  // Helper to get wager PDA
  getWagerPDA(player1: PublicKey, player2: PublicKey, gameId: BN) {
    const [wagerPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('wager'), player1.toBuffer(), player2.toBuffer(), gameId.toArrayLike(Buffer, 'le', 8)],
      this.program.programId
    );
    return wagerPda;
  }

  // Create a new wager
  async createWager(
    player1: PublicKey,
    player2: PublicKey,
    arbiter: PublicKey,
    feeRecipient: PublicKey,
    wagerAmountSol: number,
    gameId: number
  ) {
    const gameIdBn = new BN(gameId);
    const wagerPda = this.getWagerPDA(player1, player2, gameIdBn);
    const wagerAmount = new BN(wagerAmountSol * web3.LAMPORTS_PER_SOL);

    const tx = await this.program.methods
      .initializeWager(player1, player2, arbiter, feeRecipient, wagerAmount, gameIdBn)
      .accounts({
        wager: wagerPda,
        payer: this.provider.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ Wager created: ${tx}`);
    console.log(`📍 Wager PDA: ${wagerPda.toString()}`);
    
    return { transaction: tx, wagerPda };
  }

  // Player deposits
  async deposit(player1: PublicKey, player2: PublicKey, gameId: number, isPlayer1: boolean) {
    const gameIdBn = new BN(gameId);
    const wagerPda = this.getWagerPDA(player1, player2, gameIdBn);
    
    const method = isPlayer1 ? 'depositPlayer1' : 'depositPlayer2';
    const accountKey = isPlayer1 ? 'player1' : 'player2';

    const tx = await this.program.methods[method]()
      .accounts({
        wager: wagerPda,
        [accountKey]: this.provider.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ Player ${isPlayer1 ? 1 : 2} deposited: ${tx}`);
    return tx;
  }

  // Declare winner
  async declareWinner(
    player1: PublicKey,
    player2: PublicKey,
    gameId: number,
    winner: 1 | 2
  ) {
    const gameIdBn = new BN(gameId);
    const wagerPda = this.getWagerPDA(player1, player2, gameIdBn);
    const wagerAccount = await this.program.account.wager.fetch(wagerPda);
    
    const winnerAccount = winner === 1 ? wagerAccount.player1 : wagerAccount.player2;

    const tx = await this.program.methods
      .declareWinner(winner)
      .accounts({
        wager: wagerPda,
        arbiter: this.provider.wallet.publicKey,
        winnerAccount: winnerAccount,
        feeRecipient: wagerAccount.feeRecipient,
        payerAccount: wagerAccount.payer,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ Winner declared (Player ${winner}): ${tx}`);
    return tx;
  }
}
```

## Error Handling

```typescript
async function handleWagerTransaction() {
  try {
    // Your transaction code
    const tx = await program.methods.depositPlayer1()...
    
  } catch (error: any) {
    // Parse Anchor errors
    if (error.error && error.error.errorMessage) {
      switch (error.error.errorMessage) {
        case 'Player has already deposited':
          alert('You have already deposited for this wager');
          break;
        case 'Unauthorized player':
          alert('You are not authorized to deposit for this wager');
          break;
        case 'Wager has already been settled':
          alert('This wager has already been settled');
          break;
        default:
          alert(`Error: ${error.error.errorMessage}`);
      }
    } else {
      // Handle other errors (network, wallet, etc.)
      console.error('Transaction failed:', error);
      alert('Transaction failed. Please try again.');
    }
  }
}
```

## Important Constants

```typescript
const TIMEOUT_SECONDS = 120; // 2 minutes for game completion
const DEPOSIT_TIMEOUT_SECONDS = 30; // 30 seconds for both players to deposit
const WINNER_PERCENTAGE = 95; // Winner gets 95%
const FEE_PERCENTAGE = 5; // Platform fee is 5%
```

## Testing on Devnet

1. Deploy to devnet: `anchor deploy --provider.cluster devnet`
2. Update program ID in your frontend
3. Use devnet connection: `new Connection('https://api.devnet.solana.com')`
4. Get devnet SOL from faucet: `solana airdrop 2`

## Production Checklist

- [ ] Deploy to mainnet-beta
- [ ] Update program ID in frontend
- [ ] Test all error cases
- [ ] Implement proper wallet connection UI
- [ ] Add transaction confirmation UI
- [ ] Implement retry logic for failed transactions
- [ ] Add loading states
- [ ] Monitor transaction status
- [ ] Handle network errors gracefully
- [ ] Add analytics/logging
- [ ] Security audit completed
- [ ] Set up monitoring for program account

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
