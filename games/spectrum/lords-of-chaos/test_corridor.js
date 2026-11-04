'use strict';
// The corridor that kills, on the Maps page (the block loc-corridor), against the game's own code run
// on the kit's Z80 from the committed listings, in scenario 3 with the door at row 26, column 18 open:
// - the route: classify_step ($CA2B) on every step from the doorway and from each square of the floor
//   that kills to its neighbours, for a creature with points to spare; the cheapest way through over
//   those costs, worked out here again, must cost what the page's route costs, and each of the
//   route's steps what the page says;
// - each creature type's action points and stamina as its turn starts, with no potion and under a
//   speed potion, against load_figures ($9342): $D200 (the most, on the ground) and $D201;
// - the walk: classify_step and move_selected ($B4EB) step by step along the route, for every creature
//   type, with and without the potion, from the doorway, and for a wizard of 30 to 40 action points
//   (or twice that) and 34 or 90 stamina from every square of the route: where it stops and what it
//   has left, against LOCCorridor.walk.
//   node games/spectrum/lords-of-chaos/test_corridor.js
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { memory, call } = require('./port/test/game.js');
const g = game(__dirname);
g.sameBlock('loc-map');
g.sameBlock('loc-corridor');
const { LOCMap } = g.run('levels.html', 'loc-map', 'LOCMap');
globalThis.LOCMap = LOCMap;
const { LOCCorridor: C } = g.run('levels.html', 'loc-corridor', 'LOCCorridor');

let fails = 0, cases = 0;
const fail = msg => { if (fails++ < 8) console.log('FAIL ' + msg); };
const ret = (c, M) => { c.pc = M[c.sp] | M[c.sp + 1] << 8; c.sp += 2; return true; };
const w = (M, a) => M[a] | M[a + 1] << 8;
const setw = (M, a, v) => { M[a] = v & 255; M[a + 1] = v >> 8; };
const ENT = 30, REC = 20, WIZARD = 0x8C;
const cell = (M, r, c) => w(M, 0xD030) + 36 * r + c;
const typeRecord = (M, t) => t >= 0x90 ? w(M, 0xD003) + 12 * (t - 0x90) : w(M, 0x8098) + 0x2F;

// scenario 3 with the door open, nothing in the object table, and a creature of type t of player 1's,
// entry ENT and record REC, selected on row r, column c on the ground with ap and stamina
function scene(r, c, t, ap, stamina) {
  const M = memory(3);
  M[cell(M, ...C.DOOR)] = C.OPEN;
  for (let i = 0; i < 0x91; i++) M[0x5B5A + 6 * i + 2] = 0xFF;
  const e = 0x5B5A + 6 * ENT, rec = 0x5EC0 + 5 * REC, under = M[cell(M, r, c)];
  M.set([r, c, t, under, 0xFF, REC], e);
  M.set([ap, stamina, 40, 0, 1], rec);
  M[cell(M, r, c)] = t;
  setw(M, 0x5B4D, e); M[0x5B4F] = ENT; setw(M, 0x5B50, rec); setw(M, 0x5B52, typeRecord(M, t)); M[0x5B54] = t;
  M[0x5B55] = r; M[0x5B56] = c; M[0x5B2F] = 0xFF; M[0x5B43] = 0; M[0xFF90] = under; M[0x5B44] = 0xFD; M[0x5B11] = 1;
  return M;
}
// classify_step from the selected creature's square to row r, column c: { k (the class), cost }
function classify(M, r, c) {
  M[0xFF92] = r !== M[0x5B55] && c !== M[0x5B56] ? 0x80 : 0;
  call(M, 0xCA2B, { h: c, l: r });                           // HL: L the row, H the column
  return { k: M[0xFF8F], cost: M[0xFF8E] };
}

// the route, and the cheapest way through again over the game's costs
const route = C.route(memory(3));
const last = route.length - 1;
if (last < 0) fail('the page finds no route');
{
  const M0 = memory(3);
  const deadly = (r, c) => !(r === C.DOOR[0] && c === C.DOOR[1]) && LOCMap.square(M0, r, c) === C.DEADLY;
  const key = (r, c) => r + ',' + c;
  const sources = [C.DOOR];
  for (let r = 0; r < 36; r++) for (let c = 0; c < 36; c++) if (deadly(r, c)) sources.push([r, c]);
  const edges = [];
  for (const [r, c] of sources) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const M = scene(r, c, 0x99, 255, 255), s = classify(M, r + dr, c + dc);
      cases++;
      if (s.k === 5) edges.push([key(r, c), key(r + dr, c + dc), s.cost, deadly(r, c), deadly(r + dr, c + dc)]);
      else if (s.k !== 0) fail(`classify_step from ${r},${c} to ${r + dr},${c + dc} gives class ${s.k}`);
    }
  }
  const dist = new Map([[key(...C.DOOR), 0]]);
  for (let pass = 0; pass < sources.length; pass++)
    for (const [a, b, k, , into] of edges) if (into && dist.has(a) && dist.get(a) + k < (dist.has(b) ? dist.get(b) : Infinity)) dist.set(b, dist.get(a) + k);
  let best = Infinity;
  for (const [a, b, k, from, into] of edges) if (from && !into && dist.has(a) && b !== key(...C.DOOR)) best = Math.min(best, dist.get(a) + k);
  cases++;
  if (!route.length || route[last].total !== best) fail(`the cheapest way through costs ${best} over classify_step's costs; the page's route ${route.length ? route[last].total : 'none'}`);
  // each step of the page's route, as classify_step costs it
  let at = C.DOOR, sum = 0;
  for (const p of route) {
    const s = classify(scene(at[0], at[1], 0x99, 255, 255), p.r, p.c);
    sum += s.cost; cases++;
    if (s.k !== 5 || s.cost !== p.cost || sum !== p.total) fail(`step to ${p.r},${p.c}: class ${s.k}, cost ${s.cost}, total ${sum}; the page ${p.cost}, ${p.total}`);
    at = [p.r, p.c];
  }
}

