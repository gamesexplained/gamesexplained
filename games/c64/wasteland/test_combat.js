#!/usr/bin/env node
// Hold the Dice and combat tab's fights to the game's own code. Two blocks, WLFight
// (reference/wasteland-fight.js: the engine's, the game's and one map's committed listing laid over
// each other, the game's routines run on the kit's 6502) and WLScenes (combat.html's
// fight/scenes.js: the fights the page stages), run in node with fixed runs of random bytes, and every figure the page prints is made
// again here and looked for in the page's text:
// - Rangers who are down: 400 rounds in the Outer Sanctum; the blows aimed at them cost no CON, the
//   line the game takes for them is the 'but misses.' one ($A8A5) and its melee test ($A899) never
//   runs; then every choice of who is down;
// - the patrols: the Guards' shots with a Bloodbeast alive and after, with the branch at $9CAC as
//   shipped and moved, with the record's two lines swapped, and the Outer Sanctum's encounter 15;
//   the count of encounters that list a gun before a monster without one, from every map's bytes;
// - running away: 420 plans against the count of Guards, then lines of 1 to 10;
// - healing: the page's table, the steps a bleeding Ranger lasts, the mark that stops healing, and
//   the maps' step sizes;
// - the Chopter: 300 rounds of fists at each line, and the monster records' skill bytes recounted;
// - the round that never ends: 3,000 rounds, and the monsters whose single shot can kill outright.
// Everything it needs is committed: no disk image, no snapshot, no emulator. It exits 1 on any
// difference.
//   node games/c64/wasteland/test_combat.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const WLFight = g.run('reference/wasteland-fight.js', 'fight/fight.js', 'WLFight').WLFight;
const S = g.run('combat.html', 'fight/scenes.js', 'WLScenes').WLScenes;
const page = g.read('combat.html').replace(/<\/?(?:td|th|tr|p|div|li|section|h2|table|thead|tbody)\b[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');

let bad = 0, checks = 0;
const fail = (what, ...more) => { if (bad++ < 30) console.log('DIFFERS', what, ...more); };
const same = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) fail(what, 'got', JSON.stringify(got), 'page has', JSON.stringify(want)); };
const says = text => { checks++; if (!page.includes(text)) fail('the page does not say', JSON.stringify(text)); };
const num = n => n.toLocaleString('en-GB');
const add = (t, n) => { for (const k in n) t[k] = (t[k] || 0) + n[k]; return t; };

const listings = {};
const part = id => listings[id] || (listings[id] = g.listing('parts/' + id + '/listing.json'));
const mapId = n => 'map-' + String(n).padStart(2, '0');
const fight = (map, o) => WLFight.create(Object.assign({ engine: part('engine'), game: part('game'), map: part(mapId(map)), mapNumber: map, CPU, random: WLFight.seeded((o && o.seed) || 1) }, o));
const maps = fs.readdirSync(path.join(__dirname, 'parts')).filter(d => /^map-\d\d$/.test(d)).sort();

// ---- 01: Rangers who are down ----
{
  const F = fight(36, { seed: 11 }), start = S.down.open(F), t = {};
  let missed = 0, meleeTest = 0;
  F.hooks[0xA8A5] = () => { missed++; };          // the name and 'but misses.' for a Ranger who is down
  F.hooks[0xA899] = () => { meleeTest++; };       // the two dice against the monster's damage dice
  for (let k = 0; k < 400; k++) add(t, S.down.round(F, start, [true, true, false, false]).n);
  same('down: 400 rounds', t, { rounds: 400, atDown: 1847, lostDown: 0, atUp: 1864, lostUp: 73640 });
  same('down: every blow at a fallen Ranger takes the misses line', missed, t.atDown);
  same('down: the melee test for a fallen Ranger never runs', meleeTest, 0);
  says('In 400 such rounds with Hell Razor and Angela Deth down, ' + num(t.atDown) + ' blows were aimed at those two and cost them no CON, and ' + num(t.atUp) + ' were aimed at the other two and cost them ' + num(t.lostUp) + '.');
  same('down: the Rangers of the snapshot', [1, 2, 3, 4].map(F.name), ['Hell Razor', 'Angela Deth', 'Thrasher', 'KIT']);
  // every choice of who is down that leaves one Ranger standing
  for (let mask = 1; mask < 15; mask++) {
    const fallen = [0, 1, 2, 3].map(i => !!(mask >> i & 1)), u = {};
    for (let k = 0; k < 12; k++) add(u, S.down.round(F, start, fallen).n);
    checks++;
    if (u.lostDown !== 0 || u.atDown === 0) fail('down: mask ' + mask, JSON.stringify(u));
  }
  // what the round's end does to them: the page's roster line and its third paragraph
  const o = S.down.round(F, start, [true, true, true, true].map((x, i) => i < 3));
  same('down: -5, -30 and -15 after a round', o.after.slice(0, 3), [-4, -31, -16]);
}

