// Tal's deaths and his rising again, the suit's hover, and the power centre, from the interrupt.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.lives = function (P) {
  const M = P.M, R = P.irqByte, io = P.io;
  const w = a => M[a] | M[a + 1] << 8;
  const at = (zp, y) => (w(zp) + y) & 0xFFFF;
  const dec = a => (M[a] = (R(a) - 1) & 255);
  const inc = a => (M[a] = (R(a) + 1) & 255);
  const tal = a => { M[0x0260] = a; M[0x0261] = a + 1; return P.start_tal_anim(); };
  const dir = d => { M[0x02C8] = d; M[0x02C9] = d; };
  // INC on a chip's register: the read, the old value written back, then the new one
  const chipInc = a => { const v = P.rd(a); P.wr(a, v); P.wr(a, v + 1); };

  // tal_lives ($A260): unless on the title. Lying dead ($A8): his sprites side by side, the
  // effect, then while the game goes on and the wait ($90) is over his energy filled again, a
  // unit a frame, the sprites' colour stepping with it; full, the rising ($AA) and its message.
  // Rising: the sprites one over the other again, on the row. Otherwise check_death.
  P.tal_lives = function () {
    if (R(0xB0) & 0x80) return {};
    const a = R(0x0260);
    if (a === 0xA8) {
      dir(0);
      const lo = R(0x0203);
      if (lo !== R(0x0201)) {
        M[0x0201] = lo;
        M[0x035E] = 0xA1;
        M[0x90] = 0xC8;
        const s = R(0x0202) + 0x18;
        M[0x0202] = s & 255;
        if (s > 255) { const h = R(0x0210) | 0x02; M[0x0210] = h; io.vicWrite(0x10, h); }
      }
      if (R(0x7E) & 0x80) return {};
      if (R(0x90)) { dec(0x90); return {}; }
      if (R(0x51) >= 0x1F) {
        P.queue_message({ a: (R(0xAC) + 0x8B) & 255 });
        io.vicWrite(0x25, 0x08);
        return tal(0xAA);
      }
      if (R(0x0356) !== 0xA3) { M[0x035E] = 0xA3; M[0x035F] = 0xA4; M[0x0360] = 0xA5; }
      inc(0x51);
      chipInc(0xD025);
      return {};
    }
    if (a === 0xAA) {
      const lo = R(0x0203);
      if (lo !== R(0x0201)) return {};
      M[0x0201] = (lo - 0x15) & 255;
      const s = R(0x0202) - 0x18;
      M[0x0202] = s & 255;
      if (s >= 0) return {};
      M[0x0210] = R(0x0210) & 0xFD;
      const d = R(0x02C8) & 0x0C;
      dir(d);
      M[0x6D] = d;
      return P.snap_to_row();
    }
    return P.check_death();
  };
  // check_death ($A31E): no energy, on foot, on the ground and the game not over: he falls down
  // ($A6), and the fifth time the game is over (message $90).
  P.check_death = function () {
    if (R(0x0260) === 0xA6) return {};
    if ((R(0x6D) | R(0x7B) | R(0x7E)) & 0x80) return {};
    if (R(0x51)) return {};
    tal(0xA6);
    inc(0xAC);
    if (R(0xAC) < 5) return {};
    M[0x7E] = 0x90;
    P.queue_message({ a: 0x90 });
    M[0x68] = 0xC8;
    return {};
  };
  // suit_hover ($97E7): in the suit off the ground with no vertical step, every ninth call both
  // sprites a pixel up or down by the four-step hover_pattern ($FC4C).
  P.suit_hover = function () {
    if (R(0xB0) & 0x80) return {};
    if (R(0x8E)) { dec(0x8E); return {}; }
    if (!(R(0x7B) & 0x80)) return {};
    if (R(0x0260) === 0xB2) return {};
    if (R(0x02F8)) return {};
    const x = R(0x82) & 0x03;
    M[0x82] = x;
    if (M[0xFC4C + x] & 0x01) { inc(0x0201); inc(0x0203); }
    else { dec(0x0201); dec(0x0203); }
    M[0x8E] = 9;
    inc(0x82);
    dec(0x8E);
    return { x };
  };
  // power_centre ($9825): in room 0, its seven lights' colour RAM stepped through colours 1 to 7;
  // then check_detonation.
  const LIGHTS = [0xD8DA, 0xD8DB, 0xD8DC, 0xD9F2, 0xD9F3, 0xD9F4];
  P.power_centre = function () {
    if (R(0xB0) & 0x80) return {};
    if (R(0x5B)) return {};
    let a;
    do { chipInc(0xD863); a = P.rd(0xD863) & 0x07; } while (!a);
    P.wr(0xD863, a);
    for (const c of LIGHTS) P.wr(c, a);
    return P.check_detonation();
  };
  // check_detonation ($9850): the suit landed and the game not yet won: the character below and
  // right of Tal one of the three detonator_chars ($CE30), with the Antiriad's last part fitted
  // ($0681 bit 7), the countdown starts (message $93).
  P.check_detonation = function () {
    if (R(0x0260) !== 0xB2) return {};
    if (R(0xB1) & 0x80) return {};
    M[0x85] = 0x32;
    let { x, y } = P.tal_cell_from_y0();
    x = (x + 1) & 255;
    if (x >= 0x0F) x = 0x0F;
    const k = (x << 1) & 255;
    M[0x22] = M[0xF128 + k]; M[0x23] = M[0xF129 + k];
    y = (y + 1) & 255;
    const c = M[at(0x22, y)];
    for (let j = 2; j >= 0; j--) {
      if (c !== M[0xCE30 + j]) continue;
      const v = R(0x0681);
      if (!(v & 0x80)) return { y };
      M[0xB1] = v;
      M[0x69] = 0x32;
      return P.queue_message({ a: 0x93 });
    }
    return { y };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
