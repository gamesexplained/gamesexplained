#!/usr/bin/env node
// Hold the page's sound effects against the game's own code. index.html's enc-sound block plays
// each effect by running pieces of the game on the kit's 6502, from the bytes it carries (ENC_MEM),
// on the frames a plan gives (ENC_SOUNDS). This checks what the block adds to the game's code:
// - every byte it carries is the listing's, and every piece starts and stops on an instruction;
// - each plan, run here on the whole listing with every byte the listing leaves out set to junk,
//   writes the chip exactly as the block does, write by write and frame by frame: so the block
//   carries every byte the pieces read, and each plan sets every variable they read;
// - every piece ends at one of its stops, and no piece reads a chip;
// - a sound that loops truly repeats: the game's state comes round, so every frame of the loop
//   writes the same as the frame a period later, for a hundred periods.
// It exits 1 on any difference.
//   node games/c64/encounter/test_sound.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));

const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { ENC_MEM, ENC_PIECES, ENC_SOUNDS, createDriver } =
  g.run(page, 'enc-sound', 'ENC_MEM', 'ENC_PIECES', 'ENC_SOUNDS', 'createDriver');
const L = g.listing();

let bad = 0;
const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
const hex = (a) => '$' + a.toString(16).toUpperCase().padStart(4, '0');

// The bytes the block carries, and where its pieces start and stop.
let carried = 0;
for (const [ad, h] of ENC_MEM) {
  for (let i = 0; 2 * i < h.length; i++, carried++) {
    const a = ad + i, v = parseInt(h.substr(2 * i, 2), 16);
    if (!L.has[a]) fail('ENC_MEM carries', hex(a), 'which the listing does not hold');
    else if (L.ram[a] !== v) fail('ENC_MEM has', v.toString(16), 'at', hex(a), 'and the listing', L.ram[a].toString(16));
  }
}
const code = new Set(L.listing.records.filter((r) => r.t === 'code').map((r) => r.a));
for (const [name, runs] of Object.entries(ENC_PIECES))
  for (const run of runs) for (const a of run) if (!code.has(a)) fail('piece', name, 'starts or stops at', hex(a), 'which is not an instruction');

// The game's code over the whole listing, the bytes it leaves out set to junk. A plan's frame is
// run as the game runs it: the interrupt, then the pieces of the pass due then, if any.
function theirs(s, frames) {
  const m = L.ram.slice();
  for (let a = 0; a < 0x10000; a++) if (!L.has[a]) m[a] = 0xA5 ^ (a * 7 & 0xFF);
  let writes = [];
  const io = {
    read(a) { throw new Error('a piece reads ' + hex(a)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) writes.push(a - 0xD400, v); },
  };
  const cpu = new C64Cpu.CPU(m, { port: 0x35, io });
  cpu.sp = 0xFF;
  const piece = (name) => {
    for (const [start, ...stops] of ENC_PIECES[name]) {
      let end = -1;
      const hooks = {};
      for (const x of stops) hooks[x] = () => { end = x; return true; };
      cpu.pc = start;
      cpu.run({ hooks, maxSteps: 50000 });
      if (end < 0) fail(s.name, 'piece', name, 'ran out without reaching a stop');
    }
  };
  const step = (x) => typeof x === 'string' ? piece(x) : (m[x[0]] = x[1]);
  s.init.forEach(step);
  const passes = new Map(s.passes), out = [];
  for (let f = 0; f < frames; f++) {
    if (f) writes = [];
    const k = s.loop && f >= s.loop[0] ? s.loop[0] + (f - s.loop[0]) % s.loop[1] : f;
    if (s.irq) piece('irq');
    (passes.get(k) || []).forEach(step);
    out.push(writes.join());
  }
  return out;
}

// The block's driver, over the bytes it carries alone, as the page's player runs it.
function ours(t, frames) {
  const d = createDriver({ mem: ENC_MEM, pieces: ENC_PIECES, sounds: ENC_SOUNDS }, C64Cpu);
  d.init(t);
  const out = [];
  for (let f = 0; f < frames; f++) { d.play(); out.push(d.writes.join()); }
  return { out, playing: d.playing() };
}

let frames = 0, heard = 0;
for (const [t, s] of ENC_SOUNDS.entries()) {
  const n = s.loop ? s.frames + 100 * s.loop[1] : s.frames;
  const a = theirs(s, n), b = ours(t, n);
  for (let f = 0; f < n; f++) {
    if (a[f] !== b.out[f]) { fail(s.name, 'frame', f, 'the game writes', a[f] || 'nothing', '| the page', b.out[f] || 'nothing'); break; }
    if (a[f]) heard++;
  }
  frames += n;
  if (!b.playing) fail(s.name, 'stopped before its last frame');
  if (s.loop) {
    const [from, period] = s.loop;
    for (let f = from; f + period < n; f++)
      if (a[f] !== a[f + period]) { fail(s.name, 'loops every', period, 'frames, but frame', f, 'and frame', f + period, 'differ'); break; }
  }
}
console.log(`${carried} bytes carried, ${Object.keys(ENC_PIECES).length} pieces, ${ENC_SOUNDS.length} sounds, `
  + `${frames} frames (${heard} with writes): ` + (bad ? bad + ' differences' : 'every write matches the game\'s code'));
process.exit(bad ? 1 : 0);
