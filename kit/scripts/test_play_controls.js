// Test of site/lib/play-controls.js, the touch controller and full screen a Play tab can offer: the
// pad gives the eight directions by the angle of a touch from its centre, none in the dead centre,
// and keeps a direction a little past its edge so that it does not flicker; a thumb slides from one
// direction to the next without lifting, off the disc too; fire buttons take a finger each, each on
// the nearest button; a touch on the controller is the page's (the browser neither scrolls nor
// moves the focus), and everything lets go when the window loses the focus. Full screen carries the
// page's screen, bar and controller and puts each back where it was, by ✕, Escape or Back, adding
// one step to the history and taking it off again. Each Play page that loads it has a full screen
// switch and attaches it, and keeps no touch pad of its own beside it. Runs in node, on a stand-in
// for the page's document.
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
    tagName: tag, id: '', className: '', textContent: '', innerHTML: '', children: [], parentElement: null, attrs: {}, on: {},
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
  getElementById: id => html.find(n => n.id === id),
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
const plate = El('div'), screen = El('div'), bar = El('div'), button = El('button'), canvas = { width: 384, height: 272 };
plate.append(screen, bar); body.appendChild(plate);
screen.id = 'screen'; bar.id = 'bar';
let got = [];
const pc = PC.attach({ screen, canvas, bar, button, onPad: b => got.push(b) });
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
const pc2 = PC.attach({ screen: s2, canvas, fire: [{ label: 'B', bit: 32 }, { label: 'A', bit: 16 }], onPad: b => got2.push(b) });
const f2 = pc2.el.find(n => n.className === 'pc-fires');
check(f2.children.map(c => c.textContent).join() === 'B,A', 'two fire buttons, labelled, left to right');
f2.children[0].rect = { left: 0, top: 40, width: 50, height: 50 }; f2.children[1].rect = { left: 60, top: 0, width: 50, height: 50 };
f2.fire('pointerdown', { pointerId: 7, clientX: 20, clientY: 70 });
f2.fire('pointermove', { pointerId: 7, clientX: 90, clientY: 20 });
f2.fire('pointerup', { pointerId: 7 });
check(got2.join() === '32,16,0', 'B, then A as the thumb slides over, then nothing: ' + got2.join());

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
  check(!!full && full.contains(screen) && full.contains(bar) && full.contains(ctl), 'full screen carries the screen, the bar and the controller');
  check(html.classList.contains('pc-lock') && pc.on && button.attrs['aria-pressed'] === 'true', 'holds the page under it still, and the switch shows it on');
  check(history.length === len + 1 && history.state && history.state.playControls, 'and adds a step to the history, for Back');
  check(/^\d+px$/.test(screen.style.width), 'the picture is sized to the window (' + screen.style.width + ')');
  const esc = fireDoc('keydown', { key: 'Escape' });
  await new Promise(r => setTimeout(r, 5));
  const order = plate.children.filter(n => n.tagName !== '#comment');
  check(!pc.on && esc.defaultPrevented && order[0] === screen && order[1] === ctl && order[2] === bar, 'Escape puts each back where it was');
  check(!html.classList.contains('pc-lock') && screen.style.width === '' && button.attrs['aria-pressed'] === 'false', 'and the page as it was');
  check(backs === 1 && !body.children.some(n => n.className.includes('pc-full')), 'taking its step off the history again');
  check(plate.children.every(n => n.tagName !== '#comment'), 'and leaving no marks behind');
  pc.enter();
  history.state = null; fire('popstate');
  await new Promise(r => setTimeout(r, 5));
  check(!pc.on && backs === 1, 'Back leaves full screen, and stays on the page');
  pc.enter();
  full.children[0].children[0].onclick();
  await new Promise(r => setTimeout(r, 5));
  check(!pc.on && backs === 2, '✕ leaves it too');

  // --- the Play pages that use it
  let pages = 0;
  const games = path.join(ROOT, 'games');
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'work' && e.name !== 'node_modules') walk(p); continue; }
      if (!/^play(\.template)?\.html$/.test(e.name)) continue;
      const page = fs.readFileSync(p, 'utf8'), name = path.relative(ROOT, p);
      if (!page.includes('lib/play-controls.js')) continue;
      pages++;
      check((page.match(/<button\b[^>]*\bdata-fullscreen\b[^>]*aria-pressed="false"[^>]*>⛶ Full screen<\/button>/g) || []).length === 1, name + ' has one "⛶ Full screen" button with data-fullscreen, unpressed');
      check(/\bPlayControls\.attach\(/.test(page), name + ' calls PlayControls.attach');
      check(!/id="pl-pad"/.test(page), name + ' keeps no touch pad of its own beside it');
    }
  })(games);

  if (failed) { console.log(failed + ' failed'); process.exit(1); }
  console.log('play-controls.js: every check passed (' + pages + ' Play pages with it)');
})();
