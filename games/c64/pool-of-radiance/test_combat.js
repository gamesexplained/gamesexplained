#!/usr/bin/env node
// Hold combat.html to the game's own code, run on the kit's 6502 over the committed listings:
// - por-combat, the morale panel and the turning table: porMorale runs morale ($20C1) and hurt_check
//   ($211C) for the page's monsters and allies and gives what the page says of each; BLESS and CURSE,
//   which the block stands in for, are run from effects (kind_bless $A73F, kind_curse $A74F); porTurn
//   runs turn_roll ($252B) and the page's turning figures are GEN's (cleric_figures $239A).
// - the NPCs' table: ADD NPC halves its operand into $6BB8 (dungeon $2756), and each NPC runs at the
//   share the page gives and holds one point above it. Which script adds which NPC with which operand
//   is read from the game's files, which the repository does not hold, so it is not checked here.
// - ANIMATE DEAD's figure (spells $AB76, camp-spells $A9FA), the messages IS TURNED and IS CURSED
//   (combat $24E2, $24F9; SPELLN00's strings in combat-set from $AF00), the starting squares (com-prep
//   $15A3-$15CB run for each facing, as the game has it and with the store at $15C5 made by Y), the
//   long-shot penalty (combat-set range_penalty $695D, missile_leg $6652, the item types' ranges), the
//   surprise round (combat $15FF) and initiative ($0895) with dex_hit_bonus (com-prep $1682), and
//   PENDRAGON's bow on VIEW (the Items tab's porReady, with $6BEC 0 and 2).
// It exits 1 on any difference.
//   node games/c64/pool-of-radiance/test_combat.js
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
const page = fs.readFileSync(path.join(__dirname, 'combat.html'), 'utf8');
const text = page.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
const constant = (name) => eval('(' + page.match(new RegExp('const ' + name + ' = ([\\s\\S]*?);\\n'))[1] + ')');
const says = (s) => check(text.includes(s), 'the page does not say', JSON.stringify(s));
const hex = (m, a, n) => Buffer.from(m.slice(a, a + n)).toString('hex');
const { porMorale, porTurn } = g.run('combat.html', 'por-combat', 'porMorale', 'porTurn');
const C = memory('resident', 'combat', 'tables');
const morale = (c) => porMorale(C.slice(), CPU, Object.assign({ rec: 255, hp: 60, full: 100, side: 1, losses: 55, script: 50, move: 6, fastest: 12, int: 10 }, c));

// --- BLESS and CURSE, which the block stands in for
{
  const E = memory('resident', 'effects');
  const run = (at, v) => { const m = E.slice(); m[0x2B67] = v; const c = new CPU(m, { port: 0x36, io }); c.call(at, {}, { maxSteps: 1e4, hooks: { 0xA9B5: (k) => k.rts(), 0xA9CC: (k) => k.rts() } }); return m[0x2B67]; };
  check(E[0xA74C] === 0x4C && (E[0xA74D] | E[0xA74E] << 8) === 0xA9B5 && E[0xA758] === 0x4C && (E[0xA759] | E[0xA75A] << 8) === 0xA9CC, 'kind_bless and kind_curse end in d20_up and d20_down');
  for (const v of [0, 3, 5, 46, 102, 250]) {
    check(run(0xA73F, v) === Math.max(0, v - 5), 'BLESS on', v, run(0xA73F, v));
    check(run(0xA74F, v) === ((v + 5) & 0xFF), 'CURSE on', v, run(0xA74F, v));
  }
  check(C[0x2142] === 0x8D && C[0x2145] === 0xA2 && C[0x2146] === 0x11 && C[0x2147] === 0x4C && (C[0x2148] | C[0x2149] << 8) === 0x0764, 'morale_event runs event 17 at events_attacker');
}

