'use strict';
// A port of a whole game checked against the game's own code, pass by pass (kit/skills/core/
// 70-minisite/play.md, "A whole game, checked against its own code"). The game runs on the kit's C64
// (kit/c64/machine.js) while the port runs beside it on its own copy of the game's memory. Wherever
// the port says it has got to, the game is run to the same place; the interrupts the game took on
// the way are run in the port there; and at the start of every pass the two memories are compared.
// Checked by kit/c64/test_lockstep.js, on kit/c64/test_machine.js's program and a port of it.
//
// The port's side. A port is an object P of routines on the game's memory:
// - P.M, the game's 64 KB (a Uint8Array(65536)), read and written at the game's addresses. The
//   lockstep fills it from the machine's RAM when it is made.
// - P.io, the chips, which the lockstep sets (members it does not define, such as a save file's,
//   are kept): vicRead(r), vicWrite(r, v), sidRead(r), sidWrite(r, v), colourRead(i) (four bits),
//   colourWrite(i, v), ciaRead(r), ciaWrite(r, v) (CIA 1), cia2Read(r), cia2Write(r, v), and
//   read(a), write(a, v) by address. They are a second set of the machine's chips, started as the
//   game's: the same code, the game's keyboard and joystick, and the raster line the lockstep sets.
//   The port reads P.io when it runs, not when it is built.
// - The main program, a generator (program below), which yields where the game's code has got to:
//     { cp: a }       the game's program counter has reached a checkpoint a, where the main loop
//                     calls a routine (the JSR, which is also where the call before returns to);
//                     a pass starts at the machine's passAt
//     { wait: line }  a wait for the raster to reach line: the game's loop polls $D012 and leaves
//                     at one of the waits' exits (two waits with no checkpoint between are two stops
//                     at the exit, as a routine that waits, called twice running, makes them)
//     { cycles: n }   n cycles of the game's own work, as a page's clock counts them; with at: a,
//                     the game is at a, and it is a checkpoint when a is listed. { cycles: 0 }
//                     is none: a place inside a long routine where a page's clock may stop and
//                     take the player's input, which the lockstep passes over
//     anything else   a bare yield, one turn of a polling loop: one raster line passes
// - The interrupt handlers, plain functions, one for each address the game's vector at $FFFE
//   points to.
//
// const { Machine } = require('kit/c64/machine.js');
// const { Lockstep, standIn, standInGen, checkGen, describe } = require('kit/c64/lockstep.js');
// const m = Machine.restore(JSON.parse(fs.readFileSync('games/c64/<slug>/work/walk.json', 'utf8')));
// const ls = new Lockstep({ machine: m, port: P, program: P => P.main_loop(),
//   checkpoints: [0x1027, 0x102A, 0x102D], waits: [0x1084], irqs: { 0x1100: 'irq_top' } });
// const r = ls.run({ passes: 1000, onPass: (n, m) => { m.joy = input[n]; } });
// console.log(describe(r));
//
// Options:
// - machine: the game, a Machine stopped at a checkpoint (restored from a state saved at passAt,
//   usually) or before one (the hand-over, for a port whose program starts there too). passAt, the
//   main loop's first checkpoint, is the machine's unless given.
// - port: P. program(P) gives the port's main program, made once. A port that throws to restart its
//   main loop gives a generator that catches the throw and starts the loop again, as its page does.
// - checkpoints: every address the port yields as a checkpoint. The game runs until its program
//   counter reaches any of them or a wait's exit, outside its interrupts. Reaching another than the
//   port's is a divergence of path, and the run stops with both named. The same place named twice
//   running with nothing between (a start-up's last { cycles, at } and the main loop's first
//   checkpoint) is one. A { cp } yielded twice running is two arrivals: a game whose every pass
//   reaches one address (a wait for a timer called from everywhere) yields it once a pass.
// - waits: the raster waits' exits, the instruction after each loop that polls the raster. The
//   game must leave on the port's line or the next. While it waits it passes the checkpoint before,
//   which may head the loop (a port that names its time up to the wait). The game reaches an exit
//   only when its main program has read the raster ($D011, $D012 or $D019) since its last stop, so
//   an exit that also heads the loop of work after the wait (a copy, ten times round) is reached
//   once a wait.
// - irqs: { handler address: a function, or the name of one of P's, or null }, and nmi: the same for
//   every NMI whose handler has no entry of its own. Null is a handler the port plays its own way (a
//   sample player's NMIs, whose phrase the port plays whole): followed, so what it reads and writes
//   is not the code's it came inside, and nothing run for it. The others
//   run in the port in order, at the port's next yield of any kind: a replay can keep the order
//   but not the place inside a stretch. So each runs on the memory the game's handler saw: the
//   bytes it read, its instructions' operands among them, are set to the values it read (the stack
//   aside), and go back to the port's after
//   unless it wrote them. A byte it read and left as it read it is one it saved and put back (a
//   handler that pushes the main program's pointers and pulls them before it returns), and it too
//   goes back to the port's. Its reads of the raster ($D012, and $D011's bit 7) get the values the
//   game's did, in turn (a read past those, the line the game's handler ended on), and the raster's
//   interrupt bit is latched. So do its reads of the interrupt flags, $D019, $DC0D and $DD0D, and
//   of the sprite collisions, $D01E and $D01F, and of the SID (a write-only register reads the data
//   bus as it fades, so the value depends on when the read comes), the port's chips' own after those: one handler for
//   the raster and a CIA's timer, as many games have, takes the branch the game's took, and one
//   that gathers the collisions gathers the game's. At the next checkpoint or wait's exit, where the two stand at the same
//   place, a byte an interrupt wrote and the game's main program wrote again afterwards gets back
//   the port's own value: the last writer of each byte is the game's. What no replay can give is
//   the main program reading, in the middle of a stretch, what an interrupt wrote there: those are
//   the game's own races (the skill says how to show one). Colour RAM and the chips' registers are
//   replayed as they are: a handler reads the port's, and its writes stand. So a register the main
//   program writes after an interrupt has written it in the same stretch (a title's SEI and its
//   new screen modes) needs a checkpoint before that write: replayed at the port's next yield, the
//   interrupt's value would land after the main program's.
// - The machine (kit/c64/machine.js) takes an interrupt inside a handler that has cleared I, as
//   the processor does: machine.nest, which these notes call "with nest". With legacyInterrupts it
//   runs each handler whole, and none of this arises. Each is followed from its take to the RTI that leaves it,
//   the stack as the take left it, and what is read and written meanwhile is the innermost one's.
//   They run in the port in the order they ended, so one that came inside another runs first, and
//   a byte both wrote gets the value of the one that wrote it last in the game: the port's handlers
//   stay plain functions, each run whole (kit/c64/test_lockstep_nest.js). So does a chip's
//   register both set (a raster band's next line, set before its CLI and again by the band that
//   came inside it), and one the main program set after an interrupt had in the same stretch (a
//   sprite placed while the interrupt copies its shadows) keeps the main program's value, as RAM
//   does; strobes, timers and the CIAs' interrupt control are not kept so. A handler that resets the
//   stack above its frame (a TXS, then a JMP to the game's start) has left there, and what runs on
//   is the main program's. When the game then stops at another checkpoint than the port named, the
//   lockstep runs the interrupts in the port and lets the port's program run on instead of calling
//   it a divergence: the port's handler tells its program, which goes where the game went and
//   names that checkpoint (kit/c64/test_lockstep_nest.js). What replay cannot give
//   is a handler reading, after another came inside it, a byte it had read or written before: it
//   gets its first reading, or its own write, again. List such a byte in irqBytes (a pointer two
//   handlers share): a handler's reads of it through P.io.irqByte are the game's handler's, in
//   turn, and a stand-in handler (standIn, irq) reads it so too. A port's handler that reads one
//   through irqByte reads it so every time the game's does: the lockstep stops when the counts
//   differ, since a read made from P.M first would take the game's first value.
// - The raster: between yields the port reads the line the game was on at the last one. A bare
//   yield runs the game on to its next line, taking any interrupt that falls due, so a polling
//   loop in the port sees the flags and lines the game's loop does, when it does.
// - compare: the RAM ranges compared at the start of every pass, [first, last] with both included
//   (default: all but $00-$01, the processor port, and the stack page, which a port does not keep:
//   a game that keeps tables in the stack page names the part its stack does not reach).
//   ignore: addresses and ranges left out, for a race shown, not guessed (the skill).
// - chips: which chips are compared too: 'colour' (the default, colour RAM), 'vic' (the registers
//   as written, the raster compare and the enable bits), 'sid' (as written) and 'cia' (CIA 1's port
//   A and the two directions).
// - timing(stretch): called for every stretch between two checkpoints, or a checkpoint and a
//   wait's exit, with { pass, from, to, wait, cycles, irqs, irqCycles, calls, polls, estimate }:
//   the game's cycles from one to the other with its interrupts' taken out (irqCycles, irqs); how
//   often the port called each of P's own functions in between, the interrupts not counted (P's
//   functions are wrapped to count them when the lockstep is made); the port's bare yields; and
//   the port's own { cycles } for the stretch. A stretch that ends at a wait's exit (wait) holds
//   the wait. These are the rows of the pacing fit. A port that counts more itself (pixels, rows)
//   reads and clears its counters here, and keeps its interrupts' work out of them.
// - maxFrames: how long the game may run to the port's next checkpoint (default 500).
// - irqBytes: addresses of RAM an interrupt writes and the main program reads (a jiffy clock, a
//   keyboard buffer), for the race replay cannot give (irqs above). The port reads each through
//   P.io.irqByte(a), and gets, in turn, the values the game's main program read of it in the same
//   stretch (a read past those, the port's own byte). The port runs a stretch before the game does,
//   so what the game has not yet read comes from a copy of the machine run on ahead to its next
//   checkpoint or wait's exit: its class's restore(save(), { rom }), with the input as it stands
//   and the ROMs the machine was given. A machine
//   class that keeps more than Machine does extends save() and restore(), or the copy is not the
//   game. Input onFrame gives inside the stretch, after the copy is made, is not in it, and a copy
//   made at the head of a raster wait's loop stops at that head the first time round. With nest,
//   a handler being run reads them so too, from what its game's handler read (irqs above). On the
//   page, outside the lockstep, the port's io gives irqByte: a => M[a]. With nest the lockstep's
//   io gives the list too, as irqBytes, a Set.
// - P.cpuPort: a port whose game changes its banking as it goes ($01: the chips at $D000 in play,
//   RAM under them while a level is built) keeps the processor port's data there, as the game last
//   wrote it. The game's own code standing in for a routine (standIn, standInGen) then runs on that
//   banking, and what it writes to $01 comes back in P.cpuPort. Without it a stand-in keeps the
//   banking it was made with (opts.port, default $35).
// - hooks: the machine's own stand-ins, by address, as Machine's hooks take them (a KERNAL routine
//   the game calls and the simulator holds no ROM for): put on the machine for the run and on the
//   copies irqBytes runs on ahead, which a hook set on the machine alone never reaches. A hook acts
//   on the cpu it is given (c.m, the registers), never on a machine it keeps, so that a copy's run
//   leaves the game as it was.
//
// run({ passes, onPass, onFrame, stopOnDiff }) runs until passes more passes have started (default
// 1) and returns { passes, ok, diffs, diverged, frames }. At the start of each pass, once the
// interrupts have run, memory is compared, and then onPass(n, machine, lockstep) runs: the place
// to set the pass's input on the machine (keys, joy; the port reads the same). onFrame(frame,
// machine, lockstep) runs for every frame the game begins, at the port's next yield, for input a
// game waits for in the middle of a pass (a pause, a prompt): input changes only at a yield, where
// both read the same. A pass whose start differs is in diffs, { pass, frame, cycle, count, bytes:
// [{ address, game, port, chip }] } (the first 64 bytes); the run stops there (the default, with
// the machine, P.M and the lockstep's io as they are), or with stopOnDiff: false copies the game's
// compared memory to the port's and goes on (resync() does the same). A divergence ends the
// lockstep: a checkpoint or a wait's exit other than the port's, a wait left on another line, a
// port that polls while the game waits at a checkpoint ahead, or no checkpoint in maxFrames;
// diverged says where. passes counts pass starts, but not the one the lockstep was made at.
// describe(result) gives a result as lines to print.
//
// standIn(P, address, { irq, port, maxSteps }) is the game's own routine at address, run on P.M
// through P.io by the kit's simulator, for a port whose routine is not written yet: P.draw =
// standIn(P, 0x9000) takes and returns registers ({ a, x, y, c ... }) as the port's routines do;
// with irq it is an interrupt handler for irqs. The stack pointer starts at $FF each call, or below
// the stack of a standInGen that is waiting. A routine that waits for the raster or for an
// interrupt cannot stand in this way, since nothing moves while it runs: standInGen can.
//
// standInGen(P, address, { polls, port, maxSteps }) is the game's routine at address standing in
// for one that waits, as a generator: P.wait_frame = standInGen(P, 0x9000), called as r = yield*
// P.wait_frame(regs). It runs the routine an instruction at a time on standIn's simulator and
// yields where the game's code lets time pass, so the lockstep runs the game on to the same place:
// - a bare yield at each turn of a polling loop: before an instruction that reads a poll address,
//   when the instruction at that address has read one since the last yield. The routine then
//   reads the line the game's loop reads, and the bytes the interrupts the game took have left.
// - { cycles: n } before a read of a poll address, and before it returns, once it has run a line
//   or more since the last yield (the first time, counted from the JSR that calls it). The game
//   catches up to the start of the line the routine has reached, never past it, so a routine that
//   works and then polls finds what the game found there. A turn that took two lines or more
//   makes such a { cycles } before its bare yield.
// The poll addresses are the raster's, $D011 and $D012 at every mirror; polls adds others, RAM
// that an interrupt writes (a jiffy clock, a frame counter). The routine reads such a byte through
// P.io.irqByte(a) where P.io has one (list the byte in irqBytes) until a turn of a loop has read
// it, and from P.M after that: irqByte hands out the game's reads one at a time, and the game's
// loop reads it many times a line, while the interrupts the lockstep runs at each yield keep P.M
// as the game's. The address an instruction reads is worked out before it runs, in every mode that
// reads data: zero page and absolute, both indexed, (zp,X) and (zp),Y. Stores, JMP and JSR read
// nothing. The routine's registers and stack are kept while it waits. A raster wait inside it is
// not one of the lockstep's waits: leave its exit out of waits. It returns registers as standIn
// does, and stops with an error after maxSteps instructions (default 1,000,000).
//
// checkGen(P, routine, address, opts) checks a port's routine that waits, a generator (one of P's,
// or its name), against the game's routine at address, alone: the port on P.M as it stands and
// the game, by standInGen, on a copy, each with chips of its own (P.io becomes the port's, with
// irqByte a => M[a]). Both are called with opts.regs. Each side runs to its next bare yield
// ({ cp } and { cycles } are passed over, and a { wait } is refused); the memories are compared
// there, the clock moves on by hand on both sides, and both go on. When both return, the memories
// and the registers the port's routine returns are compared. The port yields where the game's
// loop is about to read again: a loop that only polls is while (M[f] === v) yield, and the work of
// a turn comes before its yield.
// - frame: the clock, a RAM address an interrupt counts frames in, one up on both sides at each
//   yield; or 'raster' (the default), the raster line, one line on.
// - line: the raster line both start on (default 0).
// - polls: more addresses the game's routine polls (frame is one); port and maxSteps as
//   standInGen's.
// - onYield(M, io, frame, line): runs on each side, the game's first, once the clock has moved:
//   the place for whatever else the interrupt does there (the input it reads, a timer).
// - compare, ignore and chips as the lockstep's; maxFrames, how long the routines may wait
//   (default 1000).
// It returns { ok, frames, diff }: frames, the frames passed (with the raster, the times the line
// came round to 0); diff, the first difference, { frame, line, why, count, bytes, regs }, with why
// a line to print: the bytes (the first 64 in bytes) and registers that differ, or the side that
// returned while the other polled on.
//
// While a lockstep runs it owns the machine: it hooks the checkpoints and wraps the machine's irq
// and ioRead, and it puts them back when run returns.
const { Machine, LINE, LINES, FRAME } = require('./machine.js');
const { CPU, OPCODES } = require('../cpu/cpu6502.js');
// each opcode's length in bytes, from its addressing mode
const LENGTH = Uint8Array.from(OPCODES, ([, mode]) => mode === 'imp' || mode === 'acc' ? 1 : ['abs', 'abx', 'aby', 'ind'].includes(mode) ? 3 : 2);
// what each opcode does at the address it names: 0 reads nothing there, 1 reads it, 2 reads it and
// writes it back
const DATA = Uint8Array.from(OPCODES, ([name, mode]) => ['imp', 'acc', 'imm', 'rel', 'ind'].includes(mode) ||
  ['sta', 'stx', 'sty', 'sax', 'sha', 'shx', 'shy', 'shs', 'jmp', 'jsr'].includes(name) ? 0 :
  ['asl', 'lsr', 'rol', 'ror', 'inc', 'dec', 'slo', 'rla', 'sre', 'rra', 'dcp', 'isb'].includes(name) ? 2 : 1);

