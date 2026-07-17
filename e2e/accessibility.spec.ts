import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  fillVoiceCreationForm,
  generateTestVoiceover,
  openVoiceCreationForm,
  signInAsTestUser,
  submitVoiceCreation,
} from "./test-helpers";

async function assertAccessible(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")), `${path} serious accessibility violations`).toEqual([]);
}

test("public pages have no serious automated accessibility violations", async ({ page }) => {
  for (const path of ["/", "/help", "/privacy", "/terms", "/acceptable-use"]) await assertAccessible(page, path);
});

test("authenticated workspace pages have no serious automated accessibility violations", async ({ page }) => {
  await signInAsTestUser(page, "A");
  for (const path of ["/dashboard", "/voices", "/history?provider=mock", "/settings", "/usage", "/status"]) await assertAccessible(page, path);
});

test("core controls, menus, and dialogs remain keyboard reachable", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 844 });
  await signInAsTestUser(page, "A");
  const navigationTrigger = page.getByRole("button", { name: "Open navigation" });
  await navigationTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigationTrigger).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigationTrigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  const voicePanel = await openVoiceCreationForm(page);
  const uploadZone = voicePanel.getByRole("button", { name: "Choose or drop an audio sample" });
  await uploadZone.focus();
  await expect(uploadZone).toBeFocused();
  const chooserPromise = page.waitForEvent("filechooser");
  await uploadZone.press("Enter");
  const chooser = await chooserPromise;
  expect(chooser.isMultiple()).toBe(false);
  const cloneButton = await fillVoiceCreationForm(page, {
    name: "Keyboard Voice",
    fileName: "keyboard.wav",
  });
  await submitVoiceCreation(page, cloneButton, "Keyboard Voice");

  const voiceSelector = page.getByRole("combobox", { name: "Select voice" });
  await voiceSelector.focus();
  await expect(voiceSelector).toBeFocused();
  await generateTestVoiceover(page, "Keyboard accessible generation.", {
    activation: "keyboard",
  });
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
  const notifications = page.getByRole("region", { name: "Notifications (F8)" });
  await expect(notifications.getByRole("listitem").getByText("Voice deleted", { exact: true })).toBeVisible();
});
