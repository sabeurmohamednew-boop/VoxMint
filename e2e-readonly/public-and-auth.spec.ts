import { expect, test, type Page } from "@playwright/test";

const publicRoutes = [
  "/",
  "/login",
  "/help",
  "/privacy",
  "/terms",
  "/acceptable-use",
] as const;

const protectedRoutes = [
  "/dashboard",
  "/voices",
  "/voices/new",
  "/history",
  "/settings",
  "/usage",
  "/status",
] as const;

const viewports = [
  { width: 360, height: 800 },
  { width: 393, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

function observePage(page: Page) {
  const issues: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration|unhandled/i.test(message.text())) {
      issues.push(`console:${message.type()}:${message.text()}`);
    }
  });
  page.on("pageerror", (error) => issues.push(`pageerror:${error.message}`));
  page.on("requestfailed", (request) => issues.push(`requestfailed:${request.method()}:${request.url()}:${request.failure()?.errorText ?? "unknown"}`));
  page.on("response", (response) => {
    if (response.status() >= 500) issues.push(`response:${response.status()}:${response.url()}`);
  });
  return issues;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.documentWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

test("public routes render without hydration, network, console or overflow failures", async ({ page }) => {
  const issues = observePage(page);
  for (const route of publicRoutes) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status(), route).toBeLessThan(400);
    await expect(page.locator("body"), route).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  expect(issues).toEqual([]);
});

test("protected routes safely preserve a local return path", async ({ page }) => {
  const issues = observePage(page);
  for (const route of protectedRoutes) {
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    const callback = new URL(page.url()).searchParams.get("callbackUrl");
    if (callback) {
      const parsedCallback = new URL(callback, page.url());
      expect(["http://localhost:3000", "http://127.0.0.1:3000"]).toContain(parsedCallback.origin);
      expect(parsedCallback.pathname).toBe(route);
    }
    await expect(page.getByRole("heading", { name: "Sign in to VoxMint" })).toBeVisible();
    const callbackInput = page.locator('input[name="callbackUrl"]').first();
    if (await callbackInput.count()) await expect(callbackInput).toHaveValue(route);
    await expectNoHorizontalOverflow(page);
  }
  expect(issues).toEqual([]);
});

test("legacy billing route redirects to canonical Service status", async ({ request }) => {
  const response = await request.get("/billing", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/status");
});

test("health endpoints and security headers are machine-readable and secret-free", async ({ request }) => {
  const live = await request.get("/api/health/live");
  expect(live.ok()).toBe(true);
  expect(await live.json()).toEqual({ status: "ok" });

  const ready = await request.get("/api/health/ready");
  expect([200, 503]).toContain(ready.status());
  const readyText = await ready.text();
  expect(readyText).not.toMatch(/api.?key|password|secret|token|database_url|storageKey/i);

  const landing = await request.get("/");
  const headers = landing.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
});

for (const viewport of viewports) {
  test(`landing and login fit ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const issues = observePage(page);
    await page.setViewportSize(viewport);
    for (const route of ["/", "/login"]) {
      await page.goto(route, { waitUntil: "networkidle" });
      await expectNoHorizontalOverflow(page);
    }
    expect(issues).toEqual([]);
  });
}
