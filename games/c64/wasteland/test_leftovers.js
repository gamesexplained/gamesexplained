#!/usr/bin/env node
// Hold the Leftovers sections of the Discoveries tab (discoveries.html, from "The ending" down) to
// the game's own code and to the committed listings. The page's blocks WLScene, WLEnding and
// WLReport (leftovers/code.js) run in node on WLFight (reference/wasteland-fight.js: the engine's,
// the game's and one map's listing laid over each other, the game's routines run on the kit's
// 6502), and what the page says is made again here:
// - the ending: module 4 run for one to four parties, every mix of parties on and off the base's
//   five maps and every party in the lead, with who dies, who leads afterwards and which
//   sentences are printed;
// - the countdown: the units a step is worth on each of the 42 maps against the page's table;
// - the cut squares of Base Cochise and the Agricultural Center, run as the page runs them, and
//   a walk of every record a square of those maps leads to, which finds none of them;
// - the blade storm for a first Ranger with and without Agility, cash and Acrobat;
// - the utilities' printout, its two slips, and the two messages nothing prints;
// - the fight's list of keys against its prompt;
// - Quartz's spare exits, and the lines of text that no record names;
// - the bytes under Needles' empty squares against the C64 game's own routine, and the Apple II
//   addresses among them.
// Everything it needs is committed: no disk image, no snapshot, no emulator. It exits 1 on any
// difference.
//   node games/c64/wasteland/test_leftovers.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const WLFight = g.run('reference/wasteland-fight.js', 'fight/fight.js', 'WLFight').WLFight;
const { WLScene, WLEnding, WLReport } = g.run('discoveries.html', 'leftovers/code.js', 'WLScene', 'WLEnding', 'WLReport');
const html = g.read('discoveries.html');
const page = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<\/?(?:td|th|tr|p|div|li|section|h2|table|thead|tbody|br)\b[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, '\'').replace(/\s+/g, ' ');
const D = JSON.parse(/<script type="application\/json" id="wl-left">([\s\S]*?)<\/script>/.exec(html)[1]);
// the Maps tab's decoder, the block between its two markers in levels.html
const WLMaps = (() => {
  const src = g.read('levels.html'), a = src.indexOf('/* wl:maps.js'), b = src.indexOf('/* /wl:maps.js */');
  const scope = {}; new Function('module', 'globalThis', src.slice(a, b))({ exports: {} }, scope); return scope.WLMaps;
})();

let bad = 0, checks = 0;
const fail = (what, ...more) => { if (bad++ < 40) console.log('DIFFERS', what, ...more); };
const same = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) fail(what, 'got', JSON.stringify(got), 'expected', JSON.stringify(want)); };
const ok = (what, yes, ...more) => { checks++; if (!yes) fail(what, ...more); };
const says = text => { checks++; if (!page.includes(text)) fail('the page does not say', JSON.stringify(text)); };
const num = n => n.toLocaleString('en-GB');

const listings = {};
const part = id => { if (!listings[id]) { const L = g.listing('parts/' + id + '/listing.json'); L.sym = n => { if (!L.byName.has(n)) throw new Error('no symbol ' + n); return L.byName.get(n); }; listings[id] = L; } return listings[id]; };
const mapId = n => 'map-' + String(n).padStart(2, '0');
const mapIds = fs.readdirSync(path.join(__dirname, 'parts')).filter(d => /^map-\d\d$/.test(d)).sort().map(d => +d.slice(4));
const mapOf = n => { const P = part(mapId(n)); return WLMaps.mapOf(n, new Uint8Array(P.ram), new Uint8Array(P.has)); };
const machine = (map, seed, size) => WLFight.create({ engine: part('engine'), game: part('game'), map: part(mapId(map)), mapNumber: map, CPU, random: WLFight.seeded(seed || 1), size: size || 4 });
const w16 = (m, a) => m[a] | m[a + 1] << 8;
const hex = (ram, a, n) => { const s = []; for (let i = 0; i < n; i++) s.push(ram[a + i].toString(16).toUpperCase().padStart(2, '0')); return s.join(' '); };
const strip = s => String(s).replace(/<[^>]+>/g, '');
// the page's tables, a row of plain cells each
const tableOf = id => {
  const from = html.indexOf('id="' + id + '"'), body = html.slice(html.indexOf('<tbody>', from), html.indexOf('</tbody>', from));
  return [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(r => [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, '\'').replace(/\s+/g, ' ').trim()));
};
const titles = JSON.parse(/<script type="application\/json" id="wl-titles">([\s\S]*?)<\/script>/.exec(g.read('levels.html'))[1]);
const message = (n, k) => { const M = mapOf(n); return WLMaps.textPlain(WLMaps.message(M.m, w16(M.m, M.rec), k)).trim(); };

