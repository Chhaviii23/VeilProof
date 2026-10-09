Build a complete, responsive, interactive frontend prototype for
VeilProof, a whistleblower reporting and evidence-management platform.

Read the entire specification before generating.

Design this as a considered professional product: bright, minimal,
discreet, accessible and practical. The visual identity must feel
deliberate across every screen.

Complete both reporter and investigator journeys.
Do not stop at a landing page or disconnected mockups.


1. PRODUCT AND IMPLEMENTATION CONTEXT

VeilProof helps people:
- Submit reports without creating an account.
- Review potentially identifying evidence metadata.
- Receive a proof receipt.
- Track reports using private credentials.

Investigators have a separate authenticated workspace:
- Review assigned cases.
- Request evidence access.
- Require two distinct approvals before opening evidence.
- Review an access audit trail.

The eventual application must use:
- React Native
- Expo with Expo Go compatibility
- TypeScript
- Expo Router
- React Native StyleSheet and shared design tokens
- Expo web for browser support

Figma’s deliverable is the interactive frontend prototype.
If generating React web code, do not claim it runs directly in Expo Go.
Provide an explicit Expo Router route mapping for later implementation.

Keep layouts practical to reproduce with native components.
Do not make essential functionality depend on hover, browser-specific
effects or custom native modules.

Build an interchangeable mock-service layer.
No real backend, blockchain connection or sensitive evidence upload
is required in this phase.

Display “Demo — fictional data” consistently.
Clearly identify simulated security operations.


2. CREATIVE DIRECTION

The application should resemble a thoughtfully designed digital
public-interest service with the precision of professional software.

Desired qualities:
- Bright and spacious.
- Quietly confident.
- Human and approachable.
- Precise and orderly.
- Comfortable for lengthy reading and sensitive reporting.

Create visual interest through typography, proportion, alignment,
spacing and information hierarchy.

Avoid exaggerated cybersecurity or cryptocurrency aesthetics.
Avoid generic SaaS dashboard decoration.

Use clear headings and generous margins.
Prefer a few well-organized surfaces over many floating cards.
Use plain-language microcopy.


3. COLOUR SYSTEM: PAPER, INK AND EMBER

Create named colour variables and use them consistently.

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
Subtle divider: #E3E1DA
Input border: #8B8C84
Strong neutral: #3E4039

BRAND ACCENT
Accent: #B94725
Accent pressed: #96381E
Accent soft background: #FBEDE7

FOCUS
Focus outline: #252622
Use a visible offset or contrasting gap.

SEMANTIC COLOURS
Success text/icon: #326047
Success background: #EDF4EE

Warning text/icon: #805D16
Warning background: #FBF4E3

Error text/icon: #A12C3A
Error background: #FBEFF1

Informational text/icon: #465D70
Informational background: #EFF3F6

Disabled background: #ECEAE4
Disabled text: #73746D

COLOUR APPLICATION RULES
- Keep roughly 90% of the interface neutral.
- Use ember sparingly for the primary action and active progress.
- Give each main content region one clearly dominant action.
- Primary buttons: ember background, white text.
- Secondary buttons: white background, dark text, neutral border.
- Tertiary actions: dark text with clear hover/focus treatment.
- Links within paragraphs must be underlined.
- Selected navigation: pale neutral background, dark text and
  a small ember indicator.
- Do not fill the sidebar with the accent colour.
- Do not colour every heading, icon or card.
- Reserve semantic colours for their actual meanings.
- Success green is a small status treatment, never the brand theme.
- Error styling must include an icon and explicit error text so it
  cannot be confused with the orange primary action.
- Use disabled appearance only with genuinely disabled behavior.

Verify contrast in actual component combinations:
- Normal text: at least 4.5:1.
- Large text and meaningful UI boundaries: at least 3:1.
- Subtle decorative dividers may be lighter.
- Do not rely on a faint border as an input’s only visible boundary.

Adjust a token if necessary to satisfy contrast while preserving
the intended palette.


4. TYPOGRAPHY AND SPACING

Use one sans-serif family: Inter.
Plan for locally bundled fonts in the Expo app.

Weights:
- Regular 400: body copy.
- Medium 500: labels and navigation.
- Semibold 600: headings and primary actions.

Avoid excessive bold text.

Suggested type scale:
- Mobile page title: 28–30px.
- Desktop page title: 32–36px.
- Section title: 20–22px.
- Body and input text: 16px.
- Supporting text: 14px.
- Small labels: 12px, used sparingly.

