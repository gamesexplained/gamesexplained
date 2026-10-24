/* stages.js */
// The four stages for the Maps / levels tab, each drawn by its own code: the stage's listing laid
// over the engine's, as its load lays it in the game, run on the kit's 6502 (C64Cpu, bare) from the
// stage's entry ($BFFA) to a flip of the page shown, as demo.js runs the title. A stage begins from
// what the stage before it left in the engine's memory, which no listing holds: zero page, the tune
// player's tempo ($0D5E) and $0F00-$0F0F, kept below (HANDOVER) as each stage's snapshot held them
// at $BFFA in Apple2TS. Each place is a flip of that run, after the changes it lists: a key pressed
// (the latch at $C000 set, as a key does), or bytes of zero page set, to reach a room without
// fighting the guards on the way, or the program counter sent to a routine. The run stops before the
// stage calls the loader ($0338), when the hero has died or the stage is over. index.html and
// levels.html load it after ../../lib/cpu6502.js and apple2.js; test_stages.js holds every place's
// pages to the pages Apple2TS held at the same flip after the same changes (facts.md, "Live tests").
//
//   KarStages.STAGES          [{ part, name, places: [{ name, at, set }] }]: at, the flip shown;
//                             set, { flip: { pokes, key, pc } } applied when that flip is shown
//                             (flip 0 before the first instruction)
//   KarStages.start(Ls, part) a run from $BFFA, Ls holding Apple2.load's listings by part id
//   KarStages.next(s, set)    runs to the next flip of the page shown and applies set's changes for it:
//                             { page, cycles }, or null once the stage calls the loader
//   KarStages.place(Ls, part, k)  a run brought to place k of the stage
globalThis.KarStages = (function () {
  const CLOCK = 1020484, ENTRY = 0xBFFA, LOAD = 0x0338;
  const SHOWN = [0x761C, 0x7627, 0x07AB, 0x07B8, 0x03B4, 0x03C0];
  const RIGHT = 0x15;                  // the right arrow: CONTROL-U
  const HANDOVER = {
    cliff: { zp: 'AGAA7LsFT0AAAAAAACUFAAAAAAAFBQAAAAAA7LsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAQAAAAAAAAAtF0AAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQAAAAAAAAAAAAAAAAAPCgAAQIK5AAAAAAAAAAAAAAAAAAAAMFsQAQEBqAAAAA==',
      d5e: 0x06, f00: 'AAH/AdcBywHAAbUBqwGPAQ==' },
    palace: { zp: '0B+A3qIllUDAKAQAABcCAQCAqtUlAgAADAAA3qIAAAATEygAACcnAAABAf//AAAAAQAL/v4AADpCAAAAAGAFAQAAAAABAP+AZQAAAQEAAAEAFxsAAAAQAAAAAAABAQAAGgYqAAEuOwEAAf//AQAAABMTKAAAJycAAAEB//8AAAAoAGQABQ4BAAAZBw4AAAAGFC8QAFAAAAAHAACAAA//DgUAAAACAgAAAAAAFxcAAAAJEwEGACYPAAIeHgAAAAAAAAAAAAEAAAAAAAAAAAAAAAIAAgAAAAD/6FAAAAAAAAAbGyknKCi5AAAAAAAAAAAAAAAAAAAAJL8QAQEBYwAAAA==',
      d5e: 0x05, f00: 'ExMUAAAnJwAAAQH//wAAAA==' },
    dungeon: { zp: '0B+AAKAgdEDAKAIAAAQFAACAqtUgBQABAAAAAKAAAAATExwAAicnAAABAf//AAAAAQYU8v4BADRcAAAAAGAFAQAAAAAAAICAJAAAAAAAAAEAHRwAAAAQAAAAAAATAQAAIx4qAABDLgEBAQD/AQAA/xMTHAACJycAAAEB//8AAAAcAAEABQ4BAAAZBw4AAAAGCh8JggICAAAHAACAAA//DgUAAAAAAgB0AAAAHR0AAAAIFAEGACY4AAIeHgAAAAAAAAAAAAEAAAAAAAAAAAAAAAMAAwAAAAD//0AAAAAAAAAcHCkpHBy5AAAAHx8AAAoKAAAAAAAAJH4QAQEBYwAAAA==',
      d5e: 0x05, f00: 'ExMSAAAnJwAAAAD//wAAAA==' },
    akuma: { zp: '0B+AzpYlX0CtKAEAAE0CAACAgIAkAQAAAAAAzpYAAAABARUAAAMDAQEA//8BAAAAAgYG/QAAADRcAAAAAGAGAQAAAAAEAICAOAAAAAAFAAEAK+AAAAAFAAAAAAAGAQAAAQEVAAADAwEBAP//AQAAABMTEgABJycAAAEB//8AAAASAAEAAA4BAAAZBw4AAAAGHhgJbP4OAQAAAACAAA//DgUAAAACAgB0AAAAEREAAAAIBQEGACYOAAL/HgAAAAAAAAAAAAEFAAAAAAAAAAAAAAQABAAAAAD//0AAAAAAAADg4BUVEhK5AAAAGBgABR4eAAAAAAAAJH4QAQEBYwAAAA==',
      d5e: 0x05, f00: 'ExMSAAAnJwAAAAD//wAAAA==' },
  };
  // The keyboard is chosen ($C4 = 1, the K key) wherever a stage's snapshot had the joystick, so that
  // no key down means the hero stands still. Rooms are reached by putting the hero at column $21
  // ($62), the column at which each stage's own code takes him on to the next screen or room, with the
  // rooms' doorways all opened ($C5 = 6), as kicking each one open does.
  const STAGES = [
    { part: 'cliff', name: 'The cliff', places: [
      { name: 'The climb', at: 2, set: { 0: { pokes: { 0xC4: 1 } } } },
      { name: 'The cliff’s edge', at: 8, set: { 0: { pokes: { 0xC4: 1 } } } },
      { name: 'A guard at the gate', at: 22, set: { 0: { pokes: { 0xC4: 1 } }, 8: { key: RIGHT } } },
      { name: 'The second screen', at: 12, set: { 0: { pokes: { 0xC4: 1 } }, 8: { pokes: { 0x30: 1, 0x62: 0x21 } } } },
    ] },
    { part: 'palace', name: 'The palace', places: [
      { name: 'Mariko’s cell', at: 1, set: {} },
      { name: 'The doors', at: 3, set: {} },
      { name: 'The hall', at: 5, set: { 3: { pokes: { 0x52: 0xA0, 0x51: 0x11, 0x50: 0 } } } },
      { name: 'The portcullis', at: 5, set: { 3: { pokes: { 0x52: 0x1C, 0x51: 0x1D, 0x50: 0 } } } },
    ] },
    { part: 'dungeon', name: 'The dungeon', places: [
      { name: 'The stairs', at: 7, set: {} },
      { name: 'Room 1', at: 10, set: { 7: { pokes: { 0xC5: 6, 0x62: 0x21 } } } },
      { name: 'Room 2', at: 13, set: { 7: { pokes: { 0xC5: 6, 0x62: 0x21 } }, 10: { pokes: { 0x62: 0x21 } } } },
      { name: 'Room 3', at: 16, set: { 7: { pokes: { 0xC5: 6, 0x62: 0x21 } }, 10: { pokes: { 0x62: 0x21 } }, 13: { pokes: { 0x62: 0x21 } } } },
      { name: 'Room 4', at: 19, set: { 7: { pokes: { 0xC5: 6, 0x62: 0x21 } }, 10: { pokes: { 0x62: 0x21 } }, 13: { pokes: { 0x62: 0x21 } }, 16: { pokes: { 0x62: 0x21 } } } },
    ] },
    { part: 'akuma', name: 'Akuma’s chamber', places: [
      { name: 'Room 4', at: 1, set: {} },
      { name: 'Room 5', at: 5, set: { 3: { pokes: { 0xC5: 6, 0x62: 0x21 } } } },
      { name: 'Room 6', at: 8, set: { 3: { pokes: { 0xC5: 6, 0x62: 0x21 } }, 6: { pokes: { 0x62: 0x21 } } } },
      { name: 'The closing words', at: 2, set: { 1: { pc: 0xB810 } } },
    ] },
  ];

  const bytes = b64 => typeof atob === 'function' ? Uint8Array.from(atob(b64), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(b64, 'base64'));

  function start(Ls, part) {
    const m = Ls.engine.ram.slice(), st = Ls[part], h = HANDOVER[part];
    for (let a = 0; a < 0x10000; a++) if (st.has[a]) m[a] = st.ram[a];
    m.set(bytes(h.zp), 0); m[0x0D5E] = h.d5e; m.set(bytes(h.f00), 0x0F00);
    const s = { m, cpu: null, page: 1, flips: 0, key: 0, done: false };
    // Page $C0 is the machine's switches: the pages shown, and the keyboard's latch, its top bit
    // cleared by the strobe; every other switch reads 0
    const io = {
      read(a) {
        if (a === 0xC054) s.page = 1; else if (a === 0xC055) s.page = 2;
        else if (a === 0xC000) return s.key; else if (a === 0xC010) s.key &= 0x7F;
        return 0;
      },
      write(a) { if (a === 0xC054) s.page = 1; else if (a === 0xC055) s.page = 2; else if (a === 0xC010) s.key &= 0x7F; },
    };
    s.cpu = new C64Cpu.CPU(m, { io, ioPages: [0xC0] });
    s.cpu.pc = ENTRY; s.cpu.sp = 0xFF;
    const stop = () => { s.flips++; return true; };
    s.hooks = { ...Apple2.monitor, ...Object.fromEntries(SHOWN.map(a => [a, stop])), [LOAD]: () => { s.done = true; return true; } };
    return s;
  }

  function apply(s, ch) {
    if (!ch) return;
    for (const [a, v] of Object.entries(ch.pokes || {})) s.m[+a] = v;
    if (ch.key !== undefined) s.key = ch.key | 0x80;
    if (ch.pc !== undefined) s.cpu.pc = ch.pc;
  }

  function next(s, set) {
    if (s.done) return null;
    if (s.flips === 0 && s.cpu.pc === ENTRY && !s.began) { s.began = true; apply(s, set && set[0]); }
    const c0 = s.cpu.cycles, f = s.flips;
    if (SHOWN.includes(s.cpu.pc)) s.cpu.step();          // off the last stop
    s.cpu.run({ cycles: 80e6, hooks: s.hooks });
    if (s.done) return null;
    if (s.flips === f) throw new Error('KarStages: no flip in 80 million cycles');
    apply(s, set && set[s.flips]);
    return { page: s.page, cycles: s.cpu.cycles - c0 };
  }

  function place(Ls, part, k) {
    const P = STAGES.find(t => t.part === part).places[k], s = start(Ls, part);
    while (s.flips < P.at) if (!next(s, P.set)) break;
    return s;
  }

  return { CLOCK, ENTRY, SHOWN, STAGES, HANDOVER, start, next, place };
})();
