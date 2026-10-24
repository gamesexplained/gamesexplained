/* sound.js */
// Karateka's sound effects for the Sound section, from the game's own code: each effect is the
// engine's routine for it in the listing, called on the kit's 6502 (C64Cpu, bare) over the engine's
// memory until it returns, with every access to the speaker ($C030) kept in the log that
// site/lib/apple2-speaker.js plays (kit-apple2-sound, cycles from the start of the call). Five of the
// seven space their clicks with the Monitor's WAIT ($FCA8), which Apple2.monitor stands in for. The
// recorded sound is play_sample ($0DC0) with its speed, $BA, set as the game sets it before each use.
// index.html loads it after ../../lib/cpu6502.js and ../../lib/apple2.js; test_sound.js holds the
// logs to the clicks the game made in Apple2TS (facts.md, "Live tests").
//
//   KarSound.EFFECTS       the sounds: { name, entry, speed } calls entry, with $BA = speed if given
//   KarSound.log(L, k)     sound k's log, L being Apple2.load's engine listing
globalThis.KarSound = (function () {
  const CLOCK = 1020484;
  const EFFECTS = [
    // sound_vectors: the hero struck ($42 counting, $764D)
    { name: 'The hero struck', entry: 0x0C40 },
    // the opponent struck, or a doorway kicked open ($43 counting, $765C)
    { name: 'The opponent struck', entry: 0x0C43 },
    // a quick punch landed ($41 = 1, $7661)
    { name: 'A quick punch lands', entry: 0x0C46 },
    // a blow thrown ($45, $7677)
    { name: 'A blow thrown', entry: 0x0C49 },
    // a control key's answer, from the special keys ($771F)
    { name: 'A control key', entry: 0x0C4C },
    // the step of a run in a scene ($36 set, $7693), and in play ($768E)
    { name: 'A step, in a scene', entry: 0x0C4F },
    { name: 'A step', entry: 0x0C52 },
    // play_sample at the speeds the game asks for it: 30 as an opponent falls dead ($729D) or a
    // doorway is kicked open ($740A), 40 as the hero falls ($724B), 18 as Mariko kicks (akuma $BB3B)
    { name: 'Recorded, speed 30', entry: 0x0DC0, speed: 30 },
    { name: 'Recorded, speed 40', entry: 0x0DC0, speed: 40 },
    { name: 'Recorded, speed 18', entry: 0x0DC0, speed: 18 },
  ];

  function log(L, k) {
    const E = EFFECTS[k], m = L.ram.slice();
    if (E.speed !== undefined) m[0xBA] = E.speed;
    const out = { format: 'kit-apple2-sound', clock: CLOCK, start: 0, end: 0, speaker: [] };
    const io = {
      read(a, cpu) { if (a === 0xC030) out.speaker.push(cpu.cycles); return 0; },
      write(a, v, cpu) { if (a === 0xC030) out.speaker.push(cpu.cycles); },
    };
    const cpu = new C64Cpu.CPU(m, { io, ioPages: [0xC0] });
    cpu.call(E.entry, {}, { hooks: { ...Apple2.monitor }, maxSteps: 2e6 });
    out.end = cpu.cycles;
    return out;
  }

  return { CLOCK, EFFECTS, log };
})();
