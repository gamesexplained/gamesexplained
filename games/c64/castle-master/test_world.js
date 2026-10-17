#!/usr/bin/env node
// Hold the Maps tab's reading of the castle's database against the game's code. levels.html's
// cm-world block (castleWorld, castleShape) reads the 34 areas, their objects and their scripts
// from the listing's memory; the game's own routines, run on the kit's simulator over the same
// memory, must agree:
// - SELECT_AREA ($76D0), for every area id, installs the header the page reads: the sky and floor
//   byte, the object count, the object list (header + 8), the condition list, the scale, the
//   attribute byte and the 16-byte name. Its last call, $7C5A, then leaves visible exactly the
//   shared objects the page's list for that area names.
// - FIND_OBJECT_BY_ID ($621C), asked for every object of every area by area and id, finds the
//   record the page put there.
// - QUEUE_PYRAMID_OBJECT ($2F21), run up to its view-volume test ($3278) for every one of the 62
//   pyramids, with the object's box given as its bounds and the player at the origin, builds the
//   eight corners the page draws, each a multiple of 64.
// - Every script's tokens fill its declared length exactly, and every opcode used has a length in
//   FCL_TOKEN_LENGTHS ($13AE).
// index.html and discoveries.html carry the same block, and must carry it unchanged.
// It exits 1 on any difference.
//   node games/c64/castle-master/test_world.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'levels.html';
const { castleWorld, castleShape } = g.run(page, 'cm-world', 'castleWorld', 'castleShape');
const L = g.listing();
let bad = 0, checks = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const want = (ok, ...w) => { checks++; if (!ok) fail(...w); };
const W = castleWorld(L.ram.slice());
const sym = (n) => { const a = L.sym(n); if (a == null) throw new Error('no symbol ' + n); return a; };
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
const fresh = () => new CPU(L.ram.slice(), { port: { dir: 0x2F, data: 0x35 }, io });
const w16 = (m, a) => m[a] | m[a + 1] << 8;

want(W.areas.length === 34, 'areas', W.areas.length);
want(W.areas.reduce((n, a) => n + a.count, 0) === 546, 'objects');

// SELECT_AREA and the shared objects it shows
const shared = W.areas.find((a) => a.id === 255);
for (const a of W.areas) {
  const cpu = fresh(), m = cpu.m;
  cpu.call(sym('INSTALL_GLOBAL_DATABASE_POINTERS'), {});     // as a new session does first ($4E4A)
  m[sym('CURRENT_AREA_ID')] = a.id;
  cpu.call(sym('SELECT_AREA'), {});
  const tag = 'area ' + a.id;
  want(m[sym('AREA_SKY_FLOOR_COLORS')] === a.fill, tag, 'sky and floor');
  want(m[sym('CURRENT_AREA_OBJECT_COUNT')] === a.count, tag, 'count');
  want(w16(m, sym('CURRENT_AREA_OBJECT_LIST_PTR')) === a.at + 8, tag, 'object list');
  want(w16(m, sym('CURRENT_AREA_CONDITION_LIST_PTR')) === a.conditions.at, tag, 'conditions');
  want(m[sym('CURRENT_AREA_SCALE')] === a.scale, tag, 'scale');
  want(m[0x2437] === a.attr, tag, 'attribute');
  if (a.id !== 255) {
    const name = String.fromCharCode(...m.slice(0x2419, 0x2429)).slice(1).trim();
    want(name === a.name, tag, 'name', JSON.stringify(name), JSON.stringify(a.name));
    const list = a.objects.find((o) => o.shows), shows = new Set(list ? list.shows : []);
    for (const o of shared.objects) {
      const visible = (m[o.at] & 0x40) === 0;
      want(visible === shows.has(o.id), tag, 'shared object', o.id, visible ? 'visible' : 'hidden');
    }
  }
}

// FIND_OBJECT_BY_ID, by area and id
for (const a of W.areas) {
  const seen = new Set();
  for (const o of a.objects) {
    if (seen.has(o.id)) continue;
    seen.add(o.id);
    const cpu = fresh(), m = cpu.m;
    m[sym('LOOKUP_OBJECT_ID')] = o.id;
    cpu.call(sym('FIND_OBJECT_BY_ID'), { a: a.id });
    want(cpu.a === 0 && (m[0x7C] | m[0x7D] << 8) === o.at, 'area', a.id, 'object', o.id, 'found at', (m[0x7C] | m[0x7D] << 8).toString(16));
  }
}

// QUEUE_PYRAMID_OBJECT's corners
let pyramids = 0;
const BOUNDS = 0x0340;
for (const a of W.areas) for (const o of a.objects) {
  if (o.type < 4 || o.type > 9) continue;
  pyramids++;
  const cpu = fresh(), m = cpu.m;
  for (let k = 0; k < 3; k++) {
    const lo = o.pos[k] * 64, hi = (o.pos[k] + o.ext[k]) * 64;
    m[BOUNDS + 4 * k] = lo & 255; m[BOUNDS + 4 * k + 1] = lo >> 8;
    m[BOUNDS + 4 * k + 2] = hi & 255; m[BOUNDS + 4 * k + 3] = hi >> 8;
  }
  m[0x10AA] = BOUNDS & 255; m[0x10AB] = BOUNDS >> 8;
  m[0x108F] = o.at & 255; m[0x1090] = o.at >> 8;
  m[0x1068] = o.type;
  cpu.call(0x2F21, {}, { hooks: { 0x3278: () => true } });
  const game = [];
  for (let v = 0; v < 8; v++) game.push([0, 1, 2].map((k) => w16(m, 2 + 6 * v + 2 * k)).join(','));
  const lines = castleShape(o), pts = new Set();
  for (const l of lines) for (const p of l) pts.add(p.map((c) => c * 64).join(','));
  const g8 = [...new Set(game)].sort().join(' '), p8 = [...pts].sort().join(' ');
  want(g8 === p8, 'area', a.id, 'pyramid', o.id, 'type', o.type, 'game', g8, 'page', p8);
}
want(pyramids === 62, 'pyramids', pyramids);

// scripts
const streams = [];
for (const a of W.areas) {
  for (const o of a.objects) if (o.script) streams.push(o.script);
  streams.push(...a.conditions.streams);
}
streams.push(...W.global.streams);
for (const s of streams) {
  const used = s.tokens.reduce((n, t) => n + 1 + t.args.length, 0);
  want(!s.tokens.some((t) => t.bad) && used === s.len, 'script at', s.at.toString(16), used, s.len);
}
want(streams.length === 193, 'streams', streams.length);
want(streams.reduce((n, s) => n + s.tokens.length, 0) === 809, 'tokens');

// every page's copy of the block
g.sameBlock('cm-world', page);
console.log(`${checks} checks: 34 areas through SELECT_AREA, every object through FIND_OBJECT_BY_ID, ${pyramids} pyramids through QUEUE_PYRAMID_OBJECT, ${streams.length} scripts`);
if (bad) { console.log(bad + ' differ'); process.exit(1); }
console.log('the page reads the database as the game does');
