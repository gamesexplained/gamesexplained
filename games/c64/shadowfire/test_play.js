'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine and its pacing) run in node on the memory the page carries, from the game's first
// instruction. The port's own tests hold each routine and the main loop to the game's code (port/
// test, with a contributor's moments of play); this one holds the page that is published, beside
// the game's own code on the kit's C64 (kit/c64/machine.js, from listing.json), with nothing from
// work/:
// - the demonstration's screens and tunes come at the C64's frames, each within a few;
// - over the first 3,000 frames of the Solution tab's game (F3, New game, the team chosen, the
//   first screens), the cursor is where the C64 has it on every frame, the interrupt runs once a
//   frame with that frame's joystick, and the screens come in the C64's order;
// - RUN/STOP with RESTORE brings back the control menu; Save game saves the game's state ($CA00-
//   $CFFE) under a typed name; after New game, Load game of the name puts it back; a name with no
//   file gets the game's FILE NOT FOUND and leaves the state as it was;
// - the mouse, as the light pen (F7) and as the paddles (F5), puts the cursor's cell under it, and
//   its click chooses the icon there (Old game).
// No frame throws, and the clock keeps to the frames.
//   node games/c64/shadowfire/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('sid');
g.lib('cpu6502');                   // the 6502 the port's music driver runs on, as play.html loads it
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'SFPort');
const { SFPage } = globalThis;
const cost = JSON.parse(/^window\.SF_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="sf-data">([^<]*)<\/script>/.exec(page)[1]);
const lib = require('./port/test/lib.js');
const rec = lib.solution();

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;

// ---- beside the C64: the screen ($5435), the tune ($1600) and the choice under way ($543E) as each
// frame begins, the page's from the frame it shows (its memory is ahead of it)
// (the tune's bit 7, a new tune the driver has yet to start, left out: it lasts less than a frame)
const key = M => M[0x5435] + ',' + (M[0x1600] & 0x7F) + ',' + M[0x543E];
function beside(frames, input, opts = {}) {
  const rt = SFPage.create({ data, cost });
  const m = lib.boot(Object.assign({ dma: rec.dma }, opts));
  const A = [], B = [], cursor = [], odd = [];
  let la = '', lb = '', irqs = 0, read = null;
  const irq = rt.P.irq;
  rt.P.irq = function () { if (!irqs++) read = rt.input.joy1; return irq.apply(this, arguments); };
  for (let f = 0; f < frames; f++) {
    const { keys, joy } = input(f);
    rt.input.keys = new Set(keys);
    if (keys.includes('F3')) m.press(lib.KEY.F3); else m.release(lib.KEY.F3);
    rt.input.joy1 = m.joy1 = 0x1F & ~joy;
    const kb = key(m.ram), cb = m.ram[0x68E5] + ',' + m.vic[1];
    if (kb !== lb) { B.push([f, kb]); lb = kb; }
    irqs = 0;
    const F = rt.runFrame(); m.runFrames(1);
    if (F) {
      const ka = key(F.mem);
      if (ka !== la) { A.push([f, ka]); la = ka; }
      if (F.mem[0x68E5] + ',' + F.vic[1] !== cb) cursor.push(f);
    }
    if (f >= 2 && (irqs !== 1 || read !== rt.input.joy1)) odd.push(f + ':' + irqs);
  }
  return { A, B, cursor, odd };
}
// the same screens and tunes in the same order, each within slack frames of the C64's
function sameEvents(what, A, B, slack) {
  let worst = 0;
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    if (!A[i] || !B[i] || A[i][1] !== B[i][1]) { fail(what + ': event ' + i + ' on the page ' + (A[i] || []).join(':') + ', on the C64 ' + (B[i] || []).join(':')); return; }
    worst = Math.max(worst, Math.abs(A[i][0] - B[i][0]));
  }
  if (worst > slack) fail(what + ': an event ' + worst + ' frames from the C64\'s');
  else console.log(what + ': ' + A.length + ' screens and tunes, each within ' + worst + ' frames of the C64\'s');
}
{
  const r = beside(3900, () => ({ keys: [], joy: 0 }));
  sameEvents('the demonstration', r.A, r.B, 5);
}
{
  // the Solution tab's recording replays a byte a frame, on the timing it was made on: the machine's
  // before it took interrupts as the processor does (test_solution.js)
  const r = beside(3000, f => ({ keys: f >= rec.f3[0] && f < rec.f3[1] ? ['F3'] : [], joy: rec.joy[f] }), { legacyInterrupts: true });
  // a choice a frame or two sooner than the C64's can catch the cursor's frame a turn of the icon
  // loop sooner, about ten frames
  sameEvents('the Solution tab\'s first 3,000 frames', r.A, r.B, 12);
  if (r.cursor.length) fail('the cursor apart from the C64\'s on ' + r.cursor.length + ' frames, the first ' + r.cursor[0]);
  else console.log('the cursor where the C64 has it on each of 3,000 frames');
  if (r.odd.length) fail('frames with other than one interrupt, or one that read another frame\'s joystick: ' + r.odd.slice(0, 8).join(' '));
  else console.log('the interrupt once a frame, with that frame\'s joystick');
}

