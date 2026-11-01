#!/usr/bin/env node
// Hold the Play tab's port against the game's own code. play.html's hulk-play block (HulkPlay) and
// the game's code from the committed listing.json, run on the kit's 6502 simulator, start from the
// cold start ($657B) on the same memory and are given the same keys, a poll of the keyboard at a
// time, and the same raster lines when the chances read one. At every key the game waits for they
// must have sent the same characters to the screen (CHROUT, and PLOT's moves of the cursor), the
// same writes to the sound chip, and hold the same memory: the zero page but for the register
// pairs and the register library's scratch bytes ($39-$41, $4E-$57), the text and picture colours
// ($0400-$07FF), the picture buffer, the game's variables ($1C00-$1FFF, but for $1E89, where GETIA
// keeps the caller's X, and SAVER's scratch, $1F0C-$1F0F), the bitmap, the picture cache, the
// program's own variables ($5400-$7FFF), and colour RAM.
// The game's KERNAL calls are hooks: GETIN takes the next key, CHROUT and PLOT record, SAVE and
// LOAD keep saved games in a disk of the test's, which starts with the four on the game's disk,
// and the drive's fast loader is two hooks, send_byte ($78A3) and receive_byte ($7859), which
// answer from the picture files the Rooms tab carries, as test_pictures.js does.
// The sessions: the game's own demonstration (D at the restore question); every saved game on the
// disk restored and played on, and a damaged one refused; actions rewritten to run the commands and
// conditions the database never uses; keys the line reader refuses; and seeded random sessions made
// from the game's own words, with pokes now and then into both machines that reach what play seldom
// does (another room, items moved, flags, every item in the fuzzy area before SCORE, the light
// nearly out, the dark, the counter, a full hand). It exits 1 on any difference.
//   node games/c64/the-incredible-hulk/test_play.js [random sessions]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const fs = require('fs');
const { game, differ } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const HulkPlay = fs.existsSync(path.join(__dirname, 'play.html'))
  ? g.run('play.html', 'hulk-play', 'HulkPlay').HulkPlay
  : (require(path.join(__dirname, 'work/page/play.js')), globalThis.HulkPlay);
const { HulkPics } = g.run('levels.html', 'hulk-pictures', 'HulkPics');
const { HULK_FILES } = g.run('levels.html', 'hulk-files', 'HULK_FILES');
const FILES = HulkPics.unpack(HULK_FILES);
const L = g.listing();

let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
let seed = 0x1984;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
const pick = a => a[rnd(a.length)];

const COMPARE = [[0x0002, 0x0038], [0x0042, 0x004D], [0x0058, 0x00FF], [0x0200, 0x03FF], [0x0400, 0x1E88],
  [0x1E8A, 0x1F0B], [0x1F10, 0x7FFF]];

// The drive's answer to a picture's name: the file whose first letter and number match, a room's
// name ending '*' matching the six-character names, a piece's its own last letter.
function findFile(name) {
  const s = String.fromCharCode(...name);
  const hit = Object.keys(FILES).find(k => k[0] === s[0] && k.slice(3, 6) === s.slice(3, 6) &&
    (s[6] === '*' ? k.length === 6 : k.length === 7 && k[6] === s[6]));
  return hit ? FILES[hit] : null;
}
// The saved games: the four on the game's disk, by their area letter, A to D with bit 7 set
const SAVE_FILES = fs.existsSync(path.join(__dirname, 'play.html'))
  ? HulkPics.unpack(g.run('play.html', 'hulk-saves', 'HULK_SAVE_FILES').HULK_SAVE_FILES)
  : Object.fromEntries(['\u00c1.\u00d3', '\u00c2.\u00d3', '\u00c3.\u00d3', '\u00c4.\u00d3'].map((f, i) =>
      ['ABCD'[i], new Uint8Array(fs.readFileSync(path.join(__dirname, 'work/files', f)))]));
