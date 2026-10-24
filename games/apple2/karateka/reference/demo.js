/* demo.js */
// The title and the demo for the page's first look inside: the game's own code from the listings,
// run on the kit's 6502 (C64Cpu, bare) from the title stage's entry ($BFFA), as the engine enters it
// after the boot. The memory is the engine's listing with the title's laid over it, and the three
// cells of zero page the engine's load sets before it enters a stage: $07, the page to draw on, $D2,
// the stage loaded, and $3D, which the loader leaves at $60 (the title's snapshot holds those values).
// Every switch in page $C0 reads 0: no key, no button, the joystick's timers run out at once, and
// the ROM's ID byte ($FBB3, not in the listings) reads 0, an Apple II older than the IIe, so the
// flip does not wait for the vertical blank. The sounds call the Monitor's WAIT, which
// Apple2.monitor stands in for. The page shown is the last of $C054 (page 1, $2000) and $C055
// (page 2, $4000) the code read. index.html loads it after ../../lib/cpu6502.js and apple2.js;
// test_demo.js holds its pages to the pages Apple2TS held at the same flips (facts.md, "Live tests").
//
//   KarDemo.start(Ls)     a run from $BFFA, Ls holding Apple2.load's listings by part id (engine,
//                         title): { m, cpu, page, flips }
//   KarDemo.run(s, n)     runs about n cycles; the page shown is s.page (1 or 2)
//   KarDemo.next(s)       runs to the next flip of the page shown: { page, cycles }
globalThis.KarDemo = (function () {
  const CLOCK = 1020484, ENTRY = 0xBFFA;
  // the instructions after each read of $C054 or $C055: flip ($7619, $7624), the title's own flip
  // ($07A8, $07B5) and the castle picture's ($03B1, $03BD)
  const SHOWN = [0x761C, 0x7627, 0x07AB, 0x07B8, 0x03B4, 0x03C0];

  function start(Ls) {
    const m = Ls.engine.ram.slice(), t = Ls.title;
    for (let a = 0; a < 0x10000; a++) if (t.has[a]) m[a] = t.ram[a];
    m[0x07] = 0x40; m[0xD2] = 0; m[0x3D] = 0x60;
    const s = { m, cpu: null, page: 1, flips: 0 };
    const io = {
      read(a) { if (a === 0xC054) s.page = 1; else if (a === 0xC055) s.page = 2; return 0; },
      write(a) { if (a === 0xC054) s.page = 1; else if (a === 0xC055) s.page = 2; },
    };
    s.cpu = new C64Cpu.CPU(m, { io, ioPages: [0xC0] });
    s.cpu.pc = ENTRY; s.cpu.sp = 0xFF;
    return s;
  }

  const hooks = (s, stop) => ({ ...Apple2.monitor, ...Object.fromEntries(SHOWN.map(a => [a, () => { s.flips++; return stop; }])) });
  function run(s, n) {
    s.cpu.run({ cycles: n, hooks: s.hooks || (s.hooks = hooks(s, false)) });
  }

  function next(s) {
    const c0 = s.cpu.cycles, f = s.flips;
    const stop = s.stop || (s.stop = hooks(s, true));
    if (SHOWN.includes(s.cpu.pc)) s.cpu.step();          // off the last stop
    s.cpu.run({ cycles: 40e6, hooks: stop });
    if (s.flips === f) throw new Error('KarDemo: no flip in 40 million cycles');
    return { page: s.page, cycles: s.cpu.cycles - c0 };
  }

  return { CLOCK, ENTRY, SHOWN, start, run, next };
})();