// ---- the page alone: the menus, a save and a load, the mouse
const saved = [];
const STATE = () => Array.from(rt.M.subarray(0xCA00, 0xCFFF));
const rt = SFPage.create({ data, cost, onSave: (name, bytes) => saved.push([name, bytes, STATE()]) });
const M = rt.M;
let f = 0, threw = null;
const run = (n, keys = [], joy = 0) => {
  rt.input.keys = new Set(keys); rt.input.joy1 = 0x1F & ~joy;
  for (let i = 0; i < n && !threw; i++, f++) {
    try { rt.runFrame(); } catch (e) { threw = e; fail('frame ' + f + ': ' + e.message); }
  }
};
const w = a => M[a] | M[a + 1] << 8;
// the icons of the screen under way that can be chosen, as lockstep.js's explorer finds them, at
// their centre cells
function icons() {
  const out = [];
  let p = w(0x789C + 2 * M[0x5435]);
  for (let i = 0; i < 64 && w(p) !== 0xFFFF; i++, p += 11) {
    const pic = w(p);
    if (M[p + 4] & 1) out.push({ h: w(p + 9), row: M[p + 3] + 1 + ((M[pic + 1] - 1) >> 1), col: M[p + 2] + 1 + ((M[pic] - 1) >> 1),
      top: M[p + 3] + 1, left: M[p + 2] + 1, hgt: M[pic + 1], wdt: M[pic] });
  }
  return out;
}
// the joystick onto the icon with handler h, and once the game has framed it (frame_icon, with
// fire_flag, $78, set to $FF first) since the last choice, fire held until the game takes it (the
// interrupt clears $78): a fire before the frame is drawn is lost, on a C64 too
let framed = 0, fired = -1;
const frameIcon = rt.P.frame_icon;
rt.P.frame_icon = function* (...a) { const r = yield* frameIcon.apply(this, a); framed = f; return r; };
function choose(h, what) {
  let t = null, still = 0;
  for (let n = 0; n < 2000 && !threw; n++) {
    t = icons().find(i => i.h === h);
    if (!t) { run(1); continue; }
    const dx = t.col * 4 + 4 - M[0x68E5], dy = t.row * 8 + 0x24 - rt.vic[1];
    let j = 0;
    if (dx > 1) j |= RIGHT; else if (dx < -1) j |= LEFT;
    if (dy > 1) j |= DOWN; else if (dy < -1) j |= UP;
    // the cursor's cell in the icon (the cursor moves across in steps of two cells, and an icon at the
    // screen's edge has its centre beyond where the cursor can go)
    const on = M[0x76] >= t.top && M[0x76] < t.top + t.hgt && M[0x77] >= t.left && M[0x77] < t.left + t.wdt;
    if (on && Math.abs(dx) <= 8 && Math.abs(dy) <= 8) j = 0;
    if (!j && on) {
      // still on it for a few frames, framed since the last choice
      if (M[0x78] !== 0xFF || framed <= fired || still++ < 3) { run(1); continue; }
      let k = 0;
      while (M[0x78] && k++ < 60) run(1, [], FIRE);
      fired = f;
      run(4);
      return true;
    }
    // the main program puts the cursor's cell in $76 and $77 a few frames after the cursor moves
    // (cursor_cell): a cell off once it has had time, a tap towards the icon
    if (j) still = 0;
    else if (still++ > 8) { j = (M[0x77] < t.left ? RIGHT : M[0x77] >= t.left + t.wdt ? LEFT : 0) | (M[0x76] < t.top ? DOWN : M[0x76] >= t.top + t.hgt ? UP : 0); still = 0; }
    run(1, [], j);
  }
  fail(what + (t ? ': the cursor never reached the icon' : ': no icon for it on screen ' + M[0x5435]));
  return false;
}
// RUN/STOP held with RESTORE, as the page's button does, then a control on the control menu, held
// until the start menu (screen 7) comes
function menu(k = 'F3') {
  rt.input.keys = new Set(['STOP']);
  rt.nmi();
  run(4, ['STOP']);
  let n = 0;
  while (M[0x5435] !== 7 && n++ < 600 && !threw) run(1, [k]);
  run(4);
  if (M[0x5435] !== 7) fail('RUN/STOP with RESTORE and ' + k + ': screen ' + M[0x5435] + ', not the start menu (7)');
}
const LETTER = c => 0x76AF + 4 * (c.charCodeAt(0) - 65);
function nameScreen(handler, name) {
  if (!choose(handler, 'the start menu\'s ' + (handler === 0x7648 ? 'Save' : 'Load') + ' game')) return false;
  if (!choose(0x769B, 'Disk')) return false;
  for (const c of name) if (!choose(LETTER(c), 'the letter ' + c)) return false;
  return choose(0x773E, 'the return icon');
}

