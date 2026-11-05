'use strict';
// The whole port beside the game, pass by pass (kit/c64/lockstep.js), from the hand-over at $4000
// (parts/main/work/entry.vsf) along a scripted session of keys. Every call of GETIN ($6DFA) is a
// checkpoint and a pass; the game's interrupt is the arrow's ($4229) with the KERNAL in and the
// bridge at $414A with it out. The two drives are compared at the end, file by file.
//   node lockstep.js [session name] [passes]
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.REPO, 'kit/c64/lockstep.js'));
const SRC = path.join(lib.GAME, 'port/src');
const AEKernal = globalThis.AEKernal;

function loadPort() {
  if (!globalThis.AEPort || !globalThis.AEPort.create) {
    require(path.join(SRC, 'core.js'));
    for (const f of fs.readdirSync(SRC).sort()) if (f !== 'core.js' && f.endsWith('.js')) require(path.join(SRC, f));
  }
  return globalThis.AEPort;
}

// What the port does not keep as the game does, left out of the comparison:
// - $02-$03 and $08-$1D, $24-$27: the p-code interpreter's own registers (its instruction pointer,
//   primary and secondary values) and the scratch its 6502 routines work in, dead between
//   routines. $04-$07, the stack and frame pointers, are kept and compared.
// - $417D and $417E: the A register the NMI and IRQ bridges keep, the main program's.
// - $CC6A-$CFFF: the p-code's stack, whose frames and locals the port keeps in JavaScript (a local
//   whose address the game passes on is at the game's address, and what it holds reaches the
//   screen, the disk or the shared words, which are compared).
const IGNORE = [[0x02, 0x03], [0x08, 0x1D], [0x24, 0x27], [0x417D, 0x417E], [0xCC6A, 0xCFFF]];

// A session: steps run in order, as the scripted runs that made work/states do it. Each becomes
// key presses at frames: ['run', frames], ['key', name, hold, after], ['type', text].
const SESSIONS = {
  // a new game: the name, the questionnaire left to chance, the phase menu's first phase
  'new-random': [['run', 150], ['key', 'RETURN', 6, 400], ['type', 'ADAM'], ['key', 'RETURN', 6, 300],
    ['key', 'DOWN', 4, 30], ['key', 'RETURN', 6, 800], ['key', 'RETURN', 6, 900], ['run', 600]],
};
// Each event waits its delay after the one before was given, and is given only where the game and
// the port stand at the same stop, so that a key falls in the same pass on both sides; one that
// came due in a long stretch (a load) is late, and the ones after it with it.
function timeline(steps) {
  const out = [];
  let wait = 0;
  const key = (k, hold = 6, after = 20) => { out.push([wait, 'press', k]); out.push([hold, 'release', k]); wait = after; };
  for (const [op, a, b, c] of steps) {
    if (op === 'run') wait += a;
    else if (op === 'key') key(a, b, c);
    else if (op === 'type') for (const ch of a) key(ch === ' ' ? 'SPACE' : ch.toUpperCase(), 4, 8);
  }
  out.push([wait, 'end']);
  return out;
}

function run(o = {}) {
  const AE = loadPort();
  const m = lib.machine('parts/main/work/entry.vsf');
  const P = AE.create(new Uint8Array(65536), {}, { charRom: lib.charRom(), drive: lib.newDrive(), cpuPort: m.cpu.pdata, cpuDir: m.cpu.pdir });
  const ls = new Lockstep({ machine: m, port: P, program: P => P.native_startup_enter_vm(), entry: 0x4000,
    checkpoints: [0x6DFA], passAt: 0x6DFA, waits: [], irqs: { 0xEA31: 'irq_kernal', 0x4229: 'irq_sprite', 0x414A: 'irq_dispatch_bridge' },
    irqBytes: P.irqBytes, chips: ['colour', 'vic', 'sid'], ignore: IGNORE.concat(o.ignore || []),
    maxFrames: o.maxFrames || 2000, timing: o.timing });
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  const tl = timeline(SESSIONS[o.session || 'new-random']);
  let i = 0, last = m.frames;
  const res = ls.run({ passes: o.passes || 1e9, stopOnDiff: o.stopOnDiff !== false, onFrame: (f, mm, l) => {
    // the machine's own frame count: onFrame comes for each frame begun since the port's last
    // yield, several at once after a long stretch, with the machine standing still meanwhile
    if (i >= tl.length || !(l.matched && l.at >= 0) || mm.frames - last < tl[i][0]) return;
    const [, op, k] = tl[i++];
    last = mm.frames;
    if (op === 'press') mm.press(lib.KEY[k]);
    else if (op === 'release') mm.release(lib.KEY[k]);
    else if (o.stopAtEnd !== false) l.stopped = true;
  } });
  // the drives: what each side wrote
  const a = AEKernal.driveState(m.cpu.drive), b = AEKernal.driveState(P.drive);
  const drives = JSON.stringify(a) === JSON.stringify(b) ? null : { game: a, port: b };
  return { res, ls, m, P, drives };
}

if (require.main === module) {
  const session = process.argv[2] || 'new-random', passes = +(process.argv[3] || 1e9);
  const t = Date.now();
  let out;
  try { out = run({ session, passes }); } catch (e) { console.log(e.stack); process.exit(1); }
  console.log(session + ': ' + describe(out.res).split('\n').join('\n  '));
  console.log('frames', out.m.frames, 'pc $' + out.m.cpu.pc.toString(16), (Date.now() - t) / 1000 + ' s');
  if (out.drives) console.log('the drives differ');
  process.exitCode = out.res.ok && !out.drives ? 0 : 1;
}

module.exports = { run, loadPort, SESSIONS, IGNORE };
