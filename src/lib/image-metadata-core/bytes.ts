export class MetadataError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "MetadataError";
  }
}

export function asBytes(buffer: ArrayBuffer) {
  return new Uint8Array(buffer);
}

export function assertRange(bytes: Uint8Array, offset: number, length: number) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > bytes.length) {
    throw new MetadataError("malformed_container", "The image metadata structure is incomplete or damaged.");
  }
}

export function readU16BE(bytes: Uint8Array, offset: number) {
  assertRange(bytes, offset, 2);
  return (bytes[offset] << 8) | bytes[offset + 1];
}

export function readU32BE(bytes: Uint8Array, offset: number) {
  assertRange(bytes, offset, 4);
  return (((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]) >>> 0;
}

export function readU32LE(bytes: Uint8Array, offset: number) {
  assertRange(bytes, offset, 4);
  return (bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16) + ((bytes[offset + 3] << 24) >>> 0)) >>> 0;
}

export function text(bytes: Uint8Array, offset = 0, length = bytes.length - offset) {
  assertRange(bytes, offset, length);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(offset, offset + length));
}

export function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function u32be(value: number) {
  return new Uint8Array([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]);
}
