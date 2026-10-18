'use strict';
// The whole port beside the game, pass by pass (kit/c64/lockstep.js), from the moments of play in
// work/states with random keys and joystick moves at the start of passes. The game runs on
// kit/c64/c64run.js, the drive and KERNAL stand-in included; routines the port has not written are
// the game's own code (standin.js).
//   node lockstep.js [passes] [state name filter] [seed] [more keys, comma-separated]
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));
const { Machine } = require(path.join(lib.REPO, 'kit/c64/machine.js'));
const standin = require('./standin.js');
const SRC = path.join(lib.GAME, 'port/src');

function loadPort() {
  require(path.join(SRC, 'core.js'));
  for (const f of fs.readdirSync(SRC).sort()) if (f !== 'core.js' && f.endsWith('.js')) require(path.join(SRC, f));
  return globalThis.SRPort;
}

// The interrupt's bytes the main program reads: the frame count, the keyboard buffer and its count
// and room, the keyboard's state, and $0D03, which the keyboard scan clears when a key is down
const IRQ_BYTES = [0x03, 0x04, ...Array.from({ length: 0x11 }, (_, i) => 0x05 + i), 0x16, 0x0D03];

// A copy of the drive, so that a save on one side never reaches the other.
function driveCopy() {
  const d = lib.readDisk();
  return lib.C64Run.drive({ files: Object.assign({}, d.files), sectors: d.sectors });
}
// The disk as the port's io gives it.
function portDisk() {
  const D = driveCopy();
  return {
    load: name => { const f = D.find(name); return f ? D.files.get(f) : null; },
    block: (t, s) => D.sectors.get(t + ',' + s) || null,
    save: (name, bytes) => { D.files.set(D.bare(name), bytes); },
  };
}

// The game: a runner from the moment, whose machine copies itself with its drive and KERNAL (the
// lockstep copies the machine to look ahead).
class RunMachine extends Machine {
  static restore(s) {
    const R = lib.C64Run.create({ drive: driveCopy(), keep: {}, rasterFix: () => {}, state: { machine: s, frame: 0 } });
    Object.setPrototypeOf(R.m, RunMachine.prototype);
    return R.m;
  }
}

// The visit's loop: a pass of a base starts here ($A4DF)
const BASE_PASS = 0xA4DF;

