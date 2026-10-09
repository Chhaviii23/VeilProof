import type {
  CaseRecord,
  InvestigatorAccount,
  AntiCorruptionOfficer,
  EvidenceItem,
  PublicUpdate,
  EvidenceRecord,
  OriginalAccessRequest,
} from '../types';

export const DEMO_INVESTIGATORS: InvestigatorAccount[] = [
  { id: 'arjun', name: 'Arjun Mehta', role: 'Anti-Corruption Officer', roleType: 'case-investigator', organization: 'Public Integrity Office', officerCode: 'ACO-04' },
  { id: 'priya', name: 'Priya Nair', role: 'Privacy & Evidence Officer', roleType: 'privacy-officer', organization: 'Public Integrity Office' },
  { id: 'meera', name: 'Meera Rao', role: 'Oversight & Whistleblower Protection Officer', roleType: 'oversight-officer', organization: 'Public Integrity Office' },
];

export const DEMO_CREDENTIALS = [
  { username: 'arjun.mehta', password: 'demo-inv', investigatorId: 'arjun', label: 'Arjun Mehta — Anti-Corruption Officer (ACO-04)' },
  { username: 'priya.nair', password: 'demo-priv', investigatorId: 'priya', label: 'Priya Nair — Privacy & Evidence Officer' },
  { username: 'meera.rao', password: 'demo-over', investigatorId: 'meera', label: 'Meera Rao — Oversight & Whistleblower Protection Officer' },
];

export const ANTI_CORRUPTION_OFFICERS: AntiCorruptionOfficer[] = [
  { code: 'ACO-01', name: 'Deepak Verma', specialization: 'Infrastructure fraud', jurisdiction: 'North Zone', activeCases: 4, availability: 'Available', conflictDetected: false, status: 'Available' },
  { code: 'ACO-02', name: 'Sunita Pillai', specialization: 'Financial crimes', jurisdiction: 'Central Zone', activeCases: 6, availability: 'High workload', conflictDetected: false, status: 'Available' },
  { code: 'ACO-03', name: 'Ramesh Iyer', specialization: 'Municipal corruption', jurisdiction: 'South Zone', activeCases: 1, availability: 'Available', conflictDetected: false, status: 'Available' },
  { code: 'ACO-04', name: 'Arjun Mehta', specialization: 'Public procurement', jurisdiction: 'All zones', activeCases: 2, availability: 'Available', conflictDetected: false, status: 'Recommended' },
  { code: 'ACO-05', name: 'Nandan Gupta', specialization: 'Environmental compliance', jurisdiction: 'West Zone', activeCases: 3, availability: 'Available', conflictDetected: false, status: 'Available' },
  { code: 'ACO-06', name: 'Leela Bose', specialization: 'Healthcare procurement', jurisdiction: 'East Zone', activeCases: 0, availability: 'Available', conflictDetected: false, status: 'Available' },
  { code: 'ACO-07', name: 'Aditya Saxena', specialization: 'Financial fraud', jurisdiction: 'All zones', activeCases: 5, availability: 'Moderate', conflictDetected: false, status: 'Available' },
  { code: 'ACO-08', name: 'Priti Rajan', specialization: 'Land records', jurisdiction: 'Central Zone', activeCases: 7, availability: 'High workload', conflictDetected: false, status: 'Available' },
  { code: 'ACO-09', name: 'Suresh Nambiar', specialization: 'PWD investigations', jurisdiction: 'All zones', activeCases: 3, availability: 'Available', conflictDetected: true, status: 'Ineligible' },
  { code: 'ACO-10', name: 'Meghna Das', specialization: 'Corruption prevention', jurisdiction: 'North Zone', activeCases: 2, availability: 'Available', conflictDetected: false, status: 'Available' },
];

