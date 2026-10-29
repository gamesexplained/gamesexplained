// The sound: the game's requests to the sound driver, ported (tune_start, tune_playing, voices_stop,
// sound_off and the effects' starters, $3E00-$3F55), and the driver itself (Martin Galway's, $E000-
// $EC07, its crash at $F1FB and its pulse helpers at $3F58-$3FA2), the game's own code run on the
// kit's 6502 over the port's memory, its writes going to the SID through P.io. A music driver run
// on the kit's processor counts as a port (kit/skills/core/70-minisite, "The sound"); the page
// carries the driver's bytes for it, as the How it works page's player does. The driver's three
// note readers run in the main program (frame_wait) and its three effect players in the interrupt
// (irq_player), and effects are started from both: the core reads every byte in IRQ_BYTES through
// P.irqByte, as the port's own code does where the interrupt can change a byte under it.
(function (root) {
'use strict';
const G = root.GBGroups = root.GBGroups || {};
G.sound = function (P) {
  const M = P.M, io = P.io, N = root.GBNames;
  const { tune_table, v1_pattern, voice_offsets, v1_transpose, v1_freq_fx_set, v1_pulse_fx_set, v1_pulse_width,
    v1_duration, v1_playing, v2_playing, v3_playing, v1_free, v2_free, v3_free, v1_stack, v1_sound_time,
    v2_sound_time, v3_sound_time, bark_voice, bark_voices } = N;
  let cpu = null;
  const core = () => {
    if (cpu) return cpu;
    const { CPU } = root.C64Cpu || require('../../../../../kit/cpu/cpu6502.js');
    const B = new Uint8Array(65536);
    for (const a of P.IRQ_SET) B[a] = 1;
    class SoundCPU extends CPU {
      rd(a) { return B[a] && this.rk[a >>> 8] === this.rk[2] ? P.irqByte(a) : super.rd(a); }
      rdz(a) { return B[a] ? P.irqByte(a) : super.rdz(a); }
    }
    cpu = new SoundCPU(M, { port: { dir: 0x2F, data: M[1] }, io: { read: a => io.read(a), write: (a, v) => io.write(a, v) } });
    return cpu;
  };
  // A routine of the driver, run on the core; its cycles counted for the page's clock (P.NI.sound
  // from the interrupt, P.N.sound from the main program).
  const run = (address, r) => {
    const c = core();
    c.portWrite(0, 0x2F); c.portWrite(1, M[1]);
    const regs = { d: 0 };
    for (const k of ['a', 'x', 'y', 'c']) if (r && r[k] !== undefined) regs[k] = r[k];
    const start = c.cycles;
    c.call(address, regs, { maxSteps: 100000 });
    P.count('sound', c.cycles - start);
    return { a: c.a, x: c.x, y: c.y };
  };
  // The three note readers ($E103, $E4B0, $E85C), from frame_wait.
  P.v1_tick = r => run(0xE103, r);
  P.v2_tick = r => run(0xE4B0, r);
  P.v3_tick = r => run(0xE85C, r);
  // The three effect players ($E357, $E704, $EAB0), from irq_player.
  P.v1_effects = r => run(0xE357, r);
  P.v2_effects = r => run(0xE704, r);
  P.v3_effects = r => run(0xEAB0, r);
  // sfx_voice1 ($E000) and sfx_start ($E002): the 31-byte effect at A (low), Y (high) on voice 0
  // or voice X.
  P.sfx_voice1 = r => run(0xE000, r);
  P.sfx_start = r => run(0xE002, r);

  // tune_start ($3E00): tune Y, the last of its six bytes in tune_table, the three voices' pattern
  // addresses; each voice's transpose, effects and pulse width cleared, the pulse width's high byte
  // 8, its duration 1, playing and free, its stack empty (7).
  P.tune_start = function (r) {
    let y = r.y;
    for (let x = 5; x >= 0; x--) { M[v1_pattern + x] = M[tune_table + y]; y = (y - 1) & 255; }
    for (let x = 2; x >= 0; x--) {
      const o = M[voice_offsets + x];
      M[v1_transpose + x] = 0;
      M[v1_freq_fx_set + o] = 0; M[v1_pulse_fx_set + o] = 0; M[v1_pulse_width + o] = 0;
      M[v1_duration + x] = 1; M[v1_playing + x] = 1; M[v1_free + x] = 1;
      M[v1_stack + x] = 7;
      M[v1_pulse_width + 1 + o] = 8;
    }
    return { a: 8, x: 0xFF, y: M[voice_offsets] };
  };
  // tune_playing ($3E32): z clear while a voice's tune plays or a voice still sounds.
  P.tune_playing = function () {
    const a = P.irqByte(v1_playing) | P.irqByte(v2_playing) | P.irqByte(v3_playing) |
      P.irqByte(v1_sound_time) | P.irqByte(v2_sound_time) | P.irqByte(v3_sound_time);
    return { a, z: a === 0 };
  };
  // voices_stop ($3E42): every tune and sound ended, every voice free for the music ($FF).
  P.voices_stop = function () {
    M[v1_playing] = M[v2_playing] = M[v3_playing] = 0;
    M[v1_sound_time] = M[v2_sound_time] = M[v3_sound_time] = 0;
    M[v1_free] = M[v2_free] = M[v3_free] = 0xFF;
    return { x: 0xFF };
  };
  // sound_off ($3E5B): voices_stop, and each of the SID's 21 voice registers written 8 and then 0.
  P.sound_off = function () {
    P.voices_stop();
    for (let x = 0x14; x >= 0; x--) { io.sidWrite(x, 8); io.sidWrite(x, 0); }
    return { a: 0, x: 0xFF };
  };
  // voice1_tune_off ($3EDF)
  P.voice1_tune_off = function () { M[v1_playing] = 0; return { a: 0 }; };
  const sfx = (lo, hi, x) => (x === 0 ? P.sfx_voice1({ a: lo, y: hi }) : P.sfx_start({ a: lo, y: hi, x }));
  // The effects, each its effect bytes on its voices.
  P.sfx_flame = () => { sfx(0x6B, 0xEE, 1); return sfx(0x8A, 0xEE, 2); };
  // sfx_bark ($3ECE): the next voice in turn, from bark_voices.
  P.sfx_bark = function () {
    const x = M[bark_voices + M[bark_voice]];
    M[bark_voice] = x;
    return sfx(0x4C, 0xEE, x);
  };
  P.sfx_jet = () => { sfx(0x25, 0xEF, 1); return sfx(0x06, 0xEF, 0); };
  P.sfx_hit = () => sfx(0x44, 0xEF, 1);
  P.sfx_gun = () => { sfx(0x82, 0xEF, 1); return sfx(0x63, 0xEF, 0); };
  P.sfx_explode = () => { sfx(0xA9, 0xEE, 0); sfx(0xC8, 0xEE, 1); return sfx(0xE7, 0xEE, 2); };
  P.sfx_pickup = () => { sfx(0xA1, 0xEF, 0); sfx(0xC0, 0xEF, 1); return sfx(0xDF, 0xEF, 2); };
  P.sfx_bazooka = () => { sfx(0xFE, 0xEF, 0); sfx(0x1D, 0xF0, 1); return sfx(0x3C, 0xF0, 2); };
};
})(typeof window !== 'undefined' ? window : globalThis);
