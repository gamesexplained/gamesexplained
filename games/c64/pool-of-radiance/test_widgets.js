#!/usr/bin/env node
// Hold index.html's widgets against the game's own code, run on the kit's 6502 over the committed
// listings:
// - por-ecl (porDecode, the script decoder): every command it finds in New Phlan's script (por-data's
//   POR_ECL00, at $9900) has each of its operands fetched by the adventure module's own get_operand
//   ($1663, dungeon part), from the instruction pointer ($6E47/$6E48) the decoder says it starts at.
//   The pointer must end where the decoder puts the next operand, and a number or a text must be the
//   one the decoder shows (a text as decode_string leaves it at $9700). Its operand counts must be
//   operand_counts ($1625) but for the five commands whose routines read others.
// - por-hit (porHits): every d20 roll, THAC0 from -5 to 30, armour class from -10 to 10 and three
//   side bonuses, judged by hit_roll ($1272, combat part) with its roll and its events stood in for.
// - por-roll (porRoll): 500 seeds of the random generator; the six totals it shows are the 3d6 GEN's
//   roll_ability ($0D1F) adds up, the kept one is what the routine leaves in $B1, and it is the best.
// - por-order (porOrder, discoveries.html): every new order of one to six members, with 64 effects
//   held at random by slots 0-7 or by nobody, moved by ORDER's own loop (camp $0AF7) with its copying
//   of the characters stood in for.
// It exits 1 on any difference.
//   node games/c64/pool-of-radiance/test_widgets.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
let bad = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const io = { read() { return 0; }, write() {} };
const b64 = (s) => Uint8Array.from(Buffer.from(s, 'base64'));

// --- the script decoder
{
  const { porDecode, POR_ECL_COUNTS } = g.run('index.html', 'por-ecl', 'porDecode', 'POR_ECL_COUNTS');
  const { POR_ECL00 } = g.run('index.html', 'por-data', 'POR_ECL00');
  const D = g.listing('parts/dungeon/listing.json');
  const ecl = b64(POR_ECL00);
  for (let c = 0; c < 62; c++) if (POR_ECL_COUNTS[c] !== D.ram[0x1625 + c]) fail('operand_counts', c, POR_ECL_COUNTS[c], D.ram[0x1625 + c]);
  const cmds = porDecode(ecl, 0x9900);
  let ops = 0;
  const own = { 12: 3, 41: 14, 54: 2 };
  for (const [k, c] of cmds.entries()) {
    const m = D.ram.slice();
    m.set(ecl, 0x9900);
    const cpu = new CPU(m, { port: 0x35, io });
    const ip = () => m[0x6E47] | m[0x6E48] << 8;
    let at = c.at + 1;
    m[0x6E47] = at & 0xFF; m[0x6E48] = at >> 8;
    if (![21, 43, 37, 38].includes(c.cmd) && c.ops.length !== (own[c.cmd] || POR_ECL_COUNTS[c.cmd])) fail('count', c.at.toString(16), c.cmd, c.ops.length);
    for (const o of c.ops) {
      cpu.call(0x1663, { a: 0, x: 0, y: 0 });
      ops++;
      if (m[0x6E46] !== o.kind) fail('kind', c.at.toString(16), m[0x6E46], o.kind);
      if (o.kind === 0 && cpu.a !== o.v) fail('byte', c.at.toString(16), cpu.a, o.v);
      if (o.kind === 2 && (cpu.a | cpu.x << 8) !== o.v) fail('word', c.at.toString(16), cpu.a | cpu.x << 8, o.v);
      if (o.kind === 0x80) {
        let s = '';
        for (let a = 0x9700; m[a]; a++) s += String.fromCharCode(m[a]);
        if (s !== o.v) fail('text', c.at.toString(16), JSON.stringify(s), JSON.stringify(o.v));
      }
    }
    const next = k + 1 < cmds.length ? cmds[k + 1].at : 0x9900 + ecl.length;
    if (ip() !== next && k + 1 < cmds.length) fail('ends at', c.at.toString(16), ip().toString(16), next.toString(16));
  }
  console.log(`por-ecl: ${cmds.length} commands, ${ops} operands fetched by get_operand`);
}

