# Commitment registry (P07B)

Minimal, non-upgradeable, append-only registry. Stores only an opaque 32-byte commitment and a
`uint16` protocol version; emits `Anchored(bytes32, uint16, uint64)`.

## Status

- **Contract source**: present.
- **Local deployment**: NOT RUN in this environment (Hardhat toolchain not installed; no node
  EVM used). The backend's default `PROOF_BACKEND=local_registry` provides a real, durable,
  append-only commitment table labelled *local registry, not a blockchain*.
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