export const SEED_TRACKING_SECRETS: Record<string, string> = {
  'VP-SEED-0001': 'TRK-E9F2-8C3A-1B7D',
  'VP-SEED-0002': 'TRK-A4B8-2D1C-9E5F',
  'VP-SEED-0003': 'TRK-7F3E-5A9B-2C4D',
};

function seedPublicUpdates(ref: string): PublicUpdate[] {
  if (ref === 'VP-SEED-0001') {
    return [
      { id: 'pu-seed-001-1', status: 'received_securely', text: 'Your report has been received securely. Identity protection processing is underway.', addedAt: '2026-08-04T11:15:00Z' },
    ];
  }
  if (ref === 'VP-SEED-0002') {
    return [
      { id: 'pu-seed-002-1', status: 'received_securely', text: 'Your report has been received securely.', addedAt: '2026-06-10T09:30:00Z' },
      { id: 'pu-seed-002-2', status: 'under_investigation', text: 'An anti-corruption investigator has been assigned and is reviewing the submitted materials.', addedAt: '2026-06-13T10:00:00Z' },
      { id: 'pu-seed-002-3', status: 'under_investigation', text: 'Procurement records and supplier documentation are under detailed review.', addedAt: '2026-06-20T14:00:00Z' },
    ];
  }
  if (ref === 'VP-SEED-0003') {
    return [
      { id: 'pu-seed-003-1', status: 'received_securely', text: 'Your report has been received securely.', addedAt: '2026-03-05T08:45:00Z' },
      { id: 'pu-seed-003-2', status: 'under_investigation', text: 'A formal review has commenced. Evidence is being examined.', addedAt: '2026-03-08T09:00:00Z' },
      { id: 'pu-seed-003-3', status: 'resolution_prepared', text: 'A formal investigation has been recommended. Findings are being referred for further action.', addedAt: '2026-05-01T16:30:00Z' },
      { id: 'pu-seed-003-4', status: 'closed', text: 'This matter has been reviewed and findings referred to the appropriate authority. Thank you for your report.', addedAt: '2026-05-20T12:00:00Z' },
    ];
  }
  return [];
}

// Seed Case 1 — privacy_review, evidence pending release
const SEED_EV_001_A: EvidenceRecord = {
  id: 'ev-seed-001-a',
  name: 'Road_Contract_Billing_Summary.pdf',
  type: 'application/pdf',
  size: 1860000,
  metadataRemoved: ['Author', 'Organization', 'EditingHistory', 'FilePath'],
  protectedCopyStatus: 'pending_release',
  sealedOriginalStatus: 'sealed',
};

const SEED_EV_001_B: EvidenceRecord = {
  id: 'ev-seed-001-b',
  name: 'Site_Completion_Photo_01.jpg',
  type: 'image/jpeg',
  size: 2940000,
  metadataRemoved: ['GPSCoordinates', 'DeviceModel', 'CaptureTimestamp'],
  protectedCopyStatus: 'pending_release',
  sealedOriginalStatus: 'sealed',
};

const SEED_EV_001_C: EvidenceRecord = {
  id: 'ev-seed-001-c',
  name: 'Contractor_Work_Order_Comparison.pdf',
  type: 'application/pdf',
  size: 3200000,
  metadataRemoved: ['ScannerDevice', 'EmployeeUsername'],
  protectedCopyStatus: 'pending_release',
  sealedOriginalStatus: 'sealed',
};

// Seed Case 2 — under_investigation, evidence released
const SEED_EV_002_A: EvidenceRecord = {
  id: 'ev-seed-002-a',
  name: 'Equipment_Procurement_Quotes.pdf',
  type: 'application/pdf',
  size: 4100000,
  metadataRemoved: ['Author', 'Organization', 'EditingHistory'],
  protectedCopyStatus: 'released',
  protectedCopyReleasedAt: '2026-06-12T10:00:00Z',
  protectedCopyReleasedBy: 'priya',
  protectedCopyReleasedByName: 'Priya Nair',
  sealedOriginalStatus: 'sealed',
};

