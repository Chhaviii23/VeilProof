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
import { protectJpeg, type MetadataFinding } from './jpegProtect';

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
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TRK-${seg()}-${seg()}-${seg()}`;
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

export async function submitReport(
  draft: ReportDraft,
  onStage?: (stage: SubmitStage) => void,
): Promise<SubmitResult> {
  onStage?.('prepare');
  const trackingSecret = generateTrackingSecret();
  const broker = await api.brokerKey();
  const intake = await api.createIntake();

  const bindings: Record<string, unknown>[] = [];
  const findings: MetadataFinding[] = [];
  const skipped: string[] = [];
  let removedCount = 0;

  for (const item of draft.evidence) {
    if (item.type === 'image/jpeg' && item.file) {
      onStage?.('protect');
      const protection = await protectJpeg(item.file);
      findings.push(...protection.findings);
      removedCount += protection.removedFields.length;
      onStage?.('encrypt');
      const originalId = await uploadOne(
        intake.intake_id, intake.capability, broker, KIND_ORIGINAL, 'image', protection.originalBytes, [],
      );
      const derivativeId = await uploadOne(
        intake.intake_id, intake.capability, broker, KIND_DERIVATIVE, 'image',
        protection.derivativeBytes, protection.removedFields,
      );
      bindings.push({
        original_object_id: originalId,
        derivative_object_id: derivativeId,
        category: 'image',
        display_label: item.sanitizedName ?? item.name,
      });
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
      // PDF/audio/video are not protected locally in this profile; they are recorded as
      // unavailable rather than uploaded as if they were sanitized.
      skipped.push(item.name);
    }
  }

  onStage?.('finalize');
  const result = await api.finalize(intake.intake_id, intake.capability, draft.idempotencyKey, {
    title: draft.title,
    description: draft.description,
    category: draft.category,
    incident_date: draft.incidentDate || null,
    location: draft.location || null,
    involved_parties: draft.involvedParties || null,
    risk_factors: draft.riskFactors,
    no_immediate_risk: draft.riskFactors.includes('no_risk'),
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
