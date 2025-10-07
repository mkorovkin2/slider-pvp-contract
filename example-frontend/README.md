# Slider PvP Frontend Examples

This directory contains ready-to-use code for integrating the Slider PvP smart contract into your web application.

## 📁 Files Overview

### Core Integration Files

1. **`SliderPvpClient.ts`** - TypeScript client for interacting with the contract
   - Complete type-safe API for all contract functions
   - Error handling and transaction confirmation
   - Real-time account subscription support
   - **This is the main file you'll use in production**

2. **`WagerComponent.tsx`** - React component example
   - Full UI implementation with wallet adapter
   - State management for wagers
   - Form inputs and validation
   - Real-time status updates

3. **`vanilla-js-example.html`** - Simple HTML/JS example
   - No framework required
   - Demonstrates basic wallet connection
   - Useful for understanding the fundamentals

### Documentation

4. **`FRONTEND_SETUP.md`** - Complete setup guide
   - Step-by-step installation instructions
   - React and Next.js configuration
   - Environment setup
   - Production deployment checklist

5. **`MULTI_PARTY_FLOW.md`** - Multi-party interaction guide ⭐
   - How multiple participants interact with the same wager
   - Player 1, Player 2, and Arbiter workflows
   - Real-world examples with separate devices
   - Deterministic PDA explanation

## 🚀 Quick Start

### Option 1: React/Next.js (Recommended)

```bash
# 1. Install dependencies
npm install @solana/web3.js @coral-xyz/anchor \
  @solana/wallet-adapter-react \
  @solana/wallet-adapter-react-ui \
  @solana/wallet-adapter-wallets

# 2. Copy files to your project
cp SliderPvpClient.ts <your-project>/src/lib/
cp WagerComponent.tsx <your-project>/src/components/

# 3. Copy IDL and types
cp ../target/idl/slider_pvp.json <your-project>/src/idl/
cp ../target/types/slider_pvp.ts <your-project>/src/types/

# 4. Follow FRONTEND_SETUP.md for complete setup
```

### Option 2: Vanilla JavaScript

Simply open `vanilla-js-example.html` in a browser to see a basic example.

## 💡 Usage Examples

### Basic Usage

```typescript
import { SliderPvpClient } from '@/lib/SliderPvpClient';
import { Connection, PublicKey } from '@solana/web3.js';

// Initialize client
const connection = new Connection('https://api.devnet.solana.com');
const client = new SliderPvpClient(connection, wallet);

// Create a wager
const { signature, wagerPda } = await client.initializeWager(
  player1Pubkey,
  player2Pubkey,
  arbiterPubkey,
  feeRecipientPubkey,
  0.1 // 0.1 SOL
);

// Deposit
await client.depositPlayer1(player1Pubkey, player2Pubkey);

// Check status
const status = await client.getWagerStatus(player1Pubkey, player2Pubkey);
console.log(status);

// Declare winner
await client.declareWinner(player1Pubkey, player2Pubkey, 1);
```

### React Hook Example

```tsx
import { useSliderPvp } from '@/hooks/useSliderPvp';

function MyComponent() {
  const { client, isReady } = useSliderPvp();

  const createWager = async () => {
    if (!isReady) return;
    
    const result = await client.initializeWager(...);
    console.log('Wager created:', result);
  };

  return <button onClick={createWager}>Create Wager</button>;
}
```

## 📚 Contract Functions

### Available Methods

| Method | Description | Who Can Call |
|--------|-------------|--------------|
| `initializeWager()` | Create a new wager | Anyone (pays for account creation) |
| `depositPlayer1()` | Player 1 deposits funds | Player 1 only |
| `depositPlayer2()` | Player 2 deposits funds | Player 2 only |
| `declareWinner()` | Declare game winner | Arbiter only |
| `refund()` | Refund after timeout | Anyone (after 120s) |
| `cancelWager()` | Cancel incomplete wager | Anyone (after 30s deposit timeout) |
| `getWagerStatus()` | Get current wager state | Anyone (read-only) |

### Contract Rules

- **Wager Amount**: Must be > 0 SOL
- **Deposit Timeout**: 30 seconds for both players to deposit
- **Game Timeout**: 120 seconds for arbiter to declare winner
- **Winner Gets**: 95% of total pool
- **Platform Fee**: 5% of total pool
- **PDA Derivation**: `["wager", player1.toBuffer(), player2.toBuffer()]`

