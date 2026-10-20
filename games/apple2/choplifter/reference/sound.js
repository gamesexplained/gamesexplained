/* sound.js */
// Choplifter's sound effects for the Sound section, from the game's own code: each effect is the code
// in the listing that makes it in the game, run on the kit's 6502 (C64Cpu, bare) over the listing's
// memory, with every access to the speaker ($C030) kept in the log that site/lib/apple2-speaker.js
// plays (kit-apple2-sound, cycles from the start of the code). index.html loads it after
// ../../lib/cpu6502.js; test_sound.js holds the logs to the clicks the game made in Apple2TS
// (facts.md, "Live tests").
//
//   ChopSound.EFFECTS      the effects: { name, from, to } runs the code from `from` until the program
//                          counter reaches `to`
//   ChopSound.log(L, k)    effect k's log, L being Apple2.load's listing
globalThis.ChopSound = (function () {
  const CLOCK = 1020484;
  const EFFECTS = [
    // new_game's three phrases: tone ($78C2) three times a phrase, the first note lower each time
    { name: 'New game', from: 0x0B69, to: 0x0B95 },
    // fire, once a shot is asked for: a falling tone
    { name: 'Shot', from: 0x0E30, to: 0x0E39 },
    // boarding, when a hostage climbs in: three notes, once a frame at most
    { name: 'Hostage aboard', from: 0x61D3, to: 0x61F6 },
    // killed_up's three notes, once a frame at most, after it has redrawn the killed counter
    { name: 'Hostage killed', from: 0x7A06, to: 0x7A2B },
    // rescued_up's note, after it has redrawn the rescued counter
    { name: 'Hostage home', from: 0x7A46, to: 0x7A4F },
    // killed_add's four falling notes, when a helicopter is lost with hostages aboard, after it has
    // added them to the killed counter and redrawn it
    { name: 'Helicopter lost', from: 0x7A8B, to: 0x7AAF },
    // tank_shoot's noise
    { name: 'Tank fires', from: 0x6865, to: 0x686E },
    // jet_missiles' noise
    { name: 'Jet fires', from: 0x8BE6, to: 0x8BEF },
    // a drone dropping a shell, at level 3: a steady tone
    { name: 'Drone drops a shell', from: 0x8DD5, to: 0x8DDE },
  ];

  function log(L, k) {
    const E = EFFECTS[k], m = L.ram.slice();
    // In a game ($79), the sound on ($72F6), the helicopter not a settled wreck ($11), and none of
    // the once-a-frame sounds played this frame ($731F-$7321)
    m[0x79] = 0xFF; m[0x72F6] = 0xFF; m[0x11] = 0;
    m[0x731F] = 0; m[0x7320] = 0; m[0x7321] = 0;
    const out = { format: 'kit-apple2-sound', clock: CLOCK, start: 0, end: 0, speaker: [] };
    // Page $C0 is the machine's switches: an access to $C030 moves the speaker, and the game also
    // reads $C020 (the cassette output) after each, which changes nothing here
    const io = {
      read(a, cpu) { if (a === 0xC030) out.speaker.push(cpu.cycles); return 0; },
      write(a, v, cpu) { if (a === 0xC030) out.speaker.push(cpu.cycles); },
    };
    const cpu = new C64Cpu.CPU(m, { io, ioPages: [0xC0] });
    cpu.pc = E.from;
    cpu.run({ until: E.to });
    out.end = cpu.cycles;
    return out;
  }

  return { CLOCK, EFFECTS, log };
})();