function savesDisk() {
  const d = {};
  for (const [letter, b] of Object.entries(SAVE_FILES)) d[letter.charCodeAt(0) | 0x80] = Uint8Array.from(b);
  return d;
}
const areaOf = name => name.find(c => c >= 0xC1 && c <= 0xC4);

// The game: its code on the kit's 6502, the KERNAL and the drive as hooks
function gameSide(ram, input, raster, disk, extra = {}) {   // extra: more hooks, by address
  const m = Uint8Array.from(ram), colour = new Uint8Array(1024), out = [], sid = [];
  const io = {
    read(a) {
      if (a === 0xD012) return raster();
      if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800];
      if (a === 0xDD00 || a === 0xDD02 || a === 0xD011 || a === 0xD016) return 0;
      throw new Error('the game read $' + a.toString(16));
    },
    write(a, v) {
      if (a >= 0xD800 && a < 0xDC00) { colour[a - 0xD800] = v & 15; return; }
      if (a >= 0xD400 && a < 0xD800) { sid.push(a, v); return; }
      if (a >= 0xD000 && a < 0xD040) { if (a === 0xD020 || a === 0xD021) out.push(0x1000 | (a & 1) << 8 | v); return; }
      if (a === 0xDD00 || a === 0xDD02) return;
      throw new Error('the game wrote $' + a.toString(16));
    },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x36 }, io });
  cpu.pc = 0x657B; cpu.sp = 0xFF;
  let channel = 0, status = 0, nameAt = 0, nameLen = 0, name = [], reply = [];
  const fileName = () => Array.from(m.subarray(nameAt, nameAt + nameLen));
  const st = { stopped: null };
  const hooks = {
    0xFFE4(c) {                                           // GETIN
      if (!input.length) { st.stopped = 'getin'; return true; }
      c.a = input.shift(); c.x = 0; c.rts();
    },
    0xFFD2(c) { if (channel === 0) out.push(c.a); c.rts(); },   // CHROUT
    0xFFF0(c) { out.push(0x2000 | c.x << 8 | c.y); c.rts(); },  // PLOT
    0xFFBA(c) { c.rts(); },                               // SETLFS
    0xFFBD(c) { nameLen = c.a; nameAt = c.x | c.y << 8; c.rts(); },   // SETNAM
    0xFFC0(c) { c.c = 0; c.rts(); },                      // OPEN
    0xFFC3(c) { c.rts(); },                               // CLOSE
    0xFFC9(c) { channel = c.x; c.c = 0; c.rts(); },       // CHKOUT
    0xFFCC(c) { channel = 0; c.rts(); },                  // CLRCHN
    0xFFD8(c) {                                           // SAVE
      const s = m[c.a] | m[c.a + 1] << 8, e = c.x | c.y << 8;
      if (disk.fail) { disk.fail--; status = 0x80; }
      else { disk[areaOf(fileName())] = Uint8Array.of(s & 0xFF, s >> 8, ...m.subarray(s, e)); status = 0; }
      c.c = 0; c.rts();
    },
    0xFFD5(c) {                                           // LOAD, to the file's own address
      const f = disk[areaOf(fileName())];
      if (f) { m.set(f.subarray(2), f[0] | f[1] << 8); status = 0x40; c.c = 0; }
      else { status = 0x42; c.c = 1; c.a = 4; }
      c.rts();
    },
    0xFFB7(c) { c.a = status; c.rts(); },                 // READST
    0x78A3(c) {                                           // send_byte: the name, then a reply
      name.push(c.a);
      if (name.length === 7) {
        const f = findFile(name); name = [];
        if (f) { reply = [0]; for (let i = 0; i < f.length; i += 254) { const b = f.subarray(i, i + 254); reply.push(b.length, ...b); } reply.push(0); }
        else reply = [1];
      }
      c.x = 0; c.y = 0; c.rts();
    },
    0x7859(c) {                                           // receive_byte
      const v = reply.length ? reply.shift() : 0;
      c.a = v; c.z = v === 0; c.n = (v & 0x80) !== 0; c.x = 0; c.rts();
    },
    0x7904() { name = []; },                              // the fast loader sent to the drive again
    0x6864() { st.stopped = 'exit'; return true; },       // the BRK to BASIC
  };
  Object.assign(hooks, extra);
  return {
    m, colour, out, sid, cpu,
    run(executed) { st.stopped = null; cpu.run({ hooks, maxSteps: 5e7, executed, until: -1 }); return st.stopped; },
  };
}

