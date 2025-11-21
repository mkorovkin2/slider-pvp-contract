/**
 * Slider PvP Client - Ready-to-use TypeScript client for web3 integration
 * 
 * Usage:
 * 1. Copy this file to your frontend project
 * 2. Update PROGRAM_ID with your deployed program ID
 * 3. Import and use the SliderPvpClient class
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN, Wallet } from '@coral-xyz/anchor';
import type { SliderPvp } from '../target/types/slider_pvp';
import idl from '../target/idl/slider_pvp.json';

// Update this with your deployed program ID
const PROGRAM_ID = new PublicKey('9EeZ1eFrs8QAop7c6ihE4CiXenjVpGPdmFyv6w3XnmcT');

// Contract constants
export const TIMEOUT_SECONDS = 120;
export const DEPOSIT_TIMEOUT_SECONDS = 30;
export const WINNER_PERCENTAGE = 95;
export const FEE_PERCENTAGE = 5;

export interface WagerInfo {
  player1: PublicKey;
  player2: PublicKey;
  arbiter: PublicKey;
  feeRecipient: PublicKey;
  wagerAmount: number; // in SOL
  player1Deposited: boolean;
  player2Deposited: boolean;
  creationTime: number;
  startTime: number;
  winner: number | null;
  isSettled: boolean;
  initializationCost: number; // in SOL
  netPayout: number; // in SOL (after init cost)
  timeRemaining: number | null;
  depositTimeRemaining: number | null;
}

export interface WagerStatus {
  exists: boolean;
  data?: WagerInfo;
}

export class SliderPvpClient {
  private program: Program<SliderPvp>;
  private provider: AnchorProvider;
  private connection: Connection;

  constructor(connection: Connection, wallet: Wallet) {
    this.connection = connection;
    this.provider = new AnchorProvider(
      connection,
      wallet,
      { 
        commitment: 'confirmed',
        preflightCommitment: 'confirmed'
      }
    );
    this.program = new Program<SliderPvp>(
      idl as any,
      PROGRAM_ID,
      this.provider
    );
  }

  /**
   * Derive the PDAs for wager and vault accounts
   */
  getPDAs(player1: PublicKey, player2: PublicKey): { wagerPda: PublicKey; vaultPda: PublicKey } {
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

  /**
   * Initialize a new wager between two players
   */
  async initializeWager(
    player1: PublicKey,
    player2: PublicKey,
    arbiter: PublicKey,
    feeRecipient: PublicKey,
    wagerAmountSol: number
  ): Promise<{ signature: string; wagerPda: PublicKey; vaultPda: PublicKey }> {
    const { wagerPda, vaultPda } = this.getPDAs(player1, player2);
    const wagerAmount = new BN(wagerAmountSol * LAMPORTS_PER_SOL);

    const signature = await this.program.methods
      .initializeWager(player1, player2, arbiter, feeRecipient, wagerAmount)
      .accounts({
        wager: wagerPda,
        vault: vaultPda,
        payer: this.provider.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    await this.confirmTransaction(signature);

    return { signature, wagerPda, vaultPda };
  }

  /**
   * Player 1 deposits their wager amount
   */
  async depositPlayer1(
    player1: PublicKey,
    player2: PublicKey
  ): Promise<string> {
    const { wagerPda, vaultPda } = this.getPDAs(player1, player2);

    const signature = await this.program.methods
      .depositPlayer1()
      .accounts({
        wager: wagerPda,
        vault: vaultPda,
        player1: this.provider.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    await this.confirmTransaction(signature);
    return signature;
  }

  /**
   * Player 2 deposits their wager amount
   */
  async depositPlayer2(
    player1: PublicKey,
    player2: PublicKey
  ): Promise<string> {
    const { wagerPda, vaultPda } = this.getPDAs(player1, player2);

    const signature = await this.program.methods
      .depositPlayer2()
      .accounts({
        wager: wagerPda,
        vault: vaultPda,
        player2: this.provider.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    await this.confirmTransaction(signature);
    return signature;
  }

  /**
   * Arbiter declares the winner
   * @param winner - 1 for player1, 2 for player2
   */
  async declareWinner(
    player1: PublicKey,
    player2: PublicKey,
    winner: 1 | 2
  ): Promise<string> {
    const { wagerPda, vaultPda } = this.getPDAs(player1, player2);
    const wagerAccount = await this.program.account.wager.fetch(wagerPda);
    
    const winnerAccount = winner === 1 ? wagerAccount.player1 : wagerAccount.player2;

    const signature = await this.program.methods
      .declareWinner(winner)
      .accounts({
        wager: wagerPda,
        vault: vaultPda,
        arbiter: this.provider.wallet.publicKey,
        winnerAccount: winnerAccount,
        feeRecipient: wagerAccount.feeRecipient,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    await this.confirmTransaction(signature);
    return signature;
  }

  /**
   * Refund both players after timeout expires
   */
  async refund(
    player1: PublicKey,
    player2: PublicKey
  ): Promise<string> {
    const { wagerPda, vaultPda } = this.getPDAs(player1, player2);

    const signature = await this.program.methods
      .refund()
      .accounts({
        wager: wagerPda,
        vault: vaultPda,
        player1: player1,
        player2: player2,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    await this.confirmTransaction(signature);
    return signature;
  }

  /**
   * Cancel wager if deposit timeout expires
   */
  async cancelWager(
    player1: PublicKey,
    player2: PublicKey
  ): Promise<string> {
    const { wagerPda, vaultPda } = this.getPDAs(player1, player2);

    const signature = await this.program.methods
      .cancelWager()
      .accounts({
        wager: wagerPda,
        vault: vaultPda,
        player1: player1,
        player2: player2,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    await this.confirmTransaction(signature);
    return signature;
  }

  /**
   * Get wager information and status
   */
  async getWagerStatus(
    player1: PublicKey,
    player2: PublicKey
  ): Promise<WagerStatus> {
    const { wagerPda } = this.getPDAs(player1, player2);
    
    try {
      const wagerAccount = await this.program.account.wager.fetch(wagerPda);
      
      const now = Math.floor(Date.now() / 1000);
      
      // Calculate time remaining for game (after both players deposit)
      let timeRemaining: number | null = null;
      if (wagerAccount.player1Deposited && wagerAccount.player2Deposited) {
        const startTime = wagerAccount.startTime.toNumber();
        const elapsed = now - startTime;
        timeRemaining = Math.max(0, TIMEOUT_SECONDS - elapsed);
      }
      
      // Calculate time remaining for deposits
      const creationTime = wagerAccount.creationTime.toNumber();
      const depositElapsed = now - creationTime;
      const depositTimeRemaining = Math.max(0, DEPOSIT_TIMEOUT_SECONDS - depositElapsed);
      
      const totalPool = wagerAccount.wagerAmount.toNumber() * 2;
      const initCost = wagerAccount.initializationCost.toNumber();
      
      return {
        exists: true,
        data: {
          player1: wagerAccount.player1,
          player2: wagerAccount.player2,
          arbiter: wagerAccount.arbiter,
          feeRecipient: wagerAccount.feeRecipient,
          wagerAmount: wagerAccount.wagerAmount.toNumber() / LAMPORTS_PER_SOL,
          player1Deposited: wagerAccount.player1Deposited,
          player2Deposited: wagerAccount.player2Deposited,
          creationTime: wagerAccount.creationTime.toNumber(),
          startTime: wagerAccount.startTime.toNumber(),
          winner: wagerAccount.winner,
          isSettled: wagerAccount.isSettled,
          initializationCost: initCost / LAMPORTS_PER_SOL,
          netPayout: (totalPool - initCost) / LAMPORTS_PER_SOL,
          timeRemaining,
          depositTimeRemaining,
        }
      };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * Subscribe to wager account changes
   * @returns subscription ID - use to unsubscribe later
   */
  async subscribeToWager(
    player1: PublicKey,
    player2: PublicKey,
    callback: (wagerData: WagerInfo | null) => void
  ): Promise<number> {
    const { wagerPda } = this.getPDAs(player1, player2);
    
    const subscriptionId = this.connection.onAccountChange(
      wagerPda,
      async (accountInfo) => {
        try {
          const wagerData = await this.program.account.wager.fetch(wagerPda);
          const now = Math.floor(Date.now() / 1000);
          
          let timeRemaining: number | null = null;
          if (wagerData.player1Deposited && wagerData.player2Deposited) {
            const startTime = wagerData.startTime.toNumber();
            const elapsed = now - startTime;
            timeRemaining = Math.max(0, TIMEOUT_SECONDS - elapsed);
          }
          
          const creationTime = wagerData.creationTime.toNumber();
          const depositElapsed = now - creationTime;
          const depositTimeRemaining = Math.max(0, DEPOSIT_TIMEOUT_SECONDS - depositElapsed);
          
          const totalPool = wagerData.wagerAmount.toNumber() * 2;
          const initCost = wagerData.initializationCost.toNumber();
          
          callback({
            player1: wagerData.player1,
            player2: wagerData.player2,
            arbiter: wagerData.arbiter,
            feeRecipient: wagerData.feeRecipient,
            wagerAmount: wagerData.wagerAmount.toNumber() / LAMPORTS_PER_SOL,
            player1Deposited: wagerData.player1Deposited,
            player2Deposited: wagerData.player2Deposited,
            creationTime: wagerData.creationTime.toNumber(),
            startTime: wagerData.startTime.toNumber(),
            winner: wagerData.winner,
            isSettled: wagerData.isSettled,
            initializationCost: initCost / LAMPORTS_PER_SOL,
            netPayout: (totalPool - initCost) / LAMPORTS_PER_SOL,
            timeRemaining,
            depositTimeRemaining,
          });
        } catch (error) {
          callback(null);
        }
      },
      'confirmed'
    );
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from wager updates
   */
  async unsubscribe(subscriptionId: number): Promise<void> {
    await this.connection.removeAccountChangeListener(subscriptionId);
  }

  /**
   * Check if a wager exists
   */
  async wagerExists(player1: PublicKey, player2: PublicKey): Promise<boolean> {
    const status = await this.getWagerStatus(player1, player2);
    return status.exists;
  }

  /**
   * Calculate potential winnings (accounting for initialization cost)
   * @param wagerAmountSol - Amount each player deposits in SOL
   * @param initializationCostSol - Initialization cost (default: ~0.002 SOL)
   */
  calculateWinnings(wagerAmountSol: number, initializationCostSol: number = 0.002): {
    winnerAmount: number;
    feeAmount: number;
    totalPool: number;
    distributablePool: number;
  } {
    const totalPool = wagerAmountSol * 2;
    const distributablePool = totalPool - initializationCostSol;
    const winnerAmount = distributablePool * (WINNER_PERCENTAGE / 100);
    const feeAmount = distributablePool * (FEE_PERCENTAGE / 100);
    
    return {
      winnerAmount,
      feeAmount,
      totalPool,
      distributablePool,
    };
  }

  /**
   * Wait for transaction confirmation
   */
  private async confirmTransaction(signature: string): Promise<void> {
    const latestBlockhash = await this.connection.getLatestBlockhash();
    
    await this.connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
  }

  /**
   * Parse error messages from transactions
   */
  parseError(error: any): string {
    if (error.error && error.error.errorMessage) {
      return error.error.errorMessage;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'Unknown error occurred';
  }
}

/**
 * Helper function to create a client instance
 */
export function createSliderPvpClient(
  connection: Connection,
  wallet: Wallet
): SliderPvpClient {
  return new SliderPvpClient(connection, wallet);
}

