#!/usr/bin/env python3
"""Hold the page's two ports against the game's own code.

music.html plays the music and effects through a port of the sound driver
($0E23), and index.html and levels.html draw the Dreadnoughts with a port of
build_message ($2415), index_pieces ($2C66) and build_map ($2CB2). A port is a
claim about the game, so this runs both sides and compares them:

  the game   the routines in the kit's 6502 simulator (kit/c64/cpu6502.js), on
             the bytes in the committed listing.json
  the pages  createDriver and buildMap cut from the pages, run by node

Sound: the title tune from its start past its end, every one of the 46
effects on each voice with and without the force bit, and 300 runs of random
requests; every SID write, the driver's zero page and its data compared call
by call. Then every effect button on the music page is rendered through the
site's SID model and must make a sound. Maps: all fifteen Dreadnoughts and
the title message, the map, the piece index and the generator ports compared
byte for byte, and the piece placements the port records for the page must
rebuild each map exactly.

Everything it needs is committed: no game image, no snapshot, no emulator.
It needs node; with KIT_REQUIRE_TOOLS set it fails without it.

  python3 games/c64/uridium/test_ports.py
"""
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = HERE
while not os.path.isfile(os.path.join(ROOT, "kit", "c64", "cpu6502.js")):
    parent = os.path.dirname(ROOT)
    if parent == ROOT:
        sys.exit("test_ports.py must run from inside the repository")
    ROOT = parent
# music.html carries the driver; index.html and levels.html each carry a copy of the map builder
PAGES = ["music.html"] + [p for p in ("index.html", "levels.html") if os.path.isfile(os.path.join(HERE, p))]

