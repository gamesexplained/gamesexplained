// The sound switch every Play tab has: one "🔊 Sound" button in the page's bar, on unless the
// viewer switched it off on a Play tab before (localStorage 'gamesexplained.sound'). A browser lets
// a page start sound only inside a click or a key press, so with the switch on, the page's sound
// starts at the viewer's first one anywhere on the page, and the button switches it off and on
// again. No dependencies. Exposes Sound (window.Sound on a page; globalThis.Sound in node, for
// tests).
//
//   const sw = Sound.attach(button, set)
//     button  the page's switch, <button type="button" data-sound aria-pressed="true">🔊 Sound</button>,
//             whose aria-pressed this keeps
//     set     the page's own sound: set(true) starts it (the first time inside the viewer's click
//             or key press, where C64Sid.host can make its AudioContext) and set(false) stops it.
//             It returns, or resolves to, whether the sound is on: false where the browser has
//             none, and the switch then shows off. It is never called again before the last call
//             has resolved.
//   sw.on, sw.set(on)
// The page starts no sound of its own, neither when its game starts nor in its key handlers.
(function (root) {
  'use strict';
  const KEY = 'gamesexplained.sound';
  // The events a browser can let a page start sound in. It does when the event counts as the
  // viewer's activation of the page: a key but Escape, a mouse button going down, a finger or a
  // pen coming up. A page that cancels a pointerdown gets no mousedown, so all of them are heard.
  const GESTURES = ['keydown', 'pointerdown', 'pointerup', 'mousedown', 'touchend', 'click'];
  function activation(e) {
    const ua = root.navigator && root.navigator.userActivation;
    if (ua) return ua.isActive;
    if (e.type === 'keydown') return e.key !== 'Escape';
    if (e.type === 'pointerdown') return e.pointerType === 'mouse';
    if (e.type === 'pointerup') return e.pointerType !== 'mouse';
    return true;
  }

  function stored() { try { return root.localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } }
  function store(on) { try { root.localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* no storage: the choice lasts for this visit */ } }

  function attach(button, set) {
    let busy = null, waiting = true;
    const api = { on: stored(), set: change };

    function show() { if (button) button.setAttribute('aria-pressed', String(api.on)); }
    // The page's set, one call at a time, called at once when none is running, so that the first
    // is made inside the click or key press
    function run(on) {
      const call = () => { try { return Promise.resolve(set(on)).catch(() => false); } catch (e) { return Promise.resolve(false); } };
      const p = (busy ? busy.then(call) : call()).then(v => {
        if (busy === p) busy = null;
        if (on && !v && api.on) { api.on = false; show(); }   // no sound to be had, which is not the viewer's choice
        return !!v;
      });
      busy = p;
      return p;
    }
    function done() {
      waiting = false;
      if (root.removeEventListener) for (const t of GESTURES) root.removeEventListener(t, first, true);
    }
    // the viewer's first click or key press anywhere on the page but the button, whose own click
    // switches it
    function first(e) {
      if (!waiting || !e.isTrusted || !activation(e)) return;
      if (button && e.target && button.contains && button.contains(e.target)) return;
      done();
      if (api.on) run(true);
    }
    function change(on) {
      api.on = !!on; show(); store(api.on);
      if (waiting) done();
      return run(api.on);
    }

    show();
    if (button) button.addEventListener('click', () => change(!api.on));
    if (root.addEventListener) for (const t of GESTURES) root.addEventListener(t, first, true);
    return api;
  }

  root.Sound = { attach, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
