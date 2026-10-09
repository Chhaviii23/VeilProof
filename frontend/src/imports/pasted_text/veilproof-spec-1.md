Build a complete, responsive and interactive frontend prototype for
VeilProof, a Web3-based whistleblower protection platform for reporting
high-risk government corruption.

Read the complete specification before generating. Build the complete
connected application, not a landing page or disconnected mockups.


1. PRODUCT DEFINITION

VeilProof allows whistleblowers to:

- Report government corruption without creating an identity profile.
- Submit PDF, image, audio, video and reference-link evidence.
- Detect and protect information that may reveal their identity.
- Encrypt and seal the unchanged original evidence.
- Create a protected copy for authorized investigators.
- Receive a blockchain-backed integrity receipt.
- Track investigation progress using private credentials.

Core promise:

“Submit protected evidence without revealing who you are.”

Supporting statement:

“No name, email, phone number, employee ID, identity document or
crypto wallet is required.”

Never request reporter registration.

Do not create or display a reporter profile.

Do not use the phrase:

“No digital service can guarantee complete anonymity.”

Do not show long warning paragraphs during the submission flow.

Use positive, action-focused privacy language.


2. IMPLEMENTATION TARGET

The final application will use:

- React Native
- Expo with Expo Go compatibility for the MVP
- TypeScript
- Expo Router
- Zustand for shared application state
- React Native StyleSheet and design tokens
- Expo web
- FastAPI backend
- Supabase PostgreSQL
- Supabase private Storage
- Solidity smart contract
- Hardhat
- Polygon Amoy testnet
- Ethers.js or Web3.py
- Backend walletless blockchain relayer
- AES-256-GCM encryption
- SHA-256 hashing

Figma Make should create a functional web prototype designed for a
later React Native Expo implementation.

Use layouts and interactions that map naturally to:

- View
- Text
- TextInput
- Pressable
- ScrollView
- FlatList
- Modal
- Bottom sheets
- Expo Router stacks and tabs

Do not describe generated browser code as Expo-ready native code.

Provide an Expo Router handoff at the end.


3. DESIGN DIRECTION

Create a bright, minimal, premium and human-designed interface.

The product should feel like:

- A trusted independent public-interest service.
- Calm and discreet.
- Professional but approachable.
- Carefully structured.
- Easy to understand during a stressful situation.

Avoid cybersecurity clichés and generic AI dashboard styling.


4. COLOUR SYSTEM

FOUNDATION

Canvas: #FAF9F6
Primary surface: #FFFFFF
Secondary surface: #F2F0EB
Hover surface: #ECE9E3

TEXT

Primary text: #252622
Secondary text: #62635D
Muted text: #73746D
Inverse text: #FFFFFF

STRUCTURE

Divider: #E3E1DA
Input border: #8B8C84
Strong neutral: #3E4039

PRIMARY ACCENT

Accent: #B94725
Accent pressed: #96381E
Accent background: #FBEDE7

SEMANTIC COLOURS

Success: #326047
Success background: #EDF4EE

Warning: #805D16
Warning background: #FBF4E3

Error: #A12C3A
Error background: #FBEFF1

Information: #465D70
Information background: #EFF3F6

Use approximately 90% neutral colours.

Use the primary accent only for:

- Main actions.
- Current progress.
- Selected navigation.
- Important emphasis.

Do not colour every card, heading or icon.


5. DESIGN DO’S

- Use generous whitespace.
- Use strong typography and alignment.
- Keep one clear primary action per screen.
- Use persistent labels above inputs.
- Use restrained borders before shadows.
- Keep forms readable and calm.
- Use clear status labels with icons.
- Design for 360px mobile screens.
- Keep all main actions at least 48px high.
- Make forms keyboard-aware.
- Support browser and mobile back navigation.
- Use short, useful product copy.
- Show loading, empty, error and success states.
- Make every visible action functional.
- Use fictional data consistently.


6. DESIGN DON’TS

