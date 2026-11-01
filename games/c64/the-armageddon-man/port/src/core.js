// The Armageddon Man's port: P, the game's routines on the game's memory. Each group of routines is
// a file of its own that adds its functions to P (AMGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the game's 64 KB, read and written at the game's addresses, self-modified operands
//   included. M[1] holds the processor port's data register ($01), which the game keeps at $04 (all
//   RAM: the bitmap at $E000 and the colour cells at $DC00 lie under the chips) and sets to $05 only
//   while it touches a chip (io_in, io_out). P.io is the chips (kit/c64/lockstep.js lists its
//   functions): the port writes the video chip, the SID and the CIAs through it, never through M.
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y,
//   c }, those it reads), and it returns the registers it leaves ({ a, x, y }, and c, z or n where a
//   caller reads them). That is the kit's standIn's form, so the game's own code can stand in for
//   any routine not yet written (in the tests only), and a routine of one group calls another's
//   as P.x.
// - Inline bytes. Most routines take their arguments from the bytes after the JSR that called them
//   (inline_args, $7125), and return past them. Such a routine's port takes r.at, the address of
//   that JSR, since the bytes it reads, the scratch it leaves and the code it returns to all follow
//   from it. A routine that the game reaches through a JMP with the bytes still to come after the
//   JSR of its caller's caller (fill_cells from unused code, the menus' list numbers) is not one the
//   port needs.
// - A routine that waits (for delay_count, which the interrupt counts down, or for fire, read from
//   the CIA) or calls one that does is a generator: it yields where time passes, as
//   kit/c64/lockstep.js describes (a bare yield for each turn of a loop that polls, { cp: a } at a
//   checkpoint), and is called with yield*. GEN lists them, and P.CHECKPOINTS the places a routine
//   yields, which each group adds to. A routine that draws a large window yields { cycles: 0 } now
//   and then, where the page's clock may catch up.
// - The main program never returns: a quit, a RAMLOAD, a recall and the end of a game go back to
//   new_game_loop with a JMP, leaving whatever the 6502's stack held, and the script engine leaves
//   its scripts the same way. The port throws P.jump(place) there instead, which unwinds every
//   routine under way to the main program's loop (P.main), and that runs the place.
// - The interrupt writes delay_count ($734B) and, through its hook, what the hook animates; the
//   main program reads them in its polling loops, a turn a yield, so the lockstep's replay gives
//   them as the game read them. A byte the interrupt writes that the main program reads in the
//   middle of a stretch is read through P.irqByte(a) (IRQ_BYTES).
// - The game's own race. While a radio message unscrambles, the interrupt's random numbers land in
//   $04, the scratch byte the main program reads the controls through ($5156-$515B), takes a key's
//   matrix position apart in (key_down, key_bit) and toggles the radio's filters with ($7A46-
//   $7A4B). An interrupt between the store and the read changes what is read: a held fire button
//   read as let go, say. The port reads $04 as it stored it (page/differences.html says so), and
//   the lockstep shows the race where it falls (test/lockstep.js).
(function (root) {
'use strict';
const G = root.AMGroups = root.AMGroups || {};
// the generators: each group adds its own with AMPort.gen when it loads
const GEN = root.AMGen = root.AMGen || new Set();
const gen = names => { for (const n of names.trim().split(/\s+/)) GEN.add(n); };
gen('main');
const IRQ_BYTES = [0x734B];
const IRQ_SET = new Set(IRQ_BYTES);
class Jump {
  constructor(to) { this.to = to; }
}
function makePort(M, io, opts = {}) {
  const P = { M, GEN, CHECKPOINTS: [], WAITS: [] };
  Object.defineProperty(P, 'Jump', { value: Jump });
  // The main program's work whose length varies, counted for the page's pacing: bytes copied and
  // filled, glyphs and pixels drawn, cells of windows saved and put back, and so on. The groups add
  // their counters; the interrupt's go in P.NI.
  P.N = {};
  P.NI = {};
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.irqByte = a => (IO.irqByte && IRQ_SET.has(a) ? IO.irqByte(a) : M[a]);
  P.sei = () => { if (IO.sei) IO.sei(); };
  P.cli = () => { if (IO.cli) IO.cli(); };
  P.jump = to => { throw new Jump(to); };
  P.w = a => M[a] | M[(a + 1) & 0xFFFF] << 8;
  P.setw = (a, v) => { M[a] = v & 255; M[(a + 1) & 0xFFFF] = (v >> 8) & 255; };
  // The routine at an address, for the game's tables of addresses: P.callAt(a, r) runs it, with
  // yield* (a routine that waits is a generator, the others return at once).
  const NAMES = root.AMNames || {};
  const AT = new Map();
  for (const k of Object.keys(NAMES)) AT.set(NAMES[k], k);
  P.nameAt = a => AT.get(a);
  // an entry point the listing gives no label of its own, under the port's name for it
  P.alias = (a, name) => AT.set(a, name);
  P.callAt = function* (a, r) {
    const name = AT.get(a);
    if (!name || typeof P[name] !== 'function') throw new Error('no routine of the port at $' + a.toString(16));
    return GEN.has(name) ? yield* P[name](r || {}) : P[name](r || {});
  };
  const only = opts.only || null;
  for (const name of Object.keys(G)) if (!only || only.includes(name)) G[name](P);
  if (opts.standIn) opts.standIn(P);
  return P;
}
root.AMPort = { makePort, GEN, gen, Jump, IRQ_BYTES };
})(typeof window !== 'undefined' ? window : globalThis);
