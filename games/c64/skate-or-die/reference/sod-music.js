// Skate or Die!'s sound driver for the site's SID player (../../lib/sid.js). createDriver runs the
// game's own code on the kit's 6502 (C64Cpu, from ../../lib/cpu6502.js, which sid.js passes to
// createDriver) over an event's memory: init_sound_driver to reset, queue_sound_id to start a
// sound, and update_sid_voices once a frame, as the game does. Every event has the same driver, moved: M.at gives its three entries and how far its
// variables moved from High Jump's ($221B), and High Jump's addresses are the default. createDriver
// refers to nothing outside itself: the player runs its source text in an AudioWorklet. Checked
// against the game itself in kit/c64/machine.js (tests/music.js).
const SODMUSIC = {
  // Where each event's copy of the driver sits: entries, the shift of its variables from High Jump's,
  // and the byte that holds the phrase playing (High Jump only). fix: bytes the driver runs that the
  // part's listing leaves out, from the game's memory: the race's listing has no byte at $3329, the
  // RTS that ends the driver code from $32FD.
  at: {
    highjump: { init: 0x22B7, queue: 0x22F5, update: 0x232C, vars: 0, phrase: 0x35A9 },
    ramp: { init: 0x271E, queue: 0x275C, update: 0x2793, vars: 0x467 },
    downhill: { init: 0x2FAC, queue: 0x2FEA, update: 0x3021, vars: 0xCF5, fix: { 0x3329: 0x60 } },
    jam: { init: 0xE000, queue: 0xE03E, update: 0xE075, vars: 0x123E },
    joust: { init: 0x22C8, queue: 0x2306, update: 0x233D, vars: 0x11 },
  },
  createDriver: function (M, C64Cpu) {
    const at = M.at || { init: 0x22B7, queue: 0x22F5, update: 0x232C, vars: 0, phrase: 0x35A9 }, v = at.vars;
    const mem = new Uint8Array(0x10000);
    mem.set(M.bytes, M.base);
    if (at.fix) for (const a in at.fix) mem[a] = at.fix[a];
    const sid = new Uint8Array(25);
    let writes = [], on = false, steps = 0;
    const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: {         // the SID's registers; the rest of $D000-$DFFF is memory
      read: (a) => mem[a],
      write(a, v) { if (a >= 0xD400 && a <= 0xD418) { sid[a - 0xD400] = v; writes.push(a - 0xD400, v); } else mem[a] = v; },
    } });
    // a call starts with A as given; X, Y and the flags are as the last call left them
    const call = (entry, a) => cpu.call(entry, { a: a & 255 }, { maxSteps: 200000 });
    // M.base, M.bytes: the event's memory from M.base; M.ids: the sound ID each button starts
    let first = true;
    return {
      init(t) {                                            // init_sound_driver, then queue_sound_id
        for (let r = 0; r < 25; r++) sid[r] = 0; writes = [];
        if (first && M.resume) { first = false; on = true; if (M.resume === 'queue') call(at.queue, M.ids[t]); return; }
        call(at.init, 0); call(at.queue, M.ids[t]); on = true; steps = 0;
      },
      stop() { call(at.init, 0); on = false; },
      play() { writes = []; if (!on) return; call(at.update, 0); steps++; if (steps > 2 && !(mem[0x2254 + v] | mem[0x2256 + v] | mem[0x2258 + v]) && !mem[0x221B + v]) on = false; },
      sid, get writes() { return writes; }, playing: () => on,
      voice(x) {                                           // slots 4, 2, 0 drive SID voices 1, 2, 3 ($29DC)
        const s = [4, 2, 0][x];
        return { id: mem[0x2253 + v + s], phrase: at.phrase ? mem[at.phrase] : null, flags: mem[0x2254 + v + s] };
      },
      mem,
    };
  },
};
if (typeof module !== 'undefined') module.exports = SODMUSIC;
