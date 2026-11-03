'use strict';
// A player for the tests: at each read of the controls ($B0C8) or of the keyboard (the ROM's
// KEY-SCAN, $028E; the wait for any key, $6B08) it looks at the game's memory and at which loop is
// reading, and holds the keys a player would: the cursor walked onto a unit of its side that has
// action points and fire pressed; the menu's line chosen; the unit walked and turned and its menu
// opened; the turn ended when its units are spent. Seeded, so a run is the same each time.
// In the shop it buys now and then, placing its units it walks the cursor to the nearest of its
// side's squares for placing, and between turns it mostly plays on.
//   const bot = require('./bot.js'); bot.attach(machine, seed);
// attach(m, seed, { hooks: false }) installs nothing and gives m.bot.decide(), which holds the keys
// for the read the machine is stopped at ($B0C8, $028E or $6B08), for a lockstep that sets the
// input where the game and the port stand at the same place.
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
// the first square of the shortest way over the map (80 x 50 from $D6BF) from unit me to any of
// the units in foes, by the terrain a unit of kind k can cross (the scenario's table at ($B726),
// 12 bytes a terrain, the cost for a unit whose $04 is k at +k, $FF none); objects and units
// are crossed.
function path(M, me, foes, k) {
  const W = 80, H = 50, map = 0xD6BF, ter = M[0xB726] | M[0xB727] << 8;
  const open = (r, c) => {
    let a = M[map + W * r + c];
    if (a >= 0x8C) return false;                     // a unit in the way
    if (a >= 0x6E) {                                 // an object: the floor under it
      const list = M[0xB72A] | M[0xB72B] << 8;
      for (let i = 0; i < (M[0xB639] || 256); i++) {
        const e = list + 6 * i & 0xFFFF;
        if (M[e] && !M[e + 5] && M[e + 1] === r && M[e + 2] === c) { a = M[e + 3]; break; }
      }
      if (a >= 0x6E) return true;
    }
    // a door that opens (the terrain's $08 is 1) is a way through
    return M[ter + 12 * a + k & 0xFFFF] !== 0xFF || M[ter + 12 * a + 8 & 0xFFFF] === 1;
  };
  const goal = new Set(foes.map(u => u.row * W + u.col));
  const from = new Int32Array(W * H).fill(-1);
  const start = me.row * W + me.col;
  from[start] = start;
  const q = [start];
  for (let i = 0; i < q.length; i++) {
    const p = q[i], r = p / W | 0, c = p % W;
    if (goal.has(p) && p !== start) {
      let x = p;
      while (from[x] !== start) x = from[x];
      return { row: x / W | 0, col: x % W };
    }
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if ((!dr && !dc) || rr < 0 || cc < 0 || rr >= H || cc >= W) continue;
      const n = rr * W + cc;
      if (from[n] >= 0 || (!goal.has(n) && !open(rr, cc))) continue;
      from[n] = p;
      q.push(n);
    }
  }
  return null;
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
  // whether the return address a is among the first words on the stack: which loop is reading
  const under = a => { for (let i = 0; i < 24; i++) if ((M[m.cpu.sp + 2 * i & 0xFFFF] | M[m.cpu.sp + 2 * i + 1 & 0xFFFF] << 8) === a) return true; return false; };
  const me = () => { const ix = M[0x5D33] | M[0x5D34] << 8; return { ix, u: units(M).find(u => 0xD39F + 40 * u.n === ix) }; };
  // the enemies the selected unit has in sight: $5D59 of them listed from $5CA0 by their number
  const seen = () => { const out = []; for (let i = 0; i < M[0x5D59] && i < 20; i++) { const n = M[0x5CA0 + i] - 0x8C; const u = units(M).find(v => v.n === n); if (u && u.alive) out.push(u); } return out; };
  const front = ix => {
    const f = M[ix + 0x21], d = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]][f & 7];
    const t = 0x5C50 + 4 * ((ix - 0xD39F) / 40);
    const r = M[t + 1] + d[0], c = M[t + 2] + d[1];
    if (r < 0 || c < 0 || r >= 50 || c >= 80) return null;
    const a = M[0xD6BF + 80 * r + c], ter = M[0xB726] | M[0xB727] << 8;
    return { a, type: a < 0x6E ? M[ter + 12 * a + 8 & 0xFFFF] : -1 };
  };
  let fired = 0, blocked = 0;
  const controls = () => {
    const at = caller();
    toggle ^= 1;
    if (at === 0x6A83 || at === 0x66F4) return hold();       // waitRelease, the auto-repeat
    if (at === 0x6223) {                                       // aiming: the crosshair on the nearest enemy in sight
      const foes = seen();
      if (!foes.length || fired) return toggle ? hold('fire') : hold();
      const c = cursor();
      const foe = foes.reduce((a, b) => (Math.abs(b.row - c.row) + Math.abs(b.col - c.col) < Math.abs(a.row - c.row) + Math.abs(a.col - c.col) ? b : a));
      const ks = toward(c, foe);
      if (!ks.length) return toggle ? hold('fire') : hold();
      return hold(...ks);
    }
    if (under(0xA41C)) {                                      // placing a unit: to the nearest square of the side's
      const c = cursor(), side = M[0xB712], codes = [];
      for (let k = 0; k < 6; k++) if (M[0xB65F + 3 * k] === side) codes.push(M[0xB65E + 3 * k]);
      let best = null, bd = 1e9;
      for (let r = 0; r < 50; r++) for (let q = 0; q < 80; q++) {
        if (!codes.includes(M[0xD6BF + 80 * r + q])) continue;
        const d = Math.max(Math.abs(r - c.row), Math.abs(q - c.col)) + rnd() * 2;
        if (d < bd) { bd = d; best = { row: r, col: q }; }
      }
      const ks = best ? toward(c, best) : [];
      if (!ks.length) return toggle ? hold('fire') : hold();
      return hold(...ks);
    }
    if (at === 0x61F5) {                                       // cursor mode
      const side = M[0xB712];
      const mine = units(M).filter(u => u.side === side && u.alive && u.ap > 0);
      plan = plan && mine.find(u => u.n === plan.n);
      if (!plan) plan = mine.length && rnd() < 0.9 ? pick(mine) : null;
      if (!plan) { endWish = 1; return toggle ? hold('fire') : hold(); }
      endWish = 0;
      const ks = toward(cursor(), plan);
      if (!ks.length) return toggle ? hold('fire') : hold();
      return hold(...ks);
    }
    if (at === 0x68CE) {                                       // a menu
      const n = M[0x5D2C], cur = M[0x5D2B], list = Array.from(M.subarray(0x5B00, 0x5B00 + n));
      let want = list.indexOf(0);
      if (under(0x8ECE)) {                                     // the shots: snap, aimed or auto; then out
        want = fired ? list.indexOf(5) : [1, 0, 2].map(x => list.indexOf(x)).find(x => x >= 0);
        if (want === undefined || want < 0) want = list.indexOf(5);
        if (cur === want && toggle) { if (list[want] <= 3) fired = 1; else fired = 0; }
      } else if (under(0x79D0) || list.includes(12)) {         // the unit's menu: open a door, fire
        const { ix } = me();
        if (list.includes(7)) want = list.indexOf(7);
        else if (list.includes(1) && seen().length && M[ix + 0x24]) { want = list.indexOf(1); fired = 0; }
      } else if (endWish && list.includes(4)) want = list.indexOf(4);
      if (list.length === 2 && list[0] === 0 && list[1] === 1 && M[0x5B00] === 0) want = endWish ? 1 : rnd(2);
      if (want < 0) want = rnd(n);
      if (cur === want) return toggle ? hold('fire') : hold();
      return toggle ? hold(want < cur ? 'up' : 'down') : hold();
    }
    if (at === 0x6CEC) {                                       // a unit selected
      // mostly: turn to face the nearest enemy and walk at it (into close combat when it is next
      // to it); now and then a random way, to get round walls
      const ix = M[0x5D33] | M[0x5D34] << 8, side = M[0xB712];
      const me = units(M).find(u => 0xD39F + 40 * u.n === ix);
      if (blocked) { blocked = 0; return toggle ? hold(pick(['right', 'left'])) : hold(); }
      const fr = front(ix);
      if (fr && fr.type === 1 && rnd() < 0.9) return toggle ? hold('fire') : hold();   // a door: its menu
      if (seen().length && M[ix + 0x17] && M[ix + 0x24] && M[ix + 6] > 8 && rnd() < 0.7) return toggle ? hold('fire') : hold();
      const foes = units(M).filter(u => u.side !== side && u.alive);
      if (me && foes.length && rnd() < (o.hunt === undefined ? 0.8 : o.hunt)) {
        const step = path(M, me, foes, M[ix + 4]);
        if (!step) return hold(pick(['up', 'right', 'left']));
        const dr = step.row - me.row, dc = step.col - me.col;
        const want = [[7, 0, 1], [6, -1, 2], [5, 4, 3]][dr + 1][dc + 1];
        const face = M[ix + 0x21];
        if (want < 0 || face === want) return toggle ? hold('up') : hold();
        const right = (want - face + 8) % 8;
        return toggle ? hold(right <= 4 ? 'right' : 'left') : hold();
      }
      const r = rnd();
      if (r < 0.04) return hold('fire');
      if (r < 0.55) return toggle ? hold('up') : hold();
      if (r < 0.62) return toggle ? hold('down') : hold();
      if (r < 0.75) return toggle ? hold('right') : hold();
      if (r < 0.88) return toggle ? hold('left') : hold();
      return hold();
    }
    if (under(0x9DB4)) {                                      // the shop: buy now and then, then done
      const r = rnd(), line = M[0x5D2B];
      if (r < 0.04) return toggle ? hold('fire') : hold();
      if (!line) return toggle ? hold(r < 0.5 ? 'right' : r < 0.6 ? 'left' : 'down') : hold();
      return toggle ? hold(r < 0.55 ? 'right' : r < 0.65 ? 'left' : r < 0.85 ? 'down' : 'up') : hold();
    }
    if (at === 0xA287) return rnd() < 0.5 ? hold('fire') : hold();   // the menu between turns: play on
    // any other wait: fire now and then, and a way
    const r = rnd();
    if (r < 0.3) return hold('fire');
    if (r < 0.5) return hold(pick(['up', 'down', 'left', 'right']));
    return hold();
  };
  const keyboard = () => {
    const at = caller();
    if (at === 0x6A77) return hold();                          // waitRelease's KEY-SCAN
    // the menus before play: a number, or nothing, by turns; o.key(under, M) may name the key
    toggle ^= 1;
    if (o.key) { const k = o.key(under, M, rnd); if (k !== undefined) return toggle && k ? hold(k) : hold(); }
    return toggle ? hold(pick(o.numbers || ['1', '4', '1', '1'])) : hold();
  };
  const wait = () => { toggle ^= 1; if (toggle) hold('fire'); else hold(); };
  const blockedHook = () => { blocked = 1; };
  m.bot = {
    decide: (mm = m) => {
      const pc = mm.cpu.pc;
      if (pc === 0xB0C8) controls(); else if (pc === 0x028E) keyboard(); else if (pc === 0x6B08) wait();
    },
  };
  {
    const prevB = m.hooks[0x7EFC];
    m.hooks[0x7EFC] = mm => { if (mm === m) blockedHook(); return prevB ? prevB(mm) : false; };
  }
  if (o.hooks === false) return m;
  const prevC = m.hooks[0xB0C8], prevK = m.hooks[0x028E];
  m.hooks[0xB0C8] = mm => { controls(); return prevC ? prevC(mm) : false; };
  m.hooks[0x028E] = mm => { keyboard(); return prevK ? prevK(mm) : false; };
  // a step the unit could not make (message $14, $7EFC): the next move turns it (above)
  const prevW = m.hooks[0x6B08];
  m.hooks[0x6B08] = mm => { wait(); return prevW ? prevW(mm) : false; };
  return m;
}
module.exports = { attach, units };
