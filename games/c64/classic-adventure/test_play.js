#!/usr/bin/env node
// Hold the Play tab's port of the interpreter against the game's own code. play.html's CAPort
// block (/* adventure.js */) and the game's code from the committed listing.json, run on the kit's
// 6502 simulator, are fed the same typed lines and the same jiffy clock, and at every line the
// game reads they must have sent the same bytes to CHROUT and hold the same variables
// ($0BBB-$0F97: the starting objects, the line buffer, the variables, the handler tables and the
// built-in messages with their digits; $8AA2-$8B3D, the objects; print_record's opcode at $1067;
// and the zero-page bytes the game keeps between routines). The lines come from a short walk, from
// the Play tab's walkthrough (which must also close the cave at 150 without testing a chance
// condition), and from seeded random sessions built from the game's own vocabulary, exits and
// rules, some of them after the same poke of the room into both. The KERNAL's CHROUT, CHRIN, SETLFS, SETNAM, SAVE and
// LOAD are kit/c64/kernal_lines.js's hooks; $C5 holds a key, so the pager never waits. Everything
// it needs is committed: no disk image, no snapshot, no emulator. It exits 1 on any difference.
//   node games/c64/classic-adventure/test_play.js [sessions]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game, differ } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const { KernalLines } = require(path.join(ROOT, 'kit/c64/kernal_lines.js'));
const folder = game(__dirname);
folder.lib('c64');
const html = folder.read('play.html');
const P = folder.run('play.html', 'adventure.js', 'CAPort').CAPort;

