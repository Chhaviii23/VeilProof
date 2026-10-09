// Cross-language check: reproduce the Python-frozen AES-GCM vector with Web Crypto.
// Run: node frontend/src/services/__vectors__/check-vectors.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const vectorPath = resolve(here, '../../../../backend/tests/vectors/object_envelope_v1.json');
const v = JSON.parse(readFileSync(vectorPath, 'utf8'));

const hexToBytes = (hex) => Uint8Array.from(hex.match(/../g).map((h) => parseInt(h, 16)));
const bytesToHex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

const AAD_PREFIX = new TextEncoder().encode('VEILPROOF_OBJECT_V1\0');
const uuidToBytes = (uuid) => {
  const hex = uuid.replace(/-/g, '');
  return Uint8Array.from(hex.match(/../g).map((h) => parseInt(h, 16)));
};
const u64be = (n) => {
  const out = new Uint8Array(8);
  let x = n;
  for (let i = 7; i >= 0; i--) { out[i] = x & 0xff; x = Math.floor(x / 256); }
  return out;
};

function buildAad(op, obj, ver, kind, plen) {
  const parts = [AAD_PREFIX, uuidToBytes(op), uuidToBytes(obj), uuidToBytes(ver), new Uint8Array([kind]), u64be(plen)];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

const plaintext = new TextEncoder().encode(v.plaintext);
const key = hexToBytes(v.key_hex);
const nonce = hexToBytes(v.nonce_hex);
const aad = buildAad(v.aad_op, v.aad_obj, v.aad_ver, v.aad_kind, v.plaintext_length);

if (bytesToHex(aad) !== v.aad_hex) {
  console.error('FAIL: AAD mismatch');
  process.exit(1);
}

const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
const ct = new Uint8Array(
  await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 }, cryptoKey, plaintext),
);

if (bytesToHex(ct) !== v.ciphertext_hex) {
  console.error('FAIL: AES-GCM ciphertext mismatch (cross-language interop broken)');
  console.error(' expected', v.ciphertext_hex);
  console.error(' actual  ', bytesToHex(ct));
  process.exit(1);
}
console.log('OK: Web Crypto reproduces the Python-frozen object-envelope v1 vector byte-for-byte.');
