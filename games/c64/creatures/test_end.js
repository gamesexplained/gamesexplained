#!/usr/bin/env node
// Hold the ending widget (index.html: cr-cpu, cr-end, END) against the game.
// 1. Every byte the page carries for the ending is the ending's listing's, or the engine's.
// 2. The run, from the hand-over with fire held on the text screen, against the emulator's
//    (test_end.json): at every pass of the three scenes' frame loops the video chip's registers,
//    the sprite pointers and the scene's state are the emulator's, pass for pass; and the scenes
//    end after as many passes. The page's own 6502 is held against the kit's by test_shop.js.
// 3. Five frames of the run drawn with site/lib/c64.js (renderFrame), against the emulator's
//    pictures of the same frames: every line the same, but for raster line 169 in the village,
//    where the cliff's colours come in a cycle before the emulator's, 4 pixels at most.
// 4. The machine stops at the ending's exit, and the cheat takes the hint off the text screen.
//   node games/c64/creatures/test_end.js [page.html]
const path = require('path'), crypto = require('crypto'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
globalThis.atob = globalThis.atob || ((s) => Buffer.from(s, 'base64').toString('binary'));
const { crCPU } = g.run(page, 'cr-cpu', 'crCPU');
const { crEnd } = g.run(page, 'cr-end', 'crEnd');
g.lib('c64');
const C64 = globalThis.C64;
const mm = g.read(page).match(/const END = (\{.*?\});\n/);
if (!mm) { console.error('no END data'); process.exit(1); }
const END = JSON.parse(mm[1]), SEEN = g.json('test_end.json');
let bad = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const hex = (n) => '$' + n.toString(16).toUpperCase();

// 1. the bytes
const E = g.listing('parts/engine/listing.json'), L = g.listing('parts/ending/listing.json');
let bytes = 0;
for (const { a, b } of END.ram) {
  const v = Buffer.from(b, 'base64');
  for (let i = 0; i < v.length; i++) {
    const at = a + i, G = L.has[at] ? L : E.has[at] ? E : null;
    bytes++;
    if (!G || G.ram[at] !== v[i]) fail('byte', hex(at), 'page', v[i], 'listing', G ? G.ram[at] : 'none');
  }
}

// 2. the passes
const REG = []; for (let r = 0; r < 0x2F; r++) if (![0x11, 0x12, 0x13, 0x14, 0x19, 0x1A, 0x1E, 0x1F].includes(r)) REG.push(r);
const PASS = [0x8061, 0x807C, 0x809D], FRAME = 312 * 63;
const end = crEnd(END, crCPU);
function run(cheat, onPass, onFrame) {
  end.reset({ cheat, halt: 0x7E6B, marks: { 0x7E6B: 'exit', 0x7E47: 'scenes over' } });
  const seen = [];
  for (let f = 0; f < 4000; f++) {
    end.fire = f >= 100 && f < 110;
    const cpu = end.cpu, to = Math.floor(cpu.cycles / FRAME) * FRAME + FRAME;
    while (cpu.cycles < to) {
      if (PASS.includes(cpu.pc) && onPass) onPass();
      end.step();
    }
    const F = end.frame();
    seen.push(...F.marks);
    if (onFrame) onFrame(F);
    if (F.marks.includes('exit')) return seen;
  }
  return seen;
}
const state = () => {
  const v = end.vic, m = end.m;
  return [end.cpu.pc, REG.map((r) => r >= 0x20 ? v[r] & 15 : r === 0x18 ? v[r] & 0xFE : r === 0x16 ? v[r] & 0x3F : v[r]).join(','),
    Buffer.from(m.subarray(0x47F8, 0x4800)).toString('hex'), Buffer.from(m.subarray(0x4800, 0x4803)).toString('hex')].join('|');
};
const passes = [], want = new Map(SEEN.frames.map((f) => [f.pass, f])), shots = [];
let grab = null, ended = -1;
const marks = run(false, () => {
  passes.push(state());
  if (want.has(passes.length)) grab = want.get(passes.length);
}, (F) => {
  if (F.marks.includes('scenes over') && ended < 0) ended = passes.length;
  if (grab && passes.length > grab.pass) {             // the whole frame after the one with the pass
    shots.push({ pass: grab.pass, F: { vic: F.vic.slice(), cia2: F.cia2.slice(), writes: F.writes.slice(), mem: F.mem.slice(), colourMem: end.col.slice() } });
    grab = null;
  }
});
if (passes.length !== SEEN.passes) fail('the scenes made', passes.length, 'passes, the emulator\'s', SEEN.passes);
if (ended !== passes.length) fail('the scenes ended after pass', ended, 'of', passes.length);
for (let i = 0; i * SEEN.chunk < Math.min(passes.length, SEEN.passes); i++) {
  const h = crypto.createHash('sha1').update(passes.slice(i * SEEN.chunk, (i + 1) * SEEN.chunk).join('\n')).digest('hex').slice(0, 16);
  if (h !== SEEN.chunks[i]) fail('passes', i * SEEN.chunk + 1, 'to', (i + 1) * SEEN.chunk, 'differ from the emulator\'s');
}

// 3. the pictures
for (const f of SEEN.frames) {
  const s = shots.find((x) => x.pass === f.pass);
  if (!s) { fail('no frame after pass', f.pass); continue; }
  const r = C64.renderFrame(Object.assign({ lines: 312, cycles: 63 }, s.F));
  const full = Object.keys(f.lines).map(Number);
  f.bands.forEach((want, b) => {
    const rows = [];
    for (let y = b * 16; y < b * 16 + 16; y++) if (!full.includes(y)) rows.push(Buffer.from(r.px.subarray(y * r.w, (y + 1) * r.w)));
    if (crypto.createHash('sha1').update(Buffer.concat(rows)).digest('hex').slice(0, 16) !== want)
      fail('the frame after pass', f.pass, 'lines', b * 16, 'to', b * 16 + 15, 'differ from the emulator\'s picture');
  });
  for (const y of full) {
    const emu = Buffer.from(f.lines[y], 'hex');
    let d = 0; for (let x = 0; x < r.w; x++) if (r.px[y * r.w + x] !== emu[x]) d++;
    if (d > 4) fail('the frame after pass', f.pass, 'line', y, ':', d, 'pixels differ from the emulator\'s picture');
  }
}

// 4. the exit and the cheat
if (!marks.includes('exit')) fail('the machine never reached the ending\'s exit');
// the hint's first eight characters on the text screen, at $4772 ($7DF1), as the screen stands
// when fire is first looked for; a cell the text does not reach holds $FF (clear_screen)
const blank = Buffer.alloc(8, 0xFF);
end.reset({ halt: 0x7E1B }); for (let f = 0; f < 50; f++) end.frame();
const without = Buffer.from(end.m.subarray(0x4772, 0x477A));
end.reset({ cheat: true, halt: 0x7E1B }); for (let f = 0; f < 50; f++) end.frame();
const withCheat = Buffer.from(end.m.subarray(0x4772, 0x477A));
if (without.equals(blank)) fail('without the cheat the text screen has no hint at $4772');
if (!withCheat.equals(blank)) fail('with the cheat the text screen still has a hint at $4772');

console.log(`${bytes} bytes held against the listings; the scenes, ${passes.length} passes against the emulator's, `
  + `${SEEN.frames.length} frames against its pictures; the exit and the cheat's hint: ${bad ? bad + ' differ' : 'all match'}`);
process.exit(bad ? 1 : 0);
