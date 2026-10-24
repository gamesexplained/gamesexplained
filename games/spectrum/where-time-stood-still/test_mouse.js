'use strict';
// The Play tab's mouse (port/page/mouse.js) as the page carries it, on a clean checkout: the
// page's blocks run in node as test_play.js runs them, the mouse's pass at the checkpoint the page
// gives it ($86C1), and a press it asks for held for eight frames, as the page holds it. From the
// hand-over:
// - a click on the title does nothing; in play, a click opens the first menu;
// - with the menu open, the pointer goes where the mouse is, and the 128 draws it there: its
//   pixels on the screen start within two of the mouse's place;
// - a click off the menu's window changes nothing;
// - a click on the second character's portrait opens the second menu, for that character; a click
//   on its arrow goes back to the first menu;
// - a click on the pause icon pauses the game, and a click carries on, the menu still open;
// - a click on the first menu's arrow closes it.
// The icons are found by their action (the fifth byte of each icon's record, $D088 on for the
// first menu, $D0B0 for the second): 2 the second portrait, 5 the arrow, 6 pause.
//   node games/spectrum/where-time-stood-still/test_mouse.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/page/runtime.js', 'port/page/mouse.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, b === 'port/page/mouse.js' ? 'WTMouse' : 'WTPort');
const { WTPage, WTMouse } = globalThis;
const cost = JSON.parse(/^window\.WT_COST = ([\s\S]*?);\n<\/script>/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="wt-data">([^<]*)<\/script>/.exec(page)[1]);

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const MENU = 0x8D22, PAUSED = 0xBF30, FIRE = 16;

const rt = WTPage.create({ data, cost });
const mouse = WTMouse.create(rt), M = rt.M;
rt.restore(data, P => (function* () {
  for (const y of P.program(true)) {
    if (y && y.cp === 0x86C1) mouse.pass();
    else if (y && y.cp === 0x8521) mouse.reset();
    yield y;
  }
})());
let f = 0, threw = null, press = null, left = 0;
const run = (n, keys = []) => {
  for (let i = 0; i < n && !threw; i++, f++) {
    const k = new Set(keys);
    let joy = 0;
    if (left) { if (press === FIRE) joy = FIRE; else k.add(press); left--; }
    rt.input.keys = k; rt.input.joy = joy;
    try { rt.runFrame(); } catch (e) { threw = e; fail('frame ' + f + ': ' + e.message); }
  }
};
// until test holds or n frames have run
const until = (n, test) => { for (let i = 0; i < n && !threw; i++) { if (test()) return true; run(1); } return test(); };
const click = (x, y) => {
  const r = mouse.click(x, y);
  if (r) { press = r === 'space' ? 'SPACE' : FIRE; left = 8; }
  return r;
};
// the open menu's icon with this action, and a place in the middle of its picture
const icon = act => {
  const b3 = rt.mem.bank(3), m = mouse.menu();
  for (let k = 0, p = M[MENU] & 0x18 ? 0xD0B0 : 0xD088; k < 10; k++, p += 5) {
    const r = b3.subarray(p - 0xC000, p - 0xC000 + 5);
    if (r[4] === act) return { pic: r[0], x: m.x + r[1] * 8 + 12, y: m.y + r[2] + 8 };
  }
  return null;
};

run(30);
if (click(100, 100) !== null) fail('a click on the title asked for a key');
for (const k of ['2', '0', 'Y']) { run(8, [k]); run(32); }
run(100);
if (M[MENU]) fail('a menu is up at the start of play');
if (click(100, 60) !== 'space') fail('a click in play asked for no SPACE');
if (!until(60, () => M[MENU] === 3)) fail('a click in play opened no menu: $8D22 is ' + M[MENU]);
const m = mouse.menu();
if (!m) { console.log('FAIL: no menu'); process.exit(1); }

// the pointer where the mouse is, on the screen: the pixels that change when it moves away
const shot = () => rt.lastFrame().screen.slice(0, 6144);
const px = (s, x, y) => (s[((y & 0xC0) << 5) | ((y & 7) << 8) | ((y & 0x38) << 2) | (x >> 3)] >> (7 - (x & 7))) & 1;
const A = [m.x + 60, m.y + 34], B = [m.x + 100, m.y + 34];
mouse.move(...A); run(20);
if (M[0x8D23] !== 60 || M[0x8D24] !== 34) fail('the mouse at 60, 34 in the menu, the pointer at ' + M[0x8D23] + ', ' + M[0x8D24]);
const a = shot();
mouse.move(...B); run(20);
const b = shot();
let x0 = 256, y0 = 192;
for (let y = m.y; y < m.y + m.h; y++) for (let x = m.x; x < m.x + 90; x++) if (px(a, x, y) !== px(b, x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); }
if (Math.abs(x0 - A[0]) > 2 || Math.abs(y0 - A[1]) > 2) fail('the mouse at ' + A + ' on the screen, the pointer drawn from ' + x0 + ',' + y0);

// off the window: nothing
const p0 = [M[0x8D23], M[0x8D24]];
click(m.x + m.w + 8, m.y + 10); run(30);
if (M[MENU] !== 3 || M[0x8D23] !== p0[0] || M[0x8D24] !== p0[1]) fail('a click off the window changed the menu or the pointer');

// the second portrait, then the second menu's arrow
const who = icon(2);
click(who.x, who.y);
if (!until(120, () => M[MENU] === 0x18)) fail('a click on the second portrait opened no second menu: $8D22 is ' + M[MENU]);
else {
  const first = rt.mem.bank(3)[0xD0B0 - 0xC000];
  if (first !== who.pic) fail('the second menu is for picture ' + first + ', the portrait clicked ' + who.pic);
  const back = icon(5);
  click(back.x, back.y);
  if (!until(120, () => M[MENU] === 3)) fail('a click on the second menu\'s arrow went back to no first menu: $8D22 is ' + M[MENU]);
}

// pause, and on
const pause = icon(6);
click(pause.x, pause.y);
if (!until(40, () => M[PAUSED])) fail('a click on the pause icon did not pause the game');
else {
  run(20);
  if (click(100, 100) !== 'fire') fail('a click with the game paused asked for no fire');
  if (!until(40, () => !M[PAUSED])) fail('a click with the game paused did not carry on');
  run(60);
  if (M[PAUSED] || M[MENU] !== 3) fail('after the pause, $BF30 is ' + M[PAUSED] + ' and $8D22 ' + M[MENU]);
}

// the first menu's arrow
const close = icon(5);
click(close.x, close.y);
if (!until(120, () => !M[MENU])) fail('a click on the first menu\'s arrow did not close it: $8D22 is ' + M[MENU]);

console.log(f + ' frames; the pointer drawn from ' + x0 + ',' + y0 + ' for the mouse at ' + A);
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