// --- the morale panel
{
  const MON = constant('MONSTERS'), ALLY = constant('ALLIES'), SCRIPTS = constant('SCRIPTS');
  const kobold = morale({ move: MON[0][1], int: MON[0][2] });
  check(kobold.surrenders && !kobold.runs && kobold.msg === 0x3F && kobold.cond === 0x85, 'a broken, slow kobold surrenders', JSON.stringify(kobold));
  const lizard = morale({ move: MON[2][1], int: MON[2][2] });
  check(!lizard.surrenders && !lizard.runs, 'a broken, slow lizardman fights on', JSON.stringify(lizard));
  const wolf = morale({ move: MON[3][1], int: MON[3][2] });
  check(wolf.runs && !wolf.surrenders, 'a broken wolf runs', JSON.stringify(wolf));
  const even = morale({ move: 12, fastest: 12 });
  check(even.runs, 'one as fast as the party runs');
  for (const s of SCRIPTS) for (let l = 0; l <= 100; l += 5) {
    const r = morale({ script: s, losses: l });
    check((r.runs || r.surrenders) === (l > s), 'script', s, 'losses', l, JSON.stringify(r));
  }
  check(morale({ script: 100, losses: 100, curse: true }).surrenders, 'a cursed monster breaks at 100 when all but a twentieth is lost');
  for (let hp = 1; hp <= 100; hp++) {
    const h = morale({ rec: MON[5][3], hp, losses: 100, script: 0 });
    check(!h.runs && !h.surrenders && h.figures.length === 1 && h.figures[0] === 0, 'HASSAD never hurt at', hp, JSON.stringify(h));
    check(morale({ hp }).figures[0] === 102, 'a monster file of 255 hurt at 102');
  }
  const ally = (i, hp, extra) => morale(Object.assign({ rec: ALLY[i][1], side: 0, hp }, extra));
  for (const hp of [1, 50, 100]) {
    check(ally(3, hp).runs, 'the MAD MAN runs at', hp);
    check(ally(4, hp).runs && ally(4, hp, { rec: 0xFF }).runs, 'a raised party member runs at', hp);
    check(!ally(5, hp).runs && !ally(2, hp).runs, 'a raised monster or DIANE runs at', hp);
  }
  check(ally(0, 46).runs && !ally(0, 47).runs && ally(1, 16).runs && !ally(1, 17).runs, 'the hired WARRIOR at 46, the THEURGIST at 16');
  check(!ally(0, 44, { bless: true }).runs && ally(0, 41, { bless: true }).runs && ally(0, 51, { curse: true }).runs, 'BLESS and CURSE on the WARRIOR');
  check(ally(4, 99, { bless: true }).runs && !ally(4, 100, { bless: true }).runs, 'a blessed raised party member holds only at full');
  says('it runs if it moves as fast as the party\'s fastest member');
  says('it SURRENDERS when its intelligence is 5 or more, and fights on when it is lower');
  says('BLESS takes 5 off both figures for a blessed combatant, and CURSE adds 5');
}

// --- the NPCs, ADD NPC and ANIMATE DEAD
{
  const D = memory('dungeon'), SP = memory('spells'), CS = memory('camp-spells');
  check(hex(D, 0x2756, 6) === '4a09808db86b', 'ADD NPC halves its operand into $6BB8 with bit 7', hex(D, 0x2756, 6));
  const runsAt = (op) => {
    const rec = 0x80 | (op >> 1);
    let at = 0;
    for (let hp = 1; hp <= 100; hp++) if (morale({ rec, side: 0, hp }).runs) at = hp;
    return at === 0 ? 'never' : at === 100 ? 'always' : at + '%';
  };
  const NPCS = constant('NPCS');
  check(page.includes('<table class="cb-tbl" id="cb-npcs">') && NPCS.length === 14, 'the NPCs\' table', NPCS.length);
  for (const [name, , op] of NPCS) {
    const want = op === 0 ? 'always' : op >= 100 ? 'never' : (100 - 2 * (op >> 1)) + '%';
    check(runsAt(op) === want, name, op, runsAt(op), want);
  }
  check(NPCS.filter(([, w]) => w === 'the training hall').map(([, , op]) => op).join() === '50,55,60,65,70,75,80,85', 'the training hall gives 50 + 5 for each hireling');
  const animate = 'a9b2aeb86b3003' + '8a09fe8db86b';
  check(hex(SP, 0xAB76, 13) === animate && hex(CS, 0xA9FA, 13) === animate, 'ANIMATE DEAD sets $B2, or ORs $FE into a party member\'s byte', hex(SP, 0xAB76, 13), hex(CS, 0xA9FA, 13));
  check(SP[0xAB61] === 0x09 && SP[0xAB62] === 0x80 && SP[0xAB63] === 0x8D && SP[0xAB64] === 0x0C && SP[0xAB65] === 0x6C, 'the zombie joins the caster\'s side under the computer');
  says('the same six instructions');
  says('it runs at its first turn in every fight');
}

