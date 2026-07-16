"use server";

import { signIn } from "@/auth";
import { isE2eTestAuthEnabled } from "@/lib/config/env";

function safeCallback(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export async function demoSignIn(formData: FormData) {
  await signIn("demo", {
    email: "demo@voxmint.local",
    redirectTo: safeCallback(formData.get("callbackUrl")),
  });
}

export async function googleSignIn(formData: FormData) {
  await signIn("google", { redirectTo: safeCallback(formData.get("callbackUrl")) });
}

export async function e2eSignIn(formData: FormData) {
  if (!isE2eTestAuthEnabled()) throw new Error("Test authentication is unavailable.");
  const userKey = formData.get("userKey");
  if (userKey !== "user-a" && userKey !== "user-b") throw new Error("Invalid test user.");
  await signIn("e2e", { userKey, redirectTo: safeCallback(formData.get("callbackUrl")) });
}
