# Commitment registry (P07B)

Minimal, non-upgradeable, append-only registry. Stores only an opaque 32-byte commitment and a
`uint16` protocol version; emits `Anchored(bytes32, uint16, uint64)`.

## Status

- **Contract source**: present.
- **Local compilation**: PASS (`solc 0.8.24`, evm target: paris). `npx hardhat compile` succeeds.
- **Local Hardhat deployment**: PASS — `npx hardhat run scripts/deploy.js --network hardhat` deploys to `0x5FbDB2315678afecb367f032d93F642f64180aa3` on chainId 31337 (ephemeral in-process node). Deploy is repeatable offline.
- **Amoy**: **BLOCKED** — requires `RPC_URL` and a funded relayer (`RELAYER_KEY_FILE`) plus an
  authorized deployment. No address or transaction hash is fabricated anywhere in this repo.

## When credentials exist

```bash
cd backend/chain
npm install
# local
npx hardhat run scripts/deploy.js --network hardhat
# amoy (requires authorization + funded signer)
RPC_URL=<amoy-rpc> RELAYER_KEY_FILE=<ignored-file> \
  npx hardhat run scripts/deploy.js --network amoy
```

Then set `PROOF_BACKEND=evm`, `CHAIN_ID=80002`, `RPC_URL`, `COMMITMENT_CONTRACT_ADDRESS`,
`RELAYER_KEY_FILE` and restart the worker.
