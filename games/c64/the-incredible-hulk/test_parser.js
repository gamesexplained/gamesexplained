#!/usr/bin/env node
// Hold the pages' parser against the game's own. The hulk-db block (HulkDB.parse) does what the
// command line does once READK has a line ($6CF8-$6E05): split off a word ($6E6D), the one-letter
// commands, the verb and the noun looked up by find_word ($6975), and the complaints. Here the
// game runs the same code on the kit's simulator over the listing, from $6CF8 with the line at
// $1E3E as READK leaves it (25 bytes cleared, then the characters), with hooks on PUTZ ($5436),
// which records what it prints, on the screen and picture routines the Z command calls, and on
// reprompt ($6CD6), where the game asks for another line. Every line must give the same verb
// ($5F), noun ($61), tester mode ($1F14), V count ($1F1F), printed text, picture switch and
// request for another line. The lines: empty; every letter alone; every entry of both word lists
// as a verb, and after GET as a noun; every verb with every noun; three words; and 3,000 random
// lines of letters and spaces up to the 14 characters READK takes.
// It exits 1 on any difference.
//   node games/c64/the-incredible-hulk/test_parser.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
g.sameBlock('hulk-db');
const { HulkDB } = g.run('levels.html', 'hulk-db', 'HulkDB');
const L = g.listing();
const D = HulkDB.read(L.ram);
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const io = { read(a) { throw new Error('the game read $' + a.toString(16)); }, write(a) { throw new Error('the game wrote $' + a.toString(16)); } };

function game6502(line, st) {
  const m = L.ram.slice();
  m.fill(0, 0x1E3E, 0x1E57); m.set(line.slice(0, 14), 0x1E3E);
  m[0x5F] = st.verb; m[0x61] = st.noun; m[0x1F14] = st.tester; m[0x1F1F] = st.v; m[0x1F22] = st.picture ? 0xFF : 0;
  const cpu = new CPU(m, { port: 0x36, io });
  const out = { said: [], again: false, picture: null };
  const text = () => { const a = m[0x4E] | m[0x4F] << 8; let s = ''; for (let i = a; m[i]; i++) s += String.fromCharCode(m[i]); return s; };
  const hooks = {
    0x5436(c) { out.said.push(text()); c.rts(); },          // PUTZ
    0x54C6(c) { c.rts(); },                                  // clear the bitmap
    0x543C(c) { c.rts(); },                                  // CLS
    0x54AB(c) { out.picture = 'on'; c.rts(); },              // the picture on
    0x54AE(c) { out.picture = 'off'; c.rts(); },             // the picture off
    0x6CD6() { out.again = true; return true; },             // ask again
  };
  cpu.call(0x6CF8, {}, { hooks, maxSteps: 1e6 });
  return { out, verb: m[0x5F], noun: m[0x61], tester: m[0x1F14], v: m[0x1F1F] };
}
function check(s) {
  const line = [...s].map(c => c.charCodeAt(0));
  const st = { verb: 7, noun: 9, tester: 0, v: 3, picture: (cases & 1) === 0 };
  const G = game6502(line, st);
  const P = HulkDB.parse(D, line, st);
  cases++;
  const want = JSON.stringify([G.out.said.join(''), G.out.again, G.out.picture, G.out.again ? 0 : G.verb, G.out.again ? 0 : G.noun, G.tester, G.v]);
  const got = JSON.stringify([P.said.join(''), P.again, P.picture, P.again ? 0 : st.verb, P.again ? 0 : st.noun, st.tester, st.v]);
  if (want !== got) fail(JSON.stringify(s), 'game', want, 'page', got);
}
const word = e => e.word;
check('');
for (let c = 65; c <= 90; c++) check(String.fromCharCode(c));
for (const v of D.verbs) { check(word(v)); check(' ' + word(v) + '  '); }
for (const n of D.nouns) { check('GET ' + word(n)); check(word(n)); }
for (const v of D.verbs) for (const n of D.nouns) check((word(v) + ' ' + word(n)).slice(0, 14));
for (const s of ['GET RING NOW', 'N FOO', 'L RING', 'I X', 'V', 'Z', 'X', 'P', 'T', 'GO', 'LOOKING', 'GETRING', 'GET  RING', 'G N', 'TIES', 'GET TIES', 'XYZZY', 'GET XYZZY'])
  check(s);
let seed = 20261031;
const rnd = n => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
for (let k = 0; k < 3000; k++) {
  let s = '';
  const len = rnd(15);
  for (let i = 0; i < len; i++) s += rnd(5) === 0 ? ' ' : String.fromCharCode(65 + rnd(26));
  check(s);
}
console.log(`${cases} lines: ` + (bad ? bad + ' differences' : 'the verb, the noun, the tester, V, what is printed and every request for another line match the game\'s code'));
process.exit(bad ? 1 : 0);
