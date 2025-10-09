#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SLIDER PVP - PLAYER WALLET FUNDING SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 PURPOSE:
 * Transfer SOL from your main wallet to test player wallets so they can
 * participate in wagers and contract testing.
 * 
 * 📋 WHAT THIS DOES:
 * • Loads main wallet (your devnet wallet with SOL)
 * • Loads test player wallets (initially empty)
 * • Checks current balances of all wallets
 * • Transfers 0.3 SOL to each player wallet (if needed)
 * • Smart funding - only transfers if wallet balance is low
 * • Displays before/after balances
 * 
 * 🚀 WHEN TO USE:
 * • Essential setup step before running transaction tests
 * • After creating new test player wallets
 * • When player wallets run out of SOL for testing
 * • Before running: direct-test.js, full-test.js, etc.
 * 
 * ⚡ EXECUTION:
 * ```bash
 * cd devnet-testing
 * node fund-players.js
 * ```
 * 
 * 💰 FUNDING DETAILS:
 * • Amount per player: 0.3 SOL (enough for multiple test wagers)
 * • Minimum main wallet balance needed: ~0.7 SOL (funding + fees)
 * • Transaction fees: ~0.005 SOL per transfer
 * • Smart logic: Only funds if player balance < 0.3 SOL
 * 
 * 🔧 REQUIREMENTS:
 * • Main wallet with sufficient SOL (get from https://faucet.solana.com)
 * • Main wallet at ~/.config/solana/id.json
 * • Test player wallet files: ./test-player1.json, ./test-player2.json  
 * • Solana CLI configured for devnet
 * • Network connectivity to Solana devnet
 * 
 * ✅ SUCCESS INDICATORS:
 * • "Player 1 funded: [transaction_signature]" messages
 * • Updated balance displays showing 0.3 SOL per player
 * • "FUNDING COMPLETE!" success message
 * • No error messages
 * 
 * 💸 COST BREAKDOWN:
 * • Player 1: 0.3 SOL + ~0.005 SOL fee
 * • Player 2: 0.3 SOL + ~0.005 SOL fee  
 * • Total cost: ~0.61 SOL from main wallet
 * 
 * 🛡️ SAFETY FEATURES:
 * • Pre-flight balance checks
 * • Only funds if wallet needs SOL
 * • Clear transaction confirmations
 * • Error handling for insufficient funds
 * 
 * ⚠️ TROUBLESHOOTING:
 * • "Insufficient funds" → Get more SOL from devnet faucets
 * • "Connection refused" → Check devnet connectivity
 * • Missing wallet files → Run wallet creation commands first
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const fs = require('fs');

const DEVNET_URL = "https://api.devnet.solana.com";
const FUND_AMOUNT = 0.3 * LAMPORTS_PER_SOL; // Give each player 0.3 SOL

async function fundPlayers() {
  console.log("🏦 Funding Player Wallets");
  console.log("========================\n");
  
  try {
    const connection = new Connection(DEVNET_URL, "confirmed");
    
    // Load wallets
    const payerKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf8")))
    );
    
    const player1Keypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync("./test-player1.json", "utf8")))
    );
    
    const player2Keypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync("./test-player2.json", "utf8")))
    );
    
    console.log("📋 Addresses:");
    console.log(`   Payer:    ${payerKeypair.publicKey.toString()}`);
    console.log(`   Player 1: ${player1Keypair.publicKey.toString()}`);
    console.log(`   Player 2: ${player2Keypair.publicKey.toString()}`);
    
    // Check initial balances
    const payerBalance = await connection.getBalance(payerKeypair.publicKey);
    const player1Balance = await connection.getBalance(player1Keypair.publicKey);
    const player2Balance = await connection.getBalance(player2Keypair.publicKey);
    
    console.log("\n💰 Initial Balances:");
    console.log(`   Payer:    ${(payerBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`   Player 1: ${(player1Balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`   Player 2: ${(player2Balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    
    // Check if we have enough to fund
    const totalNeeded = FUND_AMOUNT * 2 + (0.01 * LAMPORTS_PER_SOL); // funding + fees
    if (payerBalance < totalNeeded) {
      console.log(`\n❌ Insufficient funds. Need ${(totalNeeded / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
      return;
    }
    
    // Fund Player 1 (only if needed)
    if (player1Balance < FUND_AMOUNT) {
      console.log(`\n💸 Funding Player 1 with ${FUND_AMOUNT / LAMPORTS_PER_SOL} SOL...`);
      const fundPlayer1Tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payerKeypair.publicKey,
          toPubkey: player1Keypair.publicKey,
          lamports: FUND_AMOUNT,
        })
      );
      
      const sig1 = await sendAndConfirmTransaction(
        connection,
        fundPlayer1Tx,
        [payerKeypair],
        { commitment: 'confirmed' }
      );
      console.log(`   ✅ Player 1 funded: ${sig1}`);
    } else {
      console.log("\n✅ Player 1 already has sufficient funds");
    }
    
    // Fund Player 2 (only if needed)
    if (player2Balance < FUND_AMOUNT) {
      console.log(`\n💸 Funding Player 2 with ${FUND_AMOUNT / LAMPORTS_PER_SOL} SOL...`);
      const fundPlayer2Tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payerKeypair.publicKey,
          toPubkey: player2Keypair.publicKey,
          lamports: FUND_AMOUNT,
        })
      );
      
      const sig2 = await sendAndConfirmTransaction(
        connection,
        fundPlayer2Tx,
        [payerKeypair],
        { commitment: 'confirmed' }
      );
      console.log(`   ✅ Player 2 funded: ${sig2}`);
    } else {
      console.log("\n✅ Player 2 already has sufficient funds");
    }
    
    // Final balances
    const finalPayerBalance = await connection.getBalance(payerKeypair.publicKey);
    const finalPlayer1Balance = await connection.getBalance(player1Keypair.publicKey);
    const finalPlayer2Balance = await connection.getBalance(player2Keypair.publicKey);
    
    console.log("\n💰 Final Balances:");
    console.log(`   Payer:    ${(finalPayerBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`   Player 1: ${(finalPlayer1Balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`   Player 2: ${(finalPlayer2Balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    
    console.log("\n🎉 FUNDING COMPLETE! 🎉");
    console.log("=======================");
    console.log("✅ Player wallets funded and ready for testing");
    
  } catch (error) {
    console.error("❌ Funding failed:", error.message);
  }
}

fundPlayers().catch(console.error);
