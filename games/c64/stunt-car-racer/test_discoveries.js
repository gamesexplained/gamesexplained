'use strict';
// Discoveries (discoveries.html) on a clean checkout: the bytes its sections show (its block bytes)
// are the game's, from listing.json; the scrambled name reads as the page says; in a race the
// alert's first 64 bytes hold the flame from $6B60; the checksum's ranges are the
// table at $42A9; and the odds the page quotes are How it works' (its block race-odds, which
// test_index.js holds to the port's RACE_RESULT).
//   node games/c64/stunt-car-racer/test_discoveries.js
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const ok = w => console.log('ok   ' + w);
const B = g.run('discoveries.html', 'bytes', 'CRAMMOND', 'ALERT', 'FLAME', 'SETTINGS', 'RANGES');
const L = g.listing();
const at = (a, n) => Array.from(L.ram.subarray(a, a + n));
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
for (const [name, a] of [['CRAMMOND', 0xAFE0], ['ALERT', 0x7F40], ['FLAME', 0x6B60], ['SETTINGS', 0xBFEA]]) {
  if (!same(B[name], at(a, B[name].length))) fail(name + ' is not the listing\'s bytes from $' + a.toString(16).toUpperCase());
  else ok(name + ': ' + B[name].length + ' bytes from $' + a.toString(16).toUpperCase() + ', the listing\'s');
}
const name = String.fromCharCode(...B.CRAMMOND.map(b => b ^ 0xAA));
if (name !== 'COPYRIGHT GEOFF CRAMMOND 1988') fail('the name reads "' + name + '"'); else ok('the name reads ' + name);
const text = String.fromCharCode(...B.ALERT);
if (!/^[ -~]+$/.test(text) || !text.endsWith('][ Yes | No ]')) fail('the alert reads "' + text + '"'); else ok('the alert is text, ending with its buttons');
const ranges = [];
for (let x = 0; x <= 0x18; x += 4) ranges.push([L.ram[0x42A9 + x] | L.ram[0x42AA + x] << 8, ((L.ram[0x42AB + x] | L.ram[0x42AC + x] << 8) - 1) & 0xFFFF]);
if (!same(ranges, B.RANGES)) fail('the ranges are not the table at $42A9: ' + JSON.stringify(ranges)); else ok('the checksum\'s seven ranges are the table at $42A9');
// in a race, $7F40 holds the flame: the Graphics tab's sprite $FD, which test_graphics.js holds to
// the Play tab's race
{
  const gx = JSON.parse(/<script type="application\/json" id="gx-data">([^<]*)<\/script>/.exec(g.read('graphics.html'))[1]);
  if (!same(Array.from(Buffer.from(gx.sprites.fd, 'base64')), B.FLAME)) fail('in a race $7F40 does not hold the flame');
  else ok('in a race $7F40 holds the flame from $6B60');
}
// the odds the page quotes
{
  const { raceOdds } = g.run('index.html', 'race-odds', 'raceOdds');
  const dd = 1 - raceOdds(120, 60).win, hf = 1 - raceOdds(120, 50).win;
  if (dd !== 1 / 512 || hf !== 0) fail('Dare Devil beats Hot Rod ' + dd + ' of the time and High Flyer ' + hf);
  else ok('Dare Devil beats Hot Rod once in 512 races and High Flyer never');
}
console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
