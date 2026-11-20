#!/usr/bin/env node
// Hold the Controls page's claims to the game's own code. controls.html's gx-keys block runs
// keys_scan ($87D7), the stick reads ($8782-$87AE) and magic_keys ($BA67) on the kit's 6502 over
// the listing, with CIA 1 wired as the C64 wires it. This runs the page's block on each case the
// page's copy states and checks the sticks and the potions the game's code arrives at; and it runs
// the same routines on the simulator directly, over a fresh copy of the listing, to check that the
// page's block is the game's code and not a model of it. Everything it needs is committed.
//   node games/c64/gauntlet/test_keys.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'controls.html';
g.lib('cpu6502');
const { makeKeys } = g.run(page, 'gx-keys', 'makeKeys');
const base = g.listing().ram.slice();
const K = makeKeys(base);
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
const SPACE = [7, 4], KEY1 = [7, 0], ARROW = [7, 1], CTRL = [7, 2], KEY2 = [7, 3], F1 = [0, 4], F3 = [0, 5], F7 = [0, 3];
let bad = 0, n = 0;
function expect(name, held, want) {
  n++;
  const r = K.read({ joy1: held.joy1 || 0, joy2: held.joy2 || 0, keys: held.keys || [] });
  const got = { stick1: r.stick1, stick2: r.stick2, magic: r.magic.join(',') };
  for (const k of Object.keys(want)) if (got[k] !== want[k]) { bad++; console.log('DIFFERS', name, k, 'page', got[k], 'want', want[k]); }
  // the same routines, on the simulator directly
  const m = base.slice();
  let pa = 0xFF;
  const io = {
    read(a) {
      if (a === 0xDC00) return pa & ~(held.joy2 || 0) & 0xFF;
      if (a === 0xDC01) {
        let pb = 0xFF & ~(held.joy1 || 0);
        const rows = ~(pa & ~(held.joy2 || 0)) & 0xFF;
        for (const [rw, c] of held.keys || []) if (rows & (1 << rw)) pb &= ~(1 << c);
        return pb;
      }
      throw new Error('read $' + a.toString(16));
    },
    write(a, v) { if (a === 0xDC00) pa = v; else if (a !== 0xDC02 && a !== 0xDC03) throw new Error('write $' + a.toString(16)); },
  };
  m[0x9120] = 1; m[0x9121] = 1; m[0xB665] = 1; m[0xB666] = 1; m[0xBACD] = 0; m[0xBA66] = 0; m[0xB66B] = 0; m[0xB66C] = 0;
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io, strict: true });
  cpu.call(0x8782, {}, { hooks: { 0x87B1: () => true } });
  const used = [];
  cpu.call(0xBA67, {}, { hooks: { 0xBAA5: (c) => { used.push(c.x); c.rts(); } } });
  if (m[0x8EB0] !== r.stick1 || m[0x8EB1] !== r.stick2 || used.join(',') !== got.magic) {
    bad++; console.log('DIFFERS', name, 'from the code run directly');
  }
}
const ALL = 0x1F;
expect('nothing held', {}, { stick1: ALL, stick2: ALL, magic: '' });
expect('SPACE: player one fires and uses a potion', { keys: [SPACE] }, { stick1: ALL & ~FIRE, magic: '0' });
expect('fire on joystick 1: no potion', { joy1: FIRE }, { stick1: ALL & ~FIRE, magic: '' });
expect('fire held and SPACE: no potion', { joy1: FIRE, keys: [SPACE] }, { stick1: ALL & ~FIRE, magic: '' });
expect('1 is up', { keys: [KEY1] }, { stick1: ALL & ~UP });
expect('left arrow is down', { keys: [ARROW] }, { stick1: ALL & ~DOWN });
expect('CTRL is left', { keys: [CTRL] }, { stick1: ALL & ~LEFT });
expect('2 is right', { keys: [KEY2] }, { stick1: ALL & ~RIGHT });
for (const [nm, k] of [['F1', F1], ['F3', F3], ['F7', F7], ['F5', [0, 6]]])
  expect(nm + ': player two uses a potion', { keys: [k] }, { stick1: ALL, magic: '1' });
expect('F3 while player one holds fire: no potion', { joy1: FIRE, keys: [F3] }, { magic: '' });
expect('F3 while player one pushes right: no potion', { joy1: RIGHT, keys: [F3] }, { magic: '' });
expect('joystick 1 right alone is not F7', { joy1: RIGHT }, { stick1: ALL & ~RIGHT, magic: '' });
expect('joystick 2 reaches only stick_p2', { joy2: UP | FIRE }, { stick1: ALL, stick2: ALL & ~(UP | FIRE), magic: '' });
expect('no key reaches stick_p2', { keys: [SPACE, KEY1, F1] }, { stick2: ALL });
console.log(`${n} cases, ${bad ? bad + ' differ' : 'every one as the page says'}`);
process.exit(bad ? 1 : 0);
