#!/usr/bin/env node
// Hold reference/sound.js, the Sound section's effects, to the game. Each effect runs the game's own
// code from the committed listing on the kit's 6502, as the page runs it, and every spacing between
// two clicks of the speaker must be what the game made in Apple2TS when the same code ran there, in
// play (work/verify/sound.py, 20 October 2026; facts.md, "Live tests"). LIVE below is that
// recording, the cycles between one click and the next, a run of n equal spacings written [cycles, n].
// It exits 1 on any difference.
//   node games/apple2/choplifter/test_sound.js
'use strict';
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { ChopSound } = g.run('reference/sound.js', 'sound.js', 'ChopSound');
const L = g.listing();
const LIVE = {
  "New game": [[750,47],396,[365,47],546,[515,47],646,[590,47],396,[365,47],546,[515,47],486,[430,47],396,[365,47],546,[515,47]],
  "Shot": [275,280,285,290,295,300,305,310,315,320,325,330,335,340,345,350,355,360,365,370,375,380,385,390,395,400,405,410,415,420,425],
  "Hostage aboard": [[1305,11],1181,[1150,13],821,[790,15]],
  "Hostage killed": [[270,47],393,[365,47],543,[515,47]],
  "Hostage home": [[230,39]],
  "Helicopter lost": [[350,79],478,[450,63],543,[515,47],713,[685,31]],
  "Tank fires": [615,271,615,91,615,1231,615,596,615,541,615,976,615,641,615,861,615,596,615],
  "Jet fires": [95,751,95,591,100,96,100,1056,105,596,105,561,110,976,110,71,115,1071,115,111,120,856,120,676,125,1031,125,411,130,681,130,36,135,411,135,46,140,911,140,46,145,1036,145,81,150,271,150,91,155,1231,155,596,160,541,160,976,165,641,165,861,170,596,170],
  "Drone drops a shell": [[270,31]],
};
let bad = 0;
const fail = (...w) => { bad++; console.log('DIFFERS', ...w); };
const flat = runs => runs.flatMap(r => Array.isArray(r) ? Array(r[1]).fill(r[0]) : [r]);
if (ChopSound.EFFECTS.length !== Object.keys(LIVE).length) fail('effects', ChopSound.EFFECTS.length, 'recorded', Object.keys(LIVE).length);
ChopSound.EFFECTS.forEach((e, k) => {
  const want = LIVE[e.name];
  if (!want) { fail(e.name, 'was not recorded live'); return; }
  const log = ChopSound.log(L, k), s = log.speaker;
  const got = s.slice(1).map((c, i) => c - s[i]), live = flat(want);
  if (got.length !== live.length) { fail(e.name, got.length + 1, 'clicks, live', live.length + 1); return; }
  const i = got.findIndex((v, j) => v !== live[j]);
  if (i >= 0) fail(e.name, 'spacing', i, 'is', got[i], 'cycles, live', live[i]);
  if (!(log.end > s[s.length - 1])) fail(e.name, 'ends before its last click');
});
if (bad) { console.log(bad + ' differ'); process.exit(1); }
console.log('test_sound: all ' + ChopSound.EFFECTS.length + ' effects click as the game did in Apple2TS');
