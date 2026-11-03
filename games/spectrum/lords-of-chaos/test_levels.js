'use strict';
// What the Maps page (levels.html) reads from each scenario (the block loc-levels) against the game's
// own code, run on the kit's Z80 from the committed listings:
// - the whole map LOCMap.whole draws, against LOCMap.window over the same squares (test_map.js holds
//   window to the game's own drawing);
// - the scenario's own things, against the entries start_hook ($D01B) fills;
// - every waypoint of every route, against route_address ($997F) and waypoint_square ($9971);
// - every trip square, against the groups trip_square ($A716) releases when each square of the
//   map changes;
// - scenario 3's teleports and trap floors, against floor_traps ($E324) on every square, and the
//   floor and altar that kill, against deadly_floors ($E3C9).
//   node games/spectrum/lords-of-chaos/test_levels.js
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { memory, call } = require('./port/test/game.js');
const g = game(__dirname);
g.sameBlock('loc-map');
g.sameBlock('loc-levels');
const { LOCMap } = g.run('levels.html', 'loc-map', 'LOCMap');
globalThis.LOCMap = LOCMap;
const { LOCLevels } = g.run('levels.html', 'loc-levels', 'LOCLevels');

let fails = 0, cases = 0;
const fail = msg => { if (fails++ < 10) console.log('FAIL ' + msg); };
const ret = (c, M) => { c.pc = M[c.sp] | M[c.sp + 1] << 8; c.sp += 2; return true; };
const stop = c => { c.pc = 0; return true; };
const img = (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(4 * w * h) });

