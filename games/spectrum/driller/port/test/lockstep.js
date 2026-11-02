'use strict';
// The whole port beside the game, pass by pass (kit/spectrum/lockstep.js): from the hand-over,
// through the security question and the control options into play, or from the moments of play in
// work/states, with the sessions' input (sessions.js's player) given pass by pass. The game runs
// on the 48K machine (lib.js); routines the port has not written are the game's own code
// (standin.js).
//   node lockstep.js [passes] [state name filter, "boot", "scenarios" or a scenario's name] [seed]
const path = require('path');
const lib = require('./lib.js');
const { Lockstep, describe } = require(path.join(lib.ROOT, 'kit/spectrum/lockstep.js'));
const standin = require('./standin.js');
const { loadPort } = require('./port.js');
const { player } = require('./sessions.js');

// The interrupt goes through the jump at $FDFD (install_interrupt) to $BAE6.
// the bytes the interrupt writes and the main program reads in the middle of a stretch: the wait
// counter ($8FC2), the beam state ($8A21), the clock's frame count ($88A3, which drill reads for
// the gas), the frame counter the security question is picked by ($8A1D), the minutes ($889D),
// the game's end ($8BF2), the sensors' beam counts in the interrupt's copy of the list ($8A46,
// six bytes apart), which process_sensors keeps once the beams are still, the minutes again ($889C,
// both of which the scripts test), and the energy and shield ($8875, $8878), which the interrupt
// takes from as the clock runs and the sensors hit, and the scripts, drill and the panel read
const IRQ_BYTES = [0x8FC2, 0x8A21, 0x88A3, 0x8A1D, 0x889C, 0x889D, 0x8BF2, 0x8A46, 0x8A4C, 0x8A52, 0x8A58, 0x8A5E,
  0x8875, 0x8878];
// the game's stack: $FFF8 down, above the interrupt's table at $FE00-$FF00
const STACK = [0xFF01, 0xFFF7];

// The keys for the start, frame by frame: once the security question is on the screen (its cursor
// at $CB6F), its word typed, each letter held 3 frames and let go for 3, then ENTER.
function startInput() {
  let plan = null, i = 0;
  return (f, m) => {
    if (!plan && m.ram[0xCB6F] === 0x23 && m.cpu.pc >= 0xCC7E && m.cpu.pc < 0xCD00) {
      plan = [];
      for (const ch of lib.answer(m.ram)) plan.push([ch], [ch], [ch], [], [], []);
      plan.push(['ENTER'], ['ENTER'], ['ENTER'], [], [], []);
    }
    m.releaseAll();
    if (plan && i < plan.length) for (const k of plan[i++]) m.press(k);
  };
}
// At the control options, which the sessions' player never answers: every key let go, then ENTER
// for six frames, twenty frames after the options begin ($C9C6, on this machine and not the
// lockstep's copy of it).
function optionsInput(m) {
  let at = -1;
  const prev = m.hooks[0xC9C6];
  m.hooks[0xC9C6] = q => { if (q === m) at = m.frames; return prev ? prev(q) : false; };
  return mm => {
    if (at < 0) return false;
    const d = mm.frames - at;
    if (d < 20) { mm.releaseAll(); mm.joy = 0; } else if (d < 26) mm.press('ENTER'); else { mm.releaseAll(); at = -1; }
    return true;
  };
}

