'use strict';
// The landings' damage with Fast CPU and on the C64, for the Play tab's section on Fast CPU: 16
// practice races on Little Ramp driven the same way from the same start (the stick forward, a turn
// of a few frames at a different moment in each, then the boost), each run on two copies of the
// page's machine from the hand-over, one switched to Fast CPU as the crane lets the car go. For
// each race, a spring's hardest press (WHEELS_ON_ROAD's $C35C), and the damage at the car's three
// points ($C3C3-$C3C5) and the crack ($C3CB) 1,500 frames on; then the summary. About 15 minutes.
//   node games/c64/stunt-car-racer/port/scripts/fast-landings.js
const path = require('path');
const GAME = path.resolve(__dirname, '../..'), ROOT = path.resolve(GAME, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(GAME);
globalThis.window = globalThis;
g.lib('c64'); g.lib('fast-cpu');
const PAGE = 'play.html', page = g.read(PAGE);
for (const m of page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)) g.run(PAGE, m[1], 'SCRPort');
const { SCRPage, FastCPU, SCR_FAST, SCRFast } = globalThis;
const cost = JSON.parse(/^window\.SCR_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="scr-data">([^<]*)<\/script>/.exec(page)[1]);
const FRAME_MS = 1000 * SCRPage.FRAME / SCR_FAST.hz;
const J = { none: 0x1F, up: 0x1E, left: 0x1B, right: 0x17, fire: 0x0F };
const tap = (joy, hold = 8, after = 40) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
const TO_RACE = [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...type('A'), ...type('C'), ...type('E'), ...type('RETURN'), { frames: 200 },
  ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 600 }];
const flat = s => s.reduce((L, x) => (L.push(...Array(x.frames).fill(x)), L), []);
const set = (rt, s) => { rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy; };
const START = flat(TO_RACE).length + 180;              // the race's start: the fire held 180 frames

const rows = [];
for (let i = 0; i < 16; i++) {
  const S = flat([...TO_RACE, { frames: 180, joy: J.fire }, { frames: 300 + 80 * i, joy: J.up },
    { frames: 6 + (i % 4) * 4, joy: J.up & (i % 2 ? J.left : J.right) }, { frames: 100, joy: J.up & J.fire }, { frames: 3000, joy: J.up }]);
  const a = SCRPage.create({ data, cost }), b = SCRPage.create({ data, cost });
  const fx = SCRFast.extend(FastCPU.attach(b, SCR_FAST));
  const press = [0, 0];
  [a, b].forEach((rt, k) => { const w = rt.P.WHEELS_ON_ROAD; rt.P.WHEELS_ON_ROAD = function (...x) { const r = w.apply(this, x); press[k] = Math.max(press[k], rt.M[0xC35C]); return r; }; });
  for (let f = 0; f < START; f++) { set(a, S[f]); set(b, S[f]); a.runFrame(); b.runFrame(); }
  FastCPU.set(fx, true);
  for (let f = START; f < START + 1500; f++) { set(a, S[f]); set(b, S[f]); a.runFrame(); FastCPU.run(fx, FRAME_MS); }
  const dmg = M => [M[0xC3C3] + M[0xC3C4] + M[0xC3C5], M[0xC3CB]];
  const r = { c64: dmg(a.M), fast: dmg(b.M), press };
  rows.push(r);
  console.log('race ' + (i + 1) + ': the hardest press ' + press[0] + ' on the C64, ' + press[1] + ' with Fast CPU; damage ' + r.c64[0] + ' and ' + r.fast[0] + ', the crack ' + r.c64[1] + ' and ' + r.fast[1]);
}
const mean = f => (rows.reduce((s, r) => s + f(r), 0) / rows.length).toFixed(1);
const range = k => Math.min(...rows.map(r => r.press[k])) + ' to ' + Math.max(...rows.map(r => r.press[k]));
console.log('the hardest press: ' + range(0) + ' on the C64, ' + range(1) + ' with Fast CPU');
console.log('damage on average: ' + mean(r => r.c64[0]) + ' on the C64, ' + mean(r => r.fast[0]) + ' with Fast CPU; more with Fast CPU in ' +
  rows.filter(r => r.fast[0] > r.c64[0]).length + ' races, less in ' + rows.filter(r => r.fast[0] < r.c64[0]).length);
console.log('the crack on average: ' + mean(r => r.c64[1]) + ' on the C64, ' + mean(r => r.fast[1]) + ' with Fast CPU');
