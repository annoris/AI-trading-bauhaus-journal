import { handler, ok } from "@/server/api";
import { loadDemoData } from "@/server/demo";

/**
 * Seeds a "Demo data" account with a recent sample month of generated trades so a fresh
 * install has something to look at. Idempotent; delete the account in
 * Accounts to remove every trace.
 */
export const POST = handler(() => ok(loadDemoData()));
