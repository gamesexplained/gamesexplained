#!/usr/bin/env node
// Hold the map on the Maps / levels tab against the game's own tables, read from the committed
// listing.json with the page's CAUI helpers. A room that a status rule takes the player straight
// out of is not drawn, so an exit or a move into it counts as one to wherever that rule sends the
// player. Every solid line must be an exit in the exit table between its two rooms, and every exit
// for a direction (or UP, DOWN, IN, OUT, CLIMB and their kind) between two drawn rooms must have a
// line. Every dashed line must be a command rule that goes to one of its rooms, from the other or
// with no room condition at all, and every command rule for such a word that moves the player
// between two drawn rooms must have a line, but for the magic word PLOVER and the falls from the
// stalactite, which the map writes beside the room. A word that names a place needs no line. Every room left off must be one a status rule takes the player out
// of; the lit rooms and the rooms where a treasure lies at the start must match the game's.
//   node games/c64/classic-adventure/test_map.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const html = g.read('levels.html');
const T = g.run('levels.html', 'adventure.js', 'CAPort').CAPort.T;
const U = g.run('levels.html', 'adventure-ui.js', 'CAUI').CAUI;
const MOVE = new Set('N S E W NE NW SE SW UPWA D INWA OUT ENTE CLIM FORW LEFT RIGH ACRO OVER CROS JUMP'.split(' '));
const MAGIC = new Set(['XYZY', 'PLUG', 'PLOV']);
// command-rule moves the map writes as text beside the room instead of drawing
const WRITTEN = new Set(['33-100', '100-33', '111-45', '111-50', '111-53']);

let bad = 0;
const fail = (...what) => { if (bad++ < 20) console.log('MAP', ...what); };
C64.load('listing.json').then(G => {
  const M = G.ram, N = 140, OBJ = k => T.OBJ - 2 + 2 * k;
  const a0 = html.indexOf('<svg class="ca-map"'), svg = html.slice(a0, html.indexOf('</svg>', a0));
  if (a0 < 0) { console.log('levels.html: no map'); process.exit(1); }
  const drawn = new Set([...svg.matchAll(/data-room="(\d+)"/g)].map(m => +m[1]));
  const lines = [...svg.matchAll(/<path class="([xrd])" data-a="(\d+)" data-b="(\d+)"/g)].map(m => ({ kind: m[1], a: +m[2], b: +m[3] }));
  const key = (a, b) => Math.min(a, b) + '-' + Math.max(a, b);
  const lineOf = new Map(lines.map(l => [key(l.a, l.b), l]));
  const rules = kind => Array.from({ length: U.ruleCount(kind) }, (_, i) => U.rule(M, kind, i));
  const roomOf = R => (R.conds.find(([c]) => c === 0) || [])[1];
  const goes = R => R.acts.filter(([c]) => c === 6).map(([, a]) => a);
  // the status rules that take the player out of a room the moment they arrive
  const out = {};
  for (const R of rules('status')) { const r = roomOf(R); if (r !== undefined && !drawn.has(r)) for (const t of goes(R)) (out[r] = out[r] || []).push(t); }
  for (let n = 1; n <= N; n++) if (!drawn.has(n) && !out[n]) fail(`room ${n} is not drawn, and no status rule takes the player out of it`);
  const land = (n, depth = 0) => drawn.has(n) || n === 0 || depth > 4 || !out[n] ? [n] : out[n].flatMap(t => land(t, depth + 1));
  const syn = w => U.wordName(M, w).split('/').map(s => s.slice(0, 4));
  // exits
  const exits = new Map();
  for (let r = 1; r <= N; r++) if (drawn.has(r)) for (const e of U.exits(M, r)) {
    const ws = syn(e.word); if (ws.some(w => MAGIC.has(w))) continue;
    for (const t of land(e.to)) if (drawn.has(t) && t !== r) {
      const k = key(r, t); exits.set(k, (exits.get(k) || false) || ws.some(w => MOVE.has(w)));
    }
  }
  for (const [k, move] of exits) if (move && !lineOf.has(k)) fail(`no line for the exit ${k}`);
  for (const l of lines) if (l.kind !== 'r' && !exits.has(key(l.a, l.b))) fail(`line ${l.a}-${l.b} is drawn as an exit, and the table has none`);
  // rule moves
  const moves = new Set();
  for (const R of rules('command')) {
    const from = roomOf(R);
    for (const g of goes(R)) for (const t of land(g)) {
      if (!drawn.has(t)) continue;
      if (from === undefined) { moves.add('*-' + t); continue; }
      if (!drawn.has(from) || from === t) continue;
      moves.add(from + '-' + t);
      if (syn(R.verb).some(w => MOVE.has(w)) && !lineOf.has(key(from, t)) && !WRITTEN.has(from + '-' + t)) fail(`no line for rule ${R.i}, room ${from} to ${t}`);
    }
  }
  for (const l of lines) if (l.kind === 'r' && ![l.a + '-' + l.b, l.b + '-' + l.a, '*-' + l.a, '*-' + l.b].some(m => moves.has(m))) fail(`dashed line ${l.a}-${l.b} has no rule behind it`);
  // lit rooms and treasures
  const lit = new Set(Array.from({ length: 13 }, (_, y) => M[T.LIT + y]));
  const tr = new Set(); for (let k = 1; k <= 78; k++) if (M[OBJ(k) + 1] & 0x10 && M[OBJ(k)]) tr.add(M[OBJ(k)]);
  for (const m of svg.matchAll(/<g class="n( lit)?" data-room="(\d+)"[^>]*>(.*?)<\/g>/g)) {
    const n = +m[2];
    if (!!m[1] !== lit.has(n)) fail(`room ${n} is drawn ${m[1] ? 'lit' : 'dark'}`);
    if (m[3].includes('class="tr"') !== tr.has(n)) fail(`room ${n}'s treasure mark`);
  }
  if (bad) { console.log(`FAIL: ${bad} difference(s) between the map and the game's tables`); process.exit(1); }
  console.log(`ok: the map's ${drawn.size} rooms and ${lines.length} lines match the exit table, the rules and the starting objects`);
}, err => { console.log('could not load listing.json:', err.message); process.exit(1); });
