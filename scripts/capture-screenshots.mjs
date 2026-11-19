import http from "node:http";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = join(repoRoot, "site");
const outDir = join(repoRoot, "docs", "screenshots");
const chromePath =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
};

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function startStaticServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || "/", "http://127.0.0.1").pathname);
      const relativePath = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
      const target = resolve(rootDir, `.${relativePath}`);
      if (target !== rootDir && !target.startsWith(rootDir + sep)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const data = await readFile(target);
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[extname(target)] || "application/octet-stream",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, port, baseUrl: `http://127.0.0.1:${port}/` };
}

async function launchChrome(executablePath, userDataDir) {
  await stat(executablePath);

  const args = [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-extensions",
    "--mute-audio",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ];

  const proc = spawn(executablePath, args, { stdio: ["ignore", "ignore", "pipe"] });

  const browserWsUrl = await new Promise((resolveWs, rejectWs) => {
    let stderr = "";
    const timer = setTimeout(() => {
      rejectWs(new Error(`Timed out waiting for Chrome DevTools endpoint.\n${stderr}`));
    }, 15000);

    const onData = (chunk) => {
      stderr += chunk.toString("utf8");
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        proc.stderr.off("data", onData);
        proc.off("exit", onExit);
        resolveWs(match[1]);
      }
    };

    const onExit = (code, signal) => {
      clearTimeout(timer);
      rejectWs(
        new Error(
          `Chrome exited before DevTools started (code=${code}, signal=${signal}).\n${stderr}`,
        ),
      );
    };

    proc.stderr.on("data", onData);
    proc.once("exit", onExit);
  });

  return { proc, browserWsUrl };
}