// ---- every record that a square leads to ----
// the pairs a record's change names, followed from every square of the map, as the Maps tab reads them
const NAMES = ['plain', 'message', 'check', 'encounter', 'object', 'loot', 'action', 'class 7', 'question', 'radiation', 'exit', 'obstacle', 'remote change', 'class 13', 'class 14', 'monster group'];
const RX = new RegExp('(' + NAMES.join('|') + ') square (\\d+)', 'g');
function reached(n) {
  const M = mapOf(n), w = M.w, seen = new Set(), queue = [], messages = new Set();
  const push = (c, k) => { const id = c + ':' + k; if (!seen.has(id)) { seen.add(id); queue.push([c, k]); } };
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) push(WLMaps.classOf(M, x, y), WLMaps.numberOf(M, x, y));
  const m = new Uint8Array(M.m), N = Object.assign({}, M, { m });
  while (queue.length) {
    const [c, k] = queue.shift(); let d;
    m.set(M.m); m[0x3400] = (m[0x3400] & 0x0F) | (c << 4); m[0x3400 + (w * w >> 1)] = k;
    try { d = WLMaps.describe(N, 0, 0); } catch (e) { continue; }
    for (const r of d.rows) {
      const t = strip(r[1]); let mm;
      RX.lastIndex = 0; while ((mm = RX.exec(t))) push(NAMES.indexOf(mm[1]), +mm[2]);
      const rx = /\(message (\d+)\)/g; while ((mm = rx.exec(t))) messages.add(+mm[1]);
    }
  }
  return { seen, messages };
}
// one record of a map, described as the Maps tab describes it
function describe(n, c, k) {
  const M = mapOf(n), w = M.w, m = new Uint8Array(M.m);
  m[0x3400] = (m[0x3400] & 0x0F) | (c << 4); m[0x3400 + (w * w >> 1)] = k;
  return WLMaps.describe(Object.assign({}, M, { m }), 0, 0).rows.map(r => strip(r[0]) + ': ' + strip(r[1])).join(' | ');
}
// a class and a number written onto a square, as the page's put() does
const put = (F, x, y, c, n) => m => {
  const w = F.width, i = y * w + x, a = 0x3400 + (i >> 1);
  m[a] = x & 1 ? (m[a] & 0xF0) | c : (m[a] & 0x0F) | (c << 4);
  m[0x3400 + (w * w >> 1) + i] = n;
};
const squareOf = (F, x, y) => { const w = F.width, i = y * w + x, b = F.m[0x3400 + (i >> 1)]; return [x & 1 ? b & 15 : b >> 4, F.m[0x3400 + (w * w >> 1) + i]]; };

