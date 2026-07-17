// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assertUploadContentLength, MULTIPART_OVERHEAD_ALLOWANCE } from "@/lib/uploads/content-length";

describe("upload request size gate", () => {
  const maximum = 10 * 1024 * 1024;

  it("accepts a declared multipart request within the file cap and overhead", () => {
    expect(() => assertUploadContentLength(String(maximum + 1024), maximum)).not.toThrow();
  });

  it("rejects missing or malformed lengths before form parsing", () => {
    expect(() => assertUploadContentLength(null, maximum)).toThrow(expect.objectContaining({ status: 411 }));
    expect(() => assertUploadContentLength("not-a-size", maximum)).toThrow(expect.objectContaining({ status: 400 }));
  });

  it("rejects oversized multipart bodies", () => {
    expect(() => assertUploadContentLength(String(maximum + MULTIPART_OVERHEAD_ALLOWANCE + 1), maximum)).toThrow(expect.objectContaining({ status: 413 }));
  });
});
