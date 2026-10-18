'use strict';
// The moments of play the port's tests start from, saved to work/states (never committed), each
// stopped where a pass of the main loop starts (lib.PASS):
// - play-00: the first view of the Wilderness (work/play.vsf);
// - walk-NN: a walk from there, a random hold of the movement, turning, looking and speed keys
//   every few frames, saved every 400 frames;
// - area-AA-EE: every area and entrance a script's GOTO names, entered from play-00 as the GOTO
//   token enters it ($6CD4-$6CF6: CURRENT_AREA_ID, DESTINATION_ENTRANCE_ID, ENTER_DESTINATION_AREA
//   and the redraw that follows), then run until the view is drawn; and area-AA-EE-w, the same
//   after a short walk.
//   node port/scripts/gen-states.js
const path = require('path');
const lib = require('../test/lib.js');
const { game } = require(path.join(lib.REPO, 'kit/scripts/port_check.js'));

let seed = 7;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return Math.floor(seed / 4294967296 * n); };
const KEYS = ['UP', 'UP', 'UP', '=', 'Z', 'X', 'Z', 'X', 'P', 'L', 'C', 'W', 'R', 'U'];

// Random play for n frames: a key or two held for a few frames at a time, now and then none.
function walk(m, frames) {
  let held = [];
  for (let f = 0; f < frames; f += 8) {
    for (const k of held) m.release(k);
    held = rnd(5) ? [KEYS[rnd(KEYS.length)]].concat(rnd(4) ? [] : [KEYS[rnd(KEYS.length)]]) : [];
    for (const k of held) m.press(k);
    m.runFrames(8);
  }
  for (const k of held) m.release(k);
}
const atPass = (m) => lib.player(m).stopAt(lib.PASS);

const out = [];
const keep = (m, name) => { atPass(m); lib.save(m, name); out.push(name); };

const m0 = lib.machine('play');
keep(m0, 'play-00');
const start = m0.save();

// the walk from the Wilderness
{
  const m = lib.Machine.restore(start);
  for (let i = 1; i <= 8; i++) { walk(m, 400); keep(m, 'walk-' + String(i).padStart(2, '0')); }
}

// every area and entrance a GOTO names
const g = game(lib.GAME);
const { castleWorld } = g.run('levels.html', 'cm-world', 'castleWorld');
const W = castleWorld(g.listing().ram.slice());
const gotos = new Map();
const scan = s => { for (const t of (s && s.tokens) || []) if (t.op === 0x12) gotos.set(t.args[0] + ':' + t.args[1], t.args); };
for (const a of W.areas) { for (const o of a.objects) scan(o.script); for (const s of a.conditions.streams) scan(s); }
for (const s of W.global.streams) scan(s);
for (const [area, entrance] of [...gotos.values()].sort((x, y) => x[0] - y[0] || x[1] - y[1])) {
  const m = lib.Machine.restore(start), S = lib.player(m), M = m.ram;
  M[0x1047] = M[0x2429];                 // PREVIOUS_AREA_ID
  M[0x2429] = area; M[0x1066] = entrance;
  S.call(0x4EC3);                        // ENTER_DESTINATION_AREA
  M[0x1059] = 0xFC; M[0x105A] = 0xFF;    // the redraw the GOTO asks for ($6D30-$6D3B)
  m.runFrames(150);
  const name = 'area-' + String(area).padStart(2, '0') + '-' + String(entrance).padStart(3, '0');
  try { keep(m, name); } catch (e) { console.log(name, "pc", lib.hex(m.cpu.pc), "end reason", m.ram[0x109B], e.message); continue; }
  walk(m, 300);
  try { keep(m, name + '-w'); } catch (e) { console.log(name + '-w', 'pc', lib.hex(m.cpu.pc), 'end reason', m.ram[0x109B], e.message); }
}
console.log(out.length + ' moments in ' + lib.STATES + ': ' + out.join(' '));
