/* Run original routines against the functions and data actually shipped in the page.
 * Usage: node games/c64/wizard/validation/audit_mechanics.js [private-work-directory]
 * Forced I/O values test dispatch and arithmetic, not physical collision or reachability.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const game = path.resolve(__dirname, '..'), root = path.resolve(game, '../../..');
const work = process.argv[2] ? path.resolve(process.argv[2]) : path.join(game, 'work');
const {CPU, readSnapshot} = require(root + '/kit/c64/cpu6502');
const snapshot = readSnapshot(work + '/play-round1.vsf');
const html = fs.readFileSync(game + '/index.html', 'utf8');
const functions = html.slice(html.indexOf('function treasureResult('), html.indexOf('const FRAME='));
assert(functions.startsWith('function treasureResult('));
const {treasureResult, createEffects} = vm.runInNewContext(functions + '\n({treasureResult,createEffects})', {Uint8Array});
const simonSurvives = vm.runInNewContext('(' + html.match(/function simonSurvives\([^]*?\n}/)[0] + ')');
const maps = JSON.parse(html.match(/^const MAPS=(.*);$/m)[1]);
function fresh() {
  const io = new Uint8Array(4096), writes = [];
  const cpu = new CPU(Uint8Array.from(snapshot.ram), {port: {...snapshot.port}, io: {
    read: a => io[a - 0xd000], write: (a, v) => {io[a - 0xd000] = v; writes.push(a, v);}
  }});
  return {cpu, m: cpu.m, io, writes};
}
const counts = {score: 0, sid: 0, speedKeys: 0, textEntries: 0, levelIndexes: 0, simon: 0};
for (let type = 1; type <= 4; type++) for (let difficulty = 0; difficulty < 4; difficulty++) {
  for (const score of [0, 9950, 99950, 9999500, 99999500]) {
    const {cpu, m} = fresh();
    m[0xc007] = difficulty; m[0xc051] = 1; m[0xc008] = 6; m[0xfb] = 0x93; m[0xfc] = 0xc6;
    m.set(Buffer.from(String(score).padStart(8, '0')), 0xc7b7);
    cpu.call(0x8464, {a: type, y: 0, c: 0, d: 0});
    const expected = treasureResult(score, type, difficulty);
    assert.equal(Number(Buffer.from(m.slice(0xc7b7, 0xc7bf)).toString()), expected.score);
    assert.equal(m[0xc008] === 7, expected.extraLife); counts.score++;
  }
}
for (let effect = 0; effect < 5; effect++) for (const random of [0, 1, 18, 127, 254, 255]) for (const carry of [0, 1]) {
  const {cpu, m, writes} = fresh(); m[0xc031] = random;
  cpu.call([0x852b, 0x987d, 0x97fb, 0x985a, 0x98b6][effect], {a: 32, c: carry, d: 0});
  const preview = createEffects(); preview.effect(effect, random, carry, 32);
  assert.equal(JSON.stringify(preview.writes), JSON.stringify(writes.map((v, i) => i % 2 ? v : v - 0xd400)));
  counts.sid++;
}
for (let key = 0; key < 256; key++) {
  const {cpu, m} = fresh(); m[0xc005] = 5;
  cpu.call(0x90ed, {d: 0}, {hooks: {0xff9f: c => c.rts(), 0xffe4: c => {c.a = key; c.rts();}}});
  assert.equal(m[0xc005], key >= 48 && key <= 57 ? key - 48 : 5); counts.speedKeys++;
}
for (const [api, destination, table, mode, width] of [
  [0x7078, 0x8fa6, 0x8fa0, 0, 3], [0x706f, 0x8fb5, 0x8f9a, 0, 16], [0x7066, 0x8fc4, 0x8f94, 1, 23]
]) {
  const {cpu, m} = fresh();
  assert.equal(m[api], 0x4c); assert.equal(m[api + 1] + m[api + 2] * 256, destination);
  cpu.call(api, {d: 0}, {hooks: {0x8fdd: c => c.rts()}});
  assert.deepEqual(m.slice(0xc067, 0xc06d), m.slice(table, table + 6));
  assert.equal(m[0xfe], mode); assert.equal(m[0xc069] - m[0xc067], width); counts.textEntries++;
}
for (let number = 0; number < 40; number++) {
  const {cpu, m} = fresh(), raw = fs.readFileSync(work + '/l' + String(number).padStart(2, '0') + 't.prg').subarray(2);
  m.set(raw, 0xc300); cpu.call(0x7baa, {d: 0});
  const size = a => Array.from({length: 16}, (_, i) => m[a + i] + 256 * m[a + 16 + i]).filter(x => x !== 0x3f7).length;
  assert.equal(maps[number].treasures, size(0xc00a)); assert.equal(maps[number].fires, size(0xc0e0)); counts.levelIndexes++;
}
const level = fs.readFileSync(work + '/l07t.prg').subarray(2);
for (let slot = 0; slot < 16; slot++) for (const requested of [28, 29, 30, 31]) for (let color = 0; color < 16; color++) for (let random = 0; random < 4; random++) {
  const {cpu, m, io} = fresh(); m.set(level, 0xc300); m[0xc35f] = requested; m[0xc031] = random; m[0xc02a] = 0; io[0x832] = color | 0xf0;
  cpu.call(0xc376, {x: slot, d: 0});
  assert.equal(m[0xc02a], +!simonSurvives(requested, color, level[0x100 + slot]));
  assert.equal(m[0xc35f], level[0x110 + slot]); assert.equal(m[0xc445], level[0x110 + slot]);
  for (let i = 0; i < 13; i++) assert.equal(io[0x832 + i], random === 2 ? 13 : random);
  counts.simon++;
}
console.log(JSON.stringify({counts, passed: true}, null, 2));
