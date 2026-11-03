'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine, the pacing) run in node on the memory the page carries, from the loader's hand-over. The
// port's own tests hold each routine and the whole program to the game's code (port/test, with a
// contributor's moments of play); this one holds the page that is published, with nothing from
// work/. A player answers each read of the controls and of the keyboard by what the program is
// doing there, a key held for one read and let go for the next:
// - SELECT CONTROLS takes the keyboard; the designer's panel takes LOAD SCENARIO, the name 1 is
//   typed, the page's cassette finds 1.GAM after DESIGNER. and loads it, and the scenario's panel
//   starts the game for one player: the human turn reads the controls;
// - P and Q move the cursor a square right and a square up;
// - the cursor menu's END TURN and YES end the turn: the computer players take theirs and the
//   human turn comes back, the turn's count moved on;
// - with SELECT CONTROLS on the Kempston interface, the joystick moves the cursor;
// - a scenario asked for by a name the cassette does not hold is searched for until SPACE is held,
//   and the designer's panel comes back;
// - a loop the game never leaves (random_below given a limit of 0) leaves the page running, the
//   interrupt with it, as the Spectrum does;
// - the beeper plays, no frame throws, and every frame is shown in its turn, however far a long
//   stretch of the program takes the clock ahead of it.
//   node games/spectrum/lords-of-chaos/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, b === 'port/page/runtime.js' ? 'LOCPage' : 'LOCGroups');
const { LOCPage } = globalThis;
const cost = JSON.parse(/^window\.LOC_COST = ([\s\S]*?);\n<\/script>/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="loc-data">([^<]*)<\/script>/.exec(page)[1]);

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const FRAME = LOCPage.FRAME;
const CHOICE = 0xC662, ROW = 0xD0D3, COL = 0xD0D4, TURN = 0xD065, PLAYER = 0x5B11;
// the routines whose reads the player answers, innermost first
const WATCH = ['run_file_menu', 'ask_file_name', 'find_file', 'start_game', 'human_turn', 'run_menu', 'wait_fire', 'wait_press', 'computer_turn'];

// A machine as the page makes one, with the routines it is inside kept (ctx, every one that waits
// for something) and the player's answer (decide(read, routine, rt), the innermost of WATCH) given
// at each read of the controls ($622B) and of the keyboard ($028E).
const watched = new Set(WATCH);
function machine(decide) {
  const rt = LOCPage.create({ data, cost });
  const ctx = [], seen = {};
  const inner = () => { for (let i = ctx.length - 1; i >= 0; i--) if (watched.has(ctx[i])) return ctx[i]; return ''; };
  for (const n of rt.P.GEN) {
    const f = rt.P[n];
    rt.P[n] = function* (...a) {
      ctx.push(n); seen[n] = (seen[n] || 0) + 1;
      try { return yield* f.apply(this, a); } finally { ctx.pop(); }
    };
  }
  let held = false, reads = 0, beeps = 0, f = 0, threw = null, lead = 0, skipped = 0;
  const joyBits = { RIGHT: 1, LEFT: 2, DOWN: 4, UP: 8, FIRE: 16 };
  rt.restore(data, P => (function* (gen) {
    P.part = 0;
    for (;;) {
      const r = gen.next();
      if (r.done) return r.value;
      const y = r.value;
      if (y && (y.cp === 0x622B || y.cp === 0x028E)) {
        reads++;
        const k = held ? [] : decide(y.cp, inner(), rt) || [];
        rt.input.keys = new Set(k.filter(x => !joyBits[x]));
        rt.input.joy = k.reduce((j, x) => j | (joyBits[x] || 0), 0);
        held = k.length > 0;
      }
      yield y;
    }
  })(P.run(0xE1ED)));
  rt.onBeep(() => beeps++);
  const run = (n, until) => {
    for (let i = 0; i < n && !threw; i++, f++) {
      let shown = null;
      try { shown = rt.runFrame(); } catch (e) { threw = e; fail('frame ' + f + ': ' + e.message); }
      if (shown && shown.frame !== rt.shown) skipped++;
      lead = Math.max(lead, rt.t / FRAME - (rt.shown + 1));
      if (until && until()) return true;
    }
    return false;
  };
  return { rt, ctx, seen, run, inner, get f() { return f; }, get reads() { return reads; }, get beeps() { return beeps; }, get threw() { return threw; }, get lead() { return lead; }, get skipped() { return skipped; } };
}

