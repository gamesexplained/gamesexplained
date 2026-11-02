'use strict';
// A self-test of kit/c64/sid_check.js, with no browser: the processor it adds to the player's
// worklet module runs here in a scope with what an AudioWorkletGlobalScope has, as
// kit/c64/test_sid_driver_error.js runs the player's own, and must report
// - a driver that gates its voices with the chip's volume at 0 as playing unheard, at volume 0,
//   which the verdict names as the start-up's volume left out;
// - a driver that sets the volume and gates a voice as heard;
// - a driver that throws when its tune starts as stopped, with its error;
// - a driver that decodes its bytes with atob as heard (the worklet has an atob of its own);
// the verdict lets a button whose label says it is silent stay silent, and no other; the script
// put before the page's own notes every player it mounts; and the pages found are those that load
// lib/sid.js. Exits 1 on any failure.
//   node kit/c64/test_sid_check.js
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
require(path.join(ROOT, 'site', 'lib', 'sid.js'));
const { args, pagesWithSid, verdict, CHECKER, CATCH, MOVES } = require('./sid_check.js');
let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.log('FAIL ' + what); } else console.log('ok   ' + what); };

// One button through the checker in a worklet's scope: what it posted to the page
function run(driver, frames = 100) {
  let Proc = null;
  const posted = [];
  const scope = {
    sampleRate: 48000, currentTime: 0,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (m) => posted.push(m) }; } },
    registerProcessor: (name, cls) => { if (name === 'c64-sid-check') Proc = cls; },
  };
  vm.runInNewContext(C64Sid.worklet(driver) + CHECKER, scope);
  const p = new Proc({ processorOptions: { data: {}, opts: {}, frames: false, tune: 0 } });
  const out = [new Float32Array(128)];
  for (let k = 0; k < frames * 960 / 128; k++) p.process([], [out]);
  const r = { name: 'Tune 0', error: null, heard: false, vol: false, env: false, moves: 0 };
  for (const m of posted) {
    if (m.driverError) r.error = r.error || m.driverError;
    for (const k of ['heard', 'vol', 'env']) if (m[k]) r[k] = true;
  }
  return r;
}

// voice 1 gated on with a sawtooth, at the volume given, from the first frame
function gated(vol) {
  return new Function(`return function createDriver() {
    const sid = new Uint8Array(25);
    let on = false;
    return { sid, writes: [], init() { on = true; sid.fill(0); sid[24] = ${vol}; sid[1] = 0x1C; sid[5] = 0x09; sid[6] = 0xF0; sid[4] = 0x21; },
      stop() { on = false; }, play() {}, playing: () => on };
  }`)();
}
{
  const r = run(gated(0));
  check(!r.error && r.env && !r.vol && !r.heard, 'a driver that gates its voices at volume 0 plays unheard');
  check(/volume \(\$D418\) stays at 0/.test(verdict(r, 10) || ''), 'and the verdict says the volume stays at 0');
  check(verdict(Object.assign({}, r, { name: 'Silent definition 11' }), 10) === null &&
        verdict(Object.assign({}, r, { name: 'Request 0 (silent)' }), 10) === null &&
        verdict(Object.assign({}, r, { name: 'Silence (record 11)' }), 10) === null,
        'a button whose label says it is silent may be');
  check(verdict(Object.assign({}, r, { name: 'Silencer theme' }), 10) !== null,
        'and a label that only begins with the word is not one');
  check(verdict(Object.assign({}, r, { moves: MOVES }), 10) === null, 'output that moves counts as heard');
}
{
  const r = run(gated(15));
  check(!r.error && r.heard && r.vol && r.env && verdict(r, 10) === null, 'a driver that sets the volume and gates a voice is heard');
}
{
  const r = run(function createDriver() {
    return { sid: new Uint8Array(25), writes: [], init() { throw new Error('no such tune'); }, stop() {}, play() {}, playing: () => false };
  });
  check(/no such tune/.test(r.error || '') && /stopped in the AudioWorklet: .*no such tune/.test(verdict(r, 10) || ''),
        'a driver that throws as its tune starts is reported, with its error');
}
{
  const r = run(function createDriver() {
    const sid = new Uint8Array(25), b = atob('AA8=');
    let on = false;
    return { sid, writes: [], init() { on = true; sid[24] = b.charCodeAt(1); sid[1] = 0x1C; sid[5] = 0x09; sid[6] = 0xF0; sid[4] = 0x21; },
      stop() { on = false; }, play() {}, playing: () => on };
  });
  check(!r.error && r.heard, 'a driver that decodes its bytes with atob is heard');
}
{
  const r = run(function createDriver() {
    const sid = new Uint8Array(25);
    return { sid, writes: [], init() { sid[24] = 15; }, stop() {}, play() {}, playing: () => true };
  });
  check(!r.heard && !r.env && /no voice's envelope rises in 10 s/.test(verdict(r, 10) || ''), 'a driver that never gates a voice is silent');
}

// the script before the page's: a player mounted after it is noted, with its options
{
  const page = { window: null };
  page.window = page;
  page.globalThis = page;
  vm.runInNewContext(CATCH.replace(/globalThis/g, 'window'), page);
  const mounted = [];
  page.C64Sid = { mount(root, o) { mounted.push(o.tunes.length); return 'mounted'; } };
  const back = page.C64Sid.mount({ id: 'x-music' }, { tunes: ['a', 'b'], driver() {} });
  check(back === 'mounted' && mounted[0] === 2 && page.__sidMounts.length === 1 && page.__sidMounts[0].id === 'x-music' &&
        page.__sidMounts[0].o.tunes.length === 2, 'the script before the page notes each player it mounts, and mounts it');
}

// the pages: those that load lib/sid.js
{
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'sid-check-'));
  const put = (f, text) => { fs.mkdirSync(path.dirname(path.join(site, f)), { recursive: true }); fs.writeFileSync(path.join(site, f), text); };
  put('c64/a/index.html', '<script src="../../lib/sid.js?v=1"></script>');
  put('c64/a/play.html', '<script src="../../lib/c64.js"></script>');
  put('c64/b/music.html', '<script src="../../lib/sid.js"></script>');
  put('lib/sid.js', '');
  put('index.html', '<script src="lib/sid.js"></script>');
  const found = pagesWithSid(site);
  fs.rmSync(site, { recursive: true, force: true });
  check(found.join() === 'c64/a/index.html,c64/b/music.html', 'the pages checked are the game pages that load lib/sid.js');
}
{
  const o = args(['_site', 'c64/a/index.html', '--seconds', '5', '--jobs', '2']);
  check(o.site === path.resolve('_site') && o.pages.join() === 'c64/a/index.html' && o.seconds === 5 && o.jobs === 2,
        'the site, the pages and the options are read from the command line');
  let threw = false;
  try { args(['--seconds', '0']); } catch (e) { threw = true; }
  check(threw && args(['-h']) === null, 'a bad option is refused, and -h asks for the help');
}

console.log(fails ? fails + ' FAILED' : 'all ok');
process.exitCode = fails ? 1 : 0;
