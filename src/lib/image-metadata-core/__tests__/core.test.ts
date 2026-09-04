import { describe, expect, it } from "vitest";
import { cleanImage } from "../clean";
import { scanImage } from "../scan";
import { verifyClean } from "../verify";

const encoder = new TextEncoder();

function concat(...parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function u32(value: number) {
  return new Uint8Array([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]);
}

function u16le(value: number) { return new Uint8Array([value & 255, (value >>> 8) & 255]); }
function u32le(value: number) { return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]); }

function gpsTiffFixture() {
  const header = concat(encoder.encode("II"), u16le(42), u32le(8));
  const orientation = concat(u16le(0x0112), u16le(3), u32le(1), u16le(6), u16le(0));
  const gpsPointer = concat(u16le(0x8825), u16le(4), u32le(1), u32le(38));
  const ifd0 = concat(u16le(2), orientation, gpsPointer, u32le(0));
  const gpsEntry = concat(u16le(0x0002), u16le(5), u32le(3), u32le(56));
  const gpsIfd = concat(u16le(1), gpsEntry, u32le(0));
  const rationals = concat(u32le(1), u32le(1), u32le(2), u32le(1), u32le(3), u32le(1));
  return concat(header, ifd0, gpsIfd, rationals);
}

function jpegWithGps() {
  return concat(new Uint8Array([0xff, 0xd8]), jpegSegment(0xe1, concat(encoder.encode("Exif\0\0"), gpsTiffFixture())), new Uint8Array([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9])).buffer;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array) {
  const name = encoder.encode(type);
  return concat(u32(data.length), name, data, u32(crc32(concat(name, data))));
}

function pngFixture(entries: Array<[string, string]>) {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
  const texts = entries.map(([key, value]) => pngChunk("tEXt", encoder.encode(`${key}\0${value}`)));
  return concat(signature, pngChunk("IHDR", ihdr), ...texts, pngChunk("IDAT", new Uint8Array()), pngChunk("IEND", new Uint8Array())).buffer;
}

function pngWithExif() {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
  return concat(signature, pngChunk("IHDR", ihdr), pngChunk("eXIf", gpsTiffFixture()), pngChunk("IDAT", new Uint8Array()), pngChunk("IEND", new Uint8Array())).buffer;
}

function jpegSegment(marker: number, payload: Uint8Array) {
  const size = payload.length + 2;
  return concat(new Uint8Array([0xff, marker, (size >>> 8) & 255, size & 255]), payload);
}

function jpegFixture() {
  const xmp = encoder.encode("http://ns.adobe.com/xap/1.0/\0<rdf><workflow>secret graph</workflow><seed>42</seed></rdf>");
  const icc = encoder.encode("ICC_PROFILE\0demo-profile");
  const app11 = encoder.encode("unrelated-app11-payload");
  return concat(
    new Uint8Array([0xff, 0xd8]),
    jpegSegment(0xe1, xmp),
    jpegSegment(0xe2, icc),
    jpegSegment(0xeb, app11),
    new Uint8Array([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]),
  ).buffer;
}

function webpFixture() {
  const payload = encoder.encode("Exif\0\0camera");
  const padded = payload.length % 2 ? concat(payload, new Uint8Array([0])) : payload;
  const chunk = concat(encoder.encode("EXIF"), new Uint8Array([payload.length, 0, 0, 0]), padded);
  const size = 4 + chunk.length;
  return concat(
    encoder.encode("RIFF"),
    new Uint8Array([size, 0, 0, 0]),
    encoder.encode("WEBP"),
    chunk,
  ).buffer;
}