// the index in the menu on screen of the option whose routine is named name: the menu's options at
// $D1E8, each the number of its routine's word in the table at table (dispatch_menu)
function option(rt, table, name) {
  const M = rt.M;
  for (let i = 0; i < M[0x5B0A]; i++) {
    const a = (table + 2 * M[0xD1E8 + i]) & 0xFFFF;
    if (rt.P.CODE[M[a] | M[(a + 1) & 0xFFFF] << 8] === name) return i;
  }
  return -1;
}
// the controls a move takes on the control type the game reads ($622A): 0 the keyboard (Q, A, O,
// P and SPACE), 1 the Kempston interface, 2 a Sinclair stick (9, 8, 6, 7 and 0)
const CONTROLS = [
  { up: 'Q', down: 'A', left: 'O', right: 'P', fire: 'SPACE' },
  { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', fire: 'FIRE' },
  { up: '9', down: '8', left: '6', right: '7', fire: '0' },
];
const toward = (rt, i) => (i < 0 ? [] : rt.M[CHOICE] === i ? ['fire'] : [rt.M[CHOICE] < i ? 'down' : 'up']);

// The player: the controls chosen at SELECT CONTROLS (o.controls), the scenario's name typed, one
// player; on the human turn the moves in o.moves, one a read, then the turn ended (o.endTurn).
function player(o) {
  const st = { typed: 0, moves: (o.moves || []).slice(), menu: null };
  const moves = (read, at, rt) => {
    const M = rt.M, part = rt.P.part;
    if (at === 'run_file_menu') {
      if (M[0x5B0A] === 3 && part === 0) return M[CHOICE] === o.controls ? ['fire'] : ['down'];  // SELECT CONTROLS
      if (part === 0) return toward(rt, 4);                                                   // the designer's LOAD SCENARIO
      return toward(rt, 0);                                                                   // the scenario's PLAY GAME
    }
    if (at === 'wait_fire' || at === 'wait_press') return ['fire'];
    if (at === 'human_turn') {
      if (st.moves.length) return [st.moves.shift()];
      if (o.movesDone) { o.movesDone(rt); o.movesDone = null; }
      if (o.endTurn) { st.menu = 'cursor'; return ['fire']; }
      return [];
    }
    if (at === 'run_menu') {
      const i = st.menu === 'cursor' ? option(rt, 0x9334, 'end_turn') : st.menu === 'endturn' ? option(rt, 0x7557, 'end_turn_yes') : 0;
      if (M[CHOICE] === i) { st.menu = st.menu === 'cursor' ? 'endturn' : null; return ['fire']; }
      return toward(rt, i);
    }
    return [];
  };
  return (read, at, rt) => {
    if (read === 0x028E) {
      if (at === 'ask_file_name') return st.typed++ === 0 ? [o.name] : st.typed > 3 ? (st.typed = 0, ['ENTER']) : [];
      if (at === 'start_game') return ['1'];
      if (at === 'find_file') return o.breakSearch && o.breakSearch(rt) ? ['SPACE'] : [];
      return [];
    }
    const c = CONTROLS[rt.M[0x622A]] || CONTROLS[0];
    return moves(read, at, rt).map(k => c[k]);
  };
}
// The clock runs ahead of the frame shown by a stretch the port runs without a stop (the start of a
// game, some nine seconds), and each frame of it is shown as the clock went through it: none is
// skipped.
const keepsTime = (what, m) => {
  if (m.skipped) fail(what + ': ' + m.skipped + ' frames shown were not the frame due, the clock ' + m.lead.toFixed(1) + ' frames ahead at most');
  return m.lead.toFixed(1);
};
const cursorMoved = (M, from, dr, dc) => ((M[ROW] - from[0]) & 255) === (dr & 255) && ((M[COL] - from[1]) & 255) === (dc & 255);
const square = (M, at) => 'row ' + (at ? at[0] : M[ROW]) + ', column ' + (at ? at[1] : M[COL]);

// --- from the hand-over into play on the keyboard, the cursor moved, the turn ended and back
{
  let at = null, moved = null;
  const o = { controls: 0, name: '1', moves: ['right', 'up'], endTurn: true, movesDone: rt => { moved = [rt.M[ROW], rt.M[COL]]; } };
  const m = machine(player(o)), M = m.rt.M;
  if (!m.run(6000, () => m.inner() === 'human_turn')) fail('no human turn in 6000 frames from the hand-over (in ' + (m.ctx.join(' < ') || 'nothing') + ')');
  else {
    if (m.rt.P.part !== 1 || M[0xD03F] !== 1) fail('the human turn came with scenario ' + M[0xD03F] + ' loaded (part ' + m.rt.P.part + ')');
    if (M[0x622A] !== 0) fail('SELECT CONTROLS left control type ' + M[0x622A]);
    console.log('play reached: SELECT CONTROLS, LOAD SCENARIO and 1.GAM found on the cassette, the human turn at frame ' + m.f + ', ' + m.reads + ' reads');
    at = [M[ROW], M[COL]];
    const turn0 = M[TURN], f0 = m.f;
    let left = false;
    const back = m.run(30000, () => { if (!m.ctx.includes('human_turn')) left = true; return left && m.inner() === 'human_turn'; });
    if (!moved || !cursorMoved({ [ROW]: moved[0], [COL]: moved[1] }, at, -1, 1)) fail('P and Q moved the cursor from ' + square(M, at) + ' to ' + (moved ? square(M, moved) : 'nowhere'));
    else console.log('P and Q: the cursor from ' + square(M, at) + ' to ' + square(M, moved));
    if (!back) fail('after END TURN no human turn came back in 30000 frames (in ' + (m.ctx.join(' < ') || 'nothing') + ')');
    else if (!m.seen.computer_turn) fail('the turn ended with no computer player\'s turn');
    else if (M[TURN] === turn0) fail('the human turn came back with the turn\'s count still ' + turn0);
    else console.log('END TURN and YES: ' + m.seen.computer_turn + ' computer players\' turns in ' + (m.f - f0) + ' frames (' + ((m.f - f0) / 50).toFixed(1) + ' s), the turn ' + turn0 + ' to ' + M[TURN]);
  }
  if (!m.beeps) fail('the beeper never played');
  else console.log('the beeper: ' + m.beeps + ' edges; the clock at most ' + keepsTime('into play and through a turn', m) + ' frames ahead of the frame shown');
}

// --- the joysticks: the Kempston interface and a Sinclair stick
for (const [controls, name] of [[1, 'the Kempston interface'], [2, 'a Sinclair stick']]) {
  let moved = null;
  const m = machine(player({ controls, name: '1', moves: ['right', 'right', 'down'], movesDone: rt => { moved = [rt.M[ROW], rt.M[COL]]; } }));
  const M = m.rt.M;
  if (!m.run(6000, () => m.inner() === 'human_turn')) { fail('no human turn with ' + name); continue; }
  const at = [M[ROW], M[COL]];
  m.run(100);
  if (M[0x622A] !== controls) fail('SELECT CONTROLS left control type ' + M[0x622A] + ' for ' + name);
  else if (!moved || !cursorMoved({ [ROW]: moved[0], [COL]: moved[1] }, at, 1, 2)) fail(name + ' moved the cursor from ' + square(M, at) + ' to ' + (moved ? square(M, moved) : 'nowhere'));
  else console.log(name + ': right, right and down move the cursor from ' + square(M, at) + ' to ' + square(M, moved));
  keepsTime(name, m);
}

// --- a name the cassette does not hold: the search goes round the cassette until SPACE
{
  let blocks = 0;
  const m = machine(player({ controls: 0, name: '9', breakSearch: () => ++blocks > 40 }));
  const done = m.run(6000, () => blocks > 40 && m.inner() === 'run_file_menu');
  if (!done) fail('a search for 9 held with SPACE did not come back to the panel (in ' + (m.ctx.join(' < ') || 'nothing') + ')');
  else if (m.rt.P.part !== 0) fail('after the search the panel is part ' + m.rt.P.part + '\'s');
  else console.log('a search for 9: ' + blocks + ' blocks read round the cassette, then SPACE held, and the designer\'s panel back at frame ' + m.f);
}
// --- a loop the game never leaves: random_below given a limit of 0, on the human turn, throws
// P.Hang; the page goes on as the Spectrum does, the clock and the interrupt running (the cursor's
// blink count, $B45B, which the interrupt counts down) and every frame shown
{
  let hung = false;
  const into = player({ controls: 0, name: '1' });
  const m = machine((cp, inner, rt) => {
    if (inner === 'human_turn' && !hung) { hung = true; rt.P.random_below_a({ a: 0 }); }
    return into(cp, inner, rt);
  });
  m.run(6000, () => hung);
  const blink = new Set(), f0 = m.f;
  m.run(200, () => { blink.add(m.rt.M[0xB45B]); return false; });
  if (!hung) fail('no human turn to hang in');
  else if (m.threw || m.f - f0 < 200) fail('after random_below with a limit of 0 the page stopped at frame ' + m.f);
  else if (blink.size < 2) fail('after random_below with a limit of 0 the interrupt stopped: the blink count stayed ' + [...blink]);
  else {
    const lag = keepsTime('a loop the game never leaves', m);
    console.log('random_below with a limit of 0: 200 frames on, the interrupt still counting the cursor\'s blink (' + blink.size + ' values), the clock at most ' + lag + ' frames ahead');
  }
}
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