// ---- 02: the patrols under the Temple of Blood ----
{
  const run = (aim, past) => {
    const t = { rounds: 0 };
    for (let seed = 1; seed <= 30; seed++) {
      const F = fight(28, { seed: seed * 101 }); S.patrol.open(F);
      for (let r = 0; r < 14; r++) { const o = S.patrol.round(F, { aim, past }); add(t, o.n); t.rounds++; if (o.done) break; }
    }
    return t;
  };
  const attack = run('beasts', false), evade = run('evade', false), moved = run('evade', true);
  same('patrol: attacking', attack, { rounds: 342, withBeast: 217, shotsWith: 0, after: 125, shotsAfter: 126 });
  same('patrol: evading', evade, { rounds: 407, withBeast: 407, shotsWith: 0, after: 0, shotsAfter: 0 });
  same('patrol: evading, the branch moved', moved, { rounds: 384, withBeast: 384, shotsWith: 516, after: 0, shotsAfter: 0 });
  says('the Guards fired no shot in the ' + attack.withBeast + ' rounds a Bloodbeast was alive and ' + attack.shotsAfter + ' shots in the ' + attack.after + ' rounds after');
  says('they fired ' + moved.shotsWith + ' shots in ' + moved.rounds + ' rounds with the switch on, and none in ' + evade.rounds + ' rounds with the switch off');

  // the record's two lines the other way round: Bloodbeasts first, Guards second
  let shots = 0, rounds = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const F = fight(28, { seed: seed * 101 }), r = F.encounterRecord(19), m = F.m;
    for (const k of [3, 4]) { const x = m[r + k]; m[r + k] = m[r + k + 2]; m[r + k + 2] = x; }
    F.place(20, 10);
    for (let i = 1; i <= 4; i++) { F.setMaxCon(i, 250); F.setCon(i, 250); }
    for (let k = 0; k < 14; k++) { F.look(); const o = F.round([[5, 0], [5, 0], [5, 0], [5, 0]]); if (!o.groups[0]) break; rounds++; shots += F.look().shots; if (o.over) break; }
  }
  same('patrol: lines swapped', { shots, rounds }, { shots: 616, rounds: 420 });
  says('With the two lines swapped in the record, the same patrols fired ' + shots + ' shots in ' + rounds + ' rounds.');

  // the Outer Sanctum's encounter 15: Master Ciro and Adept Kate with guns, Brother Nuris without
  const sanctum = past => {
    const t = { rounds: 0, nuris: 0, shots: 0 };
    for (let seed = 1; seed <= 20; seed++) {
      const F = fight(36, { seed: seed * 13 });
      if (past) F.hooks[0x9CAC] = c => { if (c.c) c.pc = 0x9DB9; };
      F.place(12, 19);
      for (let i = 1; i <= 4; i++) { F.setMaxCon(i, 60); F.setCon(i, 60); }
      for (let k = 0; k < 10; k++) {
        F.look(); const o = F.round([[5, 0], [5, 0], [5, 0], [5, 0]]), grp = o.groups[0];
        if (!grp) break;
        if (seed === 1 && k === 0) same('encounter 15: its lines', grp.lines.map(l => l.name), ['Master Ciro', 'Adept Kate', 'Brother Nuris']);
        t.rounds++; if (grp.lines[2].hp.length) t.nuris++; t.shots += F.look().shots;
        if (o.over) break;
      }
    }
    return t;
  };
  same('encounter 15: as shipped', sanctum(false), { rounds: 158, nuris: 158, shots: 0 });
  same('encounter 15: the branch moved', sanctum(true), { rounds: 76, nuris: 76, shots: 116 });

  // every encounter of every map: a line with a gun (weapon classes 2 to 13) listed before a line
  // of monsters without one
  let fixed = 0, shaped = [];
  for (const id of maps) {
    const L = part(id);
    for (const [label, a] of L.byName) {
      if (!/^enc_\d+$/.test(label)) continue;
      const types = [0, 1, 2].map(l => L.ram[a + 3 + 2 * l]);
      if (!types.some(Boolean) || types.some(t => t & 0x80)) continue;      // empty, or rolled when met
      fixed++;
      const gun = types.map(t => { if (!t) return null; const rec = L.sym('monster_' + String(t).padStart(2, '0')), c = L.ram[rec + 5] & 0x0F; return c >= 2 && c <= 13; });
      if (gun.some((isGun, l) => isGun === true && gun.slice(l + 1).includes(false))) shaped.push(id + ' ' + label);
    }
  }
  same('encounters with fixed monsters', fixed, 583);
  same('encounters that list a gun before a monster without one', shaped,
    [10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map(n => 'map-28 enc_' + n).concat('map-36 enc_15'));
  says('These eleven are the only ones among the ' + fixed + ' encounters with fixed monsters that list a gun before a monster without one.');
  says('Ten patrols guard the tunnels under the Temple of Blood');
}

