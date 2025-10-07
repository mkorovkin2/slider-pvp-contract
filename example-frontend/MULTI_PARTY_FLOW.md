# Multi-Party Flow Guide

This document explains how multiple participants interact with the same wager from different devices/locations.

## Overview

The Slider PvP contract is designed for **decentralized, multi-party interactions**:

- **Player 1** uses the app from their device
- **Player 2** uses the app from a different device (could be anywhere in the world)
- **Arbiter** uses the app from yet another device
- **Anyone** can check the status (read-only)

All parties interact with the **same on-chain wager account** because the Program Derived Address (PDA) is calculated deterministically.

## How PDAs Enable Multi-Party Interaction

### PDA Derivation (Deterministic)

```typescript
// All parties calculate the SAME PDA using the same inputs
const [wagerPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('wager'),
    player1.toBuffer(),    // Known address
    player2.toBuffer()     // Known address
  ],
  PROGRAM_ID
);
```

**Key Point:** As long as all parties know `player1` and `player2` addresses, they can all derive the same PDA and interact with the same wager.

---

## Scenario: Complete Multi-Party Flow

### Setup
- **Player 1**: Alice (in New York)
- **Player 2**: Bob (in Tokyo)  
- **Arbiter**: Carol (in London)
- **Fee Recipient**: Platform wallet

### Step-by-Step Flow

#### 1. Wager Creation (Can be done by anyone)

```typescript
// Alice creates the wager (could also be Bob, Carol, or the platform)
const client = new SliderPvpClient(connection, aliceWallet);

const { signature, wagerPda } = await client.initializeWager(
  alicePubkey,      // Player 1
  bobPubkey,        // Player 2
  carolPubkey,      // Arbiter
  platformPubkey,   // Fee recipient
  0.5               // 0.5 SOL wager
);

// Alice shares with Bob and Carol:
// - Player 1 address: alicePubkey
// - Player 2 address: bobPubkey
// - Wager PDA: wagerPda (optional, they can derive it)
```

**What gets stored on-chain:**
```
Wager Account at PDA [wagerPda]:
├─ player1: Alice's address
├─ player2: Bob's address
├─ arbiter: Carol's address
├─ wager_amount: 0.5 SOL
├─ player1_deposited: false
├─ player2_deposited: false
└─ is_settled: false
```

---

#### 2. Player 1 Deposits (Alice in New York)

```typescript
// Alice on her device
const aliceClient = new SliderPvpClient(connection, aliceWallet);

// Alice derives the same PDA
const [wagerPda] = aliceClient.getWagerPda(alicePubkey, bobPubkey);

// Alice deposits
await aliceClient.depositPlayer1(alicePubkey, bobPubkey);
```

**Updated on-chain state:**
```
Wager Account:
├─ player1_deposited: true ✅
├─ player2_deposited: false
└─ [0.5 SOL now held by wager PDA]
```

---

#### 3. Player 2 Deposits (Bob in Tokyo)

```typescript
// Bob on his device (completely separate app instance)
const bobClient = new SliderPvpClient(connection, bobWallet);

// Bob derives the SAME PDA (because player1 and player2 are the same)
const [wagerPda] = bobClient.getWagerPda(alicePubkey, bobPubkey);

// Bob deposits
await bobClient.depositPlayer2(alicePubkey, bobPubkey);
```

**Updated on-chain state:**
```
Wager Account:
├─ player1_deposited: true ✅
├─ player2_deposited: true ✅
├─ start_time: [current timestamp]
└─ [1.0 SOL total now held by wager PDA]
```

**Timer starts!** 120 seconds for the game to complete.

---

#### 4. Game Happens (Off-chain)

Alice and Bob play the slider game. Carol watches and determines the winner.

---

#### 5. Arbiter Declares Winner (Carol in London)

```typescript
// Carol on her device (another separate app instance)
const carolClient = new SliderPvpClient(connection, carolWallet);

// Carol derives the SAME PDA
const [wagerPda] = carolClient.getWagerPda(alicePubkey, bobPubkey);

// Carol declares Alice as the winner
await carolClient.declareWinner(
  alicePubkey,
  bobPubkey,
  1  // 1 = Player 1 (Alice), 2 = Player 2 (Bob)
);
```

