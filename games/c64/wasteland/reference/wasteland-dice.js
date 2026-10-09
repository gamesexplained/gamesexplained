/* dice/dice.js */
// Wasteland (C64): the dice. Every skill check, attribute check and party member's shot in the game
// is settled by the routines ported here, from the engine part (parts/engine) and the game part
// (parts/game). Each port names the routine it follows. The page draws its tables from the bytes
// the Source tab shows: C64.load() rebuilds the engine's and the game's 64 KB images from their
// listing.json files (../../lib/c64.js). Nothing is embedded but the layout of this widget.
// Tested against the game's own code on the kit's 6502 simulator by test_dice.js (work/ only).
(function () {
  'use strict';

  // ---------------------------------------------------------------------------------------------
  // Addresses read from the two listings
  const A = {
    // engine part
    skillAttr: 0x0DD8,      // skill_attribute_table: the record offset added to each skill's roll, skills 0-35
    rangedClasses: 0x08E8,  // ranged_classes: item classes class_is_ranged ($08D0) counts as guns, ended by $FF
    distance: 0x0921,       // distance_table: 5 rows of 10, feet from the party to a square dx, dy away
    attrLabels: 0x1152,     // attribute_labels: "ST =", " IQ =", ... as print_attributes prints them
    engineText: 0x29E4,     // the engine's packed text block: skill n = message n, item n = message 36 + n
    // game part
    items: 0x3108,          // the item table: 95 records of 8 bytes
    rangeStart: 0xBD94,     // range_table_start: -5, 8, 19 for range kinds 0-2
    rangeStep: 0xBD97,      // range_table_step: 5, 2, 1
    autoThresholds: 0xB4F8, // auto_fire_thresholds: FF 09 07 05 03 00 00 00
  };

  // ---------------------------------------------------------------------------------------------
  // The random numbers (engine)

  // random_byte $24E3 (engine): INC seed; LDA $D012; ADC $DC04; ADC #seed; STA seed. The raster
  // line and the low byte of CIA 1's timer A are added to the seed (incremented first) with the
  // carry the caller left. Returns the byte, the new seed and the carry out.
  function randomByte(seed, raster, timer, carry) {
    const s1 = (seed + 1) & 0xFF;
    let t = raster + timer + (carry ? 1 : 0);
    const c1 = t > 0xFF ? 1 : 0; t &= 0xFF;
    let u = t + s1 + c1;
    const c2 = u > 0xFF ? 1 : 0; u &= 0xFF;
    return { a: u, seed: u, carry: c2 };
  }

  // A source of random bytes: next() stands in for one call of random_byte. In the browser there is
  // no raster line or timer to read, so the page draws them: a line of the 312 a PAL frame has and a
  // timer byte, both even, through the routine's own arithmetic. The tests give a fixed sequence.
  function browserSource(seed) {
    const buf = new Uint32Array(1);
    const draw = n => {
      if (globalThis.crypto && globalThis.crypto.getRandomValues) { globalThis.crypto.getRandomValues(buf); return buf[0] % n; }
      return Math.floor(Math.random() * n);
    };
    const src = { seed: seed === undefined ? draw(256) : seed, count: 0, log: [] };
    src.next = () => {
      const r = randomByte(src.seed, draw(312) & 0xFF, draw(256), 0);
      src.seed = r.seed; src.count++;
      return r.a;
    };
    return src;
  }
  function sequenceSource(bytes) {
    let i = 0;
    const src = { count: 0 };
    src.next = () => { if (i >= bytes.length) throw new Error('random sequence ran out'); src.count++; return bytes[i++] & 0xFF; };
    return src;
  }

  // random_1_to_a $24C4 (engine): a random number from 1 to A. A = 0 gives 0 without a draw;
  // otherwise random bytes are drawn until one is below A, and 1 is added.
  function random1ToA(src, a) {
    a &= 0xFF;
    if (a === 0) return 0;
    let b;
    do { b = src.next(); } while (b >= a);
    return b + 1;
  }

  // roll_d6 $24D6 (engine): a random byte AND 7, drawn again on 6 or 7, plus 1.
  function rollD6(src) {
    let v;
    do { v = src.next() & 7; } while (v >= 6);
    return v + 1;
  }

  // roll_2d6_open $0845 (engine): two dice added to a running total; while they match, another pair
  // is rolled and added. The total is one byte and nothing checks it for wrapping.
  function roll2d6Open(src) {
    let total = 0;
    const pairs = [];
    for (;;) {
      const d1 = rollD6(src), d2 = rollD6(src);
      total = (total + d1 + d2) & 0xFF;
      pairs.push([d1, d2]);
      if (d2 !== d1) return { total, pairs };
    }
  }

  // roll_d6s_plus $BDC4 (game): A plus X dice, 16 bits, held at $FFFF.
  function rollD6sPlus(src, a, x, dice) {
    let lo = a & 0xFF, hi = 0;
    for (let i = 0; i < (x & 0xFF); i++) {
      const d = rollD6(src);
      if (dice) dice.push(d);
      const s = lo + d;
      lo = s & 0xFF;
      if (s > 0xFF && ++hi > 0xFF) { hi = 0xFF; lo = 0xFF; }
    }
    return lo | (hi << 8);
  }

  // ---------------------------------------------------------------------------------------------
  // The checks (engine). A character is its 256-byte record (record n at $F400 + 256n in play):
  // +$0E-+$14 ST IQ LK SP AGL DEX CHR, +$18 sex, +$1D/+$1E CON, +$1F the weapon's slot, +$21-+$23
  // experience, +$24 rank, +$80-+$BB thirty skill pairs (number, level), +$BD-+$F8 thirty item pairs
  // (item, count byte: bit 7 jammed, bits 0-5 rounds).

  // target_15_plus_5x $0867 (engine): the target of a check at difficulty X.
  const target15Plus5x = x => 15 + 5 * (x & 0xFF);

  // num1_add_clamped $079D (engine): adds the signed 16-bit X:A to $6F/$70, held within 0-$FFFF.
  function addClamped(acc, lo, hi) {
    const s = acc + ((lo & 0xFF) | ((hi & 0xFF) << 8));
    if (hi & 0x80) return s > 0xFFFF ? s & 0xFFFF : 0;
    return s > 0xFFFF ? 0xFFFF : s;
  }

  // add_experience $0825 (engine): +$21-+$23 += n, held at $FFFFFF.
  function addExperience(rec, n) {
    let e = rec[0x21] | (rec[0x22] << 8) | (rec[0x23] << 16);
    e += n;
    if (e > 0xFFFFFF) e = 0xFFFFFF;
    rec[0x21] = e & 0xFF; rec[0x22] = (e >> 8) & 0xFF; rec[0x23] = (e >> 16) & 0xFF;
  }

  // skill_level $1392 (engine): the level of skill A among the thirty pairs, 0 when absent; y is the
  // offset of the level byte.
  function skillLevel(rec, skill) {
    for (let y = 0x80; y < 0xBC; y += 2) if (rec[y] === (skill & 0xFF)) return { level: rec[y + 1], y: y + 1 };
    return { level: 0, y: null };
  }

  // skill_roll_total $0C6A (engine): the open 2d6; under 5 fails at once. Otherwise the total is the
  // roll + the attribute skill_attribute_table names (none for 0) + 4 x the level.
  function skillRollTotal(D, rec, skill, src) {
    const roll = roll2d6Open(src);
    if (roll.total < 5) return { autoFail: true, roll, total: 0 };
    let acc = addClamped(0, roll.total, 0);
    const off = D.E[(A.skillAttr + (skill & 0xFF)) & 0xFFFF];
    if (off !== 0) acc = addClamped(acc, rec[off], 0);
    const level = skillLevel(rec, skill).level;
    acc = addClamped(acc, (level * 4) & 0xFF, level >> 6);
    return { autoFail: false, roll, total: acc, attrOffset: off, attr: off ? rec[off] : 0, level };
  }

  // skill_check $0C29 (engine), entry $0207: skill A at difficulty X. The roll goes to experience
  // whenever it is 5 or more; a pass may raise the skill (skill_improve_roll).
  function skillCheck(D, rec, skill, diff, src) {
    const target = target15Plus5x(diff);
    const r = skillRollTotal(D, rec, skill, src);
    const out = Object.assign({ kind: 'skill', skill, diff, target, pass: false, learn: null }, r);
    if (r.autoFail) return out;
    addExperience(rec, r.roll.total);
    out.pass = r.total >= target;
    if (out.pass) out.learn = skillImproveRoll(D, rec, skill, diff, src);
    return out;
  }

  // skill_improve_roll $0CA2 (engine), entry $020F: learning by use. Only a skill already at level 1
  // or more, below the rank (+$24) and below the difficulty; then a d10 at or under
  // (difficulty - level) / 2 + 1 raises it one level (not past 255).
  function skillImproveRoll(D, rec, skill, diff, src) {
    const level = skillLevel(rec, skill).level;
    if (level === 0) return { tried: false, why: 'level 0' };
    if (level >= rec[0x24]) return { tried: false, why: 'rank' };
    if (level >= (diff & 0xFF)) return { tried: false, why: 'difficulty' };
    const threshold = ((((diff & 0xFF) - level) & 0xFF) >> 1) + 1;
    const d10 = random1ToA(src, 10);
    const res = { tried: true, d10, threshold, raised: false, level };
    if (d10 <= threshold) {
      const y = skillLevel(rec, skill).y;
      if (rec[y] + 1 <= 0xFF) { rec[y] = rec[y] + 1; res.raised = true; }
      res.newLevel = rec[y];
    }
    return res;
  }

  // attribute_check $0D0A (engine), entry $0212: the record byte at offset Y against difficulty A.
  // Offset $18 (sex) passes when the byte equals A, $24 (rank) when it is at least A; any other
  // offset is 15 + 5A against the open 2d6 (under 5 fails) + the byte, the roll going to experience.
  function attributeCheck(D, rec, off, diff, src) {
    off &= 0xFF; diff &= 0xFF;
    if (off === 0x18) return { kind: 'attribute', special: 'sex', pass: rec[off] === diff };
    if (off === 0x24) return { kind: 'attribute', special: 'rank', pass: rec[off] >= diff };
    const target = target15Plus5x(diff);
    const roll = roll2d6Open(src);
    const out = { kind: 'attribute', off, diff, target, roll, attr: rec[off], pass: false, autoFail: false, total: 0 };
    if (roll.total < 5) { out.autoFail = true; return out; }
    addExperience(rec, roll.total);
    let acc = addClamped(0, roll.total, 0);
    acc = addClamped(acc, rec[off], 0);
    out.total = acc;
    out.pass = acc >= target;
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // Weapons (engine helpers, then the game's combat routines)

  // class_is_ranged $08D0 (engine): classes in the list at $08E8 (2 to 13).
  function isRanged(D, cls) { return D.ranged.has(cls & 0xFF); }
  // item_record $0BCD (engine): the eight bytes of item n at $3108 + 8n.
  function item(D, n) { const a = (A.items + 8 * (n & 0xFF)) & 0xFFFF; return D.G.subarray(a, a + 8); }
  const itemClass = it => it[3] >> 3;   // item_class $144A (engine)

  // weapon_slot_offset $1276 (engine): the offset of the equipped slot's item byte (+$1F = slot,
  // item_slot_offset $14F8: $BB + 2 x slot), 0 when none.
  function weaponSlot(rec) { const s = rec[0x1F]; return s === 0 ? 0 : (2 * s + 0xBB) & 0xFF; }
  // weapon_record $1268 (engine): the item equipped, Fists (0) when none.
  function weaponItem(rec) { const o = weaponSlot(rec); return o === 0 ? 0 : rec[o]; }

  // weapon_skill_bonus $0DC0 (engine): 4 x the level of the weapon's skill (item byte 5).
  function weaponSkillBonus(D, rec) { return 4 * skillLevel(rec, item(D, weaponItem(rec))[5]).level; }

  // weapon_use_rounds $BC75 (game), weapon_rounds $BC73 with 0: uses A rounds of the equipped gun and
  // returns the rounds left. A weapon that is not a gun, or has no clip, returns 1. A jammed gun
  // returns 15 and leaves the reach at 15; a gun left empty returns 0 and does the same.
  function weaponUseRounds(D, rec, used, st) {
    const it = item(D, weaponItem(rec)), cls = itemClass(it);
    if (cls === 0 || !isRanged(D, cls) || it[4] === 0) return 1;
    const o = weaponSlot(rec);
    if (o === 0 || (rec[o + 1] & 0x80)) { if (st) st.reach = 15; return 15; }
    const top = rec[o + 1] & 0xC0;
    let r = ((rec[o + 1] & 0x3F) + ((-used) & 0xFF)) & 0xFF;
    if (r === 0 || (r & 0x80)) { if (st) st.reach = 15; r = 0; }
    rec[o + 1] = r | top;
    return r & 0x3F;
  }

  // is_conscious $17E9 (engine): CON (+$1D/+$1E) of 1 or more.
  const isConscious = rec => !(rec[0x1E] & 0x80) && (rec[0x1D] | rec[0x1E]) !== 0;

  // member_reach $BC39 (game): 0 for a member who is not conscious; otherwise 15 feet (melee) unless
  // the weapon is a gun, $FE; an empty or jammed gun falls back to 15. cls is what it leaves in $7E:
  // the gun's class, 1 for anything else; a member who is not conscious leaves $7E as it was (prev).
  function memberReach(D, rec, prev) {
    if (!isConscious(rec)) return { reach: 0, cls: prev === undefined ? null : prev };
    const st = { reach: 15, cls: itemClass(item(D, weaponItem(rec))) };
    if (st.cls === 0 || !isRanged(D, st.cls)) st.cls = 1; else st.reach = 0xFE;
    weaponUseRounds(D, rec, 0, st);
    return st;
  }

  // member_hit_roll $A584 (game): the open 2d6; a roll under 4 followed by a 1 on a d6 spoils the
  // attack (classes 8, 9 and 13 fail to detonate, any other gun jams: count byte $80, rounds lost).
  // Otherwise the total is the roll + DEX (+$13) + 4 x the weapon's skill level + 10 for class 13,
  // or for other classes the fire mode term: (order argument >> 4) AND $0C, which is 0 for a single
  // shot and 4 for a burst, and the rounds left for automatic fire (8).
  function memberHitRoll(D, rec, cls, arg, src) {
    const roll = roll2d6Open(src);
    const out = { roll, spoiled: null, extra: null, total: 0 };
    if (roll.total < 4) {
      out.extra = rollD6(src);
      if (out.extra === 1) {
        if (cls === 8 || cls === 9 || cls === 13) { out.spoiled = 'dud'; return out; }
        rec[(weaponSlot(rec) + 1) & 0xFF] = 0x80;
        out.spoiled = 'jam';
        return out;
      }
    }
    let acc = addClamped(0, roll.total, 0);
    acc = addClamped(acc, rec[0x13], 0);
    const sb = weaponSkillBonus(D, rec);
    acc = addClamped(acc, sb & 0xFF, sb >> 8);
    let bonus;
    if (cls === 13) bonus = 10;
    else { const m = (arg >> 4) & 0x0C; bonus = m === 8 ? weaponUseRounds(D, rec, 0, null) : m; }
    out.bonus = bonus; out.dex = rec[0x13]; out.skillBonus = sb;
    out.total = addClamped(acc, bonus, 0);
    return out;
  }

  // weapon_range_kind $A793 (game): range kind 0, 1 or 2 of a weapon class.
  function weaponRangeKind(cls) {
    if (cls === 2 || cls === 5 || cls === 10 || cls === 13) return 0;
    if (cls === 3 || cls === 6 || cls === 11 || cls === 8) return 1;
    return 2;
  }

  // range_target $BD48 (game): builds a table of 21 distances 0, 5, ... 100 feet at $5A00, each with
  // start + step x (i + 1) and that + 7, and returns the entry of the first distance at or above the
  // one asked; col 1 (the target's line is not ranged, $A76E) takes the + 7 column. Past 100 feet the
  // code reads on into the disk buffer: null here.
  function rangeTarget(D, dist, kind, col) {
    const start = D.G[A.rangeStart + kind], step = D.G[A.rangeStep + kind];
    let v = start;
    for (let i = 0; i < 21; i++) {
      v = (v + step) & 0xFF;
      if ((dist & 0xFF) <= 5 * i) return col ? (v + 7) & 0xFF : v;
    }
    return null;
  }

  // distance_to_party $08F5 (engine): feet from the party to a square dx, dy away (dx 0-9, dy 0-4).
  function distance(D, dx, dy) { return D.E[A.distance + 10 * Math.abs(dy) + Math.abs(dx)]; }

  // attribute_bonus $A7C3 (game): (v - 12) / 2 from 13 up, 0 for 9 to 12, (v - 9) / 2 rounded down
  // below 9. Returned signed; the game holds it as X:A.
  function attributeBonus(v) {
    v &= 0xFF;
    if (v >= 13) return (v - 12) >> 1;
    if (v >= 9) return 0;
    return ((((v - 9) & 0xFF) >> 1) | 0x80) - 256;
  }

  // weapon_damage_roll $A7F4 (game), for a conscious attacker (member_reach first): X = the target
  // line's armour dice. A gun that is empty or jammed
  // is swung (only melee does that): 1d6 for classes 2 and 10, 2d6 for the others, plus the class
  // number. Otherwise item byte 6 in d6; classes 8 and 9 roll 2 x dice - armour instead when the dice
  // are at least the armour ($FF at most).
  function weaponDamageRoll(D, rec, armour, src, info) {
    const st = memberReach(D, rec);
    let a, x;
    if (isRanged(D, st.cls) && st.reach < 0x10) {
      x = (st.cls === 2 || st.cls === 10) ? 1 : 2; a = st.cls;
      if (info) info.swung = true;
    } else {
      x = item(D, weaponItem(rec))[6];
      if ((st.cls === 8 || st.cls === 9) && x >= (armour & 0xFF)) {
        const t = ((x - armour) & 0xFF) + x;
        x = t > 0xFF ? 0xFF : t;
      }
      a = 0;
    }
    if (info) { info.dice = x; info.plus = a; info.cls = st.cls; info.rolled = []; }
    return rollD6sPlus(src, a, x, info ? info.rolled : null);
  }

  // weapon_damage $A7DE (game): weapon_damage_roll + the luck bonus (LK, +$10), a plain 16-bit add,
  // so a sum below 0 comes back as a number near 65,536.
  function weaponDamage(D, rec, armour, src, info) {
    const roll = weaponDamageRoll(D, rec, armour, src, info);
    const luck = attributeBonus(rec[0x10]);
    if (info) { info.roll = roll; info.luck = luck; }
    return (roll + luck) & 0xFFFF;
  }

  // monster_armour_roll $A735 (game): the line's armour dice (monster byte 4 AND $0F) in d6.
  function monsterArmourRoll(src, dice, rolled) { return rollD6sPlus(src, 0, dice, rolled); }

  // monster_armour_absorb $A9AD (game): damage minus the armour roll, held at 0; anti-tank fire
  // ($D7 set for classes 8 and 9) keeps the damage, but the armour has been rolled all the same.
  function armourAbsorb(damage, armourRoll, ignore) {
    if (ignore) return damage;
    const r = damage - armourRoll;
    return r < 0 ? 0 : r;
  }

  // auto_fire_dice $A992 (game): max(1, rounds / 4) d4, eight bits.
  function autoFireDice(src, rounds, dice) {
    let n = (rounds & 0xFF) >> 2;
    if (n === 0) n = 1;
    let t = 0;
    for (let i = 0; i < n; i++) { const d = random1ToA(src, 4); if (dice) dice.push(d); t = (t + d) & 0xFF; }
    return t;
  }

  // member_attack $A0B3 (game): a burst lands random_1_to_a(3) hits.
  const burstHits = src => random1ToA(src, 3);

  // choose_attack $B511-$B556 (game): the fire mode an NPC picks for itself with a gun that fires
  // bursts: a single shot under 3 rounds, a burst at exactly 3, and over 3 a d10 against
  // auto_fire_thresholds[the number of characters who are not conscious]: at or above it, automatic.
  function npcFireMode(D, rounds, down, src) {
    if (rounds < 3) return { mode: 0 };
    if (rounds === 3) return { mode: 1 };
    const d10 = random1ToA(src, 10);
    return { mode: d10 >= D.G[A.autoThresholds + down] ? 2 : 1, d10, threshold: D.G[A.autoThresholds + down] };
  }

  // class_fires_bursts $AC04 (game): classes 5-7 and 10-12 are offered Burst and Auto.
  const firesBursts = cls => (cls >= 5 && cls <= 7) || (cls >= 10 && cls <= 12);

  // ---------------------------------------------------------------------------------------------
  // The Ranger Center's attribute roll (part ranger)

  // roll_attribute $8382-$83C0 (ranger): five roll_d6 (through $023A) into roll_dice $83C1-$83C5,
  // the first die thrown in slot 4 and the last in slot 0 ($8385-$838E). Then for X = 4 down to 1
  // the die in slot X is loaded once ($8397) and compared with slots X - 1 down to 0 ($839A); a
  // smaller one is exchanged with the slot it meets ($839F-$83A7). The BPL at $83AB goes back to the
  // CMP, not to the LDA, so after an exchange the loop goes on with the die it loaded, which now
  // sits in slot Y: a second exchange overwrites slot X again and leaves that small die in two
  // slots. The roll is slots 4 + 3 + 2 ($83B0-$83BC). thrown: the five dice in the order thrown.
  // steps: every comparison, with the slots after it.
  function rangerRoll(thrown) {
    const slots = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) slots[4 - i] = thrown[i];
    const start = slots.slice(), steps = [];
    for (let x = 4; x >= 1; x--) {
      const a = slots[x];
      for (let y = x - 1; y >= 0; y--) {
        const was = slots[y], swap = a < was;
        if (swap) { slots[x] = was; slots[y] = a; }
        steps.push({ x, y, a, was, swap, slots: slots.slice() });
      }
    }
    return { start, slots, steps, sum: (slots[4] + slots[3] + slots[2]) & 0xFF };
  }
  // What the loop was meant to give: the best three of the five dice (the same loop with the load
  // inside it sorts the slots, and slots 2-4 hold the three largest).
  const bestThree = thrown => thrown.slice().sort((a, b) => b - a).slice(0, 3).reduce((s, v) => s + v, 0);
  // A throw with the game's dice: five roll_d6, as $8387 calls them.
  function rangerThrow(src) { const t = []; for (let i = 0; i < 5; i++) t.push(rollD6(src)); return t; }
  // All 7,776 throws: counts by total (3-18) of the game's roll, of the best three and of 3d6
  // (x 36 = 7,776 / 216, to share the scale), the means, and how often the game's is lower.
  function rangerTable() {
    const game = new Array(19).fill(0), best = new Array(19).fill(0), d3 = new Array(19).fill(0);
    let lower = 0, lost = 0, sg = 0, sb = 0;
    const t = [1, 1, 1, 1, 1];
    for (let n = 0; n < 7776; n++) {
      let k = n;
      for (let i = 0; i < 5; i++) { t[i] = 1 + (k % 6); k = Math.floor(k / 6); }
      const g = rangerRoll(t).sum, b = bestThree(t);
      game[g]++; best[b]++; sg += g; sb += b;
      if (g < b) { lower++; lost += b - g; }
    }
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) d3[a + b + c] += 36;
    return { game, best, d3, meanGame: sg / 7776, meanBest: sb / 7776, mean3d6: 10.5, lower, lost };
  }

  // ---------------------------------------------------------------------------------------------
  // Exact odds. The dice are taken to be fair and independent: each roll_d6 an even 1 to 6.

  // Ordered pairs of different dice by their sum.
  const NONDOUBLE = [0, 0, 0, 2, 2, 4, 4, 6, 4, 4, 2, 2, 0];
  // S[n] = P(open 2d6 >= n). A double 2d is followed by another open roll: S(n) = P(a pair of
  // different dice reaches n) + sum over d of P(2d) S(n - 2d), with S = 1 at 3 and below.
  function openSurvival(nMax) {
    const S = new Float64Array(Math.max(nMax, 4) + 1);
    for (let n = 0; n < S.length; n++) {
      if (n <= 3) { S[n] = 1; continue; }
      let p = 0;
      for (let s = n; s <= 11; s++) p += NONDOUBLE[s];
      p /= 36;
      for (let d = 1; d <= 6; d++) p += (n - 2 * d <= 3 ? 1 : S[n - 2 * d]) / 36;
      S[n] = p;
    }
    return S;
  }
  let SURV = openSurvival(1600);
  function pAtLeast(n) {
    if (n <= 3) return 1;
    if (n >= SURV.length) SURV = openSurvival(n + 200);
    return SURV[n];
  }
  const pExactly = t => (t < 3 ? 0 : pAtLeast(t) - pAtLeast(t + 1));

  // The same for any odds of a pair: P[a - 1][b - 1] the weight of a pair thrown a then b. Each pair
  // of a throw that goes on is taken to fall like the first.
  function openSurvivalFrom(P, nMax) {
    let w = 0;
    for (const r of P) for (const q of r) w += q;
    const S = new Float64Array(Math.max(nMax, 4) + 1);
    for (let n = 0; n < S.length; n++) {
      if (n <= 3) { S[n] = 1; continue; }
      let p = 0;
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
        const q = P[a - 1][b - 1] / w;
        if (a !== b) { if (a + b >= n) p += q; } else p += q * (n - 2 * a <= 3 ? 1 : S[n - 2 * a]);
      }
      S[n] = p;
    }
    return S;
  }

  // The game's dice are not fair. roll_d6 throws again at once on 6 or 7, and random_byte makes the
  // new byte from the one thrown away and the raster line and timer, which have moved only a few
  // cycles: after a 7 the next draw is 1 or 2 four times in ten. roll_2d6_open's two dice are
  // thrown 10 cycles apart. The first pairs of 2,000,000 open throws, run with the engine's own
  // code ($0845, $24D6, $24E3) on the kit's 6502 simulator from random moments (a random raster
  // line, cycle, timer value and seed each): GAME_PAIRS[a - 1][b - 1] throws of a then b. Doubles
  // 20.39%, a pair under 5 13.07%. GAME_DIE: the dice of 2,000,000 roll_d6 calls, 1 to 6.
  const GAME_PAIRS = [[112595, 92008, 50409, 33356, 31013, 33578], [73094, 98404, 70647, 37302, 33078, 42695],
    [45880, 43522, 53842, 77792, 71795, 53569], [39578, 38300, 37766, 53156, 68827, 78995],
    [58454, 38585, 45663, 54225, 55880, 61362], [39104, 68801, 74802, 50311, 47698, 33914]];
  const GAME_DIE = [352672, 355350, 347319, 317639, 312581, 314439];
  const SURV_GAME = openSurvivalFrom(GAME_PAIRS, 1600);
  function pAtLeastGame(n) { return n <= 3 ? 1 : n >= SURV_GAME.length ? 0 : SURV_GAME[n]; }

  // A check: pass when the roll is at least 5 and the roll + bonus reaches the target.
  function checkOdds(target, bonus) {
    const need = Math.max(5, target - bonus);
    return { need, pass: pAtLeast(need), autoFail: 1 - pAtLeast(5),
             game: { pass: pAtLeastGame(need), autoFail: 1 - pAtLeastGame(5) } };
  }

  // Learning by use (skill_improve_roll): the chance that a passed check raises the level.
  function learnOdds(level, rank, diff) {
    if (level === 0 || level >= rank || level >= diff) return { p: 0, threshold: 0 };
    const threshold = (((diff - level) & 0xFF) >> 1) + 1;
    return { p: Math.min(threshold, 10) / 10, threshold };
  }

  // The hit roll: a 3 is spoiled when the extra d6 is a 1 (1 in 108 of all rolls).
  function hitOdds(target, bonus) {
    const need = target - bonus;
    const spoil = pExactly(3) / 6;
    const hit = need <= 3 ? 1 - spoil : pAtLeast(need);
    const gSpoil = (1 - pAtLeastGame(4)) * GAME_DIE[0] / GAME_DIE.reduce((x, y) => x + y, 0);
    const game = { spoil: gSpoil, hit: need <= 3 ? 1 - gSpoil : pAtLeastGame(need) };
    return { need, hit, spoil, miss: Math.max(0, 1 - hit - spoil), game };
  }

  // Sum of n dice of k faces (each 1..k): a Float64Array indexed by the sum.
  function diceSum(n, k) {
    let p = new Float64Array(1); p[0] = 1;
    for (let i = 0; i < n; i++) {
      const q = new Float64Array(p.length + k);
      for (let s = 0; s < p.length; s++) if (p[s]) for (let f = 1; f <= k; f++) q[s + f] += p[s] / k;
      p = q;
    }
    return p;
  }

  // Damage of one hit. kind 'shot': dice d6 + luck, then the armour roll off (weapon_damage, then
  // monster_armour_absorb); 'at': classes 8 and 9, (2 x dice - armour) d6 + luck, armour ignored;
  // 'blast': class 13, dice d6 (no luck) less each monster's own armour roll. A sum below 0 wraps
  // to near 65,536 (wrap gives its chance). Returns { p: Float64Array by damage, wrap, mean }.
  function damageOdds(kind, dice, armour, luck) {
    let n = dice;
    if (kind === 'at' && dice >= armour) n = Math.min(255, 2 * dice - armour);
    const X = diceSum(n, 6), Y = kind === 'at' ? Float64Array.of(1) : diceSum(armour, 6);
    const l = kind === 'blast' ? 0 : luck;
    const out = new Float64Array(6 * n + Math.max(0, l) + 1);
    let wrap = 0;
    for (let x = 0; x < X.length; x++) {
      if (!X[x]) continue;
      const v = x + l;
      if (v < 0) { wrap += X[x]; continue; }
      for (let y = 0; y < Y.length; y++) if (Y[y]) out[Math.max(0, v - y)] += X[x] * Y[y];
    }
    let mean = 0;
    for (let d = 0; d < out.length; d++) mean += d * out[d];
    return { p: out, wrap, mean, dice: n };
  }

  // Hits of one attack that hits: single 1, burst 1-3 even, automatic max(1, rounds / 4) d4.
  function hitsOdds(mode, rounds) {
    if (mode === 0) return Float64Array.of(0, 1);
    if (mode === 1) return Float64Array.of(0, 1 / 3, 1 / 3, 1 / 3);
    return diceSum(Math.max(1, rounds >> 2), 4);
  }

  // ---------------------------------------------------------------------------------------------
  // Names, from the engine's packed text (find_message $1E0E, text_char $28F4, text_bits $291D):
  // after a 60-byte alphabet, a table of 16-bit offsets to groups of four messages; five-bit codes,
  // lowest bit first; $1E capitalises the next letter, $1F adds $1E to the next code.
  function engineMessage(E, base, n) {
    const t = base + 0x3C, g = (n & 0xFF) >> 2;
    let a = (t + (E[t + 2 * g] | (E[t + 2 * g + 1] << 8))) & 0xFFFF;
    let cur = 0, left = 0;
    const bits = () => {
      let v = 0;
      for (let i = 0; i < 5; i++) {
        if (left === 0) { cur = E[a]; a = (a + 1) & 0xFFFF; left = 8; }
        v |= (cur & 1) << i; cur >>= 1; left--;
      }
      return v;
    };
    const one = () => {
      const codes = [];
      for (let guard = 0; guard < 400; guard++) {
        let c = bits(), cap = false;
        while (c === 0x1E) { cap = true; c = bits(); }
        if (c === 0x1F) c = bits() + 0x1E;
        let ch = E[base + c];
        if (ch === 0) return codes;
        if (cap && ch >= 0x61 && ch < 0xFB) ch -= 0x20;
        codes.push(ch);
      }
      return codes;
    };
    for (let k = 0; k < (n & 3); k++) one();
    return one();
  }
  // A name with the singular/plural switch ($0A): "Kni{0A}fe{0A}ves{0A}" is Knife, Knives.
  function singular(codes) {
    const parts = [[]];
    for (const c of codes) if (c === 0x0A) parts.push([]); else parts[parts.length - 1].push(c);
    const s = parts.length > 1 ? parts[0].concat(parts[1]) : parts[0];
    return String.fromCharCode(...s.filter(c => c >= 0x20 && c < 0x7F));
  }

  // ---------------------------------------------------------------------------------------------
  // The data: the engine's and the game's images (C64.load(...).ram, or a snapshot's 64 KB in tests).
  function fromImages(E, G) {
    const D = { E, G, ranged: new Set() };
    for (let a = A.rangedClasses; a < A.rangedClasses + 32 && !(E[a] & 0x80); a++) D.ranged.add(E[a]);
    D.skills = [''];
    for (let n = 1; n <= 35; n++) D.skills.push(singular(engineMessage(E, A.engineText, n)));
    D.items = [];
    for (let n = 0; n < 95; n++) D.items.push(singular(engineMessage(E, A.engineText, 36 + n)));
    // attribute_labels: seven zero-terminated strings, record offsets $0E-$14
    D.attrs = {};
    let a = A.attrLabels;
    for (let i = 0; i < 7; i++) {
      let s = '';
      while (E[a]) { s += String.fromCharCode(E[a]); a++; }
      a++;
      D.attrs[0x0E + i] = s.replace(/[\r=\s]/g, '');
    }
    return D;
  }
  async function load(base) {
    if (!globalThis.C64 || !globalThis.C64.load) throw new Error('needs ../../lib/c64.js');
    const [e, g] = await Promise.all([C64.load(base + 'parts/engine/listing.json'), C64.load(base + 'parts/game/listing.json')]);
    const need = [[e, A.skillAttr, 36], [e, A.rangedClasses, 13], [e, A.distance, 50], [e, A.attrLabels, 40],
                  [e, A.engineText, 0x700], [g, A.items, 95 * 8], [g, A.rangeStart, 6], [g, A.autoThresholds, 8]];
    for (const [img, at, n] of need) for (let i = 0; i < n; i++) {
      if (!img.has[at + i]) throw new Error('the listing has no byte at $' + (at + i).toString(16).toUpperCase());
    }
    return fromImages(e.ram, g.ram);
  }

  // ---------------------------------------------------------------------------------------------
  // The page. section.html holds the markup of three plates: #wl-dice-checks, #wl-dice-attacks and
  // #wl-rr (the Ranger Center's roll). mount(root, { base }) fills them and wires their controls.
  // The checks and the attacks read their tables from the engine's and the game's listings
  // (load, above); the Ranger Center's plate needs no table and works without them, and reads two
  // bytes of the ranger listing only for its line of evidence.

  const PIPS = { 1: [[2, 2]], 2: [[1, 1], [3, 3]], 3: [[1, 1], [2, 2], [3, 3]], 4: [[1, 1], [3, 1], [1, 3], [3, 3]],
                 5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]], 6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]] };
  function dieSVG(v, extra) {
    const p = (PIPS[v] || []).map(([x, y]) => '<circle cx="' + 6 * x + '" cy="' + 6 * y + '" r="2.2"/>').join('');
    return '<svg class="wl-dice-die' + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" role="img" aria-label="' + v +
           '"><rect x="1" y="1" width="22" height="22" rx="4.5"/>' + p + '</svg>';
  }
  const chip = (v, extra) => '<span class="wl-dice-chip' + (extra ? ' ' + extra : '') + '">' + v + '</span>';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = n => Math.round(n).toLocaleString('en-US');
  function fmtP(p) {
    if (!(p > 0)) return '0%';
    if (p >= 1) return '100%';
    if (p < 0.001) return '1 in ' + num(1 / p);
    const v = 100 * p;
    if (v > 99.9) return '99.9%+';
    return (v < 10 ? v.toFixed(2).replace(/0$/, '') : v.toFixed(1)) + '%';
  }
  const signed = n => (n < 0 ? '−' + -n : '+' + n);
  const reduceMotion = () => !!(globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function colours(el) {
    const cs = getComputedStyle(el);
    const v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    return { ink: v('--ink', '#2f3136'), soft: v('--ink-soft', '#55585f'), mute: v('--ink-mute', '#80838a'),
             line: v('--line', '#d5d3cc'), surface2: v('--surface-2', '#f1efea'), accent: v('--accent', '#1f5fa8'),
             green: v('--green', '#2a8a4a'), coral: v('--coral', '#d04a3a'), amber: v('--amber', '#c25a00'),
             fm: v('--fm', 'ui-monospace,Menlo,monospace') };
  }
  // A canvas at the width the page gives it, drawn at the screen's pixel density.
  function canvasCtx(cv, h) {
    const dpr = Math.max(1, Math.min(3, globalThis.devicePixelRatio || 1));
    const w = Math.max(220, Math.round(cv.clientWidth || (cv.parentNode && cv.parentNode.clientWidth) || 560));
    cv.style.height = h + 'px';
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }
  // Bars over x0..x1. series: { ys(x), fill (colour or x => colour), kind 'bar' | 'dot' }; up to two
  // bar series side by side. marks: dashed lines at x with a label. tick: label every tick values.
  function drawBars(cv, height, o) {
    const { ctx, w, h } = canvasCtx(cv, height);
    const C = o.C, padL = 6, padR = 6, padT = 20, padB = 24, n = o.x1 - o.x0 + 1;
    let max = 0;
    for (const s of o.series) for (let x = o.x0; x <= o.x1; x++) max = Math.max(max, s.ys(x) || 0);
    if (!(max > 0)) max = 1;
    const bw = (w - padL - padR) / n, base = h - padB;
    const X = x => padL + (x - o.x0) * bw, Y = p => padT + (base - padT) * (1 - p / max);
    const bars = o.series.filter(s => s.kind !== 'dot');
    bars.forEach((s, i) => {
      const gw = bars.length > 1 ? bw * 0.4 : Math.max(1, bw * 0.78), off = bars.length > 1 ? bw * (0.1 + 0.4 * i) : bw * 0.11;
      for (let x = o.x0; x <= o.x1; x++) {
        const p = s.ys(x);
        if (!(p > 0)) continue;
        ctx.fillStyle = typeof s.fill === 'function' ? s.fill(x) : s.fill;
        const y = Math.min(Y(p), base - 1);
        ctx.fillRect(X(x) + off, y, gw, base - y);
      }
    });
    for (const s of o.series.filter(q => q.kind === 'dot')) {
      ctx.fillStyle = s.fill;
      for (let x = o.x0; x <= o.x1; x++) { const p = s.ys(x); if (!(p > 0)) continue; ctx.beginPath(); ctx.arc(X(x) + bw / 2, Y(p), 3, 0, 2 * Math.PI); ctx.fill(); }
    }
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, base + 0.5); ctx.lineTo(w - padR, base + 0.5); ctx.stroke();
    ctx.fillStyle = C.mute; ctx.font = '11px ' + C.fm; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    let tick = o.tick || 1;
    while (tick * bw < 26) tick = tick < 5 ? 5 : tick * 2;
    for (let x = Math.ceil(o.x0 / tick) * tick; x <= o.x1; x += tick) ctx.fillText(String(x), X(x) + bw / 2, base + 6);
    let lastRight = -1e9;
    for (const m of o.marks || []) {
      if (m.x < o.x0 || m.x > o.x1 + 1) continue;
      const xx = Math.round(m.edge ? X(m.x) : X(m.x) + bw / 2) + 0.5;
      ctx.strokeStyle = m.colour; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(xx, padT - 4); ctx.lineTo(xx, base); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = m.colour; ctx.font = '600 11.5px ' + C.fm; ctx.textBaseline = 'top';
      const tw = ctx.measureText(m.label).width;
      let left = xx + 4 + tw > w - 2 ? xx - 4 - tw : xx + 4;
      if (left < lastRight + 6) left = Math.min(w - 2 - tw, lastRight + 6);
      ctx.textAlign = 'left'; ctx.fillText(m.label, left, 2);
      lastRight = left + tw;
    }
  }
  function onResize(el, fn) {
    if (globalThis.ResizeObserver) { let w = el.clientWidth; new ResizeObserver(() => { if (el.clientWidth !== w) { w = el.clientWidth; fn(); } }).observe(el); }
    else globalThis.addEventListener('resize', fn);
  }
  function seg(el, attr, onPick) {   // a row of buttons, one pressed
    const bs = Array.from(el.querySelectorAll('[' + attr + ']'));
    const set = v => bs.forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute(attr) === String(v))));
    bs.forEach(b => b.addEventListener('click', () => { if (b.disabled) return; set(b.getAttribute(attr)); onPick(b.getAttribute(attr)); }));
    return { set, buttons: bs };
  }
  const bindOut = (input, out, fmt) => { const f = () => { out.textContent = fmt(+input.value); }; input.addEventListener('input', f); f(); return f; };
  function pairsHTML(pairs) {
    return pairs.map(([a, b]) => '<span class="wl-dice-pair' + (a === b ? ' wl-dice-pdbl' : '') + '">' +
      dieSVG(a, a === b ? 'wl-dice-dbl' : '') + dieSVG(b, a === b ? 'wl-dice-dbl' : '') + '</span>').join('<span class="wl-dice-plus">+</span>');
  }

  // ---- 1. checks: skill_check $0C29 and attribute_check $0D0A ----------------------------------
  function mountChecks(el, D) {
    const $ = id => el.querySelector('#' + id);
    const C = () => colours(el);
    const skillSel = $('wl-dice-c-skill'), attrSel = $('wl-dice-c-attr'), level = $('wl-dice-c-level'),
          val = $('wl-dice-c-val'), diff = $('wl-dice-c-diff'), rank = $('wl-dice-c-rank'), cv = $('wl-dice-c-cv'),
          out = $('wl-dice-c-out'), tallyEl = $('wl-dice-c-tally');
    const skillAttr = n => D.E[(A.skillAttr + n) & 0xFFFF];
    for (let n = 1; n <= 35; n++) skillSel.add(new Option(D.skills[n] + ' · ' + (D.attrs[skillAttr(n)] || '?'), String(n)));
    for (let o = 0x0E; o <= 0x14; o++) attrSel.add(new Option(D.attrs[o], String(o)));
    skillSel.value = '2'; attrSel.value = '18';
    let kind = 'skill';
    const src = browserSource();
    let tally = { n: 0, pass: 0 };
    const st = () => {
      const skill = +skillSel.value, off = kind === 'skill' ? skillAttr(skill) : +attrSel.value;
      return { skill, off, level: kind === 'skill' ? +level.value : 0, v: +val.value, diff: +diff.value, rank: +rank.value };
    };
    function update(keepTally) {
      if (!keepTally) { tally = { n: 0, pass: 0 }; tallyEl.textContent = ''; }
      el.querySelectorAll('.wl-dice-k-skill').forEach(e => { e.hidden = kind !== 'skill'; });
      el.querySelectorAll('.wl-dice-k-attr').forEach(e => { e.hidden = kind !== 'attr'; });
      const s = st(), an = D.attrs[s.off] || '?';
      $('wl-dice-c-val-l').textContent = an;
      $('wl-dice-c-level-o').textContent = String(s.level);
      $('wl-dice-c-val-o').textContent = String(s.v);
      $('wl-dice-c-diff-o').textContent = s.diff + ' → ' + target15Plus5x(s.diff);
      $('wl-dice-c-rank-o').textContent = String(s.rank);
      const target = target15Plus5x(s.diff), bonus = s.v + 4 * s.level, o = checkOdds(target, bonus);
      $('wl-dice-c-p').textContent = fmtP(o.pass);
      $('wl-dice-c-game').textContent = 'With the dice as the game throws them, ' + fmtP(o.game.pass) +
        ', and a total under 5 ' + fmtP(o.game.autoFail) + '.';
      $('wl-dice-c-sum').innerHTML = 'Target <b>' + target + '</b> (15 + 5 × ' + s.diff + '). ' + esc(an) + ' ' + s.v +
        (kind === 'skill' ? ' + 4 × level ' + s.level + ' = ' + bonus : '') + ', so the dice must make <b>' + o.need +
        '</b> or more' + (target - bonus < 5 ? ': any total of 5 or more passes' : '') + '. A total under 5 fails whatever the bonus (' + fmtP(o.autoFail) + ').';
      let learn = '';
      if (kind === 'skill') {
        const L = learnOdds(s.level, s.rank, s.diff);
        if (s.level === 0) learn = 'Level 0: a skill not yet learned never improves by use.';
        else if (s.level >= s.rank) learn = 'No learning by use: level ' + s.level + ' is not below rank ' + s.rank + '.';
        else if (s.level >= s.diff) learn = 'No learning by use: level ' + s.level + ' is not below difficulty ' + s.diff + '.';
        else learn = 'A pass raises the skill to level ' + (s.level + 1) + ' on a d10 of ' + (L.threshold >= 10 ? 'anything' : L.threshold === 1 ? '1' : '1 to ' + L.threshold) +
          ' (' + fmtP(L.p) + '): ' + fmtP(L.p * o.pass) + ' of checks.';
      }
      $('wl-dice-c-learn').textContent = learn;
      const c = C(), x1 = Math.min(64, Math.max(26, o.need + 4));
      drawBars(cv, 150, { C: c, x0: 3, x1, tick: 5, series: [{ kind: 'bar', ys: pExactly,
        fill: t => (t < 5 ? c.coral : t >= o.need ? c.green : c.mute) }],
        marks: [{ x: Math.min(o.need, x1 + 1), edge: true, colour: c.green, label: 'pass: ' + o.need + ' or more' + (o.need > x1 ? ', off the chart' : '') }] });
    }
    function roll() {
      const s = st(), rec = new Uint8Array(256);
      rec[s.off] = s.v; rec[0x24] = s.rank;
      if (kind === 'skill') { rec[0x80] = s.skill; rec[0x81] = s.level; }
      const r = kind === 'skill' ? skillCheck(D, rec, s.skill, s.diff, src) : attributeCheck(D, rec, s.off, s.diff, src);
      const an = D.attrs[s.off] || '?';
      let html = '<div class="wl-dice-dice">' + pairsHTML(r.roll.pairs) + '</div><p>';
      if (r.autoFail) html += 'Total <b>' + r.roll.total + '</b>: under 5, <b class="wl-dice-bad">fails</b> at once. No experience.';
      else {
        html += 'Total ' + r.roll.total + ' + ' + esc(an) + ' ' + s.v + (kind === 'skill' ? ' + ' + 4 * s.level : '') + ' = <b>' + r.total +
          '</b> against ' + r.target + ': ' + (r.pass ? '<b class="wl-dice-good">passes</b>' : '<b class="wl-dice-bad">fails</b>') +
          '. ' + r.roll.total + ' experience.';
        if (r.learn && r.learn.tried) html += ' Learning: d10 ' + chip(r.learn.d10) + ' against ' + r.learn.threshold + (r.learn.raised ? ': <b class="wl-dice-good">up to level ' + r.learn.newLevel + '</b>.' : ': no change.');
      }
      out.innerHTML = html + '</p>';
      tally.n++; if (r.pass) tally.pass++;
      const raised = r.learn && r.learn.raised;
      if (raised) { level.value = String(Math.min(+level.max, r.learn.newLevel)); update(false); tally = { n: 0, pass: 0 }; }
      tallyEl.textContent = raised ? 'The level rose, so the count starts again.' :
        tally.n + (tally.n === 1 ? ' roll' : ' rolls') + ' at these settings: ' + tally.pass + ' passed (' + fmtP(tally.pass / tally.n) + '; the odds say ' + fmtP(checkOdds(target15Plus5x(s.diff), s.v + 4 * s.level).pass) + ').';
    }
    seg($('wl-dice-c-kind'), 'data-kind', v => { kind = v; update(); });
    [skillSel, attrSel, level, val, diff, rank].forEach(e => e.addEventListener('input', () => update()));
    $('wl-dice-c-roll').addEventListener('click', roll);
    update();
    onResize(cv, () => update(true));
  }

  // ---- 2. attacks: member_attack $9FA9 with member_hit_roll $A584 and weapon_damage $A7DE -------
  const KIND_NAMES = ['short', 'medium', 'long'];
  function mountAttacks(el, D) {
    const $ = id => el.querySelector('#' + id);
    const C = () => colours(el);
    const wSel = $('wl-dice-a-weapon'), rounds = $('wl-dice-a-rounds'), dex = $('wl-dice-a-dex'), level = $('wl-dice-a-level'),
          lk = $('wl-dice-a-lk'), dist = $('wl-dice-a-dist'), armour = $('wl-dice-a-armour'), col = $('wl-dice-a-col'), cv = $('wl-dice-a-cv'),
          out = $('wl-dice-a-out');
    const kindOf = cls => (cls === 13 ? 'blast' : cls === 8 || cls === 9 ? 'at' : 'shot');
    for (let n = 0; n < 95; n++) {
      const it = item(D, n), cls = itemClass(it);
      if (!isRanged(D, cls)) continue;
      const k = kindOf(cls);
      wSel.add(new Option(D.items[n] + ' · ' + it[6] + 'd6' + (k === 'blast' ? ', blast' : k === 'at' ? ', anti-tank' : ''), String(n)));
    }
    wSel.value = '13';
    let mode = 0;
    const src = browserSource();
    const modeSeg = seg($('wl-dice-a-mode'), 'data-mode', v => { mode = +v; update(); });
    function weapon() { const n = +wSel.value, it = item(D, n); return { n, it, cls: itemClass(it), dice: it[6], skill: it[5], clip: it[4] }; }
    function onWeapon() {
      const w = weapon();
      const bursts = firesBursts(w.cls);
      modeSeg.buttons.forEach(b => { b.disabled = +b.getAttribute('data-mode') > 0 && !bursts; });
      if (!bursts && mode) { mode = 0; modeSeg.set(0); }
      rounds.max = String(Math.max(1, Math.min(63, w.clip))); rounds.value = rounds.max; rounds.disabled = w.clip <= 1;
      level.disabled = w.skill === 0;
      $('wl-dice-a-level-l').textContent = w.skill ? D.skills[w.skill] : 'Skill';
      update();
    }
    function st() {
      const w = weapon();
      return Object.assign(w, { mode, rounds: +rounds.value, dex: +dex.value, level: w.skill ? +level.value : 0, lk: +lk.value,
                                dist: +dist.value, armour: +armour.value, col: +col.value });
    }
    function update() {
      const s = st(), c = C();
      $('wl-dice-a-rounds-o').textContent = String(s.rounds);
      $('wl-dice-a-dex-o').textContent = String(s.dex);
      $('wl-dice-a-level-o').textContent = s.skill ? String(s.level) : 'none';
      const luck = attributeBonus(s.lk);
      $('wl-dice-a-lk-o').textContent = s.lk + ' (' + signed(luck) + ')';
      $('wl-dice-a-dist-o').textContent = s.dist + ' ft';
      $('wl-dice-a-armour-o').textContent = s.armour + 'd6';
      const kind = weaponRangeKind(s.cls), target = rangeTarget(D, s.dist, kind, s.col);
      const modeBonus = s.cls === 13 ? 10 : s.mode === 1 ? 4 : s.mode === 2 ? s.rounds : 0;
      const bonus = s.dex + 4 * s.level + modeBonus, h = hitOdds(target, bonus);
      $('wl-dice-a-p').textContent = fmtP(h.hit);
      $('wl-dice-a-game').textContent = 'With the dice as the game throws them, ' + fmtP(h.game.hit) + '.';
      const modeName = s.cls === 13 ? 'explosive' : ['', 'burst', 'automatic, the rounds left'][s.mode];
      $('wl-dice-a-sum').innerHTML = 'Target <b>' + target + '</b>: ' + s.dist + ' ft, counted as ' + Math.ceil(s.dist / 5) * 5 + ', at ' +
        KIND_NAMES[kind] + ' range' + (s.col ? ', + 7' : '') + '. DEX ' + s.dex + ' + 4 × ' + s.level + (modeBonus ? ' + ' + modeBonus + ' (' + modeName + ')' : '') +
        ' = ' + bonus + ', so the dice must make <b>' + Math.max(3, h.need) + '</b>' + (h.need <= 3 ? ': any total hits' : ' or more') + '. ' +
        'A total of 3 and then a 1 on one more die ' + (s.cls === 8 || s.cls === 9 || s.cls === 13 ? 'fails to detonate' : 'jams the gun and loses its rounds') +
        ' (' + fmtP(h.spoil) + ').';
      // hits of one attack that hits
      let hitsTxt, meanHits = 1;
      if (s.cls === 13) hitsTxt = 'One damage roll for every living monster in the group’s three lines; each takes off its own armour roll. The explosive is spent.';
      else if (s.mode === 0) hitsTxt = 'One hit; 1 round, hit or miss.';
      else if (s.mode === 1) { meanHits = 2; hitsTxt = 'A burst lands 1, 2 or 3 hits, each a third of the time; 3 rounds, hit or miss.'; }
      else {
        const nd = Math.max(1, s.rounds >> 2);
        meanHits = 2.5 * nd;
        hitsTxt = 'Automatic fire lands ' + nd + 'd4 hits (' + nd + ' to ' + 4 * nd + ', ' + meanHits + ' on average) and spends all ' + s.rounds + ' rounds, hit or miss.';
      }
      $('wl-dice-a-hits').textContent = hitsTxt;
      const k = kindOf(s.cls), dmg = damageOdds(k, s.dice, s.armour, luck);
      let lo = 0, hi = dmg.p.length - 1, acc = 0;
      for (let d = 0; d < dmg.p.length; d++) { acc += dmg.p[d]; if (acc > 0.0005) { lo = d; break; } }
      acc = 0;
      for (let d = dmg.p.length - 1; d >= 0; d--) { acc += dmg.p[d]; if (acc > 0.0005) { hi = d; break; } }
      if (dmg.p[0] > 0.002) lo = 0;
      drawBars(cv, 150, { C: c, x0: lo, x1: Math.max(hi, lo + 8), tick: 5, series: [{ kind: 'bar', ys: d => dmg.p[d] || 0, fill: d => (d === 0 ? c.coral : c.accent) }],
        marks: [{ x: dmg.mean, colour: c.ink, label: 'mean ' + dmg.mean.toFixed(1) }] });
      let dTxt;
      if (k === 'at') dTxt = 'Each hit: ' + dmg.dice + 'd6' + (s.dice >= s.armour ? ' (2 × ' + s.dice + ' − armour ' + s.armour + ')' : ' (armour above ' + s.dice + ': no extra dice)') + ' ' + signed(luck) + ' luck; the armour is rolled but not taken off.';
      else if (k === 'blast') dTxt = 'Each monster: ' + s.dice + 'd6, no luck, less its ' + s.armour + 'd6 armour, never below 0.';
      else dTxt = 'Each hit: ' + s.dice + 'd6 ' + signed(luck) + ' luck, less the ' + s.armour + 'd6 armour roll, never below 0.';
      dTxt += ' Mean ' + dmg.mean.toFixed(1) + (dmg.p[0] > 0 ? '; nothing gets through ' + fmtP(dmg.p[0]) + ' of the time' : '') + '.';
      if (dmg.wrap > 0) dTxt += ' In ' + fmtP(dmg.wrap) + ' of hits the luck takes the damage below 0, and it wraps round to about 65,000 (left out of the chart).';
      if (k !== 'blast') dTxt += ' Over many attacks: ' + (h.hit * meanHits * dmg.mean).toFixed(1) + ' damage per attack while the line lasts' + (dmg.wrap > 0 ? ', not counting the wraps' : '') + '.';
      $('wl-dice-a-dmg').textContent = dTxt;
    }
    function fire() {
      const s = st(), rec = new Uint8Array(256);
      rec[0x13] = s.dex; rec[0x10] = s.lk; rec[0x1D] = 10; rec[0x1F] = 1;
      rec[0xBD] = s.n; rec[0xBE] = s.rounds;
      if (s.skill) { rec[0x80] = s.skill; rec[0x81] = s.level; }
      const reach = memberReach(D, rec), target = rangeTarget(D, s.dist, weaponRangeKind(reach.cls), s.col);
      const r = memberHitRoll(D, rec, reach.cls, s.mode << 6, src);
      let html = '<div class="wl-dice-dice">' + pairsHTML(r.roll.pairs) + (r.extra !== null ? '<span class="wl-dice-plus">then</span>' + dieSVG(r.extra, r.extra === 1 ? 'wl-dice-dbl' : '') : '') + '</div><p>';
      if (r.spoiled) {
        out.innerHTML = html + 'A total of 3 and then a 1: ' + (r.spoiled === 'dud' ? '<b class="wl-dice-bad">fails to detonate</b>.' : '<b class="wl-dice-bad">the gun jams</b> and its rounds are lost.') + '</p>';
        return;
      }
      const hit = r.total >= target;
      html += 'Total ' + r.roll.total + ' + ' + (r.total - r.roll.total) + ' = <b>' + r.total + '</b> against ' + target + ': ' + (hit ? '<b class="wl-dice-good">hit</b>' : '<b class="wl-dice-bad">miss</b>') + '.';
      if (!hit) { out.innerHTML = html + '</p>'; return; }
      const k = kindOf(s.cls), rows = [];
      const one = (label, withLuck) => {
        const info = {}, rolled = [];
        const d = withLuck ? weaponDamage(D, rec, s.armour, src, info) : weaponDamageRoll(D, rec, s.armour, src, info);
        const ar = monsterArmourRoll(src, s.armour, rolled), left = armourAbsorb(d, ar, k === 'at');
        const shown = info.rolled.length <= 12 ? info.rolled.map(v => dieSVG(v, 'wl-dice-sm')).join('') : info.rolled.length + 'd6';
        rows.push('<li>' + label + ' ' + shown + ' = ' + (withLuck ? info.roll + ' ' + signed(info.luck) + ' = ' : '') +
                  '<b>' + d + '</b>' + (s.armour ? '; armour ' + (rolled.length ? rolled.join('+') : '0') + ' = ' + ar + (k === 'at' ? ', not taken off' : '') : '') +
                  ' → <b>' + left + '</b>' + (d > 0x8000 ? ' (wrapped)' : '') + '</li>');
      };
      if (k === 'blast') { html += ' One damage roll for the whole group, then each monster\u2019s armour (one shown):'; one('', false); }
      else {
        let n = 1, hitDice = [];
        if (s.mode === 1) n = burstHits(src);
        else if (s.mode === 2) n = autoFireDice(src, s.rounds, hitDice);
        html += s.mode === 0 ? '' : ' ' + (s.mode === 2 ? hitDice.map(v => chip(v)).join('') + ' = ' : chip(n) + ' ') + '<b>' + n + (n === 1 ? ' hit' : ' hits') + '</b>.';
        for (let i = 0; i < Math.min(n, 6); i++) one('Hit ' + (i + 1) + ':', true);
        if (n > 6) rows.push('<li>and ' + (n - 6) + ' more.</li>');
      }
      out.innerHTML = html + '</p><ul class="wl-dice-hits">' + rows.join('') + '</ul>';
    }
    wSel.addEventListener('input', onWeapon);
    [rounds, dex, level, lk, dist, armour, col].forEach(e => e.addEventListener('input', update));
    $('wl-dice-a-roll').addEventListener('click', fire);
    onWeapon();
    onResize(cv, update);
  }

  // ---- 3. the Ranger Center's attribute roll: roll_attribute $8382 (ranger) --------------------
  function mountRanger(el, rangerImg) {
    const $ = id => el.querySelector('#' + id);
    const C = () => colours(el);
    const sels = [0, 1, 2, 3, 4].map(i => $('wl-rr-d' + i)), stepSel = $('wl-rr-step'), slotsEl = $('wl-rr-slots'),
          cv = $('wl-rr-cv'), playB = $('wl-rr-play');
    sels.forEach(s => { for (let v = 1; v <= 6; v++) s.add(new Option(String(v), String(v))); });
    const T = rangerTable();
    const src = browserSource();
    let thrown = [1, 2, 3, 4, 5], R = null, step = 0, timer = null;
    const LAST = 11;
    slotsEl.innerHTML = [0, 1, 2, 3, 4].map(i => '<div class="wl-rr-slot' + (i >= 2 ? ' wl-rr-counted' : '') + '" id="wl-rr-s' + i + '"><span class="wl-rr-die"></span>' +
      '<span class="wl-rr-lab">slot ' + i + '<br>$' + (0x83C1 + i).toString(16).toUpperCase() + '</span></div>').join('') +
      '<div class="wl-rr-brace">added up</div>';
    const stepLabel = k => {
      if (k === 0) return 'The five dice in their slots';
      if (k === LAST) return 'The roll: slots 2 + 3 + 4';
      const q = R.steps[k - 1];
      return 'Pass ' + (5 - q.x) + ': slot ' + q.x + ' against slot ' + q.y;
    };
    function compute() {
      R = rangerRoll(thrown);
      stepSel.innerHTML = '';
      for (let k = 0; k <= LAST; k++) stepSel.add(new Option(stepLabel(k), String(k)));
      const best = bestThree(thrown), sorted = thrown.slice().sort((a, b) => a - b);
      $('wl-rr-game').textContent = R.slots[2] + ' + ' + R.slots[3] + ' + ' + R.slots[4] + ' = ' + R.sum;
      $('wl-rr-best').textContent = sorted[2] + ' + ' + sorted[3] + ' + ' + sorted[4] + ' = ' + best;
      $('wl-rr-meant').innerHTML = sorted.map(v => dieSVG(v, 'wl-dice-sm')).join('');
      drawHist();
    }
    function render() {
      stepSel.value = String(step);
      $('wl-rr-prev').classList.toggle('off', step === 0);
      $('wl-rr-next').classList.toggle('off', step === LAST);
      const q = step >= 1 && step <= 10 ? R.steps[step - 1] : null;
      const before = step === 0 ? R.start : step === LAST ? R.slots : step === 1 ? R.start : R.steps[step - 2].slots;
      const now = step === 0 ? R.start : step === LAST ? R.slots : q.slots;
      for (let i = 0; i < 5; i++) {
        const box = $('wl-rr-s' + i);
        box.querySelector('.wl-rr-die').innerHTML = dieSVG(now[i]);
        box.classList.toggle('wl-rr-x', !!q && q.x === i);
        box.classList.toggle('wl-rr-y', !!q && q.y === i);
        box.classList.toggle('wl-rr-moved', !!q && q.swap && (i === q.x || i === q.y) && !reduceMotion());
        box.classList.toggle('wl-rr-sum', step === LAST && i >= 2);
      }
      $('wl-rr-a').innerHTML = q ? dieSVG(q.a, 'wl-dice-sm') : '<span class="wl-rr-none">–</span>';
      let say;
      if (step === 0) say = 'Thrown ' + thrown.join(', ') + ': the first die goes in slot 4 and the last in slot 0.';
      else if (step === LAST) {
        const best = bestThree(thrown);
        say = 'The roll adds slots 2, 3 and 4: ' + R.sum + '. ' + (R.sum < best ? 'The best three of the five dice make ' + best + ', so the loop has cost ' + (best - R.sum) + (best - R.sum === 1 ? ' point.' : ' points.') : 'Here that is the best three of the five dice anyway.');
      } else {
        const prev = step >= 2 ? R.steps[step - 2] : null;
        const fresh = !prev || prev.x !== q.x;
        say = (fresh ? 'Pass ' + (5 - q.x) + ' loads slot ' + q.x + ': ' + q.a + '. ' : 'Still holding ' + q.a + '. ') + 'Against slot ' + q.y + ' (' + q.was + '): ';
        if (!q.swap) say += q.a + ' is not smaller, nothing moves.';
        else {
          const lost = before[q.x];
          say += q.a + ' is smaller, so ' + q.was + ' goes to slot ' + q.x + ' and ' + q.a + ' to slot ' + q.y + '.';
          if (lost !== q.a) say += ' The ' + lost + ' that was in slot ' + q.x + ' is overwritten: it is gone.';
          else if (q.y > 0) say += ' The loop goes on with ' + q.a + ', not the ' + q.was + ' now in slot ' + q.x + '.';
        }
      }
      $('wl-rr-say').textContent = say;
    }
    function drawHist() {
      const c = C(), best = bestThree(thrown);
      drawBars(cv, 170, { C: c, x0: 3, x1: 18, tick: 1, series: [
        { kind: 'bar', ys: x => T.game[x], fill: c.accent },
        { kind: 'bar', ys: x => T.best[x], fill: c.green },
        { kind: 'dot', ys: x => T.d3[x], fill: c.mute }],
        marks: R.sum === best ? [{ x: R.sum, colour: c.ink, label: 'this throw: ' + R.sum }]
          : [{ x: R.sum, colour: c.accent, label: 'game ' + R.sum }, { x: best, colour: c.green, label: 'best three ' + best }] });
    }
    function go(k) { step = Math.max(0, Math.min(LAST, k)); render(); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } playB.textContent = 'Play'; playB.setAttribute('aria-pressed', 'false'); }
    function play() {
      if (timer) { stop(); return; }
      if (step === LAST) go(0);
      playB.textContent = 'Pause'; playB.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => { if (step >= LAST) { stop(); return; } go(step + 1); }, 1100);
    }
    function setThrow(t, animate) {
      stop();
      thrown = t.slice();
      sels.forEach((s, i) => { s.value = String(thrown[i]); });
      compute();
      if (animate && !reduceMotion()) { go(0); play(); } else go(animate ? LAST : step);
    }
    sels.forEach(s => s.addEventListener('input', () => setThrow(sels.map(e => +e.value), false)));
    $('wl-rr-throw').addEventListener('click', () => setThrow(rangerThrow(src), true));
    $('wl-rr-prev').addEventListener('click', e => { e.preventDefault(); stop(); go(step - 1); });
    $('wl-rr-next').addEventListener('click', e => { e.preventDefault(); stop(); go(step + 1); });
    stepSel.addEventListener('input', () => { stop(); go(+stepSel.value); });
    playB.addEventListener('click', play);
    $('wl-rr-stats').textContent = 'Over all 7,776 throws the game’s roll averages ' + T.meanGame.toFixed(2) + ', the best three ' + T.meanBest.toFixed(2) +
      ' and three plain dice 10.5. The game’s roll is lower than the best three in ' + num(T.lower) + ' throws (' + fmtP(T.lower / 7776) + ') and never higher.';
    if (rangerImg && rangerImg.has[0x83AB] && rangerImg.has[0x83AC]) {
      const op = rangerImg.ram[0x83AB], off = rangerImg.ram[0x83AC], to = (0x83AD + (off < 128 ? off : off - 256)) & 0xFFFF;
      const h2 = v => v.toString(16).toUpperCase().padStart(2, '0'), h4 = v => '$' + v.toString(16).toUpperCase().padStart(4, '0');
      $('wl-rr-ev').innerHTML = 'From the ranger listing: the bytes at <code>$83AB</code> are <code>' + h2(op) + ' ' + h2(off) + '</code>' +
        (op === 0x10 ? ', a BPL back ' + (0x83AD - to) + ' bytes to <code>' + h4(to) + '</code>, the compare. The load is at <code>$8397</code>.' : '.');
    }
    setThrow(thrown, false);
    go(0);
    onResize(cv, drawHist);
  }

  function mount(root, opts) {
    const base = (opts && opts.base) || '';
    const r = root || document;
    const checks = r.querySelector('#wl-dice-checks'), attacks = r.querySelector('#wl-dice-attacks'), ranger = r.querySelector('#wl-rr');
    const note = (el, msg) => { const n = el && el.querySelector('.wl-dice-note'); if (n) n.textContent = msg; };
    const haveC64 = !!(globalThis.C64 && globalThis.C64.load);
    const jobs = [];
    if (checks || attacks) {
      if (!haveC64) { note(checks, 'This widget needs the site’s c64.js, which did not load.'); note(attacks, 'This widget needs the site’s c64.js, which did not load.'); }
      else {
        note(checks, 'Loading the game’s tables…'); note(attacks, 'Loading the game’s tables…');
        jobs.push(load(base).then(D => {
          note(checks, ''); note(attacks, '');
          if (checks) mountChecks(checks, D);
          if (attacks) mountAttacks(attacks, D);
        }).catch(e => { note(checks, 'Could not load the game’s tables: ' + e.message); note(attacks, 'Could not load the game’s tables: ' + e.message); }));
      }
    }
    if (ranger) {
      const start = img => { try { mountRanger(ranger, img); } catch (e) { note(ranger, 'The widget failed: ' + e.message); } };
      if (haveC64) jobs.push(C64.load(base + 'parts/ranger/listing.json').then(start, () => start(null)));
      else start(null);
    }
    return Promise.all(jobs);
  }

  const api = {
    A, load, fromImages, randomByte, browserSource, sequenceSource, random1ToA, rollD6, roll2d6Open, rollD6sPlus,
    target15Plus5x, addClamped, addExperience, skillLevel, skillRollTotal, skillCheck, skillImproveRoll, attributeCheck,
    isRanged, item, itemClass, weaponSlot, weaponItem, weaponSkillBonus, weaponUseRounds, isConscious, memberReach, memberHitRoll,
    weaponRangeKind, rangeTarget, distance, attributeBonus, weaponDamageRoll, weaponDamage, monsterArmourRoll,
    armourAbsorb, autoFireDice, burstHits, npcFireMode, firesBursts,
    pAtLeast, pExactly, openSurvivalFrom, pAtLeastGame, GAME_PAIRS, GAME_DIE, checkOdds, learnOdds, hitOdds, diceSum, damageOdds, hitsOdds, engineMessage, singular,
    rangerRoll, bestThree, rangerThrow, rangerTable, mount,
  };
  globalThis.WLDice = api;
})();