## 🔧 Configuration

### Update Program ID

After deploying your contract, update the `PROGRAM_ID` in `SliderPvpClient.ts`:

```typescript
const PROGRAM_ID = new PublicKey('YOUR_DEPLOYED_PROGRAM_ID');
```

### Network Selection

Choose your network in the connection:

```typescript
// Devnet (for testing)
const connection = new Connection('https://api.devnet.solana.com');

// Mainnet (production)
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Custom RPC (recommended for production)
const connection = new Connection('https://your-rpc-url.com');
```

## 🧪 Testing

### Test on Devnet

1. Deploy contract to devnet:
   ```bash
   anchor deploy --provider.cluster devnet
   ```

2. Get devnet SOL:
   ```bash
   solana airdrop 2 YOUR_WALLET --url devnet
   ```

3. Update `PROGRAM_ID` in `SliderPvpClient.ts`

4. Test all functions in your frontend

### Test Checklist

- [ ] Wallet connection works
- [ ] Can create wager
- [ ] Player 1 can deposit
- [ ] Player 2 can deposit
- [ ] Timer starts after both deposits
- [ ] Arbiter can declare winner
- [ ] Winner receives correct amount (95%)
- [ ] Fee recipient receives correct amount (5%)
- [ ] Can refund after timeout
- [ ] Can cancel if deposit timeout expires
- [ ] Status updates work in real-time
- [ ] Error messages are user-friendly

## 🎨 Customization

### Styling

The React component uses inline styles for simplicity. You can:
- Replace with your own CSS classes
- Use a UI library (Material-UI, Chakra UI, etc.)
- Add animations and transitions
- Customize colors and layout

### Features to Add

Consider adding these features to your implementation:
- Transaction history
- Multiple active wagers
- Wager notifications
- Time remaining countdown
- Leaderboard
- Statistics dashboard
- Share wager links
- Mobile optimization

## 🚨 Error Handling

The client provides a `parseError()` method to handle contract errors:

```typescript
try {
  await client.depositPlayer1(player1, player2);
} catch (error) {
  const message = client.parseError(error);
  
  // Display user-friendly messages
  if (message.includes('already deposited')) {
    alert('You already deposited!');
  } else if (message.includes('insufficient')) {
    alert('Not enough SOL');
  } else {
    alert(`Error: ${message}`);
  }
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Player has already deposited" | Trying to deposit twice | Check deposit status first |
| "Unauthorized player" | Wrong wallet trying to deposit | Use correct player wallet |
| "Wager has already been settled" | Game is over | Check `isSettled` status |
| "Timeout period has expired" | Can't declare winner after 120s | Use refund instead |
| "Both players must deposit" | Trying to declare winner too early | Wait for both deposits |

## 📱 Production Best Practices

### Security

1. **Validate all inputs** before sending transactions
2. **Check wallet connection** before every action
3. **Verify addresses** are valid Solana public keys
4. **Confirm transactions** before showing success

### Performance

1. **Use custom RPC** for production (Helius, QuickNode, etc.)
2. **Cache wager data** to reduce RPC calls
3. **Debounce status checks** to avoid rate limiting
4. **Use websocket subscriptions** for real-time updates

### User Experience

1. **Show loading states** during transactions
2. **Display transaction confirmations** with explorer links
3. **Handle wallet disconnection** gracefully
4. **Add retry logic** for failed transactions
5. **Show clear error messages** to users

### Monitoring

1. **Log all transactions** for debugging
2. **Track success/failure rates** 
3. **Monitor RPC latency**
4. **Set up alerts** for critical errors

## 🔗 Resources

- [Contract Documentation](../README.md)
- [Full Integration Guide](../WEB3_INTEGRATION_GUIDE.md)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [Wallet Adapter Guide](https://github.com/solana-labs/wallet-adapter)

## 💬 Support

For issues or questions:
1. Check the main [README](../README.md)
2. Review [FRONTEND_SETUP.md](./FRONTEND_SETUP.md)
3. Read the [Integration Guide](../WEB3_INTEGRATION_GUIDE.md)
4. Check contract logs in Solana Explorer

## 📄 License

Same as the main project license.

