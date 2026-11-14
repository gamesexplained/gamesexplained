#!/usr/bin/env node
// Hold the Paragraphs tab to the game's own code and to the committed listings. The page's block
// WLAsk (paragraphs/ask.js) runs in node on WLFight (reference/wasteland-fight.js: the engine's,
// the game's and one map's listing laid over each other, the game's routines run on the kit's
// 6502), and what the page says is made again:
// - the cites: every message of the 42 maps is decoded with the Maps tab's own decoder and
//   searched for a paragraph number, and the result is compared with the page's embedded data;
//   the seven files of the Sleeper Base terminal; the 73 numbers no message names;
// - the false passwords: each of the five questions is asked on the game's code with its true
//   word, its false words and a word that is on no list, and the Rangers' records are read after;
// - the two Bloodstaffs: the item records, the name the game prints for each, every bag of every
//   map, and the three squares that test which one is used on them;
// - the questions: every word of every typed question is given to the game, and must be told
//   apart from a word that is on no list; the one word that is too long to type.
// What the booklet's paragraphs say is not in any listing, so the test cannot hold the page's
// one-line descriptions of them; facts.md says where the booklet was read. Everything else it
// needs is committed: no disk image, no snapshot, no emulator. It exits 1 on any difference.
//   node games/c64/wasteland/test_paragraphs.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const WLFight = g.run('reference/wasteland-fight.js', 'fight/fight.js', 'WLFight').WLFight;
const WLAsk = g.run('paragraphs.html', 'paragraphs/ask.js', 'WLAsk').WLAsk;
const html = g.read('paragraphs.html');
const page = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<\/?(?:td|th|tr|p|div|li|section|h2|table|thead|tbody|br)\b[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const D = JSON.parse(/<script type="application\/json" id="wl-paragraphs">([\s\S]*?)<\/script>/.exec(html)[1]);
// the Maps tab's decoder, the block between its two markers in levels.html
const WLMaps = (() => {
  const src = g.read('levels.html'), a = src.indexOf('/* wl:maps.js'), b = src.indexOf('/* /wl:maps.js */');
  const scope = {}; new Function('module', 'globalThis', src.slice(a, b))({ exports: {} }, scope); return scope.WLMaps;
})();

let bad = 0, checks = 0;
const fail = (what, ...more) => { if (bad++ < 40) console.log('DIFFERS', what, ...more); };
const same = (what, got, want) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) fail(what, 'got', JSON.stringify(got), 'expected', JSON.stringify(want)); };
const ok = (what, yes, ...more) => { checks++; if (!yes) fail(what, ...more); };
const says = text => { checks++; if (!page.includes(text)) fail('the page does not say', JSON.stringify(text)); };

const listings = {};
const part = id => listings[id] || (listings[id] = g.listing('parts/' + id + '/listing.json'));
const mapId = n => 'map-' + String(n).padStart(2, '0');
const mapIds = fs.readdirSync(path.join(__dirname, 'parts')).filter(d => /^map-\d\d$/.test(d)).sort().map(d => +d.slice(4));
const mapOf = n => { const P = part(mapId(n)); return WLMaps.mapOf(n, new Uint8Array(P.ram), new Uint8Array(P.has)); };
const world = (map, seed) => WLAsk.attach(WLFight.create({ engine: part('engine'), game: part('game'), map: part(mapId(map)), mapNumber: map, CPU, random: WLFight.seeded(seed || 1), size: 4 }));
const w16 = (m, a) => m[a] | m[a + 1] << 8;

