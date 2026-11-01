#!/usr/bin/env node
// Hold the map on the Rooms tab against the game's own code. levels.html's hulk-map block (HulkMap)
// reads the ways between rooms from the database, and its drawing gives each room a box, and each
// way a line between two boxes or a note in both.
//   1. Every room from 1 to 20 has a box in a place of its own; every way has a line, or a note in
//      the room it leaves (after ▸) and in the room it reaches (after ◂); every line is a way.
//   2. Every way is one the game takes. The game's code from the committed listing.json, on the
//      kit's simulator with the KERNAL and the drive as hooks (test_play.js's gameSide), is played
//      to its first "What shall I do?". For each way, from there: the player is put in its room,
//      what its action tests is put in place (each item where the action wants it, each flag set
//      or clear), and its words are typed: GO and the direction, the verb and noun, or LOOK for a way
//      the game takes by itself. Every store to the room ($1C22) is recorded, and the way's room
//      must be among them. A way taken on some turns in 100 is tried with other raster values,
//      which the game's chances read, until it is taken, 60 tries at most.
//   3. Every way the game takes is drawn. From every room, GO and each of the six directions moves
//      the player only along drawn ways, or to limbo (room 20), where a death puts the player;
//      and every action that moves the player is drawn but those in ANYWHERE.
// It exits 1 on any difference.
//   node games/c64/the-incredible-hulk/test_map.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { gameSide, savesDisk, L, HulkPlay, show } = require('./test_play.js');
const g = game(__dirname);
const { HulkDB } = g.run('levels.html', 'hulk-db', 'HulkDB');
globalThis.HulkDB = HulkDB;                               // the map's block reads it as the page does
const { HulkMap } = g.run('levels.html', 'hulk-map', 'HulkMap');
const D = HulkDB.read(L.ram), WAYS = HulkMap.ways(D);
// The actions that move the player and are not drawn, since they fit anywhere
const ANYWHERE = { 4: 'part of the start of a game', 5: 'the start of a game, in room 1', 54: 'the rampage, to the fuzzy area' };
const ROOM = 0x1C22, FLAGS = 0x1C02, ITEMS = 0x1C3A, PAUSE = 0x1F25;
let bad = 0, played = 0;
const fail = (...w) => { if (bad++ < 20) console.log('MAP', ...w); };
const key = (a, b) => a + '>' + b, drawnWay = new Set(WAYS.map(w => key(w.from, w.to)));

// 1. The drawing
let svg = '';
HulkMap.draw(D, { set innerHTML(v) { svg = v; }, addEventListener() {}, querySelectorAll: () => [] }, () => {});
const boxes = new Map([...svg.matchAll(/<g class="rm" data-r="(\d+)"[^>]*>([\s\S]*?)<\/g>/g)].map(m => [+m[1], m[2]]));
const lines = [...svg.matchAll(/<line [^>]*data-from="(\d+)" data-to="(\d+)"/g)].map(m => key(+m[1], +m[2]));
for (let r = 1; r <= 20; r++) if (!boxes.has(r)) fail(`room ${r} has no box`);
if (boxes.size !== 20) fail(`${boxes.size} boxes, for 20 rooms`);
if (new Set(Object.values(HulkMap.AT).map(String)).size !== Object.keys(HulkMap.AT).length) fail('two rooms share a place');
const notes = r => [...(boxes.get(r) || '').matchAll(/<text class="lab"[^>]*>([^<]*)<\/text>/g)].map(m => m[1]);
const noted = (r, mark, other) => notes(r).some(t => t[0] === mark && t.slice(2).split(':')[0].split(', ').includes(String(other)));
for (const w of WAYS) if (!lines.includes(key(w.from, w.to)) && !(noted(w.from, '▸', w.to) && noted(w.to, '◂', w.from)))
  fail(`the way from room ${w.from} to room ${w.to} has no line, and not its two notes`);
for (const l of lines) if (!drawnWay.has(l)) fail(`a line from room ${l.replace('>', ' to room ')}, and the map has no such way`);

