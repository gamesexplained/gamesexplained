#!/usr/bin/env node
// Hold the Bestiary tab to the game's own code and to the committed listings. The page's block
// WLBeasts (bestiary/beasts.js) runs in node on WLFight (reference/wasteland-fight.js: the
// engine's, the game's and one map's listing laid over each other, the game's routines run on the
// kit's 6502) with fixed runs of random bytes, and what the page says is made again here:
// - the roster: every monster record, name, meeting and cut meeting of the 42 maps, built again
//   from the listings and compared with the page's embedded data; hit points and experience from
//   the game's own roll and sum for every meeting of five maps;
// - the mine shaft, the reactor and the assembly floor: each map routine's effect and limit, the
//   squares and records that lead to it, the game's messages, and walks before and after;
// - walking away: a group dropped and rolled again, and the count the map keeps;
// - running from the start: the plan against half the number, the exact share of rolls, animals;
// - the Night Terror: peaceful until attacked, and the plan for hit points of 32,768 or more;
// - never met: the cut meetings, the monsters no meeting uses, the two spare portraits.
// Everything it needs is committed: no disk image, no snapshot, no emulator. It exits 1 on any
// difference.
//   node games/c64/wasteland/test_bestiary.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const WLFight = g.run('reference/wasteland-fight.js', 'fight/fight.js', 'WLFight').WLFight;
const B = g.run('bestiary.html', 'bestiary/beasts.js', 'WLBeasts').WLBeasts;
const html = g.read('bestiary.html');
const page = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<\/?(?:td|th|tr|p|div|li|section|h2|table|thead|tbody)\b[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
const D = JSON.parse(/<script type="application\/json" id="wl-bestiary">([\s\S]*?)<\/script>/.exec(html)[1]);

let bad = 0, checks = 0;
const fail = (what, ...more) => { if (bad++ < 40) console.log('DIFFERS', what, ...more); };
const same = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) fail(what, 'got', JSON.stringify(got), 'expected', JSON.stringify(want)); };
const ok = (what, yes, ...more) => { checks++; if (!yes) fail(what, ...more); };
const says = text => { checks++; if (!page.includes(text)) fail('the page does not say', JSON.stringify(text)); };
const num = n => n.toLocaleString('en-GB');
const flat = s => s.replace(/\s+/g, ' ').trim();

const listings = {};
const part = id => listings[id] || (listings[id] = g.listing('parts/' + id + '/listing.json'));
const mapId = n => 'map-' + String(n).padStart(2, '0');
const fight = (map, seed) => WLFight.create({ engine: part('engine'), game: part('game'), map: part(mapId(map)), mapNumber: map, CPU, random: WLFight.seeded(seed || 1) });
const mapParts = fs.readdirSync(path.join(__dirname, 'parts')).filter(d => /^map-\d\d$/.test(d)).sort();
const numbered = (L, prefix) => [...L.byName].filter(([k]) => k.startsWith(prefix + '_') && /^\d+$/.test(k.slice(prefix.length + 1)))
  .map(([k, a]) => [+k.slice(prefix.length + 1), a]).sort((a, b) => a[0] - b[0]);
const header = L => { const m = L.ram, h = L.byName.get('map_record'); return { oneIn: m[h + 0x2F], types: m[h + 0x31], groups: m[h + 0x32] }; };
const N = b => B.numbers(b.r);
const rowsOf = name => D.beasts.filter(b => b.n === name);
const on = (name, map) => { const b = D.beasts.find(b => b.n === name && b.w.some(w => w[0] === map)); if (!b) throw new Error('no ' + name + ' on map ' + map); return b; };
const typeName = (map, t) => { const b = D.beasts.find(b => b.w.some(w => w[0] === map && w[1] === t)); return b ? b.n : null; };
// every call of a map routine until its number stops changing
const until = (R, label) => { let last, now = R.read(), n = -1; do { last = now; now = R.act(label); n++; } while (JSON.stringify(now) !== JSON.stringify(last) && n < 300); return { end: now, times: n }; };
// random_1_to_a ($24C4) made to return its lowest or its highest
const pin = (F, high) => { F.hooks[0x24C4] = c => { c.a = c.a ? (high ? c.a : 1) : 0; c.rts(); }; };
const unpin = F => { delete F.hooks[0x24C4]; };