// ---- the cites: every message of every map ----
const texts = {};
{
  const cites = {};
  for (const n of mapIds) {
    const M = mapOf(n), count = WLMaps.messageCount(M); texts[n] = {};
    for (let k = 1; k <= count; k++) {
      let t; try { t = WLMaps.textPlain(WLMaps.message(M.m, M.text, k)); } catch (e) { continue; }
      t = t.replace(/\s+/g, ' ').trim(); texts[n][k] = t;
      const rx = /paragraph\s+(\d+)/gi; let mm;
      while ((mm = rx.exec(t))) (cites[+mm[1]] = cites[+mm[1]] || []).push({ m: n, k, t });
    }
  }
  same('the paragraphs the messages name', Object.keys(cites), Object.keys(D.cites));
  for (const p of Object.keys(cites)) same('the messages that name paragraph ' + p, cites[p], D.cites[p]);
  const msgs = Object.values(cites).reduce((s, a) => s + a.length, 0), on = new Set(); Object.values(cites).forEach(a => a.forEach(c => on.add(c.m)));
  same('messages, paragraphs, maps', [msgs, Object.keys(cites).length, on.size], [83, 82, 21]);
  same('the one paragraph named twice', Object.keys(cites).filter(p => cites[p].length > 1).map(p => [p, cites[p].map(c => c.m + ':' + c.k)]), [['124', ['27:6', '27:70']]]);
  says('in 83 messages on 21 maps'); says('They name 82 different paragraphs'); says('both name paragraph 124');
  // the Sleeper Base terminal: "Read paragraph" and then a message that is only the number
  same('the terminal\'s numbers', D.files.map(f => f.para), [52, 40, 100, 63, 70, 91, 101]);
  for (const f of D.files) { same('file ' + f.key + ' first message', texts[15][f.msgs[0]], 'Read paragraph'); same('file ' + f.key + ' number', +texts[15][f.msgs[1]].replace(/\D/g, ''), f.para); ok('file ' + f.key + ' is not cited by number elsewhere', !cites[f.para]); }
  const P = world(15), q = D.files.map((f, i) => P.ask(1, 1, '', null, String(i + 1)).lines.join(' '));
  D.files.forEach((f, i) => ok('the terminal shows file ' + f.key + ' as paragraph ' + f.para, new RegExp('Read paragraph ?' + f.para + '\\b').test(q[i]) && q[i].includes('Select info file'), q[i]));
  says('52, 40, 100, 63, 70, 91, and 101');
  // the 73 no message names
  const cited = new Set([...Object.keys(cites).map(Number), ...D.files.map(f => f.para)]), never = [];
  for (let p = 1; p <= 162; p++) if (!cited.has(p)) never.push(String(p));
  same('cited', cited.size, 89); same('never cited', never, Object.keys(D.never));
  const kinds = {}; for (const p of never) { const e = D.never[p]; kinds[e.kind] = (kinds[e.kind] || 0) + 1; ok('paragraph ' + p + ' has a line', e.d && e.d.length > 20); if (e.twin) ok('the true copy of ' + p + ' is cited', cited.has(e.twin)); }
  same('kinds', kinds, { other: 19, twin: 22, mars: 32 });
  says('sends the player to 89 of them'); says('The other 73'); says('never names, 22 are copies'); says('Another 32 tell one long story'); says('That makes 89.');
  same('paragraph 42 is named once, by the nomads', cites[42].map(c => c.m + ':' + c.t), ['8:Read paragraph 42.']);
  for (const [w, p] of [['KAPUT', 49], ['KESTREL', 71], ['MOTEKIM', 124], ['CATERPILLAR', 57], ['DIPSTICK', 129]]) ok(w + '\'s paragraph ' + p + ' is cited', cited.has(p));
  for (const p of [5, 161, 33, 149, 50, 154, 75, 92, 18, 73, 22, 145, 159, 143, 9, 27]) ok('paragraph ' + p + ' is never cited', !cited.has(p));
  for (const p of [26, 147, 155, 107, 39, 76]) ok('paragraph ' + p + ' is cited', cited.has(p));
}

