# Test Your Contract - Simple Steps

## Copy-Paste These Commands (In Order)

### Step 1: Set up your environment
```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd ~/workplace/slider-pvp-contract
```

### Step 2: Run the tests
```bash
anchor test
```

**That's it!** This single command will:
1. Build your Solana program
2. Start a local test validator
3. Deploy the program to it
4. Run all 11 tests
5. Show you the results

## Expected Output

You should see something like:

```
Building program...
Deploying program...

  slider-pvp
    ✓ Initializes a wager successfully (XXXms)
    ✓ Player 1 deposits successfully (XXXms)
    ✓ Player 2 deposits successfully (XXXms)
    ✓ Both players deposit and timer starts (XXXms)
    ✓ Arbiter declares player 1 as winner (XXXms)
    ✓ Arbiter declares player 2 as winner (XXXms)
    ✓ Fails when non-arbiter tries to declare winner (XXXms)
    ✓ Refunds both players after timeout (XXXms)
    ✓ Fails to refund before timeout expires (XXXms)
    ✓ Fails when player deposits twice (XXXms)
    ✓ Fails to declare winner before both players deposit (XXXms)

  11 passing (Xs)
```

## If It Takes A Long Time

The first run will:
- Download platform tools (~100MB)
- Compile the Rust program (2-5 minutes)
- This is NORMAL, don't cancel it

Subsequent runs will be much faster (30 seconds).

## Alternative: Run Step-by-Step

If you want to see each step separately:

### Build only:
```bash
cd ~/workplace/slider-pvp-contract
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
anchor build
```

### Start validator (in a separate terminal):
```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
solana-test-validator
```

### Run tests (in main terminal):
```bash
cd ~/workplace/slider-pvp-contract
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
anchor test --skip-local-validator
```

## What Each Test Does

1. **Initialize** - Creates a new wager account
2. **Player 1 Deposit** - Player 1 sends 0.1 SOL
3. **Player 2 Deposit** - Player 2 sends 0.1 SOL
4. **Timer Start** - Both deposited, 120-second timer starts
5. **Winner P1** - Arbiter declares Player 1 winner (gets 0.19 SOL)
6. **Winner P2** - Arbiter declares Player 2 winner (gets 0.19 SOL)
7. **Auth Check** - Non-arbiter can't declare winner ✓
8. **Refund** - Shows refund structure (timeout simulation)
9. **Early Refund Block** - Can't refund before 120s ✓
10. **Double Deposit Block** - Can't deposit twice ✓
11. **Early Winner Block** - Can't declare winner before both deposit ✓

## Troubleshooting

**"command not found: anchor"**
```bash
# Run this first:
source $HOME/.cargo/env
```

**Build seems stuck**
- It's probably downloading platform tools
- Wait 5-10 minutes on first run
- Check with: `ls -lh ~/.cache/solana/`

**"Failed to connect"**
- Make sure no other validator is running
- Kill old validators: `pkill -9 solana-test-validator`
- Try again

## Quick Test

Want to just verify it works? Run this one-liner:

```bash
cd ~/workplace/slider-pvp-contract && export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH" && anchor test 2>&1 | grep "passing"
```

If you see "11 passing", everything works! ✅