const SEED_EV_002_B: EvidenceRecord = {
  id: 'ev-seed-002-b',
  name: 'Delivery_Verification_Records.pdf',
  type: 'application/pdf',
  size: 2900000,
  metadataRemoved: ['ScannerDevice', 'EmployeeUsername', 'DepartmentCode'],
  protectedCopyStatus: 'released',
  protectedCopyReleasedAt: '2026-06-12T10:05:00Z',
  protectedCopyReleasedBy: 'priya',
  protectedCopyReleasedByName: 'Priya Nair',
  sealedOriginalStatus: 'sealed',
};

const SEED_EV_002_C: EvidenceRecord = {
  id: 'ev-seed-002-c',
  name: 'Equipment_Store_Inspection.jpg',
  type: 'image/jpeg',
  size: 3400000,
  metadataRemoved: ['GPSCoordinates', 'CameraModel', 'CaptureTimestamp'],
  protectedCopyStatus: 'released',
  protectedCopyReleasedAt: '2026-06-12T10:10:00Z',
  protectedCopyReleasedBy: 'priya',
  protectedCopyReleasedByName: 'Priya Nair',
  sealedOriginalStatus: 'sealed',
};

// Seed Case 3 — closed with full access history
const SEED_OAR_003: OriginalAccessRequest = {
  id: 'oar-seed-003-a',
  caseId: 'case-seed-003',
  evidenceId: 'ev-seed-003-a',
  requestedBy: 'arjun',
  requestedByName: 'Arjun Mehta',
  requestedAt: '2026-04-10T11:00:00Z',
  purpose: 'Verify original document metadata to establish timeline of allocation decisions',
  reason: 'The protected copy shows allocation dates, but original file timestamps are needed to determine whether approvals were backdated.',
  requestedDurationMinutes: 10,
  privacyDecision: 'approved',
  privacyDecidedBy: 'priya',
  privacyDecidedByName: 'Priya Nair',
  privacyDecidedAt: '2026-04-10T13:00:00Z',
  privacyNotes: 'Request limited to one file with defined investigative purpose. Reporter-linked identifiers must not be exposed.',
  oversightDecision: 'approved',
  oversightDecidedBy: 'meera',
  oversightDecidedByName: 'Meera Rao',
  oversightDecidedAt: '2026-04-10T15:00:00Z',
  oversightNotes: 'Temporary access approved for timestamp verification only. Export and download remain disabled.',
  status: 'ended',
  accessGrantedAt: '2026-04-10T15:01:00Z',
  accessExpiresAt: '2026-04-10T15:11:00Z',
};

const SEED_EV_003_A: EvidenceRecord = {
  id: 'ev-seed-003-a',
  name: 'Allocation_Committee_Minutes.pdf',
  type: 'application/pdf',
  size: 1640000,
  metadataRemoved: ['Author', 'EditingHistory', 'FilePath'],
  protectedCopyStatus: 'released',
  protectedCopyReleasedAt: '2026-03-09T09:30:00Z',
  protectedCopyReleasedBy: 'priya',
  protectedCopyReleasedByName: 'Priya Nair',
  sealedOriginalStatus: 'ended',
  originalAccessRequestId: 'oar-seed-003-a',
};

const SEED_EV_003_B: EvidenceRecord = {
  id: 'ev-seed-003-b',
  name: 'Beneficiary_Payment_Records.pdf',
  type: 'application/pdf',
  size: 2760000,
  metadataRemoved: ['ScannerDevice', 'EmployeeUsername', 'DepartmentCode'],
  protectedCopyStatus: 'released',
  protectedCopyReleasedAt: '2026-03-09T09:25:00Z',
  protectedCopyReleasedBy: 'priya',
  protectedCopyReleasedByName: 'Priya Nair',
  sealedOriginalStatus: 'sealed',
};


