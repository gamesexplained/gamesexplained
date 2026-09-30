'use strict';
// The two tails the fabric group ports for the others, checked against the game's own code:
// node games/c64/chiller/port/test/t-fabric.js (the flow itself is checked by test/lockstep.js)
const { check, LISTING } = require('./lib.js');
let bad = 0;
for (const [name, ranges] of [['j_C1E1', [0xC1E1, 0xC1EB, 0xC407, 0xC40F]], ['b_CDDE', [0xCDDE, 0xCDE3]]]) {
  const r = check({ name, groups: ['fabric', 'energy', 'enemies'], cases: 2000 });
  for (let i = 0; i < ranges.length; i += 2) {
    const L = LISTING.records.filter(x => x.t === 'code' && x.a >= ranges[i] && x.a <= ranges[i + 1]);
    console.log('       ' + L.filter(x => r.reached[x.a]).length + '/' + L.length + ' instructions of $' +
      ranges[i].toString(16).toUpperCase() + '-$' + ranges[i + 1].toString(16).toUpperCase() + ' reached');
  }
  bad += r.fails;
}
process.exitCode = bad ? 1 : 0;
