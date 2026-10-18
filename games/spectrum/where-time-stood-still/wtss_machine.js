'use strict';
// The game's memory on the kit's Z80 with the 128K's paging, for the tests beside it that run the
// game's own routines (test_maps.js, test_cast.js, test_routes.js). Banks 5, 2 and 0 are main's
// listing at $4000-$FFFF, the others their parts' at $C000, and ROM 0's bytes the game reads at
// $0000 (rom-excerpt.json); port $7FFD (A15 and A1 low) pages the
// bank in its low three bits in at $C000. Any other port is an error: none of the routines run
// here reads the keyboard or writes the sound chip.
//   const M = machine(g)          g: kit/scripts/port_check.js's game(__dirname)
//   M.mem                         the 64 KB the Z80 sees
//   M.page(n)                     page bank n in at $C000
//   M.bank(n)                     a copy of bank n's 16 KB
//   M.call(pc)                    call the routine at pc, until it returns
//   M.run(regs, stop)             start with regs (pc among them) and run until pc is stop, or
//                                 any of stop when it is an array; gives the pc it stopped at
const path = require('path');
const { CPU } = require(path.join(__dirname, '..', '..', '..', 'kit', 'spectrum', 'z80.js'));

const PARTS = { 1: 'bank-01', 3: 'bank-03', 4: 'bank-04', 6: 'bank-06', 7: 'bank-07' };

function machine(g) {
  const mem = g.listing('parts/main/listing.json').ram;
  // ROM 0's bytes area 14's grid runs on into (rom-excerpt.json)
  const ex = JSON.parse(g.read('rom-excerpt.json'));
  mem.set(Buffer.from(ex.hex, 'hex'), ex.from);
  const banks = {};
  for (const [b, part] of Object.entries(PARTS)) banks[b] = g.listing(`parts/${part}/listing.json`).ram.slice(0xC000);
  let cur = 0;
  const page = v => {
    const b = v & 7;
    if (b === 2 || b === 5) throw new Error('bank ' + b + ' paged in at $C000');
    if (b !== cur) { banks[cur] = mem.slice(0xC000); mem.set(banks[b], 0xC000); delete banks[b]; cur = b; }
  };
  const cpu = new CPU(mem, { io: {
    out(port, v) { if (!(port & 0x8002)) page(v); else throw new Error('out to ' + port.toString(16)); },
    in(port) { throw new Error('in from ' + port.toString(16)); } } });
  const run = (regs, stop, limit = 2e7) => {
    const stops = new Set([].concat(stop));
    cpu.setRegs(Object.assign({ sp: 0x5FF0 }, regs));
    mem[0x5FF0] = 0; mem[0x5FF1] = 0;
    for (let n = 0; !stops.has(cpu.pc); n++) {
      if (cpu.pc < 0x4000 || n > limit) throw new Error(`left the code at ${cpu.pc.toString(16)}`);
      cpu.step();
    }
    return cpu.pc;
  };
  const call = (pc, limit) => run({ pc }, 0, limit);
  return { mem, cpu, page, run, call, bank: b => (b === cur ? mem.slice(0xC000) : banks[b].slice()) };
}

module.exports = { machine };