// The port, on the same memory, with the same answers
function portSide(ram, input, raster, disk) {
  const m = Uint8Array.from(ram), colour = new Uint8Array(1024), out = [], sid = [];
  const io = {
    colour,
    chrout: b => out.push(b),
    plot: (r, c) => out.push(0x2000 | r << 8 | c),
    vic: (a, v) => { if (a === 0xD020 || a === 0xD021) out.push(0x1000 | (a & 1) << 8 | v); },
    sid: (a, v) => sid.push(a, v),
    raster,
    disk: findFile,
    save: (name, bytes) => { if (disk.fail) { disk.fail--; return false; } disk[areaOf(name)] = bytes; return true; },
    load: name => disk[areaOf(name)] || null,
  };
  const g = HulkPlay.machine(m, io).run();
  let st = g.next();
  return {
    m, colour, out, sid,
    run() {
      for (;;) {
        if (st.done) return 'done';
        const w = st.value.wait;
        if (w === 'getin') {
          if (!input.length) return 'getin';
          st = g.next(input.shift());
        } else if (w === 'exit') return 'exit';
        else st = g.next();
      }
    },
  };
}

const petscii = b => b >= 0x41 && b <= 0x5A ? String.fromCharCode(b + 0x20) : b >= 0x61 && b <= 0x7A ? String.fromCharCode(b - 0x20)
  : b >= 0xC1 && b <= 0xDA ? String.fromCharCode(b - 0x80) : b >= 32 && b < 127 ? String.fromCharCode(b) : null;
const show = a => a.map(b => b >= 0x1000 ? (b >= 0x2000 ? '{plot ' + ((b >> 8) & 31) + ',' + (b & 255) + '}' : '{vic}')
  : b === 13 ? '|' : petscii(b) !== null ? petscii(b) : '{' + b.toString(16) + '}').join('');

// One session: chunks of polls, each a list of key codes (0 for a poll with no key); the two sides
// run each chunk and are compared where both wait for the next.
function session(label, chunks, executed, opts = {}) {
  const ram = Uint8Array.from(L.ram);
  HulkPlay.boot(ram);
  if (opts.poke) for (const [a, v] of opts.poke) ram[a] = v;
  let rs = 0x5EED ^ (opts.seed || 0);
  const rasters = [];
  const rasterG = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; const v = rs % 312 & 0xFF; rasters.push(v); return v; };
  const rasterP = () => rasters.length ? rasters.shift() : (() => { throw new Error('the port read the raster more often'); })();
  const gi = [], pi = [];
  const disks = [savesDisk(), savesDisk()];
  if (opts.disk) disks.forEach(opts.disk);
  const G = gameSide(ram, gi, rasterG, disks[0]), P = portSide(ram, pi, rasterP, disks[1]);
  let said = [];
  for (let k = 0; k <= chunks.length; k++) {
    const gw = G.run(executed), pw = P.run();
    if (rasters.length) { fail(label, 'chunk', k, 'the game read the raster', rasters.length, 'more times'); return false; }
    if (gw !== pw) { fail(label, 'chunk', k, 'the game waits for', gw, 'the port for', pw, '\n  after', show(said.slice(-200))); return false; }
    const n = Math.max(G.out.length, P.out.length);
    for (let i = 0; i < n; i++) if (G.out[i] !== P.out[i]) {
      fail(label, 'chunk', k, 'screen output differs at', i, 'room', G.m[0x1C22], P.m[0x1C22], '\n  game:', show(G.out.slice(Math.max(0, i - 60), i + 40)),
        '\n  port:', show(P.out.slice(Math.max(0, i - 60), i + 40)));
      return false;
    }
    if (G.sid.join() !== P.sid.join()) { fail(label, 'chunk', k, 'sound writes differ: game', G.sid.slice(0, 20).join(), 'port', P.sid.slice(0, 20).join()); return false; }
    const a = differ(G.m, P.m, COMPARE);
    if (a >= 0) { fail(label, 'chunk', k, 'memory at $' + a.toString(16), 'game', G.m[a], 'port', P.m[a], '\n  after', show((said.concat(G.out)).slice(-300))); return false; }
    const c = differ(G.colour, P.colour);
    if (c >= 0) { fail(label, 'chunk', k, 'colour RAM at', c, 'game', G.colour[c], 'port', P.colour[c]); return false; }
    said = said.concat(G.out).slice(-2000);
    G.out.length = 0; P.out.length = 0; G.sid.length = 0; P.sid.length = 0;
    if (gw === 'exit' || k === chunks.length) break;
    let chunk = chunks[k];
    if (typeof chunk === 'function') chunk = chunk(G.m, said);
    if (!Array.isArray(chunk)) {                          // { poke: [[address, value]], keys }
      for (const [a, v] of chunk.poke) { G.m[a] = v; P.m[a] = v; }
      chunk = chunk.keys;
    }
    gi.push(...chunk); pi.push(...chunk);
  }
  if (opts.after) opts.after(G.m, said);
  return true;
}

