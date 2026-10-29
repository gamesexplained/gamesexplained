#!/usr/bin/env node
// Hold the Maps page's route against the game. route.json keeps a joystick byte a frame (deflated),
// the stages the route passes and Tal's place every few frames. Here the game runs on the kit's C64
// (kit/c64/machine.js, with its timers, the video chip's stolen cycles, the sprite collisions and
// their interrupts, and interrupts taken inside a handler: the game's raster handler clears I, and
// the music's timer and the collisions interrupt it) from the listing's memory at $8009, with the
// few bytes below it that the game reads before it writes them as the machine has them (START), the
// stick on port 2 set from route.json before each frame, and:
// - each stage is found again where route.json says, from the game's own flags: the game under way
//   (zp_title bit 7 clear and Tal's animation set), the first stone landed (zp_throw bit 7 clear), the armour worn and left (zp_armour_state bit 7), the panel lit
//   (zp_panel_on), each add-on taken ($067E-$0681), the mine gone off (zp_victory) and the last
//   message ($95, zp_msg_scroll);
// - Tal's room and place every `every` frames from the game's start (`from`) are route.json's;
// - the page carries route.json as it stands (the ant-route block of levels.html);
// - each life lost on the way (zp_rejuv) is a stage, and the route ends with the ending, the game
//   never over (zp_game_over).
// It exits 1 on any difference.
//   node games/c64/the-sacred-armour-of-antiriad/test_route.js
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../..');
const { Machine, loadListing } = require(path.join(ROOT, 'kit/c64/machine.js'));
const EVERY = 8;
const ADDONS = ['the Pulsar Beam', 'the Particle Negator', 'the Gravity Displacer', 'the Implosion Mine'];
// The bytes the game reads before it writes them that the listing does not carry (it starts at
// $06A0), as the machine holds them when the game starts: $7C-$8E are from BASIC's start-up, which
// copies its CHRGET routine and the RND seed from $E3A2-$E3BE of the KERNAL ROM to $73-$8F (the
// loop at $E3E0, ROM 901227-03); the rest are left by BASIC and the loader, read in VICE at the
// game's start. $7C is zp_throw: with bit 7 set the game takes a throw as asked for until Tal's
// first stone lands.
const START = { 0x32: 0x08, 0x69: 0x8C, 0x7C: 0xC9, 0x7D: 0x3A, 0x87: 0x38, 0x8C: 0x4F, 0x8E: 0x52, 0x358: 0xAD, 0x35B: 0x90 };
function boot() {
  const ram = loadListing(path.join(__dirname, 'listing.json'));
  for (const a in START) ram[a] = START[a];
  return new Machine({ ram, pc: 0x8009, cia: true, dma: true, collide: true });
}

// the route's joystick, a byte a frame (bits 0-4 up, down, left, right, fire), played from the start
function replay(joy) {
  const m = boot();
  const r = m.ram, stages = [], trace = [];
  const look = () => ({ game: r[0xB0] >> 7 || !r[0x260] ? 0 : 1, thrown: r[0x7C] >> 7 ? 0 : 1, arm: r[0x7B] >> 7, panel: r[0x8A] >> 7, addons: [0, 1, 2, 3].map((i) => r[0x67E + i] >> 7), victory: r[0xB1] ? 1 : 0, end: r[0x54] === 0x95 ? 1 : 0 });
  const place = () => ({ room: r[0x5B], x: r[0x200] + (r[0x210] & 1 ? 256 : 0), y: r[0x201] });
  let was = look(), deaths = 0, rej = r[0xAC], from = 0;
  for (let f = 0; f < joy.length; f++) {
    m.joy = 0x1F & ~joy[f];
    m.runFrames(1);
    const now = look(), p = place(), at = (what) => stages.push(Object.assign({ what, frame: f + 1 }, p));
    if (now.game && !was.game) at('the game starts');
    if (now.game && now.thrown && !was.thrown && !stages.some((s) => s.what === 'the first stone lands')) at('the first stone lands');
    if (now.arm && !was.arm) at('into the armour');
    if (!now.arm && was.arm) at('out of the armour');
    if (now.panel && !was.panel) at('the panel lights');
    now.addons.forEach((a, i) => { if (a && !was.addons[i]) at(ADDONS[i]); });
    if (now.victory && !was.victory) at('the mine goes off');
    if (now.end && !was.end) at('the last message');
    if (r[0xAC] > rej) { deaths++; at('a life lost'); }
    rej = r[0xAC];
    was = now;
    if (now.game && !from && (f + 1) % EVERY === 0) from = f + 1;
    if (from && (f + 1) % EVERY === 0) trace.push(p.room, p.x & 255, p.y, (p.x >> 8) | (r[0x7B] & 0x80 ? 2 : 0));
  }
  return { stages, trace, every: EVERY, from, deaths, over: r[0x7E] };
}
module.exports = { replay, boot };

if (require.main === module) {
  const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
  const g = game(__dirname);
  const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'route.json'), 'utf8'));
  const joy = zlib.inflateRawSync(Buffer.from(R.joystick, 'base64'));
  let bad = 0;
  const fail = (...w) => { if (bad++ < 20) console.log('DIFFERS', ...w); };
  const t0 = Date.now(), got = replay(joy);
  if (joy.length !== R.frames) fail('the joystick has', joy.length, 'frames, route.json says', R.frames);
  const show = (s) => s ? `${s.what} at frame ${s.frame} in room $${s.room.toString(16).toUpperCase()} (${s.x}, ${s.y})` : 'nothing';
  for (let i = 0; i < Math.max(got.stages.length, R.stages.length); i++)
    if (JSON.stringify(got.stages[i]) !== JSON.stringify(R.stages[i])) fail('stage', i + 1, show(got.stages[i]), '/ route.json', show(R.stages[i]));
  const trace = Buffer.from(R.trace, 'base64');
  if (R.every !== EVERY || R.from !== got.from || !trace.equals(Buffer.from(got.trace))) {
    const i = [...trace].findIndex((b, k) => b !== got.trace[k]);
    fail('the trace, from frame', got.from + R.every * Math.floor(Math.max(i, 0) / 4));
  }
  const last = got.stages[got.stages.length - 1];
  if (!last || last.what !== 'the last message') fail('the route ends with', show(last));
  if (got.over) fail('the game ended, with', got.deaths, 'lives lost');
  const { ANT_ROUTE } = g.run('levels.html', 'ant-route', 'ANT_ROUTE');
  for (const k of ['frames', 'every', 'from', 'trace']) if (ANT_ROUTE[k] !== R[k]) fail('levels.html carries another', k);
  if (JSON.stringify(ANT_ROUTE.stages) !== JSON.stringify(R.stages)) fail('levels.html carries other stages');
  console.log(`the route's ${joy.length} frames (${(joy.length / 50 / 60).toFixed(1)} minutes) in ${((Date.now() - t0) / 1000).toFixed(0)} s: ` +
    `${got.stages.length} stages, ${got.trace.length / 4} places, ${got.deaths} lives lost: ` + (bad ? bad + ' differences' : 'every stage and place is route.json\'s'));
  process.exit(bad ? 1 : 0);
}
