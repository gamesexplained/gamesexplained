#!/usr/bin/env node
// Hold How it works' loading sound (the blocks en-loading-data and en-loading) to the cassette, Novagen's 1984 tape,
// the Ultimate Tape Archive's "Encounter!.tap" (335,762 bytes, SHA-256
// a1f6a9c318dca0814701b09c35575512d6f732c64cc81dbfe1f2e6b086f2d458), loaded in VICE 3.10 with vice-mcp 3.14.0 on
// 12 November 2026. The tape is not in the repository, so the test holds the page to what was recorded from it.
// - The screen: D.frame is one frame recorded with kit/c64/frame.py capture, then trim, 100 seconds in: text
//   ($D011 = $1B, $D016 = $C8) in bank 0 ($DD00 = $97), screen at $0400 and the character ROM ($D018 = $15),
//   a red border and background, no writes in the frame. `frame.py compare` found the drawing equal to VICE's own
//   picture in all 104,448 pixels. The page carries the ROM's characters the screen shows and the ten digits.
// - The loader, at $098C-$0A5D while the screen is up, sets $D400 = $F0, $D406 = $F0, $D418 = $0F, $D404, $D405,
//   $D40B and $D412 = 0, then $D404 = $21 (checkpoints on every store to the sound chip, from 38 seconds in). It
//   waits for the bytes $AA and $55, then reads 128 blocks to $3E00-$BDFF: each byte goes to memory and to $D401
//   ($09F1, $09F3), and after each 256 a sum byte, which must equal the block's bytes added up, or it jumps through
//   the reset vector ($0A05); then it takes one off the count on the screen ($0673-$0675). Two more bytes give the
//   game's start, $9C00, which it jumps to after a delay.
// - The bytes: memory dumped at that jump ($0A3F) holds the 32,768 bytes the tape brought, SHA-256 below. The game
//   copies $4000-$5FFF down to $2000 when it starts, which the listing holds; the page carries the 2,230 bytes the
//   listing does not have as loaded.
// - The timing: the stopwatch from the first byte's store at $09F3 to the 32,768th was 117,481,909 cycles. 600
//   stores in a row from $9323, on, were timed one by one (EN_GAPS, the cycles between them). The pulse lengths are
//   fitted to both: 311 cycles for a 0 and 690 for a 1.
// - The count: the first two stores to $0675 came 866,212 and 1,772,455 cycles after the first byte.
// - The end: the last byte's store, then 1,668,777 cycles to the jump to $9C00 and 148,107 more to the game's
//   first store to the sound chip, 0 to $D418 from the KERNAL's $FDC4: D.hold is the two together.
// - A sum forced wrong at $09FE, 120 seconds in, sent the machine through $FCE2 to a blank READY. screen.
// It exits 1 on any difference.
//   node games/c64/encounter/test_loading_sound.js
'use strict';
const path = require('path'), crypto = require('crypto');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('c64');
const sha = (b) => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };
const EN_GAPS = [2528,2483,2440,2860,3980,3978,4004,2507,3186,3980,3610,2484,2484,3606,2483,2483,3980,2485,3606,3977,3234,3650,2440,2858,2856,3236,3271,2819,2482,2483,3979,3979,3233,3649,3937,3981,3978,3984,3601,3277,3562,3234,2484,2483,2897,2819,3978,3979,3979,2483,3234,3648,2813,3606,3234,2904,3601,3980,3568,3228,2484,3980,3986,4016,3193,3978,3979,3986,4022,3560,3606,3984,2898,3192,3979,3606,3607,2856,3234,2483,2483,2486,2484,3234,3229,3233,3277,2819,3228,3612,3607,3271,3943,2482,3984,3602,3253,3589,3607,3236,3606,4026,3192,2897,3571,3606,2856,3233,3277,3613,3186,3612,3234,2855,3275,3571,3606,3984,3235,2862,3233,3234,3610,3606,3987,3607,3277,3569,3985,3234,3276,3607,2819,3239,3984,3234,2862,3234,2861,3613,3234,3234,3985,2910,3937,3239,3612,3235,2861,3283,2819,3612,3234,3613,3613,3277,2489,2446,3235,3240,3281,2819,3656,2818,3236,3618,2902,3947,3653,3198,2862,3990,3240,3613,2489,2488,3242,2862,2491,2489,3612,3613,3995,3240,4030,3991,3992,3569,3990,4036,3198,2909,3992,3193,3618,2864,4021,4008,3947,2490,3246,3992,3613,2494,2489,3618,2496,2487,3996,2910,3992,3954,3991,3661,3204,3619,2865,3246,3657,3204,6904,2450,3996,3994,3257,3613,3991,3996,4023,4014,3577,3246,3997,3624,2495,2868,3289,2824,3998,4002,3998,2909,3204,3623,3246,4041,3583,3246,3998,4003,3624,3247,2915,3997,3961,3996,3671,3998,3955,4005,4002,3665,3961,3997,2877,3246,4046,3624,3583,2915,3207,2502,2496,2500,2913,3210,3295,3205,3630,3292,3613,4020,3582,3252,4003,2501,4004,3631,3250,4002,3634,3295,3625,3966,3630,3252,4004,3631,2874,3256,3630,4047,3210,3631,3253,2881,3630,3629,3631,4010,3251,2880,3673,3213,3631,3631,4012,3630,3256,3631,4010,3636,3252,3631,2921,3216,4010,3634,3258,3633,3301,3629,3216,3632,4014,2879,4010,3636,4013,3630,3261,3258,2880,3635,3255,3636,3640,3300,2501,2507,3214,3258,3259,2922,3595,2928,3215,3636,2880,4016,3637,3301,2841,4014,3285,3613,2922,4016,3217,2880,3260,3686,3625,3607,4014,3258,4016,4015,4016,3643,4057,4016,3216,3643,4011,4020,4015,3307,4016,3975,4014,2884,3637,4022,4014,2508,2508,3678,2843,3307,3973,3264,4015,4020,4016,3643,3637,4063,2843,3307,4016,3598,3264,2508,4016,4022,3680,3979,4014,4022,4016,4020,3643,3264,4015,3642,2886,2885,3264,3264,4064,4016,4022,3217,3642,4020,3686,3975,3646,3264,4018,4016,3647,3264,4020,4047,4034,4020,3978,4020,4059,4021,4022,3599,4020,4042,2904,3222,4022,4015,3642,2892,3264,3259,3269,3264,3642,3641,4022,3637,3645,3264,3640,4021,3686,3221,6939,2897,3975,3686,3219,4020,3646,3686,4016,3977,3642,3265,4022,4016,3307,3600,3642,4022,3643,4016,3266,2886,3682,3601,4016,4020,3264,2886,3643,3271,3631,3646,4020,3640,3265,4016,4020,4020,3260,3686,3222,3637,4022,4014,3643,3686,3216,4018,3642,3683,4022,3216,4020,4020,4018,3637,3307,3216,2887,3642,3639,4016,4016,3640,2886,2881,3264,3283,3240,2885,3642,2880,3264,3680,2843,4014,3642,3260,2926,4016,3216,3639,3264,4019,3252,2886,3635,4015,3642,3680,4016,3216,4017,4014,4015,3637,4010,4017,3258,4056,4016,4015,3968,3258,4013,4022,4028,2860,3636,4059,4010,3595,3257,3637,4051,3973,4010,3680,3967,4057,4010,3637,4010];

