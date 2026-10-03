// Doctor Who and the Mines of Terror's music player ($7548-$7647), ported to JavaScript for the
// site's SID player (../../lib/sid.js). createDriver refers to nothing outside itself: the player
// runs its source text in an AudioWorklet. The game calls the player every frame and it works on
// even frames only (music_update, $74EA); play() here is one frame, odd frames doing nothing.
// Checked against the game's own code run in kit/c64/cpu6502.js (tests/music.js): every SID
// register after every frame, for the five tunes.
const DWMUSIC = {
  createDriver: function (data) {
    // data: the bytes of $1F00-$77FF as the game loads them
    const BASE = 0x1F00, M = (a) => data[a - BASE];
    const sid = new Uint8Array(25);
    let tune = 5, running = false, odd = false, looped = false;
    let n1 = 0, n2 = 0, d1 = 0, d2 = 0, c1 = 0, c2 = 0;      // note and length pointers, countdowns
    let last = [0, 0];
    const w = (r, v) => { sid[r] = v; };
    function start() {                                         // music_start $7548
      running = true; c1 = c2 = 1;
      for (let x = 0; M(0x756B + x) !== 0xFF; x += 2) w(M(0x756B + x), M(0x756C + x));
      n1 = M(0x74D6 + tune) | M(0x74DB + tune) << 8;           // music_select_tune $7591
      n2 = M(0x74E0 + tune) | M(0x74E5 + tune) << 8;
      d1 = M(0x74C2 + tune) | M(0x74C7 + tune) << 8;
      d2 = M(0x74CC + tune) | M(0x74D1 + tune) << 8;
    }
    function step() {                                          // music_step $75C0
      if (--c1 & 0xFF) { c1 &= 0xFF; if (c1 === 1) w(4, 0); }
      else {
        w(1, M(n1)); w(0, M(n1 + 1)); n1 += 2; w(4, 0x21); last[0] = sid[1] << 8 | sid[0];
        c1 = M(d1); if (!c1) { looped = true; return start(); }
        d1++;
      }
      if (--c2 & 0xFF) { c2 &= 0xFF; if (c2 === 1) w(11, 0); }
      else {
        w(8, M(n2)); w(7, M(n2 + 1)); n2 += 2; w(11, 0x21); last[1] = sid[8] << 8 | sid[7];
        c2 = M(d2); if (!c2) { looped = true; return start(); }
        d2++;
      }
    }
    return {
      sid,
      init(t) { tune = t; running = false; odd = false; looped = false; },
      stop() { tune = 5; sid[4] = sid[11] = 0xFF; },           // sound_silence_all $C89C
      play() {
        const even = !odd; odd = !odd;
        if (!even || tune === 5) return;
        if (!running) start(); else step();
      },
      playing() { return tune !== 5 && !looped; },
      voice(x) { return x < 2 ? { count: x ? c2 : c1, ptr: x ? n2 : n1 } : null; },
    };
  },
};
if (typeof module !== 'undefined') module.exports = DWMUSIC;
