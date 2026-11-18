let lastWarning = 0;

export async function recordApplicationError(
  request: Request,
  actor: "anonymous" | "local-owner" | `invited-${string}`,
): Promise<string | null> {
  if (actor === "anonymous") return null;
  try {
    const [{ db, runWithDefaultDatabase }, { createApplicationErrorStore }] = await Promise.all([
      import("@/db"),
      import("@/server/errors/store"),
    ]);
    return runWithDefaultDatabase(() =>
      createApplicationErrorStore(db.$client).record({
        route: new URL(request.url).pathname,
        method: request.method.toUpperCase(),
        actor: actor === "local-owner" ? "owner" : "member",
        actorId: actor === "local-owner" ? actor : actor.slice("invited-".length),
      }),
    );
  } catch {
    if (Date.now() - lastWarning > 300000) {
      lastWarning = Date.now();
      console.warn("Application error reference could not be stored.");
    }
    return null;
  }
}

export async function applicationErrorSummary() {
  const [{ db, runWithDefaultDatabase }, { createApplicationErrorStore }] = await Promise.all([
    import("@/db"),
    import("@/server/errors/store"),
  ]);
  return runWithDefaultDatabase(() => createApplicationErrorStore(db.$client).summary());
}
