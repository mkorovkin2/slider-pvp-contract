# Mainnet Deployment & Update Guide

Complete guide for deploying Slider PvP to Solana mainnet and managing program updates safely.

## 🚨 **CRITICAL SECURITY CHECKLIST**

### **✅ Pre-Mainnet Requirements**

**MANDATORY before mainnet deployment:**

1. **🔍 Security Audit**
   - [ ] Professional smart contract audit completed
   - [ ] All high/medium severity issues resolved
   - [ ] Audit report reviewed and published
   - [ ] Bug bounty program completed (recommended)

2. **🧪 Extended Testing**
   - [ ] Minimum 2 weeks of devnet testing with various scenarios
   - [ ] Load testing with multiple concurrent wagers
   - [ ] Edge case testing (timeouts, failures, etc.)
   - [ ] Frontend integration fully tested
   - [ ] Multiple independent testers validated functionality

3. **💰 Financial Preparations**
   - [ ] Sufficient SOL for deployment (~5-10 SOL recommended)
   - [ ] Emergency response fund allocated
   - [ ] Insurance or security fund consideration
   - [ ] Legal review of terms and conditions

4. **🔧 Infrastructure**
   - [ ] Monitoring and alerting systems ready
   - [ ] Incident response plan documented
   - [ ] Team trained on emergency procedures
   - [ ] Backup systems and redundancy planned

⚠️ **WARNING**: Skipping these steps can result in loss of user funds and project failure.

---

## 🌐 **Mainnet Deployment Process**

### **Phase 1: Environment Preparation**

#### **1. Mainnet Wallet Setup**
```bash
# Create dedicated mainnet deployment wallet
solana-keygen new --outfile ~/.config/solana/mainnet-deploy.json

# CRITICAL: Backup this wallet file securely
# Store in multiple secure locations (encrypted)
cp ~/.config/solana/mainnet-deploy.json ~/secure-backup/

# Get the address
MAINNET_DEPLOYER=$(solana address -k ~/.config/solana/mainnet-deploy.json)
echo "Mainnet deployer: $MAINNET_DEPLOYER"
```

#### **2. Fund Deployment Wallet**
```bash
# You'll need to transfer REAL SOL to this address
# Recommended: 5-10 SOL for deployment + buffer
# Transfer from your main wallet or exchange

# Verify balance
solana balance $MAINNET_DEPLOYER --url mainnet-beta
```

#### **3. Configure Solana CLI**
```bash
# Set to mainnet
solana config set --url mainnet-beta
solana config set --keypair ~/.config/solana/mainnet-deploy.json

# Verify configuration
solana config get
# Should show: RPC URL: https://api.mainnet-beta.solana.com
```

### **Phase 2: Program ID Management**

#### **Strategy A: Fresh Program ID (Recommended)**
```bash
# Generate new program keypair for mainnet
solana-keygen new --outfile target/deploy/slider_pvp-mainnet-keypair.json

# Get the new program ID
MAINNET_PROGRAM_ID=$(solana address -k target/deploy/slider_pvp-mainnet-keypair.json)
echo "New mainnet program ID: $MAINNET_PROGRAM_ID"
```

#### **Strategy B: Reuse Existing Program ID (Advanced)**
```bash
# Copy devnet keypair if you want same program ID
cp target/deploy/slider_pvp-keypair.json target/deploy/slider_pvp-mainnet-keypair.json
```

#### **Update Program ID in Code**
```rust
// In programs/slider-pvp/src/lib.rs
declare_id!("YOUR_NEW_MAINNET_PROGRAM_ID_HERE");
```

```toml
# In Anchor.toml
[programs.mainnet]
slider_pvp = "YOUR_NEW_MAINNET_PROGRAM_ID_HERE"
```

### **Phase 3: Final Testing & Build**

#### **1. Update Configuration**
```bash
# Build with new program ID
anchor build

# Verify the program ID matches
solana address -k target/deploy/slider_pvp-mainnet-keypair.json
```

#### **2. Final Devnet Test**
```bash
# Test with updated program ID on devnet first
anchor test --provider.cluster devnet

# Run comprehensive test suite
node devnet-testing/full-test.js
```

#### **3. Code Review**
- [ ] Final code review by multiple developers
- [ ] Verify all constants are production-ready
- [ ] Check timeout values are appropriate
- [ ] Confirm fee percentages are correct

### **Phase 4: Mainnet Deployment**

#### **1. Deployment**
```bash
# Deploy to mainnet (THIS COSTS REAL SOL)
anchor deploy --provider.cluster mainnet

# Save deployment transaction signature
DEPLOY_TX="[copy_transaction_signature_from_output]"
echo "Deployment TX: $DEPLOY_TX"
```

#### **2. Immediate Verification**
```bash
# Verify program exists
solana program show $MAINNET_PROGRAM_ID --url mainnet-beta

# Check program size and cost
PROGRAM_SIZE=$(solana program show $MAINNET_PROGRAM_ID --url mainnet-beta --output json | jq -r '.account.data | length')
echo "Program size: $PROGRAM_SIZE bytes"
```

