#!/usr/bin/env node
// Hold rules.html to the game's own code, run on the kit's 6502 over the committed listings:
// - por-rules, the sheet: porRules and porRoll run GEN's routines for every race, gender and class,
//   and the figures the page prints in its own text come out of them: the fighters' level limits by
//   strength (race_level_limit $24A0, and can_train $1BBC, which training runs), the experience left
//   after training (cap_experience $23D4), the gnome's saving throws (con_save_bonus $2359).
// - the constants the page carries from POST.COM (prime_ability $163E, old_age's limits $2186/$218E)
//   and PENDRAGON's figures, against post-com's listing and the record the Items tab carries.
// - the rest of the page's findings: the half-orc's tables and the race menu ($121A), the five classes
//   no race may take, the class names at messages 13 and 14, the ranger test in the dungeon ($1D6B),
//   which code reads the thief skills, the first hit dice and train_hp ($2037), the experience bonus
//   (class_exp $1233), the best of six rolls (roll_ability $0D1F), the HASTE ageing, and the fee
//   (has_money $1D50, pay_training $1D63). Which area scripts read a thief skill is read from the
//   game's files, which the repository does not hold, so it is not checked here.
// It exits 1 on any difference.
//   node games/c64/pool-of-radiance/test_rules.js
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
const page = fs.readFileSync(path.join(__dirname, 'rules.html'), 'utf8');
const text = page.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
const constant = (name) => eval('(' + page.match(new RegExp('const ' + name + ' = ([\\s\\S]*?);\\n'))[1] + ')');
const { porRules, porRoll } = g.run('rules.html', 'por-rules', 'porRules', 'porRoll');
const G = memory('resident', 'gen'), P = memory('resident', 'post-com');
const rules = (ch) => porRules(G.slice(), CPU, ch);
const call = (m, at, regs = {}, hooks = {}) => { const c = new CPU(m, { port: 0x36, io }); c.call(at, regs, { hooks, maxSteps: 2e6 }); return c; };
const idx = (race, female) => race + (female ? 7 : 0);
const hi = (race, female, i) => G[0x0E08 + 14 * i + idx(race, female)];
const lo = (race, female, i) => G[0x0DB4 + 14 * i + idx(race, female)];
const adj = (race, i) => (G[0x0D60 + 14 * i + race] << 24) >> 24;
const may = (race, cls) => (G[0x0E64 + cls] & G[0x0EDA + race]) !== 0;
const says = (s) => check(text.includes(s), 'the page does not say', JSON.stringify(s));

// --- the constants from POST.COM and the Items tab
{
  const PRIME = constant('PRIME'), DIES = constant('DIES'), PEN = constant('PEN');
  for (let c = 0; c < 17; c++) check(PRIME[c] === P[0x163E + c], 'prime_ability', c, PRIME[c], P[0x163E + c]);
  for (let r = 1; r <= 7; r++) check(DIES[r] === (P[0x2186 + r] | P[0x218E + r] << 8), 'age limit', r, DIES[r]);
  const items = fs.readFileSync(path.join(__dirname, 'items.html'), 'utf8');
  const pen = items.match(/"pen":"([0-9a-f]+)"/)[1].match(/../g).map((x) => parseInt(x, 16));
  const R = (a) => pen[a - 0x6B00];
  check(String.fromCharCode(...pen.slice(0, 9)) === PEN.name, 'PENDRAGON name');
  check(PEN.race === R(0x6B72) && PEN.cls === R(0x6B73) && PEN.female === R(0x6BD6) && PEN.align === R(0x6BD8), 'PENDRAGON race, class, gender, alignment');
  check(PEN.ab.join() === pen.slice(0x14, 0x1A).join() && PEN.pct === R(0x6B1A), 'PENDRAGON scores', pen.slice(0x14, 0x1A).join());
  check(PEN.hp === R(0x6B76) && PEN.base === R(0x6BED) && PEN.gold === R(0x6BC1) && PEN.age === R(0x6B74), 'PENDRAGON hit points, gold, age');
  check(R(0x6BC9) + R(0x6BCA) + R(0x6BCB) === 0 && R(0x6BCC) === 1 && R(0x6BE8) + R(0x6BE9) + R(0x6BEA) === 0, 'PENDRAGON is not a 1st level fighter with no experience');
  check(pen.slice(0x120, 0x220).every((b) => b === 0), 'PENDRAGON carries items');
  const r = rules({ race: PEN.race, cls: PEN.cls, ab: PEN.ab, lv: [0, 0, 0, 1] });
  check(r.thac0 === 20 && PEN.base + r.conHp === PEN.hp, 'PENDRAGON on the sheet', JSON.stringify(r));
  says('strength 17, intelligence 17, wisdom 12, dexterity 17, constitution 18 and charisma 13, 80 gold');
  says('neutral good');
}