// ---- the roster: the page's data against the listings ----
const maxTypes = {};
{
  const levels = g.read('levels.html');
  const maps = [], rows = new Map(), cut = [];
  for (const id of mapParts) {
    const n = +id.slice(4), L = part(id), m = L.ram, h = header(L);
    const comment = new Map(L.listing.records.filter(r => r.l).map(r => [r.l, r.c || '']));
    // the most kinds the map's own routines can raise the count to
    let most = h.types;
    for (const label of ['more_monster_types', 'mining_wakes_monsters']) if (L.byName.has(label)) most = until(B.roam(fight(n), L, [4, 4]), label).end.types;
    maxTypes[n] = most;
    const was = D.maps.find(x => x[0] === n);
    ok('map ' + n + ' is in the page', !!was);
    if (was) { same('map ' + n, was.slice(2), [h.oneIn, h.types, h.groups, most]); ok('map ' + n + ' title is the Maps tab\'s', levels.includes(was[1]), was[1]); }
    const forms = a => {
      const parts = [''];
      for (; m[a]; a++) { if (m[a] === 0x0A) parts.push(''); else parts[parts.length - 1] += String.fromCharCode(m[a]); }
      if (parts.length === 1) return [parts[0], parts[0], false];
      ok('map ' + n + ' name has four parts', parts.length === 4, parts);
      return [parts[0] + parts[1] + parts[3], parts[0] + parts[2] + parts[3], true];
    };
    const names = new Map(numbered(L, 'monster_name'));
    const use = new Map(), u = t => { if (!use.has(t)) use.set(t, [0, 99, 0, 0, 0]); return use.get(t); };
    const F = fight(n);
    for (const [k, a] of numbered(L, 'enc')) {
      const r = m.subarray(a, a + 12), unnamed = (comment.get('enc_' + String(k).padStart(2, '0')) || '').includes('nothing names it'), seen = new Set();
      if (unnamed) {
        // a meeting the listing says nothing names stands on no square of the map
        let placed = false;
        for (let y = 0; y < F.width && !placed; y++) for (let x = 0; x < F.width; x++) { const s = F.square(x, y); if (s.cls === 3 && s.num === k) { placed = true; break; } }
        ok('map ' + n + ' meeting ' + k + ' stands on no square', !placed);
      }
      for (const off of [3, 5, 7]) {
        const t = r[off], c = r[off + 1];
        if (!t) continue;
        const ts = t & 0x80 ? Array.from({ length: t & 0x7F }, (_, i) => i + 1) : [t];
        const lo = c & 0x80 ? 1 : c, hi = c & 0x80 ? c & 0x7F : c;
        for (const t1 of ts) {
          const e = u(t1);
          if (unnamed) { if (!seen.has(t1)) e[3]++; }
          else { if (!seen.has(t1)) { e[0]++; if (r[9] & 2) e[4]++; } e[1] = Math.min(e[1], lo); e[2] = Math.max(e[2], hi); }
          seen.add(t1);
        }
      }
      if (unnamed) {
        const lines = [];
        for (const off of [3, 5, 7]) { const t = r[off], c = r[off + 1]; if (t) lines.push([forms(names.get(t & 0x7F))[0], c & 0x80 ? '1-' + (c & 0x7F) : String(c)]); }
        cut.push({ map: n, enc: k, lines, msg: r[2] ? flat(B.say(F, r[2])) : '', peace: !!(r[9] & 2) });
      }
    }
    for (const [k, a] of numbered(L, 'monster')) {
      const r = Array.from(m.subarray(a, a + 8));
      if (k === 0 || !r.some(Boolean)) continue;
      const [sing, plur, hasPlural] = forms(names.get(k));
      const rand = h.oneIn && k <= h.types ? 1 : h.oneIn && k <= most ? 2 : 0, e = u(k), key = sing + '|' + r.join(',');
      if (!rows.has(key)) rows.set(key, { n: sing, p: hasPlural ? plur : '', r, w: [] });
      rows.get(key).w.push([n, k, e[0], e[0] ? e[1] : 0, e[2], rand, e[3], e[4]]);
    }
    maps.push(n);
  }
  same('the maps of the roster', D.maps.map(x => x[0]), maps);
  const built = [...rows.values()];
  same('how many monsters the roster has', D.beasts.length, built.length);
  for (let i = 0; i < built.length; i++) same('roster row ' + i + ' (' + built[i].n + ')', D.beasts[i], built[i]);
  same('the cut meetings', D.cut.map(c => Object.assign({}, c, { msg: flat(c.msg) })), cut);
}

