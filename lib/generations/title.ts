export const UNTITLED_GENERATION = "Untitled voiceover";
export const AUTOMATIC_TITLE_MAX_LENGTH = 64;

function normalizeWhitespace(value: string): string {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function truncateAtWord(value: string, maximum: number): string {
  const characters = Array.from(value);
  if (characters.length <= maximum) return value;

  const prefix = characters.slice(0, maximum - 1).join("").trimEnd();
  const lastSpace = prefix.lastIndexOf(" ");
  const minimumUsefulBreak = Math.floor(maximum * 0.6);
  const shortened = lastSpace >= minimumUsefulBreak ? prefix.slice(0, lastSpace) : prefix;
  return `${shortened.trimEnd()}\u2026`;
}

export function deriveGenerationTitle(
  script: string,
  maximum = AUTOMATIC_TITLE_MAX_LENGTH,
): string {
  if (!Number.isInteger(maximum) || maximum < 2) return UNTITLED_GENERATION;

  const normalized = normalizeWhitespace(script);
  if (!normalized) return UNTITLED_GENERATION;

  const boundary = normalized.search(/[.!?\u3002\uff01\uff1f;\u061b:]/u);
  const firstClause = boundary >= 0 ? normalized.slice(0, boundary + 1) : normalized;
  const meaningful = normalizeWhitespace(firstClause) || normalized;
  return truncateAtWord(meaningful, maximum);
}
