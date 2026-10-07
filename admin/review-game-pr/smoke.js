#!/usr/bin/env node
// Open a game's built pages in a headless browser and report what broke.
//
// For each page: script errors, console errors, and requests that failed or
// came back 4xx/5xx (a missing reference/ file, a widget's data). Saves a
// screenshot of the first screenful of each page, for the review to look at.
//
// Build first: python3 kit/scripts/build.py --out <site dir>
// Usage: node admin/review-game-pr/smoke.js <site dir> <out dir> <platform>/<slug> [...]
// Needs Playwright with a Chromium (cloud sessions have both); exits 2 without it.
// Exit 1 if any page had an error.
const fs = require("fs");
const http = require("http");
const path = require("path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (e) {
  console.error("Playwright is not installed here; skip this check and say so.");
  process.exit(2);
}

const [site, out, ...games] = process.argv.slice(2);
if (!site || !out || !games.length) {
  console.error("usage: smoke.js <site dir> <out dir> <platform>/<slug> [...]");
  process.exit(2);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json", ".wav": "audio/wav", ".mp3": "audio/mpeg" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const root = path.resolve(site);
  const file = path.resolve(root, "." + p);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  let bad = 0;
  for (const game of games) {
    const dir = path.join(site, game);
    if (!fs.existsSync(dir)) {
      bad += 1;
      console.log(`FAIL ${game}: not in the built site (did build.py skip it?)`);
      continue;
    }
    const pages = fs.readdirSync(dir).filter((f) => f.endsWith(".html")).sort();
    for (const page of pages) {
      const problems = [];
      const tab = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      tab.on("pageerror", (e) => problems.push(`script error: ${e.message.split("\n")[0]}`));
      tab.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text().slice(0, 200)}`));
      tab.on("requestfailed", (r) => r.url().startsWith(base) && problems.push(`failed: ${r.url().slice(base.length)}`));
      tab.on("response", (r) => r.status() >= 400 && r.url().startsWith(base) && problems.push(`${r.status()}: ${r.url().slice(base.length)}`));
      try {
        await tab.goto(`${base}/${game}/${page}`, { waitUntil: "load", timeout: 30000 });
        await tab.waitForTimeout(1500);
      } catch (e) {
        problems.push(`did not load: ${e.message.split("\n")[0]}`);
      }
      const shot = path.join(out, `${game.replace(/\//g, "-")}-${page.replace(/\.html$/, "")}.png`);
      await tab.screenshot({ path: shot }).catch(() => {});
      await tab.close();
      bad += problems.length ? 1 : 0;
      console.log(`${problems.length ? "FAIL" : "ok  "} ${game}/${page}`);
      for (const p of [...new Set(problems)]) console.log(`       ${p}`);
    }
  }
  await browser.close();
  server.close();
  console.log(`\nscreenshots in ${out}`);
  process.exit(bad ? 1 : 0);
})();
