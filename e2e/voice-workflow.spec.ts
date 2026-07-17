import { expect, test } from "@playwright/test";
import {
  createTestVoice,
  generateTestVoiceover,
  signInAsTestUser,
} from "./test-helpers";

function serviceStatusCeilingCard(page: import("@playwright/test").Page) {
  const main = page.getByRole("main");
  return main.locator("section").filter({
    has: page.getByRole("heading", { name: "Demo Provider configured ceiling" }),
  });
}

function notification(page: import("@playwright/test").Page, message: string) {
  return page
    .getByRole("region", { name: "Notifications (F8)" })
    .getByRole("listitem")
    .getByText(message, { exact: true });
}

test("permitted voice creation and generation workflow", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 844 });
  await signInAsTestUser(page);
  const voiceName = `E2E Voice ${Date.now()}`;
  await createTestVoice(page, { name: voiceName, fileName: "owned-voice.wav" });
  await generateTestVoiceover(page, "This is a VoxMint end to end test.");
  const downloadButton = page.getByRole("button", { name: "Download audio" });
  await expect(downloadButton).toBeVisible();
  const audioUrl = await page.locator("audio").getAttribute("src");
  expect(audioUrl).toBeTruthy();
  const audioChecks = await page.evaluate(async (url) => {
    const head = await fetch(url, { method: "HEAD" });
    const range = await fetch(url, { headers: { range: "bytes=0-15" } });
    const full = await fetch(url);
    return {
      headStatus: head.status,
      headType: head.headers.get("content-type"),
      rangeStatus: range.status,
      contentRange: range.headers.get("content-range"),
      rangeBytes: Array.from(new Uint8Array(await range.arrayBuffer())),
      fullType: full.headers.get("content-type"),
      fullBytes: Array.from(new Uint8Array(await full.arrayBuffer()).slice(0, 4)),
    };
  }, audioUrl!);
  expect(audioChecks).toMatchObject({ headStatus: 200, headType: "audio/wav", rangeStatus: 206, fullType: "audio/wav", fullBytes: [82, 73, 70, 70] });
  expect(audioChecks.contentRange).toMatch(/^bytes 0-15\//);
  expect(audioChecks.rangeBytes).toHaveLength(16);
  const downloadEvent = page.waitForEvent("download");
  await downloadButton.click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.wav$/);

  await page.goto("/voices");
  await page.getByRole("button", { name: `Actions for ${voiceName}` }).click();
  await page.getByRole("menuitem", { name: "Edit voice" }).click();
  await page.getByLabel("Voice name").fill(`${voiceName} Renamed`);
  await page.getByLabel("Description").fill("E2E description for distinguishing this voice.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(notification(page, "Voice updated")).toBeVisible();
  await expect(page.getByText("E2E description for distinguishing this voice.")).toBeVisible();

  await page.goto("/history");
  await expect(page).toHaveURL(/provider=mock/);
  const generationTitle = "This is a VoxMint end to end test.";
  const historyItem = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: generationTitle, exact: true }),
  });
  await expect(historyItem).toHaveCount(1);
  await expect(historyItem.getByRole("heading", { name: generationTitle, exact: true })).toBeVisible();
  await historyItem.getByRole("button", { name: `View details for ${generationTitle}` }).click();
  const details = page.locator('section[aria-labelledby="history-details-title"]');
  await expect(details.getByRole("heading", { name: generationTitle, exact: true })).toBeVisible();
  await expect(details.getByText(new RegExp(`E2E Voice .* Renamed`))).toBeVisible();
  await historyItem.getByRole("button", { name: `Delete ${generationTitle}` }).click();
  await page.getByRole("button", { name: "Delete audio and record" }).click();
  await expect(notification(page, "Stored audio and history record deleted")).toBeVisible();

  await page.goto("/voices");
  await page.getByRole("button", { name: new RegExp(`Actions for ${voiceName} Renamed`) }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete voice" }).click();
  await expect(notification(page, "Voice deleted")).toBeVisible();

  await page.goto("/settings");
  const preferences = page.getByRole("main").locator("section").filter({
    has: page.getByRole("heading", { name: "Profile & preferences" }),
  });
  await expect(preferences).toHaveCount(1);
  await preferences.getByLabel("Display name").fill("Playwright User A");
  await preferences.getByLabel("Theme").selectOption("LIGHT");
  await preferences.getByRole("button", { name: "Save settings" }).click();
  await expect(notification(page, "Settings saved")).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("product semantics remain honest in development", async ({ page }) => {
  await signInAsTestUser(page);
  await page.goto("/status");
  await expect(page.getByRole("heading", { name: "Service status" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Billing unavailable" })).toBeVisible();
  const ceilingCard = serviceStatusCeilingCard(page);
  await expect(ceilingCard).toHaveCount(1);
  await expect(ceilingCard.getByText("Configured deployment ceiling", { exact: true })).toBeVisible();
  await expect(ceilingCard.getByRole("heading", { name: "Demo Provider configured ceiling" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payments unavailable" })).toBeVisible();
  await expect(page.getByText(/VoxMint Pro/i)).toHaveCount(0);
  await page.goto("/settings");
  await expect(page.getByLabel(/Retention preference/i).first()).toBeDisabled();
  await expect(page.getByText(/Scheduled retention is not active/i).first()).toBeVisible();
  await expect(page.locator(".development-badge:visible")).toHaveCount(0);
});

test("read-only product and responsive browser review", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await signInAsTestUser(page);
  await expect(page.getByRole("main").getByRole("heading", { name: "Generate Voiceover" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("heading", { name: /Clone a Voice|Generate Voiceover/ }).first()).toBeVisible();

  await page.goto("/voices");
  await expect(page.getByRole("heading", { name: "My Voices" })).toBeVisible();
  await expect(page.getByText("Generate test")).toHaveCount(0);

  await page.goto("/history");
  await expect(page).toHaveURL(/\/history\?provider=mock/);
  await page.getByLabel("Filter by provider").first().selectOption("all");
  await expect(page).toHaveURL(/provider=all/);
  await page.getByLabel("Filter by provider").first().selectOption("mock");
  await expect(page).toHaveURL(/provider=mock/);

  await page.goto("/status");
  await expect(page.getByRole("heading", { name: "Service status" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Billing unavailable" })).toBeVisible();
  const ceilingCard = serviceStatusCeilingCard(page);
  await expect(ceilingCard).toHaveCount(1);
  await expect(ceilingCard.getByText("Configured deployment ceiling", { exact: true })).toBeVisible();
  await expect(ceilingCard.getByRole("heading", { name: "Demo Provider configured ceiling" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payments unavailable" })).toBeVisible();
  await expect(page.getByText(/VoxMint Pro/i)).toHaveCount(0);

  await page.goto("/settings");
  await expect(page.getByLabel(/Retention preference/i).first()).toBeDisabled();
  await expect(page.locator(".development-badge:visible")).toHaveCount(0);

  const startedLight = await page.locator("html").evaluate((element) => element.classList.contains("light"));
  if (!startedLight) await page.getByRole("button", { name: "Switch to light theme" }).first().click();
  await expect(page.locator("html")).toHaveClass(/light/);

  const viewports = [
    { width: 360, height: 800 },
    { width: 393, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of ["/dashboard", "/voices", "/history?provider=cartesia"]) {
      await page.goto(path);
      const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      const overflow = fitsViewport ? [] : await page.evaluate(() => Array.from(document.querySelectorAll("body *"))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { tag: element.tagName, className: element.getAttribute("class"), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: (element as HTMLElement).scrollWidth };
        })
        .filter((element) => element.right > window.innerWidth + 1 || element.left < -1)
        .slice(0, 8));
      expect(fitsViewport, `${path} should not overflow at ${viewport.width}x${viewport.height}: ${JSON.stringify(overflow)}`).toBe(true);
    }
  }

  if (!startedLight) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/settings");
    await page.getByRole("button", { name: "Switch to dark theme" }).first().click();
    await expect(page.locator("html")).not.toHaveClass(/light/);
  }

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Open dashboard" }).first()).toBeVisible();
  expect(await page.locator("[data-new-gr-c-s-check-loaded], [data-gr-ext-installed]").count()).toBe(0);
  expect(await page.locator('script[src^="chrome-extension://"]').count()).toBe(0);
  expect(consoleErrors.filter((message) => /hydration|VoxMint|uncaught/i.test(message))).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(await page.locator("body").innerText()).not.toMatch(/DATABASE_URL|AUTH_SECRET|CARTESIA_API_KEY|sk_car_/);
});

test("public landing actions are clear", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  await expect(page.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/login?callbackUrl=%2Fdashboard");
  await expect(page.getByRole("link", { name: "See how it works" })).toHaveAttribute("href", "#how-it-works");
  await context.close();
});

test("protected routes redirect a signed-out user", async ({ browser }) => {
  const context = await browser.newContext(); const page = await context.newPage();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  await context.close();
});
