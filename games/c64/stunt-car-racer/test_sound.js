'use strict';
// How it works (index.html), its sound player, on a clean checkout:
// - the race it carries (block sfx-race) is what port/scripts/race-sound.js records from the Play
//   tab's machine, call for call;
// - its driver (block sfx), run as the AudioWorklet runs it, from its source text alone, on the
//   pages of the listing the page gives it and the kit's 6502, leaves the SID as the Play tab's
//   port leaves it at every interrupt of the race, all 25 registers, from START_SOUNDS on, and
//   from the frame the button starts at;
// - each effect's button starts its effect as the table at $AF80 says (the voice's waveform,
//   envelope, pitch and pulse width) and ends after the frames its gate is held and its release,
//   as EFFECT_TICK counts them.
//   node games/c64/stunt-car-racer/test_sound.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const { record, carried, START, ENGINE } = require('./port/scripts/race-sound.js');
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const page = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const L = game(__dirname).listing();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hex = v => '$' + v.toString(16).toUpperCase().padStart(2, '0');

// what the page carries and gives its driver
const m = /<script type="application\/json" id="sfx-race">([^<]*)<\/script>/.exec(page);
if (!m || !m[1]) { console.log('FAIL: index.html carries no race (sfx-race)'); process.exit(1); }
const race = JSON.parse(m[1]);
const src = /^\/\* sfx \*\/\n[\s\S]*?^\/\/ end of sfx$/m.exec(page);
if (!src) { console.log('FAIL: index.html has no block sfx'); process.exit(1); }
const createDriver = vm.runInNewContext(src[0] + '\ncreateDriver', {});
const lit = name => vm.runInNewContext('(' + new RegExp('const ' + name + ' = (\\[[^;]*\\]);').exec(page)[1] + ')');
const PAGES = lit('SFX_PAGES'), LIST = lit('LIST');
const pageStart = vm.runInNewContext('(() => { const START = ' + /const START = (\[[^;]*\]);\n\s*(for \(let a = [^\n]*)/.exec(page).slice(1).join(';') + '; return START; })()');
if (!same(pageStart, START) || !same(lit('ENGINE'), ENGINE)) fail('the page reads other bytes than race-sound.js records');
const mem = PAGES.map(p => [p << 8, Array.from(L.ram.subarray(p << 8, (p << 8) + 256))]);
const data = r => ({ mem, race: r, start: START, engine: ENGINE, list: LIST });

// the race, recorded again
const r = record(__dirname);
if (!same(carried(r), race)) fail('the race index.html carries differs from what race-sound.js records from play.html');
else console.log('ok   the race index.html carries is the Play tab\'s: ' + r.frames + ' frames, ' + r.events.length + ' calls');
if (r.split.length || r.other.length) fail('the race has calls no frame can give back: ' + JSON.stringify({ split: r.split, other: r.other }));

// the driver against the port, every interrupt
function against(from, what) {
  const d = createDriver(data(Object.assign({}, race, { from })), C64Cpu);
  d.init(0);
  let f = from, bad = 0;
  while (d.playing()) {
    const t = d.tick;
    d.play();
    if (d.tick === t) continue;                       // the start's frame
    if (d.tick !== t + 1) { fail(what + ': a frame ran ' + (d.tick - t) + ' interrupts'); break; }
    f = t;
    const want = r.regs[f], got = Array.from(d.last);
    if (!want) { fail(what + ': the player runs on past the race, frame ' + f); break; }
    if (!same(want, got)) {
      if (bad++ < 3) fail(what + ': frame ' + f + ': ' + want.map((v, i) => v !== got[i] ? '$D4' + hex(i).slice(1) + ' ' + hex(v) + ', the player ' + hex(got[i]) : '').filter(Boolean).join('; '));
    }
    f++;
  }
  if (f !== r.frames) fail(what + ': the player stopped at frame ' + f + ' of ' + r.frames);
  if (!bad) console.log('ok   ' + what + ': the SID as the Play tab leaves it at each of ' + (f - from) + ' interrupts');
}
against(0, 'the race from START_SOUNDS');
against(race.from, 'the race\'s button, from frame ' + race.from);

// each effect's button against its record at $AF80
const d = createDriver(data(race), C64Cpu);
const RELEASE = L.ram.subarray(0x86DF, 0x86EF);
LIST.forEach((b, t) => {
  if (b.race) return;
  const e = L.ram.subarray(0xAF80 + 8 * b.fx, 0xAF88 + 8 * b.fx), v = L.ram[0x86DC + e[0]];   // the voice's register offset, 0, 7 or 14 (effect_voice)
  d.init(t);
  d.play();                                           // the start's frame, before any interrupt
  const s = d.sid, pitch = b.fx === 1 ? b.pitch : e[4];
  const want = [e[1], e[2], e[3], pitch, e[5] & 15], got = [s[v + 4], s[v + 5], s[v + 6], s[v + 1], s[v + 3]];
  if (!same(want, got)) { fail(b.name + ': voice ' + (v / 7 + 1) + ' starts with ' + got.map(hex) + ', its record says ' + want.map(hex)); return; }
  let n = 1;
  while (d.playing() && n < 5000) { d.play(); n++; }
  // the start's frame; the gate's frames, the last of which lets it go and starts the release; the
  // release's frames after that one, the last of which silences the voice
  const rel = RELEASE[e[3] & 15], long = 1 + (b.times - 1) * b.every + e[6] + (rel ? rel - 1 : 0);
  if (n !== long) fail(b.name + ': ' + n + ' frames, the record\'s gate and release give ' + long);
  else console.log('ok   ' + b.name + ': voice ' + (v / 7 + 1) + ', ' + n + ' frames, as its record at $' + (0xAF80 + 8 * b.fx).toString(16).toUpperCase() + ' says');
});

console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