// --- the sheet runs for everything the menus offer, and the half-orc
for (let race = 1; race <= 7; race++) for (const female of [0, 1]) for (let cls = 0; cls < 17; cls++) {
  if (!may(race, cls)) continue;
  for (let s = 0; s < 4; s++) {
    let r;
    try { r = porRoll(G.slice(), CPU, { race, female, cls }, [race, female, cls, s, 7, 11]); } catch (e) { fail('porRoll', race, female, cls, e.message); continue; }
    check(r.ab.every((v, i) => v >= lo(race, female, i) && v <= hi(race, female, i)), 'roll outside the limits', race, female, cls, r.ab.join());
    check(r.base >= G[0x0F9E + cls] && r.age === G[0x1004 + race] && r.gold % 10 === 0, 'roll figures', race, cls, JSON.stringify(r));
    const lv = [0, 1, 2, 3].map((p) => (G[0x101D + cls] >> p & 1 ? 1 : 0));
    try { rules({ race, female, cls, ab: r.ab, pct: r.pct, lv }); n++; } catch (e) { fail('porRules', race, cls, e.message); }
  }
}

// --- level limits
const top = (race, female, str) => rules({ race, female, cls: 2, ab: [str, 10, 10, 10, 10, 10], lv: [0, 0, 0, 1] }).limits[3];
{
  check(hi(5, 0, 0) === 17 && hi(5, 1, 0) === 14, 'halfling strength limits', hi(5, 0, 0), hi(5, 1, 0));
  const want = { 1: [8, 8, 7], 2: [7, 5, 5], 3: [6, 4, 4], 4: [8, 7, 6], 5: [5, 4, 4], 7: [8, 8, 8] };
  for (const race in want) {
    const got = [top(+race, 0, hi(+race, 0, 0)), top(+race, 1, hi(+race, 1, 0)), top(+race, 0, 16)];
    check(got.join() === want[race].join(), 'fighter limits for race', race, got.join());
  }
  // the same through can_train, as training runs it: a halfling of strength 17 with any amount of experience
  for (const [str, last] of [[17, 5], [16, 4]]) {
    let L = 1, stopped = 0;
    for (;;) {
      const m = G.slice(); m.fill(0, 0x6B00, 0x6D44);
      Object.assign(m, { [0x6DA8]: 0x0F, [0x6B72]: 5, [0x6BCC]: L, [0x6BEB]: 8, [0x6B14]: str, [0x6BE8]: 0xF0, [0x6BE9]: 0xFF, [0x6BEA]: 0xFF });
      const c = call(m, 0x1BBC);
      if (!c.c) { stopped = m[0x2B74]; break; }
      check(m[0x2B53] === L + 1, 'training goes up more than one level');
      L = m[0x2B53];
    }
    check(L === last && stopped, 'halfling of strength', str, 'trains to', L, 'stopped', stopped);
  }
  const rl = (race, p) => G[0x1E60 + 4 * race + p];
  check(rl(4, 1) === 5 && rl(2, 0) === 11 && rl(4, 0) === 8 && G[0x1E5C] === 6 && G[0x1E5D] === 6 && G[0x1E5E] === 9 && G[0x1E5F] === 8, 'race and hall limits');
  says('no halfling fighter gets past 5th level');
}