const hex = (v, n = 4) => '$' + (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
// The registers a replay gives as the game's handler read them, by address: the interrupt flags,
// the video chip's $D019 and the CIAs' $DC0D and $DD0D, and the video chip's collisions, $D01E and
// $D01F, wherever their registers repeat; -1 for any other address. A handler that serves more than
// one source reads a flag to tell which came, and the collisions are what the beam found where the
// game's sprites were drawn, which the port's chips do not draw; a read empties each, so a replay
// gives it what the game's read.
const flagRegister = a => (a >= 0xD000 && a < 0xD400 && ((a & 0x3F) === 0x19 || (a & 0x3E) === 0x1E) ? 0xD000 | (a & 0x3F)
  : a >= 0xDC00 && a < 0xDE00 && (a & 0x0F) === 0x0D ? (a & 0xFF00) | 0x0D : -1);
const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
const NONE = new Set();
const LIST = 64;                                   // differing bytes kept per pass
const CHIPS = ['colour', 'vic', 'sid', 'cia'];

// The RAM compared, compare's ranges less ignore's (the header), as runs [first, last].
function ranges(o) {
  const keep = new Uint8Array(65536), runs = [];
  for (const [a, b] of o.compare || [[0x0002, 0x00FF], [0x0200, 0xFFFF]]) keep.fill(1, a, b + 1);
  for (const x of o.ignore || []) if (Array.isArray(x)) keep.fill(0, x[0], x[1] + 1); else keep[x] = 0;
  for (let a = 0; a < 65536; a++) {
    if (!keep[a]) continue;
    let b = a;
    while (b < 65535 && keep[b + 1]) b++;
    runs.push([a, b]);
    a = b;
  }
  return runs;
}
function chipNames(o) {
  const list = o.chips || ['colour'];
  for (const c of list) if (!CHIPS.includes(c)) throw new Error('no chip ' + c + ' to compare');
  return list;
}
// What differs between the game's side (its RAM R and chips g) and the port's (M and p), in the
// runs and chips compared: { count, bytes: [{ address, game, port, chip }] } (the first 64), or null.
const view = (u, a, b) => Buffer.from(u.buffer, u.byteOffset + a, b - a + 1);
function differ(R, g, M, p, runs, chips) {
  const bytes = [];
  let count = 0;
  const add = (address, game, port, chip) => {
    if (bytes.length < LIST) bytes.push(chip ? { address, game, port, chip } : { address, game, port });
    count++;
  };
  for (const [a, b] of runs) {
    if (Buffer.compare(view(R, a, b), view(M, a, b)) === 0) continue;
    for (let i = a; i <= b; i++) if (M[i] !== R[i]) add(i, R[i], M[i]);
  }
  for (const chip of chips) {
    if (chip === 'colour') {
      for (let i = 0; i < 0x400; i++) if ((g.colour[i] & 15) !== (p.colour[i] & 15)) add(0xD800 + i, g.colour[i] & 15, p.colour[i] & 15, chip);
    } else if (chip === 'vic') {
      for (let r = 0; r < 0x40; r++) if (r !== 0x12 && r !== 0x19 && r !== 0x1A && g.vic[r] !== p.vic[r]) add(0xD000 + r, g.vic[r], p.vic[r], chip);
      if (g.cmp !== p.cmp) add(0xD012, g.cmp, p.cmp, chip);
      if (g.enable !== p.enable) add(0xD01A, g.enable, p.enable, chip);
    } else if (chip === 'sid') {
      for (let r = 0; r < 0x20; r++) if (g.sidw[r] !== p.sidw[r]) add(0xD400 + r, g.sidw[r], p.sidw[r], chip);
    } else {
      for (const [k, a] of [['pra', 0xDC00], ['ddra', 0xDC02], ['ddrb', 0xDC03]]) if (g[k] !== p[k]) add(a, g[k], p[k], chip);
    }
  }
  return count ? { count, bytes } : null;
}
// A difference as words: "2 bytes differ: $2004 game $12 port $13, ..."
function bytesLine(d) {
  const shown = d.bytes.slice(0, 8).map(b => (b.chip ? b.chip + ' ' : '') + hex(b.address) + ' game ' + hex(b.game, 2) + ' port ' + hex(b.port, 2));
  return d.count + (d.count === 1 ? ' byte differs: ' : ' bytes differ: ') + shown.join(', ') + (d.count > shown.length ? ', ...' : '');
}
// P.io's functions on a set of chips (a PortChips), reading through rd.
function chipIO(c, rd = a => c.ioRead(a & 0xFFFF)) {
  const wr = (a, v) => c.ioWrite(a & 0xFFFF, v & 0xFF);
  return {
    read: rd, write: wr,
    vicRead: r => rd(0xD000 | (r & 0x3F)), vicWrite: (r, v) => wr(0xD000 | (r & 0x3F), v),
    sidRead: r => rd(0xD400 | (r & 0x1F)), sidWrite: (r, v) => wr(0xD400 | (r & 0x1F), v),
    colourRead: i => c.colour[i & 0x3FF], colourWrite: (i, v) => wr(0xD800 | (i & 0x3FF), v),
    ciaRead: r => rd(0xDC00 | (r & 0x0F)), ciaWrite: (r, v) => wr(0xDC00 | (r & 0x0F), v),
    cia2Read: r => rd(0xDD00 | (r & 0x0F)), cia2Write: (r, v) => wr(0xDD00 | (r & 0x0F), v),
  };
}

// A chip register an interrupt's write sets to a value, by the address of its first mirror; -1
// for a strobe ($D019, a CIA's interrupt control), a timer and what is only read.
function chipKey(a) {
  if (a >= 0xD000 && a < 0xD400) { const r = a & 0x3F; return r === 0x19 || r === 0x1E || r === 0x1F || r > 0x2E ? -1 : 0xD000 | r; }
  if (a >= 0xD400 && a < 0xD800) return (a & 0x1F) < 0x19 ? 0xD400 | (a & 0x1F) : -1;
  if (a >= 0xD800 && a < 0xDC00) return a;
  if (a >= 0xDC00 && a < 0xDD00) { const r = a & 15; return r === 0 || r === 2 || r === 3 ? 0xDC00 | r : -1; }
  if (a >= 0xDD00 && a < 0xDE00) { const r = a & 15; return r === 0 || r === 2 ? 0xDD00 | r : -1; }
  return -1;
}
// A chip register a handler reads, by the address of its first mirror, but the raster's and the
// flags' (flagRegister); -1 outside the chips.
function chipRead(a) {
  if (a >= 0xD000 && a < 0xD400) { const r = a & 0x3F; return r === 0x11 || r === 0x12 ? -1 : 0xD000 | r; }
  if (a >= 0xD400 && a < 0xD800) return 0xD400 | (a & 0x1F);
  if (a >= 0xD800 && a < 0xDC00) return a;
  if (a >= 0xDC00 && a < 0xDE00) return (a & 0xFF00) | (a & 15);
  return -1;
}
// What the chips hold at such a register, as it was last written.
function asWritten(c, a) {
  if (a < 0xD400) { const r = a & 0x3F; return r === 0x12 ? c.cmp & 0xFF : r === 0x1A ? c.enable : c.vic[r]; }
  if (a < 0xD800) return c.sidw[a & 0x1F];
  if (a < 0xDC00) return c.colour[a - 0xD800];
  const r = a & 15;
  if (a < 0xDD00) return r === 0 ? c.pra : r === 2 ? c.ddra : c.ddrb;
  return r === 0 ? c.pra2 : c.ddra2;
}

// The port's chips: a second machine's, never run, whose raster line is the lockstep's and whose
// keyboard and joystick are the game's machine's.
class PortChips extends Machine {
  constructor() { super({ ram: new Uint8Array(65536) }); this.raster = 0; this.game = null; }
  get line() { return this.raster; }
  get now() { return this.game ? this.game.cpu.cycles : 0; }
  get keys() { return this.game ? this.game.keys : NONE; }
  set keys(v) {}
  get joy() { return this.game ? this.game.joy : 0x1F; }
  set joy(v) {}
  get joy1() { return this.game ? this.game.joy1 : 0x1F; }
  set joy1(v) {}
}

class Lockstep {
  constructor(o = {}) {
    const m = o.machine, P = o.port;
    if (!m || !m.cpu) throw new Error('Lockstep: no machine (kit/c64/machine.js)');
    if (!P || !(P.M instanceof Uint8Array) || P.M.length !== 65536) throw new Error('Lockstep: the port has no P.M of 64 KB');
    if (typeof o.program !== 'function') throw new Error('Lockstep: program(P) gives the port\'s main program');
    this.m = m; this.P = P;
    this.passAt = o.passAt !== undefined ? o.passAt & 0xFFFF : m.passAt;
    if (this.passAt === null || this.passAt === undefined) throw new Error('Lockstep: no passAt, on the machine or given');
    this.cps = new Set((o.checkpoints || []).map(a => a & 0xFFFF));
    this.cps.add(this.passAt);
    this.waits = new Set((o.waits || []).map(a => a & 0xFFFF));
    for (const a of this.waits) if (this.cps.has(a)) throw new Error('Lockstep: ' + hex(a) + ' is both a checkpoint and a wait\'s exit');
    this.irqs = o.irqs || {};
    this.maxFrames = o.maxFrames || 500;
    this.hooks = o.hooks || {};
    this.runs = ranges(o);
    try { this.chipList = chipNames(o); } catch (e) { throw new Error('Lockstep: ' + e.message); }
    // the port starts as the game is
    P.M.set(m.ram);
    const c = this.chips = new PortChips();
    c.game = m;
    c.raster = m.line;
    c.vic.set(m.vic); c.colour.set(m.colour); c.sidw.set(m.sidw);
    c.sidBus.chip(m.sidChip); c.sidBus.load(m.sidBus.save());
    for (const k of ['cmp', 'latch', 'enable', 'pra', 'ddra', 'ddrb', 'pra2', 'ddra2']) c[k] = m[k];
    if (m.cia) c.cia = JSON.parse(JSON.stringify(m.cia));   // CIA 2's port and the timers' latches; they never count here
    this.irqBytes = new Set((o.irqBytes || []).map(a => a & 0xFFFF));
    this.ib = { live: new Map(), list: null, used: new Map() };   // the stretch's reads of them
    this.io = this.makeIO();
    P.io = Object.assign({}, P.io, this.io);
    this.timing = o.timing || null;
    this.counting = false;
    this.calls = {};
    if (this.timing) this.countCalls();
    this.it = o.program(P);
    if (!this.it || typeof this.it.next !== 'function') throw new Error('Lockstep: program(P) gave no generator');
    // where the game is: at, a stop the port has not yet matched (the game waits there), or one it
    // has (the game may go on); resume, the stop the game is leaving, whose hook it passes once
    const pc = m.cpu.pc;
    this.at = this.cps.has(pc) || this.waits.has(pc) ? pc : -1;
    this.matched = false;
    this.resume = -1;
    this.through = -1;                             // a checkpoint the game passes while it waits for the raster
    this.polled = false;                           // the main program has read the raster since its last stop
    this.pending = [];                             // interrupts the game took, not yet run in the port
    this.fix = new Map();                          // bytes they wrote, until the next checkpoint
    this.irq = null;                               // the one running on the machine (with nest, the innermost)
    this.wseq = 0;                                 // with nest, the interrupts' writes numbered
    this.applied = new Map();                      // and the last of each byte's the port has run, until the next checkpoint
    this.appliedChip = new Map();                  // and of each chip register's
    this.fixChip = new Map();                      // with nest, the registers they wrote, as fix
    this.tookOver = false;                         // with nest, a handler left by a stack reset since the last stop
    this.replaying = null;                         // the one running in the port
    this.irqCycles = 0; this.irqCount = 0;
    this.cycles0 = m.cpu.cycles;
    this.passes = 0; this.syncs = 0; this.last = -1; this.lastAt = false; this.idle = 0; this.syncFrame = m.frames; this.since = 0;
    this.halted = null; this.stopped = false; this.saved = null; this.res = null;
    this.from = -1; this.c0 = m.cpu.cycles; this.ic0 = 0; this.in0 = 0; this.polls = 0; this.estimate = 0;
  }

  // --- the port's chips ---
  makeIO() {
    return Object.assign(chipIO(this.chips, a => this.portRead(a & 0xFFFF)), {
      colourRead: i => this.portRead(0xD800 | (i & 0x3FF)) & 15, irqByte: a => this.irqByte(a & 0xFFFF), irqBytes: this.m.nest ? this.irqBytes : null });
  }
  // A byte an interrupt writes, as the game's main program read it at this point of the stretch.
  irqByte(a) {
    if (!this.irqBytes.has(a)) throw this.annotate(new Error('Lockstep: the port read ' + hex(a) + ' through irqByte, and it is not in irqBytes'));
    const q = this.replaying;
    if (q !== null) {                               // a handler: what the game's read, in turn
      const vs = q.ib.get(a) || [], j = q.ibUsed.get(a) || 0;
      q.ibUsed.set(a, j + 1);
      return j < vs.length ? vs[j] : this.P.M[a];
    }
    const s = this.ib, i = s.used.get(a) || 0;
    s.used.set(a, i + 1);
    let vs = (s.list || s.live).get(a) || [];
    // the game waiting at a stop the port has not reached has read all it will in the stretch
    if (i >= vs.length && !s.list && !(this.at >= 0 && !this.matched)) { s.list = this.lookahead(); vs = s.list.get(a) || []; }
    return i < vs.length ? vs[i] : this.P.M[a];
  }
  // The game's reads of irqBytes to the end of the stretch: those it has made since the last stop,
  // then a copy's, run on from here to the next stop outside its interrupts.
  lookahead() {
    const m = this.m, g = m.constructor.restore(m.save(), { rom: m.cpu.rom });
    if (!(g instanceof m.constructor)) throw new Error('Lockstep: irqBytes needs ' + m.constructor.name + '.restore, to copy the machine');
    g.sidw.set(m.sidw);
    const out = new Map(), B = this.irqBytes;
    for (const [a, vs] of this.ib.live) out.set(a, vs.slice());
    let depth = 0, stop = false, skip = g.cpu.pc, polled = this.polled;
    // with nest, the interrupts under way on the machine are under way on the copy: each one's
    // stack pointer, the RTI that leaves it restoring it
    const sps = [];
    for (let q = this.irq; q !== null; q = q.up) sps.unshift(q.sp);
    depth = sps.length;
    Object.assign(g.hooks, this.hooks);
    for (const a of [...this.cps, ...this.waits]) {
      const prev = g.hooks[a];
      g.hooks[a] = c => {
        if (depth) return prev ? prev(c) : false;                     // an interrupt's code
        if (a === skip) { skip = -1; return prev ? prev(c) : false; }   // the stop it starts at
        if (this.waits.has(a) && !polled) return prev ? prev(c) : false;   // a wait's exit come to again with no wait
        stop = true; g.stopFlag = true; return true;
      };
    }
    const ioRead = g.ioRead;
    g.ioRead = function (x) {
      const v = ioRead.call(this, x);
      if (!depth && x >= 0xD000 && x < 0xD400) { const r = x & 0x3F; if (r === 0x11 || r === 0x12 || r === 0x19) polled = true; }
      return v;
    };
    const irq = g.cpu.irq, run = g.cpu.run;
    g.cpu.irq = function (h, o) { depth++; try { return irq.call(this, h, o); } finally { depth--; } };
    if (g.nest) {
      const take = g.take;
      g.take = function (v) { take.call(this, v); sps.push(this.cpu.sp); depth++; };
    }
    const reads = new Proxy({}, { set(t, k) {
      const a = +k;
      if (!depth && B.has(a)) { if (!out.has(a)) out.set(a, []); out.get(a).push(g.ram[a]); }
      return true;
    } });
    const executed = new Proxy({}, { set(t, k) {
      const a = +k;
      while (depth && g.cpu.sp > sps[sps.length - 1]) { sps.pop(); depth--; }
      if (depth && g.ram[a] === 0x40 && g.cpu.sp === sps[sps.length - 1]) { sps.pop(); depth--; }
      return true;
    } });
    const maps = g.nest ? { reads, executed } : { reads };
    g.cpu.run = function (o) { return run.call(this, Object.assign({}, o, maps)); };
    const end = g.frames + this.maxFrames;
    while (!stop && g.frames < end) g.runCycles(FRAME);
    return out;
  }
  // A chip read, the raster as the game's interrupt handler read it while one is being replayed.
  portRead(a) {
    const v = this.chips.ioRead(a), q = this.replaying;
    if (q !== null && a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F;
      if (r === 0x12 && q.i12 < q.d012.length) return q.d012[q.i12++];
      if (r === 0x11 && q.i11 < q.d011.length) return this.m.nest ? q.d011[q.i11++] : (v & 0x7F) | (q.d011[q.i11++] & 0x80);
    }
    const f = q !== null ? flagRegister(a) : -1;
    if (f >= 0 && q.flags.has(f)) { const x = q.flags.get(f); if (x.i < x.v.length) return x.v[x.i++]; }
    // with nest, the rest as the game's handler read them: one that came inside another read what
    // the other had written, which the port has not run yet
    if (q !== null && f < 0) { const x = q.chip.get(chipRead(a)); if (x && x.i < x.v.length) return x.v[x.i++]; }
    return v;
  }

  // Count the calls of every one of P's functions (for timing).
  countCalls() {
    const P = this.P, ls = this;
    for (const name of Object.keys(P)) {
      const f = P[name];
      if (typeof f !== 'function') continue;
      P[name] = f instanceof GENERATOR
        ? function* (...a) { if (ls.counting) ls.calls[name] = (ls.calls[name] || 0) + 1; return yield* f.apply(this, a); }
        : function (...a) { if (ls.counting) ls.calls[name] = (ls.calls[name] || 0) + 1; return f.apply(this, a); };
    }
  }

  // --- the machine, hooked for the length of a run ---
  attach() {
    const m = this.m, cpu = m.cpu, ls = this;
    if (this.at >= 0 && cpu.pc !== this.at) throw new Error('Lockstep: the machine has run since the lockstep stopped it');
    const own = (o, k) => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
    const s = this.saved = { hooks: {}, onPass: m.onPass, irq: own(cpu, 'irq'), ioRead: own(m, 'ioRead'), ioWrite: own(m, 'ioWrite'), run: own(cpu, 'run'), take: own(m, 'take') };
    m.onPass = null;
    for (const [a, h] of Object.entries(this.hooks)) { s.hooks[a] = m.hooks[a]; m.hooks[a] = h; }
    for (const a of [...this.cps, ...this.waits]) {
      const prev = m.hooks[a];
      if (!Object.prototype.hasOwnProperty.call(s.hooks, a)) s.hooks[a] = prev;
      m.hooks[a] = c => {
        if (ls.irq !== null) return prev ? prev(c) : false;            // an interrupt's code, not the main program
        if (ls.resume === a) { ls.resume = -1; return prev ? prev(c) : false; }
        if (ls.through === a) return prev ? prev(c) : false;          // the head of the loop a raster wait turns in
        if (ls.waits.has(a) && !ls.polled) return prev ? prev(c) : false; // a wait's exit come to again with no wait
        ls.at = a; ls.matched = false; m.stopFlag = true; ls.polled = false;
        return true;
      };
    }
    // An interrupt: its handler's address, when it came, what it read of RAM before writing it
    // (seen) and what it wrote (wrote, with the values it left), through the simulator's maps of
    // the addresses a run reads and writes as data; the stack's traffic is not in them.
    const irq = cpu.irq, RAM_R = cpu.rk[2], RAM_W = cpu.wk[2];          // page 2 is RAM on any map
    const newIrq = (at, cycle) => ({ at, line: m.line, frame: m.frames, cycle, cycles: 0, end: 0, d011: [], d012: [], i11: 0, i12: 0,
      flags: new Map(), seen: new Map(), wrote: new Map(), seq: new Map(), cseq: new Map(), cval: new Map(), ib: new Map(), ibUsed: new Map(), chip: new Map(), under: new Set(), sp: -1, up: null });
    cpu.irq = function (handler, opts) {
      const c = this, q = newIrq(handler != null ? handler & 0xFFFF : c.vector(0xFFFE, 'IRQ'), c.cycles);
      const reads = new Proxy({}, { set(t, k) {
        const a = +k;
        if ((a < 0x100 ? a > 1 : c.rk[a >>> 8] === RAM_R) && !q.seen.has(a) && !q.wrote.has(a)) q.seen.set(a, c.m[a]);
        return true;
      } });
      const writes = new Proxy({}, { set(t, k) {
        const a = +k;
        if (a < 0x100 ? a > 1 : c.wk[a >>> 8] === RAM_W) q.wrote.set(a, 0);
        return true;
      } });
      // an instruction's operand is read too: a handler whose code the main program patches
      // (an address stored into it) runs on the operand it fetched
      const executed = new Proxy({}, { set(t, k) {
        const a = +k;
        if (c.rk[a >>> 8] !== RAM_R) return true;
        for (let i = 1; i < LENGTH[c.m[a]]; i++) {
          const b = (a + i) & 0xFFFF;
          if (c.rk[b >>> 8] === RAM_R && !q.seen.has(b) && !q.wrote.has(b)) q.seen.set(b, c.m[b]);
        }
        return true;
      } });
      ls.irq = q;
      try { return irq.call(c, handler, Object.assign({}, opts, { reads, writes, executed })); }
      finally {
        ls.irq = null;
        for (const a of q.wrote.keys()) q.wrote.set(a, c.m[a]);
        q.cycles = c.cycles - q.cycle; q.end = m.line;
        ls.irqCycles += q.cycles; ls.irqCount++;
        ls.pending.push(q);
      }
    };
    // With nest (kit/c64/machine.js) an interrupt is begun by the machine's take and then runs as
    // the machine's own code, where another may begin: each is followed from its take to the RTI
    // that leaves it with the stack as the take left it, and what is read and written meanwhile is
    // the innermost one's. Each write is numbered, for settle to keep the game's last writer of a
    // byte two of them wrote.
    if (m.nest) {
      const take = m.take;
      m.take = function (v) {
        take.call(this, v);
        const q = newIrq(this.cpu.pc, this.cpu.cycles - 7), u = this.under;
        // the stack as the interrupt's own push left it, below what the KERNAL's entry pushes
        q.sp = u.length ? u[u.length - 1].sp : this.cpu.sp; q.up = ls.irq; ls.irq = q; q.nmi = v === 0xFFFA;
      };
    }
    // the main program's reads of irqBytes, as it makes them, and with nest the interrupts' reads,
    // writes and instructions
    const B = this.irqBytes;
    if (B.size || m.nest) {
      const run = cpu.run, live = () => ls.ib.live;
      const reads = new Proxy({}, { set(t, k) {
        const a = +k, q = ls.irq;
        if (q !== null) {
          if (m.nest && (a < 0x100 ? a > 1 : cpu.rk[a >>> 8] === RAM_R) && !q.seen.has(a) && !q.wrote.has(a)) q.seen.set(a, cpu.m[a]);
          if (m.nest && B.has(a)) { if (!q.ib.has(a)) q.ib.set(a, []); q.ib.get(a).push(cpu.m[a]); }
        }
        else if (B.has(a) && !ls.ib.list) { const L = live(); if (!L.has(a)) L.set(a, []); L.get(a).push(cpu.m[a]); }
        return true;
      } });
      const writes = new Proxy({}, { set(t, k) {
        const a = +k, q = ls.irq;
        if (q !== null && (a < 0x100 ? a > 1 : cpu.wk[a >>> 8] === RAM_W)) {
          q.wrote.set(a, 0); q.seq.set(a, ++ls.wseq); own.push(q, a);
          for (let u = q.up; u !== null; u = u.up) u.under.add(a);      // written under the ones it came inside
        }
        return true;
      } });
      // the value each wrote, taken once its instruction is done: what the byte holds when it
      // ends may be one that came inside it
      const own = [];
      const ownValues = () => { for (let i = 0; i < own.length; i += 2) own[i].wrote.set(own[i + 1], cpu.m[own[i + 1]]); own.length = 0; };
      const end = (q, rti) => {
        q.cycles = cpu.cycles + rti - q.cycle; q.end = m.line;
        if (q.up === null) ls.irqCycles += q.cycles;
        ls.irqCount++;
        ls.pending.push(q);
        ls.irq = q.up;
        if (!rti) ls.tookOver = true;
      };
      // a hook that leaves by the KERNAL's exit (Machine's leave) ends the innermost as its RTI would
      if (m.nest && m.leave) {
        const leave = m.leave;
        m.leave = function (n = 22) { if (own.length) ownValues(); if (ls.irq !== null) end(ls.irq, n); return leave.call(this, n); };
      }
      const executed = new Proxy({}, { set(t, k) {
        const a = +k;
        if (own.length) ownValues();
        // a stack reset above a handler's frame (a TXS and a JMP to the game's start) leaves it, and
        // the code goes on as the main program
        while (ls.irq !== null && cpu.sp > ls.irq.sp) end(ls.irq, 0);
        const q = ls.irq;
        if (q === null || cpu.rk[a >>> 8] !== RAM_R) return true;
        if (cpu.m[a] === 0x40 && cpu.sp === q.sp) { end(q, 6); return true; }   // the RTI that leaves it
        for (let i = 1; i < LENGTH[cpu.m[a]]; i++) {
          const b = (a + i) & 0xFFFF;
          if (cpu.rk[b >>> 8] === RAM_R && !q.seen.has(b) && !q.wrote.has(b)) q.seen.set(b, cpu.m[b]);
        }
        return true;
      } });
      const maps = m.nest ? { reads, writes, executed } : { reads };
      cpu.run = function (o) { return ls.irq !== null || B.size ? run.call(this, Object.assign({}, o, maps)) : run.call(this, o); };
    }
    // with nest, the chips' registers each interrupt writes, numbered with its RAM
    if (m.nest) {
      const ioWrite = m.ioWrite;
      m.ioWrite = function (a, v) {
        const r = ioWrite.call(this, a, v), q = ls.irq;
        // the value as the register keeps it, which lastWriters compares: colour RAM keeps four bits
        if (q !== null) { const k = chipKey(a); if (k >= 0) { q.cseq.set(k, ++ls.wseq); q.cval.set(k, asWritten(this, k)); } }
        return r;
      };
    }
    const ioRead = m.ioRead;
    m.ioRead = function (a) {
      const v = ioRead.call(this, a), q = ls.irq;
      if (a >= 0xD000 && a < 0xD400) {
        const r = a & 0x3F;
        if (q === null) { if (r === 0x11 || r === 0x12 || r === 0x19) ls.polled = true; }
        else if (r === 0x12) q.d012.push(v); else if (r === 0x11) q.d011.push(v);
      }
      const f = q !== null ? flagRegister(a) : -1;
      if (f >= 0) { if (!q.flags.has(f)) q.flags.set(f, { v: [], i: 0 }); q.flags.get(f).v.push(v); }
      // with nest every chip register, and without it the SID's: a read of one of its write-only
      // registers gives the data bus as it fades (machine.js), which depends on when the read comes,
      // and a replay comes later
      else if (q !== null && (m.nest || (a >= 0xD400 && a < 0xD800))) {
        const k = chipRead(a);
        if (k >= 0) { if (!q.chip.has(k)) q.chip.set(k, { v: [], i: 0 }); q.chip.get(k).v.push(v); }
      }
      return v;
    };
  }
  detach() {
    const m = this.m, s = this.saved;
    if (!s) return;
    for (const a of Object.keys(s.hooks)) { if (s.hooks[a]) m.hooks[a] = s.hooks[a]; else delete m.hooks[a]; }
    if (s.irq) m.cpu.irq = s.irq; else delete m.cpu.irq;
    if (s.ioRead) m.ioRead = s.ioRead; else delete m.ioRead;
    if (s.ioWrite) m.ioWrite = s.ioWrite; else delete m.ioWrite;
    if (s.run) m.cpu.run = s.run; else delete m.cpu.run;
    if (s.take) m.take = s.take; else delete m.take;
    m.onPass = s.onPass;
    this.saved = null;
  }

  // Run the game on to its next stop, a checkpoint or a wait's exit; or find it waiting at one the
  // port has not reached. -1 when it reaches none in maxFrames.
  toStop() {
    const m = this.m;
    if (this.at >= 0 && !this.matched) return this.at;
    if (this.at >= 0) { this.resume = this.at; this.at = -1; }
    const end = m.frames + this.maxFrames;
    while (this.at < 0 && m.frames < end) m.runCycles(FRAME);
    return this.at;
  }
  // Run the game on for n cycles of its own work (its interrupts not counted), or to its next
  // raster line when n is 0, unless it reaches a stop first. It does not move while it waits at a
  // stop the port has not reached.
  forCycles(n) {
    const m = this.m, cpu = m.cpu;
    if (this.at >= 0 && !this.matched) return false;
    if (this.at >= 0) { this.resume = this.at; this.at = -1; }
    if (n <= 0) { m.runCycles(1); return true; }
    // an interrupt under way (with nest) is not the game's own work either
    const inIrq = () => { let q = this.irq; if (q === null) return 0; while (q.up !== null) q = q.up; return cpu.cycles - q.cycle; };
    const c0 = cpu.cycles, i0 = this.irqCycles, u0 = inIrq(), own = () => (cpu.cycles - c0) - (this.irqCycles - i0) - inIrq() + u0;
    while (this.at < 0 && own() < n) m.runCycles(n - own());
    return true;
  }
  // Run in the port the interrupts the game has taken since the last yield, then give the port the
  // game's raster line. Each runs on the bytes the game's handler read, as it read them, which go
  // back to the port's values after unless it wrote them. What each wrote is kept in fix for
  // lastWriters: the port's value before (b), the handler's (h) and the game's handler's (v).
  // With nest they come in the order they ended, an inner one before the one it interrupted, and a
  // byte both wrote keeps the value of the one that wrote it last in the game: a handler's write
  // that came before one the port has already run is put back.
  settle() {
    const list = this.pending, c = this.chips, P = this.P, M = P.M, fix = this.fix;
    if (list.length) {
      this.pending = [];
      const counting = this.counting;
      this.counting = false;
      try {
        for (const q of list) {
          const I = this.irqs;
          let f = q.at in I ? I[q.at] : q.nmi && 'nmi' in I ? I.nmi : undefined;
          if (f === null) continue;                    // the port plays it its own way (irqs)
          if (typeof f === 'string') f = P[f];
          if (typeof f !== 'function') throw new Error('Lockstep: no port handler for the interrupt at ' + hex(q.at) + ' (irqs)');
          // a byte the handler read and left as it read it, saved and put back (a handler that
          // pushes the main program's pointers and pulls them before it returns): not the
          // interrupt's to change, so the port's value stays; unless one that came inside it wrote
          // the byte meanwhile, when its own write is a write like any other
          const kept = a => q.seen.has(a) && q.seen.get(a) === q.wrote.get(a) && !q.under.has(a);
          for (const a of q.wrote.keys()) {
            if (kept(a)) continue;
            const x = fix.get(a);
            if (!x) fix.set(a, { b: M[a], h: -1, v: -1 });
            else if (M[a] !== x.h) x.b = M[a];                  // the port's program has written it since
          }
          const later = a => q.seq.has(a) && (this.applied.get(a) || 0) > q.seq.get(a);
          const older = [];
          for (const a of q.wrote.keys()) if (!kept(a) && later(a)) older.push(a, M[a]);
          const put = [];
          for (const [a, v] of q.seen) if (M[a] !== v) { put.push(a, M[a]); M[a] = v; }
          // a register of a chip one that came inside it wrote later in the game: written back after
          const laterChip = a => (this.appliedChip.get(a) || 0) > q.cseq.get(a);
          const chipsBack = [];
          for (const a of q.cseq.keys()) {
            if (laterChip(a)) { chipsBack.push(a, asWritten(c, a)); continue; }
            const x = this.fixChip.get(a), b = asWritten(c, a);
            if (!x) this.fixChip.set(a, { b, h: -1, v: -1 }); else if (b !== x.h) x.b = b;
          }
          this.replaying = q; c.raster = q.end; c.latch |= 1;
          const r = f.call(P);
          if (r && typeof r.next === 'function') throw new Error('Lockstep: the handler for ' + hex(q.at) + ' is a generator; an interrupt runs to its end');
          for (const [a, j] of q.ibUsed) {
            const n = (q.ib.get(a) || []).length;
            if (j !== n) throw new Error('Lockstep: the port\'s handler for ' + hex(q.at) + ' read ' + hex(a) + ' through irqByte ' + j + ' times, and the game\'s read it ' + n + ' times: a handler reads such a byte through irqByte every time');
          }
          for (let i = 0; i < chipsBack.length; i += 2) c.ioWrite(chipsBack[i], chipsBack[i + 1]);
          for (const [a, n] of q.cseq) if (!laterChip(a)) {
            this.appliedChip.set(a, n);
            const x = this.fixChip.get(a);
            if (x) x.v = q.cval.get(a), x.h = asWritten(c, a);
          }
          for (let i = 0; i < put.length; i += 2) if (!q.wrote.has(put[i]) || kept(put[i])) M[put[i]] = put[i + 1];
          for (let i = 0; i < older.length; i += 2) M[older[i]] = older[i + 1];
          for (const [a, v] of q.wrote) {
            if (kept(a) || later(a)) continue;
            if (q.seq.has(a)) this.applied.set(a, q.seq.get(a));
            const x = fix.get(a); x.v = v; x.h = M[a];
          }
        }
      } catch (e) { throw this.annotate(e); }
      finally { this.replaying = null; this.counting = counting; }
    }
    c.raster = this.m.line;
  }
  // At a checkpoint or a wait's exit, where the game and the port stand at the same place: a byte
  // an interrupt wrote that the game's main program then wrote again, and the port's has not since
  // the replay, gets back the port's own value. The last writer of each byte is the game's.
  lastWriters() {
    const M = this.P.M, R = this.m.ram;
    for (const [a, x] of this.fix) if (R[a] !== x.v && M[a] === x.h) M[a] = x.b;
    this.fix.clear();
    const c = this.chips;
    for (const [a, x] of this.fixChip) if (asWritten(this.m, a) !== x.v && asWritten(c, a) === x.h) c.ioWrite(a, x.b);
    this.fixChip.clear();
    this.applied.clear();
    this.appliedChip.clear();
  }

  // --- one yield of the port's program ---
  step() {
    let r;
    this.since++;
    try { r = this.it.next(); } catch (e) { throw this.annotate(e); }
    if (r.done) return this.diverge('the port\'s program returned');
    const y = r.value;
    if (y && y.cp !== undefined) return this.checkpoint(y.cp & 0xFFFF, y);
    if (y && y.at !== undefined && this.cps.has(y.at & 0xFFFF)) return this.checkpoint(y.at & 0xFFFF, y);
    if (y && y.wait !== undefined) return this.rasterWait(y.wait, y);
    if (y && y.cycles !== undefined) {
      // none of the game's work: the game is not where the port is, so it does not run, and its
      // input waits for the next stop, as a copy irqBytes made of it has the input as it stood
      if (!y.cycles) return this.running();
      this.estimate += y.cycles;
      if (this.forCycles(y.cycles)) this.idle = 0;
      this.settle();
      this.frameInput();
      return this.running();
    }
    return this.poll();
  }
  // onFrame for every frame the game has begun since the last call: input changes only at a yield,
  // where the game and the port stand at the same place, so both read the same.
  frameInput() {
    if (!this.onFrame) return;
    while (this.lastFrame < this.m.frames && !this.halted) this.onFrame(++this.lastFrame, this.m, this);
  }
  checkpoint(a, y) {
    if (!this.cps.has(a)) throw this.annotate(new Error('Lockstep: the port yielded checkpoint ' + hex(a) + ', which is not in checkpoints'));
    if (y.cycles !== undefined) this.estimate += y.cycles;
    // the place just reached, named again with nothing run between (a start-up's last { cycles, at }
    // and the main loop's first checkpoint, say): one place
    if (a === this.last && this.at === a && this.matched && this.since === 1 && this.lastAt) return;
    const at = this.toStop();
    if (at !== a && at >= 0 && this.tookOver) {
      // an interrupt took the main program elsewhere: the port's handler, run now, tells its
      // program, which goes there when it runs on and names the stop the game is waiting at
      this.tookOver = false;
      this.settle();
      return;
    }
    if (at !== a) {
      return this.diverge(at < 0 ? this.lost('checkpoint ' + hex(a))
        : 'the game went to ' + hex(at) + (this.waits.has(at) ? ' (a raster wait\'s exit)' : '') + ', the port to ' + hex(a), { game: at, port: a });
    }
    this.tookOver = false;
    this.sync(a, false);
    this.lastAt = y.cp === undefined;                 // named by { cycles, at }: may be named again as a { cp }
    if (a === this.passAt) this.passStart();
    this.frameInput();
  }
  rasterWait(line, y) {
    if (!this.waits.size) throw this.annotate(new Error('Lockstep: the port waits for the raster, and no waits are given'));
    this.through = this.cps.has(this.last) ? this.last : -1;   // after a wait's exit, the same exit is the next stop
    let at;
    try { at = this.toStop(); } finally { this.through = -1; }
    const ln = this.m.line;
    if (!this.waits.has(at)) {
      return this.diverge(at < 0 ? this.lost('a raster wait') : 'the game went to ' + hex(at) + ', the port waited for line ' + line,
        { game: at, port: 'wait' });
    }
    if ((ln - line + LINES) % LINES > 1) {
      return this.diverge('the game left its raster wait at ' + hex(at) + ' on line ' + ln + ', the port waited for line ' + line,
        { game: at, port: 'wait', line: ln });
    }
    this.sync(at, true);
    this.frameInput();
  }
  poll() {
    this.polls++;
    if (this.at >= 0 && !this.matched) {           // the game waits at a stop ahead: the port's raster runs alone
      this.chips.raster = (this.chips.raster + 1) % LINES;
      if (++this.idle > 2 * LINES) return this.diverge('the port polls on while the game waits at ' + hex(this.at), { game: this.at, port: 'poll' });
      return;
    }
    this.forCycles(0);
    this.settle();
    this.frameInput();
    return this.running();
  }
  // A port that polls or spends for longer than maxFrames of the game's without a checkpoint.
  running() {
    if (this.m.frames - this.syncFrame > this.maxFrames) {
      this.diverge('the port reached no checkpoint in ' + this.maxFrames + ' frames (the game\'s program counter is at ' + hex(this.m.cpu.pc) + ')', { port: 'poll' });
    }
  }
  sync(a, wait) {
    this.matched = true; this.idle = 0; this.syncFrame = this.m.frames;
    this.settle();
    this.lastWriters();
    const m = this.m, cyc = m.cpu.cycles;
    if (this.timing && this.from >= 0) {
      const irqCycles = this.irqCycles - this.ic0;
      this.timing({ pass: this.passes, from: this.from, to: a, wait, cycles: cyc - this.c0 - irqCycles, irqs: this.irqCount - this.in0,
        irqCycles, calls: this.calls, polls: this.polls, estimate: this.estimate });
    }
    this.from = a; this.c0 = cyc; this.ic0 = this.irqCycles; this.in0 = this.irqCount;
    this.calls = {}; this.polls = 0; this.estimate = 0;
    this.syncs++; this.last = a; this.since = 0;
    this.ib = { live: new Map(), list: null, used: new Map() };
  }
  passStart() {
    const m = this.m;
    if (m.cpu.cycles !== this.cycles0) { this.passes++; this.res.passes++; }
    const d = this.compare();
    if (d) {
      this.res.diffs.push(Object.assign({ pass: this.passes, frame: m.frames, cycle: m.cpu.cycles }, d));
      this.res.ok = false;
      if (this.stopOnDiff) this.stopped = true; else this.resync();
    }
    if (this.onPass) this.onPass(this.passes, m, this);
  }

  // --- comparing ---
  compare() { return differ(this.m.ram, this.m, this.P.M, this.chips, this.runs, this.chipList); }
  // The port's compared memory and chips made the game's again.
  resync() {
    const M = this.P.M, R = this.m.ram, g = this.m, p = this.chips;
    for (const [a, b] of this.runs) M.set(R.subarray(a, b + 1), a);
    for (const chip of this.chipList) {
      if (chip === 'colour') p.colour.set(g.colour);
      else if (chip === 'vic') { p.vic.set(g.vic); p.cmp = g.cmp; p.enable = g.enable; }
      else if (chip === 'sid') { p.sidw.set(g.sidw); p.sidBus.load(g.sidBus.save()); }
      else { p.pra = g.pra; p.ddra = g.ddra; p.ddrb = g.ddrb; }
    }
  }

  // --- the run ---
  run(opts = {}) {
    if (this.halted) throw new Error('Lockstep: ' + this.halted.why + '; the game and the port are no longer in step');
    const want = opts.passes === undefined ? 1 : opts.passes, m = this.m, f0 = m.frames;
    this.onPass = opts.onPass || null;
    this.onFrame = opts.onFrame || null;
    if (this.lastFrame === undefined || this.lastFrame > m.frames) this.lastFrame = m.frames;
    this.stopOnDiff = opts.stopOnDiff !== false;
    const res = this.res = { passes: 0, ok: true, diffs: [], diverged: null, frames: 0 };
    this.attach();
    this.counting = !!this.timing;
    try {
      while (res.passes < want && !this.halted && !this.stopped) this.step();
    } finally {
      this.counting = false;
      this.detach();
    }
    this.stopped = false;
    res.frames = m.frames - f0;
    return res;
  }
  diverge(why, extra) {
    const m = this.m;
    this.halted = Object.assign({ pass: this.passes, after: this.last, frame: m.frames, cycle: m.cpu.cycles, pc: m.cpu.pc, why }, extra);
    this.res.diverged = this.halted;
    this.res.ok = false;
  }
  lost(what) {
    return 'the game reached no checkpoint in ' + this.maxFrames + ' frames (the port\'s next is ' + what + '; the game\'s program counter is at ' + hex(this.m.cpu.pc) + ')';
  }
  annotate(e) {
    if (e && typeof e.message === 'string' && !e.lockstep) {
      e.message += ' (lockstep: pass ' + this.passes + (this.last >= 0 ? ', after ' + hex(this.last) : '') + ')';
      e.lockstep = true;
    }
    return e;
  }
}

// --- the game's own code, standing in for the port's (see the header) ---
// The simulator a port's stand-ins share, one for each P, and the stack pointer a call starts at:
// $FF, or below the stack of a standInGen that is waiting.
const simulators = new WeakMap();
// While it runs a handler for irqs, its reads of RAM in the lockstep's irqBytes go through
// P.io.irqByte, as a port's handler's do.
class HandlerCPU extends CPU {
  rd(a) { return this.handler && this.rk[a >>> 8] === this.rk[2] && this.handler.has(a) ? this.P.io.irqByte(a) : super.rd(a); }
  rdz(a) { return this.handler && a > 1 && this.handler.has(a) ? this.P.io.irqByte(a) : super.rdz(a); }
}
function simulator(P, opts) {
  let s = simulators.get(P);
  if (!s) {
    const cpu = new HandlerCPU(P.M, { port: opts.port || { dir: 0x2F, data: 0x35 }, io: { read: a => P.io.read(a), write: (a, v) => P.io.write(a, v) } });
    cpu.P = P; cpu.handler = null;
    s = { cpu, top: 0xFF };
    simulators.set(P, s);
  }
  return s;
}
// the processor port a stand-in runs on: the port's own, when it keeps one (P.cpuPort)
const portIn = (P, cpu) => { if (typeof P.cpuPort === 'number' && cpu.pdata !== (P.cpuPort & 0xFF)) cpu.portWrite(1, P.cpuPort & 0xFF); };
const portOut = (P, cpu) => { if (typeof P.cpuPort === 'number') P.cpuPort = cpu.pdata; };
function regsIn(r) {
  const regs = { d: 0 };
  for (const k of ['a', 'x', 'y', 'n', 'v', 'd', 'i', 'z', 'c']) if (r && r[k] !== undefined) regs[k] = r[k];
  return regs;
}
const regsOut = cpu => ({ a: cpu.a, x: cpu.x, y: cpu.y, n: cpu.n, v: cpu.v, z: cpu.z, c: cpu.c });

// opts: irq, the routine is an interrupt handler; kernal, with irq, one the KERNAL's entry at $FF48
// reaches through $0314, which leaves by $EA31 or $EA81 (cpu6502.js's irq); hooks, the simulator's
// own stand-ins by address, for what the game calls that it holds no code for; port and maxSteps.
function standIn(P, address, opts = {}) {
  return function (r) {
    const s = simulator(P, opts), cpu = s.cpu;
    portIn(P, cpu);
    cpu.setRegs(regsIn(r));
    try {
      if (opts.irq) {
        cpu.sp = s.top;
        cpu.handler = P.io && P.io.irqBytes && P.io.irqBytes.size ? P.io.irqBytes : null;
        try { cpu.irq(address, { maxSteps: opts.maxSteps, kernal: opts.kernal, hooks: opts.hooks }); } finally { cpu.handler = null; }
      }
      else cpu.call(address, { sp: s.top }, { maxSteps: opts.maxSteps, hooks: opts.hooks });
    } finally { portOut(P, cpu); }
    return regsOut(cpu);
  };
}

// The address the instruction at the program counter reads, worked out before it runs.
function target(cpu, mode) {
  const pc = cpu.pc, b = cpu.fb(pc + 1), m = cpu.m;
  if (mode === 'zp') return b;
  if (mode === 'zpx') return (b + cpu.x) & 0xFF;
  if (mode === 'zpy') return (b + cpu.y) & 0xFF;
  if (mode === 'izx') { const z = (b + cpu.x) & 0xFF; return m[z] | (m[(z + 1) & 0xFF] << 8); }
  if (mode === 'izy') return ((m[b] | (m[(b + 1) & 0xFF] << 8)) + cpu.y) & 0xFFFF;
  const w = b | (cpu.fb(pc + 2) << 8);
  return mode === 'abx' ? (w + cpu.x) & 0xFFFF : mode === 'aby' ? (w + cpu.y) & 0xFFFF : w;
}
// What a stand-in polls: 1, the raster's registers at every mirror; 2, the addresses in polls.
function pollTable(polls) {
  const t = new Uint8Array(65536);
  for (let a = 0xD000; a < 0xD400; a++) if ((a & 0x3F) === 0x11 || (a & 0x3F) === 0x12) t[a] = 1;
  for (const a of polls || []) t[a & 0xFFFF] = 2;
  return t;
}

// The game's routine at address, standing in for one of the port's that waits (see the header).
// opts.until: addresses where the game's code is stopped as though it had returned, for a stretch
// of a program that goes on by JMP rather than returning (an attract loop that jumps into the game);
// the result's at is the address it stopped at, or $FFFF for a return.
function standInGen(P, address, opts = {}) {
  const polls = pollTable(opts.polls);
  return function* (r) { return yield* waiting(P, address & 0xFFFF, opts, polls, r); };
}
function* waiting(P, address, opts, polls, r) {
  const s = simulator(P, opts), cpu = s.cpu, M = cpu.m, top = s.top, max = opts.maxSteps || 1e6;
  const until = new Set(opts.until || []);
  // since the last yield: the addresses of the instructions that read a poll address, the RAM
  // bytes of polls they read, and the routine's own cycles (the first time, from the JSR); and the
  // bytes it has polled, which it reads from P.M from then on
  const turned = new Set(), read = new Set(), direct = new Set();
  let own = 6, steps = 0;
  // a yield, the routine's registers and stack kept: what runs on the simulator meanwhile (a
  // standIn handler) runs below its stack
  function* pause(y) {
    const saved = { a: cpu.a, x: cpu.x, y: cpu.y, sp: cpu.sp, p: cpu.p, pc: cpu.pc };
    own = 0; turned.clear(); read.clear();
    s.top = cpu.sp;
    portOut(P, cpu);
    try { yield y; } finally { s.top = top; cpu.setRegs(saved); portIn(P, cpu); }
  }
  // the game run on to the start of the line the routine has reached, keeping back spare cycles
  const catchUp = spare => (own - spare >= LINE ? pause({ cycles: own - spare - LINE + 1 }) : []);
  portIn(P, cpu);
  cpu.setRegs(regsIn(r));
  cpu.sp = top;
  cpu.push(0xFF); cpu.push(0xFE);                    // its RTS lands on $FFFF
  cpu.pc = address;
  while (cpu.pc !== 0xFFFF && !(until.size && until.has(cpu.pc))) {
    let op = cpu.fb(cpu.pc, true), e = DATA[op] ? target(cpu, OPCODES[op][1]) : -1;
    if (e >= 0 && polls[e]) {
      if (turned.has(cpu.pc)) {                      // a turn of a polling loop: a bare yield
        for (const b of read) direct.add(b);
        yield* catchUp(LINE);
        yield* pause();
      } else yield* catchUp(0);
      op = cpu.fb(cpu.pc, true); e = DATA[op] ? target(cpu, OPCODES[op][1]) : -1;   // memory as the interrupts left it
    }
    let old = -1;
    if (e >= 0 && polls[e]) {
      turned.add(cpu.pc);
      if (polls[e] === 2 && (e < 0x100 ? e > 1 : cpu.rk[e >>> 8] === cpu.rk[2])) {   // RAM: page 2 is RAM on any map
        if (!direct.has(e) && P.io && typeof P.io.irqByte === 'function') { old = M[e]; M[e] = P.io.irqByte(e) & 0xFF; }
        read.add(e);
      }
    }
    own += cpu.step();
    if (old >= 0 && DATA[op] === 1) M[e] = old;     // a read leaves the port's byte as it was
    if (++steps > max) throw new Error('standInGen: the routine at ' + hex(address) + ' ran ' + max + ' instructions without returning (at ' + hex(cpu.pc) + ')');
  }
  yield* catchUp(0);
  portOut(P, cpu);
  return Object.assign(regsOut(cpu), { at: cpu.pc });
}

// A port's routine that waits, checked against the game's at address, frame by frame (see the
// header).
function checkGen(P, routine, address, opts = {}) {
  const f = typeof routine === 'string' ? P[routine] : routine;
  if (typeof f !== 'function') throw new Error('checkGen: the port has no routine ' + routine);
  const raster = opts.frame === undefined || opts.frame === 'raster', frame = raster ? -1 : opts.frame & 0xFFFF;
  const runs = ranges(opts), max = opts.maxFrames || 1000, regs = opts.regs || {};
  let chips;
  try { chips = chipNames(opts); } catch (e) { throw new Error('checkGen: ' + e.message); }
  const portChips = new PortChips(), gameChips = new PortChips();
  let line = (opts.line || 0) % LINES, frames = 0;
  portChips.raster = gameChips.raster = line;
  P.io = Object.assign({}, P.io, chipIO(portChips), { irqByte: a => P.M[a & 0xFFFF] });
  const G = { M: Uint8Array.from(P.M), io: chipIO(gameChips) };
  const game = standInGen(G, address, { polls: raster ? opts.polls : [frame, ...(opts.polls || [])], port: opts.port, maxSteps: opts.maxSteps })(regs);
  const port = f.call(P, regs);
  if (!port || typeof port.next !== 'function') throw new Error('checkGen: the port\'s routine gave no generator');
  // a side run on to its next bare yield, a turn of a polling loop, or its return
  const turn = (it, who) => {
    for (;;) {
      const r = it.next();
      if (r.done) return r;
      const y = r.value;
      if (y && y.wait !== undefined) throw new Error('checkGen: the ' + who + '\'s routine waits for line ' + y.wait + ': a raster wait is checked in a lockstep, or polled here with bare yields');
      if (!(y && (y.cp !== undefined || y.cycles !== undefined))) return r;
    }
  };
  const fail = (why, more) => ({ ok: false, frames, diff: Object.assign({ frame: frames, line, why: 'frame ' + frames + ', line ' + line + ': ' + why }, more) });
  for (;;) {
    const p = turn(port, 'port'), g = turn(game, 'game'), d = differ(G.M, gameChips, P.M, portChips, runs, chips);
    if (p.done !== g.done) {
      const [done, on] = p.done ? ['port', 'game'] : ['game', 'port'];
      return fail('the ' + done + '\'s routine returned and the ' + on + '\'s polls on' + (d ? '; ' + bytesLine(d) : ''), d || {});
    }
    if (d) return fail(bytesLine(d), d);
    if (p.done) {
      const out = [];
      if (p.value && typeof p.value === 'object') {
        for (const k of Object.keys(p.value)) {
          if (!(k in g.value)) continue;
          const flag = k !== 'a' && k !== 'x' && k !== 'y', pv = flag ? (p.value[k] ? 1 : 0) : p.value[k] & 0xFF, gv = g.value[k];
          if (pv !== gv) out.push({ register: k, game: gv, port: pv });
        }
      }
      const shown = x => 'axy'.includes(x.register) ? ' game ' + hex(x.game, 2) + ' port ' + hex(x.port, 2) : ' game ' + x.game + ' port ' + x.port;
      if (out.length) return fail('on return, ' + out.map(x => x.register + shown(x)).join(', '), { regs: out });
      return { ok: true, frames, diff: null };
    }
    if (raster) { line = (line + 1) % LINES; if (!line) frames++; portChips.raster = gameChips.raster = line; }
    else { G.M[frame] = (G.M[frame] + 1) & 0xFF; P.M[frame] = (P.M[frame] + 1) & 0xFF; frames++; }
    if (opts.onYield) { opts.onYield(G.M, G.io, frames, line); opts.onYield(P.M, P.io, frames, line); }
    if (frames >= max) return fail('neither routine returned in ' + max + ' frames');
  }
}

// A run's result as lines to print.
function describe(r) {
  const out = [];
  for (const d of r.diffs) out.push('pass ' + d.pass + ' (frame ' + d.frame + '): ' + bytesLine(d));
  if (r.diverged) out.push('pass ' + r.diverged.pass + (r.diverged.after >= 0 ? ', after ' + hex(r.diverged.after) : '') + ' (frame ' + r.diverged.frame + '): ' + r.diverged.why);
  out.push(r.passes + (r.passes === 1 ? ' pass' : ' passes') + ' in ' + r.frames + ' frames: ' +
    (r.ok ? 'identical' : (r.diffs.length ? r.diffs.length + ' with differences' : '') + (r.diffs.length && r.diverged ? ', then ' : '') + (r.diverged ? 'out of step' : '')));
  return out.join('\n');
}

module.exports = { Lockstep, standIn, standInGen, checkGen, describe, PortChips };
