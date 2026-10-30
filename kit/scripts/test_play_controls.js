// Test of site/lib/play-controls.js, what every Play tab has round its game's screen. The row
// above the screen holds the page's sound switch, its CRT screen switch and a Full screen switch,
// in that order. The joystick is there only for a page that asks for it: its pad gives the eight
// directions by the angle of a touch from its centre, none in the dead centre, and keeps a
// direction a little past its edge so that it does not flicker; a thumb slides from one direction
// to the next without lifting, off the disc too; fire buttons take a finger each, each on the
// nearest button; a touch on the controller is the page's (the browser neither scrolls nor moves
// the focus), and everything lets go when the window loses the focus. Full screen carries the
// page's screen, the row, its bar and the controller, keeps the row above the picture (beside it
// where it would cost the picture height) with the switch showing ✕, and puts each back where it
// was, by the switch, Escape or Back, adding one step to the history and taking it off again.
// Every Play page with a canvas attaches it, and a page with the joystick keeps no touch pad of
// its own beside it. Runs in node, on a stand-in for the page's document.
//   node kit/scripts/test_play_controls.js
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const LIB = path.join(ROOT, 'site', 'lib', 'play-controls.js');

let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.log('FAIL ' + what); } };

// --- a stand-in for the page: elements in a tree, their events, and the window around them
let listeners = {};
function El(tag) {
  const e = {
    tagName: tag, nodeType: 1, id: '', className: '', textContent: '', innerHTML: '', children: [], parentElement: null, attrs: {}, on: {},
    rect: { left: 0, top: 0, width: 390, height: 844 }, focused: 0, captured: new Set(),
    style: { setProperty(k, v) { this[k] = v; } },
    classList: {
      contains: c => e.className.split(/\s+/).includes(c),
      add: c => { if (!e.classList.contains(c)) e.className = (e.className + ' ' + c).trim(); },
      remove: c => { e.className = e.className.split(/\s+/).filter(x => x && x !== c).join(' '); },
      toggle: (c, on) => { if (on === undefined) on = !e.classList.contains(c); if (on) e.classList.add(c); else e.classList.remove(c); return on; },
    },
    setAttribute(k, v) { e.attrs[k] = String(v); }, getAttribute: k => e.attrs[k],
    addEventListener(t, f) { (e.on[t] = e.on[t] || []).push(f); },
    fire(t, props) { const ev = Object.assign({ type: t, target: e, button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }, props); for (const f of e.on[t] || []) f(ev); return ev; },
    getBoundingClientRect: () => e.rect,
    get clientWidth() { return e.rect.width; }, get clientHeight() { return e.rect.height; }, get offsetHeight() { return e.rect.height; },
    setPointerCapture(id) { e.captured.add(id); },
    focus() { e.focused++; },
    detach() { if (e.parentElement) { const s = e.parentElement.children; s.splice(s.indexOf(e), 1); e.parentElement = null; } },
    appendChild(n) { n.detach(); n.parentElement = e; e.children.push(n); return n; },
    append(...ns) { for (const n of ns) e.appendChild(n); },
    get firstChild() { return e.children[0] || null; },
    insertBefore(n, ref) { n.detach(); e.children.splice(e.children.indexOf(ref), 0, n); n.parentElement = e; return n; },
    before(n) { n.detach(); const s = e.parentElement.children; s.splice(s.indexOf(e), 0, n); n.parentElement = e.parentElement; },
    insertAdjacentElement(where, n) { n.detach(); const s = e.parentElement.children; s.splice(s.indexOf(e) + 1, 0, n); n.parentElement = e.parentElement; },
    replaceWith(n) { n.detach(); const p = e.parentElement, s = p.children; s.splice(s.indexOf(e), 1, n); n.parentElement = p; e.parentElement = null; },
    remove() { e.detach(); },
    contains(n) { for (; n; n = n.parentElement) if (n === e) return true; return false; },
    find(f) { if (f(e)) return e; for (const c of e.children) { const r = c.find(f); if (r) return r; } return null; },
  };
  return e;
}
const html = El('html'), head = El('head'), body = El('body');
html.append(head, body);
const document = {
  documentElement: html, head, body, hidden: false, fullscreenEnabled: false, fullscreenElement: null,
  createElement: El, createComment: () => El('#comment'),
  createTextNode: data => ({ nodeType: 3, data, detach() {}, find: () => null }),
  getElementById: id => html.find(n => n.id === id),
  querySelector: q => html.find(n => n.attrs && q.slice(1, -1) in n.attrs),   // [attribute] only
  addEventListener(t, f) { (listeners['doc-' + t] = listeners['doc-' + t] || []).push(f); },
};
const store = {};
let backs = 0;
const history = { state: null, length: 1, pushState(s) { this.state = s; this.length++; }, back() { backs++; this.state = null; setTimeout(() => fire('popstate'), 0); } };
function fire(t, props) { const ev = Object.assign({ type: t, preventDefault() {} }, props); for (const f of listeners[t] || []) f(ev); }
function fireDoc(t, props) { const ev = Object.assign({ type: t, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }, props); for (const f of listeners['doc-' + t] || []) f(ev); return ev; }
const globals = {
  document, history,
  navigator: { maxTouchPoints: 5 },
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  matchMedia: q => ({ matches: q === '(any-pointer: coarse)' }),
  addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
  ResizeObserver: class { observe() {} disconnect() {} },
  getComputedStyle: () => ({ borderLeftWidth: '1px', paddingLeft: '18px' }),
};
for (const [k, v] of Object.entries(globals)) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
require(LIB);
const PC = globalThis.PlayControls;

