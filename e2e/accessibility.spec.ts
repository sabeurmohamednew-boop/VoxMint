import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

function wavBuffer(durationMs = 4_000): Buffer {
  const sampleRate = 8_000; const samples = Math.floor(durationMs / 1000 * sampleRate); const dataSize = samples * 2; const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write("WAVE", 8); buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(dataSize, 40); return buffer;
}

async function assertAccessible(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")), `${path} serious accessibility violations`).toEqual([]);
}

test("public pages have no serious automated accessibility violations", async ({ page }) => {
  for (const path of ["/", "/help", "/privacy", "/terms", "/acceptable-use"]) await assertAccessible(page, path);
});

test("authenticated workspace pages have no serious automated accessibility violations", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in as Test User A" }).click();
  for (const path of ["/dashboard", "/voices", "/history", "/settings", "/usage", "/status"]) await assertAccessible(page, path);
});

test("core controls, menus, and dialogs remain keyboard reachable", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 844 });
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in as Test User A" }).click();
  await page.goto("/dashboard");
  const navigationTrigger = page.getByRole("button", { name: "Open navigation" });
  await navigationTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigationTrigger).toBeFocused();

  await page.goto("/voices/new");
  const upload = page.locator('input[type="file"]');
  await upload.focus();
  await expect(upload).toBeFocused();
  await upload.setInputFiles({ name: "keyboard.wav", mimeType: "audio/wav", buffer: wavBuffer() });
  await page.getByLabel("Voice name").fill("Keyboard Voice");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Clone Voice" }).click();

  const voiceSelector = page.getByRole("combobox", { name: "Select voice" });
  await voiceSelector.focus();
  await expect(voiceSelector).toBeFocused();
  await page.getByLabel("Enter text").fill("Keyboard accessible generation.");
  const generate = page.getByRole("button", { name: "Generate Voiceover" });
  await generate.focus();
  await expect(generate).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Voiceover generated")).toBeVisible();
  const play = page.getByRole("button", { name: "Play audio" });
  await play.focus();
  await expect(play).toBeFocused();

  await page.goto("/history");
  const details = page.getByRole("button", { name: /View details/ }).first();
  await details.focus();
  await expect(details).toBeFocused();
  const remove = page.getByRole("button", { name: /Delete Keyboard accessible generation/i }).first();
  await remove.click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(remove).toBeFocused();

  await page.goto("/settings");
  await page.getByRole("button", { name: "Open account menu" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();

  await page.goto("/voices");
  await page.getByRole("button", { name: "Actions for Keyboard Voice" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete voice" }).click();
  await expect(page.getByText("Voice deleted")).toBeVisible();
});
