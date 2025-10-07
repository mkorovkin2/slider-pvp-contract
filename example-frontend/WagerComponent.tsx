/**
 * Example React Component using Slider PvP Client
 * 
 * This demonstrates how to integrate the Slider PvP contract into a React app
 * with wallet adapter support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { SliderPvpClient, WagerInfo } from './SliderPvpClient';

// Make sure to include wallet adapter CSS in your app:
// import '@solana/wallet-adapter-react-ui/styles.css';

export function WagerComponent() {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  // State
  const [client, setClient] = useState<SliderPvpClient | null>(null);
  const [wagerStatus, setWagerStatus] = useState<WagerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form inputs
  const [player2Address, setPlayer2Address] = useState('');
  const [arbiterAddress, setArbiterAddress] = useState('');
  const [feeRecipientAddress, setFeeRecipientAddress] = useState('');
  const [wagerAmount, setWagerAmount] = useState('0.1');
  
  // Initialize client when wallet connects
  useEffect(() => {
    if (wallet.publicKey && wallet.signTransaction && wallet.signAllTransactions) {
      const walletAdapter: Wallet = {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction.bind(wallet),
        signAllTransactions: wallet.signAllTransactions.bind(wallet),
      };
      
      const newClient = new SliderPvpClient(connection, walletAdapter);
      setClient(newClient);
    } else {
      setClient(null);
    }
  }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);
  
  // Subscribe to wager updates
  const subscribeToWager = useCallback(async (player1: PublicKey, player2: PublicKey) => {
    if (!client) return;
    
    const subscriptionId = await client.subscribeToWager(
      player1,
      player2,
      (data) => {
        setWagerStatus(data);
      }
    );
    
    // Cleanup subscription
    return () => {
      client.unsubscribe(subscriptionId);
    };
  }, [client]);
  
  // Create a new wager
  const handleCreateWager = async () => {
    if (!client || !wallet.publicKey) {
      setError('Please connect your wallet');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const player2 = new PublicKey(player2Address);
      const arbiter = new PublicKey(arbiterAddress);
      const feeRecipient = new PublicKey(feeRecipientAddress);
      
      const { signature, wagerPda } = await client.initializeWager(
        wallet.publicKey,
        player2,
        arbiter,
        feeRecipient,
        parseFloat(wagerAmount)
      );
      
      console.log('✅ Wager created!');
      console.log('Transaction:', signature);
      console.log('Wager PDA:', wagerPda.toString());
      
      // Subscribe to updates
      await subscribeToWager(wallet.publicKey, player2);
      
      // Fetch initial status
      const status = await client.getWagerStatus(wallet.publicKey, player2);
      if (status.data) {
        setWagerStatus(status.data);
      }
      
    } catch (err: any) {
      console.error('Error creating wager:', err);
      setError(client.parseError(err));
    } finally {
      setLoading(false);
    }
  };
  
  // Deposit as player 1
  const handleDepositPlayer1 = async () => {
    if (!client || !wallet.publicKey) {
      setError('Please connect your wallet');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const player2 = new PublicKey(player2Address);
      
      const signature = await client.depositPlayer1(wallet.publicKey, player2);
      
      console.log('✅ Player 1 deposited!');
      console.log('Transaction:', signature);
      
    } catch (err: any) {
      console.error('Error depositing:', err);
      setError(client.parseError(err));
    } finally {
      setLoading(false);
    }
  };
  
  // Deposit as player 2
  const handleDepositPlayer2 = async () => {
    if (!client || !wallet.publicKey) {
      setError('Please connect your wallet');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const player1 = new PublicKey(player2Address); // In real app, get from wager data
      
      const signature = await client.depositPlayer2(player1, wallet.publicKey);
      
      console.log('✅ Player 2 deposited!');
      console.log('Transaction:', signature);
      
    } catch (err: any) {
      console.error('Error depositing:', err);
      setError(client.parseError(err));
    } finally {
      setLoading(false);
    }
  };
  
  // Declare winner (arbiter only)
  const handleDeclareWinner = async (winner: 1 | 2) => {
    if (!client || !wallet.publicKey) {
      setError('Please connect your wallet');
      return;
    }
    
    if (!wagerStatus) {
      setError('No active wager found');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const signature = await client.declareWinner(
        wagerStatus.player1,
        wagerStatus.player2,
        winner
      );
      
      console.log('✅ Winner declared!');
      console.log('Transaction:', signature);
      
    } catch (err: any) {
      console.error('Error declaring winner:', err);
      setError(client.parseError(err));
    } finally {
      setLoading(false);
    }
  };
  
  // Check wager status
  const handleCheckStatus = async () => {
    if (!client || !wallet.publicKey) {
      setError('Please connect your wallet');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const player2 = new PublicKey(player2Address);
      const status = await client.getWagerStatus(wallet.publicKey, player2);
      
      if (status.exists && status.data) {
        setWagerStatus(status.data);
        console.log('Wager status:', status.data);
      } else {
        setError('Wager does not exist');
        setWagerStatus(null);
      }
      
    } catch (err: any) {
      console.error('Error checking status:', err);
      setError(client.parseError(err));
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate potential winnings
  const winningsInfo = client?.calculateWinnings(parseFloat(wagerAmount));
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Slider PvP Wager</h1>
      
      {/* Wallet Connection */}
      <div style={{ marginBottom: '20px' }}>
        <WalletMultiButton />
      </div>
      
      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '4px',
          color: '#d32f2f'
        }}>
          ❌ {error}
        </div>
      )}
      
      {/* Create Wager Form */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Create New Wager</h2>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Player 2 Address:</label>
          <input
            type="text"
            value={player2Address}
            onChange={(e) => setPlayer2Address(e.target.value)}
            placeholder="Enter player 2 public key"
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Arbiter Address:</label>
          <input
            type="text"
            value={arbiterAddress}
            onChange={(e) => setArbiterAddress(e.target.value)}
            placeholder="Enter arbiter public key"
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Fee Recipient Address:</label>
          <input
            type="text"
            value={feeRecipientAddress}
            onChange={(e) => setFeeRecipientAddress(e.target.value)}
            placeholder="Enter fee recipient public key"
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Wager Amount (SOL):</label>
          <input
            type="number"
            step="0.01"
            value={wagerAmount}
            onChange={(e) => setWagerAmount(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        
        {winningsInfo && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px',
            marginBottom: '10px',
            fontSize: '14px'
          }}>
            <div>Total Pool: {winningsInfo.totalPool.toFixed(3)} SOL</div>
            <div>Winner Gets: {winningsInfo.winnerAmount.toFixed(3)} SOL (95%)</div>
            <div>Platform Fee: {winningsInfo.feeAmount.toFixed(3)} SOL (5%)</div>
          </div>
        )}
        
        <button
          onClick={handleCreateWager}
          disabled={loading || !wallet.publicKey}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%',
            fontSize: '16px'
          }}
        >
          {loading ? 'Creating...' : 'Create Wager'}
        </button>
      </div>
      
      {/* Wager Actions */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Wager Actions</h2>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleDepositPlayer1}
            disabled={loading || !wallet.publicKey}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              flex: 1
            }}
          >
            Deposit (Player 1)
          </button>
          
          <button
            onClick={handleDepositPlayer2}
            disabled={loading || !wallet.publicKey}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              flex: 1
            }}
          >
            Deposit (Player 2)
          </button>
          
          <button
            onClick={handleCheckStatus}
            disabled={loading || !wallet.publicKey}
            style={{
              padding: '10px 20px',
              backgroundColor: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              flex: 1
            }}
          >
            Check Status
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleDeclareWinner(1)}
            disabled={loading || !wallet.publicKey}
            style={{
              padding: '10px 20px',
              backgroundColor: '#9C27B0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              flex: 1
            }}
          >
            Declare Player 1 Winner
          </button>
          
          <button
            onClick={() => handleDeclareWinner(2)}
            disabled={loading || !wallet.publicKey}
            style={{
              padding: '10px 20px',
              backgroundColor: '#9C27B0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              flex: 1
            }}
          >
            Declare Player 2 Winner
          </button>
        </div>
      </div>
      
      {/* Wager Status Display */}
      {wagerStatus && (
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h2>Wager Status</h2>
          
          <div style={{ display: 'grid', gap: '10px' }}>
            <div>
              <strong>Player 1:</strong> {wagerStatus.player1.toString()}
              {wagerStatus.player1Deposited ? ' ✅' : ' ⏳'}
            </div>
            
            <div>
              <strong>Player 2:</strong> {wagerStatus.player2.toString()}
              {wagerStatus.player2Deposited ? ' ✅' : ' ⏳'}
            </div>
            
            <div>
              <strong>Arbiter:</strong> {wagerStatus.arbiter.toString()}
            </div>
            
            <div>
              <strong>Wager Amount:</strong> {wagerStatus.wagerAmount} SOL each
            </div>
            
            <div>
              <strong>Status:</strong> {
                wagerStatus.isSettled 
                  ? `Settled - Winner: Player ${wagerStatus.winner}` 
                  : wagerStatus.player1Deposited && wagerStatus.player2Deposited
                    ? 'In Progress'
                    : 'Waiting for Deposits'
              }
            </div>
            
            {wagerStatus.timeRemaining !== null && wagerStatus.timeRemaining > 0 && (
              <div>
                <strong>Time Remaining:</strong> {wagerStatus.timeRemaining} seconds
              </div>
            )}
            
            {wagerStatus.depositTimeRemaining !== null && wagerStatus.depositTimeRemaining > 0 && 
             !wagerStatus.player1Deposited && !wagerStatus.player2Deposited && (
              <div>
                <strong>Deposit Time Remaining:</strong> {wagerStatus.depositTimeRemaining} seconds
              </div>
            )}
            
            <div>
              <strong>Created:</strong> {new Date(wagerStatus.creationTime * 1000).toLocaleString()}
            </div>
            
            {wagerStatus.startTime > 0 && (
              <div>
                <strong>Started:</strong> {new Date(wagerStatus.startTime * 1000).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WagerComponent;

