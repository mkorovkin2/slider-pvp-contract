# Phantom Wallet Setup Guide

Complete guide to importing your Slider PvP test wallets into Phantom for GUI-based testing.

## 🎯 Overview

You have **3 test wallets** that were created for testing your Slider PvP contract on Solana devnet. This guide shows you how to import them into Phantom wallet so you can interact with your contract using a GUI instead of command line.

## 🔑 Your Test Wallets

### 1. **Main Wallet (Arbiter/Fee Recipient)**
- **Purpose**: Declares winners and receives 5% fees
- **Address**: `AugzfeHk2wAjHxPiJEUSXHQFak9okUgpJyJ7AjKTFWdW`
- **Balance**: 3.088 SOL (devnet)
- **Private Key**: `3pBKqTeVxxyih6284eFGSr1E7d35rnjK7zW4Cb5hbmK68k1EacyWYHGCrrhWaPHVm8B9xxxxNqc3v19KW64t2afr`

### 2. **Test Player 1**
- **Purpose**: Participates in wagers as player 1
- **Address**: `BHnQ7ws2sh8qBUTMB9p8Tu9UH6rQ5nUJqn4Ba43j3LS`
- **Balance**: 0.387 SOL (devnet) - Recent winner!
- **Private Key**: `3qNRFYrzfnsyGkX2uTQQr7Y1Ws1Afsrg83h1BSqNZ9dhpk9ezKxp5g3mTUbkSAyaM9N9MQqS1c1i3Exf5rUFBcv2`

### 3. **Test Player 2**
- **Purpose**: Participates in wagers as player 2
- **Address**: `CwV1oCu8GbR8DUmgXqnjqzUq7xvJkxFh7Uk9DUvvnMcG`
- **Balance**: 0.2 SOL (devnet) - Recent loser
- **Private Key**: `5Zo8H4Q8Dqj1oyAE4gykRizdnTcbhAa8iEXEy4YkYe3Vi4GocqAsTbpZKm7aU8MnsPK89fPYK7kqqD7gndXT4428`

## 📱 Import Process

### Option A: Multiple Phantom Profiles (Recommended)

**Best for**: Testing different user perspectives and roles

1. **Create 3 separate Phantom wallet instances:**

#### **Main Wallet Import:**
1. 🦾 **Open Phantom** (Extension or Mobile App)
2. 👤 **Click profile icon** (top right corner)  
3. ➕ **Select "Add/Connect Wallet"**
4. 🔑 **Choose "Import Private Key"**
5. 📋 **Paste**: `3pBKqTeVxxyih6284eFGSr1E7d35rnjK7zW4Cb5hbmK68k1EacyWYHGCrrhWaPHVm8B9xxxxNqc3v19KW64t2afr`
6. 🏷️ **Name it**: "Slider PvP - Main (Arbiter)"
7. ✅ **Click "Import"**

#### **Test Player 1 Import:**
1. 🔄 **Repeat the process**
2. 📋 **Paste**: `3qNRFYrzfnsyGkX2uTQQr7Y1Ws1Afsrg83h1BSqNZ9dhpk9ezKxp5g3mTUbkSAyaM9N9MQqS1c1i3Exf5rUFBcv2`
3. 🏷️ **Name it**: "Slider PvP - Player 1"

#### **Test Player 2 Import:**
1. 🔄 **Repeat the process**
2. 📋 **Paste**: `5Zo8H4Q8Dqj1oyAE4gykRizdnTcbhAa8iEXEy4YkYe3Vi4GocqAsTbpZKm7aU8MnsPK89fPYK7kqqD7gndXT4428`
3. 🏷️ **Name it**: "Slider PvP - Player 2"

### Option B: Single Phantom with Multiple Wallets

**Best for**: Easy switching between wallets in one app

1. Import all 3 private keys into one Phantom instance
2. Use the dropdown to switch between wallets
3. Each wallet will have its own name and balance

## 🌐 Network Configuration

**CRITICAL**: Set Phantom to **Devnet** before using these wallets

### **Change Network in Phantom:**
1. ⚙️ **Settings** → **Developer Settings**
2. 🌐 **Change Network** → **Devnet**  
3. ✅ **Confirm** the change

**Why Devnet?**
- 🧪 **Testnet**: Uses fake SOL for testing
- 💰 **Free**: Get unlimited SOL from faucets
- 🛡️ **Safe**: No real money at risk
- 🔄 **Reset**: Can start over anytime

## ✅ Verification Steps

