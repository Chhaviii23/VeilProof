UPDATE THE EXISTING VEILPROOF FUNCTIONAL PROTOTYPE

Implement the following two major updates without redesigning unrelated screens:

1. Introduce the complete Privacy Officer → Anti-Corruption Officer → Oversight Officer workflow.
2. Limit demo evidence to one item per evidence type.

Maintain the existing bright, minimal and premium visual system.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. COMPLETE ROLE-BASED WORKFLOW
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use these staff roles:

1. Privacy & Evidence Officer
2. Anti-Corruption Officer
3. Oversight & Whistleblower Protection Officer

The system must maintain proper separation of duties. No single officer should release protected evidence, investigate the complaint and approve original-evidence access.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. REPORTER SUBMISSION FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Keep this route sequence:

/report/details
/report/risk
/report/evidence
/report/identity-protection
/report/review
/report/submitting
/report/receipt

After submission:

• Encrypt and seal the original evidence.
• Generate protected investigator copies.
• Create a blockchain integrity commitment.
• Send the complaint to the Privacy & Evidence Officer.
• Show the reporter a complaint reference and tracking secret.
• Do not require name, phone number, email, Aadhaar or crypto wallet.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. EVIDENCE UPLOAD LIMIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Allow a maximum of one item per evidence category:

• 1 PDF document
• 1 image: PNG, JPG or JPEG
• 1 MP3 audio recording
• 1 MP4 video
• 1 HTTPS reference link

Treat PNG, JPG and JPEG as one Image category.

Create five individual upload cards.

DOCUMENT

Demo file:
PWD_Payment_and_Inspection_Report.pdf

Purpose:
Shows that project payment was released before required inspection.

IMAGE

Demo file:
Steel_Grade_Site_Photo.jpg

Purpose:
Shows potentially lower-grade steel being used at the bridge site.

AUDIO

Demo file:
Bribe_Discussion_Recording.mp3

Purpose:
Contains an alleged discussion about payment for approving inspection records.

VIDEO

Demo file:
Material_Removal_From_Site.mp4

Purpose:
Shows construction materials being removed from the government project site.

REFERENCE LINK

Demo item:
Fictional State Government Tender Portal

Purpose:
Provides the original tender requirements and material specifications.

After an item is added:

• Show “1 of 1 added.”
• Disable the Add button for that category.
• Display filename, type, size and upload status.
• Provide Preview, Replace and Remove actions.
• Prevent a second item of the same category.

Show an evidence summary:

Evidence added: 5 of 5

• 1 document
• 1 photograph
• 1 audio recording
• 1 video
• 1 reference link

Add the primary button:

Scan Evidence for Identity Clues

Navigate to:

/report/identity-protection

For the live demo, keep the PDF, image and audio ready for manual upload. The video and reference link may be preloaded.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. IDENTITY-PROTECTION RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Connect the detected clues to the uploaded evidence.

PDF RESULTS

Source:
PWD_Payment_and_Inspection_Report.pdf

Names detected:

□ Rahul Sharma
□ Vikram Singh
□ Priya Nair

Hidden metadata:

☑ PDF author
☑ Creation date
☑ Editing software
☑ Original filename

IMAGE RESULTS

Source:
Steel_Grade_Site_Photo.jpg

Faces detected:

□ Face 1
□ Face 2
□ Face 3

Hidden metadata:

☑ GPS coordinates
☑ Device model
☑ Capture timestamp

AUDIO RESULTS

Source:
Bribe_Discussion_Recording.mp3

Speakers detected:

□ Speaker 1
□ Speaker 2

Hidden metadata:

☑ Recording device
☑ Creation timestamp
☑ Editing information

VIDEO RESULTS

Source:
Material_Removal_From_Site.mp4

Detected clues:

□ Visible face
□ Vehicle registration number
□ Spoken location reference

For the main demo, preselect:

☑ Rahul Sharma — My name
☑ Face 2 — My face
☑ Speaker 1 — My voice

Show two protection options:

• Protect My Selections
• Protect All Identities

After protection, display:

• Rahul Sharma → [NAME PROTECTED]
• Face 2 → Blurred
• Speaker 1 → Voice masked
• Hidden metadata → Removed

Original Evidence:
Encrypted and sealed without modification

Protected Investigator Copy:
Identity clues removed before investigator access

The system must not claim it automatically knows which person is the reporter. The reporter confirms which detected clues belong to them.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. PRIVACY & EVIDENCE OFFICER DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Route:

/staff/privacy-queue

Show the new complaint immediately after reporter submission.

Seeded complaint:

Case ID:
VP-2026-1048

Title:
Suspected ₹18 Crore Public Bridge Construction Scam

Department:
Fictional State Public Works Department

Priority:
Critical

Evidence:
5 protected items