function bridgeEv(id: string, name: string, type: string, size: number, metadataRemoved: string[], protectionNote?: string): EvidenceRecord {
  return { id, name, type, size, metadataRemoved, protectionNote, protectedCopyStatus: 'pending_release', sealedOriginalStatus: 'sealed' };
}

const BRIDGE_EVIDENCE: EvidenceRecord[] = [
  bridgeEv('ev-1048-pdf', 'PWD_Payment_and_Inspection_Report.pdf', 'application/pdf', 2140000, ['PDF author', 'Creation date', 'Editing software', 'Original filename'], 'Rahul Sharma → [NAME PROTECTED]'),
  bridgeEv('ev-1048-img', 'Steel_Grade_Site_Photo.jpg', 'image/jpeg', 3480000, ['GPS coordinates', 'Device model', 'Capture timestamp'], 'Face 2 → Blurred'),
  bridgeEv('ev-1048-aud', 'Bribe_Discussion_Recording.mp3', 'audio/mpeg', 5210000, ['Recording device', 'Creation timestamp', 'Editing information'], 'Speaker 1 → Voice masked'),
  bridgeEv('ev-1048-vid', 'Material_Removal_From_Site.mp4', 'video/mp4', 18400000, ['Device model', 'Capture timestamp'], 'Visible face blurred · Vehicle registration number masked'),
  bridgeEv('ev-1048-lnk', 'Fictional State Government Tender Portal', 'link', 0, ['Referrer', 'Session identifiers'], 'Safe reference link — tracking parameters removed'),
];

function makeBridgeCase(): CaseRecord {
  const at = '2026-10-02T09:12:00Z';
  return {
    id: 'case-1048',
    reference: 'VP-2026-1048',
    title: 'Suspected ₹18 Crore Public Bridge Construction Scam',
    category: 'corruption',
    description: 'Submission alleges that payment of ₹18 crore for a public bridge was released before the required inspection, that lower-grade steel was used on site, and that construction materials were removed from the project. An audio recording alleges a discussion about payment for approving inspection records.\n\nFictional demonstration case — all names, figures and organisations are invented.',
    incidentDate: '2026-09-10',
    location: 'Fictional State Public Works Department — Bridge Project',
    involvedParties: 'Fictional State Public Works Department, contractor and inspection staff (fictional)',
    receivedAt: at,
    lastUpdated: at,
    status: 'privacy_review',
    priority: 'critical',
    riskFactors: ['workplace_retaliation', 'physical_threat'],
    evidence: BRIDGE_EVIDENCE,
    originalAccessRequests: [],
    auditTrail: [
      { id: 'ae-1048-1', type: 'report_accepted', detail: 'Report received securely — VP-2026-1048 [Critical priority]', occurredAt: at, caseId: 'case-1048' },
      { id: 'ae-1048-2', type: 'privacy_protection_completed', detail: '5 evidence items processed. Originals encrypted and sealed. Protected copies generated.', occurredAt: '2026-10-02T09:12:45Z', caseId: 'case-1048' },
    ],
    publicUpdates: [{ id: 'pu-1048-1', status: 'received_securely', text: 'Your report has been received securely. A privacy review is underway.', addedAt: at }],
    internalNotes: [],
    assignedInvestigatorId: '',
    protectionSummary: { namesProtected: 1, facesBlurred: 1, voicesMasked: 1, metadataFieldsRemoved: 12 },
    integrity: { proofStatus: 'confirmed', transactionRef: '0x9be4c0a17d52f8e3a6b14d0c7e5f29a8b3c61d47e0f5a29c8b7d6e3f1a0c4b82', network: 'Polygon Amoy Testnet' },
    isSeeded: true,
  };
}

