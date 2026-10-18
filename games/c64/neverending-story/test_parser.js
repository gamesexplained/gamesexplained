#!/usr/bin/env node
// Hold the page's parser against the game's code. index.html's nes-parse block ports PARSE_INPUT
// ($122F), VOCAB_LOOKUP ($12C4), RESOLVE_VERB_NOUN ($1396) and DISPATCH_COMMAND ($1403). The
// routines themselves run on the kit's 6502 over the engine's listing, each line stored at $CBA0
// as the line editor stores it ($0806: 81 spaces, then the letters in lower case, the length in
// $26), with PARSE_INPUT called as the main loop calls it. What they print and run is recorded at
// the routines they call, which the test stands in for: PRINT_SENTENCE ($099B), PRINT_CHARACTER
// ($08DB), PRINT_WORD ($0ADB) and PRINT_EMPTY_LINE ($0B4B), and DISPATCH_COMMAND's entry with
// VERB_ID and NOUN_ID ($4C, $4D) and its call of the pair's script ($1443, LOOP_COUNTER $4B), which
// returns at once. The port must make the same calls in the same order, and leave PARSED_TOKENS
// ($28-$47) and the word count as the routine does.
// The lines: every stem of the vocabulary alone, and with each letter 4-6 that the diagonals test;
// every pair of stems; the page's examples; and 5,000 lines of up to 18 words drawn from the stems,
// the words the stems stand for, words that are not in the vocabulary, AND and runs of spaces, cut
// to 78 characters as the editor cuts them.
// It exits 1 on any difference.
//   node games/c64/neverending-story/test_parser.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
g.sameBlock('nes-parse');
const { nesParse } = g.run(page, 'nes-parse', 'nesParse');
const E = g.listing('parts/engine/listing.json');
let bad = 0, lines = 0, dispatched = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const m = E.ram.slice();
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x06 }, io });
let calls;
const hooks = {
  0x099B: (c) => { calls.push('say ' + c.a); c.rts(); },
  0x08DB: (c) => { calls.push('char ' + c.a); c.rts(); },
  0x0ADB: (c) => { const p = c.m[0x22] | c.m[0x23] << 8; calls.push('word ' + String.fromCharCode(...c.m.subarray(p, p + (c.m[0x25] || 256)))); c.rts(); },
  0x0B4B: (c) => { calls.push('line'); c.rts(); },
  0x1403: (c) => { calls.push(`verb ${c.m[0x4C]} noun ${c.m[0x4D]}`); },
  0x1443: (c) => { calls.push('rule ' + c.m[0x4B]); c.pc = 0x1449; },
};
function viaGame(line) {
  calls = [];
  m.fill(0x20, 0xCBA0, 0xCBF1);
  for (let i = 0; i < line.length; i++) m[0xCBA0 + i] = line.charCodeAt(i);
  m[0x26] = line.length;
  cpu.call(0x122F, {}, { hooks, maxSteps: 1e6 });
  return calls;
}
function viaPort(line) {
  const r = nesParse(m, line), out = [];
  for (const o of r.out) {
    if (o.say !== undefined) out.push('say ' + o.say);
    else if (o.unknown !== undefined) out.push('char 34', 'word ' + o.unknown, 'char 34');
    else if (o.line) out.push('line');
    else { out.push(`verb ${o.verb} noun ${o.noun}`); if (o.rule !== null) out.push('rule ' + o.rule); }
  }
  return { out, r };
}
function check(text) {
  const line = text.toLowerCase().replace(/[^a-z ]/g, '').slice(0, 78);
  const want = viaGame(line), { out, r } = viaPort(text);
  lines++;
  dispatched += want.filter((c) => c.startsWith('rule')).length;
  if (r.line !== line) return fail(JSON.stringify(text), 'the port stored', JSON.stringify(r.line));
  if (want.join('|') !== out.join('|')) return fail(JSON.stringify(line), want.join('|'), ' <> ', out.join('|'));
  if (r.tokens) {
    for (let x = 0; x < 32; x++) if (m[0x28 + x] !== r.tokens[x]) return fail(JSON.stringify(line), 'PARSED_TOKENS +' + x, m[0x28 + x], r.tokens[x]);
    const aborted = want.includes('char 34');
    if (m[0x27] !== (aborted ? r.count : (r.count * 2) & 255)) return fail(JSON.stringify(line), 'word count', m[0x27], r.count);
  }
}
// the vocabulary, as VOCAB_LOOKUP reads it
const stems = [];
for (let p = m[0x199C] | m[0x199D] << 8; m[p] !== 0x40; p += 4) stems.push(String.fromCharCode(m[p], m[p + 1], m[p + 2]).trimEnd());
const words = ['north', 'northeast', 'northwest', 'south', 'southeast', 'southwest', 'east', 'west', 'go', 'the',
  'apple', 'auryn', 'falkor', 'artax', 'horn', 'stone', 'branch', 'tree', 'door', 'key', 'get', 'take', 'drop',
  'look', 'inventory', 'blow', 'fly', 'ride', 'and', 'please', 'xyzzy', 'q', 'zz', 'northern', 'southwards', 'mus', 'nom', 't'];
for (const s of stems) { check(s); for (const t of ['the', 'thw', 'thx', 'tae', 'h']) check(s + t); }
for (const a of stems) for (const b of stems) check(a + ' ' + b);
['get the apple and go east', 'north east', 'northeast', 'n e', 'blow horn', 'get tree', 'xyzzy', 'look', '', '   ',
  '  get   apple  ', 'and', 'get and get', 'the the the', 'get apple horn stone'].forEach(check);
let seed = 20261017;
const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
for (let k = 0; k < 5000; k++) {
  const n = 1 + rnd(18), parts = [];
  for (let i = 0; i < n; i++) {
    const kind = rnd(10);
    parts.push(kind < 5 ? stems[rnd(stems.length)] : kind < 8 ? words[rnd(words.length)] : kind < 9 ? 'and' : 'qq' + rnd(9));
  }
  check(parts.join(' '.repeat(1 + rnd(2))));
}
console.log(`${lines} lines, ${dispatched} scripts run: ` + (bad ? bad + ' differences' : 'every call and every token matches'));
process.exit(bad ? 1 : 0);
