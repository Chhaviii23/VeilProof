# VeilProof — Judge Q&A (honest answers)

**Is the metadata removal real?**
Yes for JPEG. The server/client reads supported EXIF/GPS fields, computes hashes, and re-encodes a
separate derivative without metadata. Reinspection of the derivative shows zero findings. It is not
visible-content anonymization — a face in the pixels remains unless a tested redaction exists.

**Is anything "simulated"?**
Advanced name/face/voice masking (no real implementation). PDF/audio/video sanitization is
**unavailable** and is never marked Protected. The local commitment registry is a durable
append-only table, **not** a blockchain; we say so explicitly.

**Is there a fake transaction hash anywhere?**
No. Proof `tx_ref` values are real local-registry sequence ids, or absent. Amoy is BLOCKED.

**Can one approval open evidence?**
No. Two independent stages are required, and the requester, Privacy reviewer, and Oversight reviewer
must be three distinct human principals (a second account for the same human is rejected).

**Does a grant unlock other files?**
No. A grant binds one exact original version. Opening file B is denied.

**Can a released protected copy unlock the original?**
No. Original access requires the full review chain plus an active, unexpired grant.

**Where are the keys?**
Development-only wrapping key in an ignored `backend/keys/` directory. Not production KMS. Original
DEKs are never returned to investigator clients.

**What happens if the chain/proof fails?**
The case stays Accepted with proof Pending/Failed and retries; acceptance never depends on the chain.

**What is not built?**
PostgreSQL (SQLite adapter here), Supabase, Amoy, RLS, forensic mode, advanced-media sanitization,
new UI screens. See CAPABILITY_MATRIX.md.

**Did you change the frontend design?**
No. Layout, routes, and components are preserved; only service/hook/type bindings changed
(sign-in, evidence file retention, submission, tracking session).
