'use strict';
// The Graphics tab (graphics.html) on a clean checkout:
// - what it carries is what the Play tab's own blocks show (port/scripts/race-frame.js): the
//   cockpit's frame of a practice race, the sprites' shapes and places, the flame's table, and the
//   frames of the opponent coming past, the same byte for byte;
// - each frame, put together as the page does (its block graphics-frame) and drawn by
//   site/lib/c64.js, is the Play tab's, pixel for pixel;
// - the page's turning of the wheels (its block wheels) steps the pictures as the port's
//   WHEELS_TURN ($FFB1) does, forwards and backwards, at every carry of the engine's count.
//   node games/c64/stunt-car-racer/test_graphics.js
const fs = require('fs'), path = require('path');
const { graphics } = require('./port/scripts/race-frame.js');
const { load } = require('./port/scripts/page-machine.js');
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const page = fs.readFileSync(path.join(__dirname, 'graphics.html'), 'utf8');
const m = /<script type="application\/json" id="gx-data">([^<]*)<\/script>/.exec(page);
if (!m || !m[1]) { console.log('FAIL: graphics.html carries no pictures (gx-data)'); process.exit(1); }
const carried = JSON.parse(m[1]);
const made = graphics(__dirname), whole = made._frames;
delete made._frames;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
for (const k of ['base', 'band', 'sprites', 'flame']) if (!same(carried[k], made[k])) fail('the page\'s ' + k + ' differs from the Play tab\'s');
if (carried.opponent.length !== made.opponent.length) fail('the page has ' + carried.opponent.length + ' frames of the opponent; the Play tab gives ' + made.opponent.length);
else {
  const bad = made.opponent.map((v, i) => same(v, carried.opponent[i]) ? -1 : i).filter(i => i >= 0);
  if (bad.length) fail('the opponent\'s frames ' + bad.map(i => i + 1).join(', ') + ' differ from the Play tab\'s');
  else console.log('ok   the cockpit, ' + Object.keys(made.sprites).length + ' sprites, the flame\'s table and ' + made.opponent.length + ' frames of the opponent are the Play tab\'s');
}
// each frame drawn from what the page carries, against the Play tab's
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
const { graphicsFrame } = g.run('graphics.html', 'graphics-frame', 'graphicsFrame');
const { wheelsFrame } = g.run('graphics.html', 'wheels', 'wheelsFrame');
let drawn = 0;
whole.forEach((F, i) => {
  const a = C64.renderFrame(F).px, b = C64.renderFrame(graphicsFrame(carried, i ? carried.opponent[i - 1] : null)).px;
  let n = 0;
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) n++;
  if (n) fail((i ? 'the opponent\'s frame ' + i : 'the cockpit') + ': ' + n + ' pixels differ from the Play tab\'s');
  else drawn++;
});
if (drawn === whole.length) console.log('ok   ' + drawn + ' frames drawn from what the page carries are the Play tab\'s, pixel for pixel');
// the wheels against the port's WHEELS_TURN
{
  const { SCRPage, data, cost } = load(__dirname);
  const rt = SCRPage.create({ data, cost }), M = rt.M;
  let seed = 7;
  const rnd = n => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 8) % n; };
  const s = { count: 0, right: 0x60, left: 0x67 };
  let count = 0, steps = 0, bad = -1;
  M[0x5FFF] = 0x60; M[0x5FFD] = 0x67;
  for (let f = 0; f < 20000 && bad < 0; f++) {
    const note = rnd(256), back = rnd(4) === 0;
    wheelsFrame(s, note, back);
    // the dashboard band's count and carry, then the port's routine
    const t = count + note; count = t & 255;
    if (t > 255) { M[0x0159] = back ? 0x80 : 0; rt.P.WHEELS_TURN({}); steps++; }
    if (s.count !== count || s.right !== M[0x5FFF] || s.left !== M[0x5FFD]) bad = f;
  }
  if (bad >= 0) fail('the wheels: at frame ' + bad + ' the page has $' + s.right.toString(16) + ' and $' + s.left.toString(16) + ', the port $' + M[0x5FFF].toString(16) + ' and $' + M[0x5FFD].toString(16));
  else console.log('ok   the wheels step as WHEELS_TURN steps them, ' + steps + ' steps in 20,000 frames');
}
console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
