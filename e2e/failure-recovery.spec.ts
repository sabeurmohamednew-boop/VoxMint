import { expect, test } from "@playwright/test";

function wavBuffer(durationMs = 4_000): Buffer {
  const sampleRate = 8_000; const samples = Math.floor(durationMs / 1000 * sampleRate); const dataSize = samples * 2; const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write("WAVE", 8); buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(dataSize, 40); return buffer;
}

test("provider, storage, and finalization failures release usage; duplicate requests finalize once", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in as Test User B" }).click();
  await page.goto("/voices/new");
  await page.locator('input[type="file"]').setInputFiles({ name: "failure-test.wav", mimeType: "audio/wav", buffer: wavBuffer() });
  await page.getByLabel("Voice name").fill("Failure Recovery Voice");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Clone Voice" }).click();
  await expect(page).toHaveURL(/voice=/);
  const voiceId = new URL(page.url()).searchParams.get("voice")!;

  const usageBefore = await page.evaluate(async () => (await fetch("/api/usage")).json());
  const failureCases = [
    ["database-before-provider", 500],
    ["provider-authentication", 502],
    ["provider-rate-limit", 502],
    ["provider-timeout", 502],
    ["provider-empty-audio", 502],
    ["provider-malformed-audio", 502],
    ["storage", 500],
    ["db-finalize", 500],
  ] as const;
  for (const [mode, expectedStatus] of failureCases) {
    const status = await page.evaluate(async ({ voiceId, mode }) => {
      const response = await fetch("/api/generations", { method: "POST", headers: { "content-type": "application/json", "x-e2e-failure": mode }, body: JSON.stringify({ voiceId, text: `Injected ${mode} failure`, language: "en", style: "normal", idempotencyKey: `failure_${mode.replace("-", "_")}_12345` }) });
      return response.status;
    }, { voiceId, mode });
    expect(status).toBe(expectedStatus);
  }
  const usageAfterFailures = await page.evaluate(async () => (await fetch("/api/usage")).json());
  expect(usageAfterFailures.usage.charactersUsed).toBe(usageBefore.usage.charactersUsed);

  const duplicateKey = `duplicate_${Date.now()}`;
  const duplicateResponses = await page.evaluate(async ({ voiceId, duplicateKey }) => Promise.all([0, 1].map(async () => {
    const response = await fetch("/api/generations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ voiceId, text: "One idempotent concurrent generation.", language: "en", style: "normal", idempotencyKey: duplicateKey }) });
    return { status: response.status, body: await response.json() };
  })), { voiceId, duplicateKey });
  expect(duplicateResponses.every((result) => result.status === 201)).toBe(true);
  const history = await page.evaluate(async () => (await fetch("/api/generations")).json());
  expect(history.generations.filter((item: { text: string }) => item.text === "One idempotent concurrent generation.")).toHaveLength(1);
  expect(history.generations.filter((item: { text: string; status: string }) => item.text.startsWith("Injected ") && item.status === "FAILED")).toHaveLength(7);
  const usageAfterSuccess = await page.evaluate(async () => (await fetch("/api/usage")).json());
  expect(usageAfterSuccess.usage.charactersUsed - usageAfterFailures.usage.charactersUsed).toBe("One idempotent concurrent generation.".length);

  for (const scenario of ["disconnect", "refresh"] as const) {
    const idempotencyKey = `${scenario}_${Date.now()}`;
    const text = `${scenario} recovery remains idempotent.`;
    await page.evaluate(({ voiceId, idempotencyKey, text, scenario }) => {
      const controller = new AbortController();
      void fetch("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json", "x-e2e-failure": "provider-delay" },
        body: JSON.stringify({ voiceId, text, language: "en", style: "normal", idempotencyKey }),
        signal: controller.signal,
      }).catch(() => undefined);
      if (scenario === "disconnect") setTimeout(() => controller.abort(), 40);
    }, { voiceId, idempotencyKey, text, scenario });
    await page.waitForTimeout(60);
    if (scenario === "refresh") await page.reload();
    const retryStatus = await page.evaluate(async ({ voiceId, idempotencyKey, text }) => (await fetch("/api/generations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ voiceId, text, language: "en", style: "normal", idempotencyKey }),
    })).status, { voiceId, idempotencyKey, text });
    expect(retryStatus).toBe(201);
    await page.waitForTimeout(400);
    const retryHistory = await page.evaluate(async () => (await fetch("/api/generations")).json());
    expect(retryHistory.generations.filter((item: { text: string }) => item.text === text)).toHaveLength(1);
  }
});
