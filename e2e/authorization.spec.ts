import { expect, test } from "@playwright/test";
import {
  createTestVoice,
  generateTestVoiceover,
  signInAsTestUser,
} from "./test-helpers";
import { sameOriginMutationHeaders } from "./config";

test("two isolated users cannot read or mutate each other's objects", async ({ browser }) => {
  const contextA = await browser.newContext(); const pageA = await contextA.newPage();
  await signInAsTestUser(pageA, "A");
  const { voiceId } = await createTestVoice(pageA, {
    name: "User A Private Voice",
    fileName: "authorized.wav",
  });
  const { generationId } = await generateTestVoiceover(
    pageA,
    "Private generation owned by test user A.",
  );

  const contextB = await browser.newContext(); const pageB = await contextB.newPage();
  await signInAsTestUser(pageB, "B");
  await pageB.goto("/voices");
  await expect(pageB.getByText("User A Private Voice")).toHaveCount(0);
  const request = contextB.request;
  const headers = sameOriginMutationHeaders();
  const hostileOriginResponse = await request.patch(`/api/voices/${voiceId}`, {
    headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
    data: { name: "Cross-origin rename" },
  });
  expect(hostileOriginResponse.status()).toBe(403);
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
  expect((await contextA.request.delete(`/api/generations/${generationId}`, { headers })).status()).toBe(204);
  expect((await contextA.request.delete(`/api/voices/${voiceId}`, { headers })).status()).toBe(204);
  await contextA.close(); await contextB.close();
});
