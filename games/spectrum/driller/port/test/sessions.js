'use strict';
// The input for the moments of play and the lockstep: a seeded player that holds a key or two for a
// few passes at a time, walking, turning, looking, rising and falling, firing, drilling and
// collecting rigs, changing the turn angle and step size, and now and then opening the information
// screen; and the script that saves moments of play to work/states from it.
//   node sessions.js [sessions] [passes] [every]     saves work/states/s<k>-p<n>.json
const lib = require('./lib.js');

// [keys, weight]
const ACTIONS = [
  [['O'], 14], [['K'], 3], [['Q'], 6], [['W'], 6], [['O', 'Q'], 3], [['O', 'W'], 3], [['P'], 2], [['L'], 2],
  [['0'], 5], [['SPACE'], 1], [['R'], 2], [['F'], 2], [['U'], 1], [['N'], 1], [['M'], 1], [['A'], 1], [['Z'], 1],
  [['S'], 1], [['X'], 1], [['D'], 1], [['C'], 1], [['I'], 1], [[], 4],
];
const TOTAL = ACTIONS.reduce((s, a) => s + a[1], 0);
function pick(rnd) {
  let x = rnd(TOTAL);
  for (const [k, w] of ACTIONS) { if (x < w) return k; x -= w; }
  return [];
}
// onPass(n, m): the keys for pass n.
function player(rnd) {
  let keys = [], left = 0;
  return (n, m) => {
    if (left <= 0) { keys = pick(rnd); left = 1 + rnd(5); }
    left--;
    m.releaseAll();
    for (const k of keys) m.press(k);
  };
}

if (require.main === module) {
  const sessions = +(process.argv[2] || 6), passes = +(process.argv[3] || 300), every = +(process.argv[4] || 10);
  const start = lib.toPlay(lib.boot());
  const base = start.save();
  lib.writeState('s0-p0', start);
  for (let s = 1; s <= sessions; s++) {
    const m = lib.restore(base);
    const input = player(lib.makeRnd(s * 7919));
    const t = Date.now();
    let saved = 0;
    for (let n = 0; n < passes; n++) {
      input(n, m);
      m.runPasses(1, 3000);
      if (n % every === every - 1) { lib.writeState('s' + s + '-p' + String(n + 1).padStart(4, '0'), m); saved++; }
    }
    console.log('session ' + s + ': ' + passes + ' passes, ' + m.frames + ' frames, ' + saved + ' states, ' + (Date.now() - t) + ' ms');
  }
}

module.exports = { player, ACTIONS };
