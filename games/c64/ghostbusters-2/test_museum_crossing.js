'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
const {game} = require('../../../kit/scripts/port_check.js');
const listing = game(__dirname).listing('parts/museum/listing.json');
const ram = listing.ram.slice();
const cpu = new CPU(ram, {port: 0x35});
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'museum-crossing-vice.json'), 'utf8'));
function set(state) {
  ram[0xfc07] = state.x_low; ram[0xfc0f] = state.x_high;
  ram[0x8041] = state.room; ram[0x804b] = state.player_room;
}
function state() {
  return {x_low: ram[0xfc07], x_high: ram[0xfc0f], room: ram[0x8041], player_room: ram[0x804b]};
}
set(fixture.before);
cpu.pc = 0xbfa1;
cpu.run({until: 0x8396, maxInstructions: 100});
assert.equal(cpu.pc, 0x8396);
assert.deepStrictEqual(state(), fixture.after, 'room crossing matches VICE');
assert.equal(ram[0xfc08], 0x40);
assert.equal(ram[0xfc10], 0);
set({...fixture.before, x_low: 0x39});
cpu.call(0xbfa1);
assert.deepStrictEqual(state(), {...fixture.before, x_low: 0x3b}, 'below threshold moves without changing room');
set({...fixture.after, x_low: 0x40, x_high: 1});
cpu.call(0xbfa1);
assert.deepStrictEqual(state(), {...fixture.after, x_low: 0x40, x_high: 1}, 'room-one limit stops movement');
const reverse = JSON.parse(fs.readFileSync(path.join(__dirname, 'museum-return-vice.json'), 'utf8'));
set(reverse.before);
cpu.pc = 0xbe7b;
cpu.run({until: 0x8396, maxInstructions: 100});
assert.equal(cpu.pc, 0x8396);
assert.deepStrictEqual(state(), reverse.after, 'return crossing matches VICE');
assert.equal(ram[0xfc08], 0x10);
assert.equal(ram[0xfc10], 1);
set({...reverse.before, x_low: 0x25});
cpu.call(0xbe7b);
assert.deepStrictEqual(state(), {...reverse.before, x_low: 0x23}, 'at the threshold it moves without changing room');
set({...reverse.after, x_low: 0x1f, x_high: 0});
cpu.call(0xbe7b);
assert.deepStrictEqual(state(), {...reverse.after, x_low: 0x1f, x_high: 0}, 'room-zero limit stops movement');
console.log('OK - museum crossings and their boundary cases match VICE and the game code');
