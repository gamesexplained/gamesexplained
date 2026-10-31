'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine and its pacing) run in node on the memory the page carries, from where the loader hands
// over. The port's own tests hold each routine and the main program to the game's code (port/test,
// with moments of play saved in work/); this one holds the page that is published, beside the
// game's own code on the kit's C64 (port/test/lib.js's machine, from listing.json), with nothing
// from work/. Each frame both are given the same stick and keys.
// - The memory the page carries, every instruction of the game but the sound driver's left out,
//   plays as the whole memory does: over 2,000 frames from the start, every byte the game keeps
//   outside its code and the stack is the same on each frame.
// - From the start, with the joystick chosen and fire pressed now and then, the cursor at rest: the
//   windows that open and close and the clock's hours and weeks, each on the C64's frame, give or
//   take two, and on every frame the C64's passes of the main loop made, give or take three, for
//   6,000 frames.
// - Moments made here on the C64 a pass into play, with a war about to break out, the year about to
//   end, and the radiation about to end the game: the same, for 2,500 frames from each, with the
//   countries destroyed and the radiation too, give or take one frame in 200 once that is more
//   than two (a war's frames each take about a frame, below).
// - The test player (lib.bot) steering the cursor round the icons, windows and menus, with the
//   joystick and with the keyboard: the windows and the clock in step the same way, until the
//   cursor's path parts from the C64's (a frame read one frame later sends it another way), and
//   that after 300 frames of play at least.
// - The page alone, playing for 8,000 frames: no frame throws, the interrupt comes once a frame,
//   the clock keeps to the frames shown, and every stretch of the program it meets has its cost.
//   node games/c64/the-armageddon-man/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('sid');
g.lib('cpu6502');                   // the 6502 the port's sound driver runs on, as play.html loads it
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/src/names.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
const GIVES = { 'port/src/core.js': 'AMPort', 'port/src/names.js': 'AMNames', 'port/page/runtime.js': 'AMPage' };
for (const b of blocks) g.run(PAGE, b, GIVES[b] || 'AMGroups');
const { AMPage } = globalThis;
const cost = JSON.parse(/^window\.AM_COST = (.*);$/ms.exec(page.slice(page.indexOf('window.AM_COST'), page.indexOf('</script>', page.indexOf('window.AM_COST'))))[1]);
const data = JSON.parse(/<script type="application\/json" id="am-data">([^<]*)<\/script>/.exec(page)[1]);
const lib = require('./port/test/lib.js');
const { FRAME } = AMPage;

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const T0 = Date.now(), took = () => ' (' + ((Date.now() - T0) / 1000).toFixed(0) + ' s)';
// what the game keeps: the window on top of the stack (its record's address at $7E/$7F), the
// clock's hour and week, the countries destroyed and the radiation; the clock's tick, one a pass of
// the main loop ($5B54, 0 to 191 an hour); the cursor's place
const PASS = 0x7CD3;
const WHAT = { window: M => M[0x7E] | M[0x7F] << 8, hour: M => M[0x5B55], week: M => M[0x5B51], destroyed: M => M[0x5B50], radiation: M => M[0x5B53] };
const TICK = 0x5B54;
const cursor = vic => vic[0] + ',' + vic[1];
// the stick's bits as lib.bot gives them, on the keys the keyboard control reads
const KEYS = [[1, 'A'], [2, 'Z'], [4, 'N'], [8, 'M'], [16, 'SPACE']];
const KEYN = Object.fromEntries(Object.entries(lib.KEY).map(([k, v]) => [v, k]));
function give(rt, m) { rt.input.joy = m.joy; rt.input.keys = new Set([...m.keys].map(k => KEYN[k])); }
// the options panel's choice, F3 the joystick and F1 the keyboard, held for ten frames from frame 100
function choose(m, f, key) { if (f >= 100 && f < 110) m.press(key); else m.release(key); }
// a player: lib.bot on the joystick, or its stick's bits on the keys
function player(seed, keyboard) {
  const b = lib.bot(seed);
  return m => {
    const j = b(m);
    if (!keyboard) return;
    m.joy = 0x1F;
    for (const [bit, k] of KEYS) if (j & bit) m.press(k); else m.release(k);
  };
}
// fire for four frames in every 120, the stick at rest
const pulses = (m, f) => { m.joy = f % 120 < 4 ? 0x0F : 0x1F; };

