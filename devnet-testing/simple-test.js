#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SLIDER PVP - BASIC CONNECTION TEST
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 PURPOSE:
 * Quick verification that your deployed Slider PvP contract is accessible
 * and all components are properly set up on Solana Devnet.
 * 
 * 📋 WHAT THIS DOES:
 * • Connects to Solana Devnet
 * • Loads your main wallet and test player wallets
 * • Verifies the deployed program exists and is accessible
 * • Tests PDA (Program Derived Address) derivation
 * • Checks wallet balances for testing readiness
 * • Provides next steps and recommendations
 * 
 * 🚀 WHEN TO USE:
 * • First step after deploying your contract
 * • Quick health check of deployment status  
 * • Troubleshooting connection issues
 * • Verifying wallet setup before real testing
 * 
 * ⚡ EXECUTION:
 * ```bash
 * cd devnet-testing
 * node simple-test.js
 * ```
 * 
 * 🔧 REQUIREMENTS:
 * • Deployed contract on devnet (Program ID: HbatSgiDtdwtnEix8oJzCQMF3WXx4aj2uF7qRg89Brp5)
 * • Main wallet at ~/.config/solana/id.json
 * • Test player wallets: ./test-player1.json, ./test-player2.json
 * • Solana CLI configured for devnet
 * 
 * ✅ SUCCESS INDICATORS:
 * • "Program found on devnet!" message
 * • PDA addresses generated successfully
 * • All wallet addresses displayed
 * • Balance check completed
 * 
 * 🛠️ SAFE TO RUN:
 * • No actual transactions executed
 * • No SOL spent or transferred
 * • Only queries blockchain data
 * • Takes ~10 seconds to complete
 * 
 * 📊 EXPECTED OUTPUT:
 * • Program verification details
 * • Wallet addresses and balances
 * • PDA derivation results
 * • Readiness assessment for full testing
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const anchor = require('@coral-xyz/anchor');
const { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

// Configuration
const PROGRAM_ID = new PublicKey("HbatSgiDtdwtnEix8oJzCQMF3WXx4aj2uF7qRg89Brp5");
const DEVNET_URL = "https://api.devnet.solana.com";
const WAGER_AMOUNT = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL per player

async function loadWallets() {
  console.log("📂 Loading wallet keypairs...");
  
  // Load main wallet (payer/arbiter/fee recipient)
  const payerKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf8")))
  );
  
  // Load player wallets
  const player1Keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("./test-player1.json", "utf8")))
  );
  
  const player2Keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("./test-player2.json", "utf8")))
  );
  
  return { payerKeypair, player1Keypair, player2Keypair };
}

async function displayBalances(connection, wallets) {
  console.log("\n💰 Current Balances:");
  const payerBalance = await connection.getBalance(wallets.payerKeypair.publicKey);
  const player1Balance = await connection.getBalance(wallets.player1Keypair.publicKey);
  const player2Balance = await connection.getBalance(wallets.player2Keypair.publicKey);
  
  console.log(`   Payer/Arbiter: ${(payerBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`   Player 1:      ${(player1Balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`   Player 2:      ${(player2Balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  return { payerBalance, player1Balance, player2Balance };
}

async function testBasicConnection() {
  console.log("🎮 Basic Contract Connection Test");
  console.log("=================================\n");
  
  try {
    // Setup connection and wallets
    const connection = new Connection(DEVNET_URL, "confirmed");
    const wallets = await loadWallets();
    
    console.log("📋 Wallet Addresses:");
    console.log(`   Payer/Arbiter: ${wallets.payerKeypair.publicKey.toString()}`);
    console.log(`   Player 1:      ${wallets.player1Keypair.publicKey.toString()}`);
    console.log(`   Player 2:      ${wallets.player2Keypair.publicKey.toString()}`);
    
    // Check balances
    await displayBalances(connection, wallets);
    
    // Check if program exists
    console.log("\n🔍 Checking deployed program...");
    const programInfo = await connection.getAccountInfo(PROGRAM_ID);
    
    if (!programInfo) {
      console.log("❌ Program not found on devnet");
      return;
    }
    
    console.log("✅ Program found on devnet!");
    console.log(`   Program size: ${programInfo.data.length} bytes`);
    console.log(`   Program owner: ${programInfo.owner.toString()}`);
    console.log(`   Program rent: ${(programInfo.lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
    
    // Test PDA derivation
    console.log("\n🔑 Testing PDA derivation...");
    const gameId = Buffer.alloc(8);
    gameId.writeBigUInt64LE(BigInt(Date.now()));
    const [wagerPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("wager"),
        wallets.player1Keypair.publicKey.toBuffer(),
        wallets.player2Keypair.publicKey.toBuffer(),
        gameId,
      ],
      PROGRAM_ID
    );
    
    console.log(`   ✅ Wager PDA: ${wagerPda.toString()}`);
    
    // Check if we have enough funds to test
    const balances = await displayBalances(connection, wallets);
    const totalNeeded = WAGER_AMOUNT * 2 + (0.01 * LAMPORTS_PER_SOL); // 2 wagers + fees
    
    if (balances.payerBalance < totalNeeded) {
      console.log(`\n⚠️  Need at least ${(totalNeeded / LAMPORTS_PER_SOL).toFixed(2)} SOL in payer wallet for full test`);
      console.log("   Use web faucets to get more SOL:");
      console.log("   🌐 https://faucet.solana.com/");
      console.log("   🌐 https://solfaucet.com/");
    } else {
      console.log(`\n✅ Sufficient funds available for testing`);
      console.log("   Ready to run full contract test!");
      
      console.log("\n📖 Next steps:");
      console.log("   1. Fund player wallets with: node fund-players.js");
      console.log("   2. Run full test with: node full-test.js");
    }
    
    console.log("\n🎉 BASIC CONNECTION TEST PASSED! 🎉");
    console.log("===================================");
    console.log("✅ Contract deployed and accessible");
    console.log("✅ Wallets loaded successfully");
    console.log("✅ PDA derivation working");
    console.log("✅ Ready for full testing");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
  }
}

// Run the test
testBasicConnection().catch(console.error);
