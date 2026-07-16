import { expect, test } from "@playwright/test";

test("generation abuse is rate-limited by user and request IP", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in as Test User B" }).click();
  const statuses = await page.evaluate(async () => {
    const values: number[] = [];
    for (let index = 0; index < 30; index += 1) {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          voiceId: "cm00000000000000000000000",
          text: "Rate limit probe",
          language: "en",
          style: "normal",
          idempotencyKey: `rate_limit_probe_${index}`,
        }),
      });
      values.push(response.status);
    }
    return values;
  });
  expect(statuses).toContain(429);
});