const page = g.read('index.html');
const m = /<script type="application\/json" id="en-loading-data">([^<]*)<\/script>/.exec(page);
if (!m) { console.log('index.html has no en-loading-data block'); process.exit(1); }
const D = JSON.parse(m[1]);
const { enFont, enTape, enByteTime, enTimes, enLoadDriver } = g.run('index.html', 'en-loading', 'enFont', 'enTape', 'enByteTime', 'enTimes', 'enLoadDriver');

// the screen
const F = enFont(D.frame);
check('$D011, $D016, $D018, $DD00', [F.vic[0x11], F.vic[0x16], F.vic[0x18], F.cia2[0]].map((x) => x.toString(16)).join(), '1b,c8,15,97');
check('border, background', [F.vic[0x20] & 15, F.vic[0x21] & 15].join(), '2,2');
check('register writes in the frame', F.writes.length, 0);
const mem = new Uint8Array(0x10000);
for (const r of F.ram) mem.set(Buffer.from(r.b, 'base64'), r.a);
check('screen $0400-$07E7', sha(mem.subarray(0x400, 0x7E8)), '3504be834568e711ddf3d531ee016296a3e21a060541ce66eaf7153cbb98041c');
check('colour RAM', sha(Buffer.from(F.colour, 'base64').subarray(0, 1000)), '85bc7305bc34cc989a0f079446aa6a389eaf0eb51157384238d2360d57673865');
check('the count on the screen', Buffer.from(mem.subarray(D.counter, D.counter + 3)).toString('latin1'), '067');
check('ROM', F.rom_excerpt.rom, 'chargen 901225-01');
const offs = [];
for (const r of F.rom_excerpt.ranges) for (let i = 0; i < Buffer.from(r.b, 'base64').length; i += 8) offs.push(r.a + i);
const want = [...new Set([...mem.subarray(0x400, 0x7E8), ...'0123456789'.split('').map((c) => c.charCodeAt(0))])].sort((a, b) => a - b).map((c) => c * 8);
check('ROM characters: those shown and the digits, and no others', offs.sort((a, b) => a - b).join(), want.join());
check('the recorded frame, drawn', sha(C64.renderFrame(F).px), '1e14064c06e78400da8a3e9e46d08327485aab80563e72d4565b1a39a7f1e691');

