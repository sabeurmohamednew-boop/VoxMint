import { expect, test } from "@playwright/test";
import { createIsolatedTestDatabaseClient } from "./test-database-client";
import { createTestVoice, signInAsTestUser } from "./test-helpers";

test("provider, storage, and finalization failures release usage; duplicate requests finalize once", async ({ page }) => {
  test.setTimeout(60_000);
  const prisma = createIsolatedTestDatabaseClient();
  try {
    await signInAsTestUser(page, "B");
    const { voiceId } = await createTestVoice(page, {
      name: "Failure Recovery Voice",
      fileName: "failure-test.wav",
    });

    const usageBefore = await page.evaluate(async () => (await fetch("/api/usage")).json());
    const failureCases = [
      ["database-before-provider", 500],
      ["provider-authentication", 502],
      ["provider-rate-limit", 502],
      ["provider-timeout", 502],
      ["provider-empty-audio", 502],
      ["provider-malformed-audio", 502],
      ["storage", 500],
      ["db-finalize", 500],
    ] as const;

    for (const [mode, expectedStatus] of failureCases) {
      const result = await page.evaluate(async ({ voiceId, mode }) => {
        const response = await fetch("/api/generations", {
          method: "POST",
          headers: { "content-type": "application/json", "x-e2e-failure": mode },
          body: JSON.stringify({
            voiceId,
            text: `Injected ${mode} failure`,
            language: "en",
            style: "normal",
            idempotencyKey: `failure_${mode.replaceAll("-", "_")}_12345`,
          }),
        });
        return { status: response.status, body: await response.json() };
      }, { voiceId, mode });
      expect(result.status, result.body?.error?.message).toBe(expectedStatus);
      expect(result.body?.error?.message).toEqual(expect.any(String));
      expect(result.body?.generation).toBeUndefined();
    }

    const usageAfterFailures = await page.evaluate(async () => (await fetch("/api/usage")).json());
    expect(usageAfterFailures.usage.charactersUsed).toBe(usageBefore.usage.charactersUsed);

    await expect.poll(async () => prisma.generation.count({
      where: { voiceId, text: { startsWith: "Injected " } },
    })).toBe(7);
    const failedGenerations = await prisma.generation.findMany({
      where: { voiceId, text: { startsWith: "Injected " } },
      include: { usageLedger: true },
    });
    for (const generation of failedGenerations) {
      expect(generation).toMatchObject({ status: "FAILED", storageKey: null });
      expect(generation.usageLedger).toHaveLength(1);
      expect(generation.usageLedger[0]?.status).toBe("RELEASED");
    }
    expect(await prisma.usageLedger.count({
      where: { status: "RESERVED", generation: { voiceId } },
    })).toBe(0);

    const duplicateText = "One idempotent concurrent generation.";
    const duplicateKey = `duplicate_${Date.now()}`;
    const duplicateResponses = await page.evaluate(async ({ voiceId, duplicateKey, duplicateText }) => Promise.all([0, 1].map(async () => {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          voiceId,
          text: duplicateText,
          language: "en",
          style: "normal",
          idempotencyKey: duplicateKey,
        }),
      });
      return { status: response.status, body: await response.json() };
    })), { voiceId, duplicateKey, duplicateText });
    expect(duplicateResponses.map((result) => result.status)).toEqual([201, 201]);
    expect(new Set(duplicateResponses.map((result) => result.body.generation?.id)).size).toBe(1);

    await expect.poll(async () => prisma.generation.count({
      where: { voiceId, text: duplicateText },
    })).toBe(1);
    await expect.poll(async () => (await prisma.generation.findFirst({
      where: { voiceId, text: duplicateText },
    }))?.status).toBe("READY");
    const duplicateGeneration = await prisma.generation.findFirstOrThrow({
      where: { voiceId, text: duplicateText },
      include: { usageLedger: true },
    });
    expect(duplicateGeneration.usageLedger).toHaveLength(1);
    expect(duplicateGeneration.usageLedger[0]?.status).toBe("COMMITTED");

    const history = await page.evaluate(async () => (await fetch("/api/generations")).json());
    expect(history.generations.filter((item: { text: string }) => item.text === duplicateText)).toHaveLength(1);
    expect(history.generations.filter((item: { text: string; status: string }) => item.text.startsWith("Injected ") && item.status === "FAILED")).toHaveLength(7);
    const usageAfterSuccess = await page.evaluate(async () => (await fetch("/api/usage")).json());
    expect(usageAfterSuccess.usage.charactersUsed - usageAfterFailures.usage.charactersUsed).toBe(duplicateText.length);

    for (const scenario of ["disconnect", "refresh"] as const) {
      const idempotencyKey = `${scenario}_${Date.now()}`;
      const text = `${scenario} recovery remains idempotent.`;
      await page.evaluate(({ voiceId, idempotencyKey, text }) => {
        const controller = new AbortController();
        (window as typeof window & { __voxmintE2eGenerationAbort?: AbortController }).__voxmintE2eGenerationAbort = controller;
        void fetch("/api/generations", {
          method: "POST",
          headers: { "content-type": "application/json", "x-e2e-failure": "provider-delay" },
          body: JSON.stringify({ voiceId, text, language: "en", style: "normal", idempotencyKey }),
          signal: controller.signal,
        }).catch(() => undefined);
      }, { voiceId, idempotencyKey, text });

      await expect.poll(
        async () => prisma.generation.count({ where: { voiceId, text } }),
        { timeout: 10_000 },
      ).toBe(1);
      if (scenario === "disconnect") {
        const aborted = await page.evaluate(() => {
          const browserWindow = window as typeof window & { __voxmintE2eGenerationAbort?: AbortController };
          browserWindow.__voxmintE2eGenerationAbort?.abort();
          const signalAborted = browserWindow.__voxmintE2eGenerationAbort?.signal.aborted ?? false;
          delete browserWindow.__voxmintE2eGenerationAbort;
          return signalAborted;
        });
        expect(aborted).toBe(true);
      } else {
        await page.reload();
      }
      const retryResult = await page.evaluate(async ({ voiceId, idempotencyKey, text }) => {
        const response = await fetch("/api/generations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ voiceId, text, language: "en", style: "normal", idempotencyKey }),
        });
        return { status: response.status, body: await response.json() };
      }, { voiceId, idempotencyKey, text });
      expect(retryResult.status, retryResult.body?.error?.message).toBe(201);
      await expect.poll(async () => (await prisma.generation.findFirst({
        where: { voiceId, text },
      }))?.status).toBe("READY");
      const recovered = await prisma.generation.findMany({
        where: { voiceId, text },
        include: { usageLedger: true },
      });
      expect(recovered).toHaveLength(1);
      expect(recovered[0]?.usageLedger).toHaveLength(1);
      expect(recovered[0]?.usageLedger[0]?.status).toBe("COMMITTED");
    }

    const deleteStatus = await page.evaluate(async (id) => (await fetch(`/api/voices/${id}`, {
      method: "DELETE",
    })).status, voiceId);
    expect(deleteStatus).toBe(204);
  } finally {
    await prisma.$disconnect();
  }
});
