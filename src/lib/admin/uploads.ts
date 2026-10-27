export function detectUpload(bytes: Uint8Array, extension: string) {
  if (!bytes.length) return;
  const starts = (...magic: number[]) =>
    magic.every((value, index) => bytes[index] === value);
  const ext = extension.toLowerCase();
  if (["jpg", "jpeg"].includes(ext) && starts(0xff, 0xd8, 0xff))
    return { ext: "jpg", type: "image/jpeg" };
  if (ext === "png" && starts(137, 80, 78, 71, 13, 10, 26, 10))
    return { ext, type: "image/png" };
  const ascii = new TextDecoder().decode(bytes.slice(0, 12));
  if (ext === "webp" && ascii.startsWith("RIFF") && ascii.slice(8) === "WEBP")
    return { ext, type: "image/webp" };
  if (ext === "pdf" && ascii.startsWith("%PDF-"))
    return { ext, type: "application/pdf" };
  if (["zip", "docx", "pptx"].includes(ext) && starts(0x50, 0x4b, 0x03, 0x04))
    return { ext, type: "application/octet-stream" };
  if (ext === "txt") {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return { ext, type: "text/plain; charset=utf-8" };
    } catch {
      return;
    }
  }
}
