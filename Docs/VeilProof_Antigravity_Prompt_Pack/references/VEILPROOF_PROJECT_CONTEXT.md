# VeilProof — reconstructed project context

Reconstructed on 8 October 2026 from seven user-supplied Figma prompts and the user's confirmation that VeilProof targets whistleblowers in India. Subsequently expanded from the research memorandum and six-page HackBios pitch deck supplied by the user. This is a synthesis of specifications, not recovery of the deleted chat or verification of a working implementation.

## Product definition

VeilProof is an India-focused whistleblower reporting and evidence-management platform, with a particular focus on high-risk government corruption, public procurement fraud, misuse of public funds, and retaliation.

It is designed to let a person submit a complaint without creating an identity profile, protect identifying details in evidence, preserve unchanged originals, and follow investigation progress using private credentials. Staff use separate privacy, investigation, and oversight workflows.

The central design principle is to separate evidence useful for investigation from information that could expose its source. Blockchain supplies an integrity commitment; it does not establish whether an allegation is true.

## Source interpretation and evolution

The apparent revision order follows the supplied attachment order and explicit replacement language. Exact original dates are unavailable. Treat the comprehensive fifth prompt as the consolidated baseline and the sixth and seventh as subsequent targeted updates, subject to user correction.

1. Initial specification: general whistleblowing; PDF/image evidence; metadata review; two investigators approving access; Expo implementation target.
2. Shared-state update: submissions, investigator decisions, and reporter updates must operate on the same in-memory case records.
3. Role redesign: replace Investigator A/B with investigator, privacy officer, and oversight officer; distinguish protected copies from sealed originals.
4. Scenario update: focus on a fictional Indian government bridge-corruption case, multimedia evidence, retaliation, and public safety.
5. Comprehensive specification: consolidates the product, routes, risks, identity protection, proposed backend and walletless blockchain architecture.
6. Identity-protection update: make protection a dedicated, interactive screen; reporters confirm which names, faces, and voices to protect.
7. Workflow update: privacy review followed by assignment to one of ten officers; specific-file original access reviewed by Privacy then Oversight; five evidence categories with one item per category; visible timed access.

## Latest intended reporter journey

Home → Report Details → Risk Assessment → Evidence → Identity Protection → Review → Submission → Private Receipt → Track.

- No required registration, name, email, phone, employee ID, Aadhaar, identity document, or crypto wallet.
- Collect the allegation, category, department/project, incident period, and optional location/entities.
- Assess workplace retaliation, dismissal/transfer threats, physical threats, family threats, and immediate public-safety danger.
- Physical/family threats or immediate public danger make the demo case Critical.
- Allow a written complaint without attachments; the later evidence limit is a maximum, not a requirement to fill all categories.
- Latest demo limit: one PDF, one image (PNG/JPG/JPEG combined), one MP3, one MP4, and one HTTPS reference link.
- Generate a complaint reference and a separate private tracking secret. The reference alone cannot grant tracking access.
- Tracking shows safe status updates, not staff names, internal notes, evidence previews, or access-request discussions.

## Identity protection / Privacy Guardian

Detect potential identity clues, not the reporter's identity. The reporter confirms what to protect.

- Hidden metadata: protect fields such as GPS, device model, author, filenames, editing information, timestamps, and internal paths in working copies.
- Visible/spoken content: offer selections for names, faces, speakers, identifiers, and sensitive regions or time ranges.
- Offer protection of selected clues and protection of all identities.
- Latest fictional selection example: Rahul Sharma, Face 2, and Speaker 1.
- Show a protected-copy preview and a clear protection summary.
- Do not expose the relationship between a selected clue and the reporter to investigators.

Maintain two distinct evidence versions:

1. **Sealed original:** preserve the exact original bytes under encryption; locked by default.
2. **Protected investigator copy:** remove metadata and protect selected content; release for routine investigation after privacy review.

Protection choices must never modify the sealed original. Demo previews do not establish that arbitrary uploaded media was actually sanitized.

