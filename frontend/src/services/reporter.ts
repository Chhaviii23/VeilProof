// Reporter data adapter: local JPEG protection + real encryption/upload/finalize.
// Identity-selection mappings and draft values stay local and are never sent.

import type { ReportDraft } from '../types';
import { api } from './api';
import {
  KIND_DERIVATIVE,
  KIND_ORIGINAL,
  makeEnvelope,
  bytesToHex,
  sha256Hex,
} from './crypto';
import { type MetadataFinding } from './jpegProtect';
import { inferCategory } from './localAnalysis';

export type SubmitStage = 'prepare' | 'protect' | 'encrypt' | 'upload' | 'finalize';

export interface SubmitResult {
  caseId: string;
  caseReference: string;
  acceptedAt: string;
  attachmentCount: number;
  proofStatus: string;
  priority: string;
  trackingSecret: string;
  intakeCapability: string;
  protection: { metadataFieldsRemoved: number; findings: MetadataFinding[]; skipped: string[] };
}

function generateTrackingSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `TRK-${bytesToHex(bytes)}`;
}

async function uploadOne(
  intakeId: string,
  capability: string,
  broker: { key_id: string; operator_id: string; public_key_pem: string },
  kind: number,
  category: string,
  plaintext: Uint8Array,
  metadataRemoved: string[],
): Promise<string> {
  const reserve = await api.reserveObject(intakeId, capability, {
    kind: kind === KIND_ORIGINAL ? 'original' : 'derivative',
    category,
    expected_size: plaintext.length,
  });
  const built = await makeEnvelope({
    keyId: broker.key_id,
    operatorId: broker.operator_id,
    objectId: reserve.object_id,
    versionId: reserve.version_id,
    kind,
    plaintext,
    brokerKeyPem: broker.public_key_pem,
  });
  await api.uploadContent(intakeId, reserve.object_id, capability, built.ciphertext.buffer as ArrayBuffer);
  await api.completeObject(intakeId, reserve.object_id, capability, {
    ciphertext_digest: bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', built.ciphertext as BufferSource))),
    plaintext_sha256: built.plaintextSha256,
    plaintext_length: plaintext.length,
    envelope: built.envelope,
    provenance: 'real',
    metadata_removed: metadataRemoved,
  });
  return reserve.object_id;
}

// Keep a failed finalization retry in memory with the same intake and secret.
// A network failure after acceptance must not create a second report.
let pendingFinalize: { draft: ReportDraft; run: () => Promise<SubmitResult> } | undefined;

export async function submitReport(
  draft: ReportDraft,
  onStage?: (stage: SubmitStage) => void,
): Promise<SubmitResult> {
  if (pendingFinalize?.draft === draft) { onStage?.('finalize'); return pendingFinalize.run(); }
  onStage?.('prepare');
  const trackingSecret = generateTrackingSecret();
  const broker = await api.brokerKey();
  const intake = await api.createIntake();

  const bindings: Record<string, unknown>[] = [];
  const findings: MetadataFinding[] = [];
  const skipped: string[] = [];
  let removedCount = 0;

  for (const item of draft.evidence) {
    if (item.file) {
      if (!draft.identityProtectionApplied || !item.protectedBlob || !item.protectionReceipt || !item.protectedReviewed) {
        throw new Error('Review identity protection and generate each protected copy before submitting.');
      }
      const category = inferCategory(item.file);
      onStage?.('encrypt');
      const originalId = await uploadOne(intake.intake_id, intake.capability, broker,
        KIND_ORIGINAL, category, new Uint8Array(await item.file.arrayBuffer()), []);
      const derivativeId = await uploadOne(intake.intake_id, intake.capability, broker,
        KIND_DERIVATIVE, category, new Uint8Array(await item.protectedBlob.arrayBuffer()), ['metadata']);
      bindings.push({ original_object_id: originalId, derivative_object_id: derivativeId,
        category, display_label: `Evidence ${bindings.length + 1}`,
        protection_receipt: item.protectionReceipt });
      onStage?.('upload');
    } else if (item.type === 'link' && item.url) {
      const urlBytes = new TextEncoder().encode(item.url);
      const refId = await uploadOne(intake.intake_id, intake.capability, broker, KIND_ORIGINAL, 'reference', urlBytes, []);
      bindings.push({
        original_object_id: refId,
        derivative_object_id: null,
        category: 'reference',
        display_label: item.linkTitle ?? item.name,
      });
    } else {
      throw new Error(`Please reselect the evidence file: ${item.name}`);
    }
  }

  onStage?.('finalize');
  const finalize = async (): Promise<SubmitResult> => {
    const result = await api.finalize(intake.intake_id, intake.capability, draft.idempotencyKey, {
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category || 'other',
      incident_date: draft.incidentDate || null,
      location: draft.location || null,
      involved_parties: draft.involvedParties || null,
      risk_factors: draft.riskFactors.filter(r => r !== 'no_risk'),
      no_immediate_risk: draft.riskFactors.length === 0 || draft.riskFactors.includes('no_risk'),
      objects: bindings,
      tracking_secret: trackingSecret,
    });

    return {
      caseId: result.case_id,
      caseReference: result.case_reference,
      acceptedAt: result.accepted_at,
      attachmentCount: result.attachment_count,
      proofStatus: result.proof_status,
      priority: result.priority,
      trackingSecret,
      intakeCapability: intake.capability,
      protection: { metadataFieldsRemoved: removedCount, findings, skipped },
    };
  };
  pendingFinalize = { draft, run: finalize };
  return finalize();
}

export async function trackComplaint(caseReference: string, trackingSecret: string) {
  const session = await api.createTrackingSession(caseReference, trackingSecret);
  const status = await api.trackingStatus(session.session_token);
  return { sessionToken: session.session_token, status };
}

export async function fetchProofPackage(sessionToken: string) {
  return (await api.proofPackage(sessionToken)).package;
}

export async function verifyProofPackage(
  pkg: Record<string, unknown>,
  candidates: { original_sha256?: string; protected_sha256?: string },
) {
  return api.verifyProof(pkg, candidates);
}

export { sha256Hex };
