// A base: the visit's loop in MAIN ($A49A-$A500), SEG1 ($A500-$BCFF, loaded over SEG0 when the
// ship docks) and SEG1A ($E400-$E8FF). The base's map is the system map's tables reused: 32
// entries at $5510 (x), $5530 (y), $5550 (flags: bits 0-2 how the entry moves, 5 standing still,
// 6 in the player's sight, 7 solid), $5570 (picture), $5590 (type), $55B0, $55D0 (a message, two
// bytes each) and $5618 (what acting on it does). Entry 0 is the player. The chart window ($FA00,
// 11 cells by 9) is drawn around the player each pass, with what the player cannot see blacked
// out (tile $7D).
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
G.station = function (P) {
  const M = P.M;
  const R = (r, o) => Object.assign({}, r, o);
  const flags = (a, o) => Object.assign({ a, n: a >> 7, z: a ? 0 : 1 }, o);
  const ptr = zp => M[zp] | M[(zp + 1) & 255] << 8;
  const reader = () => ((M[1] & 3) ? P.rd : a => M[a]);
  const writer = () => ((M[1] & 3) ? P.wr : (a, v) => { M[a] = v; });
  const load = (x, y, to) => { M[0x80] = 0; M[0x81] = to; return P.load_file({ x, y }); };
  // a text at window 4's left, 36 rows below its top: where the shops put their lists' bars
  const listBar = () => { M[0x4F] = M[0x0D20]; M[0x50] = (M[0x0D22] - 0x24) & 255; M[0x79] = 0; };

  // ---- the visit (MAIN, $A49A). The frame (LAND.PAC) with the date and the credits, the base's
  // map file (named at $0778) to $5100, its people's talk (TALK) and its tiles (LAND.TIL); the
  // arrival, which may turn the player away; then the base's set-up, a key, and passes of the view
  // and a step until something ends the visit ($A673). Each pass starts at the loop's head ($A4DF).
  P.station_run = function* () {
    M[0x083A] = 0; M[0x083B] = 0; M[0x3A] = 0;
    P.show_bank3();
    P.mirror_text_off();
    yield* P.base_screen();
    load(0x78, 0x07, 0x51);
    M[0x0D30] = 1; M[0x0D31] = 0xBF; M[0x0D32] = 8;
    P.load_talk();
    P.load_land_tiles();
    const o = yield* P.arrival_message();
    if (o.up) return R(o, { up: undefined });
    P.base_setup();
    yield* P.wait_key();
    M[0xA673] = 0;
    let s;
    do {
      yield { cp: 0xA4DF };
      yield* P.station_view();
      s = yield* P.base_step();
    } while (!M[0xA673]);
    return flags(M[0xA673], { x: s.x, y: s.y });
  };
  P.CHECKPOINTS.push(0xA4DF);
  // The view: the chart window filled around the player (in MAIN, $A4EB, whose LDY at $A4FE takes
  // its operand's high byte from SEG1's first byte); a door the player stands in shows a wall
  // beside it; the map's entries drawn, the sight worked out and the walls given their edges;
  // the chart drawn, a tick, the guards; and every other pass the message's time counted down,
  // the message line cleared when it runs out
  P.station_view = function* () {
    P.select_window({ y: 2 });
    P.fill_chart_window({ a: 0x2C, x: M[0x5510], y: M[0x5530] });
    const k = P.sector_kind({ x: M[0x5510], y: M[M[0xA4FF] | M[0xA500] << 8] });
    if (k.a & 0x40) {
      if (k.y === 0x71) M[0xFA30] = 0x77;
      else M[0xFA26] = 0x75;
    }
    P.draw_map_objects({ x: M[0x5510], y: M[0x5530] });
    P.sight();
    P.mark_in_view();
    P.wall_edges();
    P.animate_chart();
    P.draw_chart();
    M[0x5E] = (M[0x5E] + 1) & 255;
    yield* P.wait_ticks({ a: 1 });
    let o = yield* P.guards_check();
    if (!(M[0x5E] & 1) || (M[0x0D29] & 0x80)) return R(o, { a: M[0x5E] >> 1 });
    M[0x0D29] = (M[0x0D29] - 1) & 255;
    if (!(M[0x0D29] & 0x80)) return R(o, { a: M[0x0D29] });
    return yield* P.scroll_window({ a: 2 });
  };
  P.load_land_tiles = () => load(0x24, 0x08, 0x40);
  P.load_talk = () => load(0x2D, 0x08, 0x57);
  // The frame, LAND.PAC, with the date in window 2 and the credits under it
  P.base_screen = function* () {
    P.load_picture({ a: 2 });
    P.select_window({ y: 2 });
    M[0x4F] = 0x1B; M[0x50] = 0x48;
    yield* P.print_date({});
    return yield* P.show_credits();
  };
  // The docking message. A base that turns the player away drops the visit's return (up).
  P.arrival_message = function* () {
    P.select_window({ y: 4 });
    P.clear_text_page();
    if (M[0x0779] === 0x35 && M[0x077A] === 0x31) return yield* P.print_wrapped({ x: 0x2B, a: 0xCF });
    yield* P.print_wrapped({ x: 0x77, a: 0xCF });
    yield* P.print_wrapped({ x: 0x05, a: 0x55 });
    M[0x4F] = (M[0x4F] + 1) & 255;
    const away = function* (x) {
      yield* P.print_wrapped({ x, a: 0xCF });
      yield* P.wait_key();
      return { a: 0xA4, up: 1 };
    };
    const shot = M[0x0783];
    if (shot) return yield* away(shot === 1 ? 0x2A : 0x29);
    const kind = M[0x5610];
    if (kind === 0x12) return yield* P.print_wrapped({ x: M[0x0779] === 0x36 ? 0x25 : 0x72, a: 0xCF });
    if (kind === 0x10) return yield* P.print_wrapped({ x: 0x71, a: 0xCF });
    if (M[0x0726] | M[0x0727]) {
      yield* P.print_wrapped({ x: 0x28, a: 0xCF });
      if (!(yield* P.ask_agree()).z) return { a: 0xA4, up: 1 };
      M[0x60] = M[0x0726]; M[0x61] = M[0x0727];
      if (!P.pay_credits().c) return yield* away(0x27);
      M[0x0726] = 0; M[0x0727] = 0;
      yield* P.show_credits();
      yield* P.print_wrapped({ x: 0x26, a: 0xCF });
    } else yield* P.print_wrapped({ x: 0x76, a: 0xCF });
    yield* P.print_wrapped({ x: 0x70, a: 0xCF });
    let x = 0x75;
    if (!P.random_upto({ a: M[0x074E] ? 7 : 1 }).a) {
      let n = 0;
      for (let y = 7; y >= 0; y--) if (!(M[0x0767 + y] >> 2)) { n++; M[0x0767 + y] = 0xFF; }
      if (n) x = 0x74;
    }
    yield* P.print_wrapped({ x, a: 0xCF });
    return yield* P.print_wrapped({ x: 0x73, a: 0xCF });
  };

  // ---- a step of the base ($A674). Each entry after the player's that moves takes its step by
  // its motion kind's routine, called through a JSR whose operand is written from the table at
  // $A806 + 2 * kind, and is marked still or moving; then the player's step, from the keys or
  // the stick, or a drunk's stagger; then what the player does there (base_act).
  const MOVES = { 0xA72A: 'move_wander', 0xA74E: 'move_wander_rooms', 0xA785: 'move_chase', 0xA766: 'move_watch' };
  P.base_step = function* () {
    let y = 0x1F;
    M[0xBC] = y;
    do {
      M[0xBD] = 0; M[0xBE] = 0;
      const kind = M[0x5550 + y] & 7;
      if (kind) {
        const i = kind << 1;
        M[0xA694] = M[0xA806 + i]; M[0xA695] = M[0xA807 + i];
        const to = M[0xA694] | M[0xA695] << 8, name = MOVES[to];
        if (!name) throw new Error('base_step: no motion routine at $' + to.toString(16));
        P[name]();
      }
      y = M[0xBC];
      P.set_still({ a: M[0xBE], x: M[0xBD], y });
      M[0xBC] = (M[0xBC] - 1) & 255;
      y = M[0xBC];
    } while (y);
    let k;
    if (M[0x083A] && !P.random_upto({ a: 9 }).a) {
      yield* P.print_message({ x: 0x10, a: 0xA8 });
      const ax = P.random_upto({ a: 2 }).a, ay = P.random_upto({ a: 2 }).a;
      k = { a: 0xFF, x: (ax - 1) & 255, y: (ay - 1) & 255 };
    } else k = P.key_direction();
    M[0xBF] = k.a; M[0xBD] = k.x; M[0xBE] = k.y;
    let c = 1;
    if (!P.fire_pressed().a) {
      c = P.try_step({ a: 0, x: M[0xBD], y: M[0xBE] }).c;
      if (c) c = P.slide_step().c;
    }
    P.set_ship_heading({ a: 0, x: M[0xBD], y: M[0xBE] });
    P.set_still({ a: M[0xBE], x: M[0xBD], y: 0 });
    return yield* P.base_act({ a: M[0xBF], x: M[0xBD], y: M[0xBE], c });
  };
  // What the player does after the step ($A907), key A and direction X, Y: the square acted on
  // ($E4, $E5) is the player's, or with the carry set (fire, or a step not taken) the one the
  // step leads to
  P.base_act = function* (r) {
    M[0x8B] = r.a; M[0xE6] = r.x; M[0xE7] = r.y;
    M[0xE4] = M[0x5510]; M[0xE5] = M[0x5530];
    if (r.c) { M[0xE4] = (r.x + M[0xE4]) & 255; M[0xE5] = (r.y + M[0xE5]) & 255; }
    yield* P.player_act();
    return yield* P.do_action(P.entry_action({ a: 0 }));
  };
  // A diagonal step that is blocked tried as its step across alone and then as its step down
  // alone; the one taken leaves the other zero. Carry set when neither, or the step was straight.
  P.slide_step = function () {
    if (!(M[0xBE] & M[0xBD])) return { c: 1 };
    if (!P.try_step({ a: M[0xBC], x: M[0xBD], y: 0 }).c) { M[0xBE] = 0; return { a: 0, c: 0 }; }
    if (!P.try_step({ a: M[0xBC], x: 0, y: M[0xBE] }).c) { M[0xBD] = 0; return { a: 0, c: 0 }; }
    return { c: 1 };
  };
  const stepBC = () => P.try_step({ a: M[0xBC], x: M[0xBD], y: M[0xBE] });
  // kind 1: on a door always, else one time in ten, a random step
  P.move_wander = function () {
    const y = M[0xBC];
    const k = P.sector_kind({ x: M[0x5510 + y], y: M[0x5530 + y] });
    if (!(k.a & 0x40) && P.random().a >= 0x19) return {};
    P.random_step();
    return stepBC();
  };
  // kind 2: one time in ten a random step, never onto a door
  P.move_wander_rooms = function () {
    if (P.random().a >= 0x19) return {};
    P.random_step();
    if (P.step_target_kind().a) return {};
    return stepBC();
  };
  // kind 4: in sight, half the time a step toward the player, never onto a door; else kind 2
  P.move_watch = function () {
    if (!(M[0x5550 + M[0xBC]] & 0x40) || !(P.random().a & 0x80)) return P.move_wander_rooms();
    P.step_to_player();
    if (P.step_target_kind().a) return {};
    return stepBC();
  };
  // kind 3: one time in five kind 1's move, else a step toward the player, sliding round
  P.move_chase = function () {
    if (!P.random_upto({ a: 4 }).a) return P.move_wander();
    P.step_to_player();
    const t = stepBC();
    return t.c ? P.slide_step() : t;
  };
  P.random_step = function () {
    const x = (P.random_upto({ a: 2 }).a - 1) & 255;
    M[0xBD] = x;
    const y = (P.random_upto({ a: 2 }).a - 1) & 255;
    M[0xBE] = y;
    return { a: (y + 1) & 255, x, y };
  };
  // the signs of the player's place less entry $BC's, across and down (by bit 7 of the difference)
  P.step_to_player = function () {
    const e = M[0xBC];
    const sign = (p, q) => (p === q ? 0 : ((p - q) & 0x80) ? 0xFF : 1);
    M[0xBE] = sign(M[0x5530], M[0x5530 + e]);
    const x = sign(M[0x5510], M[0x5510 + e]);
    M[0xBD] = x;
    return { a: M[0x5510], x, y: e };
  };
  P.step_target_kind = function () {
    const e = M[0xBC];
    const k = P.sector_kind({ x: (M[0xBD] + M[0x5510 + e]) & 255, y: (M[0xBE] + M[0x5530 + e]) & 255 });
    return flags(k.a & 0x40, { x: k.x, y: k.y });
  };
  // Entry Y's still bit (5) set when its step (X across, A down) was none, cleared when it moved
  P.set_still = function (r) {
    const y = r.y;
    const a = (r.a || r.x) ? (M[0x5550 + y] | 0x20) ^ 0x20 : M[0x5550 + y] | 0x20;
    M[0x5550 + y] = a;
    return { a, x: r.x, y };
  };
  // Entry A moved X across and Y down, unless a solid entry or a wall is there (carry set). A door
  // stepped onto opens, and one stepped off closes.
  P.try_step = function (r) {
    M[0x96] = r.x; M[0x97] = r.y; M[0x98] = r.a;
    const e = r.a;
    M[0x94] = (r.x + M[0x5510 + e]) & 255;
    M[0x95] = (M[0x97] + M[0x5530 + e]) & 255;
    const b = P.entry_blocks({ x: M[0x94], y: M[0x95] });
    if (b.c) return R(b, { c: 1 });
    const k = P.sector_kind({ x: M[0x94], y: M[0x95] });
    if (k.a & 0x80) return R(k, { c: 1 });
    if (k.a & 0x40) P.open_door({ y: k.y });
    const y = M[0x98];
    M[0x9B] = M[0x5510 + y]; M[0x9C] = M[0x5530 + y];
    M[0x5510 + y] = M[0x94]; M[0x5530 + y] = M[0x95];
    const l = P.sector_kind({ x: M[0x9B], y: M[0x9C] });
    if (l.a & 0x40) return R(P.close_door({ y: l.y }), { c: 0 });
    return R(l, { a: l.a & 0x40, c: 0 });
  };
  // Carry set when an entry in sector X, Y is solid (bit 7 of its flags)
  P.entry_blocks = function (r) {
    const s = P.sector_entries(r);
    if (!s.y) return R(s, { c: 0 });
    const p = ptr(0x74);
    let y = (s.y - 1) & 255, a = 0, x = s.x;
    for (; !(y & 0x80); y = (y - 1) & 255) {
      x = M[(p + y) & 0xFFFF];
      a = M[0x5550 + x];
      if (a & 0x80) return { a, x, y, c: 1 };
    }
    return { a, x, y, c: 0 };
  };
  // The door ahead ($94, $95) opens and the one behind ($9B, $9C) closes, a frame at a time, when
  // it is in sight: tile Y + 1, + 2, + 3, or back from + 3
  P.open_door = function (r) {
    M[0x9A] = r.y;
    const d = P.door_cell({ x: M[0x94], y: M[0x95] });
    if (d.c) return d;
    M[0x99] = d.y;
    P.sound_play({ a: 0x0D });
    let o;
    for (let i = 0; i < 3; i++) { M[0x9A] = (M[0x9A] + 1) & 255; o = P.door_frame(); }
    return o;
  };
  P.close_door = function (r) {
    M[0x9A] = r.y;
    const d = P.door_cell({ x: M[0x9B], y: M[0x9C] });
    if (d.c) return d;
    M[0x99] = d.y;
    P.sound_play({ a: 0x0D });
    M[0x9A] = (M[0x9A] + 3) & 255;
    P.door_frame();
    M[0x9A] = (M[0x9A] - 1) & 255;
    P.door_frame();
    M[0x9A] = (M[0x9A] - 1) & 255;
    return P.door_frame();
  };
  // A door's frame: the chart filled again around the player, the entries drawn, the door's cell
  // ($99) given tile $9A, the sight and the walls' edges, and the chart drawn
  P.door_frame = function () {
    P.fill_chart_window({ a: 0x2C, x: M[0x5510], y: M[0x5530] });
    P.draw_map_objects({ x: M[0x5510], y: M[0x5530] });
    M[0xFA00 + M[0x99]] = M[0x9A];
    P.sight();
    P.wall_edges();
    return P.draw_chart();
  };
  // Carry clear, and the cell in Y, when X, Y is in the window around the player and in sight
  P.door_cell = function (r) {
    M[0x51] = M[0x5510]; M[0x53] = M[0x5530];
    const w = P.in_chart_window(r);
    if (w.c) return R(w, { c: 1 });
    const o = P.chart_cell_index(w);
    const a = M[0xFA00 + o.y];
    return { a, x: o.x, y: o.y, c: a === 0x7D ? 1 : 0 };
  };

  // ---- what the player does: fire (let go first), or space, '0' or RETURN as the step's key.
  // With no step the base menu; with one, the entry on that square, or across a counter.
  P.player_act = function* () {
    const f = P.fire_pressed();
    yield* P.wait_fire_up();
    if (!f.a) {
      const k = M[0x8B];
      if (k !== 0x20 && k !== 0x30 && k !== 0x0D) return { a: k };
    }
    if (!(M[0xE6] | M[0xE7])) return yield* P.base_menu();
    let e = P.entry_action({ a: 1 });
    if (!e.z) return yield* P.do_action(e);
    if (M[0xE6] & M[0xE7]) return { a: M[0xE6] & M[0xE7] };
    const k = P.sector_kind({ x: M[0xE4], y: M[0xE5] });
    if (!(k.a & 0x80) || (k.a & 0x30)) return k;
    M[0xE4] = (M[0xE4] + M[0xE6]) & 255; M[0xE5] = (M[0xE5] + M[0xE7]) & 255;
    e = P.entry_action({ a: 1 });
    M[0xE4] = (M[0xE4] - M[0xE6]) & 255; M[0xE5] = (M[0xE5] - M[0xE7]) & 255;
    return yield* P.do_action(e);
  };
  // The action byte ($5618) of the entry find_entry finds, in X and A (0 for none); one with bit 6
  // set happens once, and is cleared
  P.entry_action = function (r) {
    const f = P.find_entry(r);
    if (f.z) return { a: f.a, x: 0, y: f.y, z: 1, n: 0 };
    if (f.x & 0x40) M[0x5618 + f.y] = 0;
    return flags(f.x, { x: f.x, y: f.y });
  };
  // The entry at X, Y (not the player) with an action byte that the branch at $AA06 passes: BPL
  // ($10) a positive one, BMI ($30) a negative one. The row to match is written into the CPX at
  // $A9FD.
  const findAt = (x, y) => {
    M[0xA9FE] = y;
    let xr = x;
    for (let e = 0x1F; e; e--) {
      if (x !== M[0x5510 + e]) continue;
      xr = M[0x5530 + e];
      if (xr !== M[0xA9FE]) continue;
      xr = M[0x5618 + e];
      if (!xr) continue;
      const op = M[0xAA06];
      if (op !== 0x10 && op !== 0x30) throw new Error('find_entry: the branch at $AA06 is $' + op.toString(16));
      if ((op === 0x30) === !!(xr & 0x80)) return { a: x, x: xr, y: e, z: 0, n: xr >> 7 };
    }
    return { a: x, x: xr, y: 0, z: 1, n: 0 };
  };
  // A = 0: at ($E4, $E5) an action byte that is positive, or on the eight squares round the
  // player one with bit 5 set. A not 0: at ($E4, $E5) a negative one, unless the alarm is negative.
  P.find_entry = function (r) {
    if (r.a) {
      if (M[0x083B] & 0x80) return { a: M[0x083B], x: 0, y: r.y, z: 1, n: 0 };
      M[0xAA06] = 0x30;
      return findAt(M[0xE4], M[0xE5]);
    }
    M[0xAA06] = 0x10;
    let o = findAt(M[0xE4], M[0xE5]);
    if (!o.z) return o;
    let y = 7, a = o.a;
    M[0x8A] = y;
    for (;;) {
      a = (M[0x5510] + M[0xAA96 + y]) & 255;
      if (!(a & 0x80)) {
        const x = a;
        a = (M[0x5530] + M[0xAA9E + y]) & 255;
        if (!(a & 0x80)) {
          o = findAt(x, a);
          a = o.a;
          if (!o.z) {
            a = o.x & 0x20;
            if (a) return { a, x: o.x, y: o.y, z: 0, n: 0 };
          }
        }
      }
      M[0x8A] = (M[0x8A] - 1) & 255;
      y = M[0x8A];
      if (y & 0x80) return { a, x: 0, y, z: 1, n: 0 };
    }
  };
  // TALK, INSPECT (dimmed while the alarm is negative), STATUS, DONE
  P.base_menu = function* () {
    M[0xAA93] = (M[0x083B] & 0x80) ? 0 : 1;
    M[0x4F] = 0x1B; M[0x50] = 0xAF;
    M[0x78] = 0x92; M[0x79] = 0xAA; M[0x7A] = 0x76; M[0x7B] = 0xAA;
    const m = yield* P.menu({ a: 4, y: 0x0A });
    if (m.y === 0) {
      const f = yield* P.find_adjacent({ a: 1 });
      if (!(f.y & 0x80)) return yield* P.talk_to({ y: f.y });
      return yield* P.print_message({ x: 0x62, a: 0xCF });
    }
    if (m.y < 2) {
      const f = yield* P.find_adjacent({ a: 0xFF });
      if (!(f.y & 0x80)) {
        const x = M[0x5618 + f.y];
        if (x & 0x80) return yield* P.do_action({ x, y: f.y });
      }
      return yield* P.print_message({ x: 0x63, a: 0xCF });
    }
    if (m.y !== 2) return m;
    P.select_window({ y: 4 });
    P.clear_text_page();
    return yield* P.status_pages({ x: 0x1B, y: 0xAF, a: 0x0A });
  };
  // Action X (its low four bits) for entry Y: its routine's address less one from $AB2E, reached
  // by an RTS; the port finds the routine by the address
  const ACTIONS = { 0xAAB3: null, 0xAAB4: 'act_notice', 0xAAC0: 'act_ship', 0xAAD6: 'act_hive',
    0xAACA: 'act_alarm_plate', 0xAB58: 'talk_to', 0xB736: 'act_lock', 0xB93A: 'act_item', 0xAAF1: 'act_read' };
  P.do_action = function* (r) {
    const i = (r.x & 0x0F) << 1;
    const to = ((M[0xAB2E + i] | M[0xAB2F + i] << 8) + 1) & 0xFFFF;
    if (!(to in ACTIONS)) throw new Error('do_action: no action at $' + to.toString(16));
    const name = ACTIONS[to], o = { a: M[0xAB2E + i], x: i, y: r.y };
    if (!name) return o;
    return P.GEN.has(name) ? yield* P[name](o) : P[name](o);
  };
  P.act_notice = function* (r) {
    const y = (r.y << 1) & 255;
    return yield* P.print_message({ x: M[0x55D0 + y], a: M[0x55D1 + y] });
  };
  P.act_ship = function* () {
    M[0xA673] = (M[0xA673] + 1) & 255;
    return yield* P.print_message({ x: 0xCE, a: 0xCE });
  };
  P.act_alarm_plate = function* () {
    yield* P.print_message({ x: 0xCD, a: 0xCE });
    return P.raise_alarm({ a: 0xA0 });
  };
  // HIVE!: HCODE loaded over TALK and run; then TALK and the tiles back from the data disk
  P.act_hive = function* () {
    load(0x40, 0xAB, 0x57);
    yield* P.hive_start();
    P.prompt_data_disk();
    P.load_talk();
    return P.load_land_tiles();
  };
  // A sign, read only when its wall faces the player
  P.act_read = function* (r) {
    M[0x94] = r.y;
    M[0x51] = M[0x5510]; M[0x53] = M[0x5530];
    const w = P.in_chart_window({ x: M[0x5510 + r.y], y: M[0x5530 + r.y] });
    const o = P.chart_cell_index(w);
    if (M[0xFA63 + o.y]) return R(o, { a: M[0xFA63 + o.y] });
    P.select_window({ y: 4 });
    P.clear_text_page();
    yield* P.print_wrapped({ x: 0x46, a: 0xAB });
    const y = (M[0x94] << 1) & 255;
    yield* P.print_wrapped({ x: M[0x55D0 + y], a: M[0x55D1 + y] });
    return yield* P.wait_key();
  };
  // Entry Y's person: a guard, the shops, the bar, or a talk script by the type
  P.talk_to = function* (r) {
    const t = M[0x5590 + r.y];
    M[0x94] = t;
    if (t === 0x21) return yield* P.print_message({ x: 0xD0, a: 0xCE });
    if (t === 0x20) return yield* P.cargo_merchant();
    if (t === 0x22) return yield* P.outfitter();
    if (t === 0x23) return yield* P.repair_shop();
    if (t === 0x24) return yield* P.bartender();
    return yield* P.talk_script({ a: t, y: r.y });
  };

  // ---- the status pages (from the base menu, and from Navigation's STATUS): SHIP, ONBOARD,
  // PERSON and DONE at column X, row Y, A wide, put up again after each page until DONE
  P.status_pages = function* (r) {
    M[0xAB] = r.x; M[0xAC] = r.y; M[0xAA] = r.a;
    for (;;) {
      M[0x4F] = M[0xAB]; M[0x50] = M[0xAC];
      M[0x79] = 0; M[0x7A] = 0x2E; M[0x7B] = 0xAE;
      const m = yield* P.menu({ a: 4, y: M[0xAA] });
      if (m.y === 0) yield* P.status_ship();
      else if (m.y === 2) yield* P.status_person();
      else if (m.y < 2) yield* P.status_onboard();
      else return m;
    }
  };
  const text = (x, a) => P.print_wrapped({ x, a });
  const cf = x => P.print_wrapped({ x, a: 0xCF });
  P.status_ship = function* () {
    yield* cf(0xFF);
    yield* cf(0xFE);
    const s = 0xFE - M[0x0739];
    yield* text(s & 255, (0xCF - (s < 0 ? 1 : 0)) & 255);
    if (M[0x0734]) { yield* cf(0xF9); yield* P.print_signed({ a: M[0x0734] }); }
    if (M[0x0732]) { yield* cf(0xF8); yield* P.print_signed({ a: M[0x0732] }); }
    if (M[0x0733]) { yield* cf(0xF7); yield* P.print_signed({ a: M[0x0733] }); M[0x4F] = (M[0x4F] + 1) & 255; }
    let g = M[0x073A] >> 4;
    if (g) { yield* cf(0xF5); yield* P.print_char({ a: M[0xAE2A + g] }); }
    g = M[0x073A] & 0x0F;
    if (g) { yield* cf(0xF4); yield* P.print_char({ a: M[0xAE2A + g] }); }
    yield* P.print_char({ a: 0x0D });
    if (M[0x0737]) { yield* P.print_signed({ a: M[0x0737] }); yield* cf(0xF3); }
    yield* cf(0xF0);
    yield* cf(0xEF);
    M[0x60] = M[0x051D]; M[0x61] = M[0x051E];
    yield* P.print_number({});
    yield* P.print_char({ a: 0x2F });
    M[0x60] = M[0x0735]; M[0x61] = M[0x0736];
    yield* P.print_number({});
    yield* cf(0xEE); yield* P.print_system_ok({ a: 0x02 });
    yield* cf(0xED); yield* P.print_system_ok({ a: 0x01 });
    yield* cf(0xEC); yield* P.print_system_ok({ a: 0x04 });
    let o = yield* cf(0xEB);
    o = yield* P.print_system_ok({ a: 0x10 });
    if (M[0x0738] & 8) { yield* cf(0xEA); o = yield* P.print_system_ok({ a: 0x08 }); }
    if (!M[0x0737]) return o;
    yield* cf(0xE9);
    return yield* P.print_system_ok({ a: 0x20 });
  };
  // the owned things from $073D + Y (Y from top down to 0), named from $CE89 or $CE8E + Y; <none>
  const owned = function* (base, top, name) {
    M[0xA9] = 0;
    M[0xA8] = top;
    for (let y = top; !(y & 0x80); y = M[0xA8]) {
      if (M[base + y]) {
        M[0xA9] = (M[0xA9] + 1) & 255;
        const s = name + M[0xA8];
        yield* text(s & 255, (0xCE + (s >> 8)) & 255);
        yield* P.print_char({ a: 0x0D });
      }
      M[0xA8] = (M[0xA8] - 1) & 255;
    }
    if (!M[0xA9]) return yield* cf(0xF1);
    return { a: M[0xA9] };
  };
  P.status_onboard = function* () {
    yield* cf(0xF2);
    yield* owned(0x073D, 4, 0x89);
    yield* cf(0xE6);
    let y = M[0x0777];
    M[0xA8] = y;
    let o;
    do {
      const a = M[0x0766 + y];
      if (!(a & 0x80)) {
        yield* P.print_disk_text_cf9c({ a });
        M[0x4F] = (M[0x0D21] - 4) & 255;
        M[0x60] = M[0x076E + M[0xA8]]; M[0x61] = 0;
        yield* P.print_number({});
      } else yield* cf(0xD3);
      o = yield* P.print_char({ a: 0x0D });
      M[0xA8] = (M[0xA8] - 1) & 255;
      y = M[0xA8];
    } while (y);
    return R(o, { y: 0 });
  };
  P.status_person = function* () {
    yield* P.print_char({ a: 0x11 });
    yield* text(0x11, 0x07);
    yield* cf(0xE5);
    yield* cf(0xE4);
    M[0x60] = M[0x0728]; M[0x61] = M[0x0729];
    yield* P.print_number({});
    yield* cf(0xE3);
    M[0x60] = M[0x0726]; M[0x61] = M[0x0727];
    yield* P.print_number({});
    yield* cf(0x7E);
    const s = 0x78 + M[0x072A];
    yield* text(s & 255, (0xCF + (s >> 8)) & 255);
    yield* cf(0xE1); yield* P.print_standing({ y: 2 });
    yield* cf(0xE0); yield* P.print_standing({ y: 1 });
    yield* cf(0xDF); yield* P.print_standing({ y: 0 });
    yield* text(0xCB, 0xCE);
    return yield* owned(0x0742, 0x0F, 0x8E);
  };
  // standing -2 to 2 as hated, disliked, neutral, liked or ally ($CFDE less standing + 2)
  P.print_standing = function* (r) {
    M[0xA8] = (M[0x072E + r.y] + 2) & 255;
    const s = 0xDE - M[0xA8];
    return yield* text(s & 255, (0xCF - (s < 0 ? 1 : 0)) & 255);
  };
  P.print_system_ok = function* (r) {
    return yield* cf((r.a & M[0x0409]) ? 0xE7 : 0xE8);
  };

  // ---- the shops
  const goodDay = () => P.shop_good_day();
  // The cargo merchant: BUY CARGO, SELL CARGO, DONE
  P.cargo_merchant = function* () {
    yield* P.show_credits();
    P.clear_text_page();
    P.select_window({ y: 4 });
    yield* cf(0xD2);
    for (;;) {
      M[0x4F] = 0x1B; M[0x50] = 0xAF;
      M[0x79] = 0; M[0x7A] = 0x65; M[0x7B] = 0xB0;
      const m = yield* P.menu({ a: 3, y: 0x0A });
      if (m.y === 0) yield* P.cargo_buy();
      else if (m.y === 2) return yield* goodDay();
      else yield* P.cargo_sell();
    }
  };
  // The day's goods: the generator from the day's seed, four to six kinds, each kept when its
  // class's availability plus a random 0-99 reaches 100 (as a byte); the kinds taken marked at
  // $A4 + kind ($A4 itself is never cleared)
  P.cargo_buy = function* () {
    for (let y = 0x13; y; y--) M[0xA4 + y] = 0;
    P.random_reseed();
    M[0x94] = (P.random_upto({ a: 2 }).a + 4) & 255;
    M[0x95] = 0;
    do {
      for (;;) {
        const a = P.random_upto({ a: 0x13 }).a;
        if (M[0xA4 + a]) continue;
        M[0x96] = a;
        M[0x97] = M[0x563D + (a >> 2)];
        if (((P.random_upto({ a: 0x63 }).a + M[0x97]) & 255) >= 0x64) break;
      }
      M[0x9E + M[0x95]] = M[0x96];
      M[0xA4 + M[0x96]] = (M[0xA4 + M[0x96]] + 1) & 255;
      M[0x95] = (M[0x95] + 1) & 255;
    } while (M[0x95] !== M[0x94]);
    P.select_window({ y: 4 });
    yield* cf(0xCE);
    yield* P.list_goods();
    for (;;) {
      P.select_window({ y: 4 });
      const p = yield* P.pick_line();
      if (p.up) return R(p, { up: undefined });
      yield* P.buy_one({ y: (p.y + 1) & 255 });
    }
  };
  P.cargo_sell = function* () {
    let c = P.cargo_count();
    if (c.z) { P.select_window({ y: 2 }); return yield* P.print_message({ x: 0xCB, a: 0xCF }); }
    M[0x94] = c.x;
    P.select_window({ y: 4 });
    yield* cf(0xCD);
    for (;;) {
      P.select_window({ y: 4 });
      yield* cf(0xCC);
      let x = 0;
      for (let y = 7; y >= 0; y--) {
        const a = M[0x0767 + y];
        if (!(a & 0x80)) { M[(0x9E + x) & 255] = a; x = (x + 1) & 255; }
      }
      yield* P.list_goods();
      const p = yield* P.pick_line();
      if (p.up) return R(p, { up: undefined });
      yield* P.sell_one({ y: (p.y + 1) & 255 });
      c = P.cargo_count();
      if (c.z) return yield* P.shop_anything_else();
      M[0x94] = c.x;
    }
  };
  P.sell_one = function* (r) {
    M[0x96] = M[0x9D + r.y];
    P.cargo_price({ a: M[0x96] });
    P.add_credits();
    P.cargo_remove({ a: M[0x96] });
    P.select_window({ y: 2 });
    yield* P.print_message({ x: M[0x60] < 5 ? 0xCF : 0xCA, a: 0xCF });
    return yield* P.show_credits();
  };
  P.buy_one = function* (r) {
    M[0x96] = M[0x9D + r.y];
    if (P.cargo_count().n) { P.select_window({ y: 2 }); return yield* P.print_message({ x: 0xC9, a: 0xCF }); }
    P.cargo_price({ a: M[0x96] });
    if (!P.pay_credits().c) return yield* P.shop_short();
    P.cargo_add({ a: M[0x96], x: M[0x60] });
    return yield* P.shop_bought();
  };
  // One of the $94 lines or DONE, the bar from the window's left 18 rows below its top. DONE
  // drops the caller's return (up), after "Could I interest you in anything else?"
  P.pick_line = function* () {
    M[0x4F] = M[0x0D20];
    M[0x50] = (M[0x0D22] - 0x12) & 255;
    M[0x79] = 0;
    const m = yield* P.menu_choose({ a: (M[0x94] + 1) & 255, y: 0x14 });
    if (m.y !== M[0x94]) return m;
    return R(yield* P.shop_anything_else(), { up: 1 });
  };
  P.shop_anything_else = function* () {
    P.select_window({ y: 4 });
    return yield* text(0x80, 0xB0);
  };
  P.shop_bought = function* () {
    P.select_window({ y: 2 });
    yield* P.print_message({ x: 0xA8, a: 0xB0 });
    return yield* P.show_credits();
  };
  P.shop_short = function* () {
    P.select_window({ y: 2 });
    return yield* P.print_message({ x: 0xC2, a: 0xB0 });
  };
  P.shop_good_day = function* () {
    P.select_window({ y: 2 });
    return yield* P.print_message({ x: 0xB9, a: 0xB0 });
  };
  // the $94 kinds listed at $9E with their prices, then DONE
  P.list_goods = function* () {
    M[0x95] = 0;
    do {
      const a = M[0x9E + M[0x95]];
      yield* P.print_disk_text_cf9c({ a });
      M[0x4F] = (M[0x0D21] - 4) & 255;
      P.cargo_price({ a });
      yield* P.print_number({});
      yield* P.print_char({ a: 0x0D });
      M[0x95] = (M[0x95] + 1) & 255;
    } while (M[0x95] !== M[0x94]);
    return yield* text(0x2A, 0x0D);
  };
  // Cargo kind A's price in $60/$61: 1 for kinds 20 on; otherwise its class's base price plus a
  // random part up to an eighth of it (from the day's seed), times 2 to 5 by its place in the class
  P.cargo_price = function (r) {
    M[0x99] = r.a & 3;
    M[0x61] = 0;
    const cls = r.a >> 2;
    if (cls >= 5) { M[0x60] = 1; return { a: 1, x: r.x, y: r.a }; }
    M[0x60] = M[0x5638 + cls];
    P.random_reseed();
    const k = P.random_upto({ a: M[0x60] >> 3 }).a;
    M[0x60] = M[0x80] = (k + M[0x60]) & 255;
    let x = M[0x99];
    do {
      const t = M[0x60] + M[0x80];
      M[0x60] = t & 255;
      if (t > 255) M[0x61] = (M[0x61] + 1) & 255;
      x = (x - 1) & 255;
    } while (!(x & 0x80));
    return { a: M[0x60], x, y: k };
  };
  // The STARSHIP OUTFITTER: WEAPONS, SHIELDS, ECM UNITS (with the pilot's license), SPECIAL, DONE
  P.outfitter = function* () {
    yield* P.show_credits();
    P.clear_text_page();
    P.select_window({ y: 4 });
    yield* cf(0xC6);
    for (;;) {
      M[0x4F] = 0x1B; M[0x50] = 0xAF;
      M[0x79] = 0; M[0x7A] = 0x9D; M[0x7B] = 0xB3;
      const y = (yield* P.menu({ a: 5, y: 0x0A })).y;
      if (y < 3) {
        if (!M[0x074D]) { yield* cf(0xC1); yield* P.wait_key(); }
        else if (y === 0) yield* P.buy_laser();
        else if (y === 1) yield* P.buy_shield();
        else yield* P.buy_ecm();
      } else if (y === 3) yield* P.buy_special();
      else { P.copy_ship_stats(); return yield* goodDay(); }
      yield* P.shop_anything_else();
    }
  };
  // a price list and a pick of n items, the last DONE; each other pick to bought(y)
  const shopList = function* (list, n, bought) {
    P.select_window({ y: 4 });
    yield* cf(list);
    for (;;) {
      P.select_window({ y: 4 });
      listBar();
      const m = yield* P.menu_choose({ a: n, y: 0x14 });
      if (m.y === n - 1) return m;
      yield* P[bought]({ y: m.y });
    }
  };
  P.buy_laser = function* () { return yield* shopList(0xC5, 5, 'laser_bought'); };
  P.buy_shield = function* () { return yield* shopList(0xBC, 7, 'shield_bought'); };
  P.buy_ecm = function* () { return yield* shopList(0xC4, 4, 'ecm_bought'); };
  // the refusal when the grade asked for (y) is not above the ship's (have): Z set when the same
  const refuse = (y, have) => P.shop_refuse({ z: y === have ? 1 : 0 });
  P.laser_bought = function* (r) {
    const y = (r.y + 1) & 255;
    if (y <= M[0x0739]) return yield* refuse(y, M[0x0739]);
    M[0x94] = y;
    M[0x60] = M[0xB3C7 + (y << 1)]; M[0x61] = M[0xB3C8 + (y << 1)];
    if (!P.pay_credits().c) return yield* P.shop_short();
    M[0x0739] = M[0x94];
    return yield* P.shop_bought();
  };
  // fore shields 1-3 (the high nybble of $073A, system bit $10), aft 4-6 (the low one, bit 8)
  P.shield_bought = function* (r) {
    const y = (r.y + 1) & 255, fore = y < 4;
    M[0x95] = fore ? y : (y - 3) & 255;
    const g = fore ? M[0x073A] >> 4 : M[0x073A] & 0x0F;
    if (g >= M[0x95]) return yield* refuse(g, M[0x95]);
    const p = yield* P.shield_price();
    if (p.up) return R(p, { up: undefined });
    if (fore) {
      M[0x95] = (M[0x95] << 4) & 255;
      M[0x073A] = (M[0x073A] & 0x0F) | M[0x95];
      M[0x0738] |= 0x10;
    } else {
      M[0x073A] = (M[0x073A] & 0xF0) | M[0x95];
      M[0x0738] |= 0x08;
    }
    return yield* P.shop_bought();
  };
  P.ecm_bought = function* (r) {
    const a = M[0xB3DD + r.y];
    if (a <= M[0x0737]) return yield* refuse(a, M[0x0737]);
    M[0x95] = a;
    M[0x60] = M[0xB3D7 + (r.y << 1)]; M[0x61] = M[0xB3D8 + (r.y << 1)];
    if (!P.pay_credits().c) return yield* P.shop_short();
    M[0x0737] = M[0x95];
    M[0x0738] |= 0x20;
    return yield* P.shop_bought();
  };
  // SPECIAL: a cargo pod (to 8 slots), an armour plate (to 500), the turbo thruster (once)
  P.buy_special = function* () {
    P.select_window({ y: 4 });
    yield* cf(0xC3);
    for (;;) {
      P.select_window({ y: 4 });
      listBar();
      const m = yield* P.menu_choose({ a: 4, y: 0x14 });
      const pay = function* (lo, hi) {
        M[0x60] = lo; M[0x61] = hi;
        if (P.pay_credits().c) return true;
        yield* P.shop_short();
        return false;
      };
      if (m.y === 0) {
        if (M[0x0777] >= 8) yield* P.shop_no_room();
        else if (yield* pay(0x96, 0)) { M[0x0777] = (M[0x0777] + 1) & 255; yield* P.shop_bought(); }
      } else if (m.y === 1) {
        if ((M[0x0735] | M[0x0736] << 8) >= 0x1F4) yield* P.shop_no_room();
        else if (yield* pay(0x45, 1)) {
          const s = M[0x0735] + 0x32;
          M[0x0735] = s & 255;
          if (s > 255) M[0x0736] = (M[0x0736] + 1) & 255;
          yield* P.shop_bought();
        }
      } else if (m.y === 2) {
        if (M[0x073F]) yield* P.shop_refuse({ a: 0, z: 1 });
        else if (yield* pay(0xDC, 5)) {
          M[0x073F] = (M[0x073F] + 1) & 255;
          yield* P.shop_bought();
          M[0x073C] = (M[0x073C] + 1) & 255;
        }
      } else return m;
    }
  };
  // Pays for shield grade $95; short, the caller returns too (up)
  P.shield_price = function* () {
    const i = (M[0x95] << 1) & 255;
    M[0x60] = M[0xB3CF + i]; M[0x61] = M[0xB3D0 + i];
    const p = P.pay_credits();
    if (p.c) return p;
    return R(yield* P.shop_short(), { up: 1 });
  };
  // "You already have one of those" with Z set, "We only sell upgrades" without
  P.shop_refuse = function* (r) {
    P.select_window({ y: 2 });
    return yield* P.print_message({ x: r.z ? 0xBD : 0xBE, a: 0xCF });
  };
  P.shop_no_room = function* () {
    P.select_window({ y: 2 });
    return yield* P.print_message({ x: 0xC2, a: 0xCF });
  };
  // SHIP REPAIR & SUPPLY: SUPPLIES, FIX SYSTEM, FIX ARMOR, DONE
  P.repair_shop = function* () {
    yield* P.show_credits();
    P.clear_text_page();
    P.select_window({ y: 4 });
    yield* cf(0x5F);
    for (;;) {
      M[0x4F] = 0x1B; M[0x50] = 0xAF;
      M[0x79] = 0; M[0x7A] = 0x24; M[0x7B] = 0xB6;
      const y = (yield* P.menu({ a: 4, y: 0x0A })).y;
      if (y === 0) yield* P.buy_ordnance();
      else if (y === 1) yield* P.fix_system();
      else if (y === 2) yield* P.fix_armour();
      else return yield* goodDay();
      yield* P.shop_anything_else();
    }
  };
  // SUPPLIES: six packs; room in the bay is a torpedo 1, an SM-1 or a Nova 2, under 21 in all
  // (the sum a byte, its carries running through the adds)
  P.buy_ordnance = function* () {
    P.select_window({ y: 4 });
    yield* cf(0x5C);
    for (;;) {
      P.select_window({ y: 4 });
      listBar();
      const m = yield* P.menu_choose({ a: 7, y: 0x14 });
      const y = m.y;
      if (y === 6) return m;
      M[0x98] = y;
      let a = M[0xB662 + y], c = 0;
      for (const v of [M[0x0734], M[0x0732], M[0x0732], M[0x0733], M[0x0733]]) { const t = a + v + c; a = t & 255; c = t >> 8; }
      if (a >= 0x15) {
        P.select_window({ y: 2 });
        yield* P.print_message({ x: 0x59, a: 0xCF });
        continue;
      }
      M[0x60] = M[0xB65C + y]; M[0x61] = 0;
      if (!P.pay_credits().c) return yield* P.shop_short();
      const k = M[0xB650 + M[0x98]];
      M[0x0732 + k] = (M[0x0732 + k] + M[0xB656 + M[0x98]]) & 255;
      yield* P.shop_bought();
    }
  };
  const noRepairs = function* () {
    P.select_window({ y: 2 });
    return yield* P.print_message({ x: 0x5E, a: 0xCF });
  };
  // FIX ARMOR: the damage ($99/$9A) priced three ways, a quarter of it plus one (at most 99) for
  // all of it, then half that plus one for a half, and again for a quarter
  P.fix_armour = function* () {
    const s = M[0x0735] - M[0x051D];
    M[0x99] = s & 255;
    M[0x9A] = (M[0x0736] - M[0x051E] - (s < 0 ? 1 : 0)) & 255;
    if (!(M[0x99] | M[0x9A])) return yield* noRepairs();
    P.select_window({ y: 4 });
    yield* cf(0x5A);
    M[0x50] = (M[0x0D22] - 0x24) & 255;
    M[0x97] = (M[0x9A] >> 1) | (M[0x9A] & 0x80);
    M[0x96] = (M[0x99] >> 1) | ((M[0x9A] & 1) << 7);
    M[0x96] = ((M[0x96] >> 1) + 1) & 255;
    if (M[0x96] > 0x63) M[0x96] = 0x63;
    M[0x98] = 0;
    let y = 0;
    do {
      M[0x4F] = (M[0x0D21] - 1) & 255;
      M[0xA1 + y] = M[0x96];
      yield* P.print_signed({ a: M[0x96] });
      yield* P.print_char({ a: 0x0D });
      M[0x96] = ((M[0x96] >> 1) + 1) & 255;
      M[0x98] = (M[0x98] + 1) & 255;
      y = M[0x98];
    } while (y !== 3);
    listBar();
    const m = yield* P.menu_choose({ a: 4, y: 0x14 });
    y = m.y;
    if (y === 3) return m;
    M[0x60] = M[0xA1 + y]; M[0x61] = 0;
    for (y = (y - 1) & 255; !(y & 0x80); y = (y - 1) & 255) {
      const c = M[0x9A] & 1;
      M[0x9A] >>= 1;
      const c2 = M[0x99] & 1;
      M[0x99] = (M[0x99] >> 1) | (c << 7);
      if (c2) { M[0x99] = (M[0x99] + 1) & 255; if (!M[0x99]) M[0x9A] = (M[0x9A] + 1) & 255; }
    }
    if (!P.pay_credits().c) return yield* P.shop_short();
    const t = M[0x051D] + M[0x99];
    M[0x051D] = t & 255;
    M[0x051E] = (M[0x051E] + M[0x9A] + (t >> 8)) & 255;
    return yield* P.shop_bought();
  };
  // FIX SYSTEM: the systems fitted ($0738) and knocked out ($0409), listed at $9B with their
  // prices; one fixed at a time until none is left or DONE
  P.fix_system = function* () {
    for (;;) {
      let a = M[0x0409] & M[0x0738], x = 0;
      for (let y = 0; y < 6; y++) { if (a & 1) { M[0x9B + x] = y; x++; } a >>= 1; }
      M[0x94] = x;
      if (!x) return yield* noRepairs();
      P.select_window({ y: 4 });
      yield* cf(0x5D);
      M[0x96] = 0;
      do {
        const s = M[0x9B + M[0x96]], t = s + 0x53;
        const hi = (0xCF + (t >> 8)) & 255;
        yield* P.print_text({ a: hi, x: t & 255, y: hi });
        M[0x4F] = (M[0x0D21] - 1) & 255;
        yield* P.print_signed({ a: M[0xB668 + s] });
        yield* P.print_char({ a: 0x0D });
        M[0x96] = (M[0x96] + 1) & 255;
      } while (M[0x96] !== M[0x94]);
      yield* P.print_text({ a: M[0x96], x: 0x2A, y: 0x0D });
      listBar();
      const m = yield* P.menu_choose({ a: (M[0x94] + 1) & 255, y: 0x14 });
      if (m.y === M[0x94]) return m;
      M[0x96] = M[0x9B + m.y]; M[0x95] = m.y;
      M[0x60] = M[0xB668 + M[0x96]]; M[0x61] = 0;
      if (!P.pay_credits().c) { yield* P.shop_short(); continue; }
      M[0x0409] ^= M[0xB64A + M[0x96]];
      yield* P.shop_bought();
      M[0x94] = (M[0x94] - 1) & 255;
      if (!M[0x94]) return { a: 0, y: 0 };
    }
  };

  // ---- TALK and INSPECT's search: the four squares round the player, A = 1 for a person, $FF for
  // a thing, 0 for either. None: Y $FF. More than one: "In what direction?" and a straight step
  // from the keys or the stick (RETURN or SPACE gives up); the wait reads, then ends at the return
  // from the game's own read ($B6A3).
  P.find_adjacent = function* (r) {
    M[0x8C] = r.a; M[0x8D] = 0;
    P.look_square({ x: 0, y: 1 });
    P.look_square({ x: 0, y: 0xFF });
    P.look_square({ x: 1, y: 0 });
    P.look_square({ x: 0xFF, y: 0 });
    M[0x8D] = (M[0x8D] - 1) & 255;
    if (M[0x8D] & 0x80) return { y: 0xFF, n: 1, z: 0 };
    if (M[0x8D]) {
      yield* P.print_message({ x: 0x23, a: 0xB7 });
      for (;;) {
        const k = P.key_direction();
        yield { cp: 0xB6A3, cycles: 60 };
        if (k.c) return { a: k.a, y: 0xFF, n: 1, z: 0 };
        M[0x8F] = k.x; M[0x90] = k.y;
        if (!(k.x | k.y) || (k.x & k.y)) continue;
        M[0x8D] = 0;
        P.look_square({ x: k.x, y: k.y });
        M[0x8D] = (M[0x8D] - 1) & 255;
        if (!(M[0x8D] & 0x80)) break;
      }
    }
    const y = M[0x8E];
    return { y, n: y >> 7, z: y ? 0 : 1 };
  };
  P.CHECKPOINTS.push(0xB6A3);
  // The square X across, Y down from the player: its first entry counts ($8D, the entry in $8E)
  // unless its action byte has bit 4 set or it is the wrong kind (a type below $80 is a person).
  // An empty square that is a counter (a blocking tile with kind bits 4-5 clear) is looked
  // across, once, for a person.
  P.look_square = function (r) {
    M[0x8F] = r.x; M[0x90] = r.y; M[0x91] = 0;
    let x = r.x, y = r.y;
    for (;;) {
      x = (x + M[0x5510]) & 255; M[0x8A] = x;
      y = (y + M[0x5530]) & 255; M[0x8B] = y;
      const s = P.sector_entries({ x, y });
      if (s.y) {
        const e = M[ptr(0x74)], t = M[0x5590 + e];
        const a = M[0x5618 + e] & 0x10;
        if (a) return { a, x: e, y: t };
        const want = M[0x8C];
        if (want && ((want & 0x80) ? !(t & 0x80) : (t & 0x80))) return { a: t, x: e, y: t };
        M[0x8D] = (M[0x8D] + 1) & 255; M[0x8E] = e;
        return { a: want ? t : 0, x: e, y: t };
      }
      if (M[0x91]) return { a: M[0x91] };
      M[0x91] = (M[0x91] + 1) & 255;
      if (M[0x8C] & 0x80) return { a: M[0x8C] };
      const k = P.sector_kind({ x: M[0x8A], y: M[0x8B] });
      if (!(k.a & 0x80)) return k;
      if (k.a & 0x30) return R(k, { a: k.a & 0x30 });
      x = (M[0x8F] << 1) & 255; y = (M[0x90] << 1) & 255;
    }
  };
  // A locked door: USE CARD, PICK LOCK, DONE until it opens or the alarm goes; a safe (type $A1)
  // has its own menu
  P.act_lock = function* (r) {
    M[0x9E] = r.y; M[0xA0] = 0;
    M[0x9F] = M[0x5590 + r.y];
    if (M[0x9F] === 0xA1) return yield* P.act_safe();
    let m;
    do {
      P.clear_text_page();
      P.select_window({ y: 4 });
      yield* cf(0x93);
      M[0x7A] = 0x4A; M[0x7B] = 0xB8;
      m = yield* P.lock_menu({ y: 3 });
      if (m.y === 1) yield* P.pick_lock();
      else if (m.y === 2) return R(m, { y: 1 });
      else yield* P.use_card();
    } while (!M[0xA0]);
    return { a: M[0xA0] };
  };
  const andKey = function* (x) { yield* cf(x); return yield* P.wait_key(); };
  P.use_card = function* () {
    if (!M[0x0742]) return yield* andKey(0x96);
    if (M[0x55B0 + M[0x9E]]) return yield* andKey(0x95);
    P.remove_entry({ y: M[0x9E] });
    M[0xA0] = (M[0xA0] + 1) & 255;
    return yield* andKey(0x94);
  };
  // PICK LOCK. Someone in sight who can be walked through spots the player: the test meant to
  // make that half the time reads random's first byte ($AD, LDA) instead of calling it, so it is
  // always. Otherwise a random byte: under $55 the lock opens (a safe's credits taken), under $AA
  // the alarm goes, else nothing.
  P.pick_lock = function* () {
    const alarm = function* (x) {
      yield* cf(x);
      yield* P.wait_key();
      M[0xA0] = (M[0xA0] + 1) & 255;
      return P.raise_alarm({ a: M[0x9F] });
    };
    if (!P.find_watcher().z && (M[0xA2C5] & 0x80)) return yield* alarm(0x97);
    const a = P.random().a;
    if (a < 0x55) {
      M[0xA0] = (M[0xA0] + 1) & 255;
      P.remove_entry({ y: M[0x9E] });
      yield* cf(0x91);
      if (M[0x9F] === 0xA1) yield* P.safe_loot();
      return yield* P.wait_key();
    }
    if (a < 0xAA) return yield* alarm(0x90);
    return yield* andKey(0x92);
  };
  P.act_safe = function* () {
    for (;;) {
      P.clear_text_page();
      P.select_window({ y: 4 });
      yield* cf(0x98);
      M[0x7A] = 0x4C; M[0x7B] = 0xB8;
      const m = yield* P.lock_menu({ y: 2 });
      if (m.y) return R(m, { a: m.y });
      yield* P.pick_lock();
      if (M[0xA0]) return { a: M[0xA0] };
    }
  };
  P.safe_loot = function* () {
    yield* cf(0x99);
    M[0x60] = (P.random_upto({ a: 0x63 }).a + 1) & 255; M[0x61] = 0;
    P.add_credits();
    return yield* P.show_credits();
  };
  // The menu of Y items at ($7A), at column $1B, row $AF, the cursor kept
  P.lock_menu = function* (r) {
    const row = M[0x50], col = M[0x4F];
    M[0x4F] = 0x1B; M[0x50] = 0xAF; M[0x79] = 0;
    const m = yield* P.menu({ a: r.y, y: 0x0A });
    M[0x4F] = col; M[0x50] = row;
    return { a: row, x: m.x, y: m.y, n: row >> 7, z: row ? 0 : 1 };
  };
  // A chaser within one square catches the player: at alarm 2 or 1 death; otherwise the visit
  // ends and the base bars the player ($0783 = 2), moved along (alarm 4) or fined: 100 for a
  // safe, 25 otherwise, any part unpaid added to the bounty
  P.guards_check = function* () {
    let y = 0x1F;
    for (; y; y--) if ((M[0x5550 + y] & 7) === 3 && P.entry_distance({ y }).a < 2) break;
    if (!y) return { a: M[0x5551] & 7, y: 0 };
    const al = M[0x083B];
    if (al === 2 || al === 1) { M[0x0835] = al === 2 ? 0xFE : 0xFD; return P.player_destroyed(); }
    P.select_window({ y: 4 });
    P.clear_text_page();
    M[0xA673] = (M[0xA673] + 1) & 255;
    M[0x0783] = 2;
    if (M[0x083B] === 4) yield* text(0xD7, 0xCE);
    else {
      M[0x95] = M[0x083B] === 0xA1 ? 0 : 1;
      yield* text(0xD6, 0xCE);
      const i = M[0x95] << 1;
      yield* text(M[0xB934 + i], M[0xB935 + i]);
      M[0x60] = M[0xB938 + M[0x95]]; M[0x61] = 0;
      if (P.pay_credits().c) yield* text(0xD3, 0xCE);
      else {
        M[0x60] = (M[0x60] - M[0x0728]) & 255;
        const t = M[0x0726] + M[0x60];
        M[0x0726] = t & 255;
        if (t > 255) M[0x0727] = (M[0x0727] + 1) & 255;
        M[0x0728] = 0; M[0x0729] = 0;
        yield* text(0xD2, 0xCE);
      }
    }
    yield* text(0xD1, 0xCE);
    return yield* P.wait_key();
  };
  // The larger of the distances across and down between entry Y and the player
  P.entry_distance = function (r) {
    const dist = (p, q) => {
      const a = (p - q) & 255;
      return (a & 0x80) ? ((a ^ 0xFF) + 1 + (p >= q ? 1 : 0)) & 255 : a;
    };
    M[0x94] = dist(M[0x5510 + r.y], M[0x5510]);
    const a = dist(M[0x5530 + r.y], M[0x5530]);
    return { a: a >= M[0x94] ? a : M[0x94], x: r.x, y: r.y };
  };
  // An item: "You find a" and its name, PICK UP or DONE; the transmutation coil has its scene
  P.act_item = function* (r) {
    M[0x9E] = r.y;
    M[0x9F] = M[0x5590 + r.y] & 0x7F;
    if (M[0x9F] === 8) return yield* P.act_coil();
    P.select_window({ y: 2 });
    yield* P.print_message({ x: 0xB9, a: 0xCE });
    const s = M[0x9F] + 0x89, hi = (0xCE + (s >> 8)) & 255;
    yield* P.print_text({ a: hi, x: s & 255, y: hi });
    M[0x4F] = 0x1B; M[0x50] = 0xAF;
    M[0x79] = 0; M[0x7A] = 0xB8; M[0x7B] = 0xB9;
    const m = yield* P.menu({ a: 2, y: 0x0A });
    if (m.y === 1) return R(m, { y: 0 });
    return takeItem();
  };
  // the item taken off the map, and for items 0-25 one fewer left and the player's
  const takeItem = () => {
    const o = P.remove_entry({ y: M[0x9E] });
    const x = M[0x9F];
    if (x >= 0x1A) return R(o, { x });
    M[0x0752 + x] = (M[0x0752 + x] - 1) & 255;
    M[0x073D + x] = 1;
    return { a: 1, x, y: o.y };
  };
  P.act_coil = function* () {
    P.select_window({ y: 4 });
    P.clear_text_page();
    if (M[0x074F]) {
      yield* text(0x87, 0xCE);
      yield* P.wait_key();
      return takeItem();
    }
    yield* text(0x88, 0xCE);
    return yield* P.wait_key();
  };
  // "CRs " and the credits at column $1B, row $3F, under the date
  P.show_credits = function* () {
    M[0x4F] = 0x1B; M[0x50] = 0x3F;
    const o = yield* P.print_text({ a: 0x3F, x: 0xD8, y: 0xB9 });
    M[0x60] = M[0x0728]; M[0x61] = M[0x0729];
    return yield* P.print_number(o);
  };
  // the highest entry whose x is negative (free), or $FF
  P.free_entry = function () {
    let y = 0x1F;
    while (!(y & 0x80) && !(M[0x5510 + y] & 0x80)) y = (y - 1) & 255;
    return flags(y, { y });
  };
  // Entry Y off the map. Y comes back doubled, as the game's does.
  P.remove_entry = function (r) {
    const y = r.y;
    M[0x5550 + y] = 0; M[0x55B0 + y] = 0; M[0x5618 + y] = 0;
    M[0x5510 + y] = 0xFF; M[0x5570 + y] = 0xFF; M[0x5590 + y] = 0xFF;
    const i = (y << 1) & 255;
    M[0x55D0 + i] = 0xFF; M[0x55D1 + i] = 0xFF;
    return { a: 0xFF, x: r.x, y: i, n: 1, z: 0 };
  };

  // ---- what the player sees. The chart window's 99 cells, 11 to a row, from $FA00; their
  // counts or flags at $FA63. $8A counts the column down from 10 as the cells go down from 98.
  const column = () => { M[0x8A] = (M[0x8A] - 1) & 255; if (M[0x8A] & 0x80) M[0x8A] = 0x0A; };
  // Walls face down (kind bits 4-5 $20), right ($10) or both ($30). Each wall whose facing side
  // is blacked out is flagged, then drawn as an edge: tiles $6B, $6C, $70 and $71 become $63,
  // $62, $60 and $61, any other $64-$67 by whether the cells left of it and above it are lit.
  P.wall_edges = function () {
    let y = 0x62;
    M[0x8A] = 0x0A;
    do {
      const x = M[0xFA00 + y];
      let a = M[0x5000 + x] & 0x30;
      if (a) a = P.wall_flag({ a, x, y }).a;
      M[0xFA63 + y] = a;
      column();
      y = (y - 1) & 255;
    } while (!(y & 0x80));
    y = 0x62;
    M[0x8A] = 0x0A;
    const EDGE = { 0x6B: 0x63, 0x6C: 0x62, 0x70: 0x60, 0x71: 0x61 };
    do {
      if (M[0xFA63 + y]) {
        M[0x8B] = 0;
        let a = EDGE[M[0xFA00 + y]];
        if (a === undefined) {
          if (M[0x8A] && !M[0xFA62 + y] && M[0xF9FF + y] !== 0x7D) M[0x8B] = (M[0x8B] + 1) & 255;
          const x = y - 0x0B;
          const above = x >= 0 && !M[0xFA63 + x] && M[0xFA00 + x] !== 0x7D;
          a = above ? (M[0x8B] ? 0x65 : 0x67) : (M[0x8B] ? 0x66 : 0x64);
        }
        M[0xFA00 + y] = a;
      }
      column();
      y = (y - 1) & 255;
    } while (y);
    return { a: M[0x8A], y: 0 };
  };
  // 1 when the side the wall in cell Y (kind bits A, tile X) faces is off the window or blacked
  // out: below for $20, right for $10; for $30, tile $79 looks right and then below, any other
  // the cell below and to the right (an ADC with the carry set)
  P.wall_flag = function (r) {
    const y = r.y;
    const out = s => (s >= 0x63 || M[0xFA00 + s] === 0x7D ? 1 : 0);
    const edge = M[0x8A] >= 0x0A;
    let a;
    if (r.a === 0x20) a = out(y + 0x0B);
    else if (r.a < 0x20) a = edge || M[0xFA01 + y] === 0x7D ? 1 : 0;
    else if (r.x === 0x79) a = edge || M[0xFA01 + y] === 0x7D ? out(y + 0x0B) : 0;
    else a = edge ? 1 : out(y + 0x0C);
    return { a, x: r.x, y };
  };
  // $FA63-$FAC5 cleared, the room flood-filled from the player, and what it did not reach
  // blacked out
  P.sight = function () {
    for (let y = 0x62; y >= 0; y--) M[0xFA63 + y] = 0;
    P.flood_fill();
    for (let y = 0x62; y >= 0; y--) if (!M[0xFA63 + y]) M[0xFA00 + y] = 0x7D;
    return { a: 0x7D, x: M[0xFA63], y: 0xFF };
  };
  // A scanline fill from the player's cell (column 5, row 4) through floor: each run is followed
  // right to its wall and then left, seeds for the rows above and below kept on a stack of seven
  // ($86-$8C across, $8D-$93 down), and each cell counted with the cells above and below ($BBB0)
  P.flood_fill = function () {
    M[0x84] = 5; M[0x85] = 4; M[0x80] = 0;
    // the row next to the run ($85 already on it), its seed count at k: a new seed where the
    // floor starts again after a wall
    const side = k => {
      if (M[k]) {
        if (!P.cell_wall().a) return;
        M[k] = (M[k] - 1) & 255;
        if (!M[k]) return;
      }
      if (P.cell_marked().a || P.cell_wall().a) return;
      P.push_seed();
      M[k] = (M[k] + 1) & 255;
    };
    for (;;) {
      while (M[0x84] < 0x0A) { M[0x84] = (M[0x84] + 1) & 255; if (P.cell_wall().a) break; }
      M[0x81] = 0; M[0x82] = 0; M[0x83] = 0;
      for (;;) {
        M[0x85] = (M[0x85] - 1) & 255;
        if (!(M[0x85] & 0x80)) side(0x81);
        M[0x85] = (M[0x85] + 2) & 255;
        if (M[0x85] < 9) side(0x82);
        M[0x85] = (M[0x85] - 1) & 255;
        P.mark_cell();
        if (M[0x83]) break;
        M[0x84] = (M[0x84] - 1) & 255;
        if (M[0x84] & 0x80) break;
        if (P.cell_wall().a) M[0x83] = (M[0x83] + 1) & 255;
      }
      if (!M[0x80]) return { a: 0 };
      M[0x80] = (M[0x80] - 1) & 255;
      const y = M[0x80];
      M[0x84] = M[0x86 + y]; M[0x85] = M[0x8D + y];
    }
  };
  P.push_seed = function () {
    const y = M[0x80];
    if (y >= 7) return { y };
    M[0x86 + y] = M[0x84]; M[0x8D + y] = M[0x85];
    M[0x80] = (M[0x80] + 1) & 255;
    return { a: M[0x85], y };
  };
  const cell = () => (M[0x0D33 + M[0x85]] + M[0x84]) & 255;
  P.mark_cell = function () {
    const y = M[0x85], x = cell();
    M[0xFA63 + x] = (M[0xFA63 + x] + 1) & 255;
    if (y) M[0xFA58 + x] = (M[0xFA58 + x] + 1) & 255;
    if (y < 8) M[0xFA6E + x] = (M[0xFA6E + x] + 1) & 255;
    return { x, y };
  };
  P.cell_wall = function () {
    const x = cell(), t = M[0xFA00 + x];
    return flags(M[0x5000 + t] & 0x30, { x, y: t });
  };
  P.cell_marked = function () {
    const x = cell();
    return flags(M[0xFA63 + x], { x, y: M[0x85] });
  };

  // ---- the bar: GREEN HEAD, BLUB LIGHT, RIGELIAN (1, 2, 3 credits) or DONE. A drink: one time
  // in ten the player gets drunk, half the time a word on it, and one time in 4, 3 or 2 a rumour
  // (three tries) or else gossip. $98-$A1 the rumours not yet told this visit.
  P.bartender = function* () {
    for (let y = 9; y >= 0; y--) M[0x98 + y] = 1;
    for (;;) {
      P.clear_text_page();
      P.select_window({ y: 4 });
      if (M[0x083A]) {
        yield* andKey(0x51);
        return yield* goodDay();
      }
      yield* cf(0x50);
      for (;;) {
        M[0x4F] = 0x1B; M[0x50] = 0xAF;
        M[0x79] = 0; M[0x7A] = 0xD3; M[0x7B] = 0xBC;
        const y = (yield* P.menu({ a: 4, y: 0x0A })).y;
        M[0x94] = y;
        if (y === 3) return yield* goodDay();
        if (M[0x083A]) break;
        M[0x60] = (y + 1) & 255; M[0x61] = 0;
        if (!P.pay_credits().c) return yield* P.shop_short();
        yield* P.show_credits();
        yield* P.print_char({ a: 0x11 });
        yield* cf(0x4F);
        if (P.random().a < 0x19) M[0x083A] = (M[0x083A] + 1) & 255;
        if (!(P.random().a & 0x80)) {
          let a = P.random_upto({ a: 1 }).a, c = 0, t;
          t = a + M[0x94]; a = t & 255; c = t >> 8;
          t = a + M[0x94] + c; a = t & 255; c = t >> 8;
          t = a + 0x48 + c; a = t & 255; c = t >> 8;
          yield* text(a, (0xCF + c) & 255);
        }
        if (!P.random_upto({ a: (3 - M[0x94]) & 255 }).a) {
          let p = P.pick_rumour();
          if (p.c) p = P.pick_rumour();
          if (p.c) p = P.pick_rumour();
          const t = p.c ? P.random_upto({ a: 7 }).a + 0x40 : p.a + 0x35;
          yield* text(t & 255, (0xCF + (t >> 8)) & 255);
        }
        yield* cf(0x4E);
      }
    }
  };
  // Rumour n at random: carry clear when it is not told yet this visit and its state is 1 or 0,
  // which is counted down
  P.pick_rumour = function () {
    const x = P.random_upto({ a: 9 }).a;
    let y = M[0x98 + x];
    if (!y) return { a: x, x, y, c: 1 };
    M[0x98 + x] = (M[0x98 + x] - 1) & 255;
    y = M[0x0784 + x];
    if ((y & 0x80) || y >= 2) return { a: x, x, y, c: 1 };
    M[0x0784 + x] = (M[0x0784 + x] - 1) & 255;
    return { a: x, x, y, c: 0 };
  };

  // ---- SEG1A ($E400)
  // The alarm raised with value A, unless one is up: every guard (type $21) given motion kind 3,
  // or 1 when the value is 3; the siren unless the value is 1
  P.raise_alarm = function (r) {
    if (M[0x083B]) return { a: r.a, x: M[0x083B], y: r.y, z: 0 };
    M[0x083B] = r.a;
    M[0x8A] = r.a === 3 ? 1 : 3;
    for (let y = 0x1F; y; y--) if (M[0x5590 + y] === 0x21) M[0x5550 + y] = (M[0x5550 + y] & 0xF8) | M[0x8A];
    if (M[0x083B] === 1) return { a: 1, x: r.x, y: 0, z: 1 };
    return P.sound_play({ a: 2 });
  };
  // The chart's part of the screen cleared for a text page: x 8 to $B7, rows $40 to $BF
  P.clear_text_page = function () {
    M[0x51] = 8; M[0x52] = 0; M[0x86] = 0; M[0x85] = 0xB7; M[0x53] = 0x40; M[0x87] = 0xBF;
    M[0x41] = (M[0x85] - M[0x51]) & 255;
    M[0x42] = (M[0x87] - M[0x53]) & 255;
    P.set_window({ a: M[0x52], x: M[0x51], y: M[0x53] });
    P.set_colour({ x: 1 });
    return P.fill_window();
  };
  // On arrival: rumours let out by the plot; a visitor from the 32 scripts at the map's place for
  // one; items already taken, Duchess Avenstar once she has left and script 13's person once the
  // repair droid is the player's, taken off (remove_entry's Y comes back doubled, and the loops
  // go on from there); and Trochal's and Bassruti's alarms
  P.base_setup = function () {
    const plot = [[0x0790, 2], [0x0791, 3], [0x0793, 4], [0x078E, 5]];
    for (const [a, x] of plot) if (M[a]) P.release_rumour({ x });
    for (const [a, x] of [[0x0786, 6], [0x0785, 7], [0x078B, 8]]) if (M[a] & 0x80) P.release_rumour({ x });
    if (M[0x0743]) P.release_rumour({ x: 9 });
    if (!(M[0x5611] & 0x80)) {
      P.random_reseed();
      let x;
      do x = P.random().a & 0x1F; while (M[0x08B5 + x] & 0x80);
      const pic = M[0x08B5 + x];
      const y = P.free_entry().y;
      M[0x5510 + y] = M[0x5611]; M[0x5530 + y] = M[0x5612];
      M[0x5570 + y] = pic; M[0x5590 + y] = x; M[0x5550 + y] = 0x82; M[0x5618 + y] = 0x85;
    }
    let y = 0x1F;
    do {
      const t = M[0x5590 + y];
      if ((t & 0x80) && (t & 0x7F) < 0x1A && !M[0x0752 + (t & 0x7F)]) y = P.remove_entry({ y }).y;
      y = (y - 1) & 255;
    } while (y);
    y = 0x1F;
    do {
      const t = M[0x5590 + y];
      if (!(t & 0x80) && ((t === 0 && M[0x0790]) || (t === 0x0D && M[0x0740]))) y = P.remove_entry({ y }).y;
      y = (y - 1) & 255;
    } while (y);
    if (M[0x0779] === 0x36) {
      if (M[0x0793]) return P.raise_alarm({ a: 3 });
      for (y = 0x1F; y; y--) if (M[0x5590 + y] === 0x86) { M[0x5510 + y] = 0xFF; break; }
      return { y };
    }
    if (M[0x0779] === 0x35 && M[0x077A] === 0x31) return P.raise_alarm({ a: 1 });
    return { y: 0 };
  };
  P.release_rumour = function (r) {
    const a = M[0x0784 + r.x];
    if (a === 2) M[0x0784 + r.x] = 1;
    return { a, x: r.x };
  };

  // ---- talk. A script is a list of nodes from ($BF): a node's first byte, with bit 7 clear, is
  // its text (one of the script's 64 disk texts from ($BA)); with bit 6 set, an action and its
  // operand follow; then the answer byte and its choices' bytes. ($B6) is the node.
  P.talk_script = function* (r) {
    M[0xC8] = r.y;
    M[0xB9] = M[0x5590 + r.y];
    const y = (M[0xB9] << 1) & 255;
    const s = M[0x5700 + y] + 0x40;
    M[0xBF] = s & 255;
    M[0xC0] = (M[0x5701 + y] + 0x57 + (s >> 8)) & 255;
    M[0xB6] = M[0xBF]; M[0xB7] = M[0xC0];
    const w = ((y << 2) & 255) << 3;
    M[0xBA] = w & 255;
    M[0xBB] = ((w >> 8) + 0xC0) & 255;
    for (let i = 3; i >= 0; i--) M[0x08B1 + i] = 0;
    M[0x0835] = 0;
    P.select_window({ y: 2 });
    yield* P.clear_window({});
    let n;
    do {
      yield* P.talk_say();
      yield* P.talk_do();
      n = yield* P.talk_next(yield* P.talk_answer());
    } while (!n.c);
    return P.talk_end({ y: M[0xC8] });
  };
  P.talk_say = function* () {
    P.clear_text_page();
    P.select_window({ y: 4 });
    const b = M[ptr(0xB6)];
    if (b & 0x80) return { a: b, y: 0, n: 1, z: 0 };
    const s = (b & 0x3F) + M[0xBA];
    return yield* text(s & 255, (M[0xBB] + (s >> 8)) & 255);
  };
  // the action: its routine's address less one from talk_ops ($E7B1), reached by an RTS
  const OPS = { 0xE758: 'talk_set1', 0xE75F: 'talk_set0', 0xE763: 'talk_inc', 0xE76D: 'talk_dec',
    0xE777: 'talk_give_credits', 0xE785: 'talk_take_credits', 0xE79D: 'talk_alarm', 0xE7A2: 'talk_doom' };
  P.talk_do = function* () {
    M[0xC2] = 1;
    const p = ptr(0xB6), b = (M[p] << 1) & 255;
    if (!(b & 0x80)) return flags(b);
    M[0xC2] = 3;
    M[0xC6] = M[(p + 2) & 0xFFFF];
    P.talk_var({ a: M[0xC6] });
    const i = (M[(p + 1) & 0xFFFF] << 1) & 255;
    const to = ((M[0xE7B1 + i] | M[0xE7B2 + i] << 8) + 1) & 0xFFFF, name = OPS[to];
    if (!name) throw new Error('talk_do: no talk action at $' + to.toString(16));
    const o = { a: M[0xE7B1 + i], y: i };
    return P.GEN.has(name) ? yield* P[name](o) : P[name](o);
  };
  // A key after a text unless a menu answered it; then the node at offset A, or $FF the end
  // (carry set)
  P.talk_next = function* (r) {
    const x = r.a;
    if (!(M[ptr(0xB6)] & 0x80) && ((M[0xC1] & 0xC0) || !M[0xC3])) yield* P.wait_key();
    if (x === 0xFF) return { a: 0xFF, x, c: 1, z: 1 };
    const s = x + M[0xBF];
    M[0xB6] = s & 255;
    M[0xB7] = (M[0xC0] + (s >> 8)) & 255;
    return { a: M[0xB7], x, c: 0 };
  };
  // The answer byte ($C1): its choices (bits 0-2; none ends the talk) and its kind (bits 6-7): a
  // menu, a random pick, or a test of a variable against values (the branch at $E68D and the
  // values' end at $E692 written in): the target of the first value that the branch takes
  const BRANCH = { 0xD0: (c, z) => !z, 0xF0: (c, z) => z, 0x90: c => !c, 0xB0: c => c };
  P.talk_answer = function* () {
    const p = ptr(0xB6);
    let y = M[0xC2];
    M[0xC1] = M[(p + y) & 0xFFFF];
    const n = M[0xC1] & 7;
    M[0xC3] = n;
    if (!n) return { a: 0xFF, y };
    y = (y + 1) & 255;
    M[0xC5] = y;
    M[0xC4] = (n + y) & 255;
    const kind = M[0xC1] & 0xC0;
    if (!kind) return yield* P.talk_menu();
    if (kind === 0x80) return P.talk_random();
    y = (M[0xC4] - 1) & 255;
    M[0xE692] = y;
    P.talk_var({ a: M[(p + y) & 0xFFFF] });
    M[0xE68D] = M[0xE7C3 + ((M[0xC1] & 0x30) >> 4)];
    const test = BRANCH[M[0xE68D]];
    if (!test) throw new Error('talk_answer: the branch at $E68D is $' + M[0xE68D].toString(16));
    y = M[0xC5];
    let x = 0;
    const a = reader()(ptr(0x7A));
    while (y < M[0xE692]) {
      const v = M[(p + y) & 0xFFFF];
      if (test(a >= v, a === v)) break;
      x = (x + 1) & 255; y = (y + 1) & 255;
    }
    return P.talk_target({ a: x, x });
  };
  // The answers up to OTHER... as a menu in window 2; OTHER lets the player type a line, and the
  // keyword texts from OTHER's on are looked for in it: the first found is the choice, else the last
  P.talk_menu = function* () {
    M[0xBC] = 0xFF;
    const p = ptr(0xB6);
    let y = M[0xC5], x = 0;
    for (;;) {
      const e = P.menu_entry({ a: M[(p + y) & 0xFFFF], x, y });
      M[(0xA8 + x) & 255] = M[0x74]; M[(0xA9 + x) & 255] = M[0x75];
      x = (x + 2) & 255;
      if (e.c) break;
      y = (y + 1) & 255;
      if (y >= M[0xC4]) break;
    }
    const n = x >> 1;
    M[0x7A] = 0xA8; M[0x7B] = 0;
    M[0x4F] = 2; M[0x50] = 0x26; M[0x79] = 0;
    const m = yield* P.menu({ a: n, x: n, y: 0x14 });
    if (m.y !== M[0xBC]) return P.talk_target({ a: m.y });
    M[0x4F] = 2; M[0x50] = 0x26;
    yield* P.type_line();
    M[0x4F] = 2;
    do yield* P.print_char({ a: 0x20 }); while (M[0x0D21] >= M[0x4F]);
    M[0x74] = 0x05; M[0x75] = 0xFF;
    M[0x8A] = (M[0xC5] + M[0xBC]) & 255;
    for (;;) {
      const s = (M[(p + M[0x8A]) & 0xFFFF] & 0x3F) + M[0xBA];
      M[0x78] = s & 255; M[0x79] = (M[0xBB] + (s >> 8)) & 255;
      if (P.find_text({}).z) break;
      M[0x8A] = (M[0x8A] + 1) & 255;
      M[0xBC] = (M[0xBC] + 1) & 255;
      if (((M[0xBC] + 1) & 255) >= M[0xC3]) break;
    }
    return P.talk_target({ a: M[0xBC] });
  };
  P.talk_random = function () {
    return P.talk_target({ a: P.random_upto({ a: (M[0xC3] - 1) & 255 }).a });
  };
  // Answer byte A's text: OTHER... (bit 7; its number kept in $BC, carry set) or the script's text
  P.menu_entry = function (r) {
    if (r.a & 0x80) {
      M[0xBC] = r.x >> 1;
      M[0x74] = 0xA8; M[0x75] = 0xE7;
      return { a: 0xE7, x: r.x, y: r.y, c: 1 };
    }
    const s = r.a + M[0xBA];
    M[0x74] = s & 255; M[0x75] = (M[0xBB] + (s >> 8)) & 255;
    return { a: M[0x75], x: r.x, y: r.y, c: 0 };
  };
  // the node's byte at $C4 + A: the target of choice A
  P.talk_target = function (r) {
    const y = (r.a + M[0xC4]) & 255;
    return flags(M[(ptr(0xB6) + y) & 0xFFFF], { x: r.x, y });
  };
  // the actions, on the variable at ($7A)
  const variable = f => { const a = f(reader()(ptr(0x7A))) & 255; writer()(ptr(0x7A), a); return flags(a, { y: 0 }); };
  P.talk_set1 = () => variable(() => 1);
  P.talk_set0 = () => variable(() => 0);
  P.talk_inc = () => variable(v => v + 1);
  P.talk_dec = () => variable(v => v - 1);
  P.talk_give_credits = function* () {
    M[0x60] = M[0xC6]; M[0x61] = 0;
    P.add_credits();
    return yield* P.show_credits();
  };
  // talk flag 0 ($08B1): 0 when paid, 1 when the player was short
  P.talk_take_credits = function* () {
    M[0x60] = M[0xC6]; M[0x61] = 0;
    const p = P.pay_credits();
    M[0x08B1] = p.c ? 0 : 1;
    return yield* P.show_credits();
  };
  P.talk_alarm = () => P.raise_alarm({ a: M[0xC6] });
  P.talk_doom = function () { M[0x0835] = M[0xC6]; return { a: M[0xC6] }; };
  // After a talk: a watcher becomes a solid wanderer that can be talked to; a negative $0835 is
  // death; with plot flag 8 the player is put in Ja-Karn (system 9) at 0, 0, the visit ends and
  // every slot but the player's is freed
  P.talk_end = function (r) {
    let y = r.y;
    if ((M[0x5550 + y] & 7) === 4) { M[0x5550 + y] = 0x82; M[0x5618 + y] = 0x85; }
    if (M[0x0835] & 0x80) return P.player_destroyed();
    if (!M[0x0796]) return { a: 0, y };
    M[0x071D] = 9; M[0x071E] = 0; M[0x071F] = 0;
    M[0xA673] = (M[0xA673] + 1) & 255;
    y = 0x13;
    let o;
    do { o = P.free_slot({ y }); y = (o.y - 1) & 255; } while (y);
    return R(o, { y });
  };
  // The variable named by operand A, its address to ($7A): bits 5-7 the class, 0-4 the index.
  // Classes 0-4 from the bases at $E839 (talk flags $08B1, items $073D, plot $078E, the day's
  // lists $07AE twice); 5 one of five words at $E843; 6 and 7 leave ($7A) as it was.
  P.talk_var = function (r) {
    M[0x80] = r.a & 0x1F;
    const c = (r.a & 0xE0) >> 4;
    if (c >= 0x0B) return { a: c, c: 1 };
    if (c === 0x0A) {
      if (M[0x80] >= 5) return { a: M[0x80], c: 1 };
      const y = M[0x80] << 1;
      M[0x7A] = M[0xE843 + y]; M[0x7B] = M[0xE844 + y];
      return { a: M[0x7B], y };
    }
    const s = M[0xE839 + c] + M[0x80];
    M[0x7A] = s & 255;
    M[0x7B] = (M[0xE83A + c] + (s >> 8)) & 255;
    return { a: M[0x7B], y: c };
  };
  // bit 6 of every person's flags set while they are in sight
  P.mark_in_view = function () {
    M[0x8A] = 0x1F;
    let y = 0x1F;
    do {
      if (!(M[0x5590 + y] & 0x80)) {
        const v = P.entry_in_view({ y });
        y = M[0x8A];
        M[0x5550 + y] = v.c ? (M[0x5550 + y] | 0x40) ^ 0x40 : M[0x5550 + y] | 0x40;
      }
      M[0x8A] = (M[0x8A] - 1) & 255;
      y = M[0x8A];
    } while (y);
    return { y };
  };
  P.entry_in_view = function (r) {
    const x = M[0x5510 + r.y], y = M[0x5530 + r.y];
    M[0x51] = M[0x5510]; M[0x53] = M[0x5530];
    const w = P.in_chart_window({ x, y });
    if (w.c) return R(w, { c: 1 });
    const o = P.chart_cell_index(w);
    const a = M[0xFA00 + o.y];
    return { a, x: o.x, y: o.y, c: a === 0x7D ? 1 : 0 };
  };
  // the highest entry that can be walked through and is in sight, or 0
  P.find_watcher = function () {
    let y = 0x1F;
    for (; y; y--) { const f = M[0x5550 + y]; if (!(f & 0x80) && (f & 0x40)) break; }
    return flags(y, { y });
  };
  // A line typed at the cursor into $FF05 under a blinking underline: RETURN ends it, DEL or $08
  // rubs out, keys below space are left out, and it stops short of the window's right edge. Each
  // turn reads a key and ends at the return from the game's own read ($E8C3).
  P.type_line = function* () {
    M[0x85] = 0;
    for (;;) {
      M[0xE8FB] ^= 0xFF;
      if (M[0xE8FB]) {
        yield* P.print_char({ a: 0x5F });
        M[0x4F] = (M[0x4F] - 1) & 255;
        if (!(M[0x4F] & 0x80)) continue;
      }
      yield* P.print_char({ a: 0x20 });
      M[0x4F] = (M[0x4F] - 1) & 255;
      const k = P.get_key();
      yield { cp: 0xE8C3, cycles: 1300 };
      if (!k.c) continue;
      if (k.a === 0x0D) { M[0xFF05 + M[0x85]] = 0; return { a: 0, y: M[0x85] }; }
      if (k.a === 0x08 || k.a === 0x7F) {
        if (M[0x85]) { M[0x4F] = (M[0x4F] - 1) & 255; M[0x85] = (M[0x85] - 1) & 255; }
        continue;
      }
      if (k.a < 0x20 || ((M[0x4F] + 1) & 255) >= M[0x0D21]) continue;
      M[0xFF05 + M[0x85]] = k.a;
      yield* P.print_char({ a: k.a });
      M[0x85] = (M[0x85] + 1) & 255;
    }
  };
  P.CHECKPOINTS.push(0xE8C3);
};
})(typeof window !== 'undefined' ? window : globalThis);