// ---- the ending ----
{
  const m4 = part('module-4'), F = machine(D.endingMap, 1, 4), names = [1, 2, 3, 4].map(i => F.name(i));
  same('the page\'s four Rangers', D.rangers, names);
  same('the places of the ending\'s plate', D.places.map(p => p.map), [20, 16, 0, 1]);
  const BASE = [16, 17, 18, 19, 20], AWAY = [0, 1, 26, 49];
  let cases = 0, odd = 0;
  for (let np = 1; np <= 4; np++) for (let mask = 0; mask < (1 << np); mask++) for (let cur = 0; cur < np; cur++) {
    const parties = [];
    for (let i = 0; i < np; i++) parties.push({ members: [i + 1], map: mask >> i & 1 ? BASE[(i + cur) % 5] : AWAY[i], x: 10 + i, y: 20 + i });
    const r = WLEnding.run(F, m4, parties, cur); cases++;
    const said = r.events.filter(e => e.say).map(e => e.say.join('\n')).join('\n');
    const killed = (said.match(/^.+ was killed in the blast\.$/gm) || []).map(l => l.replace(' was killed in the blast.', ''));
    const dead = parties.filter((p, i) => mask >> i & 1), live = parties.filter((p, i) => !(mask >> i & 1));
    const pics = r.events.filter(e => 'picture' in e).map(e => e.picture).join('');
    const good = JSON.stringify(killed) === JSON.stringify(dead.map(p => names[p.members[0] - 1]))
      && r.alive === (live.length > 0) && r.armed === 0
      && pics === '0' + '1'.repeat(dead.length) + (live.length ? '2' : '')      // the dark figure once for each death
      && /gave their lives/.test(said) === (dead.length > 0) && /neighboring hilltop/.test(said) === (live.length > 0) && /dedication/.test(said)
      && (!live.length || (r.parties === live.length
        && live.every((p, k) => r.tables[k][10] === p.map && r.tables[k][8] === p.x && r.names[k][0] === names[p.members[0] - 1])
        && r.current === (mask >> cur & 1 ? 0 : live.indexOf(parties[cur]))))
      && r.events.some(e => e.call === 'shake')
      && r.events.some(e => e.call === 'cellWrite' && e.a === 2 && e.x === 2 && e.y === 3);    // the world map's ruin, survivors or none
    if (!good) { odd++; fail('the ending for ' + np + ' parties, mask ' + mask.toString(2) + ', party ' + cur + ' in the lead', JSON.stringify(r).slice(0, 400)); }
  }
  same('the ending\'s cases', [cases, odd], [98, 0]);
  // a party of several: the three inside die, the one in Quartz leads on
  const r = WLEnding.run(F, m4, [{ members: [1, 2, 3], map: 17 }, { members: [4], map: 1 }], 0);
  same('three inside and one in Quartz', [r.alive, r.parties, r.names[0]], [true, 1, [names[3]]]);
  const said = r.events.filter(e => e.say).map(e => e.say.join(' ')).join(' ');
  for (const t of ['But certainly most important of all were the rangers who gave their lives to destroy Base Cochise, the greatest threat that man has ever known.', 'was killed in the blast.']) { ok('the ending prints ' + t, said.includes(t)); says(t); }
  // the limits of the base in the module's own code: CMP #$10 and CMP #$15 after the table's map byte
  const L = m4.listing.records.filter(q => q.a >= 0xCA69 && q.a <= 0xCB16 && q.m === 'cmp').map(q => q.o);
  ok('module 4 compares a party\'s map with 16 and 21', L.includes('#$10') && L.includes('#$15'), L.join(' '));
  // the world map's ruin: class 4, number 2, and its line
  ok('the ruin\'s line', /fireblackened ruins of Base Cochise/.test(describe(0, 4, 2)));
  says('The debris littered here is the fireblackened ruins of Base Cochise.');
  for (const f of ['ending-base.png', 'ending-blast.png', 'ending-killed.png', 'ending-hilltop.png']) ok('reference/' + f, fs.existsSync(path.join(__dirname, 'reference', f)));
}

