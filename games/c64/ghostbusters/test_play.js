#!/usr/bin/env node
// Hold the Play tab's port of the whole game against the game's own code, pass by pass, in the
// kit's lockstep (kit/c64/lockstep.js). Both start at the cold start ($6000), the game's 64 KB from
// the committed listing: the game on the kit's C64 (kit/c64/machine.js) with CIA timers on, since
// its speech plays from CIA 2's NMI, and the character ROM's bytes the cold start copies, the
// excerpt the page carries (GB_CHARROM); the port as the page's own scripts build it
// (GBCore.makePort and the groups in GB_GROUPS), from P.power_on, with the raster interrupt. The
// port runs a phrase of speech whole when the game starts it; while the game's NMIs play it, the
// port's wait asks whether the game is still in its loop at $8E06-$8E2E. At the start of every
// pass ($6FF0) all of RAM is compared, and colour RAM and the registers written to the video chip
// and the SID.
//
// The game's own races (the Play tab, "Where the original depends on its interrupts") are let
// through, and nothing else:
// - the title's sing-along steps its lyric pointer ($21-$22) twice in a frame now and then during
//   speech, where the port steps once, so the first pass of play can differ there;
// - the raster interrupt steps the random byte $06, and a pass that starts late reads it after the
//   step. The routines that read it keep what they read in $23, $25 and $27, so a pass that
//   differs only there, after the interrupt fell in the middle of the pass before, is that race.
// The lockstep then gives the port the game's memory and goes on.
//
// Two sessions, each from the cold start: the title with its speech, F1, the interview typed (the
// name, no account, car 3), the shop left with the gear the page's "Start at" gives, the city map;
// then a joystick in port 1 that changes at random, with B, E, RETURN or SPACE now and then. The
// second session first sets the PK energy to where the page's Marshmallow Man start puts it.
//   node games/c64/ghostbusters/test_play.js [passes per session]
const path = require('path'), vm = require('vm'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/c64/lockstep.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64');
// the page's inline scripts, those that build the port and its runtime (not the page's own, which
// draws on the document)
const scripts = [...g.read('play.html').matchAll(/<script>\n([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const s of scripts) if (!/\bdocument\./.test(s)) vm.runInThisContext(s, { filename: path.join(__dirname, 'play.html') });
const { GBCore, GBWarp, GB_GROUPS, GB_CHARROM } = globalThis;
const KEY = GBWarp.KEY;
const CHAR = new Uint8Array(4096);                 // the character ROM: only the bytes the page carries
Buffer.from(GB_CHARROM, 'base64').forEach((v, i) => { CHAR[0x008 + i] = v; });
const PASSES = +process.argv[2] || 5000;
const image = g.listing().ram;

function session(name, after, seed) {
  const m = new Machine({ ram: image.slice(), pc: 0x6000, passAt: 0x6FF0, cia: true, rom: { char: CHAR } });
  const P = GBCore.makePort(new Uint8Array(65536), GB_GROUPS);
  P.io.charRom = a => CHAR[a - 0xD000];
  P.speech_running = () => m.cpu.pc >= 0x8E06 && m.cpu.pc < 0x8E2F;
  const ls = new Lockstep({
    machine: m, port: P, program: P => P.power_on(), passAt: 0x6FF0,
    // the speech's NMIs are the port's whole phrase (speech_running, above)
    checkpoints: [0x6FF0, 0x6329, 0x8DED], irqs: { 0x8E76: 'raster_irq', nmi: null },
    chips: ['colour', 'vic', 'sid'], maxFrames: 3000,
  });
  const M = m.ram;
  // the race's sign: the raster interrupt taken in the middle of a pass, not in the frame wait
  const late = new Set();
  let pass = 0;
  m.onInterrupt = (mm, v) => { if (v === 0xFFFE && pass && !(m.cpu.pc >= 0x6FEC && m.cpu.pc < 0x6FF0)) late.add(pass); };
  // the start, played as the page's "Start at" plays it (GBWarp): keys a frame at a time
  let pokes = null, onMap = 0;
  const open = () => M[0x4D] === 0 && M[0x50] !== 0;
  const keyOf = ch => ch === '\r' ? KEY.RETURN : ch === ' ' ? KEY.SPACE : KEY[ch];
  function* start() {
    for (let i = 0; i < 400; i++) yield [];        // the title and its speech a while
    while (!M[0x20]) { yield [KEY.F1]; yield [KEY.F1]; yield []; yield []; }
    const type = function* (text) {
      for (const ch of text) {
        let n = 0; while (!open() && n++ < 20000) yield [];
        yield [keyOf(ch)]; yield [keyOf(ch)]; yield []; yield [];
      }
    };
    yield* type('VENKMAN,PETER\r');
    yield* type('N\r');
    let n = 0; while (!(M[0x3A] === 0x0B && open()) && n++ < 20000) yield [];
    yield* type('3\r');
    n = 0; while (M[0x3A] < 0x0E && n++ < 20000) yield [];
    for (let i = 0; i < 30; i++) yield [];
    pokes = [[0x6D, 0x6F], [0x6A, 9], [0x6B, 9], [0x69, 20]];   // the kit, the traps and the bait
    for (let i = 0; i < 10; i++) yield [];
    n = 0; while (M[0x3A] < 0x10 && n++ < 20000) { yield [KEY.E]; yield [KEY.E]; yield []; yield []; }
    n = 0; while (M[0x3A] !== 0x12 && n++ < 20000) yield [];
    pokes = after;
  }
  const script = start();
  let scripted = true, joy = 0x1F;
  const rnd = k => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % k; };
  const STICK = [0x1F, 0x1E, 0x1D, 0x1B, 0x17, 0x0F, 0x1A, 0x16, 0x19, 0x15];
  const states = new Set();
  function onFrame() {
    if (!scripted) return;
    const r = script.next();
    m.keys.clear();
    if (r.done) { scripted = false; onMap = pass; return; }
    for (const k of r.value) m.keys.add(k);
  }
  function onPass(n) {
    pass = n;
    states.add(M[0x3A]);
    // set both sides at the start of a pass, where they are the same
    if (pokes) { for (const [a, v] of pokes) { M[a] = v; P.M[a] = v; } pokes = null; }
    if (scripted) return;
    m.keys.clear();
    if (rnd(5) === 0) joy = STICK[rnd(STICK.length)];
    m.joy1 = joy;
    if (rnd(40) === 0) m.keys.add([KEY.B, KEY.E, KEY.RETURN, KEY.SPACE][rnd(4)]);
  }
  const r = ls.run({ passes: PASSES, onFrame, onPass, stopOnDiff: false });
  console.log(describe(r));
  let raced = 0, bad = 0;
  for (const d of r.diffs) {
    const at = new Set(d.bytes.map(b => (b.chip ? b.chip + ':' : '') + b.address));
    const only = list => [...at].every(a => list.includes(a));
    if (d.pass === 1 && only(['33', '34'])) raced++;                              // $21-$22, the lyric
    else if (late.has(d.pass - 1) && only(['35', '37', '39'])) raced++;           // $23, $25, $27
    else bad++;
  }
  const ok = !r.diverged && !bad && onMap && r.passes >= PASSES;
  console.log(`${name}: ${r.passes} passes from the cold start, on the map from pass ${onMap || 'none'}, ` +
              `states $${[...states].sort((a, b) => a - b).map(s => s.toString(16).toUpperCase()).join(' $')}; ` +
              `${raced} pass(es) with the game's own races, ${bad} other difference(s)`);
  return ok;
}

const city = session('the city', null, 12345);
const mm = session('the PK energy at the Marshmallow Man', [[0x5B, 0x49], [0x5A, 0x90]], 777);
process.exit(city && mm ? 0 : 1);