// ---- the false passwords on the game's code ----
const guard = id => D.guards.find(x => x.id === id);
const run = (gd, word, seed, keys) => world(gd.map, seed).ask(gd.x, gd.y, word, gd.pair, keys);
const sexes = r => r.after.map(p => p.sex).join(''), ills = r => r.after.map(p => p.diseases).join(','), cons = r => r.after.map(p => p.con).join(',');
const untouched = (what, r) => same(what + ' leaves the records alone', [sexes(r), ills(r), cons(r)], [r.before.map(p => p.sex).join(''), r.before.map(p => p.diseases).join(','), r.before.map(p => p.con).join(',')]);
same('the guards and their words', D.guards.map(x => [x.id, x.map, x.words.map(w => w.join(':')).join(' ')]), [
  ['ugly', 4, 'KAPUT:49:true AZRAEL:5:false MORS:161:false THANATOS:49:old'], ['brygo', 39, 'KESTREL:71:true PHOENIX:33:false CLOVER:149:false'],
  ['temple', 27, 'MOTEKIM:124:true MORTAR:50:false ATOM:154:false'], ['nomads', 8, 'CATERPILLAR:57:true LADYBUG:75:false LIZARD:92:false'], ['bishop', 34, 'DIPSTICK:129:true BUZZARD:18:false PASTEL:73:false']]);
{
  const u = guard('ugly'), t = run(u, 'KAPUT');
  untouched('KAPUT', t); ok('KAPUT is let in', t.lines.join(' ').includes('you must have just come from the courthouse'), t.lines);
  for (const w of ['AZRAEL', 'MORS']) {
    const r = run(u, w);
    same(w + ' prints what KAPUT prints', r.lines.slice(2), t.lines.slice(2));
    same(w + ' swaps every Ranger\'s sex', sexes(r), r.before.map(p => p.sex ^ 1).join(''));
    same(w + ' changes nothing else', [ills(r), cons(r)], [ills(t), cons(t)]);
  }
  const old = run(u, 'THANATOS'); untouched('THANATOS', old);
  ok('THANATOS is the old password', old.lines.includes('"That is the old password."') && old.lines.includes('"Who is your section leader?"'), old.lines);
  const no = run(u, 'XQZ'); untouched('a wrong word at the hideout', no); ok('a wrong word is not let in', !no.lines.join(' ').includes('courthouse'), no.lines);
  const leaders = D.questions.find(q => q.m === 4 && /section leader/.test(q.q));
  same('the section leaders', leaders.a.map(a => a[0]), ['STINGER', 'PIGFACE', 'MADWOLF', 'SKULKER', 'GRUNT']);
  says('STINGER, PIGFACE, MADWOLF, SKULKER, or GRUNT');
  // the map's routine flips bit 0 of +$18 in every record in use
  ok('swap_everyones_sex is at $4206', part('map-04').byName.get('swap_everyones_sex') === 0x4206); says('$4206'); says('$419B');
  ok('set_gang_encounters is at $419B', part('map-04').byName.get('set_gang_encounters') === 0x419B);
}
{
  const b = guard('brygo'), t = run(b, 'KESTREL'); untouched('KESTREL', t);
  for (const w of ['PHOENIX', 'CLOVER']) {
    const r = run(b, w);
    same(w + ' prints what KESTREL prints', r.lines.slice(2), t.lines.slice(2));
    same(w + ' sets the disease bit of every Ranger', ills(r), '2,2,2,2'); same(w + ' changes nothing else', [sexes(r), cons(r)], [sexes(t), cons(t)]);
    same(w + ' lets the party in', r.at, t.at);
  }
  const no = run(b, 'XQZ'); untouched('a wrong word at the door', no); ok('a wrong word is sent away', no.lines.join(' ').includes('Get the hell out of here'), no.lines);
  ok('infect_every_character is at $3C58', part('map-39').byName.get('infect_every_character') === 0x3C58); says('$3C58');
}
{
  const t = guard('temple'), free = run(t, 'MOTEKIM'); untouched('MOTEKIM', free);
  ok('MOTEKIM frees the prisoner', free.lines.join(' ').includes('Free at last'), free.lines);
  let lo = 999, hi = 0, sum = 0, n = 0;
  for (const w of ['MORTAR', 'ATOM']) for (let seed = 1; seed <= 20; seed++) {
    const r = run(t, w, seed), text = r.lines.join(' ');
    ok(w + ' sets off the self destruct', text.includes('You\'ve entered the self destruct code by mistake.'), r.lines);
    const hits = [...text.matchAll(/gets hurt for (\d+) points of damage/g)].map(x => +x[1]);
    same(w + ' hurts all four Rangers, seed ' + seed, hits.length, 4);
    hits.forEach((d, i) => { lo = Math.min(lo, d); hi = Math.max(hi, d); sum += d; n++; const b = r.before[i].con, a = r.after[i].con; ok('CON after ' + d + ' points', a === (b - d <= -50 ? 0 : b - d === 0 ? -1 : b - d), b, d, a); });
  }
  ok('the blast is 20 six-sided dice', lo >= 20 && hi <= 120 && sum / n > 62 && sum / n < 78, lo, hi, sum / n);
  const no = run(t, 'XQZ'); untouched('a wrong code', no); ok('a wrong code is only wrong', no.lines.includes('No, that\'s not it.'), no.lines);
  says('take 20 six-sided dice of CON from every Ranger'); says('20 to 120 points each');
}
{
  const nm = guard('nomads'), t = run(nm, 'CATERPILLAR');
  ok('CATERPILLAR leads to paragraph 39 and a bag', t.lines.includes('Read paragraph 39.') && t.lines.includes('Who wants loot?') && t.square[0] === 5, t.lines, t.square);
  same('the bag holds a Shovel', world(8).bag(t.square[1]), [55]);
  for (const w of ['LADYBUG', 'LIZARD']) { const r = run(nm, w); untouched(w, r); ok(w + ' leads to paragraph 42 and nothing else', r.lines.includes('Read paragraph 42.') && !r.lines.includes('Who wants loot?') && r.square[0] === 8, r.lines, r.square); }
  const no = run(nm, 'XQZ'); ok('a wrong word at the tent', no.lines.includes('"What?"') && !no.lines.join(' ').includes('paragraph'), no.lines);
}