// o.dock: the moment is one of flight by a base, and the ship docks there at once, as dock_check
// docks: the game handed over at dock ($7094) with the return to the main loop's pass on the
// stack (the game drops the draw list's), the port's program dock and then its main loop. The
// passes are the visit's ($A4DF) until the ship leaves.
function run(o) {
  if (o.program) return runProgram(o);
  const SR = loadPort();
  const s = lib.readState(o.state);
  const m = RunMachine.restore(s.machine);
  if (o.dock) {
    const c = m.cpu;
    m.ram[0x100 + c.sp] = 0x0D; c.sp = (c.sp - 1) & 255;
    m.ram[0x100 + c.sp] = 0xEC; c.sp = (c.sp - 1) & 255;
    c.pc = 0x7094;
  }
  const P = SR.makePort(new Uint8Array(65536), portDisk(), { only: o.groups });
  standin.install(P, standin.labels(o.parts || (o.dock ? ['engine', 'station', 'flight'] : ['engine', 'flight'])), IRQ_BYTES);
  if (o.onPort) o.onPort(P, m);
  const program = o.dock ? P => (function* () { yield* P.dock(); yield* P.main_loop(); })() : P => P.main_loop();
  const ls = new Lockstep({ machine: m, port: P, program, checkpoints: P.CHECKPOINTS, passAt: o.dock ? BASE_PASS : undefined,
    irqs: { 0x0EA0: 'irq_entry', 0xFF48: 'irq_body' }, irqBytes: IRQ_BYTES, chips: ['colour', 'vic', 'sid'],
    ignore: o.ignore || [], maxFrames: o.maxFrames || 500, timing: o.timing });
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  let seed = o.seed || 1;
  const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return Math.floor(seed / 4294967296 * n); };
  const KEYS = (o.keys || ['A', 'D', 'W', 'X', 'Z', 'C', 'S', '+', 'T', 'V', 'SPACE', 'R', 'I']).concat(o.extraKeys || []);
  const DIRS = [0, 1, 2, 4, 8, 16, 5, 9, 6, 10, 17, 20, 24];
  // While no pass starts (a dialog waits for a key, a menu for a choice), now and then the stick
  // up or down or its fire button alone, held for a few frames and then let go: a menu moves its
  // bar only when the stick has been centred, so a stick left held from a pass would leave it
  // stuck. Not a key: a key given in the middle of a stretch reaches the game's keyboard buffer,
  // which the port reads through irqByte as a copy of the game run on ahead saw it, and a copy
  // made before the key has not seen it.
  const ANSWERS = { FIRE: 0x10, UP: 0x01, DOWN: 0x02 }, ANSWER = ['FIRE', 'FIRE', 'UP', 'DOWN'];
  // Navigation Control's menu ($8C the bar, from 0 each time): down more often than up, fire
  // always once the bar is on COCKPIT, so that it comes round, and never fire on STATUS, whose
  // pages are SEG1's, which the port has not written
  const navMenu = mm => mm.ram[0x7A] === 0xF1 && mm.ram[0x7B] === 0x26 && mm.ram[0x8B] === 6;
  const NAV_ANSWER = ['FIRE', 'DOWN', 'DOWN', 'DOWN', 'UP'];
  let held = null, until = 0, answer = null, answerUntil = 0, lastPass = -1, passFrame = 0, typing = null;
  const res = ls.run({ passes: o.passes || 200, stopOnDiff: o.stopOnDiff !== false, onPass: (n, mm) => {
    if (held && n >= until) { mm.release(held); held = null; }
    if (!held && rnd(12) === 0) { held = KEYS[rnd(KEYS.length)]; mm.press(held); until = n + 1 + rnd(3); }
    if (rnd(8) === 0) mm.joy = 0x1F & ~DIRS[rnd(DIRS.length)];
  }, onFrame: (f, mm, l) => {
    if (answer && f >= answerUntil) { mm.joy = 0x1F; answer = null; }
    if (l.res.passes !== lastPass) { lastPass = l.res.passes; passFrame = f; return; }
    // A line to type (a talk's OTHER...) waits for RETURN: after 400 frames with no pass, RETURN
    // pressed where the game and the port stand at the same stop, so that the copy the port
    // reads the keyboard buffer from is made after it, and let go at a stop a few frames on
    const still = l.matched && l.at >= 0;
    if (typing === null && f - passFrame > 400 && still) { mm.press('RETURN'); typing = f; return; }
    if (typing !== null && f - typing > 3 && still) { mm.release('RETURN'); typing = null; passFrame = f; return; }
    if (f - passFrame > 25 && !answer && rnd(10) === 0) {
      const nav = navMenu(mm), list = nav ? NAV_ANSWER : ANSWER;
      answer = nav && mm.ram[0x8C] === 5 ? 'FIRE' : list[rnd(list.length)];
      if (answer === 'FIRE' && nav && mm.ram[0x8C] === 2) answer = 'DOWN';
      mm.joy = 0x1F & ~ANSWERS[answer];
      answerUntil = f + 2 + rnd(6);
    }
  } });
  return { res, ls, m, P };
}

