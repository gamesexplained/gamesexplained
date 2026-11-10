// Bruce Lee's music and sound effects for the site's SID player (../../lib/sid.js). createDriver
// runs the game's own code on the kit's 6502 (C64Cpu, from ../../lib/cpu6502.js, which sid.js
// passes to createDriver) over the game's memory from its listing:
// - tune 0, the menu tune: what the menu does before it shows ($06CC-$06DA), the end mode $E314 = 3
//   and the song list $E870 = song 0 then $FF, then music_start ($E003); and music_frame ($E006)
//   once a frame, as the menu's raster interrupt calls it ($154C);
// - the others, one sound effect each: stop_sounds ($255E), then play_sound ($2509) with Y = $80
//   plus the effect's number, as the game asks for them; and the three effect voices ($EB03,
//   $EF73, $F073) once a frame, in the order frame_work calls them ($15AF).
// createDriver refers to nothing outside itself: the player runs its source text in an
// AudioWorklet. Checked against the game itself in kit/c64/machine.js (test_music.js).
const BRUCEMUSIC = {
  // M.bytes: the game's memory from M.base; M.ids: per tune, 0 for the menu tune or the effect's
  // number ($80 + n is what play_sound is given)
  createDriver: function (M, C64Cpu) {
    const mem = new Uint8Array(0x10000), sid = new Uint8Array(25);
    let writes = [], on = false, effect = false;
    const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: {          // the SID's registers; the rest is memory
      read: (a) => mem[a],
      write(a, v) { if (a >= 0xD400 && a <= 0xD418) { sid[a - 0xD400] = v; writes.push(a - 0xD400, v); } else mem[a] = v; },
    } });
    const call = (entry, r) => cpu.call(entry, r || {}, { maxSteps: 200000 });
    return {
      init(t) {
        mem.set(M.bytes, M.base); sid.fill(0); writes = [];
        const id = M.ids[t];
        if (id === null) {                                   // the menu tune
          effect = false;
          call(0xE000);                                      // music_init: stop
          mem[0xE314] = 3; mem[0xE870] = 0; mem[0xE871] = 0xFF;
          call(0xE003);                                      // music_start
        } else {
          effect = true;
          call(0x255E);                                      // stop_sounds
          call(0x2509, { y: 0x80 | id });                    // play_sound
        }
        on = true;
      },
      stop() { if (effect) call(0x255E); else call(0xE000); on = false; },
      play() {
        writes = [];
        if (!on) return;
        if (!effect) { call(0xE006); return; }
        call(0xEB03); call(0xEF73); call(0xF073);
        if (!mem[0xEB00] && !mem[0xEF70] && !mem[0xF070]) on = false;   // every voice free: the effect is over
      },
      sid, get writes() { return writes; }, playing: () => on, mem,
    };
  },
};
if (typeof module !== 'undefined') module.exports = BRUCEMUSIC;
