'use strict';
// How it works (index.html) on a clean checkout:
// - the frames of a race it carries are the Play tab's (port/scripts/race-frame.js), the same byte
//   for byte, and each, put together as the page does (its block race-frame) and drawn by
//   site/lib/c64.js, is the Play tab's frame pixel for pixel; the frames it marks as a new view are
//   those where the interrupt shows the other bitmap;
// - the odds of the races the player does not drive (its block race-odds) are what the port's
//   RACE_RESULT ($E92C) gives, counted over every roll of the two ratings (RACE_OTHERS: the base at
//   $E8B6 plus 0 to 63), both sides of the coin on a tie and all 256 of the fastest lap's draw, for
//   every pair of the computer's drivers;
// - the drivers' table is the habits bytes at $AEE0 read as OPPONENT_LINE reads them, the swerves'
//   chances SWERVE's, and the top speeds every value the port's OPP_PICK draws for each track.
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
// the drivers' table and the top speeds against the game's bytes and the port's OPP_PICK
{
  const L = g.listing(), r = L.ram;
  const rows = [...page.matchAll(/<tr><td>([^<]+)<\/td><td class="m">\$([0-9A-F]{2})<\/td><td><svg[^>]*><rect[^>]*\/><circle cx="([\d.]+)"[^>]*\/><\/svg><span class="dr-n">\$([0-9A-F]{2})<\/span><\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><td class="n">(\d+) in 32<\/td><td>([^<]+)<\/td><\/tr>/g)];
  const names = [];
  for (let i = 0; i < 11; i++) names.push(String.fromCharCode(...r.subarray(0xAE01 + 16 * i, 0xAE01 + 16 * i + 12)).trim());
  let bad = 0;
  if (rows.length !== 11) { fail('the drivers\' table has ' + rows.length + ' rows'); bad++; }
  rows.forEach((m, n) => {
    const f = r[0xAEE0 + n];
    let line = f & 8 ? 0x6E : 0x40;
    if (n & 1) line ^= 0xFF;
    const want = [names[n], f, line, (line / 255 * 100).toFixed(1), f & 2 ? 'follows the player’s line' : 'pulls out to pass',
      f & 0x20 ? 'yes' : '-', f & 8 ? 'keeps its own line' : 'goes round', n + 1, f & 4 ? 'yes' : '-'];
    const got = [m[1], parseInt(m[2], 16), parseInt(m[4], 16), m[3], m[5], m[6], m[7], +m[8], m[9]];
    if (JSON.stringify(want) !== JSON.stringify(got)) { bad++; fail('the drivers\' table, row ' + (n + 1) + ': ' + JSON.stringify(got) + ', the game gives ' + JSON.stringify(want)); }
  });
  // each track's top speeds: every value OPP_PICK can draw, in the league and the Super League
  const { SCRPage, data, cost } = load(__dirname);
  const rt = SCRPage.create({ data, cost }), M = rt.M, P = rt.P, real = P.RANDOM;
  const TRACK = { 'Little Ramp': 0, 'Stepping Stones': 1, 'Hump Back': 2, 'Big Ramp': 3, 'Ski Jump': 4, 'Draw Bridge': 5, 'High Jump': 6, 'Roller Coaster': 7 };
  const speeds = [...page.matchAll(/<tr><td>([A-Za-z ]+)<\/td><td class="n">(\d+) to (\d+)<\/td><td class="n">(\d+) to (\d+)<\/td><\/tr>/g)];
  if (speeds.length !== 8) { fail('the top speeds\' table has ' + speeds.length + ' rows'); bad++; }
  for (const m of speeds) {
    for (const sl of [0, 1]) {
      let lo = 255, hi = 0;
      for (let v = 0; v < 256; v++) {
        let k = 0;
        P.RANDOM = () => ({ a: k++ < 256 ? 0 : v });
        M[0x31A1] = 0; M[0xC77D] = TRACK[m[1]]; M[0xC71A] = sl;
        P.OPP_PICK({});
        lo = Math.min(lo, M[0x2099]); hi = Math.max(hi, M[0x2099]);
      }
      if (lo !== +m[2 + 2 * sl] || hi !== +m[3 + 2 * sl]) { bad++; fail(m[1] + (sl ? ', Super League' : '') + ': the page says ' + m[2 + 2 * sl] + ' to ' + m[3 + 2 * sl] + ', OPP_PICK draws ' + lo + ' to ' + hi); }
    }
  }
  P.RANDOM = real;
  if (!bad) console.log('ok   the drivers\' habits, lines and swerves are the bytes at $AEE0, and the top speeds every value OPP_PICK draws');
}
console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
