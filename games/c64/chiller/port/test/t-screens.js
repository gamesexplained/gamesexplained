'use strict';
// The screens group checked against the game's own code: node games/c64/chiller/port/test/t-screens.js
const { check, kOf, ioOf } = require('./lib.js');
const K = globalThis.ChillerKernal;
const G = ['screens'];
const only = process.argv[2] ? new RegExp(process.argv[2]) : null;
const RECORDS = [0x7000, 0x7080, 0x7100, 0x7180, 0x7200, 0x7300, 0x7380, 0x7400, 0x7480, 0x7500];
const pick = (rnd, a) => a[rnd(a.length)];
const setRecord = (M, rnd) => { const r = pick(rnd, RECORDS); M[0x11] = r & 0xFF; M[0x12] = r >> 8; return r; };

// j_5DA9 ends in a JMP to game_over, which the port throws; a test-only group catches it, and
// the game's side stops at game_over ($2DA0).
(globalThis.ChillerGroups = globalThis.ChillerGroups || {}).screens_test = function (P) {
  P.t_j_5DA9 = function* (r) {
    try { return yield* P.j_5DA9(r); } catch (e) {
      if (e instanceof P.Goto && e.to === 'game_over') return e.r;
      throw e;
    }
  };
};

// The waits on $02FF (card_wait's at $7610, j_5DA9's at $5DA9): the tune's count comes after n
// turns of the loop, on each side.
let nA = 0, nB = 0;
const arm = n => { nA = nB = n; };
const count = M => { if (--nB <= 0) M[0x02FF] = (M[0x02FF] + 1) & 0xFF; };
const waitHooks = at => (MA) => ({ [at]: () => { if (--nA <= 0) MA[0x02FF] = (MA[0x02FF] + 1) & 0xFF; } });
// the KERNAL's tail of the interrupt, on the game's side
// (each of its chip writes a cycle apart, so that the checker's log does not take the two writes
// to $DC00 inside one hook for one instruction's)
const tailHook = (MA, cA) => ({ 0xEA31: cpu => {
  const io = ioOf(cA), w = io.write;
  io.write = (a, v) => { cpu.cycles++; w(a, v); };
  for (const k of ['vic', 'sid', 'cia']) { const f = io[k + 'Write']; io[k + 'Write'] = (r, v) => { cpu.cycles++; f(r, v); }; }
  K.irqTail(kOf(MA, io)); cpu.rts();
} });
const both = (...fs) => (MA, cA) => Object.assign({}, ...fs.map(f => f(MA, cA)));
const cardWait = both(waitHooks(0x7610));
// a number of turns, mostly short, sometimes long enough for the flicker
const turns = rnd => rnd(4) ? 1 + rnd(8) : 1 + rnd(700);
// random's inputs: $CF14 its index into $C000, $A2 the jiffy clock; now and then set so that the
// next call gives 0
function randomState(M, c, rnd) {
  M[0xCF14] = rnd(256); M[0xA2] = rnd(256);
  if (rnd(2)) M[0xA2] = M[0xC000 + ((M[0xCF14] + 1) & 0xFF)];
}
// a card's address: a level record's (+$74), the title card, the forest card
function cardAddr(M, rnd) {
  const k = rnd(12);
  if (k < 10) { const r = RECORDS[k]; return [M[r + 0x74], M[r + 0x75]]; }
  return k === 10 ? [0x00, 0x7C] : [0x0D, 0x5D];
}
// the colour behind show_programmed_by's test ($DA5C white on the title card)
const titleColour = (chips, rnd) => { if (rnd(2)) chips.colour[0x25C] = rnd(2) ? 1 : 0xF1; };
// a common case of a card chain: a record, the tune's count after some turns, random's state
function cardChain(M, chips, rnd) {
  setRecord(M, rnd); randomState(M, chips, rnd); titleColour(chips, rnd);
  if (rnd(8)) M[0x02FF] = 0;
  arm(turns(rnd));
}

