const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const path = require("path");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  const out = __dirname;
  for (const [name, url] of [
    ["01-portada", "/"],
    ["02-dashboard-demo", "/demo"],
    ["03-operaciones-demo", "/demo/trades"],
    ["04-calendario-demo", "/demo/calendar"],
    ["05-informes-demo", "/demo/reports"],
  ]) {
    await page.goto("http://127.0.0.1:3107" + url, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(1800);
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.screenshot({ path: path.join(out, name + ".png"), fullPage: false });
    console.log(
      name,
      page.url(),
      (await page.locator("body").innerText()).slice(0, 180).replace(/\n/g, " "),
    );
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
