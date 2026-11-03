'use strict';
// The spells table's pictures (the block loc-spells, index.html) against the game's own code, run on
// the kit's Z80 from the committed listings, in each of the three scenarios. For each of the 45
// spells, cast_spell ($82D7) runs with the wizard's choices made for it, and the test notes what
// reaches the screen, in order:
//   - a flight: the style set_missile ($B5F7) is given (draw_missile itself is skipped);
//   - a creature: the type create_creature ($83E3) is asked to make;
//   - a potion: the type brew_with ($848A) turns the cauldron into;
//   - ground: the terrain maybe_set_terrain ($7BC4) is asked to put down, by the first wizard;
//   - a burst: draw_hit ($AEC2), with a creature of the target's type beside it that fails its
//     magic resistance;
//   - the sparkle: the spell returns with $5B25 set, which has summon_display ($8436) play it.
// The list must be LOCSpells.shows(s), and the names LOCSpells.name the same as spell_name ($80A0)
// prints.
//   node games/spectrum/lords-of-chaos/test_spells.js
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { memory, call } = require('./port/test/game.js');
const g = game(__dirname);
g.sameBlock('loc-map');
g.sameBlock('loc-gfx');
const { LOCMap } = g.run('index.html', 'loc-map', 'LOCMap');
globalThis.LOCMap = LOCMap;
const { LOCGfx } = g.run('index.html', 'loc-gfx', 'LOCGfx');
globalThis.LOCGfx = LOCGfx;
const { LOCSpells } = g.run('index.html', 'loc-spells', 'LOCSpells');

const RET = (cpu, M) => { cpu.pc = M[cpu.sp] | M[(cpu.sp + 1) & 0xFFFF] << 8; cpu.sp = (cpu.sp + 2) & 0xFFFF; return true; };
const STOP = cpu => { cpu.pc = 0; return true; };
const w16 = (M, a) => M[a] | M[a + 1] << 8;
const show = list => JSON.stringify(list.map(x => x.what + (x.v !== undefined ? ' $' + x.v.toString(16) : '') + (x.style !== undefined ? ' ' + x.style : '')));
const cells = (r0, c0) => {
  const out = [];
  for (let r = r0; r < r0 + 3; r++) for (let c = c0; c < c0 + 3; c++) {
    for (let k = 0; k < 8; k++) out.push(0x4000 + ((r & 0x18) << 8) + ((r & 7) << 5) + (k << 8) + c);
    out.push(0x5800 + 32 * r + c);
  }
  return out;
};
let fails = 0, cases = 0;

