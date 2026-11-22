'use strict';

// Each digest comes from a separate CPU run of the full original tape payload.
// The trace stores every SID register, value and cycle for 6,000 driver steps.
// The page uses only the ranges those routines read or execute.
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
const C64Cpu = require(path.join(root, 'kit/cpu/cpu6502.js'));
require(path.join(root, 'site/lib/sid.js'));

const page = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const tracks = JSON.parse(page.match(/<script id="ninja-music-data" type="application\/json">([^<]+)<\/script>/)[1]);
const driverText = page.match(/<script id="ninja-music-driver">\s*([\s\S]+?)\s*<\/script>/)[1];
const createDriver = vm.runInNewContext('(' + driverText + ')', {atob});
const expected = [
  '13e47a5264544df2e5790117f2ba8158acedc2325c030265dbb9d9b045be97c9',
  '84603ab962eddb615009bf300115d6809333a989230f861bfacf24832258c8b9',
  'd51be0bc920ec2a218e06cedfd1487adaf032c9ef29977cebf352adea5dd3b7d',
  'e897451597bc6bc938dde5eb82786fee2eabccdf91c990437468f62209e98e85',
  '9c07d99beb65ef0dd5375a09d90ebd080300e9ee76933abba2fe7100eddc7e0c',
  '51568929d131eeac710000e068de9e7d71bfe70d45abb0c0ff23fdd92ed243d0',
  '50bdc35fa1635022a0b65fa17280127d591a1a3a038e005c1a29d1aff791f227',
  'ee14c2bececb8b8ec69876aa629d8a5276d33deae16c42070c9dd5384e6a5ed9',
  '4c2cce70f54e65618d599afc17c2f620dab5a28b5aca8c8ac96a9a98386371c4',
  '311d03cc8e15c20c81a5f6b02af6a0b48778d097671a51607866c4914276502b',
  '7e0dd4c45ea08c0c50cf5ba2f35c7bd6f04bbbabad9623367c3187d55e235b25',
  'e44b292d2e7cbcfbb66bf7d886c056067a565c1baae8436f9a7bbefe2790a477',
];

assert.equal(tracks.length, expected.length);
const engine = globalThis.C64Sid.engine();
for (let tune = 0; tune < tracks.length; tune++) {
  const driver = createDriver(tracks, C64Cpu);
  driver.init(tune);
  const digest = createHash('sha256');
  for (let frame = 0; frame < 6000; frame++) {
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
console.log('All 12 tunes match 6,000 timed SID steps each and produce audio.');
