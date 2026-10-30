#!/usr/bin/env node
// Hold the page's parser against episode three's own. index.html's tfp-parse block (tfpParse)
// finds the verb, the noun and the routine as parse ($A00C) and find_word ($A182) do. Here the
// game's parser runs on the kit's simulator over episode three's listing, from $A01C (past the
// pause and the test for an empty line), with the line in the buffer at $0200 ended by a zero, and
// stops where it hands over: at the RTS that jumps to a verb's routine ($B016) or a noun's ($B03D),
// taking the routine from the stack, or at the jump to say for a line with no verb ($A051) or a
// verb with no noun ($A0F1). Voice 3's oscillator ($D41B), which picks the reply, reads 0. The
// lines are every verb with every noun, written apart, joined and with THE between them, each verb
// alone, and 2,000 lines of random words, pieces of words and spaces, some past 40 characters; the
// page must find the same verb, the same noun and the same routine. It exits 1 on any difference.
//   node games/c64/the-fourth-protocol/test_parse.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
const B = g.run(page, 'tfp-parse', 'tfpParse', 'tfpListWords', 'TFP_VERBS', 'TFP_NOUNS');
const L = g.listing('parts/sas-assault/listing.json');
const verbs = B.tfpListWords(L.ram, B.TFP_VERBS), nouns = B.tfpListWords(L.ram, B.TFP_NOUNS);
if (verbs.length !== 18 || nouns.length !== 28) { console.log('word lists of', verbs.length, 'and', nouns.length); process.exit(1); }
const io = { read(a) { if (a === 0xD41B) return 0; throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
function game_(line) {
  const m = L.ram.slice();
  for (let i = 0; i < 0x59; i++) m[0x200 + i] = 0;
  for (let i = 0; i < line.length; i++) m[0x200 + i] = line.charCodeAt(i);
  m[0x8783] = 0;                                                                    // no keypad chosen
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x36 }, io });
  let r = null;
  const take = (p) => { const lo = p.m[0x100 + ((p.sp + 1) & 255)], hi = p.m[0x100 + ((p.sp + 2) & 255)]; return (lo | hi << 8) + 1; };
  cpu.call(0xA01C, {}, { maxSteps: 100000, hooks: {
    0xB016: (p) => { r = { verb: m[0x8701], noun: -1, routine: take(p) }; return true; },
    0xB03D: (p) => { r = { verb: m[0x8701] + 5, noun: m[0x8700], routine: take(p) }; return true; },
    0xA051: (p) => { r = { verb: -1, noun: -1, routine: null }; return true; },
    0xA0F1: (p) => { r = { verb: m[0x8701] + 5, noun: -1, routine: null }; return true; },
  } });
  return r;
}
const lines = [];
for (const v of verbs) { lines.push(v); for (const n of nouns) lines.push(v + ' ' + n, v + n, v + ' THE ' + n); }
let s = 20261030;
const rnd = (n) => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) % n; };
const pool = verbs.concat(nouns, ['THE', 'A', 'PLEASE', 'NOW', 'LOOK', 'OPENING', 'CUTS', 'GO', 'XYZZY', 'TIPTREE', 'ALLOW', 'BOXES', 'USEFUL']);
for (let i = 0; i < 2000; i++) {
  let line = '';
  const words = 1 + rnd(6);
  for (let w = 0; w < words; w++) {
    let word = pool[rnd(pool.length)];
    if (rnd(4) === 0) word = word.slice(0, 1 + rnd(word.length));                  // a piece of a word
    line += (w ? ' '.repeat(1 + (rnd(5) === 0)) : rnd(6) === 0 ? ' ' : '') + word;
  }
  if (rnd(10) === 0) line = (line + ' ').repeat(4);                                // past 40 characters
  lines.push(line.slice(0, 40));
}
let bad = 0, found = 0, routines = new Set();
for (const line of lines) {
  if (!line.trim()) continue;
  const want = game_(line), got = B.tfpParse(L.ram, line);
  if (want.routine) { found++; routines.add(want.routine); }
  if (want.verb !== got.verb || want.noun !== got.noun || want.routine !== got.routine)
    if (bad++ < 10) console.log('DIFFERS', JSON.stringify(line), JSON.stringify(want), '|', JSON.stringify({ verb: got.verb, noun: got.noun, routine: got.routine }));
}
console.log(`${lines.length} lines, ${found} reaching ${routines.size} routines: ` + (bad ? bad + ' differences' : 'the page finds what the game finds in every one'));
process.exit(bad ? 1 : 0);
