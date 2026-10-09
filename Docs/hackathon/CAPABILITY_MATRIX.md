# VeilProof — Capability Matrix

Legend: **ACTUAL** = implemented and tested; **FIXTURE** = controlled-fictional only;
**UNAVAILABLE** = backend refuses/returns unavailable; **BLOCKED** = external dependency missing;
**DEFERRED** = out of hackathon scope.

| Capability | Status | Notes |
| --- | --- | --- |
| JPEG EXIF/GPS inspector | ACTUAL | Supported fields only; tested |
| JPEG metadata-minimized derivative | ACTUAL | Re-encode drops metadata; original preserved |
| Equal original/derivative hashes claim | n/a | Derivative SHA-256 differs (tested) |
| AES-256-GCM object envelope v1 | ACTUAL | Cross-language vector verified |
| RSA-OAEP-3072 DEK wrapping | ACTUAL | Dev broker key (ignored dir) |
| Dev-only local key custody | ACTUAL (shortcut) | Not production KMS |
| Ciphertext-at-rest storage | ACTUAL | Opaque paths; no plaintext debug files |
| Bounded automated inspection | ACTUAL (shortcut) | Job-scoped; no human original preview |
| Durable complaints/cases | ACTUAL | Survives restart (tested) |
| Staff auth + server ACL | ACTUAL | Deny-by-default; token tamper denied |
| Three distinct principals | ACTUAL | Self-review & same-principal denied |
| Privacy release / assignment | ACTUAL | ACO-09 ineligible enforced |
| Sequential original access | ACTUAL | Privacy → Oversight → grant |
| First-open activation + expiry | ACTUAL | Authoritative DB time; end/revoke |
| Reporter tracking (safe projection) | ACTUAL | No internal fields in payload |
| Public/internal update separation | ACTUAL | Canary-tested |
| Audit hash chain + outbox worker | ACTUAL | Linked chain tested |
| Commitment v1 (193-byte) | ACTUAL | Golden vector |
| Local commitment registry | ACTUAL | Append-only table; **not** a blockchain |
| Contract compile (local) | ACTUAL | `solc 0.8.24`, evm target paris; `CommitmentRegistry.sol` compiles clean |
| Hardhat local deploy | ACTUAL | Deployed to chainId 31337 (ephemeral); repeatable offline |
| Amoy / EVM anchoring | BLOCKED | Contract ready; needs `RPC_URL` + funded signer + `RELAYER_KEY_FILE` |
| PostgreSQL persistence | BLOCKED | No server/Docker; SQLite adapter used |
| Supabase storage/auth | BLOCKED | Not configured |
| RLS / DB privilege isolation | DEFERRED | SQLite has no RLS |
| PDF/audio/video sanitization | ACTUAL (bounded) | PDF selected redactions; audio muting by interval; video full-frame concealment. See ../../README.md |
| Name/face/voice protection | ACTUAL (human review required) | Local candidates, selected image/PDF redaction and audio interval muting; no automatic speaker identification |
| Forensic analysis mode | UNAVAILABLE | Request rejected (422) |
| Production KMS / Tor / threshold | DEFERRED | Explicitly out of scope |
| Custom access durations | DEFERRED | Bounded 1-480 min only |
| Complex real-time delivery | DEFERRED | Polling used instead of WebSockets |
| Full-text search | DEFERRED | Not implemented |
| Frontend layout/route changes | n/a | Preserved (build baseline unchanged shape) |
| Staff data pages on backend | ACTUAL | All staff pages (CasesPage, PrivacyQueuePage, etc.) hydrated from backend via 5s polling; mutations post to API (see FRONTEND_BINDINGS.md) |
