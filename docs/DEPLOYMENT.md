# Deployment Guide

## Prerequisites

1. Install Rust and Solana CLI:
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

2. Install Anchor CLI:
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

3. Install Node.js dependencies:
```bash
yarn install
```

## Local Development

1. Start a local Solana validator:
```bash
solana-test-validator
```

2. Build the program:
```bash
anchor build
```

3. Run tests:
```bash
anchor test --skip-local-validator
```

## Deployment

### Deploy to Devnet

1. Set Solana CLI to devnet:
```bash
solana config set --url devnet
```

2. Create a keypair for the program (if you don't have one):
```bash
solana-keygen new -o ~/.config/solana/id.json
```

3. Airdrop some SOL for deployment fees:
```bash
solana airdrop 2
```

4. Build the program:
```bash
anchor build
```

5. Get the program ID:
```bash
solana address -k target/deploy/slider_pvp-keypair.json
```

6. Update the program ID in:
   - `Anchor.toml` (under `[programs.devnet]`)
   - `programs/slider-pvp/src/lib.rs` (in `declare_id!()`)

7. Rebuild after updating program ID:
```bash
anchor build
```

8. Deploy:
```bash
anchor deploy --provider.cluster devnet
```

### Deploy to Mainnet

⚠️ **WARNING**: Deploying to mainnet requires real SOL and should only be done after thorough testing.

1. Set Solana CLI to mainnet:
```bash
solana config set --url mainnet-beta
```

2. Ensure you have enough SOL for deployment:
```bash
solana balance
```

3. Deploy:
```bash
anchor deploy --provider.cluster mainnet
```

## Program Usage

### Initialize a Wager

```typescript
// Derive wager PDA (stores game state)
const [wagerPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("wager"),
    player1.publicKey.toBuffer(),
    player2.publicKey.toBuffer(),
  ],
  program.programId
);

// Derive vault PDA (stores deposited SOL)
const [vaultPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("vault"),
    player1.publicKey.toBuffer(),
    player2.publicKey.toBuffer(),
  ],
  program.programId
);

await program.methods
  .initializeWager(
    player1.publicKey,
    player2.publicKey,
    arbiter.publicKey,
    feeRecipient.publicKey,
    new anchor.BN(0.5 * LAMPORTS_PER_SOL) // 0.5 SOL per player
  )
  .accounts({
    wager: wagerPda,
    vault: vaultPda,
    payer: payer.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Player Deposits

```typescript
// Player 1
await program.methods
  .depositPlayer1()
  .accounts({
    wager: wagerPda,
    vault: vaultPda,
    player1: player1.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([player1])
  .rpc();

// Player 2
await program.methods
  .depositPlayer2()
  .accounts({
    wager: wagerPda,
    vault: vaultPda,
    player2: player2.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([player2])
  .rpc();
```

### Declare Winner

```typescript
await program.methods
  .declareWinner(1) // 1 for player1, 2 for player2
  .accounts({
    wager: wagerPda,
    vault: vaultPda,
    arbiter: arbiter.publicKey,
    winnerAccount: player1.publicKey, // or player2.publicKey
    feeRecipient: feeRecipient.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([arbiter])
  .rpc();
```

### Refund (after timeout)

```typescript
await program.methods
  .refund()
  .accounts({
    wager: wagerPda,
    vault: vaultPda,
    player1: player1.publicKey,
    player2: player2.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Security Considerations

1. **Arbiter Trust**: The arbiter has significant power. Choose carefully.
2. **Timeout Period**: 120 seconds is hardcoded. Modify if needed.
3. **Fee Distribution**: 95% to winner, 5% to fee recipient.
4. **PDA Seeds**: Each wager is uniquely identified by player1 and player2 pubkeys.
5. **Reentrancy**: Protected by account state checks.

## Troubleshooting

### "Error: Account does not exist"
- Make sure the wager has been initialized first.

### "Error: Unauthorized arbiter"
- Only the designated arbiter can declare a winner.

### "Error: Timeout period has not expired"
- Wait the full 120 seconds before attempting a refund.

### "Error: Player has already deposited"
- Each player can only deposit once per wager.