// ---- the roster: hit points and experience by the game's own roll and sum ----
{
  let lines = 0;
  for (const map of [19, 20, 23, 31, 43]) {
    const L = part(mapId(map)), F = fight(map, 3), start = F.save();
    for (const [k] of numbered(L, 'enc')) {
      F.load(start);
      const M = B.meeting(F, k, map === 23 && k === 0 ? { square: [3, 25] } : null);
      for (const high of [false, true]) {
        M.again(); pin(F, high);
        const met = M.arrive();
        unpin(F);
        if (!met) continue;
        const grp = F.groups()[0];
        grp.lines.forEach((line, i) => {
          if (!line.type || !line.hp.length) return;
          const b = D.beasts.find(b => b.w.some(w => w[0] === map && w[1] === line.type)), x = N(b);
          lines++;
          ok('map ' + map + ' meeting ' + k + ': ' + b.n + (high ? ' highest' : ' lowest') + ' hit points', line.hp.every(v => v === (high ? x.hpMax : x.hpMin)), line.hp, x.hpMin, x.hpMax);
          if (high) {
            F.call(0xA9E8, { a: i });                       // kill_experience for line i of group 0
            same('map ' + map + ' meeting ' + k + ': experience for ' + b.n, F.m[0x1C] | F.m[0x1D] << 8 | F.m[0x1E] << 16, x.exp);
          }
        });
      }
    }
  }
  ok('hit points were rolled for many lines', lines > 60, lines);
  const top = f => D.beasts.slice().sort((a, b) => f(N(b)) - f(N(a)));
  const hp = top(x => x.hpMax), exp = top(x => x.exp), dmg = top(x => x.dmgMax);
  same('most hit points', [hp[0].n, N(hp[0]).hpMax, hp[1].n, N(hp[1]).hpMax], ['Night Terror', 40000, 'Finster Leviathan', 1500]);
  says('the Night Terror of Finster\'s mind stands alone at the top with up to 40,000, and the Finster Leviathan beside it has 1,500');
  same('most experience', [exp[0].n, exp[1].n], ['Night Terror', 'Fusion Octotron']);
  ok('experience under the Night Terror is led by Base Cochise robots', exp.slice(1, 8).every(b => b.r[6] === 5 && b.w.every(w => w[0] >= 16 && w[0] <= 20)), exp.slice(1, 8).map(b => b.n));
  ok('the hardest blows are led by Base Cochise robots', dmg.slice(0, 7).every(b => b.r[6] === 5 && b.w.every(w => w[0] >= 16 && w[0] <= 20)), dmg.slice(0, 7).map(b => b.n));
  same('the barkeep among the hardest blows', dmg.findIndex(b => b.n === 'Barkeep'), 7);
  const F = fight(41);
  let gus = false;
  for (let n = 1; n < 127 && !gus; n++) { try { gus = flat(B.say(F, n)).includes('Gus, the happy barkeep, wouldn\'t hurt a fly.'); } catch (e) { break; } }
  ok('Spade\'s Casino has the line about Gus', gus);
  says('Gus, the happy barkeep, wouldn\'t hurt a fly.');
  same('the roster\'s size', [D.beasts.length, D.maps.length], [371, 42]);
  says('Every monster record of the game\'s 42 maps');
}

// A map routine's place in the map's code list, and the action square that runs it.
function coded(L, label, entry) {
  const m = L.ram, list = L.byName.get('code_list');
  same(label + ' is code entry ' + entry, m[list + 2 * entry] | m[list + 2 * entry + 1] << 8, L.byName.get(label));
  same('action square ' + entry + ' runs code entry ' + entry, m[L.byName.get('action_' + String(entry).padStart(2, '0'))], entry);
}
const check = (L, n) => { const a = L.byName.get('check_' + String(n).padStart(2, '0')); return Array.from(L.ram.subarray(a, a + 8)); };
// what a check square asks for: pairs of (kind x 32 + difficulty, which), up to the $FF. Kind 0 is a
// skill, kind 2 an attribute, and kind 1 (32) the Use of an item.
const asks = (L, n) => { const a = L.byName.get('check_' + String(n).padStart(2, '0')), out = []; for (let i = 10; L.ram[a + i] !== 255 && i < 48; i++) out.push(L.ram[a + i]); return out; };
const squares = (F, cls, n) => { const out = []; for (let y = 0; y < F.width; y++) for (let x = 0; x < F.width; x++) { const s = F.square(x, y); if (s.cls === cls && s.num === n) out.push([x, y]); } return out; };
const tally = met => { const t = {}; for (const e of met) t[e.type] = (t[e.type] || 0) + 1; return t; };

