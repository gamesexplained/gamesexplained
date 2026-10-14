#!/usr/bin/env node
// Hold the creature gallery against the game's own code. index.html's cr-anim block (crCreature)
// steps a creature's animation script and colour list as the engine does; this runs the engine's
// own animate_objects ($C764) and object_colours ($C826) on the kit's 6502 simulator, over the
// engine's listing with the world's level file laid over it, for one object in slot 0, and
// compares its sprite frame and colour with the port's, frame by frame, for every creature and
// variant the gallery shows, for 3,000 frames each; those that move only when shot run a second
// time, shot every 25 frames. It also checks that every byte the page's
// CREATURES carries (the scripts, the colour lists, the sprite shapes) is the listing's.
//   node games/c64/creatures/test_gallery.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { crCreature } = g.run(page, 'cr-anim', 'crCreature');
const mm = g.read(page).match(/const CREATURES = (\{.*?\});/);
if (!mm) { console.error('no CREATURES data'); process.exit(1); }
const CREATURES = JSON.parse(mm[1]);
const E = g.listing('parts/engine/listing.json');
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
const FRAMES = 3000;
for (const W of CREATURES.worlds) {
  const L = g.listing('parts/' + W.part + '/listing.json');
  // the page's bytes are the listing's
  const mem = new Map();
  for (const [base, hex] of W.mem) for (let i = 0; i < hex.length / 2; i++) {
    const v = parseInt(hex.substr(2 * i, 2), 16); mem.set(base + i, v);
    if (!L.has[base + i] || L.ram[base + i] !== v) fail(W.name, 'script byte $' + (base + i).toString(16), 'is not part ' + W.part + "'s");
  }
  for (const [f, hex] of Object.entries(W.spr)) {
    const base = 0x4000 + parseInt(f, 16) * 64, src = parseInt(f, 16) >= 0x60 ? L : E;
    for (let i = 0; i < 63; i++) if (!src.has[base + i] || src.ram[base + i] !== parseInt(hex.substr(2 * i, 2), 16)) { fail(W.name, 'sprite $' + f, 'byte', i); break; }
  }
  // the game: the engine with the level file over it
  const m = E.ram.slice();
  for (let a = 0; a < 0x10000; a++) if (L.has[a]) m[a] = L.ram[a];
  const at = (n) => E.sym(n);
  const T = {}; for (const n of ['f_023C', 'obj_state', 'obj_delay', 'obj_anim_pause', 'obj_awake', 'obj_anim_on', 'obj_anim_timer',
    'obj_anim_speed', 'obj_anim_lo', 'obj_anim_hi', 'f_021E', 'object_type', 'obj_anim_resume', 'obj_anim_loop', 'obj_frame',
    'obj_cycling', 'obj_cycle_timer', 'obj_cycle_speed', 'obj_cycle_lo', 'obj_cycle_hi', 'f_022D', 'obj_cycle_resume',
    'obj_cycle_loop', 'obj_colour', 'obj_flash', 'animate_objects', 'object_colours', 'a_C769', 'a_C843']) T[n] = at(n);
  const look = (a) => { if (!mem.has(a)) throw new Error(W.name + ': the page reads $' + a.toString(16) + ', which CREATURES does not carry'); return mem.get(a); };
  const seen = new Set();
  // every script as it runs freely, and a second time shot every 25 frames where the page marks it
  // as moving only when shot: obj_anim_on starts clear and each shot sets it to $FF, as hit_response_3 does
  const runs = [];
  for (const C of W.cells) for (const c of C.parts.concat(C.variants)) {
    runs.push([C.name, Object.assign({}, c, { onhit: 0 })]);
    if (c.onhit) runs.push([C.name + ' (shot)', c]);
  }
  for (const [name, c] of runs) {
    const key = [c.at, c.t, c.speed, c.cycle, c.cspeed, c.colour, c.onhit].join();
    if (seen.has(key)) continue; seen.add(key); cases++;
    const r = m.slice();
    for (let x = 0; x < 15; x++) { r[T.f_023C + x] = 0; r[T.obj_cycling + x] = 0; r[T.obj_flash + x] = 0xFF; }
    const set = (n, v) => { r[T[n]] = v; };
    set('f_023C', 1); set('obj_state', 0); set('obj_delay', 0); set('obj_anim_pause', 0); set('obj_awake', 1); set('obj_anim_on', c.onhit ? 0 : 1);
    set('obj_anim_timer', 0); set('obj_anim_speed', c.speed); set('obj_anim_lo', c.at & 255); set('obj_anim_hi', c.at >> 8);
    set('f_021E', 0); set('object_type', c.t); set('obj_anim_loop', 0); set('obj_frame', r[c.at]);
    if (c.cycle) {
      set('obj_cycling', 1); set('obj_cycle_timer', 0); set('obj_cycle_speed', c.cspeed); set('obj_cycle_lo', c.cycle & 255);
      set('obj_cycle_hi', c.cycle >> 8); set('f_022D', 0); set('obj_cycle_loop', 0); set('obj_colour', r[c.cycle]);
    } else set('obj_colour', c.colour);
    const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
    const cpu = new CPU(r, { port: { dir: 0x2F, data: 0x35 }, io, strict: true });
    // slot 0 is even: animate_objects takes it on a pass whose branch is BNE ($D0), object_colours likewise
    const p = crCreature(c, look, r[T.a_C769] === 0xD0 ? 0 : 1, r[T.a_C843] === 0xD0 ? 0 : 1);
    let f = 0;
    for (; f < FRAMES; f++) {
      if (c.onhit && f % 25 === 10) { set('obj_anim_on', 0xFF); p.hit(); }
      cpu.call(T.animate_objects, {}); cpu.call(T.object_colours, {});
      p.tick();
      const gone = r[T.f_023C] === 0;
      if (gone !== p.gone) { fail(W.name, name, 'type', c.t, 'frame', f, 'removed: game', gone, 'page', p.gone); break; }
      if (r[T.obj_frame] !== p.frame) { fail(W.name, name, 'type', c.t, 'frame', f, 'sprite: game $' + r[T.obj_frame].toString(16), 'page $' + p.frame.toString(16)); break; }
      if ((r[T.obj_colour] & 15) !== p.colour) { fail(W.name, name, 'type', c.t, 'frame', f, 'colour: game', r[T.obj_colour] & 15, 'page', p.colour); break; }
      if (gone) break;
    }
  }
}
console.log(`${cases} scripts, ${FRAMES} frames each or to their end: ` + (bad ? bad + ' differences' : 'every frame and colour matches the engine'));
process.exit(bad ? 1 : 0);
