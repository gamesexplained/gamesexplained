// Test of site/lib/sound.js, the sound switch every Play tab with sound has: each Play page that
// makes a sound loads it, gives it one "🔊 Sound" button, pressed in the page as written, and
// attaches it; the switch starts on unless the viewer switched it off on a Play tab before; the
// page's sound starts at the viewer's first click or key press, inside it, and only once; the
// button switches it off and on and keeps the choice for every Play tab; a browser with no sound
// shows the switch off without keeping that as the viewer's choice; and the page's own set is
// never called again before its last call has finished.
//   node kit/scripts/test_sound_switch.js
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const LIB = path.join(ROOT, 'site', 'lib', 'sound.js');

let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.log('FAIL ' + what); } };

// --- every Play page that makes a sound has the switch
const SOUND = /<script src="\.\.\/\.\.\/lib\/(?:sid|ay|sn76489)\.js"><\/script>|\bAudioContext\b/;
const games = path.join(ROOT, 'games');
let pages = 0;
for (const platform of fs.readdirSync(games)) {
  const dir = path.join(games, platform);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const slug of fs.readdirSync(dir)) {
    for (const file of ['play.html', path.join('port', 'play.template.html')]) {
      const p = path.join(dir, slug, file);
      if (!fs.existsSync(p)) continue;
      const page = fs.readFileSync(p, 'utf8'), name = `games/${platform}/${slug}/${file}`;
      if (!SOUND.test(page)) continue;
      pages++;
      check(page.includes('<script src="../../lib/sound.js"></script>'), name + ' loads ../../lib/sound.js');
      const buttons = page.match(/<button\b[^>]*\bdata-sound\b[^>]*>[^<]*<\/button>/g) || [];
      check(buttons.length === 1, name + ' has one button with data-sound');
      check(buttons.length !== 1 || (/>🔊 Sound<\/button>$/.test(buttons[0]) && /\baria-pressed="true"/.test(buttons[0])),
        name + ' labels it "🔊 Sound", pressed');
      check((page.match(/\bSound\.attach\(/g) || []).length === 1, name + ' calls Sound.attach once');
    }
  }
}
check(pages > 0, 'some Play page makes a sound');

// --- the switch in node: a window with listeners and storage, a button, the page's set
function page(opts) {
  opts = opts || {};
  const store = new Map(opts.stored ? [['gamesexplained.sound', opts.stored]] : []), listeners = {};
  globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  globalThis.addEventListener = (t, f, capture) => { if (capture) (listeners[t] = listeners[t] || new Set()).add(f); };
  globalThis.removeEventListener = (t, f, capture) => { if (capture && listeners[t]) listeners[t].delete(f); };
  delete globalThis.navigator;
  const inside = {};
  const button = { attrs: {}, handlers: [], setAttribute(k, v) { this.attrs[k] = String(v); },
    addEventListener(t, f) { if (t === 'click') this.handlers.push(f); }, contains: e => e === button || e === inside };
  const calls = [];
  let answer = opts.answer || (on => on);
  const set = on => { calls.push(on); return answer(on); };
  delete require.cache[require.resolve(LIB)];
  require(LIB);
  const sw = globalThis.Sound.attach(button, set);
  // an event as the browser dispatches it to the window's capturing listeners
  const fire = (type, more) => { const e = Object.assign({ type, isTrusted: true, target: {} }, more); for (const f of [...(listeners[type] || [])]) f(e); };
  // a click on the button: its mousedown and click pass the window first
  const click = () => { fire('mousedown', { target: inside }); fire('click', { target: inside }); for (const f of button.handlers) f({}); };
  const listening = () => Object.values(listeners).reduce((n, s) => n + s.size, 0);
  return { sw, button, store, calls, fire, click, listening, answer: f => { answer = f; } };
}
const settle = () => new Promise(r => setTimeout(r, 0));