export function makeSeedCases(): CaseRecord[] {
  return [
    makeBridgeCase(),
    {
      id: 'case-seed-001',
      reference: 'VP-SEED-0001',
      title: 'Municipal Road-Contract Billing Irregularity',
      category: 'financial_misconduct',
      description: 'Submission concerns alleged billing irregularities on a municipal road-resurfacing contract. Invoices appear to claim payment for work that site inspections indicate was not completed. Photographic evidence and billing summaries have been submitted for review.\n\nFictional demonstration case — all names, figures and organisations are invented.',
      receivedAt: '2026-08-04T11:15:00Z',
      lastUpdated: '2026-08-04T11:15:00Z',
      incidentDate: '2026-07-01',
      location: 'North Municipal Ward — Fictional Location',
      involvedParties: 'Municipal Works Division (fictional), Greenfield Road Services Ltd. (fictional)',
      status: 'privacy_review',
      evidence: [SEED_EV_001_A, SEED_EV_001_B, SEED_EV_001_C],
      originalAccessRequests: [],
      auditTrail: [
        { id: 'ae-seed-001-1', type: 'report_accepted', detail: 'Report received securely — VP-SEED-0001', occurredAt: '2026-08-04T11:15:00Z', caseId: 'case-seed-001' },
        { id: 'ae-seed-001-2', type: 'privacy_protection_completed', detail: '3 evidence items processed. 9 identity-related metadata fields removed. 3 encrypted originals sealed.', occurredAt: '2026-08-04T11:15:45Z', caseId: 'case-seed-001' },
      ],
      publicUpdates: seedPublicUpdates('VP-SEED-0001'),
      internalNotes: [],
      assignedInvestigatorId: '',
      isSeeded: true,
    },
    {
      id: 'case-seed-002',
      reference: 'VP-SEED-0002',
      title: 'Government Hospital Equipment Procurement Concern',
      category: 'corruption',
      description: 'Submission concerns alleged irregularities in procurement of diagnostic equipment for a district government hospital. Multiple supplier quotes appear to reference the same supplier under different names. Delivery records indicate equipment was invoiced but may not have been delivered or installed.\n\nFictional demonstration case — all figures and entities are invented.',
      receivedAt: '2026-06-10T09:30:00Z',
      lastUpdated: '2026-06-20T14:00:00Z',
      incidentDate: '2026-05-01',
      location: 'District General Hospital — Fictional Location',
      involvedParties: 'District Health Authority (fictional), MediSupply Co. (fictional), QuickMed Distributors (fictional)',
      status: 'under_investigation',
      evidence: [SEED_EV_002_A, SEED_EV_002_B, SEED_EV_002_C],
      originalAccessRequests: [],
      auditTrail: [
        { id: 'ae-seed-002-1', type: 'report_accepted', detail: 'Report received securely — VP-SEED-0002', occurredAt: '2026-06-10T09:30:00Z', caseId: 'case-seed-002' },
        { id: 'ae-seed-002-2', type: 'privacy_protection_completed', detail: '3 evidence items processed. 10 metadata fields removed.', occurredAt: '2026-06-10T09:31:00Z', caseId: 'case-seed-002' },
        { id: 'ae-seed-002-3', type: 'protected_copy_released', actorId: 'priya', actorName: 'Priya Nair', actorRole: 'Privacy & Evidence Officer', detail: 'Protected copies released — 3 items', occurredAt: '2026-06-12T10:10:00Z', caseId: 'case-seed-002' },
        { id: 'ae-seed-002-4', type: 'status_changed', actorId: 'arjun', actorName: 'Arjun Mehta', actorRole: 'Anti-Corruption Officer', detail: 'Status updated to under investigation', occurredAt: '2026-06-13T10:00:00Z', caseId: 'case-seed-002' },
        { id: 'ae-seed-002-5', type: 'status_changed', actorId: 'arjun', actorName: 'Arjun Mehta', actorRole: 'Anti-Corruption Officer', detail: 'Procurement records and supplier documentation under detailed review', occurredAt: '2026-06-20T14:00:00Z', caseId: 'case-seed-002' },
      ],
      publicUpdates: seedPublicUpdates('VP-SEED-0002'),
      internalNotes: [
        { id: 'in-seed-002-1', text: 'Three supplier quotes show identical letterhead formatting with only name and address changed. Address validation reveals two of the three do not exist in the business registry. Escalating for further procurement audit.', addedBy: 'arjun', addedByName: 'Arjun Mehta', addedAt: '2026-06-13T10:30:00Z' },
        { id: 'in-seed-002-2', text: 'Delivery verification records list equipment serial numbers that do not appear in the hospital inventory system. Requesting physical inspection report.', addedBy: 'arjun', addedByName: 'Arjun Mehta', addedAt: '2026-06-20T14:15:00Z' },
      ],
      assignedInvestigatorId: 'arjun',
      assignedOfficerCode: 'ACO-04',
      isSeeded: true,
    },
    {
      id: 'case-seed-003',
      reference: 'VP-SEED-0003',
      title: 'Public Housing Allocation Manipulation',
      category: 'corruption',
      description: 'Submission alleges that housing units in a public scheme were allocated to ineligible applicants in exchange for payments. Allocation committee minutes appear to have been backdated. Payment records show disbursements to beneficiaries whose names do not appear on the original approved waiting list. Formal investigation recommended and findings referred to the appropriate authority.\n\nFictional demonstration case — all persons and events are invented.',
      receivedAt: '2026-03-05T08:45:00Z',
      lastUpdated: '2026-05-20T12:00:00Z',
      incidentDate: '2026-02-01',
      location: 'Shantinagar Housing Scheme — Fictional Location',
      involvedParties: 'Housing Authority (fictional), Allocation Committee (fictional), PayFast Disbursement Agency (fictional)',
      status: 'closed',
      evidence: [SEED_EV_003_A, SEED_EV_003_B],
      originalAccessRequests: [SEED_OAR_003],
      auditTrail: [
        { id: 'ae-seed-003-1', type: 'report_accepted', detail: 'Report received securely — VP-SEED-0003', occurredAt: '2026-03-05T08:45:00Z', caseId: 'case-seed-003' },
        { id: 'ae-seed-003-2', type: 'privacy_protection_completed', detail: '2 evidence items processed. 6 metadata fields removed.', occurredAt: '2026-03-05T08:46:00Z', caseId: 'case-seed-003' },
        { id: 'ae-seed-003-3', type: 'protected_copy_released', actorId: 'priya', actorName: 'Priya Nair', actorRole: 'Privacy & Evidence Officer', detail: 'Protected copies released — 2 items', occurredAt: '2026-03-09T09:30:00Z', caseId: 'case-seed-003' },
        { id: 'ae-seed-003-4', type: 'status_changed', actorId: 'arjun', actorName: 'Arjun Mehta', actorRole: 'Anti-Corruption Officer', detail: 'Status updated to under investigation', occurredAt: '2026-03-08T09:00:00Z', caseId: 'case-seed-003' },
        { id: 'ae-seed-003-5', type: 'original_access_requested', actorId: 'arjun', actorName: 'Arjun Mehta', actorRole: 'Anti-Corruption Officer', purpose: 'Verify document metadata to establish timeline of allocation decisions', detail: 'Sealed original access requested — Allocation_Committee_Minutes.pdf', occurredAt: '2026-04-10T11:00:00Z', caseId: 'case-seed-003' },
        { id: 'ae-seed-003-6', type: 'privacy_review_approved', actorId: 'priya', actorName: 'Priya Nair', actorRole: 'Privacy & Evidence Officer', detail: 'Privacy review approved — limited 10-minute access', occurredAt: '2026-04-10T13:00:00Z', caseId: 'case-seed-003' },
        { id: 'ae-seed-003-7', type: 'oversight_approval_granted', actorId: 'meera', actorName: 'Meera Rao', actorRole: 'Oversight & Whistleblower Protection Officer', detail: 'Oversight approved — timestamp verification only. Export disabled.', occurredAt: '2026-04-10T15:00:00Z', caseId: 'case-seed-003' },
        { id: 'ae-seed-003-8', type: 'access_ended', actorId: 'arjun', actorName: 'Arjun Mehta', actorRole: 'Anti-Corruption Officer', detail: 'Sealed original access ended — Allocation_Committee_Minutes.pdf', occurredAt: '2026-04-10T15:09:00Z', caseId: 'case-seed-003' },
        { id: 'ae-seed-003-9', type: 'closure_recommended', actorId: 'arjun', actorName: 'Arjun Mehta', actorRole: 'Anti-Corruption Officer', detail: 'Formal investigation recommended. Evidence referred for further action.', occurredAt: '2026-05-01T16:00:00Z', caseId: 'case-seed-003' },
        { id: 'ae-seed-003-10', type: 'closure_approved', actorId: 'meera', actorName: 'Meera Rao', actorRole: 'Oversight & Whistleblower Protection Officer', detail: 'Case closure approved. Findings referred to appropriate authority.', occurredAt: '2026-05-20T12:00:00Z', caseId: 'case-seed-003' },
      ],
      publicUpdates: seedPublicUpdates('VP-SEED-0003'),
      internalNotes: [
        { id: 'in-seed-003-1', text: 'Document metadata confirms committee minutes were created 3 days after the stated meeting date. Findings documented for formal referral.', addedBy: 'arjun', addedByName: 'Arjun Mehta', addedAt: '2026-04-10T15:30:00Z' },
      ],
      assignedInvestigatorId: 'arjun',
      assignedOfficerCode: 'ACO-04',
      closureRecommendation: {
        id: 'cr-seed-003-1',
        recommendedBy: 'arjun',
        recommendedByName: 'Arjun Mehta',
        recommendedAt: '2026-05-01T16:00:00Z',
        outcome: 'Evidence supports referral to the Housing Authority Oversight Committee and the Anti-Corruption Bureau. Document backdating confirmed through metadata analysis. Disbursement irregularities referred to the Audit Commission.',
        reporterMessage: 'This matter has been reviewed and findings referred to the appropriate authority for further action. Thank you for your report.',
        status: 'approved',
        decidedBy: 'meera',
        decidedByName: 'Meera Rao',
        decidedAt: '2026-05-20T12:00:00Z',
      },
      isSeeded: true,
    },
  ];
}

