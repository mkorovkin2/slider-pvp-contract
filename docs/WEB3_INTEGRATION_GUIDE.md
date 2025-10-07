# Web3 Integration Guide

## Overview
This guide shows how to integrate the Slider PvP smart contract into your web3 application.

## Prerequisites

### 1. Install Dependencies
```bash
npm install @solana/web3.js @coral-xyz/anchor
# For wallet adapter (recommended)
npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
```

### 2. Get Your Program ID
Your program ID is: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`

After deployment, you'll need to update this in your code.

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
const programId = new web3.PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

// Setup provider (with wallet)
const provider = new AnchorProvider(
  connection,
  wallet,
  { commitment: 'confirmed' }
);

const program = new Program<SliderPvp>(idl as any, programId, provider);

// 1. Initialize a Wager
async function initializeWager(
  player1: web3.PublicKey,
  player2: web3.PublicKey,
  arbiter: web3.PublicKey,
  feeRecipient: web3.PublicKey,
  wagerAmountSol: number
) {
  // Derive the PDA for the wager account
  const [wagerPda] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from('wager'),
      player1.toBuffer(),
      player2.toBuffer()
    ],
    programId
  );

  // Convert SOL to lamports
  const wagerAmount = new BN(wagerAmountSol * web3.LAMPORTS_PER_SOL);

  const tx = await program.methods
    .initializeWager(
      player1,
      player2,
      arbiter,
      feeRecipient,
      wagerAmount
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
  player2: web3.PublicKey
) {
  const [wagerPda] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from('wager'),
      player1.toBuffer(),
      player2.toBuffer()
    ],
    programId
  );

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
  player2: web3.PublicKey
) {
  const [wagerPda] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from('wager'),
      player1.toBuffer(),
      player2.toBuffer()
    ],
    programId
  );

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
  winner: 1 | 2 // 1 for player1, 2 for player2
) {
  const [wagerPda] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from('wager'),
      player1.toBuffer(),
      player2.toBuffer()
    ],
    programId
  );

  // Fetch wager account to get winner and fee recipient
  const wagerAccount = await program.account.wager.fetch(wagerPda);
  
  const winnerAccount = winner === 1 ? wagerAccount.player1 : wagerAccount.player2;

  const tx = await program.methods
    .declareWinner(winner)
    .accounts({
      wager: wagerPda,
      arbiter: provider.wallet.publicKey,
      winnerAccount: winnerAccount,
      feeRecipient: wagerAccount.feeRecipient,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// 5. Refund (after timeout)
async function refundWager(
  player1: web3.PublicKey,
  player2: web3.PublicKey
) {
  const [wagerPda] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from('wager'),
      player1.toBuffer(),
      player2.toBuffer()
    ],
    programId
  );

  const tx = await program.methods
    .refund()
    .accounts({
      wager: wagerPda,
      player1: player1,
      player2: player2,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// 6. Cancel Wager (deposit timeout)
async function cancelWager(
  player1: web3.PublicKey,
  player2: web3.PublicKey
) {
  const [wagerPda] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from('wager'),
      player1.toBuffer(),
      player2.toBuffer()
    ],
    programId
  );

  const tx = await program.methods
    .cancelWager()
    .accounts({
      wager: wagerPda,
      player1: player1,
      player2: player2,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// Fetch Wager Data
async function getWagerData(
  player1: web3.PublicKey,
  player2: web3.PublicKey
) {
  const [wagerPda] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from('wager'),
      player1.toBuffer(),
      player2.toBuffer()
    ],
    programId
  );

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
    
    const programId = new web3.PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
    return new Program<SliderPvp>(idl as any, programId, provider);
  };

  const createWager = async () => {
    if (!wallet.publicKey) return;

    const program = getProgram();
    
    const player1 = wallet.publicKey; // current user
    const player2 = new web3.PublicKey('PLAYER2_ADDRESS_HERE');
    const arbiter = new web3.PublicKey('ARBITER_ADDRESS_HERE');
    const feeRecipient = new web3.PublicKey('FEE_RECIPIENT_HERE');
    
    const [wagerPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('wager'),
        player1.toBuffer(),
        player2.toBuffer()
      ],
      program.programId
    );

    const wagerAmount = new BN(0.1 * web3.LAMPORTS_PER_SOL);

    try {
      const tx = await program.methods
        .initializeWager(player1, player2, arbiter, feeRecipient, wagerAmount)
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
    
    const [wagerPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('wager'),
        player1.toBuffer(),
        player2.toBuffer()
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

### Approach 3: Manual Transaction Building (Advanced)

```typescript
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import * as borsh from '@coral-xyz/borsh';