Status:
Awaiting Privacy Review

Create a case review screen with:

• Protected evidence preview
• Identity-protection summary
• Metadata-removal summary
• Evidence integrity status
• Threat and retaliation risk
• Blockchain receipt status
• Original evidence marked “Encrypted and Sealed”

Privacy Officer actions:

• Return for protection correction
• Release Protected Copies
• Assign Anti-Corruption Officer

The officer must release only protected copies. The original evidence remains sealed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. ASSIGNMENT TO ONE OF 10 OFFICERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After protected copies are released, open an assignment panel showing 10 fictional Anti-Corruption Officers.

Each officer card must display:

• Officer ID
• Specialization
• Jurisdiction
• Active case count
• Availability
• Conflict-of-interest result
• Recommended or Ineligible status

Seed these examples:

ACO-04

• Specialization: Public procurement
• Active cases: 2
• Conflict: None
• Status: Recommended

ACO-07

• Specialization: Financial fraud
• Active cases: 5
• Conflict: None
• Status: Available

ACO-09

• Specialization: PWD investigations
• Active cases: 3
• Conflict: Detected
• Status: Ineligible

Disable assignment for officers with a conflict.

Allow sorting by:

• Recommended
• Lowest workload
• Relevant expertise
• Availability

For the demo, assign the case to:

ACO-04 — Public Procurement Specialist

After assignment:

• Update the case status to “Assigned.”
• Add the complaint to ACO-04’s dashboard.
• Generate an in-app notification.
• Record the assignment in the audit log.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. ANTI-CORRUPTION OFFICER DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Route:

/staff/cases

ACO-04 should immediately see:

New Critical Case Assigned

VP-2026-1048
Suspected ₹18 Crore Public Bridge Construction Scam

Available evidence:

• Protected PDF
• Protected image
• Protected audio
• Protected video
• Safe reference link

The investigator must initially receive protected copies only.

Provide actions:

• Review Evidence
• Add Internal Note
• Add Reporter-Safe Update
• Update Case Status
• Request Original Evidence

Internal notes must never appear in reporter tracking.

Reporter-safe updates should immediately appear when the reporter tracks the complaint.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. ORIGINAL-EVIDENCE ACCESS REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If protected evidence is insufficient, allow the Anti-Corruption Officer to create a request.

Route:

/staff/cases/VP-2026-1048/access

Required fields:

Exact evidence file:
Select one file only

Investigation purpose:
Required text field

Why is the protected copy insufficient?
Required text area

Requested access duration:
• 15 minutes
• 30 minutes
• 1 hour
• Custom duration

Access mode:
• View only
• Stream only
• Forensic analysis

Intended investigative action:
Required text field

Urgency:
• Standard
• High
• Critical

Seed this demo request:

File:
Bribe_Discussion_Recording.mp3

Purpose:
Verify whether the recording has been edited or manipulated.

Why protected copy is insufficient:
Voice masking changes the audio characteristics required for forensic analysis.

Duration:
30 minutes

Access mode:
Stream only

Urgency:
Critical

Submit the request to the Privacy & Evidence Officer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. PRIVACY REVIEW OF ACCESS REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Route:

/staff/access-requests

The Privacy Officer reviews:

• Exact file requested
• Investigation purpose
• Reason protected copy is insufficient
• Requested duration
• Identity-exposure risk
• Whether narrower access is possible
• Investigator conflict status
• Case priority

Show a mandatory checklist:

☑ Active case verified
☑ Exact file specified
☑ Purpose is investigation-related
☑ Protected copy is insufficient
☑ Conflict check passed
☑ Requested duration is limited
☑ Identity-risk controls applied

Privacy Officer decisions:

• Recommend for Approval
• Request Clarification
• Reject Request

The Privacy Officer cannot grant final access.

When “Recommend for Approval” is selected:

• Send the request to the Oversight Officer.
• Change status to “Awaiting Final Approval.”
• Add the action to the audit log.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. OVERSIGHT FINAL APPROVAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Route:

/staff/protection-queue

Show the request with:

• Case severity
• Retaliation and physical-threat risk
• Privacy Officer’s recommendation
• Exact requested file
• Purpose
• Requested duration
• Access mode
• Conflict check
• Proposed privacy controls
• Complete approval history

The Oversight Officer must decide based on:

• Necessity
• Proportionality
• Reporter safety
• Least-privilege access
• Conflict of interest
• Time limitation
• Auditability

Show this mandatory checklist:

☑ Original evidence is necessary
☑ Access is limited to one file
☑ Request duration is justified
☑ Investigator has no conflict
☑ Reporter-protection controls are active
☑ All access will be audited

Decision options:

• Approve Limited Access
• Approve With Changes
• Request Clarification
• Reject Request

Do not allow the Oversight Officer to approve their own request.

