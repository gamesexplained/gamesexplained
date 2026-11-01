#!/usr/bin/env node
// Hold the page's Building 17 verdict against episode one's own. nato-documents.html's tfp-locks block
// (tfpJudge) judges the locks as judge_locks ($7C3F) does. Here judge_locks runs on the kit's
// simulator over episode one's listing for every combination of counts the two floors' doors allow
// (TFP_DOORS: each door locked once or not at all), with the lock counters ($195C-$1962), the total
// ($1964) and building_ok ($1963, $FF) set first, and the game's own random ($6375) run from two
// seeds, one that makes its first number 0 ($88-$8A = $00 $0C $5A, which the game meant to bring
// memo 31) and one that does not. A hook on schedule_in ($603B) collects each memo and its days from
// the three bytes after the call, and one on add_progress ($6129) the progress. The page must give
// the same memos in the same order and the same progress. It exits 1 on any difference.
//   node games/c64/the-fourth-protocol/test_locks.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'nato-documents.html';
const { tfpJudge, TFP_DOORS } = g.run(page, 'tfp-locks', 'tfpJudge', 'TFP_DOORS');
const L = g.listing('parts/nato-documents/listing.json');
const KINDS = ['offices', 'wcs', 'staircase', 'security', 'entrance', 'computer', 'desk'];
const AT = { offices: 0x195C, wcs: 0x195D, staircase: 0x195E, security: 0x195F, entrance: 0x1960, computer: 0x1961, desk: 0x1962 };
const most = {}, others = TFP_DOORS.flatMap(([, d]) => d).filter(([k]) => !k).length;
for (const [, d] of TFP_DOORS) for (const [k] of d) if (k) most[k] = (most[k] || 0) + 1;
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
let bad = 0, cases = 0, zeroes = 0;
const seen = new Set();
function each(i, c) {
  if (i === KINDS.length) {
    for (let extra = 0; extra <= others; extra++) for (const seed of [[0x00, 0x0C, 0x5A], [0x12, 0x34, 0x56]]) {
      const counts = Object.assign({}, c, { total: KINDS.reduce((s, k) => s + c[k], 0) + extra });
      const m = L.ram.slice();
      for (const k of KINDS) m[AT[k]] = counts[k];
      m[0x1964] = counts.total; m[0x1963] = 0xFF; m.set(seed, 0x88);
      const memos = []; let progress = 0;
      const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
      cpu.call(0x7C3F, {}, { maxSteps: 10000, hooks: {
        0x603B: (p) => { const at = (p.m[0x100 + ((p.sp + 1) & 255)] | p.m[0x100 + ((p.sp + 2) & 255)] << 8) + 1;
          if (p.m[at] !== 0) throw new Error('list ' + p.m[at]);
          memos.push([p.m[at + 1], p.m[at + 2]]); p.sp = (p.sp + 2) & 255; p.pc = at + 3; },
        0x63A4: (p) => { if (seed[1] === 0x0C && p.a === 0) zeroes++; },
        0x6129: (p) => { progress += p.a; p.rts(); },
      } });
      const r = tfpJudge(counts);
      cases++; seen.add(memos.map((x) => x[0]).join(' '));
      if (JSON.stringify(r.memos) !== JSON.stringify(memos) || r.progress !== progress)
        if (bad++ < 10) console.log('DIFFERS', JSON.stringify(counts), seed, JSON.stringify(memos), progress, '|', JSON.stringify(r.memos), r.progress);
    }
    return;
  }
  for (let n = 0; n <= most[KINDS[i]]; n++) each(i + 1, Object.assign({}, c, { [KINDS[i]]: n }));
}
each(0, {});
if (!zeroes) { console.log('random never gave 0: the seed does not test the branch to memo 31'); bad++; }
for (const want of ['33', '42', '32 28', '30 29 32 28']) if (!seen.has(want)) { console.log('no case gave memos', want); bad++; }
console.log(`${cases} cases: ` + (bad ? bad + ' differences' : `every verdict matches judge_locks (${seen.size} different answers)`));
process.exit(bad ? 1 : 0);