// ---- the two Bloodstaffs ----
{
  const G = part('game'), rec = n => [...G.ram.slice(0x3108 + 8 * n, 0x3110 + 8 * n)];
  same('items 62 and 63 have the same eight bytes', rec(62), rec(63)); ok('and they are not empty', rec(62).some(b => b));
  const b = guard('bishop'), t = run(b, 'DIPSTICK', 1, '1');
  same('DIPSTICK: the bishop\'s bag', [t.lines.includes('"Please be careful with it."'), world(34).bag(5)], [true, [62]]);
  ok('the game calls item 62 Bloodstaff', t.lines.some(l => /\b1 Bloodstaff$/.test(l)), t.lines);
  for (const w of ['BUZZARD', 'PASTEL']) {
    const r = run(b, w, 1, '1'); untouched(w, r);
    same(w + ' prints what DIPSTICK prints', r.lines.slice(2), t.lines.slice(2));
    const s = run(b, w); same(w + ': the square becomes the bag of item 63', [s.square, world(34).bag(s.square[1])], [[5, 6], [63]]);
  }
  same('DIPSTICK: the square becomes the bag of item 62', run(b, 'DIPSTICK').square, [5, 5]);
  const no = run(b, 'XQZ'); ok('a wrong word to the bishop', no.lines.includes('"I am sorry. I cannot help you with that."'), no.lines);
  // every bag of every map: the entries of the loot list, up to the first record any list of the map points at
  const bags = [];
  for (const n of mapIds) {
    const M = mapOf(n), m = M.m, list = w16(m, M.rec + 6 + 2 * 5); let end = 0xFFFF;
    for (let c = 1; c < 13; c++) { const a = w16(m, M.rec + 6 + 2 * c); if (a > list && a < end) end = a; }
    for (let k = 0; k < 128 && list + 2 * k < end; k++) {
      const r = w16(m, list + 2 * k); if (r < 0x3400) continue; if (r < end && r > list) end = r;
      for (let o = 2; o < 64 && m[r + o] !== 0xFF; o += 2) { if (m[r + o] === 0x5E || m[r + o] === 0xDE) { o++; continue; } if (m[r + o] === 0x80 + 62 || m[r + o] === 0x80 + 63) bags.push({ m: n, n: k, item: m[r + o] & 0x7F }); }
    }
  }
  const key = x => x.m + ':' + x.n + ':' + x.item;
  // bag 7 of map 33 is no bag a party opens: the verification table's routine (refill_bar_bag,
  // $3E03) copies it into bag 8, the one it hands back (action record 15: template 7, target 8)
  const tm = mapOf(33).m; same('the verification table copies bag 7 into bag 8', [tm[0x3DF5 + 3], tm[0x3DF5 + 4], part('map-33').byName.get('refill_bar_bag')], [7, 8, 0x3E03]);
  same('the bags that hold a Bloodstaff', bags.map(key).sort(), D.staff.bags.map(key).concat(['33:7:62']).sort());
  same('true and false bags', [62, 63].map(i => D.staff.bags.filter(x => x.item === i).length), [3, 7]); says('seven bags hold one');
  same('the squares that test the staff', D.staff.tests.map(t => t.m), [33, 34, 38]);
  for (const [n, k, want] of [[33, 104, 'Verification ok. Please remove bloodstaff.'], [33, 106, 'Crunch crunch. Verification failed.'], [34, 15, '"What are you trying to pull? This isn\'t the real Bloodstaff." He breaks it over your heads and throws you out.'], [38, 104, '"Thank you for the Bloodstaff." Read paragraph 76.'], [38, 110, '"Imposters! That is not the true Bloodstaff."']]) {
    same('map ' + n + ' message ' + k, texts[n][k], want); says(want.replace(/^"|"$/g, '').split('" ')[0]);
  }
  ok('temple_turns_hostile is at $3FB0', part('map-38').byName.get('temple_turns_hostile') === 0x3FB0); says('$3FB0');
}