let bad = 0;
const fail = (...what) => { if (bad++ < 10) console.log('DIFFERS', ...what); };
let seed = 0x1984;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
const pick = a => a[rnd(a.length)];
const CHANCES = [];
const COMPARE = [[0x0BBB, 0x0F97], [0x8AA2, 0x8B3D], [0x1067, 0x1067], [0x50, 0x50], [0x52, 0x53], [0x65, 0x65], [0xC6, 0xC6]];
const ascii = bytes => bytes.map(b => b === 13 ? '|' : (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');

// One session: both machines from the listing's image, the same lines, compared at each line read.
function session(ram, lines, label, executed) {
  const gm = Uint8Array.from(ram), pm = Uint8Array.from(ram);
  for (const m of [gm, pm]) m[0xC5] = 0x3C;
  // the game: the KERNAL's line routines are hooks, and reset ($195A) ends the session
  const cpu = new CPU(gm, { port: { dir: 0x2F, data: 0x36 }, io: {
    read(a) { throw new Error('the game read $' + a.toString(16)); },
    write(a, v) { if (a !== 0xD020) throw new Error('the game wrote $' + a.toString(16)); } } });
  cpu.pc = 0x12B5; cpu.sp = 0xFF;
  const kernal = new KernalLines(cpu, { stops: { 0x195A: 'reset' } });
  // the port
  const pout = [], ptape = [];
  let pload = 0;
  const port = P.machine(pm, { chrout: b => pout.push(b), irqByte: a => pm[a], border: () => {} });
  const g = port.run();
  let st = g.next();
  let said = [];

  let gwait = kernal.run(null, { executed });
  for (let i = 0; ; i++) {
    // the port runs to its next wait
    for (;;) {
      if (st.done) break;
      const wt = st.value.wait;
      if (wt === 'save') { ptape.push(...st.value.files); st = g.next(); continue; }
      if (wt === 'load') { const f = ptape.slice(pload, pload + 2); pload += 2; st = g.next(f.length ? f : null); continue; }
      break;
    }
    const pwait = st.done ? 'done' : st.value.wait;
    if (pwait === 'broken' && gm[0x1067] !== 0x85) return true;   // the 10,000th command patched print_record
    const gout = kernal.out;
    if (pwait !== gwait) { fail(label, 'line', i, 'the game waits for', gwait, 'the port for', pwait, st.value && st.value.why || ''); return false; }
    if (gout.length !== pout.length || gout.some((b, k) => b !== pout[k])) {
      const k = gout.findIndex((b, k) => b !== pout[k]);
      fail(label, 'line', i, 'output differs at byte', k, '\n  game:', ascii(gout.slice(Math.max(0, k - 40), k + 40)),
           '\n  port:', ascii(pout.slice(Math.max(0, k - 40), k + 40)));
      return false;
    }
    const a = differ(gm, pm, COMPARE);
    if (a >= 0) { fail(label, 'line', i, '$' + a.toString(16), 'game', gm[a], 'port', pm[a], 'after', JSON.stringify(ascii(said))); return false; }
    if (gwait === 'reset' || i >= lines.length) return true;
    let line = lines[i];
    if (typeof line === 'function') line = line(gm, gout);
    if (line.poke) { for (const [a, v] of line.poke) { gm[a] = v; pm[a] = v; } line = line.text; }
    // the chance conditions' thresholds and the values either side of them, as often as not
    const jiffy = rnd(2) ? rnd(256) : ((pick(CHANCES) + rnd(3) - 1) & 0x7F) | (rnd(2) << 7);
    gm[0xA2] = jiffy; pm[0xA2] = jiffy;
    pout.length = 0;
    said = line;
    gwait = kernal.run(line, { executed });
    st = g.next(line);
  }
}

// A line typed on the C64: lower case unshifted, upper case shifted.
const typed = s => [...s].map(ch => /[a-z]/.test(ch) ? ch.charCodeAt(0) - 32 : /[A-Z]/.test(ch) ? ch.charCodeAt(0) + 0x80 : ch.charCodeAt(0));

(async () => {
  const G = await C64.load('listing.json');
  const ram = G.ram;
  const T = P.T;
  // the game's own words
  const vocab = [];
  for (let n = 0; n < 226; n++) {
    const e = ram.subarray(T.VOCAB + 5 * n, T.VOCAB + 5 * n + 5);
    vocab.push({ word: String.fromCharCode(...[...e.subarray(0, 4)].filter(c => c)), n: e[4] });
  }
  const nameOf = n => { const v = vocab.filter(v => v.n === n); return v.length ? pick(v).word.toLowerCase() : 'xyzzy'; };
  const rules = [];
  for (let p = T.CMD; p < T.CMD_END; p += 6) rules.push([ram[p], ram[p + 1]]);
  const exitWords = m => {
    const r = m[T.ROOM], p = T.EXITS[0] + 2 * (r - 1);
    const s = m[p] | (m[p + 1] << 8), e = m[p + 2] | (m[p + 3] << 8), out = [];
    for (let q = s; q < e; q += 2) out.push(m[T.EXITS[1] + q]);
    return out;
  };
  const randomLine = (m, out) => {
    const said = ascii(out.slice(-80));
    if (/Another game/i.test(said)) return typed(rnd(20) ? 'y' : 'n');
    if (/Are you sure/i.test(said)) return typed(pick(['y', 'n', 'Y', 'yes', '']));
    const k = rnd(100);
    if (k < 30) { const ex = exitWords(m); return typed(ex.length ? nameOf(pick(ex)) : 'n'); }
    if (k < 70) { const [v, n] = pick(rules); return typed(nameOf(v) + (n === 0xFF ? (rnd(2) ? '' : ' ' + nameOf(1 + rnd(150))) : ' ' + nameOf(n))); }
    if (k < 80) return typed(pick(['invent', 'score', 'look', 'on', 'off', 'inventory', 'help', 'info']));
    if (k < 85) return typed(pick(['xyzzy plover', 'the lamp', 'get the lamp now please', 'GET LAMP', 'G', '']));
    if (k < 90) return typed(nameOf(1 + rnd(150)) + ' ' + nameOf(1 + rnd(150)) + ' ' + nameOf(1 + rnd(150)) + ' and a very long line that runs on');
    if (k < 92) return typed(pick(['quit', 'save', 'restore']));
    // the same poke into both: a room, an object put here or in the hands, a flag, the treasures home
    if (k < 95) return { poke: [[T.ROOM, 1 + rnd(140)]], text: typed('look') };
    const o = T.OBJ - 2 + 2 * (1 + rnd(78));
    if (k < 97) return { poke: [[o, m[T.ROOM]], [o + 1, m[o + 1] & 0xFD]], text: typed('look') };
    if (k < 98) return m[o + 1] & 2 ? typed('invent') : { poke: [[o, 0], [o + 1, m[o + 1] | 2], [T.FLAGS + 2, m[T.FLAGS + 2] + 1]], text: typed('invent') };
    if (k < 99) return { poke: [[T.FLAGS + rnd(13), rnd(2) ? 0xFF : 0]], text: typed(nameOf(pick(rules)[0])) };
    const home = [];
    for (let n = 1; n <= 78; n++) if (m[T.OBJ - 1 + 2 * n] & 0x10 && rnd(4)) home.push([T.OBJ - 2 + 2 * n, 3]);
    return { poke: home, text: typed('score') };
  };

  for (const [conds, lists] of [[T.CMD_CONDS, [T.CMD + 2, T.CMD_END + 2, 6]], [T.STATUS_CONDS, [T.STATUS, T.STATUS_END, 4]]]) {
    const end = ram[lists[1]] | (ram[lists[1] + 1] << 8);
    for (let q = 0; q < end; q += 2) if (ram[conds + q] === 2) CHANCES.push(ram[conds + q + 1]);
  }
  if (CHANCES.length < 10) { console.log('only', CHANCES.length, 'chance conditions found'); process.exit(1); }
  const executed = new Uint8Array(65536);
  let lines = 0;
  const walk = ['look', 'invent', 'enter', 'take lamp', 'take keys', 'take food', 'take bottle', 'inventory', 'out',
    's', 's', 's', 'unlock grate', 'open grate', 'd', 'on', 'w', 'take cage', 'w', 'w', 'take axe', 'w', 'take bird',
    'drop rod', 'take bird', 'take rod', 'w', 'd', 'w', 'take flute', 'wave rod', 'w', 'take diamonds', 'drop axe',
    'take diamonds', 'e', 'e', 'd', 'n', 'play flute', 'drop bird', 'n', 'take silver', 's', 'drop flute', 's',
    'take jewellery', 'n', 'score', 'u', 'u', 'e', 'e', 'e', 'xyzy', 'drop diamonds', 'drop silver',
    'drop jewellery', 'score', 'save', 'drop lamp', 'restore', 'invent', 'off', 'w', 'sw', 'look', 'look',
    'look', 'look', 'look', 'quit', 'y', 'y'].map(typed);
  if (session(ram, walk, 'walkthrough', executed)) lines += walk.length;
  // The Play tab's walkthrough, run on the port alone: no command on it may test a chance condition,
  // the cave must close with the score at 150, and the six commands after it must end in the blast
  // that kills. Then the same lines in step with the game.
  const wa = html.indexOf('id="ca-walk-data"'), route = JSON.parse(html.slice(html.indexOf('>', wa) + 1, html.indexOf('</script>', wa)));
  const legs = route.map(l => l.groups.flatMap(g => g.cmds));
  {
    const M = Uint8Array.from(ram), said = [];
    M[0xC5] = 0x3C;
    let chance = [];
    const port = P.machine(M, { chrout: b => said.push(b), irqByte: a => M[a], border: () => {},
                               trace: (...e) => { if (e[0] === 'cond' && e[1] === 2) chance.push(e); } });
    const g = port.run();
    let st = g.next();
    const digits = a => String.fromCharCode(...M.subarray(a, a + 3));
    legs.forEach((cmds, k) => {
      for (const c of cmds) {
        st = g.next(typed(c));
        if (chance.length) fail('walkthrough:', c, 'tests a chance condition in room', M[T.ROOM]);
        chance = [];
      }
      if (k === legs.length - 2 && (M[T.ROOM] !== 115 || !M[T.FLAGS + 12] || digits(0x0F48) !== '150'))
        fail('walkthrough: after closing, room', M[T.ROOM], 'flag 12', M[T.FLAGS + 12], 'score', digits(0x0F48));
    });
    if (M[T.ROOM] !== 116 || !M[T.FLAGS + 10] || !/splashed/i.test(ascii(said)))
      fail('walkthrough: the end is room', M[T.ROOM], 'flag 10', M[T.FLAGS + 10]);
  }
  const route1 = legs.flat().map(typed);
  if (session(ram, route1, 'walkthrough', executed)) lines += route1.length;
  // quitting, another game, and N to it
  const quit = ['quit', 'n', 'quit', 'y', 'y', 'look', 'quit', 'Y', 'quit', 'yes', 'N', 'look', 'quit', 'y', 'n'].map(typed);
  if (session(ram, quit, 'quit', executed)) lines += quit.length;
  // the 10,000th command: the turn digits poked to 9999 in both
  const t9999 = [{ poke: [[0x0F68, 0x39], [0x0F69, 0x39], [0x0F6A, 0x39], [0x0F6B, 0x38]], text: typed('look') }, typed('look'), typed('score')];
  if (session(ram, t9999, 'turn 9999', executed)) lines += t9999.length;
  // twenty objects in the building as treasures: the score's hundreds digit
  const twenty = [];
  for (let n = 1; n <= 20; n++) twenty.push([T.OBJ - 2 + 2 * n, 3], [T.OBJ - 1 + 2 * n, 0x10]);
  if (session(ram, [{ poke: twenty, text: typed('score') }, typed('score')], 'score 200', executed)) lines += 2;
  const sessions = +(process.argv[2] || 40);
  for (let s = 0; s < sessions && !bad; s++) {
    const n = 150 + rnd(250);
    const ls = Array.from({ length: n }, () => randomLine);
    if (session(ram, ls, 'random session ' + s, executed)) lines += n;
  }
  let code = 0, ran = 0;
  const missed = [];
  for (const r of G.listing.records) if (r.t === 'code' && r.a >= 0x0F99 && r.a < 0x1BAA) {
    code++;
    if (executed[r.a]) ran++; else missed.push(r.a.toString(16));
  }
  if (process.env.SHOW_MISSED) console.log('not run:', missed.join(' '));
  console.log(`${bad ? 'FAIL' : 'ok'}: ${lines} lines in ${sessions + 5} sessions; the game ran ${ran} of its ${code} instructions`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
