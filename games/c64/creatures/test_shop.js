#!/usr/bin/env node
// Hold the witch's shop widget (index.html: cr-cpu, cr-shop, SHOP) against the game.
// 1. The page's 6502 (cr-cpu) against the kit's simulator, kit/c64/cpu6502.js: random documented
//    instructions from random states, with the registers, the flags, the cycles and the memory
//    compared after each.
// 2. Every byte of the shop's code and tables the page carries is the shop's listing's (or the
//    engine's), and every stage's message bytes are its level file's, the files loaded as the
//    game loads them; each stage's lives mark is the level's.
// 3. The greeting the shop's code picks, for every stage and every count of lives from 0 to 9:
//    message 0 with none, 2 below the level's mark, 1 otherwise.
// 4. The message box against the emulator's (test_shop.json): the shop before level 1.2 entered
//    with 5 lives, the box's cells at the end of each pass of the shop's main loop from the first
//    to the end of INGREDIENTS, then INFORMATION bought four times, the fourth refused. The runs
//    of identical frames must come in the same order and last as long, but for the first (the
//    emulator's starts before the shop's first pass or the press) and the last of each, which
//    the record cuts off.
//   node games/c64/creatures/test_shop.js [page.html]
const path = require('path'), crypto = require('crypto'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU, OPCODES } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
globalThis.atob = globalThis.atob || ((s) => Buffer.from(s, 'base64').toString('binary'));
const { crCPU } = g.run(page, 'cr-cpu', 'crCPU');
const { crShop } = g.run(page, 'cr-shop', 'crShop');
const mm = g.read(page).match(/const SHOP = (\{.*?\});\n/);
if (!mm) { console.error('no SHOP data'); process.exit(1); }
const SHOP = JSON.parse(mm[1]), SEEN = g.json('test_shop.json');
let bad = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const hex = (n) => '$' + n.toString(16).toUpperCase();

// 1. the 6502
const DOC = new Set(['adc', 'and', 'asl', 'bcc', 'bcs', 'beq', 'bit', 'bmi', 'bne', 'bpl', 'bvc', 'bvs', 'clc', 'cld', 'cli', 'clv',
  'cmp', 'cpx', 'cpy', 'dec', 'dex', 'dey', 'eor', 'inc', 'inx', 'iny', 'jmp', 'jsr', 'lda', 'ldx', 'ldy', 'lsr', 'nop', 'ora', 'pha',
  'php', 'pla', 'plp', 'rol', 'ror', 'rti', 'rts', 'sbc', 'sec', 'sed', 'sei', 'sta', 'stx', 'sty', 'tax', 'tay', 'tsx', 'txa', 'txs', 'tya']);
const ops = []; for (let o = 0; o < 256; o++) if (DOC.has(OPCODES[o][0])) ops.push(o);
let seed = 1990; const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) >>> 16;
const N = 20000, base = new Uint8Array(0x10000);
for (let k = 0; k < N; k++) {
  if (k % 500 === 0) for (let a = 0; a < 0x10000; a++) base[a] = rnd() & 255;
  const m1 = base.slice(), pc = rnd() & 0xFFFF, op = ops[k % ops.length];
  for (let i = 0; i < 3; i++) m1[(pc + i) & 0xFFFF] = i ? rnd() & 255 : op;
  const m2 = m1.slice(), r = { a: rnd() & 255, x: rnd() & 255, y: rnd() & 255, sp: rnd() & 255, p: rnd() & 255 };
  const A = new CPU(m1); A.setRegs(r); A.pc = pc; A.step();
  const B = crCPU(m2); B.regs(r); B.pc = pc; B.step();
  const b = B.regs(), want = [A.a, A.x, A.y, A.sp, A.p, A.pc, A.cycles].join(), got = [b.a, b.x, b.y, b.sp, b.p, B.pc, B.cycles].join();
  if (want !== got || !Buffer.from(m1.buffer).equals(Buffer.from(m2.buffer)))
    fail('cr-cpu', OPCODES[op].join(' '), 'from', JSON.stringify(r), 'kit', want, 'page', got);
}