// The page and the C64 side by side, frame by frame: each frame both get the input set on the C64
// (by input(m, f)), and the memory as each frame begins is compared: the changes of each of WHAT
// on each side, the passes each has made, by the clock's ticks, and the cursor's place.
function beside(m, rt, frames, input) {
  const n0 = Math.floor(m.cpu.cycles / FRAME), A = {}, B = {}, CA = [], CB = [], PA = [], PB = [];
  let pa = 0, pb = 0, ta = m.ram[TICK], tb = m.ram[TICK];
  for (const k in WHAT) { A[k] = []; B[k] = []; }
  for (let f = 1; f <= frames; f++) {
    input(m, f); give(rt, m);
    const n = n0 + f, at = n * FRAME;
    rt.runUntil(at);
    m.runCycles(at - m.cpu.cycles);
    const F = rt.frameAt(n);
    if (!F || F.frame !== n) throw new Error('the page kept no frame ' + n);
    for (const k in WHAT) {
      // a frame that begins inside the C64's interrupt, while it draws a radio message's character
      // with $7E pointed at the message's window, counts the window under it: the page runs its
      // interrupt whole, and the interrupt puts $7E back
      const a = WHAT[k](F.mem), b = k === 'window' && m.depth && B[k].length ? B[k][B[k].length - 1][1] : WHAT[k](m.ram);
      if (!A[k].length || A[k][A[k].length - 1][1] !== a) A[k].push([f, a]);
      if (!B[k].length || B[k][B[k].length - 1][1] !== b) B[k].push([f, b]);
    }
    pa += ((F.mem[TICK] - ta) % 192 + 192) % 192; ta = F.mem[TICK];
    pb += ((m.ram[TICK] - tb) % 192 + 192) % 192; tb = m.ram[TICK];
    PA.push(pa); PB.push(pb);
    CA.push(cursor(F.vic)); CB.push(cursor(m.vic));
  }
  return { A, B, CA, CB, PA, PB };
}
// The frame the cursor's path parts from the C64's: from there the page's cursor is on neither
// the C64's place on the same frame nor the one before or after it, four frames in a row
function parts(r) {
  let run = 0;
  for (let k = 0; k < r.CA.length; k++) {
    if (r.CA[k] !== r.CB[k] && r.CA[k] !== r.CB[k - 1] && r.CA[k] !== r.CB[k + 1]) { if (++run > 3) return k - 3; } else run = 0;
  }
  return r.CA.length;
}
// Each change on one side that lasts more than two frames is on the other side within two frames
// (or slack(f) of them). A change the other side makes and undoes within a frame or two, such as
// the window under two that close one after the other, need not be on both. And on every frame the page has made the C64's
// passes of the main loop, give or take three: a pass that reads fire on one side can be the one
// after it on the other, where the fire comes as the pass begins. Up to frame until. Gives the
// number of changes and passes, or false.
// In a war, two frames or one in 200 of the time since the moment, the more of the two: a war's
// frames each take about one of the C64's frames, so a cost a few cycles out lets a frame's work
// run into the next on one side and not the other, and a long war ends a few frames apart
const TWO = () => 2, WAR = f => Math.max(2, Math.floor(f / 200));
function inStep(r, until, what, slack = TWO) {
  let n = 0, most = 0;
  for (let k = 0; k < until - 1; k++) {
    const d = r.PA[k] - r.PB[k];
    if (Math.abs(d) > 3) { fail(what + ': on frame ' + (k + 1) + ' the page has made ' + r.PA[k] + ' passes of the main loop, the C64 ' + r.PB[k]); return false; }
    most = Math.max(most, Math.abs(d));
  }
  for (const k in WHAT) {
    const sides = [[r.A[k].filter(e => e[0] < until), r.B[k].filter(e => e[0] < until), 'the page'], [r.B[k].filter(e => e[0] < until), r.A[k].filter(e => e[0] < until), 'the C64']];
    for (const [X, Y, who] of sides) {
      for (let i = 1; i < X.length; i++) {
        const [f, v] = X[i], next = i + 1 < X.length ? X[i + 1][0] : until;
        if (next - f <= 2) continue;
        if (!Y.some(([h, w], j) => j > 0 && w === v && Math.abs(h - f) <= slack(f))) {
          const near = Y.filter(([h]) => Math.abs(h - f) <= 20).map(([h, w]) => h + ':' + w.toString(16)).join(' ');
          fail(what + ': ' + k + ' ' + v.toString(16) + ' on ' + who + ' on frame ' + f + ', not within ' + slack(f) + ' frames on the other (there: ' + (near || 'none') + ')');
          return false;
        }
        if (who === 'the page') n++;
      }
    }
  }
  return { n, passes: r.PB[until - 2], most };
}
const told = s => s.n + ' changes of the windows and the clock in step with the C64\'s, and its ' + s.passes + ' passes, give or take ' + s.most;
const changed = (r, k, until) => r.B[k].filter(e => e[0] > 1 && e[0] < until).length;