- No neon colours.
- No dark hacker interface.
- No circuit-board backgrounds.
- No purple-blue gradients.
- No glassmorphism.
- No glowing buttons.
- No cryptocurrency illustrations.
- No stock images of hooded people.
- No giant shield or padlock graphics.
- No excessive pills and badges.
- No decorative charts or fake analytics.
- No fake trust certifications.
- No testimonial sections.
- No excessive rounded cards.
- No unlabelled icon-only controls.
- No hover-only functionality.
- No automatic guilt or corruption verdicts.
- No evidence files shown as stored on blockchain.
- No reporter identity fields in staff dashboards.


7. TYPOGRAPHY

Use Inter throughout.

Weights:

- 400 for body text.
- 500 for labels and navigation.
- 600 for headings and primary actions.

Sizes:

- Mobile page title: 28–30px.
- Desktop page title: 32–36px.
- Section title: 20–22px.
- Body and form text: 16px.
- Supporting text: 14px.
- Small status label: 12px.

Use monospace only for:

- Complaint references.
- Blockchain commitments.
- Transaction hashes.
- Technical evidence hashes.


8. RESPONSIVE DESIGN

Create frames for:

- Mobile: 390px.
- Narrow mobile: 360px.
- Tablet: 834px.
- Desktop: 1440px.

Mobile requirements:

- No horizontal overflow.
- Sticky primary action above the safe area.
- Keyboard-aware forms.
- Tables become cards.
- Sidebars become bottom navigation or drawers.
- Long hashes truncate with Copy and Expand actions.

Desktop requirements:

- Reporter forms: 680–760px maximum width.
- Staff application: neutral sidebar and content workspace.
- Use tables for case queues.
- Use breadcrumbs inside case details.
- Preserve filters when returning to the case list.


9. ROUTES

PUBLIC ROUTES

/
 /safety
 /report/details
 /report/risk
 /report/evidence
 /report/identity-protection
 /report/review
 /report/submitting
 /report/receipt
 /track
 /track/status
 /verify

STAFF ROUTES

/staff/sign-in
/staff/dashboard
/staff/cases
/staff/cases/:caseId
/staff/cases/:caseId/evidence
/staff/cases/:caseId/access
/staff/cases/:caseId/updates
/staff/cases/:caseId/audit
/staff/privacy-queue
/staff/access-requests
/staff/protection-queue
/staff/account

UTILITY ROUTES

/demo
/not-found

For Expo Router, map dynamic routes using:

[caseId]

Never put the following in URLs:

- Tracking secrets.
- Evidence content.
- Complaint descriptions.
- Encryption keys.
- Reporter information.


10. MOBILE NAVIGATION

PUBLIC NAVIGATION

Bottom tabs:

- Home
- Track
- Verify

Hide bottom tabs during report submission.

REPORT WIZARD

Show:

- Back action.
- Current step.
- Compact progress bar.
- Page title.
- Sticky Continue button.

Steps:

Details
→ Risk
→ Evidence
→ Identity Protection
→ Review
→ Receipt

STAFF NAVIGATION

Adapt navigation to the current role.

Privacy & Evidence Officer:

- Privacy Queue
- Access Reviews
- Account

Anti-Corruption Investigator:

- Cases
- Access Requests
- Account

Oversight & Protection Officer:

- Protection Queue
- Approvals
- Audit
- Account


11. SHARED SESSION DEMO STATE

Create one global reactive in-memory store.

Store:

- Complaints.
- Evidence records.
- Protected evidence copies.
- Sealed originals.
- Identity-protection findings.
- Blockchain receipts.
- Tracking credentials.
- Investigation statuses.
- Reporter-visible updates.
- Internal notes.
- Evidence-access requests.
- Approval decisions.
- Audit events.
- Current demo role.

All roles must use this same store.

Required actions:

