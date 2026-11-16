#!/usr/bin/env node
// Hold the Items tab to the game's own code and to the committed listings. The page's block
// WLItems (items/play.js) runs in node on WLFight (reference/wasteland-fight.js: the engine's,
// the game's and one map's listing laid over each other, the game's routines run on the kit's
// 6502), with the shop (location module 1) laid over them, and what the page says is made again:
// - the list: every item record, name, bag, recruit and check square of the 42 maps, built again
//   from the listings and compared with the page's embedded data; the seven shop records found by
//   a scan of the maps; the stock counts of file 0 against the game's listing;
// - sorting a pack: the worn and held marks after a sort with and without a stray RETURN, a suit
//   traded on while its armour class stays, a whole party armoured by one suit, and a fight;
// - the shops: a sale in Quartz on the shelf in Needles, the order of the two writes to the disk,
//   a machine switched off between them, the prices paid, and a party of one;
// - the bags that roll their ammunition, reloading, tools held as weapons, and the items nothing
//   in the game asks for.
// The stock counts of files 1, 2 and 4 are on the disks and in no listing, so the test can hold
// only their shape; facts.md says where they were read. Everything else it needs is committed: no
// disk image, no snapshot, no emulator. It exits 1 on any difference.
//   node games/c64/wasteland/test_items.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const WLFight = g.run('reference/wasteland-fight.js', 'fight/fight.js', 'WLFight').WLFight;
const WLItems = g.run('items.html', 'items/play.js', 'WLItems').WLItems;
const html = g.read('items.html');
const page = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<\/?(?:td|th|tr|p|div|li|section|h2|table|thead|tbody)\b[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const D = JSON.parse(/<script type="application\/json" id="wl-items">([\s\S]*?)<\/script>/.exec(html)[1]);
const I = D.items;

let bad = 0, checks = 0;
const fail = (what, ...more) => { if (bad++ < 40) console.log('DIFFERS', what, ...more); };
const same = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) fail(what, 'got', JSON.stringify(got), 'expected', JSON.stringify(want)); };
const ok = (what, yes, ...more) => { checks++; if (!yes) fail(what, ...more); };
const says = text => { checks++; if (!page.includes(text)) fail('the page does not say', JSON.stringify(text)); };

const listings = {};
const part = id => listings[id] || (listings[id] = g.listing('parts/' + id + '/listing.json'));
const mapId = n => 'map-' + String(n).padStart(2, '0');
const mapParts = fs.readdirSync(path.join(__dirname, 'parts')).filter(d => /^map-\d\d$/.test(d)).sort();
const numbered = (L, prefix) => [...L.byName].filter(([k]) => k.startsWith(prefix + '_') && /^\d+$/.test(k.slice(prefix.length + 1)))
  .map(([k, a]) => [+k.slice(prefix.length + 1), a]).sort((a, b) => a[0] - b[0]);
const TABLE = 0x3100, cls = n => I[n].r[3] >> 3, price = n => I[n].r[0] | I[n].r[1] << 8;
// a party on a map, with the disk the shop reads and writes; shop: lay module 1 over it
const world = (map, o) => {
  o = o || {};
  const F = WLFight.create({ engine: part('engine'), game: part('game'), map: part(mapId(map)), mapNumber: map, CPU, random: WLFight.seeded(o.seed || 1), size: o.size || 4 });
  const disk = o.disk || { tables: {}, party: null, log: [] };
  const P = WLItems.attach(F, disk, o.shop ? part('module-1') : null);
  if (o.shop && !o.disk) for (const k of Object.keys(D.stock)) {
    const t = F.m.slice(TABLE, TABLE + 768); D.stock[k].forEach((v, n) => { t[8 + 8 * n + 2] = v; }); t.set(D.cash[k], 8 + 8 * 94); disk.tables[k] = t;
  }
  return { F, P, disk, m: F.m };
};
const plain = s => s.replace(/[\u0001\u0002]/g, '');
const shopAt = (map, name) => D.shops.find(s => s.map === map && s.name === name);

