// The raster interrupt: irq, which takes turns between line 146 (the panel's colours and the TIME
// label's flash) and line 250 (the room's colours and the tune), then the KERNAL's keyboard scan;
// music_tick, flash_time_label, and old_music_tick, which nothing calls.
(function (root) {
'use strict';
(root.PuniGroups = root.PuniGroups || {}).irq = function (P) {
const M = P.M, io = P.io, Z = P.Z, T = P.T, N = P.N;
const wr = (a, v) => { M[a] = v; }, rd = a => M[a];

// The interrupt (irq, $312E), reached through the KERNAL's way in. Its scan of the keyboard
// (JSR $FF9F) is the KERNAL's own, as C16.scnkey (site/lib/c16.js) runs it, on the chips the port
// is given; its cycles go into N.scan.
P.irq = function () {
  io.write(0xFF09, io.read(0xFF09));
  if (io.read(0xFF0B) !== 0xFA) {
    io.write(0xFF0B, 0xFA);
    io.write(0xFF15, 0x06); io.write(0xFF16, 0x77); io.write(0xFF17, 0xF0);
    P.flash_time_label();
  } else {
    io.write(0xFF0B, 0x92);
    io.write(0xFF15, M[T.room_colours]); io.write(0xFF16, M[T.room_colours + 1]); io.write(0xFF17, M[T.room_colours + 2]);
    if (M[T.music_on] === 0x01) P.music_tick();
  }
  N.scan += root.C16.scnkey(rd, wr, io).cycles;
};

// The TIME label of the player in play flipped in brightness (flash_time_label, $31CE).
P.flash_time_label = function () {
  const a = M[T.player] === 0 ? 0x0AF8 : 0x0B48;
  for (let x = 0; x < 5; x++) M[a + x] ^= 0x20;
};

// A frame of the tune (music_tick, $1AF7).
P.music_tick = function () {
  M[Z.tune_voices] = 0;
  M[Z.tune_frame] = (M[Z.tune_frame] + 1) & 0xFF;
  if (M[Z.tune_volume] !== 0) M[Z.tune_volume]--;
  if (M[Z.tune_frame] === 0x06) {
    M[Z.tune_frame] = 0;
    M[Z.tune_step] = (M[Z.tune_step] + 1) & 0x7F;
  }
  const x = M[Z.tune_step];
  let y = M[T.tune_voice1 + x];
  if (!(y & 0x80)) {
    if (y !== 0) {
      M[Z.tune_volume] = 0x08;
      io.write(0xFF0E, M[T.note_freq_lo + y]);
      io.write(0xFF12, (io.read(0xFF12) & 0xFC) | M[T.note_freq_hi + y]);
    }
    M[Z.tune_voices] |= 0x10;
  }
  y = M[T.tune_voice2 + x];
  if (!(y & 0x80)) {
    if (y !== 0) {
      io.write(0xFF0F, M[T.note_freq_lo + y]);
      io.write(0xFF10, M[T.note_freq_hi + y]);
    }
    M[Z.tune_voices] |= 0x20;
  }
  if ((x & 0x07) === 0) {
    M[Z.tune_voices] &= 0xDF;
    if (M[Z.tune_frame] < 0x03) M[Z.tune_voices] |= 0x40;
  }
  io.write(0xFF11, M[Z.tune_volume] | M[Z.tune_voices]);
};

// The older tune player nothing calls (old_music_tick, $317F), as it is.
P.old_music_tick = function () {
  if (M[T.old_music_flag] !== 0) return;
  M[Z.tune_frame] = (M[Z.tune_frame] + 1) & 0xFF;
  if (M[Z.tune_frame] !== 0x07) return;
  M[Z.tune_frame] = 0;
  io.write(0xFF11, 0x38);
  M[Z.tune_step] = (M[Z.tune_step] + 1) & 0xFF;
  if (M[Z.tune_step] === 0x60) M[Z.tune_step] = 0;
  const x = M[Z.tune_step];
  let y = M[0x1800 + x];
  io.write(0xFF0E, M[0x18C0 + y]);
  io.write(0xFF12, (io.read(0xFF12) & 0xFC) | M[0x18D8 + y]);
  y = M[0x1860 + x];
  io.write(0xFF0F, M[0x18C0 + y]);
  io.write(0xFF10, (io.read(0xFF10) & 0xFC) | M[0x18D8 + y]);
};
};
})(typeof window !== 'undefined' ? window : globalThis);
