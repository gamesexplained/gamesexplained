'use strict';
// What the port's tests share: the machine the port is checked against (kit/c64/machine.js),
// started at the game's first instruction ($9C3E, where the reset enters it) with the memory
// listing.json records; the KERNAL routines it calls, which the kit holds no ROM for; and scripted
// play to reach a moment.
const fs = require('fs'), path = require('path');
const GAME = path.resolve(__dirname, '../..');
const REPO = path.resolve(GAME, '../../..');
const { Machine, KEY, FRAME, LINE, LINES, loadListing } = require(path.join(REPO, 'kit/c64/machine.js'));
const { loadPort } = require('./port.js');
const EP = loadPort();

// A pass of the main program starts at main_loop ($A04C), once every two or three frames.
const PASS = 0xA04C;

// The KERNAL's routines the game calls: IOINIT ($FF84) once at the reset, which sets the CIAs as
// the game then sets them again, and SCNKEY ($FF9F) on the title and in its key waits, of which
// the game reads the key held ($C5, core.js's scnkey). Their cycles are the ROM's, near enough: the
// matrix read once with no key down, all eight rows with one. And the junk the level's start runs
// as code at $9FF9 (src/g-main.js, level_restart_common): its EOR ($3A,X) reads through a pointer
// the stack's shift has left, at times in the KERNAL ROM, which the simulator does not hold; A is
// reloaded after it, so the hook passes over it with its six cycles.
const SCNKEY_CYCLES = { none: 64, key: 980 };
const HOOKS = {
  0x9FFD: c => { c.cycles += 6; c.pc = 0x9FFF; return false; },
  0xFF84: c => { c.cycles += 300; c.rts(); return false; },
  0xFF9F: c => {
    EP.scnkey({ M: c.m, ciaRead: r => c.io.read(0xDC00 + r, c), ciaWrite: (r, v) => c.io.write(0xDC00 + r, v, c) });
    c.cycles += c.m[0xC5] === 0x40 ? SCNKEY_CYCLES.none : SCNKEY_CYCLES.key;
    c.rts(); return false;
  },
};
function hook(m) { Object.assign(m.hooks, HOOKS); return m; }

function listingRam() { return loadListing(path.join(GAME, 'listing.json')); }
// The game from the reset's entry, with the processor port as the cartridge-less reset leaves it,
// and the video chip's screen on: the program is run from BASIC (orientation.md), whose screen the
// KERNAL has set up, and the game sets $D011 only once play begins ($1B), so the title is shown
// with the KERNAL's 25 rows and fine scroll of 3, as the game's own $1B has them
// (reference/title.png shows the title on).
const VIC = new Uint8Array(0x40);
VIC[0x11] = 0x1B;
function boot(opts = {}) {
  return hook(new Machine(Object.assign({ ram: listingRam(), pc: 0x9C3E, passAt: PASS,
    port: { dir: 0x2F, data: 0x37 }, dma: true, collide: true, vic: { regs: VIC, irq: 0 } }, opts)));
}

// Run the machine until the processor is at a outside an interrupt, and stop there.
function stopAt(m, a, maxFrames = 3000) {
  const prev = m.hooks[a];
  let hit = false;
  m.hooks[a] = c => { if (m.depth) return prev ? prev(c) : false; hit = true; m.stopFlag = true; return true; };
  try { for (let f = 0; f < maxFrames && !hit; f++) m.runCycles(FRAME); }
  finally { if (prev) m.hooks[a] = prev; else delete m.hooks[a]; }
  if (!hit) throw new Error('stopAt: $' + a.toString(16) + ' not reached in ' + maxFrames + ' frames');
  return m;
}

const hex = (a, n = 4) => '$' + (a >>> 0).toString(16).toUpperCase().padStart(n, '0');
module.exports = { GAME, REPO, PASS, HOOKS, SCNKEY_CYCLES, KEY, FRAME, LINE, LINES, Machine, EP, listingRam, boot, hook, stopAt, hex };
