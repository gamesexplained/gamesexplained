'use strict';
// When the computer's car's front wheel hops in a race (the Opponents tab, section 05): the Play
// tab's machine (page-machine.js) starts the Racing Season and its first race on Little Ramp, as
// opponents-data.js does, with the player holding the stick forward, and the driver ($C773) made
// each of the three with bit 2 in their habits (4 Big Ed, 5 Max Boost, 7 High Flyer). Each pass of
// the race OPP_WHEELS ($21DE) rolls RANDOM for a hop only while the front wheel's speed and its
// change are both 0 to 3; a roll whose low four bits are 0 sets the wheel's speed up to $A0
// ($07DE). It prints, for each driver, the race's passes, the passes with a roll, and each hop's
// pass, piece and speed ($D7).
//   node bounce-race.js
const path = require('path');
const DIR = path.resolve(__dirname, '../..');
const { SCRPage, data, cost } = require('./page-machine.js').load(DIR);
const J = { none: 0x1F, up: 0x1E, down: 0x1D, fire: 0x0F };
const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
const NAME = [...type('A'), ...type('C'), ...type('E'), ...type('RETURN')];
const tap = (joy, hold = 8, after = 40) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
const MENUS = [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...NAME, { frames: 200 }, ...tap(J.fire), { frames: 100 }];
const SEASON = [...MENUS, ...tap(J.down), { frames: 60 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire),
  { frames: 300 }, ...tap(J.fire), { frames: 300 }];
const RACE_FRAMES = 4200;
const drive = (rt, steps) => {
  for (const s of steps) {
    rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy;
    for (let i = 0; i < s.frames; i++) rt.runFrame();
  }
};
for (const d of [4, 5, 7]) {
  const rt = SCRPage.create({ data, cost }), M = rt.M, P = rt.P;
  drive(rt, SEASON);
  const hops = [], wheels = P.OPP_WHEELS;
  let passes = 0, rolls = 0;
  P.OPP_WHEELS = r => {
    M[0xC773] = d;
    const v = M[0x07DE], random = P.RANDOM;
    let rolled = false, hit = false;
    P.RANDOM = q => { const o = random(q); rolled = true; hit = !(o.a & 0x0F); return o; };
    let o;
    try { o = wheels(r); } finally { P.RANDOM = random; }
    if (M[0xC37C]) { passes++; if (rolled) rolls++; }
    if (hit && M[0x07DE] === 0xA0 && v !== 0xA0) hops.push({ pass: passes, piece: M[0xC375], speed: M[0xD7] });
    return o;
  };
  for (let f = 0; f < RACE_FRAMES; f++) { rt.input.keys = new Set(); rt.input.joy = J.up; rt.runFrame(); }
  console.log('driver ' + d + ': ' + passes + ' passes racing, ' + rolls + ' with the front wheel still enough to roll, ' + hops.length + ' hops' +
    (hops.length ? ': ' + hops.map(h => 'pass ' + h.pass + ' on piece ' + h.piece + ' at ' + h.speed).join(', ') : ''));
}