## Roles and responsibilities

| Role | Intended responsibilities | Key limits |
| --- | --- | --- |
| Reporter | Submit, choose protection, receive receipt, track, verify integrity | No public identity profile |
| Privacy & Evidence Officer | Review protection, release protected copies, assign investigator, review original-access scope, recommend/reject/request clarification | Cannot independently grant final original access or close investigations |
| Anti-Corruption Officer | Investigate assigned cases using released copies, record findings/internal notes, publish safe updates, request originals | Cannot approve own access or final closure |
| Oversight & Whistleblower Protection Officer | Assess threats, independently decide limited original access, review audit, approve escalation/closure or reopen | Does not conduct routine investigation or need to open originals to approve requests |

Earlier fictional staff names are Priya Nair, Arjun Mehta, and Meera Rao. The final update selects ACO-04, Public Procurement Specialist, from ten fictional investigators. Matching Arjun to ACO-04 is not explicitly established.

Assignment considers expertise, jurisdiction, workload, availability, and conflicts. Conflicted officers are ineligible.

## Original-access workflow

Investigator requests one original → Privacy Officer reviews and recommends → Oversight Officer independently approves limited access → Investigator is notified → Approved access is audited and expires or is revoked.

Requests specify exact file, purpose, why the protected copy is insufficient, duration, mode, intended action, and urgency. Privacy recommendation alone does not unlock an original. Approval of one file does not unlock the vault.

The latest demo requests Bribe_Discussion_Recording.mp3 for audio-manipulation verification: voice masking changes characteristics needed for examination. Requested mode is stream-only for 30 minutes. The prototype shows notification, countdown, start/expiry times, revocation, automatic viewer closure, and audit events.

Emergency/protective action can begin using protected evidence without waiting for original-access approval.

Keep case progress, protection status, proof status, and individual evidence-access status logically separate even though the final prompt presents them in a combined illustrative timeline.

## India-specific demonstration

- Case reference: VP-2026-1048.
- Title: Suspected ₹18 Crore Public Bridge Construction Scam.
- Project: Riverfront District Bridge Rehabilitation Project.
- Department: fictional State Public Works Department.
- Reporter scenario: a civil engineer concerned about construction records and retaliation.
- Allegations: lower-grade steel, modified concrete tests, premature inspection approvals, missing materials/incomplete work, and an alleged bribe discussion.
- Earlier illustrative findings: 620 tonnes invoiced vs 410 recorded; ₹4.8 crore questioned steel value; 92% payment vs 64% completion. These remain fictional, unverified allegations.
- Latest five-item demo: PWD_Payment_and_Inspection_Report.pdf; Steel_Grade_Site_Photo.jpg; Bribe_Discussion_Recording.mp3; Material_Removal_From_Site.mp4; fictional state tender portal reference.
- Proposed receiving authority: fictional Independent State Anti-Corruption Unit.
- No documented live integration with CVC, CBI, police, or a Lokayukta.

India focus is confirmed; legal routing, actual institutional ownership, and real protection arrangements are not established by these prompts. No legal compliance conclusion is implied.

## Intended architecture versus prototype

The intended application stack specified in the comprehensive prompt is:

- React Native, Expo/Expo Go for MVP, Expo Router, TypeScript, Zustand, StyleSheet/design tokens, and Expo web.
- FastAPI backend.
- Supabase PostgreSQL and private Storage.
- AES-256-GCM encryption and SHA-256 hashing.
- Solidity, Hardhat, Polygon Amoy testnet, Ethers.js or Web3.py, and a backend walletless relayer.

Private storage holds encrypted originals and protected copies. PostgreSQL holds workflow records. The proposed blockchain commitment binds a domain separator, random salt, original hash, protected-copy hash, and case nonce. Evidence, complaint text, identities, tracking secrets, keys, and plain file hashes are not intended for the chain. A backend relayer pays testnet gas; the reporter needs no wallet.