submitComplaint()
addEvidence()
protectEvidence()
createReceipt()
releaseProtectedEvidence()
updateCaseStatus()
addReporterUpdate()
addInternalNote()
requestOriginalAccess()
approvePrivacyReview()
approveOversightReview()
revokeOriginalAccess()
verifyEvidence()
switchDemoRole()
resetDemo()

State must survive:

- Route changes.
- Back navigation.
- Role switching.
- Mobile and desktop layout changes.

Refresh resets the application to its seeded demo state.

Show in the demo toolbar:

“Demo session — changes remain until refresh.”


12. DEMO ROLE SWITCHER

Provide these roles:

REPORTER

No name or identity profile.

PRIYA NAIR

Role:
Privacy & Evidence Officer

ARJUN MEHTA

Role:
Anti-Corruption Investigator

MEERA RAO

Role:
Oversight & Whistleblower Protection Officer

Desktop:

Show a compact “Switch demo role” control in the header.

Mobile:

Show a “Demo role” button opening a bottom sheet.

Switching roles must preserve all current complaints, evidence,
status updates, approvals and audit events.

Clearly label this control:

“Demo role switcher”


13. ROLE PERMISSIONS

REPORTER

Can:

- Create a complaint.
- Add evidence.
- Review possible identity clues.
- Create protected evidence copies.
- Submit without registration.
- Receive private tracking credentials.
- Track safe progress updates.
- Verify evidence integrity.


PRIVACY & EVIDENCE OFFICER

Can:

- Review identity-protection results.
- Release protected copies.
- Hold evidence for further review.
- Review sealed-original access requests.
- Approve privacy scope.
- Request clarification.
- Revoke evidence access.

Cannot:

- Change investigation status.
- Close the case.
- Read reporter tracking secrets.


ANTI-CORRUPTION INVESTIGATOR

Can:

- View assigned complaints.
- View released protected evidence.
- Add internal investigation notes.
- Send safe updates to the reporter.
- Change investigation status.
- Record preliminary findings.
- Request a specific sealed original.

Cannot:

- Approve their own request.
- View unreleased evidence.
- View reporter tracking secrets.
- Approve case closure.


OVERSIGHT & WHISTLEBLOWER PROTECTION OFFICER

Can:

- Review retaliation and public-safety risks.
- Approve exceptional sealed-original access.
- Reject or revoke access.
- Review complete audit events.
- Review investigation findings.
- Approve formal escalation.
- Approve closure or reopen a case.


14. HOME SCREEN

Headline:

“Speak safely. Let the evidence be heard.”

Supporting text:

“Report government corruption without creating an identity profile.”

Primary action:

“Submit a protected report”

Secondary actions:

- Track my report
- Verify evidence receipt

Privacy statement:

“No name, email, phone number, employee ID, identity document or
crypto wallet required.”

Show three concise principles:

IDENTITY-FIRST SUBMISSION

“No reporter identity profile is created.”

PROTECTED EVIDENCE

“Potential identity clues are reviewed before investigator access.”

VERIFIABLE INTEGRITY

“Blockchain proof detects evidence replacement or alteration.”


15. REPORT DETAILS

Fields:

- Report title.
- Category.
- Government department or project.
- Incident date or period.
- Location, optional.
- Detailed description.
- People or organizations involved, optional.

Categories:

- Bribery and kickbacks.
- Public procurement fraud.
- Misuse of public funds.
- Falsification of government records.
- Abuse of official authority.
- Public-safety corruption.
- Retaliation or threats.
- Other.

Validation:

- Title: 10–120 characters.
- Description: 50–5000 characters.
- Category required.
- Future incident dates rejected.
- Focus first invalid field.
- Preserve valid fields.

Add:

“Use government corruption demo”


16. RISK AND URGENCY

Ask:

“Is anyone currently at risk?”

Options:

- No immediate risk.
- Workplace retaliation.
- Job termination or forced transfer threat.
- Physical threat received.
- Family threat received.
- Immediate public-safety danger.

Allow multiple selections.

For the demo case, select:

- Physical threat received.
- Family threat received.
- Immediate public-safety danger.

