#!/usr/bin/env node
// Hold the Solution tab to the game's own code and to the committed listings. The page's blocks
// WLWalk (solution/walk.js: the engine's, the game's and one map's listing laid over each other,
// the game's routines run on the kit's 6502) and WLRoute (solution/route.js: the walk, leg by
// leg) run here in node, and what the page says is made again:
// - the walk: every leg run to the ending, and its report (legs, moves, fights, locks, throws,
//   the countdown, what the party carries at the end) compared with the page's embedded data;
// - the same walk on other runs of random bytes, and with every die at its lowest;
// - Base Cochise and the Sleeper Base: the world map's squares before and after Max, the two
//   squares that change them, the helicopter's skill, who teaches it and who has it;
// - the temple's passwords, the Guardian's bed, Secpass B, the bag of rockets;
// - the self-destruct: one party sealed in, and two parties with the closing system;
// - each number and each line of the game's text in the page's prose.
// Everything it needs is committed: no disk image, no snapshot, no emulator. It exits 1 on any
// difference.
//   node games/c64/wasteland/test_solution.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const WLWalk = g.run('solution.html', 'solution/walk.js', 'WLWalk').WLWalk;
const WLRoute = g.run('solution.html', 'solution/route.js', 'WLRoute').WLRoute;
const html = g.read('solution.html');
const page = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<\/?(?:td|th|tr|p|div|li|section|h2|table|thead|tbody)\b[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const D = JSON.parse(/<script type="application\/json" id="wl-solution">([\s\S]*?)<\/script>/.exec(html)[1]);

let bad = 0, checks = 0;
const fail = (what, ...more) => { if (bad++ < 40) console.log('DIFFERS', what, ...more); };
const same = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) fail(what, 'got', JSON.stringify(got), 'expected', JSON.stringify(want)); };
const ok = (what, yes, ...more) => { checks++; if (!yes) fail(what, ...more); };
const says = text => { checks++; if (!page.includes(text)) fail('the page does not say', JSON.stringify(text)); };
const num = n => n.toLocaleString('en-GB');

const listings = {};
const part = id => listings[id] || (listings[id] = g.listing('parts/' + id + '/listing.json'));
const mapId = n => 'map-' + String(n).padStart(2, '0');
const mapParts = fs.readdirSync(path.join(__dirname, 'parts')).filter(d => /^map-\d\d$/.test(d)).sort();
const numbered = (L, prefix) => [...L.byName].filter(([k]) => k.startsWith(prefix + '_') && /^\d+$/.test(k.slice(prefix.length + 1)))
  .map(([k, a]) => [+k.slice(prefix.length + 1), a]).sort((a, b) => a[0] - b[0]);
// a walker at the Ranger Center, and the walk on it up to leg n (all of it when n is left out)
const walker = o => { const W = WLWalk.create(Object.assign({ part, CPU, seed: D.seed }, o)); W.enter(0, D.start[0], D.start[1]); return W; };
const upTo = (n, o, tweak) => { const W = walker(o), R = WLRoute.start(W); if (tweak) tweak(W, R); while (R.done < (n == null ? R.legs.length : n)) R.next(); return { W, R }; };
const legNo = name => { const i = D.legs.findIndex(l => l[1].includes(name)); if (i < 0) throw new Error('no leg ' + name); return i; };
// a check record's pairs straight from a listing: [kind, difficulty, value]
const pairsOf = (L, at) => { const out = []; for (let i = at + 0x0A; L.ram[i] !== 0xFF && out.length < 14; i += 2) out.push([L.ram[i] >> 5, L.ram[i] & 31, L.ram[i + 1]]); return out; };
// a check record's effect: [field, d6 count or flat amount, flat]
const effectOf = (L, at) => [L.ram[at + 8] & 0x7F, L.ram[at + 9] & 0x7F, (L.ram[at + 8] & 0x80) !== 0];
// a loot bag's contents: [item, count, thrown] (a count with bit 7 is thrown from 1 to it); cash is three bytes
const lootOf = (L, at) => { const out = []; for (let i = at + 2; L.ram[i] !== 0xFF && out.length < 20;) { if (L.ram[i] & 0x80) { out.push([L.ram[i] & 0x7F, L.ram[i + 1] & 0x7F, (L.ram[i + 1] & 0x80) !== 0]); i += 2; } else i += 3; } return out; };
const flat = s => s.replace(/\s+/g, ' ').trim();