// 2. the bytes
const E = g.listing('parts/engine/listing.json'), part = (p) => g.json('parts/' + p + '/part.json');
function loaded(p) {
  const ram = E.ram.slice(), has = E.has.slice(), chain = [];
  for (let q = p; q && q !== 'engine'; q = part(q).over) chain.unshift(q);
  for (const q of chain.concat(['shop'])) {
    const L = g.listing('parts/' + q + '/listing.json');
    for (let a = 0; a < 0x10000; a++) if (L.has[a]) { ram[a] = L.ram[a]; has[a] = true; }
  }
  return { ram, has };
}
let bytes = 0;
const check = (G, list, what) => {
  for (const [a, h] of list) for (let i = 0; i < h.length / 2; i++) {
    const v = parseInt(h.substr(2 * i, 2), 16); bytes++;
    if (!G.has[a + i] || G.ram[a + i] !== v) fail(what, hex(a + i), 'page', v, 'listing', G.has[a + i] ? G.ram[a + i] : 'none');
  }
};
for (const st of SHOP.stages) {
  const G = loaded(st.part);
  check(G, SHOP.mem, st.part + ' code');
  check(G, st.text, st.part + ' text');
  if (G.ram[0x8EFB] !== st.mark) fail(st.part, 'lives mark', st.mark, 'listing', G.ram[0x8EFB]);
}

// 3. the greeting
const shop = crShop(SHOP, crCPU);
SHOP.stages.forEach((st, k) => {
  for (let lives = 0; lives < 10; lives++) {
    shop.enter(k, lives);
    const want = lives === 0 ? 0 : lives < st.mark ? 2 : 1;
    if (shop.st.greeting !== want) fail(st.name, lives, 'lives: greeting', shop.st.greeting, 'not', want);
    const G = loaded(st.part), at = G.ram[0x8EEF + want] | G.ram[0x8EF5 + want] << 8;
    if ((shop.m[0xF0B9] | shop.m[0xF0BF] << 8) !== at) fail(st.name, lives, 'lives: message 0 is not the level\'s message', want);
  }
});

// 4. the message box, frame by frame
const box = []; for (const [a, s, , grp] of SHOP.cells) if (!grp) for (let i = 0; i < s.length / 2; i++) box.push(a + i);
const key = () => crypto.createHash('sha1').update(Buffer.from(box.map((a) => shop.m[a]).concat(box.map((a) => shop.col[a - 0x4400])))).digest('hex').slice(0, 16);
function runs(n, first) {
  const out = [];
  for (let f = 0; f < n; f++) {
    if (f || !first) shop.frame(); else first();
    const k = key();
    if (out.length && out[out.length - 1][0] === k) out[out.length - 1][1]++; else out.push([k, 1]);
  }
  return out;
}
function same(what, got, w) {
  if (got.length !== w.length) { fail(what, 'the page has', got.length, 'runs of frames, the emulator', w.length); return; }
  got.forEach(([k, n], i) => {
    if (k !== w[i][0]) fail(what, 'run', i, 'shows', k, 'the emulator', w[i][0]);
    else if (n !== w[i][1] && i > 0 && i < got.length - 1) fail(what, 'run', i, 'lasts', n, 'frames, the emulator\'s', w[i][1]);
  });
}
shop.enter(SEEN.stage, SEEN.lives);
const greet = runs(587);
same('greeting', greet.slice(0, SEEN.greet.length), SEEN.greet);
if (!shop.st.phase) fail('the page never reached the INGREDIENTS box');
SEEN.clues.forEach((want, p) => {
  let r = null;
  const got = runs(260, () => { r = shop.clue(); });
  if (r !== (p < 3 ? 'bought' : 'refused')) fail('clue', p + 1, r);
  same('clue ' + (p + 1), got, want);
});
console.log(`${N} instructions on both 6502s; ${bytes} bytes held against the listings; the greeting for ${SHOP.stages.length} stages and 0-9 lives; `
  + `the message box through the greeting and four purchases, ${SEEN.greet.length + SEEN.clues.reduce((t, c) => t + c.length, 0)} runs of frames: ${bad ? bad + ' differ' : 'all match'}`);
process.exit(bad ? 1 : 0);
