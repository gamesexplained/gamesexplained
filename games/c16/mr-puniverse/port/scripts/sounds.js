'use strict';
// The sound effects index.html plays, made by the game's own code on the kit's C16
// (kit/c16/machine.js) from the listing, as a game started with F1 makes them in room 0: the EGY
// bar's refill as a turn starts (start_turn, $328F, to the first pass of main_loop), the fall from
// where the turn puts him to the floor below (the first seven passes), a jump (fire held for two
// passes, then 40 more), and a death (D held for four frames, until the next turn's start_turn).
// Each is the machine's log of the writes to TED's sound registers, in the kit-c16-sound format of
// site/lib/ted-sound.js, from the start of the frame of the effect's first write to ten frames
// after its last. plus4emu's sound log of the same steps (work/scripts/sounds_live.py) has the same
// writes with the same values, each within a fifth of a frame of the machine's.
//   make(ram) -> { refill, fall, jump, death }     ram: the listing's 64 KB with KERNAL_RAM added
//   node sounds.js               prints them packed (TEDSound.pack), for index.html's #puni-sounds
// test_puni.js makes them again and holds the page's copy to them.
const path = require('path');
const REPO = path.resolve(__dirname, '../../../../..');
const { Machine, KEY, kernalHooks } = require(path.join(REPO, 'kit/c16/machine.js'));
const FRAME = 35568, CLOCK = 1773447;

function make(ram) {
  const m = new Machine({ ram, pc: 0x1AF4, passAt: 0x32BC });
  m.cpu.sp = 0xF6;
  Object.assign(m.hooks, kernalHooks(m));
  m.hooks[0x3225] = () => true;                          // the title's first title_dot_step
  m.runFrames(400);
  delete m.hooks[0x3225];
  m.ram[0x0349] = 1; m.ram[0x0345] = 8;                  // F1: one player, the joystick, 8 lives
  m.cpu.pc = 0x328F;                                     // start_turn
  const out = {};
  const take = (name, run) => {
    m.soundLog = [];
    run();
    // an INC of a register writes it twice, the old value and then the new, and plus4emu's log
    // keeps only the second: the first is left out here too
    const w = m.soundLog.filter((x, i, all) => !(all[i + 1] && all[i + 1][1] === x[1] && all[i + 1][0] - x[0] <= 2));
    const f0 = Math.floor(w[0][0] / FRAME) * FRAME;
    out[name] = { format: 'kit-c16-sound', clock: CLOCK, frame: FRAME, start: 0,
      end: Math.ceil((w[w.length - 1][0] - f0) / FRAME) * FRAME + 10 * FRAME, writes: w.map(([t, a, v]) => [t - f0, 0xFF00 | (a & 0xFF), v]) };
    m.soundLog = null;
  };
  m.onPass = () => true;
  take('refill', () => m.runFrames(2000));
  m.onPass = null;
  take('fall', () => m.runPasses(7));
  take('jump', () => { m.joy = 0x0F; m.runPasses(2); m.joy = 0x1F; m.runPasses(40); });
  m.hooks[0x328F] = () => true;
  take('death', () => { m.press(KEY.D); m.runFrames(4); m.releaseAll(); m.runFrames(3000); });
  return out;
}

if (require.main === module) {
  const lib = require('../test/lib.js');
  require(path.join(REPO, 'site/lib/ted-sound.js'));
  const s = make(lib.boot());
  const packed = {};
  for (const k of Object.keys(s)) packed[k] = globalThis.TEDSound.pack(s[k]);
  console.log(JSON.stringify(packed));
}
module.exports = { make };
