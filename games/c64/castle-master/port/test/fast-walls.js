'use strict';
// Where Fast CPU's walks end against the C64's (the page's play.html, with the moments in
// work/states, port/test/lib.js): from each moment, facing each of four ways a quarter turn apart,
// a walk of three steps: forward held for three loops on the C64, and for the loops that take three
// steps' shares with Fast CPU at a Speed (on either, only the loops that read the keys count). In
// open space the two end at the same place (test_fast.js, "whole steps"); a step the game cuts
// short at a wall or an edge throws the rest away, a whole step at once on the C64 and a share at a
// time with Fast CPU. Counts the walks that end more than 64 units apart across the floor, the
// walks that end at another height, and the areas each is in.
//   node games/c64/castle-master/port/test/fast-walls.js [Speed: 0, 1 or 2] [moment filter]
const fs = require('fs'), path = require('path');
const GAME = path.resolve(__dirname, '../..');
const lib = require('./lib.js');
const { game } = require(path.join(lib.REPO, 'kit/scripts/port_check.js'));
const g = game(GAME);
globalThis.window = globalThis;
g.lib('c64'); g.lib('sid'); g.lib('cpu6502'); g.lib('fast-cpu');
const page = g.read('play.html');
for (const b of [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1])) g.run('play.html', b, 'CMPort');
const { CMPage, FastCPU, CM_FAST: T } = globalThis;
const cost = JSON.parse(/^window\.CM_COST = (.*);$/m.exec(page)[1]);
const SPEED = +(process.argv[2] || 0), FILTER = process.argv[3] || '', K = T.speeds[SPEED].K;
const whole = lib.machine('entry').save();
const s16 = v => (v << 16) >> 16;
const at = M => [s16(M[0x2407] | M[0x2408] << 8), s16(M[0x2409] | M[0x240A] << 8), s16(M[0x240B] | M[0x240C] << 8)];

// a machine at a moment, turned a quarter turn q times by the game's own quarter turn (the
// Commodore key and X, a loop each), at the start of a loop
function start(s, q) {
  const rt = CMPage.create({ data: whole, cost });
  rt.restore(s, P => P.main_loop({ c: s.cpu.p & 1 }));
  const P = rt.P, up = P.UPDATE_FRAME_INPUT_EVENTS, reads = { n: 0 }, read = P.READ_CONTROL_INPUT;
  let hook = null;
  P.UPDATE_FRAME_INPUT_EVENTS = function* (r) { if (hook) hook(); return yield* up.call(this, r); };
  P.READ_CONTROL_INPUT = function (r) { reads.n++; return read.call(this, r); };
  // the keys for each of the next loops, then none, back at the start of a loop
  const loops = (plan, guard = 4000) => {
    let n = 0;
    hook = () => { const k = plan[n++] || [[], 0]; rt.input.keys = new Set(k[0]); rt.input.joy = 0x1F & ~k[1]; };
    for (let f = 0; n <= plan.length && f < guard && !rt.M[0x109B]; f++) rt.runFrame();
    hook = null;
    return n > plan.length;
  };
  // forward held from the start of the next loop until n loops have read it (the one that shows the
  // lightning's streak reads nothing), then let go, at the start of the loop after
  const walk = (n, guard = 4000) => {
    const r0 = reads.n;
    let over = false;
    hook = () => { over = reads.n - r0 >= n; rt.input.keys = new Set(); rt.input.joy = over ? 0x1F : 0x1F & ~1; };
    for (let f = 0; !over && f < guard && !rt.M[0x109B]; f++) rt.runFrame();
    hook = null;
    return over;
  };
  const turned = loops(Array.from({ length: q }, () => [['CBM'], 8]));
  return { rt, P, M: rt.M, reads, loops, walk, ok: turned && !rt.M[0x109B] };
}

const files = lib.states(FILTER);
const N = { walks: 0, apart: 0, height: 0, lower: 0, skipped: 0 }, areas = { apart: new Map(), lower: new Map() };
const add = (m, a) => m.set(a, (m.get(a) || 0) + 1);
for (const f of files) {
  const s = JSON.parse(fs.readFileSync(path.join(lib.STATES, f), 'utf8'));
  for (let q = 0; q < 4; q++) {
    // the C64: three loops with forward held
    const a = start(s, q);
    if (!a.ok) { N.skipped++; if (process.env.VERBOSE) console.log(f, q, 'no start', a.M[0x109B]); continue; }
    const from = at(a.M);
    if (!a.walk(3) || a.M[0x109B]) { N.skipped++; if (process.env.VERBOSE) console.log(f, q, 'no C64 walk', a.M[0x109B]); continue; }
    const c64 = at(a.M), area = a.M[0x2429];
    // Fast CPU: forward held until 3K loops have read it
    const b = start(s, q);
    const fx = FastCPU.attach(b.rt, T), r0 = b.reads.n;
    FastCPU.set(fx, true, SPEED);
    let done = false;
    b.rt.input.keys = new Set(); b.rt.input.joy = 0x1F & ~1;
    for (let i = 0; i < 2000 && !done && !b.M[0x109B]; i++) {
      FastCPU.run(fx, 1000 / 60, () => { if (b.reads.n - r0 >= 3 * K) { done = true; b.rt.input.joy = 0x1F; } });
    }
    if (!done || b.M[0x109B]) { N.skipped++; if (process.env.VERBOSE) console.log(f, q, 'no fast walk', done, b.M[0x109B], b.reads.n - r0); continue; }
    const fast = at(b.M);
    N.walks++;
    const d = Math.hypot(fast[0] - c64[0], fast[2] - c64[2]);
    if (d > 64) { N.apart++; add(areas.apart, area); }
    if (fast[1] !== c64[1]) { N.height++; if (fast[1] < c64[1]) { N.lower++; add(areas.lower, area); } }
    if (process.env.VERBOSE) console.log(f, q, 'from', from.join(','), 'C64', c64.join(','), 'Fast', fast.join(','), d.toFixed(0));
  }
}
const pc = n => (100 * n / N.walks).toFixed(1) + ' %';
const list = m => [...m].sort((x, y) => y[1] - x[1]).map(([a, n]) => 'area ' + a + ' ' + n).join(', ');
console.log(T.speeds[SPEED].name + ': ' + N.walks + ' three-step walks from ' + files.length + ' moments, four ways each (' + N.skipped + ' skipped: the session ended or a loop never came)');
console.log('  ended more than 64 units apart across the floor  ' + N.apart + ' (' + pc(N.apart) + ')' + (N.apart ? ': ' + list(areas.apart) : ''));
console.log('  ended at another height                          ' + N.height + ' (' + pc(N.height) + '), ' + N.lower + ' lower with Fast CPU' + (N.lower ? ': ' + list(areas.lower) : ''));