Use comfortable line spacing.
Keep paragraphs short and readable.
Use tabular numerals for dates and counts.
Use monospace only for references, hashes and technical identifiers.

Spacing scale:
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64

Use:
- Mobile horizontal padding: 20px.
- Desktop content padding: 32–48px.
- Card padding: 20–24px.
- Clear separation between sections.

Keep report forms approximately 680–760px wide on desktop.


5. COMPONENT APPEARANCE

Buttons:
- At least 48px high for main touch actions.
- Approximately 8px corner radius.
- Clear default, pressed, focused, disabled and loading states.
- No gradients or decorative glow.

Inputs:
- Persistent labels above the field.
- White background.
- Clearly visible neutral boundary.
- At least 48px high.
- Helper text below.
- Errors near the affected field.
- Placeholder text must not replace labels.

Cards:
- White surfaces.
- Approximately 12px corner radius.
- Thin borders where grouping is necessary.
- Mostly shadow-free.

Use elevation only for floating elements such as dialogs,
menus and bottom sheets.

Icons:
- One consistent line-icon family.
- Consistent stroke weight.
- Mostly neutral.
- Pair unfamiliar icons with labels.
- No emoji used as product icons.
- No icon inside a coloured square on every card.

Status badges:
- Compact and readable.
- Text plus optional icon.
- Restrained semantic backgrounds.
- No glowing dots.

Logo:
Use a simple VeilProof wordmark.
An optional small geometric mark is acceptable.
Avoid hooded figures, large shields, padlocks and blockchain cubes.


6. DESIGN DO’S AND DON’TS

DO
- Let white space provide brightness.
- Use alignment and typography to establish hierarchy.
- Repeat spacing, colour and component rules consistently.
- Show the most important action clearly.
- Use real, concise product copy.
- Include useful empty, loading and failure states.
- Keep sensitive workflows calm and understandable.
- Design forms for mobile keyboards.
- Make long identifiers readable without breaking layouts.
- Explain what a status actually means.
- Use borders and spacing before adding shadows.
- Keep technical details in expandable sections.
- Use fictional examples that fit the product.
- Maintain accessible contrast and visible focus.

DON’T
- Use neon, black dashboards, circuit backgrounds or hacker imagery.
- Use purple-blue gradients or rainbow feature cards.
- Use glassmorphism, blurred decorative blobs or glowing buttons.
- Use giant rounded cards around every section.
- Place the whole interface inside nested cards.
- Colour each category differently without a functional reason.
- Use excessive pills, badges, icons or floating decorations.
- Add decorative charts, fake activity or invented metrics.
- Use stock photos of people in hoodies.
- Add cryptocurrency wallet connections.
- Add testimonials, trust logos or certifications without evidence.
- Use tiny grey text to create a “premium” appearance.
- Use animation to disguise loading or simulate security.
- Describe the prototype as fully anonymous or production-secure.
- Leave clickable-looking controls without behavior.


7. RESPONSIVE NAVIGATION

Design at:
- Mobile: 390px.
- Narrow mobile verification: 360px.
- Tablet: 834px.
- Desktop: 1440px.

MOBILE PUBLIC NAVIGATION
Bottom navigation:
- Home
- Track
- Verify

Provide a discreet investigator sign-in link on Home.
Do not give reporters a Profile tab or require an account.

MOBILE REPORT WIZARD
Hide the public bottom navigation during the wizard.
Show:
- Back action.
- Current step title.
- Compact progress indicator.
- Clearly placed Continue action.

Keep the form scrollable.
Respect safe areas.
Ensure the keyboard does not cover the active field or action.

MOBILE INVESTIGATOR NAVIGATION
Bottom navigation:
- Cases
- Approvals
- Account

Open case details and evidence viewers as stack screens.
Use clearly labelled case sections:
Overview / Approvals / Audit.

WEB PUBLIC NAVIGATION
Compact header:
- VeilProof wordmark.
- Start a report.
- Track.
- Verify.
- Safety.
- Investigator sign in.

WEB REPORT WIZARD
Centered form with a restrained step indicator.
Completed steps can be revisited.
Incomplete future steps remain unavailable.

WEB INVESTIGATOR NAVIGATION
Neutral sidebar:
- Cases
- Approvals
- Account

Header shows page title and current investigator.
Use breadcrumbs inside cases.
Retain list filters and scroll position when returning from a case.

