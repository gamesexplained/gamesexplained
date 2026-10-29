// Checks the title tune's page driver (reference/sod-music.js, createTitleDriver) against the title's
// own code in kit/c64/machine.js with its CIA timers, both from the title's listing. In the machine, as
// in the title, a raster interrupt calls music_play ($457C) once a frame and CIA 2's timer A raises
// sample_nmi ($5106), which can interrupt music_play; the page driver runs music_play at the start of
// each frame and the NMIs between. The two differ only in where the frame's edge falls among the NMIs,
// so the checks are the ones that edge cannot move:
// - the voice register writes are the same, in order, the shorter list a prefix of the longer (one
//   may be a call of music_play ahead, by where the run stops);
// - the volume ($D418) writes are the same values in the same order up to the first sample the music
//   stops in mid-frame, and the same number of them overall, give or take one per sample event's edge.
// node test_title_music.js [frames]
const kit = __dirname + '/../../../kit/';
const { Machine, FRAME } = require(kit + 'c64/machine.js');
const C64Cpu = require(kit + 'cpu/cpu6502.js');
const SODMUSIC = require(__dirname + '/reference/sod-music.js');
const NF = +process.argv[2] || 1000, P = 32;
const ram = new Uint8Array(0x10000);
for (const r of require(__dirname + '/parts/title/listing.json').records) if (r.b) ram.set(r.b, r.a);

// The game: CLI and a loop at $0340; the raster interrupt at line 0 enters $0350, which saves the
// registers, calls music_play, acknowledges the interrupt and returns. CIA 1's interrupts are masked.
const mr = ram.slice(0);
mr.set([0x58, 0x4C, 0x41, 0x03], 0x340);
mr.set([0x48, 0x8A, 0x48, 0x98, 0x48, 0x20, 0x7C, 0x45, 0xA9, 0xFF, 0x8D, 0x19, 0xD0, 0x68, 0xA8, 0x68, 0xAA, 0x68, 0x40], 0x350);
mr[0xFFFE] = 0x50; mr[0xFFFF] = 0x03;
const m = new Machine({ ram: mr, pc: 0x340, port: { dir: 0x2F, data: 0x35, out: 0x35 }, cia: true });
m.sidLog = []; m.ioWrite(0xDC0D, 0x7F);
m.cpu.call(0x4576, { d: 0 }, { maxSteps: 1e6 }); m.cpu.pc = 0x340;
m.ioWrite(0xD012, 0); m.ioWrite(0xD011, 0x1B); m.ioWrite(0xD01A, 1);
m.runCycles(NF * FRAME);
const game = m.sidLog.map(([, r, v]) => r << 8 | v);

const d = SODMUSIC.createTitleDriver({ base: 0, bytes: ram, period: P }, C64Cpu);
d.init();
const page = [];
for (let i = 0, n = Math.round(NF * FRAME / P); i < n; i++) { d.play(); const w = d.writes; for (let k = 0; k < w.length; k += 2) page.push(w[k] << 8 | w[k + 1]); }

const same = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
const gv = game.filter(x => x >> 8 !== 24), pv = page.filter(x => x >> 8 !== 24);
const gs = game.filter(x => x >> 8 === 24 && x !== 0x180A), ps = page.filter(x => x >> 8 === 24 && x !== 0x180A);
const v = same(gv, pv), s = same(gs, ps), off = Math.abs(gs.length - ps.length);
console.log(`voices: the first ${v} match (page ${pv.length}, game ${gv.length}); ` +
  `volume: the first ${s} match, ${ps.length} on the page against ${gs.length} in the game`);
const ok = v === Math.min(gv.length, pv.length) && Math.abs(gv.length - pv.length) <= 40 && pv.length > 1000 && s > 1000 && off <= gs.length / 200;
console.log(ok ? 'OK' : 'FAIL'); process.exit(ok ? 0 : 1);
