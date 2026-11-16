/* fight/fight.js */
// Wasteland (C64): a fight on the game's own code. Nothing here is a port. The page loads the
// engine's, the game's and one map's listing.json (the bytes the Source tab shows), lays them over
// each other as they lie in the machine, and runs the game's routines on the kit's 6502
// (../../lib/cpu6502.js): the encounter scan, the placing of the groups, their plans, the battle
// round with its four passes, the write-back, the groups' moves, the clock and the health tick.
// Three things are stood in for, since a page has no screen, keyboard or disk drive of the C64's:
// - random_byte ($24E3, engine) takes its bytes from the caller's source in place of the raster
//   line and CIA 1's timer;
// - the two routines that put a glyph on the screen (buffer_char $1FEA, draw_char_advance $1F86)
//   hand the character to this file, and the routines that draw, scroll or wait for a key return
//   at once, so the game's text arrives as text;
// - enter_map ($25BD) returns at once: the map is already in memory.
// The engine's listing is a snapshot of play, so the four Rangers in it (records 1 to 4 at $F500)
// are the party. test_combat.js runs this block in node and holds the page's claims to it.
const WLFight = (function () {
  'use strict';
  const A = {
    // engine
    randomByte: 0x24E3, bufferChar: 0x1FEA, drawChar: 0x1F86, flushLine: 0x1FFB, newline: 0x20F9,
    // draw_buffered_line, wait_return, ctl_return_prompt, text_window_open, clear_window, clear_to_eol,
    // speed_keys, roster_show and the three roster_line entries
    silent: [0x200C, 0x2501, 0x1FC3, 0x12B0, 0x22A9, 0x2265, 0x253A, 0x17CA, 0x1622, 0x1625, 0x1628],
    enterMap: 0x25BD, mapSquare: 0x042B, alterSquare: 0x042E,
    // game
    selectParty: 0x9C17, scan: 0x94CC, place: 0x936E, measure: 0xBAEC, plan: 0x83D7,
    battleRound: 0xB867, enterPartyMap: 0xA601, writeBack: 0xB9F2, moveGroups: 0x872D,
    advanceClock: 0xAF32, healthTick: 0xB795, monstersFire: 0x9C65,
    memberTakesDamage: 0xA85B, monsterShot: 0x9CEA,
    // memory
    records: 0xF400, orders: 0xF438, args: 0xF440, groups: 0xEE00, positions: 0x5B4F, plans: 0xF3EC,
  };
  const ORDER = { none: 0, hire: 1, attack: 2, weapon: 3, run: 4, evade: 5, load: 6, use: 7 };

  // o: { engine, game, map } as C64.load gives them, CPU (C64Cpu.CPU), random() giving a byte,
  // size (1 to 4 Rangers)
  function create(o) {
    const m = new Uint8Array(0x10000);
    for (const L of [o.engine, o.game, o.map]) for (let a = 0; a < 0x10000; a++) if (L.has[a]) m[a] = L.ram[a];
    const hdr = o.map.byName.get('map_record'), size = o.size || 4;
    const mapN = o.mapNumber;
    const F = { m, size, text: '', steps: 0, random: o.random };
    const cpu = new o.CPU(m), rts = c => { c.rts(); };
    const glyph = c => { F.text += String.fromCharCode(c.a & 0x7F); c.rts(); };
    const line = c => { F.text += '\n'; c.rts(); };
    const hooks = { [A.randomByte]: c => { c.a = F.random() & 0xFF; c.rts(); }, [A.bufferChar]: glyph, [A.drawChar]: glyph,
      [A.flushLine]: line, [A.newline]: line, [A.enterMap]: rts };
    for (const a of A.silent) hooks[a] = rts;
    // what a caller may watch, without changing anything: a blow about to land on member Y
    // (member_takes_damage) and a monster's shot being aimed (the call of monster_range_target at
    // $9CEA)
    F.seen = { blows: [], shots: 0 };
    hooks[A.memberTakesDamage] = c => { F.seen.blows.push({ member: c.y, con: F.con(c.y) }); };
    hooks[A.monsterShot] = () => { F.seen.shots++; };
    const call = (at, regs, max) => { F.steps += cpu.call(at, regs || {}, { hooks, maxSteps: max || 3e6 }); return cpu; };
    F.call = call; F.hooks = hooks;
    // what entering the map leaves in zero page (enter_map $25BD-$25EA)
    m[0x09] = m[0x91] = m[0x8D] = mapN; m[0x61] = hdr & 0xFF; m[0x62] = hdr >> 8;
    m[0x55] = m[0x56] = m[hdr + 0x2C]; m[0x63] = 0xFF; m[0xD2] = 0; m[0x54] = 0x13; m[0x59] = 9; m[0x5A] = 4;
    // one party, the listing's Rangers 1 to size
    m.fill(0, A.records, A.records + 56);
    for (let i = 1; i <= size; i++) m[A.records + i] = i;
    for (let r = size + 1; r <= 7; r++) m.fill(0, A.records + 256 * r, A.records + 256 * r + 256);
    m[0x07] = size; m[0x08] = 0; m[0x0A] = size; m[0x0B] = 0;
    F.width = m[0x55];
    const rec = i => A.records + 256 * i;
    F.rec = rec;
    F.name = i => { let s = ''; for (let a = rec(i); m[a]; a++) s += String.fromCharCode(m[a] & 0x7F); return s; };
    F.con = i => { const v = m[rec(i) + 0x1D] | m[rec(i) + 0x1E] << 8; return v > 0x7FFF ? v - 0x10000 : v; };
    F.setCon = (i, v) => { m[rec(i) + 0x1D] = v & 0xFF; m[rec(i) + 0x1E] = (v >> 8) & 0xFF; };
    F.maxCon = i => m[rec(i) + 0x1B] | m[rec(i) + 0x1C] << 8;
    F.setMaxCon = (i, v) => { m[rec(i) + 0x1B] = v & 0xFF; m[rec(i) + 0x1C] = (v >> 8) & 0xFF; };
    F.cons = () => { const out = []; for (let i = 1; i <= size; i++) out.push(F.con(i)); return out; };
    F.take = () => { const t = F.text; F.text = ''; return tidy(t); };
    F.look = () => { const s = F.seen; F.seen = { blows: [], shots: 0 }; return s; };
    F.square = (x, y) => { call(A.mapSquare, { x, y }); return { cls: cpu.a, num: cpu.x }; };
    F.place = (x, y) => { m[0x57] = x; m[0x58] = y; m[A.records + 8] = x; m[A.records + 9] = y; m[A.records + 10] = mapN; call(A.selectParty, { a: 0 }); };
    F.encounterSquare = n => {
      for (let y = 0; y < F.width; y++) for (let x = 0; x < F.width; x++) { const s = F.square(x, y); if ((s.cls === 3 || s.cls === 15) && s.num === n) return { x, y }; }
      return null;
    };
    F.encounterRecord = n => o.map.byName.get('enc_' + String(n).padStart(2, '0'));
    // the change the game makes to an encounter's square when its group is wiped out (group_write_back
    // $BA2A: alter_square with the record's pair at +$0A)
    F.wipeOut = n => {
      const sq = F.encounterSquare(n), r = F.encounterRecord(n), keep = [m[0x5F], m[0x60]];
      m[0x5F] = r & 0xFF; m[0x60] = r >> 8;
      call(A.alterSquare, { a: 0x0A, x: sq.x, y: sq.y });
      m[0x5F] = keep[0]; m[0x60] = keep[1];
    };
    // the squares the scan has recorded for the party: x, y, map, distance in feet
    F.positions = () => { const out = []; for (let i = 0; i < 4; i++) { const a = A.positions + 4 * i; if (m[a] || m[a + 1]) out.push({ x: m[a], y: m[a + 1], feet: m[a + 3] }); } return out; };
    F.group = g => {
      const a = A.groups + 94 * g, out = { g, used: m[a] !== 0, x: m[a], y: m[a + 1], feet: m[a + 3], plan: m[A.plans + g], lines: [] };
      if (!out.used) return out;
      const sq = F.square(m[a], m[a + 1]), r = F.encounterRecord(sq.num), names = o.map.byName, ram = m;
      out.enc = sq.num;
      for (let l = 0; l < 3; l++) {
        const b = a + 4 + 30 * l, type = m[r + 3 + 2 * l] & 0x7F, hp = [];
        for (let i = 0; i < 10; i++) { const v = m[b + 2 * i] | m[b + 2 * i + 1] << 8; if (v) hp.push(v); }
        let name = '';
        if (type) { const at = names.get('monster_name_' + String(type).padStart(2, '0')); if (at !== undefined) for (let p = at; (ram[p] & 0x7F) >= 0x20; p++) name += String.fromCharCode(ram[p] & 0x7F); }
        out.lines.push({ type, name, hp });
      }
      return out;
    };
    F.groups = () => [0, 1, 2, 3].map(F.group).filter(g => g.used);
    // the start of a round, as encounter does it ($B237-$B243): scan, place, measure, plan
    F.setup = () => { call(A.selectParty, { a: 0 }); call(A.scan); const found = !cpu.c; call(A.place); call(A.measure); call(A.plan); return { found, text: F.take() }; };
    F.orders = list => { for (let i = 1; i <= size; i++) { const q = list[i - 1] || [0, 0]; m[A.orders + i] = q[0]; m[A.args + i] = q[1]; } };
    // One round. orders is [[order, argument], ...] by Ranger, or a function that is given the
    // groups once they are placed and returns that list. An Attack's argument is the line it aims
    // at, 3 x group + line, with the fire mode in bits 6-7. Returns the game's text; hung is true
    // when battle_round had not returned after `max` instructions (a round takes about 300,000
    // at most).
    F.round = (orders, max) => {
      const out = { hung: false, over: false };
      out.intro = F.setup().text;
      out.groups = F.groups();
      F.orders(typeof orders === 'function' ? orders(out.groups) : orders);
      try { call(A.battleRound, {}, max || 3e6); } catch (e) { if (!/step limit/.test(String(e.message))) throw e; out.hung = true; out.text = F.take(); return out; }
      out.text = F.take();
      call(A.enterPartyMap); call(A.selectParty, { a: 0 }); call(A.writeBack); call(A.moveGroups);
      out.moves = F.take();
      call(A.scan); out.over = !!cpu.c;
      call(A.advanceClock); call(A.healthTick); F.take();
      return out;
    };
    // one step's worth of time on this map (advance_clock $AF32, which runs health_tick $B795
    // whenever the low four bits of the count $D2 come to 0); led is false for a Ranger whose
    // party is not the one being led ($08 names another party)
    F.step = led => { m[0x08] = led ? 0 : 1; call(A.advanceClock); m[0x08] = 0; };
    F.unitsAStep = m[hdr + 0x36];
    F.save = () => m.slice();
    F.load = keep => { m.set(keep); F.text = ''; };
    return F;
  }
  // the game prints a count and a name at set columns; as text they run together
  function tidy(t) {
    return t.replace(/\n+/g, '\n').replace(/^ ?(\d+)(?=[A-Z])/gm, '$1 ').replace(/[ \t]+\n/g, '\n').trim();
  }
  // a source of random bytes from a seed, for a run that can be had again
  function seeded(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s & 0xFF; };
  }
  return { create, seeded, ORDER, A };
})();
// end of fight/fight.js
