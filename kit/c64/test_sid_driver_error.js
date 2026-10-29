'use strict';
// A sound driver that throws in the AudioWorklet (site/lib/sid.js): the worklet runs createDriver
// from its source text alone, so a driver that uses a name of the page's, which node's tests can
// see, throws there and nowhere else. The processor must then go silent and post the error to the
// page ({ driverError }), which logs it, rather than fail without a word. So, in a scope with what
// an AudioWorkletGlobalScope has:
// - a driver that uses a name from outside its own text posts one driverError naming it, and the
//   processor goes on returning silence;
// - a driver that throws on its first frame does the same, once, and the frames after are silent;
// - a driver that works posts nothing.
// Exits 1 on any failure.
// node kit/c64/test_sid_driver_error.js
const path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
require(path.join(ROOT, 'site', 'lib', 'sid.js'));
let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.log('FAIL ' + what); } else console.log('ok   ' + what); };

function worklet(driver) {
  let Proc = null;
  const posted = [];
  const scope = {
    sampleRate: 48000, currentTime: 0,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (m) => posted.push(m) }; } },
    registerProcessor: (name, cls) => { Proc = cls; },
  };
  vm.runInNewContext(C64Sid.worklet(driver), scope);
  const p = new Proc({ processorOptions: { data: {}, opts: {}, frames: false } });
  const out = [new Float32Array(128)];
  const run = (n) => { let ok = true; for (let k = 0; k < n; k++) ok = p.process([], [out]) && ok; return ok; };
  return { p, posted, out, run };
}
const errors = (w) => w.posted.filter((m) => m && m.driverError);

// a name of the page's, as a page's own tests see it and the worklet does not
globalThis.PAGE_TUNE = [1, 2, 3];
function outside() {
  const sid = new Uint8Array(25), tune = PAGE_TUNE.slice();
  return { sid, writes: [], init() {}, stop() {}, play() {}, playing: () => tune.length > 0 };
}
{
  const w = worklet(outside);
  const e = errors(w);
  const alive = w.run(20);
  check(e.length === 1 && /PAGE_TUNE/.test(e[0].driverError), 'a driver that uses a name of the page\'s posts its error, naming it');
  w.p.port.onmessage({ data: { cmd: 'start', tune: 0 } });
  check(alive && w.run(20) && w.out[0].every((v) => v === 0) && errors(w).length === 1,
        'and the processor stays silent, with no more errors, when a tune is asked for');
}

function throwsOnPlay() {
  const sid = new Uint8Array(25);
  let on = false;
  return { sid, writes: [], init() { on = true; }, stop() { on = false; }, play() { throw new Error('the play routine broke'); }, playing: () => on };
}
{
  const w = worklet(throwsOnPlay);
  check(errors(w).length === 0, 'a driver that starts posts nothing');
  w.p.port.onmessage({ data: { cmd: 'start', tune: 0 } });
  const alive = w.run(400);
  const e = errors(w);
  check(alive && e.length === 1 && /the play routine broke/.test(e[0].driverError) && w.out[0].every((v) => v === 0),
        'a driver that throws on a frame posts its error once and goes silent');
}

function works() {
  const sid = new Uint8Array(25);
  let on = false, n = 0;
  return { sid, get writes() { return []; }, init() { on = true; n = 0; sid[24] = 15; }, stop() { on = false; }, play() { n++; }, playing: () => on && n < 1000 };
}
{
  const w = worklet(works);
  w.p.port.onmessage({ data: { cmd: 'start', tune: 0 } });
  check(w.run(400) && errors(w).length === 0, 'a driver that works posts no error');
}

console.log(fails ? fails + ' FAILED' : 'all ok');
process.exitCode = fails ? 1 : 0;
