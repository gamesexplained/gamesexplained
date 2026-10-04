/* Four published controlled actor traces, including raw-RAM sprite images.
 * Usage: node .../validation/audit_actor_motion.js [private-directory]
 */
'use strict';
const assert = require('assert');
const {create, publicJSON, equal} = require('./engine_harness');
const data = publicJSON('index.html', 'ACTOR_MOTION');
const configs = [{type: 2, level: 25, slot: 0}, {type: 14, level: 3, slot: 0},
  {type: 20, level: 8, slot: 1}, {type: 7, level: 16, slot: 3}];
assert.equal(data.records.length, configs.length);
let states = 0;
for (const [i, config] of configs.entries()) {
  const {cpu, m, io, raw} = create(config.level), slot = config.slot, record = data.records[i];
  for (const key of ['type', 'level', 'slot']) assert.equal(record[key], config[key]);
  assert.equal(m[0xc370 + slot], config.type);
  cpu.call(0x8f2f, {d: 0});
  m[0xc066] = 0; m[0xc06e] = 2; m[0xc06f] = 254;
  m[0xc03d + slot] = m[0xc044 + slot] = 0;
  assert.equal(record.frames.length, 240);
  for (let t = 0; t < 240; t++) {
    m[0xc0a2] = m[0xc078] = t & 255;
    m[0xc031] = (t * 73 + 19) & 255; m[0xc032] = (t * 37 + 11) & 255;
    io[0x41b] = (t * 53 + 7) & 255;
    const x = t < 80 ? raw[30] + ((raw[0x52] & 128) * 2) : t < 160 ? 60 : 280;
    io[14] = x & 255; io[15] = raw[31]; io[16] = (io[16] & 127) | (x > 255 ? 128 : 0);
    m[0xfb] = slot;
    cpu.call(0x860e, {d: 0}, {maxSteps: 50000});
    const frame = record.frames[t];
    equal(frame.slice(0, 8), [io[slot * 2] + ((io[16] >> slot & 1) * 256), io[slot * 2 + 1],
      io[0x27 + slot] & 15, x, io[15], m[0xc052 + slot], m[0xc059 + slot], m[0xc04b + slot]],
    'actor ' + i + ' update ' + t);
    const address = 0xc000 + 64 * m[0xc7f8 + slot];
    assert.equal(data.sprites[frame[8]], Buffer.from(m.slice(address, address + 63)).toString('base64'));
    states++;
  }
}
console.log(JSON.stringify({traces: configs.length, states, passed: true}, null, 2));
