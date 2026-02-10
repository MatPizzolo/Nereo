/**
 * Client-side error logger.
 * Sends errors to the backend for monitoring.
 * Silently fails if the endpoint is unavailable.
 */
export async function logErrorToBackend(error: {
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  userAgent?: string;
}) {
  try {
    const payload = {
      ...error,
      url: error.url ?? (typeof window !== "undefined" ? window.location.href : ""),
      userAgent:
        error.userAgent ??
        (typeof navigator !== "undefined" ? navigator.userAgent : ""),
      timestamp: new Date().toISOString(),
    };

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1/errors`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
  } catch {
    // Silently fail — don't cause more errors while logging errors
  }
}
