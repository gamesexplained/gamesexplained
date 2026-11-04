'use strict';
// The KERNAL's routines that src/kernal.js stands in for, against KERNAL 901227-03 itself, run in the
// kit's simulator from the emulator's own file (tools/vice-mcp/share/vice/C64/), with BASIC out and
// the KERNAL in ($01 $36) as the game calls them. The files' routines are the page's store, not the
// ROM's, and are left out.
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { check } = require('./check.js');
const ROM = path.join(lib.REPO, 'tools/vice-mcp/share/vice/C64/kernal-901227-03.bin');
if (!fs.existsSync(ROM)) {
  console.log((process.env.KIT_REQUIRE_TOOLS ? 'FAIL' : 'skip') + ': no KERNAL ROM at ' + ROM);
  process.exit(process.env.KIT_REQUIRE_TOOLS ? 1 : 0);
}
const rom = { kernal: new Uint8Array(fs.readFileSync(ROM)) };
let f = 0;
const only = process.argv[2];
const T = (name, entry, o = {}) => {
  if (only && !only.split(',').includes(name)) return;
  f += check(Object.assign({ name: 'K_' + name, entry, rom, port: 0x36, cases: 20,
    onPort: P => { P['K_' + name] = r => P.kernal[name](r); } }, o)).fails ? 1 : 0;
};
const regs = rnd => ({ a: rnd(256), x: rnd(256), y: rnd(256) });
T('IOINIT', 0xFF84, { setup: (M, c, rnd) => { M[0x02A6] = rnd(2); return regs(rnd); }, outs: ['a', 'x', 'y'] });
T('RAMTAS', 0xFF87, { cases: 4, outs: ['a', 'x', 'y', 'c'] });
// CINT's read of the raster's flag for line $137 as the raster reaches line 0 ($FF63, LDA $D019;
// AND #$01) is given as a PAL machine finds it, set: nothing moves the raster here, so the ROM
// would find the flag its own table has just cleared
T('CINT', 0xFF81, { setup: (M, c, rnd) => { M[0x0288] = 4; return regs(rnd); }, outs: ['a', 'x', 'y'],
  hooks: { 0xFF63: c => { c.a = 1; c.pc = 0xFF68; return false; } } });
T('VECTOR', 0xFF8D, { setup: (M, c, rnd) => ({ x: 0, y: 8, c: rnd(2) }), outs: ['a', 'x', 'y'] });
T('SETMSG', 0xFF90, { setup: (M, c, rnd) => { M[0x90] = rnd(256); return regs(rnd); }, outs: ['a', 'x', 'y'] });
T('SETLFS', 0xFFBA, { setup: (M, c, rnd) => regs(rnd), outs: ['a', 'x', 'y'] });
T('SETNAM', 0xFFBD, { setup: (M, c, rnd) => regs(rnd), outs: ['a', 'x', 'y'] });
T('READST', 0xFFB7, { setup: (M, c, rnd) => { M[0x90] = rnd(256); M[0xBA] = [1, 8][rnd(2)]; return regs(rnd); }, outs: ['a', 'x', 'y'] });
process.exitCode = f ? 1 : 0;