Generate:

Priority:
Critical

Protection status:
Immediate review required

Place the complaint at the top of the Oversight Officer’s queue.


17. SUPPORTED EVIDENCE

Support:

- PDF
- PNG
- JPG
- JPEG
- MP3
- MP4
- HTTPS reference links

Prototype limits:

- Maximum 10 files.
- PDF: 15 MB.
- Images: 10 MB each.
- MP3: 25 MB.
- MP4: 100 MB.
- Maximum 10 links.

Provide:

- Upload evidence
- Add reference link
- Add complete demo evidence set

Allow reports without evidence.

Display:

“No evidence attached. Your written report can still be submitted.”


18. FILE VALIDATION

Each evidence item must pass through:

- Extension validation.
- MIME-type validation.
- File-signature validation.
- Size validation.
- Filename replacement.
- Demo malware scan.
- Encryption preparation.

Show statuses:

- Selected.
- Validating.
- Ready for protection.
- Unsupported.
- Quarantined.
- Failed.

Add one rejected demo example:

Filename:
Bridge_Report.exe

Status:
“Rejected — unsupported file type”

Label malware scanning as simulated in the Figma prototype.


19. REFERENCE LINKS

Link form:

- HTTPS URL.
- Short title.
- What the reference supports.
- Date accessed, optional.

Remove common tracking parameters from the stored reference.

Do not automatically open or fetch submitted links.

Display links as evidence references.

Fictional example:

Title:
Original Government Tender Notice

URL:
https://demo.gov.example/tenders/riverfront-bridge-2026

Purpose:
“Shows the original ₹18 crore project value and approved material
specifications.”

Mark fictional URLs as non-functional.


20. GOVERNMENT CORRUPTION DEMO

CASE TITLE

Suspected ₹18 Crore Public Bridge Construction Scam

CATEGORY

Government Corruption and Public Procurement Fraud

PROJECT

Riverfront District Bridge Rehabilitation Project

DEPARTMENT

State Public Works Department — Fictional Demo Authority

DESCRIPTION

“I am submitting evidence concerning suspected corruption in the
Riverfront District Bridge Rehabilitation Project.

The approved specification requires Fe500D structural steel, but site
photographs and delivery records indicate that lower-grade steel may
have been used.

Several concrete-quality test reports appear to have been modified.
Some inspection certificates were signed before the recorded
inspection dates.

Invoices worth approximately ₹18 crore were submitted for materials
and rehabilitation work. Site records suggest that some materials
were never delivered and part of the billed work remains incomplete.

An audio recording appears to capture a project official asking the
contractor for a personal payment before approving a pending bill.

After I questioned these records internally, I received a threatening
message instructing me to stop reviewing the project.”

Mark the complete case:

“Fictional demonstration case”

Present every allegation as unverified until investigated.


21. DEMO EVIDENCE

Use four primary demo items.

ITEM 1

Filename:
Bridge_Tender_Specifications.pdf

Purpose:
Shows the approved steel grade, concrete standards and project cost.

Possible identity clues:

- Document author.
- Organization username.
- Internal file path.
- Editing-history username.


ITEM 2

Filename:
Steel_Grade_Site_Photo.jpg

Purpose:
Shows a steel marking that differs from the approved specification.

Possible identity clues:

- GPS coordinates.
- Camera model.
- Exact capture time.
- One face.
- Employee badge.


ITEM 3

Filename:
Payment_Discussion.mp3

Purpose:
Contains a fictional conversation about an alleged payment before
bill approval.

Possible identity clues:

- Recorder model.
- Account identifier.
- Exact recording time.
- Two speakers.
- One spoken employee name.


ITEM 4

Title:
Government Tender Notice

Type:
HTTPS reference link

Purpose:
Shows the fictional approved project specifications and contract value.

Keep MP4 support visible in the upload interface.

Add an optional bundled MP4 fixture:

Material_Removal_From_Site.mp4

