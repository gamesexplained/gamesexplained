'use strict';
// The cast sheet on the How it works page. Its data, <script id="wtss-cast">, is every class of
// actor's frames as bank 3's table at $EAC8 lists them, the bytes read from the parts' listings
// (with --write, this test puts them in the page). Its renderer, the block /* wtss-sprites */, is
// held to the game's own drawing: each frame of each class, plain and mirrored, at pixel positions
// 0 to 3, is drawn by draw_actors' body ($A6F8 to $A6F4: set_up_sprite, build_mask and the
// drawers, or draw_two_pieces) on the kit's Z80 with the 128K's paging, into the screen in bank 7
// filled with 0 and then with $FF, and every byte of the screen must be what the renderer gives.
// node games/spectrum/where-time-stood-still/test_cast.js [--write]   (--write updates the page)
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..', '..');
const { game } = require(path.join(ROOT, 'kit', 'scripts', 'port_check.js'));
const g = game(__dirname);
const { machine } = require('./wtss_machine.js');

const PARTS = { 0: 'main', 1: 'bank-01', 3: 'bank-03', 4: 'bank-04', 6: 'bank-06', 7: 'bank-07' };
const listings = {};
for (const [b, part] of Object.entries(PARTS)) listings[b] = g.listing(`parts/${part}/listing.json`);
const bankOf = b => listings[b].ram.slice(0xC000);
// n bytes from a in bank B paged in at $C000, and on past $FFFF into ROM 0's bytes the game reads
// (rom-excerpt.json): type $2D's sixth frame has the last two bytes of its mask there
const EX = g.json('rom-excerpt.json'), ROM0 = Buffer.from(EX.hex, 'hex');
const span = (B, a, n) => Uint8Array.from({ length: n }, (_, i) => {
  const x = (a + i) & 0xFFFF;
  if (x >= 0xC000) return B[x - 0xC000];
  if (x >= EX.from && x < EX.from + ROM0.length) return ROM0[x - EX.from];
  throw new Error(`a frame's bytes run on to $${x.toString(16)}, outside the bank and the ROM's excerpt`);
});

// The classes, from bank 3's $EAC8: five bytes each, the bank, the frame list and the animations.
// A frame list's length is its table's in the listing; types $14 to $1B are drawn in two pieces,
// placed by the tables at $F26A (bank 1) and $E2EF (bank 6), whose lengths are the listings' too.
const NAMES = ['Jarret', 'Gloria', 'Dirk', 'Clive', 'Types 4 to $0F', 'Types $10 to $13', 'Types $14 to $17',
  'Types $18 to $1B', 'Types $1C to $1F', 'Types $20 to $27', 'Types $28 to $2C', 'Type $2D'];
const TYPES = [0, 1, 2, 3, 4, 0x10, 0x14, 0x18, 0x1C, 0x20, 0x28, 0x2D];
const TWO = { 6: 0xF26A, 7: 0xE2EF };
const b64 = a => Buffer.from(a).toString('base64');
function tableLen(bank, a) {
  const e = listings[bank].listing.index.find(x => x.a === a);
  if (!e) throw new Error(`no table at $${a.toString(16)} in bank ${bank}'s listing`);
  return e.len;
}
function build() {
  const B3 = bankOf(3), main = listings[0].ram;
  const classes = NAMES.map((name, c) => {
    const e = 0xEAC8 - 0xC000 + c * 5, bank = B3[e], list = B3[e + 1] | B3[e + 2] << 8;
    const B = bankOf(bank), at = a => B[a - 0xC000], w = a => at(a) | at(a + 1) << 8;
    const frames = [];
    for (let f = 0; f < tableLen(bank, list) / 6; f++) {
      const a = list + 6 * f, wd = at(a), rows = at(a + 1), ga = w(a + 2), ma = w(a + 4);
      if (wd !== 3 && wd !== 4) throw new Error(`class ${c} frame ${f}: width ${wd}`);
      const n = (wd - 1) * rows;
      frames.push([wd, rows, ga, ma, b64(span(B, ga, n)), wd === 4 && ma >= 0xC000 ? b64(span(B, ma, n)) : '']);
      if (wd === 4 && ma < 0xC000 && ma !== 0x8521) throw new Error(`class ${c} frame ${f}: its mask at $${ma.toString(16)}`);
    }
    const out = { name, types: TYPES[c], bank, list, frames };
    if (TWO[c]) out.two = { at: TWO[c], t: b64(B.subarray(TWO[c] - 0xC000, TWO[c] - 0xC000 + tableLen(bank, TWO[c]))) };
    return out;
  });
  // what a sprite of the most rows, its top row the last of a character row, reads past the mask
  const most = Math.max(...classes.flatMap(c => c.frames.map(f => f[1])));
  return { t81: b64(main.subarray(0x8100, 0x8200)), t82: b64(main.subarray(0x8200, 0x8300)),
    after: b64(main.subarray(0x85E1, 0x8521 + 4 * (7 + most))), classes };
}

