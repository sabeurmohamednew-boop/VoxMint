export class ProviderError extends Error {
  constructor(
    public readonly category: string,
    message: string,
    public readonly safeMessage: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ProviderAuthenticationError extends ProviderError {
  constructor(message = "Provider authentication failed.") {
    super("authentication", message, "The voice provider is not configured correctly.");
  }
}
export class ProviderValidationError extends ProviderError {
  constructor(message = "Provider rejected the request.") {
    super("validation", message, "The voice provider rejected this request.");
  }
}
export class ProviderRateLimitError extends ProviderError {
  constructor(message = "Provider rate limit reached.") {
    super("rate_limit", message, "The voice provider is busy. Try again shortly.");
  }
}
export class ProviderTimeoutError extends ProviderError {
  constructor(message = "Provider request timed out.") {
    super("timeout", message, "Generation timed out. Try again.");
  }
}
export class ProviderUnavailableError extends ProviderError {
  constructor(message = "Provider unavailable.") {
    super("unavailable", message, "The voice provider is temporarily unavailable.");
  }
}
export class ProviderUnknownError extends ProviderError {
  constructor(message = "Unknown provider error.") {
    super("unknown", message, "The voice provider could not complete the request.");
  }
}
