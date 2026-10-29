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
  // The title tune ($4576 music_init, $457C music_play once a frame), with its sampled channel: the
  // NMI sample_nmi ($5106) from CIA 2's timer A writes four bits at a time into the SID's volume, so
  // the player calls play() once every M.period cycles (sid.js's period) and the driver counts the
  // timer down itself, runs the NMI at each underflow, and runs music_play every 19,656 cycles. The
  // timer follows the writes the game makes: $DD04/$DD05 the latch (the high byte loads a stopped
  // timer), $DD0E bit 0 start and bit 4 force load, $DD0D the mask (bit 7 sets the bits given).
  createTitleDriver: function (M, C64Cpu) {
    const P = M.period, FRAME = 312 * 63, mem = new Uint8Array(0x10000), sid = new Uint8Array(25);
    let writes = [], pending = [], on = false, toFrame = 0;
    const cia = { latch: 0xFFFF, count: 0xFFFF, run: false, nmi: false };
    const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: {
      read: (a) => (a >= 0xD000 && a < 0xD400) || a >= 0xDC00 ? 0 : mem[a],
      write(a, v) {
        if (a >= 0xD400 && a <= 0xD418) { sid[a - 0xD400] = v; writes.push(a - 0xD400, v); return; }
        if (a === 0xDD04) cia.latch = (cia.latch & 0xFF00) | v;
        else if (a === 0xDD05) { cia.latch = (cia.latch & 0xFF) | v << 8; if (!cia.run) cia.count = cia.latch; }
        else if (a === 0xDD0D) { if (v & 1) cia.nmi = !!(v & 0x80); }
        else if (a === 0xDD0E) { cia.run = !!(v & 1); if (v & 0x10) cia.count = cia.latch; }
        else if (a < 0xDC00) mem[a] = v;
      },
    } });
    return {
      sid, get writes() { return writes; }, mem, cia,
      init() {
        mem.set(M.bytes, M.base); sid.fill(0); writes = []; toFrame = 0;
        Object.assign(cia, { latch: 0xFFFF, count: 0xFFFF, run: false, nmi: false });
        cpu.call(0x4576, { d: 0 }, { maxSteps: 1e6 });
        pending = writes; writes = []; on = true;
      },
      stop() { cpu.call(0x4579, { d: 0 }, { maxSteps: 1e6 }); on = false; writes = []; pending = []; },
      play() {
        writes = pending; pending = [];
        if (!on) return;
        if (toFrame < P) { toFrame += FRAME; cpu.call(0x457C, { d: 0 }, { maxSteps: 1e6 }); }   // a frame starts in this call
        toFrame -= P;
        let budget = P;
        while (cia.run && cia.count < budget) {
          budget -= cia.count + 1; cia.count = cia.latch;
          if (cia.nmi) cpu.nmi(0x5106, { maxSteps: 1e5 });
        }
        if (cia.run) cia.count -= budget;
      },
      playing: () => on,
    };
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
