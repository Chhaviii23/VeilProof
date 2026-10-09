// Object-envelope v1 and commitment v1, implemented with Web Crypto to match the Python
// backend byte-for-byte. No custom cryptographic primitives.

const AAD_PREFIX = new TextEncoder().encode('VEILPROOF_OBJECT_V1\0');
const COMMIT_DOMAIN_TAG = new TextEncoder().encode('VEILPROOF_COMMITMENT_V1');

export const KIND_ORIGINAL = 0x01;
export const KIND_DERIVATIVE = 0x02;

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export function b64uEncode(data: Uint8Array): string {
  let binary = '';
  for (const b of data) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64uDecode(value: string): Uint8Array {
  const pad = '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data as BufferSource);
  return bytesToHex(new Uint8Array(digest));
}

function u64be(n: number): Uint8Array {
  const out = new Uint8Array(8);
  let v = n;
  for (let i = 7; i >= 0; i--) {
    out[i] = v & 0xff;
    v = Math.floor(v / 256);
  }
  return out;
}

export function buildAad(operatorId: string, objectId: string, versionId: string, kind: number, plaintextLength: number): Uint8Array {
  return concat(
    AAD_PREFIX,
    uuidToBytes(operatorId),
    uuidToBytes(objectId),
    uuidToBytes(versionId),
    new Uint8Array([kind]),
    u64be(plaintextLength),
  );
}

export function newNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

export function newDek(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

async function importAesKey(dek: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', dek as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function sealAesGcm(plaintext: Uint8Array, dek: Uint8Array, nonce: Uint8Array, aad: Uint8Array): Promise<Uint8Array> {
  const key = await importAesKey(dek);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource, additionalData: aad as BufferSource, tagLength: 128 },
    key,
    plaintext as BufferSource,
  );
  return new Uint8Array(ct);
}

export function pemToDer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '');
  const binary = atob(body);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out.buffer;
}

export async function importBrokerKey(publicKeyPem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    pemToDer(publicKeyPem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
}

export async function wrapDek(dek: Uint8Array, brokerKey: CryptoKey): Promise<Uint8Array> {
  const wrapped = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, brokerKey, dek as BufferSource);
  return new Uint8Array(wrapped);
}

export interface Envelope {
  v: number;
  alg: string;
  wrap: string;
  key_id: string;
  nonce: string;
  wrapped_dek: string;
  aad: { op: string; obj: string; ver: string; kind: number; plen: number };
  ct_len: number;
  ct_sha256: string;
}

export async function makeEnvelope(args: {
  keyId: string;
  operatorId: string;
  objectId: string;
  versionId: string;
  kind: number;
  plaintext: Uint8Array;
  brokerKeyPem: string;
}): Promise<{ envelope: Envelope; ciphertext: Uint8Array; plaintextSha256: string }> {
  const dek = newDek();
  const nonce = newNonce();
  const aad = buildAad(args.operatorId, args.objectId, args.versionId, args.kind, args.plaintext.length);
  const ciphertext = await sealAesGcm(args.plaintext, dek, nonce, aad);
  const brokerKey = await importBrokerKey(args.brokerKeyPem);
  const wrapped = await wrapDek(dek, brokerKey);
  const envelope: Envelope = {
    v: 1,
    alg: 'A256GCM',
    wrap: 'RSA-OAEP-256',
    key_id: args.keyId,
    nonce: b64uEncode(nonce),
    wrapped_dek: b64uEncode(wrapped),
    aad: {
      op: args.operatorId,
      obj: args.objectId,
      ver: args.versionId,
      kind: args.kind,
      plen: args.plaintext.length,
    },
    ct_len: ciphertext.length,
    ct_sha256: await sha256Hex(ciphertext),
  };
  return { envelope, ciphertext, plaintextSha256: await sha256Hex(args.plaintext) };
}

export async function computeCommitment(args: {
  kind: number;
  salt: Uint8Array;
  caseNonce: Uint8Array;
  versionNonce: Uint8Array;
  originalHash: Uint8Array;
  protectedHash: Uint8Array;
}): Promise<string> {
  const domain = new Uint8Array(await crypto.subtle.digest('SHA-256', COMMIT_DOMAIN_TAG as BufferSource));
  const preimage = concat(
    domain,
    new Uint8Array([args.kind]),
    args.salt,
    args.caseNonce,
    args.versionNonce,
    args.originalHash,
    args.protectedHash,
  );
  if (preimage.length !== 193) throw new Error('commitment preimage must be 193 bytes');
  return sha256Hex(preimage);
}
