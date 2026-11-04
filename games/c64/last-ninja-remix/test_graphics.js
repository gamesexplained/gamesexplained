#!/usr/bin/env node
// Hold graphics.html's lnr-gfx block and the page's FIGURES against the game's own code, run on the
// kit's 6502 over the listings, in each of the seven levels. test_index.js holds lnr-blow, which the
// two pages share, and lnrAnim with it, against the code; this checks what the Graphics tab adds:
// - the walk: PlayerDriver moves the frame on once LNR_WALK_TICKS ticks have gone by, and drops the
//   ticks left over;
// - the somersault and the weapon swap: InterpretControls, run for every heading and stick
//   direction, installs the somersault (action 0) exactly when fire is pressed afresh while he walks
//   with the stick an eighth of a turn or less from his heading, and the swap (action 4) when he
//   stands with another weapon picked than the one he holds; the swap raises event 1 on its fourth
//   command;
// - every scripted stream lnrStreams finds: the code it was found from is code in the listing, and
//   the level's interpreter (AnimationInterpreter for Armakuni's, InterpretScheduledEnemyAnimation
//   for the second actor's) reads it command by command as lnrSteps does;
// - the enemies: SpawnEnemy, run for each area, sets the kind ($7F), profile ($72) and delay ($D3
//   into InstallAiActionByDirection's table) lnrEnemies gives, over as many areas as lnrAreas
//   counts; every level has a get-up stream;
// - the level's own figures: every stream the page draws in that section has a caption in FIGURES
//   and every caption a stream; the entrance rules of the area a caption names, run on the 6502,
//   write the caption's multicolours to $D025 and $D026, or none where it gives none;
// - LNR_AFTER: the streams before carry a delay on every command and the streams after carry none;
// - the thrown images: ComposeSprites flips bit 3 of $0280 on each call, and lnrCompose's two
//   phases draw two different images.
// It exits 1 on any difference.
//   node games/c64/last-ninja-remix/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = globalThis.C64Cpu;
g.sameBlock('lnr-blow');                   // graphics.html carries index.html's copy, unchanged
const { lnrTables, lnrAnim } = g.run('graphics.html', 'lnr-blow', 'lnrTables', 'lnrAnim');
globalThis.lnrAnim = lnrAnim; globalThis.lnrTables = lnrTables;
const G = g.run('graphics.html', 'lnr-gfx', 'lnrMem', 'lnrFrameCount', 'lnrCompose', 'lnrAreas', 'lnrEnemies', 'lnrSteps', 'lnrStreams',
  'lnrThrown', 'LNR_WALK_TICKS', 'LNR_AFTER');
