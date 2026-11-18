type ApiErrorBody = { error?: unknown; errorId?: unknown };

const ERROR_REFERENCE_KEY = "journal-last-api-error";
const ERROR_REFERENCE_TTL_MS = 10 * 60 * 1000;

export function apiErrorMessage(body: ApiErrorBody, status: number): string {
  const message = typeof body.error === "string" ? body.error : `Request failed (${status})`;
  const errorId =
    typeof body.errorId === "string" && /^[a-f0-9]{16}$/.test(body.errorId) ? body.errorId : "";
  if (!errorId) return message;
  try {
    window.sessionStorage.setItem(
      ERROR_REFERENCE_KEY,
      JSON.stringify({ errorId, occurredAt: Date.now() }),
    );
  } catch {
    // Storage may be disabled; the reference is still visible in the message.
  }
  return `${message} · Reference ${errorId}`;
}

export function consumeRecentApiErrorReference(): string {
  try {
    const raw = window.sessionStorage.getItem(ERROR_REFERENCE_KEY);
    window.sessionStorage.removeItem(ERROR_REFERENCE_KEY);
    if (!raw) return "";
    const saved = JSON.parse(raw) as { errorId?: unknown; occurredAt?: unknown };
    if (
      typeof saved.errorId === "string" &&
      /^[a-f0-9]{16}$/.test(saved.errorId) &&
      typeof saved.occurredAt === "number" &&
      Date.now() - saved.occurredAt <= ERROR_REFERENCE_TTL_MS &&
      saved.occurredAt <= Date.now()
    )
      return saved.errorId;
  } catch {
    // A malformed or inaccessible value is discarded and never included in a report.
  }
  return "";
}
