#!/usr/bin/env node
// Hold the How it works page's title sequence to the title's own code. index.html's gs-intro block
// (GsIntro) is TITLE's main program from title_setup ($8132) to title_end ($84AA) and its raster
// interrupt (irq, $8940) written again in JavaScript; gs-intro-run (gsIntroRun) runs it on the
// page's clock. Both sides start from the title's listing with GsIntro.INIT over it, at $8132,
// the video chip's registers as GsIntro.VIC0 has them and colour RAM all 14, as the loader leaves
// them.
//  1. The kit's lockstep (kit/c64/lockstep.js), with the video chip taking no cycles: at each pass,
//     rotor_frame's entry ($8532), all of RAM, colour RAM and the registers written to the video chip
//     and the SID must be the game's, for all 1,025 rotor frames the title draws. Every stretch
//     between two places without a wait in it must cost the port's count of cycles exactly, and
//     every interrupt too.
//  2. The page's clock against the kit's C64, the video chip's cycles taken as the machine takes
//     them: the interrupt must take each of the title's pictures in the same frame as on the
//     machine, and the title must end in the same frame.
// It exits 1 on any difference.
//   node games/c64/gunship/test_intro.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, FRAME } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/c64/lockstep.js'));
const g = game(__dirname), page = process.argv[2] || 'index.html';
const { GsIntro } = g.run(page, 'gs-intro', 'GsIntro');
globalThis.GsIntro = GsIntro;
const { gsIntroRun } = g.run(page, 'gs-intro-run', 'gsIntroRun');
const L = g.listing('parts/title/listing.json');
const CP = GsIntro.CP;

function machine(dma) {
  const ram = L.ram.slice();
  for (const [a, b] of GsIntro.INIT) ram.set(b, a);
  const m = new Machine({ ram, pc: 0x8132, port: { dir: 0x2F, data: 0x37 }, vic: { regs: GsIntro.VIC0, irq: 0 }, dma });
  m.colour.fill(14);
  m.cpu.sp = 0xEF;
  m.cpu.i = 0;
  return m;
}
let bad = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };

// 1. the lockstep
const m = machine(false);
const P = GsIntro.create(new Uint8Array(0x10000), {});
const portIrq = [], gameIrq = [];
const irq = P.irq;
P.irq = function () { irq.call(this); portIrq.push(P.hc); };
m.onReturn = (mm, v, c) => { gameIrq.push(c); };
let stretches = 0;
const ls = new Lockstep({
  machine: m, port: P, program: (p) => p.program(),
  checkpoints: Object.values(CP), passAt: CP.rotor, waits: [GsIntro.WAIT],
  irqs: { 0x8940: 'irq' }, chips: ['colour', 'vic', 'sid'], maxFrames: 400,
  timing: (s) => {
    if (s.polls || s.wait) return;
    stretches++;
    if (s.estimate !== s.cycles) fail('pass', s.pass, s.from.toString(16), 'to', s.to.toString(16), 'costs', s.cycles, 'cycles; the port counts', s.estimate);
  },
});
const PASSES = 1025;
const r = ls.run({ passes: PASSES });
console.log(describe(r));
if (!r.ok) bad++;
if (r.passes !== PASSES) fail(r.passes, 'passes made of', PASSES);
if (portIrq.length !== gameIrq.length) fail(portIrq.length, 'interrupts in the port,', gameIrq.length, 'in the game');
for (let i = 0; i < Math.min(portIrq.length, gameIrq.length); i++) if (portIrq[i] !== gameIrq[i]) fail('interrupt', i, 'costs', gameIrq[i], 'cycles; the port counts', portIrq[i]);
console.log(`${stretches} stretches without a wait and ${gameIrq.length} interrupts timed against the port's counts`);

// 2. the page's clock
const c = machine(true), takes = [];
let end = -1;
c.hooks[0x8965] = () => { takes.push(Math.floor(c.cpu.cycles / FRAME)); return false; };   // irq: a frame is ready
c.hooks[0x84AA] = () => { end = Math.floor(c.cpu.cycles / FRAME); c.stopFlag = true; return true; };
for (let f = 0; f < 3000 && end < 0; f++) c.runFrames(1);
const R = gsIntroRun(L.ram, { render: false });
let frames = 0;
while (R.next()) frames++;
if (R.takes.length !== takes.length) fail(R.takes.length, 'pictures taken on the page,', takes.length, 'on the machine');
for (let i = 0; i < Math.min(takes.length, R.takes.length); i++) if (takes[i] !== R.takes[i]) fail('picture', i, 'taken in frame', R.takes[i], 'on the page and', takes[i], 'on the machine');
if (frames !== end) fail('the title ends in frame', frames, 'on the page and', end, 'on the machine');
console.log(`${takes.length} pictures and the end in frame ${end}: ` + (bad ? bad + ' differences' : 'the page shows each in the frame the C64 does'));
process.exit(bad ? 1 : 0);