// o.program: the title, the intro or the ending (src/g-screens.js), from one of its moments: the
// program's start at its -00, its checkpoint elsewhere. The passes are the moment's passAt. keys(f,
// machine, lockstep) gives the keys at the frames the run stands at a stop, where the port's copy of
// the game sees what the game does: a key held there, and let go at a later stop.
function runProgram(o) {
  const SR = loadPort();
  const s = lib.readState(o.state);
  const m = RunMachine.restore(s.machine);
  const P = SR.makePort(new Uint8Array(65536), portDisk(), { program: o.program });
  const def = globalThis.SRPrograms[o.program];
  standin.install(P, standin.labels([o.program]), P.IRQ_BYTES);
  if (o.onPort) o.onPort(P, m);
  const start = /-00$/.test(o.state.replace(/\.json$/, ''));
  // The program ends where it goes to another (P.Goto): the title to the intro, the intro to SR or
  // the title again, the ending to the title. The port stops there as at a checkpoint, the game's
  // interrupts meanwhile run in it, and the two are compared once more, A and the carry included.
  let goto = null;
  const program = P => (function* () {
    try { return yield* (start ? P[def.start]() : P[o.resume]()); } catch (e) {
      if (!(e instanceof P.Goto)) throw e;
      goto = e;
      yield { cp: e.to, cycles: P.take() };
    }
  })();
  const ls = new Lockstep({ machine: m, port: P, program, checkpoints: P.CHECKPOINTS.concat(def.exits), passAt: s.machine.passAt,
    irqs: { [P.addr(0x2265)]: 'irq', 0xFF48: 'irq_body' }, irqBytes: P.IRQ_BYTES, chips: ['colour', 'vic', 'sid'],
    ignore: o.ignore || [], maxFrames: o.maxFrames || 3000, timing: o.timing });
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  // The game's runner moves a raster compare past the frame's last line back into it (rasterFix:
  // bitmap_mode's hang, Discoveries), so the port's chips do too
  const chips = ls.chips, write = chips.ioWrite.bind(chips);
  chips.ioWrite = (a, v) => {
    write(a, v);
    const r = a & 0x3F;
    if (a >= 0xD000 && a < 0xD400 && (r === 0x11 || r === 0x12 || r === 0x1A) && chips.cmp >= 312 && (chips.enable & 1)) chips.cmp &= 0xFF;
  };
  let held = null, heldAt = 0;
  const res = ls.run({ passes: o.passes || 50, stopOnDiff: o.stopOnDiff !== false, onFrame: (f, mm, l) => {
    if (!(l.matched && l.at >= 0)) return;
    if (held && f - heldAt > 3) { mm.release(held); held = null; return; }
    const k = !held && o.keys ? o.keys(f, mm, l) : null;
    if (k) { mm.press(k); held = k; heldAt = f; }
  } });
  if (goto && res.diverged && ls.at === goto.to && ls.matched) {
    const d = ls.compare(), c = m.cpu;
    if (d) res.diffs.push(Object.assign({ pass: res.passes, frame: m.frames }, d));
    const regs = [['A', c.a, goto.r.a], ['C', c.c, goto.r.c]].filter(([, g, p]) => p !== undefined && g !== p);
    if (regs.length) res.diffs.push({ pass: res.passes, frame: m.frames, count: regs.length, bytes: regs.map(([k, game, port]) => ({ chip: 'register ' + k + ' at', address: goto.to, game, port })) });
    res.diverged = null;
    res.ok = !res.diffs.length;
  }
  return { res, ls, m, P, goto };
}

if (require.main === module) {
  const passes = +(process.argv[2] || 200), filter = process.argv[3] || 'flight', seed = +(process.argv[4] || 1);
  const extraKeys = process.argv[5] ? process.argv[5].split(',') : [];
  let ok = 0, n = 0;
  for (const f of lib.states(filter)) {
    n++;
    let out;
    try { out = run({ state: f, passes, seed, extraKeys }); } catch (e) { console.log(f + ': ' + (e.stack || e.message).split('\n').slice(0, 4).join('\n  ')); continue; }
    console.log(f + ' (' + out.P.standIns.size + ' stand-ins): ' + describe(out.res).split('\n').join('\n  '));
    if (out.res.ok) ok++;
  }
  console.log(ok + '/' + n + ' moments in step');
  process.exitCode = ok === n ? 0 : 1;
}

module.exports = { run, loadPort, portDisk, IRQ_BYTES };
