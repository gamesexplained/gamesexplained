// Castle Master's table for Fast CPU (site/lib/fast-cpu.js): what Fast CPU knows about the game. The names in
// capitals are the game's routines (src/), the numbers places in its memory.
(function (root) {
'use strict';
root.CM_FAST = {
  // The clock: CIA 1's timer A, which counts the game's time (strength, the scripts' ten-second
  // timer, the lightning's countdown): a tick each 16,422 cycles (the KERNAL's latch, 16,421, plus
  // one), 59.996 a second on the PAL machine's 985,248 cycles a second
  tick: 16422, hz: 985248,
  // the most loops one refresh runs, 60 / 15: real time on a display as slow as 15 Hz
  cap: 4,
  // the main loop's checkpoints (src/g-main.js): a loop starts at UPDATE_FRAME_INPUT_EVENTS's call
  // ($47F0); the stretches that start at these are the loop's own work
  start: 0x47F0, work: [0x47C5, 0x47D7, 0x47F0, 0x47F3, 0x47ED, 0x47FD],
  // the Speed: K, the ticks the step of one C64 loop takes. The C64's loops in play take 0.20 to
  // 3.02 s, 0.92 s in the middle: 1x is about that, 5x the quickest, with nothing in view
  speeds: [{ name: '1×', K: 60 }, { name: '2×', K: 30 }, { name: '5×', K: 12 }],
  // the steps (plug-in point step), by the key the port gives each: a walk's two parts (along the
  // sine at $123C and the cosine at $123D, DISPATCH_PLAYER_MOVEMENT), 1/K of each a loop; and the
  // pointer, across ($2465) and down ($2466, DISPATCH_AIM_FIRE_ACTIVATE), which a loop that moves
  // it draws no view for, so it goes at the C64's own speed whatever the Speed: a pixel each 12,560
  // cycles, measured on the game's code
  steps: { 0x123C: 'pace', 0x123D: 'pace', 0x2465: 12560, 0x2466: 12560 },
  // the angles the plug-in points turn, frac and whole are given: which way you face ($2411) and
  // up or down ($2410), 72 steps to a full turn
  turn: 72,
  // the controls, as actions (READ_CONTROL_INPUT's codes turned into actions by the map at $1382):
  // those that switch something, taken once a press (the speeds, face forward, turn about, the
  // sights, act, the pointer, the information screen); those that repeat, taken at the press and
  // every K ticks while held (a rock), and with Ctrl ($1380) the quarter turns and the looks all the
  // way up or down. The rest are moves
  switches: [9, 10, 11, 12, 13, 21, 27, 30, 41], repeats: [22], ctrl: 0x1380, ctrlRepeats: [5, 6, 7, 8],
  // what the game shows for one loop, shown for a pace (plug-in point held): the lightning's streak,
  // drawn while $2459 reads 1, which the game takes to 0 once it has drawn it; its column from the
  // clock's byte $1C64
  held: [{ at: 0x2459, shown: 1, gone: 0, with: [0x1C64] }],
  // The plug-in points give Fast CPU the rest themselves. A job whose effect adds up with each run,
  // once a pace (once, given $1082): the script of the object a step runs into
  // (DISPATCH_FRAME_CONDITIONS); the 5 general scripts and the condition scripts of 11 areas that a
  // step sets off show or hide objects by flags, the same however often they run, so they run each
  // loop. A wait that only keeps a message up (after, given $1063): REFRESH_ACTION_STATUS puts the
  // area's name back once the countdown at $1063 (50 ticks) has run out
};
})(typeof window !== 'undefined' ? window : globalThis);
