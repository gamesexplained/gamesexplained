#!/usr/bin/env node
// Hold the rules sections of The party tab (party.html, from "Combat shooting" down) to the game's
// own code and to the committed listings. The page's block WLScene (party/scene.js) runs in node
// on WLFight (reference/wasteland-fight.js: the engine's, the game's and one map's listing laid
// over each other, the game's routines run on the kit's 6502), and what the page says is made
// again here:
// - the skills: names from the engine's own messages, the attribute, IQ and price of each from
//   the engine's, the library's and the Ranger Center's tables, and the count of tests from every
//   check record that a square of the 42 maps leads to;
// - Combat shooting: in no library, item, test or NPC record;
// - the squares that read a Ranger's sex and rank, run for parties of men, women and both;
// - the diseases: every routine that sets a bit, the health clock for each of the eight bits, a
//   dying Ranger with and without Rabies, and the doctor's list from the doctor's own routine;
// - the doctors and libraries: every record of the 42 maps against the page's two tables, and a
//   visit to the Quartz doctor on the module's code for the exam, the cures and the free point;
// - the Ranger Center: the key it waits for, the key table, and the routine the key would run.
// Everything it needs is committed: no disk image, no snapshot, no emulator. It exits 1 on any
// difference.
//   node games/c64/wasteland/test_rules.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const WLFight = g.run('reference/wasteland-fight.js', 'fight/fight.js', 'WLFight').WLFight;
const WLScene = g.run('party.html', 'party/scene.js', 'WLScene').WLScene;
const html = g.read('party.html');
const page = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<\/?(?:td|th|tr|p|div|li|section|h2|table|thead|tbody|br)\b[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const D = JSON.parse(/<script type="application\/json" id="wl-rules">([\s\S]*?)<\/script>/.exec(html)[1]);
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
const part = id => listings[id] || (listings[id] = g.listing('parts/' + id + '/listing.json'));
const mapId = n => 'map-' + String(n).padStart(2, '0');
const mapIds = fs.readdirSync(path.join(__dirname, 'parts')).filter(d => /^map-\d\d$/.test(d)).sort().map(d => +d.slice(4));
const mapOf = n => { const P = part(mapId(n)); return WLMaps.mapOf(n, new Uint8Array(P.ram), new Uint8Array(P.has)); };
const machine = (map, seed, size) => WLFight.create({ engine: part('engine'), game: part('game'), map: part(mapId(map)), mapNumber: map, CPU, random: WLFight.seeded(seed || 1), size: size || 4 });
const overlay = (F, id) => { const L = part(id); for (let a = 0; a < 0x10000; a++) if (L.has[a]) F.m[a] = L.ram[a]; };
const w16 = (m, a) => m[a] | m[a + 1] << 8;
const entry = (M, c, k) => w16(M.m, w16(M.m, M.rec + 6 + 2 * c) + 2 * k);
// the page's tables, a row of plain cells each
const tableOf = (id, heading) => {
  const from = id ? html.indexOf('id="' + id + '"') : html.indexOf(heading), body = html.slice(html.indexOf('<tbody>', from), html.indexOf('</tbody>', from));
  return [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(r => [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()));
};
const titles = JSON.parse(/<script type="application\/json" id="wl-titles">([\s\S]*?)<\/script>/.exec(g.read('levels.html'))[1]);

// ---- every check record that a square leads to ----
// the pairs a record's change names, followed from every square of the map, as the Maps tab reads them
const NAMES = ['plain', 'message', 'check', 'encounter', 'object', 'loot', 'action', 'class 7', 'question', 'radiation', 'exit', 'obstacle', 'remote change', 'class 13', 'class 14', 'monster group'];
const RX = new RegExp('(' + NAMES.join('|') + ') square (\\d+)', 'g');
const strip = s => String(s).replace(/<[^>]+>/g, '');
function walk(n, fn) {
  const M = mapOf(n), w = M.w, seen = new Set(), queue = [];
  const push = (c, k) => { const id = c + ':' + k; if (!seen.has(id)) { seen.add(id); queue.push([c, k]); } };
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) push(WLMaps.classOf(M, x, y), WLMaps.numberOf(M, x, y));
  const m = new Uint8Array(M.m), N = Object.assign({}, M, { m });
  while (queue.length) {
    const [c, k] = queue.shift(); let d;
    m.set(M.m); m[0x3400] = (m[0x3400] & 0x0F) | (c << 4); m[0x3400 + (w * w >> 1)] = k;
    try { d = WLMaps.describe(N, 0, 0); } catch (e) { continue; }
    for (const r of d.rows) { const t = strip(r[1]); let mm; RX.lastIndex = 0; while ((mm = RX.exec(t))) push(NAMES.indexOf(mm[1]), +mm[2]); }
    fn(c, k, d, M);
  }
}
// a test list with no end mark runs on into the next record's bytes: stop at the first pair that no record means
const junk = p => { let x; return (x = /^skill (\d+)/.exec(p)) ? +x[1] === 0 || +x[1] > 48 : (x = /^item (\d+)/.exec(p)) ? +x[1] === 0 || +x[1] > 94 : (x = /party of exactly (\d+)/.exec(p)) ? +x[1] > 8 : false; };
const skillTests = {}, attrTests = {}, other = { item: 0, cash: 0, size: 0, sex: [], rank: [] }, cut = [], actions = {}, radiation = new Set();
for (let s = 1; s <= 35; s++) skillTests[s] = { tests: 0, maps: new Set(), hard: 0 };
for (const a of ['ST', 'IQ', 'LK', 'SP', 'AGL', 'DEX', 'CHR']) attrTests[a] = { tests: 0, maps: new Set(), hard: 0 };
const robots = [];
for (const n of mapIds) walk(n, (c, k, d, M) => {
  if (c === 6) (actions[n] = actions[n] || []).push(k);
  if (c === 9) radiation.add(n);
  if (c !== 2) return;
  let ch = d.checks || []; const j = ch.findIndex(junk);
  if (j >= 0) { cut.push([n, k]); ch = ch.slice(0, j); }
  if (n === 20 && ch.some(p => /^skill 1,/.test(p))) robots.push(ch.map(p => p.replace(/, difficulty \d+/, '')).sort().join('|'));
  for (const p of ch) {
    let x;
    if ((x = /^skill (\d+)(?:, difficulty (\d+)|, known)/.exec(p))) { const o = skillTests[+x[1]]; if (!o) continue; o.tests++; o.maps.add(n); o.hard = Math.max(o.hard, +(x[2] || 0)); }
    else if ((x = /^(ST|IQ|LK|SP|AGL|DEX|CHR), difficulty (\d+)/.exec(p))) { const o = attrTests[x[1]]; o.tests++; o.maps.add(n); o.hard = Math.max(o.hard, +x[2]); }
    else if ((x = /^attribute \+\$(..), difficulty (\d+)/.exec(p))) { const off = parseInt(x[1], 16); if (off === 0x18) other.sex.push([n, entry(M, 2, k), +x[2]]); if (off === 0x24) other.rank.push([n, entry(M, 2, k), +x[2]]); }
    else if (/^a party of exactly/.test(p)) other.size++; else if (/^cash below/.test(p)) other.cash++; else if (/^item/.test(p)) other.item++;
    else fail('a test the count does not know', n, k, p);
  }
});
same('the records whose test lists run on', cut, [[3, 5], [18, 15], [41, 22]]);

// ---- the skills table ----
const F1 = machine(1, 3), m1 = F1.m;
const ATTR = { 0x0E: 'ST', 0x0F: 'IQ', 0x10: 'LK', 0x11: 'SP', 0x12: 'AGL', 0x13: 'DEX', 0x14: 'CHR' };
const skillName = n => { F1.take(); F1.call(0x0519, { a: n }); F1.call(WLFight.A.flushLine); return F1.take().replace(/\s+/g, ' ').trim(); };
const names = []; for (let n = 1; n <= 35; n++) names.push(skillName(n));
const lib = part('module-2').ram, center = part('ranger').ram, items = part('game').ram;
// every library and doctor: the class 6 records that start $82 and $80
const libraries = [], doctors = [];
for (const n of mapIds) {
  const M = mapOf(n), r = M.m, list = w16(r, M.rec + 6 + 12);
  for (let k = 0; k < 64; k++) {
    const a = w16(r, list + 2 * k); if (a < 0x3A00 || a > 0x7000) break;
    const text = (o, len) => String.fromCharCode(...Array.from(r.slice(a + o, a + o + len)).map(c => c & 0x7F).filter(c => c >= 32)).trim();
    if (r[a] === 0x82) { const sk = []; for (let o = 16; r[a + o] !== 0xFF && o < 60; o++) sk.push(r[a + o]); libraries.push({ map: n, at: a, name: text(4, 12), skills: sk }); }
    if (r[a] === 0x80) doctors.push({ map: n, at: a, name: text(7, 12), heal: r[a + 4], exam: r[a + 5], cure: r[a + 6] });
  }
}
same('how many libraries and doctors', [libraries.length, doctors.length], [8, 7]);
{
  const rows = tableOf('wl-ru-skills');
  same('the skills table has a row for each skill', rows.length, 35);
  for (let n = 1; n <= 35; n++) {
    const b = lib[0xCC6C + n], t = skillTests[n], libs = libraries.filter(l => l.skills.includes(n)).length;
    ok('skill ' + n + ': the two price tables agree', center[0x8502 + n] === b);
    const sold = !libs ? 'Nowhere' : ((b >> 3) <= 18 ? 'The Ranger Center and ' : '') + libs + (libs === 1 ? ' library' : ' libraries');
    same('skill ' + n + ' ' + names[n - 1], rows[n - 1], [names[n - 1], ATTR[m1[0x0DD8 + n]], String(b >> 3), String(b & 7), sold, String(t.tests), String(t.maps.size), t.tests ? String(t.hard) : '–']);
  }
  const arows = tableOf(null, '<th>Attribute</th>'), full = { ST: 'Strength', IQ: 'IQ', LK: 'Luck', SP: 'Speed', AGL: 'Agility', DEX: 'Dexterity', CHR: 'Charisma' };
  same('the attributes table', arows, Object.keys(full).map(k => [full[k], String(attrTests[k].tests), String(attrTests[k].maps.size), String(attrTests[k].hard)]));
  const per = skillTests[9];
  says('Perception is asked for ' + per.tests + ' times on ' + per.maps.size + ' maps, and six of the weapon skills are never asked for');
  says('one level of Perception opens ' + per.tests + ' tests');
  same('the skills no square asks for', Object.keys(skillTests).filter(s => !skillTests[s].tests).map(s => names[s - 1]), ['Clip pistol', 'Knife fight', 'Rifle', 'Assault rifle', 'SMG', 'Combat shooting', 'Energy weapon']);
  same('the skills asked for once', Object.keys(skillTests).filter(s => skillTests[s].tests === 1).map(s => [names[s - 1], [...skillTests[s].maps][0]]), [['Knife throw', 2], ['AT weapon', 33], ['Forgery', 23], ['Clone tech', 13], ['Cyborg tech', 22]]);
  says('Five skills are asked for once in the whole game.');
  same('the robots of the reactor', [robots.length, [...new Set(robots)]], [15, ['ST|skill 1|skill 5']]);
  same('where Brawling is asked for', [...skillTests[1].maps], [20]);
  says('fifteen robots rise from the floor');
  says('The other tests are ' + num(other.item) + ' for an item, ' + other.cash + ' for cash, and ' + other.size + ' for the party\'s size.');
  same('the hardest tests of Strength and Luck', [attrTests.ST.hard, attrTests.LK.hard, 15 + 5 * 30], [30, 30, 165]);
  says('need a total of 165');
  // a skill the Ranger does not have fails without a throw: the game's test of a pair ($8E9F-$8EA7)
  same('no skill, no throw', Array.from(items.slice(0x8EA2, 0x8EA9)), [0x20, 0x59, 0x03, 0xC9, 0x00, 0xF0, 0x10]);
  // the size test of the assembly floor
  const M = mapOf(19), a = entry(M, 2, 11), pairs = []; for (let o = 10; M.m[a + o] !== 0xFF; o += 2) pairs.push([M.m[a + o] >> 5, M.m[a + o + 1]]);
  same('map 19, check 11', [a, pairs], [0x3BE0, [[3, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8]]]);
}

// ---- Combat shooting ----
{
  same('skill 17', [names[16], lib[0xCC6C + 17], center[0x8502 + 17], ATTR[m1[0x0DD8 + 17]]], ['Combat shooting', 0xFF, 0xFF, 'SP']);
  same('the skills that throw with Speed', names.filter((x, i) => m1[0x0DD8 + i + 1] === 0x11), ['Combat shooting']);
  ok('no library lists it', libraries.every(l => !l.skills.includes(17)));
  let item = 0; for (let i = 0; i < 95; i++) if (items[0x3108 + 8 * i + 5] === 17) item++;
  same('no item names it', item, 0);
  same('no test asks for it', skillTests[17].tests, 0);
  const npcs = [...html.matchAll(/data-wl-npc="(\d+):([0-9A-F]+)"/g)].map(x => [+x[1], parseInt(x[2], 16)]);
  same('how many NPC records', npcs.length, 14);
  ok('no NPC has it', npcs.every(([n, a]) => { const r = mapOf(n).m; for (let o = 0x80; o < 0xBC; o += 2) if (r[a + o] === 17) return false; return true; }));
  same('the dearest skill on sale', [names[34], lib[0xCC6C + 35] >> 3, lib[0xCC6C + 35] & 7], ['Cyborg tech', 24, 3]);
  says('reads as IQ 31 and 7 skill points'); says('needs IQ 24 and costs 3'); says('missing from all 95 item records');
}

// ---- the squares that read sex and rank ----
{
  same('the squares that test the sex byte', other.sex, [[2, 0x3C35, 1], [2, 0x3C42, 1], [32, 0x3C2D, 1]]);
  same('the square that tests rank', other.rank, [[35, 0x3BC0, 10]]);
  const S = D.scenes, bar = WLScene.attach(machine(S.men.map, 11));
  const sexes = s => (m, rec) => s.forEach((v, i) => { m[rec(i + 1) + 0x18] = v; });
  const MAN = 'There is a picture of a man painted on this door.', WOMAN = 'There is a picture of a woman painted on the door.';
  const LOOK = 'A man walking out gives the females among you a funny look.', STOP = 'A well-muscled woman stops you at the door. "There are ladies inside, gents. Use your own."';
  same('the men\'s door, four men', bar.run(S.men.x, S.men.y, '', sexes([0, 0, 0, 0])).lines, [MAN]);
  for (let w = 0; w < 4; w++) { const s = [0, 0, 0, 0]; s[w] = 1; same('the men\'s door, Ranger ' + (w + 1) + ' a woman', bar.run(S.men.x, S.men.y, '', sexes(s)).lines.slice(0, 2), [MAN, LOOK]); }
  for (let bits = 0; bits < 16; bits++) {
    const s = [0, 1, 2, 3].map(i => bits >> i & 1), r = bar.run(S.women.x, S.women.y, '', sexes(s), true);
    same('the women\'s door, party ' + s.join(''), [r.refused, r.lines], bits === 15 ? [false, [WOMAN]] : [true, [WOMAN, STOP]]);
  }
  says('the females among you a funny look');
  const lady = (size, sex, cash) => {
    const P = WLScene.attach(machine(S.lady.map, 11, size)), m = P.F.m, a = P.F.rec(1);
    const r = P.run(S.lady.x, S.lady.y, 'Y', (mm, rec) => { mm[rec(1) + 0x18] = sex; mm[rec(1) + 0x15] = cash; mm[rec(1) + 0x16] = 0; mm[rec(1) + 0x17] = 0; mm[rec(1) + 0x28] = 0; });
    return [r.lines[r.lines.length - 1], m[a + 0x28], m[a + 0x15]];
  };
  same('the lady, four Rangers', lady(4, 0, 200), ['"Hey, I can only take on one at a time!"', 0, 200]);
  same('the lady, a woman alone', lady(1, 1, 200), ['"Look, I just don\'t DO ladies."', 0, 200]);
  same('the lady, a man alone with $30', lady(1, 0, 30), ['"Ya can\'t rip me off, sailor. $50 or forget it!"', 0, 30]);
  same('the lady, a man alone with $200', lady(1, 0, 200), ['She brings you into a quiet room, where you have an interesting time. She then walks off, leaving you feeling ... unclean.', 2, 150]);
  says('Look, I just don\'t DO ladies.');
  const gate = WLScene.attach(machine(S.gate.map, 11));
  const NO = 'A defender on the wall yells, "Leave, wasteland scum, you are not old enough to die here."', YES = 'A voice booms from the Citadel. "You would be a fool to dream of assaulting the Citadel."';
  const ranks = s => (m, rec) => s.forEach((v, i) => { m[rec(i + 1) + 0x24] = v; });
  same('the Citadel, ranks 9', gate.run(S.gate.x, S.gate.y, '', ranks([9, 9, 9, 9])).lines, [NO]);
  for (let w = 0; w < 4; w++) { const s = [1, 1, 1, 1]; s[w] = 10; same('the Citadel, Ranger ' + (w + 1) + ' at rank 10', gate.run(S.gate.x, S.gate.y, '', ranks(s)).lines, [YES]); }
  same('the Citadel, rank 255', gate.run(S.gate.x, S.gate.y, '', ranks([1, 255, 1, 1])).lines, [YES]);
  // rank 10's name, from the page's own table of ranks
  ok('rank 10 is Grenadier Major', /<td class="wl-n">10<\/td><td>Grenadier Major<\/td>/.test(html));
  says('the number is 10, the rank of Grenadier Major');
  same('the page\'s Rangers', D.rangers, [1, 2, 3, 4].map(i => F1.name(i)));
}

// ---- the diseases ----
{
  // every routine that sets a bit of +$28: LDY #$28, ORA (character),Y, STA (character),Y
  const sets = L => { const out = []; for (let a = 0x3A00; a < 0xC000; a++) if (L.has[a] && L.ram[a] === 0xA0 && L.ram[a + 1] === 0x28 && L.ram[a + 2] === 0x11 && L.ram[a + 3] === 0x66 && L.ram[a + 4] === 0x91 && L.ram[a + 5] === 0x66) out.push(a); return out; };
  const where = mapIds.filter(n => sets(part(mapId(n))).length);
  same('the maps with a routine that gives a disease', where, [5, 11, 24, 25, 32, 39, 49]);
  same('the game program sets one bit', sets(part('game')), [0x8318]);
  same('the maps with radiation squares', [...radiation].sort((a, b) => a - b), [0, 19, 20, 26, 31, 38]);
  // the disease number in the record of every action that runs one of those routines
  const given = {};
  for (const n of where) {
    const M = mapOf(n), L = part(mapId(n)), at = sets(L)[0];
    // the map's routines: the table the action record's byte 0 indexes is found by the routine's start
    for (const k of actions[n] || []) {
      const a = entry(M, 6, k), d = WLMaps.describe(Object.assign({}, M, { m: (() => { const mm = new Uint8Array(M.m); mm[0x3400] = (mm[0x3400] & 0x0F) | 0x60; mm[0x3400 + (M.w * M.w >> 1)] = k; return mm; })() }), 0, 0);
      const x = /at \$([0-9A-F]{4})/.exec(strip(d.rows.map(r => r[1]).join(' ')));
      if (x && at - parseInt(x[1], 16) >= 0 && at - parseInt(x[1], 16) < 0x20) (given[M.m[a + 3]] = given[M.m[a + 3]] || new Set()).add(n);
    }
  }
  same('what the maps give', Object.keys(given).sort().map(d => [D.diseases[d], [...given[d]]]), [['Wasteland Herpes', [32, 39]], ['Bug byte', [5, 11]], ['Sewer rot', [24, 25]], ['Desert dust', [5, 11, 49]], ['Rabies', [5, 11]]]);
  // the doctor's own list for all eight bits
  const F = machine(1, 3); overlay(F, 'module-0');
  F.take(); F.call(D.exam, { a: 0xFF }); F.call(WLFight.A.flushLine);
  const list = F.take().split('\n').map(l => l.trim()).filter(Boolean);
  same('the doctor\'s list', list, ['"You\'re inflicted with:"'].concat(D.diseases.map((d, i) => (i + 1) + '> ' + d)));
  same('the eight names', D.diseases, ['Radiation poisoning', 'Wasteland Herpes', 'Bug byte', 'Sewer rot', 'Desert dust', 'Rabies', 'D6', 'D7']);
  for (const d of D.diseases.slice(0, 6)) ok('the table names ' + d, tableOf(null, '<th>What gives it</th>').some(r => r[0] === d));
  // the health clock: four Rangers walk Quartz, half a minute and 2 units a step
  const A = WLFight.A;
  const walkers = (cons, bits) => { const W = machine(D.clock.map, 3); for (let i = 1; i <= 4; i++) { W.setMaxCon(i, 30); W.setCon(i, cons[i - 1]); W.m[W.rec(i) + 0x28] = bits[i - 1]; } return W; };
  const steps = (W, n) => { for (let s = 0; s < n; s++) W.call(A.advanceClock); return W.cons(); };
  same('a step of Quartz', (() => { const W = walkers([20, 20, 20, 20], [0, 0, 0, 0]); W.m[0x0D] = 0; W.m[0x0C] = 0; W.m[0xD2] = 0; steps(W, 120); return [W.m[0x0D], W.m[0xD2]]; })(), [0, 240]);
  same('an hour, no disease and the four that only stop healing', [steps(walkers([20, 20, 20, 20], [0, 1, 2, 4]), 120), steps(walkers([20, 20, 20, 20], [8, 8, 8, 8]), 1440)], [[21, 20, 20, 20], [20, 20, 20, 20]]);
  same('128 steps, the four that take CON', steps(walkers([20, 20, 20, 20], [0x10, 0x20, 0x40, 0x80]), 128), [16, 16, 16, 16]);
  // one point every 64 units, 32 steps, 16 minutes; from 1 to -1; two points when down; dead past -50
  { const W = walkers([20, 2, 20, 20], [0x10, 0x10, 0, 0]); let down = 0, dead = 0, s = 0, skip = null;
    while (!dead && s < 5000) { const before = W.con(2); W.call(A.advanceClock); s++; if (before === 1 && W.con(2) !== 1) skip = W.con(2); if (!down && W.con(1) < 0) down = s; if (down && W.con(1) === 0) dead = s; }
    same('Desert dust from 20 CON: steps to fall and to die, and the step from 1', [down, dead, skip], [640, 1440, -1]);
    says('falls after 5 hours and 20 minutes and is dead after 12 hours'); }
  // knocked out at -5: a healthy Ranger wakes, one with a disease that only stops healing stays, the others sink
  same('knocked out, after an hour', steps(walkers([-5, -5, -5, -5], [0, 8, 0x20, 0x80]), 120), [2, -5, -11, -11]);
  same('knocked out with Sewer rot, after 20 hours', steps(walkers([-5, -5, -5, -5], [1, 2, 4, 8]), 2400), [-5, -5, -5, -5]);
  // dying at -15: one point a check without a disease of the high bits, two every fourth check with one
  { const W = walkers([-15, -15, -15, -15], [0, 8, 0x20, 0x80]), dead = [0, 0, 0, 0]; let s = 0;
    while (dead.some(d => !d) && s < 5000) { W.call(A.advanceClock); s++; for (let i = 1; i <= 4; i++) if (!dead[i - 1] && W.con(i) === 0) dead[i - 1] = s; }
    same('dying from -15: steps to death', dead, [288, 288, 576, 576]);
    says('is dead after 2 hours and 24 minutes, and a Ranger with Rabies after 4 hours and 48 minutes'); }
  // the roster's sign, and the end of the game
  same('the roster turns MAXCON to reverse for any disease', Array.from(part('engine').ram.slice(0x16AC, 0x16B5)), [0xA0, 0x28, 0xB1, 0x66, 0xF0, 0x03, 0x20, 0xA6, 0x1F]);
}

// ---- the doctors and the libraries ----
{
  const dr = tableOf(null, '<th>Doctor</th>');
  same('the doctors table', dr, doctors.map(d => [d.name + ' $' + d.at.toString(16).toUpperCase(), titles[d.map], '$' + d.heal, '$' + d.exam, '$' + d.cure]));
  const by = n => doctors.find(d => d.map === n);
  same('Darwin Village and Highpool', [titles[21], by(21).exam, titles[10], by(10).exam], ['Darwin Village', 250, 'Highpool', 25]);
  same('a disease cured, with its exam', [by(1).exam + by(1).cure, by(21).exam + by(21).cure], [100, 500]);
  says('One disease cured in Quartz comes to $100 with its exam, and in Darwin Village to $500.');
  ok('no price above $255', doctors.every(d => d.heal < 256 && d.exam < 256 && d.cure < 256));
  // a visit to the Quartz doctor on the module's own code
  const visit = (keys, prep) => {
    const P = WLScene.attach(machine(1, 5)), F = P.F, m = F.m; overlay(F, 'module-0');
    let q = [...keys].map(c => c === '<' ? 0x9B : c.charCodeAt(0) | 0x80);
    const give = c => { if (!q.length) throw new Error('step limit: out of keys'); const k = q.shift(); c.a = k; m[0x18] = k; c.c = 0; c.rts(); };
    F.hooks[0x2514] = give; F.hooks[0x24F2] = give;
    m[0x5F] = by(1).at & 255; m[0x60] = by(1).at >> 8;
    m[F.rec(1) + 0x15] = 0xF4; m[F.rec(1) + 0x16] = 1; m[F.rec(1) + 0x17] = 0; m[F.rec(1) + 0x28] = 0x18; if (prep) prep(F);
    F.take(); try { F.call(0xCA00, {}, 3e7); } catch (e) { if (!/out of keys/.test(String(e.message))) throw e; }
    return { text: F.take().replace(/\s+/g, ' '), cash: m[F.rec(1) + 0x15] | m[F.rec(1) + 0x16] << 8, bits: m[F.rec(1) + 0x28], con: F.con(1) };
  };
  const cash = keys => { const r = visit(keys); return [r.cash, r.bits]; };
  same('a cure asked for before the exam', cash('1C4<<'), [500, 0x18]);
  same('the exam', cash('1E'), [470, 0x18]);
  same('the exam and one cure', cash('1EC4<<'), [400, 0x10]);
  same('the exam and both cures', cash('1EC45<<'), [330, 0]);
  same('the patient picked again: no cure without a new exam', cash('1EC4<<1C5<<'), [400, 0x10]);
  same('the patient picked again, a new exam, the cure', cash('1EC4<<1EC5<<'), [300, 0]);
  ok('the exam lists by number', /4> Sewer rot 5> Desert dust/.test(visit('1E').text));
  // healing from -1: the paid point lands on 0, and a second comes free
  const heal = visit('1HY<<', F => { F.m[F.rec(1) + 0x28] = 0; F.setMaxCon(1, 30); F.setCon(1, -1); });
  same('one point bought at -1', [heal.con, heal.cash], [1, 495]);
  const deadOne = visit('1<', F => { F.setCon(1, 0); });
  ok('a dead Ranger', /is beyond my help\./.test(deadOne.text), deadOne.text.slice(0, 200));
  // the libraries
  const core = []; for (let n = 1; n <= 28; n++) if (n !== 17) core.push(n);
  const join = xs => xs.length === 1 ? xs[0] : xs.length === 2 ? xs.join(' and ') : xs.slice(0, -1).join(', ') + ', and ' + xs[xs.length - 1];
  same('the libraries table', tableOf(null, '<th>Library</th>'), libraries.map(l => [l.name + ' $' + l.at.toString(16).toUpperCase(), titles[l.map],
    core.every(c => l.skills.includes(c)) ? 'The Ranger Center\'s skills, and ' + join(l.skills.filter(n => !core.includes(n)).map(n => names[n - 1])) : join(l.skills.map(n => names[n - 1]))]));
  same('the libraries that sell every skill of the Ranger Center', libraries.filter(l => core.every(c => l.skills.includes(c))).length, 5);
  same('the skills a new Ranger with IQ 18 is offered', [core.length, core.every(n => (lib[0xCC6C + n] >> 3) <= 18), [29, 30, 31, 32, 33, 34, 35].every(n => (lib[0xCC6C + n] >> 3) > 18)], [27, true, true]);
  same('where Helicopter pilot is sold', libraries.filter(l => l.skills.includes(29)).map(l => [titles[l.map], l.name]), [['Sleeper Base, level 3', 'Chopper Sim']]);
  says('Five of the eight sell every skill that the Ranger Center sells.');
}

// ---- the Ranger Center's key ----
{
  const eng = part('engine').ram, keys = Array.from(eng.slice(0xC953, 0xC993));
  same('the Ranger Center sets the extra key to $92', Array.from(center.slice(0x83FE, 0x8402)), [0xA9, 0x92, 0x85, 0xBE]);
  same('the key table: 64 entries, R gives $D2, nothing gives $92', [keys.length, keys.includes(0xD2), keys.includes(0x92)], [64, true, false]);
  // the skills page in play sets R: LDA #$D2 before the same store
  same('the skills page sets R', Array.from(eng.slice(0x1090, 0x1094)), [0xA9, 0xD2, 0x85, 0xBE]);
  // the routine the key would run, on a Ranger with skills bought: stopped where it shows the list again
  const F = machine(1, 3), m = F.m; overlay(F, 'ranger');
  const r = F.rec(1); F.call(0x0335, { a: 1 });
  m[r + 0x0F] = 14; m[r + 0x20] = 3; for (let o = 0x80; o < 0xBC; o += 2) { m[r + o] = 1 + (o - 0x80) / 2; m[r + o + 1] = 2; }
  F.hooks[0x80C8] = () => { throw new Error('the list'); };
  try { F.call(0x80B5, {}, 1e5); } catch (e) { if (!/the list/.test(String(e.message))) throw e; }
  let left = 0; for (let o = 0x80; o < 0xBD; o++) left += m[r + o];
  same('the key\'s routine: skills left, and the points', [left, m[r + 0x20]], [0, 14]);
  // the message nothing shows
  let text = ''; for (let a = 0x831D; (center[a] & 0x7F) >= 32; a++) text += String.fromCharCode(center[a] & 0x7F);
  same('the message at the address the refusal prints', text, 'You are not smart enough!');
  same('the refusal points at it', Array.from(center.slice(0x8179, 0x817F)), [0xA9, 0x1D, 0x85, center[0x817C], 0xA9, 0x83]);
}

console.log(bad ? 'FAIL: ' + bad + ' of ' + checks + ' checks differ' : 'ok: ' + checks + ' checks hold the rules on The party tab to the game\'s code and listings');
process.exit(bad ? 1 : 0);