An integrity match means the checked evidence matches the committed version; it does not prove truth, provenance before submission, or legal guilt. Proof delays must not undo accepted complaints or create duplicate reports.

The Figma deliverable is a functional web prototype with shared in-memory state. Navigation and role changes preserve state; refresh/reset restores fixtures. It is not automatically Expo-native code. Security transformations, malware scanning, and blockchain confirmation must be identified as simulated unless actually implemented. No running prototype or code was inspected for this reconstruction.

## Design direction

Bright, calm, discreet, and readable. Paper/ink/ember palette: canvas #FAF9F6, white surfaces, primary text #252622, secondary text #62635D, accent #B94725, borders #E3E1DA. Inter typography, generous spacing, restrained borders, accessible focus and contrast, 48px actions, mobile layouts down to 360px. Avoid hacker imagery, neon, crypto decoration, and unsupported trust claims.

Preferred headline: “Speak safely. Let the evidence be heard.” Use short, action-focused privacy copy. Absence of identity fields must not become a claim of guaranteed anonymity.

## Open decisions / interpretation risks

- Which real organization operates the service and employs or authorizes the three staff roles?
- How are complaints routed by Indian jurisdiction, and what real protective actions can that operator provide?
- Which languages and accessibility needs are in MVP scope? Indian-language support is not specified.
- The additional research and deck explicitly intend local metadata processing and encryption before upload. Key ownership, authorized decryption, and the complete trust model remain unresolved.
- Where are reporter-to-clue selections retained, who can access them, and when are they deleted?
- What are retention, deletion, recovery, abuse prevention, and production authentication policies?
- How is a changing external reference link preserved or verified? A URL is not an immutable file.
- What exact forensic operation is feasible under the proposed stream-only audio grant? This requires implementation design.
- When precisely does an approved grant's timer begin: approval, notification, or first open? The prompts vary.
- Later one-item-per-category and mandatory-countdown instructions supersede earlier larger inventories and optional-timer rules for the demo, but do not establish permanent production limits.
- Actual Indian legal obligations and evidentiary requirements require separate current research; they were not researched in this reconstruction.

## Source attachments

All source files were read as reference material and remain unchanged.

1. C:/Users/ARSH/.codex/attachments/f0568850-997b-4fd7-be57-6c6515b79e11/Pasted text.txt
2. C:/Users/ARSH/.codex/attachments/8b266f32-6bef-4d02-be3d-62ed5db396a1/Pasted text.txt
3. C:/Users/ARSH/.codex/attachments/d27b7bb8-3589-4d54-b2a0-edac834acf40/Pasted text.txt
4. C:/Users/ARSH/.codex/attachments/244e9800-86f7-4d45-bbae-174ad4e9dcfb/Pasted text.txt
5. C:/Users/ARSH/.codex/attachments/c44f01d6-636c-4bbe-a74f-6430cbf5bb95/Pasted text.txt
6. C:/Users/ARSH/.codex/attachments/58698ac2-d490-4591-9d18-67e5f484b2cb/Pasted text.txt
7. C:/Users/ARSH/.codex/attachments/0fe157e2-733c-47d7-b998-40456307a655/Pasted text.txt

## Additional research and pitch-deck analysis

Additional sources, read without modifying them:

- C:/Users/ARSH/Downloads/VeilProof_Deep_Research_and_References.md — dated 20 September 2026; research, competitive analysis, threat model, proposed architecture, validation plan, and business strategy.
- C:/Users/ARSH/Downloads/JeeJeeBrats_HackBios_3.0.pdf — six-page Web3/Blockchain hackathon pitch for team Jee Jee Brats. All six pages were text-extracted and visually reviewed; the architecture page was inspected separately at higher resolution.

### What these add

The original three-pillar thesis is explicit: Privacy Guardian, Blockchain Proof Receipt, and Dual-Control Evidence Vault. The research identifies four separate problems: identity exposure, evidence tampering, unauthorized access, and suppression/denial of a submission. The reporter-held receipt addresses the last problem by providing a verification record outside the organization's case database.

