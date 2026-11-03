'use strict';
// The whole port beside the game, pass by pass (kit/c64/lockstep.js), from the reset's entry: the
// title, then a game played by an explorer that turns towards the enemy and fires, wanders, stops,
// pauses and goes on, and the games that follow its game overs (cold); the title left alone until
// the demonstration, its countdown shortened (demo); and a game in which every enemy's death leaves
// one to go, so that the stargates open and the warps run (warp).
//   node lockstep.js [passes] [session filter] [seed]
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));

const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
const IRQS = { 0xB2FE: 'irq_status_band', 0xB31D: 'irq_view_top_sky', 0xB34E: 'irq_horizon_band1',
  0xB374: 'irq_horizon_band2', 0xB39A: 'irq_horizon_band3', 0xB3C0: 'irq_ground_mirror_charset',
  0xB3EA: 'irq_console_and_frame_tick' };

function rng(seed) {
  let s = seed >>> 0 || 1;
  return n => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return Math.floor(s / 4294967296 * n); };
}
// The explorer: for each frame, the joystick and the keys, from the game's own memory. It steers
// at a target (the stargate once it is open, the enemy while it lives): of the heading a step to
// either side and its own, the one whose velocity (the sine table at $8900, as
// compute_object_velocity uses it) points most nearly at the target. In turn it aims and fires,
// drives at the target, wanders, or stands; now and then it pauses (SPACE, and the stick goes on),
// leaves the game (F1) or presses a title key.
const w16 = v => (v & 0x8000 ? v - 0x10000 : v);
function heading(M, oct, fine) {
  const y = ((oct & 1) << 7) | (fine >> 1);
  let a = M[0x8900 + y], b = M[0x8900 + (y ^ 0xFF)];
  if (oct & 2) [a, b] = [b, a];
  return [oct & 4 ? -a : a, (oct + 2) & 4 ? -b : b];
}
function steer(M, obj) {
  const dx = w16(((M[0x8260 + obj] << 8) | M[0x82C0 + obj]) - ((M[0x8260] << 8) | M[0x82C0]) & 0xFFFF);
  const dz = w16(((M[0x8320 + obj] << 8) | M[0x8380 + obj]) - ((M[0x8320] << 8) | M[0x8380]) & 0xFFFF);
  const ang = (M[0x84A0] & 7) * 256 + M[0x84C0];
  const dot = d => { const h = (ang + d + 2048) & 2047, [vx, vz] = heading(M, h >> 8, h & 255); return (vx * dx + vz * dz) / Math.hypot(vx, vz, 1e-9) / Math.hypot(dx, dz, 1e-9); };
  const here = dot(0), right = dot(48), left = dot(-48);
  return { turn: right > here && right >= left ? RIGHT : left > here ? LEFT : 0, ahead: here > 0.985, near: Math.hypot(dx, dz) };
}
function explorer(seed, o = {}) {
  const rnd = rng(seed);
  let mode = 0, hold = 0, wander = 0, key = null, keyFor = 0;
  return (m, f) => {
    const M = m.ram;
    if (key !== null) { if (--keyFor <= 0) { m.release(key); key = null; } }
    else if (f > 200 && !o.noKeys && !rnd(1500)) { key = ['SPACE', 'SPACE', 'F1', 'F5', '3', '1'][rnd(6)]; keyFor = 2 + rnd(6); m.press(key); }
    if (--hold <= 0) { mode = rnd(10); hold = 20 + rnd(120); wander = [UP, DOWN, LEFT, RIGHT, UP | LEFT, UP | RIGHT, DOWN | LEFT, 0][rnd(8)]; }
    const gate = M[0xA3] === 0xEC && M[0xA4] === 0xA4 && M[0x83E3];
    if (gate && o.gate) { const s = steer(M, 3); return s.turn | (M[0x75] === 0xFF || s.near > 0x300 ? UP : 0); }
    if (o.passive) return mode < 8 ? wander : 0;
    let j = 0;
    if (mode < 6) {
      if (M[0x83E2]) { const s = steer(M, 2); j |= s.turn | (s.ahead ? FIRE : 0); }
      if (mode < 3) j |= UP;
    } else if (mode < 9) j = wander | (rnd(5) ? 0 : FIRE);
    return j;
  };
}