// ---- 01: the mine shaft ----
{
  const L = part('map-43'), F = fight(43, 11), R = B.roam(F, L, [8, 22]);
  same('mine: the header', R.read(), { oneIn: 70, types: 13, groups: 3 });
  same('mine: sixteen kinds can wander', maxTypes[43], 16);
  coded(L, 'mining_draws_attacks', 0); coded(L, 'mining_wakes_monsters', 1); coded(L, 'refill_silver_bag', 2);
  same('mine: the routines\' addresses', ['mining_wakes_monsters', 'mining_draws_attacks', 'refill_silver_bag'].map(l => L.byName.get(l)), [0x3E39, 0x3E2A, 0x3E48]);
  // the veins: a Metallurgy check, then a pick ax, then a bag of cash whose emptying runs the routine
  same('mine: the north-west vein', squares(F, 2, 13), [[2, 3]]);
  same('mine: the east vein', squares(F, 2, 11), [[26, 21]]);
  same('mine: vein checks', [check(L, 13).slice(1, 6), check(L, 14).slice(2, 6), check(L, 11).slice(1, 6), check(L, 12).slice(2, 6)], [[25, 26, 27, 2, 14], [38, 39, 5, 10], [25, 26, 27, 2, 12], [38, 39, 5, 9]]);
  // skill 28 is Metallurgy, item 53 the Pick ax
  same('mine: what the veins ask for', [asks(L, 13), asks(L, 14), asks(L, 11), asks(L, 12)], [[2, 28], [32, 53], [2, 28], [32, 53]]);
  const bag = n => { const a = L.byName.get('loot_' + String(n).padStart(2, '0')); return Array.from(L.ram.subarray(a, a + 6)); };
  same('mine: the bags', [bag(10), bag(9), bag(19), bag(18)], [[6, 1, 0x5E, 10, 0, 255], [6, 0, 0x5E, 10, 0, 255], [6, 1, 0x5E, 10, 0, 255], [6, 0, 0x5E, 10, 0, 255]]);
  same('mine: the game\'s words', [26, 38].map(n => flat(B.say(F, n))), ['There is a vein of silver here! Someone with a pickaxe could chip out a lot of money.', 'You get to work and chip out quite a bit of silver.']);
  says('There is a vein of silver here! Someone with a pickaxe could chip out a lot of money.'); says('You get to work and chip out quite a bit of silver.');
  ok('mine: none of the map\'s meetings use kinds 14 to 16', [14, 15, 16].every(t => D.beasts.find(b => b.w.some(w => w[0] === 43 && w[1] === t)).w.every(w => w[0] !== 43 || (w[2] === 0 && w[6] === 0))));
  same('mine: kinds 14 to 16', [14, 15, 16].map(t => typeName(43, t)), ['Gecko', 'Skink', 'Shell Cougar']);
  ok('mine: the three are on no other map', ['Gecko', 'Skink', 'Shell Cougar'].every(n => rowsOf(n).length === 1 && rowsOf(n)[0].w.length === 1));
  const here = D.beasts.filter(b => b.w.some(w => w[0] === 43)), cougar = N(on('Shell Cougar', 43));
  same('mine: the Shell Cougar', [cougar.hpMin, cougar.hpMax], [38, 187]);
  ok('mine: the Shell Cougar has the most hit points and armour', here.every(b => N(b).hpMax <= cougar.hpMax && N(b).armour <= cougar.armour) && here.filter(b => N(b).armour === cougar.armour).length === 1);
  // walks: none of the three before a dig, some after three
  const before = tally(R.walk(3000));
  ok('mine: 3,000 steps before a dig meet none of the three', !before[14] && !before[15] && !before[16] && Object.keys(before).length > 6, before);
  same('mine: three digs', [R.act('mining_wakes_monsters').types, R.act('mining_wakes_monsters').types, R.act('mining_wakes_monsters').types, R.act('mining_wakes_monsters').types], [14, 15, 16, 16]);
  const after = tally(R.walk(3000));
  ok('mine: 3,000 steps after three digs meet all three', after[14] > 0 && after[15] > 0 && after[16] > 0, after);
  same('mine: a dig at the east vein', R.act('mining_draws_attacks').oneIn, 68);
  const low = until(R, 'mining_draws_attacks');
  same('mine: the east vein\'s limit', [low.end.oneIn, low.times + 1], [2, 34]);
  says('After 34 digs a group appears on every second step, on average.');
  same('engine: the map is written back', part('engine').byName.get('save_map'), 0x2856);
}

// ---- 02 and 04: the reactor's light plates and its screen ----
{
  const L = part('map-20'), F = fight(20, 11), R = B.roam(F, L, [8, 24]);
  same('reactor: the header', R.read(), { oneIn: 70, types: 6, groups: 6 });
  ['encounters_more_often', 'encounters_less_often', 'more_monster_types', 'fewer_monster_types'].forEach((l, i) => coded(L, l, i));
  same('reactor: the routines\' addresses', ['encounters_more_often', 'encounters_less_often', 'more_monster_types', 'fewer_monster_types'].map(l => L.byName.get(l)), [0x402B, 0x403C, 0x404D, 0x405C]);
  same('reactor: the panel', [squares(F, 2, 62), check(L, 62).slice(1, 8)], [[[21, 24]], [53, 54, 55, 6, 3, 6, 2]]);
  same('reactor: the screen', [squares(F, 2, 61), check(L, 61).slice(1, 8)], [[[28, 22]], [56, 57, 58, 6, 1, 6, 0]]);
  // both take Alarm disarm (skill 22), Electronics (skill 30), LK (attribute 16) and IQ (attribute 15)
  same('reactor: what the panel and the screen ask for', [asks(L, 62), asks(L, 61)], [[3, 22, 5, 30, 71, 16, 72, 15], [3, 22, 5, 30, 71, 16, 72, 15]]);
  same('reactor: the game\'s words', [53, 54, 55, 56, 57, 58].map(n => flat(B.say(F, n))), ['There are eleven light plates on the panel and several are lit.', 'One of the light panels turned off.', 'Another light panel has turned on.',
    'A message on a screen reads Security Check Interval.', 'The screen reads Interval Reduced.', 'The screen reads Interval Increased.']);
  for (const t of ['There are eleven light plates on the panel and several are lit.', 'One of the light panels turned off.', 'Another light panel has turned on.', 'A message on a screen reads Security Check Interval.',
    'The screen reads Interval Reduced.', 'The screen reads Interval Increased.']) says(t);
  same('reactor: the robots in order', Array.from({ length: 12 }, (_, i) => typeName(20, i + 1)), ['Laser Pod Blaster', 'Titanium Clawer', 'Silver Strangler', 'Silicon Sniper', 'Hunter', 'Killer',
    'VTOL Auto-fire Robot', 'Threshing Crawler', 'Steel Reaver', 'Xenon Laser Cannon', 'Fusion Octotron', 'Particle Beam Gattlin']);
  says('the Laser Pod Blaster, the Titanium Clawer, the Silver Strangler, the Silicon Sniper, the Hunter, and the Killer');
  says('the VTOL Auto-fire Robot, the Threshing Crawler, the Steel Reaver, the Xenon Laser Cannon, and the Fusion Octotron');
  const octo = N(on('Fusion Octotron', 20)), gat = on('Particle Beam Gattlin', 20).w.find(w => w[0] === 20);
  same('reactor: the Fusion Octotron', [octo.hpMin, octo.hpMax, octo.exp], [354, 487, 4290]);
  same('reactor: four Particle Beam Gattlins stand guard and never wander', gat.slice(2, 6), [4, 1, 1, 0]);
  const before = tally(R.walk(3000));
  ok('reactor: walks meet kinds 1 to 6 only', Object.keys(before).every(t => t <= 6) && Object.keys(before).length === 6, before);
  same('reactor: five failures', [1, 2, 3, 4, 5, 6].map(() => R.act('more_monster_types').types), [7, 8, 9, 10, 11, 11]);
  const after = tally(R.walk(6000));
  ok('reactor: walks then meet kinds up to 11 and never 12', after[11] > 0 && after[7] > 0 && !after[12], after);
  same('reactor: passes take kinds away down to one', until(R, 'fewer_monster_types').end.types, 1);
  ok('reactor: with one plate lit, only the Laser Pod Blaster wanders', Object.keys(tally(R.walk(2000))).join() === '1');
  // the screen: a pass adds 2, a failure takes 2 off
  same('screen: a pass', R.act('encounters_less_often').oneIn, 72);
  same('screen: a failure', [R.act('encounters_more_often').oneIn, R.act('encounters_more_often').oneIn], [70, 68]);
  same('screen: the highest', until(R, 'encounters_less_often').end.oneIn, 98);
  same('screen: the lowest', until(R, 'encounters_more_often').end.oneIn, 2);
  says('The number can rise to 98 and fall to 2.');
}