// ---- the walk, and the page's data ----
const { W, R } = upTo();
const tails = WLRoute.tails(walker({ seed: 7 }), D.dice.n);
const rep = WLRoute.report(R, tails);
for (const k of Object.keys(rep)) same('the page\'s data: ' + k, D[k], rep[k]);
same('the keys of the page\'s data', Object.keys(D).sort(), [...Object.keys(rep), 'seed', 'start', 'mapNames'].sort());
ok('the walk reaches the ending', R.ending === true && R.done === R.legs.length);
same('the ending loads with the party on the world map', [W.cur, W.m[0x0B], W.members().length], [0, 0, 4]);
same('legs, moves, turns on the spot, fights', [rep.legs.length, rep.moves, rep.stays, rep.fights], [66, 1748, 16, 21]);
same('charges used', rep.charges, 12);
same('maps entered', [rep.maps.length, mapParts.length], [12, 42]);
ok('every Ranger ends with Sewer rot', rep.rot.every(b => b === 8), rep.rot);
ok('no Ranger caught it before the river', R.results[legNo('Down the river of sewage') - 1].rot.every(b => b === 0));
ok('every Ranger has it after the river', R.results[legNo('Down the river of sewage')].rot.every(b => b === 8));
same('ropes left', rep.ropes, 0);
// what hurt the party: the two deadfall traps and nothing else
{
  const lost = []; let prev = rep.rangers.map(r => r.maxcon);
  for (const r of R.results) { if (r.con.some((c, i) => c < prev[i])) lost.push(r.name); prev = r.con; }
  same('legs on which a Ranger lost CON', lost, ['One Ranger springs the deadfall trap', 'A third servo motor']);
  ok('each was a deadfall trap', R.results.filter(r => lost.includes(r.name)).every(r => r.text.some(t => /A deadfall trap is sprung/.test(t))));
}
// the map names the page uses are the Bestiary tab's
{
  const B = JSON.parse(/<script type="application\/json" id="wl-bestiary">([\s\S]*?)<\/script>/.exec(g.read('bestiary.html'))[1]);
  for (const n of rep.maps) same('the name of map ' + n, D.mapNames[n], (B.maps.find(x => x[0] === n) || [])[1]);
}
says(`${rep.legs.length} legs and ${num(rep.moves)} moves: ${num(rep.moves - rep.stays)} steps, and ${rep.stays} turns`);
says(`reaches it in ${num(rep.moves)} moves`);
says(`wins ${rep.fights} fights`);
says(`enters ${rep.maps.length} of the game's ${mapParts.length} maps`);
says(`arrives at count ${rep.clock.pod}`); says(`outside by count ${rep.clock.dome}`); says(`grounds at ${rep.clock.off}`);
same('the ending loads three world-map steps after the party is off the grounds', rep.clock.end, rep.clock.off + 3 * 16);
ok('and not before 240', rep.clock.end >= 240 && rep.clock.end - 16 < 240);
same('charges by kind', rep.used, [['Plastic explosive', 3], ['TNT', 5], ['LAW rocket', 4]]);
says('12 charges of explosive (3 of plastic explosive, 5 of TNT, and 4 LAW rockets)');
says(`The four Rangers finish with ${rep.con.slice(0, 3).join(', ')}, and ${rep.con[3]} CON out of ${rep.rangers.slice(0, 3).map(r => r.maxcon).join(', ')}, and ${rep.rangers[3].maxcon}`);
same('the four Rangers', rep.rangers.map(r => r.name), ['Hell Razor', 'Angela Deth', 'Thrasher', 'KIT']);
const found = rep.charges + rep.left.reduce((s, x) => s + x[1], 0);
says(`On this walk they held ${found}`);
says(`thrown ${num(D.dice.n)} times`);
// the game's own words the page quotes, as the walk met them
{
  const all = flat(R.results.map(r => r.text.join(' ')).join(' '));
  for (const q of ['You come upon a little used trail which leads you to a place that you never knew existed before.',
    'The weapons pod cover is jammed on the broken robots, so it cannot retract fully.', 'sounds a bit hollow',
    'Press button to activate safety procedure #1342-666.',
    'You hear a hissing sound followed by a loud slam. You turn around and notice that the panel behind you has been sealed shut.',
    'ALERT! Self destruction sequence activated. All personnel evacuate the base.', 'EINSTEIN', 'Who wants to disband?']) {
    ok('the walk meets the game\'s text ' + JSON.stringify(q), all.includes(q));
    if (q !== 'Who wants to disband?') says(q);
  }
}

