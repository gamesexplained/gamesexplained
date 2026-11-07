'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the KERNAL
// and drive it runs on, the page's machine and its pacing) run in node on the data the page
// carries, from the loader's hand-over. The port's lockstep (port/test/lockstep.js) holds every
// pass to the game's code from the contributor's snapshots; this one holds the page that is
// published, beside the game's own code on the kit's C64 (kit/c64/machine.js with the KERNAL and
// the drive of port/src/kernal.js, port/test/lib.js), its memory the page's with the program put
// back from the listings, and its disk the page's with the start and life objects' program put back
// in MAP1, with nothing from work/. Both sides are handed the same dice (the SID's noise, which the
// kit's C64 reads as 0). For three of the lockstep's sessions, played by the frame on both:
// - each screen that settles on the C64 (the bitmap and its colours unchanged for 25 frames)
//   settles on the page too, in the same order, each within 60 frames of it, and each screen that
//   settles on the page is one the C64 shows (a screen the C64 shows for a little less than 25
//   frames may settle on the page);
// - the calls of GETIN, the game's look for a key, within 5 per cent of the C64's (a turn of the
//   wait for a key takes the C64 3,600 to 4,000 cycles, as the video chip takes cycles from it, and
//   the page the fitted mean);
// - every stretch the page meets has a cost the fit measured, and each frame shown is the one due;
// - the page on the memory it carries and on the whole memory, the program included, the same at
//   every frame in every byte outside the program, but for the drive's record buffer while it holds
//   a record of the program in MAP1: the port reads none of the code the page leaves out.
//   node games/c64/alter-ego/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const lib = require('./port/test/lib.js');
const { SESSIONS } = require('./port/test/lockstep.js');
const { program, inFile, OBJECTS } = require('./port/scripts/pack-data.js');
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64', 'play-controls');
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/src/kernal.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'AEPort');
const { AEPage, AEKernal } = globalThis;
const cost = JSON.parse(/^window\.AE_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="ae-data">([^<]*)<\/script>/.exec(page)[1]);
const { FRAME } = lib;
const b64 = s => new Uint8Array(Buffer.from(s, 'base64'));

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };

// ---- the whole memory and the whole disk: the page's, with the listings' program put back
const listing = part => g.listing('parts/' + part + '/listing.json');
const progs = {};
for (const part of ['main', 'start', 'life']) progs[part] = program(part);
const ram = b64(data.state.ram), main = listing('main');
for (const a of progs.main) if (a < 0x8466) ram[a] = main.ram[a];
const map1 = b64(data.files.MAP1);
for (const [part, at] of Object.entries(OBJECTS)) {
  const L = listing(part), h = [0, 1, 2, 3].map(i => map1[inFile(at + i)]), base = h[0] | h[1] << 8;
  for (const a of progs[part]) map1[inFile(at + 4 + a - base)] = L.ram[a];
}
const full = { state: Object.assign({}, data.state, { ram: Buffer.from(ram).toString('base64') }),
  files: Object.assign({}, data.files, { MAP1: Buffer.from(map1).toString('base64') }), glyphs: data.glyphs };
// the bytes of the program, wherever it lands
const code = new Uint8Array(0x10000);
for (const s of Object.values(progs)) for (const a of s) code[a] = 1;
// MAP1's payload offsets that hold the objects' program, which the drive's record buffer holds when
// it holds their records: $8046 the MAP file's number (1), $8047 a colon, 252 bytes from $8048, and
// the record's number at $7E9D
const inMap1 = new Set();
for (const [part, at] of Object.entries(OBJECTS)) {
  const h = [0, 1].map(i => map1[inFile(at + i)]), base = h[0] | h[1] << 8;
  for (const a of progs[part]) inMap1.add(at + 4 + a - base);
}
const recordOfProgram = (M, x) => x >= 0x8048 && x < 0x8144 && M[0x8046] === 1 && inMap1.has((M[0x7E9D] | M[0x7E9E] << 8) * 252 + x - 0x8048);

// ---- the same dice on both sides, in the order each reads them
function dice(seed) { let x = seed >>> 0; return () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return (x >>> 16) & 255; }; }

