'use strict';
// The files a test of saving and loading starts with, on the tape (device 1) and the disc (8): plan
// (in setup) names them, typeName types one of them (or "DIR ", or another), and files (check's
// files option) makes them from the case's memory as the game would have saved them: a league of
// one ($8000-$80BF, its save code made), the Hall of Fame (the records at $DE00 and $DF00,
// scrambled) and a game for several ($4000, scrambled), with now and then one changed by hand or of
// random bytes. LOOP ends what waits: Return with fire, then the C= key twice, over and over.
const { portOn } = require('./check.js');
const { KEY, JOY, typed, nameKey } = require('./input.js');
const K = () => globalThis.SCRKernal;
const F = { names: [] };
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./: ';
const word = (rnd, start) => { let s = start; while (s.length < 12) s += LETTERS[rnd(LETTERS.length)]; return s; };
F.plan = rnd => {
  F.names = [];
  for (let i = rnd(5); i; i--) F.names.push({ kind: ['one', 'hall', 'mp'][rnd(3)], dev: [1, 8][rnd(2)], bad: rnd(5) === 0 });
  for (const n of F.names) n.name = word(rnd, n.kind === 'hall' ? 'HALL' : n.kind === 'mp' ? 'MP' : '');
  return F.names;
};
// a name typed, its trailing spaces left to Return
F.typeName = rnd => {
  let s;
  const w = rnd(8);
  if (w < 4 && F.names.length) s = F.names[rnd(F.names.length)].name;
  else if (w === 4) s = 'DIR ';
  else if (w === 5) s = word(rnd, 'HALL').slice(0, 4 + rnd(9));
  else if (w === 6) s = word(rnd, 'MP').slice(0, 2 + rnd(11));
  else s = word(rnd, '').slice(0, 1 + rnd(12));
  s = s.replace(/ +$/, '');
  const out = [];
  for (const ch of s) out.push(...typed(rnd, [nameKey(ch)]));
  return out;
};
// (an odd number of keys, so that a refused name's wait for a key and the name's entry do not keep
// taking the same one each)
const none = { len: 40, keys: [], joy: JOY.none };
F.LOOP = [none, { len: 90, keys: [KEY.RETURN], joy: JOY.fire }, none, { len: 90, keys: [KEY.CBM] }, none, { len: 90, keys: [KEY.CBM] }];
F.files = (rnd, from, M) => {
  if (from) return new (K().Store)(from);
  const st = new (K().Store)();
  for (const n of F.names) {
    const P = portOn(M.slice()), m = P.M;
    let at, len;
    if (n.kind === 'one') { P.SAVE_CODE({ a: 0 }); at = 0x8000; len = 0xC0; }
    else if (n.kind === 'hall') {
      m[0xF810] = rnd(256);
      for (let x = 0; x < 256; x++) { m[0x4000 + x] = m[0xDE00 + x]; m[0x4100 + x] = m[0xDF00 + x]; }
      P.SCRAMBLE_2({}); at = 0x4000; len = 0x200;
    } else { m[0xF810] = rnd(256); m[0xC77B] = 1; m[0x31A1] = 1 + rnd(7); P.LEAGUE_FILE({}); at = 0x4000; len = 0x100; }
    const b = new Uint8Array(len + 2);
    b[0] = at & 255; b[1] = at >> 8;
    for (let i = 0; i < len; i++) b[i + 2] = m[at + i];
    if (n.bad) b[2 + rnd(len)] ^= 1 + rnd(255);
    st.save(n.name, n.dev, b);
  }
  return st;
};
module.exports = F;
