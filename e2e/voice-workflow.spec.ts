import { expect, test } from "@playwright/test";

function wavBuffer(durationMs = 4_000): Buffer {
  const sampleRate = 8_000; const sampleCount = Math.floor((durationMs / 1000) * sampleRate); const dataSize = sampleCount * 2; const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write("WAVE", 8); buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(dataSize, 40); return buffer;
}

test("permitted voice creation and generation workflow", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Enter demo workspace" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.locator('input[type="file"]').setInputFiles({ name: "owned-voice.wav", mimeType: "audio/wav", buffer: wavBuffer() });
  await page.getByLabel("Voice name").fill(`E2E Voice ${Date.now()}`);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Clone Voice" }).click();
  await expect(page.getByText("Voice created")).toBeVisible();
  await page.getByLabel("Enter text").fill("This is a VoxMint end to end test.");
  await page.getByRole("button", { name: "Generate Voiceover" }).click();
  await expect(page.getByText("Voiceover generated")).toBeVisible();
  await expect(page.getByRole("link", { name: "Download" })).toBeVisible();
  await page.goto("/history");
  await expect(page.getByText(/end to end test/i)).toBeVisible();
});

test("protected routes redirect a signed-out user", async ({ browser }) => {
  const context = await browser.newContext(); const page = await context.newPage();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  await context.close();
});