for (const n of [1, 2, 3]) {
  const L = g.listing('parts/scenario-' + n + '/listing.json');
  const M = memory(n);
  const S = LOCLevels.scenario(M, L.sym);

  // the whole map against the 7 by 7 windows that tile it
  const whole = img(864, 864);
  LOCMap.whole(M, whole);
  for (let r0 = 0; r0 < 36; r0 += 7) for (let c0 = 0; c0 < 36; c0 += 7) {
    const W = M.slice(), win = img(168, 168);
    LOCMap.window(W, r0, c0);
    LOCMap.paint(W, win, 0, 0, 21, 21, 0, 0);
    for (let y = 0; y < 168; y++) for (let x = 0; x < 168; x++) {
      const r = r0 + (y / 24 | 0), c = c0 + (x / 24 | 0);
      if (r > 35 || c > 35) continue;
      const a = 4 * (y * 168 + x), b = 4 * ((24 * r + y % 24) * 864 + 24 * c + x % 24);
      if (win.data[a] !== whole.data[b] || win.data[a + 1] !== whole.data[b + 1] || win.data[a + 2] !== whole.data[b + 2]) {
        fail(`scenario ${n}: the whole map differs from the window at row ${r}, column ${c}`); y = x = 999;
      }
    }
    cases++;
  }

  // the things: start_hook fills the entries ($5B5A, six bytes each) from 4 on
  const T = M.slice();
  call(T, L.sym('start_hook'));
  const byEntry = new Map(S.things.map(t => [t.e, t]));
  for (let e = 0; e < 145; e++) {
    const a = 0x5B5A + 6 * e, t = byEntry.get(e);
    cases++;
    if (T[a + 2] === 0xFF) { if (t) fail(`scenario ${n}: entry ${e} empty, the page has ${S.name(t.t)}`); continue; }
    if (!t) { if (e >= 4) fail(`scenario ${n}: entry ${e} holds type $${T[a + 2].toString(16)}, the page has nothing`); continue; }
    if (T[a] !== t.r || (T[a + 1] & 0x3F) !== t.c || T[a + 2] !== t.t || T[a + 4] !== t.by || T[a + 5] !== t.b5)
      fail(`scenario ${n}: entry ${e} differs: game ${[...T.subarray(a, a + 6)]}, page ${t.r},${t.c},${t.t},${t.by},${t.b5}`);
  }

  // every waypoint of every route, as computer_choose_target finds it
  S.routes.forEach((route, k) => route.forEach((w, i) => {
    const R = M.slice();
    const c = call(R, 0x997F, { a: k });
    const at = (c.h << 8 | c.l) + i;
    const d = call(R, 0x9971, { a: R[at] });
    const page = S.waypoint(w);
    cases++;
    if (R[at] !== w || d.e !== page[0] || d.d !== page[1]) fail(`scenario ${n}, route ${k}, step ${i}: game waypoint ${R[at]} at ${d.e},${d.d}, page ${w} at ${page}`);
  }));

  // the trip squares: change each square of the map and see which groups wake
  for (let r = 0; r < 36; r++) for (let c = 0; c < 36; c++) {
    const R = M.slice();
    call(R, 0xA716, { e: r, d: c });
    const game = [], page = [];
    for (let a = L.sym('independents'), i = 0; R[a] !== 0xFE; a += 4, i++)
      if ((M[a + 3] & 0x40) && !(R[a + 3] & 0x40)) game.push(R[a]);
    for (const [y, x, grp] of S.trips) if (y === r && x === c) for (const t of LOCLevels.woken(S, grp)) page.push(t.e);
    cases++;
    if (game.sort((a, b) => a - b).join() !== [...new Set(page)].sort((a, b) => a - b).join())
      fail(`scenario ${n}, a change at ${r},${c} wakes entries ${game} in the game, ${page} on the page`);
  }

  if (n !== 3) continue;
  // floor_traps: a creature on the ground ($5B2F $FF) steps onto each square ($5B55, $5B56) with the
  // terrain there ($FF91); a teleport asks square_free about where it leads ($5B23), a trap floor
  // writes what it spreads ($5B10) before listing the neighbours
  for (let r = 0; r < 36; r++) for (let c = 0; c < 36; c++) {
    const R = M.slice();
    R[0x5B2F] = 0xFF; R[0x5B55] = r; R[0x5B56] = c; R[0xFF91] = LOCMap.square(M, r, c);
    let to = null, spread = null;
    call(R, 0xE324, {}, { hooks: {
      0x83A6: (cpu, R) => { to = [R[0x5B23], R[0x5B24]]; return stop(cpu); },
      0x90A8: (cpu, R) => { spread = R[0x5B10]; return stop(cpu); },
    } });
    const s = S.secrets.filter(s => s.r === r && s.c === c);
    const tele = s.find(s => s.to), v = LOCMap.square(M, r, c);
    cases++;
    if (String(to) !== String(tele ? tele.to : null)) fail(`scenario 3, a step onto ${r},${c}: the game teleports to ${to}, the page ${tele && tele.to}`);
    if (!tele) {
      const trap = v >= 0x28 && v <= 0x2A ? M[L.sym('trap_terrain') + v - 0x28] : null;
      const said = s.find(s => /trap floor/.test(s.what));
      if (spread !== trap || !!said !== (trap !== null) || (said && !said.what.endsWith(S.name(trap))))
        fail(`scenario 3, a step onto ${r},${c}: the game spreads ${spread}, the page says ${said && said.what}`);
    }
  }
  // deadly_floors: a creature on the ground standing on each terrain
  for (let v = 0; v < 0x50; v++) {
    const R = M.slice(), hits = [], doors = [];
    call(R, 0xE3C9, {}, { hooks: {
      0x7889: (cpu, R) => { cpu.f |= 0x40; return ret(cpu, R); },
      0x788E: (cpu, R) => { cpu.a = v; return ret(cpu, R); },
      0x7755: (cpu, R) => { hits.push(cpu.a); return ret(cpu, R); },
      0x6749: ret,
      0x7BC9: (cpu, R) => { doors.push([R[0xFF88], R[0xFF89], R[0x5B10]]); return ret(cpu, R); },
    } });
    cases++;
    const kills = hits.includes(255), page = S.secrets.some(s => LOCMap.square(M, s.r, s.c) === v && /kills|dies/.test(s.what));
    if (kills !== page) fail(`scenario 3, terrain $${v.toString(16)}: the game ${kills ? 'kills' : 'spares'} the creature, the page ${page ? 'says it dies' : 'says nothing'}`);
    const want = v === 0x0A ? S.secrets.filter(s => /altar turns/.test(s.what)).map(s => [s.r, s.c, 0x1F]) : [];
    if (JSON.stringify(doors) !== JSON.stringify(want)) fail(`scenario 3, terrain $${v.toString(16)}: the game sets ${JSON.stringify(doors)}, the page ${JSON.stringify(want)}`);
  }
}

console.log(fails ? `FAIL: ${fails} of ${cases} cases differ`
  : `ok - ${cases} cases of the three maps, their things, routes, trip squares and scenario 3's traps read as the game reads them`);
process.exit(fails ? 1 : 0);