**Final on-chain state:**
```
Wager Account:
├─ winner: 1 (Alice)
├─ is_settled: true ✅
└─ [0.95 SOL sent to Alice, 0.05 SOL sent to platform]
```

---

## Real-World Implementation

### Player 1's App (Alice)

```tsx
// Alice's frontend
function Player1Interface() {
  const { connection } = useConnection();
  const wallet = useWallet(); // Alice's wallet
  
  // Alice knows Bob's address (received via game matchmaking)
  const player2Address = "BobsPubKeyHere...";
  
  const client = useMemo(() => {
    if (!wallet.publicKey) return null;
    return new SliderPvpClient(connection, wallet as Wallet);
  }, [connection, wallet.publicKey]);
  
  const deposit = async () => {
    if (!client || !wallet.publicKey) return;
    
    const bobPubkey = new PublicKey(player2Address);
    
    // Alice deposits as Player 1
    await client.depositPlayer1(wallet.publicKey, bobPubkey);
  };
  
  return <button onClick={deposit}>Deposit My Wager</button>;
}
```

### Player 2's App (Bob)

```tsx
// Bob's frontend (on a DIFFERENT device/browser)
function Player2Interface() {
  const { connection } = useConnection();
  const wallet = useWallet(); // Bob's wallet
  
  // Bob knows Alice's address (received via game matchmaking)
  const player1Address = "AlicesPubKeyHere...";
  
  const client = useMemo(() => {
    if (!wallet.publicKey) return null;
    return new SliderPvpClient(connection, wallet as Wallet);
  }, [connection, wallet.publicKey]);
  
  const deposit = async () => {
    if (!client || !wallet.publicKey) return;
    
    const alicePubkey = new PublicKey(player1Address);
    
    // Bob deposits as Player 2
    await client.depositPlayer2(alicePubkey, wallet.publicKey);
  };
  
  return <button onClick={deposit}>Deposit My Wager</button>;
}
```

### Arbiter's App (Carol)

```tsx
// Carol's frontend (on ANOTHER different device/browser)
function ArbiterInterface() {
  const { connection } = useConnection();
  const wallet = useWallet(); // Carol's wallet
  
  // Carol knows both players' addresses
  const player1Address = "AlicesPubKeyHere...";
  const player2Address = "BobsPubKeyHere...";
  
  const client = useMemo(() => {
    if (!wallet.publicKey) return null;
    return new SliderPvpClient(connection, wallet as Wallet);
  }, [connection, wallet.publicKey]);
  
  const declareWinner = async (winner: 1 | 2) => {
    if (!client) return;
    
    const alicePubkey = new PublicKey(player1Address);
    const bobPubkey = new PublicKey(player2Address);
    
    // Carol declares the winner
    await client.declareWinner(alicePubkey, bobPubkey, winner);
  };
  
  return (
    <>
      <button onClick={() => declareWinner(1)}>Alice Wins</button>
      <button onClick={() => declareWinner(2)}>Bob Wins</button>
    </>
  );
}
```

---

## Real-Time Status Updates (All Parties)

**Anyone** can subscribe to wager updates:

```tsx
function WagerStatus({ player1, player2 }: { player1: string; player2: string }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [status, setStatus] = useState<WagerInfo | null>(null);
  
  useEffect(() => {
    if (!wallet.publicKey) return;
    
    const client = new SliderPvpClient(connection, wallet as Wallet);
    let subscriptionId: number;
    
    // Subscribe to real-time updates
    client.subscribeToWager(
      new PublicKey(player1),
      new PublicKey(player2),
      (data) => {
        setStatus(data);
        console.log('Wager updated:', data);
      }
    ).then(id => {
      subscriptionId = id;
    });
    
    // Cleanup
    return () => {
      if (subscriptionId !== undefined) {
        client.unsubscribe(subscriptionId);
      }
    };
  }, [connection, wallet.publicKey, player1, player2]);
  
  return (
    <div>
      <p>Player 1 Deposited: {status?.player1Deposited ? '✅' : '⏳'}</p>
      <p>Player 2 Deposited: {status?.player2Deposited ? '✅' : '⏳'}</p>
      <p>Settled: {status?.isSettled ? '✅' : '⏳'}</p>
      {status?.winner && <p>Winner: Player {status.winner}</p>}
    </div>
  );
}
```

---

