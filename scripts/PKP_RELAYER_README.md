# PKP Relayer System for Charli

## Overview

This document explains the enhanced PKP (Programmable Key Pair) relayer system used in Charli. The system has been improved to create a more trustless architecture that minimizes reliance on the RELAYER_MANAGER_PRIVATE_KEY.

## How the PKP Relayer System Works

### PKP Lifecycle in Deploy Process

1. **Mint**: A new relayer PKP is minted during every deployment using the RELAYER_MANAGER_PRIVATE_KEY
2. **Permission Setup**: The PKP is granted permission to execute specific Lit Actions
3. **Burn**: The PKP is "burned" by transferring it to a dead address, making its permissions immutable
4. **Environment Update**: The new PKP's token ID and public key are saved to the environment file

### Benefits of This Approach

- **Trustlessness**: Once a PKP is burned, no one (not even the holder of RELAYER_MANAGER_PRIVATE_KEY) can modify its permissions
- **Fresh PKPs**: Each deployment gets a fresh PKP with precisely the permissions needed for the latest Lit Actions
- **Auditability**: Each PKP has a fixed set of permissions that can be verified on-chain
- **Secure Permissions**: The PKP can only execute the specific Lit Actions it was given permission for

## Technical Implementation

### deploy-all.ts Changes

The script now:
1. Pins Lit Actions to IPFS as before
2. Mints a new relayer PKP using the RELAYER_MANAGER_PRIVATE_KEY
3. Sets up permissions for all Lit Actions
4. Burns the PKP by transferring to a dead address
5. Updates environment variables with the new PKP information

### Key Functions

- `mintRelayerPKP()`: Mints a new PKP and returns its information
- `setupPkpPermissions()`: Grants the PKP permission to execute specific Lit Actions
- `burnPkp()`: Makes the PKP immutable by transferring it to a dead address
- `updateEnvFile()`: Updates environment variables with the new PKP information

## Role of RELAYER_MANAGER_PRIVATE_KEY

The RELAYER_MANAGER_PRIVATE_KEY is still required, but its role is now limited to:

1. **Deployment**: Used during the deployment process to mint and configure new PKPs
2. **No Runtime Dependency**: Not needed during normal system operation

This approach maintains the EOA as a deployment-time administrator while creating a trustless runtime system that relies only on the immutable permissions of the burned PKP.

## Troubleshooting

If you need to manually create or configure a PKP, you can still use the standalone `setup-Relayer-PKP-permissions.ts` script:

```bash
bun run scripts/setup-Relayer-PKP-permissions.ts \
  --token YOUR_PKP_TOKEN_ID \
  --permit YOUR_PERMIT_ACTION_CID \
  --transferFrom YOUR_TRANSFER_FROM_ACTION_CID \
  --relayer YOUR_RELAYER_ACTION_CID \
  --resetNonce YOUR_RESET_NONCE_ACTION_CID \
  --transferController YOUR_TRANSFER_CONTROLLER_ACTION_CID
```