// The sessions: the level picked on the title (its key), and what the explorer does. warp and
// deep leave one enemy to go whatever the count, so that every kill opens the stargate, and steer
// into it; over starts on the last shield and plays without aiming, so that the game ends.
const SESSIONS = {
  cold: {},
  demo: { demo: true },
  warp: { level: '5', oneLeft: true, gate: true },
  deep: { level: '8', oneLeft: true, gate: true },
  over: { level: '3', lastShield: true, passive: true },
};

// The machine a session starts from, and where the port's program starts.
function machine(S) {
  const m = lib.boot();
  if (S.demo) {
    lib.stopAt(m, 0x9CBA);
    m.ram[0xF7] = 1; m.ram[0xF8] = 1; m.ram[0xF9] = 1;
    return { m, at: 0x9CBA };
  }
  return { m, at: 0x9C3E };
}

function collisionsAhead(m) {
  const g = lib.hook(lib.Machine.restore(m.save()));
  g.keys = new Set(m.keys); g.joy = m.joy;
  const rd = g.ioRead;
  let v = null;
  g.ioRead = function (a) { const x = rd.call(this, a); if (!this.depth && a === 0xD01F && v === null) { v = x; this.stopFlag = true; } return x; };
  for (let f = 0; f < 50 && v === null; f++) g.runCycles(lib.FRAME);
  if (v === null) throw new Error('the game read no $D01F in 50 frames');
  return v;
}

function run(o) {
  const EP = lib.EP;
  const S = SESSIONS[o.session];
  if (!S) throw new Error('no session ' + o.session);
  const { m, at } = machine(S);
  const P = EP.makePort(new Uint8Array(65536), {});
  if (o.onPort) o.onPort(P, m);
  const ls = new Lockstep({ machine: m, port: P, program: P => P.main({ at }), checkpoints: P.CHECKPOINTS, waits: P.WAITS,
    irqs: IRQS, irqBytes: EP.IRQ_BYTES, chips: ['colour', 'vic', 'sid'], ignore: o.ignore || [],
    maxFrames: o.maxFrames || 3000, timing: o.timing, hooks: lib.HOOKS });
  // What the port reads ahead of the game in a stretch, from the game: the raster line a few cycles
  // on (the main loop's raster wait), and the sprite-to-background collisions ($D01F), which the
  // port's chips do not model: a copy of the game run on to its main program's next read of them.
  const vicRead = P.io.vicRead;
  P.io = Object.assign({}, P.io, {
    rasterIn: n => Math.floor((m.cpu.cycles + n) / lib.LINE) % lib.LINES & 0xFF,
    vicRead: r => ((r & 0x3F) === 0x1F ? collisionsAhead(m) : vicRead(r)),
  });
  if (o.onLockstep) o.onLockstep(ls);
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  const joy = explorer(o.seed || 1, S);
  const poke = (a, v) => { m.ram[a] = v; P.M[a] = v; };
  let shield = true;
  const res = ls.run({ passes: o.passes || 300, stopOnDiff: o.stopOnDiff !== false,
    onPass: (n, mm) => {
      if (S.oneLeft && mm.ram[0x8BA8] > 1) poke(0x8BA8, 1);
      if (S.lastShield && shield && mm.ram[0x6026] === 0x88) { poke(0x6026, 0x80); poke(0x6027, 0x81); shield = false; }
      if (o.onPass) o.onPass(n, mm, ls);
    },
    onFrame: o.onFrame || ((f, mm) => {
      if (S.demo) return;
      if (S.level) { if (f === 8) mm.press(S.level); else if (f === 12) mm.release(S.level); }
      if (f >= 20 && f < 24) mm.press('F7'); else if (f === 24) mm.release('F7');
      mm.joy = 0x1F & ~(f < 30 ? 0 : joy(mm, f));
    }) });
  return { res, ls, m, P };
}

if (require.main === module) {
  const passes = +(process.argv[2] || 300), filter = process.argv[3] || '', seed = +(process.argv[4] || 1);
  const sessions = Object.keys(SESSIONS).filter(s => s.includes(filter));
  let ok = 0;
  for (const s of sessions) {
    let out;
    const t0 = Date.now();
    try { out = run({ session: s, passes, seed }); } catch (e) { console.log(s + ': ' + (e.stack || e.message).split('\n').slice(0, 8).join('\n  ')); continue; }
    console.log(s + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s): ' + describe(out.res).split('\n').join('\n  '));
    if (out.res.ok) ok++;
  }
  console.log(ok + '/' + sessions.length + ' sessions in step');
  process.exitCode = ok === sessions.length ? 0 : 1;
}

module.exports = { run, explorer, IRQS, SESSIONS };
