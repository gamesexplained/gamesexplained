#!/usr/bin/env node
// Hold the gum forest on the Maps tab against the game's own lines. The page's forest block is
// FNForest, Part 1's lines 11500-11650, and this test reads those lines from the committed listing:
// where line 11500 puts the player for each place they come from; for each of the 56 squares, which of
// lines 11551-11555 find something there, their conditions turned from BBC BASIC into JavaScript (MOD
// to %, AND to &&, OR to ||, = to ===); and where each answer to line 11558's question moves the player.
//   node games/bbc/flowers-of-crystal/test_forest.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const { forestStart, forestSquare, forestArrive, forestMove } = g.run('levels.html', 'forest', 'forestStart', 'forestSquare', 'forestArrive', 'forestMove');

let bad = 0;
const fail = (...what) => { if (bad++ < 20) console.log('FOREST', ...what); };
const A1 = g.listing('parts/adventure-1/listing.json');
const line = n => { const r = A1.listing.records.find(r => r.d && r.d.startsWith(n + '')); if (!r) throw new Error('no line ' + n); return r.d.slice(String(n).length); };
const js = c => c.replace(/MOD/g, ' % ').replace(/AND/g, ' && ').replace(/OR/g, ' || ').replace(/([^<>])=/g, '$1 === ').replace(/([wgh])%/g, '$1');

// Line 11500
const L0 = line(11500), starts = [...L0.matchAll(/IFP%=(\d) g%=(\d):h%=(\d)/g)];
if (starts.length !== 3 || !/ELSEg%=RND\(8\)-1:h%=RND\(7\)-1$/.test(L0)) fail('line 11500 is not the line the port was made from');
for (const [, p, x, y] of starts) if (forestStart(+p, () => 1).join() !== x + ',' + y) fail(`from place ${p}: ${forestStart(+p, () => 1)}, the game ${x},${y}`);
if (forestStart(0, k => k).join() !== '7,6' || forestStart(7, () => 1).join() !== '0,0') fail('from anywhere else: not RND(8)-1, RND(7)-1');

// Lines 11551-11555
const EVENTS = { 11551: 'zap', 11552: 'workers', 11553: 'grabbers', 11554: 'captured', 11555: 'gold' };
const tests = Object.entries(EVENTS).map(([n, e]) => {
  const m = /^(?:w%=g%\*h%:)?IF(.*?)CLS/.exec(line(n));
  if (!m) throw new Error('line ' + n + ' has no IF ... CLS');
  return [e, new Function('w', 'g', 'h', 'return ' + js(m[1]))];
});
let n = 0;
for (let gx = 0; gx < 8; gx++) for (let hy = 0; hy < 7; hy++) {
  n++;
  const want = tests.filter(([, f]) => f(gx * hy, gx, hy)).map(([e]) => e).join(' '), got = forestSquare(gx, hy).join(' ');
  if (got !== want) fail(`square ${gx},${hy}: ${got || 'nothing'}, the game ${want || 'nothing'}`);
  const a = forestArrive(gx, hy, () => 1);                      // a capture lands on 0,0, where nothing is
  if (want.includes('zap') && a.events.join() !== 'zap') fail(`square ${gx},${hy}: a Zap Gate ends the visit, the port goes on`);
}
if (!/PROCf\(RND\(8\)-1\)$/.test(line(11551)) || !/PROCf\(3\)$/.test(line(11555))) fail('lines 11551 and 11555 no longer end the visit');

// Line 11558
const moves = [...line(11558).matchAll(/f\$="([NSEW])"AND([gh])%([<>])(\d)\2%=\2%([+-])1/g)];
if (moves.length !== 4) fail(`line 11558 has ${moves.length} moves`);
for (const [, d, v, cmp, lim, sign] of moves) for (let gx = 0; gx < 8; gx++) for (let hy = 0; hy < 7; hy++) {
  const o = { g: gx, h: hy }, ok = cmp === '<' ? o[v] < +lim : o[v] > +lim;
  if (ok) o[v] += sign === '+' ? 1 : -1;
  if (forestMove(gx, hy, d).join() !== o.g + ',' + o.h) fail(`${d} from ${gx},${hy}: ${forestMove(gx, hy, d)}, the game ${o.g},${o.h}`);
}
console.log(`forest: line 11500's three entries, ${n} squares against lines 11551-11555, line 11558's ${moves.length} moves`);
if (bad) { console.log(`${bad} failure(s)`); process.exit(1); }
console.log('all passed');