RESPONSIVE BEHAVIOR
- Convert desktop tables into mobile case cards.
- Stack form columns on mobile.
- Collapse desktop sidebars into mobile navigation.
- Keep dialogs within the viewport.
- Allow wrapping or controlled truncation for long identifiers.
- Support touch, keyboard and pointer.
- Avoid horizontal overflow at 360px.
- Use no hover-only essential action.


8. ROUTES

PUBLIC
/
 /safety
 /report/details
 /report/evidence
 /report/privacy
 /report/review
 /report/submitting
 /report/receipt
 /track
 /track/status
 /verify

INVESTIGATOR
 /investigator/sign-in
 /investigator/cases
 /investigator/cases/:caseId
 /investigator/cases/:caseId/approvals
 /investigator/cases/:caseId/evidence/:evidenceId
 /investigator/cases/:caseId/audit
 /investigator/approvals
 /investigator/account

UTILITY
 /demo
 Unmatched route → Not found screen

For Expo Router handoff, map dynamic parameters to:
[caseId]
[evidenceId]

Use shared layouts for public, wizard and investigator experiences.

Never include secrets, report content, file content or authentication
tokens in route parameters or query strings.


9. ROUTING RULES

- Support browser back and forward.
- Preserve report inputs when navigating between wizard steps.
- Send direct wizard links to the earliest incomplete prerequisite.
- Prevent returning to an active submit action after acceptance.
- Do not create duplicate reports on repeated taps or retries.
- Receipt without a completed session shows recovery guidance.
- Tracking status without credentials returns to the tracking form.
- Protected investigator routes require a demo session.
- After sign-in, restore a validated internal destination.
- Unknown case IDs show a helpful not-found state.
- Unauthorized cases show access denied.
- Missing evidence provides a clear route back.
- Sign-out clears investigator access and sensitive screen state.
- No redirect loops.

Frontend guards illustrate navigation only.
Production authorization must be enforced by backend services.


10. REPORTER SCREENS

HOME — /
Headline:
“Speak up. Keep control of your evidence.”

Supporting copy:
“Report a concern without creating an account.”

Primary action:
“Start a report”

Secondary actions:
“Track a report”
“Verify a receipt”

Present three simple feature summaries:
- Review privacy clues.
- Keep a proof receipt.
- Control evidence access.

Use an editorial layout with strong typography.
Avoid a wall of marketing cards.

Include:
“Avoid unnecessary identifying details. No digital service can
guarantee complete anonymity.”

Link to safety guidance.

SAFETY — /safety
Explain:
- Use a device and connection you trust.
- Avoid unnecessary identifying details.
- Faces, names and document content can reveal identity.
- Keep the tracking secret private.
- Use fictional information in this prototype.

REPORT DETAILS — /report/details
Fields:
- Title: required, 10–120 characters.
- Category: required.
- Description: required, 50–5000 characters.
- Incident date or approximate period: optional.
- Location: optional.
- People or organizations involved: optional.

Categories:
Corruption
Financial misconduct
Workplace misconduct
Safety concern
Other

Validate on blur and Continue.
Focus the first invalid field.
Preserve valid entries after errors.
Do not allow future dates for a specific past incident.

Add a clearly labelled “Use fictional example” action.
Use a procurement concern involving Vendor A and Regional Office.

EVIDENCE — /report/evidence
Actions:
“Choose files”
“Add demo evidence”

Prototype limits:
JPEG, PNG and PDF.
Maximum 5 files.
Maximum 10 MB per file.

Show filename, size, type and remove action.
Include invalid-type, oversized-file and selection-failed states.

Reports may continue without attachments.
If no evidence exists, never claim evidence was sanitized or verified.

Actual local selections may display basic file information.
Use bundled fixtures for simulated metadata and evidence workflows.
Do not upload selected files or send their contents to external services.

PRIVACY REVIEW — /report/privacy
Show a clearly labelled simulated scan of demo evidence.

States:
- Scanning.
- Identity clues found.
- Sanitized demo copy ready.
- Unsupported.
- Failed.

Example clues:
GPS field
Device model
Author field

Show a restrained before/after comparison.
Do not use a fake security score or dramatic scanning animation.

Actions:
“Create sanitized demo copy”
“Remove file”
“Back”
“Continue”

Unsupported files require removal or explicit acknowledgement.
Do not mark unsupported files as clean.

Explain:
“The production design keeps an encrypted original and creates
a sanitized working copy for routine review.”

Warn:
“Details inside the content may still identify you.”

