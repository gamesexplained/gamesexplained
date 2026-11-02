'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine, the pacing) run in node on the memory the page carries, from the loader's hand-over. The
// port's own tests hold each routine and the whole program to the game's code (port/test, with a
// contributor's moments of play and the scenarios that force each way out of play); this one holds
// the page that is published, with nothing from work/.
// - the security question is asked, and its word, looked up in the game's own table as the page
//   shows it, answered; ENTER at the control options (the keyboard) reaches play in Amethyst, with
//   the clock at four hours and running;
// - O walks the probe forward, W turns it, P looks up, SPACE gives the keys to the crosshair and
//   back, 0 fires, D drills (or says why not) and I opens the information screen, which another key
//   closes;
// - the view is drawn on the screen shown, and the beeper plays;
// - a sensor's hit plays its sound inside the interrupt, for longer than a frame, and the page
//   goes on, missing the frame starts that pass as the game does;
// - three wrong words wipe the machine, as the game does.
// No frame throws, and the clock keeps to the frames.
//   node games/spectrum/driller/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'DRPort');
const { DRPage } = globalThis;
const cost = JSON.parse(/^window\.DR_COST = ([\s\S]*?);\n<\/script>/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="dr-data">([^<]*)<\/script>/.exec(page)[1]);

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const PASS = 0x9807;
// the probe's x, height and z (three words), its pitch, heading and roll, and the keys' mode
const place = M => Array.from(M.subarray(0x8762, 0x8768)).join();
const angles = M => Array.from(M.subarray(0x876C, 0x876F)).join();
const clock = M => String.fromCharCode(...M.subarray(0x88A4, 0x88AC));

// The security question's word: the page, line and word it shows (the digits at $CB38, $CB52 and
// $CB6C) looked up in the game's table at $ABC1, as the page's own answer() does.
function answer(M) {
  const num = a => +String.fromCharCode(M[a], M[a + 1]).trim();
  const [pg, line, word] = [num(0xCB38), num(0xCB52), num(0xCB6C)];
  if (!pg || !line || !word) return null;
  for (let a = 0xABC1; M[a]; a += M[a] + 4) {
    if (M[a + 1] - 0x40 !== pg || M[a + 2] !== line || M[a + 3] - 0x20 !== word) continue;
    let w = '';
    for (let i = 0; i < M[a]; i++) w += String.fromCharCode(((M[a + 4 + i] & 0xBF) | 0x80) >> 1);
    return w.toUpperCase();
  }
  return null;
}

// A machine as the page makes one, with the routines it watches marked: the question (the page
// shows the answer while it runs) and the control options.
function machine() {
  const rt = DRPage.create({ data, cost, tape: { save() {}, load() { return null; } } });
  const at = { asking: false, options: 0, passes: 0, beeps: 0 };
  const security = rt.P.security, options = rt.P.control_options;
  rt.P.security = function* (r) { at.asking = true; try { return yield* security.call(this, r); } finally { at.asking = false; } };
  rt.P.control_options = function* (r) { at.options++; return yield* options.call(this, r); };
  rt.restore(data, P => (function* () { for (const y of P.program(true)) { if (y && y.cp === PASS) at.passes++; yield y; } })());
  rt.onBeep(() => at.beeps++);
  let f = 0, threw = null;
  const run = (n, keys = [], joy = 0) => {
    rt.input.keys = new Set(keys); rt.input.joy = joy;
    for (let i = 0; i < n && !threw; i++, f++) {
      try { rt.runFrame(); } catch (e) { threw = e; fail('frame ' + f + ': ' + e.message); }
    }
  };
  // wait for the question's prompt, then type a word, each letter held 6 frames and let go for 6
  const ask = () => { let n = 0; while (!threw && !(at.asking && rt.M[0xCB6F] === 0x23 && answer(rt.M)) && n++ < 3000) run(1); return n < 3000; };
  const type = w => { for (const ch of w) { run(6, [ch]); run(6); } run(6, ['ENTER']); run(6); };
  return { rt, at, run, ask, type, get f() { return f; }, get threw() { return threw; } };
}

// --- from the hand-over into play
const m = machine(), { rt, at, run } = m;
if (!m.ask()) fail('no security question in 3000 frames from the hand-over');
const word = answer(rt.M);
console.log('the question: page ' + String.fromCharCode(rt.M[0xCB38], rt.M[0xCB39]).trim() + ', line ' +
  String.fromCharCode(rt.M[0xCB52], rt.M[0xCB53]).trim() + ', word ' + String.fromCharCode(rt.M[0xCB6C], rt.M[0xCB6D]).trim() + ': ' + word);
m.type(word);
for (let n = 0; !m.threw && !at.options && n < 500; n++) run(1);
if (!at.options) fail('no control options ' + m.f + ' frames on');
run(30); run(6, ['ENTER']); run(150);
if (!m.threw) {
  if (!at.passes) fail('no pass of play ' + m.f + ' frames from the hand-over');
  if (rt.M[0x8862] !== 1) fail('play began in area ' + rt.M[0x8862] + ', not 1');
  if (rt.M[0x8BF2]) fail('the game stands at ' + rt.M[0x8BF2] + ' ($8BF2), not 0');
  const c0 = clock(rt.M);
  if (!/^0[34]:[0-5]\d:[0-5]\d$/.test(c0)) fail('the clock reads ' + c0);
  run(150);
  if (clock(rt.M) === c0) fail('the clock stayed at ' + c0 + ' for 150 frames');
  console.log('play reached: ' + at.passes + ' passes by frame ' + m.f + ', area ' + rt.M[0x8862] + ', the clock ' + clock(rt.M));
}

