#!/usr/bin/env node
// Hold spells.html's temple to the game's own code, run on the kit's 6502 over the committed listings
// (the resident, tables, post-com and temple parts):
// - porTempleMenu: eleven cures and EXIT; the prices the page states; items 5 and 9 named @, hidden by
//   the mask post-com's heal ($209C) passes to build_menu, and routed to survival ($06D2); the rest
//   shown and routed to the routine of their own name.
// - survival ($06D2): 0 for constitution 0 to 6, then 60, 65 ... 90, 92 ... 100 for 7 to 18, 100 above.
// - CURE BLINDNESS and CURE DISEASE: paid for by a member with nothing wrong; paid for, and the effect
//   kept, by a member holding CAUSE BLINDNESS's kind 33 or CAUSE DISEASE's kind 34; not paid for when
//   the 64 timed effects are all in use, which shows the count comes from an empty entry. CURE DISEASE
//   ends mummy rot (kinds 50 and 57 and IS DISEASED).
// - The wound cures: 1 to 8, 2 to 16 and 3 to 24 over many rolls, and every figure in each range met;
//   a dying member turned away and charged nothing.
// - RAISE DEAD: paid for, then FAILED and GONE every time at constitution 6; raised every time at 18,
//   one constitution lower, OK and 1 hit point; an elf and a half-orc turned away unpaid; near 75 in
//   100 raised at constitution 10.
// - REMOVE CURSE: a readied cursed item unreadied and still cursed. STONE TO FLESH: a stoned member OK.
//   NEUTRALIZE POISON: a slowed poison (condition 9) ended, the member OK.
// - The page's text states the prices of the two hidden items and the wound cures' ranges.
// It exits 1 on any difference.
//   node games/c64/pool-of-radiance/test_temple.js
const path = require('path'), fs = require('fs'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = globalThis.C64Cpu;
let bad = 0, n = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const check = (ok, ...w) => { n++; if (!ok) fail(...w); };

const L = {};
const base = new Uint8Array(65536);
for (const p of ['resident', 'tables', 'post-com', 'temple']) {
  L[p] = g.listing(`parts/${p}/listing.json`);
  for (let a = 0; a < 65536; a++) if (L[p].has[a]) base[a] = L[p].ram[a];
}
const { porTempleMenu, porTempleSet, porTemple, porTempleRead } = g.run('spells.html', 'por-temple', 'porTempleMenu', 'porTempleSet', 'porTemple', 'porTempleRead');
const T = (s) => L.temple.sym(s);
const page = fs.readFileSync(path.join(__dirname, 'spells.html'), 'utf8');
const section = (id) => page.match(new RegExp('<section id="' + id + '"[\\s\\S]*?</section>'))[0];

// --- the menu
const M = porTempleMenu(base);
const NAMES = ['CURE BLINDNESS', 'CURE DISEASE', 'CURE LIGHT WOUNDS', 'CURE SERIOUS WOUNDS', 'CURE CRITICAL WOUNDS', '@',
  'NEUTRALIZE POISON', 'RAISE DEAD', 'REMOVE CURSE', '@', 'STONE TO FLESH'];
const PRICES = [1000, 1000, 100, 350, 600, 5000, 1000, 5500, 3500, 20000, 2000];
const ROUTINES = ['cure_blindness', 'cure_disease', 'cure_light', 'cure_serious', 'cure_critical', 'survival',
  'neutralize_poison', 'raise_dead', 'remove_curse', 'survival', 'stone_to_flesh'];
check(M.length === 11 && base[T('menu_text')] === 12, 'the menu has', M.length, 'cures');
M.forEach((it, i) => {
  check(it.name === NAMES[i], 'item', i, 'is', it.name);
  check(it.price === PRICES[i], 'item', i, 'costs', it.price);
  check(it.at === T(ROUTINES[i]), 'item', i, 'runs', it.at.toString(16));
  check(it.shown === (i !== 5 && i !== 9), 'item', i, it.shown ? 'shown' : 'hidden');
});
// the mask is the two LDA #s heal passes: LDA #$FD, STA $48F9, LDA #$DF
const heal = L['post-com'].sym('heal');
check([0xA9, 0xFD, 0x8D, 0xF9, 0x48, 0xA9, 0xDF].every((b, i) => base[heal + 0x22 + i] === b), 'heal does not pass the mask $FDDF at', (heal + 0x22).toString(16));
const hidden = section('temple-hidden');
check(hidden.includes('5,000') && hidden.includes('20,000') && hidden.includes('FDDF'), 'the hidden cures\' section does not state their prices and mask');

// --- the chances
const SURV = [0, 0, 0, 0, 0, 0, 0, 60, 65, 70, 75, 80, 85, 90, 92, 94, 96, 98, 100, 100, 100, 100, 100, 100, 100, 100];
SURV.forEach((v, c) => check(base[T('survival') + c] === v, 'survival at constitution', c, 'is', base[T('survival') + c]));

// --- running the cures
const fresh = (ch) => { const m = base.slice(); porTempleSet(m, CPU, Object.assign({ cond: 1, hp: 255, con: 12, race: 7, level: 4, rolls: 28 }, ch)); return m; };
const cure = (m, item) => { const r = porTemple(m, CPU, item); return Object.assign(r, porTempleRead(m)); };

for (const item of [0, 1]) {
  const r = cure(fresh({}), item);
  check(r.paid && r.said.join() === '50', NAMES[item], 'on a member with nothing wrong:', r.paid ? 'paid' : 'unpaid', r.said);
}
{
  const r = cure(fresh({ timed: [33] }), 0);
  check(r.paid && r.timed.includes(33), 'CURE BLINDNESS on kind 33:', r.paid ? 'paid' : 'unpaid', 'left', r.timed);
  const d = cure(fresh({ timed: [34] }), 1);
  check(d.paid && d.timed.includes(34), 'CURE DISEASE on kind 34:', d.paid ? 'paid' : 'unpaid', 'left', d.timed);
  const rot = cure(fresh({ cond: 0x21, timed: [50, 57] }), 1);
  check(rot.paid && rot.timed.length === 0 && rot.cond === 1, 'CURE DISEASE on mummy rot left', rot.timed, 'condition', rot.cond);
  // all 64 entries in use: no empty entry to count, so nothing is paid
  const full = fresh({});
  for (let i = 0; i < 64; i++) { full[0x4900 + i] = 60; full[0x4940 + i] = 5; }
  const f = cure(full, 0);
  check(!f.paid && f.said.join() === '14', 'CURE BLINDNESS with the table full:', f.paid ? 'paid' : 'unpaid', f.said);
  // the first routine replaces the kind with 0 before it searches
  check(base[T('end_first_kind')] === 0xA9 && base[T('end_first_kind') + 1] === 0x00, 'end_first_kind does not start LDA #$00');
}
for (const [item, lo, hi] of [[2, 1, 8], [3, 2, 16], [4, 3, 24]]) {
  const seen = new Set();
  const m = fresh({ cond: 5, hp: 0, rolls: 200, con: 10 });
  for (let k = 0; k < 3000; k++) {
    m[0x6C00] = 5; m[0x6C19] = 0;
    const r = cure(m, item);
    if (!r.paid || r.cond !== 1) { fail(NAMES[item], 'on an unconscious member:', r.said, 'condition', r.cond); break; }
    seen.add(r.hp);
  }
  n++;
  const got = [...seen].sort((a, b) => a - b);
  if (got[0] !== lo || got[got.length - 1] !== hi || got.length !== hi - lo + 1) fail(NAMES[item], 'heals', got.join(','), 'not', lo, 'to', hi);
}
{
  const r = cure(fresh({ cond: 4, hp: 0 }), 2);
  check(!r.paid && r.said.join() === '14' && r.cond === 4, 'CURE LIGHT WOUNDS on a dying member:', r.said, r.cond);
  const cures = section('temple-cures');
  check(cures.includes('2 to 16') && cures.includes('3 to 24'), 'the page does not give 2 to 16 and 3 to 24');
}
{
  const m = fresh({ cond: 0x83, hp: 0, con: 6 });
  let ok = true;
  for (let k = 0; k < 200 && ok; k++) {
    m[0x6C00] = 0x83; m[0x6B18] = 6;
    const r = cure(m, 7);
    ok = r.paid && r.said.join() === '50,31' && r.cond === 0x82;
    if (!ok) fail('RAISE DEAD at constitution 6:', r.said, 'condition', r.cond);
  }
  n++;
  const m2 = fresh({ cond: 0x83, hp: 0, con: 18 });
  for (let k = 0; k < 200; k++) {
    m2[0x6C00] = 0x83; m2[0x6B18] = 18;
    const r = cure(m2, 7);
    if (!(r.paid && r.said.join() === '50,28' && r.cond === 1 && r.hp === 1 && r.con === 17)) { fail('RAISE DEAD at constitution 18:', r.said, r.cond, r.hp, r.con); break; }
  }
  n++;
  for (const race of [0, 2, 6]) {
    const r = cure(fresh({ cond: 0x83, hp: 0, con: 18, race }), 7);
    check(!r.paid && r.said.join() === '14' && r.cond === 0x83, 'RAISE DEAD for race', race, r.said, r.cond);
  }
  let up = 0;
  const m3 = fresh({ cond: 0x83, hp: 0, con: 10 });
  for (let k = 0; k < 4000; k++) { m3[0x6C00] = 0x83; m3[0x6B18] = 10; if (cure(m3, 7).cond === 1) up++; }
  check(up > 2850 && up < 3150, 'RAISE DEAD at constitution 10 raised', up, 'of 4000');
}
{
  const r = cure(fresh({ cursed: true }), 8);
  check(r.paid && r.item && !r.item.readied && r.item.cursed, 'REMOVE CURSE left the item', r.item);
  const s = cure(fresh({ cond: 7 }), 10);
  check(s.paid && s.cond === 1, 'STONE TO FLESH left condition', s.cond);
  const p = cure(fresh({ cond: 9, hp: 1, kinds: [55], timed: [22, 15] }), 6);
  check(p.paid && p.cond === 1 && !p.kinds.includes(55) && p.timed.length === 0, 'NEUTRALIZE POISON left', p.cond, p.kinds, p.timed);
}

console.log(bad ? `test_temple: ${bad} of ${n} checks differ` : `test_temple: ${n} checks hold`);
process.exit(bad ? 1 : 0);