async function getPageWsUrl(browserWsUrl) {
  const port = new URL(browserWsUrl).port;
  const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!listRes.ok) throw new Error(`Failed to query Chrome targets: HTTP ${listRes.status}`);
  const targets = await listRes.json();
  const existing = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  if (existing) return existing.webSocketDebuggerUrl;

  let createRes = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  if (createRes.status === 405) {
    createRes = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`);
  }
  if (!createRes.ok) throw new Error(`Failed to create Chrome target: HTTP ${createRes.status}`);
  const created = await createRes.json();
  if (!created.webSocketDebuggerUrl) throw new Error("Chrome target missing webSocketDebuggerUrl.");
  return created.webSocketDebuggerUrl;
}

async function createCdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    const onOpen = () => {
      ws.removeEventListener("error", onError);
      resolveOpen();
    };
    const onError = (event) => {
      ws.removeEventListener("open", onOpen);
      rejectOpen(new Error(`CDP WebSocket error: ${event.message || "connection failed"}`));
    };
    ws.addEventListener("open", onOpen, { once: true });
    ws.addEventListener("error", onError, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();

  ws.addEventListener("message", (event) => {
    const payload = JSON.parse(
      typeof event.data === "string" ? event.data : event.data.toString("utf8"),
    );
    if (payload.id !== undefined) {
      const entry = pending.get(payload.id);
      if (!entry) return;
      pending.delete(payload.id);
      if (payload.error) entry.reject(new Error(`CDP ${entry.method}: ${payload.error.message}`));
      else entry.resolve(payload.result ?? {});
      return;
    }
    if (payload.method) {
      const handlers = listeners.get(payload.method);
      if (handlers) {
        for (const handler of [...handlers]) handler(payload.params ?? {});
      }
    }
  });

  ws.addEventListener("close", () => {
    for (const { reject, method } of pending.values()) {
      reject(new Error(`CDP connection closed while awaiting ${method}`));
    }
    pending.clear();
  });

  return {
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolveCmd, rejectCmd) => {
        pending.set(id, { resolve: resolveCmd, reject: rejectCmd, method });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    on(method, handler) {
      if (!listeners.has(method)) listeners.set(method, new Set());
      listeners.get(method).add(handler);
      return () => listeners.get(method)?.delete(handler);
    },
    once(method, timeoutMs = 15000) {
      return new Promise((resolveOnce, rejectOnce) => {
        const timer = setTimeout(() => {
          off();
          rejectOnce(new Error(`Timed out waiting for CDP event ${method}`));
        }, timeoutMs);
        const off = this.on(method, (params) => {
          clearTimeout(timer);
          off();
          resolveOnce(params);
        });
      });
    },
    close() {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    },
  };
}

async function run() {
  await mkdir(outDir, { recursive: true });
  const userDataDir = await mkdtemp(join(tmpdir(), "trading-bauhaus-chrome-"));
  const { server, baseUrl } = await startStaticServer(siteRoot);

  let chromeProc = null;
  let cdp = null;

  try {
    const launched = await launchChrome(chromePath, userDataDir);
    chromeProc = launched.proc;
    const pageWsUrl = await getPageWsUrl(launched.browserWsUrl);
    cdp = await createCdpClient(pageWsUrl);

    const pageErrors = [];
    cdp.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
      const desc =
        exceptionDetails?.exception?.description || exceptionDetails?.text || "Uncaught exception";
      pageErrors.push(`Runtime.exceptionThrown: ${desc}`);
    });
    cdp.on("Runtime.consoleAPICalled", ({ type, args }) => {
      if (type !== "error") return;
      const text = (args || []).map((arg) => arg.value ?? arg.description ?? arg.type).join(" ");
      pageErrors.push(`console.error: ${text}`);
    });

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });

    const evaluate = async (expression) => {
      const res = await cdp.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (res.exceptionDetails) {
        const msg =
          res.exceptionDetails.exception?.description ||
          res.exceptionDetails.text ||
          "Evaluation failed";
        throw new Error(`Page evaluation error: ${msg}`);
      }
      return res.result?.value;
    };

    const waitReady = async () => {
      await evaluate(`(async () => {
        if (document.readyState !== 'complete') {
          await new Promise(r => window.addEventListener('load', r, { once: true }));
        }
        await document.fonts.ready;
      })()`);
    };

    const navigateAndWait = async (url) => {
      const loaded = cdp.once("Page.loadEventFired");
      await cdp.send("Page.navigate", { url });
      await loaded;
      await waitReady();
    };

    const capture = async (filename) => {
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
      const target = join(outDir, filename);
      await writeFile(target, Buffer.from(data, "base64"));
      console.log(`Captured ${filename}`);
    };

    const scrollToWorkspace = async (selector = "#workspace") => {
      await evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        const y = el.getBoundingClientRect().top + window.scrollY - 76;
        window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
      })()`);
    };

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await navigateAndWait(baseUrl);

    // 1. Welcome Hero Showcase
    await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    await delay(500);
    const heroCheck = await evaluate(`(() => ({
      kpis: document.querySelectorAll('#hero-preview-body .preview-kpi').length,
      hasRadar: Boolean(document.querySelector('#hero-preview-body .svg-radar')),
    }))()`);
    assert(
      heroCheck.kpis === 3 && heroCheck.hasRadar,
      "Hero live preview did not render KPIs and Edge Radar",
    );
    await capture("01-welcome-showcase.png");

    // 2. Dashboard Workspace (#view=dashboard)
    await scrollToWorkspace(".workspace-shell");
    await delay(400);
    await capture("02-dashboard-workspace.png");

    // Smoke test dashboard filter interaction (30D then back to All)
    const filterCheck = await evaluate(`(() => {
      document.querySelector('#dash-range-filters [data-range="30d"]').click();
      const scope30 = document.getElementById('workspace-scope-pill')?.textContent || '';
      document.querySelector('#dash-range-filters [data-range="all"]').click();
      const scopeAll = document.getElementById('workspace-scope-pill')?.textContent || '';
      return { scope30, scopeAll };
    })()`);
    assert(
      filterCheck.scope30 !== filterCheck.scopeAll,
      "Dashboard timeframe filter did not update scope",
    );

    // 3. Trades Explorer (#view=trades)
    await evaluate(`document.querySelector('[data-view-target="trades"]').click()`);
    await scrollToWorkspace();
    await delay(400);
    const tradesCount = await evaluate(`document.querySelectorAll('#trades-table-body tr').length`);
    assert(tradesCount >= 10, `Expected >= 10 trades in Trades Explorer, found ${tradesCount}`);
    await capture("03-trades-explorer.png");

    // 4. Trade Detail & Candle Replay Modal
    await evaluate(`document.querySelector('#trades-table-body [data-open-trade]').click()`);
    await delay(300);
    const modalOpen = await evaluate(`(() => {
      const dlg = document.getElementById('trade-modal');
      document.getElementById('replay-restart-btn')?.click();
      document.getElementById('replay-step-btn')?.click();
      document.getElementById('replay-step-btn')?.click();
      return {
        open: Boolean(dlg?.open),
        hasCandles: Boolean(document.querySelector('#trade-replay-chart .svg-candles')),
        readout: document.getElementById('replay-readout')?.textContent || '',
      };
    })()`);
    assert(
      modalOpen.open && modalOpen.hasCandles,
      "Trade replay modal did not open with candlesticks",
    );
    await delay(250);
    await capture("04-trade-replay-modal.png");

    // Smoke check: Escape closes trade modal cleanly
    await cdp.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27,
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27,
    });
    await delay(200);
    const closedOnEsc = await evaluate(`!document.getElementById('trade-modal')?.open`);
    assert(closedOnEsc, "#trade-modal did not close on Escape");

    // 5. P&L Calendar (#view=calendar)
    await evaluate(`document.querySelector('[data-view-target="calendar"]').click()`);
    await evaluate(`document.querySelector('#cal-month-tabs [data-month="2026-10"]').click()`);
    await scrollToWorkspace();
    await delay(400);
    const calCheck = await evaluate(`(() => {
      const cells = document.querySelectorAll('#cal-grid .cal-day-active').length;
      const inspectorText = document.getElementById('cal-day-inspector')?.textContent || '';
      return { cells, hasInspector: inspectorText.includes('Session Inspector') };
    })()`);
    assert(
      calCheck.cells > 0 && calCheck.hasInspector,
      "Calendar view did not populate month grid and day inspector",
    );
    await capture("05-pnl-calendar.png");

    // 6. Reports & Analytics (#view=reports)
    await evaluate(`document.querySelector('[data-view-target="reports"]').click()`);
    await scrollToWorkspace();
    await delay(400);
    await capture("06-reports-analytics.png");

    const reportsTabsCheck = await evaluate(`(() => {
      document.querySelector('#reports-subtabs [data-report-tab="setups"]').click();
      const setupsVisible = !document.getElementById('reports-panel-setups')?.hidden;
      document.querySelector('#reports-subtabs [data-report-tab="explorer"]').click();
      const scatterVisible = !document.getElementById('reports-panel-explorer')?.hidden &&
        Boolean(document.querySelector('#reports-scatter-chart .svg-scatter'));
      document.querySelector('#reports-subtabs [data-report-tab="overview"]').click();
      return { setupsVisible, scatterVisible };
    })()`);
    assert(
      reportsTabsCheck.setupsVisible && reportsTabsCheck.scatterVisible,
      "Reports subtabs failed to toggle cleanly",
    );

    // 7. Daily Journal & Playbooks (#view=journal) + Prop Firms / Privacy / Theme smoke checks
    await evaluate(`document.querySelector('[data-view-target="journal"]').click()`);
    await scrollToWorkspace();
    await delay(400);
    await capture("07-journal-prop-firms.png");

    const modeChecks = await evaluate(`(() => {
      document.querySelector('[data-view-target="prop-firms"]').click();
      const propRows = document.querySelectorAll('#prop-ledger-body tr').length;
      document.getElementById('privacy-toggle').click();
      const masked = document.getElementById('privacy-toggle')?.getAttribute('aria-pressed') === 'true' &&
        document.body.innerText.includes('$••••');
      document.getElementById('privacy-toggle').click();
      document.getElementById('theme-toggle').click();
      const lightTheme = document.documentElement.dataset.theme === 'light';
      document.getElementById('theme-toggle').click();
      const darkTheme = document.documentElement.dataset.theme === 'dark';
      return { propRows, masked, lightTheme, darkTheme };
    })()`);
    assert(modeChecks.propRows >= 10, "Prop firms ledger rows missing");
    assert(modeChecks.masked, "Privacy mask toggle did not mask monetary text");
    assert(modeChecks.lightTheme && modeChecks.darkTheme, "Light/Dark theme toggle failed");

    // 8. Mobile Responsive (390x844 @2x)
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
    await evaluate(`history.replaceState(null, '', '/#view=dashboard')`);
    const reloaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.reload", { ignoreCache: false });
    await reloaded;
    await waitReady();
    await scrollToWorkspace();
    await delay(600);
    const mobileMetrics = await evaluate(`(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      drawerHidden: document.getElementById('mobile-nav')?.hidden === true,
    }))()`);
    assert(
      mobileMetrics.scrollWidth <= mobileMetrics.innerWidth,
      `Mobile horizontal overflow detected: scrollWidth=${mobileMetrics.scrollWidth}, innerWidth=${mobileMetrics.innerWidth}`,
    );
    assert(mobileMetrics.drawerHidden, "#mobile-nav should be hidden on mobile reload");
    await capture("08-mobile-responsive.png");

    assert(pageErrors.length === 0, `Page runtime errors detected:\n${pageErrors.join("\n")}`);
    console.log(
      "OK: Captured 8 screenshots into docs/screenshots/ and passed all CDP smoke checks.",
    );
  } finally {
    cdp?.close();
    if (chromeProc && chromeProc.exitCode === null) {
      chromeProc.kill("SIGTERM");
      await delay(300);
      if (chromeProc.exitCode === null) chromeProc.kill("SIGKILL");
    }
    await rm(userDataDir, { recursive: true, force: true });
    server.closeAllConnections?.();
    server.close();
  }
}

run().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
