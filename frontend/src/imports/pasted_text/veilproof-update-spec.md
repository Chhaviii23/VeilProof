Update the existing VeilProof prototype while preserving its current
bright, minimal design system, responsive layouts, routes and shared
in-memory demo state.

The goal of this update is to make the demonstration more realistic,
meaningful and strongly focused on protecting the reporter’s identity.

All data must remain synchronized across roles until the browser page
is refreshed. Refreshing resets the prototype to its initial demo data.


1. PRODUCT POSITIONING

Present VeilProof as:

“An identity-first whistleblower protection platform that removes
hidden metadata, encrypts evidence and controls investigator access
without requiring the reporter to create an account.”

Primary promise:

“Your evidence can support an investigation without exposing who
submitted it.”

Supporting points:

- No reporter account required.
- No email, phone number or wallet required.
- Evidence is protected before submission.
- Hidden metadata is removed from the investigator copy.
- Original evidence remains sealed.
- Every sensitive access request is reviewed and recorded.
- Reporters receive private tracking credentials.

Remove these lines everywhere:

“No digital service can guarantee complete anonymity.”

“Details inside the content may still identify you.”

“Metadata removal reduces risk but does not sanitize visible content —
names, faces, and distinctive phrases within files.”

Do not display long technical disclaimers in the main user flow.

Replace negative warning-heavy language with clear privacy actions:

“Privacy Guardian prepares a protected investigator copy while the
encrypted original remains sealed.”

“Identity-related metadata was removed before investigator access.”

“Only approved evidence versions are available to investigators.”


2. ROLE-BASED WORKFLOW

Replace Investigator A and Investigator B with meaningful roles.

ROLE 1: REPORTER

The Reporter can:

- Submit a complaint without registration.
- Add evidence.
- Run Privacy Guardian.
- Receive a private tracking secret.
- Track complaint progress.
- Read updates specifically shared with the reporter.
- Verify the evidence receipt.

The Reporter must never appear as a named profile in any staff screen.


ROLE 2: CASE INVESTIGATOR

Display name:
Arjun Mehta

Role:
Case Investigator

The Case Investigator can:

- View assigned complaints.
- Read complaint details.
- View privacy-protected evidence after release.
- Request access to sealed original evidence.
- Explain why original evidence is required.
- Update investigation status.
- Add internal investigation notes.
- Send safe progress updates to the reporter.
- Submit a case closure recommendation.

The Case Investigator cannot:

- Approve their own evidence-access request.
- View reporter tracking secrets.
- Open sealed original evidence without approval.
- View identity-related metadata removed by Privacy Guardian.
- Approve final case closure.


ROLE 3: PRIVACY OFFICER

Display name:
Priya Nair

Role:
Privacy & Evidence Officer

The Privacy Officer can:

- Review Privacy Guardian results.
- Confirm that a protected investigator copy is ready.
- Release the protected copy to the assigned investigator.
- Review requests for original evidence.
- Approve, reject or request clarification.
- View what metadata fields were removed.
- Set the access duration and approved purpose.
- Immediately revoke evidence access.
- Add privacy-review events to the audit trail.

The Privacy Officer cannot:

- Change the investigation status.
- close a complaint.
- Approve a request they created.
- Reveal reporter tracking credentials.


ROLE 4: OVERSIGHT OFFICER

Display name:
Meera Rao

Role:
Oversight & Compliance Officer

The Oversight Officer can:

- Review high-sensitivity original-evidence requests.
- Review the complete access audit.
- Approve or reject exceptional original access.
- Review case-closure recommendations.
- Approve final case closure.
- Reopen a case when required.
- Revoke active evidence access.
- Flag suspicious investigator activity.

The Oversight Officer does not conduct the normal investigation.


3. REPLACE THE OLD DUAL-INVESTIGATOR LOGIC

Remove the workflow where two investigators simply approve the
same evidence.

Rename the feature:

“Controlled Evidence Vault”

Use purpose-based access with separation of responsibilities.

PROTECTED INVESTIGATOR COPY

1. Reporter submits evidence.
2. Privacy Guardian creates a protected demo copy.
3. Encrypted original is placed in the Sealed Original Vault.
4. Privacy Officer reviews the protection result.
5. Privacy Officer releases the protected copy.
6. Assigned Case Investigator can view only that protected copy.

SEALED ORIGINAL EVIDENCE

Original evidence may contain information required for authenticity
or deeper investigation, so it follows a stricter process:

1. Case Investigator selects “Request sealed original”.
2. Investigator must enter:
   - Purpose of access.
   - Evidence required.
   - Reason the protected copy is insufficient.
   - Requested access duration.
