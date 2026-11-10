#!/usr/bin/env node
'use strict';
// Holds the kit's SM5A (kit/gnw/sm5a.js) to MAME 0.289's, with no MAME: the fixture
// kit/gnw/fixtures/machine.json keeps MAME's trace of 64 seeded random programs as a hash of each
// 1,024 lines, with the buttons pressed at the cycles MAME logged and the data memory at the end.
// kit/gnw/check_machine.js makes the programs and, with --record, the fixture. Between them the
// programs run every opcode, CEND and DTA included. Also checks a saved state runs on as the
// machine it was saved from.
//   node kit/gnw/test_machine.js
const fs = require('fs'), path = require('path');
const { SM5A } = require('./sm5a.js');
const { program, model, chunks } = require('./check_machine.js');

const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/machine.json'), 'utf8'));
let fails = 0;
const check = (ok, what) => { if (!ok) fails++; if (!ok || process.argv.includes('-v')) console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const ops = new Set();
let lines = 0;
for (const p of fx.programs) {
  const rom = program(p.seed), mine = model(rom, p.events, p.end);
  mine.ops.forEach(o => ops.add(o));
  const ours = mine.lines.slice(p.skip, p.skip + p.lines), h = chunks(ours);
  const at = h.findIndex((x, i) => x !== p.chunks[i]);
  const ram = mine.ram.map(v => v.toString(16)).join('');
  lines += p.lines;
  check(ours.length === p.lines && at < 0 && ram === p.ram, 'program ' + p.seed + ': ' + p.lines + ' instructions as MAME ran them' +
    (at >= 0 ? '; the lines from ' + at * fx.chunk + ' differ (node kit/gnw/check_machine.js --seeds ' + p.seed + ' shows where)' : '') +
    (ram !== p.ram ? '; the data memory at the end differs' : ''));
}
console.log((fails ? 'FAIL ' : 'ok   ') + fx.programs.length + ' programs, ' + lines.toLocaleString('en-GB') + ' instructions, as MAME 0.289 ran them');
const all = Array.from({ length: 256 }, (_, i) => i).filter(o => o !== 0x5e).concat([0x5e00, 0x5e04]);
const ran = all.filter(o => ops.has(o)).length;
check(ran === all.length, 'every opcode ran: ' + ran + ' of ' + all.length);
if (ran === all.length) console.log('ok   every opcode ran: ' + ran + ' of ' + all.length);

// a saved state runs on as the machine it was saved from
const m = new SM5A(program(3));
m.run(5000);
const copy = SM5A.load(program(3), m.save());
m.run(20000); copy.run(20000);
check(JSON.stringify(m.save()) === JSON.stringify(copy.save()), 'a saved state runs on as the machine it came from, 20,000 cycles on');
console.log(fails ? fails + ' FAILED' : 'all machine checks pass');
process.exit(fails ? 1 : 0);
