'use strict';
// Holds the chart drawer the Maps page and How it works share (sr-chart) against the engine's own
// routines, run in the kit's 6502 simulator on the committed listings: the orbits placed for every
// day, the 11 by 9 window round every sector and beyond the edges, and draw_chart's pixels, for
// every map file, the maps in the three play snapshots and random maps. Then the How it works
// frame of Navigation: the window the page draws over it must be the frame's, tile for tile.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { CPU } = require(path.resolve(__dirname, '../../../kit/c64/cpu6502.js'));
const g = game(__dirname);
const C = g.run('levels.html', 'sr-chart', 'SRChart').SRChart;
g.sameBlock('sr-chart');   // every page's copy is the one tested
const page = g.read('levels.html');
const maps = JSON.parse(page.match(/<script type="application\/json" id="sr-maps">([^<]*)<\/script>/)[1]);
const E = g.listing('parts/engine/listing.json');
const TIL = { nav: g.listing('parts/nav/listing.json'), station: g.listing('parts/station/listing.json'), hive: g.listing('parts/hive/listing.json') };
const small = Array.from(E.ram.subarray(0x2E11, 0x2E31)), large = Array.from(E.ram.subarray(0x2E31, 0x2E71));
let bad = 0, cases = 0;
const fail = (...w) => { if (bad++ < 12) console.log('DIFFERS', ...w); };
let seed = 20261015;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
// The map files as the game loads them, the maps in the three play snapshots (the ship, the
// people and the Manchi placed), and maps whose entries are random: every flag, picture and place.
const CASES = Object.entries(maps).map(([name, b64]) => [name, Buffer.from(b64, 'base64')]);
for (const [kind, k] of [['nav', 'Q'], ['station', 'L'], ['hive', 'H']]) {
  CASES.push([k + ' in play', TIL[kind].ram.slice(0x5100, 0x5700)]);
  for (let n = 0; n < 6; n++) {
    const f = TIL[kind].ram.slice(0x5100, 0x5700);
    for (let e = 0; e < 32; e++) {
      f[0x410 + e] = (rnd() % 40 - 4) & 255; f[0x430 + e] = (rnd() % 40 - 4) & 255;
      f[0x450 + e] = rnd() & 255; f[0x470 + e] = rnd() & (n < 3 ? 127 : 255);
    }
    if (kind === 'nav') { f[0x510] = rnd() & 255; f[0x511] = rnd() & 255; }
    if (n < 2) { f[0x410] = 10; f[0x450] = 0x6B + n; f[0x470] = 0x6C + n; }   // entry 0 on an orbit: the routine leaves it
    CASES.push([k + ' random ' + n, f]);
  }
}
for (const [name, file] of CASES) {
  const kind = name[0] === 'Q' ? 'nav' : name[0] === 'L' ? 'station' : 'hive';
  const off = { nav: 5, station: 0x2C, hive: 0x39 }[kind];
  const base = new Uint8Array(E.ram);
  base.set(TIL[kind].ram.subarray(0x4000, 0x5100), 0x4000);
  base.set(file, 0x5100);
  const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
  const days = kind === 'nav' ? [...Array(256).keys()] : [0];
  for (const day of days) {
    const m = new Uint8Array(base), cpu = new CPU(m, { port: { dir: 0x2F, data: 0x34 }, io, strict: true });
    if (kind === 'nav') {
      m[0x0724] = day;
      cpu.call(0x2D60, {});
      const p = new Uint8Array(base);
      C.orbits(a => p[a], (a, v) => { p[a] = v; }, day, small, large);
      for (let a = 0x5510; a < 0x5590; a++) if (p[a] !== m[a]) { fail(name, 'day', day, 'orbit byte $' + a.toString(16), 'game', m[a], 'port', p[a]); break; }
      cases++;
    }
    if (day % 37) continue;
    const mem = a => m[a];
    for (let Y = -2; Y <= 33; Y++)
      for (let X = -2; X <= 33; X++) {
        const pass = rnd() & 255;
        m[0x5E] = pass;
        cpu.call(0x3069, { a: off, x: X & 255, y: Y & 255 });
        cpu.call(0x2F9C, { x: X & 255, y: Y & 255 });
        cpu.call(0x8638, {});
        const w = C.window(mem, X & 255, Y & 255, off, pass);
        for (let i = 0; i < 99; i++) if (w[i] !== m[0xFA00 + i]) { fail(name, 'day', day, 'window', X, Y, 'pass', pass, 'cell', i, 'game', m[0xFA00 + i], 'port', w[i]); break; }
        cases++;
      }
    // draw_chart, once per map and day: the bitmap it writes, decoded, against the port's pixels
    m[0x0D2F] = 0; m[0x0D30] = 3; m[0x0D31] = 183; m[0x0D32] = 0;
    const pass = 2; m[0x5E] = pass;
    cpu.call(0x3069, { a: off, x: 16, y: 16 }); cpu.call(0x2F9C, { x: 16, y: 16 }); cpu.call(0x8638, {});
    const w = Array.from(m.subarray(0xFA00, 0xFA63));
    cpu.call(0x8658, {});
    const ra = y => m[0xEB00 + y] | m[0xEC00 + y] << 8, div8 = y => m[0xECC8 + y], sr = c => m[0xEBC8 + c] | m[0xEBE1 + c] << 8;
    for (let k = 0; k < 9; k++) for (let c = 0; c < 11; c++) {
      const t = w[k * 11 + c], px = C.pixels(mem, t, 1, 0);
      let ok = true;
      for (let r = 0; r < 16 && ok; r++) {
        const y = 183 - 16 * k - r, row = ra(y) + 8 * 3 + 16 * c, cell = sr(div8(y)) + 3 + 2 * c;
        for (let h = 0; h < 2; h++) {
          const v = m[row + 8 * h], col = m[cell + h];
          for (let p = 0; p < 4; p++) {
            const bits = (v >> (6 - 2 * p)) & 3, want = [0, col >> 4, col & 15, 1][bits];
            if (px[r * 16 + h * 8 + 2 * p] !== want) { ok = false; fail(name, 'draw_chart cell', c, k, 'row', r); break; }
          }
        }
      }
      cases++;
    }
  }
}

