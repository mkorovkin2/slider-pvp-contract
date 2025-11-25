# 🚀 Quick Start: Deployment Guide

This guide will get you deploying to devnet and mainnet in under 5 minutes.

## 📦 One-Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Build the program
npm run build

# 3. Make scripts executable (if not already)
chmod +x scripts/*.sh
```

## 🌟 Deploy to Devnet (Testing)

```bash
# Simple one-liner
npm run deploy:devnet
```

That's it! The script will:
- ✅ Configure Solana CLI for devnet
- ✅ Request airdrop if balance is low
- ✅ Build and deploy your program
- ✅ Run verification tests
- ✅ Generate deployment report

**View your deployment:**
```bash
# Check the latest deployment report
ls -lt deployments/*.md | head -1 | awk '{print $NF}' | xargs cat
```

## 🔥 Deploy to Mainnet (Production)

### Prerequisites

1. **Security audit completed** ✓
2. **Tested on devnet for 2+ weeks** ✓
3. **Have 5-10 SOL in mainnet wallet** ✓

### Deployment

```bash
# 1. Switch to mainnet
npm run config:mainnet

# 2. Check your balance
solana balance

# 3. Deploy (will ask for confirmations)
npm run deploy:mainnet
```

The script will guide you through safety checks and confirmations.

## 🎯 Quick Commands Reference

### Deployment

| Command | Description |
|---------|-------------|
| `npm run deploy:devnet` | Deploy to devnet |
| `npm run deploy:mainnet` | Deploy to mainnet |
| `npm run deploy:localnet` | Deploy to local validator |

### Configuration

| Command | Description |
|---------|-------------|
| `npm run config:devnet` | Switch to devnet |
| `npm run config:mainnet` | Switch to mainnet |
| `npm run config:localnet` | Switch to localnet |

### Testing

| Command | Description |
|---------|-------------|
| `npm run test:devnet` | Full devnet tests |
| `npm run test:simple` | Quick verification test |
| `npm test` | Run Anchor tests |

### Utilities

| Command | Description |
|---------|-------------|
| `npm run build` | Build program |
| `npm run status` | Check contract status |

## 🔄 Switch Between Environments

```bash
# Quick switch without redeploying
./scripts/switch-env.sh devnet
./scripts/switch-env.sh mainnet
```

## 📁 Configuration Files

All environment settings are in one place:

```
config/environments.json
```

Change RPC endpoints, wallets, or any setting here!

## 📊 After Deployment

### Check Your Deployment

```bash
# View program details
solana program show <PROGRAM_ID>

# Monitor logs (devnet)
solana logs <PROGRAM_ID> --url devnet

# Check on explorer
# Devnet: https://explorer.solana.com/address/<PROGRAM_ID>?cluster=devnet
# Mainnet: https://explorer.solana.com/address/<PROGRAM_ID>
```

### Get Your Program ID

The Program ID is shown after deployment and saved in:
```
deployments/<environment>-deployment-<timestamp>.md
```

### Test Your Contract

```bash
# Run full test suite
npm run test:devnet

# Or use the test scripts
node devnet-testing/simple-test.js
node devnet-testing/full-test.js
```

## 🎓 Learn More

For detailed configuration and advanced options:

- **[Environment Configuration Guide](docs/ENVIRONMENT_CONFIGURATION.md)** - Complete guide
- **[Config README](config/README.md)** - Configuration options
- **[Mainnet Deployment](docs/MAINNET_DEPLOYMENT.md)** - Production deployment

## 🐛 Common Issues

### "Insufficient SOL balance"

**Devnet**: Script auto-requests airdrop
**Mainnet**: Fund wallet first:
```bash
# Check balance
solana balance

# Get wallet address
solana address
```

### "Program build failed"

```bash
# Clean and rebuild
anchor clean
anchor build
```

### "Wrong network"

```bash
# Check current network
solana config get

# Switch to correct network
npm run config:devnet  # or mainnet
```

### "Command not found: anchor"

```bash
# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

## 🎉 Success Checklist

After deployment, you should have:

- ✅ Program deployed to blockchain
- ✅ Program ID obtained
- ✅ Deployment report generated
- ✅ Tests passed (devnet)
- ✅ Explorer link working
- ✅ Ready to integrate with frontend

## 🆘 Need Help?

1. **Check deployment logs**: `deployments/` folder
2. **View recent report**: `ls -lt deployments/*.md | head -1`
3. **Check Solana status**: `solana cluster-version`
4. **Verify balance**: `solana balance`

---

**Ready to deploy? Run this now:**

```bash
npm run deploy:devnet
```

🚀 **Happy deploying!**