3. Privacy Officer reviews the privacy impact.
4. Oversight Officer independently reviews necessity.
5. Access is granted only after both approvals.
6. Access applies only to the requested evidence and purpose.
7. Access automatically expires after the approved duration.
8. Every action appears in the audit trail.

The requester can never approve their own request.

Approval of one file must not unlock every file.

Approval of a protected copy must not unlock the sealed original.

Display:

“2 independent approvals required for sealed original access.”

Approval states:

- No request — Sealed
- Request submitted — Privacy review pending
- Privacy approved — Oversight review pending
- Clarification requested — Action required
- Approved — Time-limited access
- Rejected — Sealed
- Revoked — Access removed
- Expired — Request access again


4. SHARED SESSION-ONLY DEMO STATE

Use one reactive application-level in-memory store for:

- Complaints.
- Evidence records.
- Protected evidence versions.
- Sealed original versions.
- Privacy-review decisions.
- Original-access requests.
- Approval decisions.
- Investigation statuses.
- Reporter-visible updates.
- Internal notes.
- Closure recommendations.
- Audit events.
- Current demo role.
- Receipts and tracking credentials.

All roles must read from and update the same data.

Navigation or role switching must not reset the store.

Refreshing the browser resets the complete demo.

Show inside the demo-role selector:

“Demo session: changes remain until refresh.”

Do not use separate hardcoded datasets for different dashboards.


5. DEMO ROLE SWITCHER

Replace “Investigator A / Investigator B” with:

- Reporter
- Arjun Mehta — Case Investigator
- Priya Nair — Privacy Officer
- Meera Rao — Oversight Officer
- Reset demo

Desktop:
Place a compact “Switch demo role” control in the header.

Mobile:
Place “Demo role” inside a bottom sheet accessible from the header.

Role switching must preserve:

- Submitted complaints.
- Status changes.
- Approvals.
- Reporter updates.
- Evidence access requests.
- Audit records.

Role switching is a presentation tool, so label it clearly as:

“Demo role switcher”

Never display this control as part of real production authentication.


6. REPORTER SUBMISSION FLOW

Use this smooth flow:

Home
→ Report Details
→ Add Evidence
→ Privacy Guardian
→ Review
→ Secure Submission
→ Private Receipt
→ Track Complaint

HOME COPY

Headline:

“Speak safely. Let the evidence be heard.”

Supporting copy:

“Submit protected evidence without creating an account.”

Privacy statement:

“No email, phone number, identity document or crypto wallet required.”

Primary action:

“Submit a protected report”

Secondary actions:

“Track my report”
“Verify evidence receipt”

Show three product promises:

PRIVATE BY DESIGN
“No identity profile is created for the reporter.”

EVIDENCE PROTECTION
“Files are encrypted and hidden metadata is removed before review.”

CONTROLLED ACCESS
“Sensitive evidence remains sealed until independent approval.”


7. PRIVACY GUARDIAN EXPERIENCE

Rename the step:

“Protect Your Evidence”

Supporting copy:

“Privacy Guardian prepares the safest investigator-ready version of
your evidence before submission.”

For demo evidence, show these stages:

- Inspecting evidence.
- Finding identity-related metadata.
- Removing protected fields.
- Encrypting original evidence.
- Creating investigator-safe copy.
- Protection complete.

Use a calm progress experience without dramatic animations.

Show a result card:

“Evidence protection complete”

Example results:

- Location metadata removed.
- Device information removed.
- Author information removed.
- Original evidence encrypted and sealed.
- Protected investigator copy created.

Show two evidence versions:

PROTECTED COPY
“Prepared for investigator review”

SEALED ORIGINAL
“Encrypted and unavailable without independent authorization”

Primary action:

“Continue with protected evidence”

Secondary action:

“Review protection details”

Do not display fear-based warning paragraphs.

Keep technical details inside an expandable section called:

“What Privacy Guardian protected”


8. REPORT SUBMISSION SYNCHRONIZATION

When the Reporter submits a complaint:

- Generate exactly one complaint.
- Generate a complaint reference.
- Generate a separate private tracking secret.
- Set complaint status to “Received securely”.
- Add the complaint to the Case Investigator dashboard immediately.
- Add it to the Privacy Officer evidence-review queue.
- Add an audit event.
- Create a receipt.
- Update all dashboard totals reactively.

The complaint must contain:

- Reporter-safe complaint reference.
- Complaint title and description.
- Category.
- Protected evidence records.
- Sealed original evidence records.
- Privacy-protection results.
- Investigation status.
- Reporter-visible timeline.
- Internal audit timeline.

Repeated taps must never create duplicate complaints.


9. CASE INVESTIGATOR DASHBOARD

Create an assigned-cases dashboard for Arjun Mehta.

Dashboard summary:

- Assigned cases.
- New cases.
- Under investigation.
- Awaiting evidence access.
- Closure recommendations pending.

