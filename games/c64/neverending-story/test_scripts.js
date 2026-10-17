#!/usr/bin/env node
// Hold the page's script reader against the game's code. index.html's nes-data block reads the
// game's scripts (nesScript) with an operand count for each opcode (NES_TESTS, NES_ACTS), and the
// Commands, Scripts and Maps widgets print them from what it reads. The routines run on the kit's
// 6502 over the engine's listing with a part's laid over it, $01 = $06 as in play.
// 1. Every test handler (the table at ($1191), opcodes $80-$89) and every action handler (the
//    table at ($0DE1), opcodes $00-$20) runs on its own with SCRIPT_PC ($4E/$4F) at operand bytes
//    of 1: the number of times it calls FETCH_SCRIPT_BYTE ($15D8), and how far it moves SCRIPT_PC
//    where it returns, must be the page's count. Five handlers leave the script without returning
//    (stop, restart, pause, next part, quit) and two point SCRIPT_PC elsewhere: the run stops where
//    they leave, the key waits answered no, and their fetches are counted.
// 2. RUN_SCRIPT ($1605) runs every script of every part: the resident and the part's turn scripts
//    ($1C6D, $2F06), the room scripts (($2F04)), the start scripts and the 70 action scripts
//    (($2984)). The handlers are stood in for at their calls ($1641, $1699): each records its
//    opcode and address, moves SCRIPT_PC past its operands and, for a test, answers true or false
//    from a pattern (all true, all false, alternating, and random). The interpreter skips a false
//    test's clause byte by byte to the next $FE or $FF, so an operand of $FE or $FF there would
//    show: the page's reading, walked with the same answers, must visit the same opcodes at the
//    same addresses, in the same order, and end where RUN_SCRIPT returns.
// 3. No two scripts the page reads overlap.
// It exits 1 on any difference.
//   node games/c64/neverending-story/test_scripts.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
g.sameBlock('nes-data');
const { NES_TESTS, NES_ACTS, nesScript } = g.run(page, 'nes-data', 'NES_TESTS', 'NES_ACTS', 'nesScript');
const E = g.listing('parts/engine/listing.json');
const parts = [1, 2, 3].map((p) => g.listing(`parts/part-${p}/listing.json`));
let bad = 0, walks = 0, visited = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const hex = (n) => '$' + n.toString(16).toUpperCase();
const w16 = (m, a) => m[a] | m[a + 1] << 8;
const mem = (p) => { const m = E.ram.slice(); for (let a = 0x2F00; a < 0x9600; a++) if (parts[p].has[a]) m[a] = parts[p].ram[a]; m[0x2940] = p; m[0x0AF5] = 1; return m; };
const machine = (m) => {
  const colour = new Uint8Array(1024);
  const io = {
    read(a) { if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800]; if (a === 0xD012) return 0; throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD800 && a < 0xDC00) colour[a - 0xD800] = v & 15; else throw new Error('write $' + a.toString(16)); },
  };
  return new CPU(m, { port: { dir: 0x2F, data: 0x06 }, io });
};

// 1. the handlers' operands
{
  const m0 = mem(0), tests = w16(m0, 0x1191), acts = w16(m0, 0x0DE1);
  const handlers = [];
  for (let op = 0x80; op <= 0x89; op++) handlers.push([op, w16(m0, tests + 2 * (op & 0x7F)), NES_TESTS[op]]);
  for (let op = 0; op < NES_ACTS.length; op++) handlers.push([op, w16(m0, acts + 2 * op), NES_ACTS[op]]);
  if (w16(m0, acts + 2 * NES_ACTS.length) === w16(m0, acts + 2 * NES_ACTS.length - 2)) fail('the action table has more entries than the page counts');
  for (const [op, at, want] of handlers) {
    const m = mem(0), cpu = machine(m);
    m.fill(1, 0xC000, 0xC010); m[0x4E] = 0x00; m[0x4F] = 0xC0; m[0x4C] = 1; m[0x4D] = 1;
    m[0x06] = 0x90; m[0x07] = 0xCD; m[0x08] = 0x90; m[0x09] = 0xD9;   // the text cursor at row 10
    let fetched = 0, left = false;
    const stop = () => { left = true; return true; };
    const hooks = {
      0x15D8: () => { fetched++; },
      0x0FCB: stop, 0x0FEE: stop, 0x0FFE: stop,           // RETURN_SKIP_CALLER's RTS, the restart, the next part
      0x0552: (c) => { c.a = 0x4E; c.rts(); },              // the key reads stood in for: N to the question,
      0x055D: (c) => { c.a = 0x20; c.rts(); },              // Space to the pause
      0x0E3B: stop,                                        // the jump to another direction's script
    };
    cpu.call(at, {}, { hooks, maxSteps: 3e6 });
    const moved = w16(m, 0x4E) - 0xC000;
    if (fetched !== want) fail(`opcode ${hex(op)} (${hex(at)}) fetches ${fetched} operands; the page counts ${want}`);
    if (!left && moved !== want) fail(`opcode ${hex(op)} (${hex(at)}) moves SCRIPT_PC by ${moved}; the page counts ${want}`);
  }
}