// --- training throws experience away
{
  const m = G.slice(); m.fill(0, 0x6B00, 0x6D44);
  Object.assign(m, { [0x6DA8]: 0x0F, [0x6B72]: 7, [0x6BCC]: 1, [0x6BEB]: 8, [0x6B14]: 18, [0x6BE8]: 100000 & 255, [0x6BE9]: 100000 >> 8 & 255, [0x6BEA]: 100000 >> 16 });
  const c = call(m, 0x1BBC);
  check(c.c && m[0x2B53] === 2, 'a fighter with 100,000 trains to', m[0x2B53]);
  m[0x6BCC] = 2;
  call(m, 0x23D4, {}, { 0x441E: (c) => c.rts() });
  check((m[0x6BE8] | m[0x6BE9] << 8 | m[0x6BEA] << 16) === 4000, 'experience kept', m[0x6BE8] | m[0x6BE9] << 8 | m[0x6BEA] << 16);
  says('trains to 2nd level and keeps 4,000, and the other 96,000 are gone');
  // POST.COM adds an award with no cap
  const q = P.slice(); q.fill(0, 0x6B00, 0x6D44); q[0x6B73] = 2; q[0x6B14] = 10;
  call(q, 0x0C69, { a: 0x40, x: 0x0D, y: 0x03 });
  check((q[0x6BE8] | q[0x6BE9] << 8 | q[0x6BEA] << 16) === 200000, 'add_exp caps an award of 200,000');
}

// --- the half-orc
{
  check([0, 1, 2, 3, 4, 5].map((i) => G[0x121A + i]).join() === '1,2,3,4,5,7', 'race menu', G.slice(0x121A, 0x1220).join());
  check(adj(6, 0) === 2 && adj(6, 4) === 2 && adj(6, 5) === -2 && hi(6, 0, 2) === 14 && hi(6, 0, 5) === 12, 'half-orc scores');
  check([...Array(17).keys()].filter((c) => may(6, c)).join() === '0,2,6,8,12,14', 'half-orc classes', [...Array(17).keys()].filter((c) => may(6, c)).join());
  check([1, 2, 3].map((p) => G[0x1E60 + 24 + p]).join() === '4,8,10' && G[0x1004 + 6] === 16, 'half-orc limits and age');
  const R = memory('resident');
  const msg = (k) => { let a = R[0x3439 + k] | R[0x347B + k] << 8, s = ''; while (R[a]) s += String.fromCharCode(R[a++]); return s; };
  check(msg(5) === 'HALF-ORC' && msg(11) === 'DRUID' && msg(17) === 'MONK', 'names', msg(5), msg(11), msg(17));
  check(msg(13) === 'MAGIC-USER' && msg(14) === 'MAGIC-USER' && msg(15) === 'MAGIC-USER', 'paladin and ranger names', msg(13), msg(14));
}

// --- the cut classes
{
  for (let c = 0; c < 17; c++) {
    const any = [1, 2, 3, 4, 5, 7].some((r) => may(r, c));
    check(any === ![1, 3, 4, 7, 10, 12].includes(c), 'class', c, 'may be taken:', any);
  }
  check([...Array(9).keys()].every((al) => !G[0x0EE3 + 9 * 7 + al]), 'the monk has an alignment');
  check(G[0x0EE3 + 9 * 3 + 8] === 1 && [...Array(8).keys()].every((j) => !G[0x0EE3 + 9 * 3 + j]), 'the paladin is not lawful good only');
  check([...Array(17).keys()].filter((c) => may(6, c) && ![1, 2, 3, 4, 5, 7].some((r) => may(r, c))).join() === '12', 'the half-orc alone takes the cleric/thief');
  const D = memory('resident', 'dungeon');
  check([0xAD, 0xEB, 0x6B, 0x29, 0x80].every((b, i) => D[0x1D6B + i] === b), 'the ranger test at $1D6B');
  for (let c = 8; c < 17; c++) check(P[0x163E + c] === 0, 'a class of several parts has a prime ability');
}

