'use strict';
// Holds Turrican's pages to the game's own code and bytes:
// - every tune and sound effect button: the page's driver (index.html and discoveries.html share it)
//   gives, call for call, the SID writes of the game's own player run on the whole listing of its
//   part, and each button sounds when the exact AudioWorklet module renders it;
// - the music's bytes are the listings' bytes, and the loading tune's (which no listing holds, since
//   the boot is not a part) are pinned by a hash, checked against the boot's snapshot when work/ has it;
// - the Discoveries page's changed signature: one letter, and what the caption says it does;
// - the Graphics page's port of the ending's explosions, step for step against $6D7D, and its broken
//   top against the copy at $6C2C;
// - the two recorded frames the pages draw, by the hash of their picture.
const fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
const crypto = require('crypto'), { execFileSync } = require('child_process');
const { game } = require('../../../kit/scripts/port_check.js'), C64Cpu = require('../../../kit/cpu/cpu6502.js');
const g = game(__dirname);
const data = (page, id) => JSON.parse(g.read(page).match(new RegExp('<script id="' + id + '" type="application/json">([\\s\\S]*?)</script>'))[1]);
const bytes = s => Uint8Array.from(Buffer.from(s, 'base64'));
const sha = b => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
const cache = new Map();
function image(id) {           // a part's memory as its listing holds it, over the part beneath
  if (cache.has(id)) return cache.get(id);
  const meta = g.json('parts/' + id + '/part.json'), m = meta.over ? image(meta.over).slice() : new Uint8Array(65536);
  for (const r of g.json('parts/' + id + '/listing.json').records) if (r.b) m.set(r.b, r.a);
  cache.set(id, m); return m;
}
const I = data('index.html', 'tu-data'), S = data('discoveries.html', 'tu-sig-data');
const block = g.sameBlock('createDriver', 'index.html', 'discoveries.html');
assert.deepStrictEqual(block.pages.sort(), ['discoveries.html', 'index.html']);
const port = g.run('index.html', 'createDriver', 'createDriver').createDriver;
// the worklet's scope holds only the function's text, the data, atob and the shared CPU
const createDriver = vm.runInNewContext('(' + port.toString() + ')', { atob: s => Buffer.from(s, 'base64').toString('binary') });

// The music's bytes are the listings' bytes, wherever a record holds them (the calls below show
// that the players read nothing else).
assert.deepStrictEqual(I.sets.effects.map(c => c[0]), [0x4F09]);
for (const [a, s] of I.sets.effects) assert.deepStrictEqual(Array.from(bytes(s)), Array.from(image('engine').slice(a, a + bytes(s).length)), 'the effects player');
function held(id) {             // which addresses a part's listing, or one beneath it, gives a byte
  const meta = g.json('parts/' + id + '/part.json'), h = meta.over ? held(meta.over) : new Uint8Array(65536);
  h.set(g.listing('parts/' + id + '/listing.json').has.map((x, i) => x ? 1 : h[i]));
  return h;
}
for (const q of I.tunes) {
  if (q.part === 'boot') continue;
  const m = image(q.part), h = held(q.part);
  for (const [a, s] of q.chunks) {
    const b = bytes(s);
    for (let i = 0; i < b.length; i++) if (h[a + i]) assert.equal(b[i], m[a + i], q.name + ' at $' + (a + i).toString(16));
  }
}
// The ending's sound program 18 ends by jumping to program 21, whose place in its table holds
// $1808: the player reads 191 bytes of the engine's code as notes, and the page gives it them.
{
  const q = I.tunes.find(t => t.part === 'ending'), m = image('ending');
  assert.equal(m[0xB75C] | m[0xB75D] << 8, 0x1808);
  assert(q.chunks.some(([a, s]) => a === 0x1808 && bytes(s).length === 0xBF), 'the ending has the engine\'s bytes at $1808');
}
// The loading tune: the boot's bytes, with the ten digits of a telephone number replaced so that
// the player's check of its credit line ($8209-$8255, EOR) still comes to $56.
const LT = I.tunes.find(q => q.part === 'boot'), lt = bytes(LT.chunks[0][1]);
assert.equal(LT.chunks.length, 1); assert.equal(LT.chunks[0][0], 0x8000);
let check = 0; for (let a = 0x8209; a <= 0x8255; a++) check ^= lt[a - 0x8000];
assert.equal(check, 0x56, 'the credit line checks');
assert.equal(sha(lt), '5f28f6017514b6468f72abcaec6403f8c345b8a249148af3ea6baba1a09b8599');
const bootSnap = path.join(__dirname, 'work', 'boot_c330.vsf');
if (fs.existsSync(bootSnap)) {
  const ram = Buffer.from(execFileSync('python3', ['-c', 'import sys;sys.path.insert(0,sys.argv[1]);import snapshot;sys.stdout.buffer.write(bytes(snapshot.read(sys.argv[2])))',
    path.resolve(__dirname, '../../../kit/c64'), bootSnap]));
  const at = [0xD000, 0x8000].find(b => { for (let i = 0; i < lt.length; i++) if ((i < 0x247 || i > 0x250) && ram[b + i] !== lt[i]) return false; return true; });
  assert(at !== undefined, 'the loading tune is the boot snapshot\'s bytes but for $8247-$8250');
  let changed = 0; for (let i = 0x247; i <= 0x250; i++) if (ram[at + i] !== lt[i]) { changed++; assert('0123456789/-'.includes(String.fromCharCode(ram[at + i])), 'only the number is replaced'); }
  console.log('Loading tune: the boot snapshot\'s bytes at $' + at.toString(16).toUpperCase() + ', ' + changed + ' characters of the number replaced');
} else console.log('Loading tune: held by its hash (work/boot_c330.vsf, the boot\'s snapshot, is not here)');

