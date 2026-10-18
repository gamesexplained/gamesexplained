'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine, the pacing) run in node on the memory the page carries, from the loader's hand-over. The
// port's own tests hold each routine and the whole program to the game's code (port/test, with a
// contributor's moments of play); this one holds the page that is published, with nothing from
// work/.
// - the title plays its music, and 2 (Kempston), 0 and Y on the control selection reach play, in
//   area 13 with the party in its slots, as the 128 does in about three seconds (port/test/
//   t-page.js times it against the game);
// - the stick walks the leader, and with fire held runs him; SPACE opens the first menu;
// - the view is drawn on the screen shown;
// - the sound never uses the AY's envelope, which site/lib/ay.js does not model (registers 11 to 13,
//   bit 4 of a volume).
// No frame throws, and the clock keeps to the frames.
//   node games/spectrum/where-time-stood-still/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'WTPort');
const { WTPage } = globalThis;
const cost = JSON.parse(/^window\.WT_COST = ([\s\S]*?);\n<\/script>/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="wt-data">([^<]*)<\/script>/.exec(page)[1]);

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const PASS = 0x86A2, AREA = 0x8D1F, MENU = 0x8D22;
// the joystick's bits as the Kempston interface gives them
const RIGHT = 1, LEFT = 2, DOWN = 4, UP = 8, FIRE = 16;
// the leader (slot 0, $8300): his place across, down and up, three words from +$0E
const place = M => Array.from(M.subarray(0x830E, 0x8314));

const rt = WTPage.create({ data, cost });
let passes = 0, writes = 0, envelope = 0;
rt.restore(data, P => (function* () { for (const y of P.program(true)) { if (y && y.cp === PASS) passes++; yield y; } })());
rt.onAY((r, v) => { writes++; if ((r >= 11 && r <= 13) || (r >= 8 && r <= 10 && v & 16)) envelope++; });
let f = 0, threw = null;
const run = (n, keys = [], joy = 0) => {
  rt.input.keys = new Set(keys); rt.input.joy = joy;
  for (let i = 0; i < n && !threw; i++, f++) {
    try { rt.runFrame(); } catch (e) { threw = e; fail('frame ' + f + ': ' + e.message); }
  }
};

// the title, then the control selection: Kempston, 0 and Y
run(30);
if (!writes) fail('the title wrote nothing to the AY in 30 frames');
for (const k of ['2', '0', 'Y']) { run(8, [k]); run(32); }
run(200);
if (!threw) {
  if (!passes) fail('no pass of play ' + f + ' frames from the hand-over');
  if (rt.M[AREA] !== 0x0D) fail('play began in area ' + rt.M[AREA] + ', not 13');
  if (rt.M[0x8300] === 0xFF || rt.M[0x8301] === 0xFF) fail('slot 0 holds no leader at the start of play');
  console.log('play reached: ' + passes + ' passes by frame ' + f + ', area ' + rt.M[AREA]);
}

// a walk each way, then a run: the leader's place changes
const walk = (what, joy, n = 60) => {
  if (threw) return;
  const p0 = place(rt.M);
  run(n, [], joy); run(20);
  const p1 = place(rt.M);
  if (p0.join() === p1.join()) fail(what + ' left the leader at ' + p0);
  else console.log(what + ': the leader from ' + p0 + ' to ' + p1);
};
walk('a walk right', RIGHT); walk('a walk down', DOWN); walk('a walk left', LEFT); walk('a walk up', UP);
walk('a run right', RIGHT | FIRE);

// the menus: SPACE opens the first, and fire on nothing shuts it again
if (!threw) {
  let n = 0;
  while (!rt.M[MENU] && n < 100 && !threw) { run(1, ['SPACE']); n++; }
  run(60);
  if (!rt.M[MENU]) fail('SPACE held ' + n + ' frames opened no menu');
  else console.log('SPACE opened menu ' + rt.M[MENU]);
  run(150, [], FIRE); run(150);
}

// the screen shown has the view on it, and the clock keeps to the frames
if (!threw) {
  const F = rt.lastFrame(), set = F ? F.screen.subarray(0, 6144).reduce((a, b) => a + (b ? 1 : 0), 0) : 0;
  if (set < 1000) fail('the screen shown has ' + set + ' bytes of picture set');
  if (envelope) fail(envelope + ' writes use the AY\'s envelope');
  if (Math.abs(rt.t / WTPage.FRAME - (rt.shown + 1)) > 50) fail('the clock at frame ' + Math.round(rt.t / WTPage.FRAME) + ' with frame ' + rt.shown + ' shown');
  console.log(f + ' frames, ' + passes + ' passes, ' + writes + ' writes to the AY and the beeper; ' + set + ' bytes of picture set');
}
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
