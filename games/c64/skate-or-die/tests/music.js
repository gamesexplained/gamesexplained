// Checks reference/sod-music.js against the game: High Jump runs in kit/c64/machine.js from the play
// snapshot with no input, the skater waiting on the platform and the music playing; the page's driver
// starts from the same memory and runs once a frame. Every SID write, in order, must match.
// node tests/music.js work/highjump-play.vsf [frames]
const kit = __dirname + '/../../../../kit/c64/';
const { Machine } = require(kit + 'machine.js');
const { readSnapshot } = require(kit + 'cpu6502.js');
const SODMUSIC = require(__dirname + '/../reference/sod-music.js');
const [snap, nfA] = process.argv.slice(2), nf = +(nfA || 9000);
const s = readSnapshot(snap);
const m = new Machine({ ram: s.ram, pc: s.regs.pc, port: { dir: s.port.dir, data: s.port.data }, cia: true });
m.cpu.setRegs(s.regs); m.enable = 1; m.cmp = 0; m.sidLog = [];
const d = SODMUSIC.createDriver({ base: 0, bytes: s.ram.slice(0, 0x3D00), ids: [1], resume: true });
d.init(0);
const game = [], page = [];
for (let f = 0; f < nf; f++) {
  m.joy1 = 0x1F; m.joy = 0x1F; m.runFrames(1);
  d.play(); const w = d.writes; for (let i = 0; i < w.length; i += 2) page.push(w[i] << 8 | w[i + 1]);
}
for (const [, reg, val] of m.sidLog) if (reg <= 0x18) game.push(reg << 8 | val);
let n = Math.min(game.length, page.length), bad = -1;
for (let i = 0; i < n; i++) if (game[i] !== page[i]) { bad = i; break; }
console.log(`${nf} frames: game ${game.length} SID writes, page ${page.length}; ` +
  (bad < 0 ? `the first ${n} match` : `first difference at write ${bad}: game ${game[bad].toString(16)} page ${page[bad].toString(16)}`));
console.log('phase at the end', m.ram[0x2E], 'phrase', m.ram[0x35A9], d.mem[0x35A9]);
process.exit(bad < 0 && Math.abs(game.length - page.length) < 40 ? 0 : 1);
