'use strict';
// A player for the tests: at each read of the controls ($B0C8) or of the keyboard (the ROM's
// KEY-SCAN, $028E; the wait for any key, $6B08) it looks at the game's memory and at which loop is
// reading, and holds the keys a player would: the cursor walked onto a unit of its side that has
// action points and fire pressed; the menu's line chosen; the unit walked and turned and its menu
// opened; the turn ended when its units are spent. Seeded, so a run is the same each time.
//   const bot = require('./bot.js'); bot.attach(machine, seed);
const lib = require('./lib.js');

const CONTROLS = { up: 'Q', down: 'A', left: 'O', right: 'P', fire: 'SPACE' };
function units(M) {
  const out = [];
  for (let n = 0; n < 20; n++) {
    const t = 0x5C50 + 4 * n, ix = 0xD39F + 40 * n;
    if (M[t] === 3) continue;
    out.push({ n, side: M[t], row: M[t + 1], col: M[t + 2], ap: M[ix + 6], alive: M[ix + 8] !== 0 });
  }
  return out;
}
function attach(m, seed = 1, o = {}) {
  const rnd = lib.makeRnd(seed);
  const M = m.ram;
  let toggle = 0, plan = null, endWish = 0;
  const hold = (...keys) => { m.releaseAll(); m.joy = 0; for (const k of keys) m.press(CONTROLS[k] || k); };
  const caller = () => M[m.cpu.sp] | M[m.cpu.sp + 1] << 8;
  const cursor = () => ({ row: M[0x5CFC] + M[0x5D11], col: M[0x5CFD] + M[0x5D12] });
  const toward = (from, to) => {
    const ks = [];
    if (to.row < from.row) ks.push('up'); else if (to.row > from.row) ks.push('down');
    if (to.col < from.col) ks.push('left'); else if (to.col > from.col) ks.push('right');
    return ks;
  };
  const pick = list => list[rnd(list.length)];
  m.botLog = [];
  const controls = () => {
    const at = caller();
    toggle ^= 1;
    if (at === 0x6A83 || at === 0x66F4) return hold();       // waitRelease, the auto-repeat
    if (at === 0x61F5) {                                       // cursor mode
      const side = M[0xB712];
      const mine = units(M).filter(u => u.side === side && u.alive && u.ap > 0);
      if (!plan || !mine.some(u => u.n === plan.n)) plan = mine.length && rnd() < 0.9 ? pick(mine) : null;
      if (!plan) { endWish = 1; return toggle ? hold('fire') : hold(); }
      endWish = 0;
      const ks = toward(cursor(), plan);
      if (!ks.length) return toggle ? hold('fire') : hold();
      return hold(...ks);
    }
    if (at === 0x68CE) {                                       // a menu
      const n = M[0x5D2C], cur = M[0x5D2B], list = Array.from(M.subarray(0x5B00, 0x5B00 + n));
      let want = list.indexOf(0);
      if (endWish && list.includes(4)) want = list.indexOf(4);
      if (list.length === 2 && list[0] === 0 && list[1] === 1 && M[0x5B00] === 0) want = endWish ? 1 : rnd(2);
      if (want < 0) want = rnd(n);
      if (cur === want) return toggle ? hold('fire') : hold();
      return toggle ? hold(want < cur ? 'up' : 'down') : hold();
    }
    if (at === 0x6CEC) {                                       // a unit selected
      const r = rnd();
      if (r < 0.04) return hold('fire');
      if (r < 0.55) return toggle ? hold('up') : hold();
      if (r < 0.62) return toggle ? hold('down') : hold();
      if (r < 0.75) return toggle ? hold('right') : hold();
      if (r < 0.88) return toggle ? hold('left') : hold();
      return hold();
    }
    // any other wait: fire now and then, and a way
    const r = rnd();
    if (r < 0.3) return hold('fire');
    if (r < 0.5) return hold(pick(['up', 'down', 'left', 'right']));
    return hold();
  };
  const keyboard = () => {
    const at = caller();
    if (at === 0x6A77) return hold();                          // waitRelease's KEY-SCAN
    // the menus before play: a number, or nothing, by turns
    toggle ^= 1;
    return toggle ? hold(pick(o.numbers || ['1', '4', '1', '1'])) : hold();
  };
  const prevC = m.hooks[0xB0C8], prevK = m.hooks[0x028E];
  m.hooks[0xB0C8] = mm => { controls(); return prevC ? prevC(mm) : false; };
  m.hooks[0x028E] = mm => { keyboard(); return prevK ? prevK(mm) : false; };
  const prevW = m.hooks[0x6B08];
  m.hooks[0x6B08] = mm => { toggle ^= 1; if (toggle) hold('fire'); else hold(); return prevW ? prevW(mm) : false; };
  return m;
}
module.exports = { attach, units };