The Oversight Officer should review the request and risk summary without opening the original evidence.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. APPROVAL NOTIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After final approval, immediately notify ACO-04.

Show:

Original Evidence Access Approved

Case:
VP-2026-1048

Evidence:
Bribe_Discussion_Recording.mp3

Purpose:
Audio manipulation verification

Access:
Stream only

Duration:
30 minutes

Add actions:

• Open Approved Evidence
• View Approval Conditions
• Begin Investigation Action

Show:

• A visible access countdown
• Access start time
• Automatic expiry time
• Revoke Access control for authorized roles
• “All activity is being audited”

When the countdown ends:

• Automatically close the evidence viewer.
• Change status to “Access Expired.”
• Remove access permission.
• Add the expiry to the audit log.

Do not provide unrestricted access to the complete evidence vault.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. CASE STATUS FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use these internal statuses:

Submitted
→ Privacy Review
→ Protected Copies Ready
→ Released for Investigation
→ Officer Assigned
→ Under Investigation
→ Original Access Requested
→ Privacy Review Passed
→ Awaiting Final Approval
→ Original Access Approved
→ Access Active
→ Access Expired
→ Action Initiated
→ Case Closed

Use these simplified reporter-visible statuses:

• Complaint securely received
• Evidence privacy review completed
• Assigned for investigation
• Investigation in progress
• Action initiated
• Case resolved

Never show the reporter:

• Investigator name
• Internal notes
• Original-evidence request details
• Approval discussions
• Confidential investigation actions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. SHARED DEMO STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Make the prototype functional using shared in-memory demo state.

The following actions must update across roles:

• Reporter submits complaint.
• Complaint appears in Privacy Queue.
• Privacy Officer releases protected copies.
• Privacy Officer assigns ACO-04.
• Case appears in ACO-04 dashboard.
• ACO-04 requests original evidence.
• Request appears in Privacy Access Queue.
• Privacy Officer recommends approval.
• Request appears in Oversight Queue.
• Oversight Officer approves access.
• ACO-04 receives an immediate notification.
• Access countdown begins.
• Investigator adds a reporter-safe status update.
• Reporter sees that update on the tracking screen.

Maintain state while switching between roles.

Reset the demo to seeded data only when the browser page is refreshed or when “Reset Demo” is selected.

Add a visible Demo Role Switcher:

• Reporter
• Privacy & Evidence Officer
• Anti-Corruption Officer
• Oversight & Whistleblower Protection Officer

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. EMERGENCY SAFETY RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If a complaint includes:

• Physical threat
• Threat to family
• Immediate danger to public safety

Mark it as Critical.

Protective or emergency action may begin using protected evidence. Officers must not wait for original-evidence approval before responding to an immediate safety threat.

Original-evidence access is for investigation and verification, not for delaying protective action.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. VISUAL DESIGN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Continue using:

• Canvas: #FAF9F6
• Surface: #FFFFFF
• Primary text: #252622
• Secondary text: #62635D
• Border: #E3E1DA
• Accent: #B94725
• Accent soft: #FBEDE7
• Success: #326047
• Warning: #805D16
• Error: #A12C3A
• Information: #465D70
• Font: Inter

Use:

• Spacious layouts
• Clear evidence previews
• Accessible status chips
• Large touch targets
• Consistent role labels
• Simple timelines
• Clear confirmation dialogs
• Responsive mobile and web navigation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. DO NOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Do not allow multiple files of the same evidence type.
• Do not give investigators original evidence initially.
• Do not let the Privacy Officer give final approval.
• Do not allow investigators to approve their own requests.
• Do not give access to the complete evidence vault.
• Do not expose reporter-identity selections to investigators.
• Do not reveal officer information to the reporter.
• Do not show internal notes in reporter tracking.
• Do not modify the encrypted original evidence.
• Do not automatically identify who the reporter is.
• Do not use neon colors, gradients, hacker imagery or crypto clichés.
• Do not add unnecessary warning paragraphs or fear-based copy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17. ACCEPTANCE CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The update is complete only when this demo works end to end:

1. Reporter adds a maximum of one file per evidence type.
2. Reporter selects their detected identity clues.
3. Protected copies are generated.
4. Complaint appears in the Privacy Officer dashboard.
5. Privacy Officer releases the protected copies.
6. Privacy Officer assigns ACO-04 from a list of 10 officers.
7. ACO-04 receives the case and reviews protected evidence.
8. ACO-04 requests one original audio file with justification and duration.
9. Privacy Officer reviews and recommends the request.
10. Oversight Officer gives final limited approval.
11. ACO-04 receives an immediate approval notification.
12. The 30-minute access countdown begins.
13. Access automatically expires.
14. All actions appear in the audit trail.
15. Reporter sees only safe case-status updates.
