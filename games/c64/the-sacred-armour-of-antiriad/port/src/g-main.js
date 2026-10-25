// The main program: cold_start ($8009), which plays the title and starts a game, and main_loop
// ($8053), one pass after another with no wait. Every call it makes is a checkpoint.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.main = function (P) {
  const M = P.M, io = P.io;
  P.CHECKPOINTS.push(0x8040, 0x8043, 0x8046, 0x8049, 0x804C, 0x804F,
    0x8053, 0x8056, 0x8059, 0x805C, 0x805F, 0x8062, 0x8065, 0x8068, 0x806B);

  // The game: from cold_start, again after every restart_game.
  P.main = function* () {
    for (;;) {
      try { yield* P.cold_start(); } catch (e) { if (e !== P.RESTART) throw e; }
    }
  };
  // The main loop taken up where a pass starts, for a moment of play saved there.
  P.resume = function* () {
    try { yield* P.main_loop(); } catch (e) { if (e !== P.RESTART) throw e; }
    yield* P.main();
  };

  // cold_start ($8009): video bank 1 for CIA 2, the processor port at $05, the vectors, CIA 1's
  // timer A stopped; the title until fire; a new game.
  P.cold_start = function* () {
    P.sei();
    io.cia2Write(0x02, io.cia2Read(0x02) | 0x03);
    io.cia2Write(0x00, (io.cia2Read(0x00) & 0xFC) | 0x02);
    M[0] = 0x07; M[1] = 0x05;                              // the processor port: bits 0-2 out, all RAM but the chips
    M[0xFFFE] = 0x41; M[0xFFFF] = 0xAE;
    M[0xFFFA] = 0xC4; M[0xFFFB] = 0xAF;
    io.ciaWrite(0x0E, io.ciaRead(0x0E) & 0xFE);
    yield* P.cp(0x8040); P.clear_game_state();
    yield* P.cp(0x8043); P.silence_sid();
    yield* P.cp(0x8046); yield* P.title_sequence();
    yield* P.cp(0x8049); P.clear_game_state();
    yield* P.cp(0x804C); P.start_new_game();
    yield* P.cp(0x804F); P.draw_panel();
    P.cli();
    yield* P.main_loop();
  };

  // main_loop ($8053).
  P.main_loop = function* () {
    for (;;) {
      yield* P.cp(0x8053); P.room_change();
      yield* P.cp(0x8056); P.animate_tiles();
      yield* P.cp(0x8059); P.throw_stone();
      yield* P.cp(0x805C); P.scenery_hits();
      yield* P.cp(0x805F); P.teleport_to_armour();
      yield* P.cp(0x8062); P.colour_panel();
      yield* P.cp(0x8065); P.update_energy_bars();
      yield* P.cp(0x8068); P.energy_tick();
      yield* P.cp(0x806B); yield* P.victory_sequence();
    }
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
