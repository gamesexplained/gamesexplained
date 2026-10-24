// The interrupt ($549B-$66A8), at raster line $F8 every frame: the cursor moved by the input
// routine chosen on the control menu, the music driver's frame, then one of the fifty people's
// lives (the strength and agility bars, a team member's stamina and strength, a lock picked, a move
// finished, a fight, an enemy's patrol), a row of the clock's digits rolled, the ticker moved on,
// a figure of the view brought up to date, and the people's reachable locations. Once round the
// fifty (a second), the destruct count and the clock.
(function (root) {
'use strict';
const G = root.SFGroups = root.SFGroups || {};
G.irq = function (P) {
  const M = P.M, io = P.io;
  const w = a => M[a] | M[a + 1] << 8;
  const setw = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
  const inc16 = (zp, n) => setw(zp, w(zp) + n);
  // ($45), the record of the person whose turn it is; irq_entity ($66D1), their number
  const R = () => w(0x45), E = () => M[0x66D1];
  const rec = y => M[(w(0x45) + y) & 0xFFFF];
  const setRec = (y, v) => { M[(w(0x45) + y) & 0xFFFF] = v & 255; };
  const record = n => { const y = (n << 1) & 255; return n & 0x80 ? w(0xB2E4 + y) : w(0xB1E4 + y); };
  const say = (lo, hi) => P.queue_message({ a: M[lo], y: M[hi] });
  // a read-modify-write of a video chip register writes the old value, then the new
  const vicRmw = (r, f) => { const v = io.vicRead(r); io.vicWrite(r, v); io.vicWrite(r, f(v) & 255); };
  // sprite 0's X, twice A (the cursor's column, or a light pen's or paddle's reading), the ninth
  // bit in $D010
  const cursorX = a => {
    io.vicWrite(0x00, (a << 1) & 255);
    if (a & 0x80) io.vicWrite(0x10, 1 | io.vicRead(0x10)); else io.vicWrite(0x10, 0xFE & io.vicRead(0x10));
  };

  // The bytes the handler pushes as it starts and pulls before it returns: the drawing's pointers
  // and counters, which its own drawing uses too.
  const SAVED = [0x49F0, 0x7A, 0x4A0F, 0x3B, 0x3C, 0x48A8, 0x48AB, 0x31, 0x32, 0x2B, 0x2C, 0x2D, 0x2E,
    0x2F, 0x30, 0x49F1, 0x49F2, 0x7B, 0x7C, 0x7D, 0xF9, 0xFA, 0xF7, 0xF8];
  // irq ($549B): through the input routine whose address the control menu put at $54EF
  const INPUTS = { 0x54F1: 'input_lightpen', 0x5526: 'input_paddles', 0x5570: 'input_demo',
    0x562C: 'input_joystick', 0x5630: 'input_keyboard' };
  // The main program's counts of work (P.N) are kept out of the interrupt's: the interrupt's own go
  // in P.NI, for the page's clock.
  P.irq = function () {
    const kept = SAVED.map(a => M[a]), n = Object.assign({}, P.N);
    for (const k in P.N) P.N[k] = 0;
    const input = INPUTS[w(0x54EF)];
    if (!input) throw new Error('the interrupt\'s input routine is at $' + w(0x54EF).toString(16) + ', which the port does not know');
    P[input]({});
    P.irq_game({});
    P.irq_exit(kept);
    P.NI = Object.assign({}, P.N);
    Object.assign(P.N, n);
  };
  // irq_exit ($637E): the bytes put back and the raster interrupt acknowledged
  P.irq_exit = function (kept) {
    SAVED.forEach((a, i) => { M[a] = kept[i]; });
    io.vicWrite(0x19, 1);
  };

  // ---- the input routines, each moving the cursor (sprite 0, its column at $68E5 in pairs of
  // pixels) and clearing fire_flag ($78) for the fire button
  P.input_lightpen = function () {
    const a = (io.vicRead(0x13) - 0x11) & 255;
    cursorX(a);
    io.vicWrite(0x01, (io.vicRead(0x14) - 7) & 255);
    if (io.ciaRead(0x01) ^ 0xFF) M[0x78] = 0;
    return P.clamp_cursor({});
  };
  P.input_paddles = function () {
    io.vicWrite(0x01, ((io.sidRead(0x19) >> 1) + 0x64) & 255);
    cursorX(io.sidRead(0x1A));
    const k = io.ciaRead(0x01);
    io.ciaWrite(0x02, M[0x66D3]);
    if (!(k & 2)) M[0x78] = 0;
    return P.clamp_cursor({});
  };
  // clamp_cursor_y ($555E): A kept to lines $9A-$E6 for sprite 0's Y; it runs on into input_demo
  P.clamp_cursor_y = function (r) {
    let a = r.a & 255;
    if (a < 0x9A) a = 0x9A; else if (a >= 0xE6) a = 0xE6;
    io.vicWrite(0x01, a);
    return P.input_demo({});
  };
  // input_demo ($5570): the cursor steered a step at a time to the script's next point ($1571, two
  // bytes each), where it waits 120 frames and fires; every fourth point the ticker says it is a
  // demonstration. A key or the fire button, or the script's end, asks to leave ($6932).
  P.input_demo = function () {
    let x = -1;
    if (io.ciaRead(0x01) ^ 0xFF) {
      M[0x6932] = 1; M[0x6933] = 0; M[0x6931] = 0x6E; x = 0x6C;
    } else if (M[0x6933]) {
      M[0x78] = 0;
    } else if (M[0x692F] === io.vicRead(0x01) && M[0x692E] === M[0x68E5]) {
      if (--M[0x6930] & 255) {
        // waiting at the point
      } else {
        M[0x6930] = 0x78; M[0x6933] = 0x78;
        x = M[0x6931];
        M[0x6931] += 2;
        if (!(x & 7)) { say(0x8163, 0x8164); x = (M[0x6931] - 2) & 255; }
      }
    } else {
      const dy = M[0x692F], sy = io.vicRead(0x01);
      if (dy !== sy) vicRmw(0x01, v => (dy < sy ? v - 1 : v + 1));
      const dx = M[0x692E];
      if (dx !== M[0x68E5]) M[0x68E5] = dx < M[0x68E5] ? M[0x68E5] - 1 : M[0x68E5] + 1;
    }
    if (x >= 0) {
      M[0x692E] = M[0x1571 + x]; M[0x692F] = M[0x1572 + x];
      if (M[0x692F] === 0xFF) M[0x6932] = 1;
    }
    cursorX(M[0x68E5]);
    return {};
  };
  // input_joystick ($562C) and input_keyboard ($5630): CIA 1's port B, the joystick in port 1 or
  // the keys that share its lines, with masks for up, down, left, right and fire from $6825 (two
  // sets); a direction held speeds the cursor up from 2 to 6, a step every 10 frames (the first up
  // or down after 20), and the cursor wraps round the screen's edges.
  P.input_joystick = () => input(0);
  P.input_keyboard = () => input(1);
  function input(x) {
    const k = (io.ciaRead(0x01) ^ 0xFF) & 255;
    M[0x66D3] = k;
    if (!(k & M[0x6825 + x])) {
      M[0x68E2] = 2; M[0x68E4] = 0x14;
    } else {
      if (!(--M[0x68E4] & 255)) {
        M[0x68E4] = 0x0A;
        if (M[0x68E2] !== 6) M[0x68E2]++;
      }
      if (!(k & M[0x6825 + x] & M[0x6829 + x])) {
        const v = (io.vicRead(0x01) - M[0x68E2]) & 255;
        io.vicWrite(0x01, v);
        if (v < 0x9A) io.vicWrite(0x01, 0xF9);
      } else {
        const v = (io.vicRead(0x01) + M[0x68E2]) & 255;
        io.vicWrite(0x01, v);
        if (v >= 0xF9) io.vicWrite(0x01, 0x9A);
      }
    }
    if (!(k & M[0x6827 + x])) {
      M[0x68E1] = 2; M[0x68E3] = 0x0A;
    } else {
      if (!(--M[0x68E3] & 255)) {
        M[0x68E3] = 0x0A;
        if (M[0x68E1] !== 6) M[0x68E1]++;
      }
      if (!(k & M[0x6827 + x] & M[0x682B + x])) {
        M[0x68E5] = (M[0x68E5] - M[0x68E1]) & 255;
        // the left edge is the byte at $0F, which is 15 while the game runs
        if (M[0x68E5] < M[0x0F]) M[0x68E5] = 0xA0;
      } else {
        M[0x68E5] = (M[0x68E5] + M[0x68E1]) & 255;
        if (M[0x68E5] >= 0xA0) M[0x68E5] = 0x0F;
      }
    }
    cursorX(M[0x68E5]);
    if (k & M[0x682D + x]) M[0x78] = 0;
    return {};
  }
  // clamp_cursor ($571C): sprite 0 kept to lines $9A-$E6 and to X $18-$140
  P.clamp_cursor = function () {
    const y = io.vicRead(0x01);
    if (y < 0x9A) io.vicWrite(0x01, 0x9A); else if (y >= 0xE6) io.vicWrite(0x01, 0xE6);
    if (!(io.vicRead(0x10) & 1)) { if (io.vicRead(0x00) < 0x18) io.vicWrite(0x00, 0x18); }
    else if (io.vicRead(0x00) >= 0x40) io.vicWrite(0x00, 0x40);
    return {};
  };

  // ---- irq_game ($5754)
  P.irq_game = function () {
    P.play_music({});
    let at = 0x5F79;
    if (M[0x68B0]) at = 0x5FEF;
    else {
      if (M[0x66CC]) bars();
      if (person()) at = 0x60CF;
    }
    if (at === 0x5F79) {
      if (M[0xCF83]) at = 0x60CF;
      else { rollClock(); at = 0x5FEF; }
    }
    if (at === 0x5FEF && !(E() & 3)) ticker();
    view();
    // j_6197: the person's reachable locations, and on to the next person
    P.list_reachable({});
    M[0x66D1]++;
    inc16(0x45, 0x12);
    if (M[0x66D1] !== 0x32) return {};
    M[0x66D1] = 0;
    setw(0x45, w(0xCA08));
    if (M[0x68B0]) return {};
    if (M[0xCF83]) { M[0xCF83]--; return {}; }
    destruct();
    return clock();
  };

  // the bars of the status screen ($5769): strength, agility, stamina, the weight carried (alone
  // while bars_weight_only, $66CD) and the weight that can be carried, each a pixel longer or
  // shorter a frame, towards half its value, nothing for the dead
  function bars() {
    const cr = w(0x41);
    M[0x7B] = M[cr + 5];
    M[0x66CB] = ((M[0xCFB7 + M[0x5436]] + M[0x7B]) >> 1) & 255;
    M[0x66CA] = P.multiply({ a: M[0xCF85 + M[0x5436]], y: M[cr + 4] }).y;
    for (let x = M[0x66CD] ? 3 : 0; x !== 5; x++) {
      let t;
      if (x === 0) t = M[0x66CA];
      else if (x === 1) t = M[0x66CB];
      else if (x === 2) t = M[cr + 6];
      else if (x === 3) t = M[cr + 7];
      else t = M[cr + 7] < M[0x66CA] ? M[cr + 7] : M[0x66CA];
      M[0x66D3] = t;
      if (M[cr] & 2) M[0x66D3] = 0;
      const half = M[0x66D3] >> 1;
      if (half === M[0x66BE + x]) continue;
      M[0x2B] = M[0x66AA + x]; M[0x2C] = M[0x66AF + x];
      M[0x2D] = M[0x66B4 + x]; M[0x2E] = M[0x66B9 + x];
      if (half >= M[0x66BE + x]) {
        const a = M[0x66C3 + x];
        M[0x66BE + x]++;
        P.bar_step({ a, x });
      } else {
        P.bar_step({ a: x === 4 && M[0x66BE + x] < M[0x66BD + x] ? 1 : 0, x });
        M[0x66BE + x]--;
      }
    }
  }
  // bar_step ($6495): the pixel at the end of bar X set to colour A, down the eight lines of its
  // cell at ($2B) and of the cell at ($2D)
  P.bar_step = function (r) {
    const x = r.x & 255;
    M[0x66C9] = r.a & 255;
    M[0x66C8] = (M[0x66BE + x] >> 1) & 3;
    M[0x66D3] = x;
    let y = M[0x66BE + x] & 0xF8;
    const px = M[0x66C8];
    M[0x7B] = M[0x45DA + px] & M[(w(0x2B) + y) & 0xFFFF];
    const v = (M[0x45DE + px] & M[0x45D6 + M[0x66C9]]) | M[0x7B];
    for (let k = 8; k; k--) {
      M[(w(0x2B) + y) & 0xFFFF] = v; M[(w(0x2D) + y) & 0xFFFF] = v;
      y = (y + 1) & 255;
    }
    return { a: v, x, y };
  };

  // the person's turn ($5841); true when the time delay holds everyone else still
  function person() {
    const e = E();
    if (M[0xCF83] && e !== M[0xCF84]) return true;
    if (rec(0) & 2) return false;
    if (e < 6) teamMember(e);
    else if (e >= 8 && e < 0x26 && !(rec(0) & 0x0C)) {
      // a guard (8-37) at peace: one of the team in a location it can reach, and it fights
      for (let y = 0x0A; ; ) {
        const l = rec(y);
        if (l === 0xFF) break;
        M[0x66D4] = y;
        if (P.team_member_at({ a: l }).c) { setRec(0, 8); return false; }
        y = (M[0x66D4] + 1) & 255;
      }
    }
    // j_5A08: a door being opened with the tool kit, eight off its lock a turn
    if (rec(0) & 0x10) {
      const x = M[0xCF81];
      const d = M[0xCFC9 + x] - 8;
      M[0xCFC9 + x] = d & 255;
      if (d < 0) {
        M[0xCFC9 + x] = 0;
        setRec(0, 0);
        M[0xCF82] = 1;
        say(0x7F63, 0x7F64);
        return false;
      }
    }
    if (rec(0) & 1) { moving(e); return false; }
    if (e !== 6 && e !== 7) {
      M[0x68E0] = rec(0) & 0x0C;
      if (M[0x68E0]) { fight(e); return false; }
    }
    idle(e);
    return false;
  }

  // A team member's turn ($5896): their status icon's colour, and whether it can be chosen; a
  // flash on the icon and a beep, on odd seconds, while their strength is low; strength regained
  // by stamina, slower in a fight; and agility, which goes up or down towards what their strength
  // and the weight they carry allow.
  function teamMember(e) {
    P.colour_status_icon({ a: e, y: M[0x68B7 + (rec(0) & 0x1F)] });
    let x = (P.multiply({ a: e, y: 0x0B }).a + 4) & 255;
    if (!(rec(0) & 3)) M[0x78AE + x] |= 1; else M[0x78AE + x] &= 0xFE;
    if (!(rec(4) & 0x80) && M[0xCA00] & 1) {
      M[0x1602] = 0x0F;
      M[0x66D3] = rec(4) & 0xC0 ? 0xBB : 0;
      P.colour_status_icon({ a: e, y: M[0x66D3] });
    }
    M[0x66D3] = rec(4) ^ 0xFF;
    M[0x79] = P.multiply({ a: M[0x66D3], y: rec(6) }).y;
    const f = rec(0) & 0x0C;
    if (f) { M[0x79] >>= 1; if (f !== 8) M[0x79] >>= 1; }
    const s = M[0x79] + M[0x68FC + e];
    M[0x68FC + e] = s & 255;
    if (s > 255 && rec(4) !== 0xFF) {
      setRec(4, rec(4) + 1);
      const d = M[0xCFC3 + e] - 8;
      M[0xCFC3 + e] = d & 255;
      if (d < 0) setRec(6, rec(6) - 1);
    }
    M[0x66D3] = rec(4);
    M[0x66D3] = P.multiply({ a: M[0xCF85 + e], y: M[0x66D3] }).y;
    // four bits of fraction, taken from the low nibble in the wrong order (the game's own slip)
    const nibble = a => {
      let b = 0;
      for (let k = 0; k < 4; k++) { b = ((b << 1) | (a & 1)) & 255; a >>= 1; }
      M[0x7B] = b;
      return a;
    };
    if (rec(7) >= M[0x66D3]) {
      let a = (rec(7) - M[0x66D3]) & 255;
      if (a + 4 <= 255) a += 4;
      M[0x66D3] = nibble(a);
      const d = M[0xCFBD + e] - M[0x7B];
      M[0xCFBD + e] = d & 255;
      const b = rec(5) - M[0x66D3] - (d < 0 ? 1 : 0);
      setRec(5, b < 0 ? 0 : b);
    } else {
      const a = (M[0x66D3] - rec(7)) & 255;
      M[0x66D3] = nibble(P.multiply({ a, y: rec(6) }).y);
      if (M[0x7B]) {
        const d = M[0xCFC3 + e] - 8;
        M[0xCFC3 + e] = d & 255;
        if (d < 0) setRec(6, rec(6) - 1);
      }
      const s2 = M[0xCFBD + e] + M[0x7B];
      M[0xCFBD + e] = s2 & 255;
      const t = rec(5) + M[0x66D3] + (s2 > 255 ? 1 : 0);
      setRec(5, t > 255 ? 0xFF : t);
    }
  }

  // A move under way ($5A41): a team member tires with every turn of it, and dies of it at no
  // strength; Kryxix (6) or Zoff (7) reaching the attack craft ($A3) leave the ship,
  // rescued or captured. When its time is up the person arrives; the scan's list of people (when
  // the battle screen is up, scan_on $8189) loses or gains them; a team member's arrival may start
  // the enemy's plans (the triggers); and a team member who finds Kryxix is told so, and Zark (4)
  // takes him along.
  function moving(e) {
    if (e < 6) {
      const d = M[0x68FC + e] - 0x40;
      M[0x68FC + e] = d & 255;
      if (d < 0) {
        setRec(4, rec(4) - 1);
        if (!rec(4)) { P.kill_entity({}); return; }
      }
    } else if (rec(3) === 0xA3) {
      P.kill_entity({});
      if (e === 6) { say(0x801A, 0x801B); M[0xCA05] |= 2; }
      else if (e === 7) { say(0x8065, 0x8066); M[0xCA05] |= 0x10; }
      return;
    }
    setRec(1, rec(1) - 1);
    if (rec(1)) return;
    setRec(1, 1);
    setRec(0, 0);
    if (M[0x8189]) {
      if (rec(3) === M[0x5446]) scanAdd(e);
      else if (rec(2) === M[0x5446]) scanRemove(e);
    }
    if (e < 6) {
      const loc = rec(3);
      for (let x = 5; x >= 0; x--) {
        if (loc !== M[0x68EA + x]) continue;
        M[0x5B92] = M[0x68F0 + 2 * x]; M[0x5B93] = M[0x68F1 + 2 * x];
        trigger(w(0x5B92));
        break;
      }
    }
    setRec(2, rec(3));
    if (e < 6 && !M[0xCF80] && rec(2) === M[0xCA7C] && M[0xCA7A] !== 2) {
      M[0x8098] = e | 0x80;
      say(0x80B2, 0x80B3);
      if (e === 4) { say(0x80CA, 0x80CB); M[0xCF80] = 1; }
    }
  }
  // the scan's people (the battle screen's left-hand panel, icons from $7BD5): a person leaving
  // its location taken off, one arriving put in the first free place of the eight. Both searches
  // run to a ninth place, the byte after the eight ($545F), which holds 5 and so is free only once
  // Torik (5) has been taken off it; filling it draws the arrow, at an icon reckoned from the
  // drawing's line rather than its place (the game's own slip).
  function scanRemove(e) {
    let x = 0;
    for (;;) {
      if (x === 9) return;
      const a = M[0x5457 + x]; x++;
      if (a === e) break;
    }
    x--;
    M[0x5457 + x] = 0xFF;
    const y = P.icon_offset({ x }).y;
    M[0x7BD9 + y] = 0;
    M[0x31] = M[0x8D32]; M[0x32] = M[0x8D33];
    P.drain(P.draw_picture({ x: M[0x7BD7 + y], y: M[0x7BD8 + y] }));
  }
  function scanAdd(e) {
    let x = 0;
    for (;;) {
      if (x === 9) return;
      const a = M[0x5457 + x]; x++;
      if (a === 0xFF) break;
    }
    x--;
    M[0x66D3] = x;
    M[0x5457 + x] = e;
    let y = P.icon_offset({ x }).y;
    const k = (((e << 2) & 255) + 2) & 255;
    M[0x31] = M[0x6CFE + k]; M[0x32] = M[0x6CFF + k];
    y = P.drain(P.draw_picture({ x: M[0x7BD7 + y], y: M[0x7BD8 + y] })).y;
    if (M[0x66D3] !== 8) return;
    y = (y + 0x0B) & 255;
    M[0x7BD9 + y] = 0xFD;
    M[0x31] = M[0x5480]; M[0x32] = M[0x5481];
    P.drain(P.draw_picture({ x: M[0x7BD7 + y], y: M[0x7BD8 + y] }));
  }
  // the routines a team member's arrival calls, from the table at $68F0 (through a JSR whose
  // operand the game writes, at $5B91)
  const TRIGGERS = { 0x6662: 'trigger_zoff', 0x666B: 'trigger_squad', 0x667D: 'trigger_8a',
    0x6688: 'trigger_8b', 0x6693: 'trigger_9a', 0x669E: 'trigger_9b' };
  function trigger(a) {
    const f = TRIGGERS[a];
    if (!f) throw new Error('a trigger at $' + a.toString(16) + ', which the port does not know');
    P[f]({});
  }
  // trigger_zoff ($6662): Zoff (7) sets off on his patrol; trigger_squad ($666B): the eight of
  // the squad from person 11 on; trigger_8a to trigger_9b: people 8 and 9 set off on one of two
  // patrols each
  P.trigger_zoff = function () { M[0xCA93] |= 0x80; return { a: M[0xCA93] }; };
  P.trigger_squad = function () {
    let y = 0;
    for (let x = 8; x; x--) { M[0xCADB + y] = 0x80; y = (y + 0x12) & 255; }
    return { a: y, x: 0, y };
  };
  const setOff = (a, v) => () => { M[a + 1] = v; M[a] = 0x80; return { a: 0x80 }; };
  P.trigger_8a = setOff(0xCAA5, 0x16);
  P.trigger_8b = setOff(0xCAA5, 0x17);
  P.trigger_9a = setOff(0xCAB7, 0x18);
  P.trigger_9b = setOff(0xCAB7, 0x19);

  // A fight ($5BFF), status bits 2 and 3 (defending, attacking, or attacking the destination): the
  // damage the person does, from their strength (and for the team their weapon's two nibbles, the
  // near one against their own location), dealt to everyone of the other side in a location they
  // reach, twice over at the destination of an attack; a person brought to no strength is killed,
  // and one at peace fights back. A defender or one retreating who finds no one stops fighting; an
  // attacker who finds no one at its destination defends when it is there and moves on when not.
  function fight(e) {
    M[0x68B4] = 0; M[0x68B5] = 0;
    M[0x66D3] = P.multiply({ a: M[0xCF85 + e], y: rec(4) }).y;
    if (e >= 6) {
      M[0x7D] = 0; M[0x7C] = 6;
      setw(0x2D, w(0xCA08));
      M[0x68D7] = M[0x66D3];
    } else {
      M[0x7D] = 8; M[0x7C] = 0x32;
      setw(0x2D, w(0xCA0C));
      M[0x68B6] = rec(3);
      const x = rec(8);
      M[0x68DF] = M[0xCF15 + x];
      const near = P.multiply({ a: (M[0x68DF] << 4) & 255, y: M[0x66D3] }).y;
      M[0x68D7] = P.multiply({ a: M[0xCF15 + x] & 0xF0, y: M[0x66D3] }).y;
      M[0x66D3] = near;
    }
    for (let x = 7; x; x--) M[0x68D7 + x] = M[0x66D3];
    for (;;) {
      const T = w(0x2D);
      if (!(M[T] & 2)) {
        M[0x66D3] = M[(T + 2) & 0xFFFF];
        // X indexes the damages from 0 for each target; nothing moves it on but the message
        // queue's index, which queue_message leaves in it
        let x = 0;
        for (let y = 0x0A; ; y = (y + 1) & 255) {
          const l = rec(y);
          if (l === 0xFF) break;
          if (l !== M[0x66D3]) continue;
          M[0x68B4]++;
          let d = M[0x68D7 + x], hi = 0;
          const shift = () => { hi = ((hi << 1) | (d >> 7)) & 255; d = (d << 1) & 255; };
          shift(); shift();
          if (M[0x68E0] === 0x0C && M[0x66D3] === M[0x68B6]) { M[0x68B5]++; shift(); }
          M[0x7B] = d; M[0x79] = hi;
          const dr = M[0x7D];
          const lo = M[0x68FC + dr] - d;
          M[0x68FC + dr] = lo & 255;
          const s = M[(T + 4) & 0xFFFF] - hi - (lo < 0 ? 1 : 0);
          M[(T + 4) & 0xFFFF] = s & 255;
          if (s < 0) {
            const r0 = w(0x45), e0 = M[0x66D1];
            setw(0x45, T); M[0x66D1] = M[0x7D];
            P.kill_entity({});
            M[0x66D1] = e0; setw(0x45, r0);
          }
          if (!(M[T] & 0x0E)) {
            M[T] = 8;
            if (M[0x7D] < 6) {
              const a = (M[0x7D] << 1) + M[0x8185];
              x = P.queue_message({ a: a & 255, y: (M[0x8186] + (a >> 8)) & 255 }).x;
            }
          }
        }
      }
      inc16(0x2D, 0x12);
      M[0x7D]++;
      if (M[0x7D] === M[0x7C]) break;
    }
    if (rec(0) !== 0x0C) {
      if (!M[0x68B4]) setRec(0, 0);
      return;
    }
    if (M[0x68B5]) return;
    if (rec(3) === rec(2)) { setRec(0, 8); return; }
    setRec(0, M[0x68B4] ? 5 : 1);
  }

  // A person neither moving nor fighting ($5D93): a guard (8 on) with one of the team in its own
  // location fights; Kryxix (6) follows Zark (4) once Zark has found him; one on patrol (record
  // byte 7 bit 7) takes the next step of its patrol when its wait is over. A patrol script ($BDC0,
  // byte 0 its length) is pairs of a wait and a location, walked forwards then back; at either end
  // a person in a chain of patrols ($BF54) goes on to the next, Zoff at the far end of his escapes,
  // and the rest turn round.
  function idle(e) {
    if (e < 6 || rec(0) & 0x0C) return;
    if (e >= 8 && P.team_member_at({ a: rec(2) }).c) { setRec(0, 8); return; }
    if (e === 6 && M[0xCF80] && M[0xCA58] !== M[0xCA7C]) {
      setRec(3, M[0xCA58]); setRec(1, 1); setRec(0, 1);
      return;
    }
    if (!(rec(7) & 0x80)) return;
    setRec(1, rec(1) - 1);
    if (rec(1)) return;
    for (;;) {
      const k = (rec(8) << 1) & 255;
      M[0x47] = M[0xBDC0 + k]; M[0x48] = M[0xBDC1 + k];
      const script = y => M[(w(0x47) + y) & 0xFFFF];
      M[0x66D5] = rec(7) & 0x3F;
      M[0x66D6] = rec(7) & 0xC0;
      let y;
      if (M[0x66D6] & 0x40) {
        y = M[0x66D5];
        M[0x66D7] = script(y);
        y = (y - 2) & 255;
        if (!(y & 0x80)) return step(y);
        if (rec(5) & 0x80) { P.next_patrol({}); continue; }
        setRec(7, rec(7) & 0xBF);
        continue;
      }
      y = (M[0x66D5] + 2) & 255;
      M[0x66D7] = (script(y) << 2) & 255;
      M[0x66D3] = y;
      if (script(0) !== y) return step(y);
      if (rec(5) & 0x80) { P.next_patrol({}); continue; }
      if (e === 7) {
        P.kill_entity({});
        say(0x8139, 0x813A);
        for (const a of [0x85CD, 0x85CE, 0x85CF, 0x85ED, 0x85EE, 0x85EF]) M[a] = 0x96;
        M[0x68B3] = 1;
        return;
      }
      setRec(7, rec(7) | 0x40);
    }
  }
  // b_5EAA: the step to the script's place y: its location the destination, its wait the move's
  function step(y) {
    setRec(7, y | M[0x66D6]);
    setRec(3, M[(w(0x47) + y + 1) & 0xFFFF]);
    setRec(1, M[0x66D7]);
    setRec(0, rec(0) | 1);
  }
  // next_patrol ($5ED0): the next patrol of the person's chain (record bytes 5, the place in the
  // chain and its direction, 6, the chain, and 8, the patrol), started at its start or its end
  P.next_patrol = function () {
    let k = ((rec(6) & 0x7F) << 1) & 255;
    M[0x47] = M[0xBF54 + k]; M[0x48] = M[0xBF55 + k];
    M[0x66D6] = rec(5) & 0x3F;
    let y = M[0x66D6];
    M[0x66D5] = rec(5) & 0xC0;
    M[0x682F] = M[0x66D5] & 0x40;
    if (M[0x682F]) {
      y = (y - 1) & 255;
      if (y & 0x80) { M[0x66D5] &= 0xBF; M[0x682F] = 0; y = M[0x66D6]; }
    } else {
      y = (y + 1) & 255;
      M[0x66D3] = y;
      if (M[w(0x47)] === y) { M[0x66D5] |= 0x40; M[0x682F] = 0x40; y = M[0x66D6]; }
    }
    setRec(5, y | M[0x66D5]);
    y = (y + 1) & 255;
    M[0x66D3] = M[(w(0x47) + y) & 0xFFFF];
    setRec(8, M[0x66D3] & 0x3F);
    if ((M[0x66D3] & 0x40) ^ M[0x682F]) {
      k = ((M[0x66D3] & 0x3F) << 1) & 255;
      M[0x47] = M[0xBDC0 + k]; M[0x48] = M[0xBDC1 + k];
      setRec(7, ((M[w(0x47)] - 2) & 255) | 0xC0);
      return { a: rec(7), x: k, y: 7 };
    }
    setRec(7, 0x80);
    return { a: 0x80, x: k, y: 7 };
  };

  // j_5F79: people 1 to 8 each roll the clock's digits a line: the seconds' units always, and the
  // tens and the minutes when the second before carried into them (roll_digits, $68B1)
  function rollClock() {
    const e = E();
    if (((e - 1) & 0xF8) !== 0) return;
    const roll = (to, from) => {
      for (let x = 6; x; x--) M[to + x] = M[to - 1 + x];
      M[to] = M[from + e];
    };
    roll(0x2919, 0x6804);
    if (!(M[0x68B1] & 1)) return;
    roll(0x2911, 0x680C);
    if (!(M[0x68B1] & 2)) return;
    roll(0x2901, 0x6814);
    if (!(M[0x68B1] & 4)) return;
    roll(0x28F9, 0x681C);
  }

  // j_5FEF: every fourth person, the ticker two pixels on, its light's colour, and every eight
  // pixels the next character: from the message being shown, or the next queued message (its
  // words expanded from the dictionary at $81B1, into the buffer at $66D8), or a space.
  function ticker() {
    P.ticker_shift({}); P.ticker_shift({});
    let y = M[0x66CF], a;
    if (M[0x66D8 + y] === 0x38) {
      if (M[0x1602] !== 0x0F) M[0x1602] = 0x30;
      a = 0;
    } else {
      M[0x1602] = 0x3E;
      a = M[0x68A8 + (M[0x66D0] & 7)];
    }
    io.colourWrite(0x11B, a);
    if (M[0x66D0] & 7) return;
    y = M[0x66CF]++;
    a = M[0x66D8 + y];
    if (a === 0x38) {
      M[0x66CF]--;
      y = M[0x67F9];
      if (y !== M[0x67FA]) {
        M[0x67F9]++;
        if (M[0x67F9] === 0x10) M[0x67F9] = 0;
        M[0x66CF] = 0;
        M[0x39] = M[0x67D8 + y]; M[0x3A] = M[0x67E8 + y];
        M[0x67F8] = 0;
        const stack = [];
        let i = 0, x = 0;
        for (;;) {
          const t = M[(w(0x39) + i) & 0xFFFF];
          if (t & 0x80) {
            M[0x67F8]++;
            stack.push(i, M[0x39], M[0x3A]);
            const k = (t & 0x7F) << 1;
            M[0x39] = M[0x81B1 + k]; M[0x3A] = M[0x81B2 + k];
            i = 0;
            continue;
          }
          if (t === 0x38) {
            if (--M[0x67F8] & 0x80) { M[0x66D8 + x] = t; break; }
            M[0x3A] = stack.pop(); M[0x39] = stack.pop(); i = (stack.pop() + 1) & 255;
            continue;
          }
          M[0x66D8 + x] = t === 0x39 ? 0x24 : t;
          i = (i + 1) & 255; x = (x + 1) & 255;
        }
      }
      a = 0x24;
    }
    M[0x4A0F] = a;
    P.glyph_address({});
    for (let k = 2; k !== 8; k++) M[0x67FB + k] = M[(w(0x3B) + k) & 0xFFFF];
  }
  // ticker_shift ($63D7): the ticker's six lines (bitmap $2B4A on, twelve cells) a pixel left, the
  // next character's glyph ($67FB) coming in at the right
  P.ticker_shift = function () {
    let k = 0;
    M[0x66D2] = 2;
    do {
      const x = M[0x66D2];
      let c = M[0x67FB + x] >> 7;
      M[0x67FB + x] = (M[0x67FB + x] << 1) & 255;
      k = (x + 0x58) & 255;
      do {
        const v = M[0x2B48 + k];
        M[0x2B48 + k] = ((v << 1) | c) & 255;
        c = v >> 7;
        k = (k - 8) & 255;
      } while (!(k & 0x80));
      M[0x66D2]++;
    } while (M[0x66D2] !== 8);
    M[0x66D0]++;
    return { a: 8, x: k };
  };

  // j_60CF: with the view up (iris_open_flag, $6C8C), people 16 to 31 each look for someone in
  // one of the sixteen places round the location (view_locations), searching on from where the last
  // search ended, and draw them there, or clear the place when there is nobody; people 0 to 15
  // clear a place whose occupant changed, so that several in one place take turns with a gap
  // between, and one alone stays.
  function view() {
    const e = E();
    if (!M[0x6C8C] || e & 0xE0) return;
    const x = e & 0x0F;
    if (e & 0x10) {
      if (M[0x6830 + x] === 0xFF) return;
      M[0x6841 + x] = M[0x6896 + x];
      M[0x6896 + x]++;
      if (M[0x6896 + x] === 0x32) M[0x6896 + x] = 1;
      M[0x66D3] = M[0x6896 + x];
      const p = P.multiply({ a: M[0x66D3], y: 0x12 });
      const s = p.a + M[0xCA08];
      M[0x49] = s & 255; M[0x4A] = (p.y + M[0xCA09] + (s >> 8)) & 255;
      for (;;) {
        const V = w(0x49);
        if (!(M[V] & 2) && M[(V + 2) & 0xFFFF] === M[0x6830 + x]) {
          M[0x6896 + x] = M[0x66D3];
          const k = (M[0x66D3] << 2) & 255;
          M[0x31] = M[0x6CFE + k]; M[0x32] = M[0x6CFF + k];
          P.drain(P.draw_picture({ x: M[0x6852 + x], y: M[0x6863 + x] }));
          return;
        }
        inc16(0x49, 0x12);
        M[0x66D3]++;
        if (M[0x66D3] === M[0x6896 + x]) break;
        if (M[0x66D3] === 0x32) { setw(0x49, w(0xCA08)); M[0x66D3] = 0; }
      }
    }
    if (M[0x6830 + x] === 0xFF || M[0x6896 + x] === M[0x6841 + x]) return;
    M[0x31] = M[0x8D08]; M[0x32] = M[0x8D09];
    P.drain(P.draw_picture({ x: M[0x6852 + x], y: M[0x6863 + x] }));
  }

  // Once a second ($61D1): the destruct count, armed by the destruct unit, says how many minutes
  // are left at 4, 3, 2 and 1 (the table after cursor_x, $68E6) and at 0 destroys the ship: the
  // music stops, the mission's bit 2, and the team, Kryxix and Zoff killed but aboard the attack
  // craft. The turn after starts at person 8.
  function destruct() {
    if (!M[0xCA06]) return;
    if (--M[0xCA07] & 255) {
      const a = M[0xCA07];
      for (let x = 4; x; x--) {
        if (a !== M[0x68E5 + x]) continue;
        if (x === 1) say(0x8129, 0x812A);
        else { M[0x80F2] = x; say(0x810D, 0x810E); }
        break;
      }
      return;
    }
    M[0x1600] = 0;
    M[0xCA05] |= 4;
    say(0x807E, 0x807F);
    M[0xCF67] = 4; M[0xCF68] = 2;
    do {
      if (rec(2) !== 0xA3 && rec(0) !== 2) P.kill_entity({});
      inc16(0x45, 0x12);
      M[0x66D1]++;
    } while (M[0x66D1] !== 8);
    M[0xCA05] &= 0xF7;
  }
  // The clock ($625A): down from the time the game gives (clock_up clear), a digit at a time, the
  // digits that carried named in roll_digits; at 00:00 Kryxix is executed, if he is still on the
  // ship, and it counts up from 00:01 (war). Up, it stops at 99:59 by counting down again.
  // Then each digit's glyph, upside down, for the roll.
  function clock() {
    M[0x68B1] = 0;
    if (!M[0xCA04]) {
      if (--M[0xCA00] & 0x80) {
        M[0xCA00] = 9; M[0x68B1] = 1;
        if (--M[0xCA01] & 0x80) {
          M[0xCA01] = 5; M[0x68B1] = 3;
          if (--M[0xCA02] & 0x80) {
            M[0xCA02] = 9; M[0x68B1] = 7;
            if (--M[0xCA03] & 0x80) {
              M[0xCA04] = 1;
              M[0xCA01] = 0; M[0xCA02] = 0; M[0xCA03] = 0;
              M[0xCA00] = 1;
              if (M[0xCA7A] !== 2) { M[0xCA7A] = 2; say(0x8027, 0x8028); }
              say(0x804F, 0x8050);
            }
          }
        }
      }
    } else if (++M[0xCA00] === 0x0A) {
      M[0xCA00] = 0; M[0x68B1] = 1;
      if (++M[0xCA01] === 6) {
        M[0xCA01] = 0; M[0x68B1] = 3;
        if (++M[0xCA02] === 0x0A) {
          M[0xCA02] = 0; M[0x68B1] = 7;
          if (++M[0xCA03] === 0x0A) return P.clock_wraps({});
        }
      }
    }
    const digit = (v, to) => {
      M[0x4A0F] = v;
      P.glyph_address({});
      for (let y = 2, x = 7; y !== 8; y++, x--) M[to + x] = M[(w(0x3B) + y) & 0xFFFF];
    };
    digit(M[0xCA00], 0x6804); digit(M[0xCA01], 0x680C); digit(M[0xCA02], 0x6814); digit(M[0xCA03], 0x681C);
    return {};
  }
  // clock_wraps ($6473): counting down again
  P.clock_wraps = function () { M[0xCA04] = 0; return {}; };

  // nmi ($427D): RUN/STOP with RESTORE starts the game again from the control menu (restart, $40A3);
  // RESTORE alone does nothing. CIA 2's interrupts are turned off first.
  // The SEI ($427E) is the page's: on the C64 the processor masks the interrupt as it takes the NMI
  // and the RTI puts the flag back, but for the restart, whose RTI pulls a flag pushed with it set.
  P.nmi = function () {
    P.sei();
    io.cia2Write(0x0D, 0x1F);
    io.cia2Read(0x0D);
    if (!(io.ciaRead(0x01) & 0x80)) P.jump('restart');
    return {};
  };
  // rts_vector ($4271): an RTS, the character-output vector's routine
  P.rts_vector = () => ({});

  // icon_offset ($6466): X times 11, an icon's place in its list, in Y
  P.icon_offset = function (r) {
    let a = 0, x = r.x & 255;
    for (;;) { x = (x - 1) & 255; if (x & 0x80) break; a = (a + 0x0B) & 255; }
    return { a, x, y: a };
  };
  // queue_message ($647B): the message at Y:A put in the ticker's queue of sixteen ($67D8, $67E8)
  P.queue_message = function (r) {
    const x = M[0x67FA];
    M[0x67D8 + x] = r.a & 255; M[0x67E8 + x] = r.y & 255;
    M[0x67FA]++;
    if (M[0x67FA] === 0x10) M[0x67FA] = 0;
    return { a: M[0x67FA], x, y: r.y & 255 };
  };

  // kill_entity ($64CD): the person whose turn it is dies (status 2). One of the team: their
  // status icon black, their figure replaced by a gravestone (Manto and Maul's from $8D82, the
  // others' from $FF2E), the icon not chosen, the team screen told; the ticker names them unless
  // the ship is destroyed, and the last of them ends the mission's bit 0. One of the enemy: the
  // count of the dead ($CF67-$CF68, in tens) goes on, and the 44th sets the mission's bits 2 and 3.
  // What they carried is left where they are.
  P.kill_entity = function () {
    const e = E();
    if (e < 6) {
      P.colour_status_icon({ a: e, y: 0 });
      let x = P.multiply({ a: e, y: 0x0B }).a;
      const [lo, hi] = e === 2 || e === 3 ? [0x8D82, 0x8D83] : [0xFF2E, 0xFF2F];
      M[0x78AE + x] = M[lo]; x++; M[0x78AE + x] = M[hi];
      x = (x + 3) & 255;
      M[0x78AE + x] = 0;
      M[0x68B2] = 1;
      if (!(M[0xCA05] & 4)) { M[0x7F65] = e | 0x80; say(0x7F7B, 0x7F7C); }
      if (!(--M[0xCF4C] & 255)) M[0xCA05] &= 0xFE;
    } else {
      if (M[0xCF68] === 3 && M[0xCF67] === 4) M[0xCA05] |= 0x0C;
      if (++M[0xCF68] === 0x0A) { M[0xCF68] = 0; M[0xCF67]++; }
    }
    setw(0x2F, w(0xCD96));
    M[0x66D3] = rec(2);
    do {
      const o = w(0x2F);
      if (M[o] & 1 && M[(o + 1) & 0xFFFF] === e) { M[(o + 1) & 0xFFFF] = M[0x66D3]; M[o] &= 0xFE; }
      inc16(0x2F, 7);
    } while (!(M[w(0x2F)] === 0xFF && M[(w(0x2F) + 1) & 0xFFFF] === 0xFF));
    setRec(0, 2);
    return { a: 2, y: 0 };
  };
  // team_member_at ($65B8): the carry set if one of the team, alive, is in location A
  P.team_member_at = function (r) {
    M[0x66D3] = r.a & 255;
    setw(0x2D, w(0xCA08));
    let a = 0, y = 0;
    for (let x = 6; x; x--) {
      const T = w(0x2D);
      y = 0;
      if (M[T] !== 2) {
        y = 2;
        if (M[(T + 2) & 0xFFFF] === M[0x66D3]) return { a: M[0x66D3], x, y, c: 1 };
      }
      inc16(0x2D, 0x12);
      a = M[0x2D];
    }
    return { a, x: 0, y, c: 0 };
  };
  // list_reachable ($65EA): the locations the person can reach from where they are, into record
  // bytes $0A-$11: their own, then the far side of each exit whose door is not locked; $FF after.
  P.list_reachable = function () {
    for (let y = 0x0A; y !== 0x12; y++) setRec(y, 0xFF);
    const mp = record(rec(2));
    setw(0x2D, mp);
    let a = M[(mp + 2) & 0xFFFF], x = 0;
    for (let k = 8; k; k--) { if (a & 0x80) x++; a = (a << 1) & 255; }
    setRec(0x0A, rec(2));
    if (!x) return { a: rec(2), x: 0, y: 0x0A };
    let y = 3;
    M[0x7D] = 0x0B;
    do {
      a = M[0x66D3] = M[(mp + y) & 0xFFFF]; y++;
      const k = M[(mp + y) & 0xFFFF] >> 3; y++;
      if (k) { M[0x66D4] = x; a = M[0xCFC9 + k]; }
      if (!k || !a) { a = M[0x66D3]; setRec(M[0x7D], a); M[0x7D]++; }
      x--;
    } while (x);
    return { a, x: 0, y };
  };

  // Two routines nothing calls. unused_in_window ($6404): the carry set if location A's place is
  // inside the view's window ($6C92-$6C95), its pointer taken from the wrong table for the upper
  // half of the locations; unused_place_icon ($6443): a picture drawn at the place of the location
  // at ($2D) in the window, but at one place.
  P.unused_in_window = function (r) {
    const a = r.a & 255, y = (a << 1) & 255;
    if (a & 0x80) { M[0x2D] = M[0xB248 + y]; M[0x2E] = M[0xB249 + y]; }
    else { M[0x2D] = M[0xB1E4 + y]; M[0x2E] = M[0xB1E5 + y]; }
    const m = w(0x2D);
    if (M[m] < M[0x6C92] || M[m] >= M[0x6C94]) return { a: M[m], y: 0, c: 0 };
    const v = M[(m + 1) & 0xFFFF];
    if (v < M[0x6C93] || v >= M[0x6C95]) return { a: v, y: 1, c: 0 };
    return { a: v, y: 1, c: 1 };
  };
  P.unused_place_icon = function () {
    const m = w(0x2D);
    const x = ((((M[m] - M[0x6C96]) & 255) << 1) + 0x0F) & 255;
    const y = (((((M[(m + 1) & 0xFFFF] - M[0x6C97]) & 255) << 1) & 255) + 1) & 255;
    if (x === 0x13 && y === 5) return { x, y };
    return P.drain(P.draw_picture({ x, y }));
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
