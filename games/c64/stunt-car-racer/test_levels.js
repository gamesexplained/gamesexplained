'use strict';
// The Tracks tab (levels.html) on a clean checkout: the pictures it carries are the ones the Play
// tab's own blocks draw (port/scripts/track-previews.js), run in node from the loader's hand-over
// through the menus to each track's preview and each quarter of its turn, the same byte for byte;
// and each picture, drawn by site/lib/c64.js as the page draws it, is the frame the page's machine
// showed, pixel for pixel. The Play tab's port is held to the game's code by test_play.js and the
// port's lockstep.
//   node games/c64/stunt-car-racer/test_levels.js
const fs = require('fs'), path = require('path');
const { previews } = require('./port/scripts/track-previews.js');
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const page = fs.readFileSync(path.join(__dirname, 'levels.html'), 'utf8');
const m = /<script type="application\/json" id="sl-data">([^<]*)<\/script>/.exec(page);
if (!m || !m[1]) { console.log('FAIL: levels.html carries no pictures (sl-data)'); process.exit(1); }
const carried = JSON.parse(m[1]);
const whole = [];
const made = previews(__dirname, whole);
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { trackFrame } = game(__dirname).run('levels.html', 'tracks-frame', 'trackFrame');
if (carried.tracks.length !== made.tracks.length) fail('levels.html has ' + carried.tracks.length + ' tracks; the Play tab draws ' + made.tracks.length);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
if (!same(carried.base, made.base)) fail('the frame the pictures are drawn over differs from the Play tab\'s');
for (const [i, t] of made.tracks.entries()) {
  const c = carried.tracks[i];
  if (!c) continue;
  if (c.name !== t.name || !same(c.stats, t.stats)) fail(t.name + ': its name or figures differ: ' + JSON.stringify([c.name, c.stats]) + ' against ' + JSON.stringify([t.name, t.stats]));
  const bad = t.views.map((v, q) => same(v, c.views[q]) ? -1 : q).filter(q => q >= 0);
  if (bad.length) fail(t.name + ': the pictures ' + bad.map(q => q + 1).join(', ') + ' differ from the Play tab\'s');
  else console.log('ok   ' + t.name + ': its figures and its ' + t.views.length + ' pictures are the Play tab\'s');
}
// each picture as the page puts it together, drawn, against the frame the Play tab's machine showed
let drawn = 0;
for (const { track, view, frame } of whole) {
  if (!carried.tracks[track] || !carried.tracks[track].views[view]) continue;
  const a = C64.renderFrame(frame).px, b = C64.renderFrame(trackFrame(carried, track, view)).px;
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  if (n) fail(made.tracks[track].name + ', picture ' + (view + 1) + ': ' + n + ' pixels differ from the Play tab\'s frame');
  else drawn++;
}
if (drawn) console.log('ok   ' + drawn + ' pictures drawn from what the page carries are the Play tab\'s frames, pixel for pixel');
console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
