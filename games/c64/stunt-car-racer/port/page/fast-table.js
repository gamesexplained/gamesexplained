// Stunt Car Racer's table for Fast CPU (site/lib/fast-cpu.js, kit/skills/core/70-minisite/fast-cpu.md):
// what Fast CPU knows about the game. Fast CPU plays the race's passes (RACE, $3D08); the menus,
// the panels, the crane's start and the restart after a wreck keep the C64's speed.
//
// The beat is the C64's video frame, 50.12 a second: page/runtime.js starts a pass at line 55 of
// each one. The speed follows the C64's, pass by pass: before each of the C64's passes (a shadow
// pass), the page's cost model gives the frames the C64 would take over the work of the last pass
// (rt.machineBeats), and that many of Fast CPU's passes make it, each taking its share of every
// step. It is held to the speed the game plans for, seven frames a pass: the race's clocks add 0.14
// seconds for every pass (TICK_CLOCK, $109C), seven frames' worth. The C64 takes 7.25 frames over
// most passes on Little Ramp and 10.5 while the crane lowers the car, the processor falling behind;
// those take seven. A pass the C64 takes less time over (about five frames as the car falls off the
// track, with little to draw) keeps the C64's speed.
//
// The keys of steps are the plug-in points' in the port (src/core.js lists the kinds):
// - the player's car: the forces into its speeds (force0-2), the torques into its spins
//   (torque0-2), its speeds into its place (move0-2), its turns into its angles (turn0-2), the
//   turn back towards the road's direction (heading), the crane's chains' swing (swing), the count
//   of presses in a row that do damage (presses) and the damage itself (damage0-2);
// - the dust: each of the 32 specks' fall (fall0-31), its move down (down0-31) and across
//   (across0-31);
// - the opponent: its move along the road (along), its speed's change (speed), its wheels'
//   speeds' changes (ospeed0-2) and their moves (oheight0-2), the tilt in the air (tilt0-2) and
//   its steer across the road (line).
(function (root) {
'use strict';
const steps = {};
for (const k of ['heading', 'swing', 'presses', 'along', 'speed', 'line']) steps[k] = 'pace';
for (let x = 0; x < 3; x++) for (const k of ['force', 'torque', 'move', 'turn', 'damage', 'ospeed', 'oheight', 'tilt']) steps[k + x] = 'pace';
for (let x = 0; x < 32; x++) for (const k of ['fall', 'down', 'across']) steps[k + x] = 'pace';

root.SCR_FAST = {
  tick: 19656, hz: 985248,            // the beat: a PAL video frame, 312 lines of 63 cycles
  cap: 4,                             // the most passes a refresh runs: real time on a 15 Hz display
  start: 0x3D08,                      // where a pass starts (RACE's loop)
  work: [0x3D08],
  follow: true, most: 7,              // the C64's speed, at most seven frames a pass, as the clocks count them
  steps,
  // The rest the plug-in points ask for themselves (once, by name in the port): the count of
  // passes ($C30C), the engine's note (ENGINE_SOUND), the clocks, the laps and the countdowns
  // (RACE_CLOCKS), the wreck's count ($C368), the boost's count ($C36E), the crane's count ($2F),
  // the wheels' note in the air ($5D), the sounds started (stones, landing, damage1, damage4), the
  // 64 passes of a part lost ($C302), the opponent's bump (OPP_BUMP), its swerve (SWERVE) and its
  // bounce (OPP_WHEELS).
};

// The plug-in points of the game's own kinds, added to Fast CPU's (src/core.js says what each is):
// log and back, a value kept from pass to pass given back from a step ago; hold and holding, a push
// added again on each loop of its step; glide, a value set once a step moved to over the step;
// leave, the restart after a wreck in the machine's time. And once in place of Fast CPU's: a job
// once a step on the step's first pass, and a sound the race starts (a landing, the stones, a
// bump) on the first of the step's passes it comes in, and a step after the last at the soonest,
// as the C64 would start it on its pass. The first pass after the machine's time (a race's start,
// the restart after a wreck, Fast CPU turned on) starts afresh, as the C64's next pass would:
// nothing kept from before, a step begun, and every job once a step done on it.
function extend(fx) {
  const P = fx.plug, logs = new Map(), held = new Map(), glides = new Map();
  fx.loop.fresh = () => { logs.clear(); held.clear(); glides.clear(); fx.carry.clear(); fx.onceAt.clear(); fx.left = 0; };
  P.once = key => {
    const l = fx.onceAt.get(key);
    if (l && (l.shadow === fx.shadow || fx.loops - l.n < l.K)) return false;
    fx.onceAt.set(key, { t: fx.rt.ticks, n: fx.loops, K: fx.K, shadow: fx.shadow });
    return true;
  };
  P.log = (key, v) => {
    let L = logs.get(key);
    if (!L) logs.set(key, L = []);
    L.push([fx.loops, v]);
    while (L.length > fx.K + 1) L.shift();
  };
  P.back = (key, v) => {
    const L = logs.get(key);
    if (!L || !L.length) return v;
    const want = fx.loops - fx.K;
    let e = L[0];
    for (const x of L) if (x[0] <= want) e = x;
    return e[1];
  };
  P.hold = key => { held.set(key, fx.loops); };
  P.holding = key => { const n = held.get(key); return n !== undefined && fx.loops > n && fx.loops - n < fx.K; };
  P.glide = (key, v) => {
    let g = glides.get(key);
    if (!g) glides.set(key, g = { from: v, to: v, at: fx.loops, out: v });
    if (g.to !== v) { g.from = g.out; g.to = v; g.at = fx.loops; }
    g.out = Math.round(g.from + (g.to - g.from) * Math.min(1, (fx.loops - g.at + 1) / fx.K));
    return g.out;
  };
  P.leave = () => fx.rt.leave();
  return fx;
}
root.SCRFast = { extend };
})(typeof window !== 'undefined' ? window : globalThis);
