'use strict';
// The kit's 6502 in the sound player (#366, #383): kit/cpu/cpu6502.js runs on a page as the site's
// lib/cpu6502.js, and site/lib/sid.js hands it to a music driver as createDriver's second argument,
// in the AudioWorklet too, where the player runs the driver from its source text. So:
// - core(), the whole processor, runs in a context of its own, with nothing of node's in it;
// - the worklet's module, as C64Sid.worklet builds it for a page that loaded cpu6502.js, runs in a
//   context with only what an AudioWorkletGlobalScope gives, and a driver that runs a program on
//   C64Cpu.CPU there makes the same SID writes, frame by frame, as the same driver given the
//   module in node;
// - for a page that did not load it, the driver gets undefined.
// Exits 1 on any failure.
// node kit/c64/test_sid_cpu6502.js
const path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const kit = require(path.join(ROOT, 'kit', 'cpu', 'cpu6502.js'));
require(path.join(ROOT, 'site', 'lib', 'sid.js'));
let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.log('FAIL ' + what); } else console.log('ok   ' + what); };

// core() alone, as the worklet gets it: no require, no module, no fs
{
  const C = vm.runInNewContext('(' + kit.core.toString() + ')()', {});
  const m = new Uint8Array(0x10000);
  m.set([0xA9, 0x05, 0x69, 0x03, 0x8D, 0x00, 0x20, 0x60], 0x1000);   // LDA #5; ADC #3; STA $2000; RTS
  const cpu = new C.CPU(m);
  cpu.call(0x1000);
  check(m[0x2000] === 8 && Object.keys(C).join() === 'CPU,OPCODES,CYCLES', 'core() runs in a context of its own');
}

// A driver that runs its tune's program on the kit's 6502: init at $1000 with A the tune, play at
// $1010 once a frame. The play routine's INC $D400 reads the bus and writes twice, as on the chip.
function createDriver(D, C64Cpu) {
  'use strict';
  if (!C64Cpu) return { none: true, sid: new Uint8Array(25), init() {}, stop() {}, play() {}, playing: () => false };
  const m = new Uint8Array(0x10000);
  m.set(D.code, 0x1000);
  const sid = new Uint8Array(25);
  let writes = [], bus = 0, on = false;
  const cpu = new C64Cpu.CPU(m, { port: 0x35, io: {
    read: (a) => (a >= 0xD400 && a < 0xD800 ? bus : 0),
    write: (a, v) => { if (a >= 0xD400 && a < 0xD800) { const r = a & 31; if (r < 25) { sid[r] = v; writes.push(r, v); } bus = v; } },
  } });
  return { sid, get writes() { return writes; }, cycles: () => cpu.cycles,
    init(t) { writes = []; cpu.call(0x1000, { a: t }); on = true; },
    stop() { on = false; },
    play() { writes = []; if (on) cpu.call(0x1010); },
    playing: () => on };
}
const code = new Uint8Array(0x40);
code.set([0x85, 0x20, 0xA9, 0x0F, 0x8D, 0x18, 0xD4, 0xA9, 0x09, 0x8D, 0x05, 0xD4, 0x60], 0x00);
code.set([0xA5, 0x20, 0x18, 0x69, 0x01, 0x85, 0x20, 0x8D, 0x01, 0xD4, 0xA9, 0x21, 0x8D, 0x04, 0xD4,
          0xEE, 0x00, 0xD4, 0x60], 0x10);
const data = { code };

// The same driver in node, given the module
const want = [];
{
  const d = createDriver(data, kit);
  d.init(3); want.push(d.writes.slice());
  for (let f = 0; f < 50; f++) { d.play(); want.push(d.writes.slice()); }
}
check(want[0].join() === '24,15,5,9' && want[1].join() === '1,4,4,33,0,33,0,34' && want[2].join() === '1,5,4,33,0,33,0,34',
      'the driver in node: the frame\'s writes, the read-modify-write\'s two from the bus included');

// The worklet's module, in a scope with what an AudioWorkletGlobalScope has
function worklet(src, data) {
  let Proc = null;
  const scope = {
    sampleRate: 48000, currentTime: 0,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage() {} }; } },
    registerProcessor: (name, cls) => { Proc = cls; },
  };
  vm.runInNewContext(src, scope);
  return new Proc({ processorOptions: { data, opts: {}, frames: false } });
}
{
  globalThis.C64Cpu = kit;                    // as a page that loaded ../../lib/cpu6502.js has it
  const src = C64Sid.worklet(createDriver);
  check(/^const C64Cpu = \(function core\(\)/m.test(src), 'the worklet carries core\'s source when the page has the 6502');
  const p = worklet(src, data), seen = [];
  const drv = p.p.drv;
  // each frame's writes, as the player takes them
  const play = drv.play.bind(drv);
  drv.play = () => { play(); seen.push(drv.writes.slice()); };
  p.port.onmessage({ data: { cmd: 'start', tune: 3 } });
  const init = drv.writes.slice();
  const out = [new Float32Array(128)];
  for (let k = 0; k < 400; k++) p.process([], [out]);   // 400 x 128 samples: over a second, 53 frames
  check(init.join() === want[0].join() && seen.length >= 50 && seen.slice(0, 50).every((w, f) => w.join() === want[f + 1].join()),
        `the driver in the worklet, on core's 6502: ${Math.min(seen.length, 50)} frames, every write the same as in node`);
  check(drv.cycles() > 0 && !Object.prototype.hasOwnProperty.call(drv, 'none'), 'the worklet hands the driver C64Cpu');
}
{
  delete globalThis.C64Cpu;                   // a page that did not load it
  const src = C64Sid.worklet(createDriver);
  check(/^const C64Cpu = undefined;$/m.test(src) && worklet(src, data).p.drv.none === true,
        'without cpu6502.js on the page the driver gets undefined');
}

console.log(fails ? fails + ' FAILED' : 'all ok');
process.exitCode = fails ? 1 : 0;
