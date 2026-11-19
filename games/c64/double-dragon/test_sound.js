'use strict';

// Reference traces come from running $040E/$048D on the kit CPU on both
// original VICE mission-entry images. For each selector the trace includes
// every SID register, value and relative CPU cycle, with init prepended to
// the first update. Both native images yield these same twelve records.
// The long tune is sampled for 2,000 updates. The others run until $048E
// is set by the original driver. The listing test needs no game image.
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const C64Cpu = require('../../../kit/cpu/cpu6502.js');
require('../../../site/lib/sid.js');

const reference = [
  [2000, 35734, 'b955b0f290df8d9794525b81cdfdce27da8f40961962d456f420ce14c402f463'],
  [581, 10254, 'bb2f8721de457a86009f678cf67904b1878ad833360ae701587b8ce99a329651'],
  [17, 228, '59a0d19d0c610bf4db0018bfe600bdcfe49663ca652fd476e2ac152a9d6a7092'],
  [17, 219, '160dd7b27fab7c2bcf2e31a3b2e240758c006a7e52e8b0f54e517c14d07476a6'],
  [17, 135, 'd7fdc554e3e663bd7aee7f9b507d3040dd8458f34b8bc3c53a37e37d63b5f692'],
  [10, 86, '748e857b73e041b763960a4d1f6a24201d272a8ce81463bc0fcc1f83020b0fda'],
  [8, 72, '928a47e67e3823e544d22a6ada5c2cf9af32b294e38fa8c508048858d30f307f'],
  [16, 207, '529dbca0415ba22c9e07d05f7401bbc5a7044c01aa8bf2e2879cff07be858313'],
  [51, 373, 'e3747259bd82df3c53537084dba2626af52540ea6527bd1cebff5a9ad1787db9'],
  [6, 58, '5e39214b3d63f8f10c80152dcc87dbd5d36133d9bb22ff3d1ab76319744aaf4e'],
  [13, 107, 'a5f5233a7a0d5e1329aa8997edeca921d47f6a3d4bd7546245a7044ff095d19d'],
  [16, 216, '9db8e4c53810163b215697772f63e1bffcc488550c15cbfb6d243682d7d992d9']
];

const listing = require('./parts/resident/listing.json');
const memory = new Uint8Array(65536);
for (const {a, b} of listing.records) {
  if (b) memory.set(b, a);
}
const html = readFileSync(__dirname + '/index.html', 'utf8');
const source = html.match(/\/\/ dd-sid-driver\n([\s\S]+?)\/\/ end dd-sid-driver/)[1];
const createDriver = vm.runInNewContext(source + '\ncreateDoubleDragonDriver');
const program = memory.slice(0x0344, 0x1518);

for (const [selection, [length, count, digest]] of reference.entries()) {
  const driver = createDriver(program, C64Cpu);
  const hash = createHash('sha256');
  let frames = 0;
  let total = 0;
  driver.init(selection);
  while (frames < 2000 && driver.playing()) {
    driver.play();
    const writes = Array.from(driver.times, (cycle, i) => [
      driver.writes[2 * i], driver.writes[2 * i + 1], cycle
    ]);
    hash.update(JSON.stringify(writes) + '\n');
    total += writes.length;
    frames++;
  }
  assert.equal(frames, length, 'cue ' + selection + ' duration');
  assert.equal(total, count, 'cue ' + selection + ' writes');
  assert.equal(hash.digest('hex'), digest, 'cue ' + selection + ' timed register trace');

  const audio = globalThis.C64Sid.engine().createPlayer(createDriver(program, C64Cpu), 44100, {filter: '6581'});
  audio.command({cmd: 'start', tune: selection});
  const samples = new Float32Array(44100);
  audio.render(samples, samples.length, 0);
  assert(samples.some(sample => Math.abs(sample) > 0.0001), 'cue ' + selection + ' audible output');
}
console.log('PASS: 12 SID selections reproduce the register traces from both disks');