// --- to hit
{
  const { porHits } = g.run('index.html', 'por-hit', 'porHits');
  const C = g.listing('parts/combat/listing.json');
  let cases = 0;
  for (const bonus of [0, 2, 250]) for (let th = -5; th <= 30; th++) for (let ac = -10; ac <= 10; ac++) {
    const want = porHits(th, ac, bonus);
    for (let r = 1; r <= 20; r++) {
      const m = C.ram.slice();
      m[0x6C0E] = (60 - th) & 0xFF; m[0xA4F0] = (60 - ac) & 0xFF; m[0xA4E2] = 0; m[0x6E71] = bonus;
      const cpu = new CPU(m, { port: 0x35, io });
      const back = (c) => { c.rts(); };
      cpu.call(0x1272, { a: 0, x: 0, y: 0 }, { hooks: {
        0x28DA: back, 0x0764: back, 0x076D: back, 0x12E6: back,
        0x2DE0: (c) => { c.a = r; m[0x03C8] = r; c.rts(); },
      } });
      cases++;
      if (!!cpu.c !== want[r - 1] || (m[0xA4FB] === 1) !== want[r - 1]) fail('hit', th, ac, bonus, r, cpu.c, want[r - 1]);
    }
  }
  console.log(`por-hit: ${cases} rolls judged by hit_roll`);
}

// --- the ability roll
{
  const { porRoll } = g.run('index.html', 'por-roll', 'porRoll');
  const R = g.listing('parts/resident/listing.json'), Gn = g.listing('parts/gen/listing.json');
  const mem = R.ram.slice();
  for (let a = 0; a < 0x10000; a++) if (Gn.has[a]) mem[a] = Gn.ram[a];
  let x = 0x2545F491;
  const rnd = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
  for (let k = 0; k < 500; k++) {
    const seed = Array.from({ length: 6 }, () => rnd() & 0xFF);
    const { rolls, best } = porRoll(mem, seed, kit);
    const m = mem.slice();
    seed.forEach((v, i) => { m[0x03C2 + i] = v; });
    const sums = [];
    const cpu = new CPU(m, { port: 0x35, io });
    cpu.call(0x0D1F, { a: 0, x: 0, y: 0 }, { hooks: { 0x0D45: () => { sums.push(m[0xFE]); } } });
    if (rolls.join() !== sums.join() || best !== m[0xB1] || best !== Math.max(...rolls) || rolls.length !== 6 ||
        rolls.some((v) => v < 3 || v > 18)) fail('roll', seed.join(), rolls.join(), sums.join(), best, m[0xB1]);
  }
  console.log('por-roll: 500 seeds');
}
// --- ORDER's moving of the effects
{
  const { porOrder } = g.run('discoveries.html', 'por-order', 'porOrder');
  const R = g.listing('parts/resident/listing.json'), Cp = g.listing('parts/camp/listing.json');
  const mem = R.ram.slice();
  for (let a = 0; a < 0x10000; a++) if (Cp.has[a]) mem[a] = Cp.ram[a];
  let x = 0x1F2E3D4C;
  const rnd = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; };
  const perms = (n) => n === 0 ? [[]] : perms(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]));
  let cases = 0;
  for (let n = 1; n <= 6; n++) for (const perm of perms(n)) {
    const newPos = Array.from({ length: 8 }, (_, s) => s < n ? perm[s] : 0xFF);
    const held = Array.from({ length: 64 }, () => { const r = rnd() % 11; return r < 8 ? r : [0x80, 0xFF, 0xC3][r - 8]; });
    const m = mem.slice();
    newPos.forEach((v, s) => { m[0x28CE + s] = v; });
    held.forEach((v, k) => { m[0x4940 + k] = v; });
    const cpu = new CPU(m, { port: 0x35, io });
    cpu.call(0x0AF7, { a: 0, x: 0, y: 0 }, { hooks: { 0x0B1A: (c) => { c.pc = 0x0B6E; }, 0x0B77: (c) => { c.rts(); } } });
    const want = porOrder(newPos, held), got = Array.from(m.slice(0x4940, 0x4980));
    cases++;
    if (want.join() !== got.join()) fail('order', perm.join(), want.join(), got.join());
  }
  console.log(`por-order: ${cases} new orders moved by ORDER's loop`);
}
console.log(bad ? bad + ' differences' : 'every widget agrees with the game\'s code');
process.exit(bad ? 1 : 0);