// How it works, "Redraw the chart from the map": the Navigation frame recorded in VICE, drawn by the
// site's renderer, against the window the page draws from the navigation listing's map, at the
// place and pass the page names (WIN)
{
  const index = g.read('index.html');
  const F = JSON.parse(index.match(/<script type="application\/json" id="sr-frames">([^<]*)<\/script>/)[1]).nav;
  const WIN = Function('return ' + index.match(/const WIN = (\{[^}]*\})/)[1])();
  g.lib('c64');
  const C64 = globalThis.C64;
  const frame = C64.renderFrame(F), N = TIL.nav.ram, mem = a => N[a];
  const w = C.window(mem, N[0x5510], N[0x5530], 5, WIN.pass);
  const ox = 32 + 8 * WIN.col, oy = 35 + WIN.line;
  let same = 0;
  for (let k = 0; k < 9; k++)
    for (let c = 0; c < 11; c++) {
      const px = C.pixels(mem, w[k * 11 + c], 1, 0);
      let ok = true;
      for (let i = 0; i < 256 && ok; i++) ok = frame.px[(oy + 16 * k + (i >> 4)) * frame.w + ox + 16 * c + (i & 15)] === px[i];
      same += ok;
    }
  if (same !== 99) fail('the Navigation frame: ' + same + ' of 99 tiles match the page\'s window');
  cases++;
}
console.log('test_chart: ' + cases + ' cases, ' + (bad ? bad + ' differ' : 'all match'));
process.exit(bad ? 1 : 0);