// --- the directions
const { UP, DOWN, LEFT, RIGHT } = PC;
const at = (deg, d) => [Math.cos(deg * Math.PI / 180) * d, Math.sin(deg * Math.PI / 180) * d];
const named = [[0, RIGHT], [45, RIGHT | DOWN], [90, DOWN], [135, DOWN | LEFT], [180, LEFT], [225, LEFT | UP], [270, UP], [315, UP | RIGHT]];
for (const [deg, bits] of named) {
  for (const off of [0, -22, 22]) check(PC.direction(...at(deg + off, 40), 50, 0) === bits, `a touch at ${deg + off}° gives ${bits}`);
}
check(PC.direction(...at(30, 10), 50, 0) === 0, 'the dead centre gives no direction');
check(PC.direction(...at(30, 12), 50, RIGHT | DOWN) === (RIGHT | DOWN), 'a direction held lasts a little into the dead centre');
check(PC.direction(...at(-28, 40), 50, RIGHT) === RIGHT, 'a direction held is kept a little past its edge');
check(PC.direction(...at(-28, 40), 50, 0) === (UP | RIGHT), 'which a new touch there does not get');
check(PC.direction(...at(-33, 40), 50, RIGHT) === (UP | RIGHT), 'and further past it the next direction takes over');
check(PC.nearest(10, 10, [[0, 0], [50, 0]]) === 0 && PC.nearest(30, 0, [[0, 0], [50, 0]]) === 1, 'a finger is on the nearest fire button');

// --- the controller on the page
const plate = El('div'), screen = El('div'), bar = El('div'), soundButton = El('button'), crtButton = El('button'), other = El('button'), canvas = Object.assign(El('canvas'), { width: 384, height: 272 });
soundButton.setAttribute('data-sound', ''); crtButton.setAttribute('data-crt', ''); crtButton.className = 'my-btn';
bar.append(other, crtButton, soundButton);
plate.append(screen, bar); body.appendChild(plate);
screen.id = 'screen'; bar.id = 'bar';
let got = [];
const pc = PC.attach({ screen, canvas, bar, pad: true, onPad: b => got.push(b) });
const above = pc.row, button = pc.button, glyph = button.children[0];
check(plate.children.indexOf(above) === plate.children.indexOf(screen) - 1 && above.className === 'pc-above', 'the row is made just above the screen');
check(above.children.length === 3 && above.children[0] === soundButton && above.children[1] === crtButton && above.children[2] === button && bar.children.length === 1,
  'and holds the sound switch, the CRT screen switch and the Full screen switch, in that order, the first two moved from the bar');
check(button.attrs['data-fullscreen'] === '' && button.attrs['aria-pressed'] === 'false' && button.className === 'my-btn', 'the Full screen switch is unpressed and has the CRT switch\'s class');
check(glyph.className === 'pc-glyph' && glyph.textContent === '⛶' && button.children[1].data === ' Full screen', 'and its ⛶ is in a box of its own');
const ctl = pc.el, pad = ctl.find(n => n.className === 'pc-pad'), fires = ctl.find(n => n.className === 'pc-fires');
check(plate.children.indexOf(ctl) === plate.children.indexOf(screen) + 1, 'the controller is docked just under the screen');
check(ctl.classList.contains('pc-touch') && pc.touch, 'and shows on a screen with touch');
check(/\.pc-pad\{[^}]*touch-action:none/.test(document.getElementById('pc-css').textContent) && /\.pc-fires\{[^}]*touch-action:none/.test(document.getElementById('pc-css').textContent),
  'a touch that starts on the pad or the fire buttons does not scroll or zoom the page');
