'use strict';
// Holds music.html's music player against the game's own code. For each of the 35 tunes the test
// starts the tune as its part starts it, naming the part's routines by their labels in the part's
// listing (so a wrong address in the page's table fails), then calls the step routine 3,000 times
// as the part's interrupt does, on the kit's simulator over the listing's memory, and compares every
// SID write, frame by frame, with what the page's driver writes.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const kit = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createDriver } = g.run('music.html', 'createDriver', 'createDriver');
const L = {}, lst = p => L[p] || (L[p] = g.listing(`parts/${p}/listing.json`));
const ch = [['start_sound', { x: 0, y: 0 }], ['start_sound', { x: 1, y: 0 }], ['start_sound', { x: 2, y: 0 }], ['sound_step'], ['play_sound', { a: 1 }]];
// Country Y for each anthem, as tune_by_country maps it ($1E1A): tune n is the country whose entry is 2n.
const menuY = [0, 1, 2, 8, 9, 10, 16, 3, 13, 17, 4, 5, 11, 21, 18, 19, 20, 12, 6, 7];
const T = [];
for (let n = 0; n < 20; n++) T.push({ p: 'menu', init: [['snd_init'], ['play_tune', { y: menuY[n] }]], step: 'tune_step', times: 2 });
T.push({ p: 'opening', init: [['sid_setup'], ['start_tune', { y: 2 }]], step: 'tune_step' });
for (const k of [1, 2, 3, 4]) T.push({ p: 'closing', init: [['start_tune_' + k]], step: 'music_step' });
T.push({ p: 'triple-jump', init: [['tune_play']], step: 'music_step' });
T.push({ p: 'rowing', init: [['music_start']], step: 'music_step' });
T.push({ p: 'javelin', init: ch, step: 'sound_step' });
T.push({ p: 'equestrian', init: [['start_tune', { x: 0 }]], step: 'music_step' });
T.push({ p: 'equestrian', init: [['start_tune', { x: 1 }]], step: 'music_step' });
T.push({ p: 'high-jump', poke: [['tune_lo', 'hj_tune', 0], ['tune_hi', 'hj_tune', 8]], init: [], step: 'music_step' });
T.push({ p: 'fencing', init: [['play_sound', { a: 10 }]], step: 'sound_step' });
T.push({ p: 'fencing', init: [['play_sound', { a: 9 }]], step: 'sound_step' });
T.push({ p: 'cycling', init: [['music_on_start']], step: 'music_step' });
T.push({ p: 'kayaking', init: ch, step: 'sound_step' });

const rams = {}; for (const t of T) rams[t.p] = lst(t.p).ram;
const d = createDriver({ rams, list: T.map((t, n) => n) }, kit);
const FRAMES = 3000;
let bad = 0;
T.forEach((t, n) => {
  const Ls = lst(t.p), A = x => { const a = Ls.byName.get(x); if (a === undefined) throw new Error(t.p + ': no label ' + x); return a; };
  const m = Ls.ram.slice();
  let w = [];
  const cpu = new CPU(m, { port: 0x35, io: { read: a => (a === 0xD011 ? 0x80 : 0),
    write: (a, v) => { if (a >= 0xD400 && a <= 0xD418) w.push(a - 0xD400, v); } } });
  for (const [a, lab, sh] of t.poke || []) m[A(a)] = (A(lab) >> sh) & 0xFF;
  for (const [a, r] of t.init) cpu.call(A(a), r || {}, { maxSteps: 1e6 });
  d.init(n);
  const start = w;      // the start's writes, which the driver hands over with the first frame's
  let a, b, notes = 0;
  for (let f = 0; f < FRAMES; f++) {
    w = [];
    for (let k = 0; k < (t.times || 1); k++) cpu.call(A(t.step), {}, { maxSteps: 1e6 });
    d.play();
    if (!d.playing()) break;
    a = d.writes.join(','); b = (f ? w : start.concat(w)).join(',');
    if (a !== b) { console.log(`tune ${n} (${t.p}): frame ${f} differs\n port ${a}\n game ${b}`); bad++; return; }
    for (let i = 0; i < w.length; i += 2) if (w[i] < 21 && w[i] % 7 === 4 && (w[i + 1] & 1)) notes++;
  }
  if (!notes) { console.log(`tune ${n} (${t.p}): no note played`); bad++; return; }
  console.log(`tune ${n} (${t.p}): agrees, ${notes} gate writes`);
});
process.exit(bad ? 1 : 0);