// ---- other runs of random bytes: the same walk; every die at its lowest: 8 charges ----
for (const seed of [2, 3, 5, 8, 13]) {
  const o = upTo(null, { seed });
  same('seed ' + seed + ': legs, moves, fights, ending, charges', [o.R.done, o.W.moves, o.W.fights, o.R.ending, Object.values(o.R.used).reduce((a, b) => a + b, 0)], [66, 1748, 21, true, 12]);
}
{
  const Wl = walker({ dice: 'low' }), Rl = WLRoute.start(Wl); let stopped = null;
  try { Rl.all(); } catch (e) { stopped = e.message; }
  same('with every die at its lowest the walk stops at', Rl.legs[Rl.done][1], 'The glass wall round the core');
  ok('for want of an explosive', /nothing the party carries opens/.test(stopped || ''), stopped);
  same('having used', Object.values(Rl.used).reduce((a, b) => a + b, 0), 8);
  says('are sure to hold 8 charges');
}

// ---- the addresses the page gives ----
{
  const want = [['game', 'try_move_party', 0xADD1], ['game', 'use_on_square', 0x8BEF], ['game', 'disband_command', 0x99EE], ['game', 'countdown_check', 0x82B5],
    ['engine', 'skill_check', 0x0C29], ['engine', 'attribute_check', 0x0D0A], ['map-00', 'tile_01', 0x4D4D], ['map-00', 'remote_01', 0x4F21], ['map-00', 'remote_03', 0x4F35],
    ['map-24', 'sewage_infects_party', 0x3DD4], ['map-16', 'check_11', 0x3B2F], ['map-19', 'loot_00', 0x3CB9], ['map-20', 'check_65', 0x3E97]];
  for (const [p, name, at] of want) { same(p + ' ' + name, part(p).byName.get(name), at); says('$' + at.toString(16).toUpperCase().padStart(4, '0')); }
}

// ---- Base Cochise is not on the map until Max is rebuilt ----
{
  const S = walker(), w = S.width;
  same('world (2,3) and (59,7) at the start', [S.sq(2, 3), S.sq(59, 7)], ['4:1', '4:1']);
  same('their record', [S.record(2, 3).at, S.record(59, 7).at], [0x4D4D, 0x4D4D]);
  same('the two squares that change them', [S.sq(0, 63), S.record(0, 63).at, S.sq(1, 63), S.record(1, 63).at], ['12:1', 0x4F21, '12:3', 0x4F35]);
  // no walk reaches them: a flood from the Ranger Center over every square that is not a wall (class 11)
  const seen = new Set([D.start[1] * w + D.start[0]]), q = [D.start];
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const nx = x + dx, ny = y + dy, k = ny * w + nx; if (nx < 0 || ny < 0 || nx >= w || ny >= w || seen.has(k) || S.cls(nx, ny) === 11) continue; seen.add(k); q.push([nx, ny]); } }
  ok('the flood covers most of the world', seen.size > 3000, seen.size);
  ok('and reaches neither square', !seen.has(63 * w + 0) && !seen.has(63 * w + 1));
  // the walk: still desert when Max's head goes on, the trail and the Sleeper Base once the party is out
  const a = upTo(legNo('Out by the way Max opens')), lo = a.W.states[0][0], at = (x, y) => { const i = y * 64 + x, b = lo[i >> 1]; return ((x & 1) ? b & 15 : b >> 4) + ':' + lo[64 * 64 / 2 + i]; };
  same('with Max complete and the party still in the lab', [at(2, 3), at(59, 7)], ['4:1', '4:1']);
  a.R.next();
  same('the party lands on the world map at', [a.W.cur, ...a.W.pos()], [0, 25, 17]);
  same('and the two squares are now exits 33 and 32', [a.W.sq(2, 3), a.W.sq(59, 7)], ['10:33', '10:32']);
  same('exit 33 leads to map 16, exit 32 to map 7', [a.W.m[a.W.record(2, 3).at + 3] & 0x7F, a.W.m[a.W.record(59, 7).at + 3] & 0x7F], [16, 7]);
}
// the helicopter: skill 29 twice, taught in one place at IQ 19, held by nobody
{
  const M = part('map-42');
  for (const c of ['check_13', 'check_14']) same('map 42 ' + c + ' asks for', pairsOf(M, M.byName.get(c)).map(p => [p[0], p[2]]), [[0, 29]]);
  const libs = [], npcs = [];
  for (const id of mapParts) {
    const L = part(id);
    for (const [, a] of numbered(L, 'action')) if (L.ram[a] === 0x82) { const sk = []; for (let i = a + 0x10; L.ram[i] !== 0xFF && sk.length < 40; i++) sk.push(L.ram[i]); libs.push([+id.slice(4), sk]); }
    for (const [n, a] of numbered(L, 'npc')) { if (!n) continue; const sk = []; for (let k = 0; k < 30; k++) if (L.ram[a + 0x80 + 2 * k]) sk.push(L.ram[a + 0x80 + 2 * k]); npcs.push([+id.slice(4), sk]); }
  }
  same('libraries', libs.length, 8);
  same('maps whose library teaches skill 29', libs.filter(l => l[1].includes(29)).map(l => l[0]), [15]);
  same('NPCs', npcs.length, 14);
  same('NPCs with skill 29', npcs.filter(n => n[1].includes(29)).length, 0);
  same('the IQ skill 29 asks for', part('module-2').ram[part('module-2').byName.get('skill_requirements') + 29] >> 3, 19);
  says('None of the 14 people who can join the party has that skill'); says('to a Ranger with an IQ of 19');
}