// ---- the countdown ----
{
  const G = part('game'), at = G.sym('countdown_check');
  const cpx = G.listing.records.find(q => q.a > at && q.a < at + 0x2B && q.m === 'cpx');
  same('the countdown is 240 units', cpx && cpx.o, '#$F0');
  const groups = {};
  for (const id of mapIds) {
    const L = part(mapId(id)), h = L.sym('map_record');
    const units = L.ram[h + 0x36], seconds = (L.ram[h + 0x35] + L.ram[h + 0x34] / 256) * 60;
    const k = units + ':' + seconds; (groups[k] = groups[k] || { units, seconds, maps: [] }).maps.push(id);
  }
  const rows = Object.values(groups).map(q => ({ maps: q.maps, units: q.units, steps: 240 / q.units, minutes: 240 / q.units * q.seconds / 60 })).sort((a, b) => b.steps - a.steps || b.minutes - a.minutes);
  const clock = m => m === 60 ? '1 hour' : m === 120 ? '2 hours' : m + ' minutes';
  const table = tableOf('wl-hour');
  same('the countdown table', table.map(r => r.slice(1)), rows.map(r => [String(r.units), String(r.steps), clock(r.minutes)]));
  same('the maps of each row', rows.map(r => r.maps.length <= 3 ? r.maps : r.maps.length), [28, 10, [38, 39], [40], [0]]);
  ok('the base\'s four inside maps are in the first row, its ground in the second', [17, 18, 19, 20].every(n => rows[0].maps.includes(n)) && rows[1].maps.includes(16));
  ok('the table names the rows', /^The 28 indoor/.test(table[0][0]) && /^Ten towns/.test(table[1][0]) && /temple/.test(table[2][0]) && /jail/.test(table[3][0]) && /world map/.test(table[4][0]));
  says('The hour before the blast is 240 steps inside the base and 15 on the world map');
}

// ---- the cut climb of Base Cochise, and the Old Man ----
{
  const C = D.climb, O = D.oldman;
  const scene = (map, size, seed) => { const F = machine(map, seed, size); return { F, S: WLScene.attach(F) }; };
  const arrive = (size, n) => { const { F, S } = scene(C.map, size); const r = S.run(C.x, C.y, '', put(F, C.x, C.y, 2, n)); return { lines: r.lines, sq: squareOf(F, C.x, C.y) }; };
  const LONE = 'All alone you have no way to get out of here!', RAIL = 'The railing above you is damaged and you can get over it, if you can somehow get up to it.';
  const TWO = 'There are enough of you that one could stand on another\'s shoulders and reach the rail.', FEAT = 'This feat requires good balance. Choose carefully.';
  for (const size of [1, 3, 4]) same('a party of ' + size + ' under the railing', arrive(size, C.arrive), { lines: [LONE, RAIL], sq: [2, C.look] });
  same('a party of 2 under the railing', arrive(2, C.arrive), { lines: [TWO, FEAT], sq: [2, C.balance] });
  const use = (size, n, kind, thing, seed, prep) => { const { F, S } = scene(C.map, size, seed); const p = put(F, C.x, C.y, 2, n); const before = F.con(1); const r = S.use(C.x, C.y, kind, thing, 1, (m, rec) => { p(m); if (prep) prep(m, rec); }); return { lines: r.lines, sq: squareOf(F, C.x, C.y), lost: before - F.con(1) }; };
  {
    const F = machine(C.map, 1, 4), a = F.rec(1);
    same('Hell Razor\'s rope and crowbar', [F.m[a + C.ropeAt], F.m[a + C.crowbarAt]], [54, 45]);
    ok('the rope\'s test', /item 54, used on the square/.test(describe(C.map, 2, C.look)));
  }
  same('a rope', use(4, C.look, 1, C.ropeAt), { lines: ['The rope arcs up and catches. With no trouble you scramble up to the causeway.'], sq: [10, C.exit], lost: 0 });
  same('a crowbar', use(4, C.look, 1, C.crowbarAt), { lines: ['That doesn\'t seem to work.'], sq: [2, C.arrive], lost: 0 });
  // the exit: two squares west of the square it is on
  { const { F, S } = scene(C.map, 2); const r = S.run(C.x, C.y, '', put(F, C.x, C.y, 10, C.exit)); same('the exit sets the party down', r.at, [C.x - 2, C.y]); }
  let pass = 0, failed = 0, lo = 99, hi = 0;
  for (let seed = 1; seed <= 40; seed++) for (const [kind, thing] of [[2, C.agl], [0, C.acrobat]]) {
    const r = use(2, C.balance, kind, thing, seed);
    if (r.sq[0] === 10) { pass++; same('a pass on the shoulders', [r.lines, r.sq, r.lost], [['Up on your comrade\'s shoulders you reach the rail and help the others up.'], [10, C.exit], 0]); }
    else { failed++; lo = Math.min(lo, r.lost); hi = Math.max(hi, r.lost); ok('a fall from the shoulders', r.lines[0] === 'You lose your balance and topple down to the floor.' && r.sq[1] === C.balance && r.lost >= 4 && r.lost <= 24, JSON.stringify(r)); }
  }
  ok('the throw goes both ways', pass > 0 && failed > 0 && lo >= 4 && hi <= 24, pass, failed, lo, hi);
  ok('the fall is 4d6', /CON −4d6/.test(describe(C.map, 2, C.balance)));
  const R = reached(C.map);
  for (const id of ['2:' + C.arrive, '2:' + C.look, '2:' + C.balance, '10:' + C.exit]) ok('map 17\'s record ' + id + ' is led to by no square', !R.seen.has(id));
  for (const t of [LONE, TWO, FEAT, 'Up on your comrade\'s shoulders you reach the rail and help the others up.', 'You lose your balance and topple down to the floor.', 'That doesn\'t seem to work.']) says(t);
  // the Old Man
  const { F, S } = scene(O.map, 4), r = S.run(O.x, O.y, '', put(F, O.x, O.y, 10, O.exit));
  const LINE = 'The Old Man nods and leads you to Veggie Center, communal living quarters of the Veggies, where he smiles and leaves.';
  same('the Old Man\'s exit', [r.lines[0], r.at], [LINE, [25, 29]]);
  ok('map 9\'s exit ' + O.exit + ' is led to by no square', !reached(O.map).seen.has('10:' + O.exit));
  says(LINE); says('column 25, row 29');
}