// A scenario's input, frame by frame: its steps in turn, each waiting for its moment (pass: the
// lockstep's pass count reached; mark: the game's main program at that mark's address since the
// last step; after: so many frames after the last step), then holding its keys (key names) and the
// Kempston stick's bits (joy) for its frames, or until the game reaches the mark named by until. A
// mark counts from the frame the last step began.
// Once the steps are done, the sessions' player.
function script(m, steps, marks, player) {
  const seen = {};
  for (const [name, a] of Object.entries(marks)) {
    const prev = m.hooks[a];
    // the lockstep's copy of the machine, run on ahead for the interrupt's bytes, has the same
    // hooks: only this machine's visits count
    m.hooks[a] = q => {
      if (q === m) { seen[name] = m.frames; log.push(name + (name === 'gameOver' ? ' ' + m.ram[0x8BF2] : '') + ' at frame ' + m.frames); }
      return prev ? prev(q) : false;
    };
  }
  // from: the frame the last step ended; began: the frame it began, from which a mark counts
  let i = 0, from = m.frames, began = m.frames, hold = 0;
  const log = [];
  return {
    log,
    get at() { return i; },
    done: () => i >= steps.length && !hold,
    frame(f, mm, ls) {
      if (hold) {
        const s = steps[i];
        if (--hold && !(s.until && seen[s.until] >= from)) return;
        mm.releaseAll(); mm.joy = 0; from = mm.frames; hold = 0; i++; return;
      }
      const s = steps[i];
      if (!s) return;
      const ready = s.pass !== undefined ? ls.passes >= s.pass : s.mark ? seen[s.mark] >= began : mm.frames - from >= (s.after || 0);
      if (!ready) return;
      mm.releaseAll(); mm.joy = s.joy || 0;
      for (const k of s.keys || []) mm.press(k);
      hold = s.frames || 1;
      from = began = mm.frames;
    },
  };
}

// The ways out of play the sessions seldom reach, each forced from a moment of play by setting what
// the game keeps (the clock at $88A4-$88AB, the energy at $8875, the shield at $8878), with what
// follows: the game over, the demonstration, a key that ends it, and the control options again,
// each of their choices; then play on the choice made.
const clock = (R, s) => { for (let k = 0; k < 8; k++) R[0x88A4 + k] = s.charCodeAt(k); };
const MARKS = { options: 0xC9C6, gameOver: 0x9AB7, info: 0xC3DC };
const SCENARIOS = {
  // the clock runs out with no key held; the game over; the demonstration, which a key ends after
  // sixty passes; the Sinclair stick chosen
  time: { state: 's0-p0', poke: R => clock(R, '00:00:03'), passes: 120, steps: [
    { pass: 60, keys: ['O'], frames: 40 },
    { mark: 'options' }, { after: 20, keys: ['2'], frames: 4 }, { after: 10, keys: ['ENTER'], frames: 4 }] },
  // the minute takes the last of the energy, walking forward; a key held through the game over's
  // hold, which ends it, so no demonstration; the Kempston stick chosen and played
  energy: { state: 's1-p0050', poke: R => { R[0x8875] = 0; R[0x88AA] = 0x30; R[0x88AB] = 0x32; }, passes: 120, steps: [
    { keys: ['O'], frames: 150 }, { mark: 'gameOver' }, { after: 300, keys: ['K'], frames: 1500, until: 'options' },
    { after: 20, keys: ['3'], frames: 4 }, { after: 10, keys: ['ENTER'], frames: 4 },
    { after: 30, joy: lib.JOY.UP, frames: 60 }, { joy: lib.JOY.LEFT, frames: 40 }, { joy: lib.JOY.FIRE, frames: 10 },
    { joy: lib.JOY.UP | lib.JOY.RIGHT, frames: 60 }] },
  // a sensor's hit with the shield gone, standing still; the cursor keys chosen
  shield: { state: 's1-p0230', poke: R => { R[0x8878] = 0; }, passes: 60, steps: [
    { mark: 'gameOver' }, { after: 300, keys: ['SPACE'], frames: 1500, until: 'options' },
    { after: 20, keys: ['4'], frames: 4 }, { after: 10, keys: ['ENTER'], frames: 4 },
    { after: 30, keys: ['7'], frames: 60 }, { keys: ['5'], frames: 40 }, { keys: ['0'], frames: 10 }] },
  // the information screen, and 1 abandons the game; the keyboard chosen again
  abandon: { state: 's2-p0110', passes: 40, steps: [
    { pass: 2, keys: ['I'], frames: 200, until: 'info' }, { after: 60, keys: ['1'], frames: 6 },
    { mark: 'gameOver' }, { after: 300, keys: ['P'], frames: 1500, until: 'options' },
    { after: 20, keys: ['1'], frames: 4 }, { after: 10, keys: ['ENTER'], frames: 4 }] },
  // the information screen, and another key goes back to play
  info: { state: 's2-p0170', passes: 30, steps: [
    { pass: 2, keys: ['I'], frames: 200, until: 'info' }, { after: 60, keys: ['Q'], frames: 6 }] },
};