Do not add decorative analytics.

Each case should show:

- Complaint reference.
- Report title.
- Category.
- Received date.
- Investigation status.
- Evidence availability.
- Last activity.
- Assigned priority.

New reporter submissions must appear at the top immediately.

On a case page, use sections:

- Overview.
- Protected Evidence.
- Status & Updates.
- Internal Notes.
- Access Requests.
- Audit Summary.

The Case Investigator should first see:

“Protected evidence awaiting Privacy Officer release”

After release:

“Protected investigator copy available”

The investigator can then open the protected copy.


10. PRIVACY OFFICER DASHBOARD

Create a specialized Privacy & Evidence dashboard.

Main sections:

- Evidence reviews awaiting action.
- Original-access requests.
- Active evidence access.
- Recently revoked or expired access.

For a new complaint, show:

- Files received.
- Privacy Guardian protection summary.
- Protected-copy status.
- Sealed-original status.
- Metadata fields removed.
- Release decision.

Actions:

- Release protected copy.
- Hold for further privacy review.
- Reject unsupported evidence.
- Review original-access request.
- Request clarification.
- Approve privacy review.
- Revoke access.

Releasing the protected copy should immediately update the
Case Investigator’s view.


11. OVERSIGHT OFFICER DASHBOARD

Create an Oversight & Compliance dashboard.

Main sections:

- Original-access requests awaiting oversight.
- Case-closure recommendations.
- Flagged access activity.
- Recent audit events.

For original-access requests, show:

- Requesting investigator.
- Complaint reference.
- Evidence requested.
- Stated purpose.
- Privacy Officer’s decision.
- Requested duration.
- Complete approval history.

Actions:

- Approve limited access.
- Reject request.
- Request clarification.
- Revoke access.
- Flag for review.

For closure recommendations:

- Review case outcome.
- Review reporter-visible final update.
- Approve closure.
- Return case to investigator.
- Reopen a closed case.


12. INVESTIGATION STATUS FLOW

Use meaningful statuses:

- Received securely.
- Privacy review.
- Assigned for investigation.
- Under investigation.
- Additional review required.
- Resolution prepared.
- Closed.

The Case Investigator can update:

- Assigned for investigation.
- Under investigation.
- Additional review required.
- Resolution prepared.

Only the Oversight Officer can update:

- Closed.
- Reopened.

Every status change must update:

- Case Investigator dashboard.
- Oversight dashboard where relevant.
- Complaint audit trail.
- Reporter tracking timeline.

Internal workflow language must be converted into safe,
easy-to-understand reporter messages.


13. REPORTER-VISIBLE UPDATES

When updating a status, provide two separate fields:

“Update for reporter”

“Internal investigation note”

The reporter update appears in tracking.

The internal note appears only to authorized staff.

Example reporter update:

“Your report has been assigned for investigation. The submitted
evidence is being reviewed through the protected workflow.”

Example internal note:

“Protected invoice copy reviewed. Vendor payment records requested
from the finance department.”

Never show internal notes, staff identities or access-request details
to the Reporter.


14. TRACKING EXPERIENCE

The Reporter tracks using:

- Complaint reference.
- Private tracking secret.

Tracking screen displays:

- Current complaint status.
- Last updated time.
- Evidence protection status.
- Ordered reporter-visible timeline.
- Latest safe update.

Suggested privacy status:

“Reporter identity: Not collected”

Evidence status:

“Protected evidence secured”

Access status:

“Evidence access controlled”

Timeline example:

- Report received securely.
- Evidence protection completed.
- Assigned for investigation.
- Investigator update received.
- Resolution prepared.
- Case closed.

Add:

“Check for updates”

When no change exists, show:

“You are viewing the latest update.”

Never display:

- Privacy Officer name.
- Investigator name.
- Oversight Officer name.
- Internal notes.
- Evidence-access reasons.
- Staff audit details.


15. THREE STRONG JUDGE DEMONSTRATIONS

DEMO 1: LIVE COMPLAINT SYNCHRONIZATION

Provide “Use demo complaint”.

Fill:

Title:
“Suspected duplicate payments to Vendor A”

Category:
“Financial misconduct”

Location:
“Regional Office”

Description:
“Two payment entries appear to reference the same invoice number and
amount for Vendor A. The attached fictional records are submitted for
review.”

The judge can edit this content.

After submission:

- Show the private receipt.
- Switch to Case Investigator.
- Show the exact complaint immediately.
- Preserve the judge’s edits.


DEMO 2: PRIVACY-PROTECTED EVIDENCE

Add fictional evidence:

“Vendor_A_Invoice_Record.pdf”

Privacy Guardian detects:

- Author metadata.
- Device metadata.
- Location metadata.

After protection, show:

“3 identity-related metadata fields removed”

