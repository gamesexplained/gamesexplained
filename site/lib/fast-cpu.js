// Fast CPU: a game played as its machine with a much faster processor would play it, kept playable
// (kit/skills/core/70-minisite/fast-cpu.md). The game's own code runs unchanged; only the time it
// takes changes. Two pieces and nothing else:
// - a frame limiter: the main loop goes round at most once a beat, 60 a second (the game's clock's
//   tick when it ticks that often), its own work taking no time (the page's runtime does it,
//   rt.runTicks). Each refresh runs the loops it owes, at most the table's cap, and the page draws
//   the last one's frame in that refresh;
// - step scaling: what the game counts in loops is scaled to the pace, K beats to the step of one
//   of the machine's loops, so the pace that is set, not the frame rate, decides how fast you
//   move. A move takes 1/K of its step each loop through the game's own code, the leftover carried
//   while the key is held; a share of a turn leaves an angle between two of the game's; a switch
//   is taken once a press, a repeat at the press and every K beats; a job whose effect adds up
//   runs once a pace; what the game shows for one loop is shown for a pace; a wait that only keeps
//   a message up does not hold play.
// What the game counts in time is left alone, so it keeps its time in seconds.
//
// The game brings two things: its table (below) and the plug-in points in its port, P.plug, whose
// defaults give what the game's own code gives (games/c64/castle-master/port/src/core.js). Fast
// CPU swaps in its own while it is on. The renderers are the game's: they draw the last loop's draw
// list, at the angle Fast CPU's frac gives.
//
//   const fx = FastCPU.attach(rt, table)   Fast CPU for the page's machine, off. rt is the page's
//                                          runtime: rt.P the port (rt.P.M its memory, rt.P.plug its
//                                          plug-in points), rt.ticks the beats so far, and
//                                          rt.runTicks(cycles, loop) the clock's one command (below)
//   FastCPU.set(fx, on, speed)             on or off (off, the port has its own plug-in points
//                                          back), and the pace, an index into table.speeds
//   FastCPU.run(fx, ms, between)           the frame limiter: the loops owed for ms of real time,
//                                          at most the cap; between() after each. Returns them
//
// rt.runTicks(cycles, loop): real time owed, in the machine's cycles. The main loop goes round once
// on each beat, its own work taking no time: loop.start is where a loop starts, loop.work where the
// stretches that are its own work start, loop.cap the most loops one call runs (time owed past
// them is dropped), loop.between() is called after each. A wait inside a loop, and the program
// outside the loop, take the machine's time. Returns the loops run.
//
// The table, the game's facts (games/c64/castle-master/port/page/fast-table.js):
//   tick, hz         the beat: the machine's cycles a beat, and its cycles a second
//   cap              the most loops a refresh runs: the loops a second over 15, rounded up
//   start, work      where a loop starts, and where the stretches of its own work start
//   speeds           the pace's settings, slowest first: [{ name, K }], K the beats a step takes;
//                    one setting for a game kept at its own pace, which shows no Speed
//   steps            the plug-in point step's keys: 'pace' for 1/K of the step each loop, or the
//                    cycles one unit of a pace of the game's own takes (a pointer the machine moves
//                    in a loop that draws no view), for that loop's share of it
//   turn             the steps of a whole turn, for the angles the plug-in point turn moves
//   switches         the actions taken once a press
//   repeats          the actions taken at the press and every K beats while held
//   ctrl, ctrlRepeats  a byte the game sets while a modifier key is down, and the actions that
//                    repeat while it is (a move without it)
//   held             what the game shows for one loop, shown for a pace: [{ at, shown, gone, with }],
//                    the byte, its value while shown and once taken down, and the bytes that go with
//                    it, kept as they were while it is held
// Each of switches, repeats, ctrl and held may be left out when the game has none.
// The plug-in points once (a job whose effect adds up) and after (a wait that only keeps a message
// up) take the byte they ask about from the port, so they need no entry.
(function (root) {
'use strict';

function attach(rt, table) {
  const P = rt.P, M = P.M, T = Object.assign({ switches: [], repeats: [], ctrl: null, ctrlRepeats: [], held: [] }, table);
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
    : T.repeats.includes(act) || (T.ctrl !== null && T.ctrlRepeats.includes(act) && M[T.ctrl]) ? 'repeat' : 'move');
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

root.FastCPU = { attach, set, run };
})(typeof window !== 'undefined' ? window : globalThis);