// --- thief skills
{
  const reads = [];
  for (const p of fs.readdirSync(path.join(__dirname, 'parts'))) {
    const L = JSON.parse(fs.readFileSync(path.join(__dirname, 'parts', p, 'listing.json'), 'utf8'));
    for (const r of L.records) if (r.m && /6BA[5-9A-C]\b/i.test(r.o || '') && !/^(sta|adc)/.test(r.m)) reads.push(p + ' ' + r.a.toString(16).toUpperCase() + ' ' + r.m + ' ' + r.o);
  }
  check(reads.length === 2 && reads.some((s) => /^dungeon 1D88 cmp/.test(s)) && reads.some((s) => /^effects A76F lda/.test(s)), 'code that reads a thief skill:', reads.join('; '));
  const D = memory('resident', 'dungeon');
  check(D[0x100E] === 0xA2 && D[0x100F] === 0xA6 && D[0x1010] === 0xA0 && D[0x1011] === 0x6B, 'the door menu reads open locks');
  const sk = (dex) => rules({ race: 5, cls: 6, ab: [10, 10, 10, dex, 10, 10], lv: [0, 0, 3, 0] }).thief.join();
  check(sk(8) === sk(18), 'dexterity changes the thief skills');
  check(rules({ race: 7, cls: 6, ab: [10, 10, 10, 10, 10, 10], lv: [0, 0, 1, 0] }).thief.join() === '30,25,20,15,10,10,85,0', 'level 1 thief skills');
}

// --- saving throws
{
  const sv = (race, con) => rules({ race, cls: 2, ab: [10, 10, 10, 10, con, 10], lv: [0, 0, 0, 1] }).saves;
  check(sv(3, 18).join() === '9,10,11,12,12' && sv(7, 18).join() === '14,15,16,17,17', 'gnome and human saves', sv(3, 18).join(), sv(7, 18).join());
  for (let con = 7; con <= 19; con++) for (const race of [1, 3, 5]) {
    const want = con <= 10 ? 2 : con <= 13 ? 3 : con <= 17 ? 4 : 5;
    check(sv(7, con).every((v, i) => v - sv(race, con)[i] === want), 'constitution bonus', race, con);
  }
  for (const race of [2, 4, 6, 7]) check(sv(race, 18).join() === sv(7, 10).join(), 'save bonus for race', race);
  says('saves against a dragon\'s breath on 12, where a human needs 17');
}

// --- hit points
{
  check([[2, 10, 9], [0, 8, 7], [6, 6, 5], [5, 4, 4]].every(([c, s, l]) => G[0x0F7C + c] === 1 && G[0x0F8D + c] === s && G[0x0F9E + c] === l), 'first hit dice');
  const sides = new Set([8, 9, 10, 11, 12, 13, 14, 15, 16].map((c) => G[0x0F8D + c]));
  check(sides.has(9) && sides.has(7) && sides.has(5), 'multi-class dice', [...sides].join());
  const thp = (mask, cls, part, roll) => {
    const m = G.slice(); m.fill(0, 0x6B00, 0x6D44); m.fill(0, 0x2B50, 0x2B54);
    Object.assign(m, { [0x6BEB]: mask, [0x6B73]: cls, [0x6B18]: 10, [0x6BA0]: 2, [0x2B50 + part]: 2, [0x6BED]: 10 });
    call(m, 0x2037, {}, { 0x2DE0: (c) => { c.a = roll; c.rts(); } });
    return m[0x6BED] - 10;
  };
  for (let roll = 1; roll <= 10; roll++) check(thp(8, 2, 3, roll) === Math.max(4, roll), 'fighter training roll', roll, thp(8, 2, 3, roll));
  check(thp(4, 6, 2, 1) === 1, 'thief training roll 1');
}