// ---- 03: the assembly floor ----
{
  const L = part('map-19'), F = fight(19, 11), R = B.roam(F, L, [5, 5]);
  same('assembly: the header', R.read(), { oneIn: 60, types: 5, groups: 5 });
  const routines = ['more_encounter_groups', 'encounters_more_often', 'more_monster_types', 'fewer_encounter_groups', 'encounters_less_often', 'fewer_monster_types'];
  routines.forEach((l, i) => coded(L, l, i));
  same('assembly: the first and last routine', [L.byName.get(routines[0]), L.byName.get(routines[5])], [0x3CEE, 0x3D37]);
  // panels: check squares 2, 3 and 4, each wrecked into change 0, 1 or 2; consoles: cages 1, 6 and 8
  // open into check squares 5, 7 and 9, each wrecked into action square 3, 4 or 5
  same('assembly: how many panels and cages', [2, 3, 4, 1, 6, 8].map(n => squares(F, 2, n).length), [8, 9, 5, 4, 4, 4]);
  says('All 22 panels read the same');
  same('assembly: what wrecking leads to', [2, 3, 4, 1, 6, 8, 5, 7, 9].map(n => check(L, n).slice(4, 6)), [[12, 0], [12, 1], [12, 2], [2, 5], [2, 7], [2, 9], [6, 3], [6, 4], [6, 5]]);
  same('assembly: the panels and consoles read the same', [[2, 3, 4].map(n => check(L, n).slice(1, 3)), [5, 7, 9].map(n => check(L, n).slice(1, 3))], [[[13, 14], [13, 14], [13, 14]], [[16, 17], [16, 17], [16, 17]]]);
  // a panel breaks to ST, a Crowbar (45), a Pick ax (53), a Sledge hammer (56) or an explosive (items
  // 6 to 12); a cage door opens to Picklock (skill 15), ST, the Sledge hammer or an explosive
  const panel = [68, 14, 32, 45, 32, 53, 32, 56, 32, 7, 32, 6, 32, 8, 32, 11, 32, 9, 32, 10, 32, 12];
  same('assembly: what the panels and consoles ask for', [2, 3, 4, 5, 7, 9].map(n => asks(L, n)), [panel, panel, panel, panel, panel, panel]);
  const cage = [4, 15, 69, 14, 32, 56, 32, 7, 32, 6, 32, 8, 32, 11, 32, 9, 32, 10, 32, 12];
  same('assembly: what the cage doors ask for', [1, 6, 8].map(n => asks(L, n)), [cage, cage, cage]);
  // remote changes 0 to 2 make the party's square action square 0 to 2
  for (let k = 0; k < 3; k++) { const a = L.byName.get('remote_0' + k), end = L.byName.get('remote_0' + (k + 1)), bytes = Array.from(L.ram.subarray(a, end)); ok('assembly: change ' + k + ' names action square ' + k, bytes.join(',').includes('6,' + k), bytes); }
  same('assembly: the game\'s words', [13, 14, 16, 17].map(n => flat(B.say(F, n))), ['A security monitor panel is set into the wall at this point.', 'You successfully damage it beyond any useful function.',
    'Inside you find a command console. The keyboard is locked, and the screen reports inside is a 99% complete robot.', 'You utterly destroy the command console and the machine dies.']);
  for (const t of ['A security monitor panel is set into the wall at this point.', 'You successfully damage it beyond any useful function.',
    'Inside you find a command console. The keyboard is locked, and the screen reports inside is a 99% complete robot.', 'You utterly destroy the command console and the machine dies.']) says(t);
  const times = (label, n) => { let o; for (let i = 0; i < n; i++) o = R.act(label); return o; };
  same('assembly: eight panels', times('more_encounter_groups', 8).groups, 13);
  same('assembly: nine panels', times('encounters_more_often', 9).oneIn, 42);
  same('assembly: five panels', times('more_monster_types', 5).types, 10);
  same('assembly: ten kinds at most', [R.act('more_monster_types').types, maxTypes[19]], [10, 10]);
  same('assembly: the consoles', [times('fewer_encounter_groups', 4).groups, times('encounters_less_often', 4).oneIn, times('fewer_monster_types', 4).types], [9, 50, 6]);
  same('assembly: the robots in order', Array.from({ length: 11 }, (_, i) => typeName(19, i + 1)), ['Titanium Clawer', 'Steel Reaver', 'Killer', 'Hunter', 'Silicon Sniper', 'Silver Strangler', 'VTOL Auto-fire Robot',
    'Threshing Crawler', 'Xenon Laser Cannon', 'Octotron', 'Vax']);
  says('the Silver Strangler, the VTOL Auto-fire Robot, the Threshing Crawler, the Xenon Laser Cannon, and the Octotron');
  // the testing facility: the same ten records, three kinds that wander, and no routine that adds one
  const T = part('map-18');
  same('testing facility: the records are the assembly floor\'s', numbered(T, 'monster').filter(([k]) => k).map(([k, a]) => Array.from(T.ram.subarray(a, a + 8)).join()),
    numbered(L, 'monster').filter(([k]) => k >= 1 && k <= 10).map(([k, a]) => Array.from(L.ram.subarray(a, a + 8)).join()));
  same('testing facility: three kinds wander and nothing adds one', [header(T).types, maxTypes[18]], [3, 3]);
  same('testing facility: who is met', D.beasts.filter(b => b.w.some(w => w[0] === 18 && (w[2] || w[5]))).map(b => b.n).sort(), ['Killer', 'Steel Reaver', 'Titanium Clawer', 'Xenon Laser Cannon']);
}