// ---- the locks and traps the prose names ----
{
  const M16 = part('map-16'), M18 = part('map-18'), M24 = part('map-24'), M25 = part('map-25'), M19 = part('map-19');
  same('the inner door of Base Cochise takes', pairsOf(M16, 0x3B2F).map(p => [p[0], p[2] & 0x7F]), [[1, 87]]);
  const holders = [];
  for (const id of mapParts) { const L = part(id); if (numbered(L, 'loot').some(([, a]) => lootOf(L, a).some(it => it[0] === 87))) holders.push(+id.slice(4)); }
  same('maps with a Secpass B in a bag', holders, [23, 42]);
  ok('the walk enters neither', !rep.maps.includes(23) && !rep.maps.includes(42));
  same('the dome wall: Climb at 4 or a Rope, 6d6 of CON', [pairsOf(M16, M16.byName.get('check_02')).map(p => [p[0], p[1], p[2] & 0x7F]), effectOf(M16, M16.byName.get('check_02'))], [[[0, 4, 2], [1, 0, 54]], [0x1D, 6, false]]);
  same('the oil pipes: 5d6', effectOf(M18, M18.byName.get('check_01')), [0x1D, 5, false]);
  same('a mine: skill 37, 12d6', [pairsOf(M18, M18.byName.get('check_03')).map(p => [p[0], p[2]]), effectOf(M18, M18.byName.get('check_03'))], [[[0, 37]], [0x1D, 12, false]]);
  same('lightning, wind and cold: Luck, 3d6, 1d6 and 2d6', ['check_12', 'check_13', 'check_14'].map(c => [pairsOf(M18, M18.byName.get(c)).map(p => [p[0], p[2]]), effectOf(M18, M18.byName.get(c))[1]]), [[[[2, 0x10]], 3], [[[2, 0x10]], 1], [[[2, 0x10]], 2]]);
  same('the sewers\' deadfall: skill 37, 4d6', [pairsOf(M24, M24.byName.get('check_28')).map(p => [p[0], p[2]]), effectOf(M24, M24.byName.get('check_28'))], [[[0, 37]], [0x1D, 4, false]]);
  same('the lab level\'s deadfall: 4 CON', effectOf(M25, M25.byName.get('check_10')), [0x1D, 4, true]);
  const bag = lootOf(M19, 0x3CB9);
  ok('the bag on the assembly level: 10 LAW rockets and 10 RPG-7, no dice', bag.some(it => it.join() === '11,10,false') && bag.some(it => it.join() === '12,10,false'), JSON.stringify(bag));
  // how far it is from the hollow panel, and what its door takes
  const a = upTo(legNo('The hollow wall panel') + 1); a.W.cost = null;
  same('the party comes in at', [a.W.cur, ...a.W.pos()], [19, 19, 10]);
  same('steps to the bag', a.W.path(25, 1, (x, y) => a.W.open(x, y) || (x === 25 && y === 6)).length, 107); says('It is 107 steps from');
  same('its door takes', a.R.pairs(a.W.record(25, 6).at).map(a.R.keyName).join('; '), 'Picklock at 5; Strength at 10; Plastic explosive; TNT; LAW rocket; Sabot rocket; RPG-7');
  // the reactor's doors: Strength at 30 is a target of 165
  ok('the reactor\'s doors ask Strength at 30', rep.locks.filter(l => /Strength at 30/.test(l.keys.join())).length >= 3); same('its target', 15 + 5 * 30, 165); says('a target of 165');
  // the tests' squares and KIT's chance on a pipe
  const T = id => rep.throws.find(t => t.id === id);
  same('pipe squares', T('pipes').kinds.reduce((s, k) => s + k.squares, 0), 26); says('The oil pipes are 26 squares');
  ok('KIT passes a pipe about once in eight', T('pipes').kinds[0].best === 'KIT' && T('pipes').kinds[0].bestPct > 11 && T('pipes').kinds[0].bestPct < 14, JSON.stringify(T('pipes').kinds[0]));
  same('weather squares', T('weather').kinds.reduce((s, k) => s + k.squares, 0), 12); says('on its 12 squares');
}

