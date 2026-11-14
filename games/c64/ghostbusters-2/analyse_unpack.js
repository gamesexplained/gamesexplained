'use strict';
const fs = require('fs');
const {CPU} = require('../../../kit/cpu/cpu6502.js');
// Inputs are private disk-file bytes, a 64 KiB RAM dump after the loader was
// copied, and a VICE snapshot. Nothing from those files is embedded here.
if (process.argv.length !== 5) {
  console.error('Usage: node analyse_unpack.js <packed-file> <loader-ram> <entry.vsf>');
  process.exit(2);
}
const [file, loaderPath, entryPath] = process.argv.slice(2);
const packed = fs.readFileSync(file);
const snap = fs.readFileSync(loaderPath);
if (snap.length !== 65536) throw new Error('loader RAM must be exactly 65536 bytes');
function unpack(fill) {
  const ram = new Uint8Array(65536); ram.fill(fill);
  ram.set(snap.subarray(0x400, 0x700), 0x400);
  let pos = 0;
  const parts = [], states = [];
  while (pos < packed.length) {
    if (pos + 5 > packed.length) throw new Error('truncated header');
    const start = pos, header = [...packed.subarray(pos, pos + 5)]; pos += 5;
    ram.set(header, 0xfb); ram[0xa9] = 0;
    const cpu = new CPU(ram, {port: 0, io: {read: () => 0xff, write: () => {}}});
    cpu.pc = 0x0500;
    let ended = false, steps = 0;
    for (; steps < 2000000; steps++) {
      if (cpu.pc === 0x0638) { ended = true; break; }
      if (cpu.pc === 0xee13) {
        if (pos >= packed.length) throw new Error(`packed input exhausted in segment at offset ${start}, input offset ${pos}`);
        cpu.a = packed[pos++]; cpu.rts();
      } else cpu.step();
    }
    if (!ended) throw new Error(`segment at ${start} stalled at $${cpu.pc.toString(16)}`);
    parts.push({start, end: pos, header, steps});
    states.push(ram.slice());
  }
  return {ram, parts, states};
}
const first = unpack(0), second = unpack(255);
const stable = new Uint8Array(65536);
let stableCount = 0;
for (let a = 0x700; a < 65536; a++) if (first.ram[a] === second.ram[a]) { stable[a] = 1; stableCount++; }
let previous = new Uint8Array(65536);
for (let n = 0; n < first.parts.length; n++) {
  const current = new Uint8Array(65536), runs = [];
  for (let a = 0x700; a < 65536; a++) {
    current[a] = first.states[n][a] === second.states[n][a] ? 1 : 0;
    if (current[a] && !previous[a]) {
      if (runs.length && runs[runs.length - 1][1] === a - 1) runs[runs.length - 1][1] = a;
      else runs.push([a, a]);
    }
  }
  first.parts[n].newStableRanges = runs;
  previous = current;
}
const snapshot = fs.readFileSync(entryPath);
if (snapshot.length < 209 + 65536 || snapshot.toString('ascii', 0, 19) !== 'VICE Snapshot File\x1a') throw new Error('expected a VICE snapshot with RAM at offset 209');
const entry = snapshot.subarray(209, 209 + 65536);
let mismatches = 0;
const mismatchRanges = [];
for (let a = 0x700; a < 65536; a++) if (stable[a] && first.ram[a] !== entry[a]) {
  mismatches++;
  const last = mismatchRanges[mismatchRanges.length - 1];
  if (last && a <= last[1] + 16) { last[1] = a; last[2]++; }
  else mismatchRanges.push([a, a, 1]);
}
console.log(JSON.stringify({file, entryPath, parts: first.parts, secondMatches: JSON.stringify(first.parts.map(({start,end,header,steps})=>({start,end,header,steps}))) === JSON.stringify(second.parts), stableCount, mismatches, mismatchRanges}));
