'use strict';
// The sound of a practice race on Little Ramp, for How it works (index.html, block sfx-race): the
// Play tab's machine (page-machine.js) runs the game from the loader's hand-over through the main
// menu, a name, Practise and Little Ramp, and drives a set way, as test_play.js's practice session
// does. While it does, each call of the sound's routines is written down with the interrupt's
// frame it came in (EFFECT_TICK's calls counted from START_SOUNDS):
// - the start: what START_SOUNDS ($3F27) finds, the bytes the sound's code reads (the random
//   number's five bytes $02-$06, the engine's note and step $09-$0A and $10-$11, the effects'
//   counts $86C5-$86DB, the car's speed and the wheels' and the stick's bytes ENGINE_SOUND reads)
//   and the SID's 25 registers as last written;
// - each call of the race's main loop that writes the SID: ENGINE_SOUND ($E104) with the bytes it
//   reads ($6A, $66, $0156, $0159) and the random number's five bytes; EFFECT ($CF68) with the
//   effect and the stones' pitch at $AF8C, which DUST_GO and DAMAGE set before they call it; and
//   STOP_EFFECTS ($E0F9). Each is put in the frame it begins in, ENGINE_SOUND in the frame of its
//   read of the engine's note ($09), which the interrupt may move on first. The interrupt may also
//   come between two of a call's writes to the SID: cut is how many of them came before it, or -1
//   (split lists any ENGINE_SOUND the interrupt came into between its reads of $09 and $0A, which
//   no frame can give back, and other lists any SID write from the main loop outside these calls);
// - after each frame's EFFECT_TICK, the SID's registers, which test_sound.js holds the page's
//   player to.
// The race ends where the next START_SOUNDS begins another (after the wreck, the crane lifts the
// car back).
//   node race-sound.js                     (print what it records)
//   const { record } = require('./race-sound.js'); record(dir)
const path = require('path');
const J = { none: 0x1F, up: 0x1E, down: 0x1D, left: 0x1B, right: 0x17, fire: 0x0F };
const tap = (joy, hold = 8, after = 40) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
const NAME = [...type('A'), ...type('C'), ...type('E'), ...type('RETURN')];
const MENUS = [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...NAME, { frames: 200 }, ...tap(J.fire), { frames: 100 }];
const DRIVE = [{ frames: 180, joy: J.fire }, { frames: 500, joy: J.up }, { frames: 60, joy: J.up & J.left }, { frames: 300, joy: J.up },
  { frames: 60, joy: J.up & J.right }, { frames: 100, joy: J.down }, { frames: 400, joy: J.up }];
const SCRIPT = [...MENUS, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 300 },
  ...tap(J.fire), { frames: 600 }, ...DRIVE];
const START = [0x02, 0x03, 0x04, 0x05, 0x06, 0x09, 0x0A, 0x10, 0x11];
for (let a = 0x86C5; a <= 0x86DB; a++) START.push(a);
const ENGINE = [0x6A, 0x66, 0x0156, 0x0159, 0x02, 0x03, 0x04, 0x05, 0x06];

function record(dir) {
  const { SCRPage, data, cost } = require('./page-machine.js').load(dir);
  const rt = SCRPage.create({ data, cost }), P = rt.P, M = rt.M;
  let tick = -1, over = false, depth = 0, inIrq = false, inStart = false, cur = null, read09 = false;
  const out = { start: null, engine: null, sid: null, events: [], regs: [], split: [], other: [] };
  // a call that writes the SID: kind 0 ENGINE_SOUND, 1 EFFECT, 2 STOP_EFFECTS
  const watch = (n, kind, args) => {
    const o = P[n];
    P[n] = function (...a) {
      if (over || tick < 0 || inIrq || depth) { depth++; try { return o.apply(this, a); } finally { depth--; } }
      if (inStart) { if (kind === 0) out.engine = args(a[0] || {}); depth++; try { return o.apply(this, a); } finally { depth--; } }
      cur = { e: [tick, kind, ...args(a[0] || {}), -1], writes: 0 }; read09 = kind !== 0;
      out.events.push(cur.e);
      depth++;
      try { return o.apply(this, a); } finally { depth--; cur = null; }
    };
  };
  watch('ENGINE_SOUND', 0, () => ENGINE.map(a => M[a]));
  watch('EFFECT', 1, r => [r.a & 255, M[0xAF8C]]);
  watch('STOP_EFFECTS', 2, () => []);
  const ss = P.START_SOUNDS;
  P.START_SOUNDS = function (...a) {
    if (out.start) over = true;
    if (over) return ss.apply(this, a);
    tick = 0; inStart = true;
    out.start = START.map(x => M[x]); out.sid = Array.from(rt.sidw.subarray(0, 25));
    try { return ss.apply(this, a); } finally { inStart = false; }
  };
  const ib = P.irqByte;
  P.irqByte = a => {
    const v = ib(a);
    if (cur && cur.e[1] === 0 && a === 0x09) { cur.e[0] = tick; read09 = true; }
    else if (cur && cur.e[1] === 0 && a === 0x0A && cur.e[0] !== tick) out.split.push(tick);
    return v;
  };
  rt.onSid(() => {
    if (over || tick < 0 || inIrq || inStart) return;
    if (cur) cur.writes++;
    else if (!depth) out.other.push(tick);
  });
  const irq = P.IRQ;
  P.IRQ = function (...a) { inIrq = true; try { return irq.apply(this, a); } finally { inIrq = false; } };
  const tk = P.EFFECT_TICK;
  P.EFFECT_TICK = function (...a) {
    const q = tk.apply(this, a);
    if (tick >= 0 && !over) {
      if (cur && read09 && cur.e[0] === tick) cur.e[cur.e.length - 1] = cur.writes;
      out.regs.push(Array.from(rt.sidw.subarray(0, 25))); tick++;
    }
    return q;
  };
  for (const s of SCRIPT) {
    rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy;
    for (let i = 0; i < s.frames && !over; i++) rt.runFrame();
    if (over) break;
  }
  out.frames = out.regs.length;
  // the button starts 25 frames before the car first lands, the crane's lowering skipped
  const land = out.events.find(e => e[1] === 1 && e[2] === 3);
  out.from = land ? Math.max(0, land[0] - 25) : 0;
  return out;
}
// what the page carries: everything but the registers
const carried = r => ({ start: r.start, engine: r.engine, sid: r.sid, events: r.events, frames: r.frames, from: r.from });
module.exports = { record, carried, START, ENGINE };

if (require.main === module) {
  const r = record(path.resolve(__dirname, '../..'));
  const n = {};
  for (const e of r.events) { const k = ['engine', 'effect ' + e[2], 'stop'][e[1]]; n[k] = (n[k] || 0) + 1; }
  console.log(r.frames + ' frames from START_SOUNDS, the button from frame ' + r.from + ': ' + JSON.stringify(n));
  console.log(JSON.stringify(carried(r)).length + ' bytes carried; cut ' + JSON.stringify(r.events.filter(e => e[e.length - 1] >= 0)) + '; split ' + JSON.stringify(r.split) + '; other ' + JSON.stringify(r.other));
}