(async () => {
  // a viewer new to the site: on, started by their first click or key press, once
  {
    const p = page();
    check(p.sw.on === true && p.button.attrs['aria-pressed'] === 'true', 'the switch starts on');
    check(p.calls.length === 0, 'nothing is started before the viewer clicks or presses a key');
    p.fire('keydown', { key: 'a', isTrusted: false });
    check(p.calls.length === 0, 'an event the page made itself starts nothing');
    p.fire('keydown', { key: 'Escape' });
    check(p.calls.length === 0, 'Escape starts nothing: browsers do not let it start sound');
    p.fire('pointerdown', { pointerType: 'touch' });
    check(p.calls.length === 0, 'a finger going down starts nothing: browsers start sound when it comes up');
    p.fire('mousedown');
    check(p.calls.join() === 'true', 'the first click starts the sound, inside the click');
    check(p.listening() === 0, 'then the page stops listening');
    p.fire('keydown', { key: 'a' });
    await settle();
    check(p.calls.join() === 'true', 'a later key press starts nothing more');
    check(!p.store.has('gamesexplained.sound'), 'starting by default keeps no choice');
  }
  {
    const p = page();
    p.fire('keydown', { key: ' ' });
    check(p.calls.join() === 'true', 'a first key press starts the sound');
  }
  {
    const p = page();
    globalThis.navigator = { userActivation: { isActive: false } };
    p.fire('keydown', { key: 'a' });
    check(p.calls.length === 0, 'where the browser says the page is not activated, nothing starts');
    globalThis.navigator.userActivation.isActive = true;
    p.fire('touchend');
    check(p.calls.join() === 'true', 'where the browser says it is, the sound starts');
  }

  // the button: its own click switches the sound, never starts it first
  {
    const p = page();
    p.click();
    check(p.calls.join() === 'false', 'a first click on the button switches the sound off, without starting it');
    check(p.sw.on === false && p.button.attrs['aria-pressed'] === 'false', 'the button shows off');
    check(p.store.get('gamesexplained.sound') === '0', 'switching off is kept for every Play tab');
    check(p.listening() === 0, 'the page stops listening for a first click');
    await settle();
    p.click();
    check(p.calls.join() === 'false,true' && p.sw.on && p.button.attrs['aria-pressed'] === 'true', 'a second click switches it on again');
    check(p.store.get('gamesexplained.sound') === '1', 'switching on is kept');
  }

  // the viewer switched it off on another Play tab
  {
    const p = page({ stored: '0' });
    check(p.sw.on === false && p.button.attrs['aria-pressed'] === 'false', 'a kept choice starts the switch off');
    p.fire('mousedown');
    check(p.calls.length === 0 && p.listening() === 0, 'with the switch off a click starts nothing');
    p.click();
    check(p.calls.join() === 'true' && p.sw.on, 'the button switches it on, inside its click');
  }

  // a browser with no sound
  {
    const p = page({ answer: () => Promise.resolve(false) });
    p.fire('mousedown');
    await settle();
    check(p.sw.on === false && p.button.attrs['aria-pressed'] === 'false', 'no sound to be had: the switch shows off');
    check(!p.store.has('gamesexplained.sound'), 'and that is not kept as the viewer\'s choice');
  }
  {
    const p = page({ answer: () => { throw new Error('no Web Audio'); } });
    p.fire('mousedown');
    await settle();
    check(p.sw.on === false, 'a set that throws shows the switch off');
  }

  // one call of the page's set at a time
  {
    let open = 0, most = 0;
    const p = page({ answer: on => { open++; most = Math.max(most, open); return new Promise(r => setTimeout(() => { open--; r(on); }, 5)); } });
    p.fire('mousedown');
    p.click(); p.click(); p.click();
    check(p.calls.join() === 'true', 'calls wait while the first one runs');
    await new Promise(r => setTimeout(r, 40));
    check(p.calls.join() === 'true,false,true,false' && most === 1, 'then run one at a time, in order');
    check(p.sw.on === false && p.button.attrs['aria-pressed'] === 'false', 'and the switch ends where the viewer left it');
  }

  if (failed) { console.log(failed + ' failed'); process.exit(1); }
  console.log('sound.js: every check passed (' + pages + ' Play pages with sound)');
})();
