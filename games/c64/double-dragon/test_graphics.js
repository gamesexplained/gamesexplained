'use strict';
const assert = require('node:assert/strict');
const {game} = require('../../../kit/scripts/port_check.js');
const {CPU} = require('../../../kit/cpu/cpu6502.js');

const g = game(__dirname);
const {enemySequence} = g.run('graphics.html', 'enemySequence');
const {ram} = g.listing('parts/resident/listing.json');
const directions = [[1, 1], [0, 1], [1, 0], [0, 0]];
let checked = 0;

for (const slot of [0, 1]) {
  const selector = slot ? 0x6a46 : 0x6720;
  const update = slot ? 0x69b6 : 0x668d;
  const spacing = slot ? 0x69bd : 0x6694;
  const shapes = 0x2ee4 + slot * 4;
  const colours = 0x2ef4 + slot * 2;
  for (let type = 0; type < 7; type++) {
    for (let action = 0; action < 8; action++) {
      for (const [direction, [down, right]] of directions.entries()) {
        const sequence = enemySequence(ram, type, action, direction, slot);
        assert.ok(sequence.poses.length, 'sequence contains at least one pose');
        const cpu = new CPU(ram.slice(), {port: 0x35});
        const m = cpu.m;
        m[0x6406 + slot * 2] = down;
        m[0x6407 + slot * 2] = right;
        m[0x640a + slot] = type;
        m[0x6414 + slot] = action;
        m[0x640c + slot] = 0;
        m[0x640e + slot] = 0;
        m[0x6412 + slot] = 0;
        m[spacing] = sequence.interval;
        cpu.call(selector);
        for (let i = 0; i < sequence.poses.length; i++) {
          assert.deepEqual([...m.slice(shapes, shapes + 4)], sequence.poses[i]);
          assert.deepEqual([...m.slice(colours, colours + 2)], sequence.colours);
          assert.equal(m[0x6412 + slot], Number(i === sequence.poses.length - 1));
          if (i < sequence.poses.length - 1) {
            for (let tick = 1; tick <= sequence.interval; tick++) {
              cpu.call(update);
              assert.equal(m[0x640e + slot], i + Number(tick === sequence.interval));
            }
          }
          checked++;
        }
      }
    }
  }
}
console.log(`PASS: ${checked} enemy pose steps agree with the native code`);

const data = g.read('graphics.html').match(/<script id="player-sequences"[^>]*>([\s\S]*?)<\/script>/);
assert.ok(data, 'the page supplies the verified player sequences');
const playerSequences = JSON.parse(data[1]);
const garage = g.listing('parts/l0/listing.json');
const opening = ram.slice();
for (let address = 0; address < opening.length; address++) {
  if (garage.has[address]) opening[address] = garage.ram[address];
}
// The actor probes the two screen buffers near the floor. Rebuild them as
// the original renderer does when the camera is outside the garage.
for (const screen of [0xc000, 0xc400]) {
  const renderer = new CPU(opening, {port: 0x35});
  const m = renderer.m;
  m[4] = 0;
  m[5] = 0x90;
  m[6] = 0;
  m[7] = screen >> 8;
  m[8] = 0;
  m[9] = 0x82;
  renderer.call(0x6049);
}
let playerFrames = 0;
for (const [player, actions] of playerSequences.entries()) {
  const dispatcher = player ? 0x4c30 : 0x4417;
  const actionAddress = 0x2f02 + player * 4;
  const spriteAddress = 0x2edc + player * 4;
  for (const [action, poses] of actions.entries()) {
    const cpu = new CPU(opening.slice(), {port: 0x35, io: {read() { return 0; }, write() {}}});
    const {m} = cpu;
    m[actionAddress] = action;
    m[actionAddress + 1] = 0;
    m[0x2ed4 + player] = m[actionAddress + 2] = 160;
    m[0x2eec + player] = 112;
    for (const [duration, ...pointers] of poses) {
      for (let frame = 0; frame < duration; frame++) {
        assert.ok(m[actionAddress] < 23, 'player is still in the selected action');
        cpu.call(dispatcher);
        assert.deepEqual([...m.slice(spriteAddress, spriteAddress + 4)], pointers,
          `player ${player + 1}, starting state ${action}`);
        playerFrames++;
      }
    }
    assert.ok(m[actionAddress] >= 23, 'the action has ended');
  }
}
console.log(`PASS: ${playerFrames} player pose frames agree with the native code`);
