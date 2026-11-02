#!/usr/bin/env node
// Hold the How it works page's music and effects players against the game's own code. index.html's
// tt-music block (createDriver) runs the game's sound code on the site's 6502 over
// TT_DRIVER_RANGES, for each button of the music player (TT_TUNES) and of the effects player
// (TT_EFFECTS). Here the game's own path runs on the kit's simulator over the whole listing, with
// the pause flag $AF at $FF as the start-up's dec at $0E91 leaves it, and the volume set to 15 by
// the start-up's own lda #$0F / sta $D418 ($0EA4-$0EA8), run first for every button: for an era's tune,
// era_record_ptr ($3B92) for an era that plays it, then era_enter's start of the tune and its tempo
// from the record ($38B2-$38BF); for the flute's two tunes, play_state's own starts ($350E-$3516
// and $3535-$353D); for an effect, sfx_start ($BB32) with the effect in X, as its seventeen callers
// make it. Then music_play ($BCEE) or sfx_play ($BB51) once a frame. Both sides must write the same
// values to the same registers of the sound chip in the same order, frame by frame, for 3,000
// frames a button; an effect's button must stop on the frame its script position ($7A) returns to
// 0; and every button must open a voice's gate. It also checks that some caller in the game starts
// each effect, as the effects player's names say. It exits 1 on any difference.
//   node games/c64/time-tunnel/test_music.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createDriver, TT_TUNES, TT_EFFECTS, TT_DRIVER_RANGES } = g.run('index.html', 'tt-music', 'createDriver', 'TT_TUNES', 'TT_EFFECTS', 'TT_DRIVER_RANGES');
const vm = require('vm');
const isolated = vm.runInNewContext('(' + createDriver + ')', {});
const L = g.listing();
const FRAMES = 3000;
let bad = 0, frames = 0;
const ends = [];
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const mem = TT_DRIVER_RANGES.map(([a, b]) => [a, Array.from(L.ram.subarray(a, b + 1))]);
const run = (cpu, from, to) => { cpu.pc = from; cpu.run({ until: to, maxSteps: 100000 }); };
// the era whose record starts each tune (era_enter), and the flute's starts in play_state
const ERA_OF = { 0: 8, 1: 2, 2: 4, 3: 1, 4: 7, 5: 5, 7: 6 };
// which effects the game starts: each caller loads X with the effect just before jsr or jmp sfx_start
const started = new Set();
for (let a = 0x0900; a < 0xBB11; a++) {
  const r = L.ram;
  if ((r[a] === 0x20 || r[a] === 0x4C) && r[a + 1] === 0x32 && r[a + 2] === 0xBB) {
    for (let k = a - 2; k > a - 12; k--) if (r[k] === 0xA2) { started.add(r[k + 1]); break; }
  }
}
for (let e = 0; e < TT_EFFECTS.length; e++) if (!started.has(e)) fail('effect', e, 'is never started');
if (started.size !== TT_EFFECTS.length) fail('the game starts effects', [...started].join(), 'and the player has', TT_EFFECTS.length);
[['tunes', TT_TUNES], ['effects', TT_EFFECTS]].forEach(([set, list]) => list.forEach((c, t) => {
  const m = L.ram.slice(), frame = { w: [] };
  m[0xAF] = 0xFF;
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) frame.w.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: 0x35, io });
  const drv = isolated({ mem, list }, kit);
  run(cpu, 0x0EA4, 0x0EA9);
  if (c.sfx !== undefined) cpu.call(0xBB32, { x: c.sfx }, { maxSteps: 100000 });
  else if (c.tune === 6) run(cpu, 0x3535, 0x353E);
  else { m[0x2A] = ERA_OF[c.tune]; cpu.call(0x3B92, {}, { maxSteps: 1000 }); run(cpu, 0x38B2, 0x38C0); }
  if (c.tune === 6 || c.tune === 2) {   // play_state's start of tune 2, the flute put down, as well
    const m2 = L.ram.slice(), cpu2 = new CPU(m2, { port: 0x35, io: { read: io.read, write() {} } });
    run(cpu2, 0x350E, 0x3517);
    if (c.tune === 2 && (m2[0x9C] !== m[0x9C] || m2[0xA0] !== m[0xA0])) fail(set, c.name, 'play_state starts tune 2 otherwise');
  }
  drv.init(t);
  if (frame.w.join() !== drv.writes.join()) fail(set, c.name, 'start', frame.w.join(), '|', drv.writes.join());
  if (c.mask !== undefined && m[0xA0] !== c.mask) fail(set, c.name, 'the game set the tempo mask', m[0xA0]);
  let done = -1, sounded = false;
  for (let f = 0; f < FRAMES && done < 0; f++) {
    frame.w = [];
    cpu.call(c.sfx !== undefined ? 0xBB51 : 0xBCEE, {}, { maxSteps: 100000 });
    drv.play();
    if (frame.w.join() !== drv.writes.join()) fail(set, c.name, 'frame ' + f, frame.w.join(), '|', drv.writes.join());
    for (let i = 0; i < frame.w.length; i += 2) if ([4, 11, 18].includes(frame.w[i]) && (frame.w[i + 1] & 1)) sounded = true;
    if (c.sfx !== undefined && !m[0x7A]) done = f;
    if ((done >= 0) === drv.playing()) fail(set, c.name, 'frame ' + f, 'game', done >= 0 ? 'done' : 'playing', 'page', drv.playing() ? 'playing' : 'stopped');
    frames++;
  }
  if (!sounded) fail(set, c.name, 'never opened a voice\'s gate');
  if (!(drv.sid[24] & 15)) fail(set, c.name, 'the chip\'s volume is 0, so it is silent');
  ends.push(c.name + ' ' + (done < 0 ? 'plays on' : done + 1 + ' frames'));
}));
console.log(`${TT_TUNES.length + TT_EFFECTS.length} buttons, ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + ends.join(', ')));
process.exit(bad ? 1 : 0);
