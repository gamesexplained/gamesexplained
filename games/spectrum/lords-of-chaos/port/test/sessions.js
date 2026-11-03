'use strict';
// The input for the moments of play and the lockstep, frame by frame: from the hand-over a script
// (SELECT CONTROLS, LOAD SCENARIO n, PLAY GAME, the number of players), then a seeded player that
// moves the cursor with Q, A, O and P, taps SPACE to open menus and choose in them, and now and then
// presses a digit or ENTER; and the script that saves moments of play to work/states from it, each
// where a human turn's loop is about to read the controls ($61E6).
//   node sessions.js [sessions] [frames] [every]     saves work/states/s<scenario>-<k>-f<n>.json
const lib = require('./lib.js');

// [keys, frames held, weight]
const ACTIONS = [
  [['SPACE'], 6, 10], [['Q'], 8, 5], [['A'], 8, 5], [['O'], 8, 5], [['P'], 8, 5], [['Q'], 30, 2], [['A'], 30, 2],
  [['O'], 30, 2], [['P'], 30, 2], [['Q', 'O'], 15, 1], [['A', 'P'], 15, 1], [[], 20, 6], [['ENTER'], 6, 1], [['1'], 6, 1],
  [['2'], 6, 1], [['Y'], 6, 1], [['N'], 6, 1],
];
const TOTAL = ACTIONS.reduce((s, a) => s + a[2], 0);
function pick(rnd) {
  let x = rnd(TOTAL);
  for (const a of ACTIONS) { if (x < a[2]) return a; x -= a[2]; }
  return ACTIONS[0];
}
// A menu worked through: SPACE to open it, the bar moved down k times, SPACE to choose, and the
// same again for a menu that follows (a confirmation, a target, a spell): [[keys, frames], ...]
function menuMacro(rnd) {
  const s = [];
  for (let j = 0; j < 2; j++) {
    s.push([['SPACE'], 6], [[], 25]);
    for (let k = rnd(8); k > 0; k--) s.push([['A'], 6], [[], 14]);
    s.push([['SPACE'], 6], [[], 40]);
  }
  return s;
}
// The start, frame by frame from the hand-over: [frame, keys held from it]
function startScript(o) {
  const s = [[120, ['SPACE']], [130, []]];
  let f = 150;
  for (let i = 0; i < 4; i++) { s.push([f, ['A']], [f + 10, []]); f += 30; }
  s.push([f, ['SPACE']], [f + 10, []]); f += 50;
  s.push([f, [String(o.scenario)]], [f + 10, []]); f += 30;
  s.push([f, ['ENTER']], [f + 10, []]); f += 300;
  s.push([f, ['SPACE']], [f + 10, []]); f += 70;
  s.push([f, [String(o.players)]], [f + 10, []]); f += 70;
  return { steps: s, end: f };
}
// player(rnd, machine, { scenario, players, boot }): { pass(n, m), frame(f, m) }
function player(rnd, m0, o = {}) {
  o = Object.assign({ scenario: 1 + rnd(3), players: 1 + rnd(2), boot: m0 && m0.cpu.pc === 0xE1ED }, o);
  const start = o.boot ? startScript(o) : null;
  let f0 = m0 ? m0.frames : 0, keys = [], left = 0, i = 0, queue = [];
  // the keys are set on the machine only where it reads them whole (check(m), at a checkpoint):
  // changed in the middle of the game's four reads of the keyboard, they would be half one and half
  // the other, which the port, reading them at once, never sees
  let want = [];
  const set = (m, k) => { want = k; };
  return {
    pass() {},
    check(m) { m.releaseAll(); for (const x of want) m.press(x); },
    frame(f, m) {
      const t = m.frames - f0;
      if (start && t < start.end) {
        while (i < start.steps.length && start.steps[i][0] <= t) set(m, start.steps[i++][1]);
        return;
      }
      if (left-- > 0) return;
      if (!queue.length && rnd(4) === 0) queue = menuMacro(rnd);
      const a = queue.length ? queue.shift() : pick(rnd);
      keys = a[0]; left = a[1];
      set(m, keys);
    },
  };
}

if (require.main === module) {
  const sessions = +(process.argv[2] || 6), frames = +(process.argv[3] || 6000), every = +(process.argv[4] || 300);
  for (let s = 1; s <= sessions; s++) {
    const scen = 1 + (s - 1) % 3, players = 1 + ((s - 1) >> 1) % 2;
    const m = lib.boot();
    const input = player(lib.makeRnd(s * 7919), m, { scenario: scen, players });
    const t = Date.now();
    let saved = 0, want = false, last = -every;
    m.hooks[0x61E6] = q => {
      if (!want || q !== m) return false;
      want = false;
      lib.writeState('s' + scen + '-' + s + '-f' + String(m.frames).padStart(6, '0'), m);
      saved++;
      return false;
    };
    for (let f = 0; f < frames; f++) {
      input.frame(f, m);
      input.check(m);
      m.runFrames(1);
      if (m.frames - last >= every && lib.partOf(m.ram) === scen) { want = true; last = m.frames; }
    }
    console.log('session ' + s + ' (scenario ' + scen + ', ' + players + ' players): ' + frames + ' frames, ' + saved + ' states, ' + (Date.now() - t) + ' ms');
  }
}

module.exports = { player, ACTIONS };
