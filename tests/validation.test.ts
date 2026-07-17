import { describe, expect, it } from "vitest";
import { cloneMetadataSchema, generationSchema, languageSchema, voiceNameSchema } from "@/lib/validation/schemas";

describe("voice name validation", () => {
  it.each(["Studio Voice", "Voix Française", "Maya's Voice", "Voice-02"])("accepts %s", (name) => {
    expect(voiceNameSchema.parse(name)).toBe(name);
  });

  it.each(["!", "-name", "name-", "a", "<script>", "   "])("rejects %s", (name) => {
    expect(voiceNameSchema.safeParse(name).success).toBe(false);
  });
});

describe("generation validation", () => {
  const schema = generationSchema(20);
  const valid = { voiceId: "cm00000000000000000000000", language: "en", style: "normal", idempotencyKey: "request_123" };
  it("normalizes line endings and whitespace", () => {
    expect(schema.parse({ ...valid, text: "  hello\r\nworld  " }).text).toBe("hello\nworld");
  });
  it("enforces the configured character limit", () => {
    expect(schema.safeParse({ ...valid, text: "x".repeat(21) }).success).toBe(false);
  });
});

describe("language validation", () => {
  it.each(["en", "fr", "ar", "hi"])("accepts supported language %s", (language) => {
    expect(languageSchema.parse(language)).toBe(language);
  });

  it("accepts Hindi for cloning and generation", () => {
    expect(cloneMetadataSchema.parse({
      name: "Hindi Narration",
      language: "hi",
      consent: "true",
    }).language).toBe("hi");
    expect(generationSchema(20).parse({
      voiceId: "cm00000000000000000000000",
      text: "नमस्ते",
      language: "hi",
      style: "normal",
      idempotencyKey: "hindi_request",
    }).language).toBe("hi");
  });

  it("still rejects unsupported language codes", () => {
    expect(languageSchema.safeParse("xx").success).toBe(false);
  });
});
