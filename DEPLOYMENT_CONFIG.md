# 🎯 Deployment Configuration Summary

This document provides a quick reference for the new unified deployment configuration system.

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `config/environments.json` | **Main config** - All environment settings |
| `scripts/deploy.sh` | **Unified deployment script** - Works for all environments |
| `scripts/switch-env.sh` | **Environment switcher** - Quick network switching |
| `package.json` | **NPM scripts** - Convenient deployment commands |
| `Anchor.toml` | **Anchor config** - Updated with proper cluster names |

## 🚀 How to Deploy

### Simple Commands

```bash
# Deploy to devnet (automatic airdrop, testing enabled)
npm run deploy:devnet

# Deploy to mainnet (safety checks, confirmations required)
npm run deploy:mainnet

# Deploy to local validator
npm run deploy:localnet
```

### What Happens Automatically

The deployment script (`scripts/deploy.sh`) automatically:

1. ✅ Loads configuration from `config/environments.json`
2. ✅ Configures Solana CLI with correct RPC endpoint
3. ✅ Checks wallet balance (requests airdrop for devnet if needed)
4. ✅ Builds the program
5. ✅ Deploys to the specified network
6. ✅ Verifies deployment on blockchain
7. ✅ Runs tests (if configured for that environment)
8. ✅ Generates deployment report in `deployments/` folder

## 🔧 Configuration Changes

### To Change RPC Endpoint

Edit `config/environments.json`:

```json
{
  "devnet": {
    "rpcUrl": "https://your-custom-rpc.com"
  }
}
```

Then deploy:
```bash
npm run deploy:devnet
```

### To Use Different Wallet

Edit `config/environments.json`:

```json
{
  "mainnet": {
    "wallet": "~/.config/solana/my-wallet.json"
  }
}
```

### To Change Minimum Balance

Edit `config/environments.json`:

```json
{
  "devnet": {
    "minSolBalance": 5.0
  }
}
```

### To Enable/Disable Tests

Edit `config/environments.json`:

```json
{
  "devnet": {
    "verification": {
      "runTests": true,
      "testScript": "devnet-testing/full-test.js"
    }
  }
}
```

## 🔄 Switching Environments

### Quick Switch (Without Deploying)

```bash
# Switch Solana CLI and Anchor.toml to devnet
./scripts/switch-env.sh devnet

# Switch to mainnet
./scripts/switch-env.sh mainnet
```

Or use npm:
```bash
npm run config:devnet
npm run config:mainnet
npm run config:localnet
```

This updates:
- Solana CLI RPC URL
- Solana CLI wallet path
- Anchor.toml cluster setting

## 📊 Environment Comparison

| Feature | Devnet | Mainnet | Localnet |
|---------|--------|---------|----------|
| **Cost** | Free (airdrop) | 5-10 SOL | Free (unlimited) |
| **Speed** | ~400ms | ~400ms | <100ms |
| **Airdrops** | ✅ Yes | ❌ No | ✅ Yes |
| **Auto-tests** | ✅ Yes | ❌ No | ✅ Yes |
| **Safety checks** | ❌ No | ✅ Yes | ❌ No |
| **Confirmations** | ❌ No | ✅ Required | ❌ No |
| **Real money** | ❌ No | ✅ YES! | ❌ No |
| **Explorer** | Devnet Explorer | Mainnet Explorer | Local |

## 📝 Configuration Structure

### Complete Environment Config

```json
{
  "environmentName": {
    "name": "Human Readable Name",
    "cluster": "devnet|mainnet-beta|localnet",
    "rpcUrl": "https://api.devnet.solana.com",
    "commitmentLevel": "confirmed",
    "minSolBalance": 3.0,
    "airdropEnabled": true,
    "wallet": "~/.config/solana/id.json",
    "programKeypair": "target/deploy/slider_pvp-keypair.json",
    "verification": {
      "runTests": true,
      "testScript": "path/to/test.js",
      "requireConfirmation": false,
      "safetyChecks": false
    },
    "monitoring": {
      "explorerUrl": "https://explorer.solana.com/address/{{PROGRAM_ID}}?cluster=devnet",
      "alertsEnabled": false,
      "slackWebhook": "",
      "discordWebhook": ""
    }
  }
}
```