// Typing: a line of letters as the keyboard gives them, a few polls apart, then RETURN
const gap = () => rnd(40) ? rnd(30) : rnd(2500);              // now and then long enough for the cursor to flash
function typed(s) {
  const keys = [];
  for (const ch of s) { for (let i = gap(); i > 0; i--) keys.push(0); keys.push(ch === '\r' ? 0x0D : ch === '\b' ? 0x14 : ch.charCodeAt(0)); }
  for (let i = gap(); i > 0; i--) keys.push(0);
  keys.push(0x0D);
  return keys;
}
// What the game is waiting for, from what it last printed
const tail = (said, n = 120) => show(said.slice(-n));
function answer(m, said, line) {
  if (m[0x1F25] === 6) return [0, rnd(2) ? 0x20 : 0x0D];  // the page pause: any key
  const t = tail(said, 200);
  const last = re => { let at = -1; for (const x of t.matchAll(re)) at = x.index; return at; };
  const asks = [[/HIT RETURN|Adjust your TV/g, () => typed('')], [/Demo\)/g, () => typed('N')],
    [/area \(A-D\)\?/g, () => typed(pick(['A', 'B', 'C', 'D']))], [/Now Hit-Y/g, () => typed(pick(['Y', 'N', '', '']))],
    [/What shall I do\?/g, () => typed(line)]];
  let best = null, at = -1;
  for (const [re, f] of asks) { const k = last(re); if (k > at) { at = k; best = f; } }
  return best ? best() : typed(line);
}

