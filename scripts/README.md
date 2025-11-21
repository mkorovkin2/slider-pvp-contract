# Slider PvP Deployment & Management Scripts

Complete collection of scripts for deploying, upgrading, and managing your Slider PvP smart contract on Solana.

## 📁 Script Overview

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `deploy-devnet.sh` | Deploy to devnet | Development and testing |
| `deploy-mainnet.sh` | Deploy to mainnet | Production launch |
| `upgrade-mainnet.sh` | Upgrade mainnet program | Bug fixes, new features |
| `contract-status.sh` | Check contract health | Regular monitoring |
| `export-wallet-keys.js` | Get keys for Phantom | Wallet setup |

## 🚀 Deployment Process

### **Development Flow**

```bash
# 1. Deploy to devnet for testing
./scripts/deploy-devnet.sh

# 2. Check status and test thoroughly  
./scripts/contract-status.sh devnet
node devnet-testing/full-test.js

# 3. Import wallets into Phantom for GUI testing
node scripts/export-wallet-keys.js
```

### **Production Flow**

```bash
# 1. Complete security audit and extended testing
# 2. Deploy to mainnet (REAL MONEY)
./scripts/deploy-mainnet.sh

# 3. Monitor closely after deployment
./scripts/contract-status.sh mainnet
```

### **Update Flow**

```bash
# 1. Test changes on devnet first
anchor test --provider.cluster devnet

# 2. Upgrade mainnet program
./scripts/upgrade-mainnet.sh

# 3. Monitor for issues
./scripts/contract-status.sh mainnet
```

## 📋 Script Details

### **🧪 Development Scripts**

#### `deploy-devnet.sh`
- **Purpose**: Automated devnet deployment
- **Features**: Environment validation, dependency installation, build verification
- **Safety**: Testnet only, includes airdrop requests
- **Output**: Deployment report, program verification

#### `contract-status.sh`
- **Purpose**: Health monitoring and status reports  
- **Features**: Program status, wallet balances, recent activity
- **Networks**: Supports both devnet and mainnet
- **Usage**: `./scripts/contract-status.sh [devnet|mainnet]`

#### `export-wallet-keys.js`
- **Purpose**: Extract private keys for Phantom wallet import
- **Features**: Base58 encoding, address verification
- **Security**: Displays warning about key exposure
- **Output**: Ready-to-import private keys

### **🌐 Production Scripts**

#### `deploy-mainnet.sh`
- **Purpose**: Safe mainnet deployment with extensive checks
- **Features**: 
  - Multi-phase safety verification
  - Prerequisite checklist enforcement
  - Automated backup creation
  - Real-time monitoring setup
  - Emergency procedure preparation
- **Safety**: Multiple confirmation prompts, comprehensive testing requirements
- **Cost**: ~3-4 SOL for deployment

#### `upgrade-mainnet.sh`
- **Purpose**: Safe program upgrades with rollback capability
- **Features**:
  - Devnet testing requirement  
  - Automatic backup creation
  - Rollback script generation
  - Post-upgrade verification
  - Emergency monitoring
- **Safety**: Backup and rollback procedures, extensive verification

## 🛡️ Security Features

### **Pre-Deployment Checks**
- ✅ Security audit completion verification
- ✅ Extended testing requirement (minimum 2 weeks)
- ✅ Legal review and compliance checks
- ✅ Emergency response procedure verification
- ✅ Sufficient funding validation

### **Deployment Safety**
- ✅ Multiple confirmation prompts
- ✅ Automatic backup creation  
- ✅ Real-time verification
- ✅ Rollback script generation
- ✅ Monitoring system setup

### **Post-Deployment Protection**
- ✅ Health monitoring scripts
- ✅ Emergency rollback procedures
- ✅ 24/7 monitoring recommendations
- ✅ Incident response documentation

## 💰 Cost Breakdown

### **Devnet (Free)**
- Program deployment: Free (testnet SOL from faucets)
- Testing: Unlimited free transactions
- Development: No real money cost

### **Mainnet (Real SOL)**
```
Initial Deployment:
- Program deployment: ~2-3 SOL
- Transaction fees: ~0.01 SOL
- Buffer accounts: ~0.01 SOL
- Total: ~3-4 SOL

Program Upgrades:
- Upgrade transaction: ~0.005 SOL
- Additional rent (if larger): Variable

Ongoing Operations:
- Program rent: Paid upfront, permanent
- Transaction monitoring: RPC costs
- Emergency response: Keep 5-10 SOL buffer
```

## 🔄 Program Authority Management

### **Authority Types**

#### **Single Authority (Launch)**
```bash
# Current deployer has upgrade authority
solana program show $PROGRAM_ID --url mainnet-beta | grep "Upgrade Authority"
```

#### **Multisig Authority (Recommended)**
```bash
# Transfer to multisig for security
solana program set-upgrade-authority $PROGRAM_ID \
  --new-upgrade-authority $MULTISIG_ADDRESS \
  --url mainnet-beta
```

