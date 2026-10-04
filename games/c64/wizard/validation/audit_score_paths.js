/* Original GAME ranking/attribution and disk-retry control-flow checks.
 * Usage: node validation/audit_score_paths.js [private-work-directory] [private-ROM-directory]
 * Inputs match audit_accounting.js. Text fields and disk statuses are supplied;
 * live real-keyboard and disk observations are recorded in audit.md.
 */
'use strict';
const assert = require('assert');
const {fresh, set, get, run} = require('./compiled_harness');
const counts = {attribution: 0, saveRetry: 0, loadRetry: 0, saveStatus: 0};
const oldScores = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11];
const cases = [
  {points: [0], ranks: [], scores: oldScores},
  {points: [500], ranks: [], scores: oldScores},
  {points: [550], ranks: [[1, 9]], scores: oldScores},
  {points: [1000], ranks: [[1, 0]], scores: [20, 20, 19, 18, 17, 16, 15, 14, 13, 12]},
  {points: [1050, 1000, 1000, 750, 550, 0], ranks: [[1, 0], [2, 1], [3, 2], [4, 8]],
    scores: [21, 20, 20, 20, 19, 18, 17, 16, 15, 15]},
  {points: [750, 500, 1500, 1000, 1050, 550], ranks: [[1, 8], [3, 0], [4, 2], [5, 1]],
    scores: [30, 21, 20, 20, 19, 18, 17, 16, 15, 15]},
  {points: [1000, 1000, 1000, 1000, 1000, 1000],
    ranks: [[1, 0], [2, 1], [3, 2], [4, 3], [5, 4], [6, 5]],
    scores: [20, 20, 20, 20, 20, 20, 20, 19, 18, 17]},
  {points: [550, 550, 550, 550, 550, 550], ranks: [[1, 9]], scores: oldScores}
];
for (const {points, ranks, scores} of cases) {
  const s = fresh(), prompts = [], names = [];
  s.m.fill(0, 0xc100, 0xc180);
  s.m.fill(24, 0xc100, 0xc11e);
  s.m.set(oldScores, 0xc11e);
  s.m.fill(24, 0xc13c, 0xc14c);
  run(s, 0x4702, [0x4744]); // Original disk-score unpacker.
  set(s, 13, points.length);
  s.m.fill(0, 0x2c6, 0x2d8);
  points.forEach((n, i) => {
    s.m[0x2c6 + i] = n & 255;
    s.m[0x2cc + i] = (n >> 8) & 255;
    s.m[0x2d2 + i] = n >> 16;
  });
  // Execute both the insertion and attribution passes. Supply only input fields;
  // the original bytecode selects the player/rank and copies every field.
  run(s, 0x419a, [0x4321], {
    0x8fb5: c => { names.push([get(s, 0), get(s, 4)]); s.m.fill(get(s, 0), 0xc574, 0xc584); c.rts(); },
    0x8fa6: c => { prompts.push([get(s, 0), get(s, 4)]); s.m.fill(get(s, 0), 0xc6ba, 0xc6bd); c.rts(); }
  });
  assert.deepEqual(prompts, ranks);
  assert.deepEqual(names, ranks.filter(([, rank]) => rank === 0));
  const flags = Array(10).fill(0);
  for (const [player, rank] of ranks) flags[rank] = player;
  assert.deepEqual(Array.from(s.m.slice(0xc380, 0xc38a)), flags);
  for (let rank = 0; rank < 10; rank++) {
    const expected = flags[rank] || 24;
    assert.deepEqual([s.m[0xc100 + rank], s.m[0xc10a + rank], s.m[0xc114 + rank]], Array(3).fill(expected));
  }
  assert.deepEqual(Array.from(s.m.slice(0xc13c, 0xc14c)), Array(16).fill(flags[0] || 24));
  let saves = 0;
  run(s, 0x4745, [0x4808, 0x4877], {0x8b1e: c => { saves++; s.m[0xfb] = 0; c.rts(); }});
  assert.equal(saves, ranks.length ? 1 : 0);
  assert.deepEqual(Array.from(s.m.slice(0xc11e, 0xc128)), scores);
  counts.attribution++;
}
for (const failure of [1, 64, 128, 255]) {
  for (const mode of ['recover', 'exhaust', 'no-fire']) {
    const s = fresh();
    s.m.fill(0, 0xc380, 0xc38a);
    s.m[0xc380] = 1;
    s.io[0xc00] = mode === 'no-fire' ? 31 : 15;
    let saves = 0;
    const stop = run(s, 0x4745, [0x4808, 0x4857], {0x8b1e: c => {
      saves++;
      s.m[0xfb] = mode === 'recover' && saves === 2 ? 0 : failure;
      c.rts();
    }});
    assert.equal(stop, mode === 'recover' ? 0x4808 : 0x4857);
    assert.equal(saves, mode === 'recover' ? 2 : mode === 'exhaust' ? 3 : 1);
    if (mode === 'no-fire') assert(get(s, 3) > 2 && get(s, 3) < 2.001);
    counts.saveRetry++;
  }
}
// Run the original native saver too: its caller uses READST, ignoring the
// accumulator/carry returned by KERNAL SAVE. Hook transport, commands and delay;
// the original $8B1E saver and compiled decision both remain in the path.
for (const [error, carry, status] of [[0, 0, 0], [5, 1, 0], [5, 1, 128], [0, 0, 64]]) {
  const s = fresh();
  s.m.fill(0, 0xc380, 0xc38a);
  s.m[0xc380] = 1;
  let calls = 0;
  const stop = run(s, 0x4745, [0x4808, 0x4857], {
    0x8b62: c => c.rts(),
    0x8b81: c => c.rts(),
    0x8e4b: c => c.rts(),
    0xffd8: c => { calls++; c.a = error; c.c = carry; c.rts(); },
    0xffb7: c => { c.a = status; c.rts(); }
  });
  assert.equal(calls, 1);
  assert.equal(stop, status === 0 ? 0x4808 : 0x4857);
  counts.saveStatus++;
}
// A level LOAD accepts status 64, unlike SAVE's zero. The fourth LOAD occurs
// before the retry-limit check, which then discards even a successful status.
for (const statuses of [[64], [0, 64], [66, 66, 64], [66, 66, 66, 64], [66, 66, 66, 66]]) {
  const s = fresh();
  s.io[0xc00] = 15;
  let loads = 0;
  const stop = run(s, 0x29c6, [0x2aae, 0x3e6c], {0x8a66: c => {
    assert(loads < statuses.length);
    s.m[0xfb] = statuses[loads++];
    c.rts();
  }});
  assert.equal(loads, statuses.length);
  assert.equal(stop, loads === 4 ? 0x3e6c : 0x2aae);
  counts.loadRetry++;
}
// The load-error wait increments V3 once before its back edge. Observe 10,000
// polls without changing code, then press FIRE as a positive exit control.
{
  const s = fresh();
  let loads = 0, polls = 0, first;
  const stop = run(s, 0x29c6, [0x2aae], {0x8a66: c => {
    s.m[0xfb] = loads++ === 0 ? 66 : 64;
    c.rts();
  }}, {observe: at => {
    if (at === 0x2a84) {
      const counter = get(s, 3);
      if (polls++ === 0) first = counter;
      assert.equal(counter, first);
      assert(counter > 0 && counter < 0.001);
      if (polls === 10000) s.io[0xc00] = 15;
    }
  }});
  assert.equal(stop, 0x2aae);
  assert.equal(polls, 10000);
  assert.equal(loads, 2);
  assert.equal(get(s, 3), 1);
  counts.loadRetry++;
}
console.log(JSON.stringify({counts, passed: true}, null, 2));
