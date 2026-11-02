// Space Rogue's table for Fast CPU (site/lib/fast-cpu.js, kit/skills/core/70-minisite/fast-cpu.md):
// what Fast CPU knows about the game. Fast CPU plays flight in space, the main loop at $0DED; the
// stations, Navigation Control, docking and the gate's jump keep the C64's speed (page/runtime.js,
// AWAY).
//
// The beat is the C64's video frame, 50.12 a second, the clock the game counts its passes in: the
// runtime starts a pass at line 60 of each frame, just after the interrupt has counted the frame
// and scanned the keyboard. The game keeps its own pace (follow): one of the C64's passes takes as
// many frames as the cost model gives for the work the last pass did, and each pass of Fast CPU's
// takes that share of a pass's steps, so space moves as fast as on the C64. Where the C64 falls
// behind, it is held to the pace the game plans for: the main loop skips the drawing of passes
// until the frames they took come back to three a pass (frame_skip3, $2E), so the game moves at
// 16.7 passes a second however long its drawing takes, and a C64 pass that takes longer than three
// frames, in a fight with ships near, is the processor falling behind, not the game.
//
// The keys of steps are the plug-in points' in the port: a rate's address, or, for a vector of the
// game's, 0x100000 + a number for the routine + 4 x the object's slot + the axis (src/g-objects.js).
(function (root) {
'use strict';
const steps = {};
// the player's pitch, turn and roll rates, in 1,024ths of a turn a pass (turn_objects)
for (const k of [0x0508, 0x0516, 0x050F]) steps[k] = 'pace';
// each object's move by its velocity (0x100000, move_objects) and back again on a hit (0x130000,
// back_off), slots 0-19; the cruise thrust's change to a ship's velocity (0x110000, cruise_thrust),
// slots 0-5; the Newtonian thrust (0x140000, apply_thrust)
for (let x = 0; x < 0x14; x++) for (let a = 0; a < 3; a++) {
  steps[0x100000 + x * 4 + a] = 'pace';
  steps[0x130000 + x * 4 + a] = 'pace';
  if (x < 6) steps[0x110000 + x * 4 + a] = 'pace';
}
for (let a = 0; a < 3; a++) steps[0x140000 + a] = 'pace';
// a planet's or a star's pull on a ship (0x120000, gravity): the puller's slot x 8 + the ship's
for (let y = 6; y < 0x14; y++) for (let x = 0; x < 6; x++) for (let a = 0; a < 3; a++) steps[0x120000 + (y * 8 + x) * 4 + a] = 'pace';

root.SR_FAST = {
  tick: 19656, hz: 985248,            // the beat: a PAL video frame, 312 lines of 63 cycles
  cap: 4,                             // the most passes a refresh runs: real time on a 15 Hz display
  follow: true,                       // the C64's own pace, view by view (rt.fast.machineBeats)
  most: 3,                            // but never slower than the game's own: three frames a pass
  steps,
  // The rest the plug-in points ask for themselves, once a pass (once, by name in the port): the
  // upkeep (frame_update: the missile's reload, the beam's automatic fire, the cockpit every seventh
  // pass, the target's greeting and new ships every 256th, the beam cooled every 16th), the
  // lifetimes (age_objects), the computer ships' minds (ship_ai), the stick eased toward where it is
  // held (joystick_flight), the hazards' dice (sector_hazard) and their damage (hazard_hit), the
  // count after a ram (rammed), the rates a computer ship turns by (spin, turn_count) and a turn too
  // small to share (least_turn). Every key is taken once: the interrupt puts each in the buffer, and
  // the game takes one a pass
};
})(typeof window !== 'undefined' ? window : globalThis);
