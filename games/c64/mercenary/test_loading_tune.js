#!/usr/bin/env node
// Hold How it works' loading tune (the blocks me-loader-tune, me-loader-data, me-loading and me-loading-data) to
// the cassette, Novagen's 1985 tape, the Ultimate Tape Archive's "Mercenary-_Escape_from_Targ.tap" (498,322 bytes,
// SHA-256 c971771d55280634273274b4be46b1fb0cce87a1fc2a926cd8bebe0c5a509d72), loaded in VICE 3.10 with
// vice-mcp 3.14.0 on 12 November 2026. The tape is not in the repository, so the test holds the page to what was
// recorded from it.
// - The bytes: me-loader-data holds the RAM as it stood when the loader's interrupt first reached the stretch
//   that plays the tune ($E0F8), $E003-$E007 and $E114-$E360, and the list the tune reads from $EF80
//   ($EF80-$F320) from the RAM 150 seconds into the tape, when the tape had brought it all in. Their hashes, and
//   the tune reads and runs nothing outside them, the stack and the SID in 20,000 calls.
// - The sound: VICE stopped at $E1E7 after each of the tune's first 6,100 calls, with the tape running, and its
//   SID state was recorded. The hash below is of those registers after calls 2 to 6,100; the page's calls must
//   give the same. The first call's state also holds registers set before the tune began. VICE reports the top
//   nibble of the pulse width registers as 0, as the chip ignores it, and reports $D418's bit 3 in $D417's place,
//   so both are left out. The calls came 19,655.85 cycles apart on average, a PAL frame's 19,656.
// - The loop the page gives sid.js: from call 2 the registers repeat every 2,674 calls, and from call 1,318 so does
//   the whole state; the volume is 15 from call 2 on.
// - The screen: me-loading-data is one frame recorded with kit/c64/frame.py capture, then trim, 100 seconds in:
//   text ($D011 = $1B, $D016 = $C8) in bank 0 ($DD00 = $97), screen at $0400 and the character ROM
//   ($D018 = $15), a red border and black background, no writes in the frame. `frame.py compare` found the
//   drawing equal to VICE's own picture in all 104,448 pixels. The page carries the ROM's characters the screen
//   shows and the ten digits.
// - The count: a checkpoint on every store to $046E-$0470, from the tune's first call, timed each block: 205 of
//   them, the first 725,913 cycles in and the last 193,104,944. ME_BLOCKS is each as a call of the tune, at the
//   calls' average pace.
// It exits 1 on any difference.
//   node games/c64/mercenary/test_loading_tune.js
'use strict';
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
g.lib('c64');
const { createNovaloadTune } = g.run('index.html', 'me-loader-tune', 'createNovaloadTune');
const { ME_BLOCKS, meFont, meLeft, meScreen } = g.run('index.html', 'me-loading', 'ME_BLOCKS', 'meFont', 'meLeft', 'meScreen');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };
const page = g.read('index.html');
const block = (id) => {
  const m = new RegExp('<script type="application/json" id="' + id + '">([^<]*)</script>').exec(page);
  if (!m) { console.log('index.html has no ' + id + ' block'); process.exit(1); }
  return JSON.parse(m[1]);
};

// the tune
const D = block('me-loader-data');
const bytes = D.blocks.map(([, s]) => Buffer.from(s, 'base64'));
check('blocks', D.blocks.map(([a], i) => a.toString(16) + ':' + bytes[i].length).join(), 'e003:5,e114:589,ef80:929');
check('bytes', bytes.map(sha).join(), 'fa6994afa45bef8a430b4b3df346ad34a871309df2de0d28bfcfb64f456fb2c5,68d8d00cbbc1ea736846314072b2f4c6ec0bfa4a7ac09614bb51d21e87b1b450,1096a3d9ccb0b7b1cefc1b12583dc6d77d54feeae643ee0311810c6ba9007f3d');
check('play from, until', [D.play, D.until].map((x) => x.toString(16)).join(), 'e114,e1e7');
const masked = (r) => Array.from(r, (v, i) => (i === 23 ? v & 0xF7 : i === 3 || i === 10 || i === 17 ? v & 0x0F : v));
const T = createNovaloadTune(D, C64Cpu);
T.init(0);
const h = crypto.createHash('sha256'), states = [], vols = new Set();
const N = 1318 + 2 * 2674;
for (let i = 1; i <= Math.max(N, 6100); i++) {
  T.play();
  const r = masked(T.sid);
  if (i >= 2 && i <= 6100) h.update(Buffer.from(r));
  if (i >= 2) vols.add(T.sid[24] & 15);
  states.push(r.join());
}
check('SID registers after calls 2 to 6,100, as VICE recorded them', h.digest('hex'), 'b017690dbb1825ec4128f6c689f3fa4867dd9e2873c05bb6c6ace3ba77a6f9fb');
check('the volume from call 2 on', [...vols].join(), '15');
let loopBad = 0;
for (let i = 2; i + 2674 <= states.length; i++) if (states[i - 1] !== states[i - 1 + 2674]) loopBad++;
check('the registers repeat every 2,674 calls from call 2', loopBad, 0);
const U = createNovaloadTune(D, C64Cpu);
U.init(0);
let at = null;
for (let i = 1; i <= 1318 + 2674; i++) {
  U.play();
  if (i === 1318) at = sha(Buffer.concat([Buffer.from(U.mem), Buffer.from(U.sid)]));
}
check('the whole state repeats from call 1,318', sha(Buffer.concat([Buffer.from(U.mem), Buffer.from(U.sid)])), at);
check('the loop the page gives sid.js', /loops: \[\{ from: 2, period: 2674 \}\]/.test(page), true);
const mem = new Uint8Array(0x10000);
for (const [a, s] of D.blocks) mem.set(Buffer.from(s, 'base64'), a);
const reads = new Uint8Array(65536), executed = new Uint8Array(65536);
const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: { read: () => 0, write: () => {} } });
cpu.sp = 0xFF;
for (let i = 0; i < 20000; i++) { cpu.pc = D.play; cpu.run({ until: D.until, maxSteps: 200000, reads, executed }); }
const inside = (a) => D.blocks.some(([b], i) => a >= b && a < b + bytes[i].length) || (a >= 0xD400 && a <= 0xD41F) || (a >= 0x100 && a <= 0x1FF);
let outside = 0;
for (let a = 0; a < 0x10000; a++) if ((reads[a] || executed[a]) && !inside(a)) outside++;
check('bytes read or run outside the blocks, the stack and the SID', outside, 0);