// The game's own words: each action's verb and noun, as words a player types
const D = (() => {
  const r = L.ram, w = a => r[a] | r[a + 1] << 8;
  const words = list => {
    const out = [];
    for (let n = 0, p = list; n <= r[0x8068]; n++, p += 5) {
      const s = String.fromCharCode(...r.subarray(p + 1, p + 5)).replace(/\0+$/, '');
      out.push({ n, s, syn: r[p] === 0x2A });
    }
    return out;
  };
  const verbs = words(w(0x8060)), nouns = words(w(0x805E)), actions = [];
  for (let i = 0; i <= w(0x806A); i++) actions.push([r[w(0x8030) + i], r[w(0x8032) + i]]);
  const say = (list, n) => { const c = list.filter(e => e.n === n || (e.syn && list[e.n - 1] && false)); return c.length ? c[0].s : null; };
  return { verbs, nouns, actions, say };
})();
const wordOf = (list, n) => {
  const main = list[n];
  if (!main || !main.s) return null;
  const syn = [];                                         // the synonyms after it
  for (let k = n + 1; k < list.length && list[k].syn; k++) syn.push(list[k].s);
  return rnd(3) || !syn.length ? main.s : pick(syn);
};
function randomLine() {
  const k = rnd(100);
  if (k < 25) return pick(['N', 'S', 'E', 'W', 'U', 'D', 'GO NORTH', 'GO SOUTH', 'GO EAST', 'GO WEST', 'GO UP', 'GO DOWN', 'CLIMB', 'GO OUT', 'GO HOLE', 'GO DOME', 'ENTER']);
  if (k < 65) {
    const [v, n] = pick(D.actions.filter(a => a[0]));
    const vw = wordOf(D.verbs, v), nw = n ? wordOf(D.nouns, n) : (rnd(2) ? '' : wordOf(D.nouns, 1 + rnd(D.nouns.length - 1)));
    return ((vw || 'LOOK') + (nw ? ' ' + nw : '')).slice(0, 14);
  }
  if (k < 75) return pick(['GET ' + (wordOf(D.nouns, 1 + rnd(D.nouns.length - 1)) || 'GEM'), 'DROP ' + (wordOf(D.nouns, 1 + rnd(D.nouns.length - 1)) || 'GEM'), 'GET GEM', 'DROP GEM', 'GET', 'DROP']);
  if (k < 85) return pick(['I', 'L', 'LOOK', 'SCORE', 'INVENTORY', 'HELP', 'V', 'Z', 'BITE LIP', 'WAIT', 'SAVE GAME', 'QUIT']);
  if (k < 90) return pick(['X', 'P', 'T', 'XYZZY', 'GET GEM NOW', 'LOOK DOME', 'LOOK GEM', 'LOOK BIO', 'LOOK EGG', 'LOOK ANTS', 'LOOK BEES', 'LOOK RING', 'LOOK CAGE', 'LOOK HOLE']);
  let s = '';
  for (let n = rnd(15); n > 0; n--) s += rnd(5) ? String.fromCharCode(65 + rnd(26)) : ' ';
  return s + (rnd(10) ? '' : '\b\bAB');
}
// Pokes made in both machines where the game waits for a line, to reach what play seldom does,
// and the line to type then
function pokes(m) {
  const at = m[0x1C3A] | m[0x1C3B] << 8, room = m[0x1C22], out = [], k = rnd(11);
  let line = randomLine();
  if (k === 0) out.push([0x1C22, rnd(21)]);                // rooms past 20 have no text
  else if (k === 1) for (let n = rnd(4) + 1; n > 0; n--) out.push([at + 2 * rnd(55), pick([0xFF, room, room, 0, rnd(21)])]);
  else if (k === 2) out.push([0x1C02 + rnd(32), rnd(2) ? 0xFF : 0]);
  else if (k === 3) {                                      // everything in the fuzzy area, and the score
    for (let i = 0; i < 55; i++) if (rnd(8)) out.push([at + 2 * i, 16]);
    line = 'SCORE';
  } else if (k === 4) out.push([at + 18, pick([0xFF, room])], [0x1E9F, rnd(30)], [0x1EA0, 0]);   // the light, nearly out
  else if (k === 5) out.push([0x1C11, 0xFF]);              // dark
  else if (k === 6) out.push([0x1C00, rnd(256)], [0x1C01, pick([0, 0, 0xFF, rnd(256)])]);   // the counter
  else if (k === 7) out.push([0x1F14, rnd(3)]);            // the tester
  else if (k === 8) out.push([0x1F22, rnd(4) ? 0xFF : 0]); // the picture's switch
  else {                                                   // too much to carry, or a thing already held
    for (let i = 0; i < 55; i++) if (rnd(3)) out.push([at + 2 * i, rnd(2) ? 0xFF : room]);
    line = pick(['GET ', 'TAKE ', 'DROP ']) + pick(NOUNS.map(n => D.nouns[n].s));
  }
  return { poke: out, line };
}
// Actions rewritten in both machines, to run the commands and conditions the database never uses:
// action n's verb and noun become the typed verb's, its conditions and commands the given ones
function rewrite(m, n, verb, noun, conds, cmds) {
  const w = a => m[a] | m[a + 1] << 8, out = [];
  out.push([w(0x8030) + n, verb], [w(0x8032) + n, noun]);
  for (let k = 0; k < 5; k++) { const [type, value] = conds[k] || [0, 0], v = value * 20 + type, a = w(0x803C + 2 * k) + 2 * n; out.push([a, v & 0xFF], [a + 1, v >> 8]); }
  for (let k = 0; k < 4; k++) out.push([w(0x8034 + 2 * k) + n, cmds[k] || 0]);
  return out;
}
const VERBS = [], NOUNS = [];                             // words that are not synonyms
D.verbs.forEach((v, i) => { if (i && v && v.s && !v.syn) VERBS.push(i); });
D.nouns.forEach((v, i) => { if (i && v && v.s && !v.syn) NOUNS.push(i); });
const UNUSED = [52, 55, 64, 67, 68, 69, 70, 75, 78, 83, 84, 86, 87, 89, 80, 81, 82, 77, 79, 62, 56, 57, 61];