// ---- 06: walking away ----
{
  const F = fight(31, 5), M = B.meeting(F, 0);
  const ghoul = N(on('Pit Ghoul', 31));
  same('Pit Ghoul: the numbers', [ghoul.seed, ghoul.hpMin, ghoul.hpMax, ghoul.skill, ghoul.dmgMin, ghoul.dmgMax, ghoul.armour, ghoul.exp, on('Pit Ghoul', 31).r], [255, 64, 318, 3, 13, 38, 3, 1020, [255, 0, 3, 5, 19, 129, 2, 7]]);
  says('The Pit Ghoul rolls anything from 64 to 318'); says('64 to 318 hit points, three attacks a round of 13 to 38 damage, and 1,020 experience');
  const first = M.arrive();
  let r = M.round(), n = 1;
  while (r.hp[0] === first.hp[0] && n++ < 20) r = M.round();
  ok('walking away: a round wounds the Pit Ghoul', r.hp[0] < first.hp[0], first.hp, r.hp);
  ok('walking away: the scan drops the group', M.leave());
  const seen = new Set();
  let inRange = true;
  for (let i = 0; i < 60; i++) { const again = M.arrive(); seen.add(again.hp[0]); if (again.hp[0] < ghoul.hpMin || again.hp[0] > ghoul.hpMax) inRange = false; M.leave(); }
  ok('walking away: each return is a fresh roll', seen.size > 30 && inRange, seen.size);
  same('walking away: the addresses', ['scan_for_encounters', 'place_encounter_groups', 'groups_write_back', 'plan_group_moves', 'line_average_hp'].map(l => part('game').byName.get(l)), [0x94CC, 0x936E, 0xB9F2, 0x83D7, 0x86E9]);
  // the dead stay dead: ten Cyborg Commandos in Las Vegas, three of them left with 1 hit point
  const G = fight(12, 4), C = B.meeting(G, 10), rec = G.encounterRecord(10);
  C.arrive();
  same('Las Vegas meeting 10: ten in its first line', [G.m[rec + 4], G.groups()[0].lines[0].hp.length], [10, 10]);
  for (let i = 0; i < 10; i++) { G.m[0xEE00 + 4 + 2 * i] = 1; G.m[0xEE00 + 5 + 2 * i] = 0; }
  let left = 10;
  for (let k = 0; k < 6 && left === 10; k++) { C.round(); left = C.left(); }
  ok('the dead: a round kills some and the map\'s count falls', left < 10 && left > 0, left);
  C.leave();
  const back = C.arrive();
  ok('the dead: the survivors come back with new hit points and the dead do not', back && back.hp.length === left && back.hp.every(v => v > 1), back && back.hp, left);
}

