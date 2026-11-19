// The Music tab's sound effects: the game's own effect code, run on the kit's 6502 over the
// listing's bytes. An effect is started the way play starts it, then the frame's sound routine
// (sound_update, $7D09) is called once a frame, as the game's interrupt calls it. The game's random
// bytes ($6E68, read from the CIA timers) come from a small generator here instead.
//   0 a diamond picked up   run $7529-$7536: the shadow registers for voice 1 from $7522
//   1 a diamond falling     call $71C0: the table at $7524 with a random pitch
//   2 a boulder thud        call $71EE: the shadow registers from $71E7
//   3 an explosion          call $7129: voice 2 straight from $713D, sound lockout $9811 = 80
//   4 the quota reached     call $741F: voice 3 from $7418 for $21 frames
//   5 the low-time beeps    call $7424 once a second with the last time digit at 3, 2 and 1
// Checked by test_sfx.js.
var BDSFX = { createDriver: function (data, C64Cpu) {
  'use strict';
  const FRAMES = [60, 60, 60, 120, 60, 170];
  let mem, cpu, id = -1, frame = 0, seed = 0x5A;
  const sid = new Uint8Array(25), writes = [];
  const io = {
    read: () => 0,
    write: (a, v) => { if (a >= 0xD400 && a < 0xD419) { sid[a - 0xD400] = v; writes.push(a - 0xD400, v); } },
  };
  const hooks = { 0x6E68: c => { seed = (seed * 109 + 89) & 0xFF; c.a = seed; c.z = !seed; c.n = !!(seed & 0x80); c.rts(); } };
  function lowTime(digit) { mem[0xAB] = 0; mem[0xAC] = 0; mem[0xAD] = digit; cpu.call(0x7424, {}, { hooks, maxSteps: 1e4 }); }
  return {
    sid, writes,
    init(tune) {
      mem = new Uint8Array(65536);
      for (const [a, b64] of data.blocks) { const s = atob(b64); for (let i = 0; i < s.length; i++) mem[a + i] = s.charCodeAt(i); }
      cpu = new C64Cpu.CPU(mem, { port: 0x35, io });
      id = tune; frame = 0; seed = 0x5A; writes.length = 0;
      if (tune === 0) { cpu.pc = 0x7529; cpu.run({ until: 0x7537, hooks, maxSteps: 1e4 }); }
      else if (tune === 5) lowTime(3);
      else cpu.call([0, 0x71C0, 0x71EE, 0x7129, 0x741F][tune], {}, { hooks, maxSteps: 1e4 });
    },
    stop() { id = -1; },
    play() {
      writes.length = 0;
      if (id < 0) return;
      if (id === 5 && (frame === 50 || frame === 100)) lowTime(3 - frame / 50);
      cpu.call(0x7D09, {}, { hooks, maxSteps: 1e5 });
      if (++frame >= FRAMES[id]) id = -1;
    },
    playing() { return id >= 0; },
  };
} };
if (typeof module === 'object' && module.exports) module.exports = BDSFX;
