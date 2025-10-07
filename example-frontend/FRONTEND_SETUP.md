# Frontend Setup Guide

This guide shows you how to set up your React/Next.js app to use the Slider PvP contract.

## Quick Setup

### 1. Install Dependencies

```bash
npm install @solana/web3.js @coral-xyz/anchor @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/wallet-adapter-base
```

### 2. Copy Files to Your Project

Copy these files to your frontend project:
- `SliderPvpClient.ts` → `src/lib/SliderPvpClient.ts`
- `WagerComponent.tsx` → `src/components/WagerComponent.tsx`
- Your IDL file → `src/idl/slider_pvp.json`
- Type definitions → `src/types/slider_pvp.ts`

### 3. Setup Wallet Provider (React)

Create a wallet context provider:

```tsx
// src/components/WalletContextProvider.tsx
import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

require('@solana/wallet-adapter-react-ui/styles.css');

interface Props {
  children: ReactNode;
}

export const WalletContextProvider: FC<Props> = ({ children }) => {
  // Use devnet for testing, mainnet-beta for production
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  // Or use custom RPC: const endpoint = 'https://api.mainnet-beta.solana.com';

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
```

### 4. Wrap Your App

```tsx
// src/App.tsx or src/pages/_app.tsx (Next.js)
import { WalletContextProvider } from './components/WalletContextProvider';
import { WagerComponent } from './components/WagerComponent';

function App() {
  return (
    <WalletContextProvider>
      <WagerComponent />
    </WalletContextProvider>
  );
}

export default App;
```

---

## Next.js Specific Setup

For Next.js, you need some additional configuration:

### 1. Update next.config.js

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      path: false,
      os: false,
    };
    return config;
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
```

### 2. Import Wallet Styles Globally

In `pages/_app.tsx`:

```tsx
import '@solana/wallet-adapter-react-ui/styles.css';
import '../styles/globals.css';
```

### 3. Handle SSR for Wallet Adapter

```tsx
// components/WalletContextProvider.tsx (Next.js version)
import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import dynamic from 'next/dynamic';

require('@solana/wallet-adapter-react-ui/styles.css');

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletContextProvider;

// Then use it like this in _app.tsx:
// const WalletProvider = dynamic(() => import('../components/WalletContextProvider'), {
//   ssr: false,
// });
```

---

## Usage Examples

### Basic Usage

```tsx
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SliderPvpClient } from '@/lib/SliderPvpClient';
import { PublicKey } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

function MyComponent() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const createWager = async () => {
    if (!wallet.publicKey) return;

    const client = new SliderPvpClient(connection, wallet as Wallet);

    const player2 = new PublicKey('PLAYER2_ADDRESS');
    const arbiter = new PublicKey('ARBITER_ADDRESS');
    const feeRecipient = new PublicKey('FEE_ADDRESS');

    const { signature, wagerPda } = await client.initializeWager(
      wallet.publicKey,
      player2,
      arbiter,
      feeRecipient,
      0.1 // 0.1 SOL
    );

    console.log('Created wager:', signature);
  };

  return <button onClick={createWager}>Create Wager</button>;
}
```

### With State Management

```tsx
import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SliderPvpClient, WagerInfo } from '@/lib/SliderPvpClient';
import { PublicKey } from '@solana/web3.js';

function WagerDashboard() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [client, setClient] = useState<SliderPvpClient | null>(null);
  const [wagers, setWagers] = useState<WagerInfo[]>([]);

  useEffect(() => {
    if (wallet.publicKey) {
      const newClient = new SliderPvpClient(connection, wallet as any);
      setClient(newClient);
    }
  }, [connection, wallet.publicKey]);

  const loadWager = async (player1: string, player2: string) => {
    if (!client) return;

    const status = await client.getWagerStatus(
      new PublicKey(player1),
      new PublicKey(player2)
    );

    if (status.exists && status.data) {
      setWagers([...wagers, status.data]);
    }
  };

  return (
    <div>
      {/* Your UI here */}
    </div>
  );
}
```

### Real-time Updates

```tsx
import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SliderPvpClient, WagerInfo } from '@/lib/SliderPvpClient';
import { PublicKey } from '@solana/web3.js';