## Key Design Principles

### ✅ What Makes This Work

1. **Deterministic PDA**: Same inputs → Same address → Same account
   ```typescript
   // Alice calculates: PDA = hash(player1, player2, programId)
   // Bob calculates:   PDA = hash(player1, player2, programId)
   // Result: Same PDA! ✅
   ```

2. **On-Chain Permission Checks**: The smart contract enforces who can do what
   ```rust
   // Only player1 can call depositPlayer1
   require!(ctx.accounts.player1.key() == wager.player1);
   
   // Only arbiter can declare winner
   require!(ctx.accounts.arbiter.key() == wager.arbiter);
   ```

3. **Stateless Client**: Each party has their own client instance, but they all interact with the same on-chain state

4. **Blockchain as Source of Truth**: The wager state lives on-chain, not in any one client

---

## Information Sharing Between Parties

For this to work, parties need to know the wager details. Here are common approaches:

### Option 1: Deep Links / URLs

```typescript
// Create a shareable link
const wagerUrl = `https://yourapp.com/wager?player1=${player1}&player2=${player2}`;

// Share via QR code, message, etc.
```

### Option 2: Game Matchmaking Service

```typescript
// Backend matchmaking service stores:
{
  gameId: "abc123",
  player1: "AlicesPubkey",
  player2: "BobsPubkey",
  arbiter: "CarolsPubkey",
  wagerPda: "derived-pda",
  status: "waiting_for_deposits"
}

// Parties fetch game info from your API
const gameInfo = await fetch(`/api/games/${gameId}`);
```

### Option 3: On-Chain Events / Transaction Logs

```typescript
// Query recent wagers involving a specific player
const signatures = await connection.getSignaturesForAddress(playerPubkey);

// Parse transaction data to find wagers
```

---

## Example: Complete Multi-Device Setup

### Device 1 (Alice - Player 1)
```
1. Opens app
2. Connects Phantom wallet (Alice's wallet)
3. Gets matched with Bob
4. Clicks "Deposit"
   → Calls depositPlayer1(Alice, Bob)
5. Waits for Bob...
```

### Device 2 (Bob - Player 2)
```
1. Opens app (completely separate browser/device)
2. Connects Phantom wallet (Bob's wallet)
3. Sees he's matched with Alice
4. Clicks "Deposit"
   → Calls depositPlayer2(Alice, Bob)
5. Game starts! ✅
```

### Device 3 (Carol - Arbiter)
```
1. Opens arbiter dashboard
2. Connects wallet (Carol's wallet)
3. Sees list of active games
4. Watches Alice vs Bob game
5. Clicks "Alice Wins"
   → Calls declareWinner(Alice, Bob, 1)
6. Funds distributed! ✅
```

---

## Testing Multi-Party Locally

You can simulate this with multiple browser profiles:

```bash
# Terminal 1: Start your app
npm run dev

# Browser 1 (Incognito): Player 1
- Open http://localhost:3000
- Connect wallet 1
- Deposit as player 1

# Browser 2 (Different profile): Player 2  
- Open http://localhost:3000
- Connect wallet 2
- Deposit as player 2

# Browser 3 (Another profile): Arbiter
- Open http://localhost:3000
- Connect wallet 3
- Declare winner
```

Or use multiple devices/computers on the same network.

---

## Security Considerations

### ✅ Secured by Smart Contract

- **Alice can't deposit for Bob** (contract checks signer)
- **Bob can't declare winner** (only arbiter can)
- **No one can withdraw funds directly** (only through declare_winner or refund)

### ✅ Secured by Cryptography

- Each wallet signs their own transaction
- Private keys never leave the user's device
- Solana validators verify all signatures

### ❌ What's NOT Secured

- **Game fairness**: The arbiter can cheat (declare wrong winner)
  - Solution: Use a trusted arbiter or implement on-chain game logic
- **Front-running**: Someone could monitor transactions and react
  - Solution: This is inherent to public blockchains

---

## Conclusion

**Yes, the frontend IS fully functional for multi-party use!**

The key is understanding that:
1. Each party runs their own client instance
2. All clients interact with the same on-chain wager (via deterministic PDA)
3. The smart contract enforces permissions
4. The blockchain serves as the single source of truth

No centralized server needed—this is truly decentralized! 🚀

