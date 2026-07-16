import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicHeader } from "@/components/public/public-navigation";
import { isVerifiedGoogleIdentity, resolveAuthPolicy } from "@/lib/auth/policy";

describe("authentication policy", () => {
  it("enables Google only with complete configuration", () => {
    expect(resolveAuthPolicy({ nodeEnv: "production", developmentBypass: false, e2eTestAuth: false, googleClientId: "id", googleClientSecret: "secret" }).googleEnabled).toBe(true);
    expect(() => resolveAuthPolicy({ nodeEnv: "production", developmentBypass: false, e2eTestAuth: false, googleClientId: "id" })).toThrow("incomplete");
  });
  it("rejects development auth in production and test auth outside tests", () => {
    expect(() => resolveAuthPolicy({ nodeEnv: "production", developmentBypass: true, e2eTestAuth: false })).toThrow("Development");
    expect(() => resolveAuthPolicy({ nodeEnv: "development", developmentBypass: false, e2eTestAuth: true })).toThrow("NODE_ENV=test");
    expect(resolveAuthPolicy({ nodeEnv: "test", developmentBypass: false, e2eTestAuth: true }).e2eEnabled).toBe(true);
  });
  it("accepts only verified Google identities for automatic unique-email linking", () => {
    expect(isVerifiedGoogleIdentity({ provider: "google", emailVerified: true })).toBe(true);
    expect(isVerifiedGoogleIdentity({ provider: "google", emailVerified: false })).toBe(false);
    expect(isVerifiedGoogleIdentity({ provider: "credentials" })).toBe(true);
  });
});

describe("session-aware public navigation", () => {
  it("shows sign-in actions while signed out", () => {
    render(<PublicHeader signedIn={false} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/login?callbackUrl=%2Fdashboard");
  });
  it("shows one workspace action while signed in", () => {
    render(<PublicHeader signedIn />);
    expect(screen.getByRole("link", { name: "Open dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });
});
