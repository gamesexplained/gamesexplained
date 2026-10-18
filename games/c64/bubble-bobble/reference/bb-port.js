// The port of the whole game, as the Play tab runs it (its section 01 says how it was checked).
/* port/src/core.js */
// The port's frame: P, the game's routines on the game's memory. Each group of routines is a file
// of its own that adds its functions to P (BBGroups); this makes P and installs them.
//
// The conventions every routine keeps (kit/skills/core/70-minisite/play.md):
// - P.M is the game's 64 KB (Uint8Array), read and written at the game's own addresses, the
//   self-modified operands included (a routine that patches an operand writes P.M[...] exactly as
//   the game does, and a routine whose operand is patched reads it from P.M before using it).
// - P.io is the chips: vicRead(r), vicWrite(r, v) (r = register 0-$3F), sidWrite(r, v), colourRead(i),
//   colourWrite(i, v) (i = cell 0-1023, four bits), ciaRead(r), ciaWrite(r, v) (CIA 1, r = 0-15),
//   cia2Read(r), cia2Write(r, v). A routine reads P.io when it runs (const io = P.io at the top of
//   a routine is fine; keeping it across calls is not).
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y, c,
//   z, n, v }, those it reads), and it returns the registers it leaves ({ a, x, y } and the flags a
//   caller reads). That is the kit's standIn's form, so the game's own code can stand in for any
//   routine not yet written, and a routine of one group calls another's as P.name(r).
//   Use regs(r, { a: ..., x: ... }, flags) to build the return value; nz(v) gives the Z and N of a
//   value. A routine that falls into the next one calls it and returns its result.
// - A routine that waits (for the frame counter, for a tune to end, for a key, in a delay loop), or
//   calls one that does, is a generator: it yields where time passes, and is called with yield*.
//   Which labels those are is fixed in GEN below, for every group alike: a routine in GEN must be
//   written function* and called with yield*; one not in GEN must be a plain function. A yield is
//   one of: a bare `yield` for one turn of a loop that polls memory an interrupt changes (the
//   frame counter $08, tune_playing $A4, a key), `yield { cp: address }` at a checkpoint (the
//   main program only), `yield { cycles: n }` for a delay loop that reads nothing.
// - A JMP to a place that never returns to its caller (the main loop, the title, game over, a
//   round skip) throws a Goto, which the main program catches: throw new P.Goto(address, r).
// - Interrupt handlers (irq_bottom, irq_top, irq_boss_lower) are plain functions that take no
//   registers; the lockstep and the page call them when the raster reaches their line.
(function (root) {
'use strict';
const G = root.BBGroups = root.BBGroups || {};

// Every label whose routine can reach a wait, so every one that is a generator. Fixed for all
// groups; a caller of one of these uses yield*.
const GEN = new Set(`
  check_deaths play_tune star_field play_game pass_loop round_timers barons_appear
  drop_in_enemies flip_buffers sky_flash clear_first_objects redraw_until_free check_items
  effect_flood end_all_objects redraw_both_buffers effect_six_sprites_a enemies_to_bonus
  effect_bonus_room_a effect_bonus_room_b effect_bonus_room_c fade_in_pictures bonus_collect
  check_extend effect_freeze effect_six_sprites_b effect_secret_room scroll_in_round
  scroll_up_row start_round hurry_up round_banner start wait_5 wait_10 wait_frames
  effect_skip_to_70 check_pause read_keys_wait check_quit effect_skip_3 effect_skip_7 skip_rounds
  bonus_scene_begin title_stars build_round wait_frame intro_step_armed intro_step float_down
  title_sequence title_loop game_over init_round_state
`.trim().split(/\s+/));

class Goto { constructor(to, r) { this.to = to; this.r = r || {}; } }

// Register helpers, shared by every group.
const nz = v => ({ z: (v & 255) === 0 ? 1 : 0, n: (v >> 7) & 1 });
// regs(r, patch, flags): the registers r with patch's values written over them, then flags'.
const regs = (r, patch, flags) => Object.assign({}, r, patch || {}, flags || {});
// Binary add with carry in: returns { a, c, z, n, v }.
function adc(a, b, cin) {
  const s = (a & 255) + (b & 255) + (cin ? 1 : 0);
  return { a: s & 255, c: s > 255 ? 1 : 0, v: ((~(a ^ b) & (a ^ s)) & 0x80) ? 1 : 0, ...nz(s) };
}
// Binary subtract with borrow (6502 SBC: carry set means no borrow).
function sbc(a, b, cin) {
  const s = (a & 255) - (b & 255) - (cin ? 0 : 1);
  return { a: s & 255, c: s >= 0 ? 1 : 0, v: (((a ^ b) & (a ^ s)) & 0x80) ? 1 : 0, ...nz(s) };
}
// Decimal-mode ADC as the NMOS 6502 does it (the score routines run with SED).
function adcDec(a, b, cin) {
  const c = cin ? 1 : 0;
  let lo = (a & 15) + (b & 15) + c;
  if (lo > 9) lo += 6;
  let hi = (a >> 4) + (b >> 4) + (lo > 15 ? 1 : 0);
  const bin = (a + b + c) & 255;
  const v = ((~(a ^ b) & (a ^ (hi << 4))) & 0x80) ? 1 : 0;
  const n = ((hi << 4) & 0x80) ? 1 : 0;
  if (hi > 9) hi += 6;
  return { a: ((hi << 4) | (lo & 15)) & 255, c: hi > 15 ? 1 : 0, z: bin === 0 ? 1 : 0, n, v };
}
// Compare: the flags of CMP a, b.
const cmp = (a, b) => ({ c: (a & 255) >= (b & 255) ? 1 : 0, ...nz((a - b) & 255) });

function makePort(M, io, opts = {}) {
  const P = { M, Goto, GEN };
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  // A byte an interrupt keeps and the main program reads (the frame counter $08, tune_playing
  // $A4): the lockstep hands the port what the game's own code read there.
  P.irq_byte = a => M[a];
  if (opts.standIn) {
    for (const [label, a] of opts.labels) {
      if (P[label]) continue;
      if (GEN.has(label) && opts.standInGen) { P[label] = opts.standInGen(P, a); continue; }
      const f = opts.standIn(P, a);
      P[label] = GEN.has(label) ? function* (r) { return f(r); } : f;
    }
  }
  for (const name of Object.keys(G)) if (!opts.only || opts.only.includes(name)) G[name](P);
  return P;
}
root.BBPort = { makePort, Goto, GEN };
root.BBUtil = { nz, regs, adc, sbc, adcDec, cmp };
})(typeof window !== 'undefined' ? window : globalThis);

/* port/src/chips.js */
// The page's own chips: what the game touches of the VIC, the SID, colour RAM and the CIAs, as
// registers with a raster line, a joystick and a keyboard. The same object shape the lockstep
// gives a port (kit/c64/lockstep.js, "The port's side"), so the port runs on either unchanged.
// What the game leans on: the raster line and the compare interrupt (the page raises the
// interrupt itself at the compare line), $D011 bit 7 with the line, the joystick on CIA 1's
// ports (port 2 on $DC00, port 1 on $DC01, active low) with the keyboard matrix on $DC01 by
// the row $DC00 selects, CIA 1's timer registers read for the random seed (0 here, as on the
// kit's machine), and the SID's registers as written, with a log the page streams to the SID model.
(function (root) {
'use strict';
function makeChips() {
  const c = {
    vic: new Uint8Array(0x40), sid: new Uint8Array(0x20), colour: new Uint8Array(0x400),
    pra: 0xFF, ddra: 0xFF, ddrb: 0, pra2: 0x3F, ddra2: 0x3F,   // CIA 1 as the KERNAL leaves it: port A all outputs (the game never sets it)
    line: 0, cycle: 0,                 // the raster line and the cycle within the frame, set by the page's clock
    joy: 0x1F, joy1: 0x1F,             // active low: 1 up, 2 down, 4 left, 8 right, 16 fire
    keys: new Set(),                   // KERNAL key numbers (row * 8 + column)
    latch: 0, enable: 0,
    sidLog: [],                        // [cycle, register, value] of each SID write this frame
    vicLog: [],                        // [line, cycle, address, value] of each VIC/CIA2/pointer write this frame
  };
  function read(a) {
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F;
      if (r === 0x12) return c.line & 255;
      if (r === 0x11) return (c.vic[0x11] & 0x7F) | ((c.line >> 8) << 7);
      if (r === 0x19) return c.latch | 0x70 | ((c.latch & c.enable) ? 0x80 : 0);
      if (r === 0x1A) return c.enable | 0xF0;
      return c.vic[r];
    }
    if (a >= 0xD400 && a < 0xD800) return 0;
    if (a >= 0xD800 && a < 0xDC00) return c.colour[a - 0xD800] | 0xF0;
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15;
      if (r === 0) return (c.ddra ? (c.pra | ~c.ddra) & 0xFF : 0xE0 | c.joy) & (0xE0 | c.joy);
      if (r === 1) {
        let v = 0xFF;
        const rows = c.ddra ? c.pra & c.ddra : 0xFF;
        for (const k of c.keys) if (!(rows & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
        return v & (0xE0 | c.joy1) & 0xFF;
      }
      if (r === 2) return c.ddra;
      if (r === 3) return c.ddrb;
      return 0;
    }
    if (a >= 0xDD00 && a < 0xDE00) {
      const r = a & 15;
      if (r === 0) return (c.pra2 | ~c.ddra2) & 0xFF;
      if (r === 2) return c.ddra2;
      return 0;
    }
    return 0;
  }
  function write(a, v) {
    v &= 0xFF;
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F;
      if (r === 0x19) { c.latch &= ~v & 0x0F; return; }
      if (r === 0x1A) { c.enable = v & 0x0F; }
      c.vic[r] = v;
      c.vicLog.push([c.line, c.cycle, a, v]);
      return;
    }
    if (a >= 0xD400 && a < 0xD800) { c.sid[a & 0x1F] = v; c.sidLog.push([c.cycle, a & 0x1F, v]); return; }
    if (a >= 0xD800 && a < 0xDC00) { c.colour[a - 0xD800] = v & 15; return; }
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15;
      if (r === 0) c.pra = v; else if (r === 2) c.ddra = v; else if (r === 3) c.ddrb = v;
      return;
    }
    if (a >= 0xDD00 && a < 0xDE00) {
      const r = a & 15;
      if (r === 0) { c.pra2 = v; c.vicLog.push([c.line, c.cycle, a, v]); } else if (r === 2) c.ddra2 = v;
    }
  }
  // The VIC as the KERNAL leaves it, which the game counts on ($D011 is only ANDed, $D016 is
  // written whole): text mode, the screen on, 25 rows, the KERNAL's colours.
  c.vic.set([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x1B, 0, 0, 0, 0, 0xC8, 0, 0x15, 0, 0, 0, 0, 0, 0, 0,
             0x0E, 0x06, 0x01, 0x02, 0x03, 0x04, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
  c.io = {
    read, write,
    vicRead: r => read(0xD000 | (r & 0x3F)), vicWrite: (r, v) => write(0xD000 | (r & 0x3F), v),
    sidRead: r => read(0xD400 | (r & 0x1F)), sidWrite: (r, v) => write(0xD400 | (r & 0x1F), v),
    colourRead: i => c.colour[i & 0x3FF], colourWrite: (i, v) => write(0xD800 | (i & 0x3FF), v),
    ciaRead: r => read(0xDC00 | (r & 0x0F)), ciaWrite: (r, v) => write(0xDC00 | (r & 0x0F), v),
    cia2Read: r => read(0xDD00 | (r & 0x0F)), cia2Write: (r, v) => write(0xDD00 | (r & 0x0F), v),
    irqByte: null,                     // set by the page: a => M[a]
  };
  // The raster compare: true when the compare line is reached with the interrupt enabled.
  c.compareLine = () => ((c.vic[0x11] & 0x80) << 1) | c.vic[0x12];
  return c;
}
root.BBChips = { makeChips };
})(typeof window !== 'undefined' ? window : globalThis);

/* port/src/actors.js */
// The actor state machine, $1CBD-$2B30: update_actors ($1CBD, the loop over the eight actors that
// irq_top runs every other frame), the dispatch through the state table ($1E3C), and every state
// handler in the range: the player (player_control $2162 and its jump, fall, walk and blow
// routines), the hopper and the bolt dropper (the two enemy kinds whose code lives here), the
// beaten enemy (enemy_thrown $267C, fall_to_floor $273D), the frozen enemy, the released enemy,
// the water stream, the dying and reappearing player, the food, and the four bonus states.
//
// Everything here runs inside irq_top, so frame_count ($08) is read from M directly. The enemy AI
// ($E9FD-$EFE9), actor_map_pointer ($E9B8), random ($E9EA), score_ten/add_score ($7C21/$7C26),
// kill_enemy ($1A6F), clear_item_sprites ($069B) and item_picture_address ($2C9F) are other
// groups' and are called as P.name(r).
//
// Patched operands, read from M when they run: the dispatch target $1E85/$1E86 (written here by
// run_actor_state), blow_mark_owner's opcode at $23DE (RTS in ordinary rounds, LDA abs,X on round
// 100), floor_state $277F (the state a landing enemy takes), floor_tail $2782 (JMP or RTS, by
// fall_to_floor_once), food_gate $2922, the food sprite destinations $2970/$298D, and
// giant_colour $2AE9. The state table itself is read from M at $1E3A + state * 2.
//
// Six routines of the ai group are reached from here only by JMP (enemy_fall_then_flip $EB34,
// enemy_fall $EB3F, enemy_fall_plain $EBB8, animate_walk $EB0F, animate_two_frames_b $EE4A,
// animate_four_frames $EFEA) and are not in the stand-in list (work/port-gen.json lists no label
// that only a JMP reaches), so the harness does not stand them in. Until the ai group defines
// them, `tail` below runs the game's own code for them through the kit's standIn, reached through
// the running test script (test/*.js); in a browser the ai group must define them.
(function (root) {
'use strict';
const G = root.BBGroups = root.BBGroups || {};
const { nz, regs, adc, cmp } = root.BBUtil;

// The handlers the state table at $1E3C names, by address: the dispatch reads the table from M
// and calls the routine by its label.
const HANDLERS = {
  0x2162: 'player_control', 0xEA08: 'enemy_walker', 0xE9FD: 'enemy_shooter', 0x1F2E: 'enemy_hopper',
  0xEFC0: 'enemy_flyer', 0xEEB2: 'enemy_flyer_fast', 0x1E9F: 'enemy_dropper', 0x2808: 'enemy_released',
  0x267C: 'enemy_thrown', 0x273D: 'fall_to_floor', 0x284D: 'carried_by_water', 0x28A5: 'player_dying',
  0x28E8: 'actor_nop', 0x290D: 'player_reappear', 0x2921: 'enemy_to_food', 0x29BB: 'food_wait',
  0x2A18: 'giant_gather', 0x2A74: 'giant_flash', 0x2ACB: 'giant_food', 0x2785: 'enemy_frozen_fall',
  0x27CB: 'enemy_frozen', 0x28FA: 'player_invincible',
};
// The ai group's JMP-only tails (see the header).
const TAILS = { enemy_fall_then_flip: 0xEB34, enemy_fall: 0xEB3F, enemy_fall_plain: 0xEBB8,
  animate_walk: 0xEB0F, animate_two_frames_b: 0xEE4A, animate_four_frames: 0xEFEA };

// The actor arrays (facts.md "Actors"; the labels of the listing).
const STATE = 0xB2, X = 0xBA, Y = 0xC2, FRAME = 0x8520, COLOUR = 0x8548, SPRITE = 0x8598, DROPPING = 0x85C0,
  INPUT = 0x85E8, TICK = 0x8610, WAIT = 0x8638, CHASE_PERIOD = 0x8688, CHASE_LEVEL = 0x86D8, CHASE_CLIMB = 0x8700,
  FAST = 0x8728, FRAMES_PER_SIDE = 0x8750, JUMP = 0x87A0, FALL_PHASE = 0x87C8, FALLING = 0x87F0, BLOW = 0x8818,
  DRIFT_L = 0x8840, DRIFT_R = 0x8868, TIMER = 0x8890;

G.actors = function (P) {
  const M = P.M;
  const io = () => P.io;
  // The registers a routine leaves: a, x, y and only the flags named (a stand-in's flags do not
  // flow through a routine that then sets A, X or Y itself).
  const ret = (r, patch, flags) => Object.assign({ a: r.a, x: r.x, y: r.y }, patch || {}, flags || {});
  const inc = a => { M[a] = (M[a] + 1) & 255; return M[a]; };
  const dec = a => { M[a] = (M[a] - 1) & 255; return M[a]; };
  // (map_ptr),y
  const map = y => M[((M[0x11] | (M[0x12] << 8)) + (y & 255)) & 0xFFFF];
  // |a - b| as the game computes it: SEC SBC, BCS, EOR #$FF ADC #$01.
  const absd = (a, b) => { const d = (a - b) & 255; return a >= b ? d : (256 - d) & 255; };
  // The three-cell probe the handlers share: LDY #base / LDA (map_ptr),Y / BMI hit / INY / LDA / BMI hit /
  // LDA sub_x / BEQ miss / INY / LDA / BMI hit (or BPL miss). Returns the registers it leaves and the result.
  function probe3(base) {
    let y = base & 255, a = map(y);
    if (a & 0x80) return { hit: true, a, y };
    y = (y + 1) & 255; a = map(y);
    if (a & 0x80) return { hit: true, a, y };
    a = M[0x23];
    if (a === 0) return { hit: false, a, y };
    y = (y + 1) & 255; a = map(y);
    return { hit: (a & 0x80) !== 0, a, y };
  }
  // LDA #$0E / STA actor_state,Y at $1D71 and $1E25: the trainer's invincibility turns the STA
  // ($99) into an LDA ($B9), so the opcode is read from M. Returns A.
  function kill_player(at, y) {
    const op = M[at];
    if (op === 0x99) { M[STATE + y] = 0x0E; return 0x0E; }
    if (op === 0xB9) return M[STATE + y];
    throw new Error('actors: opcode $' + op.toString(16) + ' at $' + at.toString(16));
  }
  // A routine of the ai group reached by JMP: P.name when the ai group is loaded, else the game's code.
  let standIn = null;
  function tail(name, r) {
    if (typeof P[name] === 'function') return P[name](r);
    if (!standIn) {
      const main = typeof process !== 'undefined' && process.mainModule;
      if (main) {
        const path = main.require('path');
        const kit = 'kit/c64/lockstep.js';
        for (const c of [path.resolve(path.dirname(main.filename), '../../../../../..', kit),   // from work/port/test
                         path.resolve(process.cwd(), '../../../../..', kit),                    // from work/port
                         path.resolve(process.cwd(), kit)]) {                                   // from the repository

          try { standIn = main.require(c).standIn; break; } catch (e) { standIn = null; }
        }
      }
      if (!standIn) throw new Error('actors: no P.' + name + ' and no stand-in for $' + TAILS[name].toString(16));
    }
    P[name] = standIn(P, TAILS[name]);
    return P[name](r);
  }

  // --- the loop ---------------------------------------------------------------------------------
  // $1CBD: every other frame, from irq_top. Reads both joysticks into $85E8/$85E9, runs each live
  // actor's drop-in step or state handler (twice when its fast flag is set and bit 1 of the frame
  // count is clear; only the idle animation while its wait counter runs; not at all for an enemy
  // below state $0B while the clock's freeze lasts), then tests each player in state 1 against the
  // six enemies (a touch is state $0E, through the STA at $1D73 that the trainer's invincibility
  // turns into an LDA), or on the boss's round moves the boss.
  P.update_actors = function (r) {
    const c = io();
    c.ciaWrite(0, 0x7F);
    c.ciaWrite(1, 0xFF);
    M[0x2922] = 0;
    M[INPUT] = c.ciaRead(0);
    M[INPUT + 1] = c.ciaRead(1);
    let x = 7, y = r.y, a;
    M[0x22] = 7;
    for (;;) {
      a = M[STATE + x];
      if (a !== 0) {
        a = M[DROPPING + x];
        if (!(a & 0x80)) {                          // b_1CA0: dropping in
          a = M[Y + x];
          let landed = a === M[TIMER + x];
          if (!landed) { inc(Y + x); landed = inc(Y + x) === 0; }
          if (landed) { dec(DROPPING + x); M[BLOW + x] = 0xFF; M[TIMER + x] = 0x0A; }   // b_1CAD
          a = M[STATE + x];
          r = P.idle_animation(regs(r, { a, x, y }, nz(a)));
          a = r.a; y = r.y;
        } else {
          y = x & 1;
          a = M[STATE + y];
          if (a !== 1) y ^= 1;
          M[0x4B] = y;
          let skip = false;
          if (x >= 2) {
            a = M[0x67];
            if (a !== 0) { a = M[STATE + x]; if (a < 0x0B) skip = true; }
          }
          if (!skip) {
            a = M[FAST + x];
            if (a !== 0) {
              a = M[0x08] & 0x02;
              if (a === 0) { r = P.run_actor_state(regs(r, { a, x, y }, nz(a))); x = r.x & 255; y = r.y; a = r.a; }
            }
            a = M[WAIT + x];
            if (a !== 0) {
              dec(WAIT + x);
              a = M[STATE + x];
              r = P.idle_animation(regs(r, { a, x, y }, nz(a)));
              a = r.a; y = r.y;
            } else {
              r = P.run_actor_state(regs(r, { a, x, y }, nz(a)));
              a = r.a; y = r.y;
            }
          }
        }
      }
      x = dec(0x22);
      if (x & 0x80) break;
    }
    a = M[0x5AFF];
    if (a !== 0) return boss_move(regs(r, { a, x, y }, nz(a)));
    // b_1D32: the players against the enemies
    for (y = 1; y >= 0; y--) {
      a = M[STATE + y];
      if (a !== 1) continue;
      let s = adc(M[X + y], 1, 1);                  // the carry is set by the CMP #$01 that fell through
      M[0x02] = s.a;
      s = adc(M[Y + y], 2, s.c);
      M[0x03] = s.a;
      a = s.a;
      for (x = 5; x >= 0; x--) {
        a = M[STATE + 2 + x];
        if (a === 0 || a >= 0x0B) continue;
        a = absd(M[X + 2 + x], M[0x02]);
        if (a >= 0x0C) continue;
        a = absd(M[Y + 2 + x], M[0x03]);
        if (a >= 0x0C) continue;
        a = kill_player(0x1D73, y);
      }
      x = 0xFF;
    }
    return ret(r, { a, x, y: 0xFF });
  };
  // $1D84: round 100's boss, reached by JMP from update_actors: a second step when enemy_fast is
  // set (and then its colour is $0A), then the step itself (b_1D96) and the players' test.
  function boss_move(r) {
    let a = M[0x10];
    if (a !== 0x63) return ret(r, { a }, cmp(a, 0x63));
    a = M[FAST + 2];
    if (a !== 0) {
      r = P.b_1D96(regs(r, { a }, nz(a)));
      M[0xC0] = 0x0A;
      r = regs(r, { a: 0x0A }, nz(0x0A));
    }
    return P.b_1D96(r);
  }
  // $1D96: move the boss two pixels diagonally, bouncing between X $28-$C0 and Y $3A-$B8 (the frame
  // set flips with the side), unless it is in its beaten frame (9); then any player in state 1
  // inside its box dies, or, when the boss is beaten, is the winner and the round ends.
  P.b_1D96 = function (r) {
    let a = M[0xBE], y, x = r.x;
    if (a !== 0x09) {
      let turn;
      a = M[0xBF] & 1;
      if (a === 0) {
        a = M[0xBC];
        if (a < 0x28) turn = true;
        else { dec(0xBC); a = dec(0xBC); turn = a === 0; }
      } else {
        a = M[0xBC];
        if (a >= 0xC0) turn = true;
        else { inc(0xBC); a = inc(0xBC); turn = a === 0; }
      }
      if (turn) { a = M[0xBF] ^ 3; M[0xBF] = a; a = M[0xBE] ^ 0x18; M[0xBE] = a; }
      // b_1DC6
      a = M[0xBF] & 8;
      if (a === 0) {
        a = M[0xBD];
        if (a < 0x3A) turn = true;
        else { dec(0xBD); a = dec(0xBD); turn = a === 0; }
      } else {
        a = M[0xBD];
        if (a >= 0xB8) turn = true;
        else { inc(0xBD); a = inc(0xBD); turn = a === 0; }
      }
      if (turn) { a = M[0xBF] ^ 0x0C; M[0xBF] = a; }
    }
    // b_1DEA
    for (y = 1; y >= 0; y--) {
      a = M[STATE + y];
      if (a !== 1) continue;
      const px = M[X + y], bx = M[0xBC];
      a = (px - bx) & 255;
      let inside;
      if (px >= bx) inside = a < 0x40;
      else inside = a >= 0xF8 || a < 0x40;
      if (!inside) continue;
      const py = M[Y + y], by = M[0xBD];
      a = (py - by) & 255;
      if (py >= by) inside = a < 0x38;
      else inside = a >= 0xF8 || a < 0x38;
      if (!inside) continue;
      a = M[0xBE];
      if (a === 0x09) {
        M[0xA5B8] = y;
        dec(0x21);
        M[0x5AFF] = 0;
        return P.clear_enemies(regs(r, { a: 0, x, y }, nz(0)));
      }
      a = kill_player(0x1E27, y);
    }
    return ret(r, { a, x, y: 0xFF });
  };
  // $1E2E: zero the six enemies' state, X and Y ($B4-$B9, $BC-$C1, $C4-$C9).
  P.clear_enemies = function (r) { return P.clear_actors_from_x(regs(r, { x: 5 })); };
  // $1E30: the same from actor X + 2 down (X = 7 from check_quit clears the players' positions too).
  P.clear_actors_from_x = function (r) {
    let x = r.x & 255;
    do { M[STATE + 2 + x] = 0; M[X + 2 + x] = 0; M[Y + 2 + x] = 0; x = (x - 1) & 255; } while (!(x & 0x80));
    return ret(r, { a: 0, x }, { z: 0, n: 1 });
  };
  // $1E6C: actor X's map pointer, its frame into anim_now, then the handler for its state through
  // the table at $1E3C, whose entry is written into the JMP's operand at $1E85/$1E86.
  P.run_actor_state = function (r) {
    r = P.actor_map_pointer(r);
    const x = r.x & 255;
    M[0x25] = M[FRAME + x];
    const s = M[STATE + x], y = (s << 1) & 255;
    const lo = M[0x1E3A + y], hi = M[0x1E3B + y];
    M[0x1E85] = lo; M[0x1E86] = hi;
    const target = lo | (hi << 8);
    const name = HANDLERS[target];
    if (!name) throw new Error('run_actor_state: state ' + s + ' dispatches to $' + target.toString(16));
    // at the JMP: A, Z and N from the LDA of the high byte, C from the ASL of the state (some
    // handlers, enemy_shooter among them, keep that carry to their RTS)
    return P[name](regs(r, { a: hi, x, y }, { c: s >> 7, ...nz(hi) }));
  };
  // $1E87: the idle animation for state A: kind 4 flips two frames, 5 cycles four, 9 two (the
  // dropper's), everything else the walk cycle.
  P.idle_animation = function (r) {
    const a = r.a & 255;
    if (a === 0x04) return P.animate_two_frames(regs(r, {}, cmp(a, 4)));
    if (a === 0x05) return tail('animate_four_frames', regs(r, {}, cmp(a, 5)));
    if (a === 0x09) return tail('animate_two_frames_b', regs(r, {}, cmp(a, 9)));
    return tail('animate_walk', regs(r, {}, cmp(a, 9)));
  };
  // $214A: every second call flip bit 0 of the frame.
  P.animate_two_frames = function (r) {
    const x = r.x & 255;
    const a = inc(TICK + x);
    if (a < 2) return ret(r, { a, x }, cmp(a, 2));
    M[TICK + x] = 0;
    return P.flip_frame_bit(regs(r, { a: 0, x }, cmp(a, 2)));
  };
  // $2159: flip bit 0 of the frame.
  P.flip_frame_bit = function (r) {
    const x = r.x & 255;
    const a = M[FRAME + x] ^ 1;
    M[FRAME + x] = a;
    return ret(r, { a, x }, nz(a));
  };

  // --- the dropper and the hopper -------------------------------------------------------------
  // $1E9F: state 9. When its timer is out, with a random A below 12, on a floor, not blowing, above Y
  // $A8 and with an object slot 2-17 free, drop a bolt (type $32) and wait $64 calls. Then walk by
  // its control bits (fall first if nothing is under it).
  P.enemy_dropper = function (r) {
    let x = r.x & 255, y = r.y, a;
    let walk = false;
    a = M[TIMER + x];
    if (a !== 0) { a = dec(TIMER + x); walk = a !== 0; }
    if (!walk) {
      r = P.random(regs(r, { x, y }));
      a = r.a & 255; x = r.x & 255; y = r.y;
      if (a < 0x0C && (M[FALLING + x] & 0x80) && (M[BLOW + x] & 0x80) && M[Y + x] < 0xA8) {
        for (y = 0x0F; y >= 0; y--) if (M[0xCC + y] & 0x80) break;
        if (y >= 0) {
          M[0xCC + y] = 0x32; M[0xAA44 + y] = 0x32;
          M[0xAA0E + y] = x;
          M[0xDE + y] = ((M[X + x] - 0x0C) & 255) >> 3;
          M[0xF0 + y] = ((M[Y + x] - 0x05) & 255) >> 3;
          M[TIMER + x] = 0x64; M[BLOW + x] = 0x64;
        } else y = 0xFF;
      }
    }
    // b_1EF6
    a = M[INPUT + x]; M[0x02] = a;
    a = M[FALLING + x];
    if (!(a & 0x80)) return tail('enemy_fall_then_flip', regs(r, { a, x, y }, nz(a)));
    const p = probe3(0x51);
    a = p.a; y = p.y;
    if (!p.hit) { inc(FALLING + x); return tail('enemy_fall_then_flip', regs(r, { a, x, y })); }
    // b_1F1D
    let cf = M[0x02] & 1; M[0x02] >>= 1;
    if (cf) { r = P.enemy_step_left_4(regs(r, { a, x, y }, { c: 1 })); a = r.a; x = r.x & 255; y = r.y; }
    cf = M[0x02] & 1; M[0x02] >>= 1;
    if (cf) { r = P.enemy_step_right_4(regs(r, { a, x, y }, { c: 1 })); a = r.a; x = r.x & 255; y = r.y; }
    return tail('animate_two_frames_b', regs(r, { a, x, y }));
  };
  // $1F2E: state 4, the hopper: enemy_chase, then fall if in the air; on the ground start a jump
  // straight up ($1F) when its climb flag is set and a platform lies within four rows above, else
  // (sometimes turning towards its target player) a drifting hop ($0F); j_1FEF steps the jump.
  P.enemy_hopper = function (r) {
    r = P.enemy_chase(r);
    let x = r.x & 255, y = r.y, a;
    a = M[FALLING + x];
    if (!(a & 0x80)) return tail('enemy_fall_plain', regs(r, { a, x, y }, nz(a)));
    a = M[JUMP + x];
    if (!(a & 0x80)) return hopper_step(regs(r, { a, x, y }, nz(a)));
    // b_1F41
    a = M[Y + x];
    let hit = false;
    if (a >= 0x1F) { const p = probe3(0x51); hit = p.hit; a = p.a; y = p.y; }
    if (!hit) { inc(FALLING + x); return tail('enemy_fall_plain', regs(r, { a, x, y })); }   // b_1F5B
    // b_1F61
    a = M[CHASE_CLIMB + x];
    let climb = false;
    if (a !== 0) {
      const p = ((M[0x11] | (M[0x12] << 8)) - 0xA0) & 0xFFFF;
      M[0x04] = p & 255; M[0x05] = p >> 8;
      const mb = yy => M[(p + yy) & 0xFFFF];
      // the four rows above, in pairs: a platform (solid at $02/$2A/$52/$7A) with a gap under it
      let up;
      y = 0x02; a = mb(y); up = (a & 0x80) !== 0;
      if (!up) { y = 0x2A; a = mb(y); if (a & 0x80) climb = true; }
      if (!climb) {
        y = 0x2A; a = mb(y); up = (a & 0x80) !== 0;
        if (!up) { y = 0x52; a = mb(y); if (a & 0x80) climb = true; }
        if (!climb) {
          y = 0x52; a = mb(y); up = (a & 0x80) !== 0;
          if (!up) { y = 0x7A; a = mb(y); if (a & 0x80) climb = true; }
          if (!climb) {
            y = 0x7A; a = mb(y);
            if (!(a & 0x80)) { y = 0xA2; a = mb(y); climb = (a & 0x80) !== 0; }
          }
        }
      }
    }
    if (climb) {                                   // b_1FA3
      M[DRIFT_L + x] = 0; M[DRIFT_R + x] = 0;
      a = 0x1F; M[JUMP + x] = 0x1F;
      return hopper_step(regs(r, { a, x, y }, nz(a)));
    }
    // b_1FB3
    a = M[CHASE_LEVEL + x];
    if (a !== 0) {
      r = P.random(regs(r, { a, x, y }));
      a = r.a & 255; x = r.x & 255; y = r.y;
      if (a < 0x1E) {
        y = M[0x4B];
        a = M[X + y];
        a = a >= M[X + x] ? 0x03 : 0x07;
        M[0x25] = a; M[FRAME + x] = a;
      }
    }
    // b_1FD3
    M[DRIFT_L + x] = 0; M[DRIFT_R + x] = 0;
    a = M[0x25];
    if (a >= M[FRAMES_PER_SIDE + x]) a = dec(DRIFT_L + x);
    else a = dec(DRIFT_R + x);
    a = 0x0F; M[JUMP + x] = 0x0F;
    return hopper_step(regs(r, { a, x, y }, nz(a)));
  };
  // j_1FEF: A = the jump counter. Rising: by the arc (or one pixel a step with a drift), down by
  // the arc, landing on a floor; a drifting hop moves two pixels sideways and turns at walls.
  function hopper_step(r) {
    let x = r.x & 255, y = r.y, a = r.a & 255;
    if (a !== 0) {
      if (a < 0x10) {
        y = a;
        a = M[FRAME + x] & 3;
        if (a >= 2) { dec(FRAME + x); return ret(r, { a, x, y }); }
        // b_2003
        dec(JUMP + x);
        a = M[DRIFT_L + x] | M[DRIFT_R + x];
        if (a !== 0) { dec(Y + x); return hopper_drift(r, x, y, a); }
        a = (M[Y + x] - M[0xACDD + y]) & 255; M[Y + x] = a;
        return P.animate_two_frames(regs(r, { a, x, y }));
      }
      // b_201E
      dec(JUMP + x);
      a &= 3;
      if (a !== 0) return ret(r, { a, x, y }, nz(a));
      a = M[FRAME + x];
      a = a >= M[FRAMES_PER_SIDE + x] ? 0x03 : 0x07;
      M[FRAME + x] = a;
      return ret(r, { a, x, y });
    }
    // b_2037: coming down
    y = M[FALL_PHASE + x];
    if (y & 0x80) { a = 0; M[FALL_PHASE + x] = 0; y = 0; }
    let land = false;
    if (y === 0x10) land = true;
    else {
      a = M[FRAME + x] & 3;
      if (a >= 2) land = true;
      else {
        inc(FALL_PHASE + x);
        a = M[DRIFT_L + x] | M[DRIFT_R + x];
        let s;
        if (a !== 0) s = adc(M[Y + x], M[0xACED + y], 0);
        else s = adc(M[Y + x], M[0xACDD + y], 0);
        a = s.a; M[Y + x] = a;
        // j_2070
        if (a < 0x1F) return hopper_drift(r, x, y, a);
        a = ((a - 0x15) & 255) & 7;
        if (a >= M[0x24]) return hopper_drift(r, x, y, a);
        let p = probe3(0x51);
        a = p.a; y = p.y;
        if (p.hit) return hopper_drift(r, x, y, a);
        p = probe3(0x79);
        a = p.a; y = p.y;
        if (!p.hit) return hopper_drift(r, x, y, a);
        // b_20A4
        a = (((M[Y + x] - 0x2D) & 0xF8) + 0x2D) & 255; M[Y + x] = a;
        land = true;
      }
    }
    // j_20B0
    a = M[FRAME + x] & 3;
    if (a === 3) {
      a = 0xFF; M[JUMP + x] = 0xFF; M[FALL_PHASE + x] = 0xFF;
      return P.animate_two_frames(regs(r, { a, x, y }));
    }
    if (a >= 2) { inc(FRAME + x); return ret(r, { a, x, y }); }
    a = (M[FRAME + x] & 4) | 2; M[FRAME + x] = a;
    return ret(r, { a, x, y });
  }
  // j_20D7: the sideways drift of a hop, two pixels a call, turning at a wall.
  function hopper_drift(r, x, y, a) {
    a = M[DRIFT_L + x];
    if (a & 0x80) {
      let blocked = false;
      a = M[Y + x];
      if (a >= 0x2D) {
        a = M[0x23];
        if (a === 0) {
          y = 0x00; a = map(y);
          if (a & 0x80) blocked = true;
          else {
            y = 0x28; a = map(y);
            if (a & 0x80) blocked = true;
            else {
              y = M[0x24];
              if (y !== 0) { y = 0x50; a = map(y); blocked = (a & 0x80) !== 0; }
            }
          }
        }
      }
      if (blocked) { a = 0; M[DRIFT_L + x] = 0; dec(DRIFT_R + x); return hopper_turn(r, x, y); }
      dec(X + x); dec(X + x);
      return P.animate_two_frames(regs(r, { a, x, y }));
    }
    a = M[DRIFT_R + x];
    if (!(a & 0x80)) return P.animate_two_frames(regs(r, { a, x, y }, nz(a)));
    let blocked = false;
    a = M[Y + x];
    if (a >= 0x2D) {
      a = M[0x23];
      if (a === 0) {
        y = 0x03; a = map(y);
        if (a & 0x80) blocked = true;
        else {
          y = 0x2B; a = map(y);
          if (a & 0x80) blocked = true;
          else {
            y = M[0x24];
            if (y !== 0) { y = 0x53; a = map(y); blocked = (a & 0x80) !== 0; }
          }
        }
      }
    }
    if (blocked) { M[DRIFT_R + x] = 0; dec(DRIFT_L + x); return hopper_turn(r, x, y); }
    inc(X + x); a = inc(X + x);
    return P.animate_two_frames(regs(r, { a, x, y }));
  }
  // j_213B: face the other way.
  function hopper_turn(r, x, y) {
    const a = M[FRAME + x] ^ 4; M[FRAME + x] = a;
    return P.animate_two_frames(regs(r, { a, x, y }));
  }

  // --- the player -------------------------------------------------------------------------------
  // $2162: state 1. A bubble being blown is stepped; with the stick up and not in a jump, a bubble
  // under the player (within 14 across, under 20 below) is bounced on; then the jump or fall in
  // progress, or, on the ground, the stick (player_ground_input); standing still for seven calls
  // swaps the idle frame.
  P.player_control = function (r) {
    let x = r.x & 255, y, a;
    y = M[BLOW + x];
    if (!(y & 0x80)) { r = P.blow_animation(regs(r, { x, y }, nz(y))); x = r.x & 255; y = r.y; }
    // b_216A
    a = M[JUMP + x];
    if ((a & 0x80) || a === 0) {
      // b_2171
      a = M[INPUT + x]; M[0x02] = a;
      a &= 1;
      if (a === 0) {
        for (y = 0x11; y >= 0; y--) {
          a = M[0xCA + y];
          if (a === 0 || a >= 0x24 || a === 0x16) continue;
          a = absd(M[0xAA0C + y], M[X + x]);
          if (a >= 0x0E) continue;
          a = (M[0xAA1E + y] - M[Y + x]) & 255;
          if (a >= 0x14) continue;
          r = P.score_ten(regs(r, { a, x, y }));
          x = r.x & 255; y = r.y;
          M[JUMP + x] = 0xFF; M[FALL_PHASE + x] = 0xFF; M[FALLING + x] = 0xFF;
          a = M[Y + x] | 1; M[Y + x] = a;
          return start_jump(regs(r, { a, x, y }));
        }
        y = 0xFF;
      }
    }
    // b_21BD
    a = M[JUMP + x];
    if (!(a & 0x80)) return player_jump_step(regs(r, { a, x, y }, nz(a)));
    a = M[FALLING + x];
    if (!(a & 0x80)) return player_fall(regs(r, { a, x, y }, nz(a)));
    a = M[0x24];
    let ground = a !== 0;
    if (!ground) { const p = probe3(0x51); ground = p.hit; a = p.a; y = p.y; }
    if (!ground) { inc(FALLING + x); return player_fall(regs(r, { a, x, y })); }   // b_21E5
    // b_21EB
    a = M[0x02] & 0x1F;
    if (a !== 0x1F) return P.player_ground_input(regs(r, { a, x, y }, cmp(a, 0x1F)));
    a = M[BLOW + x];
    if (!(a & 0x80)) return P.player_ground_input(regs(r, { a, x, y }, nz(a)));
    a = inc(TICK + x);
    if (a !== 0x07) return ret(r, { a, x, y }, cmp(a, 7));
    r = P.flip_frame_bit(regs(r, { a, x, y }));
    x = r.x & 255; y = r.y;
    M[TICK + x] = 0;
    return ret(r, { a: 0, x, y }, nz(0));
  };
  // $220C: the stick on the ground: up (bit 0 clear) jumps, left and right (bits 2, 3) walk, fire
  // (bit 4) blows. The bits are shifted out of $02.
  P.player_ground_input = function (r) {
    let x = r.x & 255, y = r.y, a = r.a;
    let cf = M[0x02] & 1; M[0x02] >>= 1;
    if (!cf) return start_jump(regs(r, { a, x, y }, { c: 0, z: M[0x02] === 0 ? 1 : 0, n: 0 }));
    M[0x02] >>= 1;
    cf = M[0x02] & 1; M[0x02] >>= 1;
    if (!cf) { r = P.walk_left(regs(r, { a, x, y }, { c: 0 })); a = r.a; x = r.x & 255; y = r.y; }
    cf = M[0x02] & 1; M[0x02] >>= 1;
    if (!cf) { r = P.walk_right(regs(r, { a, x, y }, { c: 0 })); a = r.a; x = r.x & 255; y = r.y; }
    cf = M[0x02] & 1; M[0x02] >>= 1;
    if (cf) return ret(r, { a, x, y }, { c: 1, z: M[0x02] === 0 ? 1 : 0, n: 0 });
    return P.start_blow(regs(r, { a, x, y }, { c: 0, z: M[0x02] === 0 ? 1 : 0, n: 0 }));
  };
  // $222B: begin a jump of 15 steps; a drift flag for the way the stick leans when the player
  // already faces that way; the jumping frame; a jump-sound request.
  function start_jump(r) {
    let x = r.x & 255, y, a;
    M[JUMP + x] = 0x0F;
    y = 0;
    a = M[INPUT + x] & 4;
    if (a === 0) { a = M[0x25]; if (a >= 4 && a < 8) y = 0xFF; }
    a = y; M[DRIFT_L + x] = a;
    y = 0;
    a = M[INPUT + x] & 8;
    if (a === 0) { a = M[0x25]; if (a < 4) y = 0xFF; }
    a = y; M[DRIFT_R + x] = a;
    a = M[FRAME + x];
    if (a < 8) { a |= 2; M[FRAME + x] = a; }
    const j = inc(0xB1);
    return ret(r, { a, x, y }, nz(j));
  }
  // $226B: walk two pixels left (turning first; the walk cycle every fourth call; a wall beside
  // the player blocks when Y >= $2D and the player is at a cell boundary); the walking bonus.
  P.walk_left = function (r) {
    let x = r.x & 255, y, a;
    M[0x04] = 0xFE;
    y = 0x28;
    a = M[0x24];
    if (a !== 0) y = 0x50;
    a = M[0x25];
    if (a === 4 || a === 5) return walk_cycle(r, x, y);
    if (a === 0x0A || a === 0x0B) return walk_move(r, x, y, a);
    a = M[BLOW + x];
    if (!(a & 0x80)) return ret(r, { a, x, y }, nz(a));
    a = 4; M[FRAME + x] = 4;
    return ret(r, { a, x, y });
  };
  // $22C3: the same to the right.
  P.walk_right = function (r) {
    let x = r.x & 255, y, a;
    M[0x04] = 0x02;
    y = 0x2B;
    a = M[0x24];
    if (a !== 0) y = 0x53;
    a = M[0x25];
    if (a < 2) return walk_cycle(r, x, y);
    if (a === 8 || a === 9) return walk_move(r, x, y, a);
    a = M[BLOW + x];
    if (!(a & 0x80)) return ret(r, { a, x, y }, nz(a));
    a = 0; M[FRAME + x] = 0;
    return ret(r, { a, x, y });
  };
  // b_2294: the walk cycle, then the step.
  function walk_cycle(r, x, y) {
    let a = inc(TICK + x);
    if (a >= 4) {
      M[TICK + x] = 0;
      r = P.flip_frame_bit(regs(r, { a: 0, x, y }));
      a = r.a; x = r.x & 255; y = r.y;
    }
    return walk_move(r, x, y, a);
  }
  // b_22A6: the step of $04 if the cell beside the player (Y) is not solid.
  function walk_move(r, x, y, a) {
    a = M[Y + x];
    if (a >= 0x2D) {
      a = M[0x23];
      if (a === 0) { a = map(y); if (a & 0x80) return ret(r, { a, x, y }, nz(a)); }
    }
    a = M[0x63 + x];
    if (a !== 0) { r = P.score_ten(regs(r, { a, x, y })); a = r.a; x = r.x & 255; y = r.y; }
    a = (M[X + x] + M[0x04]) & 255; M[X + x] = a;
    return ret(r, { a, x, y });
  }
  // $22E8: fire: with the reload timer out and no blow in progress, a six-call blow, facing kept.
  P.start_blow = function (r) {
    let x = r.x & 255, y = r.y, a;
    a = M[0xA824 + x];
    if (a !== 0) return ret(r, { a, x, y }, nz(a));
    a = M[BLOW + x];
    if (!(a & 0x80)) return ret(r, { a, x, y }, nz(a));
    M[BLOW + x] = 6;
    a = (M[FRAME + x] & 4) >> 1;
    M[0xACCB + x] = a;
    return ret(r, { a, x, y }, nz(a));
  };
  // $2301: Y = the blow counter, Z from its load. Frame by the counter; at 4 the bubble is made in
  // the highest free object slot (type $16, life $7D, the player's powers), one cell right when
  // the frame is 9 and one cell down when the player is jumping four or more pixels into a cell;
  // with fire breath a fireball ($44) instead; the blowing bonus; then blow_mark_owner, whose
  // opcode at $23DE is RTS or LDA $37C7,X.
  P.blow_animation = function (r) {
    let x = r.x & 255, y = r.y & 255, a;
    const z = r.z !== undefined ? (r.z ? 1 : 0) : (y === 0 ? 1 : 0);
    if (z) {
      a = (M[0xACCB + x] << 1) & 255; M[FRAME + x] = a;
      const d = dec(BLOW + x);
      return ret(r, { a, x, y }, nz(d));
    }
    a = (M[0xACCB + x] + M[0xACC4 + y]) & 255; M[FRAME + x] = a;
    dec(BLOW + x);
    if (y !== 4) return ret(r, { a, x, y }, cmp(y, 4));
    for (y = 0x11; y >= 0; y--) { a = M[0xCA + y]; if (a & 0x80) break; }
    if (y < 0) return ret(r, { a, x, y: 0xFF }, { n: 1, z: 0 });
    // b_232A
    a = M[X + x]; M[0xAA0C + y] = a;
    a = (a - 0x14) & 255;
    M[0xA9C4 + y] = (a & 6) >> 1;
    M[0xDC + y] = a >> 3;
    a = M[Y + x]; M[0xAA1E + y] = a;
    if (a < 0x15) return ret(r, { a: (a - 0x15) & 255, x, y }, { c: 0 });
    a = (a - 0x15) & 255;
    M[0xA9D6 + y] = a & 6;
    M[0xEE + y] = a >> 3;
    M[0xCA + y] = 0x16;
    M[0xA9FA + y] = 0x7D; M[0xA9E8 + y] = 0x7D;
    M[0xA824 + x] = M[0xA77B + x];
    M[0xAA42 + y] = M[0xA781 + x];
    M[0xA9B2 + y] = M[0xA77D + x];
    M[0xAA30 + y] = M[0xA77F + x];
    a = M[FRAME + x];
    if (a === 0x09) {
      let s = adc(M[0xDC + y], 1, 0); M[0xDC + y] = s.a;
      s = adc(M[0xAA0C + y], 8, s.c); M[0xAA0C + y] = s.a;
      a = 0x00;                                    // LDA #$00 / BIT $80A9 (skips the LDA #$80 at $2397)
    } else a = 0x80;                               // b_2397 is the LDA #$80 inside that BIT
    M[0x0193 + y] = a;
    // b_239C
    a = M[JUMP + x];
    if (!(a & 0x80)) {
      a = M[0x24];
      if (a >= 4) {
        let s = adc(M[0xEE + y], 1, 0); M[0xEE + y] = s.a;
        s = adc(M[0xAA1E + y], 8, s.c); M[0xAA1E + y] = s.a;
        a = s.a;
      }
    }
    // b_23B8
    a = M[0xA783 + x];
    if (!(a & 0x80)) {
      dec(0xA783 + x);
      a = M[0x0193 + y];
      a = (a & 0x80) ? 0x00 : 0x02;                // LDA #$02 / BIT $00A9 (skips the LDA #$00 at $23C8)
      M[0xA9C4 + y] = a;
      M[0xA9B2 + y] = 0;
      a = 0x44; M[0xCA + y] = 0x44;
    }
    // b_23D7
    a = M[0x65 + x];
    if (a !== 0) { r = P.score_ten(regs(r, { a, x, y })); a = r.a; x = r.x & 255; y = r.y; }
    // blow_mark_owner $23DE: the opcode decides
    const op = M[0x23DE];
    if (op === 0x60) return ret(r, { a, x, y });
    if (op !== 0xBD) throw new Error('blow_mark_owner: opcode $' + op.toString(16) + ' at $23DE');
    const at = M[0x23DF] | (M[0x23E0] << 8);
    a = M[(at + x) & 0xFFFF];
    if (!(a & 0x80)) return ret(r, { a, x, y }, nz(a));
    a = x | 8; M[0xA9FA + y] = a;
    return ret(r, { a, x, y });
  };
  // $23EA: A = the jump counter (Z from its load). Rising by jump_arc_player read backwards,
  // wrapping from the top to the bottom; zero means the way down (player_fall_step).
  function player_jump_step(r) {
    let x = r.x & 255, y = r.y, a = r.a & 255;
    const z = r.z !== undefined ? (r.z ? 1 : 0) : (a === 0 ? 1 : 0);
    if (z) return player_fall_step(regs(r, { a, x, y }));
    dec(JUMP + x);
    y = a;
    a = (M[Y + x] - M[0xACCD + y]) & 255;
    if (a < 5) a = (a + 0xF0) & 255;               // ADC #$F0 with the carry the CMP cleared
    M[Y + x] = a;
    return jump_sideways(r, x, y, a);
  }
  // $2401: coming down by the arc read forwards, wrapping from the bottom; a floor whose top the
  // feet cross (sub_y passed) lands the player, snapped to the cell.
  function player_fall_step(r) {
    let x = r.x & 255, y = r.y, a;
    a = M[FALL_PHASE + x];
    if (a & 0x80) {
      a = M[FRAME + x];
      if ((a >= 2 && a < 4) || (a >= 6 && a < 8)) { a &= 5; M[FRAME + x] = a; }
      a = 0; M[FALL_PHASE + x] = 0;
    }
    // b_2423
    if (a === 0x10) return player_land(regs(r, { a, x, y }, cmp(a, 0x10)));
    inc(FALL_PHASE + x);
    y = a;
    a = (M[Y + x] + M[0xACCD + y]) & 255;
    if (a >= 0xF5) a = (a - 0xF0) & 255;
    M[Y + x] = a;
    if (a < 0x1F) return jump_sideways(r, x, y, a);
    a = ((a - 0x2D) & 255) & 7;
    if (a >= M[0x24]) return jump_sideways(r, x, y, a);
    r = P.actor_map_pointer(regs(r, { a, x, y }));
    a = r.a; x = r.x & 255; y = r.y;
    let p = probe3(0x29);
    a = p.a; y = p.y;
    if (p.hit) return jump_sideways(r, x, y, a, true);
    p = probe3(0x51);
    a = p.a; y = p.y;
    if (!p.hit) return jump_sideways(r, x, y, a, true);
    // b_2474
    a = (((M[Y + x] - 0x2D) & 0xF8) + 0x2D) & 255; M[Y + x] = a;
    return player_land(regs(r, { a, x, y }));
  }
  // j_2483 (and b_248D with `mapped`): the jump sound's bonus, the map pointer, then the drift of
  // the jump with its wall tests, the two-frame cycle, and j_25F1's stick reads every second call.
  function jump_sideways(r, x, y, a, mapped) {
    if (!mapped) {
      a = M[0x61 + x];
      if (a !== 0) { r = P.score_ten(regs(r, { a, x, y })); a = r.a; x = r.x & 255; y = r.y; }
      r = P.actor_map_pointer(regs(r, { a, x, y }));
      a = r.a; x = r.x & 255; y = r.y;
    }
    // b_248D
    a = M[DRIFT_L + x];
    if (a & 0x80) {
      a = M[X + x];
      if (a < 0x25) { a = 0x24; M[X + x] = 0x24; a = 0; M[DRIFT_L + x] = 0; }   // b_24B5, b_24B9
      else {
        y = 0x28; a = M[0x24]; if (a !== 0) y = 0x50;
        let stop = false;
        a = M[Y + x];
        if (a >= 0x2D) {
          a = M[0x23];
          if (a === 0) {
            a = map(y);
            if (a & 0x80) { y = (y + 1) & 255; a = map(y); stop = !(a & 0x80); }
          }
        }
        if (stop) { a = 0; M[DRIFT_L + x] = 0; }
        else dec(X + x);
      }
    } else {
      // b_24C5
      a = M[DRIFT_R + x];
      if (a & 0x80) {
        a = M[X + x];
        if (a >= 0xF4) { a = 0xF4; M[X + x] = 0xF4; a = 0; M[DRIFT_R + x] = 0; }   // b_24ED, b_24F1
        else {
          y = 0x2B; a = M[0x24]; if (a !== 0) y = 0x53;
          let stop = false;
          a = M[Y + x];
          if (a >= 0x2D) {
            a = M[0x23];
            if (a === 0) {
              a = map(y);
              if (a & 0x80) { y = (y - 1) & 255; a = map(y); stop = !(a & 0x80); }
            }
          }
          if (stop) { a = 0; M[DRIFT_R + x] = 0; }
          else inc(X + x);
        }
      }
    }
    // b_24FA
    a = inc(TICK + x);
    if (a < 2) return ret(r, { a, x, y }, cmp(a, 2));
    M[TICK + x] = 0;
    a = M[FRAME + x];
    if (a >= 8) return ret(r, { a, x, y }, cmp(a, 8));
    a ^= 1; M[FRAME + x] = a;
    return air_input(r, x, y, a);
  }
  // j_25F1: in the air, every second call: fire blows; left or right turns the player or moves
  // them one pixel when the cell beside them is free.
  function air_input(r, x, y, a) {
    r = P.actor_map_pointer(regs(r, { a, x, y }));
    a = r.a; x = r.x & 255; y = r.y;
    a = M[INPUT + x] & 0x10;
    if (a === 0) { r = P.start_blow(regs(r, { a, x, y }, nz(a))); a = r.a; x = r.x & 255; y = r.y; }
    // b_25FE
    a = M[INPUT + x] & 4;
    if (a === 0) {
      a = M[0x25];
      if (a < 4 || a === 8 || a === 9) {           // b_2613: turn left
        a = M[BLOW + x];
        if (!(a & 0x80)) return ret(r, { a, x, y }, nz(a));
        a = 4; M[FRAME + x] = 4;
        return ret(r, { a, x, y });
      }
      // b_261E
      a = M[X + x];
      if (a === 0x24) return ret(r, { a, x, y }, cmp(a, 0x24));
      y = 0x28; a = M[0x24];
      let move = false;
      if (a !== 0) { y = 0x50; a = M[Y + x]; if (a < 0x2D) move = true; }
      if (!move) {
        a = M[0x23];
        if (a !== 0) move = true;
        else { a = map(y); if (a & 0x80) return ret(r, { a, x, y }, nz(a)); }
      }
      dec(X + x);
      return ret(r, { a, x, y });
    }
    // b_263D
    a = M[INPUT + x] & 8;
    if (a !== 0) return ret(r, { a, x, y }, nz(a));
    a = M[0x25];
    if (!(a < 4 || a === 8 || a === 9)) {          // turn right
      a = M[BLOW + x];
      if (!(a & 0x80)) return ret(r, { a, x, y }, nz(a));
      a = 0; M[FRAME + x] = 0;
      return ret(r, { a, x, y });
    }
    // b_265D
    a = M[X + x];
    if (a === 0xF4) return ret(r, { a, x, y }, cmp(a, 0xF4));
    y = 0x2B; a = M[0x24];
    let move = false;
    if (a !== 0) { y = 0x53; a = M[Y + x]; if (a < 0x2D) move = true; }
    if (!move) {
      a = M[0x23];
      if (a !== 0) move = true;
      else { a = map(y); if (a & 0x80) return ret(r, { a, x, y }, nz(a)); }
    }
    inc(X + x);
    return ret(r, { a, x, y });
  }
  // $2519: the end of a jump: counters cleared, X aligned to an even pixel for the facing, and a
  // fall started when nothing is under the feet (except at the floor of round 92).
  function player_land(r) {
    let x = r.x & 255, y = r.y, a;
    M[JUMP + x] = 0xFF; M[FALL_PHASE + x] = 0xFF;
    a = M[FRAME + x];
    let odd = true;
    if ((a >= 4 && a < 8) || (a >= 8 && a < 0x0A)) {   // b_2530
      a = M[X + x] & 0xFE; M[X + x] = a;
      odd = a === 0;
    }
    if (odd) { a = ((M[X + x] + 1) & 0xFE) & 255; M[X + x] = a; }   // b_2538
    // b_2541
    let p = probe3(0x29);
    a = p.a; y = p.y;
    if (!p.hit) {
      p = probe3(0x51);
      a = p.a; y = p.y;
      if (p.hit) return ret(r, { a, x, y }, nz(a));
    }
    // b_2569
    a = M[0x10];
    if (a === 0x5B) { a = M[Y + x]; if (a === 0xDD) return ret(r, { a, x, y }, cmp(a, 0xDD)); }
    inc(FALLING + x);
    return tail('enemy_fall', regs(r, { a, x, y }));
  }
  // $257C: falling two pixels a call, wrapping from $F5 to $15, until a floor is under the feet;
  // the stick is read every second call meanwhile.
  function player_fall(r) {
    let x = r.x & 255, y = r.y, a;
    a = (M[Y + x] + 2) & 255; M[Y + x] = a;
    if (a === 0xF5) { a = 0x15; M[Y + x] = 0x15; return ret(r, { a, x, y }); }
    let landed = false;
    if (a >= 0x26) {
      a = ((a - 0x2D) & 255) & 7;
      if (a === 0) {
        let p = probe3(0x51);
        a = p.a; y = p.y;
        if (!p.hit) { p = probe3(0x79); a = p.a; y = p.y; landed = p.hit; }
      }
    }
    if (landed) {
      dec(FALLING + x);
      a = M[FRAME + x];
      if ((a >= 4 && a < 8) || a >= 0x0A) { a = M[X + x] & 0xFE; M[X + x] = a; return ret(r, { a, x, y }); }
      a = ((M[X + x] + 1) & 0xFE) & 255; M[X + x] = a;
      return ret(r, { a, x, y });
    }
    // b_25E2
    a = inc(TICK + x);
    if (a < 2) return ret(r, { a, x, y }, cmp(a, 2));
    M[TICK + x] = 0;
    return air_input(r, x, y, 0);
  }

  // --- the beaten enemy -------------------------------------------------------------------------
  // $267C: state $0B: tumbling through four frames, sideways at its speed between X $24 and $F4,
  // up at its speed (one less every fourth call), then down faster each call, wrapping; when the
  // falling speed passes the random limit (1-8, bit 7 set) the state becomes $0C.
  P.enemy_thrown = function (r) {
    let x = r.x & 255, y = r.y, a;
    a = dec(BLOW + x);
    if (a & 0x80) {
      M[BLOW + x] = 3;
      a = M[FALL_PHASE + x];
      if (!(a & 0x80)) {
        a = dec(DRIFT_R + x);
        if (a === 0) {
          r = P.random(regs(r, { a, x, y }));
          a = r.a & 255; x = r.x & 255; y = r.y;
          a = ((a & 7) + 1) | 0x80; M[FALL_PHASE + x] = a;
        }
      } else {
        // b_269F
        a = inc(DRIFT_R + x) | 0x80;
        if (a > M[FALL_PHASE + x]) {
          M[X + x] &= 0xFE;
          M[Y + x] |= 1;
          a = 0x0C; M[STATE + x] = 0x0C;
          return ret(r, { a, x, y });
        }
      }
    }
    // b_26BF
    a = M[FALLING + x];
    if (a === 0) {
      a = (M[JUMP + x] + M[X + x]) & 255; M[X + x] = a;
      if (a >= 0xF4) { a = 0xF4; M[X + x] = 0xF4; inc(FALLING + x); }
    } else {
      a = (M[X + x] - M[JUMP + x]) & 255; M[X + x] = a;
      if (a < 0x24) { a = 0x24; M[X + x] = 0x24; dec(FALLING + x); }
    }
    // b_26EC
    a = M[FALL_PHASE + x];
    if (!(a & 0x80)) {
      a = (M[Y + x] - M[DRIFT_R + x]) & 255; M[Y + x] = a;
      if (a < 0x15) { a = 0xF5; M[Y + x] = 0xF5; }
    } else {
      a = (M[DRIFT_R + x] + M[Y + x]) & 255; M[Y + x] = a;
      if (a >= 0xF5) { a = 0x15; M[Y + x] = 0x15; }
    }
    return spin_tail(r, x, y);
  };
  // b_2713: the tumbling frame from the call count and the kind's table; the fast flag cleared.
  function spin_tail(r, x, y) {
    let a = (inc(INPUT + x) >> 2) & 3;
    if (a !== 0) { y = M[DRIFT_L + x]; a = (a + M[0xAB89 + y]) & 255; }
    M[FRAME + x] = a;
    M[FAST + x] = 0;
    return ret(r, { a: 0, x, y }, nz(0));
  }
  // $272F: fall_to_floor with its tail JMP ($2782) made an RTS, then put back.
  P.fall_to_floor_once = function (r) {
    M[0x2782] = 0x60;
    r = P.fall_to_floor(regs(r, { a: 0x60 }));
    M[0x2782] = 0x4C;
    return ret(r, { a: 0x4C }, nz(0x4C));
  };
  // $273D: state $0C: two pixels down a call, wrapping at $F5, until the feet cross a floor; then
  // the state at $277F; the tail at $2782 is the JMP to the spin (or the RTS of fall_to_floor_once).
  P.fall_to_floor = function (r) {
    let x = r.x & 255, y = r.y, a;
    a = (M[Y + x] + 2) & 255; M[Y + x] = a;
    if (a === 0xF5) { a = 0x15; M[Y + x] = 0x15; }
    let landed = false;
    if (a >= 0x1F) {
      a = ((a - 0x2D) & 255) & 7;
      if (a === 0) {
        let p = probe3(0x51);
        a = p.a; y = p.y;
        if (!p.hit) { p = probe3(0x79); a = p.a; y = p.y; landed = p.hit; }
      }
    }
    if (landed) { a = M[0x277F]; M[STATE + x] = a; }
    const op = M[0x2782];
    if (op === 0x60) return ret(r, { a, x, y });
    if (op !== 0x4C) throw new Error('fall_to_floor: opcode $' + op.toString(16) + ' at $2782');
    return spin_tail(r, x, y);
  };
  // $2785: state $16: light blue; on a floor it lies (state $17), else it is snapped and falls
  // (fall_to_floor_once), lying once it lands; then the touch test of enemy_frozen.
  P.enemy_frozen_fall = function (r) {
    let x = r.x & 255, y = r.y, a;
    M[COLOUR + x] = 0x0E;
    let p = probe3(0x29);
    a = p.a; y = p.y;
    let fall = p.hit;
    if (!fall) {
      // b_279E: solid at $51 or $52 means it lies where it is; the third cell ($53, read when
      // sub_x is not 0) decides nothing, because the BPL at $27B0 branches to the next
      // instruction either way: a frozen enemy held up only by that cell falls.
      y = 0x51; a = map(y);
      if (!(a & 0x80)) { y = 0x52; a = map(y); }
      if (a & 0x80) fall = false;
      else { a = M[0x23]; fall = true; if (a !== 0) { y = 0x53; a = map(y); } }
    }
    if (fall) {
      // b_27B2
      M[X + x] &= 0xFE;
      M[Y + x] |= 1;
      r = P.fall_to_floor_once(regs(r, { a: M[Y + x], x, y }));
      x = r.x & 255; y = r.y;
      a = M[STATE + x];
      if (a !== 0x11) return P.enemy_frozen(regs(r, { a, x, y }, cmp(a, 0x11)));
    }
    a = 0x17; M[STATE + x] = 0x17;
    return P.enemy_frozen(regs(r, { a, x, y }));
  };
  // $27CB: state $17: a live player within 16 pixels kills it (its saved state back, kill_enemy).
  P.enemy_frozen = function (r) {
    let x = r.x & 255, y, a;
    for (y = 1; y >= 0; y--) {
      a = M[STATE + y];
      if (a === 0) continue;
      a = absd(M[X + x], M[X + y]);
      if (a >= 0x10) continue;
      a = absd(M[Y + x], M[Y + y]);
      if (a >= 0x10) continue;
      a = M[JUMP + x]; M[STATE + x] = a;
      x = (x - 2) & 255;
      r = P.kill_enemy(regs(r, { a, x, y }));
      x = M[0x22];
      a = 0x0A; M[TIMER + x] = 0x0A;
      return ret(r, { a, x });
    }
    return ret(r, { a, x, y: 0xFF });
  };
  // $2808: state $0A: idle animation for the saved kind, a fall to the floor that restores the
  // saved state ($277F), X kept inside $24-$F4 (a dropper's X is snapped to four pixels), and
  // the jump, fall and blow flags cleared.
  P.enemy_released = function (r) {
    let x = r.x & 255, y = r.y, a;
    a = M[JUMP + x]; M[0x277F] = a;
    r = P.idle_animation(regs(r, { a, x, y }, nz(a)));
    r = P.fall_to_floor_once(r);
    x = r.x & 255; y = r.y;
    M[0x277F] = 0x11;
    a = M[STATE + x];
    if (a === 0x0A) return ret(r, { a, x, y }, cmp(a, 0x0A));
    if (a === 0x09) {
      const ax = M[X + x];
      a = (((ax - 0x14) & 255) & 0xFC) + 0x13 + (ax >= 0x14 ? 1 : 0);
      a &= 255; M[X + x] = a;
    }
    a = 0x24;
    if (!(a < M[X + x])) M[X + x] = a;
    a = 0xF4;
    if (!(a >= M[X + x])) M[X + x] = a;
    a = 0xFF;
    M[JUMP + x] = 0xFF; M[FALL_PHASE + x] = 0xFF; M[FALLING + x] = 0xFF; M[BLOW + x] = 0xFF;
    return ret(r, { a, x, y });
  };
  // $284D: state $0D: placed at the cell behind the stream's head each call. At the bottom row
  // ($ED) an enemy is beaten (state $0C, rank 7) and a player set down at X $64 or $B4 in state
  // 1. A carried player still blows and reads the stick; a jump frees them.
  P.carried_by_water = function (r) {
    let x = r.x & 255, y = r.y, a;
    let v = M[0xA754];
    a = (((v << 3) & 255) + 0x14 + ((v >> 5) & 1)) & 255;   // three ASLs, then ADC with their carry
    M[X + x] = a;
    v = M[0xA75F];
    a = (((v << 3) & 255) + 0x05 + ((v >> 5) & 1)) & 255;
    M[Y + x] = a;
    if (a === 0xED) {
      if (x < 2) {
        // b_287C
        a = 0x64;
        y = M[X + x];
        if (y >= 0x94) a = 0xB4;
        M[X + x] = a;
        a = 1; M[STATE + x] = 1;
        return ret(r, { a, x, y });
      }
      M[TIMER + x] = 7;
      dec(STATE + x);
      dec(0x4A);
      a = 0x0E; M[COLOUR + x] = 0x0E;
    }
    if (x >= 2) return ret(r, { a, x, y }, { c: 1 });
    // b_288D
    y = M[BLOW + x];
    if (!(y & 0x80)) { r = P.blow_animation(regs(r, { a, x, y }, nz(y))); a = r.a; x = r.x & 255; y = r.y; }
    a = M[INPUT + x]; M[0x02] = a;
    r = P.player_ground_input(regs(r, { a, x, y }));
    a = r.a; y = r.y;
    x = M[0x22];
    a = M[JUMP + x];
    if (!(a & 0x80)) { a = 1; M[STATE + x] = 1; return ret(r, { a, x, y }); }
    return ret(r, { a, x, y }, nz(a));
  };
  // $28A5: state $0E: 32 calls of the first spin (frames by the count, falling three pixels a
  // call when in the air), then frames $0F-$12 until the count reaches $C8; then state $0F.
  P.player_dying = function (r) {
    let x = r.x & 255, y = r.y, a;
    M[FAST + x] = 0;
    a = M[CHASE_LEVEL + x];
    if (a !== 0x12) { M[CHASE_LEVEL + x] = 0x12; M[TICK + x] = 0x20; }
    a = dec(TICK + x);
    if (a & 0x80) {
      // b_28E9
      y = a;
      a = (((a >> 1) & 3) + 0x0F) & 255; M[FRAME + x] = a;
      if (y !== 0xC8) return ret(r, { a, x, y }, cmp(y, 0xC8));
      inc(STATE + x);
      return ret(r, { a, x, y });
    }
    a = (a >> 1) & 3;
    if (a !== 0) { y = M[DRIFT_L + x]; a = (a + 0x0B) & 255; }
    M[FRAME + x] = a;
    a = M[JUMP + x];
    if (a & 0x80) { a = M[FALLING + x]; if (a & 0x80) return ret(r, { a, x, y }, nz(a)); }
    a = (M[Y + x] + 3) & 255;
    if (a >= 0xF5) a = 0x15;
    M[Y + x] = a;
    return ret(r, { a, x, y });
  };
  // $28E8: state $0F: nothing.
  P.actor_nop = function (r) { return ret(r, {}); };
  // $28FA: state $18: flash and control as state 1, then control once more as state 1.
  P.player_invincible = function (r) {
    r = P.flash_and_control(r);
    let x = M[0x22];
    M[STATE + x] = 1;
    r = P.run_actor_state(regs(r, { a: 1, x }, nz(1)));
    x = M[0x22];
    M[STATE + x] = 0x18;
    return ret(r, { a: 0x18, x });
  };
  // $290D: state $10: flash and control while $8688 counts down, then state 1.
  P.player_reappear = function (r) {
    const x = r.x & 255;
    const a = dec(CHASE_PERIOD + x);
    if (a !== 0) return P.flash_and_control(regs(r, { a, x }, nz(a)));
    M[STATE + x] = 1;
    return P.flash_and_control(regs(r, { a: 1, x }, nz(1)));
  };
  // $2916: flip the colour (EOR 5) and run player_control.
  P.flash_and_control = function (r) {
    const x = r.x & 255;
    const a = M[COLOUR + x] ^ 5; M[COLOUR + x] = a;
    return P.player_control(regs(r, { a, x }, nz(a)));
  };

  // --- the food and the bonus states ---------------------------------------------------------------
  // $2921: state $11, one actor a run (the gate at $2922): the food for its rank, its colour,
  // state $12 for $C8 calls, and its sprite ($F2 + actor) built from the item picture's four
  // glyphs through remap_pairs into the buffer whose address is written at $2970/$298D.
  P.enemy_to_food = function (r) {
    let x = r.x & 255, y = r.y, a;
    a = M[0x2922];
    if (a !== 0) return ret(r, { a, x, y }, nz(a));
    inc(0x2922);
    y = M[TIMER + x];
    a = M[0xA790 + y]; y = a;
    inc(STATE + x);
    M[JUMP + x] = 0xC8;
    M[FRAME + x] = x;
    M[SPRITE + x] = 0xF2;
    a = M[0xA8E4 + y] & 7; M[COLOUR + x] = a;
    M[FAST + x] = 0;
    M[0x05] = 0;
    a = M[0xA892 + y];
    r = P.item_picture_address(regs(r, { a, x, y }));
    a = r.a; x = r.x & 255; y = r.y;
    M[0x2970] = M[0xA783 + x]; M[0x298D] = M[0xA783 + x];
    M[0x2971] = M[0xA789 + x]; M[0x298E] = M[0xA789 + x];
    const src = () => M[0x04] | (M[0x05] << 8);
    let dst = M[0x2970] | (M[0x2971] << 8);
    for (y = 0x0F, x = 0x3D; y >= 0; y--, x = (x - 3) & 255) {
      a = M[(src() + y) & 0xFFFF];
      r = P.remap_pairs(regs(r, { a, x, y }));
      a = r.a & 255;
      M[(dst + x) & 0xFFFF] = a;
    }
    const s = adc(M[0x04], 0x10, 0);
    M[0x04] = s.a;
    if (s.c) inc(0x05);
    dst = M[0x298D] | (M[0x298E] << 8);
    for (y = 0x0F, x = 0x3E; y >= 0; y--, x = (x - 3) & 255) {
      a = M[(src() + y) & 0xFFFF];
      r = P.remap_pairs(regs(r, { a, x, y }));
      a = r.a & 255;
      M[(dst + x) & 0xFFFF] = a;
    }
    return ret(r, { a, x, y: 0xFF });
  };
  // $2996: character multicolour to sprite multicolour: each bit pair %10 or %11 has its low
  // bit flipped.
  P.remap_pairs = function (r) {
    let a = r.a & 255, t;
    M[0x02] = a;
    t = a & 0x80; if (t) t >>= 1; a = t ^ M[0x02]; M[0x02] = a;
    t = a & 0x20; if (t) t >>= 1; a = t ^ M[0x02]; M[0x02] = a;
    t = a & 0x08; if (t) t >>= 1; a = t ^ M[0x02]; M[0x02] = a;
    t = a & 0x02; if (t) t >>= 1; a = t ^ M[0x02];
    return ret(r, { a }, nz(a));
  };
  // $29BB: state $12: a player (live, or dying) within 16 pixels takes the score for its rank
  // (food_scores; in thousands unless the code is $50) with a sound; gone when taken or timed out.
  P.food_wait = function (r) {
    let x = r.x & 255, y, a;
    a = dec(JUMP + x);
    let gone = a === 0;
    if (!gone) {
      for (y = 1; y >= 0; y--) {
        a = M[STATE + y];
        if (a === 0 || a === 0x0F) continue;      // a dying player ($0E) still eats
        a = absd(M[X + x], M[X + y]);
        if (a >= 0x10) continue;
        a = absd(M[Y + x], M[Y + y]);
        if (a >= 0x10) continue;
        M[0x02] = y;
        y = M[TIMER + x];
        a = M[0xA79A + y];
        y = M[0x02];
        y = M[0xAB51 + y];
        if (a !== 0x50) y = (y - 1) & 255;
        r = P.add_score(regs(r, { a, x, y }));
        a = r.a; x = r.x & 255; y = r.y;
        a = 1; M[0xB0] = 1;
        gone = true;
        break;
      }
      if (!gone) return ret(r, { a, x, y: 0xFF });
    }
    a = 0;
    M[X + x] = 0; M[Y + x] = 0; M[STATE + x] = 0;
    return ret(r, { a, x, y });
  };
  // $2A18: state $13: the six sprites fly apart by giant_step_x/y, flashing; when actor 2 is
  // above Y $50 the saved enemies are put back.
  P.giant_gather = function (r) {
    let x = r.x & 255, y = r.y, a;
    a = (M[X + x] + M[0xA7A3 + x]) & 255; M[X + x] = a;
    a = (M[Y + x] + M[0xA7A8 + x]) & 255; M[Y + x] = a;
    a = M[COLOUR + x] ^ 5; M[COLOUR + x] = a;
    a = 0; M[FAST + x] = 0;
    if (x !== 2) return ret(r, { a, x, y }, cmp(x, 2));
    a = M[Y + x];
    if (a >= 0x50) return ret(r, { a, x, y }, cmp(a, 0x50));
    return restore_saved_enemies(regs(r, { a, x, y }));
  };
  // $2A3F: clear the item sprites and restore the six enemies from $4700-$4737 in light blue;
  // one saved at state $11 or more is emptied. enemies_left = 0.
  function restore_saved_enemies(r) {
    r = P.clear_item_sprites(r);
    let a = 0, x, y = r.y;
    M[0x4A] = 0;
    for (x = 5; x >= 0; x--) {
      a = M[0x4700 + x];
      if (a < 0x11) {
        M[STATE + 2 + x] = a;
        M[X + 2 + x] = M[0x4710 + x];
        M[Y + 2 + x] = M[0x4720 + x];
        M[SPRITE + 2 + x] = M[0x4730 + x];
        a = 0x0E; M[COLOUR + 2 + x] = 0x0E;
      } else {
        a = 0; M[STATE + 2 + x] = 0; M[X + 2 + x] = 0; M[Y + 2 + x] = 0;
      }
    }
    return ret(r, { a, x: 0xFF, y });
  }
  // $2A74: state $14: flash (EOR 3); on actor 2 every second run flip the sprite expansion of
  // sprites 2-7 and put them at formation A (expanded) or B (place_formation).
  P.giant_flash = function (r) {
    const c = io();
    let x = r.x & 255, y = r.y, a;
    a = M[COLOUR + x] ^ 3; M[COLOUR + x] = a;
    a = M[0x08] & 2;
    if (a !== 0) return ret(r, { a, x, y }, nz(a));
    if (x !== 2) return ret(r, { a, x, y }, cmp(x, 2));
    x = 5; y = 0x0E;
    a = c.vicRead(0x17) ^ 0xFC;
    c.vicWrite(0x17, a); c.vicWrite(0x1D, a);
    if (a === 0) return P.place_formation(regs(r, { a, x, y }, nz(a)));
    do {
      a = M[0xA7B0 + x]; M[X + 2 + x] = a; c.vicWrite(y & 0x3F, a);
      a = M[0xA7B6 + x]; M[Y + 2 + x] = a; c.vicWrite((y + 1) & 0x3F, a);
      y = (y - 2) & 255; x = (x - 1) & 255;
    } while (!(x & 0x80));
    return ret(r, { a, x, y });
  };
  // $2AAD: X = 5, Y = $0E: the six enemy sprites at formation B; once the frame count reaches
  // $3C the saved enemies return.
  P.place_formation = function (r) {
    const c = io();
    let x = r.x & 255, y = r.y & 255, a;
    do {
      a = M[0xA7BC + x]; M[X + 2 + x] = a; c.vicWrite(y & 0x3F, a);
      a = M[0xA7C2 + x]; M[Y + 2 + x] = a; c.vicWrite((y + 1) & 0x3F, a);
      y = (y - 2) & 255; x = (x - 1) & 255;
    } while (!(x & 0x80));
    a = M[0x08];
    if (a < 0x3C) return ret(r, { a, x, y }, cmp(a, 0x3C));
    return restore_saved_enemies(regs(r, { a, x, y }, cmp(a, 0x3C)));
  };
  // $2ACB: state $15: the giant food, four sprites (actors 2-5, shape $F4, the colour patched at
  // $2AE9) at X $80/$98 coming down four pixels a call until actor 2's Y is $C8; a player inside
  // its 48 by 36 box takes the score code in giant_score and the four sprites go.
  P.giant_food = function (r) {
    let x = r.x & 255, y, a;
    a = M[Y + 2];
    if (a !== 0xC8) {
      M[X + 2] = 0x80; M[X + 4] = 0x80;
      M[X + 3] = 0x98; M[X + 5] = 0x98;
      for (y = 3; y >= 0; y--) {
        M[SPRITE + 2 + y] = 0xF4;
        M[FRAME + 2 + y] = y;
        a = M[0x2AE9]; M[COLOUR + 2 + y] = a;
        a = (M[Y + 2 + y] + 4) & 255; M[Y + 2 + y] = a;
      }
    }
    // b_2AF9
    y = 1;
    for (;;) {
      a = (M[X + y] - M[X + 2]) & 255;
      let inside = M[X + y] >= M[X + 2] && a < 0x30;
      if (inside) { a = (M[Y + y] - M[Y + 2]) & 255; inside = M[Y + y] >= M[Y + 2] && a < 0x24; }
      if (inside) {
        a = M[0xAB51 + y]; y = (a - 1) & 255;
        a = M[0x69];
        r = P.add_score(regs(r, { a, x, y }));
        a = r.a; x = r.x & 255;
        a = 0;
        for (y = 3; y >= 0; y--) { M[STATE + 2 + y] = 0; M[X + 2 + y] = 0; M[Y + 2 + y] = 0; }
        y = 0xFF;
      }
      y = (y - 1) & 255;
      if (y & 0x80) break;
    }
    return ret(r, { a, x, y });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);

/* port/src/ai.js */
// The enemies' movement ($E9FD-$EFE9) and the music driver ($7305-$7429, $F477-$F921).
//
// The enemy AI: the state handlers for the walker (enemy_walker $EA08), the three shooters
// (enemy_shooter $E9FD, with enemy_shoot $ED3B), the two flyers (enemy_flyer $EFC0,
// enemy_flyer_fast $EEB2) and what they share: the fall (enemy_fall $EB3F and its two other
// entries, with the patched tails at $EB94 and $EBB4), the jump (enemy_jump $EBC4, enemy_jump_step
// $EBD9), the sideways step (enemy_step $ECF7), the chase decision (enemy_chase $EE62), the shot
// decision (enemy_decide_shot $EDCD) and the animations (animate_walk $EB0F, animate_two_frames_b
// $EE4A, animate_four_frames $EFEA). All of it runs inside irq_top (update_actors), so nothing
// here waits and frame_count is never read. actor_map_pointer ($E9B8) and random ($E9EA) are
// another group's. Labels reached only by a branch (b_XXXX, j_XXXX) are local functions.
//
// Patched operands, read from M when they run: fall_tail_a's opcode ($EB94: JMP or BIT, set by
// the three fall entries), fall_tail_b's target ($EBB5/$EBB6: animate_walk, animate_two_frames_b
// or the RTS at $EBB7), fly_step's opcode ($EF15: RTS for the slow flyer, LDA abs,X for the fast
// one, from the Y its callers pass; the LDA's operand is at $EF16/$EF17).
//
// The music driver: start_tune ($F477) and silence ($F4BD) from the main program, music_frame
// ($F53C) once a frame from irq_bottom (and from play_tune). A voice's stream is read by
// voice_read ($F56F): a byte with bit 7 set is a command, dispatched through music_command_table
// ($F240) by the JMP at $F57B whose operand's low byte ($F57C) is the command with its top two
// bits flipped (written here, then the vector read back from M); anything else is a note
// (voice_note $F581). Every command handler (mus_* at $7305-$7405) ends by reading the next event
// or, for mus_return at the bottom of the stack, by switching the voice off; the handlers call
// voice_read in turn, so a run of commands is a chain of calls that ends at voice_duration's RTS.
// Patched operands read from M: the command vector ($F57C/$F57D), the instrument copy's
// destination ($734D/$734E), mus_call's LDY operand ($73B0, written just before it is used), the
// tempo in start_tune's ADC ($F4B3), voice_note's copy operands ($F608/$F609, $F60B/$F60C). The
// SID is written through P.io.sidWrite with the register number (0-$18).
//
// The driver's zero page: snd_ptr $85/$86, snd_stack_depth $82-$84, snd_transpose $87-$89,
// snd_pos $8A-$8F, snd_filter_voice $91, snd_pw $92-$97, snd_freq $98-$9D, snd_wait $A0-$A2,
// tune_playing $A4, and the work bytes $78-$7F, $80, $81, $90, $9E, $A3.
(function (root) {
'use strict';
const G = root.BBGroups = root.BBGroups || {};
const { nz, adc, sbc, cmp } = root.BBUtil;

// The actor arrays (facts.md "Actors"; the labels of the listing).
const STATE = 0xB2, X = 0xBA, Y = 0xC2, FRAME = 0x8520, INPUT = 0x85E8, TICK = 0x8610,
  CHASE_TIMER = 0x8660, CHASE_PERIOD = 0x8688, CHASE_SLOT = 0x86B0, CHASE_LEVEL = 0x86D8, CHASE_CLIMB = 0x8700,
  FPS = 0x8750, MASK = 0x8778, JUMP = 0x87A0, FALL_PHASE = 0x87C8, FALLING = 0x87F0, BLOW = 0x8818,
  DRIFT_L = 0x8840, DRIFT_R = 0x8868, TIMER = 0x8890;

// The handlers music_command_table names, by address: voice_read reads the table from M and calls
// the handler by its label.
const COMMANDS = {
  0x7305: 'mus_loop_start', 0x7317: 'mus_loop_end', 0x7333: 'mus_instrument_short', 0x7336: 'mus_instrument',
  0x735D: 'mus_transpose', 0x7366: 'mus_arpeggio', 0x7378: 'mus_filter_all', 0x737C: 'mus_filter_me',
  0x7388: 'mus_filter_off', 0x738E: 'mus_call_transposed', 0x7396: 'mus_call', 0x73B7: 'mus_jump',
  0x73BD: 'mus_return', 0x73DD: 'mus_filter_settings', 0x73F5: 'mus_hold',
};
// The targets fall_tail_b ($EBB4) is patched to.
const FALL_TAILS = { 0xEB0F: 'animate_walk', 0xEE4A: 'animate_two_frames_b', 0xEBB7: null };

G.ai = function (P) {
  const M = P.M;
  const io = () => P.io;
  const b = v => (v === undefined ? 0 : v & 255);
  // The registers a routine leaves: a, x, y and only the flags named.
  const ret = (r, patch, flags) => Object.assign({ a: b(r.a), x: b(r.x), y: b(r.y) }, patch || {}, flags || {});
  const inc = a => { M[a] = (M[a] + 1) & 255; return M[a]; };
  const dec = a => { M[a] = (M[a] - 1) & 255; return M[a]; };
  const ptr = () => M[0x11] | (M[0x12] << 8);
  const map = y => M[(ptr() + (y & 255)) & 0xFFFF];                       // (map_ptr),y
  const mapB = y => M[((M[0x04] | (M[0x05] << 8)) + (y & 255)) & 0xFFFF]; // (zp_ptr_b),y
  const setB = p => { M[0x04] = p & 255; M[0x05] = (p >> 8) & 255; };
  // The three-cell probe: LDY #base / LDA (map_ptr),Y / BMI hit / INY / LDA / BMI hit / LDA sub_x /
  // BEQ miss / INY / LDA / BMI hit. Returns the result and the A and Y it leaves.
  function probe3(base) {
    let y = base & 255, a = map(y);
    if (a & 0x80) return { hit: true, a, y };
    y = (y + 1) & 255; a = map(y);
    if (a & 0x80) return { hit: true, a, y };
    a = M[0x23];
    if (a === 0) return { hit: false, a, y };
    y = (y + 1) & 255; a = map(y);
    return { hit: (a & 0x80) !== 0, a, y };
  }

  // =============================================================================================
  // The enemies
  // =============================================================================================

  // $E9FD: kinds 3, 7 and 8. Decide whether to shoot, then walk; with a shot being readied
  // (actor_blow not negative) count it down and fire instead.
  P.enemy_shooter = function (r) {
    r = P.enemy_decide_shot(r);
    const x = b(r.x), a = M[BLOW + x];
    if (a & 0x80) return P.enemy_walker(ret(r, { a }, nz(a)));
    return enemy_shoot(ret(r, { a }, nz(a)));
  };
  // $ED3B: the count has run out: place the readied shot (slot actor_jump) on the enemy's row in
  // front of it as its kind's shot, or cancel it (type $FF) if the two cells in front are solid.
  function enemy_shoot(r) {
    const x = b(r.x);
    let a = dec(BLOW + x);
    if (a !== 0) return ret(r, {}, nz(a));
    let y = M[JUMP + x];
    if (y & 0x80) { a = inc(BLOW + x); return ret(r, { y }, nz(a)); }  // b_ED37
    M[JUMP + x] = 0xFF;
    M[0x03] = ((M[X + x] - 0x14) & 255) >> 3;
    M[0x02] = y;
    let yy;
    if (M[FRAME + x] < M[FPS + x]) { a = 2; M[0x0195 + y] = 2; yy = 0x2B; }
    else { M[0x0195 + y] = 0x80; yy = 0x27; a = 0xFE; }
    M[0x04] = a;
    a = map(yy);
    let hit = (a & 0x80) !== 0;
    if (!hit) { yy = (yy + 1) & 255; a = map(yy); hit = (a & 0x80) !== 0; }
    if (hit) { y = M[0x02]; a = 0xFF; M[0xCC + y] = a; return ret(r, { a, y }, nz(a)); }   // b_EDC7
    y = M[0x02];
    a = (M[0x03] + M[0x04]) & 255;
    M[0xDE + y] = a; M[0xAA0E + y] = a;
    a = ((M[Y + x] - 0x15) & 255) >> 3; M[0xF0 + y] = a;
    M[0xAA20 + y] = x;
    M[0xA9C6 + y] = 0; M[0xA9D8 + y] = 0;
    const s = M[STATE + x];
    if (s === 8) a = 0x2A;
    else if (s === 7) { M[TIMER + x] = y; a = 0x2C; M[BLOW + x] = 0x2C; }
    else { M[0xA9C6 + y] = M[0x0195 + y] & 0x7F; a = 0x28; }
    M[0xCC + y] = a;
    return ret(r, { a, y }, nz(a));
  }

  // $EA08: kind 2 and the shooters' walk. Chase; fall when nothing is underfoot; step a jump in
  // progress; with the climb flag set and a platform overhead ask for a jump (bit 2); on a floor
  // and chasing, start a drifting jump (counter $0F) across a gap at the end of the floor; then
  // follow the input bits: 0 left, 1 right, 2 jump.
  P.enemy_walker = function (r) {
    r = P.enemy_chase(r);
    const x = b(r.x);
    let a, y = b(r.y);
    a = M[INPUT + x]; M[0x02] = a;
    a = M[FALLING + x];
    if (!(a & 0x80)) return P.enemy_fall(ret(r, { a, y }, nz(a)));
    a = M[JUMP + x];
    if (!(a & 0x80)) return enemy_jump_step(ret(r, { a, y }, nz(a)));
    a = M[CHASE_CLIMB + x];
    if (a !== 0) {
      setB((ptr() - 0xA0) & 0xFFFF);
      // the four rows above in pairs: an open cell with a solid one under it
      let climb = false;
      for (const [top, under] of [[0x02, 0x2A], [0x2A, 0x52], [0x52, 0x7A], [0x7A, 0xA2]]) {
        y = top; a = mapB(y);
        if (a & 0x80) continue;
        y = under; a = mapB(y);
        if (a & 0x80) { climb = true; break; }
      }
      if (climb) { a = M[0x02] | 0x04; M[INPUT + x] = a; M[0x02] = a; }   // b_EA62
    }
    // b_EA6B
    a = M[Y + x];
    let fall = a < 0x1F;
    if (!fall) {
      a = M[0x24];
      if (a === 0) {
        const p = probe3(0x51); a = p.a; y = p.y;
        if (!p.hit) fall = true;
        else {
          // b_EA92: on a floor; chasing and not the fireball shooter: a jump across a gap
          a = M[CHASE_LEVEL + x] | M[CHASE_CLIMB + x];
          if (a !== 0 && M[STATE + x] !== 3) {
            let ok = false;
            if (M[0x25] < M[FPS + x]) {                  // facing right: the cell past its right edge
              y = 0x53; a = M[0x23];
              if (a === 6) { setB((ptr() + 9) & 0xFFFF); ok = true; }   // ADC #$08 with the carry CMP #$06 left set
            } else {                                     // facing left
              y = 0x50; a = M[0x23];
              if (a === 0) { setB((ptr() - 9) & 0xFFFF); ok = true; }
            }
            if (ok) {
              a = map(y);
              if (!(a & 0x80)) {
                y = 0x50; a = mapB(y);
                if (a & 0x80) {
                  M[DRIFT_L + x] = 0; M[DRIFT_R + x] = 0;
                  a = M[0x25];
                  if (a >= M[FPS + x]) dec(DRIFT_L + x);   // $FF: the BNE after it always branches
                  else dec(DRIFT_R + x);
                  a = 0x0F; M[JUMP + x] = a;
                  return enemy_jump_step(ret(r, { a, y }, nz(a)));
                }
              }
            }
          }
        }
      }
    }
    if (fall) { inc(FALLING + x); return P.enemy_fall(ret(r, { a, y })); }   // b_EA8C
    // j_EAFA
    let cf = M[0x02] & 1; M[0x02] >>= 1;
    if (cf) { r = P.enemy_walk_left(ret(r, { a, y })); a = b(r.a); y = b(r.y); }
    cf = M[0x02] & 1; M[0x02] >>= 1;
    if (cf) { r = P.enemy_walk_right(ret(r, { a, y })); a = b(r.a); y = b(r.y); }
    cf = M[0x02] & 1; M[0x02] >>= 1;
    if (cf) return enemy_jump(ret(r, { a, y }));
    return P.animate_walk(ret(r, { a, y }));
  };

  // $EB0F: every second call step the frame, wrapping within the facing's set.
  P.animate_walk = function (r) {
    const x = b(r.x);
    let a = inc(TICK + x);
    if (a < 2) return ret(r, { a }, cmp(a, 2));
    M[TICK + x] = 0;
    inc(FRAME + x);
    a = M[FRAME + x] & M[MASK + x];
    if (a !== 0) return ret(r, { a }, { c: 1, ...nz(a) });
    const s = sbc(M[FRAME + x], M[FPS + x], 1);
    M[FRAME + x] = s.a;
    return ret(r, { a: s.a }, { c: s.c, z: s.z, n: s.n, v: s.v });
  };

  // $EB34, $EB3F, $EBB8: the three entries of the fall. Each sets fall_tail_a's opcode ($EB94)
  // and fall_tail_b's target ($EBB5/$EBB6), then falls two pixels, wrapping from the bottom to
  // the top; on a row boundary with a floor under the body it lands (actor_falling back to $FF)
  // and runs fall_tail_a; otherwise fall_tail_b.
  P.enemy_fall_then_flip = function (r) { M[0xEB94] = 0x2C; return fall(r, 0x4A, 0xEE); };
  P.enemy_fall = function (r) { M[0xEB94] = 0x4C; return fall(r, 0x0F, 0xEB); };
  P.enemy_fall_plain = function (r) { M[0xEB94] = 0x4C; return fall(r, 0xB7, 0xEB); };
  function fall(r, lo, hi) {
    const x = b(r.x);
    M[0xEBB5] = lo; M[0xEBB6] = hi;
    let a = (M[Y + x] + 2) & 255, y = hi;
    M[Y + x] = a;
    if (a === 0xF5) { a = 0x15; M[Y + x] = a; return fall_tail_b(r, a, y, nz(a)); }
    if (a < 0x1F) return fall_tail_b(r, a, y, cmp(a, 0x1F));
    const s = sbc(a, 0x2D, 1);                        // the borrow stays in C for the RTS tail
    a = s.a & 7;
    if (a !== 0) return fall_tail_b(r, a, y, { c: s.c, ...nz(a) });
    const p = probe3(0x51); a = p.a; y = p.y;
    if (p.hit) return fall_tail_b(r, a, y, nz(a));
    // b_EB7D: the row below the feet
    y = 0x79; a = map(y);
    let landed = (a & 0x80) !== 0;
    if (!landed) {
      y = (y + 1) & 255; a = map(y); landed = (a & 0x80) !== 0;
      if (!landed) {
        a = M[0x23];
        if (a !== 0) { y = (y + 1) & 255; a = map(y); landed = (a & 0x80) !== 0; }
      }
    }
    if (!landed) return fall_tail_b(r, a, y, nz(a));
    dec(FALLING + x);
    // fall_tail_a ($EB94): JMP animate_walk, or BIT and on into fall_turn_to_player
    const op = M[0xEB94];
    if (op === 0x4C) return jump_to(M[0xEB95] | (M[0xEB96] << 8), ret(r, { a, y }));
    if (op === 0x2C) return fall_turn_to_player(ret(r, { a, y }));
    throw new Error('fall_tail_a: opcode $' + op.toString(16));
  }
  // $EBB4: JMP through the patched target.
  function fall_tail_b(r, a, y, flags) { return jump_to(M[0xEBB5] | (M[0xEBB6] << 8), ret(r, { a, y }, flags)); }
  function jump_to(target, r) {
    const name = FALL_TAILS[target];
    if (name === undefined) throw new Error('fall tail to $' + target.toString(16));
    return name === null ? r : P[name](r);
  }
  // $EB97: the dropper has landed: face its target player (bit 0 left unless the player is to
  // the right), keep its jump bit, then the two-frame animation.
  function fall_turn_to_player(r) {
    const x = b(r.x);
    M[0x04] = M[INPUT + x] & 0x04;
    const y = M[0x4B];
    let a = M[X + x] >= M[X + y] ? 0x01 : 0x02;
    a |= M[0x04]; M[INPUT + x] = a;
    return P.animate_two_frames_b(ret(r, { a, y }, nz(a)));
  }

  // $EBC4: start a jump straight up: no drift, bit 2 of the input cleared, counter $1F.
  function enemy_jump(r) {
    const x = b(r.x);
    M[DRIFT_L + x] = 0; M[DRIFT_R + x] = 0;
    M[INPUT + x] &= 0xFB;
    M[JUMP + x] = 0x1F;
    return enemy_jump_step(ret(r, { a: 0x1F }, nz(0x1F)));
  }
  // $EBD9: one step of a jump, entered with A = the counter. $10-$1F: the wait, with the frame
  // flipped every fourth call. $01-$0F: up by jump_arc_enemy, or one pixel with a drift flag.
  // $00: down by fall_phase through jump_arc_enemy (jump_arc_drift when drifting) until a floor
  // is crossed on a row boundary, then snap to the row and end the jump; while drifting,
  // sideways two pixels a step, stopping at a wall.
  function enemy_jump_step(r) {
    const x = b(r.x);
    let a = b(r.a), y = b(r.y);
    if (a !== 0) {
      if (a < 0x10) {
        dec(JUMP + x); y = a;
        a = M[DRIFT_L + x] | M[DRIFT_R + x];
        if (a !== 0) { dec(Y + x); return j_EC87(r, a, y); }
        const s = sbc(M[Y + x], M[0xACDD + y], 1); M[Y + x] = s.a;
        return P.animate_walk(ret(r, { a: s.a, y }));
      }
      dec(JUMP + x);
      a &= 3;
      if (a !== 0) return ret(r, { a, y }, { c: 1, ...nz(a) });
      a = M[FRAME + x] ^ M[FPS + x]; M[FRAME + x] = a;
      return ret(r, { a, y }, { c: 1, ...nz(a) });
    }
    // b_EC0C: coming down
    y = M[FALL_PHASE + x];
    if (y & 0x80) { a = 0; M[FALL_PHASE + x] = 0; y = 0; }
    if (y === 0x10) return j_EC7C(r, a, y);
    inc(FALL_PHASE + x);
    a = M[DRIFT_L + x] | M[DRIFT_R + x];
    a = (M[Y + x] + M[(a !== 0 ? 0xACED : 0xACDD) + y]) & 255;
    M[Y + x] = a;
    // j_EC3C
    if (a < 0x1F) return j_EC87(r, a, y);
    a = (a - 0x15) & 7;
    if (a >= M[0x24]) return j_EC87(r, a, y);
    const p = probe3(0x51); a = p.a; y = p.y;
    if (p.hit) return j_EC87(r, a, y);
    // b_EC5C: the row below
    y = 0x79; a = map(y);
    let landed = (a & 0x80) !== 0;
    if (!landed) {
      y = (y + 1) & 255; a = map(y); landed = (a & 0x80) !== 0;
      if (!landed) {
        a = M[0x23];
        if (a === 0) return j_EC87(r, a, y);
        y = (y + 1) & 255; a = map(y); landed = (a & 0x80) !== 0;
        if (!landed) return j_EC87(r, a, y);
      }
    }
    a = (((M[Y + x] - 0x2D) & 0xF8) + 0x2D) & 255; M[Y + x] = a;
    return j_EC7C(r, a, y);
  }
  // $EC7C: the jump is over.
  function j_EC7C(r, a, y) {
    const x = b(r.x);
    M[JUMP + x] = 0xFF; M[FALL_PHASE + x] = 0xFF;
    return P.animate_walk(ret(r, { a: 0xFF, y }));
  }
  // $EC87: the drift of a jump: two pixels a step, until a wall (a solid cell with an open one
  // beside it) ends the drift (flag 1).
  function j_EC87(r, a, y) {
    const x = b(r.x);
    a = M[DRIFT_L + x];
    if (a & 0x80) {
      y = M[0x24] === 0 ? 0x28 : 0x50;
      a = M[0x23];
      let stop = false;
      if (a === 0) {
        a = map(y);
        if (a & 0x80) { y = (y + 1) & 255; a = map(y); if (!(a & 0x80)) stop = true; }
      }
      if (stop) { a = 1; M[DRIFT_L + x] = a; return P.animate_walk(ret(r, { a, y })); }
      dec(X + x); dec(X + x);
      return P.animate_walk(ret(r, { a, y }));
    }
    a = M[DRIFT_R + x];
    if (a & 0x80) {
      a = M[X + x];
      let stop = a === 0xF4;
      if (!stop) {
        y = M[0x24] === 0 ? 0x2B : 0x53;
        a = M[0x23];
        if (a === 0) {
          a = map(y);
          if (a & 0x80) { y = (y - 1) & 255; a = map(y); if (!(a & 0x80)) stop = true; }
        }
      }
      if (stop) { a = 1; M[DRIFT_R + x] = a; return P.animate_walk(ret(r, { a, y })); }
      inc(X + x); inc(X + x);
    }
    return P.animate_walk(ret(r, { a, y }));
  }

  // $ECDF: walk left two pixels; if not yet facing left, turn (frame = frames_per_side) instead.
  P.enemy_walk_left = function (r) {
    const x = b(r.x);
    let a = M[0x25];
    const f = cmp(a, M[FPS + x]);
    if (!f.c) { a = M[FPS + x]; M[FRAME + x] = a; return ret(r, { a }, { c: 0, ...nz(a) }); }
    return enemy_step(r, 0xFE, M[0x24] === 0 ? 0x28 : 0x50);
  };
  // $ED1E: walk right two pixels; if not yet facing right, turn (frame = 0) instead.
  P.enemy_walk_right = function (r) {
    const x = b(r.x);
    let a = M[0x25];
    const f = cmp(a, M[FPS + x]);
    if (f.c) { a = 0; M[FRAME + x] = a; return ret(r, { a }, { c: 1, ...nz(a) }); }
    return enemy_step(r, 0x02, M[0x24] === 0 ? 0x2B : 0x53);
  };
  // $ED12, $ED18: four pixels left or right.
  P.enemy_step_left_4 = function (r) { return enemy_step(r, 0xFC, 0x28); };
  P.enemy_step_right_4 = function (r) { return enemy_step(r, 0x04, 0x2B); };
  // $ECF7: move sideways by A unless the actor is cell-aligned and the cell at Y is solid, in
  // which case swap the direction bits.
  function enemy_step(r, a, y) {
    const x = b(r.x);
    M[0x04] = a;
    a = M[0x23];
    if (a === 0) {
      a = map(y);
      if (a & 0x80) { a = M[INPUT + x] ^ 0x03; M[INPUT + x] = a; return ret(r, { a, y }, nz(a)); }
    }
    const s = adc(M[X + x], M[0x04], 0); M[X + x] = s.a;
    return ret(r, { a: s.a, y }, { c: s.c, z: s.z, n: s.n, v: s.v });
  }

  // $EDCD: with no shot out, the timer run down, on a floor and not jumping, one call in four:
  // facing the target player, with room in front, and the player level or (one time in 32)
  // above: take a free object slot as the readied shot ($42), count 7, and wait $96 calls before
  // the next.
  P.enemy_decide_shot = function (r) {
    const x = b(r.x);
    let a = M[BLOW + x], y = b(r.y);
    if (!(a & 0x80)) return ret(r, { a, y }, nz(a));
    a = M[TIMER + x];
    if (a !== 0) { const d = dec(TIMER + x); if (d !== 0) return ret(r, { a, y }, nz(d)); }
    a = M[JUMP + x];
    if (!(a & 0x80)) return ret(r, { a, y }, nz(a));
    a = M[FALLING + x];
    if (!(a & 0x80)) return ret(r, { a, y }, nz(a));
    r = P.random(ret(r, { a, y }));
    const c = r.c ? 1 : 0;                           // random's ADC carry goes into the SBC below
    a = b(r.a) & 0x03;
    if (a !== 0) return ret(r, { a }, nz(a));
    y = M[0x4B];
    const s = sbc(M[X + x], M[X + y], c);
    let f;
    if (!s.c) {                                      // the player is to the right
      a = M[FRAME + x]; f = cmp(a, M[FPS + x]);
      if (f.c) return ret(r, { a, y }, f);
      a = M[X + x]; f = cmp(a, 0xF4);
      if (f.c) return ret(r, { a, y }, f);
    } else {
      a = M[FRAME + x]; f = cmp(a, M[FPS + x]);
      if (!f.c) return ret(r, { a, y }, f);
      a = M[X + x]; f = cmp(a, 0x34);
      if (!f.c) return ret(r, { a, y }, f);
    }
    // b_EE15
    const t = sbc(M[Y + x], M[Y + y], 1);
    a = t.a;
    if (!t.c) return ret(r, { a, y }, { c: 0, z: t.z, n: t.n });
    if (!t.z) {
      r = P.random(ret(r, { a, y }));
      a = b(r.a) & 0x1F;
      if (a !== 0) return ret(r, { a }, nz(a));
    }
    for (y = 0x0F; y >= 0; y--) { a = M[0xCC + y]; if (a & 0x80) break; }
    if (y < 0) return ret(r, { a, y: 0xFF }, { n: 1, z: 0 });
    M[0xCC + y] = 0x42;
    M[JUMP + x] = y;
    M[BLOW + x] = 0x07;
    M[TIMER + x] = 0x96;
    a = 0x09; M[0xA9FC + y] = a;
    return ret(r, { a, y }, nz(a));
  };

  // $EE4A: every second call flip bit 0 of the frame (the dropper's animation).
  P.animate_two_frames_b = function (r) {
    const x = b(r.x);
    let a = inc(TICK + x);
    if (a < 2) return ret(r, { a }, cmp(a, 2));
    M[TICK + x] = 0;
    a = M[FRAME + x] ^ 0x01; M[FRAME + x] = a;
    return ret(r, { a }, { c: 1, ...nz(a) });
  };

  // $EE62: the chase decision. Level with the target: level flag set, climb clear, jump bit
  // clear. Above the target: both clear, jump bit clear. Below: when the chase timer runs out
  // set one of the two flags and clear the other, alternately, and reload the timer.
  P.enemy_chase = function (r) {
    const x = b(r.x);
    let y = M[0x4B], a = M[Y + y];
    const f = cmp(a, M[Y + x]);
    if (f.z || f.c) {
      M[CHASE_LEVEL + x] = f.z ? 0xFF : 0x00;
      M[CHASE_CLIMB + x] = 0;
      a = M[INPUT + x] & 0x0B; M[INPUT + x] = a;
      return ret(r, { a, y }, { c: 1, ...nz(a) });
    }
    const d = dec(CHASE_TIMER + x);
    if (d !== 0) return ret(r, { a, y }, { c: 0, ...nz(d) });
    y = M[CHASE_SLOT + x];
    M[CHASE_LEVEL + y] = 0xFF;
    y ^= 0x28;
    M[CHASE_LEVEL + y] = 0;
    M[CHASE_SLOT + x] = y;
    a = M[CHASE_PERIOD + x]; M[CHASE_TIMER + x] = a;
    return ret(r, { a, y }, { c: 0, ...nz(a) });
  };

  // $EEB2: kind 6, two pixels each way a call; the fast flyer flips its facing as it bounces
  // (fly_step patched to LDA abs,X with Y = $BD) and animates the walk cycle.
  P.enemy_flyer_fast = function (r) {
    const x = b(r.x);
    M[0x04] = 0x02;
    let a = M[INPUT + x]; M[0x02] = a;
    r = (a & 0x04) ? P.fly_up(ret(r, { a: a & 0x04 }, nz(a & 4))) : P.fly_down(ret(r, { a: 0 }, nz(0)));
    r = P.actor_map_pointer(r);
    const y = 0xBD; a = M[0x02] & 0x01;
    r = a ? P.fly_left_or_turn(ret(r, { a, y }, nz(a))) : P.fly_right_or_turn(ret(r, { a, y }, nz(a)));
    return P.animate_walk(r);
  };
  // $EFC0: kind 5, one pixel up or down and two across a call (fly_step patched to RTS with
  // Y = $60), with the four-frame animation.
  P.enemy_flyer = function (r) {
    const x = b(r.x);
    M[0x04] = 0x01;
    let a = M[INPUT + x]; M[0x02] = a;
    r = (a & 0x04) ? P.fly_up(ret(r, { a: a & 0x04 }, nz(a & 4))) : P.fly_down(ret(r, { a: 0 }, nz(0)));
    r = P.actor_map_pointer(r);
    const y = 0x60; a = M[0x02] & 0x01;
    r = a ? P.fly_left(ret(r, { a, y }, nz(a))) : P.fly_right(ret(r, { a, y }, nz(a)));
    return P.animate_four_frames(r);
  };
  // $EEDF, $EF1E: face the way first (frame 4 left, 0 right), then move.
  P.fly_left_or_turn = function (r) {
    const x = b(r.x);
    let a = M[0x25];
    if (a >= 4) return P.fly_left(ret(r, { a }, cmp(a, 4)));
    a = 0x04; M[FRAME + x] = a;
    return ret(r, { a }, { c: 0, ...nz(a) });
  };
  P.fly_right_or_turn = function (r) {
    const x = b(r.x);
    let a = M[0x25];
    if (a < 4) return P.fly_right(ret(r, { a }, cmp(a, 4)));
    a = 0x00; M[FRAME + x] = a;
    return ret(r, { a }, { c: 1, ...nz(a) });
  };
  // $EEEB, $EF2A: two pixels sideways unless, cell-aligned, a cell beside the body is solid: then
  // swap the direction bits and run fly_step, whose opcode is the Y passed in ($60 RTS, or $BD
  // LDA actor_frame,X which runs on into fly_flip_facing: EOR #4 on the frame).
  P.fly_left = function (r) { return fly_side(r, -1); };
  P.fly_right = function (r) { return fly_side(r, 1); };
  function fly_side(r, dir) {
    const x = b(r.x);
    let y = b(r.y), a;
    M[0xEF15] = y;
    a = M[0x23];
    let wall = false;
    if (a === 0) {
      y = dir < 0 ? 0x00 : 0x03; a = map(y);
      if (a & 0x80) wall = true;
      else {
        y = dir < 0 ? 0x28 : 0x2B; a = map(y);
        if (a & 0x80) wall = true;
        else {
          y = M[0x24];
          if (y !== 0) { y = dir < 0 ? 0x50 : 0x53; a = map(y); if (a & 0x80) wall = true; }
        }
      }
    }
    if (!wall) { M[X + x] = (M[X + x] + 2 * dir) & 255; return ret(r, { a, y }, nz(M[X + x])); }
    // b_EF0D
    a = M[INPUT + x] ^ 0x03; M[INPUT + x] = a;
    const op = M[0xEF15];
    if (op === 0x60) return ret(r, { a, y }, nz(a));
    if (op === 0xBD) {
      a = M[((M[0xEF16] | (M[0xEF17] << 8)) + x) & 0xFFFF] ^ 0x04;
      M[FRAME + x] = a;
      return ret(r, { a, y }, nz(a));
    }
    throw new Error('fly_step: opcode $' + op.toString(16));
  }
  // $EF4C: up by the speed in zp_ptr_b (negated). On a row boundary: at the top (Y $15) wrap to
  // the bottom if the bottom row is open in its column, else reverse; otherwise probe the row
  // above the head (map_ptr moved up a row) and reverse at a ceiling.
  P.fly_up = function (r) {
    const x = b(r.x);
    let a, y = b(r.y);
    M[0x04] = (-M[0x04]) & 255;
    a = M[0x24];
    if (a !== 0) return fly_move(r, y);
    a = M[Y + x];
    if (a === 0x15) {
      a = (M[X + x] - 0x13) & 255; y = a >> 3; const c = (a >> 2) & 1; a = M[0x88C1 + y];   // C is the last LSR's
      if (a & 0x80) return fly_reverse(r, y);
      a = 0xF5; M[Y + x] = a;
      return ret(r, { a, y }, { c, ...nz(a) });
    }
    const p = (ptr() - 0x28) & 0xFFFF; M[0x11] = p & 255; M[0x12] = p >> 8;
    return fly_probe(r, 0x01);
  };
  // $EFA0: down by the speed. On a row boundary: at the bottom (Y $F5) wrap to the top if the top
  // row is open in its column, else reverse; otherwise probe the floor and reverse there.
  P.fly_down = function (r) {
    const x = b(r.x);
    let a, y = b(r.y);
    a = M[0x24];
    if (a !== 0) return fly_move(r, y);
    a = M[Y + x];
    if (a >= 0xF5) {
      a = (M[X + x] - 0x14) & 255; y = a >> 3; const c = (a >> 2) & 1; a = M[0x8501 + y];   // C is the last LSR's
      if (a & 0x80) return fly_reverse(r, y);
      a = 0x15; M[Y + x] = a;
      return ret(r, { a, y }, { c, ...nz(a) });
    }
    return fly_probe(r, 0x51);
  };
  // b_EF7D: the three-cell probe from Y; solid reverses, open moves.
  function fly_probe(r, y) {
    const p = probe3(y);
    return p.hit ? fly_reverse(r, p.y) : fly_move(r, p.y);
  }
  // b_EF8F: swap the vertical direction bits.
  function fly_reverse(r, y) {
    const x = b(r.x);
    const a = M[INPUT + x] ^ 0x0C; M[INPUT + x] = a;
    return ret(r, { a, y }, nz(a));
  }
  // b_EF98: Y plus the speed.
  function fly_move(r, y) {
    const x = b(r.x);
    const s = adc(M[Y + x], M[0x04], 0); M[Y + x] = s.a;
    return ret(r, { a: s.a, y }, { c: s.c, z: s.z, n: s.n, v: s.v });
  }
  // $EFEA: every second call step the frame through 0-3.
  P.animate_four_frames = function (r) {
    const x = b(r.x);
    let a = inc(TICK + x);
    if (a < 2) return ret(r, { a }, cmp(a, 2));
    M[TICK + x] = 0;
    inc(FRAME + x);
    a = M[FRAME + x] & 0x03; M[FRAME + x] = a;
    return ret(r, { a }, { c: 1, ...nz(a) });
  };

  // =============================================================================================
  // The music driver
  // =============================================================================================
  const sptr = () => M[0x85] | (M[0x86] << 8);
  const sread = y => M[(sptr() + (y & 255)) & 0xFFFF];               // (snd_ptr),y

  // $F477: start the tune whose record lies at tune_table + Y - 4: the three voices' addresses
  // (Y, Y-2, Y-4), their transposition, modulation flags, stack, wait and flags reset, and the
  // table of 32 note lengths as multiples of the tempo (the ADC's operand at $F4B3).
  P.start_tune = function (r) {
    let y = b(r.y), a = 0, x;
    M[0xF4B3] = M[(0xF924 + y) & 0xFFFF];
    for (x = 2; x >= 0; x--) {
      M[0x8A + x] = M[(0xF922 + y) & 0xFFFF];
      M[0x8D + x] = M[(0xF923 + y) & 0xFFFF];
      M[0x9E] = y;
      const i = M[0x742D + x];
      M[0x87 + x] = 0; M[0xF2BB + i] = 0; M[0xF2BF + i] = 0;
      M[0x82 + x] = M[0x7433 + x];
      M[0xA0 + x] = 1; M[0xF308 + x] = 1; M[0xF305 + x] = 1;
      y = (M[0x9E] - 2) & 255;
    }
    for (x = 0; x < 0x20; x++) { a = (a + M[0xF4B3]) & 255; M[0xF39A + x] = a; }
    return ret(r, { a, x: 0x20, y }, { c: 1, z: 1, n: 0 });
  };
  // $F4BD: 8 then 0 to every SID register below the volume; the voices off, their release
  // counts, the filter flag and the data flags clear, no filter voice, volume $1F.
  P.silence = function (r) {
    const c = io();
    for (let x = 0x16; x >= 0; x--) { c.sidWrite(x, 0x08); c.sidWrite(x, 0x00); }
    M[0xF305] = 0xFF; M[0xF306] = 0xFF; M[0xF307] = 0xFF;
    for (const a of [0xF337, 0xF35A, 0xF37D, 0xF391, 0xF308, 0xF309, 0xF30A]) M[a] = 0;
    M[0x91] = 0xFF;
    c.sidWrite(0x18, 0x1F);
    return ret(r, { a: 0, x: 0x1F }, nz(0x1F));
  };
  // $F4F2: copy the filter settings to their working block, four of them on to the counters,
  // and write the cutoff ($F392/$F393, an 11-bit value) to $D415/$D416. X is kept.
  P.filter_restart = function (r) {
    const c = io(), x0 = b(r.x);
    M[0x80] = x0;
    for (let i = 0x0F; i >= 0; i--) M[0xF384 + i] = M[0xF30B + i];
    const x = M[0xF392], y = M[0xF393];
    M[0xF394] = x; M[0xF395] = y;
    M[0xF396] = M[0xF38C]; M[0xF397] = M[0xF38D]; M[0xF398] = M[0xF38E]; M[0xF399] = M[0xF38F];
    c.sidWrite(0x15, x & 0x07);
    M[0xA3] = ((x >> 2) | ((y & 3) << 6)) & 255;    // snd_tmp2 after the two RORs
    const a = ((x >> 3) | ((y & 7) << 5)) & 255;
    c.sidWrite(0x16, a);
    return ret(r, { a, x: x0, y }, { c: (x >> 2) & 1, ...nz(x0) });
  };
  // $F53C: once a frame. For each voice (2 down to 0): step its stream while it has data, counting
  // the voices with data in tune_playing; run its envelope and modulations while its release
  // count is non-zero.
  P.music_frame = function (r) {
    let a = 0, y = b(r.y);
    M[0xA4] = 0;
    for (let x = 2; x >= 0; x--) {
      a = M[0xF308 + x];
      if (a !== 0) { inc(0xA4); r = P.voice_step({ a, x, y }); a = b(r.a); y = b(r.y); }
      y = M[0x7430 + x]; a = M[0xF337 + y];
      if (a !== 0) { r = P.voice_frame({ a, x, y }); a = b(r.a); y = b(r.y); }
    }
    return { a, x: 0xFF, y, n: 1, z: 0 };
  };
  // $F55B: count the wait down; at zero load the position and read the next events.
  P.voice_step = function (r) {
    const x = b(r.x);
    const w = dec(0xA0 + x);
    if (w !== 0) return ret(r, {}, nz(w));
    M[0x85] = M[0x8A + x]; M[0x86] = M[0x8D + x];
    return voice_read(ret(r, { a: M[0x86] }, nz(M[0x86])));
  };
  // $F56F: the next event. A command's handler is found by writing the command EOR $C0 into the
  // JMP's operand at $F57C and reading the vector it then points at.
  function voice_read(r) {
    const a = sread(0);
    if (!(a & 0x80)) return voice_note(ret(r, { a, y: 0 }, nz(a)));
    const cmd = a ^ 0xC0;
    M[0xF57C] = cmd;
    const v = M[0xF57C] | (M[0xF57D] << 8);
    const target = M[v] | (M[(v + 1) & 0xFFFF] << 8);
    const name = COMMANDS[target];
    if (!name) throw new Error('voice_read: command $' + a.toString(16) + ' dispatches to $' + target.toString(16));
    return P[name](ret(r, { a: cmd, y: 1 }, nz(cmd)));
  }
  // $F56A, $F56C: skip 1 or A bytes and read the next event.
  const mus_next_a = r => voice_read(P.mus_advance(r));
  const mus_next_1 = r => mus_next_a(ret(r, { a: 1 }));
  // $F581: a note (A). $5F and up are rests. Otherwise, with the voice enabled: oscillator reset
  // (control 8), the note's frequency (transposed) kept in the working block, the instrument's
  // pulse width, waveform and envelope written to the voice's seven registers, the control
  // without the test bit, the pulse sweep reloaded, the 24 modulation bytes copied to the
  // working block, the arpeggio's base note or the frequency modulation restarted, and the gate
  // and release counts set. Then the length.
  function voice_note(r) {
    const c = io(), x = b(r.x);
    let a = b(r.a), y;
    M[0x90] = a;
    if (a >= 0x5F) return voice_duration(ret(r, { a }, cmp(a, 0x5F)));
    M[0x78] = (a + M[0x87 + x]) & 255;
    a = M[0xF305 + x];
    if (a === 0) return voice_duration(ret(r, { a }, nz(a)));
    M[0x7C] = 0x08;
    y = M[0x7436 + x]; c.sidWrite(4 + y, 0x08);
    if (x === M[0x91]) r = P.filter_restart(ret(r, { a: 8, y }, { c: 1, z: 1, n: 0 }));
    y = M[0x78];
    const fh = M[0xF418 + y]; M[0x79] = fh;
    const fl = M[0xF3B9 + y]; M[0x78] = fl;
    y = M[0x7430 + x]; M[0xF333 + y] = fl; M[0xF334 + y] = fh;
    y = M[0x742D + x];
    M[0x7A] = M[0xF2C4 + y]; M[0x7B] = M[0xF2C5 + y]; M[0x7D] = M[0xF2C7 + y]; M[0x7E] = M[0xF2C8 + y];
    a = M[0xF2C6 + y];
    y = M[0x7430 + x]; M[0xF335 + y] = a;
    const ctrl = a & 0xF7;
    M[0x7F] = x;
    y = (M[0x7437 + x] - 1) & 255;
    for (let i = 6; i >= 0; i--) { c.sidWrite(y, M[0x78 + i]); y = (y - 1) & 255; }
    y = (y + 1) & 255;
    c.sidWrite(4 + y, ctrl);
    y = M[0x7430 + x];
    r = P.pulse_mod_reload(ret(r, { a: ctrl, y }));
    M[0xF608] = M[0x7357 + x]; M[0xF60B] = M[0x735A + x];
    const src = M[0xF608] | (M[0xF609] << 8), dst = M[0xF60B] | (M[0xF60C] << 8);
    for (y = 0x17; y >= 0; y--) M[(dst + y) & 0xFFFF] = M[(src + y) & 0xFFFF];
    y = M[0x7430 + x];
    a = M[0xF328 + y] & 0x08;
    let restart = true;
    if (a !== 0) { a = (M[0x90] + M[0x87 + x]) & 255; M[0xF325 + y] = a; restart = a === 0; }   // BNE: a base note of 0 restarts too
    if (restart) r = P.freq_mod_restart(ret(r, { a, y }));
    // b_F627
    y = M[0x742D + x];
    const gate = M[0xF2C9 + y], rel = M[0xF2CA + y];
    y = M[0x7430 + x];
    M[0xF337 + y] = rel; M[0xF336 + y] = gate;
    return voice_duration(ret(r, { a: gate, y }));
  }
  // $F63B: the length byte: through note_lengths_m1 unless the note is $60 (then as it is); the
  // wait set, the pointer moved past the two bytes and kept as the voice's position.
  function voice_duration(r) {
    const x = b(r.x);
    let a = sread(1), y = M[0x90];
    if (y !== 0x60) { y = a; a = M[0xF399 + y]; }
    M[0xA0 + x] = a;
    r = P.mus_advance(ret(r, { a: 2, y }));
    M[0x8A + x] = M[0x85];
    a = M[0x86]; M[0x8D + x] = a;
    return ret(r, { a, y }, nz(a));
  }

  // --- the commands (entered with X the voice, Y = 1, A the command EOR $C0) ---------------------
  // $7305 ($80): the repeat count that follows onto the voice's stack, push the position after it.
  P.mus_loop_start = function (r) {
    const x = b(r.x);
    const a = sread(b(r.y));
    const y = M[0x82 + x]; M[0xF292 + y] = a;
    r = P.mus_advance(ret(r, { a: 2, y }));
    r = P.mus_push_position(r);
    return voice_read(r);
  };
  // $7317 ($82): count the top repeat down; more to go: back to the pushed position; else drop it
  // and skip the command byte.
  P.mus_loop_end = function (r) {
    const x = b(r.x);
    dec(0x82 + x);
    const y = M[0x82 + x];
    const a = (M[0xF292 + y] - 1) & 255; M[0xF292 + y] = a;
    if (a === 0) return mus_next_a(ret(r, { a: 1, y }));
    r = P.mus_pop_position(ret(r, { a, y }));
    inc(0x82 + x);
    return mus_next_a(ret(r, { a: 0 }));
  };
  // $7333 ($84), $7336 ($86): 14 or 29 bytes from the address that follows into the voice's
  // instrument block (the STA's operand at $734D patched from instrument_block_lo).
  P.mus_instrument_short = function (r) { return copy_instrument(r, 0x0D); };
  P.mus_instrument = function (r) { return copy_instrument(r, 0x1C); };
  function copy_instrument(r, n) {
    const x = b(r.x);
    let y = b(r.y), a = 0;
    M[0x78] = sread(y); y = (y + 1) & 255; M[0x79] = sread(y);
    M[0x734D] = M[0x7357 + x];
    const src = M[0x78] | (M[0x79] << 8), dst = M[0x734D] | (M[0x734E] << 8);
    for (y = n; y >= 0; y--) { a = M[(src + y) & 0xFFFF]; M[(dst + y) & 0xFFFF] = a; }
    return mus_next_a(ret(r, { a: 3, y: 0xFF }));
  }
  // $735D ($88): the transposition.
  P.mus_transpose = function (r) {
    const x = b(r.x);
    M[0x87 + x] = sread(b(r.y));
    return mus_next_a(ret(r, { a: 2 }));
  };
  // $7366 ($8A): the arpeggio table ($F2xx) into the instrument block.
  P.mus_arpeggio = function (r) {
    const x = b(r.x);
    const a = sread(b(r.y)), y = M[0x742D + x];
    M[0xF2B6 + y] = a; M[0xF2B7 + y] = 0xF2;
    return mus_next_a(ret(r, { a: 2, y }));
  };
  // $7378 ($8C), $737C ($8E), $7388 ($90): the filter routing ($D417), and which voice drives it.
  P.mus_filter_all = function (r) { io().sidWrite(0x17, 0xF7); return mus_next_1(ret(r, { y: 0xF7 })); };
  P.mus_filter_me = function (r) {
    const x = b(r.x), y = M[0x742A + x];
    M[0x91] = x; io().sidWrite(0x17, y);
    return mus_next_1(ret(r, { a: x, y }));
  };
  P.mus_filter_off = function (r) {
    M[0x91] = 0x03; io().sidWrite(0x17, 0x78);
    return mus_next_1(ret(r, { a: 3, y: 0x78 }));
  };
  // $738E ($92), $7396 ($94): a pattern call, with the transposition first for $92. The position
  // after the arguments is pushed, then the pointer is reloaded with the address at + Y (the LDY's
  // operand at $73B0, written from Y just before).
  P.mus_call_transposed = function (r) {
    const x = b(r.x);
    M[0x87 + x] = sread(b(r.y));
    return call_pattern(r, 0x04, (b(r.y) + 1) & 255);
  };
  P.mus_call = function (r) { return call_pattern(r, 0x03, b(r.y)); };
  function call_pattern(r, a, y) {
    M[0x73B0] = y;
    const lo = M[0x85], hi = M[0x86];
    r = P.mus_advance(ret(r, { a, y: a }));
    r = P.mus_push_position(r);
    M[0x86] = hi; M[0x85] = lo;
    r = P.mus_read_address(ret(r, { a: lo, y: M[0x73B0] }));
    return voice_read(r);
  }
  // $73B7 ($96): continue at the address that follows.
  P.mus_jump = function (r) { return voice_read(P.mus_read_address(r)); };
  // $73BD ($98): return from a pattern; at the stack's base the voice is finished instead.
  P.mus_return = function (r) {
    const x = b(r.x);
    const a = M[0x82 + x];
    if (a === M[0x7433 + x]) { const d = dec(0xF308 + x); return ret(r, { a }, { c: 1, ...nz(d) }); }
    dec(0x82 + x);
    r = P.mus_pop_position(ret(r, { a }));
    return voice_read(r);
  };
  // $73D0: the pointer from the top of the voice's stack.
  P.mus_pop_position = function (r) {
    const x = b(r.x), y = M[0x82 + x];
    M[0x85] = M[0xF28A + y];
    const a = M[0xF28E + y]; M[0x86] = a;
    return ret(r, { a, y }, nz(a));
  };
  // $73DD ($9A): 16 bytes from the address that follows into the filter settings.
  P.mus_filter_settings = function (r) {
    let y = b(r.y), a = 0;
    M[0x78] = sread(y); y = (y + 1) & 255; M[0x79] = sread(y);
    const src = M[0x78] | (M[0x79] << 8);
    for (y = 0x0F; y >= 0; y--) { a = M[(src + y) & 0xFFFF]; M[0xF30B + y] = a; }
    return mus_next_a(ret(r, { a: 3, y: 0xFF }));
  };
  // $73F5 ($9C): sustain/release $FF and release time $FE in the instrument block.
  P.mus_hold = function (r) {
    const x = b(r.x), y = M[0x742D + x];
    M[0xF2C8 + y] = 0xFF; M[0xF2CA + y] = 0xFE;
    return mus_next_1(ret(r, { a: 0xFE, y }));
  };
  // $7405: push the pointer on the voice's stack.
  P.mus_push_position = function (r) {
    const x = b(r.x), y = M[0x82 + x];
    M[0xF28A + y] = M[0x85]; M[0xF28E + y] = M[0x86];
    const d = inc(0x82 + x);
    return ret(r, { a: M[0x86], y }, nz(d));
  };
  // $7414: the pointer replaced by the address at pointer + Y.
  P.mus_read_address = function (r) {
    let y = b(r.y);
    const lo = sread(y); y = (y + 1) & 255; const hi = sread(y);
    M[0x86] = hi; M[0x85] = lo;
    return ret(r, { a: lo, y }, nz(lo));
  };
  // $7420: A added to the pointer.
  P.mus_advance = function (r) {
    const s = adc(b(r.a), M[0x85], 0);
    M[0x85] = s.a;
    if (s.c) { const h = inc(0x86); return ret(r, { a: s.a }, { c: 1, v: s.v, ...nz(h) }); }
    return ret(r, { a: s.a }, { c: 0, z: s.z, n: s.n, v: s.v });
  };

  // --- the modulations -------------------------------------------------------------------------
  // $F659: the working frequency back to the note's, then the four counters reloaded.
  P.freq_mod_restart = function (r) {
    const x = b(r.x), y = b(r.y);
    M[0x98 + x] = M[0xF333 + y]; M[0x7A] = M[0xF333 + y];
    M[0x9B + x] = M[0xF334 + y]; M[0x7B] = M[0xF334 + y];
    return P.freq_mod_reload(ret(r, { a: M[0x7B] }));
  };
  // $F667: the four step counters from their lengths.
  P.freq_mod_reload = function (r) {
    const y = b(r.y);
    M[0xF33B + y] = M[0xF326 + y]; M[0xF33A + y] = M[0xF325 + y]; M[0xF339 + y] = M[0xF324 + y];
    const a = M[0xF323 + y]; M[0xF338 + y] = a;
    return ret(r, { a }, nz(a));
  };
  // $F680: the pulse width back to its start, then the counters.
  P.pulse_mod_restart = function (r) {
    const x = b(r.x), y = M[0x7430 + x];
    M[0x7A] = M[0xF331 + y]; M[0x7B] = M[0xF332 + y];
    return P.pulse_mod_reload(ret(r, { a: M[0x7B], y }));
  };
  // $F68D: the working pulse width kept per voice, the two sweep counters reloaded.
  P.pulse_mod_reload = function (r) {
    const x = b(r.x), y = M[0x7430 + x];
    M[0x92 + x] = M[0x7A]; M[0x95 + x] = M[0x7B];
    M[0xF33C + y] = M[0xF329 + y];
    const a = M[0xF32A + y]; M[0xF33D + y] = a;
    return ret(r, { a, y }, nz(a));
  };

  // $F6A5: one frame of a sounding voice (X the voice, Y its working block's offset). The gate:
  // with bit 3 of the working control set, when the wait drops below the gate time clear the gate
  // and write the control; otherwise count the gate time down and then the release count, and
  // at the end of the release zero the voice's registers (and the filter flag if it drives the
  // filter). The pulse sweep: after its delay, up then down by the two rates, repeating by its
  // flags. Then an arpeggio (flag bit 3, not on voice 3) or the four-step frequency modulation.
  P.voice_frame = function (r) {
    const c = io(), x = b(r.x);
    let y = b(r.y), a;
    let toPulse = false, gateOff = null;
    a = M[0xF335 + y] & 0x08;
    if (a !== 0) {
      a = M[0xA0 + x];
      if (a >= M[0xF336 + y]) toPulse = true;
      else {
        M[0xF336 + y] = 0;
        a = M[0xF335 + y] & 0xF6; M[0xF335 + y] = a;
        if (a !== 0) gateOff = a;                    // else on into b_F6C2
      }
    }
    if (!toPulse && gateOff === null) {
      // b_F6C2
      a = M[0xF336 + y];
      if (a === 0) {
        a = M[0xF337 + y];
        if (((a + 1) & 255) === 0) toPulse = true;   // $FF: rings on
        else {
          a = (a - 1) & 255; M[0xF337 + y] = a;
          if (a !== 0) toPulse = true;
          else {
            M[0x7F] = x;
            y = (M[0x7437 + x] - 1) & 255;
            for (let i = 6; i >= 0; i--) { c.sidWrite(y, 0); y = (y - 1) & 255; }
            if (x === M[0x91]) M[0xF391] = 0;
            return ret(r, { a: 0, y }, cmp(x, M[0x91]));
          }
        }
      } else {
        // b_F6EF
        if (((a + 1) & 255) === 0) toPulse = true;
        else {
          a = (a - 1) & 255; M[0xF336 + y] = a;
          if (a !== 0) toPulse = true;
          else gateOff = M[0xF335 + y] & 0xF6;
        }
      }
    }
    if (gateOff !== null) {
      // b_F703
      y = M[0x7436 + x]; c.sidWrite(4 + y, gateOff);
      y = M[0x7430 + x]; a = gateOff;
    }
    // b_F70C: the pulse sweep
    a = M[0xF32C + y];
    if (a !== 0) {
      a = M[0xF32B + y];
      if (a !== 0) { a = (a - 1) & 255; M[0xF32B + y] = a; }
      else {
        for (let guard = 0; ; guard++) {             // b_F71F
          if (guard > 1000) throw new Error('voice_frame: the pulse sweep repeats with no length (the game hangs here)');
          M[0x7A] = M[0x92 + x]; M[0x7B] = M[0x95 + x];
          a = M[0xF33C + y];
          if (a !== 0) { M[0xF33C + y] = (a - 1) & 255; add16(M[0xF32D + y], M[0xF32E + y]); break; }
          a = M[0xF33D + y];
          if (a !== 0) { M[0xF33D + y] = (a - 1) & 255; add16(M[0xF32F + y], M[0xF330 + y]); break; }
          a = M[0xF32C + y] & 0x81;
          if (a === 0) break;
          r = (a & 0x80) ? P.pulse_mod_restart(ret(r, { a, y })) : P.pulse_mod_reload(ret(r, { a, y }));
        }
        // j_F776
        y = M[0x7436 + x];
        c.sidWrite(2 + y, M[0x7A]); M[0x92 + x] = M[0x7A];
        a = M[0x7B]; c.sidWrite(3 + y, a); M[0x95 + x] = a;
        y = M[0x7430 + x];
      }
    }
    // b_F78A: the frequency
    a = M[0xF328 + y];
    if (a === 0) return ret(r, { a, y }, nz(a));
    if ((a & 0x08) && x !== 2) {
      // the arpeggio: every rate3 frames the next offset of the table at len1/len2, from the
      // base note in len3, the index counting down in freq_delay from the table's length in len4
      a = (M[0xF31F + y] - 1) & 255; M[0xF31F + y] = a;
      if (a !== 0) return ret(r, { a, y }, { c: 1, ...nz(a) });
      M[0xF31F + y] = M[0xF321 + y];
      M[0x80] = M[0xF323 + y]; M[0x81] = M[0xF324 + y];
      const base = M[0xF325 + y];
      a = M[0xF327 + y];
      if (a & 0x80) a = M[0xF326 + y];
      y = a;
      const note = (base + M[((M[0x80] | (M[0x81] << 8)) + y) & 0xFFFF]) & 255;
      y = (y - 1) & 255;
      M[0xF327 + M[0x7430 + x]] = y;
      y = note;
      const fh = M[0xF418 + y], fl = M[0xF3B9 + y];
      y = M[0x7436 + x];
      c.sidWrite(y, fl); c.sidWrite(1 + y, fh);
      return ret(r, { a: fh, y }, nz(fh));
    }
    // b_F7E0: the four steps
    M[0x7A] = M[0x98 + x]; M[0x7B] = M[0x9B + x];
    a = M[0xF327 + y];
    if (a !== 0) {
      a = (a - 1) & 255; M[0xF327 + y] = a;
      a = M[0xF328 + y] & 0x02;
      if (a === 0) return ret(r, { a, y }, nz(a));
      return freq_step(r, y, 0xF321);                // b_F851
    }
    for (let guard = 0; ; guard++) {                 // b_F7FB
      if (guard > 1000) throw new Error('voice_frame: the frequency modulation repeats with no length (the game hangs here)');
      a = M[0xF338 + y]; if (a !== 0) { M[0xF338 + y] = (a - 1) & 255; return freq_step(r, y, 0xF31B); }
      a = M[0xF339 + y]; if (a !== 0) { M[0xF339 + y] = (a - 1) & 255; return freq_step(r, y, 0xF31D); }
      a = M[0xF33A + y]; if (a !== 0) { M[0xF33A + y] = (a - 1) & 255; return freq_step(r, y, 0xF31F); }
      a = M[0xF33B + y]; if (a !== 0) { M[0xF33B + y] = (a - 1) & 255; return freq_step(r, y, 0xF321); }
      a = M[0xF328 + y] & 0x81;                      // b_F872
      if (a === 0) return freq_out(r);
      r = (a & 0x80) ? P.freq_mod_restart(ret(r, { a, y })) : P.freq_mod_reload(ret(r, { a, y }));
    }
  };
  // $7A/$7B plus a 16-bit rate.
  function add16(lo, hi) {
    const s = adc(M[0x7A], lo, 0); M[0x7A] = s.a;
    M[0x7B] = adc(M[0x7B], hi, s.c).a;
  }
  // $F806 and the like: the working frequency plus the step's rate, then out.
  function freq_step(r, y, rate) {
    add16(M[rate + y], M[rate + 1 + y]);
    return freq_out(r);
  }
  // $F860: the working frequency kept per voice and written to the SID.
  function freq_out(r) {
    const c = io(), x = b(r.x), y = M[0x7436 + x];
    M[0x98 + x] = M[0x7A]; c.sidWrite(y, M[0x7A]);
    const a = M[0x7B]; M[0x9B + x] = a; c.sidWrite(1 + y, a);
    return ret(r, { a, y }, nz(a));
  }
};
})(typeof window !== 'undefined' ? window : globalThis);

/* port/src/items.js */
// The items and their effects: place_items ($2B31) and the two item setters, check_items ($2CB7)
// with the dispatch through item_effect_lo/hi ($2D65/$2D88), every effect_* ($2DAB-$3621, $7C37,
// $7FA4-$7FF1, $A64D, $A653), the bonus scenes (bonus_room $2F8D, bonus_collect $3193 with its
// two per-frame routines, the secret room $3621, bonus_scene_begin $A428), EXTEND (check_extend
// $32C1), the panel and scoring helpers at $7AC0-$7C3C (draw_panel, add_score...), reset_powers
// ($7F53) with boss_round_setup and the cracker's trainer_boss_hook ($3FDA), skip_rounds ($7FB2)
// and check_extra_life ($F1AC). build_giant_food ($3517) and build_boss_mirror ($7AE3), reached by
// JMP from round_timers and init_round_state, are here too.
//
// Where the port departs from the instructions:
// - Two routines pull return addresses off the stack to leave several callers at once:
//   bonus_tick_timer ($3234, two bytes: bonus_collect returns to bonus_room) and secret_room_tick
//   ($3771, four bytes: bonus_collect and check_items both return, to the pass loop). The port
//   throws a local Unwind that bonus_collect and check_items catch, one frame each. The registers
//   bonus_tick_timer leaves are its PLAs' (A = $31, the high byte of the dropped address).
// - bonus_collect's per-frame JSR ($31B1) has its operand patched from bonus_step_lo/hi; the port
//   reads the operand from M and dispatches to the two routines the tables name ($3234, $3771).
// - check_items reads item_effect_lo/hi from M, writes the operand at $2D52/$2D53 as the game
//   does, and calls the handler by the label of that address (EFFECTS below). Four targets have no
//   label: $348D and $3498 (the canes $15 and $17: an LDY inside effect_giant_a/b) and $35A7 and
//   $3620 (an RTS: points only), ported as local functions.
// - enemy_fireball ($7C14) jumps into shot_step at $1288 and ends either at the RTS bottle_shot
//   patches into $12A8 or at JMP move_bubbles_next ($0D4A, the object loop's tail, which only the
//   loop can continue): the port returns in both cases; a port of move_bubbles goes on to the next
//   object after any special handler.
// - skip_rounds ends in JMP $09A5 with the carry clear after pulling four bytes: a Goto.
// - Pointer stores that land in $D000-$DFFF (draw_block's colour writes, effect_flood's colour
//   rows, fill_panel_colours) go through P.io.write; everything else is M.
(function (root) {
'use strict';
const G = root.BBGroups = root.BBGroups || {};
const { nz, regs, adc, sbc, adcDec, cmp } = root.BBUtil;
const { Goto } = root.BBPort;

// The handlers item_effect_lo/hi ($2D65/$2D88) name, by address: a label of P, or a local function.
const EFFECT_LABELS = {
  0x7FF1: 'effect_shoes', 0x348A: 'effect_giant_a', 0x3495: 'effect_giant_b', 0x2DAB: 'effect_fast_reload',
  0x2DB2: 'effect_long_range', 0x2DCD: 'effect_fast_bubbles', 0xA64D: 'effect_fire_breath', 0xA653: 'effect_sky_flash',
  0x2DD7: 'effect_flood', 0x2DBE: 'effect_all_powers', 0x2DC7: 'effect_three_powers', 0x2ECC: 'effect_six_sprites_a',
  0x2F5F: 'effect_jump_bonus', 0x2F62: 'effect_walk_bonus', 0x2F65: 'effect_blow_bonus', 0x2F68: 'effect_clock',
  0x2F7D: 'effect_bonus_room_a', 0x2F83: 'effect_bonus_room_b', 0x2F89: 'effect_bonus_room_c',
  0x7FA4: 'effect_skip_3', 0x7FA7: 'effect_skip_7', 0x34A0: 'effect_freeze', 0x34FA: 'effect_giant_c',
  0x3502: 'effect_giant_d', 0x350A: 'effect_giant_e', 0x35B0: 'effect_six_sprites_b', 0x3621: 'effect_secret_room',
  0x7C37: 'effect_skip_to_70', 0x7C3C: 'effect_potion',
};

// Thrown by the two per-frame routines that pull return addresses: frames is how many callers
// return at once (bonus_collect, then check_items); r the registers they leave.
class Unwind { constructor(frames, r) { this.frames = frames; this.r = r; } }

G.items = function (P) {
  const M = P.M;
  const io = () => P.io;
  const GEN = P.GEN;
  // A byte through a pointer: the I/O area is the chips (the port is $35 throughout), the rest M.
  const peek = a => ((a & 0xF000) === 0xD000 ? io().read(a & 0xFFFF) : M[a & 0xFFFF]);
  const poke = (a, v) => { if ((a & 0xF000) === 0xD000) io().write(a & 0xFFFF, v & 255); else M[a & 0xFFFF] = v & 255; };
  const zp = a => M[a] | (M[(a + 1) & 255] << 8);        // a zero-page pointer
  const dec = a => (M[a] = (M[a] - 1) & 255);
  const inc = a => (M[a] = (M[a] + 1) & 255);
  // |a - b| as the game does it: SEC SBC, then EOR #$FF / ADC #$01 when it borrowed.
  const dist = (a, b) => (a >= b ? a - b : b - a) & 255;
  const vicRead = r => io().vicRead(r), vicWrite = (r, v) => io().vicWrite(r, v);

  // --- placing the items ($2B31) -----------------------------------------------------------
  // $2B31: the round's two item positions from item_pos_a/b/c, then the items themselves.
  P.place_items = function (r) {
    const lv = M[0x10];
    M[0x03] = M[0xB5CD + lv]; M[0x04] = M[0xB631 + lv];
    let a = M[0xB569 + lv];
    const x0 = a;
    M[0x59] = a & 0xF8;
    M[0x40] = (a & 0xF8) >> 3;
    M[0x41] = x0 & 7;
    a = M[0x03];
    M[0x41] = ((M[0x41] << 2) | (a >> 6)) & 255;    // ASL A / ROL $41, twice
    a = M[0x41];
    let y = (a << 1) & 255;
    a = (a << 3) & 255;
    M[0x5B] = a;
    let s = adc(M[0xAC09 + y], M[0x40], 0); M[0x4E] = s.a;
    s = adc(M[0xAC0A + y], 0, s.c); M[0x50] = s.a;
    a = (M[0x03] & 0x3E) >> 1; M[0x40] = a;
    a = (a << 3) & 255; M[0x5A] = a;
    y = M[0x04] & 0xF0;
    const c = M[0x03] & 1;                          // LSR A of $03: its bit 0 into the carry
    a = (y >> 1) | (c << 7); M[0x5C] = a;
    y = a >> 2;
    s = adc(M[0xAC09 + y], M[0x40], 0); M[0x4F] = s.a;
    s = adc(M[0xAC0A + y], 0, s.c); M[0x51] = s.a;
    if (lv === 0x63) {
      M[0x5B7F] = 0;
      r = P.set_points_item(regs(r, { a: 0x51, x: x0, y }));
      r = P.set_special_item(regs(r, { a: 0x22 }));
      return items_to_sprite_coords(r);
    }
    r = P.random(regs(r, { x: x0, y }));
    a = r.a & 3;
    s = adc(a, M[0x58], r.c);                        // the ADC keeps random's carry
    a = s.a;
    if (a >= 0x2F) a = 0x2E;
    return P.set_points_item(regs(r, { a }));
  };
  // $2BBD: points item A, then the door test, then (falling through) the special item.
  P.set_points_item = function (r) {
    let a = r.a & 255;
    const x = a;
    M[0x52] = a | 0x80;
    M[0x5F] = M[0xA8E4 + x];
    M[0x05] = 0; M[0x58] = 0;
    r = P.item_picture_address(regs(r, { a: M[0xA892 + x], x }));
    M[0x02] = M[0x04]; M[0x03] = M[0x05];
    if (M[0x5B7F] !== 0) {
      a = M[0x5B3F];
      if (a < M[0x10]) {
        a = (a + 0x0A) & 255;                        // ADC #$0A with the carry the CMP cleared
        M[0x5B3F] = a;
        const y = a;
        if (y !== 0x3A) return P.set_special_item(regs(r, { a: 0x20, x, y }));
        M[0x5B3F] = 0x4E;
        return P.set_special_item(regs(r, { a: 0x21, x, y }));
      }
    }
    // the generator seeded with the round number gives the round's usual item
    const sx = M[0x26], sy = M[0x27];
    M[0x26] = M[0x10]; M[0x27] = M[0x10];
    r = P.random(regs(r, { x: sx, y: sy }));
    a = ((r.a + 1) & 0x1F);
    M[0x26] = sx; M[0x27] = sy;
    M[0x04] = a;
    r = P.random(r);
    a = r.a & 0x0F;
    if (a === 0) {
      r = P.random(r);
      return P.set_special_item(regs(r, { a: (r.a & 1) | 0x1E }));
    }
    if (a >= 7) return P.set_special_item(regs(r, { a: M[0x04] }));
    r = P.random(r);
    return P.set_special_item(regs(r, { a: r.a & 0x1F }));
  };
  // $2C32: special item A, both items' glyphs into the two character sets, the two delays; on
  // round 100 the boss's hits and the pass hook, then boss_round_setup.
  P.set_special_item = function (r) {
    const x = r.a & 255;
    M[0x53] = x | 0x80;
    M[0x60] = M[0xA913 + x];
    M[0x05] = 0;
    r = P.item_picture_address(regs(r, { a: M[0xA8C1 + x], x }));
    for (let y = 0x1F; y >= 0; y--) {
      let a = peek(zp(0x02) + y); M[0x4210 + y] = a; M[0x4A10 + y] = a;
      a = peek(zp(0x04) + y); M[0x4230 + y] = a; M[0x4A30 + y] = a;
    }
    r = P.random(regs(r, { x, y: 0xFF }));
    M[0x5D] = ((r.a & 7) + 3) & 255;
    r = P.random(r);
    M[0x5E] = ((r.a & 0x0F) + 1) & 255;
    const lv = M[0x10];
    if (lv !== 0x63) return items_to_sprite_coords(regs(r, { a: lv }, cmp(lv, 0x63)));
    M[0x5BBF] = 0x32;
    M[0x0A39] = 0x34; M[0x0A3A] = 0x11; M[0x0A38] = 0x20;
    return P.boss_round_setup(regs(r, { a: 0x20 }, cmp(lv, 0x63)));
  };
  // $2C8C: the playfield's origin ($14, $2D) onto both positions.
  function items_to_sprite_coords(r) {
    let a = 0, c = 0;
    for (let x = 1; x >= 0; x--) {
      let s = adc(M[0x59 + x], 0x14, 0); M[0x59 + x] = s.a;
      s = adc(M[0x5B + x], 0x2D, s.c); M[0x5B + x] = s.a; a = s.a; c = s.c;
    }
    return regs(r, { a, x: 0xFF }, { c, n: 1, z: 0 });
  }
  // $2C9F: $04/$05 = $9AE0 + 32 × A (the top bit of A is lost; $05 is shifted as it stands).
  P.item_picture_address = function (r) {
    let a = (r.a << 1) & 255, c = 0;
    for (let i = 0; i < 4; i++) {
      c = a >> 7; a = (a << 1) & 255;
      const h = M[0x05]; M[0x05] = ((h << 1) | c) & 255; c = h >> 7;
    }
    let s = adc(a, 0xE0, c); M[0x04] = s.a;
    s = adc(M[0x05], 0x9A, s.c); M[0x05] = s.a;
    return regs(r, { a: s.a }, { c: s.c, z: s.z, n: s.n, v: s.v });
  };

  // --- picking the items up ($2CB7) --------------------------------------------------------
  // The effect a target address names: a P routine (by label) or a local one.
  function effectAt(t) {
    const label = EFFECT_LABELS[t];
    if (label) return { f: P[label], gen: GEN.has(label), label };
    if (t === 0x348D) return { f: r => set_giant(r, 0x20, 0x1B, 0), gen: false, label: '$348D' };   // cane $15: LDY #$20 in effect_giant_a
    if (t === 0x3498) return { f: r => set_giant(r, 0x30, 0x18, 1), gen: false, label: '$3498' };   // cane $17: LDY #$30 in effect_giant_b
    if (t === 0x35A7 || t === 0x3620) return { f: r => r, gen: false, label: 'rts' };               // points only
    throw new Error('check_items: no effect at $' + t.toString(16));
  }
  // $2CB7: flash the heart, then each live player against each item on show; the points item
  // scores, the special item scores and runs its effect. Returns at once when an effect's
  // per-frame routine pulled check_items's own return address (the secret room's exit).
  P.check_items = function* (r) {
    let a = r.a, c = r.c, y = r.y;
    a = M[0x53];
    c = a >= 0x18 ? 1 : 0;
    if (a === 0x18) { a = M[0x60] ^ 5; M[0x60] = a; }
    for (let x = 1; x >= 0; x--) {
      a = M[0xB2 + x];
      if (a === 0) continue;
      c = a >= 0x18 ? 1 : 0;
      if (a !== 0x18) {
        c = a >= 0x0E ? 1 : 0;
        if (c) { c = a >= 0x10 ? 1 : 0; if (a !== 0x10) continue; }
      }
      for (y = 1; y >= 0; y--) {
        a = M[0x52 + y];
        if (a & 0x80) continue;
        // |actor - item| on each axis, as SEC SBC then EOR #$FF / ADC #$01 when it borrowed
        for (const [actor, item] of [[0xBA + x, 0x59 + y], [0xC2 + x, 0x5B + y]]) {
          const s = sbc(M[actor], M[item], 1);
          a = s.a; c = s.c;
          if (!c) { a = ((a ^ 0xFF) + 1) & 255; c = 0; }
          c = a >= 0x10 ? 1 : 0;
          if (c) break;
        }
        if (c) continue;
        M[0x5D + y] = 0xFF;
        M[0xB0] = 1;
        a = M[0xAB51 + x];
        M[0x40] = a;
        M[0x41] = y;
        c = y >= 1 ? 1 : 0;
        let special = y === 1;
        if (!special) {
          const n = M[0x52];
          a = M[0xA936 + n];
          c = n >= 0x0F ? 1 : 0;
          if (c) { dec(0x40); if (M[0x40] & 0x80) special = true; }   // DEC / BPL: a negative offset falls into the special path
        }
        if (special) {
          const n = M[0x53];
          a = M[0xA965 + n];
          c = n >= 0x18 ? 1 : 0;
          if (c) dec(0x40);
        }
        r = P.add_score(regs(r, { a, x, y: M[0x40] }, { c }));
        a = r.a; c = r.c;
        y = M[0x41];
        if (y === 0) {
          a = M[0x10];
          c = a >= 0x63 ? 1 : 0;
          if (a === 0x63) { r = P.effect_potion(regs(r, { a, x, y }, { c })); a = r.a; }
          continue;
        }
        M[0x2D57] = x;
        const n = M[0x53];
        M[0x2D52] = M[0x2D65 + n]; M[0x2D53] = M[0x2D88 + n];
        const t = M[0x2D52] | (M[0x2D53] << 8);
        const e = effectAt(t);
        const er = regs(r, { a: M[0x2D53], x, y: n }, { c });
        try {
          r = e.gen ? yield* e.f(er) : e.f(er);
        } catch (ex) {
          if (ex instanceof Unwind && --ex.frames === 0) return ex.r;
          throw ex;
        }
        a = r.a; c = r.c;
        x = M[0x2D57];
        y = 1;
      }
    }
    return regs(r, { a, x: 0xFF, y: y & 255 }, { c, n: 1, z: 0 });
  };

  // --- the powers ($2DAB-$2DD6) ------------------------------------------------------------
  const effect_sound = r => { M[0xB0] = 5; return regs(r, { a: 5 }, nz(5)); };
  // $2DAB: sweet 3, reload in 3 passes.
  P.effect_fast_reload = function (r) { M[0xA77B + r.x] = 3; return effect_sound(r); };
  // $2DB2: sweet 4, travel $8C and the range flag.
  P.effect_long_range = function (r) { M[0xA77D + r.x] = 0x8C; M[0xA77F + r.x] = 0xFF; return effect_sound(r); };
  // $2DBE: the red lamp, the three rings and the three powers.
  P.effect_all_powers = function (r) {
    r = P.effect_jump_bonus(r); r = P.effect_walk_bonus(r); r = P.effect_blow_bonus(r);
    return P.effect_three_powers(r);
  };
  // $2DC7: the yellow lamp.
  P.effect_three_powers = function (r) {
    r = P.effect_fast_reload(r); r = P.effect_long_range(r);
    return P.effect_fast_bubbles(r);
  };
  // $2DCD: sweet 5, bubble speed $FF.
  P.effect_fast_bubbles = function (r) { M[0xA781 + r.x] = 0xFF; return effect_sound(r); };

  // --- the flood ($2DD7) -------------------------------------------------------------------
  // $2DD7: end every object, then from the bottom row up, two frames a row, turn the cells to
  // character $FF with colour $0B in both buffers; then kill_all_enemies.
  P.effect_flood = function* (r) {
    inc(0x37);
    r = P.clear_fire_and_water(r);
    M[0x38] = 0xC2; M[0x3A] = 0xC2;
    let a = 3 | M[0x30];
    M[0x39] = a;
    a = (a & 3) | 0xD8;
    M[0x3B] = a;
    r = yield* P.end_all_objects(regs(r, { a }));
    dec(0x37);
    M[0x52] = 0xFF; M[0x53] = 0xFF; M[0x58BF] = 0xFF;
    for (let x = 7; x >= 0; x--) { M[0x47F8 + x] = 0xFF; M[0x4FF8 + x] = 0xFF; }
    M[0x31] = 0x19;
    M[0x32] = M[0x38];
    M[0x33] = M[0x39] ^ 4;
    do {
      r = yield* P.wait_frame(r);
      r = yield* P.wait_frame(r);
      r = yield* P.check_deaths(r);
      for (let y = 0x1B; y >= 0; y--) {
        const p = zp(0x38) + y;
        const ch = peek(p);
        if (ch >= 0x20 || ch === 0x1F || ch < 0x10) { poke(p, 0xFF); poke(zp(0x32) + y, 0xFF); }
        poke(zp(0x3A) + y, 0x0B);
      }
      const s = sbc(M[0x38], 0x28, 1);
      M[0x32] = s.a; M[0x38] = s.a; M[0x3A] = s.a;
      if (!s.c) { dec(0x39); dec(0x3B); dec(0x33); }
    } while (dec(0x31) !== 0);
    for (let x = 1; x >= 0; x--) if (M[0xB2 + x] === 0x0D) M[0xB2 + x] = 1;
    return P.kill_all_enemies(regs(r, { x: 0xFF }));
  };
  // $2E61: every enemy in an ordinary state or carried by water is beaten; none left.
  P.kill_all_enemies = function (r) {
    let a = r.a, c = r.c;
    for (let x = 5; x >= 0; x--) {
      a = M[0xB4 + x];
      if (a === 0) continue;
      c = a >= 0x0B ? 1 : 0;                         // the last CMP's carry (CMP #$0D, then CMP #$0B)
      if (a === 0x0D || a < 0x0B) { r = P.kill_enemy(regs(r, { a, x })); a = r.a; c = r.c; }
    }
    M[0x4A] = 0;
    return regs(r, { a, x: 0 }, { c, ...nz(0) });
  };
  // $2E79: unless the objects are frozen: free every held enemy as beaten, every object to type
  // $4A with its cells forgotten, then both buffers redrawn.
  P.end_all_objects = function* (r) {
    const f = M[0x58BF];
    if (f & 0x80) return regs(r, { a: f, x: 0x11 }, nz(f));
    for (let x = 0x11; x >= 0; x--) {
      const t = M[0xCA + x];
      if (t < 0x24 && t >= 0x18) {
        const e = (t - 0x18) >> 1;
        M[0x40] = x;
        const y = M[0xAA30 + x];
        M[0xB4 + e] = y;
        vicWrite(0x15, vicRead(0x15) | M[0xAB55 + e]);
        r = P.kill_enemy(regs(r, { a: y, x: e, y }));
      }
      M[0xCA + x] = 0x4A;
      M[0x014B + x] = 0; M[0x016F + x] = 0; M[0x015D + x] = 0; M[0x0181 + x] = 0;
      M[0xDC + x] = 0; M[0xEE + x] = 0;
    }
    r = yield* P.redraw_both_buffers(regs(r, { a: 0, x: 0xFF }));
    return yield* P.redraw_both_buffers(r);
  };
  // $2EC0: scrub and flip, twice.
  P.redraw_both_buffers = function* (r) {
    r = P.scrub_back_buffer(r); r = yield* P.flip_buffers(r);
    r = P.scrub_back_buffer(r); return yield* P.flip_buffers(r);
  };

  // --- the six-sprite shows ($2ECC, $35B0) and their common part ($2EEA) --------------------
  // $2ECC: the purple lamp.
  P.effect_six_sprites_a = function* (r) {
    r = P.clear_item_sprites(r);
    for (let x = 0x22; x >= 0; x--) M[0x7D00 + x] = M[0xA854 + x];
    inc(0x37);
    r = yield* P.end_all_objects(regs(r, { x: 0xFF }));
    r = P.kill_all_enemies(r);
    inc(0x4A);
    return yield* P.enemies_to_bonus(regs(r, { a: 0x13, x: 0x88, y: 0x91 }));
  };
  // $2EEA: save the six enemies at $4700-$4737, give them state A, shape $F4 and yellow, flash
  // six times and gather them at X, Y. The round timer is set to $FF.
  P.enemies_to_bonus = function* (r) {
    M[0x38] = r.a & 255; M[0x39] = r.x & 255; M[0x3A] = r.y & 255;
    for (let x = 5; x >= 0; x--) {
      M[0x4700 + x] = M[0xB4 + x]; M[0x4710 + x] = M[0xBC + x]; M[0x4720 + x] = M[0xC4 + x];
      M[0x4730 + x] = M[0x859A + x];
      M[0x859A + x] = 0xF4;
      M[0x8522 + x] = 0; M[0xBC + x] = 0; M[0xC4 + x] = 0; M[0x872A + x] = 0; M[0x863A + x] = 0;
      M[0xB4 + x] = M[0x38];
      M[0x85C2 + x] = 0xFF;
      M[0x854A + x] = 7;
    }
    M[0x2A] = 0xFF;
    vicWrite(0x20, 7); vicWrite(0x21, 7);
    for (let x = 6; x > 0; x--) {
      const a = vicRead(0x20) ^ 2;
      vicWrite(0x20, a); vicWrite(0x21, a);
      r = yield* P.wait_frames(regs(r, { a: 3, x }));
    }
    vicWrite(0x20, 0); vicWrite(0x21, 0);
    for (let x = 5; x >= 0; x--) { M[0xBC + x] = M[0x39]; M[0xC4 + x] = M[0x3A]; }
    dec(0x37);
    return regs(r, { a: M[0x3A], x: 0xFF }, { n: 1, z: 0 });
  };
  // $35B0: the crystal ball: a symmetrical picture from bonus_sprite_b, the show as state $14,
  // the formation placed and the sprites $F9 down to $F5.
  P.effect_six_sprites_b = function* (r) {
    r = P.clear_item_sprites(r);
    M[0x7D3E] = 0x2A; M[0x7DC2] = 0x2A; M[0x7DBC] = 0xA0; M[0x7E40] = 0xA0;
    M[0x40] = 0x7C; M[0x41] = 0x7D; M[0x42] = 0x00; M[0x43] = 0x7E;
    let x = 0x1A;
    do {
      for (let y = 2; y >= 0; y--) {
        const a = M[0xA877 + x];
        poke(zp(0x40) + y, a); poke(zp(0x42) + y, a);
        x = (x - 1) & 255;
      }
      M[0x40] = (M[0x40] - 3) & 255;
      M[0x42] = (M[0x42] + 3) & 255;
    } while (!(x & 0x80));
    inc(0x37);
    r = yield* P.end_all_objects(regs(r, { x }));
    r = P.kill_all_enemies(r);
    inc(0x4A);
    r = yield* P.enemies_to_bonus(regs(r, { a: 0x14, x: 0x78, y: 0x7C }));
    const f = io().irqByte(0x08) & 3;
    M[0x08] = f;
    r = P.place_formation(regs(r, { a: f, x: 5, y: 0x0E }));
    let a = 0xF9;
    for (x = 4; x >= 0; x--) { M[0x859B + x] = a; a = (a - 1) & 255; }
    return regs(r, { a, x: 0xFF }, { n: 1, z: 0, c: 1 });
  };

  // --- the rings and the clock ($2F5F-$2F7C) -----------------------------------------------
  P.effect_jump_bonus = function (r) { const v = dec((0x61 + r.x) & 255); return regs(r, {}, nz(v)); };   // $2F5F
  P.effect_walk_bonus = function (r) { const v = dec((0x63 + r.x) & 255); return regs(r, {}, nz(v)); };   // $2F62
  P.effect_blow_bonus = function (r) { const v = dec((0x65 + r.x) & 255); return regs(r, {}, nz(v)); };   // $2F65
  // $2F68: the clock: invert the wall colours, freeze for $87 passes, stop the second counter.
  P.effect_clock = function (r) {
    M[0x1C] ^= 7; M[0x1E] ^= 7;
    M[0x67] = 0x87;
    M[0x2B] = 0xFF;
    return regs(r, { a: 0xFF }, nz(0xFF));
  };

  // --- the bonus rooms ($2F7D-$311D) -------------------------------------------------------
  P.effect_bonus_room_a = function* (r) { return yield* bonus_room(regs(r, { a: 0xC0, x: 0x0D })); };   // $2F7D: notes
  P.effect_bonus_room_b = function* (r) { return yield* bonus_room(regs(r, { a: 0x00, x: 0x0C })); };   // $2F83: arches
  P.effect_bonus_room_c = function* (r) { return yield* bonus_room(regs(r, { a: 0xE0, x: 0x0F })); };   // $2F89: rings
  // $2F8D: lay the blocks out, collect them for thirty seconds, then the results panel.
  function* bonus_room(r) {
    M[0x38] = r.a & 255; M[0x39] = r.x & 255;
    r = yield* P.bonus_scene_begin(r);
    M[0xB0] = 4;
    let a = 0x2A ^ M[0x10];
    while (a >= 0x0B) { a -= 0x0A; if (a === 0) break; }
    let x = a;
    M[0x24] = 0; M[0x597F] = 0;
    for (;;) {                                     // j_2FAC: a pair of rows
      let y = 0x1C;
      M[0x23] = y;
      y -= 2;
      do {                                         // b_2FB2: a pair of columns
        M[0x40] = y;
        const pa = zp(0x02);
        if (!(peek(pa + y) & 0x80) && !(peek(pa + y + 1) & 0x80) && !(peek(pa + y + 0x28) & 0x80) && !(peek(pa + y + 0x29) & 0x80)) {
          const pb = zp(0x04), pc = zp(0x06);
          poke(pb + y + 0x29, 0x45); poke(pb + y + 0x28, 0x43);
          poke(pc + y + 0x28, M[0x39]); poke(pc + y + 0x29, M[0x39]);
          poke(pb + y, 0x42); poke(pb + y + 1, 0x44);
          poke(pc + y + 1, M[0x39]); poke(pc + y, M[0x39]);
          const n = M[0x597F];
          inc(0x597F);
          M[0x4600 + n] = adc((M[0x23] << 3) & 255, 0x14, (M[0x23] >> 5) & 1).a;   // ASL ×3 then ADC: the shift's carry
          M[0x4700 + n] = adc((M[0x24] << 3) & 255, 0x35, (M[0x24] >> 5) & 1).a;
          let s = adc(M[0x40], M[0x04], 0); M[0x4E00 + n] = s.a;
          s = adc(0, M[0x05], s.c); M[0x4F00 + n] = s.a;
        }
        dec(0x23); dec(0x23);
        y = M[0x40] - 2;
      } while (y >= 0);
      const s = adc(M[0x02], 0x50, 0);
      M[0x02] = s.a; M[0x04] = s.a; M[0x06] = s.a;
      if (s.c) { inc(0x03); inc(0x05); inc(0x07); }
      inc(0x24); inc(0x24);
      if (M[0x597F] >= 0x55) break;
      x = (x - 1) & 255;
      if (x !== 0) continue;
      if (M[0x597F] !== 0) break;
      x = 1;
    }
    x = 0xA2;
    if (M[0x38] === 0) x++;
    M[0x39] = x; M[0x3B] = x;
    a = (M[0x38] + 0x10) & 255;
    M[0x3A] = a;
    dec(0x37);
    r = yield* P.fade_in_pictures(regs(r, { a, x }));
    x = (r.x + 1) & 255;
    M[0x31] = x; M[0x32] = x; M[0x4A] = x;
    M[0x2A] = 0x1E;
    r = yield* P.bonus_collect(regs(r, { a: 0x1E, x: 0, y: 0x50 }));
    M[0x38] = 0x20; M[0x3A] = 0x20; M[0x39] = 0x80; M[0x3B] = 0x80;
    r = yield* P.fade_in_pictures(regs(r, { a: 0x80 }));
    r = P.restore_playfield(r);
    r = P.fill_panel(r);
    r = P.print_string(regs(r, { x: 0xC8, y: 0xA7 }));
    M[0x38] = 1; M[0x41] = 0x51; M[0x45] = 0;
    do {                                           // b_309B, bonus_results $30A0: each player's line
      let y = M[0x38];
      x = M[0x8570 + y];
      a = M[0x31 + y];
      y = (M[0xA7F7 + y] + 0x4C) & 255;
      r = P.print_two_digits(regs(r, { a, x, y }));
      x = M[0x38];
      a = (8 + M[0xA7F7 + x]) & 255;
      M[0xA7E4] = a; M[0xA7EE] = a;
      y = 0;
      if (M[0x597F] === 0) {
        y = M[0xB2 + x];
        if (y !== 0) {
          y = x ^ 1;
          if (M[0x31 + x] >= M[0x31 + y]) {
            y = (M[0xAB51 + x] - 2) & 255;
            r = P.add_score(regs(r, { a: 1, x, y }));
            a = 0x21; y = 0x20;
          } else {
            y = (M[0xAB51 + x] - 1) & 255;
            r = P.add_score(regs(r, { a: 0x50, x, y }));
            a = 0x40; y = 0x25;
          }
          M[0xA7F0] = a; M[0xA7F1] = y;
          y = M[0x8570 + x];
        }
      }
      M[0xA7E2] = y;
      r = P.print_string(regs(r, { a, x: 0xE2, y: 0xA7 }));
    } while (!(dec(0x38) & 0x80));
    r = yield* P.wait_frames(regs(r, { a: 0xC8 }));
    r = P.print_scores(r);
    r = P.fill_panel_colours(r);
    r = P.restore_playfield(r);
    M[0x2A] = 0x32; M[0x2B] = 0x32;
    return P.save_screen(regs(r, { a: 0x32 }));
  }
  // $311E: colour $0D over the 16 by 6 panel at $D920.
  P.fill_panel_colours = function (r) {
    M[0x40] = 0x20; M[0x41] = 0xD9;
    return P.fill_rect(regs(r, { a: 0x0D, x: 6, y: 0x0F }));
  };
  // $312E: the panel's frame, characters $10 then $20.
  P.fill_panel = function (r) {
    M[0x40] = 0xCE; M[0x41] = 0x50;
    r = P.fill_rect(regs(r, { a: 0x10, x: 0x0A, y: 0x13 }));
    M[0x40] = 0xF7; M[0x41] = 0x50;
    return P.fill_rect(regs(r, { a: 0x20, x: 8, y: 0x11 }));
  };
  // $314D: X rows of Y+1 cells of A from $40/$41.
  P.fill_rect = function (r) {
    M[0x38] = r.a & 255; M[0x39] = r.y & 255;
    let x = r.x & 255, a;
    do {
      a = M[0x38];
      for (let y = M[0x39]; y >= 0; y--) poke(zp(0x40) + y, a);
      const s = adc(M[0x40], 0x28, 0);
      a = M[0x40] = s.a;
      if (s.c) inc(0x41);
      x = (x - 1) & 255;
    } while (x !== 0);
    return regs(r, { a, x: 0, y: 0xFF }, { z: 1, n: 0 });
  };
  // $3169: the two glyph pairs at ($38) and ($3A) into characters $42-$45, a byte a frame from
  // each end. Leaves X = $FF.
  P.fade_in_pictures = function* (r) {
    M[0x40] = 0x10; M[0x42] = 0x20; M[0x41] = 0x42; M[0x43] = 0x42;
    let a = 0, y = 0;
    for (let x = 0x0F; x >= 0; x--) {
      r = yield* P.wait_frame(regs(r, { a: 4, x, y }));
      y = x;
      poke(zp(0x40) + y, peek(zp(0x38) + y));
      y = x ^ 0x0F;
      a = peek(zp(0x3A) + y);
      poke(zp(0x42) + y, a);
    }
    return regs(r, { a, x: 0xFF, y }, { n: 1, z: 0 });
  };
  // $3234: the bonus rooms' per-frame routine: the seconds and the counts in the small digits;
  // when the timer is out, stop the clock and leave bonus_collect (two bytes pulled).
  function bonus_tick_timer(r) {
    M[0x45] = 0x60; M[0x41] = 0x50;
    r = P.print_two_digits(regs(r, { a: io().irqByte(0x2A), x: 9, y: 0x0F }));
    M[0x41] = 0x53;
    r = P.print_two_digits(regs(r, { a: M[0x31], x: 0x0D, y: 0xC0 }));
    r = P.print_two_digits(regs(r, { a: M[0x32], x: 0x0B, y: 0xDE }));
    const a = io().irqByte(0x2A);
    if (a !== 0) return regs(r, { a }, nz(a));
    M[0x2B] = 0xFF;
    throw new Unwind(1, regs(r, { a: 0x31 }, nz(0x31)));
  }
  // $3771: the secret room's per-frame routine: a player at X $8C drops to the bottom once fewer
  // than 13 blocks remain, and with every block taken a player at the bottom ends the room: the
  // walls flash, the screens clear, the font's shadows come back, and both bonus_collect and
  // check_items return (four bytes pulled) after the round is marked done and tune $0B starts.
  function* secret_room_tick(r) {
    let x, y = 0, a = 0;
    for (x = 1; x >= 0; x--) {
      y = M[0xC2 + x];
      a = M[0xBA + x];
      if (a !== 0x8C) continue;
      a = M[0x597F];
      if (a === 1) {
        if (y !== 0xDD) continue;
        inc(0x37);
        x = 0x10;
        do {
          r = yield* P.wait_5(regs(r, { a, x, y }));
          a = M[0x1C] ^ 4; M[0x1C] = a;
          a |= 8; M[0x1E] = a;
          x--;
        } while (x !== 0);
        r = P.clear_screens(regs(r, { a, x, y }));
        r = yield* P.wait_10(r);
        for (x = 0x2F; x >= 0; x--) M[0x4050 + x] = M[0x4850 + x];
        dec(0x21);
        r = yield* P.play_tune(regs(r, { y: 0x0B }));
        throw new Unwind(2, r);
      }
      if (a >= 0x0E) continue;
      if (y !== 0x9D) continue;
      a = 0xDD;
      M[0xC2 + x] = a;
    }
    return regs(r, { a, x: 0xFF, y }, { n: 1, z: 0 });
  }
  // $3193: mode X's per-frame routine, score Y a block; each frame the scores, deaths, pause,
  // extra lives, the mode's routine, then every player in play against every block.
  P.bonus_collect = function* (r) {
    const mode = r.x & 255;
    M[0x31B2] = M[0x318F + mode]; M[0x31B3] = M[0x3190 + mode];
    M[0x3200] = r.y & 255;
    for (;;) {
      r = yield* P.wait_frame(r);
      r = P.print_scores(r);
      r = yield* P.check_deaths(r);
      r = yield* P.check_pause(r);
      r = P.check_extra_life(r);
      const t = M[0x31B2] | (M[0x31B3] << 8);
      try {
        if (t === 0x3234) r = bonus_tick_timer(r);
        else if (t === 0x3771) r = yield* secret_room_tick(r);
        else throw new Error('bonus_collect: no per-frame routine at $' + t.toString(16));
      } catch (ex) {
        if (ex instanceof Unwind && --ex.frames === 0) return ex.r;
        throw ex;
      }
      for (let x = 1; x >= 0; x--) {
        if (M[0xB2 + x] !== 1) continue;
        let y = 0;
        do {
          if (dist(M[0xBA + x], M[0x4600 + y]) < 0x10 && dist(M[0xC2 + x], M[0x4700 + y]) < 0x10) {
            dec(0x597F);
            M[0x40] = y;
            M[0x4600 + y] = 0; M[0x4700 + y] = 0;
            let a = M[0x4E00 + y]; M[0x42] = a; M[0x44] = a;
            a = M[0x4F00 + y]; M[0x43] = a;
            M[0x45] = (a + 0x3B) & 255;
            let yy = M[0xAB51 + x];
            a = M[0x3200];
            if (a < 0x32) yy = (yy - 1) & 255;
            r = P.add_score(regs(r, { a, x, y: yy }));
            for (const o of [0, 1, 0x28, 0x29]) poke(zp(0x42) + o, peek(zp(0x44) + o));
            y = M[0x40];
            inc((0x31 + x) & 255);
          }
          y = (y - 1) & 255;
        } while (y !== 0);
      }
      if (M[0x597F] === 0) return P.print_scores(regs(r, { a: 0, x: 0xFF }, { z: 1, n: 0 }));
    }
  };
  // $3293: the clean copy's 25 rows of 32 back to the screen at $5000.
  P.restore_playfield = function (r) {
    M[0x40] = 0; M[0x42] = 0; M[0x41] = 0x50; M[0x43] = 0x8B;
    let a = 0;
    for (let x = 0x19; x > 0; x--) {
      for (let y = 0x1F; y >= 0; y--) poke(zp(0x40) + y, peek(zp(0x42) + y));
      const s = adc(M[0x42], 0x28, 0);
      a = s.a; M[0x40] = a; M[0x42] = a;
      if (s.c) { inc(0x41); inc(0x43); }
    }
    return regs(r, { a, x: 0, y: 0xFF }, { z: 1, n: 0 });
  };

  // --- EXTEND ($32C1) ----------------------------------------------------------------------
  // $32C1: a player with all six letters gets the scene: twenty random redraws of the letter
  // column, a screen of random item pictures under the big letters, eleven flips, a life.
  P.check_extend = function* (r) {
    let x = 1, a = r.a;
    for (;;) {
      for (; x >= 0; x--) { a = M[0x54 + x]; if (a === 0x3F) break; }
      if (x < 0) return regs(r, { a, x: 0xFF }, { n: 1, z: 0 });
      const player = x;
      r = yield* P.play_tune(regs(r, { a: x, x, y: 0x2E }));
      inc(0x37);
      r = P.flip_if_front(r);
      r = P.repair_back_buffer(regs(r, { a: M[0x30] ^ 4 }));
      M[0x38] = M[0x32BF + player];
      M[0x41] = 0x14; M[0x3A] = 0x14;
      do {
        r = yield* P.wait_5(regs(r, { x: player }));
        M[0x39] = 0x0A;
        do {
          do { r = P.random(r); a = r.a & 7; } while (a >= 5);
          a = ((a << 2) + 0x4A) & 255;
          M[0x40] = a;
          r = P.draw_block(regs(r, { a, x: M[0x38], y: M[0x39] }));
          a = (M[0x39] + 2) & 255;
          M[0x39] = a;
        } while (a !== 0x16);
      } while (dec(0x3A) !== 0);
      r = yield* P.end_all_objects(r);
      r = P.clear_screens(r);
      r = P.save_screen(r);
      for (x = 0x2F; x >= 0; x--) M[0x4080 + x] = 0;
      M[0x53] = 0xFF; M[0x52] = 0xFF;
      for (x = 0x1F; x >= 0; x--) { M[0x4700 + x] = M[0xA988 + x]; M[0xA988 + x] = 0xFF; }
      r = P.build_letter_bubbles(regs(r, { a: 0xFF, x: 0xFF }));
      r = yield* P.wait_frames(regs(r, { a: 0x0F }));
      for (x = 0x1F; x >= 0; x--) M[0xA988 + x] = M[0x4700 + x];
      M[0x1C] = 2; M[0x1E] = 1;
      r = P.draw_panel(regs(r, { x: 1 }));
      r = P.flip_no_wait(r);
      r = P.print_scores(r);
      for (x = 0; x < 256; x++) {
        M[0x4300 + x] = M[0x9AE0 + x]; M[0x4400 + x] = M[0x9BE0 + x]; M[0x4500 + x] = M[0x9CE0 + x];
        M[0x4600 + x] = M[0x9DE0 + x]; M[0x4700 + x] = M[0x9EE0 + x];
      }
      M[0x39] = 0;
      do {
        M[0x38] = 0;
        do {
          do { r = P.random(r); x = r.a & 0x1F; a = M[0xA892 + x]; } while (a >= 0x28);
          a = ((a << 2) | 0x60) & 255;
          M[0x40] = a; M[0x41] = x;
          r = P.draw_block(regs(r, { a, x: M[0x38], y: M[0x39] }));
          inc(0x38); inc(0x38);
        } while (M[0x38] !== 0x20);
        inc(0x39); inc(0x39);
      } while (M[0x39] !== 0x18);
      r = P.fill_panel(r);
      M[0xA804] = (player + 0x21) & 255;
      r = P.fill_panel_colours(r);
      r = P.print_string(regs(r, { x: 0xF9, y: 0xA7 }));
      M[0x41] = 0x14; M[0x38] = 5;
      do {
        x = M[0x38];
        M[0x40] = M[0xA80D + x];
        x = ((x << 1) + 0x0A) & 255;
        r = P.draw_block(regs(r, { a: x, x, y: 0x0B }));
      } while (!(dec(0x38) & 0x80));
      r = P.flip_no_wait(r);
      r = yield* P.wait_frames(regs(r, { a: 0xC8 }));
      M[0x597F] = 0x0B;
      do {
        r = yield* P.flip_buffers(r);
        r = yield* P.wait_10(r);
      } while (dec(0x597F) !== 0);
      r = P.clear_screens(r);
      r = yield* P.wait_10(r);
      x = player;
      inc(0x045A + x);
      M[0x54 + x] = 0;
      r = P.draw_lives(regs(r, { a: 0, x }));
      dec(0x21);
      x = player;                                    // JMP b_32C3: the scan goes on from this player
    }
  };
  // $3421: block at column A, row Y into the lists at $4600/$4700/$4E00/$4F00, then draw it.
  P.add_bonus_block = function (r) {
    const a0 = r.a & 255, y = r.y & 255;
    M[0x38] = a0;
    const x = M[0x39];
    inc(0x39);
    let s = adc((a0 << 3) & 255, 0x14, (a0 >> 5) & 1);
    M[0x4600 + x] = s.a;
    s = adc((y << 3) & 255, 0x35, (y >> 5) & 1);
    M[0x4700 + x] = s.a;
    s = adc(M[0x38], M[0xAD22 + y], s.c);           // no CLC: the carry of the Y sum
    M[0x4E00 + x] = s.a;
    s = adc(0, M[0xAD41 + y], s.c);
    M[0x4F00 + x] = s.a;
    return P.draw_block(regs(r, { a: s.a, x: M[0x38], y }, { c: s.c }));
  };
  // $344A: a 2 by 2 block of characters $40, +1, +2, +3 at column X, row Y of the row table's
  // screen, coloured from item_colours[$41] at the screen address plus $8800.
  P.draw_block = function (r) {
    const x = r.x & 255, y = r.y & 255;
    let s = adc(x, M[0xAD22 + y], 0);
    M[0x42] = s.a; M[0x44] = s.a;
    s = adc(M[0xAD41 + y], 0, s.c);
    M[0x43] = s.a;
    s = adc(s.a, 0x88, s.c);
    M[0x45] = s.a;
    const p = zp(0x42);
    let v = { a: M[0x40], c: s.c };
    poke(p, v.a);
    v = adc(v.a, 1, v.c); poke(p + 0x28, v.a);
    v = adc(v.a, 1, v.c); poke(p + 1, v.a);
    v = adc(v.a, 1, v.c); poke(p + 0x29, v.a);
    const xi = M[0x41];
    const a = M[0xA8E4 + xi];
    const q = zp(0x44);
    poke(q, a); poke(q + 1, a); poke(q + 0x28, a); poke(q + 0x29, a);
    return regs(r, { a, x: xi, y: 0x29 }, { c: v.c, z: 0, n: 0 });
  };

  // --- the giant foods ($348A-$35A7) -------------------------------------------------------
  // $3510: the giant food's item, score code and kind.
  function set_giant(r, y, a, x) { M[0x68] = a; M[0x69] = y; M[0x6A] = x; return regs(r, { a, x, y }, nz(x)); }
  P.effect_giant_a = r => set_giant(r, 0x10, 0x1B, 0);   // $348A: cane 1
  P.effect_giant_b = r => set_giant(r, 0x20, 0x18, 1);   // $3495: cane 2
  P.effect_giant_c = r => set_giant(r, 0x30, 0x29, 2);   // $34FA: chest $19
  P.effect_giant_d = r => set_giant(r, 0x40, 0x2B, 3);   // $3502: chest $1A
  P.effect_giant_e = r => set_giant(r, 0x50, 0x2C, 4);   // $350A: chest $1B
  // $3517: the giant food's sprites into the item buffers and its glyphs and mask for the
  // falling food (reached by JMP from round_timers).
  P.build_giant_food = function (r) {
    let x = M[0x6A];
    if (!(x & 0x80)) {
      M[0x2AE9] = M[0xA81F + x];
      M[0x40] = M[0xA815 + x]; M[0x41] = M[0xA81A + x];
      for (let y = 0; y < 256; y++) M[0x7D00 + y] = peek(zp(0x40) + y);
      if (x !== 0) {
        for (let y = 0; y < 128; y++) M[0x7D00 + y] = 0;
        if (x === 1) for (let y = 7; y >= 0; y--) { M[0x7D37 + y] = M[0x35A8 + y]; M[0x7D76 + y] = M[0xA420 + y]; }
      }
    }
    M[0x43] = 0;
    x = M[0x68];
    let a = (M[0xA892 + x] << 1) & 255, c = 0;
    for (let i = 0; i < 4; i++) {
      c = a >> 7; a = (a << 1) & 255;
      const h = M[0x43]; M[0x43] = ((h << 1) | c) & 255; c = h >> 7;
    }
    let s = adc(a, 0xE0, c); M[0x42] = s.a;
    s = adc(M[0x43], 0x9A, s.c); M[0x43] = s.a;
    for (let y = 0x1F; y >= 0; y--) {
      a = peek(zp(0x42) + y);
      M[0x4230 + y] = a;
      M[0x40] = y;
      M[0x41] = 0;
      for (x = 4; x > 0; x--) {
        M[0x41] = (M[0x41] << 2) & 255;
        let yy = 3;
        if (a & 0x80) yy = 0;
        a = (a << 1) & 255;
        if (a & 0x80) yy = 0;
        a = (a << 1) & 255;
        M[0x41] |= yy;
      }
      M[0x40A8 + y] = M[0x41];
    }
    return regs(r, { a: M[0x41], x: 0, y: 0xFF }, { n: 1, z: 0 });
  };

  // --- the heart ($34A0) -------------------------------------------------------------------
  // $34A0: enemies in ordinary states frozen (state $16), live players invincible ($18), tune $19.
  P.effect_freeze = function* (r) {
    for (let x = 5; x >= 0; x--) {
      let s = M[0xB4 + x];
      if (s === 0 || s >= 0x0B) continue;
      if (s === 0x0A) s = M[0x87A2 + x];
      M[0x87A2 + x] = s;
      M[0xB4 + x] = 0x16;
      M[0x863A + x] = 0;
      M[0x85C2 + x] = 0xFF;
    }
    M[0xA813] = M[0x8728]; M[0xA814] = M[0x8729];
    for (let x = 1; x >= 0; x--) {
      const s = M[0xB2 + x];
      if (s === 0 || s === 0x0E || s === 0x0F) continue;
      M[0xB2 + x] = 0x18;
      M[0x8728 + x] = 0;
    }
    M[0x5A7F] = 0x18;
    M[0x5ABF] = 0x16;
    return yield* P.play_tune(regs(r, { a: 0x16, x: 0xFF, y: 0x19 }));
  };

  // --- the secret room ($3621) -------------------------------------------------------------
  // $3621: the door: round 77's currents, the room's own glyphs and layout, its message, the boss
  // in blue at the top, item $22's picture in both corners, 36 blocks and a count of 37.
  P.effect_secret_room = function* (r) {
    r = yield* P.bonus_scene_begin(r);
    r = P.clear_screens(r);
    r = P.save_screen(r);
    const lv = M[0x10];
    M[0x10] = 0x4C;
    r = P.build_air_currents(regs(r, { a: 0x4C }));
    M[0x10] = lv;
    let x = 0;
    do { M[0x4300 + x] = M[0xA660 + x]; x = (x - 1) & 255; } while (x !== 0);
    for (x = 7; x >= 0; x--) { M[0x43B8 + x] = 0x55; M[0x43B0 + x] = 0x40; M[0x43C0 + x] = 0x95; }
    M[0x1D] = 6; M[0x1F] = 0x0E;
    for (x = 0x31; x >= 0; x--) { M[0x8C00 + x] = 0; M[0x4050 + x] = 0; M[0x40A8 + x] = M[0xA660 + x]; }
    for (x = 0x0C; x >= 0; x--) M[0x8C00 + M[0xF192 + x]] = M[0xF19F + x];
    M[0x40] = 0; M[0x41] = 0x8C;
    r = P.unpack_layout_here(regs(r, { a: 0x8C, x: 0 }));
    r = P.draw_layout(r);
    inc(0x10);
    r = yield* P.scroll_in_round(r);
    r = yield* P.start_round(r);
    r = P.print_string(regs(r, { x: 0xE1, y: 0x7E }));
    for (x = 0x1B; x > 0; x--) { M[0x52AA + x] = 0x77; M[0x52D2 + x] = 0x77; M[0x52FA + x] = 0x77; M[0x5322 + x] = 0x77; M[0x534A + x] = 0x77; }
    M[0x52AA] = 0x78; M[0x52D2] = 0x78; M[0x52FA] = 0x78; M[0x5322] = 0x78; M[0x534A] = 0x78;
    r = P.clear_enemies(regs(r, { a: 0x78, x: 0 }));
    r = yield* P.play_tune(regs(r, { y: 0x4A }));
    r = yield* P.wait_frames(regs(r, { a: 0x14 }));
    r = P.fill_colour(regs(r, { a: 9 }));
    r = P.draw_panel(r);
    for (x = 1; x >= 0; x--) {
      let y = 0, a = M[0xB2 + x];
      if (a !== 0) { M[0xB2 + x] = 1; a = M[0xA735 + x]; y = 0x9D; }
      M[0xBA + x] = a;
      M[0xC2 + x] = y;
    }
    r = P.actors_to_sprites(regs(r, { x: 0xFF }));
    r = yield* P.init_round_state(r);             // a generator: it may start a tune
    r = P.actors_to_sprites(r);
    M[0x20] = 0;
    M[0xBC] = 0x74; M[0xBD] = 0x35; M[0xC0] = 6; M[0xBE] = 0;
    M[0x5AFF] = 0xFF; M[0x2B] = 0xFF;
    r = P.set_points_item(regs(r, { a: 0x29, x: 0xFF }));
    r = P.set_special_item(regs(r, { a: 0x22 }));
    M[0x40] = 0x46; M[0x41] = 0x24;
    r = P.repair_back_buffer(regs(r, { a: 0x50 }));
    r = P.draw_block(regs(r, { x: 2, y: 2 }));
    r = P.draw_block(regs(r, { x: 0x1C, y: 2 }));
    r = P.save_screen(r);
    M[0x40] = 0x42;
    dec(0x41);
    M[0x02] = 0x11;
    do {
      x = M[0x02];
      let y = M[0xA722 + x];
      M[0x03] = y;
      r = P.add_bonus_block(regs(r, { a: M[0xA710 + x], x, y }));
      y = M[0x03];
      r = P.add_bonus_block(regs(r, { a: (0x1E - M[0x38]) & 255, y }));
    } while (!(dec(0x02) & 0x80));
    dec(0x37);
    M[0x597F] = 0x25;
    return yield* P.bonus_collect(regs(r, { a: 0x25, x: 2, y: 0x12 }));
  };

  // --- the cracker's boss stub ($3FDA) -----------------------------------------------------
  // $3FDA: the $BD it is entered with into blown_switch's opcode; both bubble speeds 4.
  P.trainer_boss_hook = function (r) {
    M[0x0F73] = r.a & 255;
    M[0xA781] = 4; M[0xA782] = 4;
    return regs(r, { a: 4 }, nz(4));
  };

  // --- $7AC0-$7C3C: the boss mirror, the panel, the draw handlers, scoring ---------------------
  // $7AC0: the four bit pairs of A reversed.
  P.mirror_mc_byte = function (r) {
    const y = r.a & 255;
    const a = ((y & 0xC0) >> 6) | ((y & 0x30) >> 2) | ((y & 0x0C) << 2) | ((y & 0x03) << 6);
    M[0x40] = a & 0x3F;                              // the three parts it gathered there, without the last pair
    return regs(r, { a, y }, { c: 0, ...nz(a) });
  };
  // $7AE3: the nine mirrored boss sprites at $7C40-$7E7F from the nine at $7640-$787F (reached
  // by JMP from init_round_state on round 100).
  P.build_boss_mirror = function (r) {
    M[0x3C] = 8;
    let y = 0;
    do {
      const x = M[0x3C];
      M[0x02] = M[0x7B2F + x]; M[0x03] = M[0x7B38 + x];
      M[0x04] = M[0x7B41 + x]; M[0x05] = M[0x7B4A + x];
      y = 0x3E;
      for (let n = 0x15; n > 0; n--) {
        M[0x41] = y;
        r = P.mirror_mc_byte(regs(r, { a: peek(zp(0x02) + y) }));
        dec(0x41);
        y = (M[0x41] - 1) & 255;
        poke(zp(0x04) + y, r.a);
        y = (y + 1) & 255;
        r = P.mirror_mc_byte(regs(r, { a: peek(zp(0x02) + y) }));
        y = M[0x41];
        poke(zp(0x04) + y, r.a);
        y = (y - 1) & 255;
        r = P.mirror_mc_byte(regs(r, { a: peek(zp(0x02) + y) }));
        y = (M[0x41] + 1) & 255;
        poke(zp(0x04) + y, r.a);
        y = (y - 3) & 255;
      }
    } while (!(dec(0x3C) & 0x80));
    return regs(r, { x: 0, y }, { n: 1, z: 0 });
  };
  // $7B53: the panel's text, the scores and lives, GAME OVER for a player who is out, the credits.
  P.draw_panel = function (r) {
    r = P.print_string(regs(r, { x: 0x93, y: 0xAB }));
    r = P.print_scores(r);
    const l0 = M[0x045A], l1 = M[0x045B];
    if (l0 & 0x80) M[0x045A] = 0;
    if (l1 & 0x80) M[0x045B] = 0;
    r = P.draw_lives(regs(r, { a: l1, x: 0 }));
    for (let x = 1; x >= 0; x--) {
      const a = x === 1 ? l1 : l0;
      M[0x045A + x] = a;
      if (a & 0x80) r = P.print_game_over(regs(r, { a, x }));
    }
    let x = (M[0xAB] + 1) & 255;
    if (x & 0x80) x = 0;
    const a = x | 0x20;
    M[0x7BA4] = a;
    return P.print_string(regs(r, { a, x: 0x96, y: 0x7B }));
  };
  // $7BA6: the five fire runs free, the water stream off.
  P.clear_fire_and_water = function (r) {
    for (let x = 5; x > 0; x--) M[0xA76F + x] = 0xFF;
    M[0x4D] = 0;
    return regs(r, { a: 0xFF, x: 0 }, { z: 1, n: 0 });
  };
  // $7BD4: draw handler for type $16: type 0, drawn small.
  P.draw_blown_first = function (r) { M[0xCA + r.x] = 0; return P.draw_bubble(regs(r, { a: 0 })); };
  // $7BDB: draw handler for type $36: the slot freed.
  P.draw_free = function (r) {
    M[0xCA + r.x] = 0xFF; M[0xDC + r.x] = 0; M[0xEE + r.x] = 0;
    return P.draw_none(regs(r, { a: 0 }));
  };
  // $7BE8: GAME OVER in player X's rows of the panel.
  P.print_game_over = function (r) {
    const x = r.x & 255;
    M[0x40] = x;
    let y = M[0xA739 + x];
    M[0xA73D] = y;
    y = (y + 1) & 255;
    M[0xA745] = y;
    r = P.print_string(regs(r, { x: 0x3B, y: 0xA7 }));
    return regs(r, { x: M[0x40] }, nz(M[0x40]));
  };
  // $7BFE: $40/$41 = the collision map cell of object X; A its sub-row. No CLC: the carry the
  // ASL of the row left (its bit 7) goes into the sum.
  P.object_map_pointer = function (r) {
    const x = r.x & 255;
    const row = M[0xEE + x];
    const y = (row << 1) & 255;
    let s = adc(M[0xAC01 + y], M[0xDC + x], row >> 7);
    M[0x40] = s.a;
    s = adc(M[0xAC02 + y], 0x85, s.c);
    M[0x41] = s.a;
    const a = M[0xA9D6 + x];
    return regs(r, { a, y }, { c: s.c, ...nz(a) });
  };
  // $7C14: the enemy's fireball: its phase toggled, then shot_step's body from $1288 with the
  // ending type $38: a wall ends it, else it moves a column and kills a player it touches. Ends
  // at $12A8, the RTS bottle_shot patches in or the JMP to the object loop's tail; the port
  // returns either way.
  P.enemy_fireball = function (r) {
    const x = r.x & 255;
    M[0xA9C4 + x] ^= 1;
    M[0x12AC] = 0x38;
    r = P.object_map_pointer(regs(r, { a: 0x38, x }));
    let y = M[0x0193 + x], a;
    let right = !(y & 0x80);
    if (!right) {
      y = 0x4F;
      a = peek(zp(0x40) + y);
      if (a & 0x80) return shot_ends(r, x, y);
      a = dec((0xDC + x) & 255);
      if (!(a & 0x80)) return P.touch_kills(regs(r, { a, x, y }));
      right = true;
    }
    y = 0x52;
    a = peek(zp(0x40) + y);
    if (a & 0x80) return shot_ends(r, x, y);
    a = inc((0xDC + x) & 255);
    return P.touch_kills(regs(r, { a, x, y }));
  };
  function shot_ends(r, x, y) {
    const a = M[0x12AC];
    M[0xCA + x] = a; M[0xAA42 + x] = a;
    return regs(r, { a, x, y }, nz(a));
  }
  // $7C21: ten points to player X.
  P.score_ten = function (r) { return P.add_score(regs(r, { a: 1, y: M[0xAB51 + (r.x & 255)] })); };
  // $7C26: packed-decimal A onto the score byte at $0400 + Y, carrying upwards.
  P.add_score = function (r) {
    let a = r.a & 255, y = r.y & 255;
    for (;;) {
      const s = adcDec(a, M[0x0400 + y], 0);
      M[0x0400 + y] = s.a;
      if (!s.c) return regs(r, { a: s.a, y }, { c: 0, z: s.z, n: s.n, v: s.v });
      a = 1;
      y = (y - 1) & 255;
      if (y & 0x80) return regs(r, { a, y }, { c: 1, z: 0, n: 1 });
    }
  };
  // $7C37: the door of round 50: to round 70.
  P.effect_skip_to_70 = function* (r) { return yield* P.skip_rounds(regs(r, { a: 0x45 })); };
  // $7C3C: round 100's potion: the weapon charge counted down.
  P.effect_potion = function (r) { const v = dec(0x37C7 + (r.x & 255)); return regs(r, {}, nz(v)); };

  // --- $7F53-$7FF6: reset_powers, the round-100 set-up, the umbrellas and the round skip ------
  // $7F53: player X's ordinary bubble and no bonuses; on round 100 the boss set-up.
  P.reset_powers = function (r) {
    const x = r.x & 255;
    M[0xA77D + x] = 0x88; M[0xA77B + x] = 8; M[0xA77F + x] = 4; M[0xA781 + x] = 4; M[0xA783 + x] = 0xFF;
    M[(0x61 + x) & 255] = 0; M[(0x63 + x) & 255] = 0; M[(0x65 + x) & 255] = 0;
    M[0x86D8 + x] = 0; M[0x8728 + x] = 0; M[0xA813 + x] = 0; M[0x37C7 + x] = 0;
    const lv = M[0x10];
    if (lv !== 0x63) return regs(r, { a: lv, x }, cmp(lv, 0x63));
    return P.boss_round_setup(regs(r, { a: lv, x }, cmp(lv, 0x63)));
  };
  // $7F86: round 100's items and delays, reload 8, eight enemies left, every bubble marked with
  // its owner, then the cracker's stub.
  P.boss_round_setup = function (r) {
    M[0x53] = 0x22; M[0x5E] = 0x22;
    M[0x52] = 0x51; M[0x5D] = 0x51;
    M[0xA77B] = 8; M[0xA77C] = 8; M[0x4A] = 8;
    M[0x23DE] = 0xBD;
    return P.trainer_boss_hook(regs(r, { a: 0xBD }));
  };
  // $7FA4, $7FA7: the umbrellas: 3 or 7 rounds on, never past round 100.
  function* skip_by(r, n) {
    let a = (n + M[0x10]) & 255;
    if (a >= 0x63) a = 0x63;
    return yield* P.skip_rounds(regs(r, { a }));
  }
  P.effect_skip_3 = function* (r) { return yield* skip_by(r, 3); };
  P.effect_skip_7 = function* (r) { return yield* skip_by(r, 7); };
  // $7FB2: to round A: four bytes pulled (the effect's and check_items's returns), the border
  // flashed, every object ended, the rounds between built and scrolled, then JMP $09A5 with the
  // carry clear.
  P.skip_rounds = function* (r) {
    M[0x587F] = r.a & 255;
    inc(0x37);
    for (let x = 6; x > 0; x--) {
      const a = vicRead(0x20) ^ 2;
      vicWrite(0x20, a); vicWrite(0x21, a);
      r = yield* P.wait_10(regs(r, { a, x }));
    }
    r = yield* P.end_all_objects(regs(r, { x: 0 }));
    r = yield* P.intro_step_armed(r);
    for (;;) {
      const lv = inc(0x10);
      if (lv === M[0x587F]) throw new Goto(0x09A5, regs(r, { a: lv }, { c: 0, z: 1, n: 0 }));
      r = yield* P.build_round(regs(r, { a: lv }, cmp(lv, M[0x587F])));
      r = yield* P.scroll_in_round(r);
      r = yield* P.start_round(r);
      M[0x20] = 0;
    }
  };
  // $7FF1: the shoe: player X's fast flag $FE.
  P.effect_shoes = function (r) { M[0x8728 + (r.x & 255)] = 0xFE; return regs(r, { a: 0xFE }, nz(0xFE)); };

  // --- $A428-$A47D: every bonus scene's start -----------------------------------------------
  // $A428: actors stopped, objects ended, playfield restored, enemies cleared, delays and the
  // timer $FF, points_item 0, the block lists and the points glyphs cleared, the small digits
  // into characters $60-$73, the three pointers at the second row; then flip_if_front.
  P.bonus_scene_begin = function* (r) {
    inc(0x37);
    r = yield* P.wait_frame(r);
    r = yield* P.end_all_objects(r);
    r = P.restore_playfield(r);
    r = P.clear_enemies(r);
    const a = 0;                                     // what clear_enemies leaves in A (its LDA #$00)
    M[0x5E] = 0xFF; M[0x5D] = 0xFF; M[0x2A] = 0xFF;
    M[0x52] = 0;
    let x = 0;
    do { M[0x4600 + x] = a; M[0x4700 + x] = a; x = (x - 1) & 255; } while (x !== 0);
    for (x = 0x1F; x >= 0; x--) M[0x4210 + x] = a;
    for (x = 0xA0; x > 0; x--) M[0x4300 + x] = M[0xFE8F + x];
    M[0x4D] = 0; M[0x4300] = 0;
    M[0x02] = 0x2A; M[0x04] = 0x2A; M[0x06] = 0x2A;
    M[0x03] = 0x85; M[0x05] = 0x50; M[0x07] = 0xD8;
    return P.flip_if_front(regs(r, { a: 0xD8, x: 0 }));
  };
  // $A474: flip unless the back buffer is already $5400.
  P.flip_if_front = function (r) {
    const a = M[0x30];
    if (a === 0x54) return regs(r, { a }, cmp(a, 0x54));
    return P.flip_no_wait(regs(r, { a }, cmp(a, 0x54)));
  };

  // --- $A64D, $A653: the two crosses (bytes in the listing) ----------------------------------
  // $A64D: LDA #$13 / STA $A783,X / RTS: nineteen fireballs.
  P.effect_fire_breath = function (r) { M[0xA783 + (r.x & 255)] = 0x13; return regs(r, { a: 0x13 }, nz(0x13)); };
  // $A653: JSR random / AND #3 / CLC / ADC #2 / STA $58FF / RTS: 2-5 flashes and falling blocks.
  P.effect_sky_flash = function (r) {
    r = P.random(r);
    const s = adc(r.a & 3, 2, 0);
    M[0x58FF] = s.a;
    return regs(r, { a: s.a }, { c: s.c, z: s.z, n: s.n, v: s.v });
  };

  // --- $F1AC: extra lives and the pending sound effect ---------------------------------------
  // $F1AC: each player's score against the next entry of extra_life_scores (a life, the next step,
  // sound 3); then, unless a tune $19-$26 or $28 up is playing, start the pending effect.
  P.check_extra_life = function (r) {
    let a = r.a, x, y = r.y;
    for (x = 1; x >= 0; x--) {
      y = (M[0xAE + x] - 1) & 255;
      let award = false;
      if (!(y & 0x80) && y !== 2) {
        a = M[0x0400 + y];
        if (a !== 0) award = true;
      }
      if (!award) {
        y = (y + 1) & 255;
        a = M[0x0400 + y];
        y = M[0xAC + x];
        award = a >= M[0x05B9 + y];
      }
      if (!award) continue;
      inc(0xAC + x);
      inc(0x045A + x);
      M[0xB0] = 3;
      a = M[0xAC + x];
      if (a === 1) dec(0xAE + x);
    }
    a = M[0xB0];
    if (a === 3) { r = P.draw_lives(regs(r, { a, x: 0xFF, y })); y = r.y; }
    a = M[0x5C3F];
    if (!(a < 0x19 || a === 0x27)) return regs(r, { a, x: 0xFF, y }, cmp(a, 0x27));
    const c = a < 0x19 ? 0 : 1;
    a = M[0xB1];
    if (a !== 0) { x = 0; M[0xB1] = 0; }
    else {
      x = M[0xB0];
      if (x === 0) return regs(r, { a, x, y }, { c, z: 1, n: 0 });
      M[0xB0] = 0;
    }
    a = M[0xF20B + x]; y = M[0xF211 + x];
    return P.start_sfx(regs(r, { a, x, y }, { c, ...nz(y) }));
  };
  // $F887: the sound effect whose 30-byte record is at A/Y onto voice 1: the voice silenced, its
  // pulse, control and envelope, the starting note, the gate and release times and the 24
  // modulation bytes loaded, then the modulations restarted. The LDA $F332,Y at $F8E9 runs with
  // Y = $FF (the loop before it ends there), so it reads $F431, not live_pulse_start_hi.
  P.start_sfx = function (r) {
    const sid = (reg, v) => io().sidWrite(reg, v);
    M[0x9E] = r.a & 255; M[0x9F] = r.y & 255;
    M[0xF305] = 0;
    for (let x = 6; x >= 0; x--) { sid(x, 8); sid(x, 0); }
    const p = zp(0x9E);
    let y = 0x1A;
    for (let x = 4; x >= 0; x--) { sid(2 + x, peek(p + y)); y--; }
    const x = peek(p + 0x1D);
    let a = M[0xF3B9 + x]; sid(0, a); M[0xF333] = a;
    a = M[0xF418 + x]; sid(1, a); M[0xF334] = a;
    M[0xF337] = peek(p + 0x1C);
    M[0xF336] = peek(p + 0x1B);
    a = peek(p + 0x18); M[0xF335] = a;
    for (y = 0x17; y >= 0; y--) { a = peek(p + y); M[0xF31B + y] = a; }
    y = 0xFF;
    a = M[0xF32C];
    if (a !== 0) {
      M[0x92] = M[0xF331];
      a = M[0xF332 + y]; M[0x95] = a;
      a = M[0xF329]; M[0xF33C] = a;
      a = M[0xF32A]; M[0xF33D] = a;
    }
    a = M[0xF328];
    if (a !== 0) {
      M[0x98] = M[0xF333]; M[0x9B] = M[0xF334];
      M[0xF33B] = M[0xF326]; M[0xF33A] = M[0xF325]; M[0xF339] = M[0xF324];
      a = M[0xF323]; M[0xF338] = a;
    }
    return regs(r, { a, x, y }, nz(a));
  };
};
})(typeof window !== 'undefined' ? window : globalThis);

/* port/src/objects.js */
// The objects: bubbles, shots, fires and the boss's hits. push_bubbles ($0AAB), spawn_special_bubble
// ($0BED), move_bubbles ($0CF2) with its inner handlers (food_fall $0EC5, blown_bubble $0F48,
// fireball $10D3), blown_step ($0F61), catch_enemy ($105B), thunder_shot ($10D6), flip_subcol
// ($112B), boss_hit_test ($1134), fire_drop ($11B7), boulder_shot ($1274), shot_step ($1286),
// bottle_shot ($12B4), bolt_fall ($12F9), run_fires ($1319), age_objects ($13BE), burst_one_plain
// ($145F) and, on the interrupt side, step_water ($1B40).
//
// Control flow the port keeps: the special handlers (fire_drop, thunder_shot, boulder_shot,
// shot_step, bottle_shot, bolt_fall, and enemy_fireball and baron_move of other groups) do not
// return to move_bubbles; they JMP to its loop tail, move_bubbles_next ($0D4A), and run the rest
// of the object loop themselves before the RTS at $0D4D. So here each handler ends by calling
// next(r, x), which carries on the loop from object x-1 and returns the loop's registers, and
// move_bubbles returns whatever a handler returns. A stand-in for enemy_fireball or baron_move
// does the same in the game's own code, which is why a handler's test compares the whole rest
// of the pass's object loop and not only the handler.
//
// Patched operands read from M: spawn_countdown $0BEE, spawn_kind_switch $0C9C (JMP or BIT),
// special_mask $0CC2, drift_threshold $0DC7, special_target $0D66/$0D67 (written here, as the
// game does), blown_switch $0F73 (JMP or LDA abs,X), fire_slot $125C, shot_end_type $12AC,
// b_12A8 $12A8 (JMP or RTS, bottle_shot writes it), boss_frame_saved $119F, and the dispatch
// table special_object_table $0D68.
//
// Nothing in this group reads the interrupt's bytes ($08, $A4, $2A, $2B, $5D, $5E, $A9B1);
// run_fires reads pass_count ($597F), which the pass loop itself keeps.
(function (root) {
'use strict';
const G = root.BBGroups = root.BBGroups || {};
const { nz, regs, adc, sbc, cmp } = root.BBUtil;

// The objects' arrays (eighteen slots).
const TYPE = 0xCA, COL = 0xDC, ROW = 0xEE, TRAVEL = 0xA9B2, SUBCOL = 0xA9C4, SUBROW = 0xA9D6, COLOUR = 0xA9E8,
  LIFE = 0xA9FA, OX = 0xAA0C, OY = 0xAA1E, CARGO = 0xAA30, WAS = 0xAA42, OWNER = 0x0193;
// The actors.
const STATE = 0xB2, AX = 0xBA, AY = 0xC2;
// The row tables.
const ROW_LO = 0xAD1E, ROW_HI = 0xAD3D, ROW40 = 0xAC01, ROW40_HI = 0xAC02;
// The special-object handlers by address, as the table at $0D68 names them.
const SPECIAL = { 0x11B7: 'fire_drop', 0x10D6: 'thunder_shot', 0x7C14: 'enemy_fireball', 0x1274: 'boulder_shot',
  0x12B4: 'bottle_shot', 0x1473: 'baron_move', 0x12F9: 'bolt_fall' };

// |a - b| as the game computes it: SEC / SBC / BCS / EOR #$FF / ADC #$01, both in 0-255.
const absd = (a, b) => (a >= b ? a - b : b - a) & 255;
// ASL A three times: the value and the last shift's carry.
const asl3 = v => ({ a: (v << 3) & 255, c: (v >> 5) & 1 });

G.objects = function (P) {
  const M = P.M;
  const io = () => P.io;
  const isIO = a => a >= 0xD000 && a < 0xE000;
  const peek = a => { a &= 0xFFFF; return isIO(a) ? io().read(a) : M[a]; };
  const poke = (a, v) => { a &= 0xFFFF; if (isIO(a)) io().write(a, v); else M[a] = v & 255; };
  const ptr = () => M[0x40] | (M[0x41] << 8);
  const dec = a => { M[a] = (M[a] - 1) & 255; return M[a]; };
  const inc = a => { M[a] = (M[a] + 1) & 255; return M[a]; };

  // --- push_bubbles ($0AAB) ------------------------------------------------------------------
  // A player in state 1 with an animation frame below 8 pushes the bubbles in front of them.
  // Frames 4-7 push to the left (the loop at $0AC4), frames 0-3 to the right ($0B56). Kept as the
  // game has it: on the left side a bubble whose row is below 4 or above $1C leaves Y holding
  // the row rather than the player index for the rest of the loop ($0B0C-$0B12 branch to $0AEB
  // without the LDY $3C).
  P.push_bubbles = function (r) {
    let a = r.a, x = r.x, y = 1;
    for (;;) {                                     // b_0AAD
      a = M[STATE + y];
      if (a === 1) {
        a = M[0x8520 + y];
        if (a < 8) {
          x = 0x11;
          if (a >= 4) {
            // b_0AC4: push to the left
            for (; x >= 0; x--) {
              a = M[TRAVEL + x]; if (a !== 0) continue;
              a = M[TYPE + x]; if (a >= 0x24) continue;
              a = (M[AX + y] - M[OX + x]) & 255; if (a >= 0x14) continue;
              a = absd(M[AY + y], M[OY + x]); if (a >= 0x0E) continue;
              // b_0AF2 (carry clear)
              let s = sbc(M[OX + x], 3, 0); M[OX + x] = s.a;
              s = sbc(M[SUBCOL + x], 2, s.c); a = s.a;
              if (!s.c) { a &= 3; dec(COL + x); }
              M[SUBCOL + x] = a;
              M[0x3C] = y;
              y = M[ROW + x];
              if (y < 4 || y >= 0x1D) continue;    // Y stays the row
              s = adc(M[ROW_LO + y], M[COL + x], 0); M[0x40] = s.a;
              M[0x41] = adc(M[ROW_HI + y] & 3, 0x85, s.c).a;
              a = M[SUBROW + x];
              let hit = false;
              if (a !== 0) { y = 0; a = peek(ptr()); hit = (a & 0x80) !== 0; }
              if (!hit) {
                y = 0x28; a = peek(ptr() + 0x28);
                if (a & 0x80) hit = true;
                else { y = 0x50; a = peek(ptr() + 0x50); hit = (a & 0x80) !== 0; }
              }
              if (hit) {                           // b_0B3B
                inc(COL + x); a = 0; M[SUBCOL + x] = 0;
                s = sbc(M[OX + x], 0x14, 1); s = adc(s.a, 7, s.c); s = adc(s.a & 0xF8, 0x14, s.c);
                a = s.a; M[OX + x] = a;
              }
              y = M[0x3C];                         // b_0B51
            }
          } else {
            // j_0B56: push to the right
            for (; x >= 0; x--) {
              a = M[TRAVEL + x]; if (a !== 0) continue;
              a = M[TYPE + x]; if (a >= 0x24) continue;
              a = (M[OX + x] - M[AX + y]) & 255; if (a >= 0x12) continue;
              a = absd(M[AY + y], M[OY + x]); if (a >= 0x0E) continue;
              // b_0B83 (carry clear)
              let s = adc(M[OX + x], 4, 0); M[OX + x] = s.a;
              s = adc(M[SUBCOL + x], 2, s.c); a = s.a & 3;
              if (a < M[SUBCOL + x]) inc(COL + x);
              M[SUBCOL + x] = a;
              M[0x3C] = y;
              y = M[ROW + x];
              if (y < 4) y = 4;
              if (y >= 0x1D) y = 0x1C;
              s = adc(M[ROW_LO + y], M[COL + x], 0); M[0x40] = s.a;
              M[0x41] = adc(M[ROW_HI + y] & 3, 0x85, s.c).a;
              a = M[SUBROW + x];
              let hit = false;
              if (a !== 0) { y = 1; a = peek(ptr() + 1); hit = (a & 0x80) !== 0; }
              if (!hit) {
                y = 0x29; a = peek(ptr() + 0x29);
                if (a & 0x80) hit = true;
                else { y = 0x51; a = peek(ptr() + 0x51); hit = (a & 0x80) !== 0; }
              }
              if (hit) {                           // b_0BD4
                dec(COL + x); a = 0; M[SUBCOL + x] = 0;
                s = sbc(M[OX + x], 0x1C, 1); s = adc(s.a & 0xF8, 0x13, s.c);
                a = s.a; M[OX + x] = a;
              }
              y = M[0x3C];                         // b_0BE8
            }
          }
        }
      }
      y = (y - 1) & 255;                           // b_0AEE
      if (y & 0x80) break;
    }
    return regs(r, { a, x: x & 255, y }, nz(y));
  };

  // --- spawn_special_bubble ($0BED) -----------------------------------------------------------
  // Every 23rd pass, with enemies left and at random, a bubble from one of the four vents whose
  // air current points into the playfield; its kind from special_bubble_kind ($0CC1) through the
  // JMP at $0C9C, or an EXTEND letter while that JMP is a BIT.
  P.spawn_special_bubble = function (r) {
    let a = M[0x0BEE], x = r.x, y = r.y;
    if (a !== 0) { const v = dec(0x0BEE); return regs(r, { a }, nz(v)); }
    M[0x0BEE] = 0x16; a = 0x16;
    a = M[0x4A];
    if (a === 0) return regs(r, { a }, nz(a));
    r = P.random(r); a = r.a;
    if (a < 0x28) return regs(r, { a }, cmp(a, 0x28));
    x = 0x0B; y = 0;
    r = P.random(regs(r, { x, y })); a = r.a & 3;
    const cv = a === 0 ? r.c : 1;                  // the carry a vent's early RTS leaves: random's, or the CMP #$01's
    if (a === 0) {
      a = M[0x850A]; if (a & 0x80) return regs(r, { a, x, y }, { c: cv, ...nz(a) });
      a &= 3; if (a !== 2) return regs(r, { a, x, y }, cmp(a, 2));
    } else if (a === 1) {
      a = M[0x8514]; if (a & 0x80) return regs(r, { a, x, y }, { c: cv, ...nz(a) });
      a &= 3; if (a !== 2) return regs(r, { a, x, y }, cmp(a, 2));
      x = 0x14;
    } else if (a === 2) {
      a = M[0x88CA]; if (a & 0x80) return regs(r, { a, x, y }, { c: cv, ...nz(a) });
      a &= 3; if (a !== 0) return regs(r, { a, x, y }, { c: cv, ...nz(a) });
      y = 0x1C;
    } else {
      a = M[0x88D4]; if (a & 0x80) return regs(r, { a, x, y }, { c: cv, ...nz(a) });
      a &= 3; if (a !== 0) return regs(r, { a, x, y }, { c: cv, ...nz(a) });
      x = 0x14; y = 0x1C;
    }
    // b_0C4E
    M[0x40] = x; M[0x41] = y;
    x = 0;
    for (y = 0x11; y >= 0; y--) { a = M[TYPE + y]; if (a >= 6 && a < 0x0C) x++; }
    y = 0xFF;
    if (x >= 0x0A) return regs(r, { a, x, y }, cmp(x, 0x0A));
    for (y = 0x11; y >= 0; y--) { a = M[TYPE + y]; if (a & 0x80) break; }
    if (y < 0) return regs(r, { a, x, y: 0xFF }, { c: 0, ...nz(0xFF) });   // the CPX #$0A's carry
    // b_0C74: a free slot
    a = 0; M[TRAVEL + y] = 0; M[SUBCOL + y] = 0; M[SUBROW + y] = 0;
    a = M[0x40]; M[COL + y] = a;
    let s = asl3(a); s = adc(s.a, 0x14, s.c); M[OX + y] = s.a;
    a = M[0x41]; M[ROW + y] = a;
    s = asl3(a); s = adc(s.a, 0x15, s.c); M[OY + y] = s.a;
    r = P.random(regs(r, { a: s.a, x, y }));
    a = r.a;
    let c;                                         // the carry at the RTS: the last LSR's bit, or the ADC #$0C's
    if (M[0x0C9C] === 0x4C) {
      // special_bubble_kind ($0CC1): AND with the round's mask
      a &= M[0x0CC2]; M[0x40] = a;
      M[LIFE + y] = 0x82;
      a = 4; x = 0x0D;
      c = M[0x40] & 1; M[0x40] >>= 1;
      if (c) { a = 6; x = 0x0B; }
      else {
        c = M[0x40] & 1; M[0x40] >>= 1;
        if (c) { a = 8; x = 0x0A; }
        else {
          c = M[0x40] & 1; M[0x40] >>= 1;
          if (c) { a = 0x0A; x = 0x0D; }
        }
      }
    } else {
      // the BIT at $0C9C: the letter code at $0C9F
      const v = dec(0x4C);
      if (v & 0x80) M[0x0C9C] = 0x4C;
      r = P.random(regs(r, { x, y }));
      a = (r.a + M[0x5BFF]) & 7;
      if (a >= 5) a &= 3;
      M[0x5BFF] = a;
      a = ((a << 1) + 0x0C) & 255; c = 0;
      x = 0x0D;
    }
    // b_0CEA
    M[TYPE + y] = a;
    a = x; M[COLOUR + y] = a;
    return regs(r, { a, x, y }, { c, ...nz(a) });
  };

  // --- move_bubbles ($0CF2) --------------------------------------------------------------------
  // The object loop, from object x down to 0; a handler of a type $24-$32, $44 or $4C ends by
  // calling it again from the next object (the game's JMP move_bubbles_next).
  function next(r, x) { return loop(r, (x - 1) & 255); }
  function loop(r, x) {
    let a = r.a, y = r.y;
    for (; x < 0x80; x = (x - 1) & 255) {       // b_0CF4 ... dex / bpl
      a = M[TYPE + x];
      if (a >= 0x24) {
        // b_0D4E
        if (a >= 0x34) {
          if (a === 0x44) return fireball(regs(r, { a, x, y }), x);
          if (a === 0x4C) return food_fall(regs(r, { a, x, y }), x);
          continue;
        }
        y = (a - 0x24) & 255;                      // SBC #$23 with the carry clear
        a = M[0x67];
        if (a !== 0) continue;
        const lo = M[0x0D68 + y], hi = M[0x0D69 + y];
        M[0x0D66] = lo; M[0x0D67] = hi;
        const target = lo | (hi << 8), name = SPECIAL[target];
        if (!name) throw new Error('move_bubbles: special handler at $' + target.toString(16) + ' is not known');
        return P[name](regs(r, { a: hi, x, y }));
      }
      a = M[TRAVEL + x];
      if (a !== 0) {
        // blown_bubble ($0F48)
        r = P.blown_step(regs(r, { a, x, y })); y = r.y;
        a = M[TYPE + x];
        if (a < 0x0C) {
          a = M[WAS + x];
          if (a & 0x80) {
            a = M[TRAVEL + x];
            if (a !== 0) { r = P.blown_step(regs(r, { a, x, y })); y = r.y; a = r.a; }
          }
        }
        continue;
      }
      // b_0D02: a live player within 16 pixels bursts it
      let burst = false;
      for (y = 1; y >= 0; y--) {
        a = M[STATE + y];
        if (a === 0 || a === 0x0E || a === 0x0F) continue;
        a = absd((M[AX + y] + 2) & 255, M[OX + x]); if (a >= 0x10) continue;
        a = absd(M[AY + y], M[OY + x]); if (a >= 0x10) continue;
        a = y; M[OWNER + x] = a;
        a = M[TYPE + x]; M[WAS + x] = a;
        a = 0x34; M[TYPE + x] = a;
        burst = true; break;
      }
      if (burst) continue;
      y = 0xFF;
      // b_0D86: drift
      r = P.random(regs(r, { a, x, y })); a = r.a;
      let dir = null;
      if (a < 0xEA) {
        y = 0x11; M[0x3C] = x;
        for (; y >= 0; y--) {                      // b_0D91
          if (y === M[0x3C]) continue;
          a = M[TRAVEL + y]; if (a !== 0) continue;
          a = M[TYPE + y]; if (a >= 0x24) continue;
          a = absd(M[OX + x], M[OX + y]); if (a >= 0x10) continue;
          a = absd(M[OY + x], M[OY + y]); if (a >= 0x10) continue;
          r = P.random(regs(r, { a, x, y })); a = r.a;
          if (a < M[0x0DC7]) {
            a = M[ROW + x];
            if (a < 4) dir = 2;
            else if (a >= 0x1C) dir = 0;
            else { r = P.random(regs(r, { a, x, y })); dir = r.a & 2; }
          } else {
            a = M[COL + x];                        // b_0DE4
            if (a < 2) dir = 1;
            else if (a >= 0x1C) dir = 3;
            else { r = P.random(regs(r, { a, x, y })); dir = r.a | 1; }
          }
          break;
        }
      }
      if (dir === null) {
        // b_0E00: the air current under the bubble
        y = M[ROW + x];
        if (y < 4) y = 4;
        if (y >= 0x1D) y = 0x1C;
        const s = adc(M[ROW_LO + y], M[COL + x], 0); M[0x40] = s.a;
        M[0x41] = adc(M[ROW_HI + y] & 3, 0x85, s.c).a;
        y = 0x29; dir = peek(ptr() + 0x29);
      }
      // b_0E23
      a = dir & 3;
      if (a === 0) {
        dec(SUBROW + x); dec(SUBROW + x); dec(OY + x); dec(OY + x);
        a = M[SUBROW + x] & 7; M[SUBROW + x] = a;
        if (a !== 0) continue;
        if (!(dec(ROW + x) & 0x80)) continue;
        a = 0x1A; M[ROW + x] = a;
        a = M[TYPE + x];
        if (a >= 0x18) continue;
        a = 0x38; M[TYPE + x] = a;
        continue;
      }
      if (a === 1) {
        a = (M[OX + x] + 2) & 255; M[OX + x] = a;   // ADC #$01 with the carry the CMP #$01 set
        inc(SUBCOL + x); a = M[SUBCOL + x];
        if (a !== 4) continue;
        a = 0; M[SUBCOL + x] = 0;
        if (inc(COL + x) !== 0) continue;
        // the INC made the column 0: falls into b_0E71 with A = 0, which goes to b_0EAD
      } else if (a === 2) {
        inc(SUBROW + x); inc(SUBROW + x); inc(OY + x); inc(OY + x);
        a = M[SUBROW + x];
        if (a === 8) { a = 0; M[SUBROW + x] = 0; continue; }
        if (a !== 2) continue;
        inc(ROW + x); a = M[ROW + x];
        if (a !== 0x1D) continue;
        a = 0; M[ROW + x] = 0;
        a = M[TYPE + x];
        if (a >= 0x18) continue;
        a = 0x38; M[TYPE + x] = a;
        continue;
      }
      // b_0EAD: left
      a = (M[OX + x] - 2) & 255; M[OX + x] = a;
      if (!(dec(SUBCOL + x) & 0x80)) continue;
      a = 3; M[SUBCOL + x] = 3;
      dec(COL + x);
    }
    return regs(r, { a, x: 0xFF, y, c: undefined }, { n: 1, z: 0 });   // the carry is the last compare's: not kept
  }
  P.move_bubbles = r => loop(r, 0x11);

  // food_fall ($0EC5): object type $4C, falling food of a cleared food round.
  function food_fall(r, x) {
    let a = 0, y = M[SUBROW + x];
    if (y === 0) {
      a = M[ROW + x]; const c = a >> 7; a = (a << 1) & 255; y = a;
      let s = adc(M[ROW40 + y], M[COL + x], c); M[0x40] = s.a;
      M[0x41] = adc(M[ROW40_HI + y], 0x85, s.c).a;
      y = 0x78; a = peek(ptr() + 0x78);
      if (!(a & 0x80)) {
        y = 0x79; a = peek(ptr() + 0x79);
        if (!(a & 0x80)) {
          inc(ROW + x); a = 4; y = M[ROW + x];
          if (y === 0x1D) { a = 0x38; M[TYPE + x] = a; return next(regs(r, { a, x, y }), x); }   // j_0EF3
          M[SUBROW + x] = a;                       // b_0EFA
        }
      }
    } else M[SUBROW + x] = a;                      // b_0EFA with A = 0
    // b_0EFD
    let s = asl3(M[COL + x]); s = adc(s.a, 0x14, s.c); M[0x40] = s.a;
    s = asl3(M[ROW + x]); s = adc(s.a, 0x15, s.c); M[0x41] = s.a; a = s.a;
    for (y = 1; y >= 0; y--) {
      a = M[STATE + y]; if (a === 0) continue;
      a = absd(M[AX + y], M[0x40]); if (a >= 0x10) continue;
      a = absd(M[AY + y], M[0x41]); if (a >= 0x10) continue;
      a = M[0xAB51 + y]; y = a; a = 0x70;
      r = P.add_score(regs(r, { a, x, y }));
      x = r.x; y = r.y;
      a = 0x38; M[TYPE + x] = a;                   // j_0EF3
      return next(regs(r, { a, x, y }), x);
    }
    return next(regs(r, { a, x, y: 0xFF }), x);
  }

  // fireball ($10D3): object type $44, the player's fireball: a phase flip, then a thunder shot.
  function fireball(r, x) {
    r = P.flip_subcol(regs(r, { x }));
    return P.thunder_shot(r);
  }

  // --- blown_step ($0F61) ----------------------------------------------------------------------
  // One step of a bubble still travelling from the mouth. Entered with A = its travel byte (the
  // caller's LDA) and X the object; returns A and the flags of its last instruction.
  P.blown_step = function (r) {
    let x = r.x, y, a;
    dec(TRAVEL + x);
    a = r.a & 0x7F; y = a;
    a = M[CARGO + x];
    if (a & 0x80) { a = y >> 1; y = a; if (y === 0) y = 1; }
    let full;                                      // A for glyph_dst_a: 4, or $0A for a thunder bubble
    if (M[0x0F73] === 0x4C) {
      // j_0F91
      a = M[0xACB6 + y]; M[TYPE + x] = a; a = 4; full = 4;
    } else {
      // the patched LDA $0F91,X, then the round-100 code at $0F76
      a = M[0x0F91 + x];
      a = M[LIFE + x];
      if (a >= 0x0A) { a = M[0xACB6 + y]; M[TYPE + x] = a; a = 4; full = 4; }
      else {
        inc(LIFE + x);
        a = M[0xACB6 + y]; M[TYPE + x] = a;
        if (a === 4) { a = 0x0A; M[TYPE + x] = a; }
        a = 0x0A; full = 0x0A;
      }
    }
    // b_0F98
    M[0x38] = full; a = M[COL + x]; M[0x39] = a; a = M[OX + x]; M[0x3A] = a;
    a = M[OWNER + x];
    let wall = false;
    if (a & 0x80) {
      dec(COL + x);
      a = (M[OX + x] - 8) & 255; M[OX + x] = a;
      r = P.catch_enemy(regs(r, { a, x, y })); y = r.y;
      a = M[TYPE + x];
      if (a >= 6) return regs(r, { a, x, y }, cmp(a, 6));
      r = P.object_map_pointer(regs(r, { a, x, y })); a = r.a; y = r.y;
      if (a !== 0) { y = 0; a = peek(ptr()); wall = (a & 0x80) !== 0; }
      if (!wall) {
        y = 0x29; a = peek(ptr() + 0x29);
        if (a & 0x80) wall = true;
        else { y = 0x50; a = peek(ptr() + 0x50); wall = (a & 0x80) !== 0; }
      }
    } else {
      a = M[COL + x];
      if (a === 0x1C) wall = true;
      else {
        inc(COL + x);
        a = (M[OX + x] + 8) & 255; M[OX + x] = a;
        r = P.catch_enemy(regs(r, { a, x, y })); y = r.y;
        a = M[TYPE + x];
        if (a >= 6) return regs(r, { a, x, y }, cmp(a, 6));
        r = P.object_map_pointer(regs(r, { a, x, y })); a = r.a; y = r.y;
        if (a !== 0) { y = 1; a = peek(ptr() + 1); wall = (a & 0x80) !== 0; }
        if (!wall) {
          y = 0x28; a = peek(ptr() + 0x28);
          if (a & 0x80) wall = true;
          else { y = 0x51; a = peek(ptr() + 0x51); wall = (a & 0x80) !== 0; }
        }
      }
    }
    if (!wall) {
      a = M[TRAVEL + x] & 0x7F; M[TRAVEL + x] = a;
      return regs(r, { a, x, y }, nz(a));
    }
    // b_100B: stopped at the wall: back to the cell it came from, and it floats
    let s = sbc(M[0x3A], 0x14, 1); s = adc(s.a & 0xF8, 0x13, s.c); M[OX + x] = s.a;
    a = M[0x39]; M[COL + x] = a;
    a = M[0x38];
    let c = s.c;
    y = M[TRAVEL + x];
    if (y & 0x80) {
      y = 0;
      a = absd(M[0xBB], M[OX + x]); c = a >= 0x10 ? 1 : 0;
      if (a < 0x10) { a = absd(M[0xC3], M[OY + x]); c = a >= 0x10 ? 1 : 0; if (a < 0x10) y++; }
      a = y; M[OWNER + x] = a;
      a = M[0x38]; M[WAS + x] = a;
      a = 0x34;
    }
    M[TYPE + x] = a;                               // b_1050
    a = 0; M[SUBCOL + x] = 0; M[TRAVEL + x] = 0;
    return regs(r, { a, x, y }, { c, ...nz(0) });
  };

  // --- catch_enemy ($105B) ----------------------------------------------------------------------
  // The first enemy (state 1-$0A or $16 and up) within 16 pixels of object X goes into it.
  P.catch_enemy = function (r) {
    const x = r.x;
    let a, y, c = r.c;
    for (y = 5; y >= 0; y--) {
      a = M[0xB4 + y];
      if (a === 0) continue;
      c = a >= 0x16 ? 1 : 0;
      if (a < 0x16) { c = a >= 0x0B ? 1 : 0; if (a >= 0x0B) continue; }
      a = absd(M[0xBC + y], M[OX + x]); c = a >= 0x10 ? 1 : 0; if (a >= 0x10) continue;
      a = absd(M[0xC4 + y], M[OY + x]); c = a >= 0x10 ? 1 : 0; if (a >= 0x10) continue;
      // b_1090
      a = ((y << 1) + 0x18) & 255; M[TYPE + x] = a;
      a = M[0xB4 + y];
      c = a >= 0x0A ? 1 : 0;
      if (a !== 0x0A) c = a >= 0x16 ? 1 : 0;
      if (a === 0x0A || a >= 0x16) {
        const saved = M[0x87A2 + y];
        M[0x87A2 + y] = 0xFF; M[0x87CA + y] = 0xFF; M[0x87F2 + y] = 0xFF;
        a = saved;
      }
      M[CARGO + x] = a;
      const cargo = a;
      M[0xB4 + y] = 0; M[0x863A + y] = 0; M[TRAVEL + x] = 0;
      M[0x85C2 + y] = 0xFF;
      M[LIFE + x] = 0xA0;
      y = cargo;
      a = M[0xAB81 + y]; M[WAS + x] = a;
      return regs(r, { a, x, y }, { c, ...nz(a) });
    }
    return regs(r, { a, x, y: 0xFF }, { c, ...nz(0xFF) });
  };

  // --- thunder_shot ($10D6) ---------------------------------------------------------------------
  // Object type $26 (and the fireball after its flip): 8 pixels on, ended at the edge, and every
  // enemy it reaches is put back in its slot and killed, with sound effect 2.
  P.thunder_shot = function (r) {
    let x = r.x, y = r.y, a;
    a = M[OWNER + x];
    let gone;
    if (a & 0x80) {
      a = (M[OX + x] - 8) & 255; M[OX + x] = a;
      gone = dec(COL + x) === 0;
    } else {
      a = (M[OX + x] + 8) & 255; M[OX + x] = a;
      inc(COL + x); a = M[COL + x];
      gone = a === 0x1E;
    }
    if (gone) { a = 0x38; M[TYPE + x] = a; return next(regs(r, { a, x, y }), x); }
    // b_1100
    a = M[TYPE + x]; M[0x3F] = a; M[0x3E] = x;
    r = P.catch_enemy(regs(r, { a, x, y })); y = r.y;
    a = M[TYPE + x];
    const old = M[0x3F];
    if (a === old) return next(regs(r, { a, x, y }), x);
    a = sbc(a, 0x17, cmp(a, old).c).a >> 1; M[0x3D] = a;
    a = M[CARGO + x];
    x = M[0x3D]; M[0xB4 + x] = a;
    r = P.kill_enemy(regs(r, { a, x, y })); y = r.y;
    x = M[0x3E];
    a = M[0x3F]; M[TYPE + x] = a;
    a = 2; M[0xB0] = a;
    return next(regs(r, { a, x, y }), x);
  };

  // --- flip_subcol ($112B) ----------------------------------------------------------------------
  P.flip_subcol = function (r) {
    const a = M[SUBCOL + r.x] ^ 1;
    M[SUBCOL + r.x] = a;
    return regs(r, { a }, nz(a));
  };

  // --- boss_hit_test ($1134) --------------------------------------------------------------------
  // Round 100's pass hook: every thunder shot in the boss's box is used up and takes a hit off;
  // below zero the boss is beaten for $82 passes, then recovers angry with 40.
  P.boss_hit_test = function (r) {
    const c = io();
    let a, x = r.x, y = r.y;
    a = M[0xBE];
    if (a === 9) {
      // b_118F
      if (dec(0x5BBF) === 0) {
        a = 0x28; M[0x5BBF] = a;
        a = 0xFF; M[0x872A] = a;
        a = M[0x119F]; M[0xBE] = a;
        return regs(r, { a, x, y }, nz(a));
      }
      a = M[0x5BBF];
      if (a >= 0x11) return regs(r, { a, x, y }, cmp(a, 0x11));
      a &= 1;
      if (a !== 0) return regs(r, { a, x, y }, nz(a));
      a = c.vicRead(0x15) ^ 0xFC; c.vicWrite(0x15, a);
      return regs(r, { a, x, y }, nz(a));
    }
    for (x = 0x11; x >= 0; x--) {
      a = M[TYPE + x]; if (a !== 0x26) continue;
      let s = asl3(M[COL + x]); s = adc(s.a, 0x14, s.c); M[0x40] = s.a;
      s = asl3(M[ROW + x]); s = adc(s.a, 0x15, s.c);
      // $1155: BCS b_115B / CMP #$F8 / BCS b_115F / b_115B: CMP #$38 / BCS b_1178
      s = sbc(s.a, M[0xBD], 1); a = s.a;
      if (!(!s.c && a >= 0xF8) && a >= 0x38) continue;
      s = sbc(M[0x40], M[0xBC], 1); a = s.a;
      if (!(!s.c && a >= 0xF8) && a >= 0x40) continue;
      a = 0x3A; M[TYPE + x] = a; M[WAS + x] = a;
      dec(0x5BBF);
    }
    x = 0xFF;
    a = M[0x5BBF];
    if (!(a & 0x80)) return regs(r, { a, x, y }, nz(a));
    a = M[0xBE]; M[0x119F] = a;
    a = 9; M[0xBE] = a;
    a = 0x82; M[0x5BBF] = a;
    return regs(r, { a, x, y }, nz(a));
  };

  // --- fire_drop ($11B7) ------------------------------------------------------------------------
  // Object type $24: the flame falls half a cell a pass and, on a floor, starts a fire run.
  P.fire_drop = function (r) {
    let x = r.x, y = r.y, a;
    a = M[SUBROW + x] ^ 4; M[SUBROW + x] = a;
    if (a !== 0) {
      inc(ROW + x); a = M[ROW + x];
      if (a >= 0x1D) { dec(ROW + x); a = 0x38; M[TYPE + x] = a; }
      return next(regs(r, { a, x, y }), x);
    }
    // b_11D2
    r = P.object_map_pointer(regs(r, { a, x, y })); a = r.a; y = r.y;
    y = 0; a = peek(ptr());
    if (a & 0x80) return next(regs(r, { a, x, y }), x);
    y = 0x28; a = peek(ptr() + 0x28);
    if (!(a & 0x80)) return next(regs(r, { a, x, y }), x);
    a = 0x38; M[TYPE + x] = a;
    for (y = 4; y >= 0; y--) { a = M[0xA770 + y]; if (a & 0x80) break; }
    if (y < 0) return next(regs(r, { a, x, y: 0xFF }), x);
    // b_11F2: a free fire slot
    M[0x125C] = y;
    a = M[COL + x]; M[0x42] = a;
    a = 0; M[0x43] = 0;
    r = P.random(regs(r, { a, x, y })); a = r.a & 0x0F; M[0x3C] = a;
    r = P.random(regs(r, { a, x, y })); a = r.a & 0x0F; M[0x3D] = a;
    a = (a + M[COL + x]) & 255;
    if (a >= 0x1E) { a = 0xFF; M[0x3D] = 0xFF; }
    // the run to the left: b_1216
    for (;;) {
      a = 0xFF;
      dec(0x40);
      if (M[0x40] === 0xFF) dec(0x41);
      y = 0; inc(0x43);
      a = peek(ptr());
      if (a & 0x80) break;
      y = 0x28; a = peek(ptr() + 0x28);
      if (!(a & 0x80)) break;
      dec(0x42);
      if (dec(0x3C) & 0x80) break;
    }
    // b_1234: the run to the right
    a = M[0x3D];
    if (!(a & 0x80)) {
      a = M[0x43];
      const s = adc(a, M[0x40], 0); M[0x40] = s.a; a = s.a;
      if (s.c) inc(0x41);
      for (;;) {                                   // b_1243
        if (inc(0x40) === 0) inc(0x41);
        y = 1; a = peek(ptr() + 1);
        if (a & 0x80) break;
        y = 0x29; a = peek(ptr() + 0x29);
        if (!(a & 0x80)) break;
        inc(0x43);
        if (dec(0x3D) & 0x80) break;
      }
    }
    // b_125B
    y = M[0x125C];
    a = M[0x42]; M[0xA761 + y] = a;
    a = M[ROW + x]; M[0xA766 + y] = a;
    a = M[0x43]; M[0xA76B + y] = a;
    a = 6; M[0xA770 + y] = a;
    return next(regs(r, { a, x, y }), x);          // special_done
  };

  // --- boulder_shot ($1274) ---------------------------------------------------------------------
  // Object type $2A: a column every second pass (the flipped sub-column says which), as a shot.
  P.boulder_shot = function (r) {
    const x = r.x;
    r = P.flip_subcol(regs(r, { x }));
    const a = r.a, y = M[OWNER + x];
    if (y & 0x80) { if (a !== 1) return next(regs(r, { a, x, y }), x); }
    else if (a !== 0) return next(regs(r, { a, x, y }), x);
    return shot_step(regs(r, { a, x, y }), 0x3A);
  };

  // --- shot_step ($1286) ------------------------------------------------------------------------
  // One step of a horizontal shot: a wall in the cell ahead ends it with the type at $12AC (A on
  // entry: $3A from shot_step's own LDA, $38 from enemy_fireball's entry at $1288), else a column
  // on and touch_kills. Its exit at $12A8 is JMP move_bubbles_next, or RTS while bottle_shot has
  // patched it.
  function shot_step(r, endType) {
    let x = r.x, y, a = endType;
    M[0x12AC] = a;
    r = P.object_map_pointer(regs(r, { a, x })); a = r.a;
    y = M[OWNER + x];
    let wall = false, moved = false;
    if (y & 0x80) {
      y = 0x4F; a = peek(ptr() + 0x4F);
      if (a & 0x80) wall = true;
      else if (!(dec(COL + x) & 0x80)) moved = true;
      // else: the column went below 0 and the code falls into b_129D
    }
    if (!wall && !moved) {
      y = 0x52; a = peek(ptr() + 0x52);            // b_129D
      if (a & 0x80) wall = true;
      else inc(COL + x);
    }
    if (!wall) {
      r = P.touch_kills(regs(r, { a, x, y }));     // b_12A5
      if (M[0x12A8] === 0x60) return r;
      return next(r, r.x);
    }
    // b_12AB
    a = M[0x12AC]; M[TYPE + x] = a; M[WAS + x] = a;
    r = regs(r, { a, x, y }, nz(a));
    if (M[0x12A8] === 0x60) return r;
    return next(r, x);
  }
  P.shot_step = r => shot_step(r, 0x3A);
  // The entry at $1288 that enemy_fireball jumps to with A = $38 (for the items group).
  P.shot_step_at_1288 = r => shot_step(r, r.a);

  // --- bottle_shot ($12B4) ----------------------------------------------------------------------
  // Object type $2C: a shot that turns round at a wall and, back at its start column, tells its
  // thrower (object_y holds the actor) and goes.
  P.bottle_shot = function (r) {
    let x = r.x, y, a;
    M[0x12A8] = 0x60;
    r = P.shot_step(regs(r, { a: 0x60, x }));
    a = 0x4C; M[0x12A8] = a; x = r.x; y = r.y;
    inc(SUBCOL + x); a = M[SUBCOL + x] & 3; M[SUBCOL + x] = a;
    a = M[TYPE + x];
    if (a === 0x3A) {
      a = 0x2C; M[TYPE + x] = a;
      a = M[OWNER + x] ^ 0x80; M[OWNER + x] = a;
    }
    a = M[COL + x];
    if (a !== M[OX + x]) return next(regs(r, { a, x, y }), x);
    y = M[OY + x];
    a = 0x64; M[0x8890 + y] = a;
    a = 0xFF; M[0x8818 + y] = a;
    a = 0x38; M[TYPE + x] = a;
    return next(regs(r, { a, x, y }), x);
  };

  // --- bolt_fall ($12F9) ------------------------------------------------------------------------
  // Object type $32: a row a pass; a player it touches or the bottom row ends it and frees its
  // owner (object_x holds the actor) to drop another.
  P.bolt_fall = function (r) {
    let x = r.x, y, a;
    inc(ROW + x);
    r = P.touch_kills(regs(r, { x })); x = r.x; y = r.y; a = r.a;
    if (r.c) a = 0x3A;
    else {
      a = M[ROW + x];
      if (a !== 0x1D) return next(regs(r, { a, x, y }), x);
      a = 0x38;
    }
    M[TYPE + x] = a;
    y = M[OX + x];
    a = 0xFF; M[0x8818 + y] = a;
    return next(regs(r, { a, x, y }), x);
  };

  // --- run_fires ($1319) ------------------------------------------------------------------------
  // The five fire runs: each burns down every fourth pass, is drawn as a row of its stage's
  // glyph (0 restores the clean copy at $8B00), and while tall ($40 and up) kills every enemy
  // standing on the row above it.
  P.run_fires = function (r) {
    let a = r.a, x, y;
    for (x = 4; x >= 0; x--) {
      y = M[0xA770 + x];
      if (y & 0x80) continue;
      a = M[0x597F] & 3;
      if (a === 0) dec(0xA770 + x);
      a = M[0xA76B + x]; M[0x43] = a; dec(0x43);
      a = M[0xACBD + y]; M[0x42] = a;
      y = M[0xA766 + x];
      let s = adc(M[ROW_LO + y], M[0xA761 + x], 0); M[0x40] = s.a;
      M[0x41] = adc(M[ROW_HI + y], 0, s.c).a;
      y = M[0x43]; a = M[0x42];
      if (a === 0) {
        // b_135A: put the clean copy back
        M[0x42] = M[0x40];
        a = ((M[0x41] & 3) + 0x8B) & 255; M[0x43] = a;
        const p2 = M[0x42] | (M[0x43] << 8);
        do { a = peek(p2 + y); poke(ptr() + y, a); y = (y - 1) & 255; } while (!(y & 0x80));
        continue;
      }
      if (a >= 0x40) {
        // b_1372: a tall flame kills the enemies standing in it
        s = asl3(M[0xA761 + x]); s = adc(s.a, 0x14, s.c); M[0x44] = s.a;
        s = asl3(M[0xA766 + x]); s = adc(s.a, 0x15, s.c); M[0x45] = s.a;
        y = M[0xA76B + x]; a = M[0x0200 + y]; M[0x3D] = a;
        M[0x3E] = x;
        for (x = 5; x >= 0; x--) {
          a = M[0xB4 + x];
          if (a === 0) continue;
          if (a >= 0x0B) continue;
          a = (M[0x45] - M[0xC4 + x]) & 255;
          if (a !== 0x10) continue;
          a = (M[0xBC + x] - M[0x44]) & 255;
          if (a >= M[0x3D]) continue;
          r = P.kill_enemy(regs(r, { a, x, y })); x = r.x & 255; y = r.y;
          dec(0x8892 + x);
        }
        y = M[0x43]; a = M[0x42]; x = M[0x3E];
      }
      // b_1353: draw the run
      do { poke(ptr() + y, a); y = (y - 1) & 255; } while (!(y & 0x80));
    }
    return regs(r, { a, x: 0xFF, y, c: undefined }, { n: 1, z: 0 });   // the carry is the last compare's: not kept
  };

  // --- age_objects ($13BE) ----------------------------------------------------------------------
  // Every object's life counts down; at zero a plain bubble bursts, a carried enemy is let out
  // angry, a readied shot ($42) is freed. In the last 16 passes a plain bubble blinks (type $48)
  // and a carried enemy's sprite flickers. Then, with fewer than two slots free or ending, two
  // plain bubbles are burst: the JSR burst_one_plain at $145C and the fall into it at $145F.
  P.age_objects = function (r) {
    const c = io();
    let a = r.a, x, y = r.y;
    for (x = 0x11; x >= 0; x--) {
      if (dec(LIFE + x) === 0) {
        a = M[TYPE + x];
        if (a === 4) { M[WAS + x] = a; a = 0x3A; M[TYPE + x] = a; continue; }
        if (a >= 0x24) {
          if (a !== 0x42) continue;
          a = 0xFF; M[TYPE + x] = a; continue;
        }
        if (a < 0x18) continue;
        a = (a - 0x18) >> 1; y = a;
        a = M[0x5ABF]; M[0xB4 + y] = a;
        a = M[0xC4 + y] | 1; M[0xC4 + y] = a;
        a = M[0xBC + y] & 0xFE; M[0xBC + y] = a;
        a = 0xFF; M[0x872A + y] = a;
        a = M[CARGO + x]; M[0x87A2 + y] = a;
        a = 0; M[0x8522 + y] = a;
        a = 0x38; M[TYPE + x] = a;
        continue;
      }
      // b_1413
      a = M[LIFE + x];
      if (a >= 0x11) continue;
      a &= 1;
      if (a !== 0) continue;
      a = M[TYPE + x];
      if (a === 4 || a === 0x48) { a ^= 0x4C; M[TYPE + x] = a; continue; }
      if (a >= 0x24) continue;
      if (a < 0x18) continue;
      a = (a - 0x18) >> 1; y = a;
      a = M[0xAB55 + y] ^ c.vicRead(0x15); c.vicWrite(0x15, a);
    }
    // b_1449: the free and ending slots
    y = 0;
    for (x = 0x11; x >= 0; x--) { a = M[TYPE + x]; if (a >= 0x34) y++; }
    a = y; x = 0xFF;
    if (y >= 2) return regs(r, { a, x, y }, cmp(y, 2));
    r = P.burst_one_plain(regs(r, { a, x, y }));
    return P.burst_one_plain(r);
  };

  // --- burst_one_plain ($145F) ------------------------------------------------------------------
  // The highest-numbered plain bubble (type 4) becomes a burst (type $3A).
  P.burst_one_plain = function (r) {
    let a = r.a, x;
    for (x = 0x11; x >= 0; x--) {
      a = M[TYPE + x];
      if (a !== 4) continue;
      M[WAS + x] = a;
      a = 0x3A; M[TYPE + x] = a;
      return regs(r, { a, x }, nz(a));
    }
    return regs(r, { a, x: 0xFF }, nz(0xFF));
  };

  // --- step_water ($1B40): the interrupt side -------------------------------------------------
  // The water stream, from irq_bottom on every second frame: the oldest trail cell is erased
  // from both screens (when it still shows the water glyph $1F), the other ten are drawn in both
  // with colour $0B, actors within 12 pixels of the cell behind the head are swept up (state
  // $0D), the trail shifts and the head moves: down while falling, then along the floor it lands
  // on, dropping where the floor ends, until it leaves the bottom. Reads M directly.
  P.step_water = function (r) {
    let a = r.a, x = r.x, y;
    const pa = () => M[2] | (M[3] << 8), pb = () => M[4] | (M[5] << 8), pc = () => M[6] | (M[7] << 8);
    y = M[0xA756];
    if (y >= 4) {
      let s = adc(M[ROW_LO + y], M[0xA74B], 0); M[2] = M[4] = M[6] = s.a;
      s = adc(M[ROW_HI + y], 0, s.c); M[3] = s.a;
      a = s.a ^ 4; M[5] = a;
      a = adc(a & 3, 0x8B, s.c).a; M[7] = a;
      y = 0; a = 0x1F;
      if (a === peek(pa())) { a = peek(pc()); poke(pa(), a); a = 0x1F; }
      if (a === peek(pb())) { a = peek(pc()); poke(pb(), a); }
    }
    // b_1B7B: the ten trail cells
    for (x = 0x0A; x !== 0; x--) {
      y = M[0xA756 + x];
      if (y < 4 || y >= 0x1D) continue;
      let s = adc(M[ROW_LO + y], M[0xA74B + x], 0); M[2] = M[4] = M[6] = s.a;
      s = adc(M[ROW_HI + y], 0, s.c); M[3] = s.a;
      a = s.a ^ 4; M[5] = a;
      a = adc(a & 3, 0xD8, s.c).a; M[7] = a;
      y = 0; a = 0x1F;
      poke(pa(), a); poke(pb(), a);
      a = 0x0B; poke(pc(), a);
    }
    // the cell behind the head: sweep up the actors on it
    a = M[0xA75F];
    if (a >= 4 && a < 0x1D) {
      let s = asl3(a); s = adc(s.a, 5, s.c); M[3] = s.a;
      a = M[0xA754]; s = asl3(a); s = adc(s.a, 0x14, s.c); M[2] = s.a; a = s.a;
      for (x = 7; x >= 0; x--) {
        a = M[STATE + x];
        if (a === 0) continue;
        if (a >= 0x0B) continue;
        if (x < 2) { a = M[0x87A0 + x]; if (!(a & 0x80)) continue; }
        a = absd(M[AX + x], M[2]); if (a >= 0x0C) continue;
        a = absd(M[AY + x], M[3]); if (a >= 0x0C) continue;
        a = M[STATE + x];
        if (a === 0x0A) a = M[0x87A0 + x];
        M[0x8840 + x] = a;
        a = 0x0D; M[STATE + x] = a;
      }
    }
    // b_1C15: shift the trail
    for (x = 0; x !== 0x0A; x++) {
      a = M[0xA74C + x]; M[0xA74B + x] = a;
      a = M[0xA757 + x]; M[0xA756 + x] = a;
    }
    a = M[0xA756];
    if (a === 0x1D) { a = 0; M[0x4D] = 0; return regs(r, { a, x, y }, nz(0)); }
    // b_1C32: move the head
    a = M[0xA760];
    if (a >= 0x1D) return regs(r, { a, x, y }, cmp(a, 0x1D));
    const c7 = a >> 7; a = (a << 1) & 255; y = a;
    let s = adc(M[ROW40 + y], M[0xA755], c7); M[2] = s.a;
    s = adc(M[ROW40_HI + y], 0x85, s.c); M[3] = s.a;
    dec(2); a = M[2];
    let c = a === 0xFF ? 1 : 0;                    // CMP #$FF
    if (a === 0xFF) dec(3);
    a = M[0x4D];
    if (a & 0x80) {
      // falling: a floor two cells down with nothing in the cell below starts a run along it
      y = 1; a = peek(pa() + 1);
      if (a & 0x80) { inc(0xA760); return regs(r, { a, x, y }, { c, ...nz(M[0xA760]) }); }
      y = 0x29; a = peek(pa() + 0x29);
      if (!(a & 0x80)) { inc(0xA760); return regs(r, { a, x, y }, { c, ...nz(M[0xA760]) }); }
      r = P.random(regs(r, { a, x, y })); c = r.c;
      a = (r.a & 1) | 4; M[0x4D] = a;
    }
    // b_1C6D
    y = 0x29; a = peek(pa() + 0x29);
    if (!(a & 0x80)) {
      a = 0xFF; M[0x4D] = a;
      inc(0xA760);                                 // b_1C77
      return regs(r, { a, x, y }, { c, ...nz(M[0xA760]) });
    }
    // b_1C7B: along the floor
    a = M[0x4D] & 1;
    if (a === 0) {
      y = 0; a = peek(pa());
      if (!(a & 0x80)) { dec(0xA755); return regs(r, { a, x, y }, { c, ...nz(M[0xA755]) }); }
      inc(0x4D);                                   // b_1C8B
    }
    // b_1C8D
    y = 2; a = peek(pa() + 2);
    if (!(a & 0x80)) { inc(0xA755); return regs(r, { a, x, y }, { c, ...nz(M[0xA755]) }); }
    dec(0x4D);
    y = 0; a = peek(pa());
    if (a & 0x80) { inc(0xA760); return regs(r, { a, x, y }, { c, ...nz(M[0xA760]) }); }
    return regs(r, { a, x, y }, { c, ...nz(a) });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);

/* port/src/round.js */
// The round: its set-up, its timers and the enemies' arrival. check_deaths ($045C, with lose_life
// $04A0), init_round_state ($05C5, with special_round_setup $F217 and clear_item_sprites $069B),
// star_field ($0885), the Barons (baron_move $1473, touch_kills $152B), round_timers ($1578, with
// banner_and_boss $1694 and round_cleared $16F7 inline), barons_appear ($1621), enemies_angry
// ($16E4), drop_in_enemies ($17BE), actors_to_sprites ($1805, interrupt side), kill_enemy ($1A6F),
// sky_flash ($1AB6), clear_first_objects ($1AE8), redraw_until_free ($1B02), the scroll-in
// ($37C9-$392A: scroll_in_round, round_number_glyphs, scroll_up_row), start_round ($392A),
// hurry_up ($3AB8), round_banner ($3C01), the layout builders ($E000-$E373: build_round,
// draw_layout, build_air_currents, next_map_row, unpack_layout and its helpers) and the players'
// entrance ($E4DA-$E73F: intro_step_armed, intro_step, float_down, trace_line,
// build_letter_bubbles, draw_extend_letters, draw_extend_column).
//
// Patched operands read from M, written as the game writes them: angry_value $16EF (enemies_angry's
// STA value, which check_deaths turns to 0 and back), touch_state_a/b $1545/$1549 (touch_kills's
// two compares, which baron_move shifts and restores), the opcode at $156E (the cracker's
// invincibility turns the STA into an LDA), the jump at $049D (JMP check_rejoin, or RTS once the
// credits are gone), intro_step_tail $E539 (RTS, or LDA #imm with its operand at $E53A), the
// unpackers' JSR operand $E30C/$E30D, hurry_up's three page bytes ($3AF0, $3BF1, $3BFA) and its
// flash colour $3BA1, pass_hook $0A38, spawn_kind_switch $0C9C, special_mask $0CC2, drift_threshold
// $0DC7.
//
// Where the port departs from the instructions:
// - check_deaths's jump at $049D (JMP check_rejoin, when nobody died) has no routine entry to
//   call: check_rejoin ($052A) is ported inline here as a local function (the screen group keeps
//   its own copy inside draw_lives_row).
// - baron_move ends in JMP move_bubbles_next ($0D4A), the object loop's tail, which only the loop
//   can continue: the port returns there with the registers the tail's DEX leaves, as items.js's
//   enemy_fireball does. Its test runs it on object 0, so the game's loop ends at once too.
// - round_timers falls into banner_and_boss and round_cleared, labels that are not routine entries:
//   they are local functions here. round_cleared's ADC #$08 adds the carry the pass loop's previous
//   routine left (check_extra_life's compare) unless an item timed out in this pass: round_timers
//   keeps that carry in r.c and tracks the compares that change it.
//
// Reads of the interrupt's bytes ($08, $A4, $2A, $2B, $5D, $5E, $A9B1) in main-program routines go
// through P.io.irqByte, a read for each of the game's, the DEC of $A9B1 included; the two polls of
// $A4 (barons_appear $1684, hurry_up $3BB1) read M a turn at a time. actors_to_sprites runs inside
// the interrupt and reads M.
(function (root) {
'use strict';
const G = root.BBGroups = root.BBGroups || {};
const { nz, regs, adc, sbc, cmp } = root.BBUtil;

// The actors.
const STATE = 0xB2, AX = 0xBA, AY = 0xC2;
// The objects.
const TYPE = 0xCA, COL = 0xDC, ROW = 0xEE, CARGO = 0xAA30, WAS = 0xAA42;

G.round = function (P) {
  const M = P.M;
  const io = () => P.io;
  const ib = a => io().irqByte(a);
  const isIO = a => a >= 0xD000 && a < 0xE000;
  // A byte through a pointer: the I/O area is the chips (the port is $35 while these run), the
  // rest M. The layouts under the I/O area are read with M directly, never through peek.
  const peek = a => { a &= 0xFFFF; return isIO(a) ? io().read(a) : M[a]; };
  const poke = (a, v) => { a &= 0xFFFF; if (isIO(a)) io().write(a, v & 255); else M[a] = v & 255; };
  const zp16 = a => M[a] | (M[(a + 1) & 255] << 8);
  const dec = a => (M[a] = (M[a] - 1) & 255);
  const inc = a => (M[a] = (M[a] + 1) & 255);
  // SEC / SBC / BCS / EOR #$FF / ADC #$01: |a - b|.
  const absd = (a, b) => (a >= b ? a - b : b - a) & 255;

  // --- check_deaths ($045C) with lose_life ($04A0) --------------------------------------------
  // Once a pass: a player whose death animation has ended (state $0F) loses a life (lose_life),
  // then, if anybody did, the lives are redrawn (draw_lives, screen); in any case the jump at
  // $049D: check_rejoin, or nothing once check_rejoin has made it an RTS.
  P.check_deaths = function* (r) {
    let a, x, y = 0;
    for (x = 1; x >= 0; x--) {
      a = M[STATE + x];
      r = regs(r, {}, cmp(a, 0x0F));
      if (a !== 0x0F) continue;
      // lose_life $04A0
      r = P.reset_powers(regs(r, { a, x, y }));
      x = r.x & 255; y = r.y & 255;
      a = M[0x5C3F];
      if (a >= 0x20 && a !== 0x4A) {
        M[0x40] = x; M[0x41] = y;
        r = yield* P.play_tune(regs(r, { a, x, y: 0x0B }, cmp(a, 0x4A)));
        x = M[0x40]; y = M[0x41];
      }
      a = (M[0xAB53 + x] ^ 0xFF) & M[0x5B7F]; M[0x5B7F] = a;
      M[0x8520 + x] = M[0xA737 + x];
      M[0x87A0 + x] = 0xFF; M[0x87C8 + x] = 0xFF; M[0x87F0 + x] = 0xFF;
      y = (y - 1) & 255;
      const lives = dec(0x045A + x);
      let state;
      if (!(lives & 0x80)) {
        M[AY + x] = 0xDD;
        M[AX + x] = M[0xA735 + x];
        M[0x8688 + x] = 0x4A;
        a = M[0x5A7F];
        state = a !== 0;
      }
      if (!state) {
        // b_04F0: no lives left (or invincible_state 0): GAME OVER for this player
        M[0x41] = y;
        a = M[0x10]; M[0x0409 + x] = a;
        r = P.print_game_over(regs(r, { a, x, y }));
        x = r.x & 255;
        y = M[0x41];
        a = 0; M[AX + x] = 0; M[AY + x] = 0;
      }
      M[STATE + x] = a;
      a = ib(0x2B);
      if (!(a & 0x80)) {
        a = M[0x2D];
        if (!(a & 0x80)) { M[0x2D] = 0; a = M[0x2C]; M[0x2A] = a; }
      }
      a = M[0x4A];
      r = regs(r, { a, x, y }, cmp(a, 2));
      if (a >= 2) {
        M[0x40] = x;
        inc(0x16EF);
        r = P.enemies_angry(r);
        dec(0x16EF);
        x = M[0x40]; y = r.y & 255;
      }
    }
    a = y;
    r = regs(r, { a, x: 0xFF, y }, nz(a));
    if (!(a & 0x80)) return M[0x049D] === 0x4C ? check_rejoin(r) : r;   // b_049D
    return P.draw_lives(r);
  };
  // $052A (inline: see the header): a player who is out and presses fire with a credit left gets
  // four lives, state $0F, a cleared score and the GAME OVER text blanked; the last credit turns
  // $049D into an RTS.
  function check_rejoin(r) {
    const c = io();
    let a = r.a & 255, x, y = r.y & 255, f = { c: r.c };
    for (x = 1; x >= 0; x--) {
      a = M[STATE + x];
      if (a !== 0) continue;
      a = c.ciaRead(x) & 0x10;
      if (a !== 0) continue;
      M[0x045A + x] = 4;
      M[STATE + x] = 0x0F;
      a = 0;
      y = M[0xAB51 + x];
      M[0x0400 + y] = 0; y = (y - 1) & 255; M[0x0400 + y] = 0; y = (y - 1) & 255; M[0x0400 + y] = 0;
      M[0xAC + x] = 0;
      y = (y + 1) & 255; a = y; M[0xAE + x] = a;
      dec(0x53E4); dec(0x57E4);
      if (dec(0xAB) & 0x80) M[0x049D] = 0x60;
      a = 0xE9; y = 0x50;
      f = cmp(x, 1);
      if (x === 1) { a = 1; y = (y + 2) & 255; }
      M[0x02] = a; M[0x03] = y; M[0x04] = a; M[0x06] = a;
      a = y | 4; M[0x05] = a;
      a ^= 0x8C; M[0x07] = a;
      y = 6;
      do {
        let s = adc(y, 0x50, 0); y = s.a;
        a = 0x20; M[(zp16(0x02) + y) & 0xFFFF] = a; M[(zp16(0x04) + y) & 0xFFFF] = a;
        a = M[0x8570 + x]; poke(zp16(0x06) + y, a);
        s = adc(y, 0x28, 0); y = s.a;
        a = 0x20; M[(zp16(0x02) + y) & 0xFFFF] = a; M[(zp16(0x04) + y) & 0xFFFF] = a;
        s = sbc(y, 0x79, 1); y = s.a; f = { c: s.c };
      } while (!(y & 0x80));
    }
    return regs(r, { a, x: 0xFF, y }, { c: f.c, z: 0, n: 1 });
  }

  // --- init_round_state ($05C5) -------------------------------------------------------------
  // Everything that lasts one round. The tune: $0B unless the current one is below $12 or is
  // $4A, and always $12 on round 100 (the LDY #$12 / BIT / $5C no-op reaches the JSR with Y =
  // $12 and A = $63).
  P.init_round_state = function* (r) {
    let a, x, y;
    M[0x8549] = 3; M[0x8521] = 4; M[0x8548] = 5;
    const fastP2 = M[0x8729], fastP1 = M[0x8728];
    y = 0x0B;
    a = M[0x10];
    let play;
    if (a === 0x63) { y = 0x12; play = true; }
    else { a = M[0x5C3F]; play = !(a < 0x12 || a === 0x4A); }
    if (play) r = yield* P.play_tune(regs(r, { a, x: 5, y }, cmp(a, 0x4A)));
    for (x = 7; x >= 0; x--) {
      M[0x87A0 + x] = 0xFF; M[0x87C8 + x] = 0xFF; M[0x87F0 + x] = 0xFF; M[0x8818 + x] = 0xFF;
      M[0x86D8 + x] = 0; M[0x8700 + x] = 0; M[0x8728 + x] = 0;
      M[0x86B0 + x] = x;
    }
    M[0x8728] = fastP1; M[0x8729] = fastP2;
    a = 0xFF;                                      // TXA with X = $FF
    for (x = 0x11; x >= 0; x--) M[TYPE + x] = a;
    r = P.clear_fire_and_water(regs(r, { a, x: 0xFF, y }, nz(0xFF)));
    a = r.x & 255;                                 // TXA: the X clear_fire_and_water leaves
    for (x = 0x23; x >= 0; x--) M[COL + x] = a;
    M[0x8520] = a; M[0x21] = a; M[0x46] = a; M[0x47] = a; M[0x58FF] = a; M[0x593F] = a; M[0x58BF] = a;
    M[0x67] = a; M[0x68] = a; M[0x69] = a; M[0xB1] = a; M[0xB0] = a;
    for (x = 0x48; x >= 0; x--) M[0x015D + x] = a;
    for (x = 5; x >= 0; x--) M[0x61 + x] = a;
    x = 0xFF;
    M[0xA783] = x; M[0xA784] = x; io().vicWrite(0x15, x); M[0x6A] = x;
    M[0x5A7F] = 0x10;
    M[0x5ABF] = 0x0A;
    r = P.special_round_setup(regs(r, { a: 0x0A, x, y: r.y }, nz(0x0A)));
    x = r.x & 255; y = r.y & 255;
    a = M[0x59BF];
    const f = cmp(a, M[0x10]);
    if (a === M[0x10]) {
      let s = adc(a, M[0x59FF], f.c);
      M[0x59BF] = s.a;
      inc(0x59FF);
      a = M[0x10];
      s = adc((a << 1) & 255, 9, (a >> 7) & 1);
      a = s.a;
      for (;;) {                                   // b_0688: modulo 46, with the carry as the game keeps it
        const c = cmp(a, 0x2F);
        if (!c.c) break;
        s = sbc(a, 0x2E, 1); a = s.a;
        if (a === 0) break;
      }
      M[0x68] = a;
    }
    a = M[0x10];
    r = regs(r, { a, x, y }, cmp(a, 0x63));
    if (a !== 0x63) return P.clear_item_sprites(r);
    return P.build_boss_mirror(r);
  };
  // $F217 (bytes in the listing): on round 73 an air current 2 (down) in the four cells of the
  // bottom row's left opening (columns 9-12), in the map row and its three copies; then the
  // threshold at $0DC7 gets A: the level number, or 2 on round 73. Y ($1E, or $E6 on rounds 35 and
  // 97) is loaded and never stored.
  P.special_round_setup = function (r) {
    let a = M[0x10], x = r.x, y;
    if (a === 0x48) {
      a = 2;
      for (x = 3; x >= 0; x--) { M[0x88C9 + x] = a; M[0x88F1 + x] = a; M[0x8919 + x] = a; M[0x8941 + x] = a; }
      x = 0xFF;
    }
    y = 0x1E;
    let f = cmp(a, 0x22);
    if (a !== 0x22) { f = cmp(a, 0x60); if (a === 0x60) { y = 0xE6; f = { c: f.c, ...nz(y) }; } }
    else { y = 0xE6; f = { c: f.c, ...nz(y) }; }
    M[0x0DC7] = a;
    return regs(r, { a, x, y }, f);
  };
  // $069B: zero the three 128-byte item sprite buffers.
  P.clear_item_sprites = function (r) {
    for (let x = 0; x < 128; x++) { M[0x7D00 + x] = 0; M[0x7D80 + x] = 0; M[0x7E00 + x] = 0; }
    return regs(r, { a: 0, x: 0x80 }, nz(0x80));
  };

  // --- star_field ($0885) ---------------------------------------------------------------------
  // The starry background of the intro: 200 stars at random cells, then 9 to all of colour RAM.
  P.star_field = function* (r) {
    const c = io();
    r = P.clear_screens(r);
    M[0x30] = 0x54; M[0x2F] = 0x48;
    for (let x = 0x0F; x >= 0; x--) M[0x47F0 + x] = M[0xAE41 + x];
    M[0x20] = 0;
    c.vicWrite(0x15, 0);
    r = P.fill_colour(regs(r, { a: 0, x: 0xFF }, nz(0)));
    M[0x1D] = 6; M[0x1C] = 6; M[0x1F] = 3; M[0x1E] = 3;
    let x = 0xC8, a, y;
    do {
      do { r = P.random(regs(r, { x })); a = r.a; } while (a >= 0x19);
      y = (a << 1) & 255;
      let s = adc(0, M[0xAC09 + y], 0); M[0x11] = s.a;
      s = adc(0x50, M[0xAC0A + y], s.c); M[0x12] = s.a;
      do { r = P.random(regs(r, { x, y })); a = r.a; } while (a >= 0x28);
      y = a;
      r = P.random(regs(r, { x, y }));
      a = r.a | 0xFE;
      poke(zp16(0x11) + y, a);
      x = (x - 1) & 255;
    } while (x !== 0);
    r = yield* P.wait_frame(regs(r, { a, x, y }, nz(0)));
    return P.fill_colour(regs(r, { a: 9 }, nz(9)));
  };

  // --- the Barons: baron_move ($1473) and touch_kills ($152B) -----------------------------------
  // Object X is a Baron (type $2E or $30): it ends when its player is dying, kills a player it
  // touches (touch_kills with its compares shifted to $18 and $0E) and otherwise hunts in bursts.
  // Ends at JMP move_bubbles_next: returns there (see the header).
  P.baron_move = function (r) {
    let x = r.x & 255, a, y = r.y & 255, c;
    a = M[STATE + x];
    c = cmp(a, 0x0E).c;
    let ended = a === 0x0E;
    if (!ended) {
      dec(0x1545); inc(0x1549);
      r = P.touch_kills(regs(r, { a, x }, cmp(a, 0x0E)));
      inc(0x1545); dec(0x1549);
      x = r.x & 255; y = r.y & 255; a = r.a & 255; c = r.c ? 1 : 0;
      if (r.c) ended = true;
      else {
        a = M[WAS + x] & 0x7F;
        if (a === 0) {
          inc(CARGO + x);
          if ((M[CARGO + x] & 0x0F) === 0) dec(CARGO + x);
          a = M[CARGO + x] ^ 0x80; M[CARGO + x] = a; M[WAS + x] = a;
          M[0xA775 + x] = 0x1E;
        }
        a = M[0xA775 + x];
        if (a !== 0) { dec(0xA775 + x); return tail(r, a, x, y, c); }
        a = ((M[AX + x] - 0x14) & 255) >> 3; M[0x40] = a;
        y = 0;
        c = cmp(a, M[COL + x]).c;
        if (a < M[COL + x]) y = 2;
        a = y; M[0xE765 + x] = a;
        const dy = (M[AY + x] - 0x15) & 255;
        a = dy >> 3; M[0x41] = a; c = (dy >> 2) & 1;    // the third LSR's carry
        const was = dec(WAS + x);
        // a burst along X (was negative) or Y: one cell towards the player, or the burst's end
        const [axis, t] = (was & 0x80) ? [COL, 0x40] : [ROW, 0x41];
        a = 1; y = M[axis + x];
        c = cmp(y, M[t]).c;
        if (y < M[t]) { const s = adc(a, M[axis + x], 0); M[axis + x] = s.a; return tail(r, s.a, x, y, s.c); }
        if (y === M[t]) { M[WAS + x] = 0; return tail(r, 0, x, y, c); }
        const s = adc(0xFF, M[axis + x], 0); M[axis + x] = s.a; return tail(r, s.a, x, y, s.c);
      }
    }
    // b_1479: the Baron ends; the timer runs again unless the other Baron is still out
    a = 0x3A; M[TYPE + x] = a; M[WAS + x] = a;
    y = x ^ 1;
    a = M[TYPE + y];
    c = cmp(a, 0x2E).c;
    if (a !== 0x2E) { c = cmp(a, 0x30).c; if (a !== 0x30) { a = 0x32; M[0x2B] = a; } }
    return tail(r, a, x, y, c);
  };
  // JMP move_bubbles_next: the registers the loop tail's DEX leaves.
  function tail(r, a, x, y, c) { const nx = (x - 1) & 255; return regs(r, { a, x: nx, y }, { c, ...nz(nx) }); }
  // $152B: kill a player within 16 pixels of object X whose state passes the two compares (their
  // operands at $1545 and $1549); the carry says whether one was killed. The STA at $156E may be
  // the cracker's LDA.
  P.touch_kills = function (r) {
    let x = r.x & 255, a, y;
    let s = adc((M[COL + x] << 3) & 255, 0x18, (M[COL + x] >> 5) & 1); M[0x40] = s.a;
    s = adc((M[ROW + x] << 3) & 255, 0x15, (M[ROW + x] >> 5) & 1); M[0x41] = s.a;
    for (y = 1; y >= 0; y--) {
      a = M[STATE + y];
      if (a === 0) continue;
      if (a !== M[0x1545] && a >= M[0x1549]) continue;
      a = absd(M[AX + y], M[0x40]);
      if (a >= 0x10) continue;
      a = absd(M[AY + y], M[0x41]);
      if (a >= 0x10) continue;
      a = 0x0E;
      if (M[0x156E] === 0xB9) a = M[STATE + y]; else M[STATE + y] = a;
      return regs(r, { a, x, y }, { c: 1, ...nz(a) });
    }
    return regs(r, { a, x, y: 0xFF }, { c: 0, z: 0, n: 1 });
  };

  // --- round_timers ($1578), banner_and_boss ($1694), round_cleared ($16F7) --------------------
  // Once a pass: the two items' delays, the clock's freeze, then the round timer's three ends
  // (hurry up, the Barons, the round done), or while it counts banner_and_boss.
  P.round_timers = function* (r) {
    let a, x, y = r.y, c = r.c ? 1 : 0;
    for (x = 1; x >= 0; x--) {
      a = ib(0x5D + x);
      if (a & 0x80) {
        M[0x5D + x] = 0x0B;
        a = M[0x52 + x];
        const f = cmp(a, 0xFF); c = f.c;
        if (a === 0xFF) continue;
        a ^= 0x80; M[0x52 + x] = a;
        if (!(a & 0x80)) continue;
        M[0x52 + x] = 0xFF;
        a = M[0x4E + x]; M[0x40] = a; M[0x42] = a; M[0x44] = a;
        a = M[0x50 + x] | 0x54; M[0x41] = a;
        a ^= 4; M[0x45] = a;
        const s = adc(a, 0x3B, c); c = s.c; M[0x43] = s.a;
        const p = zp16(0x40), q = zp16(0x42), t = zp16(0x44);
        for (const yy of [0, 1, 0x28, 0x29]) { a = peek(q + yy); poke(p + yy, a); poke(t + yy, a); }
        y = 0x29;
      }
    }
    a = M[0x67];
    if (a !== 0) {
      const v = dec(0x67);
      if (v !== 0) return regs(r, { a, x: 0xFF, y }, { c, ...nz(v) });   // r_1577: A still the old value
      M[0x1C] ^= 7; M[0x1E] ^= 7;
      M[0x2B] = 0x32;
    }
    a = ib(0x2A);
    if (a !== 0) return banner_and_boss(regs(r, { a, x: 0xFF, y }, { c, ...nz(a) }));
    inc(0x37);
    a = M[0x2D];
    if (a === 0) {
      r = yield* P.hurry_up(regs(r, { a, x: 0xFF, y }, { c, ...nz(0) }));
      inc(0x2D);
      a = 0x0A;
      M[0x2A] = a;                                 // j_168F
      const s = dec(0x37);
      return regs(r, { a }, nz(s));
    }
    if (!(a & 0x80)) return yield* P.barons_appear(regs(r, { a, x: 0xFF, y }, { c, ...nz(a) }));
    // the round is done: the players back to state 1
    let done = true;
    for (x = 1; x >= 0; x--) {
      a = M[STATE + x];
      if (a === 0) continue;
      c = cmp(a, 1).c;
      if (a === 1) continue;
      c = cmp(a, M[0x5A7F]).c;
      if (a !== M[0x5A7F]) { done = false; break; }
      a = 1; M[STATE + x] = a;
      a = M[0xA813 + x]; M[0x8728 + x] = a;
      a = M[0x8570 + x]; M[0x8548 + x] = a;
    }
    if (done) { inc(0x21); x = 0xFF; }
    const s = dec(0x37);
    return regs(r, { a, x, y }, { c, ...nz(s) });
  };
  // $1694: while the timer counts: the banner's restore once its two seconds are up (and the
  // boss's set-up on round 100), then round_cleared.
  function banner_and_boss(r) {
    let a, x = r.x, y = r.y, c = r.c;
    a = ib(0xA9B1);
    if (a === 0) {
      const col = io();
      for (x = 8; x >= 0; x--) {
        a = M[0x8C9C + x]; M[0x519C + x] = a; M[0x559C + x] = a;
        a = M[0x8CEC + x]; M[0x51EC + x] = a; M[0x55EC + x] = a;
        a = 0x0D; col.colourWrite(0x19C + x, a); col.colourWrite(0x1EC + x, a);
      }
      M[0xA9B1] = (ib(0xA9B1) - 1) & 255;
      a = M[0x10];
      const f = cmp(a, 0x63); c = f.c;
      if (a === 0x63) {
        M[0xBC] = 0x74; a = 0x65; M[0xBD] = a;
        y = 6; M[0xBF] = y; y = 5; M[0xC0] = y;
        x = 0; M[0xBE] = x; x = 0xFF; M[0x5AFF] = x; M[0x2B] = x;
      }
    }
    return round_cleared(regs(r, { a, x, y }, { c }), true);
  }
  // $16F7 (from banner_and_boss at $16DA): with the timer not yet stopped and enemies left, the
  // last enemy is kept angry; with none left, the end of the round.
  function round_cleared(r, fromBanner) {
    let a = r.a, x = r.x, y = r.y, c = r.c;
    if (fromBanner) {
      a = M[0x2D];
      if (a & 0x80) {
        x = M[0x4A];
        if (x !== 1) return regs(r, { a, x, y }, cmp(x, 1));   // b_16E0
        return P.enemies_angry(regs(r, { a, x, y }, cmp(x, 1)));
      }
    }
    x = M[0x4A];
    if (x !== 0) {
      if (x !== 1) return regs(r, { a, x, y }, cmp(x, 1));
      return P.enemies_angry(regs(r, { a, x, y }, cmp(x, 1)));
    }
    M[0x58FF] = x;
    x = 0xFF;
    a = M[0x53];
    if (a & 0x80) M[0x53] = x; else M[0x5E] = x;
    a = M[0x58];
    if (a & 0x80) { r = P.random(regs(r, { a, x, y })); a = r.a & 3; c = r.c; }
    else { a = ib(0x2A); const s = adc(a, 8, c); a = s.a; c = s.c; }
    M[0x58] = a;
    for (x = 0x11; x >= 0; x--) {
      a = M[TYPE + x];
      if (a & 0x80) continue;
      c = cmp(a, 0x46).c; if (a === 0x46) continue;
      c = cmp(a, 0x44).c; if (a === 0x44) continue;
      c = cmp(a, 0x4A).c; if (a === 0x4A) continue;
      M[WAS + x] = a;
      y = a;
      a = 0x3A;
      c = cmp(y, 4).c;
      if (y !== 4) { c = cmp(y, 0x38).c; if (y >= 0x38) c = cmp(y, 0x42).c; }
      if (y === 4 || (y >= 0x38 && y < 0x42)) {
        y = M[0x68];
        if (y !== 0) { M[0xA9E8 + x] = M[0xA8E4 + y]; a = 0x4C; }
      }
      M[TYPE + x] = a;
    }
    x = 0xFF;
    a = M[0x69];
    if (a !== 0) {
      r = P.clear_enemies(regs(r, { a, x, y }, nz(a)));
      x = r.x & 255; y = r.y & 255;
      a = 0x15; M[0xB4] = a; M[0xC6] = a; M[0xC7] = a;
    }
    M[0x2B] = 0x32; M[0x2D] = 0xFF; M[0x2A] = 9;
    a = M[0x68];
    r = regs(r, { a, x, y }, { c, ...nz(a) });
    if (a === 0) return r;
    return (P.build_giant_food || build_giant_food)(r);
  }
  // $3517, reached by JMP from round_cleared: no routine entry, so ported here as well (items.js
  // defines P.build_giant_food, which is preferred when it is installed). The giant food's
  // four-sprite picture into the item buffers (kinds 1-4 with the top half blanked, kind 1 with two
  // patches), its colour into giant_food's code, then the item's four glyphs into characters
  // $46-$49 and their mask at $40A8: a bit pair is 11 where the picture's pair is empty.
  function build_giant_food(r) {
    let a, x = M[0x6A], y;
    if (!(x & 0x80)) {
      M[0x2AE9] = M[0xA81F + x];
      M[0x40] = M[0xA815 + x]; M[0x41] = M[0xA81A + x];
      const p = zp16(0x40);
      for (y = 0; y < 256; y++) M[0x7D00 + y] = peek(p + y);
      a = x;
      if (a !== 0) {
        a = 0;                                     // TYA with Y = 0
        for (y = 0; y < 128; y++) M[0x7D00 + y] = a;
        if (x === 1) for (y = 7; y >= 0; y--) { M[0x7D37 + y] = M[0x35A8 + y]; M[0x7D76 + y] = M[0xA420 + y]; }
      }
    }
    M[0x43] = 0;
    x = M[0x68];
    a = M[0xA892 + x];
    let c = 0;
    a = (a << 1) & 255;                            // the first ASL's carry is dropped
    for (let i = 0; i < 4; i++) { c = a >> 7; a = (a << 1) & 255; const h = M[0x43]; M[0x43] = ((h << 1) | c) & 255; c = h >> 7; }
    let s = adc(a, 0xE0, c); M[0x42] = s.a;
    s = adc(M[0x43], 0x9A, s.c); M[0x43] = s.a;
    const q = zp16(0x42);
    for (y = 0x1F; y >= 0; y--) {
      a = peek(q + y);
      M[0x4230 + y] = a;
      M[0x40] = y;
      M[0x41] = 0;
      for (x = 4; x !== 0; x--) {
        M[0x41] = (M[0x41] << 2) & 255;
        let yy = 3;
        if (a & 0x80) yy = 0;
        a = (a << 1) & 255;
        c = a >> 7;
        if (a & 0x80) yy = 0;
        a = (a << 1) & 255;
        M[0x41] |= yy;
      }
      a = M[0x41];
      M[0x40A8 + y] = a;
    }
    return regs(r, { a, x: 0, y: 0xFF }, { c, z: 0, n: 1 });   // the carry is the last ASL's
  }
  if (!P.build_giant_food) P.build_giant_food = build_giant_food;
  // $1621: the timer ran out a second time: tune $43, the first two object slots burst, a Baron
  // for each player at a random corner, the tune waited for, tune $27, the timer reloaded.
  P.barons_appear = function* (r) {
    let a, x, y;
    r = yield* P.play_tune(regs(r, { y: 0x43 }));
    r = yield* P.clear_first_objects(r);
    M[0x58] = 0xFF; M[0x58FF] = 0;
    for (x = 1; x >= 0; x--) {
      M[0xA9D6 + x] = 0; M[0xA9C4 + x] = 0; M[CARGO + x] = 0; M[WAS + x] = 0;
      r = P.random(regs(r, { a: 0, x }));
      y = r.a & 1; a = M[0xA777 + y]; M[COL + x] = a; M[0x02 + x] = a;
      r = P.random(regs(r, { a, x, y }));
      y = r.a & 1; a = M[0xA779 + y]; M[ROW + x] = a; M[0x04 + x] = a;
      a = M[STATE + x];
      if (a !== 0) { a = 0x3A; M[TYPE + x] = a; }
    }
    r = yield* P.redraw_until_free(regs(r, { a, x: 0xFF, y }, nz(0xFF)));
    for (x = 1; x >= 0; x--) {
      a = M[STATE + x];
      if (a === 0) continue;
      M[COL + x] = M[0x02 + x]; M[ROW + x] = M[0x04 + x];
      a = ((x << 1) + 0x2E) & 255; M[TYPE + x] = a;
    }
    M[0x2B] = 0xFF;
    M[0x2D] = 0;
    while (M[0xA4] !== 0) yield;                   // b_1684
    r = yield* P.play_tune(regs(r, { a: 0, x: 0, y: 0x27 }, nz(0)));
    a = M[0x2C]; M[0x2A] = a;                      // j_168F
    const s = dec(0x37);
    return regs(r, { a }, nz(s));
  };
  // $16E4: every enemy in an ordinary state gets the value at $16EF ($FF: angry; 0 when
  // check_deaths calms them) in its fast flag.
  P.enemies_angry = function (r) {
    let a = r.a, c = r.c;
    for (let x = 5; x >= 0; x--) {
      a = M[0xB4 + x];
      if (a === 0) continue;
      c = cmp(a, 0x0B).c;
      if (a >= 0x0B) continue;
      a = M[0x16EF]; M[0x872A + x] = a;
    }
    return regs(r, { a, x: 0xFF }, { c, z: 0, n: 1 });
  };

  // --- drop_in_enemies ($17BE), actors_to_sprites ($1805) ----------------------------------------
  // The round's start: the enemies drop from the top to their places, two pixels a double frame
  // for 22 double frames; those that have arrived count their dropping flag down.
  P.drop_in_enemies = function* (r) {
    let a, x;
    for (x = 5; x >= 0; x--) { M[0x8892 + x] = M[0xC4 + x]; M[0xC4 + x] = 0x15; M[0x85C2 + x] = 0; }
    M[0x11] = 0x16;
    do {
      r = yield* P.wait_frame(r);
      r = yield* P.wait_frame(r);
      r = P.actors_to_sprites(r);
      for (x = 7; x !== 1; x = (x - 1) & 255) {
        a = M[STATE + x];
        if (a === 0) continue;
        M[0x12] = x;
        r = P.idle_animation(regs(r, { a, x }, nz(a)));
        x = M[0x12];
        a = M[AY + x];
        if (a === M[0x8890 + x]) { dec(0x85C0 + x); continue; }
        inc(AY + x);
        if (inc(AY + x) === 0) dec(0x85C0 + x);     // the BNE after the second INC
      }
      a = dec(0x11);
    } while (a !== 0);
    return regs(r, { a: 0, x: 1 }, nz(0));
  };
  // $1805 (interrupt side): the eight actors to the VIC: position, colour (the base colour while
  // the fast flag is set in a state 1-$10), and the shape, base plus frame, in both pointer tables.
  P.actors_to_sprites = function (r) {
    const c = io();
    let a, x, y = 0x0E, s = { c: r.c };
    for (x = 7; x >= 0; x--, y -= 2) {
      a = M[AX + x]; c.vicWrite(y, a);
      a = M[AY + x]; c.vicWrite(y + 1, a);
      a = M[0x8548 + x]; c.vicWrite(0x27 + x, a);
      a = M[STATE + x];
      if (a !== 0 && a < 0x11) {
        a = M[0x8728 + x];
        if (a !== 0) { a = M[0x8570 + x]; c.vicWrite(0x27 + x, a); }
      }
      a = M[0x8520 + x] & 0x1F; M[0x8520 + x] = a;
      s = adc(a, M[0x8598 + x], 0); a = s.a;
      M[0x53F8 + x] = a; M[0x57F8 + x] = a;
    }
    return regs(r, { a, x: 0xFF, y: 0xFE }, { c: s.c, z: 0, n: 1 });
  };

  // --- kill_enemy ($1A6F), sky_flash ($1AB6), clear_first_objects ($1AE8), redraw_until_free ($1B02)
  // Enemy X is beaten: its kind remembered, state $0B with rank 9, one off enemies_left and a
  // random arc.
  P.kill_enemy = function (r) {
    let x = r.x & 255, a;
    a = M[0xB4 + x];
    if (a === 0x0A) a = M[0x87A2 + x];
    if (a !== 0x0D) M[0x8842 + x] = a;
    a = 0x0B; M[0xB4 + x] = a;
    dec(0x4A);
    r = P.random(regs(r, { a, x }));
    a = ((r.a & 7) + 1) & 255; M[0x87A2 + x] = a;
    r = P.random(regs(r, { a, x }));
    a = ((r.a & 7) + 1) & 255; M[0x87CA + x] = a; M[0x886A + x] = a;
    r = P.random(regs(r, { a, x }));
    a = r.a & 1; M[0x87F2 + x] = a;
    M[0x881A + x] = 7; M[0x8892 + x] = 9;
    a = 0x0E; M[0x854A + x] = a;
    return regs(r, { a, x }, { c: r.c, ...nz(a) });   // the carry is the third random's
  };
  // $1AB6: the sky flash: the border and background flipped four times, five frames apart, then
  // the giant falling block at row 2, a random column from $16.
  P.sky_flash = function* (r) {
    const c = io();
    let a, x;
    inc(0x37);
    r = yield* P.clear_first_objects(r);
    x = 4; M[0x593F] = x;
    do {
      a = c.vicRead(0x20) ^ 7;
      c.vicWrite(0x20, a); c.vicWrite(0x21, a);
      r = yield* P.wait_5(regs(r, { a, x }, nz(a)));
      x--;
    } while (x !== 0);
    a = 0x46; M[TYPE] = a; M[TYPE + 1] = a;
    a = 2; M[ROW] = a;
    r = P.random(regs(r, { a, x }));
    a = ((r.a & 7) + 0x16) & 255; M[COL] = a;
    const s = dec(0x37);
    return regs(r, { a, x: 0 }, nz(s));
  };
  // $1AE8: burst what objects 0 and 1 hold (a bubble holding an enemy keeps its type as the
  // remembered one), then redraw until both slots are free.
  P.clear_first_objects = function* (r) {
    let a = r.a;
    for (let x = 1; x >= 0; x--) {
      a = M[TYPE + x];
      if (a & 0x80) continue;
      if (a < 0x18 || a >= 0x24) a = 0;
      M[WAS + x] = a;
      a = 0x3A; M[TYPE + x] = a;
    }
    return yield* P.redraw_until_free(regs(r, { a, x: 0xFF }, { z: 0, n: 1 }));
  };
  // $1B02: draw the objects and flip until object slots 0 and 1 are both free, then scrub the
  // back buffer.
  P.redraw_until_free = function* (r) {
    r = P.draw_objects(r);
    for (;;) {
      r = yield* P.flip_buffers(r);
      r = P.print_scores(r);
      let a = M[TYPE];
      if (a & 0x80) {
        a = M[TYPE + 1];
        if (a & 0x80) return P.scrub_back_buffer(regs(r, { a }, nz(a)));
      }
      r = P.draw_objects(regs(r, { a }, nz(a)));
    }
  };

  // --- scroll_in_round ($37C9), round_number_glyphs ($3860), scroll_up_row ($38E9) ---------------
  // The new round scrolls in from below a row a frame: three blank rows (the old bottom row's
  // characters below $10 turned to $0E, or $20 for $0D), four rows with the top wall, then the 25
  // rows of the layout from $5400, with split_line brought down eight lines a row.
  P.scroll_in_round = function* (r) {
    let a, x, y;
    M[0x02] = 0; M[0x03] = 0x54;
    dec(0x10);
    for (x = 3; x !== 0; x--) {
      r = yield* P.scroll_up_row(regs(r, { x }));
      for (y = 0x1F; y >= 0; y--) {
        a = M[0x5398 + y];
        if (a < 0x10) a = a === 0x0D ? 0x20 : 0x0E;
        M[0x53C0 + y] = a;
      }
      a = M[0x501E]; M[0x53C0] = a; M[0x53DE] = a;
      a = M[0x501F]; M[0x53C1] = a; M[0x53DF] = a;
    }
    M[0x20] = 0xF2;
    for (x = 4; x !== 0; x--) {
      r = yield* P.scroll_up_row(regs(r, { x }));
      const p = zp16(0x02);
      for (y = 0x1D; y !== 0; y--) M[0x53C0 + y] = M[(p + y) & 0xFFFF];
      let s = adc(M[0x5050], 5, 0); a = s.a; M[0x53C0] = a; M[0x53DE] = a;
      s = adc(a, 1, s.c); a = s.a; M[0x53C1] = a; M[0x53DF] = a;
      M[0x20] = (M[0x20] - 8) & 255;
    }
    for (x = 0x19; ;) {
      r = yield* P.scroll_up_row(regs(r, { x }));
      const p = zp16(0x02);
      for (y = 0x1F; y >= 0; y--) M[0x53C0 + y] = M[(p + y) & 0xFFFF];
      const s = adc(M[0x02], 0x28, 0); M[0x02] = s.a; if (s.c) inc(0x03);
      a = (M[0x20] - 8) & 255; M[0x20] = a;
      x--;
      if (x === 0) break;
    }
    inc(0x10);
    return P.round_number_glyphs(regs(r, { a, x: 0, y: 0xFF }, nz(0)));
  };
  // $3860: the two characters of the round number at the top left: the wall corner from the
  // pattern character $5050 names, the tens and units from the small digit shapes.
  P.round_number_glyphs = function (r) {
    let a, y, p;
    M[0x0A] = 0x40;
    a = (M[0x5050] << 3) & 255; M[0x09] = a;
    for (y = 5; y >= 0; y--) M[0x40D0 + y] = 0;
    p = zp16(0x09);
    M[0x40D6] = M[(p + 6) & 0xFFFF]; M[0x40D7] = M[(p + 7) & 0xFFFF];
    M[0x40DE] = M[(p + 0x0E) & 0xFFFF]; M[0x40DF] = M[(p + 0x0F) & 0xFFFF];
    y = (M[0x10] + 1) & 255; a = y;
    if (a === 0x64) { y = 0x0A; a = 0x0B; }
    else { y = 0; while (a >= 0x0A) { a -= 0x0A; y = (y + 1) & 255; if (y === 0) break; } }
    // b_38A5
    const units = a;
    M[0xA9AF] = a;
    M[0xA9AE] = y;
    if (y !== 0) {
      M[0x09] = M[0xA83C + y]; M[0x0A] = M[0xA848 + y];
      p = zp16(0x09);
      for (y = 4; y >= 0; y--) M[0x40D0 + y] = M[(p + y) & 0xFFFF];
    }
    y = units;
    M[0x09] = M[0xA83C + y]; M[0x0A] = M[0xA848 + y];
    p = zp16(0x09);
    for (y = 4; y >= 0; y--) { a = M[(p + y) & 0xFFFF]; M[0x40D8 + y] = a; }
    M[0x5000] = 0x1A; y = 0x1B; M[0x5001] = y;
    return regs(r, { a, y }, nz(y));
  };
  // $38E9: a frame, then rows 1-24 of the 32-column playfield up a row, the round number's
  // glyphs rebuilt after the first.
  P.scroll_up_row = function* (r) {
    let a, y;
    r = yield* P.wait_frame(r);
    M[0x42] = 0; M[0x40] = 0x28; M[0x41] = 0x50; M[0x43] = 0x50;
    for (y = 0x1F; y >= 0; y--) { a = M[0x5028 + y]; M[0x5000 + y] = a; }
    r = P.round_number_glyphs(regs(r, { a, y: 0xFF }, nz(0xFF)));
    const x0 = r.x & 255;
    M[0x44] = x0;
    for (let x = 0x17; x !== 0; x--) {
      a = M[0x40]; M[0x42] = a;
      y = M[0x41]; M[0x43] = y;
      const s = adc(a, 0x28, 0); M[0x40] = s.a; if (s.c) inc(0x41);
      const p = zp16(0x40), q = zp16(0x42);
      for (y = 0x1F; y >= 0; y--) { a = M[(p + y) & 0xFFFF]; M[(q + y) & 0xFFFF] = a; }
    }
    return regs(r, { a, x: M[0x44], y: 0xFF }, nz(M[0x44]));
  };

  // --- start_round ($392A) ----------------------------------------------------------------------
  // The round timer, the tile glyphs to the low characters, the picture's colours, the solid
  // cells into the collision map, the round's enemy list into the actors, the wrap rows, and the
  // special-bubble spawner from the round's flags.
  P.start_round = function* (r) {
    let a, x, y;
    a = M[0x10];
    x = 0x1E;
    if (a === 0x37) x = 0x0A;
    if (a >= 0x38) x = 0x14;
    M[0x2A] = x; M[0x2C] = x;
    for (x = 0x27; x >= 0; x--) { a = M[0x40A8 + x]; M[0x4080 + x] = a; M[0x4880 + x] = a; }
    for (let p = 0x5000; p < 0x5400; p++) {
      a = M[p];
      if (a < 0x1A && a >= 0x15) M[p] = (a - 5) & 255;
    }
    M[0x02] = 0; M[0x03] = 0x54;
    r = yield* P.wait_frame(regs(r, { a, x: 0, y: 0 }));
    M[0x1C] = M[0x1D]; M[0x1E] = M[0x1F];
    r = yield* P.wait_frame(regs(r, { a: M[0x1F] }));
    for (let i = 0; i < 0x400; i++) {
      a = M[0x5000 + i];
      if (a < 0x20 && a >= 0x10 && a < 0x1E) M[0x8500 + i] |= 0x80;
    }
    M[0x02] = 0; M[0x04] = 0; M[0x03] = 0x54; M[0x05] = 0x89;
    M[0x02] = 0x51; M[0x03] = 0xAE;
    x = M[0x10];
    y = 0;
    while (x !== 0) {                              // b_39B4: skip the earlier rounds' enemy lists
      y = 0;
      let p = zp16(0x02);
      while (M[(p + y) & 0xFFFF] !== 0) { y = (y + 3) & 255; if (y === 0) break; }
      y = (y + 1) & 255;
      const s = adc(y, M[0x02], 0); M[0x02] = s.a; if (s.c) inc(0x03);
      x--;
    }
    r = P.clear_enemies(regs(r, { a: M[0x02], x, y }));
    a = r.a & 255; x = r.x & 255;
    M[0x4A] = a; y = a; M[0x8638] = a; M[0x8639] = a; M[0x04] = y;
    for (;;) {                                     // j_39DB: one three-byte record an enemy
      const p = zp16(0x02);
      a = M[(p + y) & 0xFFFF];
      if (a === 0) break;
      x = M[0x04];
      M[0x09] = a;
      y = (y + 1) & 255; M[0x0A] = M[(p + y) & 0xFFFF];
      y = (y + 1) & 255; a = M[(p + y) & 0xFFFF]; M[0x0B] = a;
      M[0x863A + x] = ((a & 0x3F) << 1) & 255;
      a = ((M[0x09] & 7) + 2) & 255; M[0xB4 + x] = a;
      let s = adc(M[0x09] & 0xF8, 0x14, 0); M[0xBC + x] = s.a;
      s = adc(M[0x0A] & 0xF8, 0x15, s.c); M[0xC4 + x] = s.a;
      M[0x0A] = ((M[0x0A] & 7) << 1) & 255;
      a = M[0x0B] & 0x80;
      let c = s.c;
      let t = ((a << 1) & 255) | c; c = a >> 7; a = t;
      t = ((a << 1) & 255) | c; a = t;
      a |= M[0x0A]; M[0x85EA + x] = a;
      a = M[0x0B] & 0x40;
      if (a !== 0) { const k = M[0xB4 + x]; a = M[0xAB79 + k]; x = M[0x04]; }
      M[0x8522 + x] = a;
      const k = M[0xB4 + x];
      const colour = M[0xAB61 + k], sprite = M[0xAB69 + k];
      r = P.random(regs(r, { a: sprite, x: k, y }));
      const period = ((r.a & 0x1F) + M[0xAB71 + k]) & 255;
      a = M[0xAB79 + k];
      x = M[0x04];
      M[0x8752 + x] = a;
      a = (a - 1) & 255; M[0x877A + x] = a;
      M[0x868A + x] = period; M[0x8662 + x] = period;
      M[0x859A + x] = sprite;
      a = colour; M[0x854A + x] = a;
      y = (y + 1) & 255;
      inc(0x04); inc(0x4A);
    }
    for (x = 0x27; x >= 0; x--) {                  // j_3A6C: the wrap rows
      a = M[0x8500 + x]; M[0x84D8 + x] = a; M[0x84B0 + x] = a; M[0x8488 + x] = a;
      a = M[0x88C0 + x]; M[0x88E8 + x] = a; M[0x8910 + x] = a; M[0x8938 + x] = a;
    }
    x = M[0x10];
    a = M[0xB631 + x]; M[0x02] = a;
    a = 0x2C;
    const bit = M[0x02] & 1; M[0x02] >>= 1;
    let f = { c: bit, ...nz(M[0x02]) };
    if (bit) {
      y = 0x4C;
      r = P.random(regs(r, { a, x, y }));
      if ((r.a & 1) === 0) {
        y = 0x2C;
        r = P.random(regs(r, { a: r.a & 1, x, y }));
        a = r.a & 3; M[0x4C] = a;
      }
      M[0x0C9C] = y;
      a = M[0x02] & 7; M[0x0CC2] = a;
      a = 0x20; f = nz(a);
    }
    M[0x0A38] = a;
    return regs(r, { a, x, y }, f);
  };

  // --- hurry_up ($3AB8) -------------------------------------------------------------------------
  // The HURRY UP banner scrolled up the front screen a row a frame, its glyphs merged with the
  // background; at row 11 flashed six times with tune $3C, the tune waited for, tune $27; then on
  // to the top and everything restored. The 256 bytes of draw-handler code at $3CB2 are parked in
  // the back screen's first page (the page byte patched into three operands) and put back at
  // the end, when that page is restored from the clean copy.
  P.hurry_up = function* (r) {
    let a, x, y;
    r = yield* P.wait_frame(r);
    a = M[0x30]; M[0x3BF1] = a; M[0x3BFA] = a; M[0x3AF0] = a;
    let s = adc(a ^ 4, 3, 0); M[0x41] = s.a;
    s = adc(M[0x2F], 1, s.c); a = s.a; M[0x24] = a;
    a ^= 8; M[0x19] = a;
    M[0x40] = 0xCC; M[0x3E] = 0xCC;
    M[0x18] = 0xB8; M[0x23] = 0xB8;
    a = 0xDB; M[0x3F] = a;
    r = P.enemies_angry(regs(r, { a }, nz(a)));
    x = (r.x + 1) & 255;
    const park = M[0x3AEF] | (M[0x3AF0] << 8);
    do { a = M[0x3CB2 + x]; M[(park + x) & 0xFFFF] = a; x = (x + 1) & 255; } while (x !== 0);
    M[0x42] = 0x19;
    for (x = 8, y = 0x30; x >= 0; x--, y--) { M[0x3CC4 + x] = peek(zp16(0x40) + y); M[0x3CCD + x] = peek(zp16(0x3E) + y); }
    for (;;) {                                     // j_3B0A: a row
      x = 0; M[0x3D] = 0; M[0x3C] = 0;
      do {                                         // b_3B10: one banner cell's two glyph sets
        y = M[0x3D];
        a = peek(zp16(0x3E) + y); M[0x3CBB + y] = a;
        a = peek(zp16(0x40) + y); M[0x3CB2 + y] = a;
        y = a;
        M[0x44] = M[0x0200 + y];
        M[0x45] = (M[0x0300 + y] | M[0x2F]) ^ 8;
        const g = zp16(0x44);
        for (y = 0; y < 8; y++, x++) {
          a = M[(g + y) & 0xFFFF] | M[0xADB1 + x]; M[0x3CD6 + x] = a;
          a = (a & M[0xADF9 + x]) | M[0xADB1 + x]; M[0x3D1E + x] = a;
        }
        inc(0x3D);
      } while (x !== 0x48);
      r = yield* P.wait_frame(regs(r, { a, x, y }));
      for (y = 8; y >= 0; y--) { a = (y + 0x37) & 255; poke(zp16(0x40) + y, a); poke(zp16(0x3E) + y, 0x0F); }
      for (x = 8, y = 0x30; x >= 0; x--, y--) {
        poke(zp16(0x40) + y, M[0x3CC4 + x]);
        poke(zp16(0x3E) + y, M[0x3CCD + x]);
        M[0x3CCD + x] = M[0x3CBB + x];
        M[0x3CC4 + x] = M[0x3CB2 + x];
      }
      let d = zp16(0x18);
      for (y = 0x47; y >= 0; y--) M[(d + y) & 0xFFFF] = M[0x3CD6 + y];
      a = M[0x42];
      if (a === 0x0C) {
        d = zp16(0x18);
        for (y = 0x47; y >= 0; y--) M[(d + y) & 0xFFFF] = M[0x3D1E + y];
        r = yield* P.play_tune(regs(r, { a, x: 0xFF, y: 0x3C }));
        for (x = 6; x !== 0; x--) {
          r = yield* P.wait_frames(regs(r, { a: 8, x }));
          a = M[0x3BA1] ^ 3; M[0x3BA1] = a;
          for (y = 8; y >= 0; y--) poke(zp16(0x3E) + y, a);
        }
        while (M[0xA4] !== 0) yield;               // b_3BB1
        r = yield* P.play_tune(regs(r, { a: 0, x: 0, y: 0x27 }, nz(0)));
      }
      s = sbc(M[0x40], 0x28, 1); M[0x40] = s.a; M[0x3E] = s.a;
      if (!s.c) { dec(0x41); dec(0x3F); }
      if (dec(0x42) === 0) break;
    }
    r = yield* P.wait_frame(r);
    for (x = 8, y = 0x30; x >= 0; x--, y--) { poke(zp16(0x40) + y, M[0x3CC4 + x]); poke(zp16(0x3E) + y, M[0x3CCD + x]); }
    const d = zp16(0x18), src = zp16(0x23);
    for (y = 0x47; y >= 0; y--) { a = M[(src + y) & 0xFFFF]; M[(d + y) & 0xFFFF] = a; }
    const parkA = M[0x3BF0] | (M[0x3BF1] << 8), page = M[0x3BF9] | (M[0x3BFA] << 8);
    x = 0;
    do {
      a = M[(parkA + x) & 0xFFFF]; M[0x3CB2 + x] = a;
      a = M[0x8B00 + x]; M[(page + x) & 0xFFFF] = a;
      x = (x - 1) & 255;
    } while (x !== 0);
    return P.draw_panel(regs(r, { a, x: 0, y: 0xFF }, nz(0)));
  };

  // --- round_banner ($3C01) ---------------------------------------------------------------------
  // The ROUND nn / READY overlay: nine characters composed from the digit glyphs over the
  // background of two playfield rows into $C0-$D1 (both character sets), then the text.
  P.round_banner = function* (r) {
    let a, x, y;
    a = 0x13; M[0xA9B0] = a;
    x = M[0xA9AE];
    if (x === 0) M[0xA9AE] = a;
    a = M[0x10];
    if (a === 0x63) { M[0xA9AE] = 1; a = 0; M[0xA9AF] = a; M[0xA9B0] = a; }
    a = 0x46; M[0x0A] = a; M[0x0C] = a;
    x = 0; M[0x09] = x; M[0x0B] = 0x48;
    do {
      y = M[0x519C + x]; M[0x02] = M[0x0200 + y]; M[0x03] = M[0x0300 + y] | 0x40;
      y = M[0x51EC + x]; M[0x04] = M[0x0200 + y]; M[0x05] = M[0x0300 + y] | 0x40;
      let v = M[0xA9A8 + x];
      let s = adc((v << 3) & 255, 0x90, (v >> 5) & 1); M[0x11] = s.a;
      s = adc(0, 0xFE, s.c); M[0x12] = s.a;
      v = M[0xAD15 + x];
      s = adc((v << 3) & 255, 0x90, (v >> 5) & 1); M[0x13] = s.a;
      s = adc(0, 0xFE, s.c); M[0x14] = s.a;
      const pa = zp16(0x02), pb = zp16(0x04), pd = zp16(0x09), pe = zp16(0x0B), pm = zp16(0x11), pf = zp16(0x13);
      for (y = 7; y >= 0; y--) {
        M[(pd + y) & 0xFFFF] = M[(pa + y) & 0xFFFF] | M[(pm + y) & 0xFFFF];
        a = M[(pb + y) & 0xFFFF] | M[(pf + y) & 0xFFFF]; M[(pe + y) & 0xFFFF] = a;
      }
      s = adc(M[0x09], 8, 0); M[0x09] = s.a;
      s = adc(M[0x0B], 8, s.c); a = s.a; M[0x0B] = a;
      x++;
    } while (x !== 9);
    for (x = 0x47; x >= 0; x--) { M[0x4E00 + x] = M[0x4600 + x]; a = M[0x4648 + x]; M[0x4E48 + x] = a; }
    r = yield* P.wait_frame(regs(r, { a, x: 0xFF, y: 0xFF }));
    a = 2; M[0xA9B1] = a;
    return P.print_string(regs(r, { a, x: 0xFD, y: 0xAC }, nz(0xAC)));
  };

  // --- build_round ($E000), draw_layout ($E09B) ----------------------------------------------
  // Build round `level` in the buffer at $5400: the buffer roles, the wall tile and its 2 by 2
  // block into both character sets, the two multicolours, the timers, then the layout unpacked
  // and drawn.
  P.build_round = function* (r) {
    let a, x, y;
    M[0x2F] = 0x48; M[0x30] = 0x54;
    r = yield* P.wait_frame(r);
    r = P.clear_back_screen(r);
    x = M[0x10];
    let s = adc(M[0x0200 + x], 0x6E, 0); M[0x18] = s.a;
    s = adc(M[0x0300 + x], 0xC2, s.c); M[0x19] = s.a;
    const t = zp16(0x18);
    for (y = 7; y >= 0; y--) { a = M[(t + y) & 0xFFFF]; M[0x40A8 + y] = a; M[0x48A8 + y] = a; }
    a = M[0xFF94 + x] & 0x7F;
    if (a < 0x64) {
      M[0x1B] = 0;
      let v = a << 5;                              // ASL, then four ASL/ROL pairs: bit 7 of A is clear
      M[0x1A] = (v + 0x0E) & 255;
      M[0x1B] = ((v >> 8) + 0xBB + ((v & 255) + 0x0E > 255 ? 1 : 0)) & 255;
      const g = zp16(0x1A);
      for (y = 0x1F; y >= 0; y--) { a = M[(g + y) & 0xFFFF]; M[0x40B0 + y] = a; M[0x48B0 + y] = a; }
    } else {
      for (y = 7; y >= 0; y--) {
        a = M[0x40A8 + y];
        M[0x40B0 + y] = a; M[0x40B8 + y] = a; M[0x40C0 + y] = a; M[0x40C8 + y] = a;
        M[0x48B0 + y] = a; M[0x48B8 + y] = a; M[0x48C0 + y] = a; M[0x48C8 + y] = a;
      }
    }
    y = 0xFF; M[0x2B] = y;
    y = 0; M[0x2D] = y;
    a = M[0xFF30 + x]; y = a;
    M[0x1D] = a >> 4; M[0x1F] = y & 0x0F;
    a = 0x1E; M[0x2A] = a; M[0x2C] = a;
    r = P.unpack_layout(regs(r, { a, x, y }, nz(a)));
    return P.draw_layout(r);
  };
  // $E09B: the unpacked layout at $8B00 into the screen at $5400: a set bit is the wall tile
  // ($15) with its shadow on the cells right ($0C blank, $0F over $0A/$0D, else $0E), below ($0A
  // blank, else $0D: the LDA #$0D hidden in the BIT at $E0EE) and diagonal ($0B); then the wall
  // blocks down both sides and a tidy of the top row.
  P.draw_layout = function (r) {
    let a, x, y;
    M[0x11] = 0; M[0x13] = 0; M[0x04] = 0;
    M[0x12] = 0x8B; M[0x14] = 0x8B;
    M[0x05] = 0x54;
    M[0x0A] = 0x19;
    do {
      x = 0;
      do {
        y = 0;
        M[0x07] = M[zp16(0x13)];
        M[0x31] = 8;
        do {
          const bit = M[0x07] >> 7; M[0x07] = (M[0x07] << 1) & 255;
          if (bit) {
            const p = zp16(0x04);
            y = x;
            M[(p + y) & 0xFFFF] = 0x15;
            y++;
            a = M[(p + y) & 0xFFFF];
            if (a === 0x20) a = 0x0C;
            else if (a === 0x0A || a === 0x0D) a = 0x0F;
            else a = 0x0E;
            M[(p + y) & 0xFFFF] = a;
            y = (x + 0x28) & 255;
            a = M[(p + y) & 0xFFFF];
            a = a === 0x20 ? 0x0A : 0x0D;
            M[(p + y) & 0xFFFF] = a;
            y++;
            M[(p + y) & 0xFFFF] = 0x0B;
          }
          x++;
        } while (dec(0x31) !== 0);
        if (inc(0x13) === 0) inc(0x14);
      } while (x !== 0x20);
      r = P.next_map_row(regs(r, { x }));
    } while (dec(0x0A) !== 0);
    M[0x02] = 0; M[0x04] = 0x1E; M[0x03] = 0x54; M[0x05] = 0x54;
    x = 0x0C;
    do {
      const pa = zp16(0x02), pb = zp16(0x04);
      M[pa] = 0x16; M[pb] = 0x16;
      M[(pa + 1) & 0xFFFF] = 0x17; M[(pb + 1) & 0xFFFF] = 0x17;
      M[(pa + 0x28) & 0xFFFF] = 0x18; M[(pb + 0x28) & 0xFFFF] = 0x18;
      M[(pa + 0x29) & 0xFFFF] = 0x19; M[(pb + 0x29) & 0xFFFF] = 0x19;
      M[(pa + 0x20) & 0xFFFF] = 0x20; M[(pa + 0x48) & 0xFFFF] = 0x20;
      const s = adc(M[0x02], 0x50, 0); M[0x02] = s.a; if (s.c) inc(0x03);
      r = P.next_map_row(regs(r, { x }));
      x = (r.x + 1) & 255;
      r = P.next_map_row(regs(r, { x }));
      x = r.x & 255;
    } while (x !== 0);
    const pa = zp16(0x02), pb = zp16(0x04);
    M[pa] = 0x16; M[pb] = 0x16;
    M[(pa + 1) & 0xFFFF] = 0x17; M[(pb + 1) & 0xFFFF] = 0x17;
    y = 0x20; M[(pa + 0x20) & 0xFFFF] = y;
    let c = r.c;
    for (x = 0x1F; x >= 0; x--) { a = M[0x5400 + x]; c = cmp(a, 0x0C).c; if (a === 0x0C) { a = 0x0E; M[0x5400 + x] = a; } }
    for (x = 8; x >= 0; x--) M[0x5800 + x] = 0;
    return regs(r, { a: 0, x: 0xFF, y }, { c, z: 0, n: 1 });
  };

  // --- build_air_currents ($E189), next_map_row ($E28C) -------------------------------------
  // The collision map $8500 filled with the round's air currents: every cell of a row gets the
  // low two bits of the row's fourth layout byte, then the record in air_current_data ($B695):
  // a byte with bit 7 set is "as round n" (start again with that round); else its length, then
  // rectangles (three bytes: direction and column, row and width, width and height) and, for a
  // byte with bit 7 clear in their place, the left half of every row mirrored onto the right
  // with left and right swapped.
  P.build_air_currents = function (r) {
    let a = M[0x10], x, y;
    for (;;) {                                     // j_E18B
      M[0x11] = a;
      M[0x02] = 0x95; M[0x03] = 0xB6;
      M[0x13] = 0; M[0x14] = 0x8B;
      x = M[0x11];
      r = P.unpack_layout(regs(r, { a, x }));
      y = 0;
      x = M[0x11];
      while (x !== 0) {                            // b_E1A8: skip the earlier rounds' records
        a = M[zp16(0x02)];
        if (a & 0x80 || a === 0) a = 1;
        const s = adc(a, M[0x02], 0); M[0x02] = s.a; if (s.c) inc(0x03);
        x--;
      }
      a = M[zp16(0x02)];
      if (!(a & 0x80)) break;
      a &= 0x7F;
    }
    M[0x11] = a;
    x = 0x18;
    M[0x04] = 0; M[0x05] = 0x85;
    do {
      y = 3;
      a = y & M[(zp16(0x13) + y) & 0xFFFF];
      const p = zp16(0x04);
      for (y = 0x1F; y >= 0; y--) M[(p + y) & 0xFFFF] = a;
      const s = adc(M[0x13], 4, 0); M[0x13] = s.a; if (s.c) inc(0x14);
      r = P.next_map_row(regs(r, { a, x, y: 0xFF }));
      x = r.x & 255; a = r.a & 255;
    } while (!(x & 0x80));
    y = 0;
    a = M[zp16(0x02)];
    if (a === 0) return regs(r, { a, x, y }, nz(0));
    y = 1;
    for (;;) {                                     // j_E1F3
      const p = zp16(0x02);
      a = M[(p + y) & 0xFFFF];
      if (a & 0x80) {
        x = a;
        M[0x0A] = (a >> 5) & 3;
        M[0x04] = x & 0x1F;
        y++;
        a = M[(p + y) & 0xFFFF]; x = a;
        M[0x05] = (a >> 2) & 0xFE;
        M[0x06] = x & 7;
        y++;
        a = M[(p + y) & 0xFFFF]; x = a;
        y++;
        M[0x0B] = y;
        M[0x06] = ((M[0x06] << 2) | (a >> 6)) & 255;
        M[0x07] = x & 0x1F;
        x = M[0x05];
        const s = adc(M[0xAC09 + x], M[0x04], 0); M[0x04] = s.a;
        M[0x05] = adc(M[0xAC0A + x], 0x85, s.c).a;
        x = M[0x07];
        do {
          const q = zp16(0x04);
          a = M[0x0A];
          for (y = M[0x06]; y >= 0; y--) M[(q + y) & 0xFFFF] = a;
          r = P.next_map_row(regs(r, { a, x, y: 0xFF }));
          x = r.x & 255; a = r.a & 255;
        } while (!(x & 0x80));
        y = M[0x0B];
      } else {
        y++;
        M[0x0B] = y;
        M[0x04] = 0; M[0x05] = 0x85;
        x = 0x18;
        do {
          M[0x06] = 0; M[0x07] = 0x1F;
          const q = zp16(0x04);
          do {
            y = M[0x06];
            a = M[(q + y) & 0xFFFF];
            if (a & 1) a ^= 2;
            y = M[0x07];
            M[(q + y) & 0xFFFF] = a;
            dec(0x07); inc(0x06);
          } while (y !== 0x10);
          r = P.next_map_row(regs(r, { a, x, y }));
          x = r.x & 255; a = r.a & 255;
        } while (!(x & 0x80));
        y = M[0x0B];
      }
      // j_E282
      if (y === M[0x11]) return regs(r, { a, x, y }, cmp(y, M[0x11]));
    }
  };
  // $E28C: 40 on to the pointer at $04/$05, X down one.
  P.next_map_row = function (r) {
    const s = adc(M[0x04], 0x28, 0);
    M[0x04] = s.a;
    if (s.c) inc(0x05);
    const x = (r.x - 1) & 255;
    return regs(r, { a: s.a, x }, { c: s.c, ...nz(x) });
  };

  // --- unpack_layout ($E299) and its helpers -------------------------------------------------
  // Round X's layout into $8B00 from the packed layouts at $C5F2 (plain M here; the game banks
  // the I/O out): 46 bytes a round whose level_pattern byte has bit 7 set (a half layout, the
  // right half the mirror of the left), 92 otherwise.
  P.unpack_layout = function (r) {
    let x = r.x & 255;
    M[0x3C] = x;
    M[0x40] = 0xF2; M[0x41] = 0xC5;
    if (x !== 0) {
      x = 0;
      do {
        let a = 0x2E;
        if (!(M[0xFF94 + x] & 0x80)) a = 0x5C;
        const s = adc(a, M[0x40], 0); M[0x40] = s.a; if (s.c) inc(0x41);
        x++;
      } while (x !== M[0x3C]);
    }
    return P.unpack_layout_here(regs(r, { x }, cmp(x, M[0x3C])));
  };
  // $E2C3: the layout at $40/$41 for round X: the row unpacker's JSR patched from the tables at
  // $E36A/$E36C, the top and bottom rows from level_gaps, then 23 rows.
  P.unpack_layout_here = function (r) {
    let a, x = r.x & 255, y = 0;
    if (M[0xFF94 + x] & 0x80) y = 1;
    M[0xE30C] = M[0xE36A + y]; M[0xE30D] = M[0xE36C + y];
    a = M[0xC58E + x]; M[0x3D] = a;
    r = P.unpack_gap_row(regs(r, { a, x: 0, y }));
    r = P.unpack_gap_row(regs(r, { x: 0x60 }));
    a = M[0x3D] & 3; M[0x3E] = a;
    M[0x3D] >>= 2;
    M[0x8B03] = (M[0x8B03] & 0xFC) | M[0x3E];
    a = (M[0x8B63] & 0xFC) | M[0x3D]; M[0x8B63] = a;
    x = 0; y = 0;
    const target = M[0xE30C] | (M[0xE30D] << 8);
    const second = target === 0xE31F ? P.unpack_full_row : target === 0xE32A ? P.unpack_mirror_row : null;
    if (!second) throw new Error('unpack_layout_here: the row unpacker at $' + target.toString(16) + ' is not known');
    do {
      r = P.unpack_full_row(regs(r, { a, x, y }));
      r = second(regs(r, { x: r.x, y: r.y }));
      x = r.x & 255; y = r.y & 255;
      a = M[0x8B00 + x] | 0xC0; M[0x8B00 + x] = a;
    } while (x !== 0x5C);
    return regs(r, { a: 0x35, x, y }, { c: 1, ...nz(0x35) });   // CPX #$5C equal, then LDA #$35
  };
  // $E31F: two layout bytes to the row.
  P.unpack_full_row = function (r) { return P.unpack_byte(P.unpack_byte(r)); };
  // $E322: one layout byte to $8B04,X; Y and X on.
  P.unpack_byte = function (r) {
    let x = r.x & 255, y = r.y & 255;
    const a = M[(zp16(0x40) + y) & 0xFFFF];
    M[0x8B04 + x] = a;
    y = (y + 1) & 255; x = (x + 1) & 255;
    return regs(r, { a, x, y }, nz(x));
  };
  // $E32A: the row's first two bytes mirrored into its third and fourth, in reverse order.
  P.unpack_mirror_row = function (r) {
    r = P.reverse_bits(r);
    M[0x8B04 + (r.x & 255)] = r.a;
    r = P.reverse_bits(r);
    M[0x8B02 + (r.x & 255)] = r.a;
    return r;
  };
  // $E337: the byte at $8B02,X with its bits reversed, X on ($3D and $3E are left at 0).
  P.reverse_bits = function (r) {
    let x = r.x & 255, a = 0;
    M[0x3D] = M[0x8B02 + x];
    M[0x3E] = 1;
    for (;;) {
      const c = M[0x3D] >> 7; M[0x3D] = (M[0x3D] << 1) & 255;
      if (c) a |= M[0x3E];
      const c2 = M[0x3E] >> 7; M[0x3E] = (M[0x3E] << 1) & 255;
      if (c2) break;
    }
    x = (x + 1) & 255;
    return regs(r, { a, x }, { c: 1, ...nz(x) });
  };
  // $E34E: a top or bottom row's four bytes as two halves from two bits of the gap code.
  P.unpack_gap_row = function (r) {
    r = P.unpack_gap_half(regs(r, { y: 1 }));
    return P.unpack_gap_half(regs(r, { y: 2 }));
  };
  // $E355: one half: the next bit of the code; clear picks index 0, set keeps Y.
  P.unpack_gap_half = function (r) {
    let x = r.x & 255, y = r.y & 255, a;
    const c = M[0x3D] & 1; M[0x3D] >>= 1;
    if (!c) y = 0;
    a = M[0xE36E + y]; M[0x8B00 + x] = a; x = (x + 1) & 255;
    a = M[0xE371 + y]; M[0x8B00 + x] = a; x = (x + 1) & 255;
    return regs(r, { a, x, y }, { c, ...nz(x) });
  };

  // --- intro_step_armed ($E4DA), intro_step ($E4DF), float_down ($E554), trace_line ($E5C4) ------
  // Arm intro_step's tail (the RTS at $E539 becomes LDA #imm) and run it once.
  P.intro_step_armed = function* (r) {
    M[0xE539] = 0xA9;
    return yield* P.intro_step(regs(r, { a: 0xA9 }, nz(0xA9)));
  };
  // $E4DF: a frame of the players in their bubbles: each live player's four bubble sprites round
  // its position (with the X high bits), all eight coloured; armed, the shapes $D1-$D8 too.
  P.intro_step = function* (r) {
    const c = io();
    let a, x, y;
    r = yield* P.wait_frame(r);
    for (x = 0x10; x >= 0; x--) c.vicWrite(x, 0);
    a = 0;
    for (x = 1; x >= 0; x--) {
      y = M[0x0200 + x];
      a = M[STATE + x];
      if (a === 0) continue;
      let s = sbc(M[AX + x], 0x0A, 1); a = s.a;
      c.vicWrite(y, a); c.vicWrite(y + 4, a);
      s = adc(a, 0x17, s.c); a = s.a;
      c.vicWrite(y + 2, a); c.vicWrite(y + 6, a);
      if (s.c) { a = c.vicRead(0x10) | M[0xE552 + x]; c.vicWrite(0x10, a); }
      a = (M[AY + x] - 8) & 255;
      c.vicWrite(y + 1, a); c.vicWrite(y + 3, a);
      a = (a + 0x15) & 255;
      c.vicWrite(y + 5, a); c.vicWrite(y + 7, a);
    }
    for (x = 3; x >= 0; x--) { c.vicWrite(0x27 + x, 5); a = 3; c.vicWrite(0x2B + x, a); }
    r = regs(r, { a, x: 0xFF, y }, { z: 0, n: 1 });
    if (M[0xE539] !== 0xA9) return r;              // the RTS
    a = M[0xE53A];
    let s = { c: 0 };
    for (x = 3; x >= 0; x--) {                     // intro_shapes $E53B
      M[0x53F8 + x] = a; M[0x57F8 + x] = a;
      s = adc(a, 4, 0); a = s.a;
      M[0x53FC + x] = a; M[0x57FC + x] = a;
      s = sbc(a, 4, s.c); a = s.a;
    }
    return regs(r, { a, x: 0xFF }, { c: s.c, z: 0, n: 1 });
  };
  // $E554: the players float to their starting places: the tail disarmed, the path buffers at
  // $8B00-$8EFF cleared, a straight line traced for each live player, then both replayed a point
  // a frame; split_line cleared at the end.
  P.float_down = function* (r) {
    let a, x, y;
    M[0xE539] = 0x60;
    M[0x39] = 0;
    for (x = 0; x < 256; x++) { M[0x8B00 + x] = 0; M[0x8C00 + x] = 0; M[0x8D00 + x] = 0; M[0x8E00 + x] = 0; }
    for (x = 1; x >= 0; x--) {
      M[0x23] = M[AX + x]; M[0x24] = M[AY + x];
      a = M[STATE + x];
      if (a === 0) continue;
      a = 1; M[STATE + x] = a;
      M[0x38] = x;
      a = M[0xE5C0 + x];
      r = P.trace_line(regs(r, { a, x: M[0xE5C2 + x], y: 0xDD }));
      x = M[0x38];
    }
    for (;;) {                                     // b_E594
      y = M[0x39];
      a = M[0x8B00 + y] | M[0x8D00 + y];
      if (a === 0) break;
      a = M[0x8B00 + y];
      if (a !== 0) { M[AX] = a; M[AY] = M[0x8C00 + y]; }
      a = M[0x8D00 + y];
      if (a !== 0) { M[AX + 1] = a; M[AY + 1] = M[0x8E00 + y]; }
      r = yield* P.intro_step(regs(r, { a, y }, nz(a)));
      a = r.a & 255;
      if (inc(0x39) === 0) break;
    }
    M[0x20] = a;
    return regs(r, { a, y: M[0x39] }, nz(a));
  };
  // $E5C4: the points of a straight line from ($23,$24) to (X,Y) into the path buffer whose page
  // is A (X coordinates) and the page after (Y coordinates): Bresenham along the longer axis.
  P.trace_line = function (r) {
    let a, x, y;
    M[0x04] = r.x & 255; M[0x05] = r.y & 255;
    y = r.a & 255;
    M[0x40] = 0xFF; M[0x41] = 0xFF;
    for (x = 1; x >= 0; x--) {
      const s = sbc(M[0x23 + x], M[0x04 + x], 1);
      a = s.a;
      if (!s.c) { inc(0x40 + x); inc(0x40 + x); a = ((a ^ 0xFF) + 1) & 255; }
      M[0x42 + x] = a;
    }
    M[0x03] = y; y = (y + 1) & 255; M[0x05] = y;
    x = 0; y = 0;
    M[0x02] = 0; M[0x04] = 0;
    a = M[0x42];
    if (a >= M[0x43]) {
      a |= M[0x43];
      if (a === 0) return regs(r, { a, x, y }, { c: 1, ...nz(0) });
      M[0x44] = M[0x43];
      M[0x43] = M[0x42];
      M[0x11] = M[0x40]; M[0x12] = M[0x41];
      M[0x41] = x;
    } else {
      M[0x44] = a;
      M[0x11] = M[0x40]; M[0x12] = M[0x41];
      M[0x40] = x;
    }
    a = M[0x43]; M[0x45] = a;
    a >>= 1;
    let s;
    do {
      s = adc(a, M[0x44], 0); a = s.a;
      let minor = s.c;
      if (!minor) minor = cmp(a, M[0x45]).c;
      if (minor) {
        a = sbc(a, M[0x45], 1).a; M[0x42] = a;
        M[0x3C] = M[0x11]; a = M[0x12];
      } else {
        M[0x42] = a;
        M[0x3C] = M[0x40]; a = M[0x41];
      }
      a = (a + M[0x24]) & 255; M[0x24] = a;
      M[(zp16(0x04) + y) & 0xFFFF] = a;
      s = adc(M[0x3C], M[0x23], 0); a = s.a; M[0x23] = a;
      M[(zp16(0x02) + y) & 0xFFFF] = a;
      y = (y + 1) & 255;
      a = M[0x42];
    } while (dec(0x43) !== 0);
    return regs(r, { a, x, y }, { c: s.c, ...nz(0) });
  };

  // --- build_letter_bubbles ($E658), draw_extend_letters ($E6CD), draw_extend_column ($E6DC) -----
  // The glyphs of the five letter bubbles as 2 by 2 blocks at $4250: the wall-block background
  // ($4088, via the work space at $0108) masked by the bubble mask, the letter's picture ORed in,
  // ANDed with extend_mask; then characters $40-$5F copied to the second character set.
  P.build_letter_bubbles = function (r) {
    let a, x, y;
    M[0x02] = 0x50; M[0x03] = 0x42;
    for (x = 8; x !== 0; x--) {
      M[0x0107 + x] = M[0x4087 + x]; M[0x010F + x] = M[0x408F + x];
      M[0x0117 + x] = M[0x4097 + x]; M[0x011F + x] = M[0x409F + x];
    }
    do {
      const p = zp16(0x02);
      for (y = 0x1F; y >= 0; y--) M[(p + y) & 0xFFFF] = M[0x0108 + y];
      y = ((x << 2) + 0x18) & 255;
      M[0x40] = M[0xAA54 + y]; M[0x41] = M[0xAA8E + y];
      M[0x42] = M[0xAAC8 + y]; M[0x43] = M[0xAB02 + y];
      const g = zp16(0x40), m = zp16(0x42);
      for (y = 0x1F; y >= 0; y--) {
        a = ((M[(p + y) & 0xFFFF] & M[(m + y) & 0xFFFF]) | M[(g + y) & 0xFFFF]) & M[0xA988 + y];
        M[(p + y) & 0xFFFF] = a;
      }
      const s = adc(M[0x02], 0x20, 0); M[0x02] = s.a; if (s.c) inc(0x03);
      x++;
    } while (x !== 5);
    for (x = 0; x < 256; x++) { a = M[0x4200 + x]; M[0x4A00 + x] = a; }
    return regs(r, { a, x: 0, y: 0xFF }, nz(0));
  };
  // $E6CD: each player's collected letters down the side of the playfield.
  P.draw_extend_letters = function (r) {
    r = P.draw_extend_column(regs(r, { a: 0x51, x: 0, y: 0x90 }));
    return P.draw_extend_column(regs(r, { a: 0x51, x: 1, y: 0xAE }));
  };
  // $E6DC: one column: screen address A (high) and Y (low), player X; a 2 by 2 block a letter
  // in both buffers and the clean copy, from row 10 down.
  P.draw_extend_column = function (r) {
    let a = r.a & 255, x = r.x & 255, y = r.y & 255;
    M[0x41] = a;
    M[0x43] = a | 4;
    M[0x3D] = ((a & 3) + 0x8B) & 255;
    M[0x40] = y; M[0x42] = y; M[0x3C] = y;
    M[0x44] = M[0x54 + x];
    let c = 0;
    for (x = 5; x >= 0; x--) {
      a = M[0xE73A + x];
      c = M[0x44] & 1; M[0x44] >>= 1;
      if (c) {
        const p = zp16(0x40), q = zp16(0x42), t = zp16(0x3C);
        const put = (o, v) => { M[(p + o) & 0xFFFF] = v; M[(q + o) & 0xFFFF] = v; M[(t + o) & 0xFFFF] = v; };
        put(0, a);
        let s = adc(a, 1, 0); a = s.a; put(0x28, a);
        s = adc(a, 1, s.c); a = s.a; put(1, a);
        s = adc(a, 1, s.c); a = s.a; put(0x29, a);
        y = 0x29;
        c = 0;
      }
      const s = adc(M[0x40], 0x50, c); a = s.a; c = s.c;
      M[0x40] = a; M[0x42] = a; M[0x3C] = a;
      if (s.c) { inc(0x41); inc(0x43); inc(0x3D); }
    }
    return regs(r, { a, x: 0xFF, y }, { c, z: 0, n: 1 });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);

/* port/src/screen.js */
// The screen: the two buffers and their repair (flip_buffers $1844, flip_no_wait $1847,
// repair_back_buffer $1853 with giant_fall_step $19CF, scrub_back_buffer $1B19), the object
// renderer (draw_objects $E90E, its dispatch through object_draw_table $040C, render_setup $E784,
// render_object $E7CF, draw_none $E968, draw_next $E96F) and every draw handler the table reaches
// that is not another group's (draw_bubble $E779, draw_boulder $E752, draw_flame $E758, draw_baron
// $E767, draw_carrier $3CB2, draw_pop_next/last/end $3CD3/$3CDB/$3CDF, draw_burst $3D2D,
// draw_pop_start $3D77, draw_gone $3DA9, draw_bolt $3E77, draw_shot $3E94, draw_bottle $3ED4,
// draw_fireball $3EFD, draw_giant_block $3F28, draw_falling_food $3F88), printing (print_two_digits
// $3266, print_scores $E3A7, print_score $E3D9, print_score_digit $3FB0, check_high_score $E3F5,
// print_string $E42A, print_at $A625), the clears and copies (clear_screens $E374,
// clear_back_screen $E393, fill_colour $E740, save_screen $E49B, copy_round_number $E4C5), the
// lives (draw_lives $046C, draw_lives_row $047B, check_rejoin $052A), title_stars $A5A0 and
// actor_map_pointer $E9B8.
//
// Control flow of the renderer. In the game a draw handler never returns to draw_objects: it ends
// in draw_none or draw_next, which step to the next object and run the rest of the loop, then the
// chain bonus and the EXTEND check, and the RTS there is draw_objects's. The port keeps that
// shape: P.draw_none(r) and the local draw_next(r) continue the loop from object r.x - 1, so a
// handler called by name (P.draw_bubble(r) with r.x the object) does the rest of the pass's
// drawing as the game's would, and a handler of another group (draw_free, draw_blown_first)
// standing in does the same by running the game's code.
//
// Self-modified operands kept in M: the renderer's six table operands ($E849-$E861), draw_target
// ($E966), repair_cells/repair_colour/repair_row_a/repair_row_b ($18D6, $18D8, $18DF, $1929),
// print_col and the three print positions ($E451, $E473-$E47C), print_at's row and colour
// ($A63C, $A63D), and the opcode at $049D that check_rejoin turns into an RTS when the credits
// are gone (draw_lives_row reads it to decide whether the rejoin check runs).
(function (root) {
'use strict';
const G = root.BBGroups = root.BBGroups || {};
const { nz, regs, adc, sbc, adcDec, cmp } = root.BBUtil;

// object_draw_table ($040C) names its handlers by address; the table itself is read from M at
// run time (draw_objects patches draw_target with type + $0C and jumps through the vector at
// $0400 + that byte). This map only turns the address found there into the label to call.
const DRAW_HANDLERS = {
  0xE779: 'draw_bubble', 0x7BD4: 'draw_blown_first', 0x3CB2: 'draw_carrier', 0xE758: 'draw_flame',
  0x3E94: 'draw_shot', 0x3EFD: 'draw_fireball', 0xE752: 'draw_boulder', 0x3ED4: 'draw_bottle',
  0xE767: 'draw_baron', 0x3E77: 'draw_bolt', 0x3D2D: 'draw_burst', 0x7BDB: 'draw_free',
  0x3DA9: 'draw_gone', 0x3D77: 'draw_pop_start', 0x3CD3: 'draw_pop_next', 0x3CDB: 'draw_pop_last',
  0x3CDF: 'draw_pop_end', 0xE968: 'draw_none', 0x3F28: 'draw_giant_block', 0x3F88: 'draw_falling_food',
};

G.screen = function (P) {
  const M = P.M;
  const io = () => P.io;
  // A store through a pointer: colour RAM and the chips when the address is under $D000-$DFFF
  // (the game's pointers reach colour RAM that way), plain memory otherwise.
  const store = (addr, v) => { addr &= 0xFFFF; if ((addr & 0xF000) === 0xD000) io().write(addr, v & 255); else M[addr] = v & 255; };
  const zp16 = a => M[a] | (M[a + 1] << 8);
  const op16 = a => M[a] | (M[a + 1] << 8);      // a patched 16-bit operand

  // --- the buffers ---------------------------------------------------------------------------
  // $1844: wait for the frame, then swap the buffers' roles and repair the new back buffer.
  P.flip_buffers = function* (r) { r = yield* P.wait_frame(r); return P.flip_no_wait(r); };
  // $1847: the swap without the wait: toggle the back character set ($2F) and back screen ($30).
  P.flip_no_wait = function (r) {
    M[0x2F] ^= 0x08;
    M[0x30] ^= 0x04;
    return P.repair_back_buffer(regs(r, { a: M[0x30] }, nz(M[0x30])));
  };
  // $1853: with A the back screen's page: rebuild row_hi, colour the items, colour each bubble's
  // cells, restore from the clean copy what every object covered two passes ago, draw the items,
  // colour the water stream, restore under the giant block and step it. The carry is tracked
  // through the whole routine because several ADCs here take whatever the last compare left.
  P.repair_back_buffer = function (r) {
    const c = io();
    let a = r.a & 255, x, y, cy = 0, s;
    // row_hi from row_hi_page, accumulated with the carry chain
    for (x = 0; x < 0x19; x++) { s = adc(a, M[0xAD5C + x], cy); a = s.a; cy = s.c; M[0xAD41 + x] = a; }
    c.colourWrite(0, 9); c.colourWrite(1, 9);
    a = 9;
    // the two items' colour cells
    for (x = 1; x >= 0; x--) {
      y = M[0x52 + x];
      if (y & 0x80) continue;
      M[0x40] = M[0x4E + x]; M[0x41] = M[0x50 + x] | 0xD8;
      a = M[0x5F + x];
      const p = zp16(0x40);
      store(p, a); store(p + 1, a); store(p + 0x28, a); store(p + 0x29, a);
      y = 0x29;
    }
    // colour RAM under each bubble and the falling food
    for (x = 0x11; x >= 0; x--) {
      a = M[0xCA + x];
      if (!(a < 0x18 || a === 0x4C)) { cy = a >= 0x4C ? 1 : 0; continue; }   // cmp #$18 / cmp #$4C
      y = M[0xA9C4 + x] !== 0 ? 2 : 1;
      M[0x18D6] = y;                                 // repair_cells
      M[0x18D8] = M[0xA9E8 + x];                     // repair_colour
      M[0x3C] = 3;
      y = M[0xEE + x];
      do {
        if (y < 4) { cy = 0; }
        else if (y >= 0x1D) { cy = 1; }
        else {
          a = M[0x3C]; cy = a >= 3 ? 1 : 0;
          let draw = true;
          if (a === 3) draw = M[0xA9D6 + x] !== 0;   // lda object_subrow,x / beq
          if (draw) {
            M[0x18DF] = y;                           // repair_row_a
            s = adc(M[0xAD1E + y], M[0xDC + x], cy); M[0x40] = s.a;
            s = adc(M[0xAD3D + y] & 3, 0xD8, s.c); M[0x41] = s.a; cy = s.c;
            const p = zp16(0x40);
            a = M[0x18D8];
            for (y = M[0x18D6]; !(y & 0x80); y = (y - 1) & 255) store(p + y, a);
            y = M[0x18DF];
          }
        }
        y = (y + 1) & 255;
        M[0x3C] = (M[0x3C] - 1) & 255;
      } while (M[0x3C] !== 0);
    }
    // restore the cells each object covered two passes ago from the clean copy at $8B00
    for (x = 0x11; x >= 0; x--) {
      a = M[0xCA + x];
      if (a & 0x80) continue;
      M[0x3C] = 3;
      y = M[0x0181 + x];
      do {
        if (y < 4) cy = 0;
        else if (y >= 0x1D) cy = 1;
        else {
          M[0x1929] = y;                             // repair_row_b
          s = adc(M[0xAD1E + y], M[0x015D + x], 0); M[0x40] = s.a; M[0x42] = s.a;
          s = adc(0, M[0xAD3D + y], s.c); M[0x41] = s.a;
          s = adc(s.a & 3, 0x8B, s.c); M[0x43] = s.a; cy = s.c;
          const p = zp16(0x40), q = zp16(0x42);
          for (let i = 0; i < 3; i++) { a = M[(q + i) & 0xFFFF]; store(p + i, a); }
          y = M[0x1929];
        }
        y = (y + 1) & 255;
        M[0x3C] = (M[0x3C] - 1) & 255;
      } while (M[0x3C] !== 0);
    }
    // the items' four characters in the back screen
    for (x = 1; x >= 0; x--) {
      a = M[0x52 + x];
      if (a & 0x80) continue;
      M[0x40] = M[0x4E + x]; M[0x41] = M[0x50 + x] | M[0x30];
      const p = zp16(0x40);
      a = M[0x3F86 + x]; cy = 0;
      store(p, a);
      s = adc(a, 1, cy); a = s.a; cy = s.c; store(p + 0x28, a);
      s = adc(a, 1, cy); a = s.a; cy = s.c; store(p + 1, a);
      s = adc(a, 1, cy); a = s.a; cy = s.c; store(p + 0x29, a);
      y = 0x29;
    }
    // the water stream's ten cells of colour
    a = M[0x4D];
    if (a !== 0) {
      for (x = 0x0A; x !== 0; x--) {
        y = M[0xA756 + x];
        if (y < 4) { cy = 0; continue; }
        if (y >= 0x1D) { cy = 1; continue; }
        cy = 0;
        s = adc(M[0xAD1E + y], M[0xA74B + x], cy); M[0x40] = s.a;
        s = adc(M[0xAD3D + y] & 3, 0xD8, s.c); M[0x41] = s.a; cy = s.c;
        a = 0x0B; y = 0;
        store(zp16(0x40), a);
      }
    }
    // the giant falling block
    a = M[0x593F];
    if (a === 0) return regs(r, { a, x, y }, { ...nz(a), c: cy });
    a = M[0xCA];
    if (a & 0x80) {
      M[0x593F] = 0;
      a = M[0x58FF];
      if (a === 0) return regs(r, { a, x, y }, { ...nz(a), c: cy });
      M[0x58FF] = (M[0x58FF] - 1) & 255;
      return regs(r, { a, x, y }, { ...nz(M[0x58FF]), c: cy });
    }
    y = M[0x0181];
    s = adc(M[0xAD20 + y], M[0x015D], cy); M[0x40] = s.a; M[0x42] = s.a;
    s = adc(0, M[0xAD3F + y], s.c); M[0x41] = s.a;
    s = adc(s.a & 3, 0x8B, 0); M[0x43] = s.a; cy = s.c;
    {
      const p = zp16(0x40), q = zp16(0x42);
      for (x = 9; x >= 0; x--) { y = M[0xA82E + x]; a = M[(q + y) & 0xFFFF]; store(p + y, a); }
    }
    a = M[0xCA];
    if (a !== 0x46) return regs(r, { a, x: 0xFF, y }, cmp(a, 0x46));
    return giant_fall_step(regs(r, { a, x: 0xFF, y }, cmp(a, 0x46)));
  };
  // $19CF: the block of object 0 falls a row and a column; enemies in bubbles or on foot within
  // its reach are killed, at row $16 it ends, otherwise a random enemy below 6 may be killed too
  // (falling into kill_enemy with X that number). Note: stx tmp_ptr in the object loop overwrites
  // the compare point the later tests use, and object_cargo is read at the loop's own index
  // (two short of the object): both as the game does.
  function giant_fall_step(r) {
    const c = io();
    let a, x, y = r.y & 255, s;
    M[0xDC] = (M[0xDC] - 1) & 255;
    M[0xEE] = (M[0xEE] + 1) & 255;
    a = M[0xDC] << 3; s = adc(a & 255, 0x0C, (a >> 8) & 1); M[0x40] = s.a;
    a = M[0xEE] << 3; s = adc(a & 255, 0x0D, (a >> 8) & 1); M[0x41] = s.a;
    a = s.a;
    for (x = 0x0F; x >= 0; x--) {
      a = M[0xCC + x];
      if (a < 0x18 || a >= 0x24) continue;
      a = (M[0xAA0E + x] - M[0x40]) & 0x1FF; if (a & 0x100) { a &= 255; continue; } if ((a & 255) >= 0x30) continue;
      a = (M[0xAA20 + x] - M[0x41]) & 0x1FF; if (a & 0x100) { a &= 255; continue; } if ((a & 255) >= 0x30) continue;
      a = ((M[0xCC + x] - 0x17 - 1) & 255) >> 1;    // sbc #$17 with the carry clear
      M[0x40] = x;
      y = M[0xAA30 + x];
      const e = a;
      M[0xB4 + e] = y;
      a = c.vicRead(0x15) | M[0xAB55 + e];
      c.vicWrite(0x15, a);
      r = P.kill_enemy(regs(r, { a, x: e, y }));
      y = r.y & 255;
      x = M[0x40];
      a = 0x38;
      M[0xCC + x] = a;
    }
    for (x = 5; x >= 0; x--) {
      a = M[0xB4 + x];
      if (a === 0 || a >= 0x0B) continue;
      a = (M[0xBC + x] - M[0x40]) & 0x1FF; if (a & 0x100) { a &= 255; continue; } if ((a & 255) >= 0x30) continue;
      a = (M[0xC4 + x] - M[0x41]) & 0x1FF; if (a & 0x100) { a &= 255; continue; } if ((a & 255) >= 0x30) continue;
      r = P.kill_enemy(regs(r, { a: a & 255, x, y }));
      x = r.x & 255; y = r.y & 255; a = r.a & 255;
    }
    r = regs(r, { a, x: 0xFF, y });
    a = M[0xEE];
    if (a === 0x16) { M[0xCA] = 0x38; M[0xCB] = 0x38; return regs(r, { a: 0x38 }, { c: 1, ...nz(0x38) }); }
    r = P.random(regs(r, { a }, cmp(a, 0x16)));
    a = r.a & 255;
    const f = cmp(a, 6);
    if (a >= 6) return regs(r, { a }, f);
    x = a;
    a = M[0xB4 + x];
    if (a === 0) return regs(r, { a, x }, { c: f.c, ...nz(a) });
    if (a >= 0x0B) return regs(r, { a, x }, cmp(a, 0x0B));
    return P.kill_enemy(regs(r, { a, x }, cmp(a, 0x0B)));
  }
  // $1B19: put the clean copy's character back wherever the back buffer holds a dynamic glyph
  // ($5E up), then the actors to the sprites.
  P.scrub_back_buffer = function (r) {
    let a = 0;
    const base = M[0x30] << 8;
    M[0x41] = M[0x30]; M[0x40] = 0; M[0x42] = 0; M[0x43] = 0x8B;
    for (let p = 0; p < 0x400; p++) {
      a = M[base + p];
      if (a >= 0x5E) { a = M[0x8B00 + p]; M[base + p] = a; }
    }
    M[0x41] = (M[0x30] + 4) & 255; M[0x43] = 0x8F;
    return P.actors_to_sprites(regs(r, { a, x: 0, y: 0 }, nz(0)));
  };

  // --- printing --------------------------------------------------------------------------------
  // $3266: A as two decimal digits at $41:Y in colour X, each digit ORed with $45.
  P.print_two_digits = function (r) {
    let a = r.a & 255, x = r.x & 255, y = r.y & 255;
    M[0x40] = y; M[0x44] = a; M[0x42] = y;
    M[0x43] = (M[0x41] + 0x88) & 255;
    a = x;
    const q = zp16(0x42);
    store(q, a); store(q + 1, a);
    y = 1;
    x = 0; a = M[0x44];
    while (a >= 10) { x++; a -= 10; }
    a |= M[0x45];
    const p = zp16(0x40);
    store(p + y, a);
    y = 0;
    a = x | M[0x45];
    store(p, a);
    return regs(r, { a, x, y }, nz(a));
  };
  // $3FB0: one digit of a score for print_score: a blank for a leading zero (until a non-zero
  // digit has cleared bit 7 of $42 by its DEC, or in the last place). The BNE's target is the
  // DEC $42 hidden in the operand of BIT $42C6.
  P.print_score_digit = function (r) {
    let a = r.a & 255, y = r.y & 255;
    const nonzero = r.z === undefined ? a !== 0 : !r.z;
    if (nonzero || (M[0x42] & 0x80) || y === 5) M[0x42] = (M[0x42] - 1) & 255;
    else a = 0x20;
    store(zp16(0x40) + y, a);
    y = (y + 1) & 255;
    return regs(r, { a, y }, nz(y));
  };
  // $E3D9: six digits of the packed score at $0400 + X at the address in $40/$41.
  P.print_score = function (r) {
    let x = r.x & 255, y = 0;
    M[0x42] = 0;
    do {
      let a = M[0x0400 + x] >> 4;
      r = P.print_score_digit(regs(r, { a, x, y }, nz(a)));
      y = r.y & 255;
      a = M[0x0400 + x] & 0x0F;
      r = P.print_score_digit(regs(r, { a, x, y }, nz(a)));
      y = r.y & 255;
      x = (x + 1) & 255;
    } while (y !== 6);
    return regs(r, { x, y }, cmp(y, 6));
  };
  // $E3F5: the score at $0400 + A against the top score; copy it over when higher, with that
  // player's round (Y) as top_round.
  P.check_high_score = function (r) {
    M[0x42] = r.a & 255; M[0x3C] = r.y & 255;
    let y = 0, a, higher = false;
    for (;;) {
      a = M[(zp16(0x42) + y) & 0xFFFF];
      const f = cmp(a, M[0x0406 + y]);
      if (!f.z) { if (f.c) { higher = true; break; } return regs(r, { a, y }, f); }
      y++;
      if (y === 3) break;
    }
    for (y = 2; y >= 0; y--) { a = M[(zp16(0x42) + y) & 0xFFFF]; M[0x0406 + y] = a; }
    y = M[0x3C];
    a = M[0x0409 + y];
    M[0x040B] = a;
    return regs(r, { a, y }, { ...nz(a), c: 1 });
  };
  // $E3A7: both scores and the top score on the screen on display.
  P.print_scores = function (r) {
    M[0x41] = M[0x30] ^ 4; M[0x40] = 0xE9;
    r = P.print_score(regs(r, { a: 0xE9, x: 0 }));
    M[0x41] = (M[0x41] + 2) & 255; M[0x40] = 1;
    r = P.print_score(regs(r, { a: 1 }));
    M[0x43] = 4;
    r = P.check_high_score(regs(r, { a: 0, y: 0 }));
    r = P.check_high_score(regs(r, { a: 3, y: 1 }));
    M[0x41] = (M[0x41] + 1) & 255; M[0x40] = 0x41;
    return P.print_score(regs(r, { a: 0x41 }));
  };
  // $E42A: the string at Y:X on both screens and colour RAM. Below $10 a colour, $10 the end,
  // $1F a position (column, row) patched into the three stores, else a character + $20. The
  // position persists in the operands between calls. A string of 256 bytes or more would run
  // into wait_frame in the game; the port stops there (none of the game's strings is that long).
  P.print_string = function (r) {
    const c = io();
    M[0x0D] = r.x & 255; M[0x0E] = r.y & 255;
    let y = 0, a, x = r.x & 255, cy = r.c ? 1 : 0;
    for (;;) {
      a = M[(zp16(0x0D) + y) & 0xFFFF];
      let print = false;
      if (a < 0x10) { M[0x0F] = a; cy = 0; }
      else if (a === 0x10) return regs(r, { a, x, y }, { c: 1, z: 1, n: 0 });
      else if (a === 0x1F) {
        y = (y + 1) & 255; x = M[(zp16(0x0D) + y) & 0xFFFF];
        y = (y + 1) & 255; a = M[(zp16(0x0D) + y) & 0xFFFF];
        M[0xE451] = x;
        cy = a >> 7; a = (a << 1) & 255; x = a;
        let s = adc(M[0xAC09 + x], M[0xE451], cy);
        M[0xE473] = s.a; M[0xE476] = s.a; M[0xE47B] = s.a;
        s = adc(M[0xAC0A + x], 0x50, s.c); M[0xE474] = s.a;
        s = adc(s.a, 0x04, s.c); M[0xE477] = s.a;
        s = adc(s.a, 0x84, s.c); M[0xE47C] = s.a;
        a = s.a; cy = s.c;
        if (cy) print = true;                        // bcc not taken: the high byte is printed as a character
      } else print = true;
      if (print) {
        cy = a >= 0x20 ? 1 : 0; a = (a - 0x20) & 255;
        M[op16(0xE473)] = a;
        M[op16(0xE476)] = a;
        store(op16(0xE47B), M[0x0F]);
        M[0xE473] = (M[0xE473] + 1) & 255; M[0xE476] = (M[0xE476] + 1) & 255; M[0xE47B] = (M[0xE47B] + 1) & 255;
        if (M[0xE47B] === 0) { M[0xE474] = (M[0xE474] + 1) & 255; M[0xE477] = (M[0xE477] + 1) & 255; M[0xE47C] = (M[0xE47C] + 1) & 255; }
        a = M[0x0F];
      }
      y = (y + 1) & 255;
      if (y === 0) return regs(r, { a, x, y }, { ...nz(0), c: cy });   // the game would fall into wait_frame here
    }
  };
  // $A625: the score table's empty line in colour X at row Y: both patched into the string at
  // $A63A, then print_string.
  P.print_at = function (r) {
    M[0xA63D] = r.x & 255; M[0xA63C] = r.y & 255;
    return P.print_string(regs(r, { x: 0x3A, y: 0xA6 }));
  };

  // --- clears and copies -----------------------------------------------------------------------
  // $E740: colour RAM filled with A, a page at a time.
  P.fill_colour = function (r) {
    const c = io();
    const a = r.a & 255;
    for (let x = 0; x < 256; x++) { c.colourWrite(x, a); c.colourWrite(0x100 + x, a); c.colourWrite(0x200 + x, a); c.colourWrite(0x300 + x, a); }
    return regs(r, { a, x: 0 }, nz(0));
  };
  // $E374: black border and background, sprites off, colour RAM 0, both screens blank.
  P.clear_screens = function (r) {
    const c = io();
    c.vicWrite(0x20, 0); c.vicWrite(0x21, 0); c.vicWrite(0x15, 0);
    r = P.fill_colour(regs(r, { a: 0 }));
    let x = r.x & 255;
    do { M[0x5000 + x] = 0x20; M[0x5100 + x] = 0x20; M[0x5200 + x] = 0x20; M[0x5300 + x] = 0x20; x = (x + 1) & 255; } while (x !== 0);
    return P.clear_back_screen(regs(r, { a: 0x20, x }));
  };
  // $E393: the screen at $5400 blank.
  P.clear_back_screen = function (r) {
    for (let x = 0; x < 256; x++) { M[0x5400 + x] = 0x20; M[0x5500 + x] = 0x20; M[0x5600 + x] = 0x20; M[0x5700 + x] = 0x20; }
    return regs(r, { a: 0x20, x: 0 }, nz(0));
  };
  // $E49B: the screen at $5000 to the clean copy at $8B00 and to the screen at $5400.
  P.save_screen = function (r) {
    let a = 0;
    for (let x = 0; x < 256; x++) {
      M[0x8B00 + x] = M[0x5400 + x] = M[0x5000 + x];
      M[0x8C00 + x] = M[0x5500 + x] = M[0x5100 + x];
      M[0x8D00 + x] = M[0x5600 + x] = M[0x5200 + x];
      a = M[0x8E00 + x] = M[0x5700 + x] = M[0x5300 + x];
    }
    return regs(r, { a, x: 0 }, nz(0));
  };
  // $E4C5: the round number's glyphs into character set 2 and its two characters at the top
  // left of the second buffer.
  P.copy_round_number = function (r) {
    for (let x = 0x0F; x >= 0; x--) M[0x48D0 + x] = M[0x40D0 + x];
    M[0x5400] = 0x1A; M[0x5401] = 0x1B;
    return regs(r, { a: M[0x40D0], x: 0xFF, y: 0x1B }, nz(0x1B));
  };

  // --- the lives -------------------------------------------------------------------------------
  // $046C: both players' lives on the panel, each row through draw_lives_row (and so through
  // check_rejoin twice, as the game does).
  P.draw_lives = function (r) {
    r = P.draw_lives_row(regs(r, { a: 0x51, x: 0, y: 0x39 }));
    return P.draw_lives_row(regs(r, { a: 0x52, x: 1, y: 0x51 }));
  };
  // $047B: seven cells at A:Y in both buffers, a dot ($1D) per life of player X from the right;
  // a player who is out is skipped. Then the jump at $049D: check_rejoin, or nothing once
  // check_rejoin has patched it to an RTS.
  P.draw_lives_row = function (r) {
    let a = r.a & 255, x = r.x & 255, y = r.y & 255;
    M[0x40] = y; M[0x42] = y; M[0x41] = a; M[0x43] = a | 4;
    a = M[0x045A + x];
    if (a & 0x80) r = regs(r, { a, x, y }, nz(a));
    else {
      x = a;
      const p = zp16(0x40), q = zp16(0x42);
      for (y = 6; y >= 0; y--) {
        a = 0x20;
        if (x !== 0) { a = 0x1D; x--; }
        store(p + y, a); store(q + y, a);
      }
      r = regs(r, { a, x, y: 0xFF }, nz(0xFF));
    }
    if (M[0x049D] !== 0x4C) return r;              // patched to RTS: nobody can rejoin
    return check_rejoin(r);
  };
  // $052A: a player who is out and presses fire with a credit left gets four lives, state $0F,
  // a cleared score, and the GAME OVER text blanked; the last credit turns $049D into an RTS.
  function check_rejoin(r) {
    const c = io();
    let a = r.a & 255, x, y = r.y & 255;
    for (x = 1; x >= 0; x--) {
      a = M[0xB2 + x];
      if (a !== 0) continue;
      a = c.ciaRead(x) & 0x10;
      if (a !== 0) continue;
      M[0x045A + x] = 4;
      M[0xB2 + x] = 0x0F;
      a = 0;
      y = M[0xAB51 + x];
      M[0x0400 + y] = 0; y = (y - 1) & 255; M[0x0400 + y] = 0; y = (y - 1) & 255; M[0x0400 + y] = 0;
      M[0xAC + x] = 0;
      y = (y + 1) & 255;
      M[0xAE + x] = y;
      M[0x53E4] = (M[0x53E4] - 1) & 255; M[0x57E4] = (M[0x57E4] - 1) & 255;
      M[0xAB] = (M[0xAB] - 1) & 255;
      if (M[0xAB] & 0x80) M[0x049D] = 0x60;
      a = 0xE9; y = 0x50;
      if (x === 1) { a = 1; y += 2; }
      M[0x02] = a; M[0x03] = y; M[0x04] = a; M[0x06] = a;
      a = y | 4; M[0x05] = a;
      a ^= 0x8C; M[0x07] = a;
      y = 6;
      const pa = zp16(0x02), pb = zp16(0x04), pc = zp16(0x06);
      do {
        y = (y + 0x50) & 255;
        store(pa + y, 0x20); store(pb + y, 0x20);
        a = M[0x8570 + x];
        store(pc + y, a);
        y = (y + 0x28) & 255;
        store(pa + y, 0x20); store(pb + y, 0x20);
        a = y = (y - 0x79) & 255;                    // tya / sec / sbc #$79 / tay
      } while (!(y & 0x80));
    }
    return regs(r, { a, x: 0xFF, y }, nz(0xFF));
  }

  // --- the renderer ----------------------------------------------------------------------------
  // $E90E: note the chain and letter counts, start the glyphs at $5E, then every object through
  // its draw handler (the loop body is objects_body; the handlers continue it).
  P.draw_objects = function (r) {
    M[0x597F] = (M[0x597F] + 1) & 255;
    M[0x48] = M[0x46]; M[0x49] = M[0x47];
    M[0x56] = M[0x54]; M[0x57] = M[0x55];
    M[0x38] = 0xF0;
    M[0x39] = (M[0x2F] + 2) & 255;
    M[0x3C] = 0x5E;
    return objects_body(regs(r, { x: 0x11, y: M[0x39] }));
  };
  // $E931: the loop body for object X: remember where it was drawn the last two passes, work out
  // its screen address (tmp_ptr $40, text_ptr $0D/$0E for the rows above) and jump to its
  // handler through the table at $040C by the patched vector.
  function objects_body(r) {
    const x = r.x & 255;
    let a = M[0xCA + x];
    if (a & 0x80) return P.draw_none(regs(r, { a, x }, nz(a)));
    let s = adc(a, 0x0C, 0);
    M[0xE966] = s.a;                                 // draw_target
    M[0x015D + x] = M[0x014B + x];
    M[0x0181 + x] = M[0x016F + x];
    a = M[0xDC + x]; M[0x014B + x] = a; M[0x0E] = a;
    a = M[0xEE + x]; M[0x016F + x] = a;
    const y = (a + 1) & 255;
    M[0x0D] = y;
    s = adc(M[0xAD1F + y], M[0xDC + x], s.c); M[0x40] = s.a;
    s = adc(0, M[0xAD3E + y], s.c); M[0x41] = s.a;
    const v = 0x0400 | M[0xE966];
    const target = M[v] | (M[(v + 1) & 0xFFFF] << 8);
    const label = DRAW_HANDLERS[target];
    if (!label || typeof P[label] !== 'function') throw new Error('draw_objects: no handler at $' + target.toString(16) + ' for type $' + M[0xCA + x].toString(16));
    return P[label](regs(r, { a: s.a, x, y }, { ...nz(s.a), c: s.c, v: s.v }));
  }
  // $E97A: the next object, or the pass's tail when the last is done.
  function j_E97A(r) {
    const x = (r.x - 1) & 255;
    r = regs(r, { x }, nz(x));
    return x & 0x80 ? draw_tail(r) : objects_body(r);
  }
  // $E97D: pay a chain that did not grow this pass (decimal, into the middle score byte and up),
  // then redraw the EXTEND letters if a player's changed.
  function draw_tail(r) {
    let a = r.a & 255, x, y = r.y & 255;
    for (x = 1; x >= 0; x--) {
      a = M[0x46 + x];
      if (a === 0) continue;
      if (a !== M[0x48 + x]) continue;
      y = a;
      M[0x46 + x] = 0;
      a = M[0xAB52 + y];
      y = (M[0xAB51 + x] - 1) & 255;
      let cy = 0;
      for (;;) {
        const s = adcDec(a, M[0x0400 + y], cy);
        M[0x0400 + y] = a = s.a; cy = s.c;
        if (!cy) break;
        a = 0;
        y = (y - 1) & 255;
        if (y & 0x80) break;
      }
    }
    a = M[0x54];
    let f = cmp(a, M[0x56]);
    if (f.z) {
      a = M[0x55]; f = cmp(a, M[0x57]);
      if (f.z) return regs(r, { a, x: 0xFF, y }, f);
    }
    return P.draw_extend_letters(regs(r, { a, x: 0xFF, y }, f));
  }
  // $E968: a handler that draws nothing skips its nine glyphs. Continues the loop from r.x - 1.
  P.draw_none = function (r) {
    M[0x3C] = (M[0x3C] + 9) & 255;
    return draw_next(regs(r, { a: M[0x3C] }, nz(M[0x3C])));
  };
  // $E96F: the glyph pointer on by 72 bytes, then the next object.
  function draw_next(r) {
    const s = adc(M[0x38], 0x48, 0);
    M[0x38] = s.a;
    if (s.c) M[0x39] = (M[0x39] + 1) & 255;
    return j_E97A(regs(r, { a: s.a }, { ...nz(s.a), c: s.c }));
  }
  // $E784: with A the picture number (and the carry as the caller left it), patch the six table
  // operands of the renderer: three graphic columns and three mask columns 16 bytes apart.
  function render_setup(r) {
    const y = r.a & 255, x0 = r.x & 255;
    M[0x3F] = x0;
    let a = M[0xAA54 + y], x = M[0xAA8E + y];
    M[0xE84C] = a; M[0xE84D] = x;
    let s = adc(a, 0x10, r.c ? 1 : 0);
    M[0xE856] = s.a; if (s.c) x = (x + 1) & 255;
    M[0xE857] = x;
    s = adc(s.a, 0x10, 0);
    M[0xE860] = s.a; if (s.c) x = (x + 1) & 255;
    M[0xE861] = x;
    a = M[0xAAC8 + y]; x = M[0xAB02 + y];
    M[0xE849] = a; M[0xE84A] = x;
    s = adc(a, 0x10, 0);
    M[0xE853] = s.a; if (s.c) x = (x + 1) & 255;
    M[0xE854] = x;
    s = adc(s.a, 0x10, 0);
    M[0xE85D] = s.a; if (s.c) x = (x + 1) & 255;
    M[0xE85E] = x;
    return render_object(regs(r, { a: s.a, x, y }, { c: 0 }));
  }
  // $E7CF: the bubble renderer: three fresh glyphs per row of cells, each the glyph under it
  // ANDed with the mask column and ORed with the graphic column, for the sixteen lines of the
  // picture from the bottom row of cells upward; the lines above and below are copied. Reads
  // its six table operands from M.
  function render_object(r) {
    let a, x, y, s;
    // the three glyph destinations of the bottom row
    a = M[0x38]; M[0x3A] = a; x = M[0x39]; M[0x3B] = x;
    s = adc(a, 8, r.c ? 1 : 0); M[0x18] = s.a; if (s.c) x = (x + 1) & 255; M[0x19] = x;
    s = adc(s.a, 8, 0); M[0x1A] = s.a; if (s.c) x = (x + 1) & 255; M[0x1B] = x;
    // the three cells on screen, replaced by the next three glyph numbers
    let p = zp16(0x40);
    const srcs = [0x31, 0x33, 0x35];
    for (y = 0; y < 3; y++) {
      x = M[(p + y) & 0xFFFF];
      M[srcs[y]] = M[0x0200 + x]; M[srcs[y] + 1] = M[0x0300 + x] | M[0x2F];
      M[(p + y) & 0xFFFF] = M[0x3C]; M[0x3C] = (M[0x3C] + 1) & 255;
    }
    y = 7; x = 0x0F;
    M[0x3D] = (M[0x3D] - 1) & 255;
    const dsts = () => [zp16(0x3A), zp16(0x18), zp16(0x1A)];
    const sources = () => [zp16(0x31), zp16(0x33), zp16(0x35)];
    let S = sources(), D = dsts();
    const copyLine = yy => { for (let i = 0; i < 3; i++) M[(D[i] + yy) & 0xFFFF] = M[(S[i] + yy) & 0xFFFF]; };
    const mergeLine = (yy, xx) => {
      const ma = op16(0xE849), ga = op16(0xE84C), mb = op16(0xE853), gb = op16(0xE856), mc = op16(0xE85D), gc = op16(0xE860);
      M[(D[0] + yy) & 0xFFFF] = (M[(S[0] + yy) & 0xFFFF] & M[(ma + xx) & 0xFFFF]) | M[(ga + xx) & 0xFFFF];
      M[(D[1] + yy) & 0xFFFF] = (M[(S[1] + yy) & 0xFFFF] & M[(mb + xx) & 0xFFFF]) | M[(gb + xx) & 0xFFFF];
      M[(D[2] + yy) & 0xFFFF] = (M[(S[2] + yy) & 0xFFFF] & M[(mc + xx) & 0xFFFF]) | M[(gc + xx) & 0xFFFF];
    };
    if (!(M[0x3D] & 0x80)) {
      // the lines below the picture's bottom line
      do { copyLine(y); y = (y - 1) & 255; } while (y !== M[0x3D]);
    }
    for (;;) {
      // b_E846: merge line y with mask line x
      mergeLine(y, x);
      y = (y - 1) & 255;
      if (y & 0x80) {
        // b_E87B: a row of cells is done
        if (x !== 0) {
          // render_next_row $E88A: the row above
          y = M[0x0D];
          s = adc(M[0xAD1E + y], M[0x0E], 0); M[0x40] = s.a;
          M[0x0D] = (M[0x0D] - 1) & 255;
          s = adc(0, M[0xAD3D + y], s.c); M[0x41] = s.a;
          let cy = s.c;
          M[0x3D] = x;
          p = zp16(0x40);
          let g = M[0x3C];
          for (let i = 0; i < 3; i++) {
            const ch = M[(p + i) & 0xFFFF];
            M[srcs[i]] = M[0x0200 + ch];
            s = adc(M[0x0300 + ch], M[0x2F], cy); M[srcs[i] + 1] = s.a; cy = s.c;
            M[(p + i) & 0xFFFF] = g; g = (g + 1) & 255;
          }
          M[0x3C] = g;
          x = M[0x1B]; a = M[0x1A];
          s = adc(a, 8, cy); M[0x3A] = s.a; if (s.c) x = (x + 1) & 255; M[0x3B] = x;
          s = adc(s.a, 8, 0); M[0x18] = s.a; if (s.c) x = (x + 1) & 255; M[0x19] = x;
          s = adc(s.a, 8, 0); M[0x1A] = s.a; if (s.c) x = (x + 1) & 255; M[0x1B] = x;
          x = M[0x3D];
          y = 7;
          S = sources(); D = dsts();
          // j_E867
          x = (x - 1) & 255;
          if (x & 0x80) break;
          continue;
        }
        // the picture ended exactly on the row boundary: skip the third row's three glyphs
        M[0x3C] = (M[0x3C] + 3) & 255;             // adc #2 with the carry CPX #0 set
        a = M[0x3C];
        return draw_next(regs(r, { a, x: M[0x3F], y }, nz(a)));
      }
      // j_E867
      x = (x - 1) & 255;
      if (x & 0x80) break;
    }
    // b_E86A: the lines above the picture's top line
    for (; !(y & 0x80); y = (y - 1) & 255) copyLine(y);
    return draw_next(regs(r, { a: M[(S[2] + ((y + 1) & 255)) & 0xFFFF], x: M[0x3F], y }, nz(y)));
  }
  // $E779: a plain, special or letter bubble: picture type × 2 + sub-column, from its sub-row.
  P.draw_bubble = function (r) {
    const x = r.x & 255;
    M[0x3D] = M[0xA9D6 + x];
    let a = M[0xCA + x] << 1;
    const s = adc(a & 255, M[0xA9C4 + x], (a >> 8) & 1);
    return render_setup(regs(r, { a: s.a, x }, { c: s.c, ...nz(s.a), v: s.v }));
  };
  // $E752: the boulder: picture $38 + sub-column.
  P.draw_boulder = function (r) {
    const x = r.x & 255;
    M[0x3D] = 0;
    const a = 0x38 | M[0xA9C4 + x];
    return render_setup(regs(r, { a, x, y: 0 }, { c: 0, ...nz(a) }));
  };
  // $E758: the falling flame: picture $34 + sub-column, from its sub-row.
  P.draw_flame = function (r) {
    const x = r.x & 255;
    const y = M[0xA9D6 + x];
    M[0x3D] = y;
    const a = 0x34 | M[0xA9C4 + x];
    return render_setup(regs(r, { a, x, y }, { c: 0, ...nz(a) }));
  };
  // $E767: a Baron: picture $30-$33 by its facing and the pass count's second bit.
  P.draw_baron = function (r) {
    const x = r.x & 255;
    M[0x3D] = 0;
    const a = ((M[0x597F] >> 1) & 1) | M[0xE765 + x] | 0x30;
    return render_setup(regs(r, { a, x }, { c: 0, ...nz(a) }));
  };
  // $3CB2: a bubble holding enemy (type - $18) / 2: the enemy's sprite follows the bubble;
  // nothing is drawn in characters.
  P.draw_carrier = function (r) {
    const x = r.x & 255;
    const y = ((M[0xCA + x] - 0x18) & 255) >> 1;
    M[0x8522 + y] = M[0xAA42 + x];
    M[0x872A + y] = 0;
    M[0xBC + y] = M[0xAA0C + x];
    const a = M[0xAA1E + x];
    M[0xC4 + y] = a;
    return P.draw_none(regs(r, { a, x, y }, nz(a)));
  };
  // $3CE5: point the renderer at pop picture A + sub-column and draw it. The ADC that places the
  // second column takes the carry the caller left: set by the CMP #8 in draw_burst's tail for a
  // letter bubble's pop, so that column starts one line on, as in the game.
  function draw_pop_picture(r) {
    const x0 = r.x & 255;
    M[0x3F] = x0;
    const y = (r.a & 255) | M[0xA9C4 + x0];
    M[0x3D] = M[0xA9D6 + x0];
    let a = M[0xAB41 + y], x = M[0xAB49 + y];
    M[0xE84C] = a; M[0xE84D] = x;
    let s = adc(a, 0x10, r.c ? 1 : 0);
    M[0xE856] = s.a; if (s.c) x = (x + 1) & 255;
    M[0xE857] = x;
    s = adc(s.a, 0x10, 0);
    M[0xE860] = s.a; if (s.c) x = (x + 1) & 255;
    M[0xE861] = x;
    M[0xE849] = 0x60; M[0xE853] = 0x60; M[0xE85D] = 0x60;
    M[0xE84A] = 0x82; M[0xE854] = 0x82; M[0xE85E] = 0x82;
    return render_object(regs(r, { a: 0x82, x, y }, { c: 0 }));
  }
  // $3CD3: the second stage of a burst: type on by two, the first pop picture.
  P.draw_pop_next = function (r) {
    const x = r.x & 255;
    M[0xCA + x] = (M[0xCA + x] + 2) & 255;
    return draw_pop_picture(regs(r, { a: 0, x }, nz(0)));
  };
  // $3CDB: type $40 and the last pop picture.
  P.draw_pop_last = function (r) {
    const x = r.x & 255;
    M[0xCA + x] = 0x40;
    return draw_pop_picture(regs(r, { a: 4, x }, nz(4)));
  };
  // $3CDF: type $38 (gone next pass) and the last pop picture.
  P.draw_pop_end = function (r) {
    const x = r.x & 255;
    M[0xCA + x] = 0x38;
    return draw_pop_picture(regs(r, { a: 4, x }, nz(4)));
  };
  // $3DA9: type $36 (freed next pass), nothing drawn.
  P.draw_gone = function (r) {
    const x = r.x & 255;
    M[0xCA + x] = 0x36;
    return P.draw_none(regs(r, { a: 0x36, x }, nz(0x36)));
  };
  // $3D2D: a bubble a player burst: burst every bubble within 24 pixels the same way (the chain),
  // then the common tail (draw_pop_start).
  P.draw_burst = function (r) {
    const x = r.x & 255;
    M[0x3E] = x;
    let a = r.a & 255;
    for (let y = 0x11; y >= 0; y--) {
      if (y === M[0x3E]) continue;
      a = M[0xCA + y];
      if (a >= 0x24) continue;
      a = M[0xA9B2 + x];
      if (a !== 0) continue;
      a = (M[0xAA0C + x] - M[0xAA0C + y]) & 255;
      if (M[0xAA0C + x] < M[0xAA0C + y]) a = (-a) & 255;
      if (a >= 0x18) continue;
      a = (M[0xAA1E + x] - M[0xAA1E + y]) & 255;
      if (M[0xAA1E + x] < M[0xAA1E + y]) a = (-a) & 255;
      if (a >= 0x18) continue;
      M[0xAA42 + y] = M[0xCA + y];
      M[0xCA + y] = 0x34;
      a = M[0x0193 + x];
      M[0x0193 + y] = a;
    }
    return P.draw_pop_start(regs(r, { a, x, y: 0xFF }, nz(0xFF)));
  };
  // $3D77: the tail of a burst (also the handler of type $3A): an enemy inside is killed and
  // credited to the chain; else by type $34 the score and a letter; then by what the bubble was:
  // water starts the stream, thunder becomes a shot, fire a flame, anything else the pop
  // animation. scratch_3e ($3E) is read as the game leaves it (draw_burst sets it; for a type
  // $3A object it is whatever the last user left).
  P.draw_pop_start = function (r) {
    const c = io();
    let a, x = r.x & 255, y, cy;
    a = M[0xAA42 + x];
    if (a < 0x24 && a >= 0x18) {
      a = (a - 0x18) >> 1;
      x = a;
      const saved = a;
      y = M[0x3E];
      a = M[0xAA30 + y];
      M[0xB4 + x] = a;
      r = P.kill_enemy(regs(r, { a, x, y }));
      x = r.x & 255; y = r.y & 255;
      a = c.vicRead(0x15) | M[0xAB55 + x];
      c.vicWrite(0x15, a);
      a = M[0x0193 + y];
      x = a;
      M[0x46 + x] = (M[0x46 + x] + 1) & 255;
      y = saved;
      a = M[0x46 + x];
      M[0x8892 + y] = a;
      x = M[0x3E];
      return P.draw_gone(regs(r, { a, x, y }));
    }
    cy = a >= 0x24 ? 1 : 0;                          // from cmp #$24 / cmp #$18
    y = M[0xCA + x];
    if (y === 0x34) {
      y = 1;
      if (a >= 6 && a < 0x0C) y = 0x0A;
      const points = y;
      y = M[0xAB51 + (M[0x0193 + x] & 1)];
      r = P.add_score(regs(r, { a: points, x, y }));
      x = r.x & 255;
      a = M[0xAA42 + x];
      if (a < 0x16 && a >= 0x0C) {
        y = (a - 0x0C) >> 1;
        a = M[0x0193 + x];
        x = a;
        if (y >= 3) y++;
        if (y === 0 && (M[0x54 + x] & 1)) y = 3;
        a = M[0xAB53 + y] | M[0x54 + x];
        M[0x54 + x] = a;
        x = M[0x3E];
        a = M[0xAA42 + x];
        cy = 1;                                      // cpy #$00
      } else cy = a >= 0x16 ? 1 : 0;
    }
    // b_3E02: by what the bubble was (A), with the carry as the compares left it
    if (a === 6) {
      a = M[0x4D];
      if (a === 0) {
        let s = adc(M[0xDC + x], 1, 0);
        a = s.a;
        for (y = 0x0A; y >= 0; y--) M[0xA74B + y] = a;
        s = adc(M[0xEE + x], 1, s.c);
        a = s.a;
        if (a < 0x1D) {
          for (y = 0x0A; y >= 0; y--) M[0xA756 + y] = a;
          M[0x4D] = (M[0x4D] - 1) & 255;
          return P.draw_gone(regs(r, { a, x, y: 0xFF }));
        }
        cy = 1;
      } else cy = 1;                                 // cmp #6 equal
    } else cy = a >= 6 ? 1 : 0;
    if (a === 0x0A) {
      M[0xCA + x] = 0x26;
      let s = sbc(M[0xAA0C + x], 0x14, 1);
      s = adc(s.a & 0xF8, 0x13, s.c);
      M[0xAA0C + x] = s.a;
      y = M[0x0193 + x];
      y = M[0x8520 + y];
      a = 0x84;
      if (y >= 4 && (y < 8 || y >= 0x0A)) a = 4;
      M[0x0193 + x] = a;
      return P.draw_shot(regs(r, { a, x, y }, nz(a)));
    }
    cy = a >= 0x0A ? 1 : 0;
    if (a === 8) {
      M[0xA9D6 + x] = 0;
      M[0xCA + x] = 0x24;
      return P.draw_flame(regs(r, { a: 0x24, x }, { c: 1, ...nz(0x24) }));
    }
    cy = a >= 8 ? 1 : 0;
    M[0xCA + x] = 0x3C;
    return draw_pop_picture(regs(r, { a: 0, x }, { c: cy, ...nz(0) }));
  };
  // $3EAF: the common end of the shot-like handlers: the second mask column's low byte in A, the
  // mask columns' page in X, then (j_3EB6) the third columns fixed at $8020 and $8260 and the
  // renderer with the carry clear.
  function shot_tail(r, a, x) {
    M[0xE853] = a;
    M[0x3D] = 0;
    return j_3EB6(r, x);
  }
  function j_3EB6(r, x) {
    M[0xE84A] = x; M[0xE854] = x;
    M[0xE860] = 0x20; M[0xE861] = 0x80;
    M[0xE85D] = 0x60; M[0xE85E] = 0x82;
    return render_object(regs(r, { a: 0x82, x }, { c: 0 }));
  }
  // $3E77: the falling bolt of enemy kind 9: columns at $9920/$9930, masks at $99C0/$99D0.
  P.draw_bolt = function (r) {
    const x = r.x & 255;
    M[0x3F] = x;
    M[0xE84C] = 0x20; M[0xE856] = 0x30; M[0xE84D] = 0x99; M[0xE857] = 0x99;
    M[0xE849] = 0xC0;
    return shot_tail(regs(r, { x: 0x99 }), 0xD0, 0x99);
  };
  // $3E94: the thunder shot: columns at $92C0/$92D0, masks at $92E0/$92F0.
  P.draw_shot = function (r) {
    const x = r.x & 255;
    M[0x3F] = x;
    M[0xE84C] = 0xC0; M[0xE856] = 0xD0; M[0xE84D] = 0x92; M[0xE857] = 0x92;
    M[0xE849] = 0xE0;
    return shot_tail(regs(r, { x: 0x92 }), 0xF0, 0x92);
  };
  // $3ED4: the bottle, one of four pictures by its phase (sub-column), the fourth in the next
  // page; masks at $9940/$9960 by the same index.
  P.draw_bottle = function (r) {
    const x0 = r.x & 255;
    M[0x3F] = x0;
    const y = M[0xA9C4 + x0];
    let x = 0x98;
    let a = M[0xAB5B + y];
    if (a === 0) x = (x + 1) & 255;
    M[0xE84C] = a;
    a = (a + 0x10) & 255;
    M[0xE856] = a;
    M[0xE84D] = x; M[0xE857] = x;
    x = 0x99;
    a = M[0xAB5F + y];
    M[0xE849] = a;
    a = (a + 0x10) & 255;
    if (a === 0) return P.draw_fireball(regs(r, { a, x, y }, nz(0)));   // bne not taken: runs on into draw_fireball
    return shot_tail(regs(r, { x, y }), a, x);
  };
  // $3EFD: a fireball, the picture by direction and phase (sub-column): columns from
  // fireball_gfx_lo in page $99 ($9A for the three that are not $E0), masks in $9A.
  P.draw_fireball = function (r) {
    const x0 = r.x & 255;
    M[0x3F] = x0;
    const y = M[0xA9C4 + x0];
    let x = 0x99;
    let a = M[0xA826 + y];
    if (a !== 0xE0) x = (x + 1) & 255;
    M[0xE84C] = a;
    a = (a + 0x10) & 255;
    M[0xE856] = a;
    M[0xE84D] = x; M[0xE857] = x;
    x = 0x9A;
    a = M[0xA82A + y];
    M[0xE849] = a;
    a = (a + 0x10) & 255;
    if (a === 0) return P.draw_giant_block(regs(r, { a, x, y }, nz(0)));   // bne not taken: runs on into draw_giant_block
    return shot_tail(regs(r, { x, y }), a, x);
  };
  // $3F28: the giant falling block, object 0 only: its ten cells into ten glyphs, each the glyph
  // under it ANDed with the block's mask ($A270) and ORed with its picture ($A220), through the
  // pointers in $3D/$3E and $44/$45; then straight to the next object without draw_next.
  P.draw_giant_block = function (r) {
    let x = r.x & 255;
    if (x !== 0) return j_E97A(r);
    M[0x3D] = 0x20; M[0x44] = 0x70; M[0x3E] = 0xA2; M[0x45] = 0xA2;
    const p = zp16(0x40);
    let a = 0, y, s;
    for (x = 9; x >= 0; x--) {
      y = M[0xA82E + x];
      a = M[(p + y) & 0xFFFF];
      y = a;
      M[0x42] = M[0x0200 + y]; M[0x43] = M[0x0300 + y] | M[0x2F];
      const src = zp16(0x42), msk = zp16(0x44), pic = zp16(0x3D), dst = zp16(0x38);
      for (y = 7; y >= 0; y--) M[(dst + y) & 0xFFFF] = (M[(src + y) & 0xFFFF] & M[(msk + y) & 0xFFFF]) | M[(pic + y) & 0xFFFF];
      s = adc(M[0x44], 8, 0); M[0x44] = s.a;
      s = adc(M[0x3D], 8, s.c); M[0x3D] = s.a;
      s = adc(M[0x38], 8, s.c); M[0x38] = s.a;
      if (s.c) M[0x39] = (M[0x39] + 1) & 255;
      a = M[0x3C];
      M[0x3C] = (M[0x3C] + 1) & 255;
      y = M[0xA82E + x];
      M[(p + y) & 0xFFFF] = a;
    }
    return j_E97A(regs(r, { a, x: 0, y }, nz(0)));
  };
  // $3F88: the falling food: the item's picture in characters $46-$49 ($4230/$4240) through the
  // mask at $40A8/$40B8, from its sub-row.
  P.draw_falling_food = function (r) {
    const x = r.x & 255;
    M[0x3F] = x;
    M[0x3D] = M[0xA9D6 + x];
    M[0xE84C] = 0x30; M[0xE856] = 0x40; M[0xE84D] = 0x42; M[0xE857] = 0x42;
    M[0xE849] = 0xA8; M[0xE853] = 0xB8;
    return j_3EB6(regs(r, { a: 0xB8, x: 0x40 }), 0x40);
  };

  // --- the title ---------------------------------------------------------------------------------
  // $A5A0: the star field, then two rules of character $1E in colour $1E above and below the
  // score table.
  P.title_stars = function* (r) {
    const c = io();
    r = yield* P.star_field(r);
    for (let x = 0x21; x >= 0; x--) {
      M[0x5053 + x] = 0x1E; c.colourWrite(0x53 + x, 0x1E);
      M[0x525B + x] = 0x1E; c.colourWrite(0x25B + x, 0x1E);
    }
    return regs(r, { a: 0x1E, x: 0xFF }, nz(0xFF));
  };

  // --- the collision map ------------------------------------------------------------------------
  // $E9B8: for actor X, the map cell one column left and three rows above the one its position
  // gives, into map_ptr ($11/$12), with the offsets within the cell in sub_x/sub_y ($23/$24).
  P.actor_map_pointer = function (r) {
    const x = r.x & 255;
    let a = (M[0xBA + x] - 0x14) & 255;
    M[0x23] = a & 7;
    M[0x11] = (a >> 3) & 0x1F;
    M[0x11] = (M[0x11] - 1) & 255;
    a = (M[0xC2 + x] - 0x15) & 255;
    M[0x24] = a & 7;
    const y = (a >> 2) & 0xFE;
    let s = adc(M[0xAC03 + y], M[0x11], 0);
    M[0x11] = s.a;
    s = adc(M[0xAC04 + y], 0x85, s.c);
    M[0x12] = s.a;
    return regs(r, { a: s.a, x, y }, { c: s.c, v: s.v, ...nz(s.a) });
  };
};
})(typeof window !== 'undefined' ? window : globalThis);

/* port/src/flow.js */
// The main program and the interrupts: start ($4460), the score table (title_sequence $F005,
// title_loop $F04A), a game (play_game $08E4 with its pass loop at $0A07 and game_over $0A99),
// the three raster handlers (irq_bottom $06AB, irq_top $072E, irq_boss_lower $0795) with
// place_boss ($07E1), and the primitives every other group waits with: wait_frame ($E494),
// wait_frames ($7BC8), wait_5/wait_10 ($7BC3/$7BC6), play_tune ($05AD), read_keys ($7EB6),
// read_keys_wait ($7EB3), check_pause ($7E80), check_quit ($7EC1), the cracker's key stub
// ($3FC3) and irq_enter ($7BB3).
//
// P.program(entry) is the whole program as one generator, for the lockstep and the page:
// entry 'start' (the cold start at $4460, as the loader hands over), 'title' (the score table's
// key loop at $F0CC) or 'pass_loop' (in play, at the start of a pass, $0A07: the saved states'
// place). It
// catches every Goto: $09A5 (a round skip, with the carry), $F0EB (a quit: check_quit drops
// pass_loop's return address and wait_frames returns to the title loop's JSR), $F005 (the title).
//
// Checkpoints (P.CHECKPOINTS) are the addresses of the JSRs of play_game, pass_loop, game_over,
// title_sequence, title_loop and start's wait loop, yielded as { cp } when the program reaches
// them. The pass loop's wait polls frame_count ($08) directly, a line a turn; the one read of
// $08 that is not a poll (the LDX at $0A1F, which sets the pass's two compare operands) goes
// through P.io.irqByte so the lockstep hands it what the game read.
//
// What the handlers do not keep: irq_enter's copies of A, X and Y ($15-$17) are the interrupted
// code's registers, which the port has not got; the lockstep sessions leave $15-$17 out.
(function (root) {
'use strict';
const G = root.BBGroups = root.BBGroups || {};
const { nz, regs, adc, sbc, cmp } = root.BBUtil;
const { Goto } = root.BBPort;

// Every JSR of the main program, where the lockstep lines the game up with the port.
const CHECKPOINTS = [
  // play_game $08E4
  0x08E4, 0x08E9, 0x08F0, 0x0906, 0x0909, 0x0918, 0x091B, 0x0938, 0x093C, 0x093F,
  // the round loop
  0x09AC, 0x09AF, 0x09B2, 0x09B5, 0x09BA, 0x09BD, 0x09C8, 0x09D3, 0x09D6, 0x09D9, 0x09DC, 0x09DF, 0x09E2,
  0x09E5, 0x09E8, 0x09EB, 0x09EE, 0x09F1, 0x09F4, 0x09F7, 0x09FA,
  // pass_loop $0A07
  0x0A07, 0x0A0A, 0x0A0D, 0x0A10, 0x0A13, 0x0A16, 0x0A19, 0x0A1C, 0x0A38, 0x0A45, 0x0A48, 0x0A4B, 0x0A4E, 0x0A51, 0x0A54, 0x0A57,
  // after the round, game_over
  0x0A75, 0x0A78, 0x0A8F, 0x0A9B, 0x0AA0,
  // title_sequence $F005, title_loop $F04A
  0xF005, 0xF00C, 0xF013, 0xF01A, 0xF021, 0xF055, 0xF05C, 0xF065, 0xF068, 0xF0B9, 0xF0CC, 0xF0D7, 0xF0E8,
  // start $4460: the fire wait
  0x4565, 0x4590,
];
// The bytes the bottom interrupt writes and the main program reads (lockstep irqBytes).
const IRQ_BYTES = [0x0008, 0x00A4, 0x002A, 0x002B, 0x005D, 0x005E, 0xA9B1];
const IRQS = { 0x06AB: 'irq_bottom', 0x072E: 'irq_top', 0x0795: 'irq_boss_lower' };

G.flow = function (P) {
  const M = P.M;
  const io = () => P.io;
  P.CHECKPOINTS = CHECKPOINTS; P.IRQ_BYTES = IRQ_BYTES; P.IRQS = IRQS;
  P.sei = true;                                    // the processor's interrupt flag, for the page's clock

  // --- the waits ---------------------------------------------------------------------------
  // $E494: wait until the bottom interrupt has counted a frame.
  P.wait_frame = function* (r) {
    const a = M[0x08];
    while (M[0x08] === a) yield;
    return regs(r, { a }, cmp(a, M[0x08]));
  };
  // $7BC8: wait A frames, counting in $0100.
  P.wait_frames = function* (r) {
    M[0x0100] = r.a & 255;
    do { yield* P.wait_frame(r); M[0x0100] = (M[0x0100] - 1) & 255; } while (M[0x0100] !== 0);
    return regs(r, {}, nz(0));
  };
  P.wait_5 = function* (r) { return yield* P.wait_frames(regs(r, { a: 5 })); };
  P.wait_10 = function* (r) { return yield* P.wait_frames(regs(r, { a: 10 })); };
  // $05AD: start tune Y.
  P.play_tune = function* (r) {
    r = yield* P.wait_frame(r);
    M[0x5C3F] = r.y & 255;
    r = P.start_tune(r);
    return P.music_frame(r);
  };
  // $E9EA: the random generator; its carry is the ADC's (play_game adds to it).
  P.random = function (r) {
    let c = M[0x26] >> 7;
    let b = ((M[0x27] << 1) | c) & 255; c = M[0x27] >> 7; M[0x27] = b;
    let a = ((M[0x26] << 1) | c) & 255; c = M[0x26] >> 7; M[0x26] = a;
    const s = adc(M[0x27] ^ M[0x26], M[0x27], c);
    a = s.a ^ io().ciaRead(0x06);
    M[0x26] = a;
    return regs(r, { a }, { c: s.c, v: s.v, ...nz(a) });
  };
  // $7BB3: both handlers' entry. The registers it saves are the interrupted code's.
  P.irq_enter = function (r) {
    if (r.a !== undefined) { M[0x15] = r.a & 255; M[0x16] = r.x & 255; M[0x17] = r.y & 255; }
    M[0x2E] = M[0x01]; M[0x01] = 0x35; return regs(r, { a: 0x35 }, nz(0x35));
  };

  // --- the keyboard ------------------------------------------------------------------------
  // $3FC3: the cracker's stub. Its operand at $3FC4 is the menu's "fast movement" switch.
  P.trainer_key_hook = function (r) {
    const c = io();
    let a = M[0x3FC4];
    if (a !== 0) { M[0x8728] = a; M[0x8729] = a; }
    a = c.ciaRead(1);
    if (a === 0xDF) { a = M[0x21]; if (M[0x3FD4] === 0xE6) M[0x21] = (M[0x21] + 1) & 255; }   // LDA $21, or INC $21 with "level skip" on
    a = c.ciaRead(1);
    return regs(r, { a }, nz(a));
  };
  // $7EB6: select keyboard row 7 and read the columns; Z set when only RUN/STOP ($7F).
  P.read_keys = function (r) {
    io().ciaWrite(0, 0x7F);
    r = P.trainer_key_hook(regs(r, { a: 0x7F }));
    return regs(r, {}, cmp(r.a, 0x7F));
  };
  // $7EB3: a frame, then the keys.
  P.read_keys_wait = function* (r) { r = yield* P.wait_frame(r); return P.read_keys(r); };
  // $7E80: RUN/STOP pauses: the actors stop, the timers are kept, and the game waits for the
  // key to go up, come down and go up again.
  P.check_pause = function* (r) {
    r = P.read_keys(r);
    if (!r.z) return r;
    M[0x37] = (M[0x37] + 1) & 255;
    const t = [M[0x2A], M[0xA9B1], M[0x5D], M[0x5E]];
    do { r = yield* P.read_keys_wait(r); } while (r.z);
    do { r = yield* P.read_keys_wait(r); } while (!r.z);
    do { r = yield* P.read_keys_wait(r); } while (r.z);
    M[0x5E] = t[3]; M[0x5D] = t[2]; M[0xA9B1] = t[1]; M[0x2A] = t[0];
    M[0x37] = (M[0x37] - 1) & 255;
    return regs(r, { a: t[0] }, nz(M[0x37]));
  };
  // $7EC1: Q quits: silence, drop pass_loop's return address, wait 25 frames and return to the
  // title loop (a Goto to the instruction after its JSR play_game).
  P.check_quit = function* (r) {
    r = P.read_keys(r);
    if (r.a !== 0xBF) return r;
    M[0x37] = 0; M[0x5AFF] = 0;
    r = P.clear_actors_from_x(regs(r, { a: 0, x: 7 }));
    r = P.actors_to_sprites(r);
    r = P.silence(r);
    r = yield* P.wait_frames(regs(r, { a: 0x19 }));
    throw new Goto(0xF0EB, r);
  };

  // --- the interrupts ----------------------------------------------------------------------
  // DEC $D019: a read-modify-write writes the value read (which acknowledges the interrupt,
  // its bit 0 being set) and then the value less one.
  const ack = () => { const c = io(); const v = c.vicRead(0x19); c.vicWrite(0x19, v); c.vicWrite(0x19, (v - 1) & 255); };
  // $0717: next raster line A, next handler X/Y, acknowledge, restore the port.
  function irq_exit(a, x, y) {
    const c = io();
    c.vicWrite(0x12, a & 255); M[0xFFFE] = x & 255; M[0xFFFF] = y & 255;
    ack(); M[0x01] = M[0x2E];
  }
  // $06AB: line 251.
  P.irq_bottom = function () {
    const c = io();
    P.irq_enter({});
    if (!(M[0x2B] & 0x80)) {
      M[0x2B] = (M[0x2B] - 1) & 255;
      if (M[0x2B] === 0) {
        M[0x2B] = 0x32;
        M[0x2A] = (M[0x2A] - 1) & 255;
        const b = M[0xA9B1];
        if (b !== 0 && !(b & 0x80)) M[0xA9B1] = b - 1;
        M[0x5D] = (M[0x5D] - 1) & 255; M[0x5E] = (M[0x5E] - 1) & 255;
      }
    }
    M[0x08] = (M[0x08] + 1) & 255;
    M[0x077C] = 0x4C; M[0x0768] = 0x4C; M[0x0786] = 0x4C;
    if (M[0x37] !== 0 && (M[0x08] & 1)) {
      P.actors_to_sprites({ a: M[0x08] & 1, x: 0, y: 0 });
      M[0x077C] = 0x2C;
      if (M[0x4D] !== 0) P.step_water({ a: M[0x4D], x: 0, y: 0 });
    }
    P.music_frame({ a: 0, x: 0, y: 0 });
    if (M[0x5AFF] !== 0) { P.place_boss({ a: M[0x5AFF], x: 0, y: 0 }); M[0x0768] = 0x2C; M[0x0786] = 0x2C; }
    c.vicWrite(0x22, M[0x1C]); c.vicWrite(0x23, M[0x1E]);
    irq_exit(M[0x20] !== 0 ? M[0x20] : 0x32, 0x2E, 0x07);
  };
  // $072E: line $32 (or split_line).
  P.irq_top = function () {
    const c = io();
    P.irq_enter({});
    if (M[0x20] !== 0) {
      c.vicWrite(0x22, M[0x1D]); c.vicWrite(0x23, M[0x1F]);
      if ((M[0x08] & 7) === 0) {
        for (let x = 7; x >= 0; x--) {
          let a = M[0x53F8 + x];
          if (a >= 0xD5) a = (a - 4) & 255;
          else { a = (a + 4) & 255; if (a === 0) a = 0xFC; }
          M[0x53F8 + x] = a;
        }
      }
      irq_exit(0xFB, 0xAB, 0x06);
      return;
    }
    let a = 0x52;
    const x = M[0x2F], cx = x >= 0x48 ? 1 : 0;
    if (x === 0x48) a = 0x40;
    c.vicWrite(0x18, a);
    if (M[0x0768] !== 0x4C) {                      // the boss: a third handler 30 lines below its top
      M[0xFFFE] = 0x95; M[0xFFFF] = 0x07;
      c.vicWrite(0x12, (M[0xBD] + 0x1E + cx) & 255);
    }
    if (M[0x077C] !== 0x4C) {                      // every other frame of play: the actors
      ack();
      P.update_actors({ a: 0, x: 0, y: 0 });
    }
    if (M[0x0786] !== 0x4C) { ack(); M[0x01] = M[0x2E]; return; }
    irq_exit(0xFB, 0xAB, 0x06);
  };
  // $0795: 30 lines below the boss's top: sprites 2-4 down 42 lines with the next three shapes.
  P.irq_boss_lower = function () {
    const c = io();
    M[0x2E] = M[0x01]; M[0x01] = 0x35;
    const s = adc(c.vicRead(0x05), 0x2A, 0);
    c.vicWrite(0x05, s.a); c.vicWrite(0x07, s.a); c.vicWrite(0x09, s.a);
    let a = adc(M[0x53FA], 0x08, s.c).a;
    for (let x = 2; x >= 0; x--) { M[0x53FA + x] = a; M[0x57FA + x] = a; a = (a - 1) & 255; }
    c.vicWrite(0x12, 0xFB); M[0xFFFE] = 0xAB; M[0xFFFF] = 0x06;
    ack(); M[0x01] = M[0x2E];
  };
  // $07E1: the boss's six sprites; after the win it walks, on the title it flips the top line.
  P.place_boss = function (r) {
    const c = io();
    c.vicWrite(0x10, 0);
    let a = M[0xBC];
    c.vicWrite(0x04, a); c.vicWrite(0x0A, a);
    let s = adc(a, 0x18, 0);
    c.vicWrite(0x06, s.a); c.vicWrite(0x0C, s.a);
    let y = r.y;
    if (s.c) { y = 0xD8; c.vicWrite(0x10, 0xD8); }
    s = adc(s.a, 0x18, 0);
    c.vicWrite(0x08, s.a); c.vicWrite(0x0E, s.a);
    if (s.c) c.vicWrite(0x10, 0x90);
    a = M[0xBD];
    c.vicWrite(0x05, a); c.vicWrite(0x07, a); c.vicWrite(0x09, a);
    s = adc(a, 0x15, 0);
    c.vicWrite(0x0B, s.a); c.vicWrite(0x0D, s.a); c.vicWrite(0x0F, s.a);
    s = adc(0xD9, M[0xBE], s.c);
    for (let x = 0; x < 6; x++) { M[0x53FA + x] = s.a; M[0x57FA + x] = s.a; s = adc(s.a, 1, s.c); }
    for (let x = 5; x >= 0; x--) c.vicWrite(0x29 + x, M[0xC0]);
    const lv = M[0x10];
    r = regs(r, { a: lv, x: 0xFF, y }, cmp(lv, 0x64));   // after the colour loop X is $FF
    if (lv === 0x64) {
      const dir = M[0xBF];
      if (dir === 0) {
        M[0xBC] = (M[0xBC] - 1) & 255;
        if (M[0xBC] !== 0x23) return regs(r, { a: M[0xBC] }, cmp(M[0xBC], 0x23));
      } else {
        M[0xBC] = (M[0xBC] + 1) & 255;
        if (M[0xBC] !== 0) return regs(r, { a: dir }, nz(M[0xBC]));
        M[0xBC] = (M[0xBC] - 1) & 255;
      }
      M[0xBF] ^= 1;
      M[0xBE] ^= 0x18;
      return regs(r, { a: M[0xBE] }, nz(M[0xBE]));
    }
    if (lv !== 0xFF) return regs(r, {}, cmp(lv, 0xFF));
    const x = (M[0x08] >> 5) & 1;
    let yy = M[0x3F84 + x], last = 0;
    for (let i = 9; i >= 0; i--) { last = M[0x57D4 + yy]; M[0x50AF + i] = last; yy = (yy - 1) & 255; }
    return regs(r, { a: last, x: 0xFF, y: yy }, { z: 0, n: 1, c: (M[0x08] >> 4) & 1 });   // the carry is the fifth LSR's
  };

  // --- start ($4460) -------------------------------------------------------------------------
  P.start = function* (r) {
    const c = io();
    P.sei = true;
    let a;
    for (;;) {
      a = c.vicRead(0x12); M[0x26] = a;
      a = ((a << 1) & 255) ^ c.ciaRead(0x04); M[0x27] = a;
      if (a !== 0) break;
      yield;
    }
    for (let x = 0; x < 256; x++) {
      M[0x4800 + x] = M[0x4000 + x]; M[0x4900 + x] = M[0x4100 + x]; M[0x4A00 + x] = M[0x4200 + x]; M[0x4B00 + x] = M[0x4300 + x];
      M[0x0200 + x] = 0; M[0x0300 + x] = 0;
    }
    a = 0; let y = 0;
    for (let x = 1; x < 256; x++) {
      a += 8;
      if (a > 255) { a &= 255; y++; }
      M[0x0200 + x] = a; M[0x0300 + x] = y;
    }
    for (let x = 2; x < 256; x++) M[x] = 0;
    M[0x01] = 0x35;
    c.cia2Write(0x00, 0x96);
    c.vicWrite(0x18, 0x20);
    a = c.vicRead(0x11) & 0x7F;
    c.vicWrite(0x11, a); c.ciaWrite(0x0D, a); c.ciaRead(0x0D);
    c.vicWrite(0x19, 1); c.vicWrite(0x1A, 1); c.vicWrite(0x12, 0xFB);
    M[0xFFFE] = 0xAB; M[0xFFFF] = 0x06;
    c.vicWrite(0x1B, 0); c.vicWrite(0x16, 0xD8);
    M[0x30] = 0x54; M[0x2F] = 0x48;
    M[0xFFFA] = 0x2D; M[0xFFFB] = 0x07;
    M[0x37] = 0; M[0x5AFF] = 0;
    r = P.silence(regs(r, { a: 0, x: 0xFF, y: 0 }));
    P.sei = false;
    r = P.clear_screens(r);
    M[0x8548] = 5; M[0x8549] = 3;
    for (let x = 7; x >= 0; x--) { M[0x8570 + x] = M[0x47B5 + x]; M[0x8598 + x] = M[0x47BD + x]; M[0x85C0 + x] = M[0x47C5 + x]; }
    for (let x = 0x0C; x >= 0; x--) M[0x6B + x] = (M[0x47CD + x] - 0x20) & 255;
    c.vicWrite(0x1C, 0xFF); c.vicWrite(0x26, 1); c.vicWrite(0x25, 2);
    M[0x1C] = 1; M[0x1E] = 1;
    r = P.print_string(regs(r, { a: 1, x: 0x2D, y: 0x46 }));
    r = P.print_string(regs(r, { x: 0xF0, y: 0x46 }));
    r = yield* P.play_tune(regs(r, { y: 0x35 }));
    wait: for (;;) {
      yield { cp: 0x4565 };
      r = yield* P.wait_frame(r);
      if (!(c.ciaRead(0) & 0x10)) break;
      if (!(c.ciaRead(1) & 0x10)) break;
      c.ciaWrite(0, 0xFD);
      if (c.ciaRead(1) === 0xDF) {
        // super_keys: U, P, O, R and the Commodore key, a row at a time
        let ok = true;
        for (const [row, want] of [[0xF7, 0xBF], [0xDF, 0xFD], [0xEF, 0xBF], [0xFB, 0xFD], [0x7F, 0xDF]]) {
          c.ciaWrite(0, row);
          if (c.ciaRead(1) !== want) { ok = false; break; }
        }
        if (ok) {
          c.vicWrite(0x20, 2);
          let p = 0xAE51;
          for (let x = 0x63; x > 0; x--) {
            let yy = 0;
            for (;;) {
              a = M[(p + yy) & 0xFFFF];
              if (a === 0) break;
              let k = a & 7;
              const rest = a & 0xF8;
              if (k === 0) k = 1; else if (k === 6) k = 5;
              M[(p + yy) & 0xFFFF] = k | rest;
              yy = (yy + 3) & 255;
              if (yy === 0) break;
            }
            p = (p + yy + 1) & 0xFFFF;
          }
          c.vicWrite(0x20, 0);
          r = P.silence(regs(r, { a: 0, x: 0, y: 0 }));
          return r;                                  // JMP title_sequence
        }
      }
      // start_wait_more
      c.ciaWrite(0, 0x7F); c.ciaWrite(1, 0xFF);
      if (M[0xA4] !== 0) continue wait;
      break;
    }
    // start_fire_released: both buttons up
    for (;;) {
      yield { cp: 0x4590 };
      r = yield* P.wait_frame(r);
      if (!(c.ciaRead(0) & 0x10)) continue;
      if (!(c.ciaRead(1) & 0x10)) continue;
      break;
    }
    r = P.silence(regs(r, { a: 0x10 }));
    return r;                                      // JMP title_sequence
  };

  // --- the score table ($F005, $F04A) ------------------------------------------------------
  P.title_sequence = function* (r) {
    const c = io();
    yield { cp: 0xF005 };
    r = yield* P.title_stars(r);
    yield { cp: 0xF00C };
    r = P.print_string(regs(r, { x: 0xEE, y: 0xF0 }));
    yield { cp: 0xF013 }; r = P.print_at(regs(r, { x: 5, y: 8 }));
    yield { cp: 0xF01A }; r = P.print_at(regs(r, { x: 3, y: 0x0B }));
    yield { cp: 0xF021 }; r = P.print_at(regs(r, { x: 1, y: 0x0E }));
    for (let x = 1, y = 2; x >= 0; x--, y -= 2) {
      c.vicWrite(0x27 + x, M[0x8570 + x]);
      c.vicWrite(0x00 + y, 0x68);
      c.vicWrite(0x01 + y, M[0xA632 + x]);
      M[0x53F8 + x] = 0x60;
    }
    let x = 0xFF;
    if (M[0xF043] === 0xA9) {                      // as loaded: LDA #$FF / STA level / JMP title_patch
      M[0x10] = M[0xF044];
      c.vicWrite(0x15, 3);
      for (let i = 6; i >= 0; i--) M[0xF043 + i] = M[0x4080 + i];
    } else {                                       // patched: STX level / LDA #3 / STA $D015
      M[0x10] = x;
      c.vicWrite(0x15, 3);
    }
    return yield* P.title_loop(regs(r, { a: 3, x, y: 0 }));
  };
  P.title_loop = function* (r, fromKeyLoop) {
    const c = io();
    if (fromKeyLoop) return yield* title_key_loop(r);
    M[0x40] = 0x4F; M[0x41] = 0x51; M[0xBD] = 0x51;
    let x = (r.x + 1) & 255;
    yield { cp: 0xF055 }; r = P.print_score(regs(r, { a: 0x51, x }));
    M[0x40] = 0xC7;
    yield { cp: 0xF05C }; r = P.print_score(regs(r, { a: 0xC7 }));
    M[0x40] = 0x3F; M[0x41] = (M[0x41] + 1) & 255;
    yield { cp: 0xF065 }; r = P.print_score(regs(r, { a: 0x3F }));
    yield { cp: 0xF068 }; r = P.clear_back_screen(r);
    for (x = 9; x >= 0; x--) { M[0x57D4 + x] = M[0x6B + x]; c.colourWrite(0xAF + x, M[0xF073]); }
    M[0x5AFF] = 0xFF; M[0x45] = 0; M[0x8572] = 1;
    let printed = 0;
    for (x = 2; x >= 0; x--) {
      M[0x41] = M[0xA637 + x];
      const y = M[0xA634 + x]; M[0x40] = y;
      const p = () => M[0x40] | (M[0x41] << 8);
      const a = M[0x0409 + x];
      if (a < 0x63) {
        M[0x38] = x;
        if (printed++) yield;                      // the same checkpoint twice running counts once (lockstep.js): a turn between
        yield { cp: 0xF0B9 };
        r = P.print_two_digits(regs(r, { a: a + 1, x: M[0x8570 + x], y: (y + 1) & 255 }));
        x = M[0x38];
      } else if (a === 0x63) {
        M[(p() + 0) & 0xFFFF] = 1;
        M[0x38] = x;
        if (printed++) yield;
        yield { cp: 0xF0B9 };
        r = P.print_two_digits(regs(r, { a: 0, x: M[0x8570 + x], y: (y + 1) & 255 }));
        x = M[0x38];
      } else {
        for (let i = 2; i >= 0; i--) M[(p() + i) & 0xFFFF] = M[0x75 + i];
      }
    }
    M[0xB3] = 0; M[0xB2] = 1; M[0x8572] = 0x0A;
    return yield* title_key_loop(r);
  };
  // $F0CC: the wait for 1 or 2.
  function* title_key_loop(r) {
    const c = io();
    for (;;) {
      yield { cp: 0xF0CC };
      r = yield* P.read_keys_wait(r);
      if (r.a === 0xFE) break;
      if (r.a === 0xF7) { M[0xB3] = (M[0xB3] + 1) & 255; break; }
      yield { cp: 0xF0D7 };
      r = P.random(r);
      c.ciaWrite(1, 0xFF);
    }
    M[0x10] = (M[0x10] + 1) & 255;
    M[0x5AFF] = (M[0x5AFF] + 1) & 255;
    yield { cp: 0xF0E8 };
    r = yield* P.play_game(regs(r, { a: r.a, x: 1, y: 0 }));
    throw new Goto(0xF005, r);                     // JMP title_sequence
  }

  // --- a game ($08E4) -----------------------------------------------------------------------
  P.play_game = function* (r) {
    const c = io();
    yield { cp: 0x08E4 }; r = yield* P.star_field(r);
    yield { cp: 0x08E9 }; r = yield* P.play_tune(regs(r, { y: 4 }));
    yield { cp: 0x08F0 }; r = P.print_string(regs(r, { x: 0x41, y: 0xAC }));
    M[0xBA] = 0x74; M[0xBB] = 0xE4; M[0xC2] = 0x83; M[0xC3] = 0x83;
    const two = M[0xB3];
    M[0xB3] = (M[0xB3] + 1) & 255;
    yield { cp: 0x0906 }; r = yield* P.intro_step_armed(regs(r, { a: two }));
    yield { cp: 0x0909 }; r = yield* P.wait_frame(r);
    M[0x20] = 1; M[0xF073] = 1;
    c.vicWrite(0x15, 0xFF);
    yield { cp: 0x0918 }; r = yield* P.wait_frames(regs(r, { a: 0xFF, x: 1 }));
    yield { cp: 0x091B }; r = P.clear_screens(r);
    M[0x54] = 0; M[0x55] = 0; M[0x0409] = 0; M[0x040A] = 0; M[0x59BF] = 0; M[0x8728] = 0; M[0x8729] = 0;
    M[0x5B3F] = 0x12;
    yield { cp: 0x0938 }; r = P.reset_powers(regs(r, { a: 0x12, x: 0 }));
    yield { cp: 0x093C }; r = P.reset_powers(regs(r, { x: 1 }));
    yield { cp: 0x093F }; r = P.random(regs(r, { x: 1 }));
    M[0x58] = (((r.a & 0x1E) + 0x0A) + (r.c ? 1 : 0)) & 255;   // the ADC keeps random's carry
    M[0xBA] = 0x84; M[0xBB] = 0x94; M[0xC2] = 0xB5; M[0xC3] = 0xB5;
    M[0x045A] = 3; M[0x045B] = 3; M[0x59FF] = 3;
    M[0xAB] = 7;
    for (let x = 5; x >= 0; x--) M[0x0400 + x] = 0;
    M[0xAC] = 0; M[0xAD] = 0; M[0xAE] = 1; M[0xAF] = 4;
    let y = 3;
    if (two === 0) { y = 1; M[0xAB] = (M[0xAB] + 1) & 255; M[0xB3] = 0; M[0xBB] = 0; M[0xC3] = 0; }
    M[0x5B7F] = y;
    M[0x23DE] = 0x60;
    M[0x0F73] = 0x4C; M[0x049D] = 0x4C;
    M[0x0A39] = 0xED; M[0x0A3A] = 0x0B;
    r = regs(r, { a: 0x0B, x: 0xFF, y }, { c: 1 });
    return yield* P.rounds(r);
  };
  // The round loop from $09A5, entered with the carry: set for the first round (and by
  // j_09A5 when the last round ended with round_done >= $7F), clear by a skip. With fromPass
  // it starts at the pass loop (a session saved at a pass start).
  P.rounds = function* (r, fromPass) {
    const c = io();
    for (;;) {
      if (!fromPass) {
        if (r.c) {
          c.vicWrite(0x15, 0);
          yield { cp: 0x09AC }; r = P.fill_colour(regs(r, { a: 0 }));
          yield { cp: 0x09AF }; r = yield* P.build_round(r);
          yield { cp: 0x09B2 }; r = yield* P.scroll_in_round(r);
          yield { cp: 0x09B5 }; r = P.copy_round_number(r);
          yield { cp: 0x09BA }; r = P.fill_colour(regs(r, { a: 0x0D }));
          yield { cp: 0x09BD }; r = P.draw_panel(r);
          c.colourWrite(0, 9); c.colourWrite(1, 9);
          yield { cp: 0x09C8 }; r = yield* P.intro_step_armed(regs(r, { a: 9 }));
          c.vicWrite(0x15, 0xFF);
          r = regs(r, { a: 0xFF });
        } else {
          yield { cp: 0x09D3 }; r = yield* P.build_round(r);
          yield { cp: 0x09D6 }; r = yield* P.scroll_in_round(r);
          yield { cp: 0x09D9 }; r = P.copy_round_number(r);
        }
        yield { cp: 0x09DC }; r = P.print_scores(r);
        yield { cp: 0x09DF }; r = P.build_air_currents(r);
        yield { cp: 0x09E2 }; r = yield* P.start_round(r);
        yield { cp: 0x09E5 }; r = yield* P.init_round_state(r);
        yield { cp: 0x09E8 }; r = yield* P.float_down(r);
        yield { cp: 0x09EB }; r = P.build_letter_bubbles(r);
        yield { cp: 0x09EE }; r = P.draw_extend_letters(r);
        yield { cp: 0x09F1 }; r = P.place_items(r);
        yield { cp: 0x09F4 }; r = P.save_screen(r);
        yield { cp: 0x09F7 }; r = yield* P.drop_in_enemies(r);
        yield { cp: 0x09FA }; r = yield* P.round_banner(r);
        M[0x2B] = 0x32;
        M[0x08] = 0;
        M[0x37] = (M[0x37] - 1) & 255;
        r = regs(r, { a: 0 });
      }
      fromPass = false;
      r = yield* P.pass_loop(r);
      if (r === null) return regs({}, { a: 0x96 });   // game over: back to the title loop
      // the round is done
      M[0x37] = 0; M[0x5AFF] = 0;
      yield { cp: 0x0A75 }; r = yield* P.wait_frame(regs(r, { a: 0 }));
      yield { cp: 0x0A78 }; r = yield* P.end_all_objects(r);
      M[0x10] = (M[0x10] + 1) & 255;
      const a = M[0x10];
      for (let x = 1; x >= 0; x--) if (M[0xB2 + x] !== 0) M[0x0409 + x] = a;
      if (a === 0x64) {
        r = yield* P.ending(regs(r, { a, x: 0xFF, y: M[0xB2] }));   // JMP ending; its RTS is play_game's return
        return r;
      }
      yield { cp: 0x0A8F }; r = yield* P.intro_step_armed(regs(r, { a, x: 0xFF, y: M[0xB2] }));
      r = regs(r, { a: M[0x21] }, cmp(M[0x21], 0x7F));
    }
  };
  // $0A07. Returns null at game over (after its wait), else the registers at $0A6E.
  P.pass_loop = function* (r) {
    for (;;) {
      yield { cp: 0x0A07 }; r = yield* P.flip_buffers(r);
      yield { cp: 0x0A0A }; r = yield* P.check_pause(r);
      yield { cp: 0x0A0D }; r = yield* P.check_quit(r);
      yield { cp: 0x0A10 }; r = P.check_extra_life(r);
      yield { cp: 0x0A13 }; r = yield* P.round_timers(r);
      yield { cp: 0x0A16 }; r = P.print_scores(r);
      yield { cp: 0x0A19 }; r = P.run_fires(r);
      yield { cp: 0x0A1C }; const f0 = M[0x08]; r = yield* P.check_deaths(r);
      // The LDX frame_count at $0A1F: through irqByte, so the lockstep hands the port what the
      // game read; but when check_deaths has just waited for frames (a death), the game's own
      // polling reads come first in the stretch and the port's would be matched with those, so
      // the byte is read directly, which the yields of the wait have brought up to date.
      let x = M[0x08] !== f0 ? M[0x08] : P.io.irqByte(0x08);
      M[0x0A5D] = x; x = (x + 1) & 255; M[0x0A61] = x;
      if (M[0xA824] !== 0) M[0xA824]--;
      if (M[0xA825] !== 0) M[0xA825]--;
      r = regs(r, { a: M[0xA825], x }, nz(M[0xA825]));
      yield { cp: 0x0A38 };
      if (M[0x0A38] === 0x20) {
        const t = M[0x0A39] | (M[0x0A3A] << 8);
        if (t === 0x0BED) r = P.spawn_special_bubble(r);
        else if (t === 0x1134) r = P.boss_hit_test(r);
        else throw new Error('pass hook to ' + t.toString(16));
      }
      if (M[0x58FF] !== 0 && M[0x593F] === 0) { yield { cp: 0x0A45 }; r = yield* P.sky_flash(regs(r, { a: 0 }, nz(0))); }
      else r = regs(r, { a: M[0x58FF] !== 0 ? M[0x593F] : 0 });
      yield { cp: 0x0A48 }; r = P.draw_objects(r);
      yield { cp: 0x0A4B }; r = P.push_bubbles(r);
      yield { cp: 0x0A4E }; r = P.move_bubbles(r);
      yield { cp: 0x0A51 }; r = P.age_objects(r);
      yield { cp: 0x0A54 }; r = yield* P.check_items(r);
      yield { cp: 0x0A57 }; r = yield* P.check_extend(r);
      for (;;) {
        const f = M[0x08];
        if (f !== M[0x0A5D] && f !== M[0x0A61]) break;
        yield;
      }
      if ((M[0xB2] | M[0xB3]) === 0) {
        // game_over $0A99
        M[0x37] = (M[0x37] + 1) & 255;
        yield { cp: 0x0A9B }; r = P.print_scores(regs(r, { a: 0 }, nz(0)));
        yield { cp: 0x0AA0 }; r = yield* P.play_tune(regs(r, { y: 0x20 }));
        r = yield* P.wait_frames(regs(r, { a: 0x96 }));
        return null;
      }
      if (M[0x21] === 0) { r = regs(r, { a: 0 }, nz(0)); continue; }
      return regs(r, { a: M[0x21] }, nz(M[0x21]));
    }
  };

  // --- the whole program ----------------------------------------------------------------------
  P.program = function* (entry) {
    let place = entry === 'start' ? 0x4460 : entry === 'title' ? 0xF0CC : entry === 'pass_loop' || !entry ? 0x0A07 : entry;
    let r = { a: 0, x: 0, y: 0, c: 0, z: 0, n: 0 };
    for (;;) {
      try {
        if (place === 0x4460) { r = yield* P.start(r); place = 0xF005; }
        else if (place === 0xF005 || place === 0xF0EB) { r = yield* P.title_sequence(r); place = 0xF005; }
        else if (place === 0xF0CC) { r = yield* P.title_loop(r, true); place = 0xF005; }
        else if (place === 0x09A5) { r = yield* P.rounds(r); place = 0xF005; }
        else if (place === 0x0A07) { r = yield* P.rounds(r, true); place = 0xF005; }
        else throw new Error('program: no entry at $' + place.toString(16));
      } catch (e) {
        if (!(e instanceof Goto)) throw e;
        place = e.to; r = e.r || r;
        if (![0x09A5, 0xF005, 0xF0EB, 0x0A07, 0xF0CC].includes(place)) throw new Error('Goto $' + place.toString(16) + ': the program has no such place');
      }
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);

/* port/src/page.js */
// The runtime: the port on a virtual PAL clock (312 lines of 63 cycles), the raster interrupts
// on their lines, the screen drawn once a frame from memory by the site's video chip model, the
// SID writes streamed to the site's SID, the keyboard and two joysticks.
//
//   const rt = BBRuntime.create(image, { cost });   // image: the game's 64 KB as the loader leaves it
//   rt.runTo(rt.cycles + FRAME);                     // one frame of C64 time
//   rt.frameData()                                   // what C64.renderFrame draws
//
// Pacing: every yield of the port's program costs cost['@yield'] cycles (a bare yield, one turn
// of a polling loop, one raster line), and every checkpoint the cycles of the stretch that follows
// it (cost[address], measured on the kit's machine in lockstep: the cycles from that JSR to the
// next, the interrupts' own taken out); an interrupt costs cost['@irq'] where it falls (its
// handler's measured cycles, update_actors included when it runs). A { cycles: n } yield costs n.
// A routine's work takes no time of its own beyond these.
(function (root) {
'use strict';
const LINE = 63, LINES = 312, FRAME = LINE * LINES;
const IRQ_AT = { 0x06AB: 'irq_bottom', 0x072E: 'irq_top', 0x0795: 'irq_boss_lower' };

function create(image, opts = {}) {
  const M = new Uint8Array(image);
  const rt = { cycles: 0, frame: 0, busy: false, M, FRAME, LINE, LINES };
  const chips = rt.chips = root.BBChips.makeChips();
  chips.io.irqByte = a => M[a];
  // the SID writes, to the page's sound: rt.onSid(register, value, frame)
  const sidWrite = chips.io.sidWrite, write = chips.io.write;
  chips.io.sidWrite = (r, v) => { sidWrite(r, v); if (rt.onSid) rt.onSid(r & 0x1F, v & 255, rt.frame); };
  chips.io.write = (a, v) => { write(a, v); if (rt.onSid && a >= 0xD400 && a < 0xD800) rt.onSid(a & 0x1F, v & 255, rt.frame); };
  const P = rt.P = opts.makePort ? opts.makePort(M, chips.io) : root.BBPort.makePort(M, chips.io);
  const COST = opts.cost || {};
  const YIELD = COST['@yield'] === undefined ? LINE : COST['@yield'];
  const IRQ = COST['@irq'] || {};
  // the port's own sense of time: the stretch after each checkpoint
  let lastLine = 0;
  rt.sidWrites = null;                             // set by the page: (register, value, cycles) for each SID write
  // the frame being drawn: the VIC's registers, CIA 2's port, memory and colour RAM as it began, and
  // the writes since, the memory the video chip reads among them (the sprite pointers the interrupts
  // set, say) where the game made them (site/lib/c64.js, videoMemory)
  rt.keep = {};
  const vm = root.C64.videoMemory(M, chips.colour, { keep: rt.keep });
  const bank = () => 3 - ((chips.pra2 | ~chips.ddra2) & 3);
  let frameVic = Uint8Array.from(chips.vic), frameCia2 = [chips.pra2, chips.ddra2], frameMem = null;
  function beginFrame() {
    frameVic = Uint8Array.from(chips.vic); frameCia2 = [chips.pra2, chips.ddra2];
    chips.vicLog = []; chips.sidLog = [];
    frameMem = vm.begin();
  }
  beginFrame();
  // the clock: to t, raising the raster interrupt on its line as it goes
  function advance(t) {
    while (rt.cycles < t) {
      const nextLine = (lastLine + 1) * LINE;
      const step = Math.min(t, nextLine);
      rt.cycles = step;
      vm.at(rt.cycles, chips.vicLog, bank());
      chips.cycle = (rt.cycles % LINE) + 1;
      if (rt.cycles >= nextLine) {
        lastLine++;
        const l = lastLine % LINES;
        chips.line = l;
        if (l === 0) { rt.frame++; rt.last = rt.frameData(); rt.onFrame && rt.onFrame(rt.last); beginFrame(); }
        if (l === chips.compareLine()) chips.latch |= 1;
        if ((chips.latch & chips.enable & 1) && !P.sei) {
          const v = M[0xFFFE] | (M[0xFFFF] << 8), name = IRQ_AT[v];
          if (!name) throw new Error('interrupt vector $' + v.toString(16) + ' is not a handler of the port');
          chips.cycle = 1;
          const key = name === 'irq_top' && M[0x077C] !== 0x4C ? 'irq_top_actors' : name;   // the top handler with update_actors
          P[name]();
          const c = IRQ[key] || 0;
          if (c) t += c;
        }
      }
    }
  }
  const it = P.program(opts.entry || 'start');
  function step() {
    const y = it.next().value;
    if (y && y.cp !== undefined) advance(rt.cycles + (COST[y.cp] || 0));
    else if (y && y.cycles !== undefined) advance(rt.cycles + y.cycles);
    else advance(rt.cycles + YIELD);
    return y;
  }
  rt.step = step;
  rt.runTo = function (t) { while (rt.cycles < t) rt.step(); };
  // run until the program yields checkpoint cp (the first pass of play, say), without a frame limit
  rt.runToCheckpoint = function (cp, maxFrames = 100000) {
    const end = rt.frame + maxFrames;
    for (;;) { const y = rt.step(); if (y && y.cp === cp) return true; if (rt.frame > end) return false; }
  };
  // What C64.renderFrame draws: the frame's starting registers, memory and colour RAM, and its
  // writes (the last complete frame's in rt.last).
  rt.frameData = function () {
    return { vic: frameVic, cia2: frameCia2, writes: chips.vicLog, mem: frameMem.mem, colourMem: frameMem.colour, keep: rt.keep };
  };
  rt.last = rt.frameData();
  return rt;
}
root.BBRuntime = { create, FRAME, LINE, LINES };
})(typeof window !== 'undefined' ? window : globalThis);
window.BB_COST = {
 "2515": 49190,
 "2518": 11525,
 "2521": 249,
 "2524": 1050,
 "2527": 48442,
 "2530": 42220,
 "2533": 4524,
 "2536": 8622,
 "2539": 11435,
 "2542": 590,
 "2545": 1840,
 "2548": 15629,
 "2551": 0,
 "2554": 1208,
 "2567": 2198,
 "2570": 65,
 "2573": 67,
 "2576": 123,
 "2579": 75,
 "2582": 1055,
 "2585": 73,
 "2588": 112,
 "2616": 11,
 "2632": 4511,
 "2635": 419,
 "2638": 1570,
 "2641": 794,
 "2644": 89,
 "2647": 0,
 "2677": 0,
 "2680": 1809,
 "2703": 423,
 "2715": 1057,
 "2720": 0,
 "61445": 197528,
 "61452": 9336,
 "61459": 1042,
 "61466": 1042,
 "61473": 1147,
 "61525": 296,
 "61532": 323,
 "61541": 292,
 "61544": 6686,
 "61625": 91,
 "61644": 0,
 "61655": 52,
 "@yield": 63,
 "@irq": {
  "irq_top_actors": 1880,
  "irq_bottom": 1223,
  "irq_top": 119,
  "irq_boss_lower": 169
 }
};