// ---- the temple's passwords ----
{
  const door = word => { const a = upTo(legNo('The password at the inner doors')); a.W.go(16, 28, a.W.open); a.W.type(word); a.W.step('n'); return [a.W.sq(16, 26), flat(a.W.log.slice(-1)[0])]; };
  const o = door('OPPENHEIMER\n'), f = door('FERMI\nN\n\n');
  ok('OPPENHEIMER opens the inner doors', o[0] === '4:2' && /Welcome to our Temple/.test(o[1]), o);
  ok('FERMI does not', f[0] === '2:7' && /Did you bring a gift \(Y\/N\)\?/.test(f[1]) && /Go away, you vile infidels\./.test(f[1]), f);
  ok('the walk says EINSTEIN', R.results[legNo('The password at the inner doors')].text.some(t => />EINSTEIN "Welcome to our Temple/.test(flat(t))));
}
// ---- the Guardian's bed gives its key whether the throw passes or fails ----
{
  const n = legNo('The Guardian in his bed'), a = upTo(n, null, w => { w.judge = t => !(t.map === 36 && t.at.join() === '1,8'); });
  a.R.next();
  ok('a throw was made at the bed and failed', a.W.throws.some(t => t.map === 36 && t.at.join() === '1,8'));
  same('Nova keys after it', a.R.count(73), 1);
}

// ---- the self-destruct ----
const station = legNo('One Ranger onto each station');
const together = () => { const W2 = walker(), R2 = WLRoute.start(W2), leave = W2.leave; W2.leave = () => 0; while (R2.done < station) R2.next(); W2.leave = leave; return { W: W2, R: R2 }; };
const safe = w => (x, y) => w.cls(x, y) !== 9 && w.open(x, y);
// one party: all four keys in, the four Rangers on the green station
{
  const { W: P } = together();
  same('one party of four on the green station', [P.m[0x0B], P.members().length, ...P.pos()], [0, 4, 1, 30]);
  P.type('R'); P.step('stay');
  same('the four panels are shut', [P.sq(2, 3), P.sq(28, 2), P.sq(3, 29), P.sq(29, 28)], ['11:0', '11:0', '11:0', '11:0']);
  same('ways to the red, blue and yellow stations and the escape pod', [[1, 1], [30, 1], [30, 30], [16, 10]].map(p => !!P.path(p[0], p[1], P.open)), [false, false, false, false]);
  same('the self-destruct is not armed', P.m[0xF4F9], 0);
}
// two parties: one Ranger at the stations, three at the Cylinder Closing System
{
  const { W: P, R: Q } = together(), ok2 = safe(P), mem = P.members();
  P.go(23, 30, ok2);
  const three = P.disband([mem[0]], 'w'), one = P.m[0x08];
  same('two parties', [P.m[0x0B] + 1, P.members().length], [2, 1]);
  P.lead(three);
  same('the closing system takes', Q.pairs(P.record(23, 29).at).map(Q.keyName).join('; '), 'Electronics at 4; Luck at 7; IQ at 8');
  same('its record', P.record(23, 29).at, 0x3E97);
  const panels = () => [P.sq(2, 3), P.sq(28, 2), P.sq(3, 29), P.sq(29, 28)].join(' ');
  const open = () => { P.lead(three); P.useAttr(0x10, 'n', 1); P.go(23, 30, ok2); };
  P.lead(one); P.type('X'); P.go(1, 1, ok2); P.type('R'); P.step('stay'); P.keys = [];
  same('the lone Ranger\'s first press shuts the panels', panels(), '11:0 11:0 11:0 11:0');
  open();
  ok('the closing system opens them', !/11:0/.test(panels()), panels());
  for (const [x, y, d, k] of [[30, 29, 's', 'Y'], [1, 29, 's', 'G'], [30, 2, 'n', 'B']]) { P.lead(one); P.go(x, y, ok2); P.type(k + (k === 'B' ? '\n\n\n' : '')); P.step(d); P.keys = []; if (P.sq(2, 3) === '11:0') open(); }
  same('one Ranger has armed the self-destruct', P.m[0xF4F9], 1);
}

console.log(bad ? `test_solution: ${bad} difference(s) in ${checks} checks` : `test_solution: ok, ${checks} checks`);
process.exit(bad ? 1 : 0);
