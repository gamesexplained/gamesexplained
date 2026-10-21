#!/usr/bin/env node
// Hold graphics.html's two ports against the game's own code, on the committed listings.
// - lem_frames (shownFrames): for each of the 21 actions, the game's frame step ($1FB1-$1FF2) run on the
//   kit's 6502 for 64 passes from a counter of 0, as restart_animation leaves it, gives the frame it
//   stores ($146F, with $06E3 for the high byte); the page's port must give the same 64 frames.
// - intro_unpack (unpackStream): each of the intro's 148 lemming images unpacked by the intro's own
//   unpacker ($4E13) with its stream, end and literal count set as show_image sets them; the page's port
//   must give the same 128 bytes.
//   node games/c64/lemmings/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { shownFrames } = g.run('graphics.html', 'lem_frames', 'shownFrames');
const { unpackStream } = g.run('graphics.html', 'intro_unpack', 'unpackStream');
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };

const G = g.listing('parts/game/listing.json'), S = n => G.sym(n);
for (let a = 0; a < 21; a++) {
  const m = Uint8Array.from(G.ram);
  m[m[0x1FCB] | m[0x1FCC] << 8] = 0;                   // paused_pass (resident part): the BIT at $1FCA names it
  m[0x05C6] = a; m[0x0456] = 0;
  const cpu = new CPU(m);
  const game = [];
  for (let i = 0; i < 64; i++) { cpu.call(0x1FB1, { x: 0 }); game.push(m[0x146F] | m[0x06E3] << 8); }
  const base = m[S('frame_base_lo') + a] | m[S('frame_base_hi') + a] << 8;
  const page = shownFrames(base, m[S('action_frame_step') + a], m[S('action_frame_wrap') + a], m[S('action_frame_restart') + a], 64);
  if (game.join() !== page.join()) fail('action', a, 'game', game.slice(0, 12).join(), 'page', page.slice(0, 12).join());
}
console.log('frame steps: 21 actions, 64 passes each');

const I = g.listing('parts/intro/listing.json'), T = n => I.sym(n);
const lo = T('image_offset_lo'), hi = T('image_offset_hi'), lit = T('image_literals');
for (let i = 0; i < 148; i++) {
  const m = Uint8Array.from(I.ram);
  const a = ((m[lo + i] | m[hi + i] << 8) + 0x3B40) & 0xffff, b = ((m[lo + i + 1] | m[hi + i + 1] << 8) + 0x3B40) & 0xffff;
  m[0x0C] = a & 255; m[0x0D] = a >> 8; m[0x0A] = b & 255; m[0x0B] = b >> 8;
  m[0x02] = 0x00; m[0x03] = 0x04; m[0x08] = m[lit + i]; m[0x09] = 0;
  new CPU(m).call(0x4E13);
  const want = m.subarray(0x0400, 0x0480), page = unpackStream(I.ram, a, b, I.ram[lit + i], 0x0400);
  for (let k = 0; k < 128; k++) if (want[k] !== page[k]) { fail('intro image', i, 'byte', k, 'game', want[k], 'page', page[k]); break; }
}
console.log('intro images: 148 unpacked');
if (bad) { console.log(`FAILED: ${bad} difference(s)`); process.exit(1); }
console.log('OK - the page steps the frames and unpacks the images as the game does');
