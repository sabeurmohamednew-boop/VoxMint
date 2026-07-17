import { expect, type Locator, type Page, type Response } from "@playwright/test";
import { createSyntheticVoiceWav } from "./fixtures";

type TestUser = "A" | "B";

type VoiceResponse = {
  voice?: { id?: string; name?: string };
  error?: { message?: string };
};

type GenerationResponse = {
  generation?: { id?: string; status?: string };
  error?: { message?: string };
};

async function responseJson<T>(response: Response): Promise<T> {
  return response.json().catch(() => ({} as T));
}

export async function signInAsTestUser(page: Page, user: TestUser = "A") {
  await page.goto("/login");
  const signInButton = page.getByRole("button", { name: `Sign in as Test User ${user}` });
  await expect(signInButton).toBeVisible();
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/dashboard"),
    signInButton.click(),
  ]);
  await expect(page).toHaveURL(/\/dashboard(?:[?#]|$)/);
  await expect(page.getByRole("button", { name: "Open account menu" })).toBeVisible();
}

export async function openVoiceCreationForm(page: Page) {
  await page.goto("/voices/new");
  await expect(page.getByRole("heading", { name: "Create a voice" })).toBeVisible();
  const panel = page.getByRole("region", { name: "Clone a Voice" });
  await expect(panel).toHaveCount(1);
  await expect(panel).toBeVisible();
  return panel;
}

export async function fillVoiceCreationForm(
  page: Page,
  input: { name: string; fileName?: string },
): Promise<Locator> {
  const fileName = input.fileName ?? "synthetic-voice.wav";
  const panel = page.getByRole("region", { name: "Clone a Voice" });
  await expect(panel).toHaveCount(1);
  const upload = panel.locator('input[type="file"][aria-label="Choose audio sample"]');
  await expect(upload).toHaveCount(1);
  await expect(upload).toBeAttached();
  await upload.setInputFiles({
    name: fileName,
    mimeType: "audio/wav",
    buffer: createSyntheticVoiceWav(),
  });
  await expect(panel.getByText(fileName, { exact: true })).toBeVisible();
  await panel.getByLabel("Voice name").fill(input.name);
  await panel.getByRole("checkbox").check();
  const cloneButton = panel.getByRole("button", { name: "Clone Voice" });
  await expect(cloneButton).toBeEnabled();
  return cloneButton;
}

export async function submitVoiceCreation(
  page: Page,
  cloneButton: Locator,
  expectedName: string,
) {
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/voices/clone",
  );
  await cloneButton.click();
  const response = await responsePromise;
  const body = await responseJson<VoiceResponse>(response);
  if (response.status() !== 201 || !body.voice?.id) {
    throw new Error(
      `Voice creation failed (${response.status()}): ${body.error?.message ?? "invalid response"}`,
    );
  }

  await expect(page).toHaveURL(/\/dashboard\?voice=[^#]+#generate$/);
  expect(new URL(page.url()).searchParams.get("voice")).toBe(body.voice.id);
  await expect(page.getByRole("combobox", { name: "Select voice" })).toContainText(expectedName);
  return { voiceId: body.voice.id };
}

export async function createTestVoice(
  page: Page,
  input: { name: string; fileName?: string },
) {
  await openVoiceCreationForm(page);
  const cloneButton = await fillVoiceCreationForm(page, input);
  return submitVoiceCreation(page, cloneButton, input.name);
}

export async function generateTestVoiceover(
  page: Page,
  text: string,
  options: { activation?: "click" | "keyboard" } = {},
) {
  await page.getByLabel("Enter text").fill(text);
  const generateButton = page.getByRole("button", { name: "Generate Voiceover" });
  await expect(generateButton).toBeEnabled();
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/generations",
  );
  if (options.activation === "keyboard") {
    await generateButton.focus();
    await expect(generateButton).toBeFocused();
    await page.keyboard.press("Enter");
  } else {
    await generateButton.click();
  }
  const response = await responsePromise;
  const body = await responseJson<GenerationResponse>(response);
  if (response.status() !== 201 || !body.generation?.id) {
    throw new Error(
      `Generation failed (${response.status()}): ${body.error?.message ?? "invalid response"}`,
    );
  }
  await expect(page.getByRole("button", { name: "Play audio" })).toBeVisible();
  await expect(page.locator("audio")).toHaveAttribute(
    "src",
    new RegExp(`/api/generation-audio/${body.generation.id}$`),
  );
  return { generationId: body.generation.id };
}
