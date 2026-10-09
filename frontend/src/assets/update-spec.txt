Update the existing VeilProof prototype. Preserve its current design
system, colours, screens and responsive layouts.

Make the reporter and investigator journeys operate on the SAME
shared, reactive, in-memory data store.

The demo must work end to end within one browser-page session.
Refreshing the page resets it to the initial fictional demo data.
Switching roles or navigating routes must NOT reset data.

1. SHARED LIVE DEMO STATE

Create one application-level store containing:
- Complaints
- Evidence fixtures
- Investigation statuses
- Public status updates
- Internal investigator notes
- Access requests and approvals
- Audit events
- Current demo investigator
- Reporter draft
- Submission receipts and tracking credentials

Mount the store above all route layouts so route changes do not
recreate it.

All screens must read and update this store.
Do not maintain disconnected reporter and investigator datasets.

Use stable complaint IDs and timestamps.
Do not hardcode dashboard counts or tracking timelines.
Derive them from the shared data.

Keep this state in memory only.
Do not use localStorage, sessionStorage, IndexedDB or a backend.
Do not open a new browser tab when switching roles.

This synchronization is for one open demo page.
Independent tabs/devices are not synchronized.

2. COMPLAINT SUBMISSION → INVESTIGATOR DASHBOARD

When a reporter submits a valid complaint:

- Create exactly one complaint.
- Generate its reference and separate private tracking secret.
- Set investigation status to “Received”.
- Add a reporter-visible “Report received” timeline event.
- Store the report details and linked demo evidence.
- Create its receipt.
- Immediately include the complaint in the investigator case list.
- Update dashboard totals and status counts automatically.
- Sort the new complaint to the top when sorting by newest.

Show the complaint reference consistently on both sides.

Prevent duplicate submission from repeated taps.
A failed proof-recording retry must not create a second complaint.

Once accepted, show the receipt even if demo proof is still pending.

3. INVESTIGATOR UPDATE → REPORTER TRACKING

Use these investigation statuses:
Received → Under review → Investigation ongoing → Closed

In case details, add an “Update status” action containing:
- New status
- Optional reporter-visible update
- Separate optional internal note

Label the two text fields clearly:

“Update visible to reporter”
“Internal note — investigators only”

On Save:
- Update the shared complaint.
- Record its updated timestamp.
- Add an audit event.
- Add the approved public status change to the reporter timeline.
- Update dashboard badges, filters and counts.
- Show a success message.

If the status is unchanged and there is no new public update,
do not create a duplicate timeline event.

Internal notes must never appear in reporter tracking.

When the reporter returns to /track/status, display the latest state.
If that screen remains mounted, update it reactively.

Provide a “Check for updates” action with useful feedback:
“Status is up to date.”

Do not confuse investigation status with evidence-access status.
Two investigator approvals do not automatically advance or close
an investigation.

4. TRACKING FLOW

Require both:
- Complaint reference
- Private tracking secret

After submission, “Track this complaint” opens tracking directly
using the current in-memory receipt context.

Returning later through the Track screen requires the credentials
or an explicitly selected demo receipt.

Use a generic error for invalid credentials.
Never put tracking secrets into URLs.

Tracking displays:
- Complaint reference
- Current investigation status
- Last updated time
- Ordered public update timeline

Do not expose:
- Internal notes
- Investigator identities
- Evidence previews
- Approval discussions

5. SESSION-ONLY ROLE SWITCHING

Add a discreet, clearly labelled demo toolbar.

Desktop:
Compact control in the header.

Mobile:
“Demo controls” button opening a bottom sheet.

Options:
- Reporter view
- Investigator A
- Investigator B
- Reset demo

Role switching is a presentation shortcut, not authentication.
Label it “Demo role switch”.

Changing roles must:
- Preserve all shared complaints, receipts, approvals and updates.
- Preserve the reporter’s current draft.
- Clear the previous investigator’s open evidence viewer.
- Navigate to the selected role’s appropriate screen.
- Never expose tracking secrets in the investigator workspace.

When switching from a receipt to an investigator:
Open the newly submitted complaint when possible.

When returning to Reporter view:
Offer “Track latest demo complaint” if a receipt exists.
Also retain access to the ordinary tracking form.

Show a small note inside demo controls:
“Changes last until this page is refreshed.”

Reset demo requires confirmation.
Refresh or confirmed reset restores only the initial fixtures.

6. ADD THREE JUDGE-FRIENDLY DEMO FEATURES

FEATURE A: ONE-CLICK FICTIONAL COMPLAINT

Add “Use demo example” on the report form.

Fill:
Title: Suspected duplicate payments to Vendor A
Category: Financial misconduct
Location: Regional Office
Description:
“Two payment records appear to reference the same invoice number
and amount for Vendor A. The attached sample records are provided
for review. This is a fictional demonstration.”

Attach a bundled fictional evidence fixture through a separate
“Add demo evidence” action.

For its metadata review, simulate these findings:
- Author field
- Device field
- Location field

Clearly label the scan and sanitized copy as simulated.

Let the judge edit the title or description before submission.
The submitted edits must appear exactly in the investigator case.

