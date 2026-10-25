// Fast CPU: the game played as a C64 with a much faster processor would play it. The game's own code
// runs unchanged; only the time it takes changes. A faster processor breaks two things a game like
// this never had to handle, so Fast CPU adds two pieces and nothing else:
// - a frame limiter: the main loop goes round at most once a tick of the game's clock, its own work
//   taking no time (the page's runtime, rt.runTicks). Each refresh runs the loops it owes, at most
//   the table's cap, and the page draws the last one's frame in that refresh;
// - step scaling: the game moves you a fixed step each loop, so what it counts in loops is scaled
//   to the pace, K ticks to the step of one C64 loop, and the Speed, not the frame rate, sets how
//   fast you move. A move takes 1/K of its step each loop through the game's own code, the
//   leftover carried while the key is held; a share of a turn leaves you at a fractional angle,
//   which the game builds its view at; a switch is taken once a press, a repeat at the press and
//   every K ticks; a job whose effect adds up runs once a pace; what the game shows for one loop is
//   shown for a pace; a wait that only keeps a message up does not hold play.
// What the game counts in ticks is left alone, so it keeps its time in seconds.
//
// Fast CPU plugs into the port's plug-in points (src/core.js, P.plug), and knows the game only from
// its table (fast-table.js): another game would bring its own table and plug-in points.
//
//   const fx = FastCPU.attach(rt, table)   Fast CPU for the page's machine (page/runtime.js), off
//   FastCPU.set(fx, on, speed)             on or off (off, the port has its own plug-in points
//                                          back), and the Speed, an index into table.speeds
//   FastCPU.run(fx, ms, between)           the frame limiter: the loops owed for ms of real time,
//                                          at most the cap; between() after each. Returns them
//   FastCPU.view(fx, MM, always)           what the page draws over the screen after them: the last
//                                          loop's 3D view (MM is page/modern.js) at its fractional
//                                          angle, {scene, shown}; null when the angle is the game's
//                                          own (the screen is the game's frame) or the 3D view is
//                                          not on show. With always, at the game's angles too
(function (root) {
'use strict';

function attach(rt, T) {
  const P = rt.P, M = P.M;
  const fx = {
    rt, T, on: false, speed: 0, K: T.speeds[0].K, game: P.plug,
    loop: { start: T.start, work: new Set(T.work), cap: T.cap, between: null },
  };
  const tick = () => rt.ticks;
  // an angle: the whole step the game holds, and the share of a step past it in K-ths; the game
  // setting the angle itself (a whole step, plug-in point whole, or another value) ends the share
  const angle = a => {
    let s = fx.ang.get(a);
    if (!s || s.at !== M[a]) { s = { at: M[a], n: 0 }; fx.ang.set(a, s); }
    return s;
  };
  const kind = act => (T.switches.includes(act) ? 'switch'
    : T.repeats.includes(act) || (T.ctrlRepeats.includes(act) && M[T.ctrl]) ? 'repeat' : 'move');
  const holding = () => fx.hold && tick() - fx.hold.from < fx.hold.K;
  fx.plug = {
    // a move: 1/K of the step each loop (the pointer: its share of the C64's own pace), and what is
    // left of a unit carried to the next loop while the key stays down
    step(key, v) {
      const r = T.steps[key], num = r === 'pace' ? 1 : T.tick, den = r === 'pace' ? fx.K : r;
      fx.stepped.add(key);
      let acc = fx.carry.has(key) ? fx.carry.get(key) : Math.floor(den / 2);
      acc += v * num;
      const out = Math.floor(acc / den);
      fx.carry.set(key, acc - out * den);
      return out;
    },
    // a share of a turn: 1/K of the step, the whole steps crossed given to the game
    turn(a, by) {
      const s = angle(a);
      s.n += by;
      const w = Math.floor(s.n / fx.K);
      s.n -= w * fx.K;
      s.at = (((s.at + w) % T.turn) + T.turn) % T.turn;
      return Math.abs(w);
    },
    frac(a) { const s = fx.ang.get(a); return s && s.at === M[a] ? s.n / fx.K : 0; },
    whole(a) { fx.ang.delete(a); },
    // the controls read: a step whose key was up since the last read has nothing carried
    read() {
      for (const k of [...fx.carry.keys()]) if (!fx.stepped.has(k)) fx.carry.delete(k);
      fx.stepped.clear();
      fx.before = fx.now; fx.now = new Set();
    },
    // a move each loop; a switch when its key goes down; a repeat then and every K ticks
    take(act) {
      const k = kind(act), id = k === 'repeat' && !T.repeats.includes(act) ? act + 0x100 : act, t = tick();
      fx.now.add(id);
      if (k === 'move') return true;
      if (!fx.before.has(id)) { fx.last.set(id, t); return true; }
      if (k === 'repeat' && fx.last.has(id) && t - fx.last.get(id) >= fx.K) { fx.last.set(id, t); return true; }
      return false;
    },
    once(key) {
      const t = tick(), l = fx.onceAt.get(key);
      if (l !== undefined && t - l < fx.K) return false;
      fx.onceAt.set(key, t);
      return true;
    },
    // shown for one loop: from the loop that shows it, for K ticks, the game reads it as shown
    // after it has taken it down, and what goes with it as it was
    held(a, v) {
      const h = T.held.find(x => x.at === a);
      if (h) {
        if (v === h.shown) { if (!holding()) fx.hold = { from: tick(), K: fx.K, with: new Map() }; return v; }
        return v === h.gone && holding() ? h.shown : v;
      }
      if (!holding() || !T.held.some(x => x.with.includes(a))) return v;
      if (!fx.hold.with.has(a)) fx.hold.with.set(a, v);
      return fx.hold.with.get(a);
    },
    // the message's wait: play goes on, and the name goes back on the first loop after the
    // countdown has run out
    after(asked, a) {
      if (asked) fx.owed = true;
      if (!fx.owed || M[a]) return false;
      fx.owed = false;
      return true;
    },
  };
  reset(fx);
  return fx;
}
function reset(fx) {
  Object.assign(fx, { ang: new Map(), carry: new Map(), stepped: new Set(), before: new Set(), now: new Set(),
    last: new Map(), onceAt: new Map(), hold: null, owed: false });
}

function set(fx, on, speed) {
  if (speed !== undefined && speed !== fx.speed) {
    // a fractional angle keeps its place; a carry starts again
    const K = fx.T.speeds[speed].K;
    for (const s of fx.ang.values()) s.n = Math.min(K - 1, Math.round(s.n * K / fx.K));
    fx.carry.clear();
    fx.speed = speed; fx.K = K;
  }
  if (on !== fx.on) {
    fx.on = on;
    reset(fx);
    fx.rt.P.plug = on ? fx.plug : fx.game;
  }
}

function run(fx, ms, between) {
  fx.loop.between = between || null;
  return fx.rt.runTicks(ms * fx.T.hz / 1000, fx.loop);
}

// the 3D view to draw over the screen: the last copy to the view's bitmap, when it was the 3D view,
// rendered from the draw list the game drew it from, at the angles the game stood at
function view(fx, MM, always) {
  const f = MM.latest(MM.attach(fx.rt));
  if (!f || !f.pic) return null;
  const p = f.pic.pose, b = f.pic.bg, whole = v => v === Math.floor(v);
  if (!always && whole(p.yaw) && whole(p.pitch) && whole(b.yaw) && whole(b.pitch)) return null;
  return { scene: f.scene || (f.scene = MM.scene(fx.rt.P, f.pic)), shown: f };
}

root.FastCPU = { attach, set, run, view };
})(typeof window !== 'undefined' ? window : globalThis);