// --- surrender and experience
{
  const P = memory('post-com');
  check(C[0x2113] === 0xA9 && C[0x2114] === 0x85, 'SURRENDERS sets condition $85');
  check(hex(P, 0x0990, 3) === 'ad3e6e', 'post-com counts shares at $0990');
}

// --- turning
{
  const G = memory('gen'), FIG = constant('FIGURES'), UNDEAD = constant('UNDEAD');
  check(FIG.join() === Array.from(G.slice(0x239A, 0x23A0)).join(), 'cleric_figures', FIG.join());
  const row = (t, f) => { const r = []; for (let d = 1; d <= 20; d++) r.push(porTurn(C.slice(), CPU, f, t, d)); return r; };
  // the table's own rule: below turn_level only a 20 from turn_least_level; then number - 3 a level,
  // types 0 and 1 a point better below 0; -1 to -4 turned, -5 to -12 destroyed, below that more.
  for (const [t] of UNDEAD) for (const f of FIG) {
    const least = C[0x7AD7 + t], lvl = C[0x7AE4 + t], num = C[0x7AF1 + t];
    let want;
    if (f < lvl) want = Array.from({ length: 20 }, (_, d) => (f >= least && d + 1 >= 20 ? 1 : 0));
    else {
      let v = num - 3 * (f - lvl);
      if (v >= 0) want = Array.from({ length: 20 }, (_, d) => (d + 1 >= v ? 1 : 0));
      else { if (t < 2) v++; want = Array(20).fill(v >= -4 ? 1 : v >= -12 ? 2 : 3); }
    }
    check(row(t, f).join('') === want.join(''), 'turning type', t, 'figure', f, row(t, f).join(''));
  }
  check(row(1, 7).every((x) => x === 2) && row(2, 7).every((x) => x === 2), 'a 6th level cleric destroys skeletons and zombies');
  says('A 6th level cleric destroys skeletons and zombies whatever the roll');
  const CS = memory('combat-set');
  const str = (k) => { let a = CS[0xAF00 + k] | CS[0xAF80 + k] << 8, s = ''; while (CS[a]) s += String.fromCharCode(CS[a++]); return s; };
  check(hex(C, 0x24E2, 5) === 'a212' + '20b129', 'a destroyed undead gets report_msg 18', hex(C, 0x24E2, 5));
  check(C[0x24F9] === 0xA2 && C[0x24FA] === 0x09, 'a turned undead gets message 9');
  check(str(0x39 + 18) === 'IS CURSED' && str(0x39 + 9) === 'IS TURNED', 'messages 18 and 9', str(0x39 + 18), str(0x39 + 9));
  let destroy = false;
  for (let k = 1; k < 0x80; k++) if (/DESTR/.test(str(k))) destroy = true;
  check(!destroy, 'SPELLN00 has a message that says destroyed');
  says('message 18 of the spell file, SPELLN00, which reads IS CURSED');
}