module.exports = { session, typed, answer, tail, show, randomLine, gameSide, portSide, savesDisk, L, HulkPlay };
if (require.main === module) {
  const executed = new Uint8Array(65536);
  const t0 = Date.now();
  let lines = 0, count = 0;
  const run = (label, chunks, opts) => {
    const t = Date.now();
    count++; if (session(label, chunks, executed, opts)) lines += chunks.length;
    if (process.env.TIMES) console.log(label, chunks.length, Date.now() - t, "ms");
  };
  const play = (n, line = randomLine) => Array.from({ length: n }, () => (m, said) => answer(m, said, line()));
  // A session's chunks: each step's keys are typed when the screen ends with its prompt, in turn;
  // every other answer is the usual one
  const scripted = (n, steps, line = randomLine) => {
    let i = 0;
    return Array.from({ length: n }, () => (m, said) => {
      const st = steps[i];
      if (st && m[0x1F25] !== 6 && st.when.test(tail(said))) { i++; return typeof st.keys === 'function' ? st.keys(m) : st.keys; }
      return answer(m, said, line());
    });
  };
  const PROMPT = /What shall I do\? *$/, RESTORE = /Demo\)\s*$/, AREA = /\(A-D\)\?\s*$/;
  // 1. the game's own demonstration (D at the restore question), played through and round to its
  //    start again, then a key to leave it
  {
    let asked = false;
    const chunks = play(3).concat([(m, said) => { if (RESTORE.test(tail(said))) { asked = true; return typed('D'); } return answer(m, said, ''); }]);
    for (let i = 0; i < 45; i++) chunks.push(() => new Array(asked ? 10 : 1).fill(0));
    chunks.push(() => [0x20], ...play(8));
    run('demonstration', chunks);
  }
  // 2. each saved game on the disk restored and played on, and a bad one refused (its check byte
  //    changed), after which the first save fails
  for (const area of ['A', 'B', 'C', 'D', 'bad'])
    run('saved game ' + area, scripted(80, [{ when: RESTORE, keys: typed('Y') }, { when: AREA, keys: typed(area === 'bad' ? 'B' : area) }],
      () => rnd(10) ? randomLine() : pick(['SAVE GAME', 'SCORE', 'INVENTORY'])),
      { seed: area.charCodeAt(0), disk: area !== 'bad' ? undefined : d => { d[0xC2][2 + 0x23C] ^= 1; d.fail = 1; } });
  // 3. the commands and conditions the database never uses, on rewritten actions
  for (let s = 0; s < 8; s++) {
    const chunks = play(5, () => 'LOOK');
    for (let i = 0; i < 40; i++) chunks.push(m => {
      const n = rnd(262), verb = pick(VERBS), noun = rnd(3) ? 0 : pick(NOUNS);
      const cmds = [pick(UNUSED), rnd(2) ? pick(UNUSED) : 1 + rnd(40), rnd(3) ? 0 : pick(UNUSED), rnd(4) ? 0 : 73];
      const takes = c => ({ 52: 1, 55: 1, 58: 1, 60: 1, 62: 2, 75: 2, 79: 1, 81: 1, 82: 1, 83: 1, 87: 1 })[c] || 0;
      while (cmds.reduce((t, c) => t + takes(c), 0) > 4) cmds[cmds.findLastIndex(c => takes(c))] = 0;   // four parameters
      // parameters the database could hold: commands 81 and 87 index six saved rooms and eight
      // saved counters, 58 and 60 thirty-two flags
      const p = () => cmds.some(c => [81, 87].includes(c)) ? rnd(6) : cmds.some(c => [58, 60].includes(c)) ? rnd(21) : rnd(55);
      const type = pick([0, 0, 10, 11, 17, 1, 2, 8, 9, 15, 16, 19]);
      const conds = [[type, type ? rnd(55) : p()], [0, p()], [0, Math.min(p(), 20)], [0, p()], [0, rnd(3)]];
      const line = D.verbs[verb].s + (noun ? ' ' + D.nouns[noun].s : '');
      // saved room 1 holds 255 from the disk, a room with no text; command 87 would bring it in
      const rooms = [0, 1, 2, 3, 4, 5].filter(i => m[0x1C24 + i] > 20).map(i => [0x1C24 + i, rnd(21)]);
      return { poke: rewrite(m, n, verb, noun, conds, cmds).concat(rooms), keys: answer(m, [], line.slice(0, 14)) };
    }, ...play(2));
    run('rewritten actions ' + s, chunks, { seed: 0x100 + s });
  }
  // 4. keys the line reader refuses, rubbing out, a line too long, and character $FF, which leaves
  //    for BASIC
  run('keys', scripted(30, [
    { when: PROMPT, keys: [0x11, 0x1D, 0x93, 0xC1, 0xDA, 0x85, 0x22, 0x4C, 0x14, 0x14, 0x14, 0x4C, 0x4F, 0x4F, 0x4B, 0x0D] },
    { when: PROMPT, keys: typed('ABCDEFGHIJKLMNOP') }, { when: PROMPT, keys: typed('LOOK') }, { when: PROMPT, keys: [0x41, 0xFF, 0x0D] }],
    () => 'LOOK'));
  // 5. random sessions from the start, some with pokes into both machines
  const sessions = +(process.argv[2] || 8);
  for (let s = 0; s < sessions && !bad; s++) {
    const chunks = [];
    for (let i = 0, n = 100 + rnd(300); i < n; i++)
      chunks.push((m, said) => {
        if (!PROMPT.test(tail(said)) || m[0x1F25] === 6 || rnd(5)) return answer(m, said, randomLine());
        const { poke, line } = pokes(m);
        return { poke, keys: answer(m, said, line) };
      });
    run('random session ' + s, chunks, { seed: s });
  }
  let code = 0, ran = 0;
  const missed = [];
  for (const r of L.listing.records) if (r.t === 'code' && r.a >= 0x5400 && r.a < 0x8000) {
    code++;
    if (executed[r.a]) ran++; else missed.push(r.a.toString(16));
  }
  if (process.env.SHOW_MISSED) console.log('not run:', missed.join(' '));
  console.log(`${bad ? 'FAIL' : 'ok'}: ${lines} answers in ${count} sessions, ${((Date.now() - t0) / 1000).toFixed(1)} s; the game ran ${ran} of its ${code} instructions`);
  process.exit(bad ? 1 : 0);
}
