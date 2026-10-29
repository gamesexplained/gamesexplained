// Checks the title tune's page driver (reference/sod-music.js, createTitleDriver) against the title's
// own code in kit/c64/machine.js with its CIA timers, both from the title's listing: music_init, then
// music_play once a frame, with CIA 2's timer A raising sample_nmi ($5106) in between. The voices'
// register writes must match in order; the volume writes ($D418) must match from the start until the
// first place where the two models' frame edges put a different number of NMIs before music_play stops
// a sample, which on 29 October 2026 was the 6,643rd of them.
// node test_title_music.js [frames]
const kit = __dirname + '/../../../kit/';
const { Machine, FRAME } = require(kit + 'c64/machine.js');
const C64Cpu = require(kit + 'cpu/cpu6502.js');
const SODMUSIC = require(__dirname + '/reference/sod-music.js');
const NF = +process.argv[2] || 1000, P = 32;
const ram = new Uint8Array(0x10000);
for (const r of require(__dirname + '/parts/title/listing.json').records) if (r.b) ram.set(r.b, r.a);

// the game: a loop at $0340 with interrupts off and CIA 1's masked, music_play called at each frame's start
const mr = ram.slice(0); mr.set([0x78, 0x4C, 0x41, 0x03], 0x340);
const m = new Machine({ ram: mr, pc: 0x340, port: { dir: 0x2F, data: 0x35, out: 0x35 }, cia: true });
m.sidLog = []; m.ioWrite(0xDC0D, 0x7F);
m.cpu.call(0x4576, { d: 0 }, { maxSteps: 1e6 }); m.cpu.pc = 0x341;
for (let f = 0; f < NF; f++) {
  const c0 = m.cpu.cycles; m.cpu.call(0x457C, { d: 0 }, { maxSteps: 1e6 }); m.cpu.pc = 0x341;
  m.runCycles(FRAME - (m.cpu.cycles - c0));
}
const game = m.sidLog.map(([, r, v]) => r << 8 | v);

const d = SODMUSIC.createTitleDriver({ base: 0, bytes: ram, period: P }, C64Cpu);
d.init();
const page = [];
for (let i = 0, n = Math.round(NF * FRAME / P); i < n; i++) { d.play(); const w = d.writes; for (let k = 0; k < w.length; k += 2) page.push(w[k] << 8 | w[k + 1]); }

const same = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
const gv = game.filter(x => x >> 8 !== 24), pv = page.filter(x => x >> 8 !== 24);
const gs = game.filter(x => x >> 8 === 24 && x !== 0x180A), ps = page.filter(x => x >> 8 === 24 && x !== 0x180A);
const v = same(gv, pv), s = same(gs, ps);
console.log(`voices: ${v} of ${gv.length} writes match (page ${pv.length}); samples: the first ${s} of ${gs.length} match`);
if (v !== gv.length || gv.length !== pv.length || gv.length < 1000 || s < 1000) { console.log('FAIL'); process.exit(1); }
console.log('OK');
