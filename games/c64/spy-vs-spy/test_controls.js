#!/usr/bin/env node
// Hold the Controls tab's port of read_controls ($94A1) against the game's own routine on the
// kit's 6502 simulator, over the bytes of the committed listing. The test models CIA 1 itself:
// port A ($DC00) selects keyboard rows and reads joystick port 2, port B ($DC01) reads the
// selected rows' columns and joystick port 1, both active low. Every combination of the two
// sticks with no key held, every key of the matrix alone and with each stick, then 30,000 random
// mixes of keys, sticks, demo flag and held-S latch: the bytes both write ($0285, $0286, $0282,
// $0284, $0263, the music variables S resets, and $DC00 as left) must agree. Then the claims the
// page makes, each as a case. Everything it needs is committed: no disk image, no snapshot, no
// emulator. It exits 1 on any difference.
//   node games/c64/spy-vs-spy/test_controls.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const portCheck = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = portCheck.game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'controls.html';
const { svsReadControls } = g.run(page, 'svs-controls', 'svsReadControls');

const image = g.listing().ram;
const m = image.slice();
let held = { keys: [], joy1: 0, joy2: 0 }, portA = 0x7F;
const io = {
  read(a) {
    if (a === 0xDC00) return portA & ~held.joy2 & 0xFF;
    if (a === 0xDC01) {
      let v = 0xFF;
      for (const [r, c] of held.keys) if (!(portA >> r & 1)) v &= ~(1 << c);
      return v & ~held.joy1 & 0xFF;
    }
    throw new Error('read $' + a.toString(16));
  },
  write(a, v) { if (a === 0xDC00) portA = v; else throw new Error('write $' + a.toString(16)); },
};
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
const MUSIC = [0x0264, 0x0265, 0x0266, 0x0267, 0x0268, 0x0269, 0x026C, 0x026D, 0x027E, 0x027F, 0x0280, 0x0281];

let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
// one call of each, from the same state; returns what the port gave
function both(input, st) {
  held = input; portA = st.portA;
  m[0xCFF7] = st.demo; m[0x0284] = st.latch; m[0x0263] = st.music;
  for (const a of MUSIC) m[a] = 0xAA;
  const s = Object.assign({}, st);
  cpu.call(0x94A1, {});
  const r = svsReadControls(s, input);
  cases++;
  const game = [m[0x0285], m[0x0286], m[0x0282], m[0x0284], m[0x0263], portA];
  const port = [r.white, r.black, r.flags, s.latch, s.music, s.portA];
  const restarted = m[0x0268] === 0x54;                    // $9527: the music's start, written on restart
  if (game.join() !== port.join() || restarted !== r.restart)
    fail(JSON.stringify(input), JSON.stringify(st), 'game', game.join(), restarted, 'port', port.join(), r.restart);
  return r;
}
const states = [];
for (const demo of [0, 0xFF, 0x01]) for (const latch of [0, 1]) for (const music of [0, 1])
  states.push({ portA: 0x7F, demo, latch, music });

for (const st of states) for (let j1 = 0; j1 < 32; j1++) for (let j2 = 0; j2 < 32; j2++)
  both({ keys: [], joy1: j1, joy2: j2 }, st);
for (const st of states) for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
  for (const [j1, j2] of [[0, 0], [1, 0], [16, 0], [0, 16], [31, 31]]) both({ keys: [[r, c]], joy1: j1, joy2: j2 }, st);
let seed = 20261111;
const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
for (let i = 0; i < 30000; i++) {
  const keys = [];
  for (let k = rnd(4); k > 0; k--) keys.push([[0, 1, 7, rnd(8)][rnd(4)], rnd(8)]);
  both({ keys, joy1: rnd(3) ? 0 : rnd(32), joy2: rnd(3) ? 0 : rnd(32) },
       Object.assign({}, states[rnd(states.length)], { portA: rnd(4) ? 0x7F : rnd(256) }));
}

// The page's claims
const PLAY = { portA: 0x7F, demo: 0, latch: 0, music: 0 }, DEMO = { portA: 0x7F, demo: 0xFF, latch: 0, music: 0 };
const claim = (ok, what) => { if (!ok) fail('claim: ' + what); else console.log('ok   ' + what); };
const black = (keys) => both({ keys, joy1: 0, joy2: 0 }, PLAY).black & 0x1F;
claim(black([[7, 0]]) === 0x1E, '1 reads as the black stick pushed up');
claim(black([[7, 1]]) === 0x1D, '← reads as the black stick pulled down');
claim(black([[7, 2]]) === 0x1B, 'CTRL reads as the black stick pushed left');
claim(black([[7, 3]]) === 0x17, '2 reads as the black stick pushed right');
claim(black([[7, 4]]) === 0x0F, 'SPACE reads as the black stick\'s fire');
claim(both({ keys: [], joy1: 0, joy2: 0 }, PLAY).white === 0x7F, 'the white byte reads $7F with nothing held');
claim(both({ keys: [[7, 4]], joy1: 0, joy2: 0 }, DEMO).flags & 0x80, 'SPACE ends the attract demo');
claim(both({ keys: [[1, 5]], joy1: 0, joy2: 0 }, PLAY).restart === false
      && (() => { const s = Object.assign({}, PLAY); svsReadControls(s, { keys: [[1, 5]], joy1: 0, joy2: 0 }); return s.music === 1; })(),
      'S alone turns the music off');
const sWith = (input) => { const s = Object.assign({}, PLAY); svsReadControls(s, input); return s.music; };
claim(sWith({ keys: [[1, 5], [1, 7]], joy1: 0, joy2: 0 }) === 0, 'S with left SHIFT held does nothing');
claim(sWith({ keys: [[1, 5]], joy1: 1, joy2: 0 }) === 0, 'S does nothing while the black stick is pushed');
claim(sWith({ keys: [[1, 5]], joy1: 0, joy2: 1 }) === 1, 'the white stick does not block S');
claim(both({ keys: [[0, 6]], joy1: 0, joy2: 0 }, PLAY).flags === 0x80, 'F5 alone sets bit 7');
claim(both({ keys: [[0, 6]], joy1: 8, joy2: 0 }, PLAY).flags === 0, 'F5 does nothing while the black stick is pushed');
claim(both({ keys: [[7, 7]], joy1: 0, joy2: 0 }, PLAY).flags === 0x40, 'RUN/STOP alone sets bit 6');
claim(both({ keys: [[7, 7], [7, 4]], joy1: 0, joy2: 0 }, PLAY).flags === 0, 'RUN/STOP with SPACE held does nothing');
claim(both({ keys: [[7, 7]], joy1: 0, joy2: 0 }, DEMO).flags === 0, 'RUN/STOP does nothing in the demo');
claim((() => { const s = Object.assign({}, PLAY); const i = { keys: [[1, 5]], joy1: 0, joy2: 0 };
  svsReadControls(s, i); svsReadControls(s, i); svsReadControls(s, i); return s.music === 1; })(),
  'S held for many interrupts toggles the music once');

console.log(`${cases} cases, ${bad ? bad + ' differ' : 'the port and read_controls agree on every one'}`);
process.exit(bad ? 1 : 0);