// the screen
const F = meFont(block('me-loading-data'));
check('$D011, $D016, $D018, $DD00', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].map((x) => x.toString(16)).join(), '1b,c8,15,97');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '2,0');
check('register writes in the frame', F.writes.length, 0);
const scr = new Uint8Array(0x10000);
for (const r of F.ram) scr.set(Buffer.from(r.b, 'base64'), r.a);
check('screen $0400-$07E7', sha(scr.subarray(0x400, 0x7E8)), '70a213e91d9c8da964a2064045545b0dfd8dcb47182e8367db73cd19b57d1534');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '31eefa650b8ab81aaab018db379de14e593e20dc798a09af74e97b26e62164d4');
check('ROM', F.rom_excerpt.rom, 'chargen 901225-01');
const offs = [];
for (const r of F.rom_excerpt.ranges) for (let i = 0; i < Buffer.from(r.b, 'base64').length; i += 8) offs.push(r.a + i);
const want = [...new Set([...scr.subarray(0x400, 0x7E8), ...'0123456789'.split('').map((c) => c.charCodeAt(0))])].sort((a, b) => a - b).map((c) => c * 8);
check('ROM characters: those shown and the digits, and no others', offs.sort((a, b) => a - b).join(), want.join());
check('the recorded frame, drawn', sha(C64.renderFrame(F).px), '7e8e76d615a68f6f017851142f4891133013f381e322a24def566e25e37aff80');

// the count
check('blocks: 205, in order', [ME_BLOCKS.length, ME_BLOCKS.every((v, i) => !i || v > ME_BLOCKS[i - 1])].join(), '205,true');
check('blocks: the first and last as calls', [ME_BLOCKS[0], ME_BLOCKS[204]].join(), [1 + Math.ceil(725913 / 19655.85), 1 + Math.ceil(193104944 / 19655.85)].join());
check('blocks', sha(JSON.stringify(ME_BLOCKS)), '92d8b453e51c3955d1493e42ccda90b6856762499a0866345281fefcfeff4f9a');
check('the count at the start, after the first block, at the recorded frame\'s 100 seconds and at the end',
  [meLeft(0), meLeft(ME_BLOCKS[0]), meLeft(ME_BLOCKS[61]), meLeft(ME_BLOCKS[62] - 1), meLeft(ME_BLOCKS[204]), meLeft(99999)].join(), '205,204,143,143,0,0');
check('the recorded frame is the screen with 143 to go', sha(C64.renderFrame(meScreen(F, scr, ME_BLOCKS[61])).px), '7e8e76d615a68f6f017851142f4891133013f381e322a24def566e25e37aff80');
check('the tune\'s length and the load\'s, in seconds', [(2674 * 19656 / 985248).toFixed(1), (193104944 / 985248).toFixed(0)].join(), '53.3,196');

check('the page says so', ['43 seconds into the tape', 'about three and a quarter minutes later', 'counts down the 205 blocks',
  'The tune lasts 53 seconds, at full volume', 'more than three and a half times', 'Elite\'s 1985 Commando cassette',
  'from the second frame on', '464 bytes of Commodore\'s character ROM 901225-01'].filter((x) => !page.replace(/\s+/g, ' ').includes(x)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : "mercenary loading tune: the page's bytes are the cassette's, its calls 2 to 6100 sound as VICE recorded them, and its screen counts the blocks as the tape did");
process.exit(bad ? 1 : 0);
