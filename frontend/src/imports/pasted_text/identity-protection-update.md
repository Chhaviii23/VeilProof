UPDATE THE EXISTING VEILPROOF PROTOTYPE

Add a complete and highly visible “Identity Protection” step between:

/report/evidence
→ /report/identity-protection
→ /report/review

Do not hide this process inside a loading state or small popup. It must be a full screen because it is the key innovation of the product.

SCREEN TITLE

Protect Your Identity

SUBTITLE

We found possible identity clues in your evidence. Only you can confirm which ones belong to you.

STEP INDICATOR

1. Report Details
2. Risk Assessment
3. Evidence
4. Identity Protection — Active
5. Review & Submit

SCAN SUMMARY CARD

Privacy scan complete

• 3 names detected
• 3 faces detected
• 2 speakers detected
• Hidden file metadata found

Use a small success icon and the text:
“Select your identity clues or protect every person appearing in the evidence.”

DETECTED IDENTITY CLUES

Create three clear expandable sections.

1. Names Detected

Source: Bridge_Tender_Specifications.pdf

□ Rahul Sharma
□ Vikram Singh
□ Priya Nair

When Rahul Sharma is selected, show:

☑ Rahul Sharma — My name

Provide two actions beside every name:

• This is me
• Protect

2. Faces Detected

Source: Steel_Grade_Site_Photo.jpg

Show three cropped face thumbnails:

□ Face 1
□ Face 2
□ Face 3

When Face 2 is selected, highlight its thumbnail with an orange border and show:

☑ Face 2 — My face

Provide two actions:

• This is me
• Protect

3. Speakers Detected

Source: Payment_Discussion.mp3

Show audio waveform previews:

□ Speaker 1 — 00:04–00:18
□ Speaker 2 — 00:19–00:43

When Speaker 1 is selected, show:

☑ Speaker 1 — My voice

Provide a small play button beside each speaker so the reporter can identify their own voice.

IDENTITY CONFIRMATION SUMMARY

Create a highlighted summary card:

Your selected identity

☑ Rahul Sharma — My name  
☑ Face 2 — My face  
☑ Speaker 1 — My voice

Text:

“These clues will be removed or masked in the protected investigator copy.”

PROTECT ALL OPTION

Add a prominent secondary option:

Protect All Identities

Supporting text:

“Remove every detected name, blur every face and mask every speaker.”

Selecting this option should automatically check:

• Rahul Sharma
• Vikram Singh
• Priya Nair
• Face 1
• Face 2
• Face 3
• Speaker 1
• Speaker 2

METADATA PROTECTION

Create a section titled:

Hidden Metadata Removed Automatically

Show checked items:

☑ GPS coordinates  
☑ Device model  
☑ Original filename  
☑ PDF author information  
☑ File creation details  
☑ Editing software information

These options should remain checked and should not require manual action.

PROTECTION PREVIEW

Add a “Preview Protected Copy” button.

When clicked, show a before-and-after comparison:

Before:
• Rahul Sharma
• Visible Face 2
• Original Speaker 1 voice

Protected copy:
• [NAME PROTECTED]
• Face 2 blurred
• Speaker 1 voice masked
• Metadata removed

Clearly label:

Original Evidence
“Encrypted and sealed without modification”

Protected Investigator Copy
“Identity clues removed before investigator access”

PRIMARY ACTIONS

Back to Evidence

Apply Protection and Continue

The “Apply Protection and Continue” button must:

1. Save the selected identity clues.
2. Generate a protected-copy state.
3. Show a short processing animation.
4. Display “Identity protection applied.”
5. Navigate to /report/review.

REVIEW SCREEN UPDATE

Under every uploaded evidence file, display:

• Original: Encrypted and sealed
• Protected copy: Ready for investigation
• Identity protection: Applied

Show a summary:

Identity Protection Applied

• 1 name protected
• 1 face blurred
• 1 voice masked
• 6 metadata fields removed

DEMO INTERACTION STATE

Preload the following detected data:

Names:
• Rahul Sharma
• Vikram Singh
• Priya Nair

Faces:
• Face 1
• Face 2
• Face 3

Speakers:
• Speaker 1
• Speaker 2

For the main demo, preselect:

• Rahul Sharma — My name
• Face 2 — My face
• Speaker 1 — My voice

Allow the user to unselect and reselect every item.

IMPORTANT PRODUCT LOGIC

The system must not automatically claim it knows who the reporter is.

It detects possible names, faces, voices and metadata. The reporter confirms which detected clues belong to them.

Keep both options:

• Protect only selected clues
• Protect all identities

VISUAL DESIGN

Follow the existing bright, minimal VeilProof design:

• Background: #FAF9F6
• Cards: #FFFFFF
• Primary text: #252622
• Secondary text: #62635D
• Borders: #E3E1DA
• Main accent: #B94725
• Selected background: #FBEDE7
• Success: #326047
• Font: Inter

Use clean spacing, large touch targets, clear thumbnails and accessible contrast.

DO NOT

• Do not hide detected clues in a tooltip.
• Do not automatically label a person as the reporter.
• Do not combine names, faces and speakers into one confusing list.
• Do not delete or modify the sealed original.
• Do not use neon colors, gradients, hacker imagery or blockchain-themed decoration.
• Do not show investigators which selected identity belongs to the reporter.
• Do not expose the reporter’s selections in staff dashboards.

STAFF DASHBOARD BEHAVIOUR

Investigators should see only:

• Protected name: [NAME PROTECTED]
• Blurred Face 2
• Masked Speaker 1
• “Privacy protection applied”

Investigators must not see:

• “Rahul Sharma is the reporter”
• “Face 2 is the reporter”
• “Speaker 1 is the reporter”

This relationship must remain confidential and unavailable to investigator roles.