// ---- the blade storm ----
{
  const B = D.blades;
  const M = mapOf(B.map), on = [];
  for (let y = 0; y < M.w; y++) for (let x = 0; x < M.w; x++) if (WLMaps.classOf(M, x, y) === 2 && WLMaps.numberOf(M, x, y) === B.n) on.push([x, y]);
  same('the blade storm\'s squares', on, [[25, 11], [26, 11], [27, 11], [28, 11]]);
  ok('the page\'s square is one of them', on.some(s => s[0] === B.x && s[1] === B.y));
  const d = describe(B.map, 2, B.n);
  ok('the record\'s three tests in order', /Tests: AGL, difficulty 5\s*cash below 16\s*skill 13, difficulty 4/.test(d) && /CON −8/.test(d), d);
  const run = (agl, cash, acro, seed) => {
    const F = machine(B.map, seed, 4), S = WLScene.attach(F);
    const r = S.run(B.x, B.y, '', (m, rec) => {
      const a = rec(1);
      m[a + 0x12] = agl; m[a + 0x15] = cash & 255; m[a + 0x16] = cash >> 8; m[a + 0x17] = 0;
      for (let o = 0x80; o < 0x9E; o += 2) if (m[a + o] === B.acrobat) { m[a + o] = 0; m[a + o + 1] = 0; }
      if (acro) for (let o = 0x80; o < 0x9E; o += 2) if (!m[a + o]) { m[a + o] = B.acrobat; m[a + o + 1] = acro; break; }
    });
    return { lost: 28 - F.con(1), others: [2, 3, 4].map(i => F.con(i)), lines: r.lines };
  };
  const tally = (agl, cash, acro) => { let pass = 0; for (let seed = 1; seed <= 20; seed++) { const r = run(agl, cash, acro, seed); if (!r.lost) pass++; else if (r.lost !== 8) fail('the blades cut for', r.lost); } return pass; };
  same('Agility 1 with $0, $15, $16 and $500, and no Acrobat', [0, 15, 16, 500].map(c => tally(1, c, 0)), [20, 20, 0, 0]);
  same('Agility 1 and Acrobat 7 with $15 and $16', [15, 16].map(c => tally(1, c, 7)), [20, 0]);
  const strong = tally(60, 16, 0);
  ok('a high Agility passes with $16, on the throw', strong > 10, strong);
  const r = run(1, 16, 7, 1);
  same('only the first Ranger is cut', [r.lost, r.others], [8, [27, 34, 23]]);
  ok('the lines of the storm', r.lines.some(l => /shrieks a hideous accompaniment/.test(l)) && run(1, 15, 0, 1).lines.some(l => /is choked off as you duck and twist your way free/.test(l)));
  says('is choked off as you duck and twist your way free');
  // the cash test's two ways out: a pass, or the end of the member's tests
  const G = part('game'), recs = G.listing.records, i = recs.findIndex(q => q.a === 0x8E73);
  const after = recs.slice(i, i + 9).map(q => q.m + ' ' + (q.o || ''));
  ok('the cash test ends the list either way', /jsr api_cash_compare/.test(after.join(';')) && /bcs b_8EC0/.test(after.join(';')) && /bcc b_8E8C/.test(after.join(';')), after.join('; '));
}

