// Driller's table for Fast CPU (site/lib/fast-cpu.js, kit/skills/core/70-minisite/fast-cpu.md): what
// Fast CPU knows about the game. The names are the game's routines (src/), the numbers places in
// its memory or the commands its key table gives.
(function (root) {
'use strict';
// the crosshair's own speed: a pass that moves it draws no view, and takes 37,250 T-states on the
// game's code wherever it is (the middle of 688 such passes from 89 moments of play)
const CROSSHAIR = 37250;
root.DR_FAST = {
  // the tick: Fast CPU's own, 60 a second, counted in the 48K's T-states. The game counts its time
  // by the frame's interrupt, 50 a second (the clock, the wait counter, the sensors), which goes on
  // at its own rate; it waits for no line of the screen and plans no speed in frames
  tick: 3500000 / 60, hz: 3500000,
  // the most loops one refresh runs, 60 / 15: real time on a display as slow as 15 Hz
  cap: 4,
  // the main loop's checkpoints (src/g-main.js): a loop starts at take_commands's call ($9825), which
  // reads the keys; the stretches that start at these are the loop's own work, the waits on the
  // sensors' beam ($9931-$9937, $B47A-$B481) between them
  start: 0x9825, work: [0x9807, 0x9815, 0x9822, 0x9825, 0x9828, 0x9931, 0x9937, 0xB47A, 0xB481],
  // the Speed: K, the ticks the step of one of the Spectrum's passes takes. A Spectrum with a faster
  // processor is nowhere slower than a Spectrum, so 1x is the Spectrum's quickest pass in play:
  // 7.21 of its frames, 0.144 s, turning in Fluorite (area 9) looking down, from 89 moments of play
  // timed on the game's code; 8 ticks is 0.133 s. 2x and 4x faster still
  speeds: [{ name: '1×', K: 8 }, { name: '2×', K: 4 }, { name: '4×', K: 2 }],
  // the steps (plug-in point step), by the key the port gives each: a step forward or back along x,
  // the height and z (the target it sets at $88AF, $88B1 and $88B3, move_command) and the jet's rise
  // and fall (the height), 1/K of each a loop; and the crosshair (commands $17-$1A, aim_command),
  // whose pass draws no view, so it goes at the Spectrum's own speed whatever the Speed
  steps: { 0x88AF: 'pace', 0x88B1: 'pace', 0x88B3: 'pace', 0x17: CROSSHAIR, 0x18: CROSSHAIR, 0x19: CROSSHAIR, 0x1A: CROSSHAIR },
  // the angles the plug-in points turn, frac and whole are given: the pitch, the heading and the
  // roll ($876C-$876E), 72 seventy-seconds to a turn
  turn: 72,
  // the commands taken once a press: the turn's angle and the step's size ($0B, $0C, $11, $12, each
  // with the game's pause of 7 frames), turning round ($0D), the crosshair shown or hidden ($15),
  // the keys given to the crosshair or back ($1E), drilling and collecting a rig ($28, $2A) and the
  // information screen ($29). Those taken at the press and every K ticks while held: the laser
  // ($16), and a rise or fall on foot, which stands the probe up or crouches it a whole cell ($81,
  // $82: take_commands adds $80 to commands 1 and 2 when the probe walks). The rest are moves
  switches: [0x0B, 0x0C, 0x0D, 0x11, 0x12, 0x15, 0x1E, 0x28, 0x29, 0x2A], repeats: [0x16, 0x81, 0x82],
  // The plug-in points give Fast CPU the rest themselves. A job whose effect adds up with each run,
  // once a step (once, given $8A69): the script of the object a step runs into, or the bump's sound
  // when it has none (run_scripts); Mitral's floor takes 2 of energy and 2 of shield by its script
  // at each step. The game's shared scripts and the areas' run each loop: each acts once on a
  // change of the flags, variables or objects it tests and then no longer passes its test (the
  // shared scripts' tests of variable 31, flag 21's trip to Mitral, Obsidian's 17 and Trachyte's
  // tour at 17 and 18 safe sectors, flag 23's switches in area 27, Mitral's flag 21 cleared)
};
})(typeof window !== 'undefined' ? window : globalThis);