for (const n of [1, 2, 3]) {
  for (let s = 0; s < 45; s++) {
    const M = memory(n), seen = [];
    const note = x => { if (!seen.some(y => show([y]) === show([x]))) seen.push(x); };
    const bursts = new Set(), name = LOCSpells.name(M, s);
    const wiz = 0x5B5A + 6 * 4;                   // creature entry 4: the first wizard's, here
    M[0xFF3A] = s; M[0xFF31] = 0; M[0xFF0B] = 3;   // the spell, cast at the ground, at level 3
    M[0x5B11] = 1;                                 // the first wizard's turn
    M[0x5B2F] = 0;                                 // the wizard on the ground
    M[0x5B25] = 0;
    // a square whose terrain the area spells can all take, for the target
    const T = r => 0xD208 + 5 * M[w16(M, 0xD030) + r];
    let at = 0;
    while (at < 1296 && !((M[T(at) + 2] & 0x0F) && (M[T(at) + 2] & 0xF0) && (M[T(at) + 3] & 0x0F) && (M[T(at) + 3] & 0xF0))) at++;
    const row = (at / 36) | 0, col = at % 36;
    // a creature of the same type beside the target, for MAGIC ATTACK to find
    M[wiz] = row; M[wiz + 1] = col; M[wiz + 2] = 0x95; M[wiz + 4] = 1;   // record 1
    M[wiz + 6] = row; M[wiz + 7] = (col + 1) % 36; M[wiz + 8] = 0x95; M[wiz + 10] = 2;   // and another beside it
    M[0x5B55] = row; M[0x5B56] = (col + 2) % 36;   // the caster two squares along, for a short flight
    const sq = w16(M, 0xD030) + at; M[0x5B3B] = sq & 255; M[0x5B3C] = sq >> 8;   // the caster's map square
    M[0x5B50] = 0xC0; M[0x5B51] = 0x5E; M[0x5EC2] = 20;                    // the caster's record: alive
    const hooks = {
      0x63D4: RET,                                                    // clear_screen
      0x865E: (cpu, M) => { M[0xD0D3] = row; M[0xD0D4] = col; cpu.f &= ~1; return RET(cpu, M); }, // pick_spell_target
      0x67A3: (cpu, M) => {                                           // list_objects_here
        M[0xD0DD] = 1;
        if (s < 3) M[0x5B2C] = 0x68 + s;                              // a dragon's potion, for its summons
        else { M[0x5B2C] = 0x67; M[0xD1D5] = M[0x84CE + s - 0x19]; M[0xD1D4] = 0; } // an empty cauldron, the ingredient
        return RET(cpu, M);
      },
      0x90A8: RET,                                                    // list_neighbours_of_selected
      0x830C: (cpu, M) => { cpu.f |= 0x40; cpu.c = 0; cpu.h = 0x5E; cpu.l = 0xC0; return RET(cpu, M); }, // free_record: one is free
      0x83A6: (cpu, M) => { cpu.f |= 0x40; return RET(cpu, M); },     // square_free: the square is free
      0x806F: (cpu, M) => { cpu.f |= 0x40; cpu.ix = 0x5B5A + 6 * 20; return RET(cpu, M); }, // free_entry_after_wizards
      0x83E3: (cpu, M) => { note({ what: 'creature', v: M[0x5B25] }); cpu.f &= ~1; return RET(cpu, M); },
      0x848A: (cpu, M) => { note({ what: 'potion', v: M[0xFF26] }); return false; },
      0x7BC4: (cpu, M) => { note({ what: 'ground', v: M[0x5B10] }); cpu.f &= ~1; return RET(cpu, M); },
      0xB5F7: (cpu, M) => { note({ what: 'flight', style: cpu.a }); return false; },
      0x888F: (cpu, M) => {                                           // creature_at_height: entry 4 on the target
        if ((cpu.h << 8 | cpu.l) === (col << 8 | row)) { cpu.ix = wiz; cpu.a = 4; } else cpu.a = 0xFF;
        return RET(cpu, M);
      },
      0xA737: (cpu, M) => {                                           // random_below: MAGIC ATTACK's victims fail
        cpu.a = w16(M, cpu.sp) === 0x8A5A ? 0xFF : 0;                 // their resistance; elsewhere 0
        return RET(cpu, M);
      },
      0xAEC2: (cpu, M) => { note({ what: 'burst' }); bursts.add(cpu.d << 8 | cpu.e); return RET(cpu, M); },
      0x7202: RET, 0x91CA: RET, 0x6A82: RET,                          // pick_target, wait_release, show_message
      0x798B: RET,                                                    // show_hit, which waits on the interrupt
    };

    try {
      call(M, 0x82D7, {}, { hooks, limit: 50e6 });
      if (M[0x5B25]) seen.push({ what: 'sparkle' });
    } catch (e) { seen.push({ what: 'no return: ' + e.message }); }
    // what the page says against what the game did
    const want = LOCSpells.shows(s);
    cases++;
    if (show(seen) !== show(want)) {
      if (fails++ < 8) console.log(`FAIL scenario ${n}, spell $${s.toString(16)} ${name}: the game shows ${show(seen)}, the page says ${show(want)}`);
    }
    // a flight bursts on its target; MAGIC ATTACK bursts on the goblin beside it as well
    const target = col << 8 | row, beside = ((col + 1) % 36) << 8 | row;
    const where = want.some(x => x.what === 'burst') ? (s === 0x27 ? [target, beside] : [target]) : [];
    if (JSON.stringify([...bursts].sort()) !== JSON.stringify(where.sort())) {
      if (fails++ < 8) console.log(`FAIL scenario ${n}, spell $${s.toString(16)} ${name}: bursts at ${[...bursts].map(x => x.toString(16))}`);
    }
    // the name
    const m = call(memory(n), 0x80A0, { a: s }).a;
    if (m !== LOCSpells.message(s)) {
      if (fails++ < 8) console.log(`FAIL spell $${s.toString(16)}: spell_name gives message $${m.toString(16)}, the page $${LOCSpells.message(s).toString(16)}`);
    }
    // the picture: the first thing shown that is neither a flight nor a burst, as LOCMap.block draws
    // it (test_graphics.js holds that to draw_thing_at), or else the flight's shape (LOCGfx.shape,
    // held there to draw_shape), or nothing
    const P = memory(n), Q = P.slice(), k = want.find(x => x.what !== 'flight' && x.what !== 'burst') || want[0];
    const drew = LOCSpells.draw(P, s, 3, 6);
    if (drew !== !!k && fails++ < 8) console.log(`FAIL spell $${s.toString(16)}: draw says ${drew}`);
    if (k && k.v !== undefined) {
      LOCMap.block(Q, k.v, 3, 6);
      const bad = cells(3, 6).find(a => P[a] !== Q[a]);
      if (bad !== undefined && fails++ < 8) console.log(`FAIL spell $${s.toString(16)}: the picture differs from thing $${k.v.toString(16)} at $${bad.toString(16)}`);
    }
  }
}
console.log(fails ? `FAIL: ${fails} differ (${cases} spells)` : `ok - ${cases} spells, 45 in each scenario, show what the game's routines show, with spell_name's names`);
process.exit(fails ? 1 : 0);
