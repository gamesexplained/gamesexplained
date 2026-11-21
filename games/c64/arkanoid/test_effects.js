#!/usr/bin/env node
// Hold music.html's sound-effect player (the block ak-effects) to the game's code in listing.json.
// The page runs the game's own driver on the kit's 6502: sound_reset $2690, sound_effect_start
// $272F once per voice with that voice's patch, then the seven tick routines until sound_busy
// $3417 sets Z. What the page chooses, and this test checks against the game's code:
// - The patches. Every place the game starts an effect loads X = voice, A/Y = patch and then
//   JSRs or JMPs to $272F (LDX #v / LDA #lo / LDY #hi). The page's twelve effects must be exactly
//   the voice-0 patches the game uses, and the game's voice 1 and 2 patches must be voice 0's
//   plus 31 and 62, as the page plays them.
// - Each effect ends: sound_busy reports silence within 300 frames.
// - The filter: the caption says $272F turns it off; $D417 is written 0 and never set again by
//   any effect, so no filter is modelled.
// It exits 1 on any difference.
//   node games/c64/arkanoid/test_effects.js
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { createEffects } = g.run('music.html', 'ak-effects', 'createEffects');
const ram = g.listing().ram;
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

const html = g.read('music.html');
const fx = JSON.parse(/fx: (\[[^\]]*\])/.exec(html)[1].replace(/0x([0-9A-F]+)/g, (m, h) => parseInt(h, 16)));
const ticks = JSON.parse(/ticks: (\[[^\]]*\])/.exec(html)[1]);
check('effects', fx.length, 12);
check('tick counts', ticks.length, 12);

// every LDX #v / LDA #lo / LDY #hi / JSR or JMP $272F in the game
const used = new Map();
for (let a = 0x0400; a < 0xFFF7; a++) {
  if (ram[a] === 0xA2 && ram[a + 2] === 0xA9 && ram[a + 4] === 0xA0 && (ram[a + 6] === 0x20 || ram[a + 6] === 0x4C) &&
      ram[a + 7] === 0x2F && ram[a + 8] === 0x27) {
    const v = ram[a + 1], p = ram[a + 3] | ram[a + 5] << 8;
    if (!used.has(v)) used.set(v, new Set());
    used.get(v).add(p);
  }
}
const v0 = [...used.get(0)].sort((x, y) => x - y);
check("the game's voice-0 patches", v0.join(), [...fx].sort((x, y) => x - y).join());
for (const v of [1, 2]) check('voice ' + v + ' patches are voice 0 + ' + 31 * v, [...used.get(v)].sort((x, y) => x - y).join(),
  v0.map((p) => p + 31 * v).join());

const M = { bytes: ram.slice(0, 0x4000), fx, ticks };
fx.forEach((p, n) => {
  const E = createEffects(M, C64Cpu);
  E.init(n);
  let f = 0, filter = 0;
  while (E.playing() && f < 300) {
    E.play(); f++;
    for (let i = 0; i < E.writes.length; i += 2) if (E.writes[i] === 0x17 && (E.writes[i + 1] & 7)) filter++;
  }
  check('effect ' + n + ' ($' + p.toString(16).toUpperCase() + ') ends', E.playing(), false);
  check('effect ' + n + ' routes no voice to the filter', filter, 0);
  check('effect ' + n + ' leaves $D417 at 0', E.sid[0x17] & 7, 0);
});

console.log(bad ? bad + ' difference(s)' : "arkanoid effects: the page's twelve effects are the game's own patches, and each ends with the filter off");
process.exit(bad ? 1 : 0);