// ---- 03: running away ----
{
  const F = fight(28, { seed: 9 }), start = S.nerve.open(F), t = {};
  let n = 0, off = 0;
  for (const con of [20, 40, 60, 80, 100, 150, 250]) for (let k = 0; k < 60; k++) {
    const o = S.nerve.meet(F, start, con); n++; add(t, o.n);
    const want = Math.floor(o.hp.reduce((a, b) => a + b, 0) / o.hp.length) < (con >> o.hp.length);
    if (o.ran !== want || o.ran !== S.nerve.shipped(o.hp, con)) off++;
  }
  same('nerve: 420 meetings', { n, off, t }, { n: 420, off: 0, t: { met1: 209, ran1: 154, met2: 211, ran2: 94 } });
  says('In ' + n + ' meetings at seven levels of CON from 20 to 250, every plan followed the count of the Guards');
  // lines of 1 to 10 Guards, the count written into the record before the patrol is placed
  for (const count of [1, 2, 3, 4, 6, 10]) {
    let wrong = 0, ran = 0;
    for (const con of [40, 100, 250, 1000]) for (let seed = 1; seed <= 12; seed++) {
      const G = fight(28, { seed: seed * 17 }); G.m[G.encounterRecord(19) + 4] = count; G.place(20, 10);
      for (let i = 1; i <= 4; i++) { G.setMaxCon(i, con); G.setCon(i, con); }
      G.setup();
      const grp = G.groups()[0], hp = grp.lines[0].hp, fled = grp.plan !== 0xFF && grp.plan >> 6 === 1;
      if (fled) ran++;
      if (hp.length !== count || fled !== (Math.floor(hp.reduce((a, b) => a + b, 0) / count) < (con >> count))) wrong++;
    }
    checks++;
    if (wrong || (count === 10 && ran)) fail('nerve: a line of ' + count, 'wrong', wrong, 'ran', ran);
  }
  // the Guard is a humanoid (kind 3), for which the code loads two halvings ($8499 LDX #$02)
  const L = part('map-28'), G = part('game');
  same('the Guard\'s kind', L.ram[L.sym('monster_03') + 6], 3);
  same('LDX #$02 at $8499, LDX #$01 at $848E', [G.ram[0x8499], G.ram[0x849A], G.ram[0x848E], G.ram[0x848F]], [0xA2, 2, 0xA2, 1]);
}

// ---- 04: healing ----
{
  const row = (map, o) => { const F = fight(map, { size: 1 }), st = F.save(), per = 128 / F.unitsAStep; const w = S.walk(F, st, Object.assign({ steps: 8 * per }, o)); return { per, w, cells: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(k => w[k * per]) }; };
  const led = row(0, { con: 6, before: 0, led: true }), left = row(0, { con: 6, before: 0, led: false });
  same('heal: the party you lead, world map', led.cells, [6, 7, 8, 9, 10, 11, 12, 13, 14]);
  same('heal: a party left behind, world map', left.cells, [6, 8, 10, 12, 14, 16, 18, 20, 22]);
  says('Steps walked 0 8 16 24 32 40 48 56 64 In the party you lead ' + led.cells.join(' ') + ' In a party left behind ' + left.cells.join(' '));
  same('heal: a point every 8 steps led, every 4 left', [led.w.indexOf(7), left.w.indexOf(7)], [8, 4]);
  for (const map of [16, 36]) for (const isLed of [true, false])
    same('heal: map ' + map, row(map, { con: 6, before: 0, led: isLed }).cells, (isLed ? led : left).cells);
  // unconscious: a point at every look in either party, awake at half the CON before the blow
  for (const isLed of [true, false]) same('heal: unconscious', row(0, { con: -5, before: 20, led: isLed }).w.slice(0, 6), [-5, -4, -3, -2, -1, 10]);
  // bleeding: -25 is dead after 26 looks, a step each on the world map and 16 steps each in the Citadel
  const dies = map => { const F = fight(map, { size: 1 }), st = F.save(); return S.walk(F, st, { con: -25, before: 20, led: true, steps: 500 }).indexOf(0); };
  same('heal: -25 on the world map', dies(0), 26);
  same('heal: -25 in the Outer Sanctum', dies(36), 416);
  says('so a Ranger at −25 is dead 26 steps later');
  says('the same Ranger lasts 416');
  // the mark: no point comes back, awake or unconscious
  for (const con of [6, -5]) same('heal: marked, ' + con, new Set(row(0, { con, before: 20, led: false, mark: 1 }).w).size, 1);
  // the maps' step sizes
  const units = id => { const L = part(id); return L.ram[L.sym('map_record') + 0x36]; };
  same('step sizes', [units('map-00'), units('map-01'), units('map-16'), units('map-36')], [16, 2, 2, 1]);
  checks++;
  if (maps.filter(id => units(id) === 1).length * 2 <= maps.length) fail('most maps add 1 a step');
}