// ---- the printout ----
{
  const U = part('utils'), F = machine(D.printMap, 1, 4);
  const r = WLReport.run(F, U), lines = r.text.split('\n');
  ok('the routine reaches the printer', r.sent);
  same('a sheet for each of the four', lines.filter(l => /^Name: /.test(l)).map(l => l.slice(6, 24).trim()), D.rangers);
  ok('a sheet is 33 lines', lines.findIndex((l, i) => i && /^Name: /.test(l)) === 33);
  ok('no armour prints as Fists', lines.filter(l => /Armor Equipped: Fists/.test(l)).length === 4);
  ok('the knife prints as Kni', lines.some(l => /^Kni {5,}/.test(l)) && !/Knife(?! throw| fight)/.test(r.text));
  ok('the first sheet', lines[0] === 'Name: Hell Razor        Rank: Private' && /^ST = 12 {2}IQ = 14/.test(lines[1]) && /Sex: Male {4}Nat: U\.S\./.test(lines[2]));
  const rec = U.listing.records.find(q => q.l === 'print_report');
  ok('no instruction leads to the printout', rec && !(rec.x && rec.x.length));
  let words = 0;
  for (const q of U.listing.records) if (q.oa === rec.a || (q.t === 'addr' && q.b && (q.b[0] | q.b[1] << 8) === rec.a)) words++;
  same('no operand or table word holds its address', words, 0);
  // the two messages: printed here by the program's own routine, and loaded by no instruction before a print
  const say = n => { const keep = F.save(); for (let a = 0x7E00; a < 0x9000; a++) if (U.has[a]) F.m[a] = U.ram[a]; F.take(); F.call(U.sym('print_msg_wrapped'), { a: n }, 3e6); F.call(WLFight.A.flushLine); const t = F.take().replace(/\s+/g, ' ').trim(); F.load(keep); return t; };
  same('message 9', say(9), 'Setup printer to the top of form and enter the slot # the printer card is in. Default slot = 1.');
  same('message 42', say(42), 'There is no card in that slot.');
  const code = U.listing.records.filter(q => q.t === 'code');
  const loads = code.filter((q, i) => q.m === 'lda' && (q.o === '#$09' || q.o === '#$2A') && code[i + 1] && code[i + 1].m === 'jsr' && /print_msg/.test(code[i + 1].o || ''));
  same('no instruction prints message 9 or 42', loads.map(q => q.a.toString(16)), []);
  says('Setup printer to the top of form and enter the slot # the printer card is in. Default slot = 1.'); says('There is no card in that slot.'); says('Armor Equipped: Fists');
}

