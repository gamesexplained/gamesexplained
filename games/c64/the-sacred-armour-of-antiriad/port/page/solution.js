// The Play page's solution: the Maps page's route played on the page from power-on, from
// port/solution.json (scripts/solution.js). It runs in the browser and in node (../test_play.js).
//
//   const sol = AntSolution.attach(rt, packed)   on a machine AntPage.create has just made
//   sol.start(), sol.stop()   the route takes the stick, or gives it back to rt.input.joy
//   sol.on, sol.done          playing; and every read of Tal's controls the route has given
//
// The page's rooms take their own time to draw, so Tal's controls read the stick a few frames from
// where the C64 reads it, more of them the further the route goes, and a stick given by the frame
// leaves Tal behind the route by its first room. So each read of the controls (foot_control and
// suit_control, from the interrupt every seventh frame of play) is given the stick the C64 read at
// the same read. The waits that poll for fire (the title's, the ending's) are given it by the clock,
// from the cycle the C64 first read it.
(function (root) {
'use strict';
const CONTROLS = ['foot_control', 'suit_control'];
function attach(rt, packed) {
  const controls = [], at = [], val = [];
  for (let i = 0; i < packed.controls.length; i += 2) for (let n = 0; n < packed.controls[i + 1]; n++) controls.push(packed.controls[i]);
  for (let i = 0, c = 0; i < packed.fire.length; i += 2) { c += packed.fire[i]; at.push(c); val.push(packed.fire[i + 1]); }
  const fireAt = t => {
    let lo = 0, hi = at.length;
    while (lo < hi) { const h = (lo + hi) >> 1; if (at[h] > t) hi = h; else lo = h + 1; }
    return lo ? val[lo - 1] : 0x1F;
  };
  let on = false, k = 0, inControl = false, joy = rt.input.joy;
  for (const name of CONTROLS) {
    const f = rt.P[name];
    rt.P[name] = function () { inControl = true; try { return f.apply(this, arguments); } finally { inControl = false; } };
  }
  Object.defineProperty(rt.input, 'joy', {
    get: () => (!on ? joy : inControl ? (k < controls.length ? controls[k++] : 0x1F) : fireAt(rt.t)),
    set: v => { joy = v; },
    configurable: true,
  });
  return {
    start() { on = true; k = 0; },
    stop() { on = false; },
    get on() { return on; },
    get done() { return k >= controls.length; },
  };
}
root.AntSolution = { attach, CONTROLS };
})(typeof window !== 'undefined' ? window : globalThis);