pad.rect = { left: 0, top: 0, width: 120, height: 120 };
const fireEl = fires.children[0];
fireEl.rect = { left: 250, top: 20, width: 80, height: 80 };
const down = pad.fire('pointerdown', { pointerId: 1, clientX: 60, clientY: 8 });
check(down.defaultPrevented, 'a touch on the pad is the page\'s: the browser does nothing with it');
check(pad.captured.has(1), 'the pad keeps the touch when it leaves the disc');
pad.fire('pointermove', { pointerId: 1, clientX: 100, clientY: 20 });
pad.fire('pointermove', { pointerId: 1, clientX: 400, clientY: 61 });
pad.fire('pointermove', { pointerId: 1, clientX: 61, clientY: 62 });
pad.fire('pointerup', { pointerId: 1, clientX: 61, clientY: 62 });
check(got.join() === [UP, UP | RIGHT, RIGHT, 0].join(), 'a thumb slides up, up and right, right off the disc, the centre: ' + got.join());
got = [];
pad.fire('pointermove', { pointerId: 2, clientX: 0, clientY: 60 });
check(got.length === 0, 'a pointer that did not start on the pad (a mouse passing over) does nothing');
pad.fire('pointerdown', { pointerId: 3, clientX: 5, clientY: 60 });
const fd = fires.fire('pointerdown', { pointerId: 4, clientX: 290, clientY: 60 });
fires.fire('pointerup', { pointerId: 4 });
pad.fire('pointercancel', { pointerId: 3 });
check(got.join() === [LEFT, LEFT | 16, LEFT, 0].join() && fd.defaultPrevented, 'left and fire held together by two fingers: ' + got.join());
check(['contextmenu', 'mousedown'].every(t => ctl.fire(t).defaultPrevented), 'a long press or a mouse button on the controller leaves the focus where it is');
got = [];
pad.fire('pointerdown', { pointerId: 5, clientX: 60, clientY: 118 });
fire('blur');
check(got.join() === [DOWN, 0].join(), 'the window losing the focus lets go of everything');
pad.fire('pointerup', { pointerId: 5 });

// --- two fire buttons, a thumb sliding from one to the other
const s2 = El('div'); plate.appendChild(s2);
let got2 = [];
const pc2 = PC.attach({ screen: s2, canvas, pad: true, fire: [{ label: 'B', bit: 32 }, { label: 'A', bit: 16 }], onPad: b => got2.push(b) });
const f2 = pc2.el.find(n => n.className === 'pc-fires');
check(f2.children.map(c => c.textContent).join() === 'B,A', 'two fire buttons, labelled, left to right');
f2.children[0].rect = { left: 0, top: 40, width: 50, height: 50 }; f2.children[1].rect = { left: 60, top: 0, width: 50, height: 50 };
f2.fire('pointerdown', { pointerId: 7, clientX: 20, clientY: 70 });
f2.fire('pointermove', { pointerId: 7, clientX: 90, clientY: 20 });
f2.fire('pointerup', { pointerId: 7 });
check(got2.join() === '32,16,0', 'B, then A as the thumb slides over, then nothing: ' + got2.join());

// --- a page without the joystick
const s3 = El('div'); plate.appendChild(s3);
const pc3 = PC.attach({ screen: s3, canvas });
check(!plate.contains(pc3.el) && plate.children.indexOf(pc3.row) === plate.children.indexOf(s3) - 1 && pc3.row.children.slice(-1)[0] === pc3.button,
  'a page that does not ask for the joystick has none, and still has the row with its Full screen switch');

// --- the hands
check(!ctl.classList.contains('pc-left'), 'right-handed to start with: the pad for the left thumb');
pc.hand('left');
check(ctl.classList.contains('pc-left') && store['gamesexplained.hand'] === 'left', 'the hands swap, and the choice is kept');
pc.hand('right');

