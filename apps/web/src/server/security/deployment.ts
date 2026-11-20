/** Pure configuration validation: usable in both middleware and Node handlers. */
export function hostedConfigurationValid(): boolean {
  const multiUser = process.env.JOURNAL_MULTI_USER === "true";
  if (multiUser && !process.env.JOURNAL_PASSWORD) return false;
  if (process.env.JOURNAL_DEPLOYMENT_MODE !== "hosted") return true;
  try {
    const origin = new URL(process.env.JOURNAL_PUBLIC_ORIGIN ?? "");
    return Boolean(
      process.env.JOURNAL_PASSWORD &&
      (process.env.JOURNAL_SECRET?.length ?? 0) >= 32 &&
      (process.env.JOURNAL_PROXY_TOKEN?.length ?? 0) >= 32 &&
      origin.protocol === "https:" &&
      !origin.username &&
      !origin.password &&
      origin.pathname === "/" &&
      !origin.search &&
      !origin.hash,
    );
  } catch {
    return false;
  }
}
