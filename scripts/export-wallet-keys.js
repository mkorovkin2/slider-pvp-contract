#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WALLET PRIVATE KEY EXTRACTOR FOR PHANTOM IMPORT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 PURPOSE:
 * Extract private keys from Solana JSON keypair files so you can import 
 * them into Phantom wallet for GUI-based interaction.
 * 
 * 📋 WHAT THIS DOES:
 * • Reads JSON keypair files
 * • Converts to base58 private key format
 * • Displays keys ready for Phantom import
 * • Shows wallet addresses for verification
 * 
 * 🚀 USAGE:
 * ```bash
 * cd ~/workplace/slider-pvp-contract
 * node scripts/export-wallet-keys.js
 * ```
 * 
 * ⚠️ SECURITY WARNING:
 * • Private keys give FULL ACCESS to wallets
 * • Only use on DEVNET wallets (testnet, not real money)
 * • Never share private keys or commit them to git
 * • Consider these keys compromised after display
 * 
 * 📱 PHANTOM IMPORT STEPS:
 * 1. Open Phantom wallet
 * 2. Click profile icon → "Add/Connect Wallet"
 * 3. Select "Import Private Key"
 * 4. Paste the base58 private key
 * 5. Name the wallet (e.g., "Test Player 1")
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const bs58 = require('bs58');

console.log("🔑 Wallet Private Key Extractor for Phantom Import");
console.log("===================================================");
console.log("⚠️  WARNING: Private keys give FULL ACCESS to wallets!");
console.log("⚠️  Only use these on DEVNET (testnet) - NOT mainnet!");
console.log("===================================================\n");

function extractPrivateKey(filePath, walletName) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ ${walletName}: File not found at ${filePath}`);
      return null;
    }

    const secretKeyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyData));
    
    // Convert to base58 format for Phantom
    const privateKeyBase58 = bs58.default ? bs58.default.encode(keypair.secretKey) : bs58.encode(keypair.secretKey);
    
    console.log(`🔑 ${walletName}:`);
    console.log(`   Address: ${keypair.publicKey.toString()}`);
    console.log(`   Private Key (Base58): ${privateKeyBase58}`);
    console.log(`   File: ${filePath}`);
    console.log();
    
    return {
      name: walletName,
      address: keypair.publicKey.toString(),
      privateKey: privateKeyBase58,
      filePath: filePath
    };
    
  } catch (error) {
    console.log(`❌ ${walletName}: Error reading wallet - ${error.message}`);
    return null;
  }
}

// Extract all wallet keys
const wallets = [];

console.log("📂 Extracting wallet private keys...\n");

// Main wallet (arbiter/fee recipient)
const mainWallet = extractPrivateKey(
  process.env.HOME + "/.config/solana/id.json", 
  "Main Wallet (Arbiter/Fee Recipient)"
);
if (mainWallet) wallets.push(mainWallet);

// Test Player 1
const player1Wallet = extractPrivateKey(
  "./devnet-testing/test-player1.json", 
  "Test Player 1"
);
if (player1Wallet) wallets.push(player1Wallet);

// Test Player 2
const player2Wallet = extractPrivateKey(
  "./devnet-testing/test-player2.json", 
  "Test Player 2"
);
if (player2Wallet) wallets.push(player2Wallet);

// Summary
console.log("📱 PHANTOM WALLET IMPORT INSTRUCTIONS:");
console.log("=====================================");
console.log();
console.log("For EACH wallet above, follow these steps:");
console.log();
console.log("1. 📱 Open Phantom Wallet Extension/App");
console.log("2. 👤 Click your profile icon (top right)");
console.log("3. ➕ Select 'Add/Connect Wallet'");
console.log("4. 🔑 Choose 'Import Private Key'");
console.log("5. 📋 Paste the Base58 Private Key from above");
console.log("6. 🏷️  Give it a name (e.g., 'Test Player 1')");
console.log("7. ✅ Click 'Import'");
console.log("8. 🔄 Switch between wallets using the dropdown");
console.log();

console.log("🌐 NETWORK SETTINGS:");
console.log("====================");
console.log("• Make sure Phantom is set to DEVNET");
console.log("• Settings → Developer Settings → Change Network → Devnet");
console.log("• This ensures you're using testnet SOL, not real money");
console.log();

console.log("✅ VERIFICATION:");
console.log("================");
console.log("After importing, verify each wallet shows the correct address:");
wallets.forEach((wallet, i) => {
  if (wallet) {
    console.log(`${i + 1}. ${wallet.name}: ${wallet.address}`);
  }
});

console.log();
console.log("💰 CURRENT BALANCES (Devnet):");
console.log("==============================");
console.log("• Main Wallet: 3.088 SOL");
console.log("• Test Player 1: 0.387 SOL (recent winner)");  
console.log("• Test Player 2: 0.2 SOL (recent loser)");
console.log();

console.log("🎮 USAGE:");
console.log("=========");
console.log("Now you can:");
console.log("• View balances in Phantom GUI");
console.log("• Send transactions from each wallet");
console.log("• Test your Slider PvP frontend with real wallets");
console.log("• Switch between player roles during testing");
console.log();

console.log("⚠️  SECURITY REMINDER:");
console.log("======================");
console.log("• These are DEVNET wallets (testnet only)");
console.log("• Private keys shown above are now considered PUBLIC");
console.log("• Never use these wallets for real money (mainnet)");
console.log("• Generate new wallets for production use");
console.log();

console.log("🎉 Ready to test your Slider PvP contract with Phantom wallets!");
