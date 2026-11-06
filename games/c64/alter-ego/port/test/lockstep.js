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
const RESET = 0xFCE2;                              // the KERNAL's reset, where a quit ends

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
// - $417D-$4180: the A register and the processor port the NMI and IRQ bridges keep, the main
//   program's where the interrupt came: the port takes its interrupts between its steps, so never
//   inside a stretch the game runs with the KERNAL out (a string read from under it).
// - $CC6A-$CFFF: the p-code's stack, whose frames and locals the port keeps in JavaScript (a local
//   whose address the game passes on is at the game's address, and what it holds reaches the
//   screen, the disk or the shared words, which are compared).
const IGNORE = [[0x02, 0x03], [0x08, 0x1D], [0x24, 0x27], [0x417D, 0x4180], [0xCC6A, 0xCFFF]];

// A session: steps run in order, as the scripted runs that made work/states do it. Each becomes
// key presses at frames: ['run', frames], ['key', name, hold, after], ['type', text].
const SESSIONS = {
  // a new game: the name, the questionnaire left to chance, the phase menu's first phase
  'new-random': [['run', 150], ['key', 'RETURN', 6, 400], ['type', 'ADAM'], ['key', 'RETURN', 6, 300],
    ['key', 'DOWN', 4, 30], ['key', 'RETURN', 6, 800], ['key', 'RETURN', 6, 900], ['run', 600]],
};
// the first stage played: through Infancy's picture and its scenes' pages, an answer taken now and
// then (the arrow moved down onto it first)
SESSIONS.infancy = SESSIONS['new-random'].slice(0, -1).concat([['run', 600]],
  ...Array.from({ length: 40 }, (_, i) => (i % 3 === 2 ? [['key', 'DOWN', 4, 60], ['key', 'RETURN', 6, 700]] : [['key', 'RETURN', 6, 700]])));
// A player that presses keys at random from a seed, as a session: mostly fire (RETURN), which plays
// the cell or takes the answer under the arrow, then the cursor keys (up and left are SHIFT with
// down and right, as on the C64), the function keys (the choices
// beside the map; shifted, f2-f8) and now and then RUN/STOP and the menu's first line (back to the
// map). Each key waits a while after the one before
const PICK = [['RETURN', 9], ['DOWN', 4], ['LSHIFT+DOWN', 2], ['LSHIFT+RIGHT', 2], ['RIGHT', 2], ['F1', 1], ['F3', 1], ['F5', 1],
  ['F7', 1], ['LSHIFT+F1', 1], ['LSHIFT+F3', 1], ['LSHIFT+F5', 1], ['LSHIFT+F7', 1], ['STOP', 1]];
function bot(seed, keys, start = SESSIONS['new-random'].slice(0, -1), pick = PICK) {
  let x = seed >>> 0;
  const rnd = n => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return (x >>> 8) % n; };
  const total = pick.reduce((t, p) => t + p[1], 0);
  const out = start.concat([['run', 600]]);
  for (let i = 0; i < keys; i++) {
    let r = rnd(total), k = pick[0][0];
    for (const [name, w] of pick) { if (r < w) { k = name; break; } r -= w; }
    out.push(['key', k, 5, 60 + rnd(240)]);
    if (k === 'STOP') out.push(['key', 'RETURN', 5, 300]);
  }
  return out;
}
SESSIONS.bot = bot(1, 400);
SESSIONS.bot2 = bot(2, 1500);
// a new game begun in another phase of life: the phase menu's arrow moved down to it first
const phase = n => SESSIONS['new-random'].slice(0, 6).concat(Array.from({ length: n - 1 }, () => ['key', 'DOWN', 4, 30]),
  [['key', 'RETURN', 6, 900]]);
for (let n = 2; n <= 7; n++) SESSIONS['stage' + n] = bot(10 + n, 200, phase(n));
// Adolescence with the keys marked with arrows (the up arrow and the left arrow, characters of
// their own, which the game reads as no move) in place of the shifted cursor keys
SESSIONS['arrow-keys'] = bot(13, 200, phase(3), PICK.map(([k, w]) => [k.replace('LSHIFT+DOWN', 'UP').replace('LSHIFT+RIGHT', 'LEFT'), w]));
// the questionnaire answered by hand (its menu's first line), or left to chance and then gone over
// (its third): fire answers and moves on, left and right change the answer, up and down move the
// arrow, until the last page's line at its foot starts the game; then play
function questions(mode, seed) {
  let x = seed;
  const rnd = n => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return (x >>> 8) % n; };
  const out = SESSIONS['new-random'].slice(0, 4).concat(Array.from({ length: mode }, () => ['key', 'DOWN', 4, 30]),
    [['key', 'RETURN', 6, 600]]);
  const keys = ['RETURN', 'RETURN', 'RETURN', 'RETURN', 'RIGHT', 'LSHIFT+RIGHT', 'DOWN', 'LSHIFT+DOWN'];
  for (let i = 0; i < 160; i++) out.push(['key', keys[rnd(keys.length)], 5, 40 + rnd(60)]);
  return bot(seed, 60, out.concat([['key', 'RETURN', 6, 900]]));
}
SESSIONS.answers = questions(0, 21);
SESSIONS['answers-edited'] = questions(2, 22);
// the RUN/STOP menu on the life map: the game saved in the first slot, resumed from it, played
// on, then quit (the KERNAL's reset)
const menu = (line, after = 300) => [['key', 'STOP', 5, 200]].concat(Array.from({ length: line }, () => ['key', 'DOWN', 4, 30]),
  [['key', 'RETURN', 6, after]]);
