'use strict';
// A session played on the game (the 48K machine of lib.js, with sessions.js's player) and the same
// session on the Play page's machine (page/runtime.js): what the player pressed at each read of the
// controls and of the keyboard (the checkpoints $622B and $028E), the refresh register and the bytes
// random_below read each time it drew, and the cassette rewound where the player rewound it, given
// to the page at the same reads, so that the page plays the same game; and the T-state at which
// each read came, on both. test/t-page.js compares them.
//   const rec = record({ state, seed, frames, designer, scenario, players })   // from a moment of play, or the hand-over
//   const out = replay(rec, make, { data, blank, tape })     // the page's run: { times, reads, past, missing }
// (data: the page's machine at the hand-over; blank(state): a moment as the page holds it; tape():
// the cassette, lib.js's Tape, for a moment tape(state))
const lib = require('./lib.js');
const { player } = require('./sessions.js');

const READS = new Set([0x622B, 0x028E]);
// random_below's LD A,R (the value after it, at $A73A) and its seven XOR (HL)
const R_AFTER = 0xA73A, XORS = [0xA741, 0xA743, 0xA745, 0xA74D, 0xA74F, 0xA751, 0xA755];

// The game's side: frames of play from the state (or the hand-over), with the player choosing at
// each read; the keys held there, the T-state of each read (from the start), the draws' bytes.
function record(o) {
  const m = o.state ? lib.restore(lib.readState(o.state)) : lib.boot();
  const t0 = m.cpu.tstates, cpu = m.cpu;
  const rec = { state: o.state || null, t0, reads: [], times: [], R: [], A: [], rewinds: new Set(), frames: o.frames };
  const po = { designer: o.designer, onRewind: () => rec.rewinds.add(rec.reads.length) };
  for (const k of ['scenario', 'players']) if (o[k]) po[k] = o[k];
  const input = player(lib.makeRnd(o.seed || 1), m, po);
  for (const a of READS) {
    m.hooks[a] = q => {
      if (q !== m) return false;
      input.check(m);
      if (o.at) o.at(rec.reads.length, m);
      rec.reads.push([a, Array.from(m.keys)]);
      rec.times.push(cpu.tstates - t0);
      return false;
    };
  }
  m.hooks[R_AFTER] = q => { if (q === m) rec.R.push(cpu.a); return false; };
  for (const a of XORS) m.hooks[a] = q => { if (q === m) rec.A.push(m.ram[(cpu.h << 8) | cpu.l]); return false; };
  for (let f = 0; f < o.frames; f++) { input.frame(f, m); m.runFrames(1); }
  rec.end = cpu.tstates - t0;
  return rec;
}

// The page's side: the runtime made by make(io) from the same start, the keys of each read set as
// the port reaches it, the draws given the game's bytes, the cassette the moment's own (lib.js's,
// which the player rewinds). The time of a read is the clock's once the stretch that leads to it is
// paid (the runtime pays it before it runs the port on). start() gives the runtime ready to run a
// frame at a time; replay() runs it for as long as the game ran.
const FRAME = 69888;
const ramOf = s => { const a = new Uint8Array(0x10000); a.set(Buffer.from(s.ram, 'base64'), s.from || 0); return a; };
function start(rec, make, o = {}) {
  let ri = 0, ai = 0, inDraw = 0, rt = null, out = null;
  // A draw past the game's last (a page a little ahead of the game, which draws again before the
  // game's session ended): from there the page plays a game of its own, and out.past holds the
  // number of reads it had made. Its bytes are made from the count, the same on every page machine.
  const past = () => { if (out.past === null) out.past = out.reads.length; };
  const io = {
    readR: () => { if (ri < rec.R.length) return rec.R[ri++]; past(); return (ri++ * 167 + 13) & 255; },
    readAt: a => { if (!inDraw) return rt.M[a]; if (ai < rec.A.length) return rec.A[ai++]; past(); return rt.M[a]; },
  };
  rt = make(io);
  const NAME = Object.fromEntries(Object.entries(rt.KEY).map(([k, v]) => [v, k]));
  out = { rt, times: [], reads: [], past: null, get drawsLeft() { return rec.R.length - ri; } };
  let k = 0;
  const draw = rt.P.random_below;
  rt.P.random_below = function (r) { inDraw++; try { return draw.call(this, r); } finally { inDraw--; } };
  const wrap = gen => (function* () {
    for (;;) {
      const r = gen.next();
      if (r.done) return r.value;
      const y = r.value;
      const read = y && READS.has(y.cp);
      if (read) {
        if (rec.rewinds.has(k)) rt.P.io.tape.rewind();
        const want = rec.reads[k];
        rt.input.keys = new Set(want ? want[1].map(n => NAME[n]).filter(Boolean) : []);
        if (o.at) o.at(k, rt);
        out.reads.push(y.cp);
        k++;
      }
      yield y;
      if (read) out.times.push(rt.t - out.base);
    }
  })();
  if (rec.state) {
    const s = lib.readState(rec.state);
    rt.restore(o.blank ? o.blank(s) : s, P => {
      P.part = lib.partOf(ramOf(s));
      P.io.tape = o.tape ? o.tape(s) : lib.Tape.from(s.tape);
      return wrap(P.resume ? P.resume() : (function* () { yield* P.run(0x61E6); return yield* P.run(0x617F); })());
    });
  } else {
    // from the hand-over: the page's own start, on the game's cassette as lib.js holds it (no
    // winding back after the last file, which the player rewinds)
    rt.restore(o.data, P => { P.part = 0; P.io.tape = o.tape ? o.tape() : lib.gameTape(); return wrap(P.run(0xE1ED)); });
  }
  out.base = rt.t;
  out.frames = Math.ceil(rec.end / FRAME) + 2;
  return out;
}
function replay(rec, make, o = {}) {
  const out = start(rec, make, o);
  out.threw = null;
  for (let f = 0; f < out.frames && !out.threw; f++) {
    try { out.rt.runFrame(); } catch (e) { out.threw = e; }
  }
  out.missing = out.rt.missing;
  return out;
}

module.exports = { record, start, replay, READS, ramOf };