// ---- the fight's keys ----
{
  const G = part('game'), at = G.sym('order_keys');
  let keys = ''; for (let a = at; G.ram[a]; a++) keys += String.fromCharCode(G.ram[a] & 0x7F);
  same('the keys of a fight', [at, keys], [0xB4BD, ' HAWRELUS']);
  same('the handlers of space and S', [G.sym('choose_view_map'), G.sym('choose_attack_listed')], [0xB489, 0xB4A0]);
  // the prompt, among the game's own messages
  const F = machine(1, 1, 4); let prompt = '';
  for (let n = 0; n < 128 && !prompt; n++) { F.take(); try { F.call(0x7F50, { a: n }, 2e6); F.call(WLFight.A.flushLine); } catch (e) { continue; } const t = F.take().replace(/\s+/g, ' ').trim(); if (/Unjam/.test(t)) prompt = t; }
  const SEVEN = 'R)un U)se H)ire E)vade A)ttack W)eapon L)oad/Unjam';
  ok('the prompt of a fight', prompt.endsWith(SEVEN) && !/S\)|pace/.test(prompt), prompt);
  says(SEVEN);
}

// ---- Quartz ----
{
  const R = reached(1), M = mapOf(1), shacks = [];
  for (let k = 21; k <= 84; k++) shacks.push(k);
  ok('exits 21 to 84 all lead into map 5', shacks.every(k => /Leads to: map 5 /.test(describe(1, 10, k))));
  same('the shacks on squares and spare', [shacks.filter(k => R.seen.has('10:' + k)).length, shacks.filter(k => !R.seen.has('10:' + k)).length], [30, 34]);
  const lines = new Set(shacks.map(k => (/\(message (\d+)\)/.exec(describe(1, 10, k)) || [])[1]));
  same('the three lines of a door', [...lines].sort((a, b) => a - b).map(k => message(1, +k)), ['An old abandoned shack.', 'It looks dark in here.', 'This doesn\'t look like a safe place to enter.']);
  const off = [2, 9, 12, 15].map(k => { const d = describe(1, 10, k), q = /Leads to: map 1, column (\d+), row (\d+)/.exec(d); return [+q[1], +q[2], /slimy underground/.test(d), R.seen.has('10:' + k)]; });
  same('the four exits past the edge', off, [[62, 62, false, false], [58, 10, true, false], [57, 33, true, false], [57, 56, true, false]]);
  same('Quartz and Needles across', [M.w, mapOf(26).w], [32, 64]);
  for (const t of ['An old abandoned shack.', 'It looks dark in here.', 'This doesn\'t look like a safe place to enter.', 'You crawl through the slimy underground.']) says(t);
}

// ---- the lines no record names ----
{
  const table = tableOf('wl-unshown');
  const want = { 13: [20, 45], 16: [4, 28], 17: [10, 11, 12], 20: [52], 29: [1], 49: [16, 39, 49, 50, 59] };
  const rows = [];
  for (const n of Object.keys(want).map(Number)) {
    const R = reached(n), L = part(mapId(n));
    for (const k of want[n]) {
      ok('map ' + n + '\'s message ' + k + ' is named by no record', !R.messages.has(k));
      ok('map ' + n + '\'s code loads no ' + k, !L.listing.records.some(q => q.t === 'code' && q.m === 'lda' && q.o === '#$' + k.toString(16).toUpperCase().padStart(2, '0')));
      rows.push([titles[n], message(n, k)]);
    }
  }
  same('the table of lines', table, rows);
}