FEATURE B: TWO-INVESTIGATOR UNLOCK

For the newly submitted complaint:
- Start with evidence locked.
- Investigator A approves: show 1 of 2, still locked.
- Switch to Investigator B without resetting state.
- Investigator B approves: show 2 of 2, access available.
- Open a fictional sanitized evidence preview.

Repeated approval by the same investigator must not count twice.

Record approvals and evidence opening in the audit timeline.
Keep original-evidence access separate from sanitized-copy access.

Label this as a simulated two-person approval workflow.

FEATURE C: MATCH VS MODIFIED EVIDENCE

On Verify, provide:
- “Check matching demo evidence”
- “Check modified demo evidence”

Matching fixture:
Show “Demo integrity check: match”.

Modified fixture:
Show “Demo integrity check: mismatch”.
Explain: “This example differs from the submitted version.”

Do not modify the stored original fixture when demonstrating mismatch.
Do not claim arbitrary user-selected files have been cryptographically
verified.

Keep this verification demonstration separate from investigation status.

7. REPLACE HOMEPAGE COPY

Remove the visible homepage sentence:
“No digital service can guarantee complete anonymity.”

Replace it with:
“No account, email, phone number or wallet required.”

Supporting copy:
“Share your concern. Keep your tracking secret private.”

Do not replace the removed sentence with unsupported claims such as:
“100% anonymous”
“Completely untraceable”
“Guaranteed anonymity”

Keep practical guidance in the Safety page:
“Avoid identifying details in your report and attachments.
Use a device and connection you trust.”

Retain “Demo — fictional data” and accurate simulation labels.

8. SMOOTH REPORTER FLOW

Use:
Home → Report details → Evidence → Privacy review → Review →
Submit → Receipt → Track

Requirements:
- Keep form values when navigating backward.
- Edit links return to the correct step.
- Returning from an edit preserves the rest of the complaint.
- Replacing a file invalidates only its previous scan.
- Show concise inline validation.
- Focus the first invalid field.
- Preserve entries after recoverable errors.
- Prevent accidental double submission.
- Keep primary actions reachable above the mobile keyboard.
- Confirm before discarding an unsent complaint.
- Do not interrupt ordinary Back navigation with discard dialogs.
- After acceptance, Back must not submit the complaint again.
- Allow reports without attachments and show an appropriate
  no-evidence state.

9. SMOOTH INVESTIGATOR FLOW

Use:
Cases → Case details → Approvals → Evidence → Update status → Cases

Requirements:
- Newly submitted complaints appear immediately.
- Opening a case uses its actual shared ID.
- Keep filters and scroll position on return to the list.
- If an update causes a case to stop matching a filter, explain it
  and offer “Clear filters”.
- Provide clear breadcrumbs on desktop and Back actions on mobile.
- Return from evidence to the same complaint.
- Explain disabled actions, such as “Awaiting second approval”.
- Confirm approvals and status changes.
- Save updates only once.
- Provide a useful empty approvals queue.
- Keep public updates and internal notes visibly separate.

10. INITIAL FICTIONAL DATA

Seed three complaints with different statuses:
- Procurement concern — Received
- Workplace safety concern — Under review
- Expense-record discrepancy — Closed

Label them as sample cases.
Keep their public timelines internally consistent.

New submissions are added alongside these cases.
Reset restores exactly the seeded cases and initial decisions.

11. IMPLEMENTATION RULES

Use typed models and shared actions such as:
submitComplaint()
updateComplaintStatus()
addPublicUpdate()
addInternalNote()
approveEvidenceAccess()
withdrawApproval()
trackComplaint()
switchDemoRole()
resetDemo()

Implement in-memory mock services backed by the same store.
Do not create separate stores inside individual pages.

Keep derived values reactive:
Dashboard counts
Filtered case lists
Approval queues
Case status badges
Public tracking timelines

Ensure role switches, nested routes and layout changes do not
remount and erase the shared store.

No external network request is needed for the core demonstration.
Do not log complaint text or tracking secrets.

12. REQUIRED END-TO-END WALKTHROUGH

Verify this exact sequence:

1. Open Reporter view.
2. Fill the fictional example.
3. Change its title to something new.
4. Add demo evidence and complete the simulated privacy review.
5. Submit once and receive tracking credentials.
6. Switch to Investigator A.
7. Confirm the new complaint and edited title appear immediately.
8. Approve access once; evidence remains locked.
9. Switch to Investigator B and approve.
10. Open the sanitized demo evidence.
11. Change status to “Under review”.
12. Add a public update and a different internal note.
13. Return to Reporter view and track the complaint.
14. Confirm the new status and public update appear.
15. Confirm the internal note does not appear.
16. Demonstrate matching and modified evidence verification.
17. Refresh the page.
18. Confirm the new complaint is gone and initial fixtures return.

Also verify:
- Duplicate taps create only one complaint.
- Invalid tracking credentials reveal no case details.
- One investigator cannot approve twice.
- Mobile role switching preserves all session data.
- No secrets appear in URLs.
- All demo security behavior remains clearly labelled.

Complete the functional updates, then report any walkthrough checks
that could not be verified. Do not claim tests passed without checking.