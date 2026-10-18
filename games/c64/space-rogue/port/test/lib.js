'use strict';
// What the port's tests share: the game's disk and the runner the port is checked against
// (kit/c64/c64run.js), scripted play to reach a moment, and the moments saved in work/.
// The disk is the contributor's own: work/disk.json, made by
//   python3 kit/c64/disk.py pack games/c64/space-rogue/work/disk.json \
//     games/c64/space-rogue/work/side1.g64 games/c64/space-rogue/work/side2.g64 \
//     --sectors games/c64/space-rogue/work/side2.g64
// and the moments are work/states/*.json (port/scripts/gen-states.js); neither is ever committed.
const fs = require('fs'), path = require('path');
const GAME = path.resolve(__dirname, '../..');
const REPO = path.resolve(GAME, '../../..');
const C64Run = require(path.join(REPO, 'kit/c64/c64run.js'));
const WORK = path.join(GAME, 'work');
const STATES = path.join(WORK, 'states');
const { FRAME } = C64Run;

let disk = null;
function readDisk() {
  if (!disk) disk = C64Run.read(path.join(WORK, 'disk.json'));
  return disk;
}

// The main loop's first instruction in flight: each pass starts here (sr_init's loop, $0DED).
const FLIGHT_PASS = 0x0DED;

// A runner on the disk: booted as BOOT leaves the machine (or with another file, boot: { file,
// to }), or from a saved moment. Saves go to
// a copy of the disk's files, so a run never changes the disk another run reads.
function runner(o = {}) {
  const d = readDisk();
  const files = Object.assign({}, d.files);
  const fixes = [];
  const R = C64Run.create({ drive: C64Run.drive({ files, sectors: d.sectors, onSave: o.onSave }), keep: {},
    rasterFix: (i) => fixes.push(i), state: o.state, hooks: o.hooks });
  if (!o.state) R.boot(o.boot || { file: 'TITLE', to: 0x2000 });
  let t = R.cpu.cycles;
  const S = { R, fixes, m: R.m };
  S.run = (s) => { t = Math.max(t, R.cpu.cycles) + Math.round(s * 50) * FRAME; R.run(t); };
  S.key = (k, s = 0.15) => { for (const x of [].concat(k)) R.m.press(x); S.run(s); for (const x of [].concat(k)) R.m.release(x); S.run(0.15); };
  S.type = (str) => { for (const ch of str) S.key(ch === ' ' ? 'SPACE' : ch); };
  S.loaded = (name) => R.loads.some((l) => l[0] === 'LOAD ' + name);
  // Run on until the processor is at address a outside an interrupt, and stop there.
  S.stopAt = (a, maxFrames = 3000) => {
    const m = R.m, prev = m.hooks[a];
    let hit = false;
    m.hooks[a] = () => { hit = true; m.stopFlag = true; return true; };
    try {
      for (let f = 0; f < maxFrames && !hit; f++) m.runCycles(FRAME);
    } finally { if (prev) m.hooks[a] = prev; else delete m.hooks[a]; }
    if (!hit) throw new Error('stopAt: $' + a.toString(16) + ' not reached in ' + maxFrames + ' frames');
    t = R.cpu.cycles;
  };
  // A routine of the game's run where the processor stands (a pass's start), on the stack below
  // it, as the game's own code would call it; no interrupt comes while it runs.
  S.call = (entry, regs = {}) => {
    const c = R.cpu, pc = c.pc, sp = c.sp;
    c.call(entry, Object.assign({ sp }, regs), { hooks: R.m.hooks, maxSteps: 5e7 });
    c.pc = pc; c.sp = sp;
    t = Math.max(t, c.cycles);
    return { a: c.a, x: c.x, y: c.y, c: c.c };
  };
  // The moment as it stands, with the address its main loop's passes start at.
  S.save = (name, passAt) => {
    const s = R.save();
    s.machine.passAt = passAt;
    s.loads = R.loads.filter((l) => !l[0].startsWith('READ')).map((l) => l[0].slice(5));
    fs.mkdirSync(STATES, { recursive: true });
    fs.writeFileSync(path.join(STATES, name + '.json'), JSON.stringify(s));
    return s;
  };
  return S;
}

function readState(name) { return JSON.parse(fs.readFileSync(path.join(STATES, name.endsWith('.json') ? name : name + '.json'), 'utf8')); }
function states(filter = '') { return fs.existsSync(STATES) ? fs.readdirSync(STATES).filter((f) => f.endsWith('.json') && f.includes(filter)).sort() : []; }

// From the title to the cockpit of a new game, with the name PILOT.
function newGame(S) {
  S.run(3); S.key('SPACE'); S.run(3); S.key('N'); S.run(1); S.type('PILOT'); S.key('RETURN'); S.run(2);
  for (let i = 0; i < 40 && !S.loaded('PIT.PAC'); i++) { S.key('SPACE'); S.run(1); }
  S.run(2);
}

const hex = (a) => '$' + (a >>> 0).toString(16).toUpperCase().padStart(4, '0');
module.exports = { GAME, REPO, WORK, STATES, C64Run, FRAME, FLIGHT_PASS, runner, readDisk, readState, states, newGame, hex };