#### **3. Basic Functionality Test**
```bash
# Test basic connectivity (modify simple-test.js for mainnet)
# DO NOT use large amounts initially
# Start with minimum viable test (0.001 SOL)
```

---

## 🔄 **Program Updates & Upgrades**

Solana programs can be upgraded by their **upgrade authority**. Here's how to manage this:

### **Understanding Program Authority**

When you deploy a program, you become the **upgrade authority**:
```bash
# Check current upgrade authority
solana program show $PROGRAM_ID --url mainnet-beta | grep "Upgrade Authority"
```

### **Types of Updates**

#### **1. Code Updates (Program Upgrades)**
For bug fixes, new features, or optimizations:

```bash
# 1. Update your code in programs/slider-pvp/src/lib.rs
# 2. Test thoroughly on devnet
# 3. Build the updated program
anchor build

# 4. Deploy upgrade to mainnet
solana program deploy target/deploy/slider_pvp.so \
  --program-id $PROGRAM_ID \
  --upgrade-authority ~/.config/solana/mainnet-deploy.json \
  --url mainnet-beta
```

#### **2. Emergency Upgrades**
For critical security fixes:

```bash
# Same process but expedited
# Have emergency procedures documented
# Consider pause mechanisms in critical fixes
```

#### **3. Authority Transfer**
Transfer upgrade authority to a multisig or DAO:

```bash
# Transfer to multisig (recommended for production)
solana program set-upgrade-authority $PROGRAM_ID \
  --new-upgrade-authority $MULTISIG_ADDRESS \
  --url mainnet-beta

# Make program immutable (cannot be changed)
solana program set-upgrade-authority $PROGRAM_ID \
  --new-upgrade-authority null \
  --url mainnet-beta
```

### **Upgrade Best Practices**

#### **1. Testing Procedure**
```bash
# Always follow this sequence:
1. Test changes on devnet extensively
2. Deploy to mainnet-clone (if available)  
3. Test with minimal real funds on mainnet
4. Gradual rollout with monitoring
```

#### **2. Rollback Strategy**
```bash
# Keep previous program version
cp target/deploy/slider_pvp.so backups/slider_pvp-v1.0.so

# Deploy rollback if needed
solana program deploy backups/slider_pvp-v1.0.so \
  --program-id $PROGRAM_ID \
  --upgrade-authority ~/.config/solana/mainnet-deploy.json \
  --url mainnet-beta
```

#### **3. State Migration**
If you need to change account structures:
```rust
// Add migration logic in your program
pub fn migrate_accounts(ctx: Context<MigrateAccounts>) -> Result<()> {
    // Handle account structure changes
    // Preserve existing data
    Ok(())
}
```

---

## 💰 **Cost Analysis**

### **Initial Deployment Costs**
```
Program Deployment: ~2-3 SOL (depends on program size)
Buffer Account: ~0.01 SOL  
Transaction Fees: ~0.005 SOL
Total Initial: ~3-4 SOL
```

### **Ongoing Costs**
```
Program Upgrades: ~0.005 SOL per upgrade
Monitoring: Variable based on RPC usage
Emergency Response: Keep 5-10 SOL buffer
```

### **Revenue Requirements**
```
Break-even: ~10-20 successful wagers
Profitable: 50+ wagers
Sustainable: 100+ wagers/month
```

---

## 🔐 **Authority Management Strategies**

### **Option 1: Single Authority (Launch Phase)**
- **Pros**: Fast updates, full control
- **Cons**: Single point of failure, trust issues
- **Use**: Initial launch only

### **Option 2: Multisig Authority (Recommended)**
```bash
# Use Squads or similar for multisig
# 2-of-3 or 3-of-5 configuration
# Include team members and trusted advisors
```

### **Option 3: DAO Governance (Long-term)**
```bash
# Transfer authority to governance program
# Community votes on upgrades
# Fully decentralized control
```

### **Option 4: Immutable Program**
```bash
# Remove upgrade authority permanently
solana program set-upgrade-authority $PROGRAM_ID \
  --new-upgrade-authority null \
  --url mainnet-beta

# ⚠️ WARNING: This cannot be undone!
```

---

## 📊 **Monitoring & Maintenance**

### **Essential Monitoring**

#### **1. Program Health**
```bash
# Check program exists and is funded
solana program show $PROGRAM_ID --url mainnet-beta

# Monitor program balance
PROGRAM_BALANCE=$(solana balance $PROGRAM_ID --url mainnet-beta)
```

#### **2. Transaction Monitoring**
```bash
# Monitor program logs
solana logs $PROGRAM_ID --url mainnet-beta

# Set up alerts for failed transactions
# Monitor unusual activity patterns
```