// synthetic tunes for the music driver at $0340: commands with their bytes, ending in a step's end
const CMDS = [[0x00, 0], [0x0E, 2], [0x26, 2], [0x3E, 4], [0x56, 0], [0x6B, 1], [0x74, 0], [0x7C, 0], [0x82, 2], [0x91, 4], [0xAC, 4], [0xC7, 0]];
const ENDS = [0x6B, 0x74, 0x7C, 0xC7];
function tune(M, rnd, at, first) {
  let p = at;
  const n = rnd(6);
  const put = (c, k) => { M[p++] = c; for (let i = 0; i < k; i++) M[p++] = rnd(256); };
  if (first !== undefined) put(first, 0);
  for (let i = 0; i < n; i++) { const [c, k] = pick(rnd, CMDS.filter(c => !ENDS.includes(c[0]))); put(c, k); }
  const e = pick(rnd, ENDS); put(e, e === 0x6B ? 1 : 0);
  return p;
}
function musicState(M, rnd) {
  M[0x02] = rnd(3) ? rnd(5) : rnd(256);
  for (const a of [0x02AA, 0x02AC, 0x02AD, 0x02FF]) M[a] = rnd(256);
  M[0xB9] = rnd(256); M[0xBA] = rnd(256);
  // the play position just before a tune: a synthetic one, or one of the game's three
  if (rnd(4)) { const p = rnd(3) ? 0x0340 : 0x0400 - rnd(3); tune(M, rnd, p); M[0xB7] = (p - 1) & 0xFF; M[0xB8] = (p - 1) >> 8; } else {
    const s = pick(rnd, [0x61F8, 0x6A18, 0x6B10]); M[0xB7] = s & 0xFF; M[0xB8] = s >> 8;
  }
}

// a handler entered with the play position on its command byte: its own bytes, then a tune
function handlerState(M, rnd, at) {
  musicState(M, rnd);
  const k = { 0x610E: 2, 0x6126: 2, 0x613E: 4, 0x616B: 1, 0x6182: 2, 0x6191: 4, 0x61AC: 4 }[at] || 0;
  const p = rnd(4) ? 0x0340 : 0x0400 - rnd(k + 1);
  M[0xB7] = (p - 1) & 0xFF; M[0xB8] = (p - 1) >> 8;
  for (let i = 0; i < k; i++) M[p + i] = rnd(256);
  tune(M, rnd, p + k);
  return { y: 0 };
}