// the game on the kit's C64, from the same hand-over, on the whole disk (or the disk as a run
// before left it), its dice from roll
function gameMachine(roll, files) {
  if (!files) { files = {}; for (const [k, v] of Object.entries(full.files)) files[k] = b64(v); }
  const m = lib.AEMachine.restore(Object.assign({}, full.state, { drive: AEKernal.drive({ files }) }),
    { rom: { char: b64(full.glyphs) }, dma: true, passAt: 0x6DFA });
  m.frames = 0; m.passes = 0;
  const rd = m.ioRead;
  m.ioRead = function (a) { return (a & 0xFC1F) === 0xD41B ? roll() : rd.call(this, a); };
  return m;
}
// a frame of the C64's: QUIT resets the machine, and the kit's has no KERNAL ROM to reset it, so
// the game starts again from the hand-over on the disk as it was left, as the page starts it
function c64Frame(c) {
  try { c.m.runFrames(1); }
  catch (e) {
    if (e.address !== 0xFCE2) throw e;
    const old = c.m;
    c.m = gameMachine(c.roll, Object.assign({}, old.cpu.drive.files));
    c.m.frames = old.frames; c.m.passes = old.passes;
    for (const k of old.keys) c.m.keys.add(k);
    c.resets++;
  }
}
// a session's keys as events by the frame: [frame, keys held from then]
function script(steps) {
  const out = [];
  let f = 0;
  const key = (k, hold = 6, after = 20) => { out.push([f, k.split('+')]); f += hold; out.push([f, []]); f += after; };
  for (const [op, a, b, c] of steps) {
    if (op === 'run') f += a;
    else if (op === 'key') key(a, b, c);
    else if (op === 'type') for (const ch of a) key(ch === ' ' ? 'SPACE' : ch.toUpperCase(), 4, 8);
  }
  return { events: out, frames: f + 300 };
}
// the screen as a number: the bitmap and its colours
function screenHash(M) {
  let h = 2166136261;
  for (let a = 0x0400; a < 0x07E8; a++) h = Math.imul(h ^ M[a], 16777619);
  for (let a = 0x2000; a < 0x3F40; a++) h = Math.imul(h ^ M[a], 16777619);
  return h >>> 0;
}
function settled() {
  let last = null, run = 0, shown = null;
  const out = [];
  return { out, see(f, h) {
    if (h === last) run++; else { last = h; run = 1; }
    if (run === 25 && h !== shown) { shown = h; out.push([f - 24, h]); }
  } };
}

function beside(name, seed) {
  const s = script(SESSIONS[name]);
  const rt = AEPage.create({ data, cost, dice: dice(seed) });
  const c = { roll: dice(seed), resets: 0 };
  c.m = gameMachine(c.roll);
  // the page's keys as the page holds them: each down for three frames of the game's time at least
  // (play.template.html, PlayControls.hold), whose clock is ahead while the game is busy
  const held = PlayControls.hold({ clock: () => rt.frame, least: () => 3,
    change: () => { rt.input.keys = new Set([].concat(...held.values())); } });
  const A = settled(), B = settled(), shown = new Set();
  let ev = 0, ok = true;
  for (let f = 0; f < s.frames && ok; f++) {
    while (ev < s.events.length && s.events[ev][0] === f) {
      const keys = s.events[ev++][1];
      if (keys.length) held.down('script', keys); else held.up('script');
      c.m.keys.clear(); for (const k of keys) c.m.press(lib.KEY[k]);
    }
    try { rt.runFrame(); } catch (e) { fail(name + ': frame ' + f + ': ' + e.message); ok = false; break; }
    held.release();
    c64Frame(c);
    const m = c.m;
    if (rt.t < rt.target || rt.shown !== Math.floor(rt.target / FRAME) - 1) { fail(name + ': frame ' + f + ': the clock at ' + rt.t + ', the frame\'s end at ' + rt.target + ', frame ' + rt.shown + ' shown'); ok = false; }
    const hb = screenHash(m.ram);
    A.see(f, screenHash(rt.lastFrame().mem)); B.see(f, hb); shown.add(hb);
  }
  const m = c.m;
  const a = A.out, b = B.out;
  // the C64's in turn on the page's, each the next of its kind there
  let i = 0, worst = 0, at = -1, bad = null;
  for (let j = 0; j < b.length && !bad; j++) {
    while (i < a.length && a[i][1] !== b[j][1]) i++;
    if (i === a.length) bad = 'screen ' + (j + 1) + ' to settle on the C64 (frame ' + b[j][0] + ') never settles on the page after the last that matched';
    else {
      const gap = Math.abs(a[i][0] - b[j][0]);
      if (gap > worst) { worst = gap; at = j; }
      i++;
    }
  }
  const strange = a.filter(e => !shown.has(e[1]));
  if (bad) fail(name + ': ' + bad + ' (' + a.length + ' screens settle on the page, ' + b.length + ' on the C64)');
  else if (worst > 60) fail(name + ': screen ' + (at + 1) + ' to settle on the C64 settles ' + worst + ' frames from it on the page');
  else if (strange.length) fail(name + ': ' + strange.length + ' screens settle on the page that the C64 never shows, the first at frame ' + strange[0][0]);
  else console.log('ok   ' + name + ': the ' + b.length + ' screens that settle on the C64 settle on the page in the same order, within ' + worst + ' frames (' + (a.length - b.length) + ' more settle on the page)');
  const e = (rt.passes - m.passes) / m.passes;
  if (Math.abs(e) > 0.05) fail(name + ': ' + rt.passes + ' calls of GETIN on the page, ' + m.passes + ' on the C64');
  else console.log('ok   ' + name + ': ' + rt.passes + ' calls of GETIN on the page, ' + m.passes + ' on the C64 (' + (e * 100).toFixed(1) + '%)');
  if (rt.missing.size) fail(name + ': stretches with no cost: ' + [...rt.missing].join(' '));
  return { rt, m };
}

