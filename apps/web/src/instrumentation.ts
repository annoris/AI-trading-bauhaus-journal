export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { hostedConfigurationValid } = await import("./server/security/deployment");
    if (!hostedConfigurationValid())
      throw new Error("Hosted security configuration is incomplete.");
    if (!process.env.VITEST) {
      const { ensureDefaultJournalSeeded } = await import("./server/demo-runtime");
      ensureDefaultJournalSeeded();
    }
    const { startActivityRetention } = await import("./server/security/activity-runtime");
    await startActivityRetention();
  }
}
