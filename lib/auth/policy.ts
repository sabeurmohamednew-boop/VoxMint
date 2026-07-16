export type AuthPolicyInput = {
  nodeEnv: "development" | "test" | "production";
  developmentBypass: boolean;
  e2eTestAuth: boolean;
  googleClientId?: string;
  googleClientSecret?: string;
};

export type AuthPolicy = {
  googleEnabled: boolean;
  developmentEnabled: boolean;
  e2eEnabled: boolean;
};

export function resolveAuthPolicy(input: AuthPolicyInput): AuthPolicy {
  const hasGoogleId = Boolean(input.googleClientId);
  const hasGoogleSecret = Boolean(input.googleClientSecret);
  if (hasGoogleId !== hasGoogleSecret) throw new Error("Google OAuth configuration is incomplete.");
  if (input.nodeEnv === "production" && input.developmentBypass) {
    throw new Error("Development authentication cannot run in production.");
  }
  if (input.e2eTestAuth && input.nodeEnv !== "test") {
    throw new Error("Test authentication can run only when NODE_ENV=test.");
  }
  return {
    googleEnabled: hasGoogleId && hasGoogleSecret,
    developmentEnabled: input.nodeEnv === "development" && input.developmentBypass,
    e2eEnabled: input.nodeEnv === "test" && input.e2eTestAuth,
  };
}

export function isVerifiedGoogleIdentity(input: {
  provider?: string | null;
  emailVerified?: unknown;
}): boolean {
  return input.provider !== "google" || input.emailVerified === true;
}