“Protected investigator copy created”

“Original encrypted and sealed”

Switch to Privacy Officer.

Release the protected copy.

Switch to Case Investigator.

Show that the protected copy is now available while the original
remains sealed.


DEMO 3: JUSTIFIED ORIGINAL ACCESS

As Case Investigator:

Request the sealed original with reason:

“Original document properties are required to compare invoice
creation times during authenticity verification.”

Requested duration:

“10 minutes”

Switch to Privacy Officer:

Review the privacy impact and approve.

Switch to Oversight Officer:

Review necessity and approve limited access.

Switch back to Case Investigator:

Display:

“Sealed original access granted”
“Purpose: Authenticity verification”
“Access expires in 10:00”

Show a visible countdown for the demo.

Provide:

“End access now”

Ending, revoking or expiring access must close the viewer and add
an audit event.

This countdown is a demo timer and resets with the page.


16. ADD A COMPLETE AUDIT TRAIL

Authorized staff can view:

- Complaint received.
- Privacy protection completed.
- Protected copy released.
- Investigator assigned.
- Investigation status updated.
- Original access requested.
- Privacy review approved.
- Oversight approval granted.
- Evidence opened.
- Access expired, revoked or ended.
- Closure recommended.
- Closure approved.

Each event should show:

- Role.
- Action.
- Evidence scope when relevant.
- Purpose when relevant.
- Timestamp.
- Result.

Do not include reporter tracking credentials or reporter identity.


17. MOBILE EXPERIENCE

REPORTER MOBILE NAVIGATION

Bottom navigation outside submission:

- Home.
- Track.
- Verify.

Hide bottom navigation during submission.

Provide:

- Back action.
- Step title.
- Progress indicator.
- Sticky primary action above the safe area.
- Keyboard-aware scrolling.

STAFF MOBILE NAVIGATION

Use:

- Work Queue.
- Cases.
- Audit or Approvals depending on role.
- Account.

Adapt navigation by role:

Case Investigator:
Cases / Access Requests / Account

Privacy Officer:
Privacy Queue / Access Reviews / Account

Oversight Officer:
Approvals / Audit / Account

Use stack navigation for case details.

Keep the current complaint open after changing sections or roles
where appropriate.


18. RESPONSIVE WEB EXPERIENCE

Reporter:

- Compact public header.
- Centered submission form.
- Maximum readable width.
- Clear progress indicator.

Staff:

- Role-specific neutral sidebar.
- Page title and role in the header.
- Breadcrumbs inside complaint pages.
- Tables on desktop.
- Cards on mobile.
- Persistent filters when returning from a complaint.

Do not show staff navigation items a role cannot use.


19. SEEDED DEMO DATA

Include these three fictional cases:

CASE 1
Title: Procurement process irregularity
Status: Received securely
Evidence: Privacy review pending

CASE 2
Title: Workplace safety records concern
Status: Under investigation
Evidence: Protected copy released

CASE 3
Title: Expense-record discrepancy
Status: Closed
Evidence: Access expired

Add newly submitted complaints to this shared list.

Reset restores these three cases and their original audit history.


20. ACCEPTANCE WALKTHROUGH

Verify this full demonstration:

1. Open Reporter view.
2. Use the fictional complaint.
3. Edit its title.
4. Add fictional evidence.
5. Run Privacy Guardian.
6. Confirm protected copy and sealed original are created.
7. Submit once.
8. Save the private receipt.
9. Switch to Case Investigator.
10. Confirm the new complaint and edited title appear.
11. Confirm evidence is awaiting privacy release.
12. Switch to Privacy Officer.
13. Release the protected copy.
14. Switch to Case Investigator.
15. Open the protected evidence.
16. Update status to Under investigation.
17. Add a reporter update and separate internal note.
18. Request sealed-original access with a purpose and duration.
19. Switch to Privacy Officer and approve privacy review.
20. Switch to Oversight Officer and approve limited access.
21. Switch to Case Investigator.
22. Open the sealed original and show the expiry timer.
23. Return to Reporter view.
24. Track the complaint using its credentials.
25. Confirm updated status and public update appear.
26. Confirm internal notes and staff identities do not appear.
27. Refresh the page.
28. Confirm new session data is removed and initial fixtures return.

Also verify:

- One person cannot approve their own request.
- Repeated approval does not count twice.
- Each approval applies to one evidence version and purpose.
- Protected-copy approval does not unlock the original.
- Revocation or expiry closes original access.
- Status updates synchronize across dashboards.
- Public and internal updates remain separate.
- Mobile navigation remains smooth for every role.
- No tracking secrets appear in URLs.
- All visible actions work.
- All simulated functions are identified as demo behavior.

Complete the connected functional prototype. Do not create static,
unconnected role screens.