SESSIONS.save = SESSIONS.infancy.slice(0, 20).concat([['key', 'STOP', 5, 400]],
  menu(1, 400), [['key', 'DOWN', 4, 30], ['key', 'RETURN', 6, 900]],
  menu(2, 400), [['key', 'DOWN', 4, 30], ['key', 'RETURN', 6, 900]],
  menu(4, 600), [['key', 'RETURN', 6, 300], ['key', 'RETURN', 6, 300], ['key', 'RETURN', 6, 300], ['key', 'RETURN', 6, 300]],
  // the menu again after the status: down to QUIT
  [['key', 'DOWN', 4, 30], ['key', 'DOWN', 4, 30], ['key', 'DOWN', 4, 30], ['key', 'RETURN', 6, 600]]);
// a game resumed from the start's first menu, on the disk the save session left: its second line,
// the file, then play
SESSIONS.resume = bot(41, 120, [['run', 150], ['key', 'DOWN', 4, 30], ['key', 'RETURN', 6, 400], ['key', 'DOWN', 4, 30],
  ['key', 'RETURN', 6, 900]]);
SESSIONS.resume.disk = 'save';

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

// A session played on the game alone, to its end or its quit: the drive it leaves
function played(name) {
  const m = lib.machine('parts/main/work/entry.vsf'), S = lib.player(m);
  let reset = false;
  m.hooks[RESET] = () => { reset = true; m.stopFlag = true; return true; };
  for (const [op, a, b, c] of SESSIONS[name]) {
    if (reset) break;
    if (op === 'run') S.run(a);
    else if (op === 'type') S.type(a);
    else S.key(a.split('+').map(x => lib.KEY[x]), b, c);
  }
  return m.cpu.drive;
}

function run(o = {}) {
  const AE = loadPort();
  const steps = SESSIONS[o.session || 'new-random'];
  const disk = o.drive || (steps.disk ? played(steps.disk) : null);
  const m = lib.machine('parts/main/work/entry.vsf', disk ? { drive: AEKernal.copyDrive(disk) } : {});
  const P = AE.create(new Uint8Array(65536), {}, { charRom: lib.charRom(), drive: disk ? AEKernal.copyDrive(disk) : lib.newDrive(), cpuPort: m.cpu.pdata, cpuDir: m.cpu.pdir });
  if (o.port) o.port(P);                     // a test's own counters on the port (scripts/time-stretches.js)
  // the program from the hand-over; a quit ends it at the KERNAL's reset, which the game calls
  // through $7FC8 and the port throws: the last stop, where the two are compared once more
  let reset = false;
  const program = function* (P) {
    try { return yield* P.native_startup_enter_vm(); } catch (e) { if (!(e instanceof AE.Reset)) throw e; }
    yield { cp: RESET, cycles: P.due() };
    reset = true; ls.stopped = true;
    yield { cycles: 0 };
  };
  const ls = new Lockstep({ machine: m, port: P, program, entry: 0x4000,
    checkpoints: [0x6DFA, RESET], passAt: 0x6DFA, waits: [], irqs: { 0xEA31: 'irq_kernal', 0x4229: 'irq_sprite', 0x414A: 'irq_dispatch_bridge' },
    irqBytes: P.irqBytes, chips: ['colour', 'vic', 'sid'], ignore: IGNORE.concat(o.ignore || []),
    maxFrames: o.maxFrames || 2000, timing: o.timing });
  P.M[0] = m.cpu.pdir; P.M[1] = m.cpu.pdata;
  // The dice: the SID's third voice running noise, read at $D41B (read_sid_voice3_noise, $4697).
  // The kit's C64 reads the SID's registers as its data bus, 0 there every time, so each side is
  // handed the same bytes from a seed instead, in the order it reads them (o.dice: the seed, by
  // default one from the session's name; 0 keeps the bus's zeros)
  const seed = o.dice !== undefined ? o.dice : [...(o.session || 'new-random')].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
  if (seed) {
    const dice = () => { let x = seed >>> 0; return () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return (x >>> 16) & 255; }; };
    const g = dice(), p = dice(), gr = m.ioRead, pr = P.io.read;
    m.ioRead = function (a) { return (a & 0xFC1F) === 0xD41B ? g() : gr.call(this, a); };
    P.io.read = a => ((a & 0xFC1F) === 0xD41B ? p() : pr(a));
  }
  const tl = timeline(steps);
  let i = 0, last = m.frames;
  // Each event at the start of a pass (each call of GETIN), once its wait in frames is up: given
  // in the middle of a stretch, a key could reach the game's keyboard buffer after the copy the
  // lockstep runs on ahead for the port's reads of it was made, and the port would read the
  // buffer without it (kit/c64/lockstep.js, irqBytes)
  const res = ls.run({ passes: o.passes || 1e9, stopOnDiff: o.stopOnDiff !== false, onPass: (n, mm, l) => {
    if (i >= tl.length || mm.frames - last < tl[i][0]) return;
    const [, op, k] = tl[i++];
    last = mm.frames;
    if (op === 'press') for (const x of k.split('+')) mm.press(lib.KEY[x]);
    else if (op === 'release') for (const x of k.split('+')) mm.release(lib.KEY[x]);
    else if (o.stopAtEnd !== false) l.stopped = true;
  } });
  if (reset) {
    const d = ls.compare();
    if (d) { res.ok = false; res.diffs.push(Object.assign({ pass: 'reset', frame: m.frames }, d)); }
  }
  // the drives: what each side wrote
  const a = AEKernal.driveState(m.cpu.drive), b = AEKernal.driveState(P.drive);
  const drives = JSON.stringify(a) === JSON.stringify(b) ? null : { game: a, port: b };
  return { res, ls, m, P, drives, reset };
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

module.exports = { run, loadPort, played, SESSIONS, IGNORE };
