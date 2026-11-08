#!/usr/bin/env node
// Hold bestiary.html to the game's own code, run on the kit's 6502 over the committed listings:
// - porBattle: for every monster file the page carries, the numbers it shows (THAC0, front and rear
//   armour class, damage dice and move) must be the ones the combat preparation module's own lines
//   make: com-prep from $1630 (strength_index, dexterity's bonus from dex_hit_bonus into $6BEC,
//   compute_combat_stats) up to $163F, where it stores the combatant back, over the resident, tables
//   and com-prep parts with the file as the working character in monster slot 8.
// - porPic: every close-up must decode as ANIMATE00 reads it, its last frame's run-length blocks
//   ending on the file's last byte, one frame for each letter of its sequence, an 11 by 11 window.
// - porItems: every item a monster carries has a name from the item name table.
// It exits 1 on any difference.
//   node games/c64/pool-of-radiance/test_bestiary.js
const path = require('path'), fs = require('fs'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
let bad = 0, n = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const page = fs.readFileSync(path.join(__dirname, 'bestiary.html'), 'utf8');
const D = JSON.parse(page.match(/<script type="application\/json" id="por-bestiary">([\s\S]*?)<\/script>/)[1]);
const b64 = (s) => Uint8Array.from(Buffer.from(s, 'base64'));
const { porBattle, porPic, porItems } = g.run('bestiary.html', 'por-beasts', 'porBattle', 'porPic', 'porItems');
const R = g.listing('parts/resident/listing.json'), T = g.listing('parts/tables/listing.json'), P = g.listing('parts/com-prep/listing.json');
const mem = R.ram.slice();
for (let a = 0x6F00; a < 0x8300; a++) if (T.has[a]) mem[a] = T.ram[a];
const at = { strength: R.sym('strength_index'), compute: R.sym('compute_combat_stats') };
const dex = P.sym('dex_hit_bonus'), dexBonus = P.ram.slice(dex, dex + 26);
const io = { read(a) { throw new Error('a chip read at ' + a.toString(16)); }, write() {} };
const s8 = (v) => v > 127 ? v - 256 : v;

// the combat preparation's own lines, from $1630 to $163F
const prep = mem.slice();
for (let a = 0; a < 0x10000; a++) if (P.has[a]) prep[a] = P.ram[a];
for (let a = 0x6F00; a < 0x8300; a++) if (T.has[a]) prep[a] = T.ram[a];
function theirs(rec) {
  const m = prep.slice();
  m.fill(0, 0x6B00, 0x6D20); m.set(rec, 0x6B00); m[0x6DB1] = 8;
  const cpu = new CPU(m, { port: 0x36, io });
  cpu.pc = 0x1630; cpu.sp = 0xF0;
  cpu.run({ until: 0x163F, maxSteps: 1e6 });
  return { thac0: 60 - m[0x6C0E], ac: 60 - m[0x6C0F], rear: 60 - m[0x6C10], move: m[0x6C1B],
           dice: [[m[0x6C13], m[0x6C15], s8(m[0x6C17])], [m[0x6C14], m[0x6C16], s8(m[0x6C18])]] };
}
for (const e of D.monsters) for (const v of e.records) {
  const rec = b64(v.rec), mine = porBattle(rec, mem, dexBonus, CPU, at), game = theirs(rec);
  n++;
  if (JSON.stringify(mine) !== JSON.stringify(game)) fail(e.name, JSON.stringify(mine), JSON.stringify(game));
  for (const it of porItems(rec, T.ram)) if (!/^[A-Z0-9+'() -]+$/.test(it.name)) fail(e.name, 'item', JSON.stringify(it.name));
  if (v.fig !== null && !(v.fig < D.figs.length)) fail(e.name, 'figure', v.fig);
}
for (const [i, s] of D.pics.entries()) {
  const b = b64(s), p = porPic(b);
  let letters = 0;
  while (b[letters]) letters++;
  if (p.end !== b.length || p.frames.length !== letters || p.w !== 11 || p.h !== 11 || p.ncell !== 121) fail('close-up', i, p.end, b.length, p.frames.length, letters);
}
console.log(`bestiary: ${n} monster files' battle numbers as com-prep makes them, ${D.pics.length} close-ups decoded to their last byte` + (bad ? `; ${bad} differences` : ''));
process.exit(bad ? 1 : 0);
