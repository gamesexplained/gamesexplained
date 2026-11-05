'use strict';
// A bench for one procedure at a time: the game's own p-code (or 6502) run on the kit's simulator
// from a snapshot, and the port's function on a copy of the same memory, with the same arguments,
// then the two memories and the chips compared. Node only; the snapshots stay in work/.
//   const B = require('./bench.js');
//   const b = B.bench('parts/main/work/name-prompt.vsf');
//   const r = b.both(0x4CCC, 'clear_hires_bitmap', []);   // { ok, game, port, diffs }
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const GAME = path.resolve(__dirname, '../..');
const { CPU, readSnapshot } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const SRC = path.resolve(__dirname, '../src');

function loadPort() {
  if (!globalThis.AEPort) {
    globalThis.window = globalThis;
    const files = ['core.js'].concat(fs.readdirSync(SRC).filter(f => f.endsWith('.js') && f !== 'core.js').sort());
    for (const f of files) require(path.join(SRC, f));
  }
  return globalThis.AEPort;
}

// The chips as a test gives them: registers kept as written, the SID's noise from a list both
// sides read in turn, the joystick and raster set by the test.
function chips(o = {}) {
  const c = { vic: new Uint8Array(64), sid: new Uint8Array(32), colour: new Uint8Array(1024),
    cia1: new Uint8Array(16), cia2: new Uint8Array(16), joy: 0x1F, line: 0, noise: o.noise || [], ni: 0, log: [] };
  c.cia1[0x0E] = 0x11; c.cia2[0] = 0xC7; c.cia2[2] = 0x3F;
  c.read = function (a) {
    if (a < 0xD400) {
      const r = a & 0x3F;
      if (r === 0x12) return c.line & 255;
      if (r === 0x11) return (c.vic[0x11] & 0x7F) | ((c.line >> 8) << 7);
      return c.vic[r];
    }
    if (a < 0xD800) {
      const r = a & 0x1F;
      if (r === 0x1B) { const v = c.noise.length ? c.noise[c.ni % c.noise.length] : 0; c.ni++; return v; }
      return c.sid[r];
    }
    if (a < 0xDC00) return c.colour[(a - 0xD800) & 0x3FF] | 0xF0;
    if (a < 0xDD00) { const r = a & 15; return r === 0 ? (0xE0 | c.joy) : c.cia1[r]; }
    if (a < 0xDE00) return c.cia2[a & 15];
    return 0xFF;
  };
  c.write = function (a, v) {
    c.log.push([a, v]);
    if (a < 0xD400) c.vic[a & 0x3F] = v;
    else if (a < 0xD800) c.sid[a & 0x1F] = v;
    else if (a < 0xDC00) c.colour[(a - 0xD800) & 0x3FF] = v & 15;
    else if (a < 0xDD00) c.cia1[a & 15] = v;
    else if (a < 0xDE00) c.cia2[a & 15] = v;
  };
  c.copy = function () {
    const d = chips({ noise: c.noise });
    d.vic.set(c.vic); d.sid.set(c.sid); d.colour.set(c.colour); d.cia1.set(c.cia1); d.cia2.set(c.cia2);
    d.joy = c.joy; d.line = c.line; d.ni = c.ni;
    return d;
  };
  return c;
}

function charRom() {
  const f = path.join(ROOT, 'tools/vice-mcp/share/vice/C64/chargen-901225-01.bin');
  return fs.existsSync(f) ? new Uint8Array(fs.readFileSync(f)) : null;
}

// the bytes compared after a call: all but the stack page, the p-code's registers and scratch at
// $02-$15, and the p-code's stack from stackLow up to the caller's stack pointer
function compare(a, b, stackLow, stackTop, extra = []) {
  const diffs = [];
  for (let i = 0; i < 0x10000; i++) {
    if (i < 0x16 || (i >= 0x100 && i < 0x200) || (i >= stackLow && i < stackTop)) continue;
    if (extra.some(([lo, hi]) => i >= lo && i <= hi)) continue;
    if (a[i] !== b[i]) diffs.push(i);
  }
  return diffs;
}