// ---- every typed question ----
{
  same('questions and words', [D.questions.length, D.questions.reduce((s, q) => s + q.a.length, 0)], [67, 186]);
  says('asks 67 questions'); says('hold 186 words');
  let told = 0;
  for (const q of D.questions) {
    const P = world(q.m), go = w => P.ask(q.at[0], q.at[1], w, [8, q.n]), junk = go('XQZ'), echo = r => r.lines.find(l => l.charAt(0) === '>');
    const tail = r => JSON.stringify([r.lines.slice(r.lines.indexOf(echo(r)) + 1), r.square, r.at]);
    ok('map ' + q.m + ' question ' + q.n + ' is asked', echo(junk) === '>XQZ', junk.lines);
    const by = {};
    for (const [w, to] of q.a) {
      if (w.length > 16) continue;
      const r = world(q.m).ask(q.at[0], q.at[1], w, [8, q.n]);
      same('map ' + q.m + ' question ' + q.n + ' echoes ' + w, echo(r), '>' + w);
      if (to !== q.other) { told++; ok('map ' + q.m + ' question ' + q.n + ' knows ' + w, tail(r) !== tail(world(q.m).ask(q.at[0], q.at[1], 'XQZ', [8, q.n])), r.lines); }
      if (by[to] === undefined) by[to] = tail(r); else same('map ' + q.m + ' question ' + q.n + ': ' + w + ' does what its twin does', tail(r), by[to]);
    }
  }
  ok('most words are told from a wrong one', told > 170, told);
  // the word that cannot be typed
  const f = D.questions.find(q => q.m === 23 && q.a.some(a => a[0] === 'IRWIN JOHN FINSTER'));
  same('the forms of Finster\'s name', f.a.map(a => a[0]), ['IRWIN FINSTER', 'IRWIN J FINSTER', 'IRWIN J. FINSTER', 'IRWIN JOHN FINSTER', 'FINSTER']);
  same('the long form\'s length', 'IRWIN JOHN FINSTER'.length, 18);
  const P = world(23), long = P.ask(f.at[0], f.at[1], 'IRWIN JOHN FINSTER', [8, f.n]), wrong = P.ask(f.at[0], f.at[1], 'XQZ', [8, f.n]), right = P.ask(f.at[0], f.at[1], 'IRWIN J. FINSTER', [8, f.n]);
  same('the line stops at 16 characters', long.lines[1], '>IRWIN JOHN FINST');
  same('and the game treats it as a wrong answer', [long.lines.slice(2), long.square], [wrong.lines.slice(2), wrong.square]);
  ok('the 16-character form is taken', JSON.stringify(right.square) !== JSON.stringify(wrong.square), right.square);
  says('IRWIN JOHN FINSTER has 18 characters'); says('IRWIN JOHN FINST and');
  // a word counts only when the whole line matches
  const u = guard('ugly'), ref = run(u, 'XQZ').lines.slice(2);
  for (const w of ['KAPUTX', 'KAPU', ' KAPUT']) same(JSON.stringify(w) + ' is not KAPUT', run(u, w).lines.slice(2), ref);
  same('the false words marked in the table', D.guards.flatMap(x => x.words.filter(w => w[2] === 'false').map(w => w[0])), ['AZRAEL', 'MORS', 'PHOENIX', 'CLOVER', 'MORTAR', 'ATOM', 'LADYBUG', 'LIZARD', 'BUZZARD', 'PASTEL']);
  for (const x of D.guards) for (const w of x.words) ok(x.id + ' lists ' + w[0], D.questions.some(q => q.m === x.map && q.a.some(a => a[0] === w[0])));
}

console.log(bad ? 'test_paragraphs: ' + bad + ' of ' + checks + ' checks differ' : 'test_paragraphs: ' + checks + ' checks hold');
process.exit(bad ? 1 : 0);