// 2 and 3. The game: every store to the room recorded, at the instruction after it
const STORES = JSON.parse(g.read('listing.json')).records.filter(r => /^st[axy]$/.test(r.m) && r.oa === ROOM).map(r => r.a + 3);
if (STORES.length < 10) fail(`only ${STORES.length} stores to the room in the listing`);
let rooms = [], rs = 1;
const extra = Object.fromEntries(STORES.map(a => [a, c => { rooms.push(c.m[ROOM]); }]));
const raster = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs % 312 & 0xFF; };
// Run to the next "What shall I do?", answering a page pause and any question with a key
function prompt(G, input) {
  let said = [];
  for (let k = 0; k < 80; k++) {
    if (G.run() === 'exit') return false;
    said = said.concat(G.out).slice(-400); G.out.length = 0;
    if (/What shall I do\?\s*$/.test(show(said).replace(/\{[^}]*\}/g, ''))) return true;
    if (G.m[PAUSE] === 6) input.push(0, 0x20);
    else input.push(/Demo\)\s*$/.test(show(said)) ? 0x4E : 0x20, 0x0D);
  }
  return false;
}
const snap = (() => {
  const ram = Uint8Array.from(L.ram);
  HulkPlay.boot(ram);
  const input = [], G = gameSide(ram, input, raster, savesDisk(), extra);
  if (!prompt(G, input)) { console.log('MAP the game never asked "What shall I do?"'); process.exit(1); }
  const c = G.cpu;
  return { m: G.m.slice(), regs: { a: c.a, x: c.x, y: c.y, sp: c.sp, p: c.p }, pc: c.pc };
})();
// One turn from the first prompt, in room `from`, after set(m, items) and the line typed; the rooms
// the player was put in, or null when the game never asked again
function turn(from, line, set, seed = 1) {
  const input = [], G = gameSide(snap.m, input, raster, savesDisk(), extra);
  G.cpu.setRegs(snap.regs); G.cpu.pc = snap.pc;
  const m = G.m, items = m[ITEMS] | m[ITEMS + 1] << 8;
  m[ROOM] = from;
  if (set) set(m, items);
  rs = seed; rooms = []; played++;
  for (const ch of line) input.push(ch.charCodeAt(0));
  input.push(0x0D);
  return prompt(G, input) ? rooms.slice() : null;
}
// What an action tests, put in place for it in room `from`
function meet(a, from) {
  return (m, items) => a.conds.forEach(x => {
    const t = x % 20, v = Math.floor(x / 20), at = items + 2 * v;
    if (t === 1) m[at] = 0xFF;
    else if (t === 2 || t === 3) m[at] = from;
    else if (t === 5) { if (m[at] === from) m[at] = 0; }
    else if (t === 6) { if (m[at] === 0xFF) m[at] = 0; }
    else if (t === 8) m[FLAGS + v] = 0xFF;
    else if (t === 9) m[FLAGS + v] = 0;
    else if (t !== 0 && t !== 4 && t !== 7) fail(`action ${a.n}: the test cannot meet its condition ${t}`);
  });
}
for (const w of WAYS) {
  let line, set = null;
  if (w.kind === 'exit') line = 'GO ' + w.dir.toUpperCase();
  else {
    const a = D.actions[w.action];
    set = meet(a, w.from);
    line = w.auto ? 'LOOK' : D.verbWord(a.verb) + ' ' + D.nounWord(a.noun || 1);   // any noun will do for noun 0
  }
  let went = null;
  for (let seed = 1; seed <= (w.auto ? 60 : 1); seed++) {
    went = turn(w.from, line, set, seed * 7919);
    if (!went || went.includes(w.to)) break;
  }
  if (!went) fail(`room ${w.from}, ${line}: the game never asked again`);
  else if (!went.includes(w.to)) fail(`room ${w.from}, ${line}${w.action ? ' (action ' + w.action + ')' : ''}: the game went to ${went.join(', ') || 'no room'}, and the map to room ${w.to}`);
}
for (let r = 1; r <= 20; r++) for (const dir of D.dirs) {
  const went = turn(r, 'GO ' + dir.toUpperCase());
  if (!went) { fail(`room ${r}, GO ${dir.toUpperCase()}: the game never asked again`); continue; }
  let at = r;
  for (const to of went) {
    if (to !== at && to !== 20 && !drawnWay.has(key(at, to))) fail(`room ${r}, GO ${dir.toUpperCase()}: the game went from room ${at} to room ${to}, and the map has no such way`);
    at = to;
  }
}
const moving = new Set(WAYS.filter(w => w.kind === 'action').map(w => w.action));
D.actions.forEach(a => {
  if (a.cmds.includes(54) && !moving.has(a.n) && !ANYWHERE[a.n]) fail(`action ${a.n} moves the player, and the map has no way for it`);
});
for (const n of Object.keys(ANYWHERE)) if (moving.has(+n)) fail(`action ${n} is drawn, and ANYWHERE names it`);

if (bad) { console.log(`map: ${bad} difference(s)`); process.exit(1); }
console.log(`ok: ${boxes.size} rooms, ${WAYS.length} ways, each drawn and taken by the game; ${played} turns played`);
