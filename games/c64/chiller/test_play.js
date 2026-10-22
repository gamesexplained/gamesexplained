#!/usr/bin/env node
// Hold the Play tab's port of the whole game against the game's own code, pass by pass, on a clean
// checkout. The page carries the port's sources whole (port/scripts/build-play.js writes each file
// of port/src into play.html as a script of its own), so the test first finds every one of them in
// the page and stops if a block differs from its file: what runs below is then the page's port.
// For each of the ten levels it then makes a moment of play the way port/scripts/gen-states.js does,
// with nothing from work/: the game from the committed listing on the kit's C64 with what it uses
// of the KERNAL (port/machine.js), from the loader's hand-over, taken to the level as finishing
// each level before it does (port/jump.js), then played a while with a random stick. From there
// port/test/lockstep.js runs the port beside the game with another random stick, comparing all of
// RAM, colour RAM and the registers written to the video chip and the SID at the start of every
// pass, with the sprite collisions the game read handed to the port in turn. Any difference, or
// the two falling out of step, fails the test.
//   node games/c64/chiller/test_play.js [passes per level]
const fs = require('fs'), path = require('path');
const { describe } = require('../../../kit/c64/lockstep.js');
const PORT = path.join(__dirname, 'port');
const page = fs.readFileSync(path.join(__dirname, 'play.html'), 'utf8');
let bad = 0;
for (const f of fs.readdirSync(path.join(PORT, 'src')).filter(f => f.endsWith('.js')).sort()) {
  const m = new RegExp('<script>\\n/\\* port/src/' + f.replace('.', '\\.') + ' \\*/\\n([\\s\\S]*?)</script>').exec(page);
  const want = fs.readFileSync(path.join(PORT, 'src', f), 'utf8').replace(/<\/script/gi, '<\\/script');
  if (!m) { bad++; console.log(`FAIL play.html carries no port/src/${f}`); }
  else if (m[1] !== want) { bad++; console.log(`FAIL play.html's port/src/${f} differs from the file: run port/scripts/build-play.js`); }
}
if (bad) process.exit(1);

const { boot } = require(path.join(PORT, 'machine.js'));
const { toLevel } = require(path.join(PORT, 'jump.js'));
const { run } = require(path.join(PORT, 'test/lockstep.js'));
const PASSES = +process.argv[2] || 3000;
let seed = 7;
const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
const DIRS = [0, 1, 2, 4, 8, 16, 5, 9, 6, 10, 17, 20, 24, 4, 8, 4, 8];
let total = 0;
for (let n = 0; n < 10; n++) {
  const m = boot();
  m.runUntilPass(() => true);
  toLevel(m, n);
  for (let i = 0; i < 4; i++) {                    // a while on the level, as gen-states.js plays it
    m.joy = 0x1F & ~DIRS[Math.floor(rnd() * DIRS.length)];
    const f0 = m.frames, hold = 10 + Math.floor(rnd() * 60);
    m.runUntilPass(mm => mm.frames >= f0 + hold, 2000);
  }
  const out = run({ state: m.save(), passes: PASSES, seed: n + 1 });
  const d = describe(out.res).split('\n');
  total += out.res.passes;
  if (!out.res.ok) bad++;
  console.log(`level ${n + 1}: ` + (out.res.ok ? d[d.length - 1] : 'FAIL ' + d.slice(0, 3).join(' / ')) +
              (out.stuck ? ' (then the game over, waiting for fire)' : ''));
}
console.log(`${total} passes on ten levels, ${bad ? bad + ' out of step' : 'every one identical'}`);
process.exit(bad ? 1 : 0);