JS = r"""'use strict';
// Written out and run by test_ports.py; see there.
const fs = require('fs'), path = require('path');
const GAME = process.argv[2], ROOT = process.argv[3], PAGES = process.argv.slice(4);
globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(GAME, url), 'utf8')) });
require(path.join(ROOT, 'site/lib/c64.js')); require(path.join(ROOT, 'site/lib/sid.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
function grab(src, name, end) {
  const a = src.indexOf('function ' + name), b = src.indexOf(end);
  if (a < 0 || b < a) throw new Error(name + ' not found');
  return src.slice(a, b);
}
const texts = PAGES.map(p => fs.readFileSync(path.join(GAME, p), 'utf8'));
const mapSrc = texts.slice(1).map(t => grab(t, 'buildMap(', '// end of buildMap'));
if (mapSrc.some(t => t !== mapSrc[0])) { console.log('the pages carry different copies of buildMap'); process.exit(1); }
const createDriver = new Function(grab(texts[0], 'createDriver(D)', '// end of createDriver') + '\nreturn createDriver;')();
const buildMap = new Function(mapSrc[0] + '\nreturn buildMap;')();
(async () => {
  const ram = (await C64.load('listing.json')).ram;
  const MEM = Array.from(ram.slice(0x3900, 0x3F00));
  let fail = 0, calls = 0, nw = 0;
  function machine() {
    let w = [];
    const io = { write(ad, v) { if (ad >= 0xD400 && ad <= 0xD418) w.push(ad - 0xD400, v); else throw new Error('write ' + ad.toString(16)); },
                 read(ad) { throw new Error('read ' + ad.toString(16)); } };
    const m = Uint8Array.from(ram);
    for (let r = 0x90; r <= 0xFF; r++) m[r] = 0;
    m[0x0F5F] = 0x80;
    const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x25 }, io });
    return { cpu, call() { w = []; cpu.call(0x0E23); return w; } };
  }
  const ZP = []; for (let r = 0x90; r <= 0xFE; r++) if (r !== 0x94) ZP.push(r);
  function compare(what, M, d) {
    const w0 = M.call(); d.play(); const w1 = d.writes.slice();
    calls++; nw += w0.length / 2;
    if (w0.join() !== w1.join()) { if (fail++ < 5) console.log('DIFFERS', what, '\n game', w0.join(), '\n port', w1.join()); return false; }
    for (const r of ZP) if (M.cpu.m[r] !== d.z[r]) { if (fail++ < 5) console.log('DIFFERS', what, 'zp $' + r.toString(16), M.cpu.m[r], d.z[r]); return false; }
    for (let k = 0; k < MEM.length; k++) if (M.cpu.m[0x3900 + k] !== d.mem[k]) { if (fail++ < 5) console.log('DIFFERS', what, 'mem $' + (0x3900 + k).toString(16)); return false; }
    if (M.cpu.m[0x0F5F] !== d.op0F5F) { if (fail++ < 5) console.log('DIFFERS', what, '$0F5F'); return false; }
    return true;
  }
  { // the title tune from $11 to the end of the song and past it
    const M = machine(), d = createDriver({ kind: 'tune', mem: MEM });
    d.init(0); M.cpu.m[0x90] = 0x11; M.cpu.m[0x95] = 5;
    let k = 0;
    for (; k < 6000; k++) { if (!compare('tune call ' + k, M, d)) break; }
    console.log('tune: song row', d.rd(0x3E99), 'state', d.rd(0x3E9A).toString(16), 'after', k, 'calls');
  }
  for (let n = 1; n <= 46; n++) for (let v = 0; v < 3; v++) for (const f of [0, 0x80]) {
    const M = machine(), d = createDriver({ kind: 'fx', mem: MEM, requests: [[]] });
    d.init(0); M.cpu.m[0x90] = 0x12; M.cpu.m[0x95] = 5;
    compare('setup', M, d);
    M.cpu.m[0x91 + v] = d.z[0x91 + v] = n | f;
    for (let k = 0; k < 600; k++) {
      if (!compare(`effect ${(n | f).toString(16)} voice ${v} call ${k}`, M, d)) break;
      if (!M.cpu.m[0xC6] && !M.cpu.m[0xD5] && !M.cpu.m[0xE4] && !M.cpu.m[0x91] && !M.cpu.m[0x92] && !M.cpu.m[0x93]) break;
    }
  }
  let seed = 20261010;
  const rnd = n => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
  for (let run = 0; run < 300; run++) {
    const M = machine(), d = createDriver({ kind: 'fx', mem: MEM, requests: [[]] });
    d.init(0); M.cpu.m[0x90] = 0x12; M.cpu.m[0x95] = 5; compare('setup', M, d);
    for (let k = 0; k < 150; k++) {
      for (let v = 0; v < 3; v++) if (rnd(8) === 0) { const n = (1 + rnd(46)) | (rnd(3) === 0 ? 0x80 : 0); M.cpu.m[0x91 + v] = d.z[0x91 + v] = n; }
      if (!compare(`random ${run} call ${k}`, M, d)) break;
    }
  }
  console.log(`sound: ${calls} calls compared, ${nw} SID writes; ${fail ? fail + ' FAILED' : 'all match'}`);
  const ram2 = ram;
  let mfail = 0;
  for (let lv = 0; lv < 16; lv++) {
    const m = Uint8Array.from(ram2);
    const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io: { write() { throw new Error('io'); }, read() { throw new Error('io'); } } });
    cpu.call(0x2415);                                  // build_message
    cpu.m[0x26] = lv;
    cpu.call(0x2C66); cpu.call(0x2CB2);
    const r = buildMap(ram2, lv);
    let diff = 0, first = -1;
    for (let a = 0x8000; a < 0xA400; a++) if (cpu.m[a] !== r.m[a]) { diff++; if (first < 0) first = a; }
    for (let a = 0x0200; a < 0x0250; a++) if (cpu.m[a] !== r.m[a]) { diff++; if (first < 0) first = a; }
    for (let a = 0xA400; a < 0xA600; a++) if (cpu.m[a] !== r.m[a]) { diff++; if (first < 0) first = a; }
    if (cpu.m[0x54] !== r.m[0x54]) diff++;
    if (diff) { mfail++; console.log('level', lv, diff, 'bytes differ, first $' + first.toString(16)); }
    else console.log('level', lv, 'matches, ports', r.m[0x54] + 1 & 255);
  }
  // every effect button of the page, rendered through the site's SID model, must make a sound
  const FXT = texts[0].slice(texts[0].indexOf('const FX = ') + 11);
  const FX = new Function('return ' + FXT.slice(0, FXT.indexOf('];') + 1))();
  const E = C64Sid.engine(); let silent = 0;
  FX.forEach(([name], k) => {
    const d = createDriver({ kind: 'fx', mem: MEM, requests: FX.map(f => f[1]), length: 250 });
    const P = E.createPlayer(d, 48000); P.command({ cmd: 'start', tune: k });
    const out = new Float32Array(48000 * 5); P.render(out, out.length, 0);
    let e = 0; for (const v of out) e += v * v;
    if (Math.sqrt(e / out.length) < 1e-3) { silent++; console.log('SILENT effect button', name); }
  });
  console.log(`effect buttons: ${FX.length - silent} of ${FX.length} sound`);
  // the piece placements the map builder records rebuild each map exactly
  let ufail = 0;
  for (let lv = 0; lv < 16; lv++) {
    const R = buildMap(ram2, lv), m = R.m, g = new Uint8Array(17 * 512).fill(0x20);
    for (const u of R.uses) {
      const src = m[0xA400 + u.n] | m[0xA500 + u.n] << 8; let y = 1;
      for (let c = 0; c < m[src]; c++) {
        const col = u.col + c, k = m[src + y] & 31; y++;
        for (let r = 0; r < k; r++) { const v = m[src + y]; y++; const row = u.row - r; if (row >= 0 && col < 512 && (!u.over || v !== 0x20)) g[row * 512 + col] = v; }
        if (!u.over && col < 512) for (let row = u.row - k; row >= 0; row--) g[row * 512 + col] = 0x20;
      }
    }
    let d = 0; for (let r = 0; r < 17; r++) for (let c = 0; c < 512; c++) if (g[r * 512 + c] !== m[0x8200 + r * 0x200 + c]) d++;
    if (d) { ufail++; console.log('level', lv, 'placements leave', d, 'cells different'); }
  }
  console.log(`piece placements: ${16 - ufail} of 16 maps rebuilt exactly`);
  process.exit(fail || mfail || silent || ufail ? 1 : 0);
})().catch(e => { console.log(e.stack || e); process.exit(1); });
"""


def main():
    node = shutil.which("node")
    if not node:
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            sys.exit("FAIL - node is required (KIT_REQUIRE_TOOLS is set)")
        print("SKIP - node is not installed")
        return 0
    with tempfile.TemporaryDirectory() as d:
        script = os.path.join(d, "ports.js")
        with open(script, "w") as f:
            f.write(JS)
        r = subprocess.run([node, script, HERE, ROOT] + PAGES)
    print("OK - both ports match the game" if r.returncode == 0 else "FAILED")
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
