import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDirectory = resolve(repositoryDirectory, "apps/web");
const standaloneServer = resolve(appDirectory, ".next/standalone/apps/web/server.js");
const child = spawn(process.execPath, [standaloneServer], {
  cwd: appDirectory,
  env: { ...process.env, HOSTNAME: process.env.JOURNAL_HOST || "127.0.0.1" },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
