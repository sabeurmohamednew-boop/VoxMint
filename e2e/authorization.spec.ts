import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, user: "A" | "B") {
  await page.goto("/login");
  await page.getByRole("button", { name: `Sign in as Test User ${user}` }).click();
  await expect(page).toHaveURL(/dashboard/);
}

function wavBuffer(durationMs = 4_000): Buffer {
  const sampleRate = 8_000; const samples = Math.floor(durationMs / 1000 * sampleRate); const dataSize = samples * 2; const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write("WAVE", 8); buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(dataSize, 40); return buffer;
}

test("two isolated users cannot read or mutate each other's objects", async ({ browser }) => {
  const contextA = await browser.newContext(); const pageA = await contextA.newPage();
  await signIn(pageA, "A");
  await pageA.goto("/voices/new");
  await pageA.locator('input[type="file"]').setInputFiles({ name: "authorized.wav", mimeType: "audio/wav", buffer: wavBuffer() });
  await pageA.getByLabel("Voice name").fill("User A Private Voice");
  await pageA.getByRole("checkbox").check();
  await pageA.getByRole("button", { name: "Clone Voice" }).click();
  await expect(pageA).toHaveURL(/voice=/);
  const voiceId = new URL(pageA.url()).searchParams.get("voice");
  expect(voiceId).toBeTruthy();
  await pageA.getByLabel("Enter text").fill("Private generation owned by test user A.");
  await pageA.getByRole("button", { name: "Generate Voiceover" }).click();
  await expect(pageA.getByText("Voiceover generated")).toBeVisible();
  const audioUrl = await pageA.locator("audio").getAttribute("src");
  expect(audioUrl).toMatch(/generation-audio/);
  const generationId = audioUrl!.split("/").pop()!;

  const contextB = await browser.newContext(); const pageB = await contextB.newPage();
  await signIn(pageB, "B");
  await pageB.goto("/voices");
  await expect(pageB.getByText("User A Private Voice")).toHaveCount(0);
  const request = contextB.request;
  const headers = { origin: "http://127.0.0.1:3000", "sec-fetch-site": "same-origin" };
  for (const response of [
    await request.get(`/api/voices/${voiceId}`),
    await request.get(`/api/generations/${generationId}`),
    await request.get(`/api/generation-audio/${generationId}`),
    await request.head(`/api/generation-audio/${generationId}`),
    await request.patch(`/api/voices/${voiceId}`, { headers, data: { name: "Attack Rename" } }),
    await request.patch(`/api/generations/${generationId}`, { headers, data: { title: "Attack Rename" } }),
  ]) expect(response.status()).toBe(404);
  expect((await request.delete(`/api/voices/${voiceId}`, { headers })).status()).toBe(204);
  expect((await request.delete(`/api/generations/${generationId}`, { headers })).status()).toBe(204);
  const generate = await request.post("/api/generations", { headers, data: { voiceId, text: "cross user attempt", language: "en", style: "normal", idempotencyKey: "cross_user_attempt_123" } });
  expect(generate.status()).toBe(404);
  await contextA.close(); await contextB.close();
});