const tests = [
  // the copier
  { name: 'copy_block', range: [0x2A80, 0x2AAC], setup: (M, c, rnd) => {
    const k = rnd(5);
    if (k === 0) return { x: 0xBF, y: 0x5B };
    if (k === 1) return { x: 0xC0, y: 0x56 };
    if (k === 2) { const x = 2 * rnd(5); M[0x7FE4] = M[0x7FE8 + x]; M[0x7FE5] = M[0x7FE9 + x]; return { x: 0xE0, y: 0x7F }; }
    if (k === 3) { const r = RECORDS[rnd(5)] + 6 * rnd(2); return { x: r & 0xFF, y: r >> 8 }; }
    // a short block into RAM or colour RAM
    const s = 0x4000 + rnd(0x4000), n = 1 + rnd(300), d = rnd(2) ? 0xD800 + rnd(0x300) : 0x0400 + rnd(0x300);
    const e = (s + n) & 0xFFFF;
    [s & 0xFF, s >> 8, e & 0xFF, e >> 8, d & 0xFF, d >> 8].forEach((v, i) => { M[0x0340 + i] = v; });
    return { x: 0x40, y: 0x03 };
  } },
  { name: 'block_copy', range: [0xC29D, 0xC2D7], setup: (M, c, rnd) => {
    const s = rnd(2) ? 0x8400 : 0x4000 + rnd(0x4000), n = 1 + rnd(600), d = rnd(3) ? 0x0400 + rnd(0x300) : 0xD800 + rnd(0x200);
    const e = (s + n) & 0xFFFF;
    [[0xC29E, s & 0xFF], [0xC2A2, s >> 8], [0xC2AE, e & 0xFF], [0xC2B3, e >> 8], [0xC2A6, d & 0xFF], [0xC2AA, d >> 8]].forEach(([a, v]) => { M[a] = v; });
  } },
  { name: 'copy_under_kernal', range: [0x72A4, 0x72B7], setup: (M, c, rnd) => { const r = pick(rnd, RECORDS); return { x: r & 0xFF, y: r >> 8 }; } },
  { name: 's_2CF3', range: [0x2CF3, 0x2CFD], setup: (M, c, rnd) => { const a = rnd(2) ? 0 : rnd(256); return { a, z: a === 0 ? 1 : 0 }; } },
  { name: 's_2F4D', range: [0x2F4D, 0x2F50] },
  // the cards
  { name: 'card_and_border', range: [0x5A41, 0x5A54], hooks: cardWait, poll: count, setup: (M, c, rnd) => { cardChain(M, c, rnd); M[0x5A08] = rnd(2); } },
  { name: 'first_setup', range: [0x5A60, 0x5A6A], setup: (M, c, rnd) => { M[0x45FF] = rnd(2); } },
  { name: 'wait_line16', range: [0x5BB0, 0x5BBE] },
  { name: 'show_level_card', range: [0x5BC7, 0x5BF1], hooks: cardWait, poll: count, setup: cardChain },
  { name: 'draw_logo', range: [0x5C00, 0x5C4B], setup: (M, c, rnd) => { if (rnd(2)) M[0x5BFD] = 0; } },
  // draw_logo's end at $5CAA-$5CC4, which it jumps to
  { name: 'draw_logo', cases: 300, range: [0x5CAA, 0x5CC4] },
  { name: 'show_card', range: [0x5C4F, 0x5C84], setup: (M, c, rnd) => { titleColour(c, rnd); const [x, y] = cardAddr(M, rnd); return { x, y }; } },
  { name: 'logo_next_glyph', range: [0x5C87, 0x5CA9], setup: (M, c, rnd) => { M[0x5BFD] = rnd(7); M[0x5BFF] = rnd(256); } },
  { name: 'logo_reset', range: [0x5CC5, 0x5CD3] },
  { name: 'print_card', range: [0x5CD8, 0x5CFD], setup: (M, c, rnd) => { const [x, y] = cardAddr(M, rnd); return { x, y }; } },
  { name: 'unpack_colours', range: [0x5D20, 0x5D5B], setup: (M, c, rnd) => { const r = pick(rnd, RECORDS); M[0x5D21] = M[r + 0x0C]; M[0x5D23] = rnd(4) ? M[r + 0x0D] : 2 + rnd(0xCC); } },
  { name: 'video_setup', range: [0x5D80, 0x5D95], setup: (M, c, rnd) => { M[0x45FF] = rnd(2); } },
  { name: 'screen_done', range: [0x5D98, 0x5DA7] },
  { name: 't_j_5DA9', entry: 0x5DA9, groups: ['screens', 'screens_test'], range: [0x5DA9, 0x5DB9],
    hooks: both(waitHooks(0x5DA9), () => ({ 0x2DA0: () => true })), poll: count,
    setup: (M, c, rnd) => { if (rnd(8)) M[0x02FF] = 0; arm(turns(rnd)); } },
  { name: 'show_forest_card', range: [0x5E00, 0x5E07], setup: (M, c, rnd) => { titleColour(c, rnd); } },
  { name: 'bank_basic_out', range: [0x5E0A, 0x5E16] },
  { name: 'setup_screen', range: [0x5E19, 0x5FBC], hooks: cardWait, poll: count, setup: (M, c, rnd) => {
    cardChain(M, c, rnd); M[0x5A08] = rnd(2); M[0x4518] = rnd(256);
    return { x: 2 * rnd(10) };
  } },
  { name: 'place_crosses', range: [0x5FC0, 0x5FE6], setup: (M, c, rnd) => { setRecord(M, rnd); M[0x5FDC] = rnd(2) ? 0x0E : 0x0A; return { y: rnd(2) ? 0x5D : 0x67 }; } },
  // the music driver
  { name: 'music_init_filter', range: [0x60A0, 0x60B4] },
  { name: 'music_irq_exit', range: [0x60B5, 0x60C7], hooks: tailHook, setup: (M, c, rnd) => { M[0x02] = rnd(2) ? 3 : rnd(256); M[0x02AC] = rnd(256); } },
  { name: 'music_start', range: [0x60CA, 0x60F4] },
  { name: 'music_irq', range: [0x60F5, 0x61D1], cases: 4000, hooks: tailHook, setup: (M, c, rnd) => {
    musicState(M, rnd); if (rnd(2)) M[0x02] = 0; if (rnd(2)) M[0x02] = 3;
    return { a: rnd(4) ? 0 : rnd(256) };
  } },
  { name: 'music_next_command', range: [0x6100, 0x6108], hooks: tailHook, setup: (M, c, rnd) => { musicState(M, rnd); return { y: 0 }; } },
  { name: 'music_dispatch', range: [0x610B, 0x610B], hooks: tailHook, setup: (M, c, rnd) => {
    const [cmd] = pick(rnd, CMDS); M[0x610C] = cmd; return handlerState(M, rnd, 0x6100 | cmd);
  } },
  { name: 'music_stop', range: [0x61D2, 0x61E8] },
  { name: 'music_fetch', range: [0x61E9, 0x61F1], setup: (M, c, rnd) => { M[0xB7] = rnd(256); M[0xB8] = rnd(0xCE); } },
  // pulled out of the listing below: each command handler entered as music_dispatch would
  ...[['mcmd_note_v1', 0x610E, 0x6123], ['mcmd_note_v2', 0x6126, 0x613B], ['mcmd_note_both', 0x613E, 0x6153],
    ['mcmd_retrigger_both', 0x6156, 0x6168], ['mcmd_set_tempo', 0x616B, 0x6171], ['mcmd_rest', 0x6174, 0x6179],
    ['mcmd_count', 0x617C, 0x617F], ['mcmd_set_waveforms', 0x6182, 0x618E], ['mcmd_set_envelopes', 0x6191, 0x61A9],
    ['mcmd_set_pulse', 0x61AC, 0x61C4], ['mcmd_loop', 0x61C7, 0x61CF]].map(([name, a, b]) => ({
    name, range: [a, b], hooks: tailHook, setup: (M, c, rnd) => handlerState(M, rnd, a) })),
  { name: 'card_apostrophe', range: [0x72E0, 0x72EA], setup: (M, c, rnd) => { titleColour(c, rnd); } },
  { name: 'show_programmed_by', range: [0x72ED, 0x72FF] },
  { name: 'title_flicker', range: [0x7580, 0x75A4], setup: randomState },
  { name: 'set_crosses_needed', range: [0x7600, 0x760B], setup: (M, c, rnd) => { setRecord(M, rnd); return { y: rnd(2) ? 0x71 : rnd(256) }; } },
  { name: 'card_wait', range: [0x7610, 0x763C], cases: 3000, hooks: cardWait, poll: count, setup: (M, c, rnd) => { randomState(M, c, rnd); if (rnd(8)) M[0x02FF] = 0; arm(turns(rnd)); } },
  { name: 'hud_save', range: [0x763F, 0x7653], hooks: cardWait, poll: count, setup: cardChain },
  { name: 'hud_restore', range: [0x7659, 0x7670], hooks: cardWait, poll: count, setup: cardChain },
  { name: 'j_7673', range: [0x7673, 0x767A], setup: (M, c, rnd) => { const a = rnd(2) ? 0x60 + rnd(0x20) : rnd(256); return { a, y: rnd(2) ? 0x50 : rnd(256) }; } },
  { name: 'next_screen', range: [0x7680, 0x76DA], hooks: cardWait, poll: count, setup: (M, c, rnd) => {
    cardChain(M, c, rnd); M[0x5A08] = rnd(2); M[0x4518] = rnd(256);
    return { x: rnd(10) ? 2 * rnd(9) : 0xFE };
  } },
  { name: 'game_over_wait', range: [0x7720, 0x7770], cases: 2000, hooks: cardWait, poll: count, setup: (M, c, rnd) => {
    cardChain(M, c, rnd);
    c.vic[0x20] = rnd(3) ? 0 : rnd(256);
    for (const a of [0x771C, 0x771D, 0x771E]) M[a] = rnd(2) ? 1 : rnd(256);
    return { x: 0 };
  } },
  { name: 'delay', range: [0xC6E7, 0xC6FF], cases: 2000, setup: (M, c, rnd) => { M[0xCF65] = rnd(8) ? rnd(40) : rnd(256); M[0xCF66] = rnd(8) ? rnd(8) : rnd(256); } },
];

let fails = 0;
for (const t of tests) {
  if (only && !only.test(t.name)) continue;
  const r = check(Object.assign({ groups: G, cases: 2000 }, t));
  if (r.fails) fails++;
}
process.exitCode = fails ? 1 : 0;
