'use strict';
// The Playwright client and the Chromium that the kit's scripted page checks use
// (kit/c64/sid_check.js, kit/scripts/shoot.js and every game's *-browser.js through
// kit/scripts/play_browser.js), so that all three find them the same way. kit/INSTALL.md,
// "Browser checks", says where each comes from. Checked by kit/scripts/test_chromium.js.
//
//   const { playwright, launchOptions, NO_CLIENT, NO_BROWSER } = require('<repository>/kit/scripts/chromium.js');
//   const pw = playwright();                                 // null when there is none
//   const browser = await pw.chromium.launch(launchOptions(path_or_null, { ...other options }));
//
// The client: the playwright or playwright-core package wherever Node finds it (NODE_PATH, as
// `tools.py node run` sets it), else the playwright-core that `tools.py get-node` put in
// tools/npm/. The browser, in this order: the executable a check is given (--chromium), the
// headless Chromium that `tools.py get-chromium` put in tools/playwright/ (the newest there),
// and Playwright's own, from its cache or PLAYWRIGHT_BROWSERS_PATH, as in the hosted containers.
const fs = require('fs'), path = require('path');
const TOOLS = path.resolve(__dirname, '..', '..', 'tools');

const NO_CLIENT = 'Playwright is not installed here: python3 kit/scripts/tools.py get-node puts its client in tools/ ' +
  '(kit/INSTALL.md, "Node for a machine without it")';
const NO_BROWSER = 'with the contributor\'s yes, python3 kit/scripts/tools.py get-chromium puts a headless Chromium ' +
  'in tools/ (kit/INSTALL.md, "Browser checks")';

function playwright(tools = TOOLS) {
  for (const name of ['playwright', 'playwright-core', path.join(tools, 'npm', 'node_modules', 'playwright-core')]) {
    try { return require(name); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  }
  return null;
}

// The newest complete chromium_headless_shell-<revision> in tools/playwright/, or null
function kitChromium(tools = TOOLS) {
  const store = path.join(tools, 'playwright');
  let names, best = null;
  try { names = fs.readdirSync(store); } catch (e) { return null; }
  for (const name of names) {
    const m = /^chromium_headless_shell-(\d+)$/.exec(name);
    if (!m || !fs.existsSync(path.join(store, name, 'INSTALLATION_COMPLETE'))) continue;
    for (const sub of fs.readdirSync(path.join(store, name))) {
      for (const exe of ['chrome-headless-shell', 'headless_shell']) {   // Chrome for Testing's name, and older builds'
        const f = path.join(store, name, sub, exe);
        if (fs.existsSync(f) && fs.statSync(f).isFile() && (!best || Number(m[1]) > best.rev)) best = { rev: Number(m[1]), f };
      }
    }
  }
  return best && best.f;
}

// Playwright's launch options with the browser chosen as above: `named`, else the kit's, else none
// given, which leaves it to Playwright
function launchOptions(named, extra = {}, tools = TOOLS) {
  const exe = named || kitChromium(tools);
  return exe ? { ...extra, executablePath: exe } : { ...extra };
}

module.exports = { playwright, kitChromium, launchOptions, NO_CLIENT, NO_BROWSER };