## 🎯 Deployment Workflow

### Development (Devnet)

```bash
# 1. Make code changes
vim programs/slider-pvp/src/lib.rs

# 2. Deploy to devnet
npm run deploy:devnet

# 3. Tests run automatically
# (configured in environments.json)

# 4. Check deployment report
cat deployments/devnet-deployment-*.md
```

### Production (Mainnet)

```bash
# 1. Test extensively on devnet
npm run deploy:devnet
npm run test:devnet

# 2. Security audit ✓

# 3. Fund mainnet wallet
solana balance
# Transfer 5-10 SOL to deployment wallet

# 4. Deploy to mainnet (with confirmations)
npm run deploy:mainnet

# 5. Monitor closely
npm run status
solana logs <PROGRAM_ID>
```

## 📁 Output Files

After deployment, you'll find:

```
deployments/
├── devnet-deployment-20250123_143022.md
├── devnet-deployment-20250123_150315.md
└── mainnet-deployment-20250123_160000.md
```

Each contains:
- Program ID
- Transaction signature
- Explorer links
- Configuration used
- Next steps
- Monitoring commands

## 🔐 Security Best Practices

### Wallet Management

```bash
# Devnet wallet (for testing)
~/.config/solana/id.json

# Mainnet wallet (production - separate!)
~/.config/solana/mainnet-deploy.json

# Generate mainnet wallet
solana-keygen new --outfile ~/.config/solana/mainnet-deploy.json
```

### Program Keypairs

```bash
# Devnet program
target/deploy/slider_pvp-keypair.json

# Mainnet program (separate!)
target/deploy/slider_pvp-mainnet-keypair.json

# Never commit these to git!
```

Add to `.gitignore`:
```
target/deploy/*-keypair.json
**/*-keypair.json
.env
```

## 🆘 Troubleshooting

### Problem: "Configuration file not found"

```bash
# Ensure you're in project root
cd ~/workplace/slider-pvp-contract

# Check config exists
ls -la config/environments.json
```

### Problem: "Environment not found"

```bash
# View available environments
cat config/environments.json | jq 'keys'

# Output: ["devnet", "mainnet", "localnet"]
```

### Problem: "Insufficient balance"

**Devnet**: Script automatically requests airdrop

**Mainnet**:
```bash
# Check balance
solana balance

# Fund from another wallet
solana transfer <deployment-wallet-address> 5 --from <source-wallet>
```

### Problem: Deployment fails

```bash
# Check logs
tail -f deployments/<latest-deployment>.md

# Verify network
solana config get

# Check program build
anchor build
ls -la target/deploy/slider_pvp.so
```

## 📚 Documentation

- **[Quick Start](QUICKSTART_DEPLOYMENT.md)** - Fast deployment guide
- **[Environment Configuration](docs/ENVIRONMENT_CONFIGURATION.md)** - Complete configuration guide
- **[Config README](config/README.md)** - Configuration options reference
- **[Mainnet Deployment](docs/MAINNET_DEPLOYMENT.md)** - Production deployment guide

## 🎉 Quick Reference Card

```bash
# DEPLOY
npm run deploy:devnet          # Deploy to devnet
npm run deploy:mainnet         # Deploy to mainnet
npm run deploy:localnet        # Deploy to local

# CONFIGURE
npm run config:devnet          # Switch to devnet
npm run config:mainnet         # Switch to mainnet
./scripts/switch-env.sh devnet # Alternative switcher

# TEST
npm run test:devnet            # Full devnet tests
npm run test:simple            # Quick test
npm test                       # Anchor tests

# BUILD
npm run build                  # Build program

# STATUS
npm run status                 # Check status
solana balance                 # Check balance
solana config get              # Show current config

# MONITOR
solana logs <PROGRAM_ID>       # Watch logs
solana program show <ID>       # Program info
```

---

**Everything is configured!** Just run:

```bash
npm run deploy:devnet
```

🚀 **You're ready to deploy!**

