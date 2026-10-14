#!/usr/bin/env node
// Hold the answer box on the How it works tab against the game. The page's answerField is PROCi, the
// input routine of both parts, and must leave what the game left after the same keys, typed in jsbeeb
// on 14 October 2026 at Part 1's Ready to start? (PROCi(7,17,22,21)): in$, l and x as BASIC held them,
// and the four cells of the field as the screen showed them. DEL is DELETE, SP the space bar, RET
// RETURN; each case is from the trace work/scripts/answer_trace.py made, whose 35 sequences, 236 keys,
// all agreed with the port key by key. A RETURN when the field is full is a DELETE, and the answer is
// given only by a RETURN after it.
//   node games/bbc/grannys-garden/test_answer.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
const { answerField } = g.run('index.html', 'ports', 'answerField');

const LIVE = [
  ['DEL x DEL y', 'XY', 0, 18, 'Y   '],
  ['x DEL y', 'Y', 1, 18, 'Y   '],
  ['y e s f', 'Yesf', 4, 21, 'Yesf'],
  ['y e s f g', 'Yes', 3, 20, 'Yes '],
  ['DEL s n o x DEL w', 'Snw', 3, 21, 'Snow'],
  ['l j DEL DEL DEL v SP w u DEL w', 'Vw', 2, 20, 'Vww '],
  ['u q DEL DEL m e v n h', 'Mev', 3, 20, 'Mev '],
  ['a h DEL DEL b n a', 'Bna', 3, 20, 'Bna '],
  ['g n x DEL q DEL', 'Gn', 2, 19, 'Gn  '],
  ['k DEL t t o', 'Tto', 3, 20, 'Tto '],
  ['w DEL DEL DEL', '', -2, 17, '    '],
  ['DEL z c h DEL', 'Z', 1, 19, 'Zc  '],
  ['DEL o t r l k o', 'Oto', 3, 21, 'Otro'],
  ['DEL m x h DEL DEL . b m DEL p 1', 'bp', 2, 20, 'Mbp '],
  ['1 n j b b', 'Njbb', 4, 21, 'Njbb'],
];
// with RETURN: in$, and whether the game took the answer and went on (in$ read at the next wait)
const GIVEN = [['y e s f RET', 'Yes', false], ['y e s f RET RET', 'Yes', true], ['y f RET', 'Yf', true]];
const code = k => k === 'DEL' ? 127 : k === 'RET' ? 13 : k === 'SP' ? 32 : k.charCodeAt(0);

let bad = 0;
const fail = (...what) => { if (bad++ < 20) console.log('ANSWER', ...what); };
const typed = keys => { const f = answerField(17, 21); for (const k of keys.split(' ')) f.key(code(k)); return f; };
for (const [keys, ins, l, x, cells] of LIVE) {
  const f = typed(keys), mine = [f.in, f.l, f.x, f.shown()], theirs = [ins, l, x, cells];
  if (JSON.stringify(mine) !== JSON.stringify(theirs)) fail(`${keys}: ${JSON.stringify(mine)}, the game ${JSON.stringify(theirs)}`);
}
for (const [keys, ins, done] of GIVEN) {
  const f = typed(keys);
  if (f.in !== ins || f.done !== done) fail(`${keys}: ${JSON.stringify(f.in)} ${f.done ? 'given' : 'not given'}, the game ${JSON.stringify(ins)} ${done ? 'taken' : 'still waiting'}`);
}
console.log(`answer: ${LIVE.length + GIVEN.length} sequences typed in jsbeeb`);
if (bad) { console.log(`${bad} failure(s)`); process.exit(1); }
console.log('all passed');