const { FIGURES } = g.run('graphics.html', 'FIGURES', 'FIGURES');
const L = (part) => g.listing(`parts/${part}/listing.json`);
const LEVELS = ['central-park', 'street', 'sewers', 'basement', 'office', 'mansion', 'final-battle'];
const Z = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };
const QUIET = { read: () => 0, write: () => {} };
const h4 = (n) => '$' + n.toString(16).toUpperCase().padStart(4, '0');
let bad = 0, checked = 0;
const fail = (...w) => { if (bad++ < 40) console.log('FAIL', ...w); };
const ok = () => checked++;
const word = (m, a) => m[a] | m[a + 1] << 8;
const E = L('engine');
for (const id of LEVELS) {
  const T = L(id + '-title'), Q = L(id), base = G.lnrMem(E, T, Q), S = lnrTables(base, Q), n = G.lnrFrameCount(base, Q);
  const st = G.lnrStreams(base, Q, S), code = new Set(Q.listing.records.filter((r) => r.t === 'code').map((r) => r.a));
  const sym = (name) => Q.sym(name);
  // --- the walk
  {
    const pd = sym('PlayerDriver');
    let at = -1;
    for (let a = pd; a < pd + 0xC0 && at < 0; a++) if ([0x65, 0x79, 0x85, 0x79, 0xC9].every((v, i) => base[a + i] === v)) at = a + 4;
    if (at < 0) fail(id, 'walk', 'no ADC $79 / STA $79 / CMP # in PlayerDriver');
    else if (base[at + 1] !== G.LNR_WALK_TICKS) fail(id, 'walk', h4(at), 'compares with', base[at + 1]);
    else {
      let reset = false;
      for (let a = at; a < at + 16; a++) if (base[a] === 0xA9 && base[a + 1] === 0 && base[a + 2] === 0x85 && base[a + 3] === 0x79) reset = true;
      if (!reset) fail(id, 'walk', 'the count at $79 is not set back to 0 after', h4(at)); else ok();
    }
  }
  // --- the somersault and the swap
  {
    const ic = sym('InterpretControls'), inc = sym('InterpretNormalizedControls'), sel = sym('SelectPlayerAnimationForAction');
    const dirs = word(base, inc + 6), anim = (k) => word(base, S.anims + 2 * k);
    for (let h = 0; h < 8; h++) for (let d = 0; d < 8; d++) {
      const x = [...Array(16).keys()].find((k) => base[dirs + k] === d), m = base.slice();
      Object.assign(m, { [0xB6]: 0, [0x7C]: 0x10 | x, [0x78]: 0, [0x6C]: 0, [0x69]: h, [0x68]: h, [0x6D]: 8, [0x61]: 0, [0x60]: 0 });
      let action = -1;
      new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: QUIET }).call(ic, Z, { maxSteps: 5000,
        hooks: { [sel]: (c) => { action = c.a; }, [inc]: () => true } });
      const want = [0, 1, 7].includes((d - h) & 7), k = (h + 2) & 4 ? 1 : 0;
      if (want !== (action === 0) || (want && word(m, 0x60) !== anim(k))) fail(id, 'somersault', 'heading', h, 'stick', d, 'action', action, h4(word(m, 0x60)));
      else ok();
    }
    for (let h = 0; h < 8; h++) for (const [held, picked] of [[0, 1], [2, 2], [3, 0]]) {
      const x = [...Array(16).keys()].find((k) => base[dirs + k] >= 0x80), m = base.slice();
      Object.assign(m, { [0xB6]: 0, [0x7C]: x, [0x78]: 0, [0x6C]: 0xFF, [0x69]: h, [0x68]: h, [0x6D]: h >> 1, [0x61]: 0, [0x60]: 0, [0x70]: held, [0x89]: picked, [0x65]: 0 });
      let action = -1;
      new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: QUIET }).call(ic, Z, { maxSteps: 5000,
        hooks: { [sel]: (c) => { action = c.a; }, [inc]: () => true } });
      const want = held !== picked, k = (h + 2) & 4 ? 3 : 2;
      if (want !== (action === 4) || (want && word(m, 0x60) !== anim(k))) fail(id, 'swap', 'heading', h, 'held', held, 'picked', picked, 'action', action);
      else ok();
    }
    for (const k of [2, 3]) {
      const s = lnrAnim(base, anim(k));
      if (!s[3] || s[3].event !== 1) fail(id, 'swap', k, 'event on the fourth command', s[3] && s[3].event); else ok();
    }
  }
  // --- the scripted streams, read by the level's interpreters
  for (const s of st.scripted) {
    if (!code.has(s.from)) { fail(id, 'stream', h4(s.at), 'found from', h4(s.from), 'which is not code in the listing'); continue; }
    if (s.sequence) { ok(); continue; }            // its parts are table streams, read by test_index.js
    const X = s.enemy ? 2 : 0, m = base.slice(), cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: QUIET });
    const entry = sym(s.enemy ? 'InterpretScheduledEnemyAnimation' : 'AnimationInterpreter');
    const stop = {};
    for (const name of ['ComposeSprites', 'ComposeEnemySprites', 'MovePlayer', 'MoveEnemy']) if (Q.byName.has(name)) stop[sym(name)] = () => true;
    m[0x60 + X] = s.at & 0xFF; m[0x61 + X] = s.at >> 8;
    let good = true;
    s.steps.forEach((x, i) => {
      if (!good) return;
      Object.assign(m, { [0x58 + X]: 0, [0x64 + X]: 0, [0x54 + X]: 100, [0x55 + X]: 100 });
      if (i && m[0x61 + X] === 0) { good = false; fail(id, 'stream', h4(s.at), 'ended after', i, 'of', s.steps.length); return; }
      cpu.call(entry, { ...Z, x: X }, { maxSteps: 100000, hooks: stop });
      if (m[0x65 + X] !== x.frame || (x.delay !== null && m[0x59 + X] !== x.delay) || m[0x64 + X] !== x.event ||
          ((m[0x54 + X] - 100) & 0xFF) !== (x.dx & 0xFF) || ((m[0x55 + X] - 100) & 0xFF) !== (x.dy & 0xFF)) {
        good = false; fail(id, 'stream', h4(s.at), 'command', i, 'frame', m[0x65 + X], x.frame, 'delay', m[0x59 + X], x.delay);
      }
    });
    if (good) ok();
  }
  // --- the enemies
  {
    const en = G.lnrEnemies(base, Q), sp = sym('SpawnEnemy'), ai = sym('InstallAiActionByDirection'), delays = word(base, ai + 0x13);
    for (let area = 0; area < G.lnrAreas(base, Q); area++) {
      const m = base.slice();
      m.fill(0, 0x012D, 0x0175);
      m[0xA2] = area; m[0x03E8] = 1;       // The Final Battle's area 1 has its enemy once item 16 is held
      new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: QUIET }).call(sp, Z, { maxSteps: 200000 });
      const e = en.find((x) => x.areas.includes(area));
      if (!e) continue;
      if (m[0x7F] !== e.kind || m[0x72] !== e.profile || base[delays + (m[0xD3] & 3)] !== e.delay)
        fail(id, 'enemy', 'area', area, 'kind', m[0x7F], e.kind, 'profile', m[0x72], e.profile, 'delay', base[delays + (m[0xD3] & 3)], e.delay);
      else ok();
    }
    if (!st.scripted.some((s) => s.routine === 'AiGetUpWhenEnergyRefilled')) fail(id, 'no get-up stream'); else ok();
  }
  // --- the level's own figures and their colours
  {
    const words = FIGURES[id] || {}, drawn = st.scripted.filter((s) => s.enemy && s.routine !== 'AiGetUpWhenEnergyRefilled').map((s) => s.at);
    for (const at of drawn) if (!words[at]) fail(id, 'figure', h4(at), 'has no caption'); else ok();
    for (const at of Object.keys(words).map(Number)) if (!drawn.includes(at)) fail(id, 'caption', h4(at), 'names no stream the page draws');
    const rules = Q.byName.has('InitializeRoomSpecificEntranceState') ? sym('InitializeRoomSpecificEntranceState')
      : [...Q.byName.keys()].filter((k) => /AreaEntranceRules$/.test(k)).map(sym)[0];
    // the colours each area's entrance rules write, with flag $03EB clear and set: the figure is drawn
    // in them, or in the engine's where the rules write none
    const written = (area) => [0, 1].map((flag) => {
      const m = base.slice(), colours = {};
      m[0x03EB] = flag; m[0x03E9] = 0; m[0xA2] = area;
      const io = { read: () => 0, write: (a, v) => { if (a === 0xD025 || a === 0xD026) colours[a] = v & 15; } };
      // a rule that draws an object scene walks a list this run has not set up, after the colours
      try { new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io }).call(rules, { ...Z, y: area }, { maxSteps: 50000 }); } catch (e) { if (!/step limit/.test(e.message)) throw e; }
      return colours[0xD025] === undefined ? '' : [colours[0xD025], colours[0xD026]].join();
    });
    for (const [at, [where, , mc]] of Object.entries(words).map(([k, v]) => [Number(k), v])) {
      const area = /^Area (\d+)$/.exec(where);
      if (!area) { if (mc) fail(id, 'figure', h4(at), 'has colours and no area'); else ok(); continue; }
      const w = written(+area[1]);
      if (mc ? !w.includes(mc.join()) : w.some((x) => x)) fail(id, 'figure', h4(at), where, 'colours', mc ? mc.join() : 'the engine\'s', 'the rules write', w.join(' / ') || 'none');
      else ok();
    }
  }
  // --- LNR_AFTER
  for (const [after, before] of Object.entries(G.LNR_AFTER[id] || {}).map(([k, v]) => [Number(k), v])) {
    const a = G.lnrSteps(base, before), b = G.lnrSteps(base, after);
    if (!a.length || a.some((x) => x.delay === null)) fail(id, 'after', h4(before), 'has a command with no delay');
    else if (!b.length || b.some((x) => x.delay !== null)) fail(id, 'after', h4(after), 'brings a delay of its own');
    else if (!st.scripted.some((s) => s.at === after) || !st.scripted.some((s) => s.at === before)) fail(id, 'after', h4(before), h4(after), 'not both drawn');
    else ok();
  }
  // --- the thrown images
  {
    const m = base.slice();
    Object.assign(m, { [0x54]: 100, [0x55]: 120, [0x9E]: 0xFF, [0x9F]: 0, [0x7D]: 0, [0x70]: 0, [0x0280]: 1, [0x0281]: 0, [0x0284]: 100, [0x0286]: 120 });
    const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: QUIET });
    const seq = [];
    for (let k = 0; k < 4; k++) { cpu.call(sym('ComposeSprites'), { ...Z, y: 16 }, { maxSteps: 200000 }); seq.push(m[0x0280]); }
    if (seq.join() !== '9,1,9,1') fail(id, 'thrown', 'kind after each compose', seq.join()); else ok();
    for (const { kinds } of G.lnrThrown(base, Q)) for (const kind of kinds) {
      if (![1, 6, 7].includes(kind)) continue;
      const one = (phase) => G.lnrCompose(base, Q, 16, { thrown: kind, phase }).find((p) => p.slot === 3);
      const a = one(0), b = one(1);
      if (!a || !b || a.bytes.join() === b.bytes.join()) fail(id, 'thrown', kind, 'two images'); else ok();
    }
  }
}
console.log(bad ? `${bad} failure(s)` : `ok: ${checked} checks over seven levels`);
process.exit(bad ? 1 : 0);
