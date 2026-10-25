// Tal's controls, from the interrupt: every seventh frame the joystick, on foot (foot_control) or
// in the armour (suit_control), turns into his animations, his direction (slot_dir) and the suit's
// speeds.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.tal = function (P) {
  const M = P.M, R = P.irqByte, io = P.io;
  const w = a => M[a] | M[a + 1] << 8;
  const at = (zp, y) => (w(zp) + y) & 0xFFFF;
  const dec = a => (M[a] = (R(a) - 1) & 255);
  const inc = a => (M[a] = (R(a) + 1) & 255);
  // Tal's two sprites take animation a and the one after it, from their start
  const tal = a => { M[0x0260] = a; M[0x0261] = a + 1; return P.start_tal_anim(); };
  // his direction (both sprites')
  const dir = d => { M[0x02C8] = d; M[0x02C9] = d; };
  const stick = () => { const s = (io.ciaRead(0x00) ^ 0x1F) & 0x1F; M[0x64] = s; return s; };

  // tal_control ($9076): every seventh call, unless Tal is dissolving, materialising or in the
  // air, or the title or the ending is on.
  P.tal_control = function () {
    if (R(0x66)) { dec(0x66); return {}; }
    if ((R(0x0290) | R(0x02A8) | R(0x6D) | R(0xB0) | R(0xB1)) & 0x80) return {};
    if (R(0x7B) & 0x80) P.suit_control(); else P.foot_control();
    M[0x66] = 7;
    dec(0x66);
    return {};
  };
  // foot_control ($909C): the stick on foot; left and right kept as his direction, the rest each
  // a turn of his animation; fire as well as left or right; then foot_hold_still.
  P.foot_control = function () {
    const s = stick();
    dir(s & 0x0C);
    if (!R(0x64)) P.foot_stop();
    else if (R(0x64) & 0x01) P.foot_up();
    else if (R(0x64) & 0x02) P.foot_down();
    else {
      if (R(0x64) & 0x04) P.foot_left();
      else if (R(0x64) & 0x08) P.foot_right();
      if (R(0x64) & 0x10) P.foot_fire();
    }
    return P.foot_hold_still();
  };
  const turn = (table, a) => (a in table ? tal(table[a]) : {});
  // foot_stop ($90F1): walking stops, crouching ends.
  const STOP = { 0x80: 0x84, 0x82: 0x86, 0x9E: 0x8E, 0xA0: 0x90 };
  P.foot_stop = () => turn(STOP, R(0x0260));
  // foot_up ($9139): standing, a jump straight up; walking stops, crouching ends.
  const UP = { 0x9E: 0x8E, 0xA0: 0x90, 0x80: 0x84, 0x82: 0x86 };
  P.foot_up = function () {
    const a = R(0x0260);
    if (a === 0x84 || a === 0x86) {
      M[0x0260] = a === 0x84 ? 0x92 : 0x98; M[0x0261] = a === 0x84 ? 0x93 : 0x99;
      M[0x02C8] = 1;
      return P.start_jump();
    }
    return turn(UP, a);
  };
  // foot_down ($91AD): standing, he crouches; walking stops.
  const DOWN = { 0x84: 0x8A, 0x86: 0x8C, 0x80: 0x84, 0x82: 0x86 };
  P.foot_down = () => turn(DOWN, R(0x0260));
  // foot_left ($91F5) and foot_right ($925F): a view at a time towards that side, then walking.
  const LEFT = { 0x84: 0x80, 0x88: 0x84, 0x86: 0x88, 0x82: 0x86, 0x9E: 0x8E, 0xA0: 0x90 };
  const RIGHT = { 0x86: 0x82, 0x88: 0x86, 0x84: 0x88, 0x80: 0x84, 0xA0: 0x90, 0x9E: 0x8E };
  P.foot_left = () => turn(LEFT, R(0x0260));
  P.foot_right = () => turn(RIGHT, R(0x0260));
  // foot_fire ($92C9): walking, a jump that way; standing, a stone thrown when sprite 2 is free;
  // crouching ends; after the last life, once the wait is over, a new game.
  P.foot_fire = function () {
    const a = R(0x0260);
    if (a === 0x80 || a === 0x82) {
      M[0x0260] = a === 0x80 ? 0x92 : 0x98; M[0x0261] = a === 0x80 ? 0x93 : 0x99;
      return P.start_jump();
    }
    if (a === 0x84 || a === 0x86) {
      if (R(0x0262) & 0x80) return {};
      const t = a === 0x84 ? 0xA2 : 0xA4;
      M[0x0260] = t; M[0x0261] = t + 1;
      M[0x7C] = t + 1;
      return P.start_tal_anim();
    }
    if (a === 0x9E) return tal(0x8E);
    if (a === 0xA0) return tal(0x90);
    if (!(R(0x7E) & 0x80) || R(0x68)) return {};
    return P.restart_game();
  };
  // start_jump ($934E): up added to his direction, the jump's 20 frames, in the air.
  P.start_jump = function () {
    dir(R(0x02C8) | 0x01);
    M[0x6C] = 0x14;
    M[0x6D] = 0x80;
    return P.start_tal_anim();
  };
  // foot_hold_still ($9364): left and right dropped from his direction unless he walks or jumps.
  P.foot_hold_still = function () {
    const a = R(0x0260);
    if (a === 0x80 || a === 0x82 || a === 0x92 || a === 0x98) return {};
    dir(R(0x02C8) & 0x03);
    return {};
  };
  // start_tal_anim ($9894): both of Tal's sprites' animations from their start.
  P.start_tal_anim = function () {
    M[0x0268] = 0; M[0x0269] = 0;
    M[0x0270] = 2; M[0x0271] = 2;
    return { a: 2 };
  };

  // suit_control ($9383): the stick in the armour: centred, the suit coasts; up and down give its
  // vertical speed, left and right its view and horizontal speed; fire; then, flying, its speeds
  // into both sprites' steps and its drift.
  P.suit_control = function () {
    const s = stick();
    if (!(s & 0x0F)) P.suit_coast();
    else {
      P.suit_vertical();
      if (R(0x64) & 0x01) P.suit_up();
      if (R(0x64) & 0x02) P.suit_down();
      if (R(0x64) & 0x04) { P.suit_left(); P.suit_speed_left(); }
      if (R(0x64) & 0x08) { P.suit_right(); P.suit_speed_right(); }
    }
    if (R(0x64) & 0x10) P.suit_fire();
    if (!(R(0x7B) & 0x80)) return {};
    M[0x02F0] = R(0x80); M[0x02F1] = R(0x80);
    M[0x02F8] = R(0x81); M[0x02F9] = R(0x81);
    return P.suit_drift();
  };
  // suit_coast ($93E4): the suit slowing, a step a call, vertically and horizontally, with the
  // slow hum; stopped and facing three-quarters ($AE, $B4) the hum turns slow.
  P.suit_coast = function () {
    if ((R(0x02C8) & 0x03) && R(0x81)) {
      dec(0x81);
      if (!M[0x81]) P.suit_sound_slow();
    }
    if ((R(0x02C8) & 0x0C) && R(0x80)) {
      dec(0x80);
      return P.suit_sound_slow();
    }
    const a = R(0x0260);
    if (a !== 0xAE && a !== 0xB4) return {};
    if (R(0x0355) !== 0x8A) return {};
    return P.suit_sound_slow();
  };
  // suit_up ($941D): on the ground ($B2), with the Gravity Displacer ($0680 bit 7) the suit takes
  // off, facing the player; without it, no climbing and message $85.
  P.suit_up = function () {
    if (R(0x0260) !== 0xB2) return {};
    if (!(R(0x0680) & 0x80)) {
      dir(R(0x02C8) & 0x0C);
      return P.queue_message({ a: 0x85 });
    }
    M[0x0260] = 0xB0; M[0x0261] = 0xB1;
    M[0x80] = 0; M[0x81] = 0; M[0x82] = 0; M[0x8E] = 0;
    return P.start_tal_anim();
  };
  // suit_down ($9451): on the ground, no going down.
  P.suit_down = function () {
    if (R(0x0260) !== 0xB2) return {};
    dir(R(0x02C8) & 0x0C);
    return {};
  };
  // suit_left ($9465) and suit_right ($94D9): stopped horizontally, a view at a time towards that
  // side, then flying that way; on the ground, Tal climbs out.
  const SUIT_LEFT = { 0xAE: [0xAC, 1], 0xB0: [0xAE, 1], 0xB4: [0xB0, 0], 0xB6: [0xB4, 0] };
  const SUIT_RIGHT = { 0xB4: [0xB6, 1], 0xB0: [0xB4, 1], 0xAE: [0xB0, 0], 0xAC: [0xAE, 0] };
  function suitTurn(table, facing, way) {
    if (R(0x80)) return {};
    const a = R(0x0260);
    if (a in table) {
      const [t, fast] = table[a];
      M[0x0260] = t; M[0x0261] = t + 1;
      if (fast) P.suit_sound_fast(); else P.suit_sound_slow();
      return P.start_tal_anim();
    }
    if (a === 0xB2) return P.leave_armour();
    if (a === facing) { dir((R(0x02C8) & 0x03) | way); return P.suit_sound_fast(); }
    return {};
  }
  P.suit_left = () => suitTurn(SUIT_LEFT, 0xAC, 0x04);
  P.suit_right = () => suitTurn(SUIT_RIGHT, 0xB6, 0x08);
  // suit_sound_fast ($954D) and suit_sound_slow ($955A): the hum on voice 1, tracks $8A and $8B.
  P.suit_sound_fast = function () { if (R(0x0355) !== 0x8A) M[0x035E] = 0x8A; return {}; };
  P.suit_sound_slow = function () { if (R(0x0355) !== 0x8B) M[0x035E] = 0x8B; return {}; };
  // suit_vertical ($9567): with no vertical speed the stick's up and down as the suit's vertical
  // direction; then its speed that way.
  P.suit_vertical = function () {
    if (!R(0x81)) {
      M[0x02C8] = R(0x02C8) & 0x0C;
      dir((R(0x64) & 0x03) | R(0x02C8));
    }
    if (R(0x02C8) & 0x01) P.suit_accel_up();
    if (R(0x02C8) & 0x02) P.suit_accel_down();
    return {};
  };
  // suit_accel_up ($9595) and suit_accel_down ($95B6): the stick the other way brakes; otherwise,
  // with the Gravity Displacer, faster, up to 2.
  function accel(back) {
    if (R(0x64) & back) {
      if (!R(0x81)) return {};
      dec(0x81);
      return P.suit_sound_slow();
    }
    if (R(0x81) >= 2 || !(R(0x0680) & 0x80)) return {};
    inc(0x81);
    return P.suit_sound_fast();
  }
  P.suit_accel_up = () => accel(0x02);
  P.suit_accel_down = () => accel(0x01);
  // suit_speed_left ($95D7) and suit_speed_right ($95FA): facing that way, faster up to 3 unless
  // still moving the other way; facing the other way, it brakes.
  function speed(facing, other, back) {
    const a = R(0x0260);
    if (a !== facing && a !== other) return {};
    if (a === facing && !(R(0x02C8) & back)) {
      if (R(0x80) < 3) inc(0x80);
      return {};
    }
    if (R(0x80)) dec(0x80);
    return {};
  }
  P.suit_speed_left = () => speed(0xAC, 0xB6, 0x08);
  P.suit_speed_right = () => speed(0xB6, 0xAC, 0x04);
  // leave_armour ($961D): Tal climbs out, where the suit stands, unless the room is in the top of
  // the world (message $87): the armour's room and place kept, Tal's sprites (3 and 4) and the
  // suit's materialising ($88, $89), with the sound.
  P.leave_armour = function () {
    if (R(0x5B) < 0x0A) return P.queue_message({ a: 0x87 });
    if (R(0x0260) !== 0xB2 || R(0x0261) !== 0xB3) return {};
    if ((R(0x0290) | R(0x02A8)) & 0x80) return {};
    if (R(0x93)) return {};
    M[0x77] = R(0x5B);
    const x0 = R(0x0200); M[0x0206] = x0; M[0x0208] = x0; M[0x78] = x0;
    const y0 = R(0x0201); M[0x0207] = y0; M[0x79] = y0;
    M[0x0209] = R(0x0203);
    const h = R(0x0210);
    M[0x7A] = h;
    M[0x0210] = h & 0xE7;
    if (h & 0x01) M[0x0210] = R(0x0210) | 0x18;
    M[0x0263] = 0xC0; M[0x0264] = 0xC1;
    M[0x026B] = 0; M[0x026C] = 0;
    M[0x02B0] = 0; M[0x02B1] = 0; M[0x02B8] = 0; M[0x02B9] = 0;
    M[0x0273] = 2; M[0x0274] = 2;
    M[0x7B] = 2;
    M[0x02F0] = 2; M[0x02F1] = 2;
    io.vicWrite(0x25, 0x08);
    io.vicWrite(0x26, 0x09);
    M[0x0215] = R(0x0215) & 0xFC;
    M[0x02A8] = 0x88; M[0x02A9] = 0x89;
    M[0x035E] = 0x96; M[0x035F] = 0x97;
    return P.start_tal_anim();
  };
  // suit_fire ($96CC): when sprite 2 is free, its X high bit made Tal's; facing left or right the
  // Pulsar Beam (if fitted, $067E bit 7; otherwise message $86) leaves the suit's side on path $82,
  // its direction written into the path's first step.
  P.suit_fire = function () {
    const x = 2;
    if (R(0x0260 + x) & 0x80) return { x };
    let h = R(0x0210) & 0xFB;
    M[0x0210] = h;
    M[0x0210] = (((h << 2) & 0x04) | R(0x0210)) & 255;
    const a = R(0x0260);
    if (a !== 0xAC && a !== 0xB6) return { x };
    if (!(R(0x067E) & 0x80)) return Object.assign({ x }, P.queue_message({ a: 0x86 }));
    if (a === 0xAC) {
      M[0x73] = 0x04;
      M[0x0260 + x] = 0xBE;
      const s = R(0x0200) - 0x18;
      M[0x0204] = s & 255;
      if (s < 0) M[0x0210] = R(0x0210) & M[0xF120 + x];
    } else {
      M[0x73] = 0x08;
      M[0x0260 + x] = 0xBF;
      const s = R(0x0200) + 0x18;
      M[0x0204] = s & 255;
      if (s > 255) M[0x0210] = R(0x0210) | M[0xF118 + x];
    }
    M[0x0205] = (R(0x0201) + 0x0B) & 255;
    M[0x02D8 + x] = 0x82;
    P.reset_slot_path({ x });
    M[0x0268 + x] = 0;
    M[0x0270 + x] = 2;
    M[0x24] = M[0xC683 + 0x04]; M[0x25] = M[0xC684 + 0x04];
    M[at(0x24, 4)] = R(0x73);
    P.play_effect({ a: 0x98 });
    return { x };
  };
  // suit_drift ($9776): flying, the suit keeps moving the way it faces unless moving the other way;
  // out of energy in the air it sinks (message $88); a power cell ($A7 bit 7) fills it; low, message $8A.
  P.suit_drift = function () {
    const a = R(0x0260);
    let d = -1;
    if (a === 0xAC) { if (!(R(0x02C8) & 0x08)) d = 0x04; }
    else if (a === 0xB6) { if (!(R(0x02C8) & 0x04)) d = 0x08; }
    else d = 0;
    if (d >= 0) { M[0x64] = d; dir((R(0x02C8) & 0x03) | d); }
    if (!R(0x4F) && R(0x0260) !== 0xB2) {
      dir(0x02);
      M[0x02F8] = 1; M[0x02F9] = 1;
      P.queue_message({ a: 0x88 });
    }
    if (R(0xA7) & 0x80) {
      M[0x4F] = 0x1F; M[0xA7] = 0x1F;
      M[0x035F] = 0x93;
    }
    const e = R(0x4F);
    if (e && e < 8) P.queue_message({ a: 0x8A });
    return {};
  };
  // play_effect ($A82E): effect A asked of voice 2, unless it plays the power centre's drone ($9B).
  P.play_effect = function (r) {
    M[0x9F] = r.a;
    if (R(0x0356) === 0x9B) return { a: 0x9B };
    const a = R(0x9F);
    M[0x035F] = a;
    return { a };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
