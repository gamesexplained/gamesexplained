/* tunes.js */
// Karateka's tunes for the Music section, from the game's own code: each tune is the stage's own
// entry for it in the listing ($1000-$1017, a JMP to code that points $F7 at the tune) run on the
// kit's 6502 (C64Cpu, bare) through the engine's player at $0D00 until that player returns ($0DA5),
// with every access to the speaker ($C030) kept in the log that site/lib/apple2-speaker.js plays
// (kit-apple2-sound, cycles from the start of the code). The memory is the engine's listing with the
// stage's laid over it, as the stage's load lays it over the engine in the game. index.html loads it
// after ../../lib/cpu6502.js; test_tunes.js holds the logs to the clicks the game made in Apple2TS
// (facts.md, "Live tests").
//
//   KarTunes.TUNES         the sixteen different tunes the game stores: { name, part, entry, also },
//                          the stage whose entry plays it and the entry; also lists the other
//                          stages whose entry at the same address plays the same tune
//   KarTunes.PARTS         the listings a page loads: the engine's and each stage's
//   KarTunes.log(Ls, k, p) tune k's log, Ls holding Apple2.load's listing for each part by its id;
//                          p, one of the tune's also, plays it from that stage instead. Beside the
//                          clicks: tune, the address of the tune's header, and notes, [cycle,
//                          address] at each note the player starts ($0D49), the note's first byte
globalThis.KarTunes = (function () {
  const CLOCK = 1020484;
  const PARTS = ['engine', 'title', 'cliff', 'palace', 'dungeon', 'akuma'];
  const TUNES = [
    { name: "Akuma's chamber", part: 'cliff', entry: 0x1000, also: ['title', 'palace', 'dungeon'] },
    { name: 'A game starts', part: 'title', entry: 0x1012 },
    { name: 'The climb', part: 'cliff', entry: 0x1009, also: ['title'] },
    { name: 'Akuma raises his arm', part: 'cliff', entry: 0x100C, also: ['title', 'palace'] },
    { name: 'A guard beaten', part: 'cliff', entry: 0x1006, also: ['title', 'palace', 'dungeon'] },
    { name: 'The hero dies', part: 'cliff', entry: 0x1003, also: ['title', 'palace', 'dungeon', 'akuma'] },
    { name: 'Mariko turns in her cell', part: 'title', entry: 0x1015 },
    { name: 'The cell scene ends', part: 'title', entry: 0x100F },
    { name: 'Mariko in her cell, first', part: 'palace', entry: 0x1009, also: ['dungeon'] },
    { name: 'Mariko in her cell, second', part: 'palace', entry: 0x100F, also: ['dungeon'] },
    { name: 'Akuma raises his arm, in the dungeon', part: 'dungeon', entry: 0x100C },
    { name: 'Room 5', part: 'akuma', entry: 0x100F },
    { name: 'Akuma beaten', part: 'akuma', entry: 0x1006 },
    { name: 'The embrace, first', part: 'akuma', entry: 0x1009 },
    { name: 'The embrace, second', part: 'akuma', entry: 0x100C },
    { name: 'The closing tune', part: 'akuma', entry: 0x1000 },
  ];
  const PLAYER_DONE = 0x0DA5;          // play_tune's RTS

  function memory(Ls, part) {
    const m = Ls.engine.ram.slice(), st = Ls[part];
    for (let a = 0; a < 0x10000; a++) if (st.has[a]) m[a] = st.ram[a];
    return m;
  }

  function log(Ls, k, part) {
    const T = TUNES[k], m = memory(Ls, part || T.part);
    m[0x4F] = 1; m[0x86] = 1;            // the music and the sound on
    const out = { format: 'kit-apple2-sound', clock: CLOCK, start: 0, end: 0, speaker: [], tune: 0, notes: [] };
    // Page $C0 is the machine's switches: the player reads the keyboard at $C000 between notes (no
    // key is down here) and moves the speaker with every access to $C030
    const io = {
      read(a, cpu) { if (a === 0xC030) out.speaker.push(cpu.cycles); return 0; },
      write(a, v, cpu) { if (a === 0xC030) out.speaker.push(cpu.cycles); },
    };
    const cpu = new C64Cpu.CPU(m, { io, ioPages: [0xC0] });
    cpu.pc = T.entry;
    const hooks = {
      0x0D00: () => { out.tune = m[0xF7] | m[0xF8] << 8; },
      0x0D49: c => { out.notes.push([c.cycles, (out.tune + c.y) & 0xFFFF]); },
    };
    cpu.run({ until: PLAYER_DONE, maxSteps: 50000000, hooks });
    out.end = cpu.cycles;
    return out;
  }

  return { CLOCK, PARTS, TUNES, log };
})();