// 2. the walks
// each pattern makes a fresh answerer, so the game and the page hear the same answers
const patterns = [() => () => 1, () => () => 0, () => { let k = 0; return () => (k++ & 1) ^ 1; }, () => { let k = 0; return () => k++ & 1; }];
for (let i = 0; i < 12; i++) patterns.push(() => { let s = 20261017 + i; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) & 1; }; });
const starts = [[], [], []];
for (let p = 0; p < 3; p++) {
  const m = mem(p), first = m[0x0DCC + p], last = p < 2 ? m[0x0DCD + p] - 1 : 0x7C;
  const list = [['the resident turn script', w16(m, 0x1C6D)], ['the part\'s turn script', 0x2F06]];
  for (let r = first; r <= last; r++) list.push(['room ' + hex(r) + '\'s script', w16(m, w16(m, 0x2F04) + 2 * (r - first))]);
  [[0x2968, 0], [0x296E, 1], [0x297E, 2]].forEach(([a, q]) => { if (q === p) list.push(['the start script', a]); });
  for (let k = 0; k < 70; k++) list.push(['action script ' + k, w16(m, w16(m, 0x2984) + 2 * k)]);
  for (const [what, at] of list) {
    starts[p].push([at, nesScript(m, at).end, what]);
    for (const make of patterns) {
      // the game's
      let answer = make();
      const seen = [], cpu = machine(m);
      const hooks = {
        0x1641: (c) => { const pc = w16(c.m, 0x4E), op = c.m[pc - 1]; seen.push(hex(pc - 1) + ':' + hex(op));
          const n = NES_TESTS[op] || 0, q = pc + n; c.m[0x4E] = q & 255; c.m[0x4F] = q >> 8; c.c = answer(); c.pc = 0x1644; },
        0x1699: (c) => { const pc = w16(c.m, 0x4E), op = c.m[pc - 1]; seen.push(hex(pc - 1) + ':' + hex(op));
          const n = op < NES_ACTS.length ? NES_ACTS[op] : 0, q = pc + n; c.m[0x4E] = q & 255; c.m[0x4F] = q >> 8; c.pc = 0x169C; },
      };
      m[0x4E] = at & 255; m[0x4F] = at >> 8;
      cpu.call(0x1605, {}, { hooks, maxSteps: 1e6 });
      seen.push('end ' + hex(w16(m, 0x4E)));
      // the page's, with the same answers
      answer = make();
      const ops = nesScript(m, at).ops, port = [];
      let i = 0;
      for (;;) {
        const o = ops[i];
        if (!o || o.bad) { port.push('unread ' + hex(o ? o.at : 0)); break; }
        if (o.op === 0xFF) { port.push('end ' + hex(o.at + 1)); break; }
        if (o.op === 0xFE) { i++; continue; }
        port.push(hex(o.at) + ':' + hex(o.op));
        if (o.op >= 0x80 && !answer()) {
          i++;
          while (ops[i] && ops[i].op !== 0xFE && ops[i].op !== 0xFF) i++;
          if (ops[i] && ops[i].op === 0xFF) { port.push('end ' + hex(ops[i].at + 1)); break; }
        }
        i++;
      }
      walks++; visited += seen.length;
      if (seen.join() !== port.join()) { fail(`part ${p + 1}, ${what} at ${hex(at)}:`, seen.join(' '), '<>', port.join(' ')); break; }
    }
  }
}

// 3. overlaps
for (let p = 0; p < 3; p++) {
  const s = [...new Map(starts[p].map((x) => [x[0], x])).values()].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < s.length; i++) if (s[i - 1][1] > s[i][0]) fail(`part ${p + 1}: ${s[i - 1][2]} at ${hex(s[i - 1][0])} reads on to ${hex(s[i - 1][1])}, into ${s[i][2]} at ${hex(s[i][0])}`);
}
console.log(`43 handlers' operands, and ${walks} walks through the scripts of three parts (${visited} opcodes): ` + (bad ? bad + ' differences' : 'every opcode and every end matches'));
process.exit(bad ? 1 : 0);