#### **Immutable Program (Permanent)**
```bash
# Remove upgrade capability forever
solana program set-upgrade-authority $PROGRAM_ID \
  --new-upgrade-authority null \
  --url mainnet-beta
```

## 📊 Monitoring & Maintenance

### **Regular Health Checks**
```bash
# Daily status check
./scripts/contract-status.sh mainnet

# Monitor program logs  
solana logs $PROGRAM_ID --url mainnet-beta

# Check key wallet balances
solana balance $DEPLOYER_ADDRESS --url mainnet-beta
```

### **Automated Monitoring Setup**
```bash
# Set up cron job for regular monitoring
crontab -e

# Add line for hourly checks:
# 0 * * * * /path/to/scripts/contract-status.sh mainnet >> /var/log/slider-pvp-status.log
```

### **Emergency Procedures**
```bash
# If issues detected:
1. Execute emergency rollback
   ./mainnet-backups/rollback-TIMESTAMP.sh

2. Notify users immediately
   # Use your communication channels

3. Analyze the issue
   solana logs $PROGRAM_ID --url mainnet-beta

4. Prepare fix and test on devnet
   anchor test --provider.cluster devnet

5. Deploy fix when ready
   ./scripts/upgrade-mainnet.sh
```

## 🎯 Best Practices

### **Development**
- ✅ Always test on devnet first
- ✅ Use multiple test scenarios
- ✅ Test with different wallet configurations
- ✅ Validate all timeout scenarios
- ✅ Test emergency procedures

### **Production Deployment**
- ✅ Complete security audit
- ✅ Legal review and compliance
- ✅ Team training on procedures
- ✅ 24/7 monitoring setup
- ✅ Emergency response plan
- ✅ Start with minimal real funds

### **Ongoing Operations**
- ✅ Regular health monitoring
- ✅ Keep emergency SOL available
- ✅ Document all changes
- ✅ Test upgrades on devnet first
- ✅ Maintain backup procedures
- ✅ Monitor user activity patterns

## 🚨 Emergency Contacts & Procedures

### **Team Setup**
```bash
# Update these with your actual information:

# Primary On-Call
EMERGENCY_PHONE="+1-XXX-XXX-XXXX"
EMERGENCY_EMAIL="emergency@yourproject.com"

# Secondary Contacts  
TEAM_DISCORD="https://discord.gg/yourteam"
TEAM_TELEGRAM="@yourteam"

# Public Communication
TWITTER_ACCOUNT="@yourproject"
WEBSITE_STATUS="https://status.yourproject.com"
```

### **Incident Response**
1. **Assess severity** (Critical/High/Medium/Low)
2. **Execute immediate response** (rollback if needed)
3. **Notify stakeholders** (team, users, partners)
4. **Communicate publicly** (social media, website)
5. **Investigate root cause**
6. **Implement permanent fix**
7. **Post-mortem analysis**

## 📚 Documentation References

- **Main Documentation**: `docs/MAINNET_DEPLOYMENT.md`
- **Phantom Setup**: `docs/PHANTOM_WALLET_SETUP.md`  
- **Architecture**: `docs/ARCHITECTURE.md`
- **Quick Start**: `docs/QUICKSTART.md`
- **Testing Guide**: `devnet-testing/TESTING_GUIDE.md`

## 🎉 Success Checklist

### **Deployment Success**
- [ ] Program deployed without errors
- [ ] Program verified on blockchain
- [ ] Basic functionality tested
- [ ] Monitoring systems active
- [ ] Team notified and ready
- [ ] Documentation updated

### **Upgrade Success**  
- [ ] Changes tested on devnet
- [ ] Backup created successfully
- [ ] Upgrade completed without errors
- [ ] Program verification passed
- [ ] Rollback script ready
- [ ] Monitoring shows normal activity

### **Production Readiness**
- [ ] Security audit complete
- [ ] Legal compliance verified
- [ ] Team trained on procedures
- [ ] Emergency response ready
- [ ] Monitoring and alerts active
- [ ] Community communication ready

---

## 🚀 Quick Reference

### **Essential Commands**
```bash
# Deploy to devnet
./scripts/deploy-devnet.sh

# Check contract status  
./scripts/contract-status.sh [devnet|mainnet]

# Export wallet keys for Phantom
node scripts/export-wallet-keys.js

# Deploy to mainnet (REAL MONEY)
./scripts/deploy-mainnet.sh

# Upgrade mainnet program
./scripts/upgrade-mainnet.sh

# Monitor program logs
solana logs $PROGRAM_ID --url [devnet|mainnet-beta]
```

### **Important Files**
```
scripts/
├── deploy-devnet.sh      # Devnet deployment
├── deploy-mainnet.sh     # Mainnet deployment  
├── upgrade-mainnet.sh    # Program upgrades
├── contract-status.sh    # Health monitoring
├── export-wallet-keys.js # Phantom wallet setup
└── README.md            # This file
```

**Your Slider PvP smart contract deployment and management system is ready!** 🎉

---

**Generated**: October 27, 2025  
**Version**: 1.0  
**Status**: Production Ready