// the bytes
const L = g.listing();
const B = enTape(L.ram, D);
check('from, moved', [D.from.toString(16), D.moved.map((x) => x.toString(16)).join(' ')].join(), '3e00,4000 2000 2000');
check('the 32,768 bytes, as the tape loaded them', sha(B), '72454bf27078f71541637e29ac831c81e28c9f8a92e0efa1b7217914486c1db2');
let carried = 0, needed = 0;
for (const [a, s] of D.patch) {
  const p = Buffer.from(s, 'base64');
  carried += p.length;
  for (let i = 0; i < p.length; i++) {
    const src = a + i >= D.moved[0] && a + i < D.moved[0] + D.moved[2] ? a + i - D.moved[0] + D.moved[1] : a + i;
    if (!L.has[src] || L.ram[src] !== p[i]) needed++;
  }
}
check('the page carries 2,230 bytes, each one the listing does not have as loaded', [carried, needed].join(), '2230,2230');

// the timing
check('pulses: short, long', [D.short, D.long].join(), '311,690');
const Q = enTimes(B, D);
const k0 = 0x9323 - D.from;
check('the 600 recorded stores are the bytes from $9323', EN_GAPS.length, 599);
let worst = 0;
for (let i = 1, t = 0; i < 600; i++) { t += EN_GAPS[i - 1]; worst = Math.max(worst, Math.abs(t - (Q.T[k0 + i] - Q.T[k0]))); }
check('the 600 stores, timed by the page, within 3,000 cycles of the recorded times all the way', worst < 3000, true);
check('first byte to last within 0.02 % of the 117,481,909 cycles measured', Math.abs(Q.T[B.length - 1] - 117481909) / 117481909 < 0.0002, true);
check('the count drops within 5,000 cycles of the two recorded', [Math.abs(Q.C[0] - 866212) < 5000, Math.abs(Q.C[1] - 1772455) < 5000].join(), 'true,true');
check('the hold after the last byte', D.hold, 1668777 + 148107);
check('notes a second, seconds in all', [(B.length / (Q.T[B.length - 1] / 985248)).toFixed(0), (Q.T[B.length - 1] / 985248).toFixed(1)].join(), '275,119.3');
check('a byte of zeros and one of eight 1s, in cycles', [enByteTime(0, D), enByteTime(255, D)].join(), '2488,5520');
const runs = [];
for (let k = 0; k < B.length;) { let j = k; while (j + 1 < B.length && B[j + 1] === B[k]) j++; if (j - k + 1 >= 250) runs.push([B[k], j - k + 1, 128 - (k >> 8), ((Q.T[j + 1] - Q.T[k]) / 985248).toFixed(2)]); k = j + 1; }
check('runs of 250 or more: value, length, blocks to go, seconds held', JSON.stringify(runs.filter((r) => r[0] === 255)), '[[255,276,93,"1.55"],[255,276,89,"1.55"]]');

// the driver, as sid.js calls it every D.period cycles
check('the driver is called once a raster line', D.period, 63);
const drv = enLoadDriver({ bytes: B, short: D.short, long: D.long, hold: D.hold, period: D.period });
drv.init(0);
let calls = 0, n = 0, late = 0, order = true, first = null, last = null;
while (drv.playing() && calls < 2e6) {
  const now = calls * D.period;
  drv.play();
  const w = drv.writes;
  if (!calls) first = w.slice(0, 16).join();
  for (let i = 0; i < w.length; i += 2) {
    if (w[i] === 1) {
      if (w[i + 1] !== B[n]) order = false;
      if (now < Q.T[n] || now >= Q.T[n] + D.period) late++;
      n++;
    } else if (calls) last = [w[i], w[i + 1], now];
  }
  calls++;
}
check('the loader\'s settings at the start', first, '0,240,6,240,24,15,4,0,5,0,11,0,18,0,4,33');
check('every byte to $D401, in order, each within a call of its time', [n, order, late].join(), '32768,true,0');
check('the volume to 0 a hold after the last byte', [last[0], last[1], last[2] >= Q.end && last[2] < Q.end + D.period].join(), '24,0,true');

check('the page says so', ['changes note about 275 times a second', 'a 0 is a 14-hertz rattle and <code>$FF</code> a 3,848-hertz whistle',
  'a short one of 311 cycles for a 0 and a long one of 690 for a 1', 'at 93 and again at 89 blocks to go the tape brings 276 bytes of <code>$FF</code> in a row',
  'for a second and a half each time', 'sends the C64 to its reset routine', 'the final note holds for nearly two seconds',
  '400 bytes of Commodore\'s character ROM 901225-01'].filter((x) => !page.replace(/\s+/g, ' ').includes(x)).join(' | '), '');

console.log(bad ? bad + ' difference(s)' : 'encounter loading sound: the page\'s screen is the one recorded from the tape, and its sound is the tape\'s 32,768 bytes at the tape\'s pace');
process.exit(bad ? 1 : 0);
