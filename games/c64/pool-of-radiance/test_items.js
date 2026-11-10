#!/usr/bin/env node
// Hold items.html to the game's own code and files, run on the kit's 6502 over the committed listings:
// - por-items, the page's data (scripts/items_data.py): its 128 item types and 256 name words are the
//   tables part's ($7B00, words by $6F00/$7000), and its random table is post-com's (item_chance $1F7C
//   and the five tables after it).
// - por-ready, the sheet: compute_combat_stats ($3729), max_load ($472E) and can_strike ($1648) run
//   on PENDRAGON with every item the page lists, without running into anything they leave out; and
//   the page's findings hold: the trolls' RING OF PROTECTION +2 (type 69) leaves the armour class as
//   it was where a type-93 one takes 2 off; BRACERS AC2 give the armour class of BRACERS AC4, worse
//   than AC3's; the LEVEL 6 MU's CLOAK OF DISPLACEMENT (type 67) adds nothing where Mendor's (type 92)
//   adds its plus; 26 HUGE TAPESTRIES weigh 832 and 6 LEATHER HOLY SYMBOLS 0; the FINE COMPOSITE LONG
//   BOW (type 45) adds strength's +1 damage where a COMPOSITE LONG BOW adds none, and can shoot
//   arrows and not quarrels, where the LIGHT CROSSBOW shoots quarrels.
// - the camp's use_scroll_word ($1ED9) leaves a scroll whose middle word is WITH 2 SPELLS ($D3) and
//   takes away one whose word is OF ($A7); kind_item_aligned ($AE94) takes off each aligned sword for
//   every alignment but its own and deals it 15 or 5; random_base ($1E98) over every roll from 1 to
//   188 never makes the cloak (type 67) and makes the clerical scroll on 184 to 188 alone.
// It exits 1 on any difference.
//   node games/c64/pool-of-radiance/test_items.js
const path = require('path'), fs = require('fs'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = globalThis.C64Cpu;
let bad = 0, n = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const check = (ok, ...w) => { n++; if (!ok) fail(...w); };
const io = { read(a) { throw new Error('a chip read at ' + a.toString(16)); }, write() {} };
function memory(...parts) {
  const m = new Uint8Array(65536);
  for (const p of parts) { const L = g.listing('parts/' + p + '/listing.json'); for (let a = 0; a < 65536; a++) if (L.has[a]) m[a] = L.ram[a]; }
  return m;
}
const page = fs.readFileSync(path.join(__dirname, 'items.html'), 'utf8');
const D = JSON.parse(page.match(/<script type="application\/json" id="por-items">([\s\S]*?)<\/script>/)[1]);
const bytes = (h) => h.match(/../g).map((x) => parseInt(x, 16));
const W = D.w, nameOf = (b) => [b[3], b[2], b[1]].filter(Boolean).map((w) => W[w]).join(' ');

// --- the data against the listings
{
  const T = memory('tables'), P = memory('post-com');
  for (let t = 0; t < 128; t++) check(D.t[t] === Buffer.from(T.slice(0x7B00 + 16 * t, 0x7B10 + 16 * t)).toString('hex'), 'type', t);
  for (let w = 1; w < 256; w++) {
    let a = T[0x6F00 + w] | T[0x7000 + w] << 8, s = '';
    while (T[a]) s += String.fromCharCode(T[a++]);
    check(W[w] === s, 'word', w, W[w], s);
  }
  for (const [k, a] of [['chance', 0x1F7C], ['type', 0x1FA0], ['n3', 0x1FC4], ['n2', 0x1FE8]])
    for (let i = 0; i < 36; i++) check(D.rand[k][i] === P[a + i], 'random table', k, i);
  check(D.pen.length === 580 * 2, 'PENDRAGON is', D.pen.length / 2, 'bytes');
}

// --- the sheet
const { porReady } = g.run('items.html', 'por-ready', 'porReady');
const base = memory('resident', 'tables', 'combat');
const pen = Uint8Array.from(bytes(D.pen));
const sheet = (items) => porReady(base.slice(), CPU, pen, items.map((b) => Uint8Array.from(b)));
const all = [];
for (const s of D.sets) for (const h of s.i) all.push([bytes(h), 'list ' + s.n + ' side ' + s.s]);
for (const m of D.mon) all.push([bytes(m.i), m.who.join(', ')]);
const find = (re, pred = () => true) => { const x = all.find(([b]) => re.test(nameOf(b)) && pred(b)); if (!x) throw new Error('no item ' + re); return x[0].slice(); };
const ready = (b) => { b = b.slice(); b[6] |= 0x80; return b; };
for (const [b, where] of all) {
  try { sheet([ready(b)]); sheet([b]); n++; } catch (e) { fail(nameOf(b), 'from', where, e.message); }
}
const bare = sheet([]);
check(bare.ac === 7 && bare.thac0 === 19 && bare.weight === 80, 'bare PENDRAGON', JSON.stringify(bare));
const ac = (b) => sheet([ready(b)]).ac;
check(ac(find(/^RING OF PROTECTION \+2$/, (b) => b[0] === 69)) === bare.ac, "trolls' ring changes the armour class");
check(ac(find(/^RING OF PROTECTION \+2$/, (b) => b[0] === 93)) === bare.ac - 2, 'a type-93 ring does not take 2 off');
const br = { 2: ac(find(/AC2$/)), 3: ac(find(/AC3$/)), 4: ac(find(/AC4$/)) };
check(br[2] === br[4] && br[3] === br[4] - 1, 'bracers', JSON.stringify(br));
check(ac(find(/^CLOAK OF DISPLACEMENT$/, (b) => b[0] === 67)) === bare.ac, 'the type-67 cloak changes the armour class');
check(ac(find(/^CLOAK OF DISPLACEMENT$/, (b) => b[0] === 92)) === bare.ac - 2, 'the type-92 cloak does not take its plus off');
const w = (re) => sheet([find(re)]).weight - bare.weight;
check(w(/^HUGE TAPESTRY$/) === 832, 'HUGE TAPESTRY ×26 weighs', w(/^HUGE TAPESTRY$/));
check(w(/^LEATHER HOLY SYMBOL$/) === 0, 'LEATHER HOLY SYMBOL ×6 weighs', w(/^LEATHER HOLY SYMBOL$/));
const arrows = ready(find(/^ARROW\(S\)$/)), quarrels = ready(find(/^QUARREL\(S\)$/));
const comp = sheet([ready(find(/^COMPOSITE LONG BOW$/)), arrows]);
const fine = sheet([ready(find(/^FINE COMPOSITE LONG BOW$/)), arrows]);
check(comp.bonus === 0 && fine.bonus === 1 && comp.strikes && fine.strikes, 'bows with arrows', JSON.stringify(comp), JSON.stringify(fine));
check(!sheet([ready(find(/^FINE COMPOSITE LONG BOW$/)), quarrels]).strikes, 'the FINE COMPOSITE LONG BOW shoots quarrels');
check(!sheet([ready(find(/^HEAVY CROSSBOW$/)), quarrels]).strikes, 'the HEAVY CROSSBOW shoots quarrels');
check(sheet([ready(find(/^LIGHT CROSSBOW$/)), quarrels]).strikes, 'the LIGHT CROSSBOW does not shoot quarrels');

// --- scrolls in camp
{
  const C = memory('resident', 'camp');
  for (const [word, gone] of [[0xD4, false], [0xD3, false], [0xD2, true], [0xA7, true]]) {
    const m = C.slice();
    m[0x6D7C] = 0x3E; m[0x6D7E] = word;
    new CPU(m, { port: 0x36, io }).call(0x1ED9, {}, { maxSteps: 100 });
    check((m[0x6D7C] === 0) === gone, 'use_scroll_word on word', word.toString(16), 'leaves type', m[0x6D7C]);
  }
}
// --- the aligned swords
{
  const E = memory('resident', 'combat', 'effects');
  const swords = all.filter(([b]) => b[15] === 0x84);
  check(swords.length === 3, 'items with kind 132:', swords.length);
  for (const [b] of swords) for (let al = 0; al <= 8; al++) {
    const m = E.slice();
    m.set(ready(b), 0x6D7C); m[0x6BD8] = al;
    let dmg = null;
    const hooks = { 0xABF1: (c) => { dmg = m[0x2B00]; c.rts(); } };
    for (const r of ['store_item', 'window_main', 'clear_window']) { const a = g.listing('parts/resident/listing.json').sym(r) ?? g.listing('parts/combat/listing.json').sym(r); if (a != null) hooks[a] = (c) => c.rts(); }
    new CPU(m, { port: 0x36, io }).call(0xAE94, { a: 0 }, { hooks, maxSteps: 1e4 });
    const own = al === (b[14] & 15);
    check(own ? dmg === null && m[0x6D82] & 0x80 : dmg === b[14] >> 4 && !(m[0x6D82] & 0x80), nameOf(b), 'alignment', al, 'damage', dmg, 'flags', m[0x6D82].toString(16));
  }
}
// --- the random table
{
  const P = memory('resident', 'post-com');
  const got = [];
  for (let roll = 1; roll <= 188; roll++) {
    const m = P.slice();
    const hooks = { 0x2DE0: (c) => { c.a = roll; c.x = roll; c.rts(); } };
    new CPU(m, { port: 0x36, io }).call(0x1E98, {}, { hooks, maxSteps: 1e4 });
    got.push(m[0x6D7C]);
  }
  check(!got.includes(67), 'the cloak is made');
  check(got.map((t, i) => t === 62 ? i + 1 : 0).filter(Boolean).join() === '184,185,186,187,188', 'clerical scroll on', got.map((t, i) => t === 62 ? i + 1 : 0).filter(Boolean).join());
}
console.log(bad ? `${bad} difference(s) in ${n} checks` : `items.html: ${n} checks agree with the game's code`);
process.exit(bad ? 1 : 0);
