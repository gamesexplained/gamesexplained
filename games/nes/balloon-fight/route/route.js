'use strict';
// A recorded game of Balloon Fight, read by read (kit/skills/core/65-inputs). The game reads its
// controllers in one place, read_joypad_x ($E76A), with X the controller: once a frame for Start
// (wait_frame_pause, $F477), on every third frame for each player's steering (steer_actor, $E6FC),
// and once a frame on the title and game over screens. Each of those is a read of the steering
// kind: the game is locked to the frame and never polls faster, so a recording kept as the value
// at each read replays the same game on any machine, whatever frame it boots on.
//
// A recording is the buttons of each controller at its reads, as runs: [value, count, value,
// count, ...], in the order the reads come (the bits: A 1, B 2, Select 4, Start 8, Up 16, Down 32,
// Left 64, Right 128). Past its last read a controller reads 0.
//
//   const { feeder, Watch, READ } = require('./route.js');
//   const feed = feeder(rec);                 // feed(x): the next value for controller x
//   const w = new Watch();                    // w.read(ram, frame): call at each read; w.marks
//
// The milestones a replay is held to, kept at each read: the first read of a new phase, a change
// of score, of lives or of the player's balloons, a bonus balloon popped (the count going up: the
// game reads it before it first clears it, so its reset shows only where the RAM held something
// else at power-on), and the player's place
// every PLACE reads. Each is [read, frame, kind, value]; a place's value is x * 256 + y.

const READ = 0xE76A;            // read_joypad_x, before its first instruction: X is the controller
const PLACE = 60;
const V = { score: 0x03, phase: 0x3B, counter: 0x3C, lives: 0x41, balloons: 0x88, x: 0x91, y: 0x9A, popped: 0x05CD };

function feeder(rec) {
  const at = [{ runs: rec.p1 || [], i: 0, left: 0 }, { runs: rec.p2 || [], i: 0, left: 0 }];
  const feed = x => {
    const s = at[x & 1];
    while (s.left === 0) {
      if (s.i >= s.runs.length) return 0;
      s.left = s.runs[s.i + 1]; s.i += 2;
    }
    s.left--;
    return s.runs[s.i - 2];
  };
  feed.reads = x => { const s = at[x & 1]; let n = 0; for (let i = 0; i < s.runs.length; i += 2) n += s.runs[i + 1]; return n; };
  feed.done = () => at.every(s => s.left === 0 && s.i >= s.runs.length);
  return feed;
}

// The score as the game shows it: five digits, tens first, and the units digit always 0.
const score = ram => { let s = 0; for (let i = 4; i >= 0; i--) s = s * 10 + ram[V.score + i]; return s * 10; };

class Watch {
  constructor() { this.n = 0; this.marks = []; this.last = null; }
  read(ram, frame) {
    const now = { phase: ram[V.phase], counter: ram[V.counter], score: score(ram), lives: ram[V.lives], balloons: ram[V.balloons], popped: ram[V.popped] };
    const was = this.last, mark = (kind, v) => this.marks.push([this.n, frame, kind, v]);
    if (!was || now.phase !== was.phase || now.counter !== was.counter) mark('phase', now.phase * 256 + now.counter);
    if (was && now.score !== was.score) mark('score', now.score);
    if (was && now.lives !== was.lives) mark('lives', now.lives);
    if (was && now.balloons !== was.balloons) mark('balloons', now.balloons);
    if (was && now.popped > was.popped) mark('popped', now.popped);   // its reset to 0 at the round's start depends on what the RAM held
    if (this.n % PLACE === 0) mark('place', ram[V.x] * 256 + ram[V.y]);
    this.last = now;
    this.n++;
  }
}

// Runs: a list of values as [value, count, ...].
function runs(values) {
  const out = [];
  for (const v of values) { const n = out.length; if (n && out[n - 2] === v) out[n - 1]++; else out.push(v, 1); }
  return out;
}

module.exports = { READ, PLACE, V, feeder, Watch, runs, score };
