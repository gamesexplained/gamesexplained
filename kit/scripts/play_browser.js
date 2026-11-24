'use strict';
// What a game's browser check needs to drive its built page in Chromium: the site served from this
// machine, and a browser. A browser check is a file in a game's folder whose name ends in
// -browser.js (games/spectrum/driller/port/test/fast-browser.js): it presses real keys on the page
// and watches what the page draws, which a test in node cannot, since the page's own code (how it
// holds keys, what it draws) runs only there. CI runs every one after building the site
// (.github/workflows/ci.yml), with the runner's Chrome through playwright-core. Elsewhere it finds
// Playwright's client and a Chromium as kit/scripts/chromium.js says: `tools.py get-node` and
// `tools.py get-chromium` put both in tools/ (kit/INSTALL.md, "Browser checks").
//
//   const { start } = require('<repository>/kit/scripts/play_browser.js');
//   const { browser, base, stop } = await start(process.argv.slice(2));
//     argv      [<site>] [--chromium <path>]: the built site (default _site at the repository's
//               top), and the Chromium to launch (default the kit's in tools/, else Playwright's own)
//     browser   the browser launched; base the site's address, http://127.0.0.1:<port>
//     stop()    closes both
// start exits with a message and status 2 when the site has not been built, Playwright is missing
// or no browser starts: in CI, that fails the step, so a check that cannot run never passes.
//
//   const errors = watchErrors(page, base);   // or watchErrors(page, base, errors) to add a page
//     the page's uncaught errors and the errors the console logs for the site's own files, as they
//     come. A file from elsewhere (web fonts, analytics) may not load where a check runs, and
//     Chromium logs each as "Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED", which
//     says nothing about the page, so those are left out (#1021). Assert it is empty at the end.
const fs = require('fs'), http = require('http'), path = require('path');
const { playwright, launchOptions, NO_CLIENT, NO_BROWSER } = require('./chromium.js');
const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };

function args(argv) {
  const o = { site: path.join(ROOT, '_site'), chromium: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--chromium') o.chromium = argv[++i];
    else o.site = path.resolve(argv[i]);
  }
  return o;
}

function stopWith(message) { console.log('FAIL: ' + message); process.exit(2); }

async function start(argv) {
  const o = args(argv);
  if (!fs.existsSync(path.join(o.site, 'index.html'))) stopWith('no built site at ' + o.site + ': build it with python3 kit/scripts/build.py');
  const pw = playwright();
  if (!pw) stopWith(NO_CLIENT);
  const server = http.createServer((req, res) => {
    const f = path.join(o.site, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(o.site) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try { browser = await pw.chromium.launch(launchOptions(o.chromium)); }
  catch (e) { server.close(); stopWith('no browser: ' + String(e.message).split('\n')[0] + '\n' + NO_BROWSER); }
  return {
    browser, base: 'http://127.0.0.1:' + server.address().port, site: o.site,
    async stop() { await browser.close(); server.close(); },
  };
}

// Whether a console message is about a file from another site than the page at `base`: a web font
// or analytics, which may not load where a check runs (shoot.js leaves those out of its count too)
function elsewhere(m, base) {
  const at = ((m.location && m.location()) || {}).url || '';
  if (!/^https?:\/\//.test(at)) return false;
  try { return new URL(at).origin !== new URL(base).origin; } catch (e) { return true; }
}

function watchErrors(page, base, errors = []) {
  page.on('pageerror', e => errors.push(String(e.message || e)));
  page.on('console', m => {
    if (m.type() === 'error' && !elsewhere(m, base)) {
      const at = ((m.location && m.location()) || {}).url;
      errors.push(m.text() + (at ? ' (' + at + ')' : ''));
    }
  });
  return errors;
}

module.exports = { start, watchErrors, elsewhere };