// Every button, call for call, against the game's own player on the whole listing of its part.
function reference(q, set) {
  const m = set ? image('engine').slice() : q.part === 'boot' ? (() => { const x = new Uint8Array(65536); x.set(bytes(q.chunks[0][1]), q.chunks[0][0]); return x; })() : image(q.part).slice();
  let writes = [];
  const io = { read() { return 0; }, write(a, v) { if (a >= 0xD400 && a < 0xD800 && (a & 31) < 25) writes.push(a & 31, v); } };
  const cpu = new C64Cpu.CPU(m, { port: 0x35, io });
  for (const c of q.init) cpu.call(c.pc, { a: c.a || 0, x: c.x || 0, y: c.y || 0 }, { maxSteps: 200000 });
  if (q.req) for (const [o, n] of q.req) m[0xFFC0 + o] = n;
  const first = writes;
  return { first, frame() { writes = []; cpu.call(q.play, {}, { maxSteps: 200000 }); return writes; } };
}
let calls = 0, matched = 0;
for (const [list, set] of [[I.tunes, false], [I.sfx, true], [S.tunes, false]]) {
  const D = { sets: set ? I.sets : {}, tunes: list };
  for (let t = 0; t < list.length; t++) {
    const q = list[t], ref = reference(q, set), drv = createDriver(D, C64Cpu);
    drv.init(t);
    for (let f = 0; f < (set ? 400 : 1500); f++) {
      const want = f === 0 ? ref.first.concat(ref.frame()) : ref.frame();
      drv.play();
      assert.deepStrictEqual(Array.from(drv.writes).slice(0, want.length), want, q.name + ', call ' + f);
      calls++; matched += want.length / 2;
      if (!drv.playing()) break;
    }
    drv.stop();
    for (const r of [4, 11, 18]) assert.equal(drv.sid[r] & 1, 0, q.name + ': every gate off after Stop');
  }
}
console.log('Sound:', calls, 'calls of the game\'s players,', matched, 'SID writes matched, for', I.tunes.length + I.sfx.length + S.tunes.length, 'buttons');

// Discoveries: the second tune differs by one letter of the credit line, ROMUZAK to SOMUZAK, and
// does what the caption says: first differs at frame 769, then starts about a quarter of the notes.
{
  const [a, b] = S.tunes.map(q => bytes(q.chunks[0][1]));
  assert.deepStrictEqual(Array.from(a), Array.from(lt), 'the first is the loading tune');
  const diff = []; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push([0x8000 + i, a[i], b[i]]);
  assert.deepStrictEqual(diff, [[0x820B, 0x52, 0x53]]);
  const run = t => { const d = createDriver({ sets: {}, tunes: S.tunes }, C64Cpu), out = []; d.init(t); for (let f = 0; f < 3800; f++) { d.play(); out.push(Array.from(d.writes)); } return out; };
  const A = run(0), B = run(1), first = A.findIndex((w, f) => w.join() !== B[f].join());
  assert.equal(first, 769, 'the changed tune first differs at frame 769');
  const gates = o => o.slice(first, first + 3000).reduce((n, w) => { for (let i = 0; i < w.length; i += 2) if ([4, 11, 18].includes(w[i]) && (w[i + 1] & 1)) n++; return n; }, 0);
  const ratio = gates(B) / gates(A);
  assert(ratio > 0.2 && ratio < 0.35, 'about a quarter as many notes in the next minute: ' + ratio.toFixed(2));
  console.log('Signature: one letter changed; differs from frame 769; ' + Math.round(ratio * 100) + '% of the notes in the next minute');
}