Do not make processing the video necessary for the main demonstration.


22. IDENTITY PROTECTION LOGIC

The platform must never claim that it automatically knows which
name, face or voice belongs to the reporter.

Privacy Guardian detects:

“Potential identity clues”

It then asks the reporter to confirm what should be protected.

Automatically protect hidden metadata:

- GPS coordinates.
- Device and camera model.
- PDF author.
- Document username.
- Internal file path.
- Editing history.
- Original filename.
- Audio/video container metadata.
- Tracking parameters in URLs.

For visible or spoken information, show reporter confirmation.


23. IDENTITY REVIEW SCREEN

Display findings grouped by evidence item.

Example:

Steel_Grade_Site_Photo.jpg

Hidden metadata:

✓ GPS coordinates — automatically selected
✓ Camera model — automatically selected
✓ Exact capture time — automatically selected

Visible findings:

□ Face 1
□ Employee badge
□ Vehicle registration

Payment_Discussion.mp3

Audio findings:

□ Speaker 1
□ Speaker 2
□ Spoken name: “Ravi Verma”
□ Employee number: “PWD-4721”

Actions:

- Protect all identity clues.
- Review individually.
- Preview protected copy.
- Restore selection.
- Continue.

For faces:

“Select any face connected to your identity.”

For voices:

“Select the voice that should be protected.”

For text:

“Select names, IDs or details connected to you.”

Allow manual additions:

- Draw a redaction area.
- Select text.
- Mark a face.
- Select a speaker.
- Add a sensitive timestamp range.

Never display:

“Reporter’s face detected”
“Reporter’s name detected”
“Reporter’s voice detected”

Use:

“Potential face detected”
“Potential personal name detected”
“Speaker confirmation required”


24. PROTECTION MODES

Provide:

PROTECT MY IDENTITY

Reporter selects personal details connected to them.

PROTECT ALL IDENTITIES

Protect all detected names, faces, voices and identifiers.

REVIEW INDIVIDUALLY

Reporter decides finding by finding.

Make “Protect All Identities” the recommended action for the
high-risk demo case.


25. PROTECTED COPY AND SEALED ORIGINAL

After confirmation, create two records.

PROTECTED INVESTIGATOR COPY

Contains:

- Identity-related metadata removed.
- Reporter-selected content protected.
- Safe evidence content preserved.
- Separate protected-copy hash.

SEALED ORIGINAL

Contains:

- Exact original uploaded bytes.
- No modifications.
- Encrypted immediately.
- Separate original hash.
- Access locked by default.

Use the explanation:

“The original preserves every byte for authenticity. The protected
copy preserves the evidence while concealing selected identity clues.”

Do not say that information is removed from the sealed original.


26. PROTECTION RESULTS

Show:

“Identity protection completed”

Example:

- 4 evidence records processed.
- GPS coordinates removed.
- Device model removed.
- PDF author removed.
- Internal file path removed.
- Reporter-selected face protected.
- Reporter-selected voice marked for protection.
- Four encrypted originals sealed.
- Protected investigator copies created.

For advanced media processing, display:

“Demo protection preview”

Do not claim arbitrary audio or video has been fully transformed if
the prototype uses bundled fixtures.


27. SECURE SUBMISSION

Show stages:

- Validating complaint.
- Preparing protected copies.
- Encrypting sealed originals.
- Uploading encrypted evidence.
- Creating evidence commitments.
- Recording blockchain proof.
- Issuing private receipt.

Prevent duplicate submissions.

If blockchain proof is delayed:

- Accept the complaint.
- Set proof to Pending.
- Allow proof retry.
- Do not create another complaint.


28. WEB3 ARCHITECTURE

Evidence files are not stored on blockchain.

Store:

SUPABASE PRIVATE STORAGE

- Encrypted sealed originals.
- Encrypted protected copies.

SUPABASE POSTGRESQL

- Complaint workflow.
- Statuses.
- Role assignments.
- Access requests.
- Audit records.
- Reporter-safe updates.