#### **3. Financial Monitoring**
```bash
# Track fee recipient wallet
solana balance $FEE_RECIPIENT_ADDRESS --url mainnet-beta

# Monitor wager volumes and success rates
# Alert on unusual fund movements
```

### **Automated Monitoring Script**
```bash
#!/bin/bash
# Create monitoring/mainnet-health-check.sh

# Check program health every 5 minutes
while true; do
    # Program exists check
    if ! solana program show $PROGRAM_ID --url mainnet-beta > /dev/null; then
        echo "ALERT: Program not found!" | mail -s "URGENT" admin@yourproject.com
    fi
    
    # Balance check
    BALANCE=$(solana balance $PROGRAM_ID --url mainnet-beta --output json | jq -r .value)
    if [ $BALANCE -lt 2000000000 ]; then  # Less than 2 SOL
        echo "ALERT: Program balance low: $BALANCE" | mail -s "WARNING" admin@yourproject.com
    fi
    
    sleep 300  # 5 minutes
done
```

---

## 🚨 **Emergency Procedures**

### **Emergency Response Team**
- [ ] 24/7 contact list established
- [ ] Emergency wallets funded and accessible
- [ ] Communication channels (Discord, Telegram, email)
- [ ] Public communication templates prepared

### **Emergency Scenarios & Responses**

#### **1. Bug Discovery**
```
1. Assess severity immediately
2. If critical: prepare emergency patch
3. Notify users via all channels
4. Deploy fix following emergency procedures
5. Post-mortem analysis
```

#### **2. Funds at Risk**
```
1. If possible: pause contract operations
2. Work with users to withdraw funds safely
3. Deploy emergency upgrade
4. Coordinate with Solana validators if needed
```

#### **3. Authority Compromise**
```
1. If upgrade authority is compromised
2. Transfer authority to secure backup
3. Revoke compromised keys
4. Audit all recent changes
```

---

## 📋 **Mainnet Deployment Checklist**

### **Pre-Deployment**
- [ ] Security audit completed and issues resolved
- [ ] Extended testing on devnet (minimum 2 weeks)
- [ ] Legal review completed
- [ ] Insurance/security fund allocated
- [ ] Team trained on emergency procedures
- [ ] Monitoring systems implemented
- [ ] Communication plan established

### **During Deployment**
- [ ] Mainnet wallet funded with sufficient SOL
- [ ] Final build verification
- [ ] Deployment transaction executed
- [ ] Program verification on blockchain
- [ ] Basic functionality test passed
- [ ] Monitoring systems activated

### **Post-Deployment**
- [ ] Program ID updated in frontend
- [ ] Documentation updated with mainnet details
- [ ] Marketing and user communication
- [ ] 24/7 monitoring begins
- [ ] First few transactions monitored closely
- [ ] Success metrics tracking initiated

---

## 🎯 **Success Metrics**

### **Technical Metrics**
- [ ] Zero failed deployments
- [ ] 99.9%+ transaction success rate
- [ ] No security incidents
- [ ] Response time < 15 minutes for issues

### **Business Metrics**
- [ ] Total Value Locked (TVL)
- [ ] Number of successful wagers
- [ ] Fee revenue generated
- [ ] User retention rate

---

## 🔧 **Mainnet Deployment Scripts**

Let me create the mainnet deployment automation:

### **Automated Mainnet Deployment**
```bash
# scripts/deploy-mainnet.sh
# (Full script with all safety checks)
```

### **Program Update Script**
```bash
# scripts/upgrade-mainnet.sh  
# (Handles program upgrades safely)
```

### **Emergency Response Script**
```bash
# scripts/emergency-response.sh
# (Quick response to critical issues)
```

---

## ⚠️ **Important Disclaimers**

1. **Real Money Risk**: Mainnet deployment involves real SOL and user funds
2. **Immutable Contracts**: Some changes cannot be undone once deployed
3. **Authority Management**: Losing upgrade authority means no future updates
4. **Security Responsibility**: You are responsible for user fund safety
5. **Legal Compliance**: Ensure compliance with applicable regulations

---

## 📞 **Support Resources**

### **Solana Resources**
- [Solana Program Deployment](https://docs.solana.com/cli/deploy-a-program)
- [Program Upgrades](https://docs.solana.com/cli/examples/deploy-a-program#redeploy-a-program)
- [Solana Validator Discord](https://discord.gg/pquxPsq)

### **Security Resources**
- [Solana Security Best Practices](https://github.com/solana-labs/solana/blob/master/docs/src/developing/programming-model/calling-between-programs.md)
- [Anchor Security Guidelines](https://www.anchor-lang.com/docs/security)

---

## 🚀 **Ready for Mainnet**

Your Slider PvP contract has already proven itself on devnet. Follow this guide carefully to deploy safely to mainnet with proper upgrade mechanisms in place.

**Remember**: Take your time, test extensively, and prioritize security over speed. The Solana community values projects that deploy responsibly.

**Good luck with your mainnet launch!** 🎉