// ---- beside the C64: a game begun with the answers left to chance, a stage played, the menu
beside('new-random', 1);
beside('infancy', 2);
beside('save', 3);

// ---- the memory the page carries against the whole memory
{
  const s = script(SESSIONS.infancy);
  const a = AEPage.create({ data, cost, dice: dice(4) }), b = AEPage.create({ data: full, cost, dice: dice(4) });
  let ev = 0, bad = -1, f = 0;
  outer: for (; f < s.frames; f++) {
    while (ev < s.events.length && s.events[ev][0] === f) { const k = new Set(s.events[ev++][1]); a.input.keys = k; b.input.keys = new Set(k); }
    a.runFrame(); b.runFrame();
    for (let x = 0; x < 0x10000; x++) if (!code[x] && a.M[x] !== b.M[x] && !recordOfProgram(b.M, x)) { bad = x; break outer; }
  }
  if (bad >= 0) fail('the page on its own memory and on the whole memory differ at frame ' + f + ', $' + bad.toString(16).toUpperCase() + ': the port read code the page leaves out');
  else console.log('ok   the page on its own memory and on the whole memory alike for ' + f + ' frames');
}

// ---- Fast: the page's switch runs at once each frame in which the game looks for no key, until it
// looks for one again (runtime.js, runBusy; play.template.html, tick). Played a key at a time, each
// pressed once the game has looked for a key in 25 frames on end and held for its frames of the
// game's time, a session goes the same with Fast on and off: the same memory at every key, and
// every stretch Fast runs at once ends with the game looking for a key, so that Fast never runs
// the clock on while the game waits for the player
function hash(M) {
  let h = 2166136261;
  for (let a = 0; a < 0x10000; a++) h = Math.imul(h ^ M[a], 16777619);
  return h >>> 0;
}
function atWaits(name, fast) {
  const keys = [];
  for (const [op, a, b] of SESSIONS[name]) {
    if (op === 'key') keys.push([a.split('+'), b]);
    else if (op === 'type') for (const ch of a) keys.push([[ch === ' ' ? 'SPACE' : ch.toUpperCase()], 4]);
  }
  const rt = AEPage.create({ data, cost, dice: dice(5) });
  const screens = [];
  let k = 0, idle = 0, up = -1, refreshes = 0, longest = 0, waited = 0;
  // after each frame of the game's, as the page does it: a key let go once held its frames, and the
  // frames counted since the game last looked for no key or a key was let go
  const after = () => {
    if (up >= 0 && rt.frame >= up) { rt.input.keys = new Set(); up = -1; idle = 0; }
    else idle = rt.busy ? 0 : idle + 1;
  };
  for (; refreshes < 400000; refreshes++) {
    rt.runFrame(); after();
    if (rt.busy) waited++;
    if (fast && rt.busy) {
      const n = rt.runBusy(i => { if (i) after(); return i >= 3000; });
      if (n) after();
      longest = Math.max(longest, 1 + n);
    }
    if (up < 0 && idle >= 25) {
      screens.push(hash(rt.M));
      if (k === keys.length) break;
      rt.input.keys = new Set(keys[k][0]); up = rt.frame + keys[k][1]; k++; idle = 0;
    }
  }
  return { screens, refreshes, waited, longest, keys: keys.length, frames: rt.frame };
}
for (const name of ['new-random', 'infancy', 'save']) {
  const off = atWaits(name, false), on = atWaits(name, true);
  const same = off.screens.length === on.screens.length && off.screens.every((h, i) => h === on.screens[i]);
  if (on.screens.length !== on.keys + 1 || off.screens.length !== off.keys + 1) fail(name + ' with Fast: ' + on.screens.length + ' and ' + off.screens.length + ' waits for ' + on.keys + ' keys');
  else if (!same) fail(name + ' with Fast: the memory at key ' + off.screens.findIndex((h, i) => h !== on.screens[i]) + ' differs from the memory without it');
  else if (on.longest >= 3000) fail(name + ' with Fast: a stretch of 3,000 frames with no look for a key');
  else console.log('ok   ' + name + ' with Fast: the same memory at each of ' + on.keys + ' keys; the player kept waiting ' + on.waited + ' frames of real time against ' + off.waited + ' without, the longest stretch run at once ' + on.longest + ' frames');
}

console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
