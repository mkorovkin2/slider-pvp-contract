# Configuration Directory

This directory contains environment-specific configuration for deploying the Slider PVP contract to different Solana networks.

## Files

### `environments.json`

Central configuration file for all deployment environments (devnet, mainnet, localnet).

**Structure**:
```json
{
  "devnet": { /* Devnet configuration */ },
  "mainnet": { /* Mainnet configuration */ },
  "localnet": { /* Localnet configuration */ }
}
```

## Configuration Options

Each environment supports the following configuration options:

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Human-readable environment name |
| `cluster` | string | Solana cluster name (devnet, mainnet-beta, localnet) |
| `rpcUrl` | string | RPC endpoint URL |
| `commitmentLevel` | string | Transaction commitment level (processed, confirmed, finalized) |
| `minSolBalance` | number | Minimum SOL balance required for deployment |
| `airdropEnabled` | boolean | Whether airdrops are available (devnet/localnet only) |
| `wallet` | string | Path to deployment wallet keypair |
| `programKeypair` | string | Path to program keypair file |
| `verification.runTests` | boolean | Whether to run tests after deployment |
| `verification.testScript` | string | Path to test script to run |
| `verification.requireConfirmation` | boolean | Require manual confirmation (mainnet) |
| `verification.safetyChecks` | boolean | Enable safety checks (mainnet) |
| `monitoring.explorerUrl` | string | Solana Explorer URL template |
| `monitoring.alertsEnabled` | boolean | Enable monitoring alerts |
| `monitoring.slackWebhook` | string | Slack webhook for alerts |
| `monitoring.discordWebhook` | string | Discord webhook for alerts |

## Usage

### Deploy to Specific Environment

```bash
npm run deploy:devnet
npm run deploy:mainnet
npm run deploy:localnet
```

Or directly:
```bash
./scripts/deploy.sh devnet
./scripts/deploy.sh mainnet
./scripts/deploy.sh localnet
```

### Switch Environment

```bash
./scripts/switch-env.sh devnet
./scripts/switch-env.sh mainnet
```

## Customization

### Add Custom RPC Endpoint

Edit `environments.json`:

```json
{
  "devnet": {
    "rpcUrl": "https://your-custom-rpc-endpoint.com"
  }
}
```

### Use Different Wallet

```json
{
  "mainnet": {
    "wallet": "~/.config/solana/my-mainnet-wallet.json"
  }
}
```

### Enable Monitoring Alerts

```json
{
  "mainnet": {
    "monitoring": {
      "alertsEnabled": true,
      "slackWebhook": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
      "discordWebhook": "https://discord.com/api/webhooks/YOUR/WEBHOOK"
    }
  }
}
```

### Add Custom Environment

You can add custom environments (e.g., testnet, custom network):

```json
{
  "devnet": { ... },
  "mainnet": { ... },
  "testnet": {
    "name": "Testnet",
    "cluster": "testnet",
    "rpcUrl": "https://api.testnet.solana.com",
    "minSolBalance": 2.0,
    "airdropEnabled": true,
    "wallet": "~/.config/solana/testnet.json",
    "programKeypair": "target/deploy/slider_pvp-testnet-keypair.json",
    "verification": {
      "runTests": true,
      "testScript": "tests/integration.js"
    }
  }
}
```

Then deploy:
```bash
./scripts/deploy.sh testnet
```

## Security Notes

⚠️ **Important Security Considerations**:

1. **Never commit private keys**: The `wallet` and `programKeypair` paths point to JSON files containing private keys. These should NEVER be committed to version control.

2. **Mainnet wallet security**: Use a dedicated deployment wallet for mainnet with only enough SOL for deployment. Transfer upgrade authority to a multisig wallet after deployment.

3. **Webhook URLs**: If using monitoring webhooks, consider using environment variables instead of hardcoding them:
   ```json
   {
     "slackWebhook": "${SLACK_WEBHOOK_URL}"
   }
   ```

4. **Version control**: This `environments.json` file can be committed to version control as it doesn't contain secrets, only paths and configurations.

## Environment Variables

You can override configuration values using environment variables in the deployment scripts:

```bash
# Override RPC URL
DEVNET_RPC_URL="https://my-custom-rpc.com" npm run deploy:devnet

# Override wallet path
WALLET_PATH="~/.config/solana/custom-wallet.json" npm run deploy:mainnet
```

## Validation

The deployment script automatically validates:
- Configuration file exists
- Environment exists in config
- Required tools are installed (solana, anchor, jq, bc)
- Wallet has sufficient balance
- Program builds successfully

## Troubleshooting

### Configuration file not found

```bash
# Create the config directory if it doesn't exist
mkdir -p config

# Copy from template
cp config/environments.json.example config/environments.json
```

### Invalid JSON syntax

Validate your JSON:
```bash
cat config/environments.json | jq .
```

### Environment not found

Check available environments:
```bash
cat config/environments.json | jq 'keys'
```

## Best Practices

1. **Test on devnet first**: Always test configuration changes on devnet before mainnet
2. **Backup configurations**: Keep backups of working configurations
3. **Document changes**: Comment custom changes in this README
4. **Use version control**: Commit configuration changes with descriptive messages
5. **Review before mainnet**: Double-check all mainnet settings before deployment

## Additional Resources

- [Environment Configuration Guide](../docs/ENVIRONMENT_CONFIGURATION.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)
- [Mainnet Deployment](../docs/MAINNET_DEPLOYMENT.md)

---

For detailed deployment instructions, see [ENVIRONMENT_CONFIGURATION.md](../docs/ENVIRONMENT_CONFIGURATION.md)