POLYGON AMOY

- Salted evidence commitment.
- Block timestamp.
- Proof version.
- Batch or reference ID.

Use:

commitment =
SHA-256(
  domainSeparator
  + randomSalt
  + originalFileHash
  + protectedCopyHash
  + caseNonce
)

Never put on blockchain:

- Evidence file.
- Complaint description.
- Original filename.
- Category.
- Location.
- Reporter identity.
- Tracking secret.
- Encryption key.
- Plain file hash.


29. WALLETLESS BLOCKCHAIN EXPERIENCE

The reporter must never connect a wallet.

Flow:

1. App hashes and encrypts the evidence.
2. Backend creates the salted commitment.
3. Backend relayer sends the Polygon transaction.
4. Relayer pays the testnet gas.
5. Reporter receives the blockchain receipt.

Show:

- Network: Polygon Amoy.
- Proof status.
- Transaction hash.
- Contract address.
- Evidence commitment.
- Block timestamp.
- Copy actions.
- Technical details expansion.

Use the explanation:

“The evidence stays encrypted in private storage. Polygon stores only
its tamper-evident fingerprint.”


30. PRIVATE RECEIPT

Display:

- Complaint reference.
- Separate tracking secret.
- Submission time.
- Evidence count.
- Protection status.
- Blockchain proof status.
- Transaction reference.
- Download receipt.
- Copy tracking secret.
- Track complaint.

Explain:

“Keep your tracking secret private. It is required to access updates.”

The complaint reference alone must not provide tracking access.

Do not put report contents or identity information in the receipt.


31. RECEIVING AUTHORITY

Use a fictional authority:

“Independent State Anti-Corruption Unit”

Show:

Routing status:
“Preliminary jurisdiction confirmed”

Do not claim integration with CVC, CBI, police or a real Lokayukta.


32. PRIVACY OFFICER WORKFLOW

New complaints appear in the Privacy Queue immediately.

Show:

- Complaint reference.
- Risk priority.
- Evidence count.
- Protection findings.
- Protected-copy status.
- Sealed-original status.
- Blockchain-proof status.

Actions:

- Release protected copies.
- Hold for review.
- Request additional protection.
- Reject unsupported evidence.

After release, the investigator dashboard updates immediately.


33. INVESTIGATOR WORKFLOW

The newly submitted complaint must appear immediately.

Case sections:

- Overview.
- Allegations.
- Protected Evidence.
- Findings.
- Status & Updates.
- Internal Notes.
- Original Access.
- Audit Summary.

Preliminary fictional findings:

- Questioned project expenditure: ₹18 crore.
- Steel invoiced: 620 tonnes.
- Steel recorded at site: 410 tonnes.
- Unexplained difference: 210 tonnes.
- Estimated questioned steel value: ₹4.8 crore.
- Payment released: 92%.
- Physical completion: 64%.
- Concrete report modification requires verification.

Use:

“Evidence supports escalation for formal investigation.”

Never use:

“Corruption proven”
“Official found guilty”
“Crime confirmed”


34. STATUS UPDATES

Statuses:

- Received securely.
- Identity protection completed.
- Privacy review.
- Assigned for investigation.
- Under investigation.
- Additional review required.
- Formal escalation recommended.
- Resolution prepared.
- Closed.

Investigator update form:

Field 1:
“Update visible to reporter”

Field 2:
“Internal investigation note”

Example public update:

“Your evidence has been assigned for formal review. Project payment
and construction records are being examined.”

Example internal note:

“Invoice quantities differ from site records. Approval history and
contractor payment records requested.”

Internal notes must never appear in reporter tracking.


35. ORIGINAL-EVIDENCE ACCESS

Routine investigators receive only protected copies.

If the original is required, the investigator must provide:

- Specific evidence file.
- Investigation purpose.
- Reason the protected copy is insufficient.
- Requested access duration.

Example request:

Evidence:
Payment_Discussion.mp3