// --- the starting squares on the wilderness map
{
  const M = memory('resident', 'com-prep');
  check(M[0x15C5] === 0x9D && M[0x15AE] === 0x99, 'the monsters\' store is by X and the party\'s by Y');
  const run = (face, fixed) => {
    const m = M.slice();
    if (fixed) m[0x15C5] = 0x99;
    m.fill(0, 0x17EC, 0x1800);
    m[0x49C2] = face;
    const c = new CPU(m, { port: 0x36, io });
    c.call(0x15B5, {}, { maxSteps: 1e4, hooks: { 0x15CC: () => true } });
    return { mine: Array.from(m.slice(0x17F0, 0x17F4)) };
  };
  const T = (f) => Array.from(M.slice(0x15DD + 4 * f, 0x15E1 + 4 * f));
  for (let f = 0; f < 4; f++) {
    const o = (f + 2) & 3, game = run(f, false).mine, meant = run(f, true).mine;
    check(meant.join() === T(o).slice().reverse().join(), 'the table means facing', o, 'for', f, meant.join());
    check(game.join() === (o === 0 ? T(0).join() : '0,0,0,0'), 'the game gives facing', f, game.join());
  }
  const S = constant('START');
  const gap = (a, b) => Math.min(...a.flatMap(([x, y]) => b.map(([u, v]) => Math.max(Math.abs(x - u), Math.abs(y - v)))));
  const gaps = [0, 1, 2, 3].map((f) => [gap(S.P[f], S.G[f]), gap(S.P[f], S.F[f])]);
  check(JSON.stringify(gaps) === '[[6,11],[5,10],[16,11],[5,11]]', 'the gaps', JSON.stringify(gaps));
  check(S.P.every((p) => p.length === 6) && S.G.every((p) => p.length === 12) && S.F.every((p) => p.length === 12), 'six characters and twelve goblins');
  const mid = (L) => L.every(([x, y]) => x >= 20 && x <= 32 && y >= 8 && y <= 17);
  check(mid(S.G[0]) && mid(S.G[1]) && mid(S.G[3]) && !mid(S.G[2]), 'the goblins start in the middle three times in four');
  says('Three times in four they start in the middle square, 5 or 6 squares from the party instead of 10 or 11');
  says('With the party facing south they start 16 squares away instead of 11');
}

// --- the long-shot penalty
{
  const M = memory('resident', 'combat-set'), T = memory('tables');
  check(hex(M, 0x6652, 5) === 'a9808d6403', 'missile_leg sets $0364 to 128', hex(M, 0x6652, 5));
  const pen = (range, dist) => { const m = M.slice(); m[0x2B42] = 1; m[0x0364] = range; m[0x034F] = dist; const c = new CPU(m, { port: 0x36, io }); c.call(0x695D, {}, { maxSteps: 1e4 }); return (m[0x2B7B] << 24) >> 24; };
  // a range reaches $6D9D, which shooting needs, only for a weapon (class 0) whose flags have bit 3
  // (resident find_readied, $3931-$3943); the types the game's items have are in the Items tab's data
  const items = fs.readFileSync(path.join(__dirname, 'items.html'), 'utf8');
  const D = JSON.parse(items.match(/<script type="application\/json" id="por-items">([\s\S]*?)<\/script>/)[1]);
  const used = new Set([...D.sets.flatMap((s) => s.i), ...D.mon.map((m) => m.i)].map((h) => parseInt(h.slice(0, 2), 16)));
  check(hex(M, 0x3931, 20) === 'ae8c6dd010ac986d8c9c6dad9a6d2908f003' + '8c9d', 'find_readied', hex(M, 0x3931, 20));
  let longest = 0;
  for (let t = 0; t < 128; t++) if (used.has(t) && T[0x7B00 + 16 * t] === 0 && T[0x7B00 + 16 * t + 14] & 8) longest = Math.max(longest, T[0x7B00 + 16 * t + 12]);
  check(longest === 22, 'the longest range', longest);
  check(!used.has(127) && T[0x7B00 + 16 * 127 + 12] === 60 && T[0x7B00 + 16 * 127 + 14] & 8, 'type 127');
  for (let d = 0; d <= 42; d++) check(pen(128, d) === 0, 'a penalty at', d);
  check(pen(128, 43) === -2, 'the first third of 128 is 42');
  check(pen(22, 7) === 0 && pen(22, 8) === -2 && pen(22, 14) === -2 && pen(22, 15) === -5, 'the thirds of 22');
  check(C[0x11F1] === 0x6D && (C[0x11F2] | C[0x11F3] << 8) === 0x2B7B && C[0x11F9] === 0x69 && C[0x11FA] === 0xFE, 'the penalty and a backstab are added to the AC figure');
  says('That puts the first third at 42 squares, and no bow or thrown weapon in the game reaches so far: the long bows\' 22 is the longest');
  says('Only item type 127, which no item has, would shoot 60');
}

