#!/usr/bin/env node
// Hold spells.html to the game's own code, run on the kit's 6502 over the committed listings:
// - por-kinds: the block is the same on spells.html and bestiary.html, and every kind a monster file
//   in por-specials holds is named in it, but 255 and the PHASE SPIDER's 139, which no event lists.
// - por-drain: the drain widget runs SPELLE02's energy_drain ($A7A3) and drain_twice ($A9E4) with
//   every class part at levels 0 to 9, alone and in pairs, the class drained last 0 to 3, without
//   running into anything its stand-ins leave out; and the page's figures hold: a level-1 fighter on
//   a fresh file ends DEAD with magic-user level 255, 11,610,464 experience and to-hit 109, a level-1
//   magic-user GONE, and a drained magic-user of levels 2 to 5 or thief of 2 to 4 has to-hit 40.
// - the page's bugs, each run in its own routine: PRAYER ($A9B9) takes one off the rolls of the
//   caster's own side and adds one to the other's; PROTECTION FROM EVIL ($A794) helps against
//   alignments 2 and 5 and not 8; RESIST COLD ($A7D0) changes nothing when an event runs it;
//   Tyranithraxus's resistance ($AD81) is 60, 55, 50, 45, 40 and 184 for caster levels 1 to 6; the
//   mummy's fear loads its save byte with LDA $21 (A5 21); SLOW's record has a save byte of 0; the
//   combat's POTION OF GIANT STRENGTH ($AD17) leaves an 18/50 character at 18/50 and raises a 17 to 21;
//   kind 50's end in camp starts ten more days and heals a hit point, and no entry of camp_kinds
//   points at rot_charisma ($ADA4).
// It exits 1 on any difference.
//   node games/c64/pool-of-radiance/test_spells.js
const path = require('path'), fs = require('fs'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { CPU } = globalThis.C64Cpu;
let bad = 0, n = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const check = (ok, ...w) => { n++; if (!ok) fail(...w); };
const io = { read(a) { throw new Error('a chip read at ' + a.toString(16)); }, write() {} };
const rts = (c) => c.rts();
function memory(...parts) {
  const m = new Uint8Array(65536);
  for (const p of parts) { const L = g.listing('parts/' + p + '/listing.json'); for (let a = 0; a < 65536; a++) if (L.has[a]) m[a] = L.ram[a]; }
  return m;
}

// --- the kinds' names
g.sameBlock('por-kinds', 'spells.html', 'bestiary.html');
const { POR_KINDS } = g.run('spells.html', 'por-kinds', 'POR_KINDS');
const page = fs.readFileSync(path.join(__dirname, 'spells.html'), 'utf8');
const S = JSON.parse(page.match(/<script type="application\/json" id="por-specials">([\s\S]*?)<\/script>/)[1]);
check(S.length > 100, 'por-specials has', S.length, 'entries');
for (const e of S) for (const k of e.k) check(POR_KINDS[k] || k === 255 || (k === 139 && e.n === 'PHASE SPIDER'), e.n, 'holds kind', k, 'which has no name');
const ce = new Set(S.filter((e) => e.a === 8).map((e) => e.n));
for (const nm of ['VAMPIRE', 'TROLL', 'OGRE', 'GHOUL']) check(ce.has(nm), nm, 'is not chaotic evil in por-specials');

// --- the drain
{
  const { porDrainSet, porDrain, porDrainRead } = g.run('spells.html', 'por-drain', 'porDrainSet', 'porDrain', 'porDrainRead');
  const base = memory('resident', 'combat', 'effects-2');
  const drain = (levels, o = {}) => {
    const m = base.slice();
    porDrainSet(m, { levels, hp: o.hp ?? 30, wis: o.wis ?? 10, last: o.last ?? 0 });
    const said = porDrain(m, CPU, !!o.twice);
    return { said, ...porDrainRead(m) };
  };
  const tries = [];
  for (let p = 0; p < 4; p++) for (let l = 1; l <= 9; l++) { const v = [0, 0, 0, 0]; v[p] = l; tries.push(v); }
  for (let p = 0; p < 4; p++) for (let q = p + 1; q < 4; q++) for (const l of [1, 2, 5]) { const v = [0, 0, 0, 0]; v[p] = l; v[q] = l; tries.push(v); }
  for (const v of tries) for (let last = 0; last < 4; last++) for (const twice of [false, true]) {
    try { drain(v, { last, twice }); n++; } catch (e) { fail('drain', v.join('/'), 'last', last, twice ? 'twice' : 'once', e.message); }
  }
  const f1 = drain([0, 0, 0, 1], { hp: 10 });
  check(f1.levels.join() === '255,0,0,1' && f1.cond === 0x83 && f1.xp === 11610464 && f1.toHit === 109 && f1.hp === 0,
    'level-1 fighter', JSON.stringify(f1));
  const m1 = drain([1, 0, 0, 0], { hp: 4 });
  check(m1.levels.join() === '0,0,0,0' && m1.cond === 0x82, 'level-1 magic-user', JSON.stringify(m1));
  for (const [p, l] of [[0, 3], [0, 6], [2, 3], [2, 5]]) {
    const v = [0, 0, 0, 0]; v[p] = l;
    const r = drain(v);
    check(r.toHit === 40, ['magic-user', '', 'thief'][p], l, 'drained: to-hit', r.toHit);
  }
}

// --- the bugs on the page
{
  const E = memory('resident', 'combat', 'effects');
  // PRAYER: its effect in entry 0, the caster's side in bit 6 of the fourth byte
  for (const caster of [0, 1]) for (const roller of [0, 1]) {
    const m = E.slice();
    m[0x6E78] = 0; m[0x4B80] = caster << 6 | 5; m[0x6C0C] = roller; m[0x2AFE] = 10; m[0x2B10] = 10;
    new CPU(m, { port: 0x36, io }).call(0xA9B9, { a: 0 }, { maxSteps: 1e4 });
    const want = caster === roller ? 9 : 11;
    check(m[0x2AFE] === want && m[0x2B10] === want, 'PRAYER cast by side', caster, 'for side', roller, 'save', m[0x2AFE], 'd20', m[0x2B10]);
  }
  // PROTECTION FROM EVIL: the attacker's alignment comes in at load_current ($12E6)
  for (let al = 0; al <= 8; al++) {
    const m = E.slice();
    m[0x6C0F] = 50; m[0x6C10] = 50; m[0x2AFE] = 10;
    const hooks = { 0x12E6: (c) => { m[0x6BD8] = al; c.rts(); }, 0x2744: rts };
    new CPU(m, { port: 0x36, io }).call(0xA794, { a: 0 }, { hooks, maxSteps: 1e4 });
    const helped = m[0x6C0F] === 52 && m[0x6C10] === 52 && m[0x2AFE] === 12;
    check(helped === (al === 2 || al === 5), 'PROTECTION FROM EVIL against alignment', al, helped ? 'helps' : 'does not help');
  }
  // RESIST COLD, run by an event as run_effect runs it: LDA $2B23 (0 from run_effects), JSR
  {
    const m = E.slice();
    m[0xA4F7] = 20; m[0x2AFE] = 10; m[0x2B23] = 0;
    m.set([0xAD, 0x23, 0x2B, 0x20, 0xD0, 0xA7, 0x60], 0xCF00);
    new CPU(m, { port: 0x36, io }).call(0xCF00, {}, { maxSteps: 1e4 });
    check(m[0xA4F7] === 20 && m[0x2AFE] === 10, 'RESIST COLD changed damage', m[0xA4F7], 'save', m[0x2AFE]);
  }
  // Tyranithraxus's magic resistance by caster level, read at chance ($A734)
  const got = [];
  for (let lv = 1; lv <= 6; lv++) {
    const m = E.slice();
    m[0x2B05] = lv; m[0x2AFD] = 0x34;
    const hooks = { 0xA734: (c) => { got.push(c.a); c.p |= 1; c.rts(); } };
    new CPU(m, { port: 0x36, io }).call(0xAD81, {}, { hooks, maxSteps: 1e4 });
  }
  check(got.join() === '60,55,50,45,40,184', 'Tyranithraxus resists', got.join());
}
{
  const E2 = memory('effects-2');
  check(E2[0xA75E] === 0xA5 && E2[0xA75F] === 0x21, 'mummy_fear at $A75E', E2[0xA75E].toString(16), E2[0xA75F].toString(16));
  const CS = g.listing('parts/combat-set/listing.json');
  const slow = CS.sym('spell_records_copy') + 9 * (55 - 1);
  check(CS.ram[slow + 7] === 0xEF && CS.ram[slow + 8] === 0xAC && CS.ram[slow + 4] === 0, 'SLOW record', [...CS.ram.slice(slow, slow + 9)].join(' '));
}
// the combat's POTION OF GIANT STRENGTH (item power 59)
{
  const M = memory('resident', 'combat', 'spells');
  for (const [st, pc, want] of [[18, 50, '18/50'], [17, 0, '21/0'], [18, 0, '18/0']]) {
    const m = M.slice();
    m[0x6B14] = st; m[0x6B1A] = pc; m[0x2B05] = 6;
    const hooks = { 0x273A: rts, 0x9A53: (c) => { c.p |= 1; c.rts(); }, 0x3729: rts, 0x441E: rts, 0x29F7: rts, 0x3ED2: rts };
    new CPU(m, { port: 0x36, io }).call(0xAD17, {}, { hooks, maxSteps: 1e5 });
    check(m[0x6B14] + '/' + m[0x6B1A] === want, 'giant strength from', st + '/' + pc, 'gives', m[0x6B14] + '/' + m[0x6B1A]);
  }
}
// mummy rot in camp
{
  const C = memory('resident', 'camp', 'camp-spells');
  const camp = g.listing('parts/camp-spells/listing.json');
  const lo = camp.sym('camp_kind_lo'), hi = camp.sym('camp_kind_hi'), rot = camp.sym('rot_charisma');
  let points = 0;
  for (let k = 0; C[0x9AD5 + k]; k++) if ((C[lo + k] | C[hi + k] << 8) === rot) points++;
  check(points === 0, 'entries of camp_kinds pointing at rot_charisma:', points);
  const m = C.slice();
  m[0x4900] = 50; m[0x4940] = 0; m[0x4980] = 0; m[0x4B80] = 0xFF;
  m[0x6C19] = 7; m[0x6B76] = 9; m[0x6DB4] = 0; m[0x287B] = 0;
  const said = [];
  const hooks = {};
  for (const a of [0x0F27, 0x0F4E, 0x0F57, 0x0F8E, 0x0F96, 0x0FAC, 0x1FE6, 0x1FFD, 0x137E, 0x133F, 0x2F29, 0x34C3, 0x11DC, 0x441E, 0x4415, 0x3189, 0x315A, 0x319A]) hooks[a] = rts;
  hooks[0x0F27] = (c) => { said.push(m[0x2864]); c.rts(); };
  new CPU(m, { port: 0x36, io }).call(0x131F, { x: 0 }, { hooks, maxSteps: 1e5 });
  const held = [];
  for (let x = 0; x < 64; x++) if (m[0x4900 + x]) held.push(m[0x4900 + x] + '@' + m[0x4980 + x].toString(16));
  check(held.join() === '50@ca' && m[0x6C19] === 8, 'kind 50 at its end: effects', held.join(), 'hit points', m[0x6C19]);
}
console.log(bad ? `${bad} difference(s) in ${n} checks` : `spells.html: ${n} checks agree with the game's code`);
process.exit(bad ? 1 : 0);
