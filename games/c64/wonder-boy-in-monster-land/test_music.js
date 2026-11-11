'use strict';
// Regenerate the page's SID recordings from the committed listings.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { CPU } = require('../../../kit/cpu/cpu6502.js');
const root = __dirname, parts = path.join(root, 'parts');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dataMatch = html.match(/<script id="wb-sound-data" type="application\/json">([\s\S]*?)<\/script>/);
const driverMatch = html.match(/\/\* SOUND_DRIVER_BEGIN \*\/\s*([\s\S]*?)\s*\/\* SOUND_DRIVER_END \*\//);
assert(dataMatch && driverMatch, 'sound data and driver are present');
const data = JSON.parse(dataMatch[1]);
const makeDriver = vm.runInNewContext('(' + driverMatch[1] + ')', { atob: s => Buffer.from(s, 'base64').toString('binary') });
function layer(mem, file) {
  const listing = JSON.parse(fs.readFileSync(file));
  for (const row of listing.records) if (row.b) mem.set(row.b, row.a);
}
function state(mem, sid, cpu) {
  return Buffer.from([...mem.slice(0x4e, 0x52), ...mem.slice(0x2225, 0x224f),
    ...[0x22b9,0x22bb,0x22ef,0x2319,0x23eb,0x2c15].map(a => mem[a]), ...sid,
    cpu.a,cpu.x,cpu.y,cpu.n,cpu.v,cpu.d,cpu.z,cpu.c]).toString('base64');
}
function check(track, source) {
  const mem = source.slice(), sid = Uint8Array.from(track.seed), stream = Buffer.from(data.streams[track.stream], 'base64');
  [0x223a,0x2241,0x2248].forEach((a, i) => { mem[a] = track.notes[i]; });
  let writes = [];
  const cpu = new CPU(mem, {port: 0x35, io: {read: () => 0, write(a, value) {
    assert(a >= 0xd400 && a <= 0xd418, `unexpected I/O $${a.toString(16)}`);
    sid[a - 0xd400] = value; writes.push(a - 0xd400, value);
  }}});
  mem[0x2c15] = track.selector;
  let offset = 0, loopState = null;
  for (let frame = 0; frame < track.frames; frame++) {
    writes = []; cpu.call(0x2201, {}, {maxSteps: 100000});
    const count = stream[offset++], recorded = [...stream.subarray(offset, offset + count * 2)]; offset += count * 2;
    assert.deepEqual(writes, recorded, `load ${track.load}, selector ${track.selector}, frame ${frame}`);
    if (track.loop && frame === track.loop.from - 1) loopState = state(mem, sid, cpu);
  }
  assert.equal(offset, stream.length, 'recording ends on a frame boundary');
  if (track.loop) {
    assert.equal(track.loop.from + track.loop.period, track.frames);
    assert.equal(state(mem, sid, cpu), loopState, `load ${track.load}: loop state`);
  } else assert.equal(mem[0x2c15], 255, 'one-shot sequence reaches its idle state');
}
const memory = new Uint8Array(65536); layer(memory, path.join(parts, 'resident/listing.json'));
let first;
for (let number = 1; number <= 31; number++) {
  layer(memory, path.join(parts, `stage-${String(number).padStart(2, '0')}/listing.json`));
  if (number === 1) first = memory.slice();
  const track = data.tracks[number - 1]; assert.equal(track.load, number); assert.equal(track.selector, 1);
  check(track, memory);
}
for (let i = 31; i < data.tracks.length; i++) check(data.tracks[i], first);
assert.equal(data.tracks.length, 37);
// The worklet builds the driver from its source alone. Check its ordered writes and loop boundary.
for (let button = 0; button < data.buttons.length; button++) {
  const track = data.tracks[data.buttons[button].track], raw = Buffer.from(data.streams[track.stream], 'base64');
  const d = makeDriver(data); d.init(button); let offset = 0;
  const count = raw[offset++], firstWrites = [...raw.subarray(offset, offset + count * 2)];
  const seedWrites = track.seed.flatMap((value, reg) => [reg, value]);
  d.play(); assert.deepEqual(Array.from(d.writes), seedWrites.concat(firstWrites), `button ${button}: initial writes`);
  for (let f = 1; f < track.frames; f++) d.play();
  assert.equal(d.playing(), !!track.loop, `button ${button}: end state`);
  if (track.loop) { d.play(); assert(d.playing(), `button ${button}: loop continues`); }
  d.stop(); assert(!d.playing());
}
// Render the first ten seconds through the site's SID model, including master volume.
require('../../../site/lib/sid.js');
const engine = globalThis.C64Sid.engine();
for (let button = 0; button < data.buttons.length; button++) {
  const player = engine.createPlayer(makeDriver(data), 8000, {}), samples = new Float32Array(80000);
  player.command({cmd: 'start', tune: button}); player.render(samples, samples.length, 0);
  let low = Infinity, high = -Infinity;
  for (const sample of samples) { low = Math.min(low, sample); high = Math.max(high, sample); }
  if (!data.tracks[data.buttons[button].track].silent) assert(high - low > 0.01, `button ${button}: no audible output`);
  else assert(/silent/i.test(data.buttons[button].name), `button ${button}: silence is labelled`);
}
console.log(`OK - ${data.tracks.length} SID recordings and ${data.buttons.length} player buttons`);
