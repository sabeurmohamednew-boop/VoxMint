import { expect, test } from "@playwright/test";
import { createTestVoice, signInAsTestUser } from "./test-helpers";
import { E2E_GENERATION_RATE_LIMIT } from "./config";

test("generation abuse is rate-limited by user and request IP", async ({ page }) => {
  await signInAsTestUser(page, "B");
  const { voiceId } = await createTestVoice(page, {
    name: "Rate Limit Voice",
    fileName: "rate-limit.wav",
  });
  const probeText = "Rate limit owned voice probe";
  const usageBefore = await page.evaluate(async () => (await fetch("/api/usage")).json());

  const results = await page.evaluate(async ({ voiceId, probeText, rateLimit }) => {
    const attempts: Array<{
      status: number;
      retryAfter: string | null;
      generationId: string | null;
      errorCode: string | null;
    }> = [];
    for (let index = 0; index < rateLimit + 1; index += 1) {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-e2e-rate-limit-probe": "generation",
        },
        body: JSON.stringify({
          voiceId,
          text: probeText,
          language: "en",
          style: "normal",
          idempotencyKey: `rate_limit_owned_${index}_${Date.now()}`,
        }),
      });
      const body = await response.json();
      attempts.push({
        status: response.status,
        retryAfter: response.headers.get("retry-after"),
        generationId: body.generation?.id ?? null,
        errorCode: body.error?.code ?? null,
      });
      if (response.status === 429) break;
    }
    const rejectedAgain = await fetch("/api/generations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-e2e-rate-limit-probe": "generation",
      },
      body: JSON.stringify({
        voiceId,
        text: probeText,
        language: "en",
        style: "normal",
        idempotencyKey: `rate_limit_rejected_${Date.now()}`,
      }),
    });
    const rejectedAgainBody = await rejectedAgain.json();
    return {
      attempts,
      rejectedAgain: {
        status: rejectedAgain.status,
        retryAfter: rejectedAgain.headers.get("retry-after"),
        errorCode: rejectedAgainBody.error?.code ?? null,
      },
    };
  }, { voiceId, probeText, rateLimit: E2E_GENERATION_RATE_LIMIT });

  expect(results.attempts[0]).toMatchObject({ status: 201, errorCode: null });
  const firstLimitedIndex = results.attempts.findIndex((attempt) => attempt.status === 429);
  expect(firstLimitedIndex).toBe(E2E_GENERATION_RATE_LIMIT);
  expect(results.attempts.slice(0, firstLimitedIndex).every((attempt) =>
    attempt.status === 201 && Boolean(attempt.generationId),
  )).toBe(true);
  const limited = results.attempts[firstLimitedIndex]!;
  expect(limited).toMatchObject({ status: 429, errorCode: "RATE_LIMITED", generationId: null });
  expect(Number(limited.retryAfter)).toBeGreaterThan(0);
  expect(results.rejectedAgain).toMatchObject({ status: 429, errorCode: "RATE_LIMITED" });
  expect(Number(results.rejectedAgain.retryAfter)).toBeGreaterThan(0);

  const successfulCount = firstLimitedIndex;
  const historyAfter = await page.evaluate(async () => (await fetch("/api/generations")).json());
  expect(historyAfter.generations.filter((item: { text: string }) => item.text === probeText)).toHaveLength(successfulCount);
  const usageAfter = await page.evaluate(async () => (await fetch("/api/usage")).json());
  expect(usageAfter.usage.charactersUsed - usageBefore.usage.charactersUsed).toBe(
    successfulCount * Array.from(probeText).length,
  );

  const deleteStatus = await page.evaluate(async (id) => (await fetch(`/api/voices/${id}`, {
    method: "DELETE",
  })).status, voiceId);
  expect(deleteStatus).toBe(204);
});