// ---- 07: running from the start ----
{
  const F = fight(31, 5), M = B.meeting(F, 0);
  let ran = 0, wrong = 0;
  const n = 300;
  let runner = null;
  for (let i = 0; i < n; i++) {
    M.again(); F.random = WLFight.seeded(1000 + i * 7);
    const m = M.arrive();
    if (m.runs) { ran++; runner = runner || 1000 + i * 7; }
    if (m.runs !== (m.hp[0] < 127)) wrong++;
  }
  same('running: the plan is to run exactly when the roll is under 127', wrong, 0);
  ok('running: about a quarter of 300 Pit Ghouls', ran > 55 && ran < 95, ran);
  same('running: the exact share', B.runs(on('Pit Ghoul', 31).r), 63 / 255);
  says('The Pit Ghoul runs on a roll of 1 to 63, which is 24.7% of its rolls.'); says('fewer than 127 hit points, half of the 255 in its record');
  // a running Pit Ghoul strikes no blow and the game says it runs
  M.again(); F.random = WLFight.seeded(runner);
  M.arrive();
  const w = M.wait();
  same('running: no blow, and the game\'s line', [w.blows, w.moves], [0, 'The Pit Ghoul runs away.']);
  says('The Pit Ghoul runs away.');
  // the share over the roster: animals and guns never, the rest between a fifth and a quarter for most
  ok('running: animals and guns have no share', D.beasts.every(b => !(b.r[6] === 1 || N(b).ranged) || N(b).runs === 0));
  const shares = D.beasts.filter(b => b.r[6] !== 1 && !N(b).ranged).map(b => N(b).runs).sort((a, b) => a - b);
  ok('running: most hand-to-hand monsters start out running a fifth to a quarter of the time', shares.filter(s => s >= 0.195 && s <= 0.25).length >= 0.8 * shares.length, shares.length);
  // an animal with the lowest roll does not run: the Shadowclaw of the mine, alone
  const A = fight(43, 2), L = part('map-43');
  const enc = numbered(L, 'enc').find(([k, a]) => typeName(43, L.ram[a + 3]) === 'Shadowclaw' && squares(A, 3, k).length);
  const V = B.meeting(A, enc[0]);
  pin(A, false);
  const claw = V.arrive();
  unpin(A);
  same('running: a Shadowclaw with its lowest roll stays', [claw.name, claw.hp[0], claw.runs, on('Shadowclaw', 43).r[6]], ['Shadowclaw', N(on('Shadowclaw', 43)).hpMin, false, 1]);
}

// ---- 08: the Night Terror ----
{
  const F = fight(23, 9), M = B.meeting(F, 0, { square: [3, 25] }), rec = F.encounterRecord(0);
  const b = on('Night Terror', 23), x = N(b);
  same('Night Terror: the numbers', [x.seed, x.hpMin, x.hpMax, x.exp, x.skill, x.ranged, x.kind], [32000, 8256, 40000, 32000, 1, false, 2]);
  same('Night Terror: its meeting is peaceful and it is the only one', [F.m[rec + 9] & 2, b.w], [2, [[23, 1, 1, 1, 1, 0, 0, 1]]]);
  same('Night Terror: the share that runs', [B.runs(b.r), 31 + 29], [0.48, 60]);
  says('from 8,256 to 40,000'); says('Together 60 rolls in 125 make a Night Terror that runs: 48%.'); says('A kill is worth 32,000 experience');
  // waiting: never struck, and never a plan
  let blows = 0, planned = 0, steps = new Set();
  for (let i = 0; i < 200; i++) {
    if (!F.groups().length) { const m = M.arrive(); steps.add((m.hp[0] - 8000) % 256); if (m.runs) planned++; }
    blows += M.wait().blows;
  }
  same('Night Terror: 200 rounds of waiting', [blows, planned, [...steps], M.peaceful()], [0, 0, [0], true]);
  // attacked: hostile, and it runs exactly when it has fewer than 16,000 or 32,768 and more
  let wrong = 0, low = 0, high = 0, fights = 0, stillPeaceful = 0, line = '';
  for (let i = 0; i < 160; i++) {
    M.again(); F.random = WLFight.seeded(500 + 31 * i);
    M.arrive();
    const r = M.round();
    if (M.peaceful()) stillPeaceful++;
    const runs = M.plans(), hp = r.hp[0];
    if (runs !== (hp < 16000 || hp >= 32768)) wrong++;
    if (runs && hp < 16000) low++; else if (runs) high++; else fights++;
    if (runs && hp >= 32768 && !line) { M.round(); line = M.round().moves; }
  }
  same('Night Terror: attacked, it is hostile and runs by the two rules', [wrong, stillPeaceful], [0, 0]);
  ok('Night Terror: all three outcomes in 160', low > 20 && high > 20 && fights > 50, [low, high, fights]);
  same('Night Terror: the strong one runs', line, 'The Night Terror runs away.');
  // the edge: 32,767 fights and 32,768 runs
  M.again(); M.arrive(); F.m[rec + 9] &= ~2;
  const plan = hp => { F.m[0xEE04] = hp & 255; F.m[0xEE05] = hp >> 8; F.call(WLFight.A.plan); const p = F.groups()[0].plan; return p !== 255 && p >> 6 === 1; };
  same('Night Terror: the plan at the edges', [15999, 16000, 32767, 32768, 40000].map(plan), [true, false, false, true, true]);
  same('engine: the sum that holds at 0', part('engine').byName.get('num1_add_clamped'), 0x079D);
}