After importing, verify each wallet:

### **Check Addresses Match:**
1. **Main Wallet**: Should show `AugzfeHk2...Wdw` 
2. **Player 1**: Should show `BHnQ7ws2...3LS`
3. **Player 2**: Should show `CwV1oCu8...McG`

### **Check Balances (Devnet):**
1. **Main Wallet**: ~3.088 SOL
2. **Player 1**: ~0.387 SOL  
3. **Player 2**: ~0.2 SOL

### **Check Network:**
- Top of Phantom should show **"Devnet"**
- If it shows "Mainnet", change it immediately!

## 🎮 Using Your Imported Wallets

### **For Contract Testing:**

#### **As Arbiter (Main Wallet):**
- Initialize new wagers
- Declare winners  
- Collect 5% fees
- Monitor contract activity

#### **As Player 1:**
- Deposit SOL into wagers
- Participate in games
- Receive winnings (if you win)

#### **As Player 2:**
- Deposit SOL into wagers  
- Participate in games
- Receive winnings (if you win)

### **Switching Between Roles:**
1. 🔄 Use Phantom's wallet dropdown
2. 📱 Select the appropriate wallet
3. 🎯 Interact with your contract
4. 🔁 Switch to another wallet to test different perspectives

## 🛠️ Testing Your Contract

### **End-to-End Test Flow:**
1. **Main Wallet**: Initialize a wager
2. **Player 1**: Deposit 0.1 SOL
3. **Player 2**: Deposit 0.1 SOL
4. **Main Wallet**: Declare winner
5. **Check Results**: Winner gets ~0.19 SOL, Main gets ~0.01 SOL

### **Frontend Integration:**
- Use these wallets to test your frontend
- Switch between wallets to simulate different users
- Verify all contract functions work through Phantom

## ⚠️ Security Important Notes

### **DEVNET ONLY:**
- ❌ **Never** use these keys on mainnet
- ❌ **Never** send real SOL to these addresses
- ❌ **Never** store real value in these wallets
- ✅ **Only** use for devnet testing

### **Private Key Security:**
- 🔓 **These keys are now PUBLIC** (displayed above)
- 🗑️ **Consider them compromised** 
- 🆕 **Generate new keys for production**
- 🔒 **Never commit private keys to git**

### **After Testing:**
- 🧹 **Delete these wallets from Phantom**
- 🆕 **Create fresh wallets for production**
- 🔐 **Keep production keys private**

## 🚨 Troubleshooting

### **"Wallet not found" Error:**
- Double-check you're on **Devnet**
- Verify the address matches exactly
- Try refreshing Phantom

### **"No balance" showing:**
- Confirm network is set to **Devnet**
- Wait a few seconds for sync
- Check balance on Solana Explorer (devnet)

### **Import fails:**
- Verify private key is copied exactly
- No extra spaces or characters
- Try again with fresh copy

### **Wrong network:**
- Go to Settings → Developer → Change Network
- Select **Devnet**
- All balances should appear

## 🎯 Success Indicators

### **You'll know it's working when:**
✅ All 3 wallets imported successfully  
✅ Addresses match the ones listed above  
✅ Phantom shows "Devnet" at the top  
✅ Balances appear (Main: 3.088, P1: 0.387, P2: 0.2)  
✅ You can switch between wallets easily  
✅ You can see transaction history from recent tests  

## 🚀 Next Steps

### **After Import Success:**
1. 🏗️ **Build your frontend** that connects to Phantom
2. 🧪 **Test contract interactions** through the GUI
3. 🔄 **Switch between wallets** to simulate users
4. 📊 **Monitor fee collection** on the main wallet
5. 🎮 **Create your wager-based application**

### **Frontend Integration Tips:**
- Use `@solana/wallet-adapter` for React
- Connect to your deployed program: `9EeZ1eFrs8QAop7c6ihE4CiXenjVpGPdmFyv6w3XnmcT`
- Test on devnet first, then deploy to mainnet
- Always verify network before real money

---

## 🎉 Ready to Go!

Your Phantom wallets are now set up for comprehensive testing of your Slider PvP smart contract. You can test the complete user experience from wallet connection to wager settlement, all with a real GUI interface.

**Happy testing!** 🚀

---

**Generated**: October 2025  
**Network**: Solana Devnet  
**Contract**: `9EeZ1eFrs8QAop7c6ihE4CiXenjVpGPdmFyv6w3XnmcT`  
**Status**: Ready for Testing
