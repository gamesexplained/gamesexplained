'use strict';
// The page's machine (page/runtime.js) as the Play page runs it, at its clock, on the memory the
// page carries (scripts/pack-data.js), beside the whole memory and beside the C64:
// - the data: two pages, one on the memory the page carries and one on the whole of it, given the
//   same controls, agree frame by frame on every byte the page keeps, colour RAM, the video chip
//   and the SID, so the port reads no byte of the game's code that pack-data.js zeroes. From the
//   game's first instruction with no key (the demonstration), with F3 (the joystick) and then the
//   explorer (lockstep.js), with the Solution tab's joystick, and from each moment of play in
//   work/states with the explorer.
// - the pace: the frames the screen ($5435), the tune ($1600) and the choice under way ($543E)
//   change on, the demonstration's and the cold start's, within a few frames of the C64's
//   (kit/c64/machine.js, from listing.json).
// - the controls: over the Solution tab's joystick, the cursor ($68E5 and its sprite's Y) where the
//   C64 has it on every frame, and the interrupt run once a frame with that frame's joystick.
//   node t-page.js [frames] [session filter]
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { explorer } = require('./lockstep.js');
const { blank, pack } = require('../scripts/pack-data.js');
globalThis.window = globalThis;
require(path.join(lib.REPO, 'site/lib/c64.js')); require(path.join(lib.REPO, 'site/lib/sid.js'));
globalThis.C64Cpu = require(path.join(lib.REPO, 'kit/cpu/cpu6502.js'));
require('./port.js').loadPort();
require('../page/runtime.js');
const cost = JSON.parse(fs.readFileSync(path.join(__dirname, '../cost.json'), 'utf8'));
const N = +(process.argv[2] || 1500), filter = process.argv[3] || '';

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const hex = n => '$' + n.toString(16).toUpperCase().padStart(4, '0');

// ---- the data
function twoPages(name, saved, from, input, frames) {
  const b = saved ? blank(saved) : pack();
  const whole = saved || lib.boot().save();
  const A = SFPage.create({ data: b.state, cost }), B = SFPage.create({ data: whole, cost });
  if (saved) { A.restore(b.state, p => p.resume(), from); B.restore(whole, p => p.resume(), from); }
  const sids = [[], []];
  A.onSid((r, v) => sids[0].push(r, v)); B.onSid((r, v) => sids[1].push(r, v));
  for (let f = 0; f < frames; f++) {
    const { keys, joy } = input(f, B);
    for (const rt of [A, B]) { rt.input.keys = new Set(keys); rt.input.joy1 = 0x1F & ~joy; }
    try { A.runFrame(); B.runFrame(); } catch (e) { fail(name + ', frame ' + f + ': ' + e.message); return; }
    let at = -1;
    for (let a = 0; a < 0x10000 && at < 0; a++) if (A.M[a] !== B.M[a] && !b.blanked(a)) at = a;
    if (at >= 0) { fail(name + ', frame ' + f + ': ' + hex(at) + ' is ' + A.M[at] + ' on the page\'s memory and ' + B.M[at] + ' on the whole'); return; }
    for (let i = 0; i < 0x400; i++) if (A.colour[i] !== B.colour[i]) { fail(name + ', frame ' + f + ': colour RAM ' + hex(0xD800 + i)); return; }
    for (let r = 0; r < 0x2F; r++) if (A.vic[r] !== B.vic[r]) { fail(name + ', frame ' + f + ': the video chip\'s register ' + hex(0xD000 + r)); return; }
    if (sids[0].join() !== sids[1].join()) { fail(name + ', frame ' + f + ': the writes to the SID'); return; }
    sids[0].length = sids[1].length = 0;
    if (Math.abs(A.t - B.t) > 0) { fail(name + ', frame ' + f + ': the clock at ' + A.t + ' and ' + B.t); return; }
  }
  console.log('ok   ' + name + ': ' + frames + ' frames, the page\'s memory and the whole agree');
}
const rec = lib.solution();
const solution = f => ({ keys: f >= rec.f3[0] && f < rec.f3[1] ? ['F3'] : [], joy: rec.joy[f] || 0 });
const explore = (seed, f3) => { const x = explorer(seed); return (f, rt) => ({ keys: f3 && f >= f3[0] && f < f3[1] ? ['F3'] : [], joy: f3 && f < f3[1] ? 0 : x({ ram: rt.M, vic: rt.vic }) }); };
const sessions = [
  ['demo', () => twoPages('demo', null, 0, () => ({ keys: [], joy: 0 }), 3 * N)],
  ['cold', () => twoPages('cold', null, 0, explore(1, [100, 110]), 3 * N)],
  ['solution', () => twoPages('solution', null, 0, solution, Math.min(rec.joy.length, 20 * N))],
].concat(lib.states().map((s, i) => [s, () => twoPages(s.replace('.json', ''), lib.readState(s), lib.PASS, explore(i + 2), N)]));
for (const [name, run] of sessions) if (name.includes(filter)) run();

