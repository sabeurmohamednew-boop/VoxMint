"use server";

import { signIn } from "@/auth";

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