Purpose:
“Compare the original timestamp with the pending-bill approval and
contractor meeting timeline.”

Reason:
“The protected audio preserves the conversation, but the original
timestamp is required for timeline verification.”

The investigator cannot approve their own request.


36. CONTROLLED EVIDENCE VAULT

Approval workflow:

1. Investigator requests one sealed original.
2. Privacy Officer reviews identity-exposure risk.
3. Oversight Officer reviews necessity.
4. Both approve the specified purpose.
5. Access applies only to the selected file.
6. Export and download remain disabled.
7. Ending or revoking access closes the viewer.
8. Every action creates an audit event.

Statuses:

- Sealed.
- Privacy review pending.
- Oversight review pending.
- Clarification required.
- Access approved.
- Access revoked.
- Access completed.

Do not make a live countdown necessary for the main demo.

Display:

“Purpose-limited demo access active”

Provide:

“End access”


37. OVERSIGHT WORKFLOW

Show queues for:

- Critical retaliation reports.
- Public-safety danger.
- Original-access approval.
- Formal escalation recommendations.
- Closure recommendations.

Allow:

- Approve original access.
- Reject request.
- Request clarification.
- Revoke access.
- Approve formal escalation.
- Return case to investigator.
- Approve closure.
- Reopen case.


38. REPORTER TRACKING

Require:

- Complaint reference.
- Private tracking secret.

Never include the tracking secret in the URL.

Show:

- Current status.
- Last updated time.
- Evidence protection status.
- Blockchain proof status.
- Ordered safe timeline.
- Latest reporter-visible update.

Example timeline:

- Report received securely.
- Identity protection completed.
- Evidence secured.
- Assigned for investigation.
- Financial and construction records under review.
- Public-safety concerns escalated.
- Formal investigation recommended.

Do not show:

- Staff names.
- Internal notes.
- Original-access requests.
- Exact access times.
- Evidence previews.
- Approval discussions.

Add:

“Check for updates”

When unchanged:

“You are viewing the latest update.”


39. BLOCKCHAIN VERIFICATION

Create a Verify screen with:

MATCHING DEMO EVIDENCE

Result:

“Integrity verified”

Explanation:

“This evidence matches the commitment recorded at submission.”

MODIFIED DEMO EVIDENCE

Result:

“Integrity mismatch”

Explanation:

“This file differs from the version committed at submission.”

PENDING PROOF

Result:

“Blockchain confirmation pending”

Explanation:

“The complaint is accepted. Integrity proof is awaiting confirmation.”

Add:

“A successful match verifies integrity, not the truth of an allegation.”


40. AUDIT TRAIL

Authorized staff can view:

- Complaint submitted.
- Evidence validated.
- Identity protection completed.
- Original encrypted.
- Protected copy released.
- Blockchain commitment recorded.
- Investigator assigned.
- Status updated.
- Original access requested.
- Privacy approval recorded.
- Oversight approval recorded.
- Evidence opened.
- Access ended or revoked.
- Formal escalation recommended.
- Case closed.

Each event includes:

- Role.
- Action.
- Evidence scope.
- Purpose where relevant.
- Time.
- Result.

Do not include:

- Reporter identity.
- Tracking secret.
- Evidence plaintext.
- Encryption keys.


41. SEEDED CASES

Start the demo with three fictional cases.

CASE 1

Title:
Municipal road-contract billing irregularity

Status:
Privacy review

CASE 2

Title:
Government hospital equipment procurement concern

Status:
Under investigation

CASE 3

Title:
Public housing allocation manipulation

Status:
Closed

A newly submitted bridge-corruption case should appear above them.

Reset restores the original three cases.


42. LOADING, ERROR AND EMPTY STATES

Include:

- Empty evidence list.
- Unsupported file.
- Oversized file.
- Failed validation.
- Quarantined file.
- Identity scan failed.
- Blockchain proof pending.
- Blockchain proof failed.
- Invalid tracking credentials.
- Case not found.
- Unauthorized role.
- Empty approval queue.
- Network retry.
- Session reset.
- Protected evidence unavailable.