// --- the keys of play: each changes what it should
const does = (what, keys, n, get) => {
  if (m.threw) return;
  const v0 = get(rt.M);
  run(n, keys); run(30);
  const v1 = get(rt.M);
  if (v0 === v1) fail(what + ' left ' + v0 + ' as it was');
  else console.log(what + ': ' + v0 + ' to ' + v1);
};
does('O, forward', ['O'], 60, place);
does('W, turn right', ['W'], 20, angles);
does('P, look up', ['P'], 10, angles);
does('L, look down', ['L'], 10, angles);
does('SPACE, the keys to the crosshair', ['SPACE'], 4, M => M[0x88AC]);
does('Q, the crosshair left', ['Q'], 20, M => M[0x88A0] + ',' + M[0x88A1]);
if (!m.threw) { const b = at.beeps; run(4, ['0']); run(60); if (at.beeps === b) fail('0 fired with no sound'); }
does('SPACE, the keys back to the probe', ['SPACE'], 4, M => M[0x88AC]);
// D: a rig placed costs 5 of energy; a place refused flashes its reason, which costs nothing
if (!m.threw) {
  const e0 = rt.M[0x8875], s0 = rt.M[0x877B];
  run(4, ['D']); run(200);
  console.log('D, drill: energy ' + e0 + ' to ' + rt.M[0x8875] + ', the sector\'s rig ' + s0 + ' to ' + rt.M[0x877B]);
  if (rt.M[0x877B] && rt.M[0x8875] !== e0 - 5) fail('a rig placed and the energy went from ' + e0 + ' to ' + rt.M[0x8875]);
}
// I: the information screen holds the game ($8BF2 = 6); Q goes back to play
if (!m.threw) {
  let n = 0;
  while (!m.threw && rt.M[0x8BF2] !== 6 && n++ < 100) run(1, ['I']);
  run(80);
  if (rt.M[0x8BF2] !== 6) fail('I held ' + n + ' frames gave no information screen');
  run(6, ['Q']); run(150);
  if (rt.M[0x8BF2]) fail('Q at the information screen left the game at ' + rt.M[0x8BF2]);
  else console.log('I and Q: the information screen and back');
}

// --- the screen shown has the view on it, the beeper played, and the clock keeps to the frames
if (!m.threw) {
  const F = rt.lastFrame();
  let set = 0;
  // the view window: rows 16 to 120 of the screen, 26 bytes from column 3
  for (let y = 16; y < 121 && F; y++) {
    const a = ((y & 0xC0) << 5) | ((y & 7) << 8) | ((y & 0x38) << 2);
    for (let x = 3; x < 29; x++) if (F.screen[a + x]) set++;
  }
  if (set < 300) fail('the view on the screen shown has ' + set + ' bytes of picture set');
  if (!at.beeps) fail('the beeper never moved');
  if (Math.abs(rt.t / DRPage.FRAME - (rt.shown + 1)) > 50) fail('the clock at frame ' + Math.round(rt.t / DRPage.FRAME) + ' with frame ' + rt.shown + ' shown');
  console.log(m.f + ' frames, ' + at.passes + ' passes, ' + at.beeps + ' changes of the beeper; ' + set + ' bytes of the view set');
}

// --- a sensor that hits at every interrupt it gets, as the interrupt's own list of sensors in view
// has it ($8A25, six bytes each from $8A44): each hit plays its sound inside the interrupt, for
// longer than a frame, so the frame starts that pass while it plays are missed. The page keeps
// going, a hit takes a unit of shield each time the interrupt runs, and the clock keeps to the
// frames. No key is held, so no pass of play writes the list again.
if (!m.threw) {
  run(30);
  const M = rt.M, s0 = M[0x8878], f0 = m.f;
  M[0x8A25] = 1;
  M.set([1, 1, 0, 2, 0, 0], 0x8A44);          // the object, every frame, the count, it fires
  run(60);
  const hits = s0 - M[0x8878];
  if (m.threw) { /* failed already */ }
  else if (hits < 15 || hits > 30) fail('a sensor hitting at every interrupt took ' + hits + ' of shield in 60 frames');
  else if (Math.abs(rt.t / DRPage.FRAME - (rt.shown + 1)) > 50) fail('with a sensor hitting, the clock at frame ' + Math.round(rt.t / DRPage.FRAME) + ' with frame ' + rt.shown + ' shown');
  else console.log('a sensor hitting at every interrupt: ' + hits + ' hits in ' + (m.f - f0) + ' frames, the shield ' + s0 + ' to ' + M[0x8878]);
}

// --- three wrong words wipe the machine
{
  const w = machine();
  for (let k = 0; k < 3 && !w.threw && !w.rt.wiped; k++) {
    if (!w.ask()) { fail('no question for wrong word ' + (k + 1)); break; }
    w.type(answer(w.rt.M) === 'ZZZ' ? 'ZZZZ' : 'ZZZ');
    w.run(60);
  }
  w.run(100);
  if (!w.rt.wiped) fail('three wrong words left the machine running');
  else console.log('three wrong words: the machine wiped, as the game does');
}
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