// ---- 05: the Chopter ----
{
  const t = [0, 1].map(line => { const F = fight(16, { seed: 7 }), st = S.chopter.open(F), u = {}; for (let k = 0; k < 300; k++) add(u, S.chopter.round(F, st, line).n); return u; });
  same('chopter: fists at the Chopters', t[0], { rounds: 300, blows: 1800, landed: 0 });
  same('chopter: fists at the robots', t[1], { rounds: 300, blows: 1800, landed: 573 });
  says('In 300 rounds the Rangers struck ' + num(t[0].blows) + ' blows at the Chopters and landed none. In 300 more they struck ' + num(t[1].blows) + ' at the robots beside them and landed ' + t[1].landed + '.');
  // every monster record of every map: the skill byte (+2), and the single shots that can kill outright
  let records = 0; const zero = [], outright = [];
  const name = (L, n) => { let s = ''; for (let p = L.sym('monster_name_' + n); (L.ram[p] & 0x7F) >= 0x20; p++) s += String.fromCharCode(L.ram[p] & 0x7F); return s; };
  for (const id of maps) {
    const L = part(id);
    for (const [label, a] of L.byName) {
      const m = /^monster_(\d+)$/.exec(label);
      if (!m || +m[1] === 0) continue;           // monster_00 is the table's start, not a record
      records++;
      const cls = L.ram[a + 5] & 0x0F, dice = L.ram[a + 3], bonus = L.ram[a + 5] >> 4;
      if (L.ram[a + 2] === 0) zero.push(id + ' ' + name(L, m[1]) + ' class ' + cls);
      // one shot a turn: every class with a gun but the bursts (5 to 7) and the sprays (11, 12)
      if ([2, 3, 4, 8, 9, 10, 13].includes(cls) && 6 * dice + bonus >= 51) outright.push(id + ' ' + name(L, m[1]));
    }
  }
  same('monster records', records, 398);
  same('skill bytes of 0', zero, ['map-16 Chopter class 6']);
  same('single shots of 51 or more', outright.sort(), ['map-36 Brother Jackson', 'map-36 Brother Nobel', 'map-36 Redhawk', 'map-36 Sister Faith', 'map-41 Barkeep']);
  says('the only 0 among the ' + records + ' monster records in the maps');
  const V = part('map-12'), vegas = [...V.byName].filter(([l]) => /^monster_\d+$/.test(l)).map(([l, a]) => [name(V, l.slice(8)), V.ram[a + 2], V.ram[a + 5] & 0x0F]).filter(r => r[0] === 'Chopter');
  same('the Chopter of Las Vegas', vegas, [['Chopter', 2, 1]]);
}

// ---- 06: the round that never ends ----
{
  const F = fight(36, { seed: 1, size: 1 }), start = S.lockup.open(F), t = {}, seeds = [];
  for (let seed = 1; seed <= 3000; seed++) { const o = S.lockup.round(F, start, WLFight.seeded(seed)); add(t, o.n); if (o.hung) seeds.push(seed); }
  same('lock-up: 3,000 rounds', { t, seeds }, { t: { rounds: 3000, frozen: 3, died: 0 }, seeds: [361, 2100, 2957] });
  const o = S.lockup.round(F, start, WLFight.seeded(361));
  same('lock-up: the round of the first button', [o.hung, o.text.split('\n').slice(-2)],
    [true, ['The Brother Nobel drills Hell Razor and hits for 52 points of damage and rips him to shreds.', 'The Brother Jackson blazes away at']]);
  says('one of three in 3,000 that froze');
  checks++;
  if (!/data-rounds="1" data-opt="361"/.test(g.read('combat.html'))) fail('the first button no longer plays run 361');
}

console.log(`combat: ${checks} checks of the page's fights against the game's code` + (bad ? `; ${bad} differences` : ''));
process.exit(bad ? 1 : 0);