// --- surprise and initiative
{
  const P = memory('com-prep');
  check(hex(C, 0x15FE, 3) === '38e906', 'the surprised side loses 6');
  check(hex(C, 0x0893, 9) === 'a00620' + 'e02d18' + '6dec6b', 'initiative is a d6 plus $6BEC', hex(C, 0x0893, 9));
  check(hex(P, 0x1636, 6) === 'bd82168dec6b', 'only com-prep sets $6BEC', hex(P, 0x1636, 6));
  const acts = (dex) => { const b = (P[0x1682 + dex] << 24) >> 24; let k = 0; for (let d = 1; d <= 6; d++) if (Math.max(1, d + b) - 6 > 0) k++; return k; };
  check([15, 16, 17, 18, 19, 20].map(acts).join() === '0,1,2,3,3,3', 'acting when surprised', [15, 16, 17, 18, 19, 20].map(acts).join());
  says('a character with dexterity 16 still acts on a 6, one with 17 on a 5 or 6, and one with 18 or more on a 4, 5 or 6');
}

// --- PENDRAGON's bow on VIEW
{
  const items = fs.readFileSync(path.join(__dirname, 'items.html'), 'utf8');
  const D = JSON.parse(items.match(/<script type="application\/json" id="por-items">([\s\S]*?)<\/script>/)[1]);
  const bytes = (h) => h.match(/../g).map((x) => parseInt(x, 16));
  const W = D.w, nameOf = (b) => [b[3], b[2], b[1]].filter(Boolean).map((w) => W[w]).join(' ');
  const all = [];
  for (const s of D.sets) for (const h of s.i) all.push(bytes(h));
  for (const m of D.mon) all.push(bytes(m.i));
  const find = (re) => all.find((b) => re.test(nameOf(b))).slice();
  const ready = (b) => { b[6] |= 0x80; return Uint8Array.from(b); };
  const { porReady } = g.run('items.html', 'por-ready', 'porReady');
  const base = memory('resident', 'tables', 'combat');
  const pen = Uint8Array.from(bytes(D.pen));
  check(pen[0x17] === 17 && pen[0xEC] === 0, 'PENDRAGON has dexterity 17 and no bonus kept', pen[0x17], pen[0xEC]);
  const bow = (bonus) => { const p = pen.slice(); p[0xEC] = bonus; return porReady(base.slice(), CPU, p, [ready(find(/^COMPOSITE LONG BOW$/)), ready(find(/^ARROW\(S\)$/))]).thac0; };
  const P = memory('com-prep');
  check(bow(0) === 20 && bow(P[0x1682 + 17]) === 18, 'PENDRAGON\'s bow', bow(0), bow(P[0x1682 + 17]));
  says('with a bow his THAC0 reads 20 on VIEW and is 18 in a fight');
}

console.log(bad ? `${bad} of ${n} checks differ` : `combat.html: ${n} checks, all agree with the game's code`);
process.exit(bad ? 1 : 0);
