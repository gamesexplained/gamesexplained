#!/usr/bin/env node
// Hold the page's text printer against the game's code. index.html's nes-text block ports the
// engine's printer routine by routine; the routines themselves run on the kit's 6502 over the
// engine's listing with a part's laid over it, in the state play leaves them: $01 = $06, the
// lower-case switch at $0AF5 on (set by $076A), the editor's cursor switch at $0949 off, ink 6
// ($0286), CURRENT_PART_NO ($2940) the part, and colour RAM answered by the test.
// For each part, from a blank screen with the cursor at row 10, column 0: PRINT_ROOM_TEXT ($0B58)
// for every room of the part, PRINT_EVENT_TEXT ($09D7) for every event and PRINT_SENTENCE ($099B)
// for every one of the engine's sentences, one after another on the one screen, as the game
// prints them, so that the screen scrolls hundreds of times. After every call the port's screen
// ($CC00-$CFE7), colour RAM, cursor ($06/$07 and $08/$09), column ($24), ink ($0286) and capital
// flag ($0AFF) must be the routine's. It also counts the printer's instructions the calls ran,
// so that a path the texts never take shows up, and prints some bytes of its own to take the paths
// the game's texts leave out. Last, Part 1's event 27 with Part 3's file in memory, as a restart
// after Part 2 prints it (discoveries.html): its pointer lies past Part 3's table. The other pages'
// copies of the printer must be this one (g.sameBlock).
// It exits 1 on any difference.
//   node games/c64/neverending-story/test_text.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
g.sameBlock('nes-text');
const { nesPrinter } = g.run(page, 'nes-text', 'nesPrinter');
const E = g.listing('parts/engine/listing.json');
const parts = [1, 2, 3].map((p) => g.listing(`parts/part-${p}/listing.json`));
let bad = 0, calls = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const executed = new Uint8Array(0x10000);
const w16 = (m, a) => m[a] | m[a + 1] << 8;