Replacing a file invalidates its old scan result.
Unchanged files retain their state.

REVIEW — /report/review
Show report summary, attachments and privacy-review status.
Add Edit links to the corresponding steps.
Display the fictional recipient organization clearly.

Require acknowledgement:
“I understand this is a demo and have used fictional information.”

Primary action:
“Submit demo report”

Disable repeated submission while processing.

SUBMITTING — /report/submitting
Use labelled simulated stages:
Preparing report
Simulating encryption
Simulating upload
Recording demo proof

Separate report acceptance from proof confirmation.
Proof failure must not erase an accepted report.
Retry proof recording against the existing report.

Show recoverable failures with actionable explanations.

RECEIPT — /report/receipt
Headline:
“Demo report received”

Show:
- Case reference.
- Separate private tracking secret.
- Submission time.
- Attachment count.
- Proof status: Pending / Confirmed / Failed.

Actions:
“Save demo receipt”
“Copy tracking secret”
“Track this report”
“Retry proof recording” when appropriate
“Finish and clear session”

Explain that the case reference alone does not grant access.
Warn that the tracking secret cannot be recovered by email.

Ask before clearing an unsaved receipt.
Copy secrets only on an explicit user action.

Download a valid JSON demo receipt in the web prototype.
Describe the native save/share equivalent in the Expo handoff.

Mark all mock commitments and transaction references as fictional.
Do not generate fake explorer links.

TRACK — /track
Require:
Case reference
Tracking secret

Actions:
“View status”
“Load demo receipt”

Use a generic invalid-credentials error.
Do not reveal case existence on failed authentication.

STATUS — /track/status
Show a minimal reporter-facing timeline:
Received
Under review
Investigation ongoing
Closed

Do not expose investigator names, internal notes or evidence.
Include Refresh and Clear tracking session.

Investigation status and evidence approval status are separate.

VERIFY — /verify
Provide built-in:
- Matching demo fixture.
- Modified demo fixture.
- Invalid demo receipt.

States:
Match
Mismatch
Pending proof
Unsupported receipt version
Unable to verify

Never report arbitrary real files as verified.

Explain:
“A match checks evidence integrity. It does not establish whether
the allegation is true.”


11. INVESTIGATOR SCREENS

SIGN-IN — /investigator/sign-in
Provide Investigator A and Investigator B demo accounts.
Label this as demo authentication.
No public investigator registration.

Include validation, sign-in failure and expired-session states.

CASES — /investigator/cases
Display fictional cases with:
Reference
Title
Category
Received date
Investigation status
Approval count

Implement:
Search by reference and title.
Category and status filters.
Newest/oldest sorting.
Clear filters.
Loading, empty, no results and retry states.

Use a restrained desktop table.
Use readable stacked cards on mobile.

CASE OVERVIEW — /investigator/cases/:caseId
Show report summary and evidence cards.
Make locked evidence visually clear without alarming decoration.
Provide links to Approvals and Audit.

Support investigation-status changes through the shared mock service.
Reflect permitted public status updates in reporter tracking.

Do not display a reporter identity profile.

APPROVALS — /investigator/cases/:caseId/approvals
Show:
Required approvals: 2 distinct investigators.
Investigator A decision.
Investigator B decision.
Evidence version and scope.
Current access state.

Actions:
Approve access
Withdraw my approval
Decline request

Rules:
- One approval per investigator.
- Repeated clicks do not increase the count.
- One investigator cannot approve for another.
- Zero or one approval keeps evidence locked.
- Two approvals permit access only to the specified version and scope.
- Sanitized-copy approval does not authorize the original.
- Original evidence needs a separate request.
- Withdrawal blocks future access.
- Declined requests remain locked until a new request is created.
- Decisions create audit events.
- Confirm consequential decisions.

If authorization changes while viewing evidence, close the viewer.
Explain that access changed.
Do not imply previously seen information can be recalled.

EVIDENCE VIEWER
/investigator/cases/:caseId/evidence/:evidenceId

Recheck mock authorization on entry.
Use only fictional bundled evidence.
Default to the sanitized working copy.
Show version and simulated integrity status.

Include loading, denied and unavailable states.
Do not expose the original through an unrestricted toggle.

AUDIT — /investigator/cases/:caseId/audit
Show ordered events:
Report accepted
Proof recorded or pending
Access requested
Approval granted, declined or withdrawn
Evidence opened
Investigation status changed

Each event includes actor, action, scope and time.
Do not expose secrets or evidence content.
Avoid duplicate events.
Label it as a demo audit trail.

