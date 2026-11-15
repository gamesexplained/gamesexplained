'use strict';
const assert = require('assert');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');

const g = game(__dirname);
const {ropeStep} = g.run('index.html', 'rope-model', 'ropeStep');
const listing = g.listing('parts/museum/listing.json');
assert(listing.has[0xC74C] && listing.has[0xC77B], 'museum routines must be in the listing');

const inputs = {none: 0xFF, up: 0xFE, down: 0xFD, both: 0xFC};
let cases = 0;
for (const position of [42, 174, 176, 200]) {
  for (let speed = 0; speed <= 8; speed++) {
    for (let count = 0; count < 4; count++) {
      for (const direction of Object.keys(inputs)) {
        const initial = {position, second: (position + 21) & 0xFF, speed, count, landed: 0};
        const ram = listing.ram.slice();
        ram[0xC672] = 0;
        ram[0xFC15] = initial.position;
        ram[0xFC16] = initial.second;
        ram[0x8058] = initial.speed;
        ram[0x805A] = initial.count;
        ram[0x805B] = initial.landed;
        const cpu = new CPU(ram, {port: 0x35, io: {
          read: address => {
            assert.equal(address, 0xDC00);
            return inputs[direction];
          },
          write: () => { throw new Error('unexpected I/O write'); },
        }});
        cpu.call(0xC74C, {});
        const expected = {
          position: ram[0xFC15], second: ram[0xFC16], speed: ram[0x8058],
          count: ram[0x805A], landed: ram[0x805B],
        };
        assert.deepStrictEqual({...ropeStep(initial, direction)}, expected,
          `position=${position}, speed=${speed}, count=${count}, direction=${direction}`);
        cases++;
      }
    }
  }
}
console.log(`OK - ${cases} museum descent steps match the game's routine`);

const route = g.json('museum-rope-route.json');
const ram = listing.ram.slice();
ram[0xC672] = 0;
ram[0xFC15] = 42;
ram[0xFC16] = 63;
ram[0x8058] = ram[0x805A] = ram[0x805B] = 0;
let joystick = 0xFF;
const cpu = new CPU(ram, {port: 0x35, io: {
  read: address => { assert.equal(address, 0xDC00); return joystick; },
  write: () => { throw new Error('unexpected I/O write'); },
}});
for (let index = 0; index < route.reads.length; index++) {
  joystick = inputs[route.reads[index]];
  assert.notEqual(joystick, undefined, `unknown direction at read ${index + 1}`);
  cpu.call(0xC74C, {});
  const milestone = route.milestones.find(item => item.reads === index + 1);
  if (milestone) {
    assert.deepStrictEqual([ram[0x8058], ram[0x805B], ram[0xFC15], ram[0xFC16]], milestone.values,
      `route milestone at read ${index + 1}`);
  }
}
assert.equal(route.milestones.at(-1).reads, route.reads.length);
console.log(`OK - ${route.reads.length} recorded control reads reach the landing`);
