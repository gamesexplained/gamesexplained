'use strict';
const assert = require('assert');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const {ram: source} = game(__dirname).listing('parts/broadway/listing.json');

function run(firstPointer) {
  const ram = source.slice();
  // Keep the sound call from changing unrelated state during this check.
  ram[0x8405] = 0x60;
  for (const [address, value] of [[0x9c6a, 40], [0x9c6c, 100], [0x9c6e, 150], [0x9c70, 50], [0x9c72, 200]]) {
    ram[address] = value; ram[address + 1] = 0;
  }
  ram[0x86f8] = firstPointer; ram[0x86fd] = 0x0b;
  ram[0x973b] = ram[0x973d] = ram[0x973f] = 0;
  new CPU(ram, {port: 0x35}).call(0x9976);
  return [ram[0x973b], ram[0x973d], ram[0x973f]];
}
assert.deepStrictEqual(run(0x0a), [1, 0, 0], 'a matching position sets the first flag');
assert.deepStrictEqual(run(0x08), [0, 0, 0], 'the blank first sprite suppresses that match');
console.log('OK - Broadway position overlap and blank-sprite guard');

function spriteAgainstFigures(yPosition, alreadyMarked = false) {
  const ram = source.slice();
  ram[0x8405] = 0x60;
  ram[0x851f] = 50; ram[0x8524] = yPosition;
  for (const [address, value] of [[0x9c6a, 40], [0x9c6c, 100], [0x9c6e, 150]]) {
    ram[address] = value; ram[address + 1] = 0;
  }
  ram[0x973b] = alreadyMarked ? 1 : 0; ram[0x973d] = ram[0x973f] = 0;
  new CPU(ram, {port: 0x35}).call(0x9aea);
  return [ram[0x973b], ram[0x851f], ram[0x8524]];
}
assert.deepStrictEqual(spriteAgainstFigures(0xaa), [1, 0x66, 0x74], 'matching the first figure marks it and resets sprite position');
assert.deepStrictEqual(spriteAgainstFigures(0xa9), [0, 50, 0xa9], 'the vertical threshold prevents the match');
assert.deepStrictEqual(spriteAgainstFigures(0xaa, true), [1, 50, 0xaa], 'a marked figure does not reset the sprite again');
console.log('OK - Broadway sprite position match and vertical guard');