// Manual instruction building (useful for advanced use cases)
async function manualInitializeWager(
  connection: Connection,
  payer: PublicKey,
  player1: PublicKey,
  player2: PublicKey,
  arbiter: PublicKey,
  feeRecipient: PublicKey,
  wagerAmountSol: number
) {
  const programId = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
  
  // Derive PDA
  const [wagerPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('wager'),
      player1.toBuffer(),
      player2.toBuffer()
    ],
    programId
  );

  // Create instruction data
  // This requires knowing the exact instruction discriminator and data layout
  // It's much easier to use Anchor, but this shows what's happening under the hood
  
  const instructionData = Buffer.concat([
    // Instruction discriminator (first 8 bytes of SHA256("global:initialize_wager"))
    Buffer.from([/* discriminator bytes */]),
    // Instruction arguments serialized
    player1.toBuffer(),
    player2.toBuffer(),
    arbiter.toBuffer(),
    feeRecipient.toBuffer(),
    // wager amount as u64 little-endian
    Buffer.from(new Uint8Array(new BigUint64Array([BigInt(wagerAmountSol * LAMPORTS_PER_SOL)]).buffer))
  ]);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: wagerPda, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);
  
  // Sign and send transaction
  return transaction;
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
    const programId = new web3.PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
    this.program = new Program<SliderPvp>(idl as any, programId, this.provider);
  }

  // Helper to get wager PDA
  getWagerPda(player1: PublicKey, player2: PublicKey): [PublicKey, number] {
    return web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('wager'),
        player1.toBuffer(),
        player2.toBuffer()
      ],
      this.program.programId
    );
  }

  // Create a new wager
  async createWager(
    player1: PublicKey,
    player2: PublicKey,
    arbiter: PublicKey,
    feeRecipient: PublicKey,
    wagerAmountSol: number
  ) {
    const [wagerPda] = this.getWagerPda(player1, player2);
    const wagerAmount = new BN(wagerAmountSol * web3.LAMPORTS_PER_SOL);

    const tx = await this.program.methods
      .initializeWager(player1, player2, arbiter, feeRecipient, wagerAmount)
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
  async deposit(player1: PublicKey, player2: PublicKey, isPlayer1: boolean) {
    const [wagerPda] = this.getWagerPda(player1, player2);
    
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
    winner: 1 | 2
  ) {
    const [wagerPda] = this.getWagerPda(player1, player2);
    const wagerAccount = await this.program.account.wager.fetch(wagerPda);
    
    const winnerAccount = winner === 1 ? wagerAccount.player1 : wagerAccount.player2;

    const tx = await this.program.methods
      .declareWinner(winner)
      .accounts({
        wager: wagerPda,
        arbiter: this.provider.wallet.publicKey,
        winnerAccount: winnerAccount,
        feeRecipient: wagerAccount.feeRecipient,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ Winner declared (Player ${winner}): ${tx}`);
    return tx;
  }

  // Get wager status
  async getWagerStatus(player1: PublicKey, player2: PublicKey) {
    const [wagerPda] = this.getWagerPda(player1, player2);
    
    try {
      const wagerAccount = await this.program.account.wager.fetch(wagerPda);
      
      return {
        exists: true,
        wagerAmount: wagerAccount.wagerAmount.toNumber() / web3.LAMPORTS_PER_SOL,
        player1Deposited: wagerAccount.player1Deposited,
        player2Deposited: wagerAccount.player2Deposited,
        bothDeposited: wagerAccount.player1Deposited && wagerAccount.player2Deposited,
        isSettled: wagerAccount.isSettled,
        winner: wagerAccount.winner,
        timeRemaining: this.calculateTimeRemaining(wagerAccount),
      };
    } catch (error) {
      return { exists: false };
    }
  }

  private calculateTimeRemaining(wagerAccount: any): number | null {
    if (!wagerAccount.player1Deposited || !wagerAccount.player2Deposited) {
      return null;
    }
    
    const TIMEOUT_SECONDS = 120;
    const now = Math.floor(Date.now() / 1000);
    const startTime = wagerAccount.startTime.toNumber();
    const elapsed = now - startTime;
    const remaining = TIMEOUT_SECONDS - elapsed;
    
    return Math.max(0, remaining);
  }

  // Listen for wager events
  async subscribeToWager(
    player1: PublicKey,
    player2: PublicKey,
    callback: (wagerData: any) => void
  ) {
    const [wagerPda] = this.getWagerPda(player1, player2);
    
    const subscriptionId = this.provider.connection.onAccountChange(
      wagerPda,
      async (accountInfo) => {
        const wagerData = await this.program.account.wager.fetch(wagerPda);
        callback(wagerData);
      }
    );
    
    return subscriptionId;
  }
}

// Usage example
async function fullGameFlow() {
  const connection = new Connection('https://api.devnet.solana.com');
  
  // In a real app, these would come from wallet adapter
  const player1Wallet = Keypair.generate(); // Replace with actual wallet
  const player2Pubkey = new PublicKey('PLAYER2_PUBLIC_KEY');
  const arbiterPubkey = new PublicKey('ARBITER_PUBLIC_KEY');
  const feePubkey = new PublicKey('FEE_RECIPIENT_PUBLIC_KEY');
  
  const manager = new WagerManager(connection, new Wallet(player1Wallet));
  
  // 1. Create wager
  const { wagerPda } = await manager.createWager(
    player1Wallet.publicKey,
    player2Pubkey,
    arbiterPubkey,
    feePubkey,
    0.1 // 0.1 SOL wager
  );
  
  // 2. Subscribe to updates
  await manager.subscribeToWager(
    player1Wallet.publicKey,
    player2Pubkey,
    (wagerData) => {
      console.log('Wager updated:', wagerData);
    }
  );
  
  // 3. Player 1 deposits
  await manager.deposit(player1Wallet.publicKey, player2Pubkey, true);
  
  // 4. Player 2 deposits (would be in different client)
  // await manager.deposit(player1Wallet.publicKey, player2Pubkey, false);
  
  // 5. Check status
  const status = await manager.getWagerStatus(player1Wallet.publicKey, player2Pubkey);
  console.log('Wager status:', status);
  
  // 6. Arbiter declares winner (after game ends)
  // await manager.declareWinner(player1Wallet.publicKey, player2Pubkey, 1);
}
```

---

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

---

## Important Constants

```typescript
const TIMEOUT_SECONDS = 120; // 2 minutes for game completion
const DEPOSIT_TIMEOUT_SECONDS = 30; // 30 seconds for both players to deposit
const WINNER_PERCENTAGE = 95; // Winner gets 95%
const FEE_PERCENTAGE = 5; // Platform fee is 5%
```

---

## Testing on Devnet

1. Deploy to devnet: `anchor deploy --provider.cluster devnet`
2. Update program ID in your frontend
3. Use devnet connection: `new Connection('https://api.devnet.solana.com')`
4. Get devnet SOL from faucet: `solana airdrop 2`

---

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

---

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)