// ---- the memory the page carries, beside the whole memory: the same game
{
  const whole = lib.boot().save();
  const a = AMPage.create({ data, cost }), b = AMPage.create({ data, cost });
  b.restore(whole, p => p.main(), AMPage.START);
  const L = g.json('listing.json'), code = new Uint8Array(65536);
  for (const r of L.records) if (r.t === 'code') for (let i = 0; i < r.b.length; i++) code[r.a + i] = 1;
  const view = rt => ({ ram: rt.M, press: k => rt.input.keys.add(k), release: k => rt.input.keys.delete(k), set joy(v) { rt.input.joy = v; }, get joy() { return rt.input.joy; } });
  const va = view(a), vb = view(b), pa = lib.bot(5), pb = lib.bot(5);
  let first = -1;
  for (let f = 0; f < 2000 && first < 0; f++) {
    for (const v of [va, vb]) choose(v, f, 'F3');
    if (f > 400) { pa(va); pb(vb); }
    a.runFrame(); b.runFrame();
    for (let x = 2; x < 65536; x++) if (!code[x] && (x < 0x100 || x > 0x1FF) && a.M[x] !== b.M[x]) { first = f; fail('frame ' + f + ': $' + x.toString(16) + ' is ' + a.M[x] + ' on the memory the page carries, ' + b.M[x] + ' on the whole'); break; }
  }
  if (first < 0) console.log('the memory the page carries: 2,000 frames from the start as the whole memory plays them' + took());
}

// ---- from the start, fire now and then with the cursor at rest
{
  const N = 6000, m = lib.boot(), rt = AMPage.create({ data, cost });
  const r = beside(m, rt, N, (mm, f) => { choose(mm, f, 'F3'); pulses(mm, f); });
  const st = inStep(r, N, 'from the start');
  if (st) console.log('from the start, fire every 120 frames, to hour ' + m.ram[0x5B55] + ' of week ' + m.ram[0x5B51] + ': ' + told(st) + took());
}