(async () => {
  // --- full screen, and every way back
  const len = history.length;
  button.fire('click');
  const full = body.children.find(n => n.className.split(' ').includes('pc-full'));
  check(!!full && full.contains(screen) && full.contains(above) && full.contains(bar) && full.contains(ctl), 'full screen carries the screen, the row above it, the bar and the controller');
  const top = full.children[0];
  check(top.className === 'pc-top' && top.children.length === 2 && top.children[0].className === 'pc-icon pc-swap' && top.children[1] === above && full.children[1].children[0] === screen,
    'the row stays above the picture, with ⇄ at its left');
  check(top.style.width === screen.style.width, 'the row is as wide as the picture, so its buttons keep their places');
  check(glyph.textContent === '✕', 'the switch shows ✕ while full screen lasts');
  full.rect = { left: 0, top: 0, width: 844, height: 390 }; pc.hand('right');
  check(full.classList.contains('pc-wide') && !full.classList.contains('pc-roomy') && top.style.width === '',
    'a phone on its side: the row\'s buttons go beside the picture, which keeps the height');
  full.rect = { left: 0, top: 0, width: 1280, height: 800 }; pc.hand('right');
  check(full.classList.contains('pc-wide') && full.classList.contains('pc-roomy') && top.style.width === screen.style.width,
    'a wide window with height to spare keeps the row above the picture');
  full.rect = { left: 0, top: 0, width: 390, height: 844 }; pc.hand('right');
  check(html.classList.contains('pc-lock') && pc.on && button.attrs['aria-pressed'] === 'true', 'holds the page under it still, and the switch shows it on');
  check(history.length === len + 1 && history.state && history.state.playControls, 'and adds a step to the history, for Back');
  check(/^\d+px$/.test(screen.style.width), 'the picture is sized to the window (' + screen.style.width + ')');
  check(above.style.width === '' && above.style.marginLeft === '', 'the row takes full screen\'s place, not the page\'s');
  canvas.rect = { left: 79, top: 0, width: 300, height: 212 };
  const esc = fireDoc('keydown', { key: 'Escape' });
  await new Promise(r => setTimeout(r, 5));
  const order = plate.children.filter(n => n.tagName !== '#comment');
  check(!pc.on && esc.defaultPrevented && order[0] === above && order[1] === screen && order[2] === ctl && order[3] === bar, 'Escape puts each back where it was');
  check(!html.classList.contains('pc-lock') && screen.style.width === '' && button.attrs['aria-pressed'] === 'false' && glyph.textContent === '⛶', 'and the page as it was');
  check(above.style.marginLeft === '60px' && above.style.width === '300px', 'on the page the row spans the picture, where the page puts it (' + above.style.marginLeft + ', ' + above.style.width + ')');
  check(backs === 1 && !body.children.some(n => n.className.includes('pc-full')), 'taking its step off the history again');
  check(plate.children.every(n => n.tagName !== '#comment'), 'and leaving no marks behind');
  pc.enter();
  history.state = null; fire('popstate');
  await new Promise(r => setTimeout(r, 5));
  check(!pc.on && backs === 1, 'Back leaves full screen, and stays on the page');
  pc.enter();
  button.fire('click');
  await new Promise(r => setTimeout(r, 5));
  check(!pc.on && backs === 2, 'the switch again leaves it too');
  check(['click'].every(t => { const f = screen.focused; above.fire(t, { target: crtButton }); return screen.focused === f + 1; }), 'a button in the row hands the keyboard back to the game');
  // full screen without the joystick: no controller, no ⇄
  pc3.enter();
  const full3 = body.children.find(n => n.className.split(' ').includes('pc-full') && n.contains(s3));
  check(!!full3 && full3.children[0].children.length === 1 && full3.children[0].children[0] === pc3.row && !full3.contains(pc3.el),
    'full screen without the joystick has neither the controller nor ⇄');
  pc3.button.fire('click');
  await new Promise(r => setTimeout(r, 5));
  check(!pc3.on && backs === 3 && plate.children.indexOf(pc3.row) === plate.children.indexOf(s3) - 1, 'and its switch puts it back');

  // --- the Play pages: each with a canvas attaches it, a port's template as well as the page
  let pages = 0, pads = 0;
  const games = path.join(ROOT, 'games');
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'work' && e.name !== 'node_modules') walk(p); continue; }
      if (!/^play(\.template)?\.html$/.test(e.name)) continue;
      const page = fs.readFileSync(p, 'utf8'), name = path.relative(ROOT, p);
      if (!/<canvas\b/.test(page)) continue;
      pages++;
      check(page.includes('lib/play-controls.js') && /\bPlayControls\.attach\(/.test(page), name + ' loads site/lib/play-controls.js and calls PlayControls.attach');
      check(!/<[a-z][^>]*\sdata-(fullscreen|above)\b/.test(page), name + ' leaves the Full screen switch and the row above the screen to PlayControls.attach');
      if (/\bPlayControls\.attach\(\{[\s\S]{0,400}?\bpad\s*:\s*true\b/.test(page)) {
        pads++;
        check(!/\bid="[a-z]+-pad"/.test(page), name + ' has the touch joystick, and keeps no touch pad of its own beside it');
      }
    }
  })(games);

  if (failed) { console.log(failed + ' failed'); process.exit(1); }
  console.log('play-controls.js: every check passed (' + pages + ' Play pages, ' + pads + ' with the touch joystick)');
})();