function bench(snap, o = {}) {
  const AEPort = loadPort();
  const file = path.isAbsolute(snap) ? snap : path.join(GAME, snap);
  const s = readSnapshot(file);
  const rom = charRom();
  const B = { s, rom };
  // the game: its routine at address called with args pushed as the p-code pushes them
  B.game = function (address, args, c, mem) {
    const m = mem || new Uint8Array(s.ram);
    const cpu = new CPU(m, { port: s.port, io: { read: a => c.read(a), write: (a, v) => c.write(a, v) }, rom: { char: rom } });
    let sp = m[4] | m[5] << 8;
    for (let i = args.length - 1; i >= 0; i--) { sp -= 2; m[sp] = args[i] & 255; m[sp + 1] = (args[i] >> 8) & 255; }
    m[4] = sp & 255; m[5] = sp >> 8;
    const hooks = {};
    for (const [a, f] of Object.entries(o.hooks || {})) hooks[a] = (c) => f(c, B);
    cpu.call(address, { sp: 0xFF }, { hooks, maxSteps: o.maxSteps || 2e7 });
    const r = m[0x0A] | m[0x0B] << 8;
    sp += 2 * args.length;
    m[4] = sp & 255; m[5] = sp >> 8;
    return { m, r, cycles: cpu.cycles, cpu };
  };
  B.port = function (name, args, c, mem) {
    const m = mem || new Uint8Array(s.ram);
    const P = AEPort.create(m, { read: a => c.read(a), write: (a, v) => c.write(a, v) },
      { cpuPort: s.port.data, charRom: rom });
    P.sp = m[4] | m[5] << 8; P.fp = m[6] | m[7] << 8;
    if (o.setup) o.setup(P);
    let r = P[name](...args);
    if (r && typeof r.next === 'function') {         // a generator: run it to its return
      let x;
      while (!(x = r.next()).done) { if (o.onYield) o.onYield(x.value, P, c); }
      r = x.value;
    }
    return { m, r: (r === undefined || r === null ? null : r & 0xFFFF), P };
  };
  B.both = function (address, name, args, opts = {}) {
    const c0 = opts.chips || chips({ noise: opts.noise });
    const mem = opts.mem;
    const cg = c0.copy(), cp = c0.copy();
    const g = B.game(address, args, cg, mem ? new Uint8Array(mem) : null);
    const p = B.port(name, args, cp, mem ? new Uint8Array(mem) : null);
    const base = mem || s.ram;
    const sp = base[4] | base[5] << 8;
    const diffs = compare(g.m, p.m, 0xC000, sp, opts.ignore || []);
    const chipDiff = JSON.stringify(cg.log) !== JSON.stringify(cp.log);
    const retDiff = opts.noReturn ? false : g.r !== p.r;
    return { ok: !diffs.length && !chipDiff && !retDiff, diffs, chipDiff, retDiff, game: g, port: p, cg, cp };
  };
  B.describe = function (r) {
    const out = [];
    const h = v => (v === null || v === undefined) ? 'none' : '$' + v.toString(16);
    if (r.retDiff) out.push('return: game ' + h(r.game.r) + ' port ' + h(r.port.r));
    if (r.diffs.length) {
      out.push(r.diffs.length + ' bytes differ: ' + r.diffs.slice(0, 16).map(a =>
        '$' + a.toString(16) + ' ' + r.game.m[a].toString(16) + '/' + r.port.m[a].toString(16)).join(', '));
    }
    if (r.chipDiff) {
      out.push('chips: game ' + JSON.stringify(r.cg.log.slice(0, 12)) + ' port ' + JSON.stringify(r.cp.log.slice(0, 12)) +
        ' (' + r.cg.log.length + '/' + r.cp.log.length + ')');
    }
    return out.join('\n') || 'same';
  };
  return B;
}

module.exports = { bench, chips, loadPort, compare, charRom, ROOT, GAME };