// load_figures: the creature's record (byte 3 the potion, 4 the speed potion for ten turns) and type
const figures = (t, potion) => {
  const M = memory(3);
  const e = 0x5B5A + 6 * ENT, rec = 0x5EC0 + 5 * REC, iy = typeRecord(M, t);
  for (let i = 0; i < 0x91; i++) M[0x5B5A + 6 * i + 2] = 0xFF;          // carrying nothing
  M.set([16, 16, t, 0x18, 0xFF, REC], e); setw(M, 0xFFF9, e); M[0x5B4F] = ENT; M[0x5B58] = ENT;
  M.set([0, 0, M[iy + 3], potion ? (4 << 5) | 10 : 0, 1], rec);
  M[0xD0D9] = 0;
  call(M, 0x9342, { ix: rec, iy });
  return { ap: M[0xD200], stamina: M[0xD201] };
};
// the game's walk: classify_step and move_selected from route step `from` on
function walk(t, from, ap, stamina) {
  const start = from ? [route[from - 1].r, route[from - 1].c] : C.DOOR;
  const M = scene(start[0], start[1], t, ap, stamina);
  let to = from - 1;
  for (let i = from; i <= last; i++) {
    if (classify(M, route[i].r, route[i].c).k !== 5) break;
    call(M, 0xB4EB, {}, { hooks: { 0xB148: ret } });
    if (M[0x5B55] !== route[i].r || M[0x5B56] !== route[i].c) { fail(`move_selected to ${route[i].r},${route[i].c} left the creature on ${M[0x5B55]},${M[0x5B56]}`); break; }
    to = i;
  }
  const rec = 0x5EC0 + 5 * REC;
  return { to, ap: M[rec], stamina: M[rec + 1] };
}
const same = (a, b) => a.to === b.to && a.ap === b.ap && a.stamina === b.stamina;
const show = k => `step ${k.to}, ${k.ap} action points, ${k.stamina} stamina`;

for (let t = 0x90; t < 0x90 + 25; t++) for (const potion of [false, true]) {
  const game = figures(t, potion), page = C.creature(memory(3), t, potion);
  cases++;
  if (game.ap !== page.ap || game.stamina !== page.stamina)
    fail(`type $${t.toString(16)}${potion ? ' under a speed potion' : ''}: load_figures ${game.ap} and ${game.stamina}; the page ${page.ap} and ${page.stamina}`);
  if (t === 0xA5) continue;                                   // a ghost pays 4 for any square
  const a = walk(t, 0, page.ap, page.stamina), b = C.walk(route, 0, page.ap, page.stamina);
  cases++;
  if (!same(a, b)) fail(`type $${t.toString(16)}${potion ? ' under a speed potion' : ''} from the doorway: the game ${show(a)}; the page ${show(b)}`);
}
for (let from = 0; from <= last; from++) for (let ap = 30; ap <= 40; ap++) for (const x of [1, 2]) for (const stamina of [34, 90]) {
  const a = walk(WIZARD, from, ap * x, stamina), b = C.walk(route, from, ap * x, stamina);
  cases++;
  if (!same(a, b)) fail(`a wizard with ${ap * x} action points and ${stamina} stamina from step ${from}: the game ${show(a)}; the page ${show(b)}`);
}
// the figures the page's text gives
{
  const u = C.creature(memory(3), 0x99, true), a = C.walk(route, 0, u.ap, u.stamina), b = C.walk(route, a.to + 1, 34, 34);
  cases++;
  if (route.length !== 16 || route[last].total !== 144 || u.ap !== 112 || String([route[a.to].r, route[a.to].c]) !== '24,24' || b.to !== last || b.ap !== 2)
    fail(`the corridor: ${route.length} steps, ${route[last] && route[last].total} points; a unicorn on a potion has ${u.ap} and stops at step ${a.to}; a wizard with 34 then ends at step ${b.to} with ${b.ap}`);
}

console.log(fails ? `FAIL: ${fails} of ${cases} cases differ` : `ok - ${cases} cases of the corridor that kills: its route, the creatures' figures and every walk along it worked out as the game works them`);
process.exit(fails ? 1 : 0);