// Wizard evidence items for demo — one per type (5 total)
export const DEMO_EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'demo-ev-pdf',
    name: 'PWD_Payment_and_Inspection_Report.pdf',
    size: 2140000,
    type: 'application/pdf',
    scanState: 'idle',
    findings: [
      { field: 'PDF Author', value: 'Principal Engineer, PWD', risk: 'high' },
      { field: 'Organization', value: 'State Public Works Dept.', risk: 'high' },
      { field: 'Editing History', value: '14 revisions by 3 users', risk: 'medium' },
      { field: 'Original Filename', value: 'PWD_Q2_Bridge_Payments.pdf', risk: 'high' },
    ],
    isDemo: true,
  },
  {
    id: 'demo-ev-img',
    name: 'Steel_Grade_Site_Photo.jpg',
    size: 3820000,
    type: 'image/jpeg',
    scanState: 'idle',
    findings: [
      { field: 'GPS Coordinates', value: '22.5726° N, 88.3639° E', risk: 'high' },
      { field: 'Device Model', value: 'Samsung Galaxy S24', risk: 'medium' },
      { field: 'Capture Timestamp', value: '2026-04-03 06:42:17', risk: 'medium' },
    ],
    isDemo: true,
  },
  {
    id: 'demo-ev-audio',
    name: 'Bribe_Discussion_Recording.mp3',
    size: 8400000,
    type: 'audio/mpeg',
    scanState: 'idle',
    findings: [
      { field: 'Recording Device', value: 'Redmi Note 13 Voice Memo', risk: 'high' },
      { field: 'Creation Timestamp', value: '2026-03-18 14:22:05', risk: 'high' },
      { field: 'Editing Information', value: 'Trimmed 3s from start', risk: 'medium' },
    ],
    isDemo: true,
    durationSecs: 47,
  },
  {
    id: 'demo-ev-video',
    name: 'Material_Removal_From_Site.mp4',
    size: 68000000,
    type: 'video/mp4',
    scanState: 'idle',
    findings: [
      { field: 'GPS Coordinates', value: '22.5726° N, 88.3639° E', risk: 'high' },
      { field: 'Camera Model', value: 'GoPro HERO12', risk: 'medium' },
      { field: 'Creation Timestamp', value: '2026-04-09 02:18:33', risk: 'high' },
    ],
    isDemo: true,
    durationSecs: 134,
  },
  {
    id: 'demo-ev-link',
    name: 'Fictional State Government Tender Portal',
    size: 0,
    type: 'link',
    scanState: 'idle',
    findings: [],
    isDemo: true,
    url: 'https://demo.state.gov.example/tenders/bridge-rehabilitation-2026',
    linkTitle: 'Fictional State Government Tender Portal',
    linkProof: 'Shows the original tender requirements: Fe500D steel grade, 30 MPa concrete, and full inspection before final payment release.',
    linkDateAccessed: '2026-04-14',
  },
];

