# Environment Configuration Guide

This guide explains how to deploy and manage your Slider PVP contract across different Solana environments (devnet, mainnet, localnet) using the unified configuration system.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Configuration File](#configuration-file)
- [Deployment Commands](#deployment-commands)
- [Environment Switching](#environment-switching)
- [Environment Details](#environment-details)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Deploy to Devnet

```bash
npm run deploy:devnet
```

### Deploy to Mainnet (Production)

```bash
npm run deploy:mainnet
```

### Deploy to Localnet

```bash
npm run deploy:localnet
```

## 📁 Configuration File

All environment configurations are stored in `config/environments.json`. This file contains settings for:

- **devnet**: Testing and development
- **mainnet**: Production deployment (real money!)
- **localnet**: Local Solana validator for rapid development

### Configuration Structure

```json
{
  "devnet": {
    "name": "Devnet",
    "cluster": "devnet",
    "rpcUrl": "https://api.devnet.solana.com",
    "minSolBalance": 3.0,
    "airdropEnabled": true,
    "wallet": "~/.config/solana/id.json",
    "programKeypair": "target/deploy/slider_pvp-keypair.json",
    "verification": {
      "runTests": true,
      "testScript": "devnet-testing/simple-test.js"
    }
  },
  "mainnet": {
    "name": "Mainnet-Beta",
    "cluster": "mainnet-beta",
    "rpcUrl": "https://api.mainnet-beta.solana.com",
    "minSolBalance": 5.0,
    "airdropEnabled": false,
    "wallet": "~/.config/solana/mainnet-deploy.json",
    "programKeypair": "target/deploy/slider_pvp-mainnet-keypair.json",
    "verification": {
      "runTests": false,
      "requireConfirmation": true,
      "safetyChecks": true
    }
  }
}
```

## 🎯 Deployment Commands

### NPM Scripts (Recommended)

```bash
# Deploy to different environments
npm run deploy:devnet      # Deploy to devnet
npm run deploy:mainnet     # Deploy to mainnet with safety checks
npm run deploy:localnet    # Deploy to local validator

# Build program
npm run build              # Build without deploying

# Testing
npm run test:devnet        # Run full devnet tests
npm run test:simple        # Run simple verification test

# Configuration
npm run config:devnet      # Switch Solana CLI to devnet
npm run config:mainnet     # Switch Solana CLI to mainnet
npm run config:localnet    # Switch Solana CLI to localnet

# Status
npm run status             # Check contract status
```

### Direct Script Usage

```bash
# Unified deployment script
./scripts/deploy.sh <environment>

# Examples
./scripts/deploy.sh devnet
./scripts/deploy.sh mainnet
./scripts/deploy.sh localnet

# Environment switcher
./scripts/switch-env.sh <environment>
```

## 🔄 Environment Switching

Switch between environments without redeploying:

```bash
# Using the switcher script
./scripts/switch-env.sh devnet

# Or use npm scripts
npm run config:devnet
npm run config:mainnet
npm run config:localnet
```

This updates:
- Solana CLI RPC URL
- Solana CLI wallet
- Anchor.toml provider settings

## 🌍 Environment Details

### Devnet (Development & Testing)

**Purpose**: Testing and development before mainnet

**Features**:
- ✅ Free SOL via airdrops
- ✅ Automatic test execution after deployment
- ✅ Fast iteration and debugging
- ✅ No real money at risk

**Configuration**:
```json
{
  "minSolBalance": 3.0,
  "airdropEnabled": true,
  "runTests": true
}
```

**Deployment**:
```bash
npm run deploy:devnet
```

### Mainnet (Production)

**Purpose**: Production deployment with real user funds

**Features**:
- 🚨 **REAL MONEY** - requires 5-10 SOL
- 🔒 Multiple safety confirmations
- 🔍 Comprehensive pre-flight checks
- 📊 Deployment reports and monitoring
- ⚠️ No airdrops available

**Configuration**:
```json
{
  "minSolBalance": 5.0,
  "airdropEnabled": false,
  "requireConfirmation": true,
  "safetyChecks": true
}
```

**Deployment**:
```bash
npm run deploy:mainnet
```

**Safety Checks**:
- Security audit confirmation
- Devnet testing verification
- Emergency procedures confirmation
- Wallet balance validation
- Manual confirmations required

### Localnet (Local Development)

**Purpose**: Rapid development with local Solana validator

**Features**:
- ⚡ Fastest deployment and testing
- 💰 Unlimited SOL (local only)
- 🔧 Full control over network
- 🐛 Easy debugging

**Configuration**:
```json
{
  "rpcUrl": "http://127.0.0.1:8899",
  "minSolBalance": 100.0,
  "airdropEnabled": true
}
```

**Setup**:
```bash
# Start local validator (in separate terminal)
solana-test-validator

# Deploy to localnet
npm run deploy:localnet
```

## 🛠 Customization

### Adding Custom RPC Endpoints

Edit `config/environments.json`:

```json
{
  "devnet": {
    "rpcUrl": "https://your-custom-rpc.com",
    ...
  }
}
```

### Using Different Wallets

```json
{
  "mainnet": {
    "wallet": "~/.config/solana/mainnet-deploy.json",
    ...
  }
}
```

### Custom Monitoring

```json
{
  "mainnet": {
    "monitoring": {
      "alertsEnabled": true,
      "slackWebhook": "https://hooks.slack.com/...",
      "discordWebhook": "https://discord.com/api/webhooks/..."
    }
  }
}
```

### Environment-Specific Tests

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

## 🔍 Deployment Workflow

### Complete Devnet Deployment

```bash
# 1. Switch to devnet
npm run config:devnet

# 2. Deploy
npm run deploy:devnet

# 3. Run comprehensive tests
npm run test:devnet

# 4. Check status
npm run status
```

### Complete Mainnet Deployment

```bash
# 1. Ensure devnet testing is complete
npm run test:devnet

# 2. Review configuration
cat config/environments.json

# 3. Switch to mainnet
npm run config:mainnet

# 4. Verify wallet has SOL
solana balance

# 5. Deploy (will ask for confirmations)
npm run deploy:mainnet

# 6. Monitor deployment
npm run status
```

## 📊 Deployment Reports

After each deployment, a detailed report is generated:

```
deployments/
  ├── devnet-deployment-20250123_143022.md
  ├── devnet-deployment-20250123_150315.md
  └── mainnet-deployment-20250123_160000.md
```

Each report includes:
- Program ID and deployment details
- Transaction signatures
- Verification results
- Explorer links
- Next steps and monitoring commands

## 🐛 Troubleshooting

### "Insufficient balance" Error

**Devnet**:
```bash
# Request airdrop manually
solana airdrop 2

# Or the script will do it automatically
```

**Mainnet**:
```bash
# Check balance
solana balance

# Fund wallet from exchange or another wallet
solana transfer <your-mainnet-wallet> 5 --from <source-wallet>
```

### "Environment not found" Error

Check your environment name:
```bash
# Valid environments
./scripts/deploy.sh devnet
./scripts/deploy.sh mainnet
./scripts/deploy.sh localnet
```

### Program ID Mismatch

Ensure your program IDs match across:
1. `programs/slider-pvp/src/lib.rs` - `declare_id!(...)`
2. `Anchor.toml` - `[programs.<cluster>]`
3. Program keypair file

### Localnet Connection Failed

Start the local validator:
```bash
# In a separate terminal
solana-test-validator

# Wait for it to start, then deploy
npm run deploy:localnet
```

### Deployment Fails on Mainnet

Common causes:
1. **Insufficient balance**: Need 5-10 SOL
2. **Wrong network**: Run `npm run config:mainnet`
3. **Program already deployed**: Check if upgrading vs. deploying new
4. **RPC rate limits**: Use custom RPC endpoint

## 🎯 Best Practices

### Development Workflow

1. **Develop locally**: `npm run deploy:localnet`
2. **Test on devnet**: `npm run deploy:devnet`
3. **Extensive testing**: `npm run test:devnet`
4. **Security audit**: External review
5. **Mainnet deployment**: `npm run deploy:mainnet`
6. **Monitor closely**: Set up alerts and monitoring

### Security

- ✅ Never commit private keys to git
- ✅ Use separate wallets for each environment
- ✅ Test thoroughly on devnet before mainnet
- ✅ Enable safety checks for mainnet
- ✅ Have rollback procedures ready

### Configuration Management

- ✅ Keep `config/environments.json` in version control
- ✅ Use environment variables for sensitive data
- ✅ Document any custom changes
- ✅ Backup wallet keypairs securely

## 📚 Additional Resources

- [Solana CLI Configuration](https://docs.solana.com/cli/conventions)
- [Anchor Deployments](https://www.anchor-lang.com/docs/cli)
- [Mainnet Deployment Guide](./MAINNET_DEPLOYMENT.md)
- [Testing Guide](./TESTING_GUIDE.md)

## 🆘 Support

If you encounter issues:

1. Check deployment logs in `deployments/` folder
2. Review deployment reports
3. Check Solana Explorer for transaction details
4. Verify network connectivity: `solana cluster-version`
5. Check wallet balance: `solana balance`

---

**Happy deploying! 🚀**

