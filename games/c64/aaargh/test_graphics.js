#!/usr/bin/env node
'use strict';
// The Graphics tab. Its ag-gfx block says which picture each monster, hornet, flyer and the cannon
// shows on each pass, from the game's tables and timers. This runs the game from listing.json on the
// kit's machine model, plays it with the stick, and checks the block against what the game does:
// - a pass of play is AG_PASS frames;
// - each monster move steps its frames as AG_MOVES says: walking, a punch, a flame with the button
//   held, eating (a person put in reach), dying; and the title steps through the 64 frames in turn;
// - a punch to the left or right that misses shows the burst agBurst gives, on each pass;
// - every hornet and flyer picture is agFlyer at its base and step, or the burst at its count;
// - the cannon breaks up as AG_CANNON shows, and never takes frame 6;
// - no body, legs or sprite shown in a long game is one the tab says nothing shows.
//   node games/c64/aaargh/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, loadListing } = require(path.join(ROOT, 'kit/c64/machine.js'));
const g = game(__dirname);
const { AG_PASS, AG_MOVES, AG_CANNON, agMonster, agBurst, agFlyer, agBurnt, agCannon } =
  g.run('graphics.html', 'ag-gfx', 'AG_PASS', 'AG_MOVES', 'AG_CANNON', 'agMonster', 'agBurst', 'agFlyer', 'agBurnt', 'agCannon');
const LISTING = path.join(__dirname, 'listing.json');
const ram0 = loadListing(LISTING);
let bad = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };
const h2 = (n) => '$' + n.toString(16).toUpperCase().padStart(2, '0');
const U = 1, D = 2, LEFT = 4, RIGHT = 8, FIRE = 16, NONE = 0x1F;
const ACTION = 0x8215, FRAME = 0x8213, STATE = 0x80E9, POWER = 0x80ED, MISSES = 0x82B7;

function start() {
  const M = new Machine({ ram: loadListing(LISTING), pc: 0x8009, port: { dir: 0x2F, data: 0x35 }, passAt: 0x8019, dma: true });
  M.joy = NONE; M.runFrames(100); M.joy = NONE & ~FIRE; M.runFrames(10); M.joy = NONE; M.runFrames(300);
  return M;
}
// the frames a move's steps give, pass by pass, from the pass the move starts
const expand = (steps) => steps.flatMap(([f, n]) => Array(n).fill(f));
const move = (name) => AG_MOVES.find((m) => m.name === name);
function compare(what, got, want) {
  const n = Math.min(got.length, want.length);
  for (let i = 0; i < n; i++) if (got[i] !== want[i]) { fail(what, `pass ${i}: the game shows ${got[i]}, the tab ${want[i]}`, '| game', got.join(' '), '| tab', want.join(' ')); return; }
}