// ---- 09: never met ----
{
  const met = w => w[2] > 0 || w[5] > 0;
  const lost = [];
  for (const b of D.beasts) for (const w of b.w) if (!met(w)) lost.push(b.n + ' ' + w[0]);
  same('never met: the monsters no meeting uses', lost, ['Spiker 3', 'Bouncer 4', 'Threshing Crawler 18', 'Silicon Sniper 18', 'Hunter 18', 'Silver Strangler 18', 'VTOL Auto-fire Robot 18', 'Octotron 18',
    'Clawer Leader 24', 'Clawer Leader 25', 'Clawman 24', 'Clawman 25', 'Gambler 32', 'Brother Greg 35', 'Brother Robert 35', 'Brother Carl 35', 'Brother Richard 35', 'Woman 40']);
  same('never met: the cut meetings\' maps', D.cut.map(c => c.map + ':' + c.enc), ['12:15', '12:20', '18:1', '25:3', '34:21', '35:17', '41:35', '49:15', '49:20', '49:22', '49:23']);
  for (const who of ['Brother Robert', 'Brother Carl', 'Brother Richard']) ok(who + ' is in the cut meeting only', rowsOf(who).length === 1 && rowsOf(who)[0].w.every(w => !met(w) && w[6] === 1));
  says('leap up from behind the table and attack!'); says('rather large patrol of cyber warriors');
  // Savage Village: the Junk Master and the Woman have a hostile meeting that is used
  for (const who of ['Junk Master', 'Woman']) { const w = on(who, 49).w.find(w => w[0] === 49); ok('Savage Village: a ' + who + ' that is met and not peaceful', w[2] > w[7], w); }
  // the two portraits no record names
  const WLPictures = g.run('reference/wasteland-pictures.js', 'pictures/pictures.js', 'WLPictures').WLPictures;
  const named = new Set(D.beasts.map(b => b.r[7])), all = WLPictures.PORTRAITS.map(p => p[0]);
  same('portraits: 37 and 75 are on the disks and in no record', [all.includes(37), all.includes(75), named.has(37), named.has(75), all.length], [true, true, false, false, 75]);
  says('The other 73 portraits');
  ok('portraits: every record\'s portrait is on the disks', [...named].every(n => all.includes(n)));
}

// ---- 10: a monster's record ----
{
  const raw = (map, t) => { const L = part(mapId(map)); let a = L.byName.get('monster_name_' + String(t).padStart(2, '0')), s = ''; for (; L.ram[a]; a++) s += L.ram[a] === 0x0A ? '|' : String.fromCharCode(L.ram[a]); return s; };
  const gun = D.beasts.find(b => b.n === 'Gunman').w[0];
  same('names: Gunman', raw(gun[0], gun[1]), 'Gunm|a|e|n');
  const plural = n => rowsOf(n).map(b => b.p);
  same('names: the odd plurals', [plural('Policeman')[0], plural('Juvenile')[0], plural('Rodento Grosso')[0], D.beasts.find(b => b.n === 'Woman' && b.w[0][0] === 40).p], ['Police', 'Juvies', 'Rodento Grossi', 'Womans']);
  const crawler = map => N(on('Threshing Crawler', map));
  same('the two Threshing Crawlers', [crawler(20).seed, crawler(20).hpMin, crawler(20).hpMax, crawler(19).seed, crawler(19).hpMin, crawler(19).hpMax], [260, 322, 325, 235, 59, 293]);
  says('322 to 325 hit points'); says('the number 235, and 59 to 293 hit points');
  // kinds and pronouns: the game's own words for the five kinds (game messages 83 to 87 name them)
  same('kinds', [B.KINDS.slice(1), [...new Set(D.beasts.map(b => b.r[6]))].sort()], [['Animal', 'Mutant', 'Humanoid', 'Cyborg', 'Robot'], [1, 2, 3, 4, 5]]);
  // every weapon class in the records is one numbers() knows
  ok('weapon classes are 1 to 13', D.beasts.every(b => (b.r[5] & 15) >= 1 && (b.r[5] & 15) <= 13), [...new Set(D.beasts.map(b => b.r[5] & 15))]);
}

console.log(bad ? 'FAIL: ' + bad + ' of ' + checks + ' checks differ' : 'ok: ' + checks + ' checks hold the Bestiary tab to the game\'s code and listings');
process.exit(bad ? 1 : 0);
