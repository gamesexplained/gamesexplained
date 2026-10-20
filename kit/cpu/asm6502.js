'use strict';
// A small two-pass 6502 assembler, so that the kit's JavaScript tests write their programs as
// source, not bytes (kit/cpu/asm6502.py is the same for the Python ones):
//   const { asm } = require('kit/cpu/asm6502.js');
//   const { bytes, labels } = asm(0x1000, 'start: lda #$00\n sta $d020\n jmp start');
// An instruction, a label ("name:") or .byte/.word per line; ';' starts a comment. Operands: a, #v,
// v, v,x, v,y, (v), (v,x), (v),y, where v is $hex, %binary, decimal or a label, with + and - terms
// and a leading < or > for the low or high byte. A value under 256 known in the first pass takes
// the zero-page form where the instruction has one.
const { OPCODES } = require('./cpu6502');
const CODE = {};
OPCODES.forEach(([n, m], op) => { if (!((n + ' ' + m) in CODE)) CODE[n + ' ' + m] = op; });
const LEN = { imp: 1, acc: 1, imm: 2, zp: 2, zpx: 2, zpy: 2, rel: 2, abs: 3, abx: 3, aby: 3, ind: 3, izx: 2, izy: 2 };
function asm(org, src) {
  const lines = src.split('\n').map(l => l.replace(/;.*$/, '').trim()).filter(Boolean);
  const labels = {}, modes = [];
  const term = (t, pass) => {
    if (t[0] === '$') return parseInt(t.slice(1), 16);
    if (t[0] === '%') return parseInt(t.slice(1), 2);
    if (/^\d+$/.test(t)) return +t;
    if (t in labels) return labels[t];
    if (pass === 2) throw new Error('unknown label ' + t);
    return 0x1000;                                   // not yet seen: an address above zero page
  };
  const value = (s, pass) => {
    s = s.trim();
    const part = s[0] === '<' || s[0] === '>' ? s[0] : '';
    if (part) s = s.slice(1);
    let v = 0;
    for (const [, sign, t] of s.matchAll(/([+-]?)\s*([$%]?\w+)/g)) v += (sign === '-' ? -1 : 1) * term(t, pass);
    v &= 0xFFFF;
    return part === '<' ? v & 0xFF : part === '>' ? v >> 8 : v;
  };
  const operand = (name, op, pass) => {
    let m;
    if (op === '') return [CODE[name + ' imp'] !== undefined ? 'imp' : 'acc', 0];
    if (/^a$/i.test(op)) return ['acc', 0];
    if (op[0] === '#') return ['imm', value(op.slice(1), pass)];
    if ((m = /^\((.*),\s*x\)$/i.exec(op))) return ['izx', value(m[1], pass)];
    if ((m = /^\((.*)\),\s*y$/i.exec(op))) return ['izy', value(m[1], pass)];
    if ((m = /^\((.*)\)$/.exec(op))) return ['ind', value(m[1], pass)];
    if ((m = /^(.*),\s*([xy])$/i.exec(op))) {
      const v = value(m[1], pass), r = m[2].toLowerCase();
      return [v < 0x100 && CODE[name + ' zp' + r] !== undefined ? 'zp' + r : 'ab' + r, v];
    }
    const v = value(op, pass);
    if (CODE[name + ' rel'] !== undefined) return ['rel', v];
    return [v < 0x100 && CODE[name + ' zp'] !== undefined ? 'zp' : 'abs', v];
  };
  let out;
  for (const pass of [1, 2]) {
    let pc = org;
    out = [];
    lines.forEach((line, i) => {
      let m = /^(\w+):\s*(.*)$/.exec(line);
      if (m) { labels[m[1]] = pc; line = m[2]; if (!line) return; }
      m = /^(\.?\w+)\s*(.*)$/.exec(line);
      const name = m[1].toLowerCase(), op = m[2].trim();
      if (name === '.byte' || name === '.word') {
        for (const e of op.split(',')) {
          const v = value(e, pass);
          if (name === '.byte') out.push(v & 0xFF); else out.push(v & 0xFF, v >> 8);
        }
        pc = org + out.length;
        return;
      }
      let [mode, v] = operand(name, op, pass);
      if (pass === 1) modes[i] = mode; else mode = modes[i];   // pass 2 keeps pass 1's sizes
      const code = CODE[name + ' ' + mode];
      if (code === undefined) throw new Error('no ' + name + ' ' + mode + ': ' + line);
      out.push(code);
      if (mode === 'rel') {
        const d = pass === 2 ? v - (pc + 2) : 0;
        if (d < -128 || d > 127) throw new Error('branch out of range: ' + line);
        out.push(d & 0xFF);
      } else if (LEN[mode] === 2) out.push(v & 0xFF);
      else if (LEN[mode] === 3) out.push(v & 0xFF, v >> 8);
      pc = org + out.length;
    });
  }
  return { bytes: out, labels };
}

module.exports = { asm, LEN };
