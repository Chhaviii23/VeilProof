// Browser-side JPEG Privacy Guardian: read supported EXIF metadata and produce a
// metadata-minimized derivative by re-encoding pixels (no EXIF). This is NOT visible-content
// anonymization. Matches the backend's supported-field limits.

export interface MetadataFinding {
  field: string;
  value: string;
  risk: 'high' | 'medium' | 'low';
}

export interface LocalProtection {
  originalBytes: Uint8Array;
  derivativeBytes: Uint8Array;
  findings: MetadataFinding[];
  removedFields: string[];
  width: number;
  height: number;
}

const ASCII_TAGS: Record<number, [string, MetadataFinding['risk']]> = {
  0x010f: ['Device make', 'medium'],
  0x0110: ['Device model', 'medium'],
  0x0131: ['Software', 'medium'],
  0x0132: ['DateTime', 'medium'],
  0x013b: ['Artist', 'high'],
  0x9003: ['DateTimeOriginal', 'medium'],
  0x8298: ['Copyright', 'medium'],
};

function readExif(bytes: Uint8Array): MetadataFinding[] {
  // Locate APP1 Exif segment.
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return [];
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (marker === 0xe1) {
      const segStart = offset + 4;
      const header = new TextDecoder().decode(bytes.slice(segStart, segStart + 6));
      if (header === 'Exif\0\0') {
        return parseTiff(bytes.slice(segStart + 6, segStart + 2 + size));
      }
    }
    if (marker === 0xda) break; // start of scan
    offset += 2 + size;
  }
  return [];
}

function parseTiff(tiff: Uint8Array): MetadataFinding[] {
  if (tiff.length < 8) return [];
  const little = tiff[0] === 0x49 && tiff[1] === 0x49;
  const u16 = (o: number) => (little ? tiff[o] | (tiff[o + 1] << 8) : (tiff[o] << 8) | tiff[o + 1]);
  const u32 = (o: number) =>
    little
      ? tiff[o] | (tiff[o + 1] << 8) | (tiff[o + 2] << 16) | (tiff[o + 3] << 24)
      : (tiff[o] << 24) | (tiff[o + 1] << 16) | (tiff[o + 2] << 8) | tiff[o + 3];
  if (u16(2) !== 0x2a) return [];
  const ifd0 = u32(4);
  const findings: MetadataFinding[] = [];
  let gpsOffset = 0;
  const count = u16(ifd0);
  for (let i = 0; i < count; i++) {
    const entry = ifd0 + 2 + i * 12;
    const tag = u16(entry);
    const type = u16(entry + 2);
    const n = u32(entry + 4);
    if (tag === 0x8825) {
      gpsOffset = u32(entry + 8);
      continue;
    }
    if (ASCII_TAGS[tag] && type === 2) {
      const len = n;
      let valueOffset = entry + 8;
      if (len > 4) valueOffset = u32(entry + 8);
      const raw = tiff.slice(valueOffset, valueOffset + Math.max(0, len - 1));
      const value = new TextDecoder().decode(raw).trim();
      if (value) findings.push({ field: ASCII_TAGS[tag][0], value, risk: ASCII_TAGS[tag][1] });
    }
  }
  if (gpsOffset) {
    const gps = readGps(tiff, gpsOffset, little, u16, u32);
    if (gps) findings.push(gps);
  }
  return findings;
}

function readGps(
  tiff: Uint8Array,
  gpsOffset: number,
  little: boolean,
  u16: (o: number) => number,
  u32: (o: number) => number,
): MetadataFinding | null {
  const count = u16(gpsOffset);
  const values: Record<number, number[]> = {};
  const refs: Record<number, string> = {};
  for (let i = 0; i < count; i++) {
    const entry = gpsOffset + 2 + i * 12;
    const tag = u16(entry);
    const type = u16(entry + 2);
    const n = u32(entry + 4);
    if (tag === 1 || tag === 3) {
      refs[tag] = String.fromCharCode(tiff[entry + 8]);
    } else if (tag === 2 || tag === 4) {
      const vo = u32(entry + 8);
      const nums: number[] = [];
      if (type === 5) {
        for (let k = 0; k < Math.min(n, 3); k++) {
          const num = u32(vo + k * 8);
          const den = u32(vo + k * 8 + 4) || 1;
          nums.push(num / den);
        }
      }
      values[tag] = nums;
    }
  }
  const toDecimal = (parts: number[] | undefined, ref: string | undefined) => {
    if (!parts || parts.length !== 3) return null;
    let v = parts[0] + parts[1] / 60 + parts[2] / 3600;
    if (ref === 'S' || ref === 'W') v = -v;
    return v;
  };
  const lat = toDecimal(values[2], refs[1]);
  const lon = toDecimal(values[4], refs[3]);
  if (lat === null || lon === null) return null;
  return { field: 'GPS coordinates', value: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, risk: 'high' };
}

export async function protectJpeg(file: File): Promise<LocalProtection> {
  const originalBytes = new Uint8Array(await file.arrayBuffer());
  const findings = readExif(originalBytes);

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.92),
  );
  const derivativeBytes = new Uint8Array(await blob.arrayBuffer());

  return {
    originalBytes,
    derivativeBytes,
    findings,
    removedFields: Array.from(new Set(findings.map((f) => f.field))),
    width: bitmap.width,
    height: bitmap.height,
  };
}