function run(o) {
  const DR = loadPort();
  const sc = o.scenario ? SCENARIOS[o.scenario] : null;
  if (sc) o = Object.assign({ state: sc.state + '.json', passes: sc.passes }, ...Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => ({ [k]: v })));
  const boot = !o.state;
  const m = boot ? lib.boot() : lib.restore(lib.readState(o.state));
  if (sc && sc.poke) sc.poke(m.ram);
  const P = DR.makePort(new Uint8Array(65536), {});
  standin.install(P);
  if (o.onPort) o.onPort(P, m);
  const ls = new Lockstep({ machine: m, port: P, program: P => P.program(boot), checkpoints: P.CHECKPOINTS,
    irqs: { 0xFDFD: 'interrupt' }, irqBytes: IRQ_BYTES, chips: ['border', 'ear'], stack: STACK,
    ignore: o.ignore || [], maxFrames: o.maxFrames || 3200, timing: o.timing });
  // the ROM's bytes the game reads, which the port reads at the same addresses
  P.M.set(lib.ROM, lib.EXCERPT.from);
  const input = player(lib.makeRnd(o.seed || 1)), start = startInput(), options = optionsInput(m);
  const steps = sc ? script(m, sc.steps, MARKS) : null;
  let started = !boot;
  const res = ls.run({ passes: o.passes || 200, stopOnDiff: o.stopOnDiff !== false,
    onPass: o.onPass || ((n, mm) => { started = true; if (!steps || steps.done()) input(n, mm); }),
    onFrame: o.onFrame || ((f, mm, l) => {
      if (steps && !steps.done()) steps.frame(f, mm, l);
      else if (!options(mm) && !started) start(f, mm);
    }) });
  return { res, ls, m, P, log: steps ? steps.log : [], steps: steps ? steps.done() : true, stepAt: steps ? steps.at : -1 };
}

if (require.main === module) {
  const passes = +(process.argv[2] || 200), filter = process.argv[3] || 'boot', seed = +(process.argv[4] || 1);
  if (filter === 'scenarios' || SCENARIOS[filter]) {
    let ok = 0;
    const names = SCENARIOS[filter] ? [filter] : Object.keys(SCENARIOS);
    for (const name of names) {
      const t = Date.now();
      let out;
      try { out = run({ scenario: name, seed, passes: +process.argv[2] ? passes : undefined }); } catch (e) { console.log(name + ': ' + (e.stack || e.message).split('\n').slice(0, 8).join('\n  ')); continue; }
      console.log(name + ' (' + (Date.now() - t) + ' ms): ' + describe(out.res).split('\n').join('\n  ') +
        '\n  ' + out.log.join(', ') + '; the choice $8FC5 = ' + out.m.ram[0x8FC5] + (out.steps ? '' : '; NOT every step taken: stopped at step ' + out.stepAt));
      if (out.res.ok && out.steps) ok++;
    }
    console.log(ok + '/' + names.length + ' scenarios in step');
    process.exitCode = ok === names.length ? 0 : 1;
    return;
  }
  // a moment saved in the middle of a pass (a session that stopped at the control options, which
  // the player never answers, or in a pass longer than the sessions' limit) is no place to start
  const list = filter === 'boot' ? [null] : lib.states(filter).filter(f => {
    if (lib.restore(lib.readState(f)).cpu.pc === lib.PASS_AT) return true;
    console.log(f + ': in the middle of a pass, left out');
    return false;
  });
  let ok = 0, n = 0;
  for (const f of list) {
    n++;
    let out;
    const t = Date.now();
    try { out = run({ state: f, passes, seed }); } catch (e) { console.log((f || 'boot') + ': ' + (e.stack || e.message).split('\n').slice(0, 8).join('\n  ')); continue; }
    const used = [...out.P.standInsUsed];
    console.log((f || 'boot') + ' (' + (Date.now() - t) + ' ms, ' + used.length + ' routines stood in' + (used.length ? ': ' + used.join(' ') : '') + '): ' + describe(out.res).split('\n').join('\n  '));
    if (out.res.ok) ok++;
  }
  console.log(ok + '/' + n + ' runs in step');
  process.exitCode = ok === n ? 0 : 1;
}

module.exports = { run, IRQ_BYTES, STACK, startInput, SCENARIOS };
