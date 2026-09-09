const RECOVERY_SESSION_KEY = "gla:chunk-recovery-attempt";

const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /loading chunk \d+ failed/i,
  /error loading dynamically imported module/i,
];

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String((error as any)?.message || "");

  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function recoverFromStaleChunk(error: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(error)) {
    return false;
  }

  const now = Date.now();
  const lastAttempt = Number(window.sessionStorage.getItem(RECOVERY_SESSION_KEY) || "0");

  if (Number.isFinite(lastAttempt) && now - lastAttempt < 30_000) {
    return false;
  }

  window.sessionStorage.setItem(RECOVERY_SESSION_KEY, String(now));

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("appRefresh", String(now));
  window.location.replace(nextUrl.toString());
  return true;
}