// the joystick, New game and the Solution tab's moves to frame 3000
run(rec.f3[0]); run(rec.f3[1] - rec.f3[0], ['F3']);
for (; f < 3000 && !threw;) run(1, [], rec.joy[f]);
// Save game, to disk, as ZOFF
menu();
nameScreen(0x7648, 'ZOFF'); run(300);
if (saved.length !== 1 || saved[0][0] !== 'ZOFF') fail('the save: ' + saved.length + ' files, "' + (saved[0] || [''])[0] + '"');
else if (saved[0][1].length !== 0x5FF || saved[0][1].some((b, i) => b !== saved[0][2][i])) fail('the file saved is ' + saved[0][1].length + ' bytes, and not the game\'s state');
else console.log('saved "ZOFF", the 1,535 bytes of the game\'s state');
// New game, then Load game of ZOFF
menu(); choose(0x758E, 'New game'); run(300);
const fresh = STATE();
const file = saved.length ? saved[0][1] : [];
if (fresh.every((b, i) => b === file[i])) fail('New game left the state as it was saved');
menu(); nameScreen(0x762F, 'ZOFF'); run(300);
if (STATE().some((b, i) => b !== file[i])) fail('Load game of ZOFF did not put the state back');
else console.log('New game, then Load game of "ZOFF": the state as it was saved');
// a name with no file
const queued = [];
const q = rt.P.queue_message;
rt.P.queue_message = function (r) { queued.push(r.a | r.y << 8); return q.apply(this, arguments); };
for (let i = 0; i < 4; i++) choose(0x772D, 'rub out');
for (const c of 'NONE') choose(LETTER(c), 'the letter ' + c);
choose(0x773E, 'the return icon'); run(300);
if (!queued.includes(w(0x7FF6))) fail('a load of NONE: no FILE NOT FOUND, the messages ' + queued.map(a => a.toString(16)));
else if (STATE().some((b, i) => b !== file[i])) fail('a load of NONE changed the state');
else console.log('a load of "NONE": FILE NOT FOUND, and the state as it was');

// the mouse, as the light pen and as the paddles: the cursor's cell under it, a click on Old game
for (const [k, what] of [['F7', 'the light pen'], ['F5', 'the paddles']]) {
  menu(k);
  run(100);
  const t = icons().find(i => i.h === 0x7526);
  if (!t) { fail(what + ': no Old game on screen ' + M[0x5435]); continue; }
  rt.input.pen = { x: 36 + 8 * t.col, y: 39 + 8 * t.row };
  run(40);
  if (M[0x76] !== t.row || M[0x77] !== t.col) fail(what + ': the cursor\'s cell ' + M[0x76] + ',' + M[0x77] + ' with the mouse on ' + t.row + ',' + t.col);
  rt.input.button = true; run(4); rt.input.button = false; run(200);
  if (M[0x5435] === 7) fail(what + ': a click on Old game left the start menu up');
  else console.log(what + ': the cursor\'s cell under the mouse, and a click on Old game goes back to the game (screen ' + M[0x5435] + ')');
  rt.input.pen = null;
}
if (Math.abs(rt.t / SFPage.FRAME - (rt.shown + 1)) > 120) fail('the clock at frame ' + Math.round(rt.t / SFPage.FRAME) + ' with frame ' + rt.shown + ' shown');
if (!threw) console.log(f + ' frames on the page alone, none threw');
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