for (let p = 0; p < 3; p++) {
  const m = E.ram.slice();
  for (let a = 0x2F00; a < 0x9600; a++) if (parts[p].has[a]) m[a] = parts[p].ram[a];
  m[0x2940] = p; m[0x0AF5] = 1; m[0x0949] = 0; m[0x0286] = 6; m[0x0AFF] = 0;
  m.fill(0x20, 0xCC00, 0xD000);
  m[0x06] = 0x90; m[0x07] = 0xCD; m[0x08] = 0x90; m[0x09] = 0xD9; m[0x24] = 0;
  const colour = new Uint8Array(1024);
  const io = {
    read(a) { if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800]; throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD800 && a < 0xDC00) colour[a - 0xD800] = v & 15; else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x06 }, io });
  // the port's state, the same to begin with
  const tables = m.slice();
  const st = { ram: m.slice(), colour: new Uint8Array(1024), at: 400, column: 0, ink: 6, cap: 0 };
  const P = nesPrinter(tables, st);
  const check = (what) => {
    calls++;
    for (let x = 0xCC00; x < 0xCFE8; x++) if (cpu.m[x] !== st.ram[x]) return fail(what, 'screen at $' + x.toString(16), cpu.m[x], st.ram[x]);
    for (let x = 0; x < 1000; x++) if (colour[x] !== st.colour[x]) return fail(what, 'colour RAM +' + x, colour[x], st.colour[x]);
    const at = w16(cpu.m, 6) - 0xCC00, cat = w16(cpu.m, 8) - 0xD800;
    if (at !== st.at || cat !== st.at) return fail(what, 'cursor', at, cat, st.at);
    if (cpu.m[0x24] !== st.column) return fail(what, 'column', cpu.m[0x24], st.column);
    if (cpu.m[0x0286] !== st.ink) return fail(what, 'ink', cpu.m[0x0286], st.ink);
    if (cpu.m[0x0AFF] !== st.cap) return fail(what, 'capital flag', cpu.m[0x0AFF], st.cap);
  };
  const first = m[0x0DCC + p], last = p < 2 ? m[0x0DCD + p] - 1 : 0x7C;
  const ev = w16(m, 0x2F02), events = (w16(m, ev) - ev) >> 1;
  const sn = w16(m, 0x1C69), sentences = (w16(m, sn) - sn) >> 1;
  const opts = { executed, maxSteps: 2e6 };
  for (let r = first; r <= last; r++) { cpu.call(0x0B58, { a: r }, opts); P.room(r); check(`part ${p + 1} room $${r.toString(16)}`); }
  for (let i = 0; i < events; i++) { cpu.call(0x09D7, { a: i }, opts); P.event(i); check(`part ${p + 1} event ${i}`); }
  for (let i = 0; i < sentences; i++) { cpu.call(0x099B, { a: i }, opts); P.sentence(i); check(`part ${p + 1} sentence $${i.toString(16)}`); }
  // paths no text of the game takes: a colour change ($FF) and a line break ('<') inside a word,
  // words that cross a page, the editor's cursor switch on, and the lower-case switch off (as at
  // the opening). The bytes are the test's, at $C0F0, written into both memories.
  const put = (a, bytes) => { bytes.forEach((b, i) => { cpu.m[a + i] = b; tables[a + i] = b; }); };
  const txt = (s) => Array.from(s, (c) => c.charCodeAt(0));
  put(0xC0F0, [...txt('AWord<BrokenHere.AndOn'), 0x85, ...txt('Then'), 0x81, 0x2E, 0x40]);
  cpu.m[0x22] = 0xF0; cpu.m[0x23] = 0xC0; cpu.call(0x0A0E, {}, opts); P.term(0xC0F0); check(`part ${p + 1} a term with a break`);
  put(0xC0F8, [...txt('Ab'), 0xFF, 2, ...txt('C<d.Ef'), 0xFF, 6]);
  cpu.m[0x22] = 0xF8; cpu.m[0x23] = 0xC0; cpu.m[0x25] = 12; cpu.call(0x0ADB, {}, opts); P.word(0xC0F8, 12); check(`part ${p + 1} a word with colours`);
  for (const sw of [0x0949, 0x0AF5]) {
    cpu.m[sw] = tables[sw] = sw === 0x0949 ? 1 : 0;
    cpu.call(0x0B58, { a: first }, opts); P.room(first); check(`part ${p + 1} room $${first.toString(16)}, $${sw.toString(16)} switched`);
    cpu.call(0x099B, { a: 2 }, opts); P.sentence(2); check(`part ${p + 1} sentence 2, $${sw.toString(16)} switched`);
    cpu.m[sw] = tables[sw] = sw === 0x0949 ? 0 : 1;
  }
  // what a restart after Part 2 prints: Part 1's start script asks for event 27 with Part 3's
  // file in memory, whose table holds 9 (discoveries.html, "Bug: restarting after Part 2 loads
  // Part 3"); the pointer lies past the table's end
  if (p === 2) {
    cpu.m[0x2940] = tables[0x2940] = 0;
    cpu.call(0x09D7, { a: 27 }, { executed, maxSteps: 5e7 }); P.event(27); check('Part 1\'s event 27 with Part 3 loaded');
    cpu.m[0x2940] = tables[0x2940] = 2;
  }
}
// which of the printer's instructions ran ($08DB-$0BBC), and which not
let ran = 0, all = 0;
const missed = [];
for (const r of E.listing.records) {
  if (r.t !== 'code' || r.a < 0x08DB || r.a > 0x0BBC) continue;
  all++; if (executed[r.a]) ran++; else missed.push('$' + r.a.toString(16).toUpperCase());
}
console.log(`${calls} texts printed on three screens: ` + (bad ? bad + ' differences' : 'every screen, colour and cursor matches') +
  `; ${ran} of the printer's ${all} instructions ran` + (missed.length ? ' (not: ' + missed.join(' ') + ')' : ''));
process.exit(bad ? 1 : 0);