describe("magic-byte image metadata core", () => {
  it("rejects a text payload even when a filename might claim it is an image", async () => {
    await expect(scanImage(encoder.encode("not an image").buffer)).rejects.toMatchObject({ code: "invalid_file" });
  });

  it("finds AI workflow data in PNG without treating Software alone as removable", async () => {
    const scan = await scanImage(pngFixture([["parameters", "steps=30 seed=42"], ["Software", "Photoshop"]]));
    expect(scan.format).toBe("png");
    expect(scan.properties.hasTransparency).toBe(true);
    expect(scan.findings.map((finding) => [finding.rawKey, finding.status])).toEqual([
      ["parameters", "action"],
      ["Software", "review"],
    ]);
  });

  it("removes only the targeted PNG text chunk and preserves transparency", async () => {
    const input = pngFixture([["parameters", "steps=30 seed=42"], ["Software", "Photoshop"]]);
    const result = await cleanImage(input, { mode: "ai_workflow", removeC2pa: false, removeColorProfile: false });
    expect(result.ok).toBe(true);
    const output = await scanImage(result.output!);
    expect(output.findings.map((finding) => finding.rawKey)).toEqual(["Software"]);
    expect(output.properties.hasTransparency).toBe(true);
  });

  it("finds and removes PNG eXIf GPS data without touching alpha", async () => {
    const input = pngWithExif();
    expect((await scanImage(input)).findings.some((finding) => finding.category === "location")).toBe(true);
    const clean = await cleanImage(input, { mode: "privacy", removeC2pa: false, removeColorProfile: false });
    const output = await scanImage(clean.output!);
    expect(output.findings.some((finding) => finding.category === "location")).toBe(false);
    expect(output.properties.hasTransparency).toBe(true);
    expect(output.properties.orientation).toBe(6);
  });

  it("preserves JPEG ICC and non-C2PA APP11 while removing standalone workflow XMP", async () => {
    const input = jpegFixture();
    const result = await cleanImage(input, { mode: "ai_workflow", removeC2pa: false, removeColorProfile: false });
    expect(result.ok).toBe(true);
    const bytes = new Uint8Array(result.output!);
    const text = new TextDecoder().decode(bytes);
    expect(text).not.toContain("secret graph");
    expect(text).toContain("ICC_PROFILE");
    expect(text).toContain("unrelated-app11-payload");
  });

  it("removes referenced GPS values in Privacy Clean while preserving orientation", async () => {
    const input = jpegWithGps();
    const before = await scanImage(input);
    expect(before.findings.some((finding) => finding.category === "location")).toBe(true);
    expect(before.properties.orientation).toBe(6);
    const result = await cleanImage(input, { mode: "privacy", removeC2pa: false, removeColorProfile: false });
    expect(result.ok).toBe(true);
    const output = await scanImage(result.output!);
    expect(output.findings.some((finding) => finding.category === "location")).toBe(false);
    expect(output.properties.orientation).toBe(6);
  });

  it("never removes an APP11 segment merely because its text mentions c2pa", async () => {
    const payload = encoder.encode("notes about c2pa are not a JUMBF manifest");
    const input = concat(new Uint8Array([0xff, 0xd8]), jpegSegment(0xeb, payload), new Uint8Array([0xff, 0xda, 0x00, 0x02, 1, 2, 0xff, 0xd9])).buffer;
    const result = await cleanImage(input, { mode: "full", removeC2pa: true, removeColorProfile: false });
    expect(new TextDecoder().decode(result.output!)).toContain("notes about c2pa");
  });

  it("scans WebP metadata but refuses to clean it", async () => {
    const input = webpFixture();
    expect((await scanImage(input)).cleanSupport).toBe("scan_only");
    await expect(cleanImage(input, { mode: "full", removeC2pa: false, removeColorProfile: false })).resolves.toMatchObject({
      ok: false,
      errorCode: "webp_clean_disabled",
    });
  });

  it("derives verification from a fresh output scan", async () => {
    const input = pngFixture([["parameters", "secret"], ["Software", "Editor"]]);
    const before = await scanImage(input);
    const clean = await cleanImage(input, { mode: "ai_workflow", removeC2pa: false, removeColorProfile: false });
    const verified = await verifyClean(before, clean.output!, { mode: "ai_workflow", removeC2pa: false, removeColorProfile: false });
    expect(verified.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "AI generation parameters", after: "removed" }),
      expect.objectContaining({ label: "Editing software", after: "preserved" }),
    ]));
    expect(verified.transparencyPreserved).toBe(true);
  });
});
