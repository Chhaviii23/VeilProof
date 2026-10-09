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
| Independent verifier | ACTUAL | Local anchor check; offline = local consistency |
| Amoy / EVM anchoring | BLOCKED | Needs RPC URL + funded signer + authorization |
| PostgreSQL persistence | BLOCKED | No server/Docker; SQLite adapter used |
| Supabase storage/auth | BLOCKED | Not configured |
| RLS / DB privilege isolation | DEFERRED | SQLite has no RLS |
| PDF/audio/video sanitization | UNAVAILABLE | Recorded as skipped, never marked Protected |
| Name/face/voice masking | FIXTURE only | No real implementation |
| Forensic analysis mode | UNAVAILABLE | Request rejected (422) |
| Production KMS / Tor / threshold | DEFERRED | Explicitly out of scope |
| Frontend layout/route changes | n/a | Preserved (build baseline unchanged shape) |
| Staff data pages on backend | PARTIAL | Auth + reporter flows wired; staff list/queue pages remain fixture-backed (see FRONTEND_BINDINGS.md) |
