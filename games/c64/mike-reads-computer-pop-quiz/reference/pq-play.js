/* pq-play */
// Mike Read's Computer Pop Quiz, the Play tab's C64: the port (pq-core.js and its groups, pq-g*.js) on a clock and
// chips of its own, for play.html and for test_play.js, which runs it beside the kit's machine and compares the pace.
//
// PopQuizPlay.create({ M, files, groups, cost, keep, loadCycles, onYield }) gives the machine. M is the game's 64 KB
// as the cassette's hand-over leaves it (startRam: the title part's listing with the menu's bytes over it); files the
// tape's files by the names the game asks for (files: block 1's A, B and C from the quiz listing, the rest from
// pq-blocks.js); groups the port's installers (PQ_GROUPS); cost the measured costs (COST, below, by default); keep
// the object the page gives C64.drawFrame (C64.videoMemory); loadCycles what a file's load takes on the page.
//   run(t)     runs the port until the clock reaches cycle t (a PAL frame is 19,656 cycles)
//   joy        [port 1, port 2]: five bits each, 0 for pressed (up 1, down 2, left 4, right 8, fire 16)
//   keys       the C64's keys held, a Set of the KERNAL's numbers (row x 8 + column)
//   shown      the last whole frame, for C64.drawFrame: { vic, cia2, writes, mem, colour }
//   sound      each frame's SID writes, [register, value, ...], until the page takes them
//   loading    the block being loaded while a load lasts, else 0
//   clock, frames, vic, colour, sid, P
//
// The clock. Nothing here runs 6502 code but the music and the sound effects, which run on the kit's 6502 as the
// core says (H.driver). Each stretch of the main program between two of the port's checkpoints moves the clock on by
// what the game's own code took there on the kit's machine, measured by test_play.js --cost (@yield, by the pair of
// checkpoints; @to, by the second alone, for a pair no session met; @fn, a cost for each call of one of the port's
// routines; a line where none is known). A turn of a polling loop (a bare yield) runs the clock to the start of the
// next raster line; the busy loops the port names ({ cycles }) are their own cycles. On the way the clock takes:
// - the raster interrupt: the compare line ($D012 and $D011's bit 7) latches it, and it is taken when $D01A enables
//   it and the main program has the interrupts on. The game has them off from the hand-over to the CLI at the end of
//   menu_start ($E3F4, just before menu_flow at $E5A9) and from the SEI at $2A11 to each of Novaload's CLIs; while a
//   block loads, $D01A is 0. Each handler costs the game's mean for it (@irq, by its address, the display state for
//   irq_state, the sound for irq_frame); irq_sprite_row1 and irq_sprite_row2 first wait for their raster line, as
//   the game's do, and cost their own cycles after it;
// - the bad lines: the video chip holds the processor for 43 cycles on the lines 48-247 whose low three bits are
//   $D011's vertical scroll, in a frame whose line 48 had the display on (kit/skills/c64/c64-reference), and for
//   the sprites it fetches on each line, from cycle 55, as kit/c64/machine.js holds it (the costs are the
//   processor's own cycles, measured without either, so the page takes the video chip's from them as a C64 does);
// - the start of each frame, which closes the one before for the screen and the sound.
// A load from the tape takes loadCycles of the clock (the game asks for four files a block; the interrupts are off).
//
// The screen. Each write to the video chip and to CIA 2's port A is kept with the line and cycle it came on: the
// main program's at the clock; an interrupt handler's where the game's handler made it on the kit's machine (@at:
// the cycles from the start of the interrupt's line, or from the end of its wait for the raster, for each write in
// turn, measured on the kit's machine with the video chip's DMA, whose sprite fetches hold the handlers up just
// where the panel's rows of sprites meet), and
// its sprite pointers ($5FF8-$5FFF) are written to memory at that moment too (@ptr), so that a row of the sprite
// panel takes its shapes where the game's does. Memory and colour RAM are kept as each frame began, with every
// change after it where the game made it (site/lib/c64.js, videoMemory).
//
// The chips. CIA 1's ports read the joysticks and the keyboard as the machine's do (joystick port 1 on $DC01 with
// the keyboard's columns, port 2 on $DC00). Voice 3's oscillator ($D41B, which menu_start reads for the random seed)
// and the SID's bus are site/lib/sid.js's models (createOsc, createBus), on the page's clock.
globalThis.PopQuizPlay = (function () {
  'use strict';
  const LINE = 63, LINES = 312, FRAME = LINE * LINES;
  // measured by test_play.js --cost: see the header
  const COST = {"@yield":{"292c>2935":-7132,"2935>293e":-31181,"293e>2947":-31181,"2947>2950":-31181,"2950>2959":-31181,"2959>297a":-30116,"297a>2988":-156,"2988>2996":-5480,"2996>29a4":-156,"29a4>29b2":-5480,"29b2>29c0":-156,"29c0>29ce":-5480,"29ce>29dc":-156,"29dc>29ea":-5480,"29ea>29f8":-156,"29f8>2a12":5,"2a12>2a64":-7037,"2a64>2a70":18,"2a70>2a79":12,"2a79>2a7e":8,"2a7e>2a87":12,"2a87>2a8c":8,"2a8c>2abf":65851,"2abf>2ac4":8,"2ac4>2acd":12,"2acd>2ad2":8,"2ad2>2cf7":583,"2cd8>2ce3":14,"2ce3>2ce6":42,"2ce6>2ce9":2269,"2ce9>2cec":-1476,"2cec>2cf4":-1398,"2cf4>292c":12,"2cf7>3558":76,"2cf7>357c":76,"2cf7>38a9":76,"2cf7>38e6":76,"2cf7>395a":76,"2cf7>3965":76,"2d33>2d3c":3,"2d36>2cf7":9,"2d3c>2d4e":22,"2d3c>2d67":35,"2d4e>2d51":-2,"2d51>2d54":-2,"2d54>2d57":-2,"2d57>2d67":14,"2d67>2d6e":493,"2d6e>2d75":1147,"2d75>2d78":1143,"2d78>2db3":1510,"2d78>2dc4":1511,"2db3>2dc7":-1179,"2dc4>2dc7":-1189,"2dc7>2dcc":6,"2dcc>2dcf":93,"2dcf>2e38":206,"2e38>2e3b":82677,"2e3b>2e3e":0,"2e3e>2e53":0,"2e53>2e5a":9,"2e5a>2e93":-4232,"2e93>2e9c":-28738,"2e9c>2ea5":-28436,"2ea5>2eae":-28588,"2eae>2ec1":-29712,"2ec1>2ecf":0,"2ecf>2edd":0,"2edd>2eeb":0,"2eeb>2f05":14,"2f05>2f13":376,"2f13>2f21":376,"2f21>2f2f":376,"2f2f>2f45":388,"2f45>2f57":-807,"2f57>2f57":15974,"2f57>2f68":15947,"2f57>30ae":15977,"2f68>2f57":342,"2f68>30ae":350,"3029>3057":0,"3029>3072":0,"3029>309c":30,"3057>3064":-812,"3064>2e53":11,"3072>307f":-812,"307f>2e53":12,"309c>2d36":0,"30ae>30b1":15,"30b1>30b4":17,"30b4>30b7":-3244,"30b7>30ba":1476,"30ba>30e0":139,"30ba>311e":117,"30e0>30e3":336,"30e3>2d36":0,"311e>3171":23,"3171>3178":310,"3178>319a":334,"319a>3029":32,"3558>3584":13,"357c>3584":10,"3584>3587":489,"3587>358a":-12183,"358a>358d":93,"358d>3590":-4997,"3590>35a2":-4951,"35a2>35bd":6,"35bd>35dc":19,"35dc>35e7":-814,"35e7>360d":-779,"35e7>3620":-776,"360d>360d":2987,"360d>3620":2990,"360d>3647":2973,"3620>3639":751,"3639>360d":304,"3639>3620":307,"3639>3647":290,"3647>2d33":2,"38a9>38ac":489,"38ac>38af":-12183,"38af>38b2":-4973,"38b2>38bd":-4987,"38bd>38dd":0,"38dd>2d33":201,"38e6>38e9":489,"38e9>38ec":-12183,"38ec>38ef":-4973,"38ef>38fe":-4982,"38fe>391a":9,"391a>2d33":203,"395a>396d":13,"3965>396d":10,"396d>3974":493,"3974>3977":11838,"3977>397a":-12183,"397a>397d":-4973,"397d>3984":-4992,"3984>39b7":5,"39b7>39ce":13,"39ce>39dd":157,"39dd>39e6":-7132,"39e6>39ef":-26694,"39ef>39f8":-26842,"39f8>3a0b":-28882,"3a0b>3a19":0,"3a19>3a32":14,"3a32>3a40":376,"3a40>3a51":383,"3a51>3a60":737,"3a60>3a81":0,"3a81>3a9d":41,"3a81>3aae":51,"3a9d>3a9d":151,"3a9d>3aae":158,"3aae>2d33":301,"400>4f7":3,"40e2>400":9,"40e2>40e2":0,"4f7>4fc":7,"4fc>e2c0":14,"e2c0>e330":147,"e330>e333":-79,"e333>e336":26381,"e336>e339":93,"e339>e33c":4365,"e33c>e33f":-6067,"e33f>e342":-151,"e342>e345":10509,"e345>e368":14032,"e368>e371":-28509,"e371>e37a":-23743,"e37a>e383":-25901,"e383>e386":-29694,"e386>e3da":140,"e3da>e3e8":-1976,"e3e8>e5a9":-1972,"e5a9>e5b0":2274,"e5b0>e5b7":2,"e5b7>e5d5":13,"e5d5>e5fc":185,"e5fc>e60a":-156,"e60a>e612":-162,"e612>e61b":-6061,"e61b>e624":-28490,"e624>e62d":-28473,"e62d>e634":-23415,"e634>e646":1163,"e646>e64d":726,"e64d>e646":-39,"e64d>e65b":-48,"e65b>e67a":22,"e65b>e6b0":26,"e67a>e683":-6061,"e683>e68c":-25257,"e68c>e695":-28473,"e695>e6f2":4,"e6b0>e6b9":-6061,"e6b9>e6c2":-27194,"e6c2>e6cb":-28473,"e6cb>e6f2":0,"e6f2>e6f5":0,"e6f5>e70a":275,"e70a>e718":-6055,"e718>e721":-29002,"e721>e72a":-27709,"e72a>e737":-28359,"e737>e742":-814,"e742>e74d":-814,"e74d>e757":-816,"e757>e76a":-39,"e76a>e76a":-1157,"e76a>e77d":-1169,"e77d>e790":5498,"e790>e79f":-47,"e79f>e7b3":12,"e7b3>e7c4":-6051,"e7b3>e7eb":-6050,"e7c4>e7cd":-28441,"e7cd>e7d6":-27709,"e7d6>e819":0,"e7eb>e7f4":-28922,"e7f4>e7fd":-27709,"e7fd>e819":23,"e819>e826":-6056,"e826>e82f":-29002,"e82f>e838":-27709,"e838>e851":11,"e851>e862":-6051,"e851>e889":-6050,"e862>e86b":-28441,"e86b>e874":-27709,"e874>e8ac":0,"e889>e892":-28922,"e892>e89b":-27709,"e89b>e8ac":0,"e8ac>e8af":-3,"e8af>e8b2":-3,"e8b2>e8c0":11,"e8c0>e8c3":0,"e8c3>e8d1":32090,"e8d1>e8de":-50,"e8de>e8e1":-6067,"e8e1>e8ec":499,"e8ec>e8ef":-107,"e8ef>e8f2":-4973,"e8f2>e90f":-4965,"e90f>e916":0,"e916>e932":36,"e932>e937":-105,"e937>e93a":0,"e93a>e93d":489,"e93d>e945":-12177,"e945>e948":-582,"e948>e955":-649,"e955>e962":-6055,"e962>e975":-1169,"e975>e98d":20,"e98d>2cd8":0,"e98d>e98d":8},"@to":{"400":9,"2935":-7133,"2947":-31185,"2950":-31185,"2959":-31185,"2988":-156,"2996":-5480,"3029":33,"3057":0,"3064":-812,"3072":0,"3171":23,"3178":310,"3558":76,"3584":11,"3587":489,"3590":-4996,"3620":1987,"3639":751,"3647":737,"3965":76,"3974":493,"3977":11838,"3984":-4991,"292c":12,"293e":-31185,"297a":-30120,"29a4":-156,"29b2":-5480,"29c0":-156,"29ce":-5480,"29dc":-156,"29ea":-5480,"29f8":-156,"2a12":5,"2a64":-7038,"2a70":18,"2a79":12,"2a7e":8,"2a87":12,"2a8c":8,"2abf":65851,"2ac4":8,"2acd":12,"2ad2":8,"2cd8":0,"2ce3":14,"2ce6":42,"2ce9":2269,"2cec":-1475,"2cf4":-1397,"2cf7":50,"2d33":148,"2d36":0,"2d3c":3,"2d4e":22,"2d51":-3,"2d54":-3,"2d57":-3,"2d67":25,"2d6e":493,"2d75":1147,"2d78":1143,"2db3":1510,"2dc4":1511,"2dc7":-1184,"2dcc":6,"2dcf":93,"2e38":206,"2e3b":82677,"2e3e":0,"2e53":4,"2e5a":9,"2e93":-4232,"2e9c":-28741,"2ea5":-28439,"2eae":-28590,"2ec1":-29715,"2ecf":0,"2edd":0,"2eeb":0,"2f05":14,"2f13":376,"2f21":376,"2f2f":376,"2f45":388,"2f57":10516,"2f68":15946,"307f":-812,"309c":30,"30ae":11679,"30b1":15,"30b4":18,"30b7":-3244,"30ba":1476,"30e0":139,"30e3":336,"311e":117,"319a":334,"357c":76,"358a":-12183,"358d":93,"35a2":-4950,"35bd":6,"35dc":19,"35e7":-814,"360d":2384,"38a9":76,"38ac":489,"38af":-12183,"38b2":-4972,"38bd":-4986,"38dd":0,"38e6":76,"38e9":489,"38ec":-12183,"38ef":-4972,"38fe":-4981,"391a":9,"395a":76,"396d":11,"397a":-12183,"397d":-4972,"39b7":5,"39ce":13,"39dd":157,"39e6":-7133,"39ef":-26695,"39f8":-26843,"3a0b":-28883,"3a19":0,"3a32":14,"3a40":376,"3a51":383,"3a60":737,"3a81":0,"3a9d":114,"3aae":94,"40e2":0,"4f7":3,"4fc":7,"e2c0":14,"e330":147,"e333":-80,"e336":26381,"e339":93,"e33c":4365,"e33f":-6067,"e342":-150,"e345":10509,"e368":14032,"e371":-28514,"e37a":-23743,"e383":-25905,"e386":-29698,"e3da":140,"e3e8":-1976,"e5a9":-1972,"e5b0":2274,"e5b7":2,"e5d5":13,"e5fc":185,"e60a":-156,"e612":-162,"e61b":-6061,"e624":-28493,"e62d":-28478,"e634":-23417,"e646":161,"e64d":726,"e65b":-48,"e67a":22,"e683":-6061,"e68c":-25259,"e695":-28478,"e6b0":26,"e6b9":-6061,"e6c2":-27197,"e6cb":-28478,"e6f2":2,"e6f5":0,"e70a":275,"e718":-6055,"e721":-29005,"e72a":-27712,"e737":-28361,"e742":-814,"e74d":-814,"e757":-816,"e76a":-1063,"e77d":-1169,"e790":5498,"e79f":-47,"e7b3":12,"e7c4":-6051,"e7cd":-28443,"e7d6":-27712,"e7eb":-6050,"e7f4":-28925,"e7fd":-27712,"e819":12,"e826":-6056,"e82f":-29005,"e838":-27712,"e851":11,"e862":-6051,"e86b":-28443,"e874":-27712,"e889":-6050,"e892":-28925,"e89b":-27712,"e8ac":0,"e8af":-3,"e8b2":-3,"e8c0":11,"e8c3":0,"e8d1":32090,"e8de":-50,"e8e1":-6067,"e8ec":499,"e8ef":-106,"e8f2":-4972,"e90f":-4964,"e916":0,"e932":36,"e937":-104,"e93a":0,"e93d":489,"e945":-12177,"e948":-581,"e955":-648,"e962":-6055,"e975":-1169,"e98d":10},"@fn":{"build_answers":25,"clear_bitmap_cells":8456,"clear_bitmap_strip":29783,"clear_block_colours":2357,"clear_bubble":4272,"clear_choice_area":8039,"clear_panel":15042,"clear_play_colours":13269,"colour_face_block":2493,"draw_centre":5512,"draw_clock":8456,"draw_frame_block":9293,"draw_frame_tiles":13748,"draw_glyph":3070,"draw_grid_number":715,"draw_left_team":300,"draw_right_team":300,"draw_show_frame":20344,"fill_colour_block":719,"flash_choice":12,"grid_setup":8171,"highlight_cell":500,"highlight_icon":363,"irq_setup":583,"pause_frames":9,"pause_state12":9,"print_text":26712,"put_pixel_bar":10185,"score_digits_frame":2269,"scores_reset":42,"shuffle_number_order":7252,"text_decode":14,"text_print":575},"@irq":{"403":164,"47d":166,"646#fx":219,"646#music":913,"7a4#0":1839,"7a4#1":1437,"7a4#10":3216,"7a4#11":1832,"7a4#12":187,"7a4#13":4767,"7a4#14":1053,"7a4#2":1387,"7a4#4":12134,"7a4#5":445,"7a4#6":12134,"7a4#7":3571,"7a4#8":187,"7a4#9":3551,"all":3079,"be7":528},"@wait":{"403":21,"47d":22},"@at":{"403":[56,66,76,98,127,137,147,159],"47d":[64,74,84,117,127,137,147,180],"646#fx":[42,48,67],"646#music":[42,48,67],"7a4#0":[62,79,88,1638,1644,1648,1652,1658,1662,1666,1670,1676,1718,1738,1758,1778,1798,1818,1838,1858],"7a4#1":[63,80,89,1169,1175,1179,1183,1189,1193,1197,1201,1207,1238,1258,1278,1298,1318,1338,1358,1378],"7a4#10":[31,37,46,3368,3374,3378,3382,3388,3392,3396,3400,3406,3440,3460,3486,3506,3526,3546,3566,3586],"7a4#12":[79,85,94,235],"7a4#13":[31,37,46,5206],"7a4#14":[76,82,91,1230],"7a4#2":[76,82,91,240,246,250,265,271,275,279,283,289,331,351,371,402,422,442,473,493],"7a4#4":[52,58,78,180,184,190,222,238,254,281,297,313,340,356,372,398,414,430,457,473,489,505,662,672,682,692,711,721,731,741,13256],"7a4#5":[31,37,46,290,294,301,308,425,473],"7a4#6":[31,37,46,159,163,169,190,217,233,249,276,292,308,335,351,367,394,410,426,442,469,485,646,656,666,676,686,707,717,727,13120],"7a4#7":[31,37,46,3392,3398,3402,3406,3412,3416,3420,3424,3430,3461,3481,3501,3521,3541,3561,3581,3601],"7a4#8":[31,37,46,187],"7a4#9":[62,79,88,3373,3379,3383,3387,3393,3397,3401,3416,3422,3453,3484,3504,3524,3555,3575,3606,3626],"be7":[26,30,36,51,62,76,90,104,118,132,146,160,174,188,202,216,230,244,258,272,398,408,418,428,438,448,501,511,543]},"@ptr":{"403":[62,72,82,123,133,143,153,246],"47d":[70,80,90,123,133,143,153,186],"7a4#0":[1879,1895,1911,1927,1943,1959,1975,1991],"7a4#1":[1399,1415,1431,1447,1463,1479,1495,1511],"7a4#10":[3607,3623,3639,3655,3671,3687,3703,3719],"7a4#2":[524,540,556,583,599,615,631,658],"7a4#4":[649,627,613,599,585,560,546,532],"7a4#5":[314],"7a4#6":[622,608,594,569,555,541,527,502],"7a4#7":[3622,3638,3654,3670,3686,3702,3718,3734],"7a4#9":[3647,3674,3690,3706,3733,3749,3765,3781],"be7":[385,371,357,343,329,315,301,287]}};
  // the handlers that wait for a raster line before they write: where the line is
  const WAITS = { 0x0403: 0x0408, 0x047D: 0x0482 };
  // a load from the tape: half a second a file on the page; block_choice's checkpoints from SETMSG to the last LOAD
  const LOAD = 492624;
  const LOADS = new Set([0x2A64, 0x2A70, 0x2A79, 0x2A7E, 0x2A87, 0x2A8C, 0x2ABF, 0x2AC4, 0x2ACD, 0x2AD2]);

  const hex = (n) => '$' + n.toString(16).toUpperCase().padStart(4, '0');
  const unb64 = (s) => (typeof atob === 'function' ? Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) : Uint8Array.from(Buffer.from(s, 'base64')));
  // the game's memory at the hand-over: the title part with the menu's bytes over it (T, MN as C64.load gives them)
  function startRam(T, MN) {
    const ram = new Uint8Array(0x10000);
    ram.set(T.ram);
    for (let a = 0; a < 0x10000; a++) if (MN.has[a]) ram[a] = MN.ram[a];
    return ram;
  }
  // the tape's files by name: [load address, bytes]; block 1's A, B and C from the quiz listing (Q), the rest from
  // pq-blocks.js (B)
  function files(Q, B) {
    const out = {};
    for (const [k, [at, s]] of Object.entries(B.files)) out[k] = [at, unb64(s)];
    out.A = [0xE000, Q.ram.slice(0xD000, 0xE000)];      // loaded at $E000; the game copies it to $D000, where the listing holds it
    out.B = [0xB800, Q.ram.slice(0xB800, 0xD000)];
    out.C = [0xE000, Q.ram.slice(0xE000, 0xFF00)];
    return out;
  }
  // an interrupt's cost key: its handler, with the display state for irq_state and the sound for irq_frame
  const irqKey = (M, at) => at === 0x07A4 ? '7a4#' + M[0x22] : at === 0x0646 ? '646#' + (M[0x33FE] ? 'fx' : 'music') : at.toString(16);

  function create(o) {
    const M = o.M, cost = o.cost || COST, YIELD = cost['@yield'] || {}, TO = cost['@to'] || {}, FN = cost['@fn'] || {};
    const IRQ = cost['@irq'] || {}, AT = cost['@at'] || {}, PTR = cost['@ptr'] || {}, WAITAT = cost['@wait'] || {};
    const loadCycles = o.loadCycles === undefined ? LOAD : o.loadCycles;
    const vic = new Uint8Array(64), colour = new Uint8Array(1024), sid = new Uint8Array(32);
    vic[0x11] = 0x1B; vic[0x16] = 0xC8; vic[0x18] = 0x15; vic[0x20] = 0x0E; vic[0x21] = 0x06;   // as the KERNAL leaves them
    const cia2 = [0x97, 0x3F];
    const joy = [0x1F, 0x1F], keys = new Set();
    const S = { clock: 0, frames: 0, shown: null, sound: [], joy, keys, vic, colour, sid, M, loading: 0, yields: 0 };
    const E = globalThis.C64Sid ? globalThis.C64Sid.engine() : null;
    const bus = E ? E.createBus('8580') : null, osc = E ? E.createOsc('8580') : null;
    let pra = 0x7F, ddra = 0xFF, ddrb = 0;                  // CIA 1's ports as the KERNAL leaves them
    const rows = new Uint8Array(8);                         // each sprite's lines still to fetch
    let done = -1, latch = 0, iflag = 1, badFrame = false, owed = 0, inIrq = false, loadUntil = -1;
    const vm = globalThis.C64 && globalThis.C64.videoMemory ? globalThis.C64.videoMemory(M, colour, { keep: o.keep }) : null;
    const begin = (n) => {
      const m = vm ? vm.begin() : {};
      return { frame: n, vic: Array.from(vic.subarray(0, 47)), cia2: cia2.slice(), writes: [], mem: m.mem, colour: m.colour };
    };
    let cur = begin(0), curSound = [];
    const moved = () => { if (vm) vm.at(S.clock, cur.writes, 0); };
    const line = () => Math.floor((S.clock % FRAME) / LINE);
    const cmp = () => vic[0x12] | (vic[0x11] & 0x80) << 1;

    // where an interrupt's k-th write to the video chip falls: its handler's measured place, else 6 cycles apart
    let irqBase = 0, irqK = 0, irqAt = null;
    function record(a, v) {
      let t = S.clock;
      if (inIrq) { t = irqBase + (irqAt && irqK < irqAt.length ? irqAt[irqK] : (irqAt && irqAt.length ? irqAt[irqAt.length - 1] : 4) + 6 * (irqK - (irqAt ? irqAt.length : 0) + 1)); irqK++; }
      t = Math.max(t, 0);
      cur.writes.push([Math.floor((t % FRAME) / LINE), t % LINE + 1, a, v]);
    }
    const io = {
      vicRead(r) {
        r &= 0x3F;
        if (r === 0x11) return (vic[0x11] & 0x7F) | (line() & 0x100) >> 1;
        if (r === 0x12) return line() & 255;
        if (r === 0x19) return latch | 0x70 | (latch & vic[0x1A] & 15 ? 0x80 : 0);
        if (r === 0x1A) return vic[0x1A] | 0xF0;
        return r > 0x2E ? 0xFF : vic[r];
      },
      vicWrite(r, v) {
        r &= 0x3F;
        if (r === 0x19) { latch &= ~v & 15; return; }
        vic[r] = v;
        if (r !== 0x12 && r !== 0x1A) record(0xD000 + r, v);
      },
      sidRead(r) { r &= 0x1F; return bus ? bus.read(r, S.clock, r === 0x1B && osc ? osc.read(S.clock) : 0) : 0; },
      sidWrite(r, v) {
        r &= 0x1F;
        sid[r] = v;
        if (bus) { bus.write(v, S.clock); osc.write(r, v, S.clock); }
        curSound.push(r, v);
      },
      colourRead(i) { return colour[i & 0x3FF] | 0xF0; },
      colourWrite(i, v) { colour[i & 0x3FF] = v & 15; },
      ciaRead(r) {
        r &= 15;
        if (r === 0) return (ddra ? (pra | ~ddra) & 0xFF : 0xE0 | joy[1]) & (0xE0 | joy[1]);
        if (r === 1) {
          let v = 0xFF;
          const rows = ddra ? pra & ddra : 0xFF;
          for (const k of keys) if (!(rows & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
          return v & (0xE0 | joy[0]) & 0xFF;
        }
        if (r === 2) return ddra;
        if (r === 3) return ddrb;
        return 0;
      },
      ciaWrite(r, v) { r &= 15; if (r === 0) pra = v; else if (r === 2) ddra = v; else if (r === 3) ddrb = v; },
      cia2Read(r) { r &= 15; return r === 0 ? (cia2[0] | ~cia2[1]) & 0xFF : r === 2 ? cia2[1] : 0; },
      cia2Write(r, v) {
        r &= 15;
        if (r === 0 || r === 2) { cia2[r >> 1] = v; record(0xDD00 + r, v); }
      },
      read(a) {
        if (a < 0xD400) return io.vicRead(a);
        if (a < 0xD800) return io.sidRead(a);
        if (a < 0xDC00) return io.colourRead(a - 0xD800);
        if (a < 0xDD00) return io.ciaRead(a);
        if (a < 0xDE00) return io.cia2Read(a);
        return 0;
      },
      write(a, v) {
        if (a < 0xD400) io.vicWrite(a, v);
        else if (a < 0xD800) io.sidWrite(a, v);
        else if (a < 0xDC00) io.colourWrite(a - 0xD800, v);
        else if (a < 0xDD00) io.ciaWrite(a, v);
        else if (a < 0xDE00) io.cia2Write(a, v);
      },
      irqByte: (a) => M[a],
      store: (a, v) => { M[a] = v & 255; },
    };

    const P = globalThis.PopQuizCore.makePort(M, o.groups, { files: o.files || {}, cpu: o.cpu });
    P.io = io; P.clocked = true;
    S.P = P;
    // each call of one of P's routines from the main program moves the clock on by its cost (@fn)
    for (const k of Object.keys(P)) {
      const f = P[k];
      if (typeof f !== 'function' || k === 'program') continue;
      P[k] = function (...a) { if (!inIrq) owed += FN[k] || 0; return f.apply(this, a); };
    }
    // a load from the tape: Novaload's exit turns the interrupts on (CLI); the page takes loadCycles over it
    const load = P.K.load;
    P.K.load = function () {
      const r = load();
      iflag = 0;
      if (loadCycles) { owed += loadCycles; S.loading = M[0x075F] + 1; loadUntil = -2; }   // until the cycles are spent
      return r;
    };

    function newFrame(n) {
      S.shown = cur; S.frames = n;
      cur = begin(n);
      S.sound.push(curSound); curSound = [];
      if (S.sound.length > 100) S.sound.splice(0, S.sound.length - 100);
    }
    // the sprite pointers an interrupt handler wrote, put in memory where the game's handler writes them
    const ramq = [];
    // the interrupt, through the vector at $FFFE: its cycles
    function irq() {
      const at = M[0xFFFE] | M[0xFFFF] << 8, f = P.irqs[at];
      if (!f) throw new Error('no handler for the interrupt at ' + hex(at));
      const key = irqKey(M, at);
      let wait = 0;
      irqBase = S.clock;
      if (WAITS[at]) {
        // the handler's own wait for its line: to the cycle the game's loop leaves on, a frame on if the line has gone
        const wl = M[WAITS[at]], f0 = S.clock - S.clock % FRAME, exit = WAITAT[at.toString(16)] || 5;
        let t = f0 + wl * LINE + exit;
        if (t < S.clock + 20) t += FRAME;
        wait = t - S.clock;
        irqBase = t;
      }
      irqK = 0; irqAt = AT[key] || AT[at.toString(16)] || null;
      const ptr = M.slice(0x5FF8, 0x6000);
      inIrq = true;
      try { f.call(P); } finally { inIrq = false; }
      const pat = PTR[key] || PTR[at.toString(16)];
      for (let i = 0; i < 8; i++) {
        const v = M[0x5FF8 + i];
        if (v === ptr[i]) continue;
        M[0x5FF8 + i] = ptr[i];
        ramq.push([irqBase + (pat && pat[i] !== undefined ? pat[i] : 0), 0x5FF8 + i, v]);
      }
      ramq.sort((a, b) => a[0] - b[0]);
      const c = IRQ[key] !== undefined ? IRQ[key] : IRQ[at.toString(16)] !== undefined ? IRQ[at.toString(16)] : IRQ.all || 0;
      return wait + c;
    }
    // the next cycle 12 after done of line 48, where the frame's display bit is read, or of a line whose low bits
    // are the vertical scroll as it stands, up to line 247
    function nextBad() {
      const f0 = Math.floor(done / FRAME) * FRAME, ys = vic[0x11] & 7;
      let ln = Math.max(48, Math.floor((done - f0 - 11) / LINE) + 1);
      if (ln > 48) ln += (ys - ln) & 7;
      return ln <= 247 ? f0 + ln * LINE + 11 : f0 + FRAME + 48 * LINE + 11;
    }
    // Run the processor through `work` cycles, and on to cycle `until` if that is later (a wait), taking the frames,
    // the interrupts, the bad lines and the handlers' sprite pointers on the way; an interrupt's cycles and a bad
    // line's while there is work to do are more work.
    function spend(work, until) {
      for (let n = 0; ; n++) {
        if (n > 100000) throw new Error('the clock went round 100,000 times in one stretch');
        if (!iflag && (latch & vic[0x1A] & 1)) { work += irq(); continue; }
        const f0 = Math.floor(done / FRAME) * FRAME, f = f0 + FRAME, c = cmp();
        let i = Infinity;
        if (c < LINES) { i = f0 + c * LINE; if (i <= done) i += FRAME; }
        const b = o.dma === false ? Infinity : nextBad(), q = ramq.length ? Math.max(ramq[0][0], done + 1) : Infinity;
        let sp = Infinity;
        if (o.dma !== false) { sp = done - done % LINE + 54; if (sp <= done) sp += LINE; }
        const e = Math.min(f, i, b, q, sp), end = Math.max(S.clock + work, until);
        if (e > end) { S.clock = end; done = end; moved(); break; }
        if (e > S.clock) { work = Math.max(0, work - (e - S.clock)); S.clock = e; }
        done = e;
        moved();
        if (f === e) newFrame(e / FRAME);
        if (b === e) {
          const ln = (e % FRAME - 11) / LINE;
          if (ln === 48) badFrame = (vic[0x11] & 0x10) !== 0;
          if (badFrame && (ln & 7) === (vic[0x11] & 7) && work > 0) work += 43;   // a wait's polls lose the cycles, not the wait
        }
        if (sp === e) {
          // cycle 55: the sprites the chip fetches on this line, as kit/c64/machine.js holds the processor for them
          // (from 3 cycles before each fetch; the holds of sprites close together run into one)
          const ln = Math.floor((e % FRAME) / LINE);
          let held = 0, h0 = -1, h1 = -1;
          for (let k = 0; k < 8; k++) {
            if (!rows[k] && (vic[0x15] >> k & 1) && vic[1 + 2 * k] === (ln & 255)) rows[k] = vic[0x17] >> k & 1 ? 42 : 21;
            if (!rows[k]) continue;
            rows[k]--;
            const first = 2 * k, last = first + 4;
            if (h0 >= 0 && first <= h1) h1 = last;
            else { if (h0 >= 0) held += h1 - h0 + 1; h0 = first; h1 = last; }
          }
          if (h0 >= 0) held += h1 - h0 + 1;
          if (work > 0) work += held;
        }
        if (q === e) while (ramq.length && ramq[0][0] <= e) { const [, a, v] = ramq.shift(); M[a] = v; }
        if (i === e) latch |= 1;
      }
      while (ramq.length) { const [, a, v] = ramq.shift(); M[a] = v; }
    }

    const gen = P.program();
    let last = 0x40E2;                                      // the stretch from the hand-over is $40E2's
    function step() {
      const r = gen.next();
      if (r.done) throw new Error('the program ended');
      const y = r.value;
      S.yields++;
      // a load is over once its cycles are spent and the program has gone on past the block's last file
      if (loadUntil >= 0 && S.clock >= loadUntil && !(y && y.cp !== undefined && LOADS.has(y.cp))) { S.loading = 0; loadUntil = -1; }
      if (o.onYield) o.onYield(y, S.clock);
      if (y && y.cycles !== undefined) { owed += y.cycles; const w = owed; owed = 0; spend(w, -1); return; }
      if (y && y.cp !== undefined) {
        const c = YIELD[last.toString(16) + '>' + y.cp.toString(16)], e = TO[y.cp.toString(16)];
        owed += c !== undefined ? c : e !== undefined ? e : LINE;
        last = y.cp;
        if (y.cp === 0xE5A9) iflag = 0;                     // menu_start's CLI ($E3F4)
        if (y.cp === 0x2A12) iflag = 1;                     // block_choice's SEI ($2A11)
        const w = Math.max(0, owed); owed = 0;
        spend(w, -1);
        if (loadUntil === -2) loadUntil = S.clock;
        return;
      }
      // a turn of a polling loop: the work before it, then to the start of the next line
      const w = Math.max(0, owed); owed = 0;
      spend(w, -1);
      spend(0, (Math.floor(S.clock / LINE) + 1) * LINE);
    }
    S.run = function (t) {
      for (let n = 0; S.clock < t; n++) {
        if (n > 400000) throw new Error('the port ran 400,000 yields without the clock reaching its target');
        step();
      }
    };
    S.step = step;
    spend(0, 0);
    return S;
  }
  return { create, startRam, files, irqKey, COST, LINE, LINES, FRAME, LOAD, WAITS };
})();
if (typeof module !== 'undefined') module.exports = globalThis.PopQuizPlay;
