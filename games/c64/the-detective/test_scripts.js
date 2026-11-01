#!/usr/bin/env node
// Hold the How it works page's script viewer against the game's own interpreter. index.html's
// td-scripts block (tdScripts) decodes the nine characters' scripts from the listing's bytes. Here,
// for every instruction it lists, the game's own fetch runs on the kit's simulator over the whole
// listing: character 0's script pointer ($1E6D/$1E76) is set to the instruction, the character is
// made free to run (no delay in $1E9C, $1E18 negative, $1E06 negative), the interpreter's turn is
// set so that character 0 is next ($1E9B = 8), and script_step ($A460) runs until it jumps to the
// handler (JMP ($28) at $A4C5). The handler it chose must be the one the page names (the opcode's
// entry in the table at $A4C8), and the pointer it left must be the page's address plus the page's
// length. It exits 1 on any difference.
//   node games/c64/the-detective/test_scripts.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { tdScripts } = g.run('index.html', 'td-scripts', 'tdScripts');
const L = g.listing();
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
let bad = 0, n = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const scripts = tdScripts(L.ram);
if (scripts.length !== 9) fail('the page decoded', scripts.length, 'scripts');
for (const list of scripts) for (const ins of list) {
  const m = L.ram.slice(), cpu = new CPU(m, { port: 0x35, io });
  m[0x1E6D] = ins.a & 0xFF; m[0x1E76] = ins.a >> 8;
  m[0x1E9C] = 0; m[0x1E18] = 0x80; m[0x1E06] = 0x80; m[0x1E9B] = 8;
  cpu.pc = 0xA460;
  cpu.run({ until: 0xA4C5, maxSteps: 20000 });
  if (cpu.pc !== 0xA4C5) { fail('$' + ins.a.toString(16), 'the interpreter did not reach its dispatch'); continue; }
  const handler = m[0x28] | (m[0x29] << 8), want = m[0xA4C8 + 2 * ins.op] | (m[0xA4C9 + 2 * ins.op] << 8);
  const next = m[0x1E6D] | (m[0x1E76] << 8);
  if (handler !== want) fail('$' + ins.a.toString(16), 'handler game $' + handler.toString(16), 'page opcode', ins.op);
  if (next !== ins.a + ins.len) fail('$' + ins.a.toString(16), 'next instruction game $' + next.toString(16), 'page $' + (ins.a + ins.len).toString(16));
  n++;
}
console.log(n + ' instructions: ' + (bad ? bad + ' differences' : 'every one fetched by the game as the page decodes it'));
process.exit(bad ? 1 : 0);