All failures must offer a clear recovery action.


43. ACCESSIBILITY

- Minimum 4.5:1 text contrast.
- Visible keyboard focus.
- Accessible labels.
- Logical tab order.
- Error announcements.
- Status announcements.
- No colour-only status meaning.
- Reduced-motion support.
- No essential gesture-only actions.
- Dialog focus management.
- Minimum 48px touch targets.


44. PRIMARY JUDGE DEMO

Make this sequence completely functional:

1. Open Reporter view.
2. Select “Use government corruption demo”.
3. Review the bridge-corruption allegation.
4. Select physical threat and public-safety risk.
5. Add the complete demo evidence set.
6. Show PDF, JPG, MP3 and link support.
7. Run Identity Protection.
8. Show automatically selected hidden metadata.
9. Show face, voice and text findings requiring reporter confirmation.
10. Select “Protect All Identities”.
11. Preview the protected copy.
12. Show encrypted sealed originals.
13. Submit without account or wallet.
14. Show the Polygon blockchain receipt.
15. Copy the private tracking secret.
16. Switch to Privacy & Evidence Officer.
17. Confirm the new complaint appears immediately.
18. Release the protected copies.
19. Switch to Anti-Corruption Investigator.
20. Open the same complaint.
21. Review protected evidence.
22. Change status to Under investigation.
23. Add one public update and one internal note.
24. Return to Reporter.
25. Track using the private credentials.
26. Confirm the public update appears.
27. Confirm the internal note remains hidden.
28. Verify matching demo evidence.
29. Verify modified demo evidence and show Mismatch.

OPTIONAL JUDGE FLOW

30. Investigator requests one sealed MP3 original.
31. Privacy Officer approves privacy scope.
32. Oversight Officer approves necessity.
33. Investigator opens the purpose-limited demo access.
34. Audit trail records every action.


45. REAL AND SIMULATED FEATURES

Treat as functional prototype behaviour:

- Report submission.
- Shared state.
- Role synchronization.
- Status updates.
- Reporter tracking.
- File selection.
- Evidence records.
- Approval workflow.
- Audit events.
- Receipt generation.
- Match and mismatch verification flow.

Clearly identify controlled demo processing for:

- PDF metadata rewriting.
- Voice transformation.
- Face blurring.
- MP4 redaction.
- Malware scanning.
- Blockchain confirmation if no live integration exists.

Do not claim an operation is live unless it is actually connected.


46. FINAL ACCEPTANCE CHECKS

Confirm:

- Every route exists.
- Navigation works on mobile and web.
- Back navigation preserves the report.
- Forms remain usable with the keyboard open.
- New complaints appear across staff roles.
- Role switching preserves state.
- Refresh resets the demo.
- Duplicate submission creates only one complaint.
- Protected copies and sealed originals remain separate.
- The platform never claims to know which clue belongs to the reporter.
- Reporter confirmation controls visible-content protection.
- Investigator cannot approve their own request.
- One-file approval does not unlock other files.
- Internal notes never appear in reporter tracking.
- Tracking secrets never appear in URLs.
- Evidence is never displayed as stored on blockchain.
- Polygon stores only the evidence commitment.
- Modified evidence fails verification.
- No horizontal overflow exists at 360px.
- Every visible control has working behaviour.
- All fictional content is clearly labelled.


47. FINAL DELIVERABLE

Produce:

1. Complete responsive prototype.
2. Connected reporter and staff workflows.
3. Reusable design system.
4. Mobile and desktop navigation.
5. Shared in-memory demo state.
6. Role-based permissions.
7. Full route map.
8. Expo Router handoff.
9. Component inventory.
10. Implemented-versus-simulated feature list.
11. Acceptance walkthrough results.

Do not stop after generating the landing page.

Do not create static role screens.

Build the complete synchronized VeilProof demonstration.