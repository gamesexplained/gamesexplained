#!/usr/bin/env node
// Hold the widgets on the Discoveries tab against the game. The page's discoveries block is three
// pieces of the game, and each must do what the game did in jsbeeb on 24 October 2026, or what its
// lines in the committed listing say:
// - endKey, line 19037 of Part 1: F printed END and the same question came back without the F line,
//   and S started a fresh game; any other key goes back to line 19035, both lines again.
// - describe, PROCde in Part 2 (lines 25600-25630): each of its nine lists is read RND(5) times, so
//   the word kept is one of the first five; the sixth words are the ones the page names.
// - equipment, the DATA at line 20070 of Part 1: eleven names, the first three as the Centre showed
//   them in jsbeeb (reference/09-part1-equipment.png).
// Fibber's lie detector, which the How it works tab's ports block reads, said NO to the cave, the walk
// forwards and the steps and YES to the fence and the hill, so those three are the lies.
//   node games/bbc/flowers-of-crystal/test_discoveries.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const ports = g.run('discoveries.html', 'ports', 'dataReader', 'lineAt', 'fibberData', 'fibberRight');
Object.assign(globalThis, ports);
const { endKey, wordLists, describe, equipment } = g.run('discoveries.html', 'discoveries', 'endKey', 'wordLists', 'describe', 'equipment');

let bad = 0;
const fail = (...what) => { if (bad++ < 20) console.log('DISCOVERIES', ...what); };
const A1 = g.listing('parts/adventure-1/listing.json'), A2 = g.listing('parts/adventure-2/listing.json');

const ask = ['Part 2 is a separate program.', 'Press key F to finish.', 'Press key S to start again.'];
for (const k of 'Ss') if (!endKey(k).run) fail(`${k} does not start a fresh game`);
for (const k of 'Ff') if (endKey(k).run || endKey(k).lines.join('|') !== 'END|' + ask[2]) fail(`${k}: ${endKey(k).lines.join(' / ')}`);
for (const k of 'xQ 1') if (endKey(k).run || endKey(k).lines.join('|') !== ask.join('|')) fail(`${JSON.stringify(k)}: ${endKey(k).lines.join(' / ')}`);

const lists = wordLists(A2.ram, A2.sym('words_data'));
const SIXTH = ['close to', 'creepy', 'secret', 'castle', 'yellow', 'weird', 'smell', 'hippopotamus', 'chasing'];
if (lists.length !== 9 || lists.some(l => l.length !== 6)) fail('the lists are not nine of six');
if (lists.map(l => l[5]).join('|') !== SIXTH.join('|')) fail(`the sixth words are ${lists.map(l => l[5]).join(', ')}`);
const de = A2.listing.records.find(r => r.d && r.d.startsWith('25605')).d;
if (!de.includes('FORw=1TO9:RESTORE(28600+w):FORq=1TORND(5):READds$(w):NEXT,')) fail('line 25605 is not the line the port was made from');
let seed = 7, seen = lists.map(() => new Set());
const rnd = k => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return 1 + Math.floor(seed / 4294967296 * k); };
for (let i = 0; i < 5000; i++) describe(rnd, lists).picks.forEach((p, w) => seen[w].add(lists[w][p - 1]));
seen.forEach((s, w) => { if (s.has(SIXTH[w]) && lists[w].indexOf(SIXTH[w]) === 5) fail(`list ${w + 1}: the sixth word was picked`); });
if (describe(() => 5, lists).lines[0] !== 'You are ' + lists[0][4] + ' a ') fail('RND(5) of 5 does not keep the fifth word');

const eq = equipment(A1.ram, A1.sym('equipment_data'));
if (eq.length !== 11 || eq.slice(0, 3).join('|') !== 'warm coat|raincoat|drink') fail(`the equipment is ${eq.join(', ')}`);

const fib = fibberData(A1.ram, A1.sym('fibber_data'));
const DETECTOR = { 'Go into the cave on the left.': 'NO', 'Walk forwards through the mist.': 'NO', 'Go up the mossy, stone steps.': 'NO',
  'Go under the old wooden fence.': 'YES', 'Look behind Silver Sky Hill.': 'YES' };
for (const f of fib) {
  const lie = DETECTOR[f.q] === 'NO';
  if (!(f.q in DETECTOR)) fail(`an instruction the game did not ask: ${f.q}`);
  else if (fibberRight(f.c, 2) !== lie || fibberRight(f.c, 1) === lie) fail(`${f.q}: the port has it ${f.c === 1 ? 'a lie' : 'true'}`);
}
console.log('discoveries: END, nine word lists, the equipment, Fibber\'s five');
if (bad) { console.log(`${bad} failure(s)`); process.exit(1); }
console.log('all passed');
