#!/usr/bin/env node
// Hold the page's port of the NPCs' refusals against the game's own code, and its table of NPCs
// against the maps. party.html's WLNpcs block (npcs/npcs.js) and the dice it throws with
// (reference/wasteland-dice.js) run in node beside the original routines on the kit's 6502 simulator, in the
// engine's and the game's committed listings, with the same random bytes: npc_obey_check ($0D61)
// for every refusal byte, the three Use entries ($8D83, $8D86, $8D89), the trade's test in
// item_trade ($0F50-$0F87) and order_hire from its roll to its margin ($A435-$A4B4). The results,
// the refusal bytes afterwards and the random bytes used must agree. NPCS must hold every record of
// the 42 maps' lists 17, byte for byte, and the cast table (#wl-cast-t) must name each one with its
// map, its way of joining (+$31) and its hidden skill (+$BA/+$BB). The counts the page gives for the
// hidden skills' check squares are recounted from the maps' bytes, and square_checks ($8E14) runs
// map 1's cactus and Dan Citrine's father's cell for a party with and without Dan. Everything it
// needs is committed: no disk image, no snapshot, no emulator. It exits 1 on any difference.
//   node games/c64/wasteland/test_npcs.js
const fs = require('fs'), path = require('path');
const GAME = __dirname + '/', ROOT = path.resolve(GAME, '../../..');
globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(GAME, url), 'utf8')) });
require(path.join(ROOT, 'site/lib/c64.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
// The map window's block is on the Overview (index.html), the NPCs' on the party tab, and the
// dice, which the party tab and the Dice and combat tab share, in a file of their own.
const read = f => fs.readFileSync(GAME + f, 'utf8');
const html = read('party.html');
for (const [page, mark] of [['index.html', '/* maps/maps.js */'], ['reference/wasteland-dice.js', '/* dice/dice.js */'], ['party.html', '/* npcs/npcs.js */']]) {
  const src = read(page), a = src.indexOf(mark), b = src.indexOf('</script>', a);
  if (a < 0) { console.error(page + ': no ' + mark + ' block'); process.exit(1); }
  eval(b < 0 ? src.slice(a) : src.slice(a, b));
}
const D = globalThis.WLDice, N = globalThis.WLNpcs, M = globalThis.WLMaps;

let bad = 0, cases = 0;
const fail = (what, ...more) => { if (bad++ < 20) console.log('DIFFERS', what, ...more); };

// A fixed stream of random bytes for the port and a hook that feeds the same bytes to the game in
// place of random_byte ($24E3, engine), whose clock-made bytes the dice test holds to account.
let seed = 0x1988;
const xorshift = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed & 0xFF; };
const stream = n => Array.from({ length: n }, xorshift);
function hooks(bytes, extra) {
  let i = 0;
  const h = Object.assign({ 0x24E3: cpu => { if (i >= bytes.length) throw new Error('random bytes ran out'); cpu.a = bytes[i++]; cpu.rts(); } }, extra);
  return { h, used: () => i };
}

(async () => {
  // ---- NPCS against the maps' records --------------------------------------------------------
  const found = [], maps = {};
  for (const dir of fs.readdirSync(GAME + 'parts').filter(d => /^map-\d+$/.test(d)).sort()) {
    const L = await C64.load('parts/' + dir + '/listing.json');
    maps[+dir.slice(4)] = L;
    for (const [a, name] of L.names) if (/^npc_\d+$/.test(name)) found.push({ map: +dir.slice(4), at: a, r: L.bytes(a, 256) });
  }
  if (found.length !== N.NPCS.length) fail('NPCS holds', N.NPCS.length, 'records; the maps', found.length);
  for (const f of found) {
    const n = N.NPCS.find(x => x.map === f.map && x.at === f.at);
    if (!n) { fail('no NPCS entry for map', f.map, '$' + f.at.toString(16)); continue; }
    const want = N.record(n);
    for (const y of [0x0F, 0x14, 0x24, 0x29, 0x2B, 0x2C, 0x2D, 0x2E, 0x31]) if (want[y] !== f.r[y]) fail(n.name, '+$' + y.toString(16), want[y], f.r[y]);
    let name = ''; for (let i = 0; f.r[i]; i++) name += String.fromCharCode(f.r[i]);
    if (name !== n.name) fail('name', n.name, name);
    cases++;
  }

  // ---- the check squares that ask for a skill above 35, recounted from the maps' bytes ---------
  // A check square's record (labels check_NN): +0 flags, bit 6 set when the checks run ($8E33); +8
  // the effect's field, AND $7F ($1D CON), none when the byte is 0 ($9046); pairs from +$0A, two
  // bytes each up to $FF, kind = the first byte >> 5, 0 a skill ($8E52), the second its number.
  const asks = new Map();
  for (const [n, L] of Object.entries(maps)) for (const [a, label] of L.names) {
    if (!/^check_\d+$/.test(label) || !(L.ram[a] & 0x40)) continue;
    const r = L.ram, skills = [];
    let pairs = 0;
    for (let y = 0x0A; r[a + y] !== 0xFF && y < 0x40; y += 2, pairs++) if (r[a + y] >> 5 === 0) skills.push(r[a + y + 1]);
    for (const k of new Set(skills)) if (k >= 36) {
      if (!asks.has(k)) asks.set(k, []);
      asks.get(k).push({ map: +n, label, only: pairs === 1, con: r[a + 8] !== 0 && (r[a + 8] & 0x7F) === 0x1D });
    }
  }
  const asking = k => asks.get(k) || [];
  const mapsOf = list => [...new Set(list.map(x => x.map))].sort((a, b) => a - b);

  // ---- the cast table against the records ----------------------------------------------------
  const rows = [...html.matchAll(/<tr[^>]*data-wl-npc="(\d+):([0-9A-F]+)"[^>]*>([\s\S]*?)<\/tr>/g)];
  if (rows.length !== found.length) fail('the cast table has', rows.length, 'rows; the maps', found.length);
  const text = c => c.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const titleCase = t => t.toLowerCase().replace(/(^|[\s.])([a-z])/g, (m, p, c) => p + c.toUpperCase());
  const hidden = new Map();
  for (const [, mp, at, body] of rows) {
    const f = found.find(x => x.map === +mp && x.at === parseInt(at, 16));
    if (!f) { fail('cast row for map', mp, at, 'names no record'); continue; }
    const cells = [...body.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1]);
    let name = ''; for (let i = 0; f.r[i]; i++) name += String.fromCharCode(f.r[i]);
    if (text(cells[0]) !== titleCase(name) + ' $' + at) fail('cast name', text(cells[0]), name);
    if (!cells[1].includes('href="levels.html#map-' + f.map + '">Map ' + f.map + '</a>')) fail('cast map', name, cells[1]);
    if (text(cells[2]) !== (f.r[0x31] ? 'on a throw' : 'without dice')) fail('cast joins', name, text(cells[2]), f.r[0x31]);
    // the hidden skill: the last pair, number 36 or more at level 255; every other pair below 36
    for (let y = 0x80; y < 0xBA; y += 2) if (f.r[y] >= 36) fail('a skill above 35 before the last pair', name, '+$' + y.toString(16));
    const mk = f.r[0xBA] >= 36 && f.r[0xBB] === 0xFF ? f.r[0xBA] : null;
    if (text(cells[3]) !== (mk === null ? 'none' : String(mk))) fail('cast hidden skill', name, text(cells[3]), mk);
    if (mk !== null) {
      if (hidden.has(mk)) fail('hidden skill', mk, 'held twice');
      hidden.set(mk, name);
      if ((text(cells[4]) === 'nothing in the 42 maps') !== (asking(mk).length === 0)) fail('cast: what asks for', name, asking(mk).length);
    } else if (text(cells[4]) !== '') fail('cast: no hidden skill, but', name, text(cells[4]));
    cases++;
  }
  // (map 41's check_22 also asks for a skill 129, which no record of any kind holds)
  for (const k of asks.keys()) if (k <= 48 && !hidden.has(k)) fail('squares ask for skill', k, 'which no NPC holds');
  // what the table and the copy say about them
  const same1 = (what, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) fail(what, JSON.stringify(got), 'page:', JSON.stringify(want)); cases++; };
  same1('skill 38 (Ace): maps', mapsOf(asking(38)), [0, 4, 34]);
  same1('skill 40 (Covenant): maps', mapsOf(asking(40)), [40]);
  same1('skill 48 (Redhawk): maps', mapsOf(asking(48)), [49]);
  const pedros = /Seven squares in Quartz \(maps 2, 3, 4, and 6\)/.test(html);
  same1('skill 36 (Mayor Pedros): squares, maps', [asking(36).length, mapsOf(asking(36))], pedros ? [7, [2, 3, 4, 6]] : null);
  const dan = asking(37), dan6 = dan.filter(x => x.map === 6), danElse = dan.filter(x => x.map !== 6);
  const dm = html.match(/Another (\d+) check squares in (\d+) other maps test skill 37 and nothing else, and (\d+) of them take CON/);
  same1('skill 37 (Dan Citrine): in map 6', dan6.length, /Four squares there ask for it/.test(html) ? 4 : null);
  same1('skill 37 (Dan Citrine): elsewhere, maps, alone, CON', [danElse.length, mapsOf(danElse).length, danElse.filter(x => x.only).length, danElse.filter(x => x.con).length],
        dm ? [+dm[1], +dm[2], +dm[1], +dm[3]] : null);
  // no library teaches a skill above 35: a library square's record starts with $82 (module 2) and
  // lists its skills from +$10 to $FF (module 2 $CB5D)
  for (const [n, L] of Object.entries(maps)) for (const [a, label] of L.names) {
    if (!/^action_\d+$/.test(label) || L.ram[a] !== 0x82) continue;
    for (let y = 0x10; L.ram[a + y] !== 0xFF && y < 0x50; y++) if (L.ram[a + y] > 35) fail('map', n, label, 'teaches skill', L.ram[a + y]);
    cases++;
  }

  // ---- the machine: the game's bytes over the engine's ---------------------------------------
  const E = await C64.load('parts/engine/listing.json'), G = await C64.load('parts/game/listing.json');
  const base = Uint8Array.from(E.ram);
  for (let a = 0; a < 0x10000; a++) if (G.has[a]) base[a] = G.ram[a];
  const REC = 0xF500;
  function machine(rec) {
    const m = Uint8Array.from(base);
    m.set(rec, REC); m[0x66] = REC & 0xFF; m[0x67] = REC >> 8;
    return { m, cpu: new CPU(m) };
  }
  const recOf = (m, at) => m.slice(at, at + 256);
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  const simFrom = cases;
  // ---- npc_obey_check, every byte, through the jump table and directly ------------------------
  const values = [0, 1, 2, 3, 4, 5, 9, 10, 11, 15, 20, 25, 30, 40, 60, 100, 128, 200, 250, 251, 254, 255];
  for (let b = 0; b < 256; b++) for (const a of values) for (const y of [0x2B, 0x2C, 0x2D, 0x2E]) {
    const rec = new Uint8Array(256); rec[0x29] = 1; rec[y] = b; rec[0x31] = 77;
    const bytes = stream(4000), { m, cpu } = machine(rec), H = hooks(bytes);
    cpu.call((b + a) & 1 ? 0x021F : 0x0D61, { a, y }, { hooks: H.h });
    const p = rec.slice(), s = D.sequenceSource(bytes), r = N.obeyCheck(p, y, a, s);
    if (cpu.c !== (r.refuse ? 1 : 0) || !same(recOf(m, REC), p) || H.used() !== s.count) fail('obey b', b, 'a', a, 'y', y);
    cases++;
  }
  // random cases with low bytes, where the throw decides
  for (let k = 0; k < 3000; k++) {
    const y = 0x2B + (xorshift() & 3), b = xorshift() % 12, a = xorshift();
    const rec = new Uint8Array(256); rec[0x29] = 1; rec[y] = b;
    const bytes = stream(4000), { m, cpu } = machine(rec), H = hooks(bytes);
    cpu.call(0x0D61, { a, y }, { hooks: H.h });
    const p = rec.slice(), s = D.sequenceSource(bytes), r = N.obeyCheck(p, y, a, s);
    if (cpu.c !== (r.refuse ? 1 : 0) || !same(recOf(m, REC), p) || H.used() !== s.count) fail('obey random b', b, 'a', a, 'y', y);
    cases++;
  }

  // ---- the three Use entries: the byte for the kind, against +$31 -----------------------------
  const ENTRY = { skill: 0x8D83, item: 0x8D86, attr: 0x8D89 };
  for (const kind of Object.keys(ENTRY)) for (let k = 0; k < 2000; k++) {
    const rec = new Uint8Array(256); rec[0x29] = 1;
    for (let y = 0x2B; y <= 0x2E; y++) rec[y] = xorshift() % 12;
    if (k % 97 === 0) rec[N.OFFSET[kind]] = 0xFF;
    rec[0x31] = k < 256 ? k : xorshift(); rec[0x14] = xorshift();
    const bytes = stream(4000), { m, cpu } = machine(rec), H = hooks(bytes);
    cpu.call(ENTRY[kind], {}, { hooks: H.h });
    const p = rec.slice(), s = D.sequenceSource(bytes), r = N.useCheck(p, kind, s);
    // the entries keep the offset in an operand of use_on_square's ($8C88), outside the record
    if (cpu.c !== (r.refuse ? 1 : 0) || !same(recOf(m, REC), p) || H.used() !== s.count) fail('use', kind, k);
    cases++;
  }

  // ---- the trade: item_trade from $0F50, giver member 1 (an NPC), taker member 2 --------------
  // Party 0's table at $F400: position 1 record 1 ($F500), position 2 record 2 ($F600).
  for (let k = 0; k < 3000; k++) {
    const giver = new Uint8Array(256), taker = new Uint8Array(256);
    giver[0x29] = k % 5 === 0 ? 0 : 1;
    const con = k % 7 === 0 ? 0 : k % 11 === 0 ? 0xFFF6 : 1 + (xorshift() & 31);
    giver[0x1D] = con & 0xFF; giver[0x1E] = con >> 8;
    giver[0x2E] = k % 53 === 0 ? 0xFF : xorshift() % 12; giver[0x14] = xorshift(); giver[0x31] = xorshift();
    taker[0x14] = xorshift();
    const { m, cpu } = machine(giver);
    m.set(taker, 0xF600); m[0x08] = 0; m[0xF401] = 1; m[0xF402] = 2; m[0xF403] = 0;
    m[0x0E20] = 1; m[0x0EAD] = 1;
    const bytes = stream(4000);
    let end = null;
    const H = hooks(bytes, { 0x0F87: () => { end = 'pass'; return true; }, 0x0F88: () => { end = 'skip'; return true; }, 0x0FAB: () => { end = 'refuse'; return true; } });
    cpu.call(0x0F50, { a: 2 }, { hooks: H.h });
    const conscious = con >= 1 && con < 0x8000;
    const p = giver.slice(), s = D.sequenceSource(bytes);
    let want = 'skip';
    if (giver[0x29] && conscious) want = N.tradeCheck(p, taker[0x14], s).refuse ? 'refuse' : 'pass';
    if (end !== want || !same(recOf(m, REC), p) || H.used() !== s.count) fail('trade', k, end, want);
    cases++;
  }

  // ---- order_hire from $A435 to $A4B4 (joined) or $A4ED (failed) ------------------------------
  // The hirer is member 1, record 1 ($F500); the NPC's copy is the first free record, 3 ($F700),
  // with records_in_use ($0A) at 2. hire_member_op ($A450) and hirer_chr_op ($A491) as order_hire's
  // start leaves them. Printing is stood in for.
  const COPY = 0xF700;
  for (let k = 0; k < 4000; k++) {
    const npc = N.NPCS[k % N.NPCS.length], copy = N.record(npc);
    if (k >= 1400) { copy[0x31] = k % 9 === 0 ? 0 : 1 + xorshift() % 8; copy[0x24] = xorshift() % 25; copy[0x14] = xorshift() % 31; copy[0x0F] = xorshift() % 31; for (let y = 0x2B; y <= 0x2D; y++) copy[y] = xorshift() % 12; }
    const hirer = { chr: 1 + xorshift() % 30, iq: 1 + xorshift() % 30, rank: 1 + xorshift() % 20 };
    const leftover = (xorshift() << 8 | xorshift()) & (k & 1 ? 0xFFFF : 0x3F);
    const h = new Uint8Array(256); h[0x14] = hirer.chr; h[0x0F] = hirer.iq; h[0x24] = hirer.rank;
    const { m, cpu } = machine(h);
    m.set(copy, COPY); m[0x66] = COPY & 0xFF; m[0x67] = COPY >> 8;
    m[0x08] = 0; m[0xF401] = 1; m[0xF402] = 0; m[0x07] = 1; m[0x0A] = 2;
    m[0xA450] = 1; m[0xA491] = hirer.chr;
    m[0x6F] = leftover & 0xFF; m[0x70] = leftover >> 8;
    const bytes = stream(4000);
    let end = null;
    const rts = c => { c.rts(); };
    const H = hooks(bytes, { 0xA4B4: () => { end = 'joined'; return true; }, 0xA4ED: () => { end = 'failed'; return true; }, 0x0317: rts, 0x0323: rts });
    cpu.call(0xA435, {}, { hooks: H.h });
    const p = copy.slice(), s = D.sequenceSource(bytes), r = N.hire(p, hirer, s, leftover);
    if (end !== (r.joined ? 'joined' : 'failed') || !same(recOf(m, COPY), p) || H.used() !== s.count) fail('hire', k, npc.name, end, r.why, r.margin);
    cases++;
  }

  // the number the widget's caption gives
  const sim = cases - simFrom, sc = html.match(/were given the same random bytes for ([\d,]+) checks, trades, and hires/);
  if (!sc || +sc[1].replace(/,/g, '') !== sim) fail('the caption says', sc && sc[1], 'checks, trades, and hires; the test ran', sim);

  // ---- square_checks ($8E14, game) for a party with Dan Citrine in it ------------------------
  // The map's bytes over the engine's and the game's, with what loading the map leaves in zero page:
  // map_height and map_width ($55, $56), no class row cached ($63), the map record at $61/$62. The
  // party's records from $F500, member n at position n of party 0. Messages and the square's change
  // are stood in for ($BE1E, $9130, $0284, $042E); apply_square_effect ($9039) is recorded with the
  // member it hits and not applied. skill_roll_total's test of the throw ($0C73) is watched.
  const ranger = new Uint8Array(256);
  'KIT'.split('').forEach((c, i) => { ranger[i] = c.charCodeAt(0); });
  for (let y = 0x0E; y <= 0x14; y++) ranger[y] = 15;
  ranger[0x1B] = ranger[0x1D] = 30;
  const danRec = found.find(x => x.map === 6 && x.at === 0x44A0).r;
  function squareRuns(mapN, cls, num, party, runs) {
    const L = maps[mapN], m0 = Uint8Array.from(base);
    for (let a = 0; a < 0x10000; a++) if (L.has[a]) m0[a] = L.ram[a];
    const Mo = M.mapOf(mapN, m0, null);
    let at = null;
    for (let y = 0; y < Mo.w && !at; y++) for (let x = 0; x < Mo.w && !at; x++) if (M.classOf(Mo, x, y) === cls && M.numberOf(Mo, x, y) === num) at = { x, y };
    const out = { at, results: [0, 0], hurt: party.map(() => 0), under5: party.map(() => 0), throws: party.map(() => 0) };
    if (!at) return out;
    const bytes = stream(runs * 64);
    let i = 0;
    for (let k = 0; k < runs; k++) {
      const m = Uint8Array.from(m0);
      party.forEach((r, j) => { m.set(r, 0xF500 + 0x100 * j); m[0xF401 + j] = 1 + j; });
      m[0xF401 + party.length] = 0; m[0x08] = 0; m[0x07] = party.length;
      m[0x55] = m[0x56] = Mo.w; m[0x63] = 0xFF; m[0x61] = Mo.rec & 0xFF; m[0x62] = Mo.rec >> 8;
      const cpu = new CPU(m), rts = c => { c.rts(); };
      cpu.call(0x8E14, { x: at.x, y: at.y }, { hooks: {
        0x24E3: c => { c.a = bytes[i++ % bytes.length]; c.rts(); },
        0xBE1E: rts, 0x9130: rts, 0x0284: rts, 0x042E: rts,
        0x9039: c => { out.hurt[c.a - 1]++; c.rts(); },
        0x0C73: c => { const j = m[0x67] - 0xF5; out.throws[j]++; if (c.a < 5) out.under5[j]++; } } });
      out.results[cpu.a]++;
    }
    return out;
  }
  // map 1's cactus, class 2 number 5: CON - 1d6 for every member who fails skill 37
  const cactus = squareRuns(1, 2, 5, [ranger, danRec], 1000);
  const dh = html.match(/The Ranger was hurt every time: <q>[^<]*<\/q> Dan was hurt (\d+) times, each time on a throw under 5\./);
  if (!cactus.at) fail('map 1 has no square of class 2 number 5');
  if (cactus.hurt[0] !== 1000 || cactus.throws[0] !== 0) fail('cactus: the Ranger hurt', cactus.hurt[0], 'threw', cactus.throws[0]);
  if (cactus.hurt[1] !== cactus.under5[1] || cactus.throws[1] !== 1000) fail('cactus: Dan hurt', cactus.hurt[1], 'under 5', cactus.under5[1], 'of', cactus.throws[1]);
  if (!dh || +dh[1] !== cactus.hurt[1]) fail('cactus: the page says Dan was hurt', dh && dh[1], 'the run', cactus.hurt[1]);
  cases++;
  // map 6, his father's cell, class 2 number 30: skill 37 at difficulty 0, no dice
  const alone = squareRuns(6, 2, 30, [ranger], 50), withDan = squareRuns(6, 2, 30, [ranger, danRec], 50);
  if (alone.results[1] !== 50 || withDan.results[0] !== 50 || withDan.throws.some(t => t)) fail('the father\'s cell', JSON.stringify(alone.results), JSON.stringify(withDan.results));
  cases++;

  console.log(cases + ' cases, ' + bad + ' differing');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
