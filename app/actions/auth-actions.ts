"use server";

import { signIn } from "@/auth";
import { getEnv, isE2eTestAuthEnabled } from "@/lib/config/env";
import { normalizeCallbackUrl } from "@/lib/auth/callback-url";

export async function demoSignIn(formData: FormData) {
  await signIn("demo", {
    email: "demo@voxmint.local",
    redirectTo: normalizeCallbackUrl(formData.get("callbackUrl"), "/dashboard", getEnv().NEXT_PUBLIC_APP_URL),
  });
}

export async function googleSignIn(formData: FormData) {
  await signIn("google", { redirectTo: normalizeCallbackUrl(formData.get("callbackUrl"), "/dashboard", getEnv().NEXT_PUBLIC_APP_URL) });
}

export async function e2eSignIn(formData: FormData) {
  if (!isE2eTestAuthEnabled()) throw new Error("Test authentication is unavailable.");
  const userKey = formData.get("userKey");
  if (userKey !== "user-a" && userKey !== "user-b") throw new Error("Invalid test user.");
  await signIn("e2e", { userKey, redirectTo: normalizeCallbackUrl(formData.get("callbackUrl"), "/dashboard", getEnv().NEXT_PUBLIC_APP_URL) });
}
