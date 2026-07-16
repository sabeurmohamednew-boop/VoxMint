export class InvalidByteRangeError extends Error {
  constructor() {
    super("The requested byte range cannot be served.");
    this.name = "InvalidByteRangeError";
  }
}

export type ByteRange = { start: number; end: number };

export function parseByteRange(value: string | null, size: number): ByteRange | null {
  if (!value) return null;
  if (!Number.isSafeInteger(size) || size <= 0 || !value.startsWith("bytes=") || value.includes(",")) {
    throw new InvalidByteRangeError();
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) throw new InvalidByteRangeError();
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) throw new InvalidByteRangeError();
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || start >= size || requestedEnd < start) {
    throw new InvalidByteRangeError();
  }
  return { start, end: Math.min(requestedEnd, size - 1) };
}