function LiveWager({ player1, player2 }: { player1: string; player2: string }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [wagerData, setWagerData] = useState<WagerInfo | null>(null);

  useEffect(() => {
    if (!wallet.publicKey) return;

    const client = new SliderPvpClient(connection, wallet as any);
    let subscriptionId: number;

    // Subscribe to updates
    client.subscribeToWager(
      new PublicKey(player1),
      new PublicKey(player2),
      (data) => {
        setWagerData(data);
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

  if (!wagerData) return <div>Loading...</div>;

  return (
    <div>
      <h3>Live Wager Status</h3>
      <p>Player 1 Deposited: {wagerData.player1Deposited ? '✅' : '⏳'}</p>
      <p>Player 2 Deposited: {wagerData.player2Deposited ? '✅' : '⏳'}</p>
      {wagerData.timeRemaining !== null && (
        <p>Time Remaining: {wagerData.timeRemaining}s</p>
      )}
    </div>
  );
}
```

---

## Environment Variables

Create a `.env.local` file:

```bash
# For devnet testing
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS

# For mainnet
# NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Or use a custom RPC like Helius, QuickNode, etc.
# NEXT_PUBLIC_SOLANA_RPC_URL=https://rpc.helius.xyz/?api-key=YOUR_KEY
```

Use in your code:

```tsx
const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
```

---

## Error Handling

```tsx
async function handleTransaction() {
  try {
    const signature = await client.depositPlayer1(player1, player2);
    // Success
    toast.success('Deposit successful!');
  } catch (error: any) {
    // Parse the error
    const errorMessage = client?.parseError(error) || 'Unknown error';
    
    // Show user-friendly message
    if (errorMessage.includes('already deposited')) {
      toast.error('You have already deposited for this wager');
    } else if (errorMessage.includes('insufficient')) {
      toast.error('Insufficient SOL balance');
    } else {
      toast.error(`Error: ${errorMessage}`);
    }
    
    console.error('Transaction error:', error);
  }
}
```

---

## Production Checklist

Before deploying to production:

- [ ] Update `PROGRAM_ID` in `SliderPvpClient.ts`
- [ ] Switch RPC endpoint to mainnet or custom RPC
- [ ] Test all flows on devnet first
- [ ] Add proper error handling for all transactions
- [ ] Implement transaction confirmation UI
- [ ] Add loading states for all async operations
- [ ] Handle wallet disconnection gracefully
- [ ] Add analytics/monitoring
- [ ] Test with real wallets (Phantom, Solflare, etc.)
- [ ] Optimize RPC calls (use polling interval for status checks)
- [ ] Add transaction retry logic
- [ ] Implement proper logging

---

## Testing

### Local Testing with Anchor

```bash
# Start local validator
anchor localnet

# In another terminal, run tests
anchor test --skip-local-validator
```

### Devnet Testing

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Update program ID in SliderPvpClient.ts
# Test with devnet in your frontend
```

### Get Devnet SOL

```bash
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

---

## Common Issues

### Issue: "Wallet not connected"
**Solution:** Make sure wallet adapter is properly set up and user has connected their wallet.

### Issue: "Insufficient funds"
**Solution:** Ensure user has enough SOL for the wager amount + transaction fees (~0.001 SOL).

### Issue: "Transaction simulation failed"
**Solution:** Check if the wager already exists or has already been settled.

### Issue: Next.js build errors with Solana packages
**Solution:** Update `next.config.js` with webpack fallbacks (see above).

### Issue: "Cannot read property of undefined" in SSR
**Solution:** Use dynamic imports with `ssr: false` for wallet components.

---

## Advanced: Custom Hooks

Create a custom hook for easier usage:

```tsx
// hooks/useSliderPvp.ts
import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SliderPvpClient } from '@/lib/SliderPvpClient';

export function useSliderPvp() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const client = useMemo(() => {
    if (!wallet.publicKey) return null;
    return new SliderPvpClient(connection, wallet as any);
  }, [connection, wallet.publicKey]);

  return {
    client,
    isReady: !!client,
    publicKey: wallet.publicKey,
  };
}

// Usage:
function MyComponent() {
  const { client, isReady } = useSliderPvp();

  const createWager = async () => {
    if (!isReady || !client) return;
    // Use client...
  };

  return <button onClick={createWager}>Create</button>;
}
```

---

## Resources

- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Next.js + Solana Example](https://github.com/solana-labs/wallet-adapter/tree/master/packages/starter/example)