// Graphics: the ending's explosions, step for step against the interrupt at $6D7D, with the same
// timer values, from the state the set-up at $6F2D leaves; and the broken top against $6C2C.
{
  const { explosionStep } = g.run('graphics.html', 'explosions', 'explosionStep');
  const { brokenTop } = g.run('graphics.html', 'broken top', 'brokenTop');
  const m = image('ending').slice();
  let r = 0; const io = { read(a) { return a === 0xDC04 ? r : 0; }, write() {} };
  const cpu = new C64Cpu.CPU(m, { port: 0x35, io }), stopAt = (pc, at) => { try { cpu.call(pc, {}, { maxSteps: 100000, hooks: { [at]() { throw Error('DONE'); } } }); } catch (e) { if (e.message !== 'DONE') throw e; } };
  stopAt(0x6F2D, 0x6F66);
  const st = { ptr: Array(8).fill(0x80), cnt: Array(8).fill(8), reload: 8, left: 50, stop: false };
  const same = f => { for (let x = 0; x < 8; x++) { assert.equal(st.ptr[x], m[0xFBF8 + x], 'shape of sprite ' + x + ', frame ' + f); assert.equal(st.cnt[x] & 255, m[0x0A + x], 'countdown ' + x + ', frame ' + f); }
    assert.equal(st.reload, m[0x12]); assert.equal(st.left, m[0x09]); assert.equal(st.stop, m[0x04] !== 0, 'stopped, frame ' + f); };
  same(-1);
  let seed = 0x2F6E2B1, f = 0;
  for (; f < 5000 && !st.stop; f++) { seed = (seed * 1103515245 + 12345) >>> 0; r = seed >>> 24; stopAt(0x6D7D, 0x6DAC); explosionStep(st, () => r); same(f); }
  assert(st.stop, 'the explosions end');
  const want = image('ending').slice(); want.set(want.slice(0x788F, 0x788F + 8000), 0xC000);
  const c2 = new C64Cpu.CPU(want, { port: 0x35, io });
  try { c2.call(0x6C2C, {}, { maxSteps: 100000, hooks: { 0x6C4F() { throw Error('DONE'); } } }); } catch (e) { if (e.message !== 'DONE') throw e; }
  const mine = brokenTop(image('ending'), image('ending').slice(0x788F, 0x788F + 8000));
  assert.deepStrictEqual(Array.from(mine), Array.from(want.slice(0xC000, 0xC000 + 8000)), 'the broken top');
  console.log('Ending: the explosions matched $6D7D for', f, 'frames, to their end; the broken top matched $6C2C');
}

// The recorded frames: the screen split on How it works and the loading picture on Graphics.
{
  g.lib('c64');
  for (const [page, F, full, want] of [['index.html', I.frame, 'frame-1-1.json', '8cdfb92a9328b4836f4244e2a8c6812ec9dac8da10894cc04306081f80516228'], ['graphics.html', data('graphics.html', 'tu-loadpic'), 'frame-loadpic.json', '01ab484233063576d5a0f1b7b365235b43dc10a79e4b2b7792966af1c353c22e']]) {
    const px = C64.renderFrame(F).px;
    assert.equal(sha(px), want, page + ': the recorded frame');
    const f = path.join(__dirname, 'work', full);
    if (fs.existsSync(f)) assert.equal(sha(C64.renderFrame(JSON.parse(fs.readFileSync(f, 'utf8'))).px), want, page + ': the trimmed frame draws as the whole one');
  }
  console.log('Frames: both recorded frames draw as recorded');
}

// Every button through the exact AudioWorklet module, its own CPU scope included.
require('../../../site/lib/sid.js'); globalThis.C64Cpu = C64Cpu;
const { CHECKER, verdict } = require('../../../kit/c64/sid_check.js');
let sounded = 0;
for (const [list, set] of [[I.tunes, false], [I.sfx, true], [S.tunes, false]]) for (let tune = 0; tune < list.length; tune++) {
  let Proc; const posted = [];
  const scope = { sampleRate: 22050, currentTime: 0, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: m => posted.push(m) }; } }, registerProcessor(n, c) { if (n === 'c64-sid-check') Proc = c; } };
  vm.runInNewContext(C64Sid.worklet(createDriver) + CHECKER, scope);
  const proc = new Proc({ processorOptions: { data: { sets: set ? I.sets : {}, tunes: list }, opts: { filter: '6581' }, frames: false, tune } }), out = [new Float32Array(128)];
  let lo = 0, hi = 0;
  for (let k = 0; k < Math.ceil(22050 * 4 / 128); k++) { scope.currentTime = k * 128 / 22050; proc.process([], [out]); for (const v of out[0]) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  const result = { name: list[tune].name, error: null, heard: false, vol: false, env: false, moves: hi - lo };
  for (const m of posted) { if (m.driverError) result.error = m.driverError; for (const k of ['heard', 'vol', 'env']) if (m[k]) result[k] = true; }
  assert.equal(verdict(result, 4), null, JSON.stringify(result)); sounded++;
}
console.log('Worklet audio: all', sounded, 'buttons rendered four seconds each, and every one sounded');
