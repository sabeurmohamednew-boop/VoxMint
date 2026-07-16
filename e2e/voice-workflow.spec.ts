import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, user: "A" | "B" = "A") {
  await page.goto("/login");
  await page.getByRole("button", { name: `Sign in as Test User ${user}` }).click();
  await expect(page).toHaveURL(/dashboard/);
}

function wavBuffer(durationMs = 4_000): Buffer {
  const sampleRate = 8_000; const sampleCount = Math.floor((durationMs / 1000) * sampleRate); const dataSize = sampleCount * 2; const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write("WAVE", 8); buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(dataSize, 40); return buffer;
}

test("permitted voice creation and generation workflow", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 844 });
  await signIn(page);
  await page.goto("/voices/new");
  await page.locator('input[type="file"]').setInputFiles({ name: "owned-voice.wav", mimeType: "audio/wav", buffer: wavBuffer() });
  const voiceName = `E2E Voice ${Date.now()}`;
  await page.getByLabel("Voice name").fill(voiceName);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Clone Voice" }).click();
  await expect(page.getByText("Voice created")).toBeVisible();
  await expect(page).toHaveURL(/dashboard\?voice=.+#generate/);
  await expect(page.getByRole("combobox", { name: "Select voice" })).toContainText(voiceName);
  await page.getByLabel("Enter text").fill("This is a VoxMint end to end test.");
  await page.getByRole("button", { name: "Generate Voiceover" }).click();
  await expect(page.getByText("Voiceover generated")).toBeVisible();
  await expect(page.getByRole("button", { name: /Download/ }).first()).toBeVisible();
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
  await page.getByRole("button", { name: /Download/ }).first().click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.wav$/);

  await page.goto("/voices");
  await page.getByRole("button", { name: `Actions for ${voiceName}` }).click();
  await page.getByRole("menuitem", { name: "Edit voice" }).click();
  await page.getByLabel("Voice name").fill(`${voiceName} Renamed`);
  await page.getByLabel("Description").fill("E2E description for distinguishing this voice.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Voice updated")).toBeVisible();
  await expect(page.getByText("E2E description for distinguishing this voice.")).toBeVisible();

  await page.goto("/history");
  await expect(page).toHaveURL(/provider=mock/);
  await expect(page.getByText(/end to end test/i)).toBeVisible();
  await page.getByRole("button", { name: /View details/ }).first().click();
  await expect(page.getByRole("heading", { name: /This is a VoxMint end to end test/i })).toBeVisible();
  await expect(page.getByText(/E2E Voice .* Renamed/).first()).toBeVisible();
  await page.getByRole("button", { name: /Delete This is a VoxMint end to end test/i }).first().click();
  await page.getByRole("button", { name: "Delete audio and record" }).click();
  await expect(page.getByText("Stored audio and history record deleted")).toBeVisible();

  await page.goto("/voices");
  await page.getByRole("button", { name: new RegExp(`Actions for ${voiceName} Renamed`) }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete voice" }).click();
  await expect(page.getByText("Voice deleted")).toBeVisible();

  await page.goto("/settings");
  await page.getByLabel("Display name").fill("Playwright User A");
  await page.getByLabel("Theme").selectOption("LIGHT");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved")).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("product semantics remain honest in development", async ({ page }) => {
  await signIn(page);
  await page.goto("/billing");
  await expect(page.getByText("Billing unavailable").first()).toBeVisible();
  await expect(page.getByText("Payments unavailable").first()).toBeVisible();
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

  await signIn(page);
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

  await page.goto("/billing");
  await expect(page.getByText("Billing unavailable").first()).toBeVisible();
  await expect(page.getByText("Demo allowance").first()).toBeVisible();
  await expect(page.getByText("Payments unavailable").first()).toBeVisible();
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