export const DEMO_EXAMPLE_REPORT = {
  title: 'Suspected ₹18 Crore Public Bridge Construction Scam',
  category: 'corruption' as const,
  description: `I am submitting evidence concerning suspected corruption in the Riverfront District Bridge Rehabilitation Project.

The approved project specification requires Fe500D structural steel, but site photographs and delivery records indicate that lower-grade steel was used during construction.

Several concrete-quality test reports appear to have been modified after testing. Some inspection certificates were signed before the recorded inspection dates.

Invoices worth approximately ₹18 crore were submitted for steel, concrete and rehabilitation work. Site records suggest that some materials were never delivered and part of the billed work remains incomplete.

An audio recording appears to capture a senior project official asking the contractor for a payment to approve the pending bill.

After I questioned these records internally, I received a threatening voice message instructing me to stop checking the project.

I am submitting the available documents, photographs, recordings, video and public tender links for an independent investigation.

All allegations are presented for investigation and should not be treated as established fact.`,
  incidentDate: '2026-01-15',
  location: 'Riverfront District — Fictional Location',
  involvedParties: 'State Public Works Department (fictional), NorthStar Infrastructure Ltd. (fictional contractor), District Project Approval Committee (fictional)',
};

export const DEMO_RECEIPT_FIXTURE = {
  caseReference: 'VP-SEED-0001',
  trackingSecret: 'TRK-E9F2-8C3A-1B7D',
  submittedAt: '2026-08-04T11:15:00Z',
  attachmentCount: 3,
  proofStatus: 'confirmed' as const,
  proofTransactionRef: '0x8f3a2c1d7e6b4a9f5c0e3d2a1b8f7e6d5c4a3b2f1e0d9c8b7a6f5e4d3c2b1a',
  blockchainNetwork: 'Polygon Amoy Testnet',
  blockTimestamp: '2026-08-04T11:15:22Z',
  contractAddress: '0xVP1ProofContract0000000000000000000000',
  evidenceCommitment: '0xSHA3EvidenceHash000000000000000000000000000000000000000000000000',
};

export const DEMO_MODIFIED_RECEIPT_FIXTURE = {
  ...DEMO_RECEIPT_FIXTURE,
  proofTransactionRef: 'DEMO-PROOF-SEED-001-A1B2C3-MODIFIED',
};
