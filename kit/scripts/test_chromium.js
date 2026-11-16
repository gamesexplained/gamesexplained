'use strict';
// A self-test of kit/scripts/chromium.js on a made-up tools/ folder, so it needs no browser: the
// kit's Chromium is the newest complete chromium_headless_shell-<revision> in tools/playwright/,
// an install Playwright did not finish is passed over, a Chromium a check is given comes first,
// and with none the choice is left to Playwright (#912).
// Exits 1 on any failure.  node kit/scripts/test_chromium.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { kitChromium, launchOptions } = require('./chromium.js');
let fails = 0;
const check = (what, ok, detail = '') => { if (!ok) { fails++; console.log('FAIL', what, detail); } else console.log('ok  ', what); };

const tools = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-chromium-'));
// A shell as Playwright's installer leaves it: <store>/chromium_headless_shell-<rev>/<folder>/<exe>
function shell(rev, { complete = true, folder = 'chrome-headless-shell-linux64', exe = 'chrome-headless-shell' } = {}) {
  const dir = path.join(tools, 'playwright', `chromium_headless_shell-${rev}`);
  fs.mkdirSync(path.join(dir, folder), { recursive: true });
  if (complete) fs.writeFileSync(path.join(dir, 'INSTALLATION_COMPLETE'), '');
  fs.writeFileSync(path.join(dir, folder, exe), '#!/bin/sh\n');
  return path.join(dir, folder, exe);
}

check('with no tools/playwright there is no kit Chromium', kitChromium(tools) === null);
check('with none, Playwright chooses', !('executablePath' in launchOptions(null, { env: { A: '1' } }, tools))
  && launchOptions(null, { env: { A: '1' } }, tools).env.A === '1');
const older = shell(1199, { folder: 'chrome-linux', exe: 'headless_shell' });
check("an older build's headless_shell is found", kitChromium(tools) === older, kitChromium(tools));
const newest = shell(1255);
shell(1300, { complete: false });
fs.mkdirSync(path.join(tools, 'playwright', 'ffmpeg-1013'));
check('the newest complete revision is the one taken', kitChromium(tools) === newest, kitChromium(tools));
check('the kit Chromium is launched when none is given', launchOptions(null, {}, tools).executablePath === newest);
check('a Chromium a check is given comes first', launchOptions('/usr/bin/google-chrome', {}, tools).executablePath === '/usr/bin/google-chrome');
check('other options are kept', launchOptions(null, { env: { TMPDIR: '/x' } }, tools).env.TMPDIR === '/x');

fs.rmSync(tools, { recursive: true, force: true });
if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log('all passed');