APPROVAL QUEUE — /investigator/approvals
Show requests awaiting the current investigator.
Actions update the case and queue together.
Include empty, loading and error states.

ACCOUNT — /investigator/account
Show current fictional investigator and organization.
Provide Sign out and Demo controls.


12. DEMO CONTROLS

Route: /demo

Keep these separate from normal product actions.

Allow:
- Switch demo investigator.
- Load matching or modified evidence fixtures.
- Simulate slow response.
- Simulate submission failure.
- Simulate pending or failed proof.
- Simulate session expiry.
- Reset demo data.

Switching investigators clears the previous account’s open-viewer
authorization but preserves shared demo case data.

Explain that page refresh resets in-memory demo state.
Offer an explicit way to reload fixtures.
Do not silently invent a completed submission after a refresh.


13. STATE AND MOCK SERVICES

Use one shared source of truth.

Typed models:
ReportDraft
EvidenceItem
MetadataFinding
SubmissionReceipt
CaseRecord
AccessRequest
ApprovalDecision
AuditEvent
InvestigatorSession

Service methods:
createReport()
getReceipt()
retryProof()
trackReport()
verifyDemoReceipt()
signIn()
signOut()
listCases()
getCase()
requestAccess()
approveAccess()
withdrawApproval()
declineAccess()
getEvidence()
getAudit()
updateCaseStatus()

Use stable fixture IDs and explicit state transitions.
Use an idempotency identifier for submission and retries.
Handle duplicate taps and stale responses.

Keep draft data, secrets and file references in memory.
Do not persist sensitive data in localStorage, sessionStorage
or IndexedDB.

Do not send telemetry or analytics.
Do not log report bodies, secrets or file contents.


14. REUSABLE COMPONENTS

Create:
AppHeader
PublicNavigation
InvestigatorNavigation
WizardProgress
FormField
SelectField
EvidenceRow
MetadataComparison
StatusBadge
ApprovalPanel
CaseCard
CaseTable
ReceiptPanel
AuditTimeline
EmptyState
ErrorState
LoadingSkeleton
ConfirmationDialog
Toast

Use shared components throughout.
Use realistic copy in every state.
No lorem ipsum or unexplained placeholders.


15. INTERACTION AND ACCESSIBILITY

- Every action must work or explain its disabled state.
- Use clear inline feedback.
- Keep important errors visible until addressed.
- Move focus appropriately after navigation and form errors.
- Provide modal focus management.
- Support keyboard operation on web.
- Label icon-only controls.
- Announce significant status changes.
- Respect reduced motion.
- Use restrained 150–200ms transitions.
- No bouncing cards, celebratory confetti or unnecessary parallax.
- Ensure mobile forms remain usable with the keyboard open.


16. COMPLETION CHECKLIST

Before finishing, verify:

DESIGN
- Neutral surfaces dominate.
- Ember is used selectively.
- No unintended old blue or neon-green brand styling remains.
- Text and input boundaries are readable.
- Spacing and radii are consistent.
- Cards are used only where grouping helps.
- Mobile and desktop feel like the same product.

NAVIGATION
- Every route exists.
- Active navigation is correct.
- Browser back/forward works.
- Wizard prerequisites work.
- Draft values survive step changes.
- Invalid IDs recover gracefully.
- Protected routes respect the demo session.
- Sign-out prevents access through back navigation.

FUNCTIONALITY
- Validation works.
- Evidence replacement resets the affected scan.
- Unsupported evidence is not marked clean.
- Duplicate submission is prevented.
- Proof retry does not create a new report.
- Receipt saving works.
- Tracking requires both credentials.
- One approval cannot unlock evidence.
- Two distinct approvals unlock only the approved scope.
- Approval withdrawal blocks access.
- Search, filters and sorting work.
- All error and empty states are reachable.
- No sensitive data appears in URLs or logs.

RESPONSIVENESS
- No horizontal overflow at 360px.
- Keyboard does not obscure required fields.
- Tables adapt into mobile cards.
- Safe areas are respected.
- Long identifiers do not break layouts.

HONESTY
- Demo data is clearly identified.
- Security simulation is labelled.
- No fake certifications, metrics or blockchain links.
- No real evidence is uploaded.

Deliver the complete connected prototype, design tokens,
component system, route map, Expo implementation handoff,
and a short summary of what works and what remains simulated.

Start with the design foundation, then complete every journey.
Do not stop after generating the first few screens.