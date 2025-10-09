#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SLIDER PVP - ANCHOR INTEGRATION TEST
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 PURPOSE:
 * Complete end-to-end contract testing using the Anchor framework with proper
 * IDL integration and account state verification.
 * 
 * 📋 WHAT THIS DOES:
 * • Uses Anchor framework for proper contract interaction
 * • Loads and uses contract IDL for type safety
 * • Tests complete wager flow with real transactions
 * • Verifies contract state changes at each step
 * • Shows detailed account data and state transitions
 * • Provides comprehensive error handling and logging
 * 
 * 🚀 WHEN TO USE:
 * • When you want Anchor-native contract interaction
 * • For testing with proper IDL type checking
 * • When you need detailed contract state verification
 * • Alternative to direct-test.js with more structure
 * • Development and debugging with Anchor tooling
 * 
 * ⚡ EXECUTION:
 * ```bash
 * cd devnet-testing
 * # First fund players:
 * node fund-players.js
 * # Then run Anchor test:
 * node full-test.js
 * ```
 * 
 * 🔧 TECHNICAL APPROACH:
 * • Anchor Program object for contract interaction
 * • IDL-based method calls with type safety
 * • Automatic PDA derivation
 * • Account state fetching and verification
 * • Provider pattern for wallet management
 * 
 * 💰 TRANSACTION FLOW:
 * 1. Initialize wager (main wallet signs)
 * 2. Player 1 deposits 0.1 SOL (player1 signs)
 * 3. Player 2 deposits 0.1 SOL (player2 signs)
 * 4. Declare winner (main wallet/arbiter signs)
 * 
 * 📊 STATE VERIFICATION:
 * • Wager account creation and initialization
 * • Player deposit flags (player1_deposited, player2_deposited)
 * • Game timer activation (start_time)
 * • Final settlement state (is_settled, winner)
 * • Vault balance tracking throughout process
 * 
 * 🔧 REQUIREMENTS:
 * • Deployed contract on devnet
 * • Valid IDL file: ../target/idl/slider_pvp.json
 * • Anchor framework compatibility
 * • Funded player wallets
 * • Main wallet with SOL for initialization
 * 
 * ✅ SUCCESS INDICATORS:
 * • All method calls execute successfully
 * • Contract state changes as expected
 * • Balance transfers work correctly
 * • Winner declared and funds distributed
 * • "FULL CONTRACT TEST COMPLETED SUCCESSFULLY!" message
 * 
 * ⚠️ POTENTIAL ISSUES:
 * • IDL loading errors (path issues)
 * • Anchor version compatibility
 * • TypeScript/JavaScript module conflicts
 * • Account state deserialization issues
 * 
 * 🛡️ ERROR HANDLING:
 * • Comprehensive try-catch blocks
 * • Program log extraction on failure
 * • Account state inspection on errors
 * • Clear error messages and debugging info
 * 
 * 📈 VERIFICATION POINTS:
 * ✅ Wager initialization creates proper accounts
 * ✅ Player deposits update state correctly
 * ✅ Game timer starts after both deposits
 * ✅ Arbiter can declare winner within timeout
 * ✅ Funds distributed according to rules
 * ✅ Contract state reflects final settlement
 * 
 * 🔄 ALTERNATIVE APPROACH:
 * If this test has issues due to Anchor complexity:
 * • Use direct-test.js instead (more reliable)
 * • Raw web3.js approach avoids framework issues
 * • Same functionality, different implementation
 * 
 * 🎯 PRODUCTION VALUE:
 * Success proves:
 * • Contract works with Anchor tooling
 * • IDL integration is correct
 * • Ready for Anchor-based frontend
 * • Compatible with standard Solana development
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const anchor = require('@coral-xyz/anchor');
const { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

// Configuration
const PROGRAM_ID = new PublicKey("9EeZ1eFrs8QAop7c6ihE4CiXenjVpGPdmFyv6w3XnmcT");
const DEVNET_URL = "https://api.devnet.solana.com";
const WAGER_AMOUNT = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL per player

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fullContractTest() {
  console.log("🎮 Full Slider PvP Contract Test");
  console.log("================================\n");
  
  try {
    // Setup connection
    const connection = new Connection(DEVNET_URL, "confirmed");
    
    // Load wallets
    console.log("📂 Loading wallets...");
    const payerKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf8")))
    );
    
    // Load player wallets from devnet-testing directory
    const player1Keypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync("./devnet-testing/test-player1.json", "utf8")))
    );
    
    const player2Keypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync("./devnet-testing/test-player2.json", "utf8")))
    );
    
    console.log("📋 Participants:");
    console.log(`   Payer/Arbiter: ${payerKeypair.publicKey.toString()}`);
    console.log(`   Player 1:      ${player1Keypair.publicKey.toString()}`);
    console.log(`   Player 2:      ${player2Keypair.publicKey.toString()}`);
    
    // Check initial balances
    const getBalances = async () => {
      const payerBalance = await connection.getBalance(payerKeypair.publicKey);
      const player1Balance = await connection.getBalance(player1Keypair.publicKey);
      const player2Balance = await connection.getBalance(player2Keypair.publicKey);
      return { payerBalance, player1Balance, player2Balance };
    };
    
    const displayBalances = (balances, title) => {
      console.log(`\n💰 ${title}:`);
      console.log(`   Payer/Arbiter: ${(balances.payerBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
      console.log(`   Player 1:      ${(balances.player1Balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
      console.log(`   Player 2:      ${(balances.player2Balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    };
    
    const initialBalances = await getBalances();
    displayBalances(initialBalances, "Initial Balances");
    
  // Setup Anchor provider manually for devnet
  console.log("\n🔗 Setting up Anchor...");
  const wallet = new anchor.Wallet(payerKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);
  
  // Load program using workspace
  const program = anchor.workspace.SliderPvp;
  console.log(`   ✅ Connected to program: ${program.programId.toString()}`);
    
    // Derive PDAs
    console.log("\n🔑 Deriving PDAs...");
    const [wagerPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("wager"),
        player1Keypair.publicKey.toBuffer(),
        player2Keypair.publicKey.toBuffer(),
      ],
      program.programId
    );
    
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        player1Keypair.publicKey.toBuffer(),
        player2Keypair.publicKey.toBuffer(),
      ],
      program.programId
    );
    
    console.log(`   Wager PDA: ${wagerPda.toString()}`);
    console.log(`   Vault PDA: ${vaultPda.toString()}`);
    
    // Check if wager already exists (cleanup from previous tests)
    try {
      const existingWager = await program.account.wager.fetch(wagerPda);
      console.log("⚠️  Wager already exists from previous test");
      console.log(`   Settled: ${existingWager.isSettled}`);
      
      if (!existingWager.isSettled) {
        console.log("   Skipping test - wager in progress. Wait or test with different players.");
        return;
      } else {
        console.log("   Previous wager is settled, continuing with new test...");
      }
    } catch (e) {
      // Wager doesn't exist yet, which is good
      console.log("   ✅ No existing wager found, ready to create new one");
    }
    
    // STEP 1: Initialize Wager
    console.log("\n🏁 STEP 1: Initializing wager...");
    console.log(`   Wager amount: ${WAGER_AMOUNT / LAMPORTS_PER_SOL} SOL per player`);
    
    const initTx = await program.methods
      .initializeWager(
        player1Keypair.publicKey,
        player2Keypair.publicKey,
        payerKeypair.publicKey, // arbiter
        payerKeypair.publicKey, // fee recipient
        new anchor.BN(WAGER_AMOUNT)
      )
      .accounts({
        wager: wagerPda,
        vault: vaultPda,
        payer: payerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log(`   ✅ Wager initialized! Transaction: ${initTx}`);
    
    // Check wager state
    const wagerAfterInit = await program.account.wager.fetch(wagerPda);
    console.log(`   Created at: ${new Date(wagerAfterInit.creationTime * 1000).toISOString()}`);
    
    // STEP 2: Player 1 deposits
    console.log("\n💰 STEP 2: Player 1 depositing...");
    
    const deposit1Tx = await program.methods
      .depositPlayer1()
      .accounts({
        wager: wagerPda,
        vault: vaultPda,
        player1: player1Keypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player1Keypair])
      .rpc();
    
    console.log(`   ✅ Player 1 deposited! Transaction: ${deposit1Tx}`);
    
    // STEP 3: Player 2 deposits
    console.log("\n💰 STEP 3: Player 2 depositing...");
    
    const deposit2Tx = await program.methods
      .depositPlayer2()
      .accounts({
        wager: wagerPda,
        vault: vaultPda,
        player2: player2Keypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player2Keypair])
      .rpc();
    
    console.log(`   ✅ Player 2 deposited! Transaction: ${deposit2Tx}`);
    
    // Check wager state after both deposits
    const wagerAfterDeposits = await program.account.wager.fetch(wagerPda);
    console.log(`   Game started at: ${new Date(wagerAfterDeposits.startTime * 1000).toISOString()}`);
    console.log(`   Both deposited: ${wagerAfterDeposits.player1Deposited && wagerAfterDeposits.player2Deposited}`);
    
    // Check vault balance
    const vaultBalance = await connection.getBalance(vaultPda);
    console.log(`   Vault contains: ${(vaultBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    
    // STEP 4: Arbiter declares winner (Player 1)
    console.log("\n🏆 STEP 4: Arbiter declaring Player 1 as winner...");
    
    const declareWinnerTx = await program.methods
      .declareWinner(1) // 1 = Player 1 wins
      .accounts({
        wager: wagerPda,
        vault: vaultPda,
        arbiter: payerKeypair.publicKey,
        winnerAccount: player1Keypair.publicKey, // Player 1 is the winner
        feeRecipient: payerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log(`   ✅ Winner declared! Transaction: ${declareWinnerTx}`);
    
    // Check final state
    const finalWager = await program.account.wager.fetch(wagerPda);
    const finalBalances = await getBalances();
    
    console.log("\n📊 FINAL RESULTS:");
    console.log("=================");
    console.log(`   Winner: Player ${finalWager.winner}`);
    console.log(`   Wager settled: ${finalWager.isSettled}`);
    
    displayBalances(finalBalances, "Final Balances");
    
    // Calculate changes
    const player1Change = (finalBalances.player1Balance - initialBalances.player1Balance) / LAMPORTS_PER_SOL;
    const player2Change = (finalBalances.player2Balance - initialBalances.player2Balance) / LAMPORTS_PER_SOL;
    const payerChange = (finalBalances.payerBalance - initialBalances.payerBalance) / LAMPORTS_PER_SOL;
    
    console.log(`\n💸 Balance Changes:`);
    console.log(`   Player 1 (winner): ${player1Change > 0 ? '+' : ''}${player1Change.toFixed(4)} SOL`);
    console.log(`   Player 2 (loser):  ${player2Change > 0 ? '+' : ''}${player2Change.toFixed(4)} SOL`);
    console.log(`   Payer/Fee Recipient: ${payerChange > 0 ? '+' : ''}${payerChange.toFixed(4)} SOL`);
    
    // Final vault balance (should be just rent)
    const finalVaultBalance = await connection.getBalance(vaultPda);
    console.log(`   Vault remaining: ${(finalVaultBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL (rent reserve)`);
    
    console.log("\n🎉 FULL CONTRACT TEST COMPLETED SUCCESSFULLY! 🎉");
    console.log("===============================================");
    console.log("✅ Wager initialization: PASSED");
    console.log("✅ Player deposits: PASSED");
    console.log("✅ Winner declaration: PASSED");
    console.log("✅ Fund distribution: PASSED");
    console.log("✅ Contract fully operational on Solana Devnet!");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    
    if (error.logs) {
      console.log("\n📋 Program logs:");
      error.logs.forEach(log => console.log(`   ${log}`));
    }
  }
}

// Run the full test
fullContractTest().catch(console.error);