// ---- the pace, and the controls
const key = M => M[0x5435] + ',' + M[0x1600].toString(16) + ',' + M[0x543E];
function beside(name, frames, input, check) {
  const rt = SFPage.create({ data: pack().state, cost });
  const m = lib.boot({ dma: rec.dma });
  const A = [], B = [];
  let la = '', lb = '', irqs = 0, read = [], odd = [], cursor = [];
  const irq = rt.P.irq;
  rt.P.irq = function () { irqs++; read.push(rt.input.joy1); return irq.apply(this, arguments); };
  for (let f = 0; f < frames; f++) {
    const { keys, joy } = input(f);
    rt.input.keys = new Set(keys);
    for (const k of ['F3']) if (keys.includes(k)) m.press(lib.KEY[k]); else m.release(lib.KEY[k]);
    rt.input.joy1 = m.joy1 = 0x1F & ~joy;
    // each as its frame began: the page's from the frame it shows, its memory being ahead
    const kb = key(m.ram), cb = m.ram[0x68E5] + ',' + m.vic[1];
    if (kb !== lb) { B.push([f, kb]); lb = kb; }
    irqs = 0; read = [];
    const F = rt.runFrame(); m.runFrames(1);
    if (F) {
      const ka = key(F.mem);
      if (ka !== la) { A.push([f, ka]); la = ka; }
      if (F.mem[0x68E5] + ',' + F.vic[1] !== cb) cursor.push(f);
    }
    if (f >= 2 && (irqs !== 1 || read[0] !== rt.input.joy1)) odd.push(f + ':' + irqs);
  }
  check(A, B, { cursor, odd });
}
// the events on the page and on the C64 agree, each within slack frames
function sameEvents(name, A, B, slack) {
  let worst = 0;
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    if (!A[i] || !B[i] || A[i][1] !== B[i][1]) { fail(name + ': event ' + i + ' on the page ' + (A[i] || []).join(':') + ', on the C64 ' + (B[i] || []).join(':')); return; }
    worst = Math.max(worst, Math.abs(A[i][0] - B[i][0]));
  }
  if (worst > slack) fail(name + ': an event ' + worst + ' frames from the C64\'s');
  else console.log('ok   ' + name + ': ' + A.length + ' screens and tunes, each within ' + worst + ' frames of the C64\'s');
}
if ('pace'.includes(filter) || !filter) {
  beside('the demonstration', 3900, () => ({ keys: [], joy: 0 }), (A, B) => sameEvents('the demonstration\'s pace', A, B, 5));
  beside('the cold start', 3000, f => ({ keys: f >= 100 && f < 110 ? ['F3'] : [], joy: 0 }), (A, B) => sameEvents('the cold start\'s pace', A, B, 2));
  // the recorded game, which the page follows as long as its screens come at the C64's frames
  beside('the Solution tab\'s game', 3000, solution, (A, B, o) => {
    if (o.cursor.length) fail('the cursor apart from the C64\'s on ' + o.cursor.length + ' frames, the first ' + o.cursor[0]);
    else console.log('ok   the controls: the cursor where the C64 has it on each of 3000 frames of the Solution tab\'s game');
    if (o.odd.length) fail('frames with other than one interrupt, or one that read another frame\'s joystick: ' + o.odd.slice(0, 8).join(' '));
    else console.log('ok   the interrupt once a frame, with that frame\'s joystick');
  });
}
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