// --- the experience bonus
{
  const cx = (cls, at, score, award) => { const m = P.slice(); m.fill(0, 0x6B00, 0x6D44); m[0x6B73] = cls; m[0x6B00 + at] = score; const c = call(m, 0x1233, { a: award & 255, x: award >> 8 & 255, y: award >> 16 }); return c.a | c.x << 8 | c.y << 16; };
  check(cx(2, 0x14, 15, 1000) === 1000 && cx(2, 0x14, 16, 1000) === 1100, 'the bonus at 15 and 16');
  check(cx(2, 0x14, 18, 65536) === 65536 && cx(2, 0x14, 18, 100000) === 103446, 'the bonus on large awards', cx(2, 0x14, 18, 100000));
  check(cx(14, 0x14, 18, 1000) === 500 && cx(15, 0x14, 18, 999) === 333, 'the shares of two and three classes');
  says('an award of 65,536 points gets no bonus and one of 100,000 gets 3,446');
}

// --- the rolls
{
  const sums = [];
  for (let k = 0; k < 6; k++) sums.push([1 + k % 6, 2, 3 + (k * 5) % 4]);
  const flat = sums.flat(); let i = 0;
  const m = G.slice();
  call(m, 0x0D1F, {}, { 0x2DE1: (c) => { c.a = flat[i++]; c.rts(); } });
  check(i === 18 && m[0xB1] === Math.max(...sums.map((s) => s[0] + s[1] + s[2])), 'roll_ability keeps the best of six rolls of three dice', i, m[0xB1]);
  for (let race = 1; race <= 7; race++) {
    check((adj(race, 0) >= 1) === (race !== 5), 'strength adjustment', race, adj(race, 0));
    check((adj(race, 4) >= 1) === (race !== 2), 'constitution adjustment', race, adj(race, 4));
  }
  let c3 = Array(19).fill(0);
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let d = 1; d <= 6; d++) c3[a + b + d]++;
  const atLeast = (k) => 1 - (1 - c3.slice(k).reduce((x, y) => x + y, 0) / 216) ** 6;
  let mean = 0;
  for (let k = 3; k <= 18; k++) mean += k * (atLeast(k) - atLeast(k + 1));
  check(Math.round(100 * atLeast(15)) === 44 && mean.toFixed(1) === '14.2', 'best of six odds', atLeast(15), mean);
  says('44 scores in 100 come out at 15 or more');
}

// --- age, HASTE and the fee
{
  check([1, 2, 3, 4, 5, 6, 7].map((r) => G[0x1004 + r]).join() === '51,176,91,41,34,16,21', 'starting ages');
  const E = memory('effects'), C = memory('camp-spells');
  check(E[0xA98B] === 0xEE && E[0xA98C] === 0x74 && E[0xA98D] === 0x6B, 'kind_haste adds a year');
  check(C[0xAB01] === 0xEE && C[0xAB02] === 0x74 && C[0xAB03] === 0x6B, 'haste_member adds a year');
  const fee = (coins) => {
    const m = G.slice(); m.fill(0, 0x6B00, 0x6D44);
    coins.forEach((v, i) => { m[0x6BBB + 2 * i] = v & 255; m[0x6BBC + 2 * i] = v >> 8; });
    if (!call(m, 0x1D50).c) return null;
    call(m, 0x1D63);
    return [0, 1, 2, 3, 4].map((i) => m[0x6BBB + 2 * i] | m[0x6BBC + 2 * i] << 8).join();
  };
  check(fee([0, 0, 0, 1234, 0]) === '0,0,0,0,46' && fee([0, 0, 0, 999, 0]) === null && fee([0, 0, 0, 1004, 0]) === '0,0,0,0,0', 'the fee');
  check([0xAD, 0xB8, 0x6B, 0x30, 0x03, 0x20, 0x63, 0x1D].every((b, i) => G[0x1B84 + i] === b), 'a companion pays');
  says('a character with 1,234 gold leaves with 46 platinum, worth 230');
}

console.log(bad ? `${bad} difference(s) in ${n} checks` : `rules.html: ${n} checks agree with the game's code`);
process.exit(bad ? 1 : 0);