// ---- Needles ----
{
  const N = D.needles, M = mapOf(N.map), w = M.w, L = part(mapId(N.map)), G = part('game'), numbers = 0x3400 + (w * w >> 1);
  let plain = 0, held = 0, stream = [];
  for (let y = N.first; y <= N.last; y++) for (let x = 1; x <= w - 2; x++) if (WLMaps.classOf(M, x, y) === 0) { plain++; if (L.ram[numbers + y * w + x]) held++; }
  same('the empty squares of rows 1 to 47 and the bytes they hold', [w, plain, held], [64, 2345, 2200]);
  says(num(held) + ' bytes');
  // the table: the C64's routine beside the bytes from column 2 of row 1
  const table = tableOf('wl-le-needles'), c64 = 0x9A65, at = numbers + 1 * w + 2, lens = [6, 5, 5, 3, 12, 3, 3, 3];
  let o = 0; const rows = [];
  for (const n of lens) { rows.push([hex(G.ram, c64 + o, n), hex(L.ram, at + o, n)]); o += n; }
  same('the two routines', table.map(r => r.slice(1)), rows);
  same('the bytes compared', o, 40);
  for (let x = 2; x < 42; x++) ok('row 1, column ' + x + ' is an empty square', WLMaps.classOf(M, x, 1) === 0);
  // the same instructions: every opcode equal, as the game's listing splits them
  const code = G.listing.records.filter(q => q.t === 'code' && q.a >= c64 && q.a < c64 + 40);
  ok('every instruction has the same opcode', code.every(q => L.ram[at + q.a - c64] === G.ram[q.a]) && code.length === 17, code.length);
  const word = (ram, a) => ram[a] | ram[a + 1] << 8;
  same('the copy sat $2223 lower', [word(G.ram, 0x9A85) - word(L.ram, at + 0x20), word(G.ram, 0x9A8B) - word(L.ram, at + 0x26)], [0x2223, 0x2223]);
  same('its messages are four higher', [L.ram[at + 7] - G.ram[c64 + 7], L.ram[at + 12] - G.ram[c64 + 12]], [4, 4]);
  // the C64's two messages
  const F = machine(1, 1, 4), text = n => { F.take(); F.call(0x7F50, { a: n }, 2e6); F.call(WLFight.A.flushLine); return F.take().replace(/\s+/g, ' ').trim(); };
  same('the question', [text(G.ram[c64 + 7]), text(G.ram[c64 + 12])], ['Do you want to', 'dismiss ' + F.name(1) + ' forever?']);
  // the Apple II's addresses, in the rows from 32 down
  for (let y = N.hardware; y <= N.last; y++) for (let x = 0; x < w; x++) stream.push(WLMaps.classOf(M, x, y) === 0 ? L.ram[numbers + y * w + x] : -1);
  const has = pat => { for (let i = 0; i + pat.length <= stream.length; i++) { let k = 0; while (k < pat.length && stream[i + k] === pat[k]) k++; if (k === pat.length) return true; } return false; };
  ok('waits for a key at $C000 and clears it at $C010', has([0xAD, 0x00, 0xC0, 0x10, 0xFB, 0x2C, 0x10, 0xC0]));
  ok('the switches $C008, $C009 and $C083', has([0x8D, 0x08, 0xC0]) && has([0x8D, 0x09, 0xC0]) && has([0x2C, 0x83, 0xC0]));
  ok('prints through $FDED', has([0x20, 0xED, 0xFD]));
  // the leftovers in the C64 programs
  same('BIT $C010 in the game and the utilities', [hex(G.ram, 0x88FF, 3), hex(G.ram, 0x8A31, 3), hex(part('utils').ram, 0x82B3, 3)], ['2C 10 C0', '2C 10 C0', '2C 10 C0']);
  const tail = G.listing.records.find(q => q.l === 'leftover_c5b3');
  ok('the 77 bytes at the end of the game', tail && tail.a === 0xC5B3 && G.has[0xC5FF] && !G.has[0xC600] && 0xC600 - 0xC5B3 === 77 && !(tail.x && tail.x.length));
}

console.log(checks + ' checks, ' + bad + ' differing');
process.exit(bad ? 1 : 0);
