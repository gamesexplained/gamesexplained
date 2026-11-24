'use strict';

// Each digest comes from a separate CPU run of the full original tape payload.
// The trace stores every SID register, value and cycle for 90,000 driver steps.
// The page uses only the ranges those routines read or execute.
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
const C64Cpu = require(path.join(root, 'kit/cpu/cpu6502.js'));
require(path.join(root, 'site/lib/sid.js'));

const page = fs.readFileSync(path.join(__dirname, 'music.html'), 'utf8');
const tracks = JSON.parse(page.match(/<script id="ninja-music-data" type="application\/json">([^<]+)<\/script>/)[1]);
const driverText = page.match(/<script id="ninja-music-driver">\s*([\s\S]+?)\s*<\/script>/)[1];
const createDriver = vm.runInNewContext('(' + driverText + ')', {atob});
const expected = [
  '386eb90feaed755ac91a49284667bfcca8e111be37e3dfa0b8af10e4094df71e',
  'bb68bd1d4dd8905e4a9f84c90c1165034a4ec4b0ffb7bc96d6929231585b142a',
  '8db87fcde7476f4e10a8e1eff0bc7634813f8db9d6a43898f22394f292757087',
  '5f4dd4e7fd2e85c83744206bb74bc084bdbd0eee8f72383d98dfc2e97139f049',
  '51dfc8f08cc379f13a71d809a1511c414553ee05c7b85393f6762b2b5376d401',
  '7be1dfa39ead3caef3d2b33a04e130eb26d64fe693f1e0c2975f216a11775d83',
  '70a6717ed4141afeed2fc929aaa4a9d453c480e281069c02087027014c25774e',
  '4fbeb61259f29c0301175f326c3ed12a3db9e34cfba53206a1b5a447297832ab',
  'd2981018003ecb73d03fc41b1863a8ca47815345e9f364192811e1b12a25cd0c',
  'bae49c2b72564a958fe9104c5e6062f388865e4a0231440b808aa12fd2a5588c',
  '5c9dd15e3897721eee29182adb064a95387f9b48e4e95d781f1c6b052a382413',
  'a6722b2c32dbf37aced4a10ea62ff46b51299bb1ff8eb38b3830e5bba3e06ece',
];

assert.equal(tracks.length, expected.length);
const engine = globalThis.C64Sid.engine();
for (let tune = 0; tune < tracks.length; tune++) {
  const driver = createDriver(tracks, C64Cpu);
  driver.init(tune);
  const digest = createHash('sha256');
  for (let frame = 0; frame < 90000; frame++) {
    driver.readback(0, 0, 0);
    driver.play();
    assert.equal(driver.writes.length, 2 * driver.times.length);
    const values = [];
    for (let i = 0; i < driver.times.length; i++) {
      values.push(driver.writes[2 * i], driver.writes[2 * i + 1], driver.times[i]);
    }
    digest.update(JSON.stringify(values) + '\n');
  }
  assert.equal(digest.digest('hex'), expected[tune], `tune ${tune + 1} timed SID writes`);
  const player = engine.createPlayer(driver, 44100, {filter: '6581'});
  player.command({cmd: 'start', tune});
  const output = new Float32Array(44100 * 3);
  player.render(output, output.length, 0);
  assert(output.every(Number.isFinite), `tune ${tune + 1} rendered samples`);
  assert(output.some(sample => Math.abs(sample) > 0.005), `tune ${tune + 1} audible`);
}
console.log('All 12 tunes match 90,000 timed SID steps each and produce audio.');
