import { describe, expect, it } from "vitest";
import { InvalidByteRangeError, parseByteRange } from "@/lib/http/byte-range";

describe("byte range parsing", () => {
  it("supports full, open-ended, and suffix ranges", () => {
    expect(parseByteRange(null, 100)).toBeNull();
    expect(parseByteRange("bytes=0-31", 100)).toEqual({ start: 0, end: 31 });
    expect(parseByteRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 });
    expect(parseByteRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
  });
  it.each(["bytes=100-101", "bytes=20-10", "items=0-1", "bytes=0-1,4-5"])("rejects %s", (value) => {
    expect(() => parseByteRange(value, 100)).toThrow(InvalidByteRangeError);
  });
});
