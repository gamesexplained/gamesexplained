'use strict';
// Holds the Graphics tab's actor drawing (the zk-costume block of graphics.html) against the game's
// own code, run in the kit's 6502 simulator on the listing's memory. For every costume the page
// carries and every animation the costume has, it does what the page does: an actor facing the
// animation's direction starts the three animations the game starts when an actor enters a room
// (its direction plus 4, 8 and 16) and then the one asked for, all through start_animation ($208A);
// then twelve frames are drawn by load_anim_state, draw_limbs ($1DFE) and save_anim_state, as
// draw_actor ($1D8C) draws them. After each frame the sprite column, read back through the game's
// row tables ($D3B1, $D311), the 32 bytes of animation state, the count of limbs still changing
// ($2088) and the sound requests ($FD52) must be what the page's port gives.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
const P = g.run('graphics.html', 'zk-costume', 'zkLimbState', 'zkStartAnimation', 'zkDrawLimbs');
g.lib('cpu6502');
const C64Cpu = globalThis.C64Cpu;
const L = g.listing();
const page = g.read('graphics.html');
const m = /<script type="application\/json" id="zk-costumes">([\s\S]*?)<\/script>/.exec(page);
if (!m) throw new Error('graphics.html has no zk-costumes data');
const COST = JSON.parse(m[1]);
if (COST.length !== 37) throw new Error(`graphics.html carries ${COST.length} costumes, not 37`);
const bytes = (s) => Uint8Array.from(Buffer.from(s, 'base64'));

const AT = 0x9000, FOOT = 124, FRAMES = 12, ACTOR = 1, SLOT = 0;
const FACING = 0xFFDE, COSTUME = 0xFF90, SLOT_OF = 0xFD56, FOOT_ROW = 0xFCDA;
let cases = 0, frames = 0, fatal = 0;
for (const c of COST) {
  const res = bytes(c.b), D = res.subarray(4);
  for (let anim = 0; anim <= D[0]; anim++) {
    const dir = anim & 3, mirror = dir === 0;
    const mem = L.ram.slice();
    mem.set(res, AT);
    mem[0x741B + c.n] = AT & 255; mem[0x73F5 + c.n] = AT >> 8;
    mem[COSTUME + ACTOR] = c.n; mem[FACING + ACTOR] = dir; mem[SLOT_OF + ACTOR] = SLOT; mem[FOOT_ROW + SLOT] = FOOT;
    mem.fill(0xFF, 0xFC5A, 0xFCDA);                    // take_walk_slot's $FF in every limb ($2A01)
    mem[0xE5] = ACTOR; mem[0xC5] = SLOT;
    const cpu = new C64Cpu.CPU(mem, { port: { dir: 0x2F, data: 0x24 } });
    const st = P.zkLimbState();
    for (const a of [4 + dir, 8 + dir, 16 + dir, anim]) {
      mem[0xFC1B] = a;
      cpu.call(0x208A, {}, { maxSteps: 5000 });
      P.zkStartAnimation(D, st, a);
    }
    for (let f = 0; f < FRAMES; f++) {
      mem.fill(0, 0xE000, 0xF000);
      mem[0xFC03] = 0x00; mem[0xFC04] = 0xE0; mem[0xFD52 + SLOT] = 0;
      let mine, theirs = 'ok';
      try { mine = P.zkDrawLimbs(D, st, FOOT, mirror); } catch (e) { mine = e; }
      cpu.call(0x1F30, {}, { maxSteps: 100 });           // costume_pointer
      cpu.call(0x1F4C, {}, { maxSteps: 1000 });          // load_anim_state
      try { cpu.call(0x1DFE, {}, { maxSteps: 200000 }); } catch (e) { theirs = e; }
      if (mine instanceof Error || theirs !== 'ok') {
        // a picture the drawer refuses: the game shows fatal error 7, flashing the border for ever
        if (mine instanceof Error && theirs !== 'ok' && cpu.pc >= 0x196F && cpu.pc <= 0x1974) { fatal++; break; }
        throw new Error(`costume ${c.n} animation ${anim} frame ${f}: the page ${mine instanceof Error ? 'stops: ' + mine.message : 'draws'}, the game ${theirs === 'ok' ? 'draws' : 'stops at $' + cpu.pc.toString(16)}`);
      }
      const where = `costume ${c.n} animation ${anim} frame ${f}`;
      const fields = [['frame', 0xFC3A], ['first', 0xFC42], ['last', 0xFC4A], ['anim', 0xFC52]];
      for (const [k, a] of fields) for (let l = 0; l < 8; l++)
        if (st[k][l] !== mem[a + l]) throw new Error(`${where}: limb ${l}'s ${k} is ${st[k][l]} on the page and ${mem[a + l]} in the game`);
      if (mine.animating !== mem[0x2088]) throw new Error(`${where}: ${mine.animating} limbs changing on the page, ${mem[0x2088]} in the game`);
      if (mine.sound !== mem[0xFD52 + SLOT]) throw new Error(`${where}: ${mine.sound} sound requests on the page, ${mem[0xFD52 + SLOT]} in the game`);
      const want = new Uint8Array(0x1000);
      for (let r = 0; r < 128; r++) {
        const a = 0xE000 + (mem[0xD3B1 + r] | mem[0xD311 + r] << 8) - 0xE000;
        for (let b = 0; b < 3; b++) {
          if (mine.col[r * 3 + b] !== mem[0xE000 + a + b]) throw new Error(`${where}: row ${r} byte ${b} is $${mine.col[r * 3 + b].toString(16)} on the page and $${mem[0xE000 + a + b].toString(16)} in the game`);
          want[a + b] = 1;
        }
      }
      for (let a = 0; a < 0x1000; a++) if (!want[a] && mem[0xE000 + a]) throw new Error(`${where}: the game wrote $${(0xE000 + a).toString(16)}, outside the rows the page draws`);
      cpu.call(0x1F5E, {}, { maxSteps: 1000 });          // save_anim_state
      frames++;
    }
    cases++;
  }
}
console.log(`zk-costume: ${COST.length} costumes, ${cases} animations, ${frames} frames drawn as the game draws them` + (fatal ? `; ${fatal} stop at fatal error 7 in both` : ''));
