// The game from PLAY GAME on ($6073-$622A): the players counted and the wizards made ready, the
// scenario started, the turn loop (the independent creatures, then each player in turn, magic
// spreading after each) and a human player's turn, reading the controls until END TURN leaves it.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.loop = function (P) {
  const M = P.M, def = P.def, w = P.w, setw = P.setw;

  // start_game: nothing without a scenario ($D03F). HOW MANY PLAYERS? ($E2, keys 1 to 4 through
  // KEY-SCAN and the table at $CDD9) unless the scenario is for one ($D048); each wizard's spells
  // back to their full levels (a wizard with none made at random); against the computer
  // ($D064, a scenario for one or one player) the second wizard is the scenario's own ($D082,
  // seventy bytes) and the player count one more, refused for a wizard made for another scenario
  // ($CEEB). Then the scenario's start ($D01B) and start-up ($FE03), the game set up, the interrupt's
  // vector table filled with $FF, and the turn loop.
  def(0x6073, 'start_game', function* (r) {
    if (!M[0xD03F]) return { a: 0, zf: true };
    P.clear_screen({});
    M[0xD064] = 0; M[0xD069] = 0;
    M[0x5B11] = 1;
    if (!M[0xD048]) {
      P.print_text_big({ a: 0xE2 });
      let a;
      do a = M[(0xCDD9 + ((yield* P.key_scan({})).e & 255)) & 0xFFFF]; while (a < 0x31 || a >= 0x35);
      M[0xD067] = a - 0x30;
      setw(0x5B15, 0x180A);
      P.print_number({ a: a - 0x30 });
      P.sound_0({});
    }
    for (let b = 4; b; b--) {
      const hl = P.wizard_record({ a: M[0x5B11] }).hl;
      setw(0x5B04, hl);
      M[(hl + 0x45) & 0xFFFF] = 0;
      if (!M[(hl + 1) & 0xFFFF]) yield* P.cw('random_wizard', { ix: hl, a: 0, zf: true });
      for (let k = 0x2D, p = (w(0x5B04) + 2) & 0xFFFF; k; k--, p = (p + 1) & 0xFFFF) {
        const c = M[p] & 0xF0;
        M[p] = c | (c >> 4);
      }
      M[0x5B11] = (M[0x5B11] + 1) & 255;
    }
    if (M[0xD048] || M[0xD067] === 1) {
      const a = M[0xD048] || 1;
      M[0xD064] = a;
      M[0xD067] = (a + 1) & 255;
      const c = M[0xCEEB];
      if (c && c !== M[0xD03F]) P.restart(0xCC39, { a: c });
      M.copyWithin(0xCF30, 0xD082, 0xD082 + 0x46);
      M[0x5B11] = 1;
    }
    yield* P.jumpGen(0xD01B, {});
    yield* P.jumpGen(0xFE03, {});
    yield* P.cw('set_up_game', {});
    M.fill(0xFF, 0xFE00, 0xFF01);
    // the stack moved to $FFF3 at the start: the turn loop is never left by a return
    P.restart(0x6134);
  });

  // game_turn_loop: the independent creatures' turn (player 0, the computer's), the portal and
  // magic spreading; then for each player to $D067 with a creature left, its turn: the computer's
  // for player 2 against it, else a human's; magic spreading after each. Then the turn counted
  // ($D065) and the menu between turns.
  function* turnLoop(at) {
    for (;;) {
      if (at === 0x6134) {
        P.IM = 2;
        M[0x5B11] = 0;
        yield* P.cw('start_of_turn', {});
        yield* P.cw('computer_turn', {});
        P.clear_map_things({});
        yield* P.cw('portal_turn', {});
        P.spread_magic({});
        P.destroy_lost_objects({});
        P.enchantments_wear_off({});
        at = 0x6156;
      }
      if (at === 0x6156) {
        M[0x5B11] = (M[0x5B11] + 1) & 255;
        if (P.player_has_creature({}).zf) {
          yield* P.cw('start_of_turn', {});
          if (P.player_has_creature({}).zf) {
            if (M[0x5B11] === 2 && M[0xD064]) {
              yield* P.cw('computer_turn', {});
              P.clear_screen({});
            } else yield* P.human_turn({});
          }
        }
      }
      P.IFF = false;
      P.clear_screen({});
      P.clear_map_things({});
      P.spread_magic({});
      P.destroy_lost_objects({});
      if (M[0x5B11] !== M[0xD067]) { at = 0x6156; continue; }
      M[0xD065] = (M[0xD065] + 1) & 255;
      yield* P.cw('end_of_turn_menu', {});
      at = 0x6134;
    }
  }
  def(0x6134, 'game_turn_loop', function* (r) { return yield* turnLoop(0x6134); });
  // the same from the return of a player's turn ($617F), for a run that starts in the middle of one
  def(0x617F, 'game_turn_resume', function* (r) { return yield* turnLoop(0x617F); });

  // human_turn: the turn panel's work flags ($D0DF = 3), the first creature and the play screen;
  // then, over and over: the controls read, the cursor menu on fire, the cursor moved; while it
  // moves the information display is cleared once, and when it stops the square is described.
  // END TURN leaves by dropping return addresses (a frame).
  function* humanLoop() {
    for (;;) {
      yield* P.read_controls({});
      if (!(M[0x5B13] & 1)) yield* P.cursor_menu({});
      yield* P.cw('move_cursor', {});
      if (M[0xD0D8]) {
        if (M[0xD0D7]) continue;
        P.IFF = false;
        P.clear_info_panel({});
        P.IFF = true;
        yield* P.short_wait({});
        M[0xD0D7] = 1;
        continue;
      }
      if (!M[0xD0D7]) continue;
      P.IFF = false;
      P.describe_cursor_square({});
      P.fill_icon_list({});
      P.print_square_name({});
      P.IFF = true;
      M[0xD0D7] = 0;
      M[0xD0DF] = 3;
    }
  }
  def(0x61CD, 'human_turn', P.frame(function* (r) {
    M[0xD0DF] = 3;
    P.IFF = true;
    P.reset_ff86({});
    M[0xFF60] = 0;
    yield* P.next_creature({});
    P.draw_menu_frame({});
    P.print_panel_text({ a: 2 });
    P.IFF = true;
    return yield* humanLoop();
  }));
  // the same from the loop's read of the controls ($61E6), for a run that starts there
  def(0x61E6, 'human_turn_resume', P.frame(function* (r) { return yield* humanLoop(); }));
};
})(typeof window !== 'undefined' ? window : globalThis);
