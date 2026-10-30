// What every Play tab has round its game's screen: a row of switches just above it (the sound,
// the CRT screen and full screen), full screen itself, and for a game played with a joystick a
// joystick for the thumb, docked under the screen on the page and made as big as the phone allows
// in full screen. No dependencies. Exposes PlayControls (window.PlayControls on a page;
// globalThis.PlayControls in node, for tests).
//
//   const pc = PlayControls.attach({ screen, canvas, bar, pad, fire, dock, onPad, onChange })
//     screen    the page's game screen: the element that holds the canvas (and the CRT screen's
//               canvas and any overlay laid over it); full screen carries it whole
//     canvas    the game's canvas, whose width and height give the picture's shape
//     bar       the page's bar of buttons, carried into full screen with them (optional)
//     pad       true for a game the page plays with a joystick: the touch joystick, which is off
//               unless a page asks for it
//     fire      the fire buttons, left to right: [{ label, bit }] (default one, 'Fire', bit 16); two
//               for a game with two, such as [{ label: 'B', bit: 32 }, { label: 'A', bit: 16 }]
//     dock      the element the docked controller is put at the end of (default: just after screen)
//     onPad     onPad(bits) each time the controller's bits change: 1 up, 2 down, 4 left, 8 right
//               (the C64 joystick's bits, set for a direction pressed), and each fire button's bit
//     onChange  onChange(on) when full screen starts or ends
//   pc.on, pc.bits, pc.touch, pc.enter(), pc.exit(), pc.toggle(), pc.hand('left' or 'right'),
//   pc.row, pc.button
//
// The row is made just before screen, as wide as the picture and at its right: the page's own
// sound switch ([data-sound]), then its CRT screen switch ([data-crt]), each moved there from
// wherever the page has it, then the ⛶ Full screen switch, made here with the CRT switch's class
// so that it looks like the page's buttons. A button in the row hands the keyboard back to the
// game, as a bar's do: to its screen, or its canvas, whichever takes the focus.
//
// The pad is one disc for the left thumb (the right one with the hands swapped, ⇄; the viewer's
// choice holds on every page, localStorage 'gamesexplained.hand'): a touch anywhere on it gives one
// of the eight directions, by its angle from the centre, or none in the dead centre, and the thumb
// slides from one direction to the next without lifting, on the disc or off it (the pad keeps the
// touch, pointer capture). Fire buttons take any number of fingers, each on the button nearest
// it, so a thumb slides from one to the other too. A touch that starts on the controller neither
// scrolls nor zooms the page (touch-action: none); one anywhere else scrolls it as usual. The
// docked controller shows only on a screen that has touch; a mouse and the keyboard play as before.
// A page without pad has no controller, on the page or in full screen.
//
// Full screen lays the page's screen, the row above it, its bar and the controller over the whole
// window. The row stays just above the picture, as wide as it, with ⇄ at its left when the
// joystick shows, so its buttons keep their places against the picture. Upright, the page's bar
// is under the picture and the controller at the bottom. On its side the picture is between two
// bands, the pad at the foot of the left one, the bar and the fire buttons in the right; where the
// row would take height from the picture (a phone on its side), its buttons go to the top of the
// right band instead, beside the picture's top corner, and ⇄ to the top of the left. The
// browser's own full screen is asked for too where it has one (a phone's browser hides its bars
// then), and the window is covered where it has none (an iPhone's Safari). Every way out works and
// puts the page back as it was: the switch again, its ⛶ a ✕ while full screen lasts, Escape, the
// browser leaving its full screen, and the phone's Back, which full screen adds a step to the
// page's history for. While it lasts the screen is kept from dimming (the Screen Wake Lock API,
// where there is one).
(function (root) {
  'use strict';
  const KEY = 'gamesexplained.hand';
  const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8;
  // the eight directions by sector, clockwise from the right, as the screen's y runs down
  const SECTORS = [RIGHT, RIGHT | DOWN, DOWN, DOWN | LEFT, LEFT, LEFT | UP, UP, UP | RIGHT];
  const DEAD = 0.25;    // the dead centre, as a share of the disc's radius
  const KEEP = 8;       // degrees past a sector's edge that a direction held is kept, so it does not flicker
  const ROW = 56;       // the height the row of buttons above the picture takes in full screen, px

  // The direction a touch at (dx, dy) from the centre of a disc of radius r gives, held is the
  // direction given last: its bits, or 0 in the dead centre.
  function direction(dx, dy, r, held) {
    const d = Math.hypot(dx, dy);
    if (d < r * DEAD * (held ? 0.8 : 1)) return 0;
    const a = Math.atan2(dy, dx) * 180 / Math.PI;
    const s = SECTORS.indexOf(held);
    if (s >= 0 && Math.abs(((a - s * 45) % 360 + 540) % 360 - 180) <= 22.5 + KEEP) return held;
    return SECTORS[((Math.round(a / 45) % 8) + 8) % 8];
  }
  // The button nearest the point (x, y) among centres [[x, y], ...]: its index.
  function nearest(x, y, centres) {
    let best = 0, bd = Infinity;
    centres.forEach(([cx, cy], i) => { const d = Math.hypot(x - cx, y - cy); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  const CSS = `
.pc{display:none;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;--pc-pad:116px;--pc-fire:76px;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.pc.pc-touch{display:flex}
.pc-left .pc,.pc.pc-left{flex-direction:row-reverse}
.pc-pad{position:relative;flex:none;width:var(--pc-pad);height:var(--pc-pad);border-radius:50%;touch-action:none;color:rgba(47,49,54,.55);background:radial-gradient(circle,rgba(47,49,54,.04) 0 24%,rgba(47,49,54,.09) 25% 100%);border:2px solid rgba(47,49,54,.3)}
.pc-pad svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.pc-knob{position:absolute;left:31%;top:31%;width:38%;height:38%;border-radius:50%;background:#2f3136;box-shadow:0 2px 6px rgba(0,0,0,.3);pointer-events:none}
.pc-fires{display:flex;align-items:flex-end;gap:12px;flex:none;touch-action:none}
.pc-fire{width:var(--pc-fire);height:var(--pc-fire);border-radius:50%;display:flex;align-items:center;justify-content:center;background:#c8463a;color:#fff;font:700 calc(var(--pc-fire) * .2)/1 Lato,system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;box-shadow:0 4px 0 #8e2f26;pointer-events:none}
.pc-fire+.pc-fire{margin-bottom:calc(var(--pc-fire) * .5)}
.pc-fire.on{transform:translateY(3px);box-shadow:0 1px 0 #8e2f26;filter:brightness(1.15)}
.pc-mid{display:flex;flex-direction:column;align-items:center;gap:8px}
.pc-above{display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:flex-end;gap:8px;margin-bottom:10px}
:where(.pc-above) button{font-family:var(--fb,Lato,system-ui,sans-serif);font-size:14px;font-weight:700;background:var(--surface-2,#f1efe9);color:var(--ink,#2f3136);border:1px solid var(--line,#d6d3cb);border-radius:8px;padding:7px 12px;cursor:pointer}
:where(.pc-above) button[aria-pressed="true"]{background:var(--ink,#2f3136);color:#fff;border-color:var(--ink,#2f3136)}
:where(.pc-above) button:hover{border-color:var(--ink-mute,#8b8d93)}
@media (max-width:520px){.pc-above{gap:6px}.pc-above button{font-size:12px;padding:6px 7px}}
.pc-glyph{display:inline-block;width:1.2em;text-align:center}
.pc-icon{font:700 14px/1 Lato,system-ui,sans-serif;min-width:40px;height:40px;padding:0 12px;border-radius:20px;border:1px solid rgba(127,127,127,.45);background:rgba(127,127,127,.12);color:inherit;cursor:pointer;touch-action:manipulation}
html.pc-lock,html.pc-lock body{overflow:hidden;overscroll-behavior:none}
.pc-full{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;background:#000;color:#e9e7e1;touch-action:none;overscroll-behavior:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;
  padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
.pc-full:fullscreen{width:100%;height:100%}
.pc-top{display:flex;align-items:flex-end;gap:8px;margin:0 auto;padding:8px 0 10px;max-width:100%}
.pc-top>.pc-above{margin:0 0 0 auto}
.pc-stage{display:flex;justify-content:center;align-items:flex-start;padding:0 8px}
.pc-stage>*{box-shadow:none!important;outline:none!important;max-width:none!important;margin:0!important}
.pc-stage canvas{max-width:none!important}
.pc-slot{display:flex;justify-content:center;padding:10px 8px 0}
.pc-slot>*{margin:0!important;justify-content:center}
.pc-slot>*>[aria-hidden="true"]{display:none}
.pc-slot>*>[aria-live]{margin:0!important;flex-basis:100%;text-align:center;color:#a9abb0}
.pc-full .pc{margin:auto 0 0;padding:12px 18px 22px}
.pc-full .pc-mid{display:none}
.pc-full .pc-pad{color:rgba(233,231,225,.6);background:radial-gradient(circle,rgba(255,255,255,.03) 0 24%,rgba(255,255,255,.08) 25% 100%);border-color:rgba(233,231,225,.32)}
.pc-full .pc-knob{background:#e9e7e1}
.pc-wide{display:grid;grid-template-columns:var(--pc-band) minmax(0,1fr) var(--pc-band);grid-template-rows:auto minmax(0,1fr) auto;
  grid-template-areas:"swap stage above" ". stage bar" "pad stage fire"}
.pc-wide.pc-left{grid-template-areas:"swap stage above" ". stage bar" "fire stage pad"}
.pc-wide.pc-roomy{grid-template-areas:". top bar" ". stage bar" "pad stage fire"}
.pc-wide.pc-roomy.pc-left{grid-template-areas:". top bar" ". stage bar" "fire stage pad"}
.pc-roomy .pc-top{grid-area:top;justify-self:center;padding-top:4px}
.pc-wide:not(.pc-roomy) .pc-top{display:contents}
.pc-wide:not(.pc-roomy) .pc-top>.pc-swap{grid-area:swap;justify-self:start;align-self:start;margin:8px}
.pc-wide:not(.pc-roomy) .pc-top>.pc-above{grid-area:above;justify-self:stretch;align-self:start;margin:8px 8px 0}
.pc-wide:not(.pc-roomy) .pc-above{flex-direction:column;align-items:stretch;flex-wrap:nowrap;gap:6px}
.pc-wide:not(.pc-roomy) .pc-above button{font-size:12px;padding:5px 8px}
.pc-wide .pc-stage{grid-area:stage;padding:4px 0}
.pc-roomy .pc-stage{padding:0 0 4px}
.pc-wide .pc-slot{grid-area:bar;padding:8px;align-items:flex-start;overflow:auto}
.pc-wide .pc-slot>*{flex-direction:column;align-items:stretch;flex-wrap:nowrap;gap:6px}
.pc-wide .pc-slot button{font-size:12px;padding:5px 8px}
.pc-wide .pc-slot>*>[aria-live]{display:none}
.pc-wide .pc.pc-touch{display:contents}
.pc-wide .pc-pad{grid-area:pad;align-self:end;justify-self:center;margin:0 0 18px}
.pc-wide .pc-fires{grid-area:fire;align-self:end;justify-self:center;margin:0 0 18px}`;

  const ARROWS = '<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="43,17 50,10 57,17"/><polyline points="43,83 50,90 57,83"/><polyline points="17,43 10,50 17,57"/><polyline points="83,43 90,50 83,57"/></g></svg>';

  function stored() { try { return root.localStorage.getItem(KEY) === 'left' ? 'left' : 'right'; } catch (e) { return 'right'; } }
  function store(h) { try { root.localStorage.setItem(KEY, h); } catch (e) { /* no storage: the choice lasts for this visit */ } }
  function hasTouch() {
    return !!((root.matchMedia && root.matchMedia('(any-pointer: coarse)').matches) || (root.navigator && root.navigator.maxTouchPoints > 0));
  }
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

  function attach(o) {
    const doc = document, screen = o.screen, canvas = o.canvas, bar = o.bar || null, usePad = !!o.pad;
    const fires = o.fire && o.fire.length ? o.fire : [{ label: 'Fire', bit: 16 }];
    if (!doc.getElementById('pc-css')) { const s = doc.createElement('style'); s.id = 'pc-css'; s.textContent = CSS; doc.head.appendChild(s); }
    const el = (tag, cls, html) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

    // --- the controller
    const pc = el('div', 'pc'), pad = el('div', 'pc-pad', ARROWS), knob = el('div', 'pc-knob'), mid = el('div', 'pc-mid'), fireBox = el('div', 'pc-fires');
    pad.setAttribute('aria-hidden', 'true'); fireBox.setAttribute('aria-hidden', 'true');
    pad.appendChild(knob);
    const fireEls = fires.map(f => { const b = el('div', 'pc-fire'); b.textContent = f.label; fireBox.appendChild(b); return b; });
    const swap = () => { const b = el('button', 'pc-icon pc-swap'); b.type = 'button'; b.textContent = '⇄'; b.title = 'Swap the joystick and the fire buttons to the other hands'; b.setAttribute('aria-label', 'Swap hands'); b.onclick = () => api.hand(hand === 'left' ? 'right' : 'left'); return b; };
    mid.appendChild(swap());
    pc.append(pad, mid, fireBox);
    if (usePad) { if (o.dock) o.dock.appendChild(pc); else screen.insertAdjacentElement('afterend', pc); }
    const touch = hasTouch();
    pc.classList.toggle('pc-touch', touch);
    for (const t of ['contextmenu', 'mousedown']) pc.addEventListener(t, e => e.preventDefault());
    pc.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

    let dir = 0, padId = null, last = 0;
    const firePtrs = new Map();   // pointer → the fire button it is on
    function emit() {
      let bits = dir;
      for (const i of firePtrs.values()) bits |= fires[i].bit;
      fireEls.forEach((b, i) => b.classList.toggle('on', [...firePtrs.values()].includes(i)));
      if (bits !== last) { last = bits; if (o.onPad) o.onPad(bits); }
    }
    function showKnob() {
      const s = SECTORS.indexOf(dir), r = pad.clientWidth * 0.3;
      knob.style.transform = s < 0 ? '' : `translate(${(Math.cos(s * Math.PI / 4) * r).toFixed(1)}px,${(Math.sin(s * Math.PI / 4) * r).toFixed(1)}px)`;
    }
    function padMove(e) {
      const b = pad.getBoundingClientRect();
      const d = direction(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2), b.width / 2, dir);
      if (d !== dir) { dir = d; showKnob(); emit(); }
    }
    function fireAt(e) {
      const centres = fireEls.map(b => { const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      const i = nearest(e.clientX, e.clientY, centres);
      if (firePtrs.get(e.pointerId) !== i) { firePtrs.set(e.pointerId, i); emit(); }
    }
    const capture = (t, e) => { try { t.setPointerCapture(e.pointerId); } catch (x) { /* the pointer has gone already */ } };
    pad.addEventListener('pointerdown', e => {
      if (e.button > 0 || padId !== null) return;
      e.preventDefault(); padId = e.pointerId; capture(pad, e); padMove(e);
    });
    pad.addEventListener('pointermove', e => { if (e.pointerId === padId) padMove(e); });
    const padEnd = e => { if (e.pointerId !== padId) return; padId = null; dir = 0; showKnob(); emit(); };
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(t, padEnd);
    fireBox.addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); capture(fireBox, e); fireAt(e); });
    fireBox.addEventListener('pointermove', e => { if (firePtrs.has(e.pointerId)) fireAt(e); });
    const fireEnd = e => { if (firePtrs.delete(e.pointerId)) emit(); };
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) fireBox.addEventListener(t, fireEnd);
    function letGo() { padId = null; dir = 0; firePtrs.clear(); showKnob(); emit(); }
    root.addEventListener('blur', letGo);

    // --- the hands
    let hand = stored();
    function showHand() { pc.classList.toggle('pc-left', hand === 'left'); full.classList.toggle('pc-left', hand === 'left'); }

    // --- full screen
    const full = el('div', 'pc-full'), top = el('div', 'pc-top'), stage = el('div', 'pc-stage'), slot = el('div', 'pc-slot');
    full.setAttribute('role', 'dialog'); full.setAttribute('aria-label', 'The game, full screen');
    if (usePad && touch) top.appendChild(swap());
    full.append(top, stage, slot);

    // the keyboard to the game: its screen, or its canvas, whichever takes the focus; on a page whose
    // game takes neither, away from the button, to the page
    function focusGame() {
      for (const n of [screen, canvas]) {
        try { n.focus({ preventScroll: true }); } catch (e) { /* not focusable */ }
        if (doc.activeElement === n) return;
      }
      const a = doc.activeElement;
      if (a && row.contains(a)) a.blur();
    }

    // --- the row above the screen: the page's sound and CRT screen switches, and full screen's,
    // whose ⛶ is ✕ while full screen lasts, in a box of its own width so that nothing beside it moves
    const row = el('div', 'pc-above'), sound = doc.querySelector('[data-sound]'), crt = doc.querySelector('[data-crt]');
    const button = el('button', (crt || sound || {}).className || ''), glyph = el('span', 'pc-glyph');
    button.type = 'button'; button.setAttribute('data-fullscreen', ''); button.setAttribute('aria-pressed', 'false');
    button.title = 'The game over the whole screen' + (usePad ? ', with a bigger joystick on a touch screen' : '') +
      '; this button again, Escape or Back returns to the page';
    glyph.textContent = '⛶'; glyph.setAttribute('aria-hidden', 'true');
    button.append(glyph, doc.createTextNode(' Full screen'));
    for (const b of [sound, crt, button]) if (b) row.appendChild(b);
    screen.before(row);
    row.addEventListener('click', focusGame);
    // on the page the row spans the picture, wherever the page puts the picture in its screen
    function align() {
      row.style.marginLeft = row.style.width = '';
      const p = row.parentElement, a = canvas.getBoundingClientRect();
      if (on || !p || !a.width || !root.getComputedStyle) return;
      const b = p.getBoundingClientRect(), s = root.getComputedStyle(p);
      row.style.marginLeft = Math.max(0, a.left - b.left - (parseFloat(s.borderLeftWidth) || 0) - (parseFloat(s.paddingLeft) || 0)) + 'px';
      row.style.width = a.width + 'px';
    }
    if (root.ResizeObserver) { const ro = new ResizeObserver(align); ro.observe(canvas); ro.observe(screen.parentElement || screen); }
    for (const t of ['contextmenu']) full.addEventListener(t, e => e.preventDefault());
    full.addEventListener('touchmove', e => { if (!slot.contains(e.target)) e.preventDefault(); }, { passive: false });
    showHand();

    let on = false, real = false, pushed = false, popping = false, lock = null, marks = null, ro = null;
    function wake() {
      if (!on || !root.navigator.wakeLock || doc.hidden) return;
      root.navigator.wakeLock.request('screen').then(l => { if (on) lock = l; else l.release(); }).catch(() => {});
    }
    function layout() {
      if (!on) return;
      const W = full.clientWidth, H = full.clientHeight, aspect = canvas.width / canvas.height;
      const wide = W > H * 1.15;
      full.classList.toggle('pc-wide', wide);
      let size;
      if (wide) {
        const band = Math.round(Math.min(W * 0.3, Math.max(150, (W - H * aspect) / 2)));
        full.style.setProperty('--pc-band', band + 'px');
        size = Math.min(band - 24, H * 0.46, 210);
        // the row stays above the picture where the picture, as wide as the middle allows, leaves
        // it the height; otherwise its buttons go beside the picture, in the right band
        full.classList.toggle('pc-roomy', H - (W - 2 * band) / aspect >= ROW);
      } else size = Math.min(W * 0.42, H * 0.25, 200);
      pc.style.setProperty('--pc-pad', Math.round(size) + 'px');
      pc.style.setProperty('--pc-fire', Math.round(size * (fires.length > 1 ? 0.48 : 0.6)) + 'px');
      // the picture: as big as its shape allows in what the rest leaves
      const pw = wide ? stage.clientWidth : W - 16;
      const ph = wide ? stage.clientHeight - 8 : H - top.offsetHeight - slot.offsetHeight - (usePad && touch ? pc.offsetHeight : 0) - 24;
      const w = Math.max(64, Math.floor(Math.min(pw, ph * aspect)));
      screen.style.width = w + 'px';
      top.style.width = wide && !full.classList.contains('pc-roomy') ? '' : w + 'px';   // the row as wide as the picture
      showKnob();
    }
    function enter() {
      if (on) return;
      on = true; letGo();
      // each node carried leaves a mark where it was, to go back to
      marks = [screen, row, bar, usePad && pc].filter(Boolean).map(n => { const m = doc.createComment('full screen'); n.before(m); return [n, m]; });
      stage.appendChild(screen);
      top.appendChild(row);
      align();
      if (bar) slot.appendChild(bar);
      if (usePad) full.appendChild(pc);
      doc.documentElement.classList.add('pc-lock');
      doc.body.appendChild(full);
      const ask = full.requestFullscreen || full.webkitRequestFullscreen;
      real = false;
      if (ask && (doc.fullscreenEnabled || doc.webkitFullscreenEnabled)) {
        real = true;
        try { Promise.resolve(ask.call(full, { navigationUI: 'hide' })).catch(() => { real = false; }); } catch (e) { real = false; }
      }
      try { root.history.pushState({ playControls: true }, ''); pushed = true; } catch (e) { pushed = false; }
      ro = new ResizeObserver(layout); ro.observe(full);
      layout(); wake();
      button.setAttribute('aria-pressed', 'true');
      glyph.textContent = '✕';
      focusGame();
      if (o.onChange) o.onChange(true);
    }
    function exit(how) {
      if (!on) return;
      on = false; letGo();
      if (ro) { ro.disconnect(); ro = null; }
      for (const [n, m] of marks) { m.replaceWith(n); }
      marks = null;
      screen.style.width = '';
      full.remove();
      align();
      doc.documentElement.classList.remove('pc-lock');
      if (fsElement()) { const p = (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc); if (p && p.catch) p.catch(() => {}); }
      real = false;
      // the step full screen added to the history taken off again, unless Back has taken it
      if (pushed && how !== 'back' && root.history.state && root.history.state.playControls) { popping = true; root.history.back(); }
      pushed = false;
      if (lock) { lock.release().catch(() => {}); lock = null; }
      button.setAttribute('aria-pressed', 'false');
      glyph.textContent = '⛶';
      focusGame();
      if (o.onChange) o.onChange(false);
    }
    root.addEventListener('popstate', () => { if (popping) { popping = false; return; } if (on) exit('back'); });
    for (const t of ['fullscreenchange', 'webkitfullscreenchange']) doc.addEventListener(t, () => { if (on && real && !fsElement()) exit(); });
    doc.addEventListener('keydown', e => { if (on && e.key === 'Escape') { e.preventDefault(); exit(); } }, true);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) letGo(); else wake(); });
    button.addEventListener('click', () => (on ? exit() : enter()));

    const api = {
      get on() { return on; }, get bits() { return last; }, touch,
      enter, exit, toggle: () => (on ? exit() : enter()),
      hand(h) { hand = h === 'left' ? 'left' : 'right'; store(hand); showHand(); if (on) layout(); },
      el: pc, row, button,
    };
    return api;
  }

  root.PlayControls = { attach, direction, nearest, UP, DOWN, LEFT, RIGHT };
})(typeof window !== 'undefined' ? window : globalThis);
