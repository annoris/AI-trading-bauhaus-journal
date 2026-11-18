/** Validate shared account fields before SQLite or trade rebuilding sees them. */
export function accountValidationError(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return "Account must be a JSON object";
  const fields = body as Record<string, unknown>;
  if (
    fields.name !== undefined &&
    (typeof fields.name !== "string" || !fields.name.trim() || fields.name.length > 100)
  )
    return "Account name must be between 1 and 100 characters";
  if (
    fields.broker !== undefined &&
    (typeof fields.broker !== "string" || fields.broker.length > 100)
  )
    return "broker must be at most 100 characters";
  if (
    fields.currency !== undefined &&
    (typeof fields.currency !== "string" || !fields.currency.trim() || fields.currency.length > 10)
  )
    return "currency must be between 1 and 10 characters";
  if (
    fields.initialBalance !== undefined &&
    (typeof fields.initialBalance !== "number" ||
      !Number.isFinite(fields.initialBalance) ||
      Math.abs(fields.initialBalance) > 1e12)
  )
    return "initialBalance must be a valid number";
  if (fields.autoSync !== undefined && typeof fields.autoSync !== "boolean")
    return "autoSync must be a boolean";
  if (
    fields.profitCalcMethod !== undefined &&
    !["fifo", "lifo", "wavg"].includes(fields.profitCalcMethod as string)
  )
    return "profitCalcMethod must be fifo, lifo, or wavg";
  return null;
}
