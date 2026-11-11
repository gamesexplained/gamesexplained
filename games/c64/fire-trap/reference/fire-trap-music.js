// Fire Trap's sound driver for the site's SID player (../../lib/sid.js). createDriver runs the game's own
// player, the code at $8000-$843B with its tables to $8DFF, on the kit's 6502 (C64Cpu, from
// ../../lib/cpu6502.js, which sid.js passes to createDriver). It makes the calls the game makes: $8000
// (music_entry) to reset, a tune number in $B4 or an effect number in $B5 to start a sound, and the
// raster handler's play_music ($2AA6) once a frame, which calls music_play ($8003) and calls it a
// second time whenever the phase counter $C0, adding $33 a frame, carries (every sixth frame). The page
// embeds the driver's bytes as data. Checked against the game's own play_music in tests/music.js.
// createDriver refers to nothing outside itself, so the page hands it the sounds table with the bytes
// (M.sounds): the player runs its source text in an AudioWorklet.
const FTMUSIC = {
  // sounds[t]: [what, 'tune' or 'effect', the number the game writes]
  sounds: [
    ['Tune 0: the title screens', 'tune', 0],
    ['Tune 1: the top of the building and the name entry', 'tune', 1],
    ['Tune 2: the building scrolling past before a stage', 'tune', 2],
    ['Tune 3: the music during a stage', 'tune', 3],
    ['Tune 4: stored, never requested, plays no note', 'tune', 4],
    ['Effect $1E: the spray', 'effect', 0x1E],
    ['Effect $1F: a pickup or a person', 'effect', 0x1F],
    ['Effect $20: a spray shot lands', 'effect', 0x20],
    ['Effect $21: the firefighter is hit', 'effect', 0x21],
    ["Effect $22: a step sound from the movement code", "effect", 0x22],
    ['Effect $24: a fire goes out', 'effect', 0x24],
  ],
  createDriver: function (M, C64Cpu) {
    const mem = new Uint8Array(0x10000);
    const sid = new Uint8Array(25);
    let writes = [];
    const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: {
      read: (a) => mem[a],
      write(a, v) { if (a >= 0xD400 && a <= 0xD418) { sid[a - 0xD400] = v; writes.push(a - 0xD400, v); } else mem[a] = v; },
    } });
    const exec = new Uint8Array(0x10000);
    const call = (entry) => cpu.call(entry, {}, { maxSteps: 200000, executed: exec });
    let on = false, effect = false, quiet = 0, phase = 0;
    const frame = () => { call(0x8003); phase += 0x33; if (phase > 255) { phase = 0; call(0x8003); } };
    return {
      init(t) {
        mem.fill(0); mem.set(M.bytes, 0x8000);
        for (let r = 0; r < 25; r++) sid[r] = 0;
        writes = []; phase = 0; quiet = 0; exec.fill(0);
        call(0x8000);
        const s = M.sounds[t];
        if (s[1] === 'tune') { mem[0xB4] = s[2]; effect = false; }
        else { mem[0xB4] = 4; effect = true; for (let i = 0; i < 3; i++) frame(); mem[0xB5] = s[2]; writes = []; }
        on = true;
      },
      stop() { on = false; },
      play() {
        writes = []; if (!on) return;
        frame();
        if (effect) { if (sid[11] & 1) quiet = 0; else if (++quiet > 20) on = false; }
        else if (exec[0x83D1]) on = false;
      },
      sid, get writes() { return writes; }, playing: () => on,
      voice(x) { return { tune: mem[0xB0], effect: effect ? 1 : 0 }; },
      mem,
    };
  },
};
if (typeof module !== 'undefined') module.exports = FTMUSIC;