The proposed security boundary starts on the reporter's device: inspect metadata, generate the derivative, hash and encrypt originals/copies, then upload ciphertext. This is stronger and more specific than merely encrypting files after server receipt. Local processing of arbitrary PDF/audio/video was not established as implemented.

The research's initial real 24-hour MVP is narrower than the later interactive demo: JPEG EXIF removal, local hashing/encryption, private ciphertext upload, a testnet commitment and receipt verifier, and backend-enforced two-person approval. Advanced media transformations and stronger key controls are later work or simulations. These are planned deliverables, not test results.

The research also proposes institutional adoption: companies, universities, NGOs, media, and compliance teams, with subscriptions and deployment/security services. Its recommended entry point is a controlled organizational pilot, while the later Figma scenario emphasizes public-sector corruption. These are compatible potential directions, but the operator and initial buyer remain unselected.

### How to reconcile the sources

Use the research for rationale, threat modelling, and qualification of security claims; use the later Figma amendments for current interaction and role requirements; use the deck as a record of the hackathon pitch. The two-investigator architecture in the research/deck does not supersede the later Privacy/Oversight separation. Exact deck chronology is not known.

The deck uses a dark green/neon circuit aesthetic, including dark prototype screenshots. Later Figma instructions explicitly adopt paper/ink/ember and reject that style, so the deck is not the current application design reference.

### Pitch claims needing correction

1. Page 2 says the receipt proves evidence was not changed or deleted. A commitment supports checking a candidate file and preserves a record of a commitment; it does not prevent off-chain deletion, recover deleted files, or continuously prove storage availability.
2. Page 2 says walletless verification prevents identity tracing. It avoids requiring the reporter's blockchain wallet; network/device/timing correlation remains a separate problem.
3. Page 2 says no single authority controls the evidence. Separate approvals alone do not establish this if one administrator or key service can bypass them. Independent key custody requires its own enforceable design.
4. General metadata-removal wording should specify supported formats and tested operations. The later user-confirmed identity-protection workflow appropriately covers more than metadata, but remains unverified implementation scope.
5. The 24-hour feasibility, impact benefits, and research scoring are estimates or aspirations, not measured results. The supplied material contains a validation plan, not evidence of completed tests, a deployed contract, or a security audit.

### Research strengths and limits

The research usefully distinguishes anonymity from confidentiality, integrity from truth, and workflow approval from cryptographic dual control. It preserves original/derivative separation and proposes salted commitments rather than publishing plain file hashes. It also acknowledges established competitors and avoids claiming that every individual feature is novel.

Its competitor table, external statistics, legal commencement statements, and adoption claims should not be treated as independently verified merely because they have links. Some legal references use secondary hosts, one status reference is from 2018, and the research itself requests current legal verification. This review did not perform a full legal, market, or bibliographic audit. Spot checks of official OWASP cryptographic-storage guidance and SecureDrop source-safety guidance support the distinction between encryption/key management and network/source anonymity.

### Further architecture questions exposed by the research

- Define separate tracking credentials and integrity-verification material; never make a public verification artifact disclose tracking access.
- Specify the complete receipt schema and commitment encoding. Its formula includes two hashes and a case nonce; independent verification needs the required values or a suitable proof, not merely a salt and transaction ID.
- Decide how independent verification works if the service is unavailable and whether a reporter must retain the candidate evidence.
- Reconcile encrypted-before-upload evidence with malware inspection and redaction: where can plaintext be processed, under whose authority, and with what isolation?
- Keep per-file original-access grants from exposing other file keys; a single unrestricted case key could conflict with later per-file controls.
- Protect complaint text, risk answers, reference titles, and identity selections as well as attachments; the current encryption descriptions focus mainly on evidence files.
- Treat storage redundancy/recovery and suppression of actual investigative action separately from blockchain integrity anchoring.