const M = start(), R = M.ram;
// a pass of play
{
  const per = [];
  for (let i = 0; i < 200; i++) { const f = M.frames; M.runPasses(1); per.push(M.frames - f); }
  per.shift();
  const mean = per.reduce((a, b) => a + b) / per.length;
  if (per.some((d) => d < AG_PASS - 1 || d > AG_PASS + 1) || Math.abs(mean - AG_PASS) > 0.05) fail('passes of play took', per.join(' '), 'frames');
}
// walking: the frame steps on every pass, in the move's action
for (const [dir, bit] of [['up', U], ['right', RIGHT], ['down', D], ['left', LEFT]]) {
  const m = move('walking ' + dir);
  M.joy = NONE & ~bit; M.runPasses(3);
  const got = [], want = [];
  let f = R[FRAME];
  for (let i = 0; i < 12; i++) { M.runPasses(1); got.push(R[ACTION] + ':' + R[FRAME]); f = (f + 1) & 3; want.push(m.action + ':' + f); }
  compare('walking ' + dir, got, want);
  if (m.steps.map((s) => s[0]).join() !== '1,2,3,0' || m.steps.some((s) => s[1] !== 1)) fail('walking', dir, 'steps are not a frame a pass');
  M.joy = NONE; M.runPasses(3);
}
// punches, with punching power, and the burst beside a punch that misses: the pointers of the
// second band's sprites on the screen, as its interrupt left them in the last frame of each pass
let bursts = 0, shown2 = [];
M.onReturn = (m) => {
  if (m.line < 60) return;
  shown2 = [];
  for (let i = 0; i < 8; i++) { const y = m.vic[2 * i + 1]; if ((m.vic[0x15] >> i) & 1 && y > 30 && y < 250) shown2.push(R[0xCBF8 + i]); }
};
for (const [dir, bit] of [['up', U], ['right', RIGHT], ['down', D], ['left', LEFT]]) {
  const m = move('punching ' + dir);
  M.joy = NONE; M.runPasses(12);
  R[POWER] = 1;
  M.joy = NONE & ~bit & ~FIRE;
  const got = [], burst = [];
  for (let i = 0; i < 14; i++) {
    M.runPasses(1);
    if (i === 0) M.joy = NONE;
    got.push(R[ACTION] + ':' + R[FRAME]);
    burst.push(shown2.find((p) => p >= 0xA0 && p <= 0xA6) || 0);
  }
  compare('punching ' + dir, got, expand(m.steps).concat(Array(14).fill(m.steps[m.steps.length - 1][0])).map((f) => m.action + ':' + f));
  if (m.burst) {
    if (!R[MISSES]) fail('punching', dir, 'hit a building, so its burst was not checked');
    // what the screen shows lags the pass by one, the body as well as the burst, so the burst on
    // the screen is checked against the move's passes one later
    else { bursts++; compare('the burst punching ' + dir, burst.slice(1).map(h2), burst.slice(1).map((_, i) => h2(agBurst(R, m.burst, i)))); }
  } else if (burst.some((b) => b)) fail('punching', dir, 'shows a burst, which the tab does not');
}
M.onReturn = null;
if (bursts !== 2) fail('the burst was checked on', bursts, 'sides of 2');
// a flame with the button held
for (const [dir, bit, action] of [['up', U, 0x20], ['right', RIGHT, 0x24], ['down', D, 0x28], ['left', LEFT, 0x2C]]) {
  const m = move(`a flame ${dir}, the button held`);
  if (m.action !== action) fail('a flame', dir, 'has action', h2(m.action));
  M.joy = NONE & ~bit; M.runPasses(2); M.joy = NONE; M.runPasses(10);
  M.joy = NONE & ~FIRE;
  const got = [];
  for (let i = 0; i < 21; i++) { M.runPasses(1); got.push(R[ACTION] + ':' + R[FRAME]); }
  compare(`a flame ${dir}`, got, expand(m.steps.concat(m.steps, m.steps)).map((f) => m.action + ':' + f));
  M.joy = NONE; M.runPasses(10);
}
// eating: a person put in reach, as monster_eat ($914E) looks for one, and the button
for (const [dir, bit] of [['right', RIGHT], ['left', LEFT]]) {
  const m = move('eating, ' + dir);
  M.joy = NONE & ~bit; M.runPasses(2); M.joy = NONE; M.runPasses(10);
  R[0x821F] = 1; R[0x8227] = R[0x80AB] + 1; R[0x822F] = R[0x80AF] + 2;
  M.joy = NONE & ~FIRE;
  const got = [];
  for (let i = 0; i < 12; i++) { M.runPasses(1); if (i === 0) M.joy = NONE; got.push(R[ACTION] + ':' + R[FRAME]); }
  if (R[0x821F] === 1) fail('eating', dir, 'the person was not eaten');
  compare('eating ' + dir, got, expand(m.steps).concat(Array(12).fill(3)).map((f) => m.action + ':' + f));
}
// the white flyer, the hornets and their bursts, and every picture shown, over a long game. The
// first band's pointers are checked as the interrupt on line 0 ($8810) sets them, against the base,
// step and count it read; one hornet out is burnt (its count set to 1) now and then
const shown = new Set(), legsShown = new Set();
let flyChecks = 0, burnChecks = 0, frame6 = 0;
M.onReturn = (m) => {
  if (m.line > 60) return;
  for (let x = 0; x < 3; x++) {
    const out = x < 2 ? R[0x823B + x] : R[0x80BA];
    if (!out) continue;
    const ptr = R[0x80C6 + x], count = R[0x823D + x];
    if (count) { if (count > 6) continue; burnChecks++; const d = ptr - agBurnt(count); if (d !== 0 && d !== 1) fail('band 1 sprite', x, 'burnt at', count, 'shows', h2(ptr)); }
    else { flyChecks++; const want = agFlyer(R, R[0x820F + x], R[0x8212]); if (ptr !== want) fail('band 1 sprite', x, 'shows', h2(ptr), 'not', h2(want)); }
  }
};
for (let p = 0; p < 600; p++) {
  M.joy = [NONE, NONE & ~FIRE, NONE & ~RIGHT, NONE & ~LEFT, NONE & ~U, NONE & ~D][Math.floor(p / 7) % 6];
  if (p % 100 === 50 && R[0x823B] && !R[0x823D]) R[0x823D] = 1;
  const p0 = M.passes;
  M.runPasses(1, 40);
  if (M.passes === p0) break;   // the fight in the cave, or the game over: no pass of play
  if (R[0x8240] === 6) frame6++;
  for (const who of [0, 1]) if (R[STATE + who]) { const i = R[ACTION + who] + R[FRAME + who]; const { body, legs } = agMonster(R, who, i); shown.add(body); legsShown.add(legs); }
  if (!R[STATE] && !R[STATE + 1]) break;
}
M.onReturn = null;
if (flyChecks < 100) fail('only', flyChecks, 'passes of hornets and the flyer were checked');
if (!burnChecks) fail('no burnt hornet or flyer was seen');
if (frame6) fail('the cannon took frame 6 on', frame6, 'passes');
for (const b of [0x4F, 0x8F]) if (shown.has(b)) fail('body', h2(b), 'was shown');
for (const l of [24, 48, 87]) if (legsShown.has(l)) fail('legs', l, 'were shown');
for (const t of [0x80EF, 0x8133, 0x8177, 0x81BB]) for (let i = 0; i < 68; i++) {
  const v = ram0[t + i];
  if ((t === 0x80EF || t === 0x8177) ? (v === 0x4F || v === 0x8F) : [24, 48, 87].includes(v)) fail('the table at', h2(t >> 8) + h2(t & 255).slice(1), 'holds', v);
}
// the cannon breaking up: health 6 goes to frame 5 for a pass each step down, then it is gone
{
  const N = start(), Q = N.ram;
  N.runPasses(5);
  if (!Q[0x8242]) fail('no cannon in the first city');
  Q[0x8242] = 6;
  const got = [];
  for (let i = 0; i < 8; i++) { N.runPasses(1); got.push(Q[0x8242] ? Q[0x8240] : 0); }
  const brk = AG_CANNON.find((s) => s[2] === 'breaking up'), gone = AG_CANNON.find((s) => s[2] === 'gone');
  compare('the cannon breaking up', got, Array(brk[1]).fill(brk[0]).concat(Array(8).fill(gone[0])));
  for (const [f] of AG_CANNON) if (f && agCannon(Q, f).some((p) => !p)) fail('cannon frame', f, 'has no picture');
}
// dying: the state counted down from 31
{
  const N = start(), Q = N.ram, m = move('dying');
  N.runPasses(5);
  Q[STATE] = 0x1F;
  const got = [];
  // with the ogre not playing, the game ends when the lizard is gone, and the passes of play stop
  for (let i = 0; i < 34; i++) { const p0 = N.passes; N.runPasses(1, 40); got.push(Q[STATE] && N.passes > p0 ? Q[ACTION] + ':' + Q[FRAME] : 'gone'); }
  compare('dying', got, expand(m.steps).map((f) => m.action + ':' + f).concat(['gone']));
}
// the title: the lizard steps through the 64 frames, one each AG_PASS frames
{
  const N = new Machine({ ram: loadListing(LISTING), pc: 0x8009, port: { dir: 0x2F, data: 0x35 }, passAt: 0x8019, dma: true });
  N.joy = NONE; N.runFrames(60);
  const seen = [];
  for (let i = 0; i < 300; i++) { N.runFrames(1); seen.push(N.ram[FRAME]); }
  const changes = [];
  for (let i = 1; i < seen.length; i++) if (seen[i] !== seen[i - 1]) { changes.push(i); if (seen[i] !== ((seen[i - 1] + 1) & 63)) fail('the title went from frame', seen[i - 1], 'to', seen[i]); }
  // a title pass that overruns its frame (when the credits change) holds one frame 5 and the next 3
  const gaps = changes.slice(1).map((c, i) => c - changes[i]), mean = (changes[changes.length - 1] - changes[0]) / gaps.length;
  if (gaps.some((d) => d < AG_PASS - 1 || d > AG_PASS + 1) || Math.abs(mean - AG_PASS) > 0.1) fail('the title steps its frames every', gaps.join(' '), 'frames');
  const t = move('the title: every frame in turn');
  if (t.steps.length !== 64 || t.steps.some(([f, n], k) => f !== k || n !== 1)) fail('the title move is not the 64 frames in turn');
}

if (bad) { console.log(bad, 'failures'); process.exit(1); }
console.log(`the monsters' moves, the bursts, the hornets and the flyer (${flyChecks} checks, ${burnChecks} burnt), the cannon and the title agree with the game`);