// ---- the list: the page's data against the listings ----
{
  const G = part('game'), m = G.ram;
  same('95 items', I.length, 95);
  for (let n = 0; n < 95; n++) same('record of item ' + n, I[n].r, [...m.slice(0x3108 + 8 * n, 0x3110 + 8 * n)]);
  // names: the game's own item list prints them, nine to a page
  const { F, P } = world(1);
  const seen = {};
  for (let n = 1; n < 95; n += 9) {
    const list = []; for (let k = n; k < n + 9 && k < 95; k++) list.push([k, 0]);
    P.give(1, list);
    const lines = plain(P.itemsPage(1, []).screens[0]).split('\n').filter(l => /^\d[>_]/.test(l));
    lines.forEach((l, k) => { seen[n + k] = l.slice(2).trim(); });
  }
  for (let n = 1; n < 95; n++) same('name of item ' + n, seen[n], I[n].n);
  same('the nameless three', [I[70].n, I[71].n, I[72].n], ['', '', '']);
  same('Fists', I[0].n, 'Fists');
  // kinds: the items of each class
  const of = c => I.filter(it => it.i < 94 && it.r[3] >> 3 === c).map(it => it.i);
  same('no item of kind 5', of(5), []);
  same('ammunition', of(14), [30, 31, 32, 33, 34]);
  same('armour', of(15), [35, 36, 37, 38, 39, 40, 41, 42]);
  same('quest items are 58 to 90', [of(18)[0], of(18).length, of(18)[32]], [58, 33, 90]);
  same('the seven that shake the screen', I.filter(it => it.i < 94 && (it.r[3] & 7) === 1).map(it => it.i), [6, 7, 8, 9, 10, 11, 12]);
  same('every other effect is 0', I.filter(it => it.i < 94 && (it.r[3] & 7) > 1).length, 0);
  same('skills named by the records', [...new Set(I.slice(0, 94).map(it => it.r[5]))].sort((a, b) => a - b), [0, 1, 3, 4, 5, 6, 8, 10, 11, 12, 20, 34]);
  same('Flamethrower', I[17].r.slice(3), [3 << 3, 60, 0, 11, 0]);
  same('Red Ryder', [price(20), I[20].r[4], I[20].r[6], I[20].r[7]], [12345, 63, 200, 31]);
  same('Power armor', [price(35), I[35].r[6]], [30000, 14]);
  same('item 70', [price(70), I[70].r[4], I[70].r[6], I[70].r[7]], [500, 5, 3, 34]);
  same('items 71 and 72', [price(71), I[71].r[4], price(72), I[72].r[4]], [4500, 1, 4000, 0]);
  same('the two Bloodstaffs', I[62].r, I[63].r);
  same('tools roll an Ax\'s dice', [1, 2, 45, 53, 55, 56].map(n => I[n].r[6]), [3, 3, 3, 3, 3, 3]);
  same('tools name no skill', [45, 53, 55, 56].map(n => I[n].r[5]), [0, 0, 0, 0]);
  // the quest items are in alphabetical order but for two
  const names = I.slice(58, 91).filter(it => it.n && it.i !== 60 && it.i !== 67).map(it => it.n.toLowerCase());
  same('58-90 in order without Finster\'s head and Visa card', names, names.slice().sort());
  same('the two out of order', [I[59].n, I[60].n, I[61].n, I[66].n, I[67].n, I[68].n], ['Antitoxin', 'Finster\'s head', 'Blackstar key', 'Clone fluid', 'Visa card', 'Fusion cell']);
  same('around the nameless', [I[69].n, I[73].n], ['Grazer bat fetish', 'Nova key']);

  // bags, recruits and check squares, map by map
  const loot = {}, npc = {}, use = {}, carry = {}, shops = [], named = [];
  let bags = 0, fixedCash = 0;
  const levels = g.read('levels.html');
  for (const id of mapParts) {
    const n = +id.slice(4), L = part(id), r = L.ram;
    ok('map ' + n + ' has a title the Maps tab has', D.maps[n] && levels.includes(D.maps[n].replace(/&/g, '&amp;').replace(/'/g, '&#x27;')) || levels.includes(D.maps[n]), D.maps[n]);
    for (const [k, a] of numbered(L, 'loot')) {
      bags++;
      for (let i = a + 2; r[i] !== 0xFF && i < a + 90;) {
        const b = r[i];
        if (b === 0x5E || b === 0xDE) { if (b === 0xDE) fixedCash++; i += 3; continue; }
        if (b & 0x80) { const q = ((loot[b & 0x7F] = loot[b & 0x7F] || {})[n] = (loot[b & 0x7F] || {})[n] || [0, 0, 0]); q[0]++; if (r[i + 1] & 0x80) { q[1]++; q[2] += r[i + 1] & 0x7F; } else { q[1] += r[i + 1]; q[2] += r[i + 1]; } }
        else if (b) named.push([n, k, b, r[i + 1]]);
        i += 2;
      }
    }
    for (const [, a] of numbered(L, 'npc')) {
      let name = ''; for (let k = 0; k < 14 && r[a + k]; k++) name += String.fromCharCode(r[a + k] & 0x7F);
      for (let k = 0; k < 30; k++) { const it = r[a + 0xBD + 2 * k] & 0x7F; if (r[a + 0xBD + 2 * k]) (npc[it] = npc[it] || []).push([n, name]); }
    }
    for (const [, a] of numbered(L, 'check')) {
      const seen = new Set();
      for (let i = a + 0x0A, c = 0; r[i] !== 0xFF && c < 40; i += 2, c++) {
        const kind = r[i] >> 5, v = r[i + 1];
        if (kind === 1 && v < 95 && !seen.has(v)) { (use[v] = use[v] || {})[n] = ((use[v] || {})[n] || 0) + 1; seen.add(v); }
        else if (kind >= 5 && v < 95 && !seen.has('c' + v)) { (carry[v] = carry[v] || {})[n] = ((carry[v] || {})[n] || 0) + 1; seen.add('c' + v); }
      }
    }
    // shop records: $81, the two bytes of the square left behind, two shifts, a greeting, a file,
    // twelve characters of name, kinds to $FF
    let lo = 0x10000, hi = 0; for (let a = 0; a < 0x10000; a++) if (L.has[a]) { if (a < lo) lo = a; hi = a; }
    for (let a = lo; a < hi - 20; a++) {
      if (r[a] !== 0x81 || r[a + 6] > 4 || r[a + 3] > 3 || r[a + 4] > 3 || !r[a + 4]) continue;
      const nm = [...r.slice(a + 7, a + 19)];
      if (!nm.every(c => (c & 0x7F) >= 0x20 || c === 0) || nm.filter(c => (c & 0x7F) >= 0x41).length < 4) continue;
      const kinds = []; let i = a + 19; while (r[i] !== 0xFF && kinds.length < 20) kinds.push(r[i++]);
      if (!kinds.length || r[i] !== 0xFF || kinds.some(c => c > 31)) continue;
      shops.push({ map: n, rec: a, name: nm.map(c => String.fromCharCode(c & 0x7F)).join('').split('\0')[0].trim(), table: r[a + 6], buy: r[a + 3], sell: r[a + 4], cls: kinds });
    }
  }
  const rows = o => Object.keys(o || {}).map(k => [+k].concat(o[k])).sort((a, b) => a[0] - b[0]);
  for (let n = 0; n < 95; n++) {
    same('bags of item ' + n, I[n].loot, rows(loot[n]));
    same('recruits with item ' + n, I[n].npc, (npc[n] || []).slice().sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)));
    same('squares that take item ' + n, I[n].use, rows(use[n]));
    same('squares that look for item ' + n, I[n].carry, rows(carry[n]));
  }
  same('bags on the maps', bags, 469);
  same('bags that name a kind', named.map(e => e.slice(0, 3)), [[24, 2, 14]].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(k => [28, k, 14])));
  same('their counts', [...new Set(named.map(e => e[3]))].sort(), [0x87, 0x8A]);
  says('Eleven bags name a kind of item'); says('Ten of the eleven bags are under the Temple of Blood'); says('rolls from 1 to 10 of its ammunition');
  same('shops', shops, D.shops.map(s => ({ map: s.map, rec: s.rec, name: s.name, table: s.table, buy: s.buy, sell: s.sell, cls: s.cls })));
  same('seven shops', D.shops.map(s => [s.map, s.name, s.table, s.sell]), [[1, 'Q. Emporium', 2, 1], [8, 'Trading car', 0, 2], [9, 'AG. store', 0, 2], [10, 'Store', 1, 2], [21, 'Market', 4, 1], [21, 'Blackmarket', 4, 1], [32, 'Thrift shop', 2, 1]]);
  ok('every shop sells at the full price', D.shops.every(s => s.buy === 0));
  same('Quartz and Needles deal in the same kinds', shopAt(1, 'Q. Emporium').cls.slice().sort(), shopAt(32, 'Thrift shop').cls.slice().sort());
  ok('three shops deal in kind 5', D.shops.filter(s => s.cls.includes(5)).map(s => s.name).join() === 'Q. Emporium,Blackmarket,Thrift shop');
  const overlap = (a, b) => a.cls.some(c => b.cls.includes(c));
  same('the other pairs share no kind', [overlap(shopAt(21, 'Market'), shopAt(21, 'Blackmarket')), overlap(shopAt(8, 'Trading car'), shopAt(9, 'AG. store'))], [false, false]);
  // Power armor: seven suits in bags, one on a recruit
  same('Power armor in bags', [I[35].loot.reduce((a, l) => a + l[2], 0), I[35].npc], [7, [[19, 'VAX']]]);
  says('Seven suits lie in bags late in the game, one recruit carries an eighth, and no shop sells one.');
  same('the Bloodstaffs\' bags', [I[62].loot.reduce((a, l) => a + l[1], 0), I[63].loot.reduce((a, l) => a + l[1], 0)].sort(), [4, 7]);
  same('the same squares take either Bloodstaff', I[62].use, I[63].use);
  says('Seven bags hold one and four hold the other');
  same('the Red Ryder is nowhere', [I[20].loot, I[20].npc, D.shops.some(s => D.stock[s.table][20])], [[], [], false]);
  same('Toaster only in the Inner Sanctum', I[90].loot.map(l => l.slice(0, 2)), [[42, 4]]);
  // the items nothing asks for
  for (const n of [43, 49, 51, 90, 91, 93]) same(I[n].n + ' is asked for nowhere', [I[n].use, I[n].carry], [[], []]);
  // the item numbers the code itself looks for: an LDA #n before a call of find_item
  const looked = new Set();
  for (const id of fs.readdirSync(path.join(__dirname, 'parts'))) {
    const recs = part(id).listing.records;
    recs.forEach((r, i) => {
      if (r.m !== 'jsr' || !/find_item\b/.test(String(r.o || ''))) return;
      for (let k = 1; k < 5 && i - k >= 0; k++) { const q = recs[i - k]; if (q.m === 'lda' && /^#\$/.test(String(q.o || ''))) { looked.add(parseInt(String(q.o).slice(2), 16)); break; } }
    });
  }
  for (const n of [43, 49, 51, 90, 91, 93]) ok(I[n].n + ' is looked for by no code', !looked.has(n));
  ok('the code looks for the Geiger counter and the Gas mask', looked.has(48) && looked.has(47), [...looked]);

  // stock: file 0 is the table in the game's listing; the others have its shape
  same('stock of file 0', D.stock[0], I.map((it, n) => m[0x3108 + 8 * n + 2]));
  for (const k of Object.keys(D.stock)) { same('file ' + k + ' has 95 counts', D.stock[k].length, 95); same('file ' + k + ' has a last record', D.cash[k].length, 8); ok('file ' + k + ' stocks nothing past kind 17', D.stock[k].every((v, n) => !v || n === 94 || cls(n) <= 17)); }
  same('files', Object.keys(D.stock), ['0', '1', '2', '4']);
  const never = I.filter(it => it.i >= 1 && it.i < 94 && it.n && cls(it.i) <= 17 && !Object.keys(D.stock).some(k => D.stock[k][it.i])).map(it => it.n);
  same('never on a shelf', never, ['Proton ax', 'RPG-7', 'Red Ryder', 'Laser pistol', 'Ion beamer', 'Laser carbine', 'Laser rifle', 'Meson cannon', 'Power pack', 'Power armor', 'Pseudo-chitin armor']);
  says(never.slice(0, -1).join(', ') + ', and ' + never[never.length - 1]);
  same('file 4 stocks 20 LAW rockets and 2 Howitzer shells', [D.stock[4][11], D.stock[4][33]], [20, 2]);
}

// ---- 01, 02: sorting a pack ----
{
  const start = () => {
    const w = world(1);
    [[[13, 7], [35, 0], [44, 0], [30, 0]], [[16, 18], [38, 0], [54, 1]], [[19, 8], [44, 0]], [[4, 0], [44, 0]]].forEach((p, k) => w.P.give(k + 1, p));
    [[1, 2], [1, 2], [1], [1]].forEach((s, k) => s.forEach(x => w.P.equip(k + 1, x)));
    return w;
  };
  const sort = (P, i, before) => { const keys = ['R']; P.pack(i).forEach((q, k) => { if (k + 1 === before) keys.push('RETURN'); keys.push('1'); }); keys.push('BACK'); return P.itemsPage(i, keys); };
  const line = (P, i, item) => P.pack(i).findIndex(q => q.item === item) + 1;
  const pass = (P, i) => { P.itemsPage(i, [String(line(P, i, 35)), 'T', String(i + 1), 'BACK']); P.itemsPage(i + 1, [String(line(P, i + 1, 35)), 'E', 'BACK']); };
  let w = start();
  same('put on: marks and armour class', [w.P.marks(1), w.P.marks(2)], [{ weapon: 1, armour: 2, ac: 14 }, { weapon: 1, armour: 2, ac: 1 }]);
  const r = sort(w.P, 1, 0);
  ok('the sort ran to its end', r.ended && !r.left);
  same('a sort with no stray key keeps the marks', w.P.marks(1), { weapon: 1, armour: 2, ac: 14 });
  ok('the list prints Reorder', /Reorder/.test(r.screens[1]), r.screens[1]);
  w = start(); pass(w.P, 1);
  same('traded without a sort: the giver is at 0', [w.P.marks(1).ac, w.P.marks(1).armour, w.P.marks(2).ac], [0, 0, 14]);
  w = start(); sort(w.P, 1, 2);
  same('RETURN before the suit: the mark is one line low', [w.P.marks(1), w.P.slot(1, 3).item], [{ weapon: 1, armour: 3, ac: 14 }, 44]);
  same('the pack is in the same order', w.P.pack(1).map(q => q.item), [13, 35, 44, 30]);
  pass(w.P, 1);
  same('traded after the sort: both at 14', [w.P.marks(1).ac, w.P.marks(2).ac, w.P.pack(1).some(q => q.item === 35)], [14, 14, false]);
  for (const i of [2, 3]) { sort(w.P, i, line(w.P, i, 35)); pass(w.P, i); }
  same('one suit, four Rangers at 14', [1, 2, 3, 4].map(i => w.P.marks(i).ac), [14, 14, 14, 14]);
  same('one suit in the party', [1, 2, 3, 4].reduce((a, i) => a + w.P.pack(i).filter(q => q.item === 35).length, 0), 1);
  says('The plate ends with four Rangers at armour class 14 and one suit between them.');
  // dropping the item that carries the mark takes the armour class
  // (the list closes the gap the suit left, so the marked line is counted among the lines shown)
  const marked = w.P.pack(1).findIndex(q => q.slot === w.P.marks(1).armour) + 1;
  same('the mark is on the Canteen', w.P.slot(1, w.P.marks(1).armour).item, 44);
  w.P.itemsPage(1, [String(marked), 'D', 'BACK']);
  same('the marked Canteen dropped', [w.P.marks(1).ac, w.P.pack(1).some(q => q.item === 44)], [0, false]);
  // two stray keys, two lines
  w = start(); w.P.itemsPage(1, ['R', 'RETURN', 'SPACE', '1', '1', '1', '1', 'BACK']);
  same('two stray keys move both marks two lines', w.P.marks(1), { weapon: 3, armour: 4, ac: 14 });

  // 02: the weapon mark
  const hands = () => { const v = world(1); v.P.give(1, [[13, 7], [30, 0], [44, 0]]); v.P.equip(1, 1); v.P.give(2, [[54, 1], [44, 0], [43, 0]]); return v; };
  w = hands();
  same('the notes start at 0', [w.m[0x1026], w.m[0x102C]], [0, 0]);
  w.P.itemsPage(2, ['R', '1', '1', '1', 'BACK']);
  same('a bare-handed Ranger\'s first sort is safe', w.P.marks(2).weapon, 0);
  w.P.itemsPage(1, ['R', 'RETURN', '1', '1', '1', 'BACK']);
  same('the pistol\'s mark slips to the clip', [w.P.marks(1).weapon, w.P.slot(1, 2).item], [2, 30]);
  w.P.itemsPage(2, ['R', '1', '1', '1', 'BACK']);
  same('the bare-handed Ranger now holds line 2, a Canteen', [w.P.marks(2).weapon, w.P.slot(2, 2).item], [2, 44]);
  same('Fists name Pugilism', I[0].r[5], 5);

  // the armour class alone stops the blows: a Pit Ghoul's meeting, thirty rounds
  const taken = (ac, seed) => {
    const v = world(31, { seed }), F = v.F;
    for (let i = 1; i <= 4; i++) { v.P.give(i, [[44, 0], [1, 0]]); v.P.equip(i, 2); F.setCon(i, 2000); F.setMaxCon(i, 2000); v.m[F.rec(i) + 0x1A] = ac; v.m[F.rec(i) + 0x25] = ac ? 1 : 0; }
    const sq = F.encounterSquare(0); F.place(sq.x, sq.y + 1);
    let t = 0;
    for (let k = 0; k < 30; k++) { const b = F.cons().reduce((a, x) => a + x, 0), res = F.round(() => [[5, 0], [5, 0], [5, 0], [5, 0]]); t += b - F.cons().reduce((a, x) => a + x, 0); if (res.over) break; }
    return t;
  };
  const bare = taken(0, 2) + taken(0, 3), armoured = taken(14, 2) + taken(14, 3);
  ok('armour class 14 with the mark on a Canteen stops the blows', bare > 200 && armoured === 0, bare, armoured);
}

// ---- 03, 04, 07: the shops ----
{
  const QUARTZ = shopAt(1, 'Q. Emporium'), NEEDLES = shopAt(32, 'Thrift shop'), HIGHPOOL = shopAt(10, 'Store');
  const start = (map, o) => { const w = world(map, Object.assign({ shop: true }, o)); w.P.give(1, [[13, 3], [35, 0], [44, 0], [52, 1]]); w.P.equip(1, 1); w.P.equip(1, 2); w.P.setCash(1, 40000); w.disk.party = w.m.slice(0xF400, 0xFC00); return w; };
  const onDisk = (w, n) => w.disk.tables[2][8 + 8 * n + 2];
  let w = start(1);
  // the greetings, as the shops print them
  for (const s of D.shops) { const v = world(s.map, { shop: true }); ok(s.name + ' greets as the page says', plain(v.P.shop(s.rec, []).screens[0]).replace(/\s+/g, ' ').includes(s.greet.replace(/\s+/g, ' ')), s.greet); }
  let r = w.P.shop(QUARTZ.rec, ['1', 'S']);
  ok('the sell list offers half', /15000 Power armor/.test(plain(r.screens[2])) && /75 M1911A1 45 pistol/.test(plain(r.screens[2])), r.screens[2]);
  w = start(1); r = w.P.shop(QUARTZ.rec, ['1', 'S', '2', 'BACK', 'BACK']);
  ok('the shop ran to its end', r.ended);
  same('sold in Quartz', [w.P.cash(1), onDisk(w, 35), w.P.marks(1).ac, w.disk.log], [55000, 1, 0, ['shelf', 'party']]);
  // Needles reads the same file
  const n = world(32, { shop: true, disk: w.disk }); n.m.set(w.m.slice(0xF400, 0xFC00), 0xF400);
  r = n.P.shop(NEEDLES.rec, ['1', 'B', 'K']);
  const hit = /(?:^|\n)(\d)[>_] *30000 Power armor/.exec(plain(r.screens[3]));
  ok('Needles lists the suit at the full price', !!hit, r.screens[3]);
  const n0 = world(32, { shop: true }); r = n0.P.shop(NEEDLES.rec, ['1', 'B', 'K']);
  ok('and does not list one when none was sold', !/Power armor/.test(r.screens[3]));
  const n2 = world(32, { shop: true, disk: w.disk }); n2.m.set(w.m.slice(0xF400, 0xFC00), 0xF400);
  n2.P.shop(NEEDLES.rec, ['1', 'B', 'K', hit ? hit[1] : '1', 'BACK', 'BACK']);
  same('bought in Needles', [n2.P.cash(1), onDisk(n2, 35), n2.P.pack(1).filter(q => q.item === 35).length], [25000, 0, 1]);
  // the two writes, and a machine switched off between them
  w = start(1); r = w.P.shop(QUARTZ.rec, ['1', 'S', '2', 'BACK']);
  same('left the list: the shelf is written and the party is not', [r.ended, w.disk.log, onDisk(w, 35), w.P.pack(1).some(q => q.item === 35)], [false, ['shelf'], 1, false]);
  w.P.powerOff();
  same('switched off: the suit is in the pack and on the shelf', [w.P.pack(1).some(q => q.item === 35), w.P.cash(1), w.P.marks(1).ac, onDisk(w, 35)], [true, 40000, 14, 1]);
  r = w.P.shop(QUARTZ.rec, ['1', 'B', 'K', '6', 'BACK', 'BACK']);
  same('bought back: two suits', [w.P.pack(1).filter(q => q.item === 35).length, w.P.cash(1), onDisk(w, 35)], [2, 10000, 0]);
  // a count of 255 stays when it goes up and drops when it goes down
  w = start(1); w.P.shop(QUARTZ.rec, ['1', 'S', '3', 'BACK', 'BACK']);
  same('a Canteen sold to a full shelf', [onDisk(w, 44), w.P.cash(1)], [255, 40005]);
  w = start(1); r = w.P.shop(QUARTZ.rec, ['1', 'B', '1', 'BACK', 'BACK']);
  same('an Ax bought from a full shelf', [onDisk(w, 1), w.P.cash(1), w.P.pack(1).some(q => q.item === 1)], [254, 39975, true]);
  // what a shop pays ignores the count; what it sells is full
  w = start(1); w.P.shop(QUARTZ.rec, ['1', 'S', '1', 'BACK', 'BACK']);
  same('a pistol with 3 rounds sells for half the price', w.P.cash(1), 40075);
  w = start(1); w.P.shop(QUARTZ.rec, ['1', 'B', '5', 'BACK', 'BACK']);
  same('a pistol comes loaded', w.P.pack(1).filter(q => q.item === 13).map(q => q.count), [3, 7]);
  same('Matches come as 40', [I[52].n, I[52].r[4]], ['Match', 40]);
  w = start(1); w.P.shop(QUARTZ.rec, ['1', 'S', '4', 'BACK', 'BACK']);
  same('a box with one match left sells for half the price', w.P.cash(1), 40000 + price(52) - (price(52) >> 1));
  // three quarters in Highpool
  const h = start(10); r = h.P.shop(HIGHPOOL.rec, ['1', 'S']);
  const offer = plain(r.screens[2]).split('\n').filter(l => /^\d[>_]/.test(l)).map(l => l.slice(2).trim().replace(/\s+/g, ' '));
  same('Highpool offers three quarters, and only for the kinds it deals in', offer, ['8 Canteen', '8 Match']);
  const h2 = start(10); h2.P.shop(HIGHPOOL.rec, ['1', 'S', '1', 'BACK', 'BACK']);
  same('Highpool pays three quarters for a Canteen', h2.P.cash(1), 40008);
  // a party of one is not asked who enters, and leaves without a save
  const solo = start(1, { size: 1 }); r = solo.P.shop(QUARTZ.rec, ['S', '2', 'BACK', 'BACK']);
  same('a party of one', [r.ended, solo.disk.log, /Who wants to enter/.test(r.screens.join(' '))], [true, ['shelf'], false]);
  says('The Emporium and Leroy\'s counter both name file 2');
  says('A shop buys only the kinds of item it sells.');
  says('at the full price of $30,000');
}

// ---- 06: the bags that roll ----
{
  const { F } = world(28, { seed: 7 }), L = part('map-28');
  const B = WLItems.bag(F, L.byName.get('loot_01'));
  same('the bag as the disk has it', B.stored.map(e => e.cash !== undefined ? 'cash' : e.kind !== undefined ? 'kind ' + e.kind + ' x' + e.count : 'item ' + e.item), ['item 19', 'kind 14 x135', 'cash']);
  const at = B.stored.findIndex(e => e.kind === 14), items = {}, counts = {};
  for (let k = 0; k < 2000; k++) { const e = B.open()[at]; items[e.item] = (items[e.item] || 0) + 1; counts[e.count] = (counts[e.count] || 0) + 1; }
  same('it rolls the five kinds of ammunition', Object.keys(items).map(Number), [30, 31, 32, 33, 34]);
  ok('each about one time in five', Object.values(items).every(v => v > 320 && v < 480), items);
  same('from 1 to 7 of them', Object.keys(counts).map(Number), [1, 2, 3, 4, 5, 6, 7]);
  const S = world(24, { seed: 5 }), B2 = WLItems.bag(S.F, part('map-24').byName.get('loot_02')), at2 = B2.stored.findIndex(e => e.kind === 14), c2 = {};
  for (let k = 0; k < 600; k++) { const e = B2.open()[at2]; c2[e.count] = 1; ok('the sewer bag rolls ammunition', e.item >= 30 && e.item <= 34); }
  same('the sewer bag: 1 to 10', Object.keys(c2).map(Number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  // money: each byte rolled from 1 to its value
  const cash = B.stored.find(e => e.cash !== undefined); let lo = 1e9, hi = 0;
  const within = (got, top) => top ? got >= 1 && got <= top : got === 0;
  for (let k = 0; k < 300; k++) { const e = B.open().find(x => x.cash !== undefined); ok('rolled money is marked', e.rolled); if (e.cash < lo) lo = e.cash; if (e.cash > hi) hi = e.cash; ok('each byte from 1 to its value', within(e.cash & 255, cash.cash & 255) && within(e.cash >> 8, cash.cash >> 8), e.cash, cash.cash); }
  ok('the money varies', hi > lo);
  // a bag whose money has a high byte: both bytes are rolled, so the least is 257
  let rich = null;
  for (const id of mapParts) { if (rich) break; const L2 = part(id); for (const [k, a] of numbered(L2, 'loot')) { const r = L2.ram; let i = a + 2; while (r[i] !== 0xFF && i < a + 90) { if (r[i] === 0x5E) { if (r[i + 2] >= 2 && !rich) rich = [+id.slice(4), a, r[i + 1], r[i + 2]]; i += 3; } else if (r[i] === 0xDE) i += 3; else i += 2; } } }
  ok('a bag with dollars in the hundreds', !!rich);
  if (rich) {
    const R = world(rich[0], { seed: 9 }), B3 = WLItems.bag(R.F, rich[1]); let least = 1e9, most = 0;
    for (let k = 0; k < 400; k++) { const e = B3.open().find(x => x.cash !== undefined); if (e.cash < least) least = e.cash; if (e.cash > most) most = e.cash; ok('both bytes rolled from 1', within(e.cash & 255, rich[2]) && within(e.cash >> 8, rich[3]), e.cash, rich); }
    ok('never under 257', least >= 257 && most <= (rich[3] << 8 | rich[2]), least, most);
  }
}

// ---- 08: rounds ----
{
  const w = world(1); w.P.give(1, [[13, 3], [30, 0], [44, 0]]); w.P.equip(1, 1);
  const r = w.P.itemsPage(1, ['2', 'Y', 'BACK']);
  ok('the game asks Reload', /Reload/.test(r.screens.join(' ')), r.screens);
  same('reloaded with 3 left: 7 rounds, the clip gone', w.P.pack(1).map(q => [q.item, q.count]), [[13, 7], [44, 0]]);
  same('M1911A1 holds 7 and loads 45 clips', [I[13].r[4], I[13].r[7]], [7, 30]);
  says('A Ranger who reloads with 6 left has spent a 45 clip to gain one round.');
  // the Flamethrower names no ammunition
  same('Flamethrower: no skill, no ammunition, 60 shots', [I[17].r[5], I[17].r[7], I[17].r[4]], [0, 0, 60]);
  ok('it is the one weapon of kinds 2 to 12 with no ammunition that holds more than one', I.filter(it => it.i < 94 && it.r[3] >> 3 >= 2 && it.r[3] >> 3 <= 12 && !it.r[7] && it.r[4] > 1).map(it => it.i).join() === '17');
  ok('and the one weapon with no skill', I.filter(it => it.i < 94 && it.r[3] >> 3 <= 13 && !it.r[5]).map(it => it.i).join() === '17');
}

// ---- 09: tools in the hand ----
{
  const melee = (item, seed) => {
    const w = world(31, { seed }), F = w.F;
    for (let i = 1; i <= 4; i++) { w.P.give(i, [[item, 0]]); w.P.equip(i, 1); w.m.fill(0, F.rec(i) + 0x80, F.rec(i) + 0xBC); F.setCon(i, 200); F.setMaxCon(i, 200); }
    const sq = F.encounterSquare(0); F.place(sq.x, sq.y + 1);
    let out = '';
    for (let k = 0; k < 4; k++) { const res = F.round(() => [[2, 0], [2, 0], [2, 0], [2, 0]]); out += res.text + '\n'; if (res.over) break; }
    return out;
  };
  let alike = 0, unlike = 0, idle = 0;
  for (let s = 1; s <= 8; s++) { const ax = melee(1, s), bar = melee(45, s), clip = melee(30, s), book = melee(43, s); if (ax === bar) alike++; if (ax !== clip) unlike++; if (clip === book) idle++; }
  same('with no skills a Crowbar fights as an Ax does, and a clip as a Book does', [alike, idle], [8, 8]);
  ok('and an Ax does more than a clip', unlike >= 6, unlike);
  const w = world(1); w.P.give(1, [[35, 0], [43, 0]]); w.P.equip(1, 2);
  same('a Book can be held', w.P.marks(1).weapon, 2);
}

console.log(bad ? 'FAIL: ' + bad + ' of ' + checks + ' checks differ' : 'ok: ' + checks + ' checks hold the Items tab to the game\'s code and listings');
process.exit(bad ? 1 : 0);
