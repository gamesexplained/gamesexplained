#!/usr/bin/env node
// Holds the Questions tab against the game. The page's lists (QZ, QZ_CLUES in questions.html) were built by running
// the game's own code on each block as it loads; the listings hold block 1, so this test builds block 1 again from
// the committed listings on the kit's 6502 and compares:
//   1. every subject question 0-254: build_question ($3416) into $B500 and write_answer ($3C3A) for the string
//      after the question's $FF, with the word list pointer ($34/$35) find_question would set, as work/allq.js did;
//   2. every Name the Year and Spot the Star item and clue: build_round_question ($262E) with round_type ($1DC0)
//      1 or 2, the item in question_number ($28) and clue_number, then the clue at $B500, the four answers and the
//      right answer's slot ($3506); the three wrong answers are compared as a set, since the game shuffles them with
//      its random generator, whose state differs between the snapshot the page was built from and the listing;
//   3. the counts: 1,275 subject questions (255 in each of five blocks) and 80 clue items.
// The page tidies the game's text the same way for every row (the font's ( and ) drawn as quotation marks, the
// spaces the builder puts inside them and before the end closed up); the test applies the same tidying.
//   node games/c64/mike-reads-computer-pop-quiz/test_questions.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { QZ, QZ_CLUES } = g.run('questions.html', 'qz-data', 'QZ', 'QZ_CLUES');
const T = g.listing('parts/title/listing.json'), Q = g.listing('parts/quiz/listing.json');
const base = new Uint8Array(0x10000); base.set(T.ram);
for (let a = 0; a < 0x10000; a++) if (Q.has[a]) base[a] = Q.ram[a];
const io = { read: () => 0, write: () => {} };
let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
const QUOTE = (s) => s.replace(/\( /g, '“').replace(/ \)/g, '”').replace(/\(/g, '“').replace(/\)/g, '”');
const squash = (s) => s.replace(/\s+/g, ' ');
const tidy = (s) => QUOTE(squash(s)).replace(/ \./g, '.').replace(/ \?/g, '?').replace(/\.\./g, '.').replace(/ ,/g, ',');
const text = (m, a, n, stop) => { let s = ''; for (let i = 0; i < n && !stop.includes(m[a + i]); i++) s += String.fromCharCode(m[a + i]); return s; };
const words = 0xB800 + (base[0xB802] << 8 | base[0xB803]);
const SUBJ_FIRST = Array.from(base.subarray(0xB804, 0xB80B));
// 1. the subject questions of block 1
const rows = QZ.filter((r) => r[0] === 1);
if (rows.length !== 255) fail('block 1 has', rows.length, 'rows, not 255');
for (let q = 0; q < 255; q++) {
  const m = base.slice(), cpu = new CPU(m, { port: 0x34, io });
  m[0x28] = q; m[0x34] = words & 255; m[0x35] = words >> 8; m.fill(0, 0xB500, 0xB600);
  cpu.call(0x3416, {}, { maxSteps: 300000 });
  const question = text(m, 0xB500, 256, [0, 0x7F]).trimEnd();
  const at = m[0x343C] | m[0x343D] << 8;
  m[0x2A] = (at + 1) & 255; m[0x2B] = (at + 1) >> 8; m.fill(0, 0x1BBA, 0x1BBA + 23);
  cpu.call(0x3C3A, { x: 0 }, { maxSteps: 300000 });
  const answer = text(m, 0x1BBA, 23, [0xFF]).trim();
  let subject = 0; while (subject < 5 && q >= SUBJ_FIRST[subject + 1]) subject++;
  const r = rows.find((x) => x[2] === q);
  const want = [1, subject, q, QUOTE(squash(question)).replace(' ?', '?'), QUOTE(answer)];
  if (!r) { fail('question', q, 'is not on the page'); continue; }
  if (JSON.stringify(r) !== JSON.stringify(want)) fail('question', q, JSON.stringify(r), 'against', JSON.stringify(want));
}
// 2. the clue items of block 1
const BUF = [0x1BBA, 0x1BD1, 0x1BE8, 0x1BFF];
const clueNumber = T.sym('clue_number');
let items = 0;
for (const type of [1, 2]) for (let item = 0; item < 8; item++) {
  const clues = []; let answers, right;
  for (let clue = 0; clue < 3; clue++) {
    const m = base.slice(), cpu = new CPU(m, { port: 0x34, io });
    m[0x1DC0] = type; m[0x28] = item; m[clueNumber] = clue;
    m.fill(0, 0xB500, 0xB600); for (const b of BUF) m.fill(0x20, b, b + 23);
    cpu.call(0x262E, {}, { maxSteps: 400000 });
    clues.push(tidy(text(m, 0xB500, 255, [0, 0x7F, 0xFF]).trim()));
    answers = BUF.map((b) => tidy(text(m, b, 23, [0, 0x7F, 0xFF]).trim())); right = m[0x3506];
  }
  const round = type === 1 ? 'Name the Year' : 'Spot the Star';
  const want = [round, 1, item, clues, answers[right], answers.filter((_, i) => i !== right).sort()];   // the game shuffles them
  const r = QZ_CLUES.find((x) => x[0] === round && x[1] === 1 && x[2] === item);
  items++;
  if (!r) { fail(round, 'item', item, 'is not on the page'); continue; }
  const mine = r && [r[0], r[1], r[2], r[3], r[4], r[5].slice().sort()];
  if (JSON.stringify(mine) !== JSON.stringify(want)) fail(round, 'item', item, JSON.stringify(r), 'against', JSON.stringify(want));
}
// 3. counts
if (QZ.length !== 1275) fail('the page has', QZ.length, 'subject questions, not 1,275');
if (QZ_CLUES.length !== 80) fail('the page has', QZ_CLUES.length, 'clue items, not 80');
console.log(bad ? bad + ' difference(s)' : `questions test passed: block 1's 255 questions and ${items} clue items built by the game's code match the page`);
process.exit(bad ? 1 : 0);
