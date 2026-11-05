'use strict';
// How it works (index.html) on a clean checkout:
// - the frames of a race it carries are the Play tab's (port/scripts/race-frame.js), the same byte
//   for byte, and each, put together as the page does (its block race-frame) and drawn by
//   site/lib/c64.js, is the Play tab's frame pixel for pixel; the frames it marks as a new view are
//   those where the interrupt shows the other bitmap;
// - the odds of the races the player does not drive (its block race-odds) are what the port's
//   RACE_RESULT ($E92C) gives, counted over every roll of the two ratings (RACE_OTHERS: the base at
//   $E8B6 plus 0 to 63), both sides of the coin on a tie and all 256 of the fastest lap's draw, for
//   every pair of the computer's drivers.
//   node games/c64/stunt-car-racer/test_index.js
const fs = require('fs'), path = require('path');
const { graphics } = require('./port/scripts/race-frame.js');
const { load } = require('./port/scripts/page-machine.js');
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const page = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = /<script type="application\/json" id="hw-data">([^<]*)<\/script>/.exec(page);
if (!m || !m[1]) { console.log('FAIL: index.html carries no frames (hw-data)'); process.exit(1); }
const carried = JSON.parse(m[1]);
const made = graphics(__dirname), passes = made._passes;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
if (!same(carried, made.index)) fail('the frames index.html carries differ from the Play tab\'s');
else console.log('ok   the ' + passes.length + ' frames index.html carries are the Play tab\'s');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
const { raceFrame } = g.run('index.html', 'race-frame', 'raceFrame');
const { raceOdds } = g.run('index.html', 'race-odds', 'raceOdds');
let drawn = 0;
passes.forEach((F, i) => {
  const a = C64.renderFrame(F).px, b = C64.renderFrame(raceFrame(carried, i ? carried.views[i - 1] : null)).px;
  let n = 0;
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) n++;
  if (n) fail('frame ' + (i + 1) + ': ' + n + ' pixels differ from the Play tab\'s');
  else drawn++;
});
const flips = carried.shown.filter((v, i) => i && v !== carried.shown[i - 1]).length;
if (drawn === passes.length) console.log('ok   ' + drawn + ' frames drawn from what the page carries are the Play tab\'s, pixel for pixel; ' + flips + ' new views among them');
if (!flips) fail('none of the frames shows a new view');
// the odds against the port's RACE_RESULT
{
  const { SCRPage, data, cost } = load(__dirname);
  const rt = SCRPage.create({ data, cost }), M = rt.M, P = rt.P;
  const L = g.listing(), base = Array.from(L.ram.subarray(0xE8B6, 0xE8C1));
  const real = P.RANDOM;
  let worst = 0, pairs = 0;
  for (let a = 0; a < 11; a++) for (let b = 0; b < 11; b++) {
    if (a === b) continue;
    // the first of the pair at $C771, the second at $C772; the player's driver (11) in neither
    let win = 0, lap = 0, n = 0;
    for (let u = 0; u < 64; u++) for (let v = 0; v < 64; v++) {
      const tie = ((base[a] + u) & 255) === ((base[b] + v) & 255);
      for (let coin = 0; coin < (tie ? 2 : 1); coin++) {
        const w = tie ? 128 : 256;              // a tie's two sides share its weight
        for (let draw = 0; draw < 256; draw++) {
          const q = [draw, coin];
          P.RANDOM = () => ({ a: q.shift() });
          M[0xC771] = a; M[0xC772] = b; M[0x31A4] = 11; M[0xC360] = 0; M[0xC718] = 1;
          M[0xC71C + a] = (base[a] + u) & 255; M[0xC71C + b] = (base[b] + v) & 255;
          P.RACE_RESULT({});
          if (M[0x16] === a) win += w;
          if (M[0x17] === a) lap += w;
          n += w;
        }
      }
    }
    P.RANDOM = real;
    const o = raceOdds(base[a], base[b]);
    worst = Math.max(worst, Math.abs(o.win - win / n), Math.abs(o.lap - lap / n));
    pairs++;
  }
  if (worst > 1e-12) fail('the odds differ from RACE_RESULT\'s by up to ' + worst);
  else console.log('ok   the odds of all ' + pairs + ' pairings are RACE_RESULT\'s, counted over every roll, coin and draw');
}
console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