// ---- moments a pass into play: a war, the year's end, the fallout
{
  const m = lib.boot();
  for (let f = 0; f < 700; f++) { choose(m, f, 'F3'); pulses(m, f); m.runFrames(1); }
  let at = false;
  for (let f = 700; f < 3000 && !at; f++) { pulses(m, f); at = m.runUntilPass(() => true, 1); }
  if (!at) { fail('no pass of the main loop by frame 3,000'); process.exit(1); }
  const base = m.save();
  const FORCE = {
    'a war': M => { for (let a = 0x5C5C; a < 0x5D5C; a++) M[a] = 0; M[0x5B54] = 0xBF; },
    'the year\'s end': M => { M[0x5B51] = 0x33; M[0x5B55] = 7; M[0x5B54] = 0xBF; },
    'the fallout': M => { M[0x5B53] = 0xFF; M[0x5B55] = 7; M[0x5B54] = 0xBF; },
  };
  for (const name in FORCE) {
    const c = lib.restore(base);
    FORCE[name](c.ram);
    const s = c.save(), rt = AMPage.create({ data, cost });
    rt.restore(s, p => p.resume(), PASS);
    const N = 2500;
    let r;
    try { r = beside(c, rt, N, pulses); } catch (e) { fail(name + ': ' + e.message); continue; }
    const st = inStep(r, N, name, WAR);
    if (st) console.log(name + ', ' + N + ' frames: ' + told(st) + ' (' + changed(r, 'window', N) + ' of the windows, ' + changed(r, 'destroyed', N) + ' of the countries destroyed, ' + changed(r, 'radiation', N) + ' of the radiation)' + took());
  }
}

// ---- the test player, with the joystick and with the keyboard
for (const [seed, keyboard] of [[1, false], [5, false], [2, true]]) {
  const N = 3000, m = lib.boot(), rt = AMPage.create({ data, cost }), play = player(seed * 7919, keyboard);
  const key = keyboard ? 'F1' : 'F3';
  const r = beside(m, rt, N, (mm, f) => { choose(mm, f, key); if (f > 400) play(mm); else { mm.joy = 0x1F; for (const [, k] of KEYS) mm.release(k); } });
  const until = parts(r), what = 'the test player (' + seed + ') on the ' + (keyboard ? 'keyboard' : 'joystick');
  const st = inStep(r, until, what);
  if (until < 700) fail(what + ': the cursor parts from the C64\'s on frame ' + until);
  else if (st) console.log(what + ', until the cursor parts from the C64\'s on frame ' + until + ': ' + told(st) + took());
}

// ---- the page alone: no frame throws, the interrupt once a frame, the clock keeps to the frames
// shown, and every stretch met has its cost
{
  const N = 8000, rt = AMPage.create({ data, cost });
  const view = { ram: rt.M, press: k => rt.input.keys.add(k), release: k => rt.input.keys.delete(k), set joy(v) { rt.input.joy = v; }, get joy() { return rt.input.joy; } };
  const play = lib.bot(23);
  let irqs = 0, ahead = 0, threw = null;
  const irq = rt.P.irq;
  rt.P.irq = function () { irqs++; return irq.apply(this, arguments); };
  for (let f = 0; f < N; f++) {
    choose(view, f, 'F3');
    if (f > 400) play(view);
    try { rt.runFrame(); } catch (e) { threw = e; fail('the page alone, frame ' + rt.shown + ': ' + e.message); break; }
    ahead = Math.max(ahead, rt.t / FRAME - (rt.shown + 1));
  }
  if (!threw) {
    if (Math.abs(irqs - N) > N / 100) fail(irqs + ' interrupts in ' + N + ' frames');
    if (ahead >= AMPage.AHEAD) fail('the clock ' + ahead.toFixed(1) + ' frames ahead of the frame shown, where the page keeps ' + AMPage.AHEAD);
    if (rt.unpriced.size) fail('stretches with no cost: ' + [...rt.unpriced].join(' '));
    console.log(N + ' frames of the page alone, to hour ' + rt.M[0x5B55] + ' of week ' + rt.M[0x5B51] + ': none threw, ' + irqs + ' interrupts, the clock at most ' + ahead.toFixed(1) + ' frames ahead of the frame shown' + took());
  }
}
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