const RE = /(<script type="application\/json" id="wtss-cast">)([\s\S]*?)(<\/script>)/;
const data = build();
if (process.argv.includes('--write')) {
  const file = path.join(__dirname, 'index.html'), html = fs.readFileSync(file, 'utf8');
  if (!RE.test(html)) { console.log('FAIL index.html has no <script type="application/json" id="wtss-cast">'); process.exit(1); }
  fs.writeFileSync(file, html.replace(RE, (_, a, b, c) => a + JSON.stringify(data) + c));
  console.log('wrote index.html');
  process.exit(0);
}

let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.log('FAIL ' + what); } else console.log('ok   ' + what); };
const m = g.read('index.html').match(RE);
check(m && JSON.stringify(JSON.parse(m[2])) === JSON.stringify(data), 'index.html: the classes, frames and tables as the listings hold them');

const { wtssSprites } = g.run('index.html', 'wtss-sprites', 'wtssSprites');
const S = wtssSprites(data);
const M = machine(g), mem = M.mem;
M.run({ pc: 0x8534 }, 0x8546);                  // start builds the bit-reversal table at $8000
// The view from column 10 and pixel row 256 of the area; its row 0 is the screen's row 8 and its
// column 0 the screen's column 2 (the row table at $8D5D starts at $C022). Each actor stands at
// column 18 and its bottom at row 356 to 363, in view whole.
const VIEW_COL = 10, VIEW_ROW = 0x100, X = 8 * 18, Y = VIEW_ROW + 100;
const scrAddr = (col, row) => ((row & 0xC0) << 5) | ((row & 7) << 8) | ((row & 0x38) << 2) | col;
function gameDraw(cls, frame, x, y, fill) {
  M.page(7); mem.fill(fill, 0xC000, 0xD800); M.page(0);
  for (let a = 0xA03F; a <= 0xA053; a++) mem[a] = 0;         // nothing sunk
  mem[0x9631] = 0; mem[0x9632] = 0; mem[0x9633] = VIEW_COL; mem[0x9637] = VIEW_ROW & 255; mem[0x9638] = VIEW_ROW >> 8;
  mem[0x8D1E] = 0;                                            // screen 0 shown, so bank 7 drawn
  mem[0xA6F2] = 1; mem[0xA6F3] = 0;                           // no scenery in front
  const R = 0x8300, C = data.classes[cls];
  mem.fill(0, R, R + 32);
  mem[R] = C.types; mem[R + 0x19] = C.list & 255; mem[R + 0x1A] = C.list >> 8; mem[R + 0x1B] = frame; mem[R + 0x1F] = C.bank;
  mem[R + 0x14] = x & 255; mem[R + 0x15] = x >> 8; mem[R + 0x16] = y & 255; mem[R + 0x17] = y >> 8;
  M.run({ pc: 0xA6F8, iy: R, h: R >> 8, l: R & 255 }, 0xA6F4);
  M.page(7); const scr = mem.slice(0xC000, 0xD800); M.page(0);
  return scr;
}
function pageDraw(cls, frame, x, y, fill) {
  const scr = new Uint8Array(0x1800).fill(fill);
  S.draw(cls, frame, x, y, (col, row, gb, mb) => {
    const a = scrAddr(col - VIEW_COL + 2, row - VIEW_ROW + 8);
    scr[a] = (scr[a] & mb) | gb;
  });
  return scr;
}
for (let cls = 0; cls < data.classes.length; cls++) {
  let bad = 0, n = 0, first = '';
  for (let f = 0; f < S.count(cls); f++) for (const mir of [0, 0x80]) for (let k = 0; k < 8; k++) for (const fill of [0, 0xFF]) {
    const s = k & 3, y = Y + k;                               // every row of a character row
    const a = gameDraw(cls, f | mir, X + s, y, fill), b = pageDraw(cls, f | mir, X + s, y, fill);
    n++;
    if (Buffer.compare(Buffer.from(a), Buffer.from(b))) { bad++; if (!first) first = ` (first: frame ${f}${mir ? ' mirrored' : ''} at ${s}, bottom ${y}, fill ${fill})`; }
  }
  check(bad === 0, `${data.classes[cls].name}: ${S.count(cls)} frames, plain and mirrored, at pixels 0 to 3 across and every row of a character row down: ${bad} of ${n} screens differ from the game's${first}`);
}
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
