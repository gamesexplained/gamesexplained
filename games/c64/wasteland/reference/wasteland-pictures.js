/* pictures/pictures.js */
/* Wasteland (C64): the animated pictures. A port of the engine's picture code, which draws a
   picture's base frame into the bitmap and then runs up to four animation channels, each a script
   of XOR frames. The title is drawn from the bytes the Source tab shows, the start-up's listing
   (it unpacks its picture at $8A00 and patches it there); each portrait from its bytes in
   PORTRAIT_BYTES below, as load_portrait ($2631) unpacked them from the disk. Checked against
   the game's own code on the kit's 6502 simulator by test_pictures.js (in the game's work/
   folder) and test_portraits.js (in the game's folder). Also writes a picture's animation as a GIF. The How it works and Maps pages each
   carry a copy of this script.
   Defines one global, WLPictures; needs ../../lib/c64.js (C64.load, C64.PAL) on the page. */
globalThis.WLPictures = (function () {
  'use strict';

  // ---- the screen the pictures are drawn into -----------------------------------------------
  // A multicolour bitmap at $6000 with its colours in the screen matrix at $5C00 (VIC bank 1,
  // $D018 = $78, $D016 = $18, $D011 = $37): pixel pair %00 shows the background $D021, %01 the
  // matrix byte's high nibble, %10 its low nibble and %11 the cell's colour RAM nibble.
  const BITMAP = 0x6000, MATRIX = 0x5C00;
  // Chip state, in no listing: $D021 = 0 and all 1024 colour RAM nibbles = 1 in play-title,
  // play-ranger and play-map (the VIC-II module of each snapshot) and in frame-map.json.
  const BACKGROUND = 0, COLOUR_RAM = 1;

  const hex = (n, w = 4) => '$' + (n >>> 0).toString(16).toUpperCase().padStart(w, '0');

  // The bitmap address of pixel row y of character column x: bitmap_line_address ($2387) takes
  // $6000 + 320 x (y / 8) from the tables at $049F/$04B7 and adds y AND 7, then add_column
  // ($23A7) adds 8 x x from the tables at $044F/$0477 (engine part). The tables hold text rows
  // 0-23 and columns 0-39; past them the engine reads other bytes as addresses, which no picture
  // asks for, so the port stops there instead.
  function bitmapAddress(x, y) {
    if (x > 39 || y > 191) throw new RangeError('picture byte outside the tables: column ' + x + ', pixel row ' + y);
    return BITMAP + 320 * (y >> 3) + (y & 7) + 8 * x;
  }

  // ---- the picture code (engine $0549-$06E0) ------------------------------------------------
  class Engine {
    constructor(m) {
      this.m = m;                          // 64 KB: the picture's buffer, and the bitmap it draws in
      this.base = 0;                       // $B9/$BA picture_base, the picture's buffer
      this.left = 0; this.top = 0;         // $C1 picture_left, $BF picture_top
      this.right = 0; this.bottom = 0;     // $C2 picture_right, $C0 picture_bottom
      this.ptr = [0, 0, 0, 0];             // $0549-$0550 picture_channel_ptr, each script's next entry
      this.delay = [0, 0, 0, 0];           // $DA-$DD channel_delays
      this.enable = [1, 1, 1, 1];          // $5BFB-$5BFE, a channel runs only while its byte is not 0
      this.pre = 0; this.preHi = 0;        // $B1 picture_prescaler, $B2 picture_prescaler_hi
      this.stream = 0;                     // $06C5/$06C6 stream_ptr, read_picture_byte's operand
      this.runCount = 0;                   // $068A frame_run_count, an operand the decoder rewrites
      this.runValue = 0;                   // $06A9 frame_run_value, likewise; kept from frame to frame
      this.tickChannel = 0;                // $063C tick_channel
      this.channel = -1;                   // the channel whose frame is being drawn; -1 the base frame
      this.onWrite = null;                 // f(address, value, channel): every bitmap byte the decoder writes
      this.ticks = 0; this.steps = 0;      // counts for the page: calls of the tick, passes of the channels
      this.cue = null;                     // { first, at, then }: the switches a caller sets, as module 4 does
    }

    // read_picture_byte ($06C4): the byte at the stream pointer, which moves on.
    read() {
      const v = this.m[this.stream];
      this.stream = (this.stream + 1) & 0xFFFF;
      return v;
    }

    // The header word at buffer + y, plus the buffer's address, as the engine adds them: the low
    // bytes with CLC/ADC, then the high bytes with the carry (the reads between keep it).
    headerWord(y) {
      const m = this.m, b = this.base;
      const lo = m[(b + y) & 0xFFFF] + (b & 0xFF);
      const hi = (m[(b + y + 1) & 0xFFFF] + (b >> 8) + (lo >> 8)) & 0xFF;
      return hi << 8 | (lo & 0xFF);
    }

    // reset_channel_script ($06D0): channel x's script pointer = header word 6 + 2x + the buffer.
    resetScript(x) {
      this.ptr[x] = this.headerWord(6 + 2 * x);
      return this.ptr[x] >> 8;              // the BNE after the call at $0646 tests this byte
    }

    // start_picture ($0586): the area from header bytes 0-3, each channel at the start of its
    // script with a delay of 1, the prescaler's high count 1, the base frame (header word 4)
    // drawn by storing; then it falls into one tick ($05C5).
    start(base) {
      const m = this.m;
      this.base = base & 0xFFFF;
      this.left = m[this.base]; this.top = m[(this.base + 1) & 0xFFFF];
      this.right = m[(this.base + 2) & 0xFFFF]; this.bottom = m[(this.base + 3) & 0xFFFF];
      for (let x = 0; x < 4; x++) { this.resetScript(x); this.delay[x] = 1; }
      if (this.cue) this.enable = this.cue.first.slice();
      this.preHi = 1;
      this.stream = this.headerWord(4);
      this.channel = -1;
      this.decode(false);                  // draw_frame_store ($064E)
      return this.tick();
    }

    // animate_picture_tick ($05C5), with the animation on ($AC) and no reload ($C5 set, as the
    // title has it; in play the reload test at $05C9-$05D8 finds the picture still there). A
    // prescaler lets one call in 512 through ($B1 counts 256, $B2 two). Then each enabled channel
    // counts its delay down, and when it reaches 0 reads its next script entry: $FF starts the
    // script again; otherwise a delay byte and a frame offset, and that frame is XORed onto the
    // bitmap. Returns what each channel did on a pass, or null when the prescaler held it back.
    tick() {
      this.ticks++;
      this.pre = (this.pre - 1) & 0xFF;
      if (this.pre) return null;
      this.preHi = (this.preHi - 1) & 0xFF;
      if (this.preHi) return null;
      this.preHi = 2;
      this.steps++;
      if (this.cue && this.steps === this.cue.at + 1) this.enable = this.cue.then.slice();
      const done = [];
      for (let x = 0; x < 4; x++) {
        this.tickChannel = x;
        if (!this.enable[x & 3]) continue;                       // $05EB
        this.delay[x] = (this.delay[x] - 1) & 0xFF;              // $05F0
        if (this.delay[x]) continue;
        let restarted = false;
        for (;;) {                                               // $05F4
          const y = 6 + 2 * x;
          this.stream = this.ptr[x];
          const m = this.m, b = this.base;
          if (!(m[(b + y) & 0xFFFF] | m[(b + y + 1) & 0xFFFF])) break;   // no script: header word 0
          const entry = this.stream;
          const d = this.read();
          if (d === 0xFF) {                                      // $0643: back to the script's start
            restarted = true;
            if (this.resetScript(x)) continue;
            // A script address with a high byte of 0 falls into draw_frame_xor at $0648, whose
            // RTS ends the whole tick. No buffer lies in zero page, so no picture gets here.
            this.channel = x; this.decode(true);
            done.push({ ch: x, entry, frame: -1, delay: this.delay[x], restarted, ended: true });
            return done;
          }
          this.delay[x] = d;
          const lo = this.read() + (b & 0xFF);                   // CLC, ADC $B9
          const hi = (this.read() + (b >> 8) + (lo >> 8)) & 0xFF; // ADC $BA with that carry
          this.ptr[x] = this.stream;                             // $0624-$062D
          this.stream = hi << 8 | (lo & 0xFF);                   // $0630-$0635
          const frame = this.stream;
          this.channel = x;
          this.decode(true);                                     // draw_frame_xor ($0648)
          done.push({ ch: x, entry, frame, delay: d, restarted });
          break;
        }
      }
      return done;
    }

    // Ticks until the prescaler lets one through: one pass of the channels. Returns its record.
    step() {
      for (let i = 0; i < 0x20000; i++) { const r = this.tick(); if (r) return r; }
      throw new Error('the prescaler never let a tick through');
    }

    // decode_picture_frame ($0651), entered from draw_frame_xor ($0648, xor true: EOR abs patched
    // in at $06AD and a NOP at $0692, so a $00 data byte ends the block) or draw_frame_store
    // ($064E, xor false: BIT abs at both, so $00 is drawn like any other byte). Byte 0 of a frame
    // is a run count still to write; then blocks of a column, a pixel row and an escape value,
    // each followed by data bytes written down the column, wrapping from the area's last pixel
    // row to its first one column on. A data byte equal to the escape value is followed by a run
    // count and a run value. A column of $FF ends the frame, and so does writing the area's last
    // row of its last column.
    decode(xor) {
      const m = this.m;
      this.runCount = this.read();                               // $0657
      for (;;) {
        let x = this.read();                                     // $065D: a block
        if (x === 0xFF) return;
        let y = this.read();
        const esc = this.read();
        for (;;) {                                               // $066F: the next byte of the block
          const a = bitmapAddress(x, y);
          let v;
          for (;;) {                                             // $0689
            if (this.runCount) {                                 // $06A8: one more of the run
              v = this.runValue; this.runCount = (this.runCount - 1) & 0xFF; break;
            }
            v = this.read();                                     // $068D
            if (xor && v === 0) { v = -1; break; }               // $0690-$0693: the block ends
            if (v !== esc) break;                                // $0695
            this.runCount = this.read();                         // $0699: a run
            this.runValue = this.read();
          }
          if (v < 0) break;
          const nv = xor ? v ^ m[a] : v;                         // $06AD EOR or BIT, $06B0 STA
          m[a] = nv;
          if (this.onWrite) this.onWrite(a, xor ? v : nv, this.channel);
          if (y !== this.bottom) {                               // $06B3
            y = (y + 1) & 0xFF;
            if (y) continue;
          }
          if (x === this.right) return;                          // $06BA
          y = this.top;
          x = (x + 1) & 0xFF;
          if (!x) return;                                        // $06C1 BNE not taken: RTS
        }
      }
    }

    // The engine's variables, by their addresses, for the test and the page's readout.
    vars() {
      const v = {
        0xB1: this.pre, 0xB2: this.preHi, 0xB9: this.base & 0xFF, 0xBA: this.base >> 8,
        0xBF: this.top, 0xC0: this.bottom, 0xC1: this.left, 0xC2: this.right,
        0x06C5: this.stream & 0xFF, 0x06C6: this.stream >> 8, 0x068A: this.runCount, 0x06A9: this.runValue,
        0x063C: this.tickChannel,
      };
      for (let x = 0; x < 4; x++) {
        v[0xDA + x] = this.delay[x];
        v[0x0549 + 2 * x] = this.ptr[x] & 0xFF; v[0x054A + 2 * x] = this.ptr[x] >> 8;
      }
      return v;
    }
  }

  // ---- what each channel has drawn ----------------------------------------------------------
  // The page's switches leave a channel's frames out of the picture. Every frame a channel draws
  // is XORed onto the bitmap, and XOR undoes itself, so the picture without channel x is the
  // bitmap XOR everything channel x has XORed in since the base frame. Layers keeps that, per
  // channel, and the bytes each channel's latest frame changed (for the page's marks). The
  // engine's own switch, $5BFB+X, stops a channel instead: its script and delay stand still.
  class Layers {
    constructor(eng) {
      this.acc = [0, 1, 2, 3].map(() => new Uint8Array(8000));
      this.reset();
      eng.onWrite = (a, v, ch) => {
        if (ch < 0 || !v) return;                // the base frame, or a byte XORed with 0
        this.acc[ch][a - BITMAP] ^= v;
        this.pending[ch].push(a);
      };
    }
    reset() {
      this.acc.forEach(a => a.fill(0));
      this.pending = [[], [], [], []]; this.last = [[], [], [], []];
      this.frames = [-1, -1, -1, -1]; this.restarts = [0, 0, 0, 0];
    }
    // after a pass (the list tick() returned): each channel that drew keeps its frame's bytes
    record(done) {
      if (!done) return;
      for (const d of done) {
        this.frames[d.ch] = d.frame;
        if (d.restarted) this.restarts[d.ch]++;
        this.last[d.ch] = this.pending[d.ch];
      }
      this.pending = [[], [], [], []];
    }
    // the bytes to XOR onto the bitmap to take out the channels hidden[x]; null for none
    mask(hidden) {
      if (!hidden.some(Boolean)) return null;
      const m = new Uint8Array(8000);
      hidden.forEach((h, ch) => { if (h) { const a = this.acc[ch]; for (let i = 0; i < 8000; i++) m[i] ^= a[i]; } });
      return m;
    }
  }

  // ---- the pictures this page can draw ------------------------------------------------------
  // The title: the start-up unpacks it to $8A00 (startup $7FDA-$7FFE) and sets its last column
  // to 32 ($8001), so that it stops short of the logo in columns 33-36. The listing holds it as
  // it is then. The portraits: PORTRAIT_BYTES below holds each one's bytes as load_portrait
  // ($2631) leaves them in its buffer, from the buffer's start to the last byte the picture code
  // reads (facts.md, "The portraits"). A picture number with bit 7 clear goes to $CA00, with bit 7
  // set to $E000; each is placed where the code that shows it asks for it. Pictures
  // 0-3 and 59 at $E000: the doctor (module-0 $CA15), the shop (module-1 $CA1E), the library
  // (module-2 $CA15), the Ranger Center (ranger $7E13) and the Grim Reaper (death $7E13), each
  // through show_picture_e000 ($041C). Picture 8, the radio (radio $7EB7, $7FA0) and the fights'
  // picture when no monster is in reach (game $B91E); 11, a promotion (radio $7EEB, $7FBE).
  // Every other number is named by byte 7 of monster records in the maps (encounter_portrait,
  // game $B91E), which the name here samples; 37 and 75 by nothing found.
  // [picture, buffer, what shows it]
  const PORTRAITS = [
    [0, 0xE000, "the doctor"],
    [1, 0xE000, "the shop"],
    [2, 0xE000, "the library"],
    [3, 0xE000, "the Ranger Center"],
    [4, 0xCA00, "Tronodile, Clawer Leader, Clawman…"],
    [5, 0xCA00, "New Waver, Punker, Spiker…"],
    [6, 0xCA00, "Wasteland Warrior, Rail Raider, Red Ryder…"],
    [7, 0xCA00, "Shambler Ghoul, Lost Soul, Pit Ghoul"],
    [8, 0xCA00, "the radio"],
    [9, 0xCA00, "Silicon Sniper, Hunter, Killer…"],
    [10, 0xCA00, "Wild Canine, Dire Coyote, Nuke Pooch…"],
    [11, 0xCA00, "a promotion, on the radio"],
    [12, 0xCA00, "Clerk, Ace, Mayor Pedros…"],
    [13, 0xCA00, "Topekan Woman, Woman"],
    [14, 0xCA00, "Titanium Clawer, Silver Strangler"],
    [15, 0xCA00, "Monk Petall, Monk Johan, Monk Russ…"],
    [16, 0xCA00, "Radioactive Vermin, Bunny, Rat…"],
    [17, 0xCA00, "Desert Dweller, Drool"],
    [18, 0xCA00, "Prostitute"],
    [19, 0xCA00, "Fat Freddy"],
    [20, 0xCA00, "Casino Guard, Thug, Roving Guard…"],
    [21, 0xCA00, "Insect"],
    [22, 0xCA00, "Gambler, Drunk, Man…"],
    [23, 0xCA00, "Warden Nicholas, Jailer Corbett, Jailer Patrick…"],
    [24, 0xCA00, "Charmaine"],
    [25, 0xCA00, "Sister Wrath, Mistress Jennifer, Mistress Krys…"],
    [26, 0xCA00, "Redhawk, Meditator, Follower…"],
    [27, 0xCA00, "RadAngel, Radiation Angel"],
    [28, 0xCA00, "Faran Brygo"],
    [29, 0xCA00, "Sister Theodosia, Sister Ursula, Sister Grace…"],
    [30, 0xCA00, "Sister Lucretia, Sister Jade, Sister Isolde…"],
    [31, 0xCA00, "Brother Raphael, Brother Donatello, Brother Goliath…"],
    [32, 0xCA00, "Brother Phillip, Brother Juaquin, Brother Thomas…"],
    [33, 0xCA00, "Android, Psychopathic Android"],
    [34, 0xCA00, "Tronnosaurus, Cyborg, Hexborg…"],
    [35, 0xCA00, "Gundroid, Cyborg Commando, Tazel…"],
    [36, 0xCA00, "Scorpitron"],
    [37, 0xCA00, ""],
    [38, 0xCA00, "Biker Scum, Rib Cracker, Cutthroat…"],
    [39, 0xCA00, "Slicerdicer, Chopter, Combat Hacker"],
    [40, 0xCA00, "Thug, Scavenger, Guard…"],
    [41, 0xCA00, "Sniperdroid, Warroid Mark 1, Warroid Mark 2…"],
    [42, 0xCA00, "Glowing Slime, Desert Tube, Trash Slitherer…"],
    [43, 0xCA00, "Blood Priest"],
    [44, 0xCA00, "Gunsel, Gunman, Marksman…"],
    [45, 0xCA00, "Base Policeman, Policeman"],
    [46, 0xCA00, "Bum, Sand Bum, Hobo"],
    [47, 0xCA00, "Huey, Dewey, Louie"],
    [48, 0xCA00, "Ugly John"],
    [49, 0xCA00, "Rottweiler, Mongrel, Coydog…"],
    [50, 0xCA00, "Deserter, Ozoner, Outlaw…"],
    [54, 0xCA00, "Slithering Iguana, Gila Monitor, Desert Lizard…"],
    [55, 0xCA00, "Harry"],
    [56, 0xCA00, "Topekan Child, Baby Topeka, Brat…"],
    [57, 0xCA00, "Woman, Lady, Young Woman…"],
    [58, 0xCA00, "Laurie, Housekeeper, Felicia"],
    [59, 0xE000, "the Grim Reaper"],
    [60, 0xCA00, "Widowmaker, Marksman, Gunman…"],
    [61, 0xCA00, "Mailed Wolf, Iron Wolf, Spawn Wolf…"],
    [62, 0xCA00, "Warbot, VTOL Auto-fire Robot, Stainless Steel Flechette rifle"],
    [64, 0xCA00, "Titanium Clawer, Threshing Crawler, Plasma Constrictor"],
    [65, 0xCA00, "Irwin John Finster, Finster Sinister, Finster Dexter"],
    [66, 0xCA00, "Octotron, Fusion Octotron"],
    [67, 0xCA00, "Chopter, Steel Reaver, Silicon Sniper…"],
    [68, 0xCA00, "Desert Scum, Bandit, Biker Thug"],
    [69, 0xCA00, "Towny, Mad Dog Fargo, Metal Maniac"],
    [70, 0xCA00, "Spineless Ghoul, Night Screamer, Night Terror"],
    [71, 0xCA00, "Large Scorparundi, Lie Spider"],
    [72, 0xCA00, "Finster Leviathan"],
    [73, 0xCA00, "Turbo Meson Cannon, Mk 10 Turbo Meson Cannon, 7mm Vulcan Cannon…"],
    [74, 0xCA00, "Vanadium Vulture"],
    [75, 0xCA00, ""],
    [76, 0xCA00, "Vax"],
    [77, 0xCA00, "Master Cylinder, Laser Pod Blaster, Laser Hypermortar…"],
    [78, 0xCA00, "Woman"],
  ];
  // Each portrait's bytes, base64, by picture number: read from the game's own loads in VICE,
  // one on every disk side that holds the picture, which gave the same bytes.
  const PORTRAIT_BYTES = {
    0: 'ARALY1QADgAbAD0ASgAC3wIk3wIC3wIP3wL/CesCBe0CAe0CAfkCAfkCAfkCAfkCAvkCAfkCCu0CAu0C/w8HAxkHAxIHAwoHA/8HVwMQZgMZlwP/AAEQBKqioqqqBAiiBAqKqooqqiqqKqoEBSoEBigEKSIAqKqoqqioqAQFoqqiqoqqBAaKBAcqBAQoIiKlpaCVlYCVlYGIiAQSiqqKqoqqBA2KAKqoqqiqBAWoBAaiBAWKBAQqBAUooKCioIKIAggiCCIIIggiCCIIIAggAAIAAgACAAIAAgACAAIAAwICAgACAAIAAgQIAAQHqgQFqKChoaGBgYCABAgAAggiiCOPP48//z//P68viw8vDy8/v/+//7//v/+//7//v/+//7+P4/+/vz+/P78/jy+Lo6iqqgCAgAABBRUBABVVVVVAWwQEVVRVVVRVFRUFAQqPnx8EBJ+Pz8/H5+Px/P4EJP8AqKgAAAB8/8fH/3wBVVVVQFsEBUUVVeVVFVVUUqv/8//z//7+/vz8+Pnz5w8fPz8/MAQHPozABAj//fXUwAQL/wCvvwQKAAQEQAQFUAQFQAQGADA/Pz9/f38EBv/+///PMwEECH8EBP/8/PPUVVUVAPr+/Pr8+vz66PrwCq7//wQgAMDw/AQF//vv76+vy4uLisri4ODg4uPjz88/P/////46SkgAgKCAIIAggCCAIAQFoAAEIwKCwuLi8vL6+Pz+/v//vz+vD78EBf/+/PriooIEEwIAiCqIKogqiCqIKogqiCqIKogqiCqIKogqiCqIKogqiCqIKogqiCqIKogqiCqIKgiqiKqIysjKyMqIKogqiCqIKogqiCqIKogqiCqIKogqiCqIKogAgKCAoICggKCAoICggKCAoICggKCAoICggKCAoICggKCAoICggKCAoICggKCAoICggKCAoICggKCAoICggKCAoICggKCAoICggKCAoICggKCAoIAAAAUdAQ4ABh0BHgD/AP8ABiUB4AAGJwFAAP8ABSYCAQAGJgFQQEAA/wABOgEBKQoAAjIBCgACNAEEBAACNwEwMCAwMCEqKgESKAACUgEoAAJUASgAAlYBAQ0oAAM0AUBAIEBgAAM6AWBAYAADPgEggKCAoAEggAD/AAZSAQgpPQMAB1QBwAD/AAZQAQIABlQCAQMAB0sBAwAHTQEPJ4EAB1EBQAAHVAHAAAhLAcAACE4DAcRwAggA/wAGUAECAAZSAQgpPAAHSwEDAAdNAQ8ngQAHUQFAAAhLAcAACE4DAcRwAggA/w==',
    1: 'ARALY1QADgAbADoASgACMwMPMwMDMwMZMwP/BEEDCUMDAWQDAYYDAYYDAYYDCYYDAYYDAYYDAYYD/wZBAwGWAwGyAwGyAwGWA/8IQQMDwgMKwgP/AAEQBgAAABUQBkATEAP//1VEEUQAABFEEUQGBABVAP8AIggiCCIIIgggAiACIAIgAiAPAQAhASEBIQEhASEBIBUVABUACAgAACgoAAATEBMQEwADAAYJATD8////VUQRRAAAEUQRRAYEAFUA/wAgiCCIIIggyCDIIMggyADgAPjAAAYFQAYFQgBVVQBTDDMMP8wzzz/MP88/zz/MAFVVUAYIVQAA//9VRBFEAAARRBFEBgQAVQD/AABPAE8ATwBPAEwATAD8qAYFqaiqr6DyUgJSUAAAQwMDA8MwzDP/P/8/zz/P88wDwAMAQwNAVAYGVQAA//9VRBFEAAARRBFEBgQAVQD/ACAIIAggBgQAFVVBUEBUVFVVVFVRVFUUlYWBAAABBRUVxfEAAMwz/AYF//wzzDPMPPDAAAMPUFIGBEoAAP//VUQRRAAAEUQRRAYEAFUA/wCqqqoCAAAAFFRVVVBBQAYEVQVV8QVVBVVUUQUVVVVVVFRUUFAAA8/zz/zMMMAAwwMMMz8GBP8/gJVVVVUVAPD/VUQRRAAAEUQRRAYEAFUA/wAGBqwAAAsLS0BLS0MGBFMGBEsrKCkBPgYEDzz8/AwAwMPAAw8PPz//P8wzzDPM8/z////8A1RVUVQFAP9VRBFEAAARRBFEBgQAVQD/ACCJIYUElBAGBxEEBQFAQUQRFAUAAICCAMD4/P///z//P/8/zDPM88AwwDDAMMACADLAMsIywDABQBNEEw//VUQRRAAAEUQRRAYEAFUA/wBSNDUxMQAEBgckIABQAECAABBAACoAqgBVVQAqgMrw8Pz8P/8/zzPMMwwBBRUFgQCgAKCqqgAAVQAGBf9VRBFEAAARRBFEBgQAVQD8DIyMDAwGB0wMDIwMjAyMDAyMDIwMjAyMDExMDIwMjAYGDAYEzAwGB0wMDAyMjAwMTAzM8Pz//1VEEUQAABFEEUQGBAAGQ0AAwMBAQABABgcAAAUiARQRAAYiAQURAP8A/wAFKwIFAQAFLgIBAAUxAgEABisB9FBAUAAGMQFQEEAA/wAFKwEFAAUtAgEABTECAQAGKwH0AAYtARAABjEBUBBAAP8ABSwCAQEBAAYsAVBQUAD/AAZVAgEAB1AC/FcBBAVRBQAIUgFAUFdXEDAA/wAHTwIDAQEACE8BMJA0AP8ABzICAQAIMwEwBAIACD0BAw8DDwMACTcBQCgACToBDAAJPAHDwMDw/P//Pw0EEBAEIQAKPgHAAApCAcBAAApKAUAA/w==',
    2: 'ARALY2MADgAhAD0AUwABgQMBiQMZiQMFiQMFiQMPgQP/AZIDAZQDAZQDAZQDAZQDBZQDAZQDAZQDA5QD/wOSAwOvAwnZAwPZAwKvAwyvAwmvA/8PkgMF7wMZ7wMD7wMJ7wP/AAEQBgAAqv+q/6r/qv+q/IABCQkGBElAAAEpqampgACQBgWSAIAGBpICAEhJSUkJCQEAAACAAKAAqACoAKgAqACoAKgIqCgGCagGBACq/6r/qv+q8IEBAQEGBSEBARERERAREQGRkZGQkZGRAQYIIQEBBgYhAQEBBgSqKioqCgqKAoIggCCIIIgiiCKIIogiiCIGBACq/6r/qv+qA1JTUlNSUFFQBgZSAAYG+QAGBlJQUAYFUlAGBFJQUVBPQ6CoqqqqqKKooqgGBaoqKioKCgqCAoIggCAGBACq/6r/qv+q/6r/qv+qAFUAAAYFSQAABAYEJAAEBQYEJQAGBiIAAA8/YMiMAcDw/DwHgKCIIogiiCKIquqvqq4GCaoqBgQAqv+q/6r/qv+q/6r/qgBVACQlIycnIwAGBUhAAyAGBSQAIQYFKQAA8Px/P3DgAAM//MAGBACAI4MhiCCIoqjqqq6q7qruu66qqgYEAKr/qv+q/6r/qv+q/6gATz/////z8Mw//8PgzAMwM8/xzAOQkwAQBgUSABCQkhDDwA////AGBQAwDA////8/AACIIqiqqu6q7qvuqqoGBACq/6r/qv+q/6r8o88PAPz/z/PPM8wzDMPw88w/BgT/Hz78+OAAAICEFRFRUVEB5cXFBcHwPA8DBgYAw////wAAgCKIrqruq+67rruuBgQAqv+q/6r/qv+qD/L88MAAAMDwzDDMMMwwwADAwADg8Pj78+fPP/zxxRVVVDREVDREVDRFVVRRBMHwPAMPP/////gGBAAKqu6q7rvuu+677gYEAKr/qv+q/6r/qv+q/6oAFQABBgUhAAgGBYkACCgIwMCFFVVQRRUVVVVQTz/zzB8GBz9//////viAAAAACqruuu6r7rvuu+677gYEAKr/qv+q/6r/qv+q/KEEUAYKEAAQABAAEICQgAAAQEBQEEREUFBQEMAwwcTBxMHEwcTBxMHEgAAAAAQBoaiq7rruu+677rvuu+4GBACAwIDAgMCAwIDAAEAGBAAGBYAAAAYGgAAGB4AGIACAgMCAwIDAgMCAwAAAAAYqATwjAP8ABisBPAwPAP8A/wAGMwEDAwMABjcBAgAHMwHCBBjgAAc4AYAA/wADQwIBAAQ/AR8sb9C+AgAFPwHwAAVBAYAgf/x4AAZCAQMwAAdBASAA/wAEQAIDDAcKAQMABUAB/APgEBNkAP8ABkwBGCwA/w==',
    3: 'ARALYy0ADgAAAAAAAAABGAMBNAMBUQMBdgMBkwMBqQMBuwMB1gMB8wMBEgT/AAEQBQCqqAUXqqsDwzPDM8MzwzPDM8MzwzPDMwUGVf8AVRFVEVURVRFVEVURVRFVEVURVRFVEVURVRFVEf8AVQAAqgCqAKqABQaqBQSooAUGr7/////w////8/wFCv9/VwUEVf8AVRFVEVURVRFVEVURVRFVEVURVRFVEVURVRFVEf8ARQAAogCKACoKBQYqCooKigL68MMwMzAzMDMwMzAzMDPw8/Dz8PPw8/Dz8PPwc1BVVTMABRwRMwBVAACqAqoqBQmqBQSrqMwPzw/PD88Pzw/PDM8Pzw/PD88Pzw/PD88Pzw/PVFT/AFQRVRFVEVURVRFVEVURVRFVEVURVBFDDTfdd93/AFUAAAUJqquvv////PACIiIgDz8FBf/wAAIFBSIFD/8A/xNVEVURVRFVEVURVRFVEVQdNx133Xfdd9133f8AVQAABQmqyvLM88wDICAiIgLwzPPM88zzAAAgBQUizPPM88zzzPPM88zzzPP/AMwzVRFVEVURRBFXHXcdVRF33Xfdd9133Xfdd93/AFUAAAUMqirKCsgADDMMMwwzzAPMA8wDDDMMMwwDzAPMA8wDzAPMA8wAwAH/AMQRVRFVEUQBN9113VdVd1133Xfdd9133Xfdd93/AFUAAAUHqqijh4+Pj4cD8AIyMjADMAMAAwADAAMAAwADAAMAAwADAAMAAwADAAFEEf8ARBFRREFVVd13VVfddd111Xfdd9133Xfdd9133f8AVQAABQeqKorK6gLqyooqBQSqKsoyzDPMM8wzzDPMAwADAAMAAwADAAAAEAQBQBH/AEQRVBVRVVddVVVX3VddVd133Xfdd9133Xf9w8H/AEEAAAUYqj8PDw8FBAcFBAMFBQEAEUQRQBBEEf8ARBBEFFAUQFAUEFTQRNAU0ETQRNB00FTQdNwMDPwABwAABRiABRHAAABAAEAAAADAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAgZAQMGDo+OhgMACRkBQAAJHAECAAkfAUAA/wAIGAIIIAGBAAgdAgEBAAkYAYDg4MACwODggAD/AAcbAQEEAgAIGAEKAoAACCABwgAJGQGAgAAJHAEoAAkfAYAA/wAHGgECAQQICgAIGQGIAgAIIAEwAAkbAQEEgAD/AAcZAQIIAAcgAQgACBkBIAgBBQIA/wAHGAEKCCw+oD4uAAgbAQgA/wAHGAEKCS85oBkpAwgACBgBgODo+PDw4MgA/wAHGQIBAAcbAQQDJAQDAAgYASA4Hg5uDho4CAD/AAcZAQIBBQsKAAgYAYjOAwN/AwfOyAAJGgEBBYAA/wAHGgEBBQIACBgBKp94cGxweD8yAAkYAYAg4MAowOAggAD/',
    4: 'ARALY00ADgAhADcAAAAHuAIBuAIBuAIDuAIBuAIBuAL/D94CAeACAekCAQoDAQoDAekCAeAC/xneAgE/AwFIAwFlAwFlAwFIAwE/A/8AARAHBysAAQAABAEEAQAADw8PBwQ/AwAEBxIFAQEHJQABAAEAAAQRRBFEEQQBQBFEEcTx8Mzz/P/8PwNAUAcEVFJIQlBQQAAHCFUHDgACAAICAgACAgcLAAQRRBBEEUQRBAFAEEQRRBEAEUQRRBFEEQTBMMAyyCIHBADA/6oDACMKAAJQUAcFVQcIAAEAIAAqACoAABUVFQAqgAoiICEhKAgICABAAAgwcHBwNU0TQwEEEUQRBAFAEEQRRBFHHiqooIAAMIyMjDD7gOsiIiKiAqgBQVBUVVUHBAABBBFEAAUVVQAqACoASkBKAIQEhQUAQUoqgKqAqqAqAAABBRUFVVX19fx8fBxPE0AQBhx66KCAAAIAiCIIAAAPAMLCoiACICKAAEAHBVUHBAAQRBFEEARAUCqAKoAAlRWVACoAKgpAVFCAIqAioKCBBRVVVVQBVVUHBP/88cAqLyAHBSIjKgCAKgCIAAC7IjMzIu6ABwQRUVFEVVVABwQAMAwKSg4oow64AKMCAmJgYgKiCqoAKCgooKCAkQQBMAxMT08Pf3///PzzznrqAKv6AgcFotSRBAGoAIgAAMAgMjIg6AIIEhISEBFEUAcNACAg4KCggIAgoACABwoAQBBEEaQBCCooACioqKiggAAgMAAyBwQiICAgQBBAEAcEAAKCgoAoCIioS0tLCwqqqgckAH5AE1MLKwALC4uLAL6urq4uKCACAjIysrICiiAKCgqgKioqAKoAqwAqACooACsiAooHJAAHBKCABwYABwQwAACgjIgHBsggwICAILi7ugKoAAyCogKyALAICCDAB1UAAAUqAR9gqioqKgqKKgAFNAIBBBAABisB0KCAgIAABjEBIIAQAP8A/wAKMwFcXFwA/wAJMQIMAQAJNwEEAAoyAQMACjYBAwALMQHAAAs3AcAA/wAJMQEMAAorATAACi4BAQQwMwAKNAEDAAo2ARMwMDAACjsBMAALMQHAAAs0AeAACzcBwAD/AAdRATA80AD/AAZSAQQAB04BMDAwAAdSAQMAB1YBEAAIUgHAAP8ABk8BBAMABlIBBAAGVQEMAAdOAjAwM8wDDAEAB1YBEAAITwHAAAhSAcAACFUBQAD/',
    5: 'ARALY0MADgAnAAAAAAAUPAIFPAICTwIBcAIBfgIBfgIPfgIJjAL/BbMCAbUCCeMCDCcDAbUCBVYDBtUDAeMCBbUC/wABEAYAAAY5qqipoaWFlRVUVVVVFYWhqAYJqgAAAAYwqqigoICAAAEBEVBQUFRVVABQVFVVVFBQE4Cgo6gGBaoAAAAGJ6qoqAYEoIAAAQEGBgBAQAAAQAIKKiqqKioCDMAFBgUVhYWhqKoAAAAGD6oGBqgGD6qogAYFABBQUEAAAAAEBgcAAQQEAAAABIWlpaVRVEVQVFVRVFBAAIwAAAAGBKqghRUVhYGAgAUGBBUAAP8AABQUFAUVFIWFgaGggIwAAwBQVBUVBQEAEBBBQQAAAQYFBQEAAABAABBUVFVVVUVFBQUFRUUVVQAPyAAAAAYEqgBXVVVXXHABBQYEVQAA/wBAVVVFFFUFVRVVVAUUUAADMAABBgVVFQYIAEBAQBBQUEAAAQUERBEVBgdVFRVUAPgIAAAABgWqKsrKBgQqSkpKQkICAvICCkpKCgYESgoqKioKygIEFQYFVVRQAAUBBgsAAQEBAAARBRUGB1VUQRVRAQXFAAAABiWqAEBAQAAAUBQAAEBAABBUVBBAQEAAAABCQgYEAkJKSElJRUUVFQYGVQAAAAYmqioKAgIGCAABAQAQEBABoaCgoYWFlZUVBgRVVFRSSkoGBioAAAAGLqoKCgICEhJEFFQGBFUFVVRUVFJSSkoqKgYLqgAAAAY3gAYGAAYUgAAABS0CAQAGKwIBFDgABi8BVAD/AAUtAgEQAAUwAQQABTICAQAGKwIBAAYuAlBAUAFREAD/AAUtAgEBAAYtAfQEAP8ABS4CAQAGLgFUUFAA/wAFLgEQAAUwAQQABTICAQAGKwIBAAYtAfQABi8BEAAGMQIBURAA/wD/AANXAgEAA1kBEAAEVwEQAARZAhEVBwUFAQEUUIAABVcBEBAQAAVcAXBwEBAA/wADVwIBAANZARAAA18BJAkCAARXARAABFkBERUHBQAEXgIBAVTQgAAFVwEQENoKDzBwUBAABlkBqqr/AAdZAaCq8AD/AANfASQJAgAEXQEFAARgAUCAAAVZAcoKD0AABV4BQAAGWQGqqv8AB1kBoKrwAP8AAUkBAgIJDCQwkMBBBQABVgFAkCQIAAJJAgRUEBARBAEEAAJSAhIEAQEEExBfgCAvCAADTQFAAANQAYCAAANTAYCACD7AEFABBECQAANgAwECAARXAQQFQwUDBAUEEFTQgAAFVwFAQCo6LyAgUBAABlkBqqr/AAdZAYCowAD/AAFJAQICCQwkMJDAQQUAAVYBQJAkCAACSQIEVBAQEQQBBAACUgISBAEBBBMQX4AgLwgAA00BQAADUAGAgAADUwGAgAg+wRABBUCQJAgABFcCFAVSEAQBBQURAAVXAVBQ8DAgEFAAB1kBIAIwAP8=',
    6: 'ARALYzgADgAbAC4AAAAPTwMZcgMJcgMFTwP/AbMDAbUDHsYDAcYDAcYDAfsD/wqzAwcuBAUuBP8AARAGACKIIogiiCKKIogiiCKIIooqiCKAIqgqiiKIAIgqiiIIAIAigCIKIoAiACIAAKAgCAAAAgIiACIAIICigAKKAogggACgqvr6/v+/rqrqu+647LgAACKIIooqiqKoKggCiCKIIoiiqCAAIIAggCCAIAAggCCIIAgggCCIoIgiAKKgAgAqAiIIAICigCKAAgAiiKCAAAAGBAIKCIKIyMLCoMCEEBEREQAAIogiiCKIoogiiCCAAIAGEAAFFREGBBAEBQUBAAAAIAAggCIIIqgqiCCAAAAICAgiKoAGBQCAKgAiiAiAKgAGBAoAACKKIogiiCCABhEABgQBBQUFRUUFBQUBAQYGAAQBBAEAAQYMAIAGBCAoiCAICKAAgAAAQFFRUQAAIoiiiCKIBhIAFUAAEEUQAEAVBQYGVRUVRVUVFAFEAUQBRBFEEQQBBgUAAQUFBQYEFVVVVRUFAQEAAABAQAAAIogiiiKIBhIAVVUFAUAAwMAQUERVVVVUUVFAQAQRBBFADEAVRQBAEUQRRBEGBABAUFBRUUVFVVVVBgRUUBASAgMAAKqqIqoiqCIIAgYPAFVVVFBBQEBQUFFRBgZUFAAAAUQRAgtUQQQRRBFEEUQQAAAEBBQQUFJCSEgoICIKDgsqOy677qsAAKqqIqoiqqKKIooiiiIIAggCBgcAQFACAkIQwMASUFIGBlBAAkgCQAD9/QAAACAAIgAgAACC4DwvOyKggAAAACCoqrruu6+r6rruuwAABgSqoqoqqiKqIqoiiiKKoqoiiiKIIogiiAKAoqgiCCCAIIACCACIIgCiqCKAAAggAAIKIggiAAAAoCiIAADCwLMiCAgCAAAAgO677vv+v+67AAAGBqoiqiqqIqqiqqqqIqoiqiKqIogqqCAIAggggCKIAAgqiiIIIAACAAAAIgACAKKgIoAiAAAgiiiiAKAoAsD+v+87jssyAO677rvu++67AAAGEoAAgACAAIAAgACAAIAAgACAAAAAgAAAAICAgACAAIAAgACABg8AgMDAwIDAgMCAwIDAgMCAAAAEMgIBAAUwAgUBRAAGLAIBAAYwAcAQAAcwAgEACDABgAD/AAQyAgEABSoCAQAFLQEFAAUwAgUBRAAGKQIQBRABQAAGMAHAEAAHKgEUQQAHLQIBAAcwAgEACC0BQAAIMAGAAP8A/wAGQgEVAAZEAQUABkYBBAD/AAU9AgEABjsBQAAGPgFAAAZBARkQFQAGRQEQAAc/AQIJXxRAAAg6AVAACD8B/QAIQQH9AP8ABT0CAQAGOwFAAAY+AUAABkEBGQUVBRAEAAc/AQIJXxRAAAg6AVAACD8B/QAIQQH9AP8AAlABAgEECiIqiqjoyMoiQJRQVVVVAANLASgoKKqCggADVgGCggADWQGqqiiCggADXwEBBCMABFABgAEEoIiooCgoIAAEXAGAAARfAUAVFBQABWEBQEAA/w==',
    7: 'ARALY0EADgAbADEAAAAZXwMFtAMetAMMXwP/ARAECBIEARIECjUEATUEBRIEARIE/wUQBAdHBAVHBAlHBAVHBP8AARADACIAIgAiACIAIgAiACIAIgAiACIAIgAiACAAIAAgACIAIgAgACEAIQAhACEAIAAiACIAIgAiACIAIgAiACIAIgAiACIAIgAiACIAIgAiACIDBQAiACIAIgAiACAAIgIDBAoDBSooKigKgqAqAgAcACAoKCgIQABAAEAQQBBAEAAABBAEAQAQBAEEAQQBAAEDBAAEEQQABBEEEQAQBBEEEQQAACIAIgAiAAIqAw2qKoqqCqKKIiCAAACAiIqCiKiooAAIAiAKAwYABAEAAAAQRBBEEEAAAABEEAAABBBEEEAAABBAEEQRRAAAIgAiACIAqAMMqqiqiqiCKqqACgAAcioIqqqoqCgKogIiggigAAAAAQARAwQABAEDBwAgACAAIgAiACIAIgAiACAAIAAAACIAIgAiACIAgqCgAwSoAwSqKoqqKKCgKIooCKiggKCCCoIiAwQgAAAAAQQABAFAFUURAABAAw4AIAAgAwsAIggigCKIIgAiAAJAERQQBQEFAQQBAAggiIiIKAiIoQABBBEEEQQRFRUFAQAQRBFEEQQAQBBAAAIKCioqIqKCoiICAwoAAQQBABAAAAAiiCKIIggiCCIAIgBAVFUEEUREVVFUVRRBRREAAEQRRBFEUFQURREAUBQFQBAEEUQQQAACCioDBKoqoqoqAwQiiAMHAAFEEQAARBEAAAAiiCKIIogiiCKIIogiCAIAUFQVRVVUEEEQQFBEEQERQAEAAQAAQABAEAAAQAEFFRVBAKCoqqKoqKigoKCAgAAAgAMJABFEEUQAABAAAAAiiCKIIogiiCKIIogiiCCIIAgAQBBQAQUVVVBFEUQRRBFEEQURBAEAAAAVAUBUVVVVRREEAQQBBAEEEAMFAAEAAAQBBAEEAQAQQAAAAQABAAAAIogiiCKIIogiiCKIIogiiCCIIIgACAAIAEhAAFJQEFAURQFBUFQURBEUBUVRRBVEUUQRRBBEEEADBgABBBAAAUQRRBFAAAQRRAAEEUQRAwQAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIADNQAAAiYBKAACKAEKAgACKwECiigKAAMmAaigCoCIKqgCooAAAzEBCAIABCQBCAAEJwGCIqCAKKqKAAUkAYCAAAUnAYAABSsBgIAABS4BgAAFMAGAgAD/AAImASgAAigBCgIAAisBAoooChQAAyYBqKAKgIgqqAKigAADMQEIAgAEJAEIAAQnAYIioIAoqooABC8B0CAABSQBgIAABScBgAAFKwGAgAAFLgGAAAUwAYCAAP8A/wADPAEgCgAENQEIAoAABDoBIIqqoqgABTgBICAABTsBgAD/AAM6AQoiKgoABDoBoIiooAD/AAZMAYCAIAAGUAEgoCACAgAHUwGoCICAAAhRAYAACFMBgAD/',
    8: 'ARALY0MADgAnAAAAAAAHpwIBuAIB1wIB9AIBIAMBWAMBugMe/QP/ARUEARcEASEEASEEAxcEBTIEBSEEASEEBjIE/wABEAaqqqoqysrKMjIyAAAAg4OAgKCgoAYEqKqorLCAoKCoBjOqAAYMqioqKsrKyjIyMgwMDAAADzzwz/zz//wGBf/88/PzPLy8vAYEv48GBK+np6ehoKioBhSqAAYYqioqKgoKygLyAvLABgUAAwYG/z8/zMzw+PgGBPzwwQVUAACABhKqAAYkqqAExfX0BgXwAcEAw88/Pz8PAwMGCACgoKioqLiAgIGUlIGAPIC8kJAABgSqqamppaWgr6Cgj7CFVQAGBKCnp6OoqJ+oqqqqqKCEEVFFABBERVEVFQFUVFQQwfH8BgX/Pz8PDwMMACwAPAAAAQAAQBQAFBQUBgUAqqCVBgZVAP8AAfwDVFUAICAoOD8/Mw8/AD8DDz8AAwMPB0BQEAABQEVEREBAQUALACzA/AYJ/z8PAAAUVVVRFABURAAARFQGBACqAlBUVVVVVFQA/wBUBPAMUwACMwMP//PPz8////PDDz////zxBRBAFBBBAC8AvADwAcEFAFVVFcXx/Pz////zw/zwAAAAQFQQAFVNFQ1VAAAAFQCqqqoqCkpSVFQA/ABUAABUFAAy8vLiigYGKgoCEhAQElBTUFMAvAHwBMUFEVQGBFVUFRVFRVFRUBQUFBAQQAEBBQUVVFAAVTRVNFUAAFUFAAYfqgK8APwBxRUVVVUVFUVVVVRVVVVQVVQAUFAAQQAFBRQQEVRUUEFFVBRQQwBR0FHQUQABAEEABiGqKkpSUgYIVFBAUEICAgIKCgpKSgpKSgoGBioUATExAfEBEFMQURBVFVUVAAZEoCAgIAAgBgUABgVAAAAGKwEDAAcoATwABysBMAD/AAQoAgEFAQAFKAFAUFQABisBAwAHKAE8AAcrATAA/wADJgIBAQAEJAEUVVRVRBAABScBQEAABSoBFAD/AAMgAgEFBRQVFQQBAAQeAgFFFFRVREQRBQAEKAJBFAEABScBQAAFKQFQAP8AAx8BBQADIQEFAAMjAQQQFQUABBoBBVEABB0BVBQVQEAFQUREQVUABCkCAQAFGwFAAAUqAUAA/wADFQERAAMaAgEAAx0CAQADHwIFAQADIgEFEAUABBEBVQAEEwIBVBBFAAQYARUABBoBBRUABB0BVBVQVARQBRQABCYBEAAEKAEEAAURAVRQAAUUARAABRYBQAAFGgFAQAD/AAMVAREAAxoCAQADHQIBAAQRAVUABBMCAVQQQQAEGAEVAAQbAUQABCEBEAAFEAEQEEUABRYBQAAFGgFAAAYRAUAA/wAEFgEEAAUQARBEFQAFFAEQAAYRAUAA/wD/AAQzAYBgwDAA/wADOAEMAAQzAaDw+MgIBAD/AAM4AQwABDMBIJA4+AgEAP8=',
    9: 'ARALY0QADgAeADoAAAAEsAMCsAMFzAMP9AMFsAP/ASgEASoEAUoEAV0EAYkEAYkEAV0EAUoEASoE/wUoBAGWBAiWBP8AARAGADPMM8wzzDPMM8wzzDPMM8wzzDPMM8wzzDPMM8wzzDPMM0QRRBFEEUQRRBFEEUQRRBFEEUQRRBFEEUQRRBFFFVQTVBVFFVRQUAYJQFAAADPMM8wzzDPMM8wzzDPMM8wzzDPMM8wzzDPMM8wzzDPMM0QRRBFEEUQRVVBPUFURRRFEEUQRRBFEEUUVVFNOOuqqKgJAEAQGDgAzzDPMM8wzzDPMM8wzzDPMM8wzzDPMM88/zDzMPMw8zD9FEUQRRBFVUAAoyAA/AFQVRRFFFUUVVFNOOuCAAsC8qKCjDjiogoKoAAAGBQUVFAAAM8w/wMXFxcD//PDIyMrKwMAGBcrA/ACiABNDUAKgKgBCQExMQEIA7ACjoyKiAFVVVV/qOi8KgKioAIMOjDjgwoIKKgYEAFUGBABAUFVEAAAzzP8ABQUFACgAqqoAqqoAAAYFqgAqAKoAzzzzqgAqAKoAzMwAqgAAArCyIiIAAEBKwqigzogIOODCggooIIC/qqqqBgQAVQYEAAEFVUQAADPM/w8jIyMPPw+AKiqqqgAAqAAoKoIAAACgAADBwaACCgCgAMzMAKoAAKoAgoqCACoAgIAAqv+qAACqqqoAIggi/6qqqgYEAFURFFFEUUQRRAAAM8wzzDPMM88w8jIwMDw8/PDy8vw8jIyMAKoAURRFAKqqAAAExMQAAAIAgAAgICAAAAgACCqq/6oAAKqqqgIigiLyqqqqBgQAVRFFFEQURBREAAAzzDPMM8wz/A+Pg48P/D8PA6ioAAYEIwCqAEVRFACqqAAGBSEAqAABAQYEIQEBAQAIoMqoAACCiIKIgoiCiIKIgAABBBBABgoAM8wzzDPMM8wzzDPMM8wzzPPM88zzzPP8MzwzPDM8MzwzFFFEUURRRFFEUUQRRBFEEURRVBUUFRQFgSCIIogiiCCAAQUUUFAIAgAAMAYGjAAAM8wzzDPMM8wzzDPMM8wzzDPMM8wzzDPMM8wzzDPMM8wzRBFEEUQRRBFEEUQRRBFEEUQRRBFEEUQRRFEUBYQFFFFUVQYEAAMIiIgGBAgCBgUAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEBAQAYEAAYGwIAGBAAABBQBOPw8/DjAAAUVAXRUVAAGFAEMUHBwDAD/AAQSAQIDOP09/DnHAAURAczAX6AFdVRRKAAGEQHAw1ysIFBwXDwA/wAEEgECAwAEFQIBAQAEGAIBBwAFEQHMwF+gcSEABRgBUSgABhEBwMNcoHAgAAYYAVA8AP8A/wAHHAECAAceAQ8MAAgZATCwgLAwAAgfAcAACRsBwAD/AAceAQwPAAgZATycIJw8wMAA/wAHGQEPDQ4NDwAHIAEDAAgYAQPDaytrw8DPDAAJGQHAAAkdAcAACR8BwAD/AAgZAcDgIOjADzMA/wABOwFEu0S7RAACOwEFsAWqRAADOgJAJztAwFABAAQ6AdcABDwBn6/ungAFOwECXF6qqgD/',
    10: 'ARALYzAADgAAAAAAAAAFoAIBxwIB7wIB7wIGxwIDDAMDUgMBtgMFtgMJ1gMIMQT/AAEQBgAGI6qoqKihoKCEhYSFhIWEgYCBgKGhoaChoKAGDoAEEUQRRRVEAEAAAAYVqgYFqKGjjYeFjYUEBQERRBFEEQYEAEAAQBBAEEAABgVAAgIKBgkqKAAAQAFEAURRVFUFAAAGBqoGBqigh42HHTQdNRV00VDRdNVx1FDRUEFEQAQABAEEAQABAQEGCAAICKioqKAGBIAGBKCoqIAGBAAQRBFEEQQBRAAABgeqKsgzDEdBExETAA8DAABFDQcNRQAGBUBQQARAABABABAEBEFQQFBEEUQRVBFUFQQRBAEEAQQBBQUHBQcDAQEBAAMBQxBDDUQMQAAABgeqgB1XVQDdd90D/P//DzMAAEDVc8QTTDw8Pz8PABMTFAdFAUEQBEAGBgBAAEAAQAJCEkISUlJyXHTcdNx0XHTcdNx03Hfdc9AAAAAGB6oC3HdVEM1H3UfcM8/Pz0QAVDHf/wMAPAADzwMAAwMAA/9VVAYNAICBBgWAgYCBAAEAAQAAAwEDAQABBAFFEUQAAAYJqipAA9133QP8///AMAEBD1U3TBDE8PDw8cEBAUFFxQQQEEAGBAAEEAQUUhJCCkoKSgpKAEAAQFDQcNBw0HR33TMQABFEEVRRAAAABgaqqKCMMMBEBBQSEhLCCgICQsLEzEQcNBx03HBQclJCQgICBgUKKioGDaqoFQARRBFEEUQRRBEEAQABBBFEFVUQQAAABjqqqVVVVBAAEUQVVRVFFUQQRBFEEUBQVAAEAAAGOaqlVVUVFRVVFVRVVFREAAQBRBFEUVQVVRAEAAAGOYAGB0AAAABAAEAAQABAAEAAQABAAEAAAAU0AhATEQYFAQEABioBEAMABjUBe1VX/1VUAAczAQQEREDQEAD/AAU0ARAXAAU4AgEABioBEAMABjUCe6oBVAAHMwEERMQABzcBEBAA/wAFNQIEEQYEAQEABjYB/1arVVQABzQBQIBAwAD/AAQhAgEPDAMABSABdP8DAAUkAfA8AAUnAUAVAgAGIAEwA0f8AAYnARARRgAHIAF0/wMAByQBP/AABycBBFAACCIB0MAA/wAEIQIBDwwDAAUgAXT/AwAFJAHwPAAFJwFAFQIABSsBAwMABS8BAwAFMgEDAwAGIAEwA0f8AAYnARARRgAGKwH/Aww8A8zMAwMAByABdP8DAAckAT/wAAcnAQRQAAgiAdDAAP8ABSsBAwMABS8BAwAFMgEDAwAGKwH/Aww8A8zMAwMA/wADFwECCggLCAgAAx4CBgEDAQAEGAGAYBDNc1wcHFxAAAUrAQMDAAUvAQMABTIBAwMABisB/wMMPAPMzAMDAAcbAQIDAAgXAQIKJJNMdNRV01YACRgBAQiAAP8AAxcBAgoICwgIAAMeAgYBAwEABBgBgGAQzXNcHBxcQAAFNAIQExEGBQEBAAYqARADAAY1AXtVV/9VVAAHGwECAwAHMwEEBERA0BAACBcBAgokk0x01FXTVgAJGAEBCIAA/w==',
    11: 'ARALYy0ADgAAAAAAAAAB5gICJQMKgQMB4wMBAgQBAgQF4wMBgQMDJQMZ5gL/AAEQBgAjzCKII8giyDPMM8wzzDPMM8wzzDPMM8wzzDPMM8wzzDMMQ0BQUUVFUUVVUQYFVQUQABAEEQQBAAEEEQQRBAAAAQYRADPMM8wyiCKII4wzyDLMM8wzzDPMM8wzzDPMM8wzzDPMM8wwwipKUlQGCVVUAUQRQAAAEUQQQAEQAAQRBABAAAEGDgAzzDPIMogyyCPMM4wzzDPMM8wzzDPMM8wzzDPMM8wzzDPMAQCFhYUFBgZVUVVFVQYEFQYNBQYPAQAAM8giiCKII8gzzDDMMMAwwTHBMcQExDXFMc0xzDDMM8wAVAUBAFUGB1RVVFFQUVBVQBUVBRAVFAYEFUVFUVQGD1UAACKIIogigAYEAAUFFRUGBVULBgUqQAYEVRQUFQUFAQAQEFAkJVVAAFQBREBEBFUAVXV0QRUFBgRVVFRRBQYPVQAAIogiiCIGBgBRBgdVFcDAhIQFRUVVQBFVABVAVVVVAAAFFQAGBT9PT09DU1MUFBQGBxEGE1EAACPMMogiBgUAVFQGBlVAPq+rqioqQFVVVRVFBVVUVFBABBRQQAHx8PDwwMHFBQQFFBERUAYHUVRUBhFVAAAyyDOIIogiCCIIAggCCAJIQ0xDAAMQEhASUFJIQkgiCCIIAAVARUVRUVERACqqKgAICCpAAFVWVgRRQAYGVRVABg9VAAAijDPMM4giiCKIIogiyDLIIogyyCKIIogiiCKIIogiiCKIAlAAUVRUBgRVFYUVVVVVFVUFUVFBEQYGUUVFFQYEVQYMVAAAMsgiiCKIIogiiCKIIogiiCKIIogiiCKIIogiiCKIIogiiCKIIghCAFQGBVVRUVVFVQYERVURBQYFFQYMBQYHAQAAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAAABihAAAABGQEDDCaZZ4wzzTbIIJxwwAABKAHAcIBwgHCAcIBwQAABNAEQAAFCAQUAAhkBIMxgjDDAcMAAAkIBVBAA/wABGQEDDCaZZ4wwzTTBBkVWGSYMExkWGRcYFxgXHBAAATYBFAABOAFQVAACGQEgzGCMBxkWWGOYY502mDCAcMAAAiwBwAADHAGMZo0zzCecYIAABB0BMIAwwAD/AAEfAQMAASEBAgkl0AABJgFAQFUFAAEtAgEBAQACHQE32WWVVVEVFEARQwwQQGBAAAIuAcAAAxwBgFBUVVVABAIdNpgABBwCzFUQRQE0lWCEAAUdAUQUBFBAAAc2ARBAAP8ABS8CAQEABi4BQAAGMAE/QAAHLgFAEBAABzYBEAD/AAU1AgEQAAYxARUVFQAGNgFVAAcyAgEABzQBBBBEUAD/',
    12: 'ARALY0IADgAAAAAAAAAFHwICJwIBJwIBJwIFRgIBYwIHdAIJjwIDjwIBlwIERgIBRgIHJwIDJwIHJwIByAIGYwL/AAEQBgZqAAgCAAIGBQACCAAiAAICAooKIgKKKoIIACAGLgACCgIAAgAAAAIgCIoKoKoqiioqqKCgg4CAgIOMgwMwDDAAMAwwAADMMAAAwDDAMADw8AAGClAGBFRERFAVBAYGAAiIKgIqCCigIKGgqKmpqSmpqKioKKqqqqiggAwwwDPDMwMzwzDDMMMzwzPDM8MzwzPDM8AzwDPAMMAwwDDAMMAwwDDAMMAwwDDAMMAwwDAGBQACKqqAAAABBVVVUBAUVVVFARgUAAAAgBUVFcD//AYI/z/P//wGC/8/zzwGHQCIqqoqAgAAQFBQUBFRUVBQQAAAAgISEFBQQAPwA8zDzMPMMwwzDDMMMAwzDDMMMwwwD8PMwwzDAAAFAQEBBRVRVAUBBhIAgICgqKqoKiooBgcqKKqoqqqqKgoAMMAwzDDMMMAzwDAAMMAGBQAwAMAAAADAAMAwwAEBRQYEVVRUUEAAMwwzDDMMMwwzDDAGDACAAIAAgIAAoCIIgKqooIiqqKKqKgoKAgLAMMAwwDAMM8wzDAMMAwADDAAPPzAUFQYEVVRQQAYGAMAAwADAAMAAwAYdAIAACACACICIoICogCAoKAgACAACwADAMMAwwDAAwPA8PDwwBsEAAAUjAgEUAP8ABCgBAgAFIwIBFBQUAAUpAYAVAAYiARAABigBEAD/AAQoAQIABSUBFBQABSkBgBUABiIBEAAGKAEQAP8ABB0CAQAFHQEFAAUfAUEA/wAEHQIBAAQfAgEABR0CAQAFHwIBAAYdAUAA/wAFIwIBBAD/AAQfAgEABCgBAgAFHQEEAAUfAUAABSUBFBQABSkBgBUABh0BQAAGIgEQAAYoARAA/wAEHQIBAAUdAQUABR8BQQAFIwIBFAD/',
    13: 'ARALYz8ADgAAAAAAAAAKpAIDpAIBpAIBpAIBwAIDzAIM5AIFpAIB/QIBVAMBVAMDkQMB2wMINQQBgwQBwAL/AAEQBgAGB1VUUFBQBgRABkUAVVVVVFBADAZNAFVVVQMAADDMAAADBhMAAQAAAQAAAAUFBQEQEAEFBQABAQYJAAEBBhgAVVUAPwMAAAA88M88AAADAAwAAAUFEREFEQUVVVVVAABVUAMDQQYHVVFUVVVVFRUFAQAAFBEABBQQAAQAAQYEAAEAAgIKCgoICAIIAggAAFFUFcHwDAMHAPDMMDzxAQBFFAYPVRUVBgZVUVBRVVVVVFBQVFVVVRUAAEEEFVRUUQYEVRUFACoKAgKCigqqIogiiAAAEUQVVVUVwTwMAwYEAAQUFQYFVVRQQUUFFFBAQEUGCFVRUQVVVVAAAAwBBVVVVVQBAQVVFVBFVVVVVFJKKKqooqiqqqiiiCKIIYUAABFEEURVVFFUVdQVNAUFDQEAAEBAQFAAUFBQENDQBhJUUFBQRUUFFQYEVVRBFVRSSiqiiCKJIYkhpYUllRWVBgRVAAARRBFEEURRVBVEEURRRVFUUUUGBlUVFRUFAQEFAQEBAAwDAAADBgYAARBUQAEFAQBEQEBAAUklhSUVFQYPVVBKAAARRAFEEEQQRBFEEVRRRBFEEUURRFFUBgxVFQXFwMAAAAgKAgAoAgAQUFBUUkohBRVUQVVVVFQGDFVUUEBCKqqqAAABABAEQAAQRBFEAEARRBFEEURRRFEGEFVEAPA8AAKAgAIgoAIqqgkFVFFFFVRQQQUVVFBARVVVVFBQQEIACiIoqqKqqqoGCABABgQAQABAAEAAQABAAAYRQAYFAAYIgEAAQEBAAABAQEAAAABAQEAGBACAAIAABgeAAAAEMgEFVwMABTEBQAAGLAIBBRQABywBwMBAAP8ABUIBEAAHPQFAAP8ABD4CAQAFQAEEUBAABj0CAQAHPAFAAP8ABD0BBAQEAAVCAhAEAQAGQAEM/A0EUAD/AAQyAQVXAwAEQgFAAAREAhAEAQAFMQFAAAVAAQRQEBAABUcBQBUABiwCAQUUAAZCAQwNBFAABkcCAVUABywBwMBAAAc8AUBAQAAHQwEUAAdFAUAQQAD/AARCAUAABEQCEAQBAAVAAQRQEBAABUcBQBUABkIBDA0EUAAGRwIBVQAHPAFAQEAAB0MBFAAHRQFAEEAA/wAEPQEEBAQABEIBQAAERAIQBAEABUABBFAABUMCFAEABUcBQBUABkACDPwBCVRQAAZHAgFVAAc8AUBAQAAHQwEUAAdFAUAQQAD/AAQyAQVXAwAEPQEEBAQABEIBQAAERAIQBAEABTEBQAAFQAIEUBAEAQAFRwFAFQAGLAIBBRQABkACDPwBCVRQAAZHAgFVAAcsAcDAQAAHQwEUAAdFAUAQQAD/AAQyAQVXAwAEQgFAAAREAhAEAQAFMQFAAAVAAQRQAAVHAUAVAAYsAgEFFAAGQgEMDQRQAAZHAgFVAAcsAcDAQAAHQwEUAAdFAUAQQAD/AAQ9AQQFBAAFQAEEUAAFQwIEAQAGPQIBAAZAAQz8DQRQAAc8AUAA/w==',
    14: 'ARALYx4ADgAAAAAAAAAB3gEBOwIBkwIB3gEBBgP/AAEQAQEOAAsLCAsIAwIBTQACAgACAMKKMIggAOwA7ADo6AAsLCwADMwMiIgIiIgIAKioAKgArAAwIAErAAEFwAETAMCOioqAARMAAgAAAgE2AP4qCiIoKiooAgoICAgBCAACAAAOKqoAAKqgKAoKARAADwgAAwwDAAgBDAACAgoKCioqKCAAAgoAKioqAIqKAAqKCIoKgKoAAKqgAAKqAKAKqgCqqgAAqgoCAKoAKgACAQwA/wrCMEwwwAoCAAIKCgACAAICIoKIioC/qqqqAAAAqgAAv6qqAKqqP6oixCKqAKoAAKqqAICqAKoAqgCqqgAAqgCAoKoAqgCqAQwA/6CDDDEMA6CAAIDwoADAAMDAyIMiogLqqqqqAAAAqgAA/6qqAKqq/6q/lYCqAKoAAKoKACiqAAugqgD/qgAAqgACCqoAqgCqAQwA8LAwwDDAADABDADAwLCwoKysLAwAwLAA/KioAKys/KwsLCysA6sAAKuwAAO7AOAC+gD/rwAAqqCAAKoAqACAASsADAwMCMiogAyKiIA8AQS8AADAwADAwAD8AIAA//8AAKoKKKCgASsAAQ3AARQA8AAAoAFmAAADUgECAARSAaCoKgAFFQECAAUXAQIABVIBqioKAAYVASAABhcBIAAGPAGIAAZTAYCgAAcVAQgABxcBCAAHUgEooqoACBUBgAAIFwGAAAhSAaCCCgAJUgGqqKAA/wADUgECAARSASiKIgAFFgEJAAVSAaAoigAGFAGAQAgABhgBgAAGPAGIAAZSAaAgKAAHFAMCASQABxgBAgAHUgEqqqgACBYBIAAIUgGAAggACVIBiKCAAP8AAR4BCQkKCQoDAgACHgHJiQOJA0omMAQMAAMeAQEFwAADUgECAARSASiKIgAFFgEJAAVSAaAoigAGFAGAQAgABhgBgAAGUgGgICgABxQDAgEkAAcYAQIAB1IBKqqoAAgWASAACFIBgAIIAAlSAYiggAD/AAEeAQkJCgkKAwIAAh4ByYkDiQNKJjAEDAADHgEBBcAABjwBiAD/',
    15: 'ARALYzAADgAAAAAAAAAFhQMBhQMBhQMInwMBhQMMhQMB1wMBhQMFhQMP9wMB9wP/AAEQBAAzDDMMMwwzDAAA/8wzzDPMM8wzzDOMI4giiCKIAACqiCKIIogiiCKIIogiiCCAAAACCAIIAAICCwIIAggEBgACCAIIAAACAAIIAggCCAIIAAAzzDPMM8wzzAAA8PAw8DDwMPAw8DDwMPAwsDCAAACvjCOMI4wjiCCAAIAAgAAAAIAAgACggAIggOC4LgsCsOy47AAAgAILLLggoCKAAogCiAKIAAAzzDPMM8wzzAAA/8wzzDPMM8wzzDDMMMwwwDDAAADAwAQQACAgAAgCAIIAICgICgIAIKgqiiIIwAA4oKKIAogCiAKIAogAADPPM88zzzPMAADwwAQKAAIAAggCCCAIIIAggACAKCoCCggKCgAAAICoKgIICgIAAIAgCCIIgqAgCACAoogAOy67Losuiy6IIogiiAAAAwwAAAIDCCMCCAAIAAMCCwIIIogiiCCAAIAEBAABAQEAAIDgMCwLIqMACgAALAuCoKgKoqggAACoIogiuy4LIggAgACwxZcdlx2XH4AAhQCAAAAzzAC77rvuu+67ADvuu+677rsigAQHABQVBVUBVUUUBAUA7LvvPI4jDoPuuOAKqAACCyKIIrsuu+64IAACAA4D0FDUdMTAAAAQUFAAAAAzzDMMw7DjuOy4LoPguO677rsuiyIIAgACBAQAQEBABAYAAgjuuOKAAggggw4gggsuu+647LDggMgAIggCCCIA4LjsuO677rvuuyIIIggAADPPM88zzzPPAAA/DDMMAwzDjMOMw7DjsCOwI4gsCw4DAgAAAAILLIgCACqqDDjiiyy44LLCiggIICKAAICABAUACAKw6LguOy4qCggKCAoIAAADDAMMAwwDDAAA/8wzzDPMM8wzzDPMM8wzzDMAAD8zDMOMw4zDjAMMg4CIAACICigio4yLLjvuM447jCAEBQA47osigyAIyArCggKAIoAigAAAM8wzzDPMM8wAAP/PM88zzzPPM88zzzPPM88zAAD/M8wzzDPMM8wzzDPMM8wAAD8Mw4zjMCO47LjuAKqqAqgKgqAoCLLguOy47DgsOCw4DCAIIAAAAMAAwADAAMAEFQDAAMAAwADAAMAAwADAAMAEDwCAgAAAgIAEBAAECYAAgACAAAAFLwIBAAUyAgEABjABOFQQURQABzEBQAD/AAUvAgEABTICAQAFVwEEAQUKCAAFYQIBAAYwAThUEFEUAAZXAYSEgKCUEMAABl8BQAAHMQFAAP8ABVcBBAEFCggABWECAQAGVwGEhICglBDAAAZfAUAA/wADMQECAAMzAQIABBcBAwAELQECAAQwAQgABDIBgAAENAEDAAQ7AQgABRMBAwAFHgEDAgMABScBAggiCCCAAAUxAgEABhMBM7sCAAYbAe6AAAYeAbvVVQAGIwEMOyKIIoAABiwBBBFQVFQQURQABxQBwPAwAAcbAcA4DoNsWwIAByMBwDAMgCAIAAcuAUAABzABQAAHNwECMAAIHgGAwIDAgAAILAEIDAMgAAgxAQgA/w==',
    16: 'ARALYyoADgAAAAAAAAAFiAMFvwMD7wMCMgQDhQQBhQQExgQF9wQB9wT/AAEQBgAiiCKIIogiiCKIIogiiCKIIogiiCKIIogiiCKIIogiiCCIIIsggCCDI4AghCGAIIwgjCCMI4giiCKIIogiiCKIIogGBAAiACKIIogiiiqKIooAACKIIogiiCKIIogiiCKIIogiiCKIIogiiCKIIIgggAEEBTHcNw8ADAAD/AFEEEMABBQ8PDwQBweDDIMgiCKIIogiiAAAAAMMgCKIIogiiCKqqqoAACKIIogiiCKIIogiiCKIIogiiCKIIYUFFRUEAAQRRBFFVVRQA8/PAEEQRFUVBcEAFz9//39BvLy4A/wD/ACAIogggAAwww8AACKIIogGBqoAACKIIogiiCKIIogiiCKIIogiiABQVFBAAAABFUUVVVVXH//88MAMAAH/HwAGBFUV1MPx/M9zMPAAwAAAIogiiAAAADDAAAAHHTMAiioGBaoAACKIIogiiCKIIogiiCKIIogggAEEEQQRRABQQFVQVVXV9fU9HR1NTf3EFVdRV0dUPz/P8HAGCQCABgYABz/+eGCDDb3wAgYEqgAAIogiiCKIIogiiCKIIogAABFEEUQRRQQUEFBQQEAEUURRRFRVUVRBVEEUAAYE8AAAAAEGDQAgCCIA8P8fB///8MAABgWqAAAiiCKIIogiiCKIIoAABBFEEUQAVUAAAAAMP88PDD8MMQUVUEAAAQFBEQUUAQAABQEUBAEAEUQQQAYOAP//3Xf8AIgGBaoAACKIIogiiCKIIoAAARBFEUVRVRVFUVEREdER0RBQQEBAAQEVVVVURRFEFVUVVRUVBgRVFBEEEAQGBwABBAEADzzwzXTccAAiiCKoqqqqAAAiiCKIIogigAAABBBEEUURVUUVBgVVVFVUVVVVVFFUVVVEEUVVFVUVVVBEEUUVUEURRAAABRQQAAEFBRVVVRQRBAEUwAAAAAIAIqgqiqqqqgAAIogiiCKIIggABEARRFBRRBFVVFVURVQVQRRBFVVVRBFUVBVFEURQVFVRRBFFVVUVVVUVRQFUFQABRBFEQBBBBEUUUBAGBAAIIogiiCKoooigAAAAgACAAIAGCABAQEAAQABAAEAAQEAABgZAAABAAEAAAABAAEAABgVAAEAAQABAAEAAAABAAEAGCACAAIAAgACAAIAAAAACPAEEAgMEEAgAAkYBgCAAAkkBLAgAAzwBEMTAECgAA0kBA/z8/D8ABEgBwDAABEsBMMAgAP8AAkMBAgIAAkYBgCAAAkkBLAgAA0MBwEAAA0kBA/z8/D8ABEgBwDAABEsBMMAgAP8AAjwBBAIDBBAIAAJDAQICAAJGAYAgAAJJASwIAAM8ARDEwBAoAANDAcBAAANJAQP8/Pw/AARIAcAwAARLATDAIAD/AAIyASQRRBMAAjcBWAACOQHAAAJGAYAgAAJJASwIAAMyAgEAA0kBA/z8/D8ABDAEAkjgAwwBGUACAARIAcAwAARLATDAIAAFMAGAIAAFMwHIAP8AATQBAwMAAjIBEMi/bxxUFAADMwEEE8gAAzgBQQADOgEUAAQxAQJY4AM91FUDAAUxAYAgAAU0AegABTYBQEAA/wACMgEkEUQTAAI3AVgAAjkBwAADMgIBAAQwBAJI4AMMARlAAgAFMAGAIAAFMwHIAP8ABFgBDz+ZKiAABVUBBCKLuGAjpBVaqAAGUgELPf8CH5wIyAgwwKoAB1IBwPi+A/MAB1gBMh53/qoA/w==',
    17: 'ARALY0kADgAnAAAAAAAFYAIDiQIHiQIHiQIDiQICYAIMqQILqQL/AdECAdMCA/UCAfUCCNMCAdMCBfUCCvUCBfUCAfUCAdMC/wABEAMDPwACCSEhgYgCIkBAEBQFFAAiCIiAAxAAAwQCAwkIAgMaAAICCggAIACASEAgACJCQAgAiIAIAAAAKAAAKAMJAAICCAgIIICCAggAAQEAICoIAAIgCAAAggAgAAgAAgMKAAIACCAgIICAAAAIACggACAoCgKAgAgqKCioqKCIiICAAKIigoADBQAqgAoggAAgqKGIEBBASAIAAKICoKCoKCgAgAgAgQEAAACEhICAgoIooKCBAQEgASGEBIUEhASgoIgIKgKCgCAgASEBIAKgiAiACIAACIAIAwQAKoAAgqIoCApCQgoIICIKiAABgIiKqCICAgAggAAAQEAACIoKgoAKCEEVUEAAEBAAIAIACAIgCoAqgCoACgCioCgoCCkpIQkpKQqiqKAIqKgDBQCqqiqAooAooAgKoqioAABcVFQUAIKIiiqogAooiIIIiM8yKKIoAkBAIAqAKoAqgCoAqACgAKAAqACoAKAIgAghBVVEFBAIISEFBCAAgQWFAwYAoKgAqACoACKCooAIKqIIKAEgKIKAKAAqACoAqgCIzDOqAKoAqgAAAIADBgCAgCCggKAoKEhBRQUUAigBASEERERFQQACKYmEREBBAwoAgICAAKCgigoCAHJQUFACooiKKigAgACAAIDAAACAAIADFwCAEBAEBBISVEIAIoQEERERFBQQA0wAQEAAAABAQEADqQAABSYBAgIABSkBAgIABiUBVDyiIAKgAAclAQOCAAglAVDyiCqigAgA/wAGHwGgCqioXAQABx4BAgIACB0BgCAqgAgACCMBcAD/AAUjAgEEAQAGIgJUAQEBQRUAByMCAQEEAQAIIgFUAAgkAQQEBFAA/wD/AAU5AQIABjQBAzEaCooqQgAHNAEzmQEFqgAINgEBBIAA/wAGNQEDPmICoiJKAAc0AQIzZgEFqAAINwGAAAg5AYAA/w==',
    18: 'ARALY1YADgAqAEYAAAADygIFygIJygICygIB0gIH2wIR0gIK0gIGygL/A+UCAucCAucCAhsDAjMDAWwDAmwDAqoDARsD/wLlAgLhAwL7AwIkBAFXBP8AARAGAAYMqgYEqaqqqKiooKgGBKqoqKiiqKqooKiiqKgGK6oAAAYJqqJQQFAUQEBQFAQAgCAAAAABAQAgIQGBBQSEgAUVhBSUFBSRhYUFJSGIiKioBh2qAAAGBKqooKCAgAYEAAEAAAEBAQABBgcAQEAAAAEBREFFBQVFUVFVVVVUVFBSAgIoIAiKBgaqqKijoaetp52XnZedl52XnZedl52XAACqqqoGCwAEVUEVREEGBBURBQEAEBAEBUEAEFRUUFBAQ0MGBAMAAAAgIICAiKCjqaWVVVXV9Xzfd9133XfdR9FExXHcd9133XcAAKqqqioCBggAEBAEQFBQUVRUVVVVFFRQAQdcTAw/PwYI/zPP//8AAA//A/z/A/xPUAYGVRX133fdd9133Xcdd10XxHDRcQAABgaqKgoCCAACAAIAAABAABAAAAAQBgQAwwDwADDw8MDDww/D888GBP8/P/P///8PwP8/z/8/U1RFRVVVVf183ETcccUXFAAVF11XXXcAAAYLqioqKooKCiICAgYHAAcfPDwwAw8P88/zBgb/8A/88AAGBP8/DwYF/z8PQ1BRRUB33Xfdd913DXfdd9133XcAAL67vru+u767vru+u767vru+u767vjsOABUVFQUFARAVxcTw8PD8/Pz/88M//DzwAAAABgTw8fExwfHxwcHABgYAAwNBwUHBQcFB0HDQcAAA4rjiuOK44rjiuOK44rjiuOK44rjiuOI4AkBCBgVQEBAGBlAGChAGBVAGB1RVVVUVBRAVBVAGBVUUFNDAwMAAAAYoMiIGBTIiMjIiMiIyIiIyIiIiBhcCAAAGUoAAAAQjAQUIAP8ABCEBEFBAAP8ABCEBEFBFCAD/AP8AASMBAgICCgABLAECAAEvAQgCAAEyAQIIAAE1AQgCAgACKAEIICCgAAIuASAAAjcBgAD/AAElAQgiAAErAQIAAS4BCggAAicBgAD/AAEkASAAASYBKgIAASoBAgABLAEIAAEuAQoKAAEyAQIICAACLAEgAAIuAaAAAjABgIAAAjMBgAD/AAEkASgAASgBAgIAASsBAggKCAABNAEICgABNwEIKAoCAgACJgGAgAACKgEhAAIsASAAAjsBgAADLQFAAP8AASQBIAgIAgABKgECAggAAS8BAgABMgECCAgAAicBgAACLAEgAAIuAaAAAjABgIAAAjMBgAD/AAJHAQIAA0MBgCIKIiKAAARCAaCggICAAP8AAkMBCAACRgEKAANCAQICAANFAQKAAoAABEMBgAAERQGIAARHASAA/wABQQECAAJBAYAAAkMBCIAICgIAA0IBgIACAANGASAgAARCAYAABEQBgAgABEcBCIgA/wABQQECAAJBAYAAAkQBgAgAAkcBAgADQgGCggICoCKAAARCAQEEgAAERwEoiAD/',
    19: 'ARALYzEADgAeAAAAAAAPBwMBLgMBLgMBLgMZOgP/Al8DAWEDASUEAUsEAm4EA5cE/wABEAYAEUQRRBEAAAYFqgCqqqoAqgCqAKoAqgCqAAAAqgAAAKoGCQBEEUQRRBFEEQYHABFEEUQRRBEABhBVAAARRBFEEQAABgWqAKqqqgCqAKoAqgCqAKoAAACqAAAAqAYJAEQQRBFEEUQRAAEEAQQBBBFEEUQRRBEABhBVAAARRBFEEQAABgWqAKqqqgCqAKoAqgCqAKoAAAKIAAAggCCAIIAAUFRERFAUBABAEEQQBgcAEUQRRBFEEQBVVVRQQ0BABglVAAARRBFEEQAABgWqAKqqqgCqAKoAqgCjDjswAQU/7rvgAQX/7rsAAMG17zsOAACguI4iIAgICwIAABBEEEQQRBAAUEMPD8AAAAYJVQAAEUQRRBEAAAYFqgCqqqoAowOMDIwA/+67AFVV/+67AFVV/+67AABVVf+77gAAiC4IgCAIAgDguD4sKCAgLj8DvC8L8PzwAAYKVQAAEUQRRBEAAAYEqqgAhZWEFUFVQVUUAP/uuwBUVf3vuw4AUPzvuw4AQFX/u+4AAoj6oAAAiCKCAwgICAACCAiI4uPi48IAAABQUFQGB1UAABFEEUQRAAAGBKoKAEBQUFBUVFBTP/wA8LzsCwJA0PzuOwIA8L/uCAA77rCCCiCCAAArv////vv++ywCAgKC+Pzw/LsC/P8P8AAABgdVAAARRBFEEQAABgWqAKoqKgAyMDLACgACIIgiCAIIAAMCgOA4DMjuOOCADLijD777DDj88OCwwIDABg4ABRUVBghVAAARRBFEEQAABgWqAKqqqgCqAKoAqgCqACoAgAAy4LDACCKIIogABRVVRUQQEAYSAAEAAQEFFQYMVQAAEUQRRBEAAAYFqgCqqqoAqgCqAKoAqgCqAAAAqgAAACoGGAABBBEEEUQRAAYQVQAAAEAAQAAAAAYFgACAgIAAgACAAIAAgACAAAAAgAAAAIAGGQBAAEAAQAAABhBAAAAGHgEkEBUABiIBUQAGJAERAAYmAgEABxwBCAAHIAFAAAgfAYAA/wAGJQEFAAYnAQUA/wAGHgEkEBUABiIBUQAGJAIRBQEFAAccAQgAByABQAAIHwGAAP8A/wACPQIBAAMwASABBaCAUAQQAAM7ARREEEQQBAAEKAEJDpg2BgU6+4QPuuX/20TvO8G1WtQ1DgAFJwEP8O5E7u5VqrtE/u5V/7tE/rtVVapEVe4ABigBPe5E7u9VqbpE4bpQ/LtE4bpAVapEVe4CAAZCASgABygB8PB8UOcJQpAsEtU5AvBPUeYIO9VeMsgKIgAILQEgAAgyAYBg0DDCItDQYICzEIGBQAAJMQECAAk0AYAACTYCiAUQQBABVAAJPgEQAP8ABCgEAgMtPTcBAAUoAQ//EVW7VQAGKALA/xFVu1QBAAcqATAA/wAELwEq0FRb4QUABS8CqgFFu1VVAAYvAagQVLQABjQBUAD/AAQ1AcoQVDsABDoBwQAFNQKqAUW7AAU6AVUABjUBqBBUtAAGOgFAAP8AAj0CAQADMAEgAQWggFAEEAADOwEURBBEEAQABCgBCw21CzEEOtFUW+EE+hFUuwAEOQHBdFrUNQ4ABScBD/8RVbtVAAUuAaoRRbtVAAU0AaoRRbsABTkBVQAFOwGqRFXuAAYoA/0RVbtUAagSVLUOUKwTVLUOQBWqRFXuAgAGQgEoAAcoAfDwTFDnCUKQLBLVOQLwT1HmCDvVXjLICiIACC0BIAAIMgGAYNAwwiLQ0GCAsxCBgUAACTEBAgAJNAGAAAk2AogFEEAQAVQACT4BEAD/',
    20: 'ARALY3QADgAnAFsAAAAIeQIMeQIDeQIBiwICiwIPeQIHpQIFpQL/DL4CFMACBcACB8ACAcoCAd8CAd8CAd8CCN8CA8oCBMoCB8oCBcACAvsCCt8CBcoCDMAC/zK+AgEfAwIfAwEfAwEmAwE5AwFWAwxxA/8AARADAAMzqqCigIAIIogigBQQBRVRRBRRRUUUUUUFFFRRBRVVVVUAAAMxqqgAiCKIIggiiCKIIghAAwVVFRVVVUABFQMHVQAAAwuqqKgDB6oDBKgDDqqgoKADBqqggAAAgCCIIogiiCKIIogiQAMHVUAFAwlVAAADB6qCIAAAgAABBYWFhQUBARUBUDAAAwURBQWFgIAFFQDxBYCAgKChAQAARBEEEQQBgCCIIogiiCKIIkBQVVRQQBUDClUAAAMGqioKIAAAAFVVVVRQQAUAQVBTAwZVVFVVUUAFVVUAFVVAABVVRUVFUQAAAEAQRBFFEQQBgAGAAYABgAAAFQUBAFBUAwZVVFAAAAMKqioKAlBUFQVVVRVFBQUDB1UVBQVRVVVRAVRVVRUDBVVUAQEVBQQAVVUVRBFFFVURRBFEAAMEVVQRBBEEEQQQAwUAAw6qKioKCkJCQEFBVFRRVEVFRBQDDlREFFRUVFBBFQMEVVQQQFBAEEAABQFQVFRURBBAEEABAQUVFVUAAAMUqioDB0oqAxCqCgBQUlBSUFJAQkACCCKIIogiiAJQVVVVVFFFFRUDCFUAAAMvqgIgiCKIIogiiCKIIoAggCCIIAEBRQBUAwxVAAADMKoKgiKAIIgiiCKIIogiiAADBVUVFQMMVQAAAzSAAIAAgACAAIAAgAADE0AAAAQpATAMAAUnAQUABicBMAD/AAQoAUBQDAAFJgIBBgAGJAFAAAYmAUAgAP8ABCgBQGAABSYCAQMABiQBQAAGJgFAEAD/AP8ABjQCBBAVAQD/AAU1AQdDAAY0AnBwAQAHMwFAQAD/AAU3ARUABTkCAQAGNAEEAAY2ARRQAAY6ARAA/wAFNQEHQxUABTkCAQAGNAFwYAAGNwFRAAY6ARAABzMBQEAA/wADOAEFAP8AAzIBIAADNAGAgCAAAzgBBQD/AAIwAQIAAy4BgAADMAGIIAADMwGAAAM1AYAgAP8AAi0BAgACLwEIAgACMgECAAMwAYggIICAAP8AAi0BAgACLwEIAAIyAQIAAy4BgAD/',
    21: 'ARALYzwADgAYACIALAABuQIB3QIBCQP/ATkDATsDATsD/wE5AwJbAwFbA/8BOQMBdwMBdwMBqgMBqgP/AAEQAQCqqqqKqqiqqqgBC6qoAQiqqAEEqqgBD6qoogEeqgAAoogiiKKooiiiqqKoiqiKAQSqqKqqiqqqogEFqiqqiKABEaoqqqKoqiiiqqIqqqKqoigBD6oAACqKIqoiiiKIIoiiqKqIoiiqKKKIqqiqIoqqqvr+/7+qqKqqogEFqoqooqqqqiKqoiqqIogiiKqoIoiiqKIqqoiqqKqiqqqqqAEFqqiqqgAAqqqoKqKqqIoqqiKIIogiiCqKKogiqoqiKqqqqKOo4KGooaGoqiqqoqqiqoiqKKKKIoiqiCKKIogqqCKIKqgiiKKIKogiiKqiAQeqqKqqAAABB6qKKooiiqKqIooiiCKoIqiqiKqoqqsvvz8qqiooqqKIqiiiqCqqoooqiCKIIogqqiuLK4grqKqqqIiqiiqIKooiiKqoKqqiKqKqqqoAAAEFqiqqqiKqqiqqiqqqqoqiiiKoKqqiqqr6+uqqqKqiqooqiqKKoogiqCKIKogiqoiqKqqq6urqO09SEoCJCIqqiiqKIoqqiqIooooBBKoAAAEKqr6/r6uqqqqKqqoqqiqiKogqqKqoIooiqr7//6qiKoqoiqIqqoqqqAEEqoqqqq+///+qqioKSkqqqqiiqooiiqKIqqoqqqqqAAABDKrr8qCgqqqqKqKqqqIqiKKIIogiqIqoqqrrgsaCqqqqoqqKqqqiqqqoAQWq6uoBB6qiqqqqiqqKoqqIoiiiqqqoAAABCaq+/vrqqqqKqqKqiKqqqoqqqqqiKqqqoqqqvv/+AQWqiCqqoioBEKoqqqqiqioBB6oqqqoqqqIAAAEdqioBE6oqAQ2qKgESqgAAAVKAAAADKwEVRVFUFQAELAFAQFBAAAUrAQUUEEEVAAYrAUAQUEAA/wADKQIFBRQVBQEABCkBgAAEKwFAAAQtAVBQAAUpAgEHEQU1VAAGKwFAQAD/AAMpAgUFAVBUVRUABCkBgAAEKwFAQBAABC8BQAAFKQIBBxQRJRUVAAYsAVBQQAD/AP8ABxgCAQEBFBUFAQAIGgFBQUFVUAAJGAFAQFRUUEAA/wAHMQENBRVVVQAIMgFAQVFFAAkxARBQRBVUAP8ABUcCAQEBAAVLAgEABU0CBQEABkgCQEBAEQUNAQAHSQEFFVVVAAdOAVDUAAhKAUBAAP8ABUcCAQEBAAVLAgEABkYBEBRUVFYYAAdHAQUVUEEFVQAISgFAQAD/',
    22: 'ARALY0EADgAeADcAAAAHTQMPdwMJjQMDwgMHwgP/Cd4DAeADAgMEBC0EAVwECFwEGYgEAqQE/wHeAwHXBAHXBP8AARAGAK6rrquuq66rrqsGCKquq66rrquuq66rrquuqKCCAAYFqqCAAAAiiCKIIoAKKqqqqqgCCCIIIIgAgAIIIogiiCKIAggACAYIAO677rvuu+677rvuu66rBgaq6rruu+677rvssMICoqgKoqiqqqoqCgIAAIAiiCIAqKqqqoAIIogiAAAAIAgigCCIIIACiigGB6AoAAAA7rvuu+677rvuu+677LjgsKGhgYExgYGMwwzDACChoYGBoSEoiCqKoqKiqKoqCgIAAIgCgICgoigIiACAAoACgCIAAAAgqIABFRUGBFUFAQYEAOq66rrquOCgwI8AP8cAD1BUBERFUUVVVQUV1RVFRUFRBgVVFRWFhYWhISAgCIgAAACAAIAAgCCAIIAggCCAIIAgBgQAQQYHVVABAAAArruuu8AcxzA/z8AxwQUVEBVVVVRRVFQGCVVAT0dAUFRVQVBUVVVVAAAACgoCAiAIIAgACAIAAgYEAAUFFQYKVVABVRUAAO677rsAB/A8zAAVBgRVBUFQVQVBEDBBBgVVBUBQVBXB5QQQUkMCCw47Ljsuuyw4LDgsiIyIjAgBgQEFBQQEQEEFAFAGB1UBVVUEAAAA6rruuy4DwPAzPANQBglVUFRBARQEAAwRUlNSUkIKKrruu+677rvuu+yxIUBQVFRUUVFQUVFFRBQRRBRRRAERABRVVVUGBFQQARUAAAAGBKrquu47LsvOMzIDTExCQ0JLTksOCy47Lrvuu+677ruuqwYEquq67rvuu+47TEEVFVVAUABBRBURREUUUUUVUEUVAAVUVEAAFFBABgYABgqqrquuq66rrquuq66rrquuq66rrquuq66rrquuq66rBgaqrqsOQ1RUFBVVEUFQEEVFFVVUQQVVVVUGBQACCigAAggCCAAABgyq6rruuu667rruuu667rruuu667rruuu667rruuu66rgYFquq67rouOk5CUgIQFEVRFEVRVAYEVQEAIqKOCg46LjouKgAABjuAAABAQABAQAAAQEBAAAYKgAAABSABBAQABSYBBQAGIAEQRBEFEAAGJgFAIEAQAAcoAQQABysBEAQMAP8ABiABFFUVBQAHJQIFBQEACCYBQAD/AAUgAQQEAAUmAQUABiABBBEEAAYkARAABiYBQCBAEAAHJQIFBQEEAAcrARAEDAAIJgFAAP8ABSABBAQABiACBAEFAAckAgQBBAEACCYBQAD/AP8ABTECAQMABTUCBAEUEQQBAAYyAUDUBAAGNgFAAAY4AUAA/wAEOgEEAAQ8AgEABTECBAUUFAEUEQQBAAU9AVUABjMBQCRUAAY3AVAA/wAEOQEEAAQ7AgEABS8BEAAFMgIZBgEFFQUBAAU8AVUABjMBQIQEQAAGOAFAQAD/AAQ5AgQEAQEABS8BEAAFMQIEHBIVBAEUBQEABTwBVVUABjQBoFBAUEBAAP8ABS4CARQEBAQABTQCBQQBAAYyAUFREEBAQAD/AAQ5AgQEAQEABS4CAQQEARsSEAQBAAU4AhQFAQAFPAFVVQAGMgIBhbQQQBAABjkBQAD/AAc+AwIBCA0AB0cBBQUACD0BgPCgaBwA/w==',
    23: 'ARALY0sADgAAAAAAAAAK3wIB3wIF6wIB6wIU3wIC/AII/AIE/AIPEAMF6wIDJAMS/AIU3wIDEAMBJAMBJAMM/AIB3wIH6wIE6wL/AAEQBAQgAAMDAw4LDgsOCwIEGAAEBAMPPjPuO+y47rruu+67BBcAAgIADgs8O+K77rrAsuywwIACCMKI4rgqKAoCAgQJAAILDjvu++674rPiuKyorKjoKAKCgqCggAQQAAMDDg86Ku7DLrvuoI644IuOKiqABAUAgACDAQAggCCI4qgiOC4IAgjCiMwLAoOCgOi47LvuOyww4IPOCy47LrquuwQJAAICDw477vvuu+676qoCuu6qqgCqALuuqogqAgQHADDgBAgAgACAAKiKACCw7LvqO4CzLgAuCOy4LDgsCA6D4LuouAQHAAIuq+666qruqqqq6qqqquqq7qqqKKoCoOiqqoqiCgQFAGY8BA8AgCCAIADAg8KLDovCMO644LKoKAIDDjo6uAQHAKCoqqKIooiiiKKIoqiiqKqKKogiiICoqioKiqKoqqoKICoKAgIAAgIDBAsAAx577gjCgKCwooLKiCAggAA+++66qqiyyAQKAICgIKgoiiKKIogiiCIKgqIoqCgqCoqiiIqiqiIoqAKgqooioOCoqgrguO44AArqqOgiAooggAoooIAICIADLgAAu+6orrvsuCCABBEABAWABASgqKgoCoKIoogiiCKgKIoiiCIAgqgKAAKAAIgKigoooIigigiACoICK667rrrqgCigAIMODwgPPvvuuwQeAICgIIAoiCoKAoAqiCIIIIAiiCKCIooKiioqKqqqoIAAIqOCi46LDjoquMILLrvus+666qiuuAQoAICgIAAoqiIIAIgiiKKoqqiiiAIoogrqiCqI6qiqiAAA7vjuuwK4qrgiuOKIBC4AgIAAgACAAICAAACAAIAAgACAAIAAgACAAAAAgMCAAIAAgACAAIAAAAQ6AbAABTkBFgD/AAM6AQMABDoBQAAFOQFoAP8AAzoCAwEABDoBgOAABTkBcDwA/wADOgIDAQAEOgEw4AAFOQFmPAD/AAM7AgEABDoBcOAABTkBDjwA/w==',
    24: 'ARALY1YADgAkADoAAAAB0QEBGgIBGgIP0QEE0QEKGgIBPwL/BYoCAowCCr0CAb0CFIwCD84CBc4C/wSKAgH5AgH5AgH5AgH5AggDAwEfAxQfAwEDA/8AARAGBnYAHAcBBh8AAwMGCQ8DBigA4HgzAwcDBhcADz8GDv8/DwYjAAEHDTfNwWExBgcJBg4AAwYM//z8BgX/BhEACgoKAgIEBB0/HAAABgQTc9PRUNJQ01NDQ0dHBwcHBhAFxfX19/X39ff139XAKqoABgX/BgYADD8/8///P//zAw+PjKKqqqqoIwcFICAjIyMGBCEgAqgABhIhASEBIUURVRFXV9VV1XXd9V9XFYUABgX/BgYAgCAgKCjIyAgoKAAqqqihhw9N01FBAQHBwUFBUUEggAA88NTU9PT8/f3/3Xfdd113X11fV3V11V1dVVXVBglV1VdVAAYF/wYRAIAGBAAGBUBQ0HTcdHx/X19cc3NzBgVwMDAQFEXAQMBAQEDQBgVQVHTUdN11XVdf9dVXX131UAAGBf8GIwBAAMDwMDAGB4AGDQD///8/Pz8AAEDAUPD0UEAoqirABgT/Bj0ABgX/8AYLAA8GBf8GPQAGBcAGDAAGBsAAAAIwAnAcGwYBAAMyAYDgL3cuDwcDAAQuAgEDBx022joySAREFAIFLQkJAAUrARAABS0BQMBAAAUxAYCAAAU0AYAQkFABBEAA/wACLwJwbBsGAQADMgFgL8ASEQwABDEBIODQMIBA4AAEPgEkAP8AAi8CcBwHHQcBAAMyAeDP72U/AwcDAAQuAgEDBz3WCgqyCOREFAIELQkJCQAFKwEQAAUtAUDAQAAFMQGAgAAFNAGAEJBQAQRAAP8A/wAILwEjIAMsLwAINQEDAwAIOgFAQCAkVVQFAAkwAUAACTIBgPDwwLCwAAk9AYCAAP8ACDMBAgMACTEB8PxIMLAA/wAILwEjIAMsLQMDAwAIOgFAQCAkVVQFAAkwAUDwfLjAcLCwAAk9AYCAAP8ABhsBwAzwDAD/AAYWAQMDPwMABhsBwAP8DAAHFgEBBIDg4CAA/wAGGwHAAAYdAfAA/w==',
    25: 'ARALY0sADgAnADEAQQACdgMBdgMBdgMBdgMBdgMGdgMBdgMFdgP/CpoDBZwDGZwD/wOaAwWkAw+kAwmkAwekA/8FmgMDKwQDKwT/AAEQBQAAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAKgAD/wFBgACAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAAAAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAAA88AUHAKoAqgCoAKAAgACgAKgAqgCqAKoAqgCqAKoAqgCqAKoAAACqAKoAqgCqAKoAqgCqAKoAqgCjD4cAowOgAKoAqACqAKoAqgCoAwcNBwwEDAUEAKgDhwEFCQDAPw+AAKgAqACoAKoAqgCqAKoAqgAAAKoAqgCoAaMPjz83PTcACgoCzUfff9133XQdDz13PTccgACgAHDwcNx33X8fPx03/ffdd910DAUFAAMDA8DABQgAAwADAAAAgACAAAAAqgCAH3/999133Xfdd903nXf99913zQcdd9133XTAQw03HR8NR91/H3/9d9133XfRd883EAUKAMA8DwAAAPwPAwMFBAAFBMAFBACqAADAdN103HDQQAAAAAcdENR00E8+OioqykAANNx03HDAQMFHwUMNB8033Xfd9/3/3XcBBQsAD/wFBgDAwDAwDAAMAAMDAAAAqgACBQwAgEDAQADABQSggAUHAAMDwEzAAA1HwXfdcNBwwXfdd9FzAQAMDAUEAMDABRUAqgCqAKoAKgAKAAIAAgACBQUAAgACBQoA0PTcdB133Xfdd9x00DAAQMBw0HLQMgACADIwMjAy8MLAysDKwMrAysDKwMLw8jAyAAAAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgAqACoAKgAqAAoACgAqwHLQAAAPAwUIAIAAoACoAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgAAAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAKoAqgCqAKoAKsDKMDI8DA8DAwMFCQCAAIAAgACAAIAAgACAAIAAgAAAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAAAAMDAwAUZAAADLAECAAQsAThgQCAgHAAFLQIBBAFEMAAGLAFAAAYuAcAA/wD/AAQiAQgMAP8ABzIBAwIDDAwABzgBBwgEHAAHPQIBAAdAATEcAAgyAVAACDQBgIFDQAAIOwIBA4Cg4DDAAAhDARACAAk3AcBYEHLQDwMPAwAJRgGAAAlIASAACUoBCAAJTAECAAo8AYDA4PD4DD4zDwwACkcBAwMAClABgAALRAGAAAtGAcDAAAtJAcDAAP8AAToBp/wP/AABRAGoAAI4Aao88DzwAAJCAaoAAzYBCAD/',
    26: 'ARALYzUADgAVACUAAAAJYwMKYwP/BYsDAo0DD9kDAtkDBY0D/wWLAwI6BA9iBAJiBAU6BP8AARAGACKIIogiiCKIIogiiCKIIogiiCCAAQUFBgcVBQURBgUVEREBAQQEBggBBhoA7rvuuwAAIogiiCKIIogiiCKIIogiiCKAAFBcd113XXfdd9xQVVRUdNx03HTcdNxUUFBEVF13XVddV1VXVVcVBQUBAQEGDwCw7rvuuwAAIogiiCCIIIAAhACAAIAAgAYGAMBAUFBUVAYEVRUXXVddVxUAAQUVV1VVBgQVFBDAQMVFxUXRcFddVVVUFBUFAQQFAQYFAAsAu+67AAAiiAEEEQQRBBFAEAQQABQUFBUFBQYEFQUFAQYFAEBBRVXVVVVAUFDQUNBAQEABBQUBAAAAUF1XVVUVwUBQFAQUUEAAAEAAAC677rvuu++7AAAgAAFEEUQRRBEEEAAAQAUVFVVQUVRVVQUVVVRUARcdFV111FRQQAYIAAEVVVVVUEAAAAABQdB0XVddAwYFAAMOAAAA7rvuu++7/7sAACIIAkAQRBFEAQQABAAEQFVVVRUEElBSUAUVXVfVVFFBAQAAAQEGCAAFVVBRUQUFFRUGBVUUAHDcdx0DAACAsOwAAADuu/+/77/+uwAAIogiiCIIAggCAAJAAgASACIIIogiiCKIIghCSEJQVHRdVxUFQVAQAQEGBABQVVdFR1UVVVRUUFBAAAoqqipU3XfdBRQGBQDuu/7v///vuwAAIogiiCKIIogiiCKIIogiiCKIIogiiCKIIogigACAAgAAQNBw1FURV11XFQUBAEBQ1FTQQAAAAAEBIaCouKqoqFV13VdVBVAAAADv/+7/vv/++wAAIogiiCKIIogiiCKIIogiiCKIIogiiCKIIogiiCKIIogggCAAAABAQNBw3HRdVxUVBQUBFRVVVUEBKUVUABQSQlB33FXcVQEAAAv/u////v///wAAIogiiCKIIogiiCKIIogiiCKIIogiiCKIIogiiAIAAggCAAAIAgYJAMBAQHLSctJyUlJKSioqruqqugpyUw5TA08/778GCP8AAACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAGDwAGCYDAgICAwICAwIAGD8AAAAMrAQQAAy0CAQEABCwCAQAEMQFAAAUoAUAABSoBRQAFLAEEVRQA/wD/AAhAAgQBAAhIAQMLCwoCAgAITwECAgAJOwEMAAk9AgEACUICBQEVFVVVQYG50cGFtLroAAo/AcAACkIBIIYmxnZWQkhYOCCgoOAA/wAHPgEFAAgzARAACDUCBAEACD8CFAEACTcBQAAJOQEQAAk9AQICAAlAARAACUIDAQEpKCqqqio6Pj8vCwIACj8BwDcdFxQERFQQlaO6uKCgoOAAC0EBAQTAgMCAgMCAAP8AAk8CAgQBAANNAg8BCQFCE1BEVRAEAQAETgHAQFAUBBRQIFBAQAD/AAJKARAAAkwCBAEGHBURFQQFAQEAA0wBoExoQUETB0J2YQADVwERAARVAWBQQAD/',
    27: 'ARALYzUADgAVACUAAAAKVQIHVQL/CXECAnMCD8MCAsMCCnMC/wlxAgL/Ag9PAwJPAwr/Av8AARADAxoAAgAAAggCCAIIAgIIAiAKIgooAgoCCgAiAiACAgAIAAICAAIDJgAIAgAKAqAKKIoqqiqKqKqqKgMRqioDBKqKooqiqqqqiiooiigiCgIICgICCAACAw8ACAoiiCKKIoqqCqKKKqoiqqqKAxaqqKihoaGoqKGhoaChoaCoAwSqKqoqiqqqqqKqiiIIAggAAgMEAAgiCCKiKiqqqiqqKgMQqqihowMJj4cAFRUVVAFUUEEBUFRUAFRUVEQEFBQUhKADCKigqCCIIAggCAAAAogiiqqKAwWqqKOnAwSPsLy+j46Hg4CHhw9/////f38/AA8fMAUVVVRBFUABFVRQUUUABQMHFQMUFAAAAIgiqqqoAwWqCvL6AwT8xv4++Dj44ADg8fwDBv/9dcQVVFFBBEQRBUUVUEUVVQUDE1UDCkUAAAAggAggiKKoogMRqgpSVBQU0dFFRRUUQRBEEREDBFFQEAMEUAMGUVADBVFQUAMHUlBSUlJQUlBSUAMFAAiAgCKIIoCiqKqoogMPqgMEKkoKAwVKAwRSQkRUFFQEUAMEVAMEUkoKCioqAweqoooqiCCIIIAIAw4AgCCAIIIoqKiiqKKqqKKoqoiqqqIDIaqoqqKooqqIqiiCAIAAgAMXAIAAAAAgAIAAoKCIoogiiCCooqgoiKKKoIigqIqooKigqKggiKCgqCCggAiAoAKAgAiAICAAAACAA14AAAUmARAABSgBCQQDBwAGJgEEAAYoAcAY4OAA/wD/AAc0AgEABzwEAQEBBAYCBAYDAgQFAwICAAgxAWBgQEAACDYBGBgeHgYGR1cHEVUACEICQVEFAQAISQFCAgAITAHQ4KCggIAACTsBAQuAAP8ACDEBYAAINAFAAAg3AgcBAVFVBBDF1KCxsPDw8PHx8bj6+CgACTcBgICg4GBgYGgBBHhgYGCgoICAAP8AAzsDAgICCi0tJAEAA0QCLS0lICQlIAEIAANOAQIABDYBEBAQEbcFQEARBFQEVRRQAARGAVAABEgBUARERBRURASUJAAFOgFAAAVBAUAA/wADNwECCgsLKL29tQUAA0EBkLWxgJCRhQUkIQgCAgIABDMCEBDx42efy2UBFQAEPgFUQRAFUUUREEQcGBg4OPj4+LgoCAgABTcCHyVUUFUBFEVAAAVBAUBAAAY2AcBAAAY5ARBAUBBUAP8=',
    28: 'ARALY08ADgAzAAAAAAAK3gECCwIBCwIFIQIJIQIDCwICMgIBVwIUgwIEgwIMnwIHzAL/BPkCCPsCBfsCDPsCA/sCAvsCAvsCFPsCA/sC/wABEAQABDOqgAQgAAQxqqgEIgAED6oEBKgEBqCooKGjoQQEqAQMqqiggAQjAAQHqqioo6OMjAMwDDMPMAABBQUVEAUUEwMQExQVFQUFBAmFBQEhECgVKhUqFSoUKBECFapUqFCgU6NAgEAEDQAEBKqADz8EBf8/P//MMAEFV1133XcdBQVHxQcFB0VFFwdAVUEVQHPFEFRVVVRUFAGqUKBAgAAAQYIBAgECAQLBwgECAQIBAgQKAAQEqgD8BAX/8PDBBRddd91333fQQQVAFxdATNB/33dxARx3AVQB/1QFHXddd11VAKpVKhUKBYJAqlSoUKhQoECgQIAEDgAEBaoqysLwMAD8Pw8PT9Nz03T99w1TVRHBxQUff//99d11VRHRc9133XdcVNFSRSpUqlCoQKAAgAAAAw8PPz8PPzMPAwQOAAQLqioqysrKCgLy8gQEAgAMDAxMVFRUREIKCgQIKkqKQoIECwDA/P/8//z/8/wM8MAEDQAEMaoqCgIEIAAENaoqCgQdAAQ4gAQbAAAEKwIBHwYBBgEABSwBMMAABS8BQEAABisBAidViS8ABysBgAAHLQFAQIAA/wAELAEKAAUsAXAABiwBLAAHLAHAAP8ABCwBDAAFLAGQAAYsATEA/wAEKwIBFwYRBQAFLAHAwAAFLwFAAAYrARoLVYUqAAcsAcBQAP8ABC4BEAAEMAIBAAUsAYAABS8BwEAABisBGAAGLwEFAAcrAYAABy4BgIAA/wAELAECAAQvAQMABS8BwAAGLgEMAActARDAAP8ABCsCAREGAQUBAAUsAaDAAAUvAYBAAAYrAQIWVYUvAAcrAYAABy0BUICAAP8ABCsCARMGAQYBAAUsAaDAAAUvAUBAAAYrAQIWVYkvAAcrAYAABy0BQECAAP8A/wAEOgECAAQ8AgEABToBgMBAAP8=',
    29: 'ARALYyUADgAVAAAAAAAF+AEI+AH/ChcCBRkCCtECBVcDCgYE/wABEAYGGgAP8ogigAZNAAP+iCKABkgAAw88MDgPAPAiiAYUAAICAgYGCgYEKgYEqqioqqoqCgoCBgYABgUDBg0AAw8/P/DAAgoKKighBRUUEQATBAYEBQEBAAAAPwMAKAYQqqiogIgiBgiqKgAADAAAAAICAgYLAD8GBP8AACqqqqqAFVVVUFRUFBUVVVVUUFVVVBUFwfD8Pw+DoaCoqqqKoqKgoICAIAAAAAoGC6oqAgDzAKCoqKoGCwD8BgT/AwCgqKqqClJUBVUFxQUGBFUVVUExBVVUUAACCsLy/P9/Px+PpwYEqSoKCgoCgKCgiiopKakpqamqoIAP8AYTAMDA8PAwPwKAoKioKAYMSAgoKAYHqgrwBgj/f38/PwYEH4cGBEdPPHAAAAMMPwYF/wYRAA/yiCAGDgAgyPr6+v4+PgYGPwYK//4w//P/88wxxfDAAAAADDDMMMwz/DP88/wGDwAP8oggBhMAgICAoKioqqrq6vD4+AYF/PjwgAAAwADFFVFFBBQRFRQGCQDAAMAGDQAP8ogigAYbAICgICiqqqCAAgoIIIoKAioqKkJSVBRVUUAAAAIKCgoGFADAgACABiIAgIAABg2ABgYAgICABgoAAAhRAQIJAwAJTgIEEIBQEQEUFBQAClEBQEAFEFAA/wD/AAJKAQICAAJNAQEGAgADPgEDAg0yOjrFxcrFJaqmJur6+v/9+P8vKgoKAgAEPgGAgKBgYGCYmJqar69vb6j4gtpgqPrqqqqoAARYAYIqAAU/AYCAoCgIAAVGAaCggIAABUsBICAgCqqKiooKCgoqqqqqKgAGRgEDAwMABk4CgKCgiiopCYEBgYEKAAdGAYBgYODggICsICwjt0RES0RDD3wwAAhNAcAACE8BwAAIUwHAAAhWAcAA/wACSgECAgACTQEBBgIAAz4BAwIPMzMzw8PMww+IpKzk9fXw8PXwrQgCCgIABD4BQCj4xsbGwcEzw/UFCQkABE0BVQIHFgIFFAAEVQECCgooAARgAQIABUEBIAgABUQBgIAABUgBUFBwcAEEIAAFUgEgoCAggAAFWwECAAVfAYAABlkBgAD/AAJMAQEKAgADQAECCQkJBiYmJioigggGLy8BBA+CoqigKCoKAgAEPgHAqFimpqZZWalZWKpkzICMKfT1ofT1oaOgCKqqqAAFPwGAgIAgqCgowjhQXGFjAzMREHR0Q1XA1VQABVgBgqgABkYBAqpVJfH66fL8AAZQAcDAgAAGVAEgAQQoIKCAAAdGAXCsY2xso0+wPzA8MwMAB1QBDAAHVwEwAAdZATAACEkBwMAA/wACTAEBCgIAA0EBCAADRQEgICAAA0oBgIIIICAAA1ABAgIAA1QBgKCgKCoKAgAESAECAARKAQKqKCGpKYMBBQsCAgAEWQGAqAAEYAECAAVDAaCoqGKYgIwRMwMzO5r+/un/6v/+qigCKgIABV8BgAAGRgIBqVYl8frp8nygYEqqKSmpKampqqCAAAdGAfDMA4yMI88cHxwfhEdER0RDP3wACEkBwMAACE0BwAAITwHAAAhTAcAACFYBwAD/',
    30: 'ARALY0wADgAkAAAAAAAFmwIDqQIFtQIJtQIPtQIUmwIFmwL/AsMCAsUCAcUCAcUCBMUCAsUCAcUCA8UCCMUCA8UCBcUCAcUCAcUC/wABEAEAqqoqiiCIIogiiCKIIgigARuqq78BBf8vDwMDARUAAggoAQcAAQWqKgKIIogiiCKIIgiAqK+urwEMv6+vrq+vr7+//v/u/+4BB//v/+s/Kj8KDwIDAgMBCACjDwMDAQcAAQiqKIMgiCKIIoAAKvjq/+r/uv/q/+r8qPGj86Pzo+Oj46PBqPCo8Kr86v76//7//v+///v/uv+q/qj+qPOjzz8/AQj/Pz4wAAABB6qgD///DyOIAAAAqgCoA6OOjs4/P3////f99/0BCf9/H48DqACqwKr46v6+/7v/qj/AM88888vA8P///PwBBf/84AACAAABBqqoA/////zwygCqAIA/////gKiuroDwAQT/f//w/P7/K4K4yvIBBP8AAKoAqgCqAKrAqv+izAD/AP/APz/wzz+wAA/8+OCKACoAqgAAAQaqAPzyyACqAKoAqgCqAPz///8/Dw8PP/z48PP//38Pf///vz8e+PLKyiqq6qLyoPCg8KDwoPCg8KAwIMAwzOMP/8A6/MADDwODAIAAgAAAAQaqCoIgiCIIAqAAqACqACrA8gEF/ACouAIA4uLCysrKiqoqAQuqKgoCAQ0AwMLyMjwBBfzwAQUAAQmqKgqCIIgiCCABBwACCCKIIogiiAKgAReqKioqCgoKAgICAAAAqAKCoCgBCgABDaoqCgICCgoqKqqqqiqCIIgiiCKIIogggICgoKCoqKgBGKoqKgoCgoAgAQoAARuqCiCIIoggAQwAAgKKigEZqgEIKgAAAR2AAQ0AASiAAAAFKgEuDAAHLgE4MAD/AAUrATQABy8B8AD/AAUqAS44AAcuATjAAP8A/wAFNgHUqSQIZBgABjcBQIAgoAD/',
    31: 'ARALYzsADgAVADEAAAAEJAMaJAP/Aj0DAT8DAT8DAT8DAz8DAj8DBGEDFK8DAuUD/wE9AwJKBAVKBP8AARAGAAY7qqiooAYFoqCoqAYMqgAABjaqqKiggAgoqCgqKgqKioKiIgCAEDQcBIGDjYcdNwAABg2qBgWooaOgoKCoqKgGBaoGCKkGDqoKgjwPA6ioqCAiIgKKAiIgICAAAQcdd9100EMNBwAABgWqqKGggIAABx9//3/df913zQMBANAEwQFTR08fPT89H09QU1NTUJSVpaWpqakGBKqgD/AK8D+AoKiooKGggYSBAAAD3XfcdNAADXfddwAAqqijjx9/wAAAB9333Xfff9xw0AAAAUTA09DV9NBz70fdd9xxxRdd9NMPwHM/PAAwPz9NgzDIKKChBPA/AEQRBBEEEAABBAFw0HTcdx133XPQQwAAgD/9993EAAAAd9133ffddwEADH//AcEH/QX/fx+HxcHEAVB000MHzd0x4MABBx133XTccQUAAEAQQAP8AUABBAEEAEQRBAFEEQAAQNBx0UHQdAAAAHfdd913EAAAQNx33Xfdd913HVfVc8V3/f9d9/133HfdN11fFxcFcdz0/Xd9dRwBFRVVVVRQAQQAA/wAEEARQBEEEUQRRBFEEEAABAFA0FXdVQAAqgrSdN13DQYEAHTdd9BHPHvxcNHwXVTff95AUNf1Nx1H3XTc9HFQQUQBBAAEQEQABBAEEUAQQzzAEQQRRBBEEEAQQAFEEUABBABEEUQRBAFEAAAGBKoqSsoyBgQAwHBcF8VhsXGxceHBhAQQEFFw0UTBBBFEEEAAQAEEEEQQRBEEEUQQQwwwwAARQBFAAQARQAFAAUAAQAEEAUARABBEEUQRRAAABgyqKgIQBAAEAQBBQAEEEUQRRBBEEEAAQAEEAQQRRAAEEAMQQwxMMTDBBBFEEUQRRBFEEUQRRBFAEQQRABFEEQQBQBEEEUQBQAAABhGAAABAAEAAQABAAAAAQABAAEAAQABABgkAQABAAEAAQABAAEAAQABAAEAAAABAAAAAQABAAEAAQABAAEAAAAQqAVDAUAAFJwEFEAMEAAYkASwDfLAA/wD/AAU6AQ6/TCs8AAVAAQ8ABjUBBAAGOAEQgEAgwAw44IAA/wAFOQECAkArFAAFPwE/AAVCAXLOAwAGMwEEAAY1AQQEGKCooEANMsIKKqmorXAABzIBKAAHNAFgAAc3AcAABzsBgAAHPgFAAAdCAUAA/wAEOQMCBAEABjEBBB0IBQAHLQECgAAHMQHgAAczAUAgAAc2AdAABzgBQAAILwGAAAgxAYAA/wAEOQMCBAEABTkBAgz/Zz88Pw8ABUIBcs4DAAYxAQQdDAUABjYBBBiwKOBgzT766qqpqK1wAActAQKAAAcxAeAoQEAABzYB0MBAAAc7AYAABz4BQAAHQgFAAAgvAYAACDEBgAD/AAJZAZyzvaQpICggkLIAA1cCIQccMAEDAQQABFcB3HQABFsBDHTQAP8=',
    32: 'ARALY18ADgAkAEkAAAAIBwMFBwMPBwMJGAMKJAMUBwMEBwP/ATUDATcDAU4DAVcDAVcDAVcDAVcDCVcDAjcDATcDBDcDATcD/wg1AwJtAwiJAwWJAxltAwNtAwltA/8AARAGAAYoqqiooKChoKGggYTBhMCEwITAhMCEwYDxoPCg/KjwoPCg8KDwoPCg8KDwoAAABhuqBgWooICAhIGEAAQRRBBAAEQRBgUAAQQQBgYAQABAEEQRBAEGDwAGE6qoqKigoKGBEUERRBAEEUQBAAAQRBEEQRAEAQARBAEAAQAQBAEAAUQRQABABgUAQBFEEQQBBgsABhCqoIUUQAEFBBERBgRVFRUFAUEQRAEQBABBEEQRAEAQAAFAAQAARBFEEUQQRBEEAQQBBAEEEQQRBAEEAQABAAEGBQAGEKoCVAAAVVUQEZFVVUEUAFVRFUBUABBAEQQQRAAAEQQBQBEEAUAAAABEEEEFFRUVAAAQABAAEAQAQABAAEAAQAAAAQAAAAYLqqioqKOjo40NDwACCgqKBgRKQkJCEgISABBEAEQBBBFAAQQQAABABAURFAURBUFQVVVUVAYFAAEAAQAAABBEEUQRRBFEAAAGBKqgj46OOjo/BgT/BgRV/wOoBgmqBgSoIyMDAwwMTAwwMDAxwMDABAYHVQYLAEAQQBAEEAQBQBBEEUQAAAYEqgD/BgSq/s/MwYcPBgRV/wCgo4yMjDAyMjLCysrKBgQqqqqqKioKQhJAAAQRBBFEQURBBAEEAQQBBAEEAQQBBBAAEAITQg8KD0oPSgAABgSqKsD/BgSqMHPnzwxUVVVV9Q8AKioGF6o/Kg9KA0IQRBBEEEQQQhNCE0oPSg8q/6r/qv+q/6r/qv+qAAAGBaoA/wYEqsIzH4zAAwYEVf8ABhmq/6r/qv+q/6r/qv+q/6r/qv+q/6r/qv+q/6r/qv+q/6r/qgAABgWAAMAGBoAAwADABgRAwAAGGYDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAAAAEKQEHAAUpAYMABikBgAD/AAQpAQYABSkBAgD/AAQpAgEABSkBgQAGKQGAAP8A/wAEMgIBAAUtAUFdFAREFVQABjEBEAD/AAUtAUFhQQD/AAQyAgEABS4BPFUERBVUAAYxARAA/wAGQwIBFAQRFBQAB0MCFAEAB0oCAQAISQFAAP8ABUkCAQAGQwEFEhYGAklJFAUABk4CAQAGVQIBAAZXAgEAB0EBBAXRVVVUVRUVFEBAAAdUAUAQBAAHWAEEAAdbAgEACEABQFQACEMBBVAFEFUUUAQACEwBBAAITgEEAAhQAQQACFIBBAAIVAEEAAhWAQQRBBAGAAlEAQgQAAlXAcAA/w==',
    33: 'ARALY0gADgAkAC4AOAAFygIIygICygIP2wIUSAMFSAMJVAP/BcEDA8MDCcMD/wrBAwPfAwHfA/8BwQMI9wMC9wMB9wMD9wP/AAEQBAAEFv8EBvz//wQE/P/8/PwEBP8EBPwEJP8AAAQU/8Aguv+uzq4AyMj/rq4AKjywigogPDo6AIMzMwAzAD4AMjAyMjIAOjrAMzPM8AQR/wAABAn/BAT8BAf/ACoK/+/P/wA8P8MjIwMPAKAgAIgAqKAICCAiACIAoAKoAiAoCACIiAgIA88P///88/Py8vLw8Pzz8AQE/AAA////8MsrIAgigACAAQHBxPDwACsA/v7/6+PrACLAwAgiCMDAwPz88IIIIogiiCKIIj8A/v7+AP8EBfz//Pz88M8AoKDg4KAAIgAzAODo6OgAAP/ALgDu7gCKAgISYBRUVFBAEADqAKiu/6qrqgAuAD8rKwAKDvrLwOIPujqAAzIyADIADwAogAwMDAAPDwDMDAwAAP4A7o6+vr4+DgIwAAAAAwMAAP8DqACqqgCooKCkDEVVVUURUQCrAAqCz6oqqgACAPK6ugAAAK+iAooAoKIAgIiIAIgAqAKMgoCIiACoqADMiIgAAKoA6+gEBOro4AwAAAPDwwAA////D4OICIAgCAIAQEMTEwcPACAAqqo8qrKqACADAwggiAAAAA8PAyCIIogiiCKIIgAAqKioAD8EBQ//Dw8PA4gABAWCACIAzAAKurq6AAAECf8/Pz8ECP8AqqvAqqyqADPww8rKwMLDyogAIgA6OjAgDAyADAADgI6ACCggACMjICDA8/D//w8EBY8PDz/PDwQEPwAABBT/AAKgAIiLiACDg/Di4gCowArioAgAqKgAwoiIAMgAyACMCMjIyACoqAPIyDMPBBH/AAAEFf8/jw+Pj48P//8EBD//Pz8/BAT/BAQ/BCT/AAAEUsAAAAUcAWwABhwBDQAHHAGAAP8AAxoBAwMAAx4BAwMABBQBDzTb6yMCiCIABB0CAYHAxTE0AAUSAT/RwMDu7mQCiBAOBlRYBBRAAAYSAfxXAwKqqgKgCASh4VUWEEQUAAcUAfB8h4sIKIgiiEIDU1AUHAAIGgHAwAAIHQHAwAD/AAUfAXwABh8BGwD/AAMaAQMDAAMeAQMDAAQUAQ802+sjAogiAAQdAgGBwMUxNAAFEgE/0cDA7u5kAogQYgZUWAQUQAAGEgH8VwMCqqoCoAgErOFVFhBEFAAHFAHwfIeLCCiIIghCA1NQFBwACBoBwMAACB0BwMAA/wD/AAJRAdLdMwADSwEKCgo4MQcHzAAESgEBBsAA/wAFUgEMMgAGRwEIAAZPAUAABlIBzCIA/wAHTQEDAwMACE0BoKxM/AwDAAlRAcMz/AD/',
    34: 'ARALY00ADgAtAD0AAAAJxQMK1AMJ1AMGxQMDxQMG1AMP4gMF4gMS1AMPxQP/BP8DCgEEEQEECAEEBwEE/wj/AwowBAkwBBQwBAowBP8AARAGAO677rvuu+677rvuu+677rvuu+y47Lvuu+677rjsuOy47rvuu+677rvuu+67IogiiCKIIogiiCKIEUQRRBFEEUQRRBFEAEVVVUAAFVVVUEFVVVUAAO677rvuu+677LjssM6KCDMiIjy+vgA6Ojg4AszMyMjIICPCsO677rvuu+64IogiiCKIIogiiCJEEUQRRBFEEUQRRBAAFVRQQRVVUEEFFQYEVQAA7rvuu+677rsA/g4DAygAIgggDouOOy4LzosiOAiIyIPuO44L7rvuu+67IIggiCKDIogjiyCEEEQQRBFEEUQRRBFAAEEFFVVUUkgABgdVAADuu+677rvuu+47gKOo6jo7Pw4Ojs6DwLDgs+Kw77Lgs+K47rvss86OOjjo4uKAIOCiAqio8vqoAOjoIk4SQhBAAgJQU1NUAKIKoqgABgZVAADuu+677LjssMwAPPwwD4Dw/AYEqqgAAw/DjA7AjwjAgwLCiA+ioI4CKKCKKKCCCCIIIQQBBAEAIaAhCIGAiCiooACqqgCoACgAAAYHVQAA7rvuu247DgMMAM/PA/wAw88/Ojo6DsDw/PAIOADwKAjIgIgggDw6jgMwLAsCgCCIIYQRRBFEEUQRRBFEABVVVFBAAQUVVBCAAIEFVFJSUFVVVQAA7rvuu+677rvuOwDjDzrq+voGBKigAAMC46ID4qMC46IL7rvuOw6DoOg6CMAPDg4AQzIgKEMPSgoCIAYEIwMCSE5OAA9ALy8AAqCIgARVVVUAAO677rvuu+67wD/84OCKACIIAiy47LvuuOy44szMzMiw7rvsuO677rsiCAKIgiAioAHgoQghwOGgoYAAgIGFhYCBIKChBeEAqKgAoAKgogoKUFUAAO677rvuu+67DssOAzg4CDIiAjy6ugA6OsyMIAgMjMzMwiKgA+677ogiiCKIIoQRRBFEEUQRRBFEEAQRVVFEEEAAABVUUAEBBRUVVRWFBYWFBVUAAO677rvuu+677rvuu+67LjsuOw6LjjsuOy47LrsuOy47Ljvuu+644ogiiCKEEUQRRBFEEUQRRBAAEEBAQAYFAAEFFVVUVFAGClUAAMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAAIAAgABAAEAAQABAAEAGDQBAQEAAAABAAAYJQAAABRQBBQIDAAYUAaBwAP8ABhcBDggCAAcXAYAA/wAFFAIFAQUABRgBCDwABhQBnJgwBggABxcBgAD/AP8AASwBAwIDAgMAAigBEhsayvz86Ojo4K8IAAMoATDgsKzzhgNGuEAAAzMBoLAA/wAHLgEDAAgoAQQACC0B/A/GCwAIMwECAwAJMAFAMq5sjyIIAAoxAcAACjMBwIAA/w==',
    35: 'ARALYzQADgAkAAAAAAAB1wIB6AIB+QIBCQMBIwMBQgMHaAP/CXsDBH0DDH0DGn0DBX0D/wABEAYABjiqq6uvrwYFvYCgoKID8lPyVPxU/1X/Vf9VAAAGCqqoBgSpBiWqq6+99dXVBgdVFQUBgKDouuq4ogsqCsBU/1UAAAYFqqmllZVQBVBVVVU4ODgAv4OvqKsGCaqAOoCqqqmppaWFkZSVpagGBKr/BgdVQHXXzM/PzUVQFQUAAKDquuqoqAD/VQAAqqqqoFRUUUQTTAxDQEAGBAMPBgX//PKqq6irq6sDo6ODE1NTU9NwX1UAVVUEoKCAAEJQVAYEVVQTTTVVVFBAABBBBRUAACoqKKCAFf9VAACqqqoqSlJUEMA3HcAFBgTFAPz48eHFBRUUA/8A/9330E7Qd9133XTTD/1UAVVVAAAKKaedNw0AA0011VRSQgQEFFRUBgRVAAUPFQAAD3/fVQAABgiqAnTdAwgCAAAgoCBAUFRVQD//8AfddtxAOIo4QMENNdXVVEEXVVVAAABw3XTTTTXVVFBAAAAACgggAAIAAgBwFP9V/1UAAMD1H1UAAAYJqirKctw3jScpCwkLBgQDwxvTTx03ffAKrgoAQNBRRRd99VRQAAAAAw011VRQQAMNN90AAAACCCKoKooiiAAAAED8UAAAfFD/VQAABg2qKspy3HTdd9133Xfdd9133XfdAKozqgANA0DUUEQGBBQA1FRQQAMNN9133XfdAACAIIAggKCAACAoiAYGAANf/1UAAAYSqioqykrSctx03Xfdd9wAqjOqAN133TQBAA8FAAYOFxUFAACKIooiiiIKIAgCBgUA0B//VQAABhqqKkrSdAD1PY+jAwMTE1NNNdRQAUVFUQYJRVFAQgo66rruuKijoosqqiqKCgYFAA9VAAAGHoAABgpAAAAGD0AABgSAAACAwIDAgMCAgIAAgAYEAMBAAAABMwEXAAIzAV0ABTIBgAD/AAEzAUAAAjIB5AACNAHkAP8AATIB9Sr1AAIyAaSApAD/AAEyAfV99QACMgG33UAAAzIBfwAEMgFcAP8AATIBVQACMQE/oj8AAzEBAwADMwGDAAQxAVAI8AD/AAExAfwAATMB/AACMQE/oj8AAzEBAy+DAAQxAVBU8AAFMgGAAP8AATEB/FX8AAIyAfcAAzIBUAD/AP8AAhoDAgEAAh8BAwADFgEMMMDFVVUFAAMfAW0AAyICOL88LAcDAQAEFAIKAQEBREBAQAAEHgFAAAQiAQzwAAQoAgEEWAAFFAGAQEAGBAAFIgEFPAgABScBQAAGIgGAAP8=',
    36: 'ARALYyUADgAVAAAAAAAFiAIDiAL/BfYCAfgCBzADATADAfgC/wABEAYABiyqBglVBgdUVVVVVFRSBgRQVFQGClUAAAYsqlVUU09PPz8/AHfdd9133XcAUACqAKgGBwBUVVQGBlUAAAYqqqijTwAGBf/8AnDQQ8FHDQcGBAACCAgGBQABRBFEEQYFVQAABgyqoYedh52HnYedh4CloKioBg2qqIM8/PMD883NzAOPADfdd9133XAKAAAIAgD4AAAVFUQRRBFEUUUGBFUAAAYHqqijgI000XTcdNx03HTcdABVVAD8BgQygAYFqqijjTU11dVUVFBPP////wJ03HTccAioogYEAP+oKChAEUQRRBFEEVQVRFVVAAAGB6oA/wM8/z9KSExAQEJKSkoKKgYIqqijj48A1VVUUEADDz8ABgT/7rvuuuqgiiqqoAAAACCAALwAAAQQRBFEEUQRRFFEFVUAAAYHqgAzzPMzMyIiBgQAPACAj4+AoI+PgDwxMQDEEBAAUEADAAYE/w/x+Oy47LjgiCKiiIAACAgACAAKKgAqBgUAQBFEEUQRVVRFAAAGCKoqyjIwMDIiIgIKPgwADw4PAAAODwBADj8+AP7//gD++wLw/P/+++666KKKKKiggAgIiIAIgAAAAKigAKAGBgARRBFEEURVRAAABg2qKgoKBgQioKDACCio4IIKOuq67ADoquqqCIDgqCgoIAAAAQEFBSEIQgBVQAoqACoGBgAgIcABBBFEEUQRRBFEEUQAAAYZqgYIKqoGBiqqBgQqBghVFRVVBYEAAAgICDABAAFEEUQRRBFEEUQRRBFEEUQAAAYtgAYVQABAAEAAQABAAEAAQABAAEAAAAFDAgEBAQUHBQcFBwUBAAJBAXBAwMAAAkYBAQWqqasAAk4BEAADQwIBDgiykEPBRg4GAARCAgEHDIC66ioqqqqsCAAFPwEEHHDAAAVFAQKpq6mrrEqCCgAGPwHAAAZDARVVVZTQiKgggIiAAP8A/wAEHAELJgEIGgclBQgABCsBAgAFGwK55aUCCKh0VQFU/M4ABS8BsioABhsBwMBwAAYmAUAggAD/AAQbAQsmAQgaByUFCAAEKgECAAUZAiO05aUCCKh0VQFU/M4ABS4BsioABhkB/P/DcAUCBAwABiIBAggABiUBQCCAAAcZAcAABxsBwAD/',
    37: 'ARALY0EADgAbADEAAAAU0QMI0QMUEwQZEwT/A1UEB1cEA1cEDFcEA34ECH4EGVcE/wVVBAyVBAOoBAaoBBmVBP8AARAEAO677rvuu+677rvuu+677rvuu+677rvuu+6777vvv+y87Lzuv/yy8rDwsPy8/Lzvv++77rvuu+677rvuu+677rvuu+677rvuuxFEEUQRRRVEFFQAAO677rvuu+677rvuu+6777/uvOy8/LLysODyyooqKqqqgAAoKqqqAKgAoKgoACgKAsDw/r/vv++/77/vv++777vvu++/77//vxVFFVRQQgAqqqoAAO677rvuu+677rvuv/z4wigIoKAAoKioCACAgICCCgoqKiooIAICCggCAgooIAACCgACCgQEKgDAICIiIoLC8MDAwooKCgAAAgAqAKCoCICAgAAA7r/uvPz88AQEyPAAqgqiqKoAAKqqqqiggAKgqAQEqgAqqqqAKgQEqgAAqqqqAAQFqgAAAAQGqgCqAAQEqgAAqgCqKoAKACqqqgAA//AKgIoAVVAKoIqAKoKiogKKCgCqqgAAKqqAKioKgqKgqCiIoCCAoKCgqKgoCICgI4MEBaMPAwQEIwOODIAggKCgoCAAICiIiAGFhQWFoQAA7vsOIyMDUFICoiIAoAoqKgCKgACqqgAAqKoCqKqoqIICAgoKCggAAgoAAgIKCggAAADCAgIAyAgCIiAoCAgCCggCICoKACAKUVRRVFFEEURRVAAA7rvuu+77/js+Oz7/A6iAKKioAACoqKgoCACACioEBaqgigAqqqoAKKqqqoAAKgQEqoAAqqqqqAAAqAOjow+DI6OjAAqiEUQRRBFEEUQRRAAA7rvuu+677rvuu+77/v8Po4MoKCgAAgoqIAICCoKioqKgoACgAKCoqCgIgKCgIAAAjo+Pj44/Pj8+//777vvu++777vvu+z6PEUQRRBFEEUQRRAAA7rvuu+677rvuu+677rvuu+777vs+O46PDo+Do6OoqAgAoKiqqoAKACoAKCggooIIA//uu+677rvuu+677rvuu+677rvuu+67EUQRRBFEEUQRRAAA7rvuu+677rvuu+677rvuu+677rvuu+677rvuu+777vvu+z47Pjs+j46Pjg8OOz777rvuu+677rvuu+677rvuu+677rvuu+67EUQRRBFEEUQRRAAAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAAEAAQABAAEAAQAAABBECAQAEFQEEBAk5KCooEAAFEgHwqoIoAAUYAVWqqiiAAAYSAQQNi4srUnoqigoCAAcUAUAABxcBEEBQQECAAP8ABBECAQQBAAQXAQoBBDAKAAUSAQwKKiCgVPGqAiiAAAYSAfgmIwsDBRMqIAoCAAcSAUAABxQBQNDAwAAHHAHAAP8A/wAIPgECAAhAAgMBAAk7ASIiqIqiC/wACjcBMAAKOgGAgDAwwMAA/wAJOwEIKCqiKMAACjsBgLAACj4BwAD/AAE6AQIODAACOQECIgiACAgA/wABOQEweDhyDAACOAEKAAI6AYAiCKggIggCAP8=',
    38: 'ARALY2AADgAbADoAUAABXQIBXQIBbwIBbwL/AYMCAYUCAYUCAZkCAZkCAasCAeICAYUCAZkCAZkC/wWDAgErAwErAworAwErAxQrAxkrA/8KgwIBNAMUNAMPNAMFNAP/AAEQBgZNACKIIogiiAYcAAMMAAABBw0HDQcNFx8XHxcdNx13XHx/f193XVcVFwUEAAMBAAwMAwMCDAwMAgYFACKIIogiiAYaADDBBRVUFQVEwXHcdNDw0PHRccBAwQAAAQHBwUHBQcBMH/fRdM1wgIAAAAKCgoIGBQIAAIAAgACABgsAAQcPHT89Nz03EADQcBw/DQcBAEBAAFBQRVVEVAYGVUUVFVVVVFdQSCEFFQVwAMBAAAAAICqKgKioBgeqqKgGDwD+/3fdd933/XcAzIwMHv/MQAAPAA8GBQBATERNR01HTURCQEgDjQdNR09HTUcAAzEAAIoAAACAoCAAAICAgAAAAAIIAggCCAYMAIDA4PDwcNx8ADgIAAz8/BAQAAABAAAFAQBB0TDScMEhAcERdPz//3fddx333XQBd90AAKqoBg0AIogiiCKIBhUAzAAVEVVRBVVVFUVUVBBQSEA0hBRUVVVFUVFUVRUFRcBw0EwzDDAGEwAiiCKIIIAGFQDAADAcNh83HQcdAIMXzMMNAA0DAAgIAwMDCAgIQ1BUFAYEAAgKKqqACioqigYEAgYpAIDAQPB8zEfxc9Fz0XMBg4AAAACAgIAGCgCAgKCgqKgGCKoqCgIGKgCAwMBAwEDABhoABgWABgSgAAACCAIIIogGTwCAAIAAgAAAAlMBCj4+PgoAA1QBgICAAP8AAlMBAg8PDwIAA1MBgKCgoIAA/wD/AAg8AgEKCgoDAAk8AeCgoKDAAP8ACDwBGCoqKgsACT0BgICAAP8ACCYEDAMBAgAILAEIGAAJKAGAwMAgMAxDAwAJMQEEBAwACTcBBQMACi8BgMBAgAAKNgHAwAD/AAgmBAwDAQIACCwBCBgACDwCAQoKCgMACSgBgMDAIDAMQwMACTEBBAQMAAk3AQUDAAk8AeCgoKDAAAovAYDAQIAACjYBwMAA/wAFLAEMBw8A/wABPAICCgEAAi8BBAEEEDBSaEBoQmDAQMADrIKAAAJDAYAAAkoBBAADNAEgAAM2AaAQsBBwwEDAAANCAUAAA0cBEAD/',
    39: 'ARALYy8ADgAbACUAAAAF4QEK4QEG4QEZ4QH/BU4CClACBFAC/wpOAgiUAgqUAv8AARAEAAQNqgQEqAQSqqCMjIwEK4QAAAQMqgry/Pz8AVFQUAQEUlRUBAiUFBQUFYUECqUEDaEEE6AAAAQQqipKUlIUBYWhoaioqKqooIAAAAiggAACAgoKBAcqCgQNSgoEEqoAAAQIqqiooaEEBIUEBBUUA0xAUFQUAA8EBQAKKioEF6oEDKgECqAAAAQFqqCFFQQLVUA/wAAAPMzMzMAADzDFFQWBBAWABAeCAgICBAsKBAsqBAmqAAAVBBcUw/8APAH/AAQFVQAELaoAAFJUVBQVFUVFRVFRUVAEBFRVVQD/ATExPwA8AAD8A1RVVVRAKAQZqgQFqagEDqoAAKqqqgQEKgpKSkpCUlBRURQUFAUFRUVBwQEMDAwAwjJCCgoKAgIAAICgoAQFqQQFpQQElJIEBFIEBUoqBA6qAAAEC6qAPD8/MAXFBQUhISFBRERAUFBQBaWlpZWVBASUBARSBARKKgQFCgICBAWCgIAEBaAEBagECaoAAAQNqgQFKgI8PAwMTAQEQkpSBAQSFBQEBJSkBASlBAWpBBCqBAYqBAUKAgQEggAABCmABAkABCCAAAAHEwJBkbQdFxEQBAQEBQIEAQAIEwGAYHh+P49rYgAIHAEIAAgeAwIBAAghAkVRURFRFRUBAQAJFwGA4Pj+vwUNA2BgQIAACSYBgIDQEBAUAAktAVDwoAAKGwGA4Ph+Py8LAgALHwGAwMCAAP8A/wABIgQCBBEDBBcBAAIjAhAQAgUYHh4CBt7c1FRUVl/P7QIJ5QII4aGhAQEBAAM0AYAAAzYBgAADPAEBBoCgAQ3goAD/AARAAQEKAgoKCgEJCCgqKgEIIqqqAAU0ASAgAAU6AYCAAQWICCgoAQggoKCgAQuAAAY2AYAA/w==',
    40: 'ARALY18ADgAnAEkAAAAKBwMFBwMUBwMBEAMFEAMZBwMDGQMKGQP/AiADCiIDASIDATEDATEDASIDBCIDBCIDASIDATEDHjED/wEgAwFMAw9MAwNMAwFMAxlMAwpMA/8AARAGAFVVAHMGBlMAfwYGVQBzBgZTAH8RVRFVEVUA8wYGUwB/BgZVAPMGBlMA/xFVEVURVQBzE1MTUxNTAP8GBlUAAFFTAVMRUxNTE1MD/wYGXw//BgZfD/8fXx9fH18P/x9fH18fXw//BgZfD/8GBl8H9xdXFVcVVwH3VVNVV1FTAfNRUFFQUVAAAN1333//fwYJ//z8BgTwBgv8///8/PwGBvAGBMAGCgDABgXwcNBw0HDQQMBAwEDAQMBAAEAGBADfBg3/Pw8PBgUDBgcAAwMDBgQAAgICBi0ABgj//vjw4MDA4PHh4PH58fHg4OHh8Pj8/ODACCoGB6oqKgoCCoIgiIIGBICgoKiqKgoCAAQBAAADDAMMMwwzDDMMMwwwDDMMAAAGB//ABgQAEFBUVUEFGUVVVQUAwEAAAAAFCaoKoCoKiqCgAKiqqqioqKICgKIoBgQAIAoCgKiqKgBBVcAwzDPMM8wzzAPAMAAAzDPMAAAR9/F3//f/Pw8DAwYFAEBERERABgQAAwMQBgRSkqAiiqIGBKoAIKihhZWVFQWFoCoAAAICqKqqKqopVVVVAMAzzDPMMMwwzDAGBwAQRBF0EfTRd/H//f//fzw+Hw8PHw8fPwYF/j6MgCkpqampiKCgggoAFAYFVVRUQAAIKAYHqKBTU1BAAAwADDAMMMADDDPAAwwzDAYFAEAQQAFEEXQRdN0EISAhICEgISAhACwsLAABBQQUFQYFVQWhqKggAUFFBRUVAAAA////9////f/3/f308fTR9N103XcdNw3DMAAwzDPMBgkAQABAEEAABBBEAEARRBBEEUQRQBBAABRAFBAEUEBAQBAQgIAABgVAAAQRRBBEEUDQRBFAEUQQAABAEEAAQBBAEEAQQMBQAAAAwAZVAAAGIQFAECgA/wAGIQFAECQA/wAGIwEMAP8A/wAFKgIBCAQABikBgEAA/wAFKgIBEQgEAAYqAUBAAAYuAQUIAActAUAA/wAILwECDQwMAP8=',
    41: 'ARALYzQADgAbAAAAAAABFQMBRAMBRAMBFQP/CmQDAWYDAXQDAY4DGaQDAfMDAXQDAWYD/wABEAkACRmqCQaoqv933XfdVf/33fTw0FDw0PDQ8NAE3PzU1ABUVVRVABUUBfHQww3PzQDQc9D38EDNN933AAAJFKqoqKOjhAXxPEBERASAdN131V//f90AAMTx0czU19f/PT2NjYMjIBhICAYSQBBAAERRRFEAUFTVBQD83HDRRwAAqqqqqKqoqqgJCKqoqKgA1N01z/M8T1MUxVHcdDQEAEDw0MAAFNXXHV9TUBTF8VFUc1fX1/f/NTUFD4ODiCAgCAgIQgJAEAQQRBEEQMQAAKqiogiiCKIICQWigIyEBEAdQF0Qw/NUdTfH8zwPTwkEQAkHAMDwwAEXVRVFU1AUFcVTc3RVVdV19HX1/z8/jQ8DA4iIiCAiAAARRAAAqqqqCqoKqgoJCaoqSgBTA1x8dz/P88AAAw8/d30/D0EQBBEEAVBUBQFAcHFMM88/PU/z/P8/T0UAwsjCykpASkhCyiAKoAigAQQRRAAACROqCvL8XFU/zc/zAD/11ddXV1zz9wMBEEQRAAAARRQRQQHAUFx1VVVVDcPwVACgCKigCKCgAICACQQARBAAAUAAAAkXqioqSsrLDQP8f1VdfwP4/sPD/EAQAAAFRQD8f38AVwBMTf/88cQRRBFEEEAJCgARRBAAFVUAAAkaqp933XfVPx3HTUfFBw0FDz//P88DTANUAA9HxfH8PAFEEUQRRBBAAAAIAgkGAAEEEQAQVVX/AAAJGKql/9131Vdd/9333VVdd91X///d//f/Pc9RdD/N81T/ABFEEUQQQAIiIoIICIggAAQRBABBFVVXD83PAAAJFqqpl1X/3XVV/9333XfdVdVX///d99133fzd/90/QVRf/zACAAoKCIKKIgggCCGAAQQRRBFFFUNcf/1/3fcAAAkVgEDAQEDAQEBAwMBAwEDAQEDAQMDAQMDAQEAJBcAAwACAAICAAICACQQAQABAAEAAQABAQMDAAMBAwEAAAAMUAQIAAxYBAgADGAECAAQUAQQABBYBDgAEGAELAAUUASAABRYBIAAFGAEgAP8ABBQBrgAEFgGkAAQYAaEABRQBgAAFFgGAAAUYAYAA/wD/AAc1AQY9AAc4AT+8AP8ABjgCAQAHMwF8/T0ABzcBP/xAAAg1AcAA/wAGNAENAAY2AQQCAAczAQwHz88EAP8ABS8BAgggSkgCEEYABTkBEAAGLwEigIoKCxY/PwYABjkCAQAHLgHABIAABzIBKjIcPzwYAAgvAYAACDEBgAgACDQBCMAIAAg4ARAwwAD/AAUvAQIIIEpIAhBGAAU5ARAABi8BIoCKCgsbPzsEAAY5AgEABy4BwASAAAcyASo+G/DzHAAILwGAAAgxAYAIAAg0AQjACAAIOAEQMMAA/w==',
    42: 'ARALY0UADgAbACgANQAFkwIEpAIDvwICzQL/A+UCBOcCBfQCAfsC/wXlAgYNAwcpAwFGA/8F5QIFYAMFAAQDAAQKYAP/AAEQAgACPqqr////3VX//91/3Xfdd9133UACBAACG6qoqKigoYSEhYGBgaCgoKGhoYGBhIWBgIWFgYCEgYGBAgSAwMTMzEREzMTMRMxE3HTMdMACBQACEaqooKGPhRUQBRUVBFBRREVQAQAURVBQAAAVRVRVURFFUBFBUVBUFUBVQVQVBVUVBUEAAQQBQMBAwEDAQMBAAgYAAg6qqKAEfF0QQNBACEhICKBqakoISEgISQlJCQhISUlJCElICUkJSEkICQkISEhJCQhISAlICEhJCAkIAgQACAIFAAgAAAILqqiDP1dUUAAIAgeICKO9VUUUUBAEQEFRUQAFUFRABFQBRVVFAAUFRQQABVQUQAEQQQQAEEFBBAIPAAIJqqAMPBwcEAACCyCgLiYkJCQgICEhISAgUBAVUQEEdFFBRQVNRAAdFRURURUVFQIHERAQARAREBACCAACCaoqynJQUxODgYACCoizkZFVFAEBBRAACAgCBSgqKKqKijB8zPMzPT0PTQxMTEwMTAIGDAIEBEREBAAEAgQAAg2qAgQqygIESgoqqqoqykoKSgpKSgoKioqKAgqqr/3/3TVFx8H89/Pd1NHRwcTExNDAxNTAwEAEUARAAgUAAi2qq6+//f/d9dVf///d/x3H8Xz/9/3f3Nzc0MTRxcRRRUVBRUFBQQAAAiyqv//d/93XX3/9/93/3f/dd913HRfFcBzXdQIEMRERMBA1EBUREAAAAiuAAgTAQAIJwEDAQMBAwEBAQAAAwEBAAABAAEACBABAAAAABFUBCAAEXQEIAARiAQgA/wAEUgEICAgABFYBCAgABFkBCAgABFwBCAgA/wAEUgEBBwgABGABCAD/AARYAQgICAAEXAEIAARgAQgABGIBCAD/AP8ABlgBEAAGXQEQEAD/AAZiARAA/wAGWAEQAAZdARAQAAZiARAA/wAHXwEEAAdhAQQACFwBQAAIXgFAQAAIYQFAAP8AB1oBBAAHXAEBBgQACF0BQAAIXwFAAAhhAUAA/wAHWgEEAAdcAQQEBAAHYAEEAAhcAUBAQAD/AAMqAgEABCMCAQAEJQIBAAQpAUBAKAoABC4BIAAFHAECKZdUawdQSIiAAAUqAYCrHugQEQQABTIBFAQABhoBCqacECAMHDAgIAAGKwGAjggCAAYxAQQABjgBMAAHGgGAYFiaIUPQkoMJCAAHLAE7IgAHLwHEQRUACB4BgIAACCIB4GCAAAgnAUAggAAIKwHggAEEQAAIMgFAAAg3ASAA/wAFKQIrtfb4AVUEFFAEAAYcAQqsMCAABiEBDBAABikBgA6GCgIABi8BBAQABjYBICAABxwBgOC4IAAHIQFAEAAHKgE7GSLEhVQVAAc0AgEABz0BAgAHPwECAAgpAeDgwAAILwFAQEAACDYBIAD/',
    43: 'ARALY0IADgAeAC4AOAAFDAMCDAMHDAMCJQMDPAP/GVcDClkDD1kDFFkDBVkD/xRXAwVoAwVoA/8UVwMFvAMFvAP/AAEQBgYfAMDA0HB0XFxXRxURBAUBM/Hww088MxMDAQYHAEQRRBFEEUQQBgYAgAYGqgYQAAICCgoICAAKCgICBg4AwD7//91BAAwXB/HxzTw8cFEQBgYAQBBEEUAGBgACAACAoKioqgYHAAICCgoKAAqqqoKqqgAAAICAgAAAgCAgKgoIAgYJAIDA4PD4/H8DzcN1cVxcF1dFEREFBAEBBgkAqqqqKgoCAACAAAACCi6q7qruqqqqiKruqiqKggJQVVRwAQAUFRUVFzyAAAAqCggAAgIGBwAIAvLSctJy0hAAAsLAcHBcXBdXRRURBQUBAQCgqAYFqioKAADuu+6q6gYHqu6r7qquqqoK0A1DBXEFFRXHAdTVAAUHAIMAoCoIBgcAiqCigoIiiiqoggIAgCAIAgDAwHB0XF1UUUcfN1w0kYegqAAA7rvuqq4GCarKsO6rrqoqCkJSUFBUXHzcFRVFRVVXXPAAoAigKgoAAACoqqoIAAAgoCCggAAAgAAAiAYFAD8PfwYF/38dQRFzAADgsOyo7qqsqq4GBqoqyqLsuuquqqquqqqqogoqKipAQhJQFAQGBAAGBCAIBg8ACCAAAAIA4AYE//3/3T98c911BggAwKDgoOCgoiqqoq6qqiqKqoqq6oqoiACggqCioKCgqKiooAYFIKCgoooIAioAAgIGBQACCgoqIAqqChL0/ffdd9111VRQUEBABg8AgICAqijuq+iqiogoqCioKKgqKCiooCCAAoICAIAAgACAgIgoIIAAIIIigIIALiuqiuKqriqKoqKiBgQiKCIgIKAGFgC77oCOiy4qKqiigooqKiqooqKqigoKiIACggoICAgCAAoCIKqqKqCoKgqC4rjuKoqCgqKioqqKCiKCCAAAIAIICAYUAMAAwICAgAAGBoAAAAYFgAAGBoAAgICAAAAGBoAABg6ABgsAAAUxAgEQGgEOAwAGMQFQUAAGNAEILDAA/wAFMgEVGAYNAAYvAWAgUFAQCiSc8AD/AAUxBAEFAgcDAwAGLwFgIAAGMwEQAgis8AD/AP8ABCcCAQAFJwGQ1HQQAP8ABVcCAQUGChgqSLUQBggABlYBPzCAAAZbAcC4qK9ZRAViAAdVAgHhAAdZAQggAAddASBoIWTIIQAIVQFAAAhYAQgACFoBAggACF0CAQQQEEBAAP8AAToDAQYODM3E0FwtNhICAQACOAEDeeDA4UEx/Ng4zcKee3kkRBQAAzgBgOBwuJgshIJhEBAAA0QBsGBAAARBAfAA/w==',
    44: 'ARALY0EADgAeACsAAAAPTAMKZAMehAMUTAMUTAP/CpMDCJUDAfkDCm8E/wOTAwGHBAGHBB63BAG3BAGHBAGHBP8AARAGACKIIogiiCKKIooiiiKKIqoiqiKqKqoqBg2qqKiogAFFVQEQRBBEEQRAUFFREAERRBBEEEQQQQAGBFBAFFVUUABVAFUAVQBVAAAiiiKKIqoiqiKqIqoqqioGBqqioKAGBIAGBqCAAAAEBQVFQUFQAEAQQBABEVFFFFBABAAAUQAUABUAVQAUAQYEBVEBVABVAFQBRAAAIqoiqiKqKgYEqquvrwYHvPwGBAABA8HDwUDATAMMAwMDQEJQUlAQQBAQVVVUUEAEAFQAVQBFAFEABABBBRUVBUFEURBQAAFEEAAAQAAAIqoiBgaqvvLKKioGB6oAqioGBADfcPB/33cdNwzAM8883DyOJw0DAABAQEBQUFAUFQUBQABQAQcdN11XURBRBgQAQAYIACKqIqoiBgSq/q8GCqoAqqoAAN0/DAzMfNx8/zcNwPIAAHQA/jLMOqgAAAADDTc9Px03HTfdd9130ETQQABABg4AIqoiqiIGBarq+voGCL4Ar6sAAMAAMADBfx03HAQMAICgMDgwsDCAgw888MJKKCAwMDAsC0LQd9xABhQAIogiqiKqIqqiBg2qyvoCCioKCgIKCgAABgUBAAAAAgoACigoqPKuKwoGBAIK6KAAQAICAgoGCCqiqqKqIogiCAAAIogiiCKqIqoiqiKqoqqiBhKqCgBAUEEAEQBQAASMBA3D8TwcBMzAwcfMEwAAKgYLqqKqIqoiqCKIIogAACKIIogiiCKoIqgiqCKqIqoiqqKqoqqiBgyqKgoKAkIABBVVVBEAcdAw3Xfdd9100EAAAACAoqqqqqKqIqoiqiKqIogiiCKIIogAACKIIogiiCKIIogiiCKIIogiqCKoIqoiqiKqIqqiqqKqogYJqgoQAUUUEAFEEQQQBBAEEAQRQQABAIGgqCKoIogiqCKIIogiiCKIIogAAACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAABgiAAABAAEAAAAYJQAAAQABAAAAAgACAAIAAgACAAIAAgACAAAAEKwIBAAQtAQMABSwBQAAGKwEQgCAA/wAEKwIBAAQtAgEPIAAFLAFAAAUuAUDQAAYrARCAIAD/AAQtAQIPIAAFLgFA0AD/AP8ABE4BBAAFRAECCioiIgAFSgEKIAqqiioKBQAGPwEDDDOMMohiCBAABkoBHCdJkqernEAABz8BIgAHQQGAWlyFIQgAB0oBCOJIoFBCAAhAAcTy/Ow40AwFCwzQEAAITQEggAD/AAROAQQABUQBAgoqIiIABUoBCiAKqooqCgUABj8BAwwzjDKIYggQAAZKARwnSZKnq5xAAAc/ASIAB0EBgFpchSEIAAdKAQjiSKBQQgAIPAEFDwcOxPL87DjQDAULDNAQAAhNASCAAAk8AUBAgMAACUEBDAwA/wAIPAEFDwcOAAk8AUBAgMAACUEBDAwA/wAENwEQCAIABDwEAgECAgMABTgBgAAFOgF0dP7M/vaSqAAGOwEIwICgAAZAAYAA/wAENgIBBAAEOgQCAgECBgMABTcBEAAFOQF0dP7M/vaSqAAGOQEQgIiAkAAGPwGAAP8=',
    45: 'ARALYz4ADgAbACUAAAAa2gIC2gIKCwMFCwP/CkADD0IDBUID/wVAAwJaAwF/AwKaAwGaAx6aAwHEAxNaA/8AARACAAIgqv7/3Xfdd91X1Xf9/91/3XfdV9X13X/dd9133Xfdd9113QIFVVxVXVVcV3VVXVVVVQAAAiGq//1/33fdd9133ff19f3/3X/dd1VV1f3df9133XfdVdVXVVXVdVVV3XVVVFNQdVVVVQAAAhuqqKmkoYSRhMFA0PT9dNx03HTcdF1U1PTUd9V1VVXV99133PTccPDw8FDUVFRQ00MMAAAAVVXVVQAAAhOqhJGEoYOQQBNAEEAISBBEFBQEADCA86IAAMDAAADAwABAwEDAQAIMAAHFxQIEBQQBVd11VVUAAAIGqqigg4OAjwAYOBgAgM/IM08MzA/DDwAPCs8KAAADAAADAAD8owIFAAEBAwcHDw0XHz1/XX9df/1/fXf91X9VdVV1VBFFFVfdVXFVAAACBqoKwgAAAMAA8PjwAADBgwwgEQMADMMAwIA/gAIIAPwowDAMAwCAwMLScPDw0PDQfNz83ffdd9133/XVVd1UEUQVUV1X3VVdVQAAAgyqAgYq6gQRRBDwAQQBwDEIiggBBAEUFRVUU1BRVBABAMAPj4APCg8CEABDE0MQAgRQVN113VUAAAITqkoKCioqKkoSRBBEEEURRw03HTfdd913V199fx0/HT8dPx1/3ffddNF0EQQRBAEEAQQRBBEEwcQB8QEB3XHdVQAAAh+q/99//XfdddVXf//9/93/3f/d/93/3ffdfxdPPU8RRxFEMUQRRx1HHVUVVddVVUV1V91VAAACHKqrv//33XfdVV9//f/d/93/3f/d99331Vfff/3/3f/d991/3X8d/9133XfdVVRXVXXdV91V3VUAAAIcgMDAwAIEQAIKwEDAQMBAAgXAQMBAwEDAQMBAwEDAQMBAwAIJQMBAAAAFHAEIgJenl4AABSMBKAoCDAsKCQAGHAE4AAYeAczGzAAGIwE5oMAABx0BAQaAAP8ABRwBEAAFHgF723sABSUCNQEABSgBAggABhwBQAAGHgEwGDAABiMBwAAHHAGAAAciAYAA/wD/AAY3AgEFDQkBAAc2AUAABzkBAwIFUQD/AAMrBAIBDQUlFRVFATAMAwAEJwEgENABBFBIQFhQVEBAEMAA/wADMgFRRTU5BwAELgEIQBgIAAQzARQEVMAA/wADKwIBAQ0FJRUVFBXEIBUMAAQnASAQAQVQQAgABDEBQFhQEBBAcIAA/wADKwIBAQ0FJRUVRVDxGRIMAAQnASAQAQVQSEgYSFhEFESAcIAA/w==',
    46: 'ARALY1EADgAtAD0ARwABhQIBhQIB3wIB3wIBNwMBNwMBQAMBQAMBNwMeNwP/BUkDAUsDAUsDAXYDA3YD/w9JAwGQAxmQA/8KSQMEnQMInQP/AAEQBgAGKKqoqqoGBqigqKiooKGjoaMGBKCoqKiqqAYPqgAABh+qoKGjoKOBg4CEDQ8NFA033EB/N11ADDP/d99DDXdRU1BADQCoBgyqqKqqAAAGHKqgoIAH3ffdf91E3AcBR8BA0HDAA8FAQAAAQPPE3HPTc9BwHAcAACCgBgWAhIQBAYeBAAQAAAAGCqqooAGBhIWBoKCjoKioo4yAgAMBAwFx0fTc9Px/Hz/dBw1TAH9dVxUBHBcdAwD88eXlMcwAMEAGBwAFHD0fN0130XfddwAABgaqoKONB913HTRDDz/MMMNMMMAABAUAAMDA8PzccMBA3HfN8/z/3X/dd93/33sfe9BxBRUGBFUFBgsA0DDQ8Nx/33cNdwAABgWqKgry3PTTTz//8MccccEFBRUVNR0XDTMMAwYEAAEAAEfNRMFD0TPPR83PMQM7OFl9AVVUVVRVVAKr////AwYEqz4AAAEBDTcdNx03AAAGCaoqKsDPMMAAUEREATVVVVRUV9133nfMMwwAw/8Ndx8//fTff/103H/9d930FT9ND01HTQcdNx03HTQGBICcPRd313Ndc/Fz0UcAAAYKqgryAioKKoqqqioqSkoKKirKFABKKioqCsJy/DQcdxwEzEccRMzExDQcNBwFHD8dNw00HDQcMx00Aw8/Dz8PMwzAwcVFxUXFRQAABhuq6soGCqoqqqqqKgYIqgYIKqqqKgoqKgoGBCrKCgYJKgAABlKqAAAGUoAAAAU/AQIBBQMABUYBNRAABU0BBAAFWwEMDAMABkABwPwM2MygCAUABkkCAQAGSwIBAQQABk8CAUCA/CuBgYGwPgAHSAFAAAdKAUBAAAdPARi4mPgBBGCYMAD/AAVBAQIMAgwABU0CEAEABVABAgMDAAVUAQEEAgAGQAIMPcOiAwEABksCAQAGTQIBVqlRMdGtBQUFB8YAB0ABgAAHQgGAAAdFAcAAB0gBUAAHUwEBBYAA/wAGUQHAcKAA/wAGUgEMyIAA/wD/AAYsAwIBAgAHKQMBAqqp6bv/PwwACCoB4N4USmAACDEBgAAJKwFAIGAA/wAHLAIEAwQBAAgrAUBeFAogAAksAUAgYAD/AAciARAAByQBRDQA/wAHJwIBAAglAWAACCcBQCAA/w==',
    47: 'ARALY1kADgAtAD0AAAAFBwIJBwIKBwICEwIKIQIDBwIBBwIFIQIUEwIUBwL/Ay8CATECAngCAgkDAeoD/wMvAgH/AwL/AwH/AwT/AwH/Awz/AwH/AwX/A/8AARAGAAZLqgYHVQAABkuqBgdVAAAGHKqoqKGgoaioqamppaUGB5UGBpSQAAGBgICAoaUGDaoGB1UAAAYXqqihhREEEQRBUBBAAABAQEgISEoGBSoGBqooqEhIQEAQUECgBguioFBQBgVAAAAGBqqpqaWlpaCmpaWhqampqqqooAUAQFJQFEUVRQEALAAOOyw4IgMCAAAAAgYEAAIACiIgCKIGCKqoqKgGBKCAAgYHAQAABgSqgFRVVFRVVUFZVVQRVQVUUAEBVRQAAO644jsuS05TEgThCCK47rvuuw677rsAAACgKqiCqiAAAIAAAAgICgoqKioGBqoGB1UAAAYEqioKCgICAhJSUlJCQgYFChIUQAIL7rjuu+677rjgAC5LEoQhiMyIDIDAAAAAKqoKKqKCCiqqBgcqBgQKioKCgoAGB1AAAAYWqioC7Lvuu+wzAgsOAwAAAgYECgYKKgqKigYEiQYFigYJooKCAgEBBgcABhmqBgQqisqywhJUVFVVhYUGBpUGBaWAUFBQAEBUSgYQqgYHVQAABiSqBhUqBhKqBgdVAAAGS4AGB0AAAAUdAQUABh0BFAD/AAUcAQUDAAYcARQMAP8ABRwBBQYABhwBFBgA/wD/AAUoAQUABSoDAgJEUVBQBAEsLA41FxQaAAYoARQABioB7lZa2RVlBR1BFuXpCooCAAcoAlIJ5VZWAgRVVljgLmVZlqUBAP8AAkYBAgIAAy4CAQADMAEkAAMyAQgMDAw8MfDAAQXBxwEFxtSSBQSAgYAFNA8ABDEBEEAABDUBQEBAIGDgAQWAAARGAYCAYGBoCFh44AAILgEDAAgxAQIDCAoIAAhHAQEEAwAJLQHIOCYCBgdBwcD0JCABBTA8AQQMBRTEBBBQFcbgAAoyAYCA4AEOYAEGIAD/AAJGAQICAAMuAgEAAzABJAADMgEIDAwMPDHwwAEFwccBBcbUkgUEgIGABTQPAAQxARBAAAQ1AUBAQCBg4AEFgAAERgGAgGBgaAhYeOAABSgBBQAFKgMCAkRRUFAEASwsDjUXFBoABigBFAAGKgHuVlrZFWUFHUEW5ekKigIABygCUgnlVlYCBFVWWOAuZVmWpQEACC4BAwAIMQECAwgKCAAIRwEDAwAISgEDAAktAcg4JgIGB0HBwPQkIAEFMDwBBAwFFMQEEFDVtv4++AAKMgGAgOABDmABBiAACkoBgAD/AAhJAQMACUkBwHAePvgACkoBgAD/AAUgAQQABSQBAwAGIAEFAAYiATBRBFEA/w==',
    48: 'ARALY2gADgBFAF4AAAADzgIB6gIBCgMDzgIB6gIBCgMDzgIB6gIBCgMDzgIB6gIBCgMCOQMBXQMBbAMBgQMBmgMB0AP/CtgDAtoDAdoDGeYDAfkDE9oDHuYDBeYD/wrYAwEOBA8OBP8AARAJACKIIIMjgyODI4MjgyODI4MjgyODI4MjgyODIwMjAyMDIwMjAyMJKQMJBgAiiAAJEP/88cUJBJWUCQaVlJSUCQQrAIDBxcXF4fj+CQn/CQn+/PwJBPj8/P7+/gkEBgAAIogACQ7/8gpLT1JSUEAPCQUfPz9/f3+/v7y4AABQVVRVVVUUFAkEgAkUAIAAAACAAICAAAAiiAAJCf/+/PwoLDw4CoqAgAAAwMDA4MLCwMDICgIJCABAAAkEQAkLAAEBAQADAwMHCQYPP7+/CQSwAAAiiAAJCP/6q/6qr///+ioqCgoKAgIAICMO+qgACgCgqgIJEAABBRUVVVVUFBUACQ7/CQYAIogACQX//vjggMCAgMAQEZWFhIGhoaChgAAAgAAoAOAIAACoCQwAAw8TCQRUUk8JBT8JDv8JBgAiiAD////ggAAQFVQJB1UBADhAVFUUUUBEQAQQFQUJBQADBwkFDwMBBVUVxcXEwAAAgOj6+OjgCQbA6Pj7+AkF+zMwMDAAACKIAvDy8DIAQBAUVRUJBlVQQA5AQUVBQEQEABAAQAkEAAsLgIqKgIDVwAkGVUAJDwAoAAkJAwIJBAAiiCKIIogiiCIIIggCCDI4TEwMDAsKQkAAAAILKCAAAAAoAOgA6OgA6OgAAFNTE1NTU0wMMACwMLAwsLCwCQYssLDACQgAgMCwDAAAIogiiCKIIogiiCKIIogiiCKIIogiyLKwsrDCCCLI4sjiyOLI4sDiwOIAIgACCSgAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAktAAAHKgFEEAQEBBQFAAgrAQQACC0BBAAILwEQAP8ABisCAQAHKgEEEAAHLgECVQUABzIBEAUACDEBQEAA/wAGKwIBAAcqAUAABywBBAQGQQAHMgEQBQAIKwEEAAgtAQQACC8BEAAIMQFAQAD/AAYrAgEABysBQBAVBBEEEAUACCoBAQQEAAgvARAACDEBQAD/AAcuAhUBAQAILgFgGAD/AAcuAhUBAQAILgJgGwEACTABgAD/AAgvAgMBAAkwAYAACTMBAwMACjMBQEAA/wAGKwIBAAcrAUAQFQQRBBAFAAgqAQEEBAAILwEQAAgxAUAACTMBAwMACjMBQEAACjkBDA4A/wAKOQEMDgD/AP8AByYBOAAIJgEOAP8AByQCBAEABygBBAAIJAEEEAD/AAckAgQBOAAHKAEEAAgkAQQQDgD/AARLAgUFBAUFAQAFSgFAAAVOAUQABVABwAAGTgHAAAZQAcAAB0ABBBAA/w==',
    49: 'ARALY04ADgAbADQAPgABqQICyQIByQICqQL/BeECGeMCAhIDDxIDAhIDCjADHuMCCuMC/wXhAihgAwpgA/8B4QIBkwMIvgMBvgMBkwP/AAEQAgACOKqroaGh0EDdd91EEUQRABFEEEARRBFA0XACBAACOKr//1/XFQ/fR90EEAATABBAAUQBAx133zcBAAAAAguqoKOhoaChoYCEBBUdFx0VHQIEFYWFhYGAgISEhYGBAgSAhQIFoQIFqOjq6v933XcRRABAMAAABAD/33/ccPBwwAAAAAIHqoCNNx1UEcFcFAUFRUVFFRUFAAwzMAwHFBUVBQABAwEDAQMDQRFAAABAUFACB1QCBxUBFFVFRUUCBAAQc18///cNAAAAAgeqCsIAXXfddwF03XddRRFFUVRVFQQAMMMFV10XcMvA/JzwwDA3VVAVAAAKCioqAgcKDg8HDUdNREFHHQIEAEQP9/XxwAAddAAAAgWqoIGFBRFVVNVwAHddV1VVUURRVVRQTAAwT9B11XEcDw5/cx4HMbFVFFAAAKCAgAIKAAIEAQUFRcUFBQERRE9DXPMdfw8AAAACBaoK0nRcV1hTDdVQQUFEREQVUVFBAcMxMcHRUVFRQQUFFRQQAQEFAAUAAwUXFRcVFxUXFRdVV1VXXVddV1x0XHTTcxMTDwP8/1Vw38/QdwAAAgmqKioKCgoCBRJSUlLSUtJS0lPRUcBAQgIFElJCSkoCESo/Pzw8PNx8/PwAD/x0/AA0x00A33fddwAAAhuqatp2XQeBoKgCF6qv/X91f1dVFRUBAAN/V3cVD/Nw//x00HcAAAIfqkrqSgoKigITqqv////f/9f1/V1VVQFw/Nz88P/zPf/9dwF3AAACOIACB8BAwEDAQMACBADAwEDAQMBAwEAAAAU6AaQyYgUFFQAFQQEKAAY6AWLw5EBEUAAGQQGgAP8ABToBBBEqQlUFFQAGOgFEEOAEUERQAP8A/wAEKAIQAQAELgEGAAUoAVAUQVAUMIAABicBQBRRBRhQMAoABygBEEAABy4BkAD/AAQqAQwnIAkABS0BQAAGLQIBAAcqAcBgIIBQQAD/AAQoAhABDCcgCQYABSgBUBRBUBRwgAAGJwFAFFEFGFAxCgAHKAEQQMBgIIDAQAD/AAMcAggiLSYlISUBAAQcASBAlFxgUBAABh4BBQAHGwIFBVkWRRURAQAIHQHAQBhQUAD/AAgsBAEDAwIGAwMDAgIACSwBwHDc960rykLQtq4qCgAKMAHgQOCgoCAA/wAIMAEMAwMDAgIACTIBwEDQtq4qCgD/',
    50: 'ARALY18ADgAnAFUAAAADFQMPIQMBLQMZLQMIIQMGFQMUFQMPFQP/ATsDAT0DAT0DAj0DAT0DAVwDA3UDCj0DAj0DAXUDAVwDBFwDAVwDAVwDClwD/wo7AwGSAyiSA/8AARAGACKIIogiiCKIIogiiCKIIogiiiKKIooiqiKqIqoiqiKqIqoqqigGB6qKBiWqAAAiiCKIIogiiCKKIqoiqiKqKqoiqiqqqqoiqiqqKgYSqqupp62nnbX/f913XReFoKqppZWVlJWUkYSAgKAGB6oAACKIIooiqiKqKooqqiKqKqoqBgWqKgYMqqioqKGhhYCMt513/ff9ddVUAPTd8NF3339dXxUXBUEQRBBAAgoKKgYIqgAAIqqqigYFqgYEqAYRqqigoIwwzDAMAEBQUAAAQFBQQEAGBQABA9FBwEDDc9NA1FAGBAABAAGAgKiooKCggAAAAKqKqKCAgIAwEDfccMABAQEDBw9PR1BXV5CVlKepqAYIAAEAAQABBAEEAQQRAAwEzEfP/913XRcFQQAEEQQRBBFEEUQRRBEEBggAqqoAAAAHHDBDBx9wAAdAQ99/3/eNM/z8D/8dd9xwAUNVVxUAVVURRBFEEUQRRBBDDjDEFBUUwPTcdNx0VFMDQBBEEEQQRBBEEEQRRBEGBwCqqKoqCgIAwAAAAMDAcHNz/ff89Nx03Pz8/Nw8PH/9d9xwxBRQUBBAAEABQw444ogAUFAGBQCg+Pz98c0xBwUGCQARRBAGBwCiqqqKBgSqKioqBgkKKioqCgqKgoKCAgICBgkAN7eIIIAGBAAGBAEAAwMAAHPTc9Bw4wwDBgcAEEAGCAAiqCKqIqqiqqqKBgSqogYSqioKAgAAAwwzDAAAEQQRFRUAfXdQUwPz8/Mzg+PzA8MwzDMABgUqqqoqKgYFCgAAIogiiCKIIqgiqiKqIqqiqqKqoqqiqiKqoqqiBgWqogYEqioqygrKCkoKSgpKSgoqKioGC8oKKioGD6oAAACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAAGM4AAAAYgARsAByABgAD/AAYcATAABh4BCAD/AAYcATAABh4BDBcYAP8A/wAFJwECAAUpAwQCAQIOAQAGJwIFARDg4mqrrHFAAP8ABSoCAQEDDgEABicCAQHA8uJqq6xxQAD/AAUnAQIABSkBBAMABSwCAQAGJwEEAAYpAdASAP8ABEYBAwAESAIUHgYFAQAFQwEMN9x308AiAAVLAYBgWFQFBBEABkMBBQVFQJD0DAYPB4cABk8BTEwQAAdBASBQEEAAB0kBoHgcDgQKBMAAB1ICAQAISgEDAAhMATw0AAhSAUAA/w==',
    54: 'ARALYzcADgAnAAAAAAABAgMBDgMBHwMBNAMBRgMBUQMBYAMKAgP/CnIDBnQDGXQDDHQDCnQD/wABEAIAAgaqKkJQUVERAfH8f993/X/fd9133TcBAAE3XVVVVFUCBVFUFAQCBQD8AgX/8wIN/913VVAFVVVAADz999wAAAACCKoKUlJUVFVAB/P833//d913HQMAAN1xVRdVVVVUUUVEQEEDAgYBAMDw8PD8DPDwAgTx8Pz////dd911VAFVVUAAVVUVAgUAAg2qKioK0vzf9/3//zwMAAB3XXfFVE0V3XdBNF111XTUUFAAUFBUVFQUEBVVVUFAPD8/P/333XfddFBQBVVVAQVVVEFAAgUAAhGqKsrw/XfRcAAAAXDddVQF0UFUVMVREREUERQCCAAFUAAPD09TExMNd9111VQQBRVVVVAABVBAEUACBgACEqqoqiBAAQUFURRBBVQVRVBQVEBAUFBAQAAAMNw0DAABAAADAAAA//333ffddVQQVVVRRQQUBRRRBRVUQAIHAAIQqoCgAQQRVAVFRQFQQABABAUVVAA3HQcDBwEDARMRExRURQEA/Pz13XfddNBFFVVURFQQABAQQBBQQEBAAgQABR0AAAACDqoqCABUVVUUVVVVQVRVAQAACk4PN/1/3//d/9133Xfdd911HUdNExEDAE8PT0NDQQMNBAEUARRAAAECBQABBwVV3QAAAAIQqooKSlJShFVUVVUAVQUAqqqq6vp////d/9133Xfdd91X1f/d/9133Qfx/Pz33XAEUEAAAAABB9wAAAMdd913VXf9AAAAAhaqClISUhJCCioCBqrq/93/3Xfdd9133XVV/9333Xfdd9133TcdN913AQ89N91VAAf9d9133XdVV90AAAACJar/3Xfdd9133XfdVVX/3Xfdd9133Xfdd9133VVX/913VVUB/9133Xfdd1V3/QAAAAIlgMDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEBAQMBAwEDAQMBAQEDAAAAACSwBAgAKKwGAAP8ACS0BAgAKKwGAAAotAagA/wAJLAECCgICAAotAagACjABgCgA/wAJLgEKCggIIIAACjABgCgA/wAJLwEoiAgggAD/AAktAQIIIIAACi4BgAD/AAksAQIKAAorAYAACi4BgAD/AP8AByUCAQEACCYBkAD/',
    55: 'ARALY2kADgAbAEMAUwAMvgIUvgIevgIKvgL/FMwCAc4CAc4CAc4CAc4CAc4CBd8CAd8CA84CAc4CAc4CCQgDBQgD/wHMAgE2AwFHAwFbAwFyA/8HzAIBhQMBjwMBqgMBqgMBjwMehQP/AAEQCQkRAAEUFRUVFAkQAQk9AFVddwVABwFRd10EVHRcdFx1XX9df19XXVcVFQUFCTgAwEAVFUVAwEAJBAABAQUVFUfVVdX19XXUVFBQQAkNAAICCQcACQgCAwILDgoKCgkIAAEJCwBVVFQAAAAQUlIJBUrKTstLQy4iIioqKAoiKKKoKoqiqq4JBaqKiC6L4juqiiiq4Liqg6Cg6rruuu666qoAAAEEEUQQRx93DccB4/Pzd2dAAAcAEUQRRBEEgIAFFx0XHQAiCCqLCQSqqKqqqiqKIoiiiqqq7rquqqqKIojqiCKIqiqqAIKqCgIAgCKIIogiiAAAEFBBBBFA0HTBPQE//T3dFQQAQQQRRBFEEEAFF1133XfcACCo7rrquuqqiKKqqqqoIogiqqqoooqqqqqooogiiCKKqqqgiqiioogCCwoLCgsKCgkEAEBQEERQFBAEEDAQMAkEAAVBAAcMAhJKykrKKCgoOKysrAw4qKiIIIgoqKgoiCqqqKqoqqKqqooiiiqIKquCC6oqoqqiquC67rvuu+67rqoJDAAJBA8GAgEAVFQAAKigjT8/Nx0XVVVVd9xDBQUBAQEAQEBQUFBUFBQUgAkEqKCjjQehuOi67rqqqqqoqqqCquq66rrquuqqCQwA+uqrr7/67rz9/fyoAAAAQNDw/PT8dNx33Xf9f11fXVdVBR8/Hz8dPx0/XX/9dd111FTccNAAgKioCIigIAkLgAkMAAkEgAkXAEDAcNBQ0HT0dNR01HTUUNBgQEAJBADw/Iy8LOzw8MDACWEAAAUZATDAAAYZASAwAP8A/wAFIgIDBwcBAAYiAYBAQAD/AAUkAQdXVFVVFRUEAAUtAQUABiICAQVFlVVVVFRQRBBIAAcjAUBAAP8ABSIBAwcABSUBVlRVVRUVBAAFLQEFAAYiAYFFBZVVVVRUUEQQSAAHIwFAQAD/AAEgAgEAAh8BcBBAcEAQAP8AAh8BNTRBV0AQAAMgAUDAQEAA/wABIAIBAAIfAUAkAAIiAScAAyMBQAD/AAIfAQUAAiECAQADIAFAwEAA/wAIGQHDPDDAAP8ABxgBAwAHHQEDAAgZASQACBwBIAAJGAHAAP8ABxgBAwAHGwEDAAcdAQMACBQBMAAIFgEwMDDXwMAQAQQwAAgiATAACRgBwAD/',
    56: 'ARALY2UADgAnAE8AAAABRgMFVgMEZgMUZgMCVgMPRgMDRgMKRgP/A3QDAXYDAXYDAXYDAXYDBXYDAXYDAXYDAXYDD3YDFI8DAY8DAXYD/wV0AwGbAw+bAwObAwqbAwGbAx6bA/8AARAGAAYiqur63v/df9133Xfdd9133XfV9f//3f/d/91/3Xfdd9x03Hfdd9133Xfdd9133XfQRQAABh+qqKigoKONj81ADT8dPxwwBQfFR0VHBgbFxMPNPx0/3f8RD81D0HDcdNx03HTQBFVEAAAGCKqoqKigqKiooaiqoKiqqKiqqKqoqKCPDcPw/A/w3f/d/9383MADDABDwEDAQExEDARMQAHz0fPc/Nz83PzcP93/3f/d/93/3f8dRAAAqqqqqKGEEQQRQARBBAABARERFQUFBQERQBAA8BwPwfzdPw0wwPPPPDHzzT8d/9wBBRUGB1UVFQUBwMDw3P8czPA8DxDEwMDFwcTA8AEFAACqqAFEEUQAABBAARVdV1VBTc31dVRVYFBXVBcFAADA8wPPPPPNzx3/3PzQwcUXXXdddwYFVVRcV11VVVUAAAAw3f/d/x0/AAFVRBFAAABBRwAAqioKQhJAEEQBREFQ0XTVQU1NXdcd1Q0U1FBQQAA88c8dP93ww8ABMBw/DUNQdd133XddV11XVVdVVdVVVVQAAAMzw8DPzw8AFUQRQAAdAxQVFQAABgeqKgpKCkICQhISSkJCAgIKAhJCEgoqAvDd/NHPHf8A/90AwDDA8NwMQFDUVNR01FTRU1FTQUMBAwDwwDAxw80/HQNRQw0PDfB0D1BQAAAGHaoqCsvD8wE83f/dABxUXFRcVFxUFBREVFQVwP/d/93w3f/d/8H83Pzc/Nz83Pzc/AEHHTfddwAABh2qq7//3f/ddx03HTcVF19//f/d/93/3f8dD83PzccNNx03HTcdd91wAVURRAAA3Xfdd9133XcAAAYbqq/9/9333Xfdd91333///93/3f/d/93/3f/d/9133Xfdd9133Xfdd903AFURRAAA3Xfdd9133XcAAAYagMBAwEDAQMBAwEAGEcBAwEDAQMBAwEDAQMBAwEAAQAYEAMBAwEDAQMBAAAAFIAEUDBgABiABFAwYAP8ABSABFBgMAAYgARQYDAD/AAUhARQUAAYhARQUAP8A/wAFJwEwBwNDEgUABicBGMCAAAYrARBAAP8ABSYBEAAGJgEQAP8ABlYCAQMAB1QBDPBA2gD/',
    57: 'ARALYz8ADgAAAAAAAAACFgMCZwMKyQMP1wMBOQQBOQQBOQQCTAQCTAQKOQQEOQQNcwQFxgQCFgMU1gQF7AT/AAEQBAAiACIAIgAiACIAIggiCCIIIogiiCKIIogiiCKIIogiiCKIIogiiiKKIooiiiKKIooiiiKKIooiiiKqIqoiiiKKIooiiCKIIogiiCIIIggiACIAAAAiACIAIogiiCKKIooiiiKKIogiiiKKIooiiiKqIqoiqiKqIqoiqiKqIqoiqiKqIqoiqiKqIqoiqiKqIqoiqiKqIqoiqiKqIqoiiiKIIogiiCKIAAAiiCKKIooiqiKqIqoiqiKqIqoiqiqqKqoqqiqqKgQFqgQXqKmpBA2jI6MjoyODIYkgiAAAIooiqiqqKgQXqqiHP38/T9N03Xcdx+Hz8+fl4eHwBAf4BAT8+Pj48ODg4AQOwAAAIqoiqqqqqKCAgAAAAQMDAwcHDw8TEwEQAAQEAQN/wAQF/z/DdN1//f///913VVUFNx03XXcdFwQaACKqIqqqBAQADz9///8Ppwf////8//B/P8AEBf8+BAf/AN133ffdd9133Xfdd9133XfddwQaACKqIqqiqioKCgLi8vr6gqICBAT68uKSBAUCgvAHBAX//ME33XcEBP/dd9Vw3Hfddtx03HkEGgAiiCKoIqqiqqKqoqqiqqKqogQOqory+vDkHHTMRMwUzODQcNBMHAQEPHz8/P7+/gQE/38/Px8ECQ8EBQwAAAAiiCKIIogiqCKoIqoiqiKoIqgiqCKoIqgiqCKqIqoiqKKooqiiqqKqoqqiqqKqogQLqqIqIioiKiIoIigiKCIoIggiCCKIIogigAAAIgAigCKAIogiiCKIIogiiCKIIogiiCKIIogiiCKIIogiiCKIIogiiCKIIqgiqCKoIqgiqCKoIqgiqCKIIogiiCKIIogiiCKIIogigCKAIgAiBAwAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAQNAAAFGQEgAAUbAYCBhoyPjYuIgAAFJQIcHBYREAEABhoBMcCAAAYfATE5GwAGJQEPAAYnATGAwMAABxsBYDAICJAQEAEECAAHJwEwUhIBBQIA/wAFFgECCCAgg4++uLCPpY9wcPD2MC8eV4CCggIEAAYWAQIABhoC/g8HAQAGHwH9NZ8ABiUBDAAGJwL/Bw8OAQEBAAcXAYAgAAcaAQiAwPDwELCQcDAysrLSgBAABy4BgAD/AAUgASjMAAYgAShMAP8ABRYBAgggIIOPvriwi49BcHDw9jAvHleAgoICBAAGFgECAAYaAv4PBwEABh8B/Z+xAAYlAQwABicC/wcPDgEBAQAHFwGAIAAHGgEIgMDw8CAw8HAwMrKy0oAQAAcuAYAA/wAFKwIBAAYnAXw8AAYqAX7/AP8ABR8BBAICAAUrAgEABiABgmIABicBfDwABioBfv8ABx8BMIBgAP8ABRkBIAAFGwGAgYaMi4+JiIAABSUCHBwWERABAQAGGgExwIAABh8BOZ+5AAYlAQ8ABicBTbzAvv8ABxsBYDAICOCwsAEECAAHJwEwUhIBBQIA/wAGHwEIJMAABx8BQCDAAP8ABR8BBAICAAYgAYJiAAcfATCAYAD/AAUZASAABRsBgIGGjIuPiYiAAAUlAhwcFhEQAQAGGgExwIAABh8BMbt5AAYlAQ8ABicBMYDAwAAHGwFgMAgIoJBwAQQIAAcnATBSEgEFAgD/',
    58: 'ARALY1IADgAtAAAAAAAB3QIB3QIB3QID3QIC8wIB8wIG8wIB8wIM3QIC3QL/CSgDAioDBSoDAUMDA1kDFHQDDI4DAnQDBUMDD0MDE44DDI4D/wABEAYABjGqqakGBqWpqamoBhCqqVVX3XcAAAYSqgYFqaGgpKWAo6QGBqUGBKmqqqikpZWVVV13XXVd1fR9XXddd11XVRUVlYWFoaGhqKioqqmVVVV33VUAAAYKqqmlpZeVV11XXVddV1VVdQEFVQEHTV1dVV1fUFVVQFNQUFQVFQVA3XfVVFBCCioqSkpS0nTUdd11XVddV1VXVVUVFUVF0VFUVQAABgSqqICCAABQUFPdd99//3/9d913XVVQAEVQQ1RVdx1H3QcVVVUAwQUFFVRTTTXUUEIKKgYEqgYGqSkpQVFR1HXdd913XXddV1VVVRUAAAYEqg+44osAAB133XfVVdV11XXdVVVBBVVRATUVXXf9dd11VVVVVFRUUEAAQEAAABAGB1QGCFEGBEUHFVddV91X1XXVVVVVAAAGBKoKsuAIAADAUNQGBlUGBFRRV1RRVFBT1VVQUFBBRQUVF1VXX1dfV11XXVddV11XXVVVV1VXXVdddVV1VXXVddVV1QYFVVRUVFAAAAYHqioKgiIAIAgGCQDQENDQUEBAQAACAFRVVXXddf313XXddd111XXVVdVVVVXVVdUGBlQGBlAGBEAGCQAGD6oGBCoKAgAAAwMKICgoKqqqqKgIQFRVVVBFUEVFUVUGBFRERAYHBRUVFxUVFQVBUFRVVVUVAAAFBQEBBgUABheqKgoyIqICCAIGBQACQAAABEBBQQEBBUREUVRVFERBRRVUVFHRdd103HRUVABVVVQBBRUGBFUVBQEAAAYeqioqCoIgCACAIAgiCABAQAAGBAEAAABAQBEQBgVRVAYFVQAGDVUAAAYmgAYJAEAAAAYFQAYGAEBAAABAQEAABg1AAAADOQECAAM7AgUBAAQ4AgFEEFBAAP8AAzsCAQQBAAM/AhAFHSoiAQAEOQE5BOQQQQceeOGEEkgABTwBEEBAAAVAAUAABUIBEEAA/wD/AAIrASQgAAMsAVAABCsBBQAFKgEEUDQA/wACLAIBAwAELAEFAwQABSsBBFA0AP8AAiwCAQMAAy0BgAAELAEFAwQABSsBBFCEAP8AAisCAQADKQEgFAQABCkBBEBEAAUqAUAA/wADLQGAAAUtAbAA/w==',
    59: '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',
    60: 'ARALY0oADgAeADcAAAACSAMPSAMCSAMDcgMTrgP/DOwDD+4DCO4DAiAEGVIED+4DCu4DBe4D/xnsAwFsBAWQBA+oBAOoBA/RBP8AARAGBiEAAw8PDAPA8PwwzDPMM8wzzP8AAMwzzDPMMwA///PPM88zzDPMM8wzzDPPM8wwAAAAAwwGBAABBAEEAQQABAEEAAEBBAEEAQQBAAEAAQABBgYAwDDMM8zzzDM8MwwPwwPD8wAAADDMM8wzDAHBBgkVBBEEEAADwzMMMMADDAAAEEQRRRVVFVUVAQAAMIBQRBFEEUQRQBBAAAEEAQQBBBEEAQAAAMAwzDzMM88zzzPPM8zzzDEFBRUVBgxVRBEEBgQAAwwzzDPMAAAUBQEARFFVVFBAQEBTUVRXVVdVdXRQAQAAVABVVQEBBVVVBgQAAQCqBgYqIAIAAFBQQFVVXXVdd11XXVddVV1VVUQRRAYEADLCMsIywgAAAgBAUBAEUQABVQUxAVVVd9133VdVV1VVFQYFBQRQQAAAAQVVUAIGBaqooAIDoCIgIqAAVFVVRVBUVFRQVFRUQBJAAgIKCqoqBgaqAAAgiCIAgAAAQENDw0HBQdF11XXVVdVVVVddV113zQcdFx1VVVRSAioGBqoAKgD/AKoAqgIAAEBCQgIIAAIKKgqqKqoqBgyqAAACAAIAAgAAwHAGBVBAQEIAAgACAAIMDw8DDAMGBwCggKCAoICgoKgAgDCCIIIggIAAAAAICCAooKqgBhKqAAAiACIAIgAiACIAIgAiACIAIgAiACIAIgACwPD8MMwwzDABMQEBAAAEEUQRQAEEEQSQAKEEAQYLAIAAoIAGBKCooKiAqKAGBKgAACIAIgAiACIAIgAiACIAIgAiACIAIgAiACIAIgA/zzPPMwxDUFVRBVUVRRFFEUQRBBFEEUABBBFEEAYHAAMPAwwDDAMMAwADAAMAAwADAAAAIgAiACIAIgAiACIAIgAiACIAIgAiACIAIgAiAPL88MwzzDPMM0zTdN13XVdVVwYEVRVFFUURRBEGBwDw/DDMM8wzzDPMM8wzzDPMM8wGIwDAAMAAwADAAEDAQMBAwEDABgVAAEAGEQDAAAAAwADAAMAAAAMrAQQAAy0BBQUABCcCAQAEKQFUegAELAFVCFQABSgBQBAABS8BUAD/AAMpAgEFBAUAAy4BFAADMwIBAAQqAZEABC0BYAAELwFUAAQxAVBQVQAFJwFAEAAFLgFQAAUwAQQQQAD/AAMpAgEFAAMsAQUFEQADMwIBAAQnAgEABCkBVOsABCwBVWhUVAAEMQFQUFUABScBQFAQAAUuAVBQBBBAAP8A/wACGQIBAAIbAgEAAh4CAQADGgEEAAMcAUAABBgCAQQQAAQdAREABRoBQBAABR0BBAD/AAIZAgEAAhsCAQACHgIBAAMaAQQAAx0BYIAABBgCAQQQAAQcAgETAAUaAUBUYAQEAP8AAxwBQGCAAAQcAwECAAUbAURgAAUeAQQA/wACSQEDAANDAQMNNAADRwEQAANJAUAABEIBEFAABEUBEBAA/wAEPQECCy8lF0QEAARFARAABT4BgIAA/wADQQIDAQEEAAQ9AwILBRFAAREQAARGAQQABT4BgIAABUEBQOAgIAD/AAJJAQMAA0MBAw00AANHARAAA0kBQAAEPQECCy8lF1RUAARGARAABT4BgIAA/w==',
    61: 'ARALYyYADgAVAB8AAAACxwIDxwL/BjwDET4DBD4D/w88AxSGA/8AARADAx4AERUBAAABBQEAAAEBAAAAAQMFABABAAAAQUBAUEBQBQEEBUBQUFBVUUFRVAMIVQMKAEBAUFRVFRUFBQURARAUFAQBBBEEQABRBRFFEUBFBQVEAEQRVFBBUQRRRREEEQQBAwQABABAQEFEQEREUAVRVFVVFRVFAwVVAxAAQFQDBVVUFBEFEBVVVAURVVUEQEBQUFAQVVFBRFVVVVFFVRRUEUQRRBUEEQQQAEAAAABAQABEEQUVFFFAVAMFVQMRAAEVRVERVRRVAFFUQVQDBlUVAWjMwDAAABFEEUFVUEUVFUFFARVFFUUVRRUFEQQREEEAAABAUFRVFQEUBRFVVVUDEAADCFUVVVVVBUFRVFRVVFVUVVQBAMAAQQRVRREEFVVVVVRVVVQDBFBRAwRVAhMgTE5XERQFBUFAAAAFVFVVAxAAAwxVFRVUFBRBRBFFEUQRBEEUFVRVUBRVQRRVARRFEbgAgAAAAQFFRUUDBgD//wBVBVUAABVUFUQDEAADClVFFBQBEQMGVRVAAAAMABFEUBAFQVQUVVUVRVVVAwUVVVVVVIDECDB05MQUUFBBABFAEUUVFQMRAEVRUUUVEVVVVFQBBQMGVVRAAAbHBgwAFVUURQUVVRUQUBQVRRFEEUVQRBRAEUAAABBAAAEREFFUEUQABRVVVVUDDgABFVVVVQMEVFBQRFVBFURVUVFRFEUEFQAQAUVFURVUUVVVVFVUEQVRVAAAQQQRRBFBAUURFVUUFFVRRFFFFRVVVVFFUUUDDAAQUEBAEAAQQBBQUEADBQBAQARQQBRQUFQERURUVEUEUBBBFFRAUAEUFAQUQQUEFVRRVVFFUEQBQQFBVVVVVFFRVUUDBFUDJwBAAABAQAMMAAMSQAADCUAAAARDAgEABEcBBAAESwEEAARNAQQABE8CAQAFQgFAAAVEAQQABUYCAQQABUsCAQQABVACVwEABkMBEUFEobiAgAAGSwIBAAZNAUQABk8BRGkAB0IBFEFQEQAHRwFAAAdMAUAAB08CAdRAAAhJAUAACE4BQAD/AP8ABFMCBQEBAARaAgEABVQDDAIbX0MUEURFAQAFXwIFBAEABlcB////qgUABl0BBVUVUAAHVAExddWw8JREEVBQQAAIUwFQAP8AAzABEAQRFQQQEAAELAIEAQAEMwFAVG3MQAAFKwIQBERAFQEBAAU2AVUABi0CAQAGMAIRUFABAAY2AgEABjgBFAAGOgFAAAcqAgEABywBQEUEUEAABzQBQBUUAAc8AgEACCsBUAAILQFAAAgyAgEVVEbHDAAJMQFAEBBQAP8=',
    62: 'ARALY0sADgAVADEAQQABiwIBiwL/AasCAa0CAa0CAa0CAa0CAcECAScDATsDAa0C/wWrAgKiAwWiAwKtAwGtA/8FqwIDvwMCvwP/AAEQBgAGDqqrrbWFhIGFhaCgqKqqqAYEoaioBgqqBhAABg4BBgoABguqq62FhcVFBFBURBBBAQUVFVVUVFBAQAAABgmqBgwAAQcddFAGBUBCQkJABgZREYSAKioKAAAGCaq/xEREREAAAQEFFRVVVFBQQEABAQQGBQUGB4WhqAAABAYEBQQBBx100EAGCACggKigKiAqICogKiCqgKggAACqqqqpqamooIAQUFBAERdUVFBQQAAADQ0NTVNTU1AQwNHUBgXVxXFcV1UVBQEAQAEVRdFUQAAUFAQGGQCqqqtdddVUUEAQEBAAUPEBBgYFRUVFQEFQ/ABVANF0HUdQUFFTUUQVBgVVFQVBUFQAAAQGBQUBAIEBACAgCAoCAgYMALXVVFFFFFBAEBAQBRVVVVdVV1VXVVdUUUQRRRUVBQEA3HcdRwwEzHDcdx1HUVQGBFVUVBQEBAQFRQYEVRVBUFACAgIIqqKqKgYKAEUUUUUUUUEQEBAAcN133Xfdd913/wdNAEVFRENPT09DAEDddwBVQEAVFARB0XQdQ1QFUUwGBT9MUQYFVRUAqgiqAKoAqqgGCgAUUUUUUkISAgYEKgIUz0DActJy/HTcAlJSAvL8/PzwAAPddwBVAABVAABVAADdd903QVQVFBMTE1NUVVVVVFRQAKCAoACABg0AUkoqBhuqCnLcN81wAFMRA1ETAVMRB9133XfcARXEBgTwwAYZAAYhqirKCsoKBgYqBgYAMDAw8PDABhwABiyABicAAAZWAQICCCIAB1IBoqqiAQSqgAAIUgEgoCCgoICAAP8A/wACYQEIAANTASAoKAEKCigogAD/AAFLAgEBAAFZAgEBAAJHAgEHHHNNNBAAAlEBAgIAAlQBAhMRAAJbAUDVka6iICoKAANCAgEEAxxzzTTQQAADUQGAqCAqiIoBBgqKiCogqCAABEEBQVTQFIVUQBQABUIBQBAEVAD/AAJfAQgAA1EBICgoAQoKKCiAAP8AAUsCAQEAAVkCAQEAAkcCAQccc000EAACUQECAgACVAECExEAAlsBQNWRrqogKgoAA0ICAQQDHHPNNNBAAANRAaCACCCCgAADXQGAoAKgqCAABEEBQVTQFIVUQBQABUIBQBAEVAD/AAdEAQgBBSoIAP8ACUcCAQAKQgFAICAgoKCAAP8ABBIBBwcABRIBgIAA/w==',
    64: 'ARALYxsADgAAAAAAAAAKVgIFVgIKZgIFZgL/AAEQAwNOAEQRRBFEAxAADwK4AwS6AAIAAAMGAgACAgAAAwYCAAADBAIAAgACAgIDFwBEEUQRRAMQAI+iqCqKoKoArgCo+gMFugCrq6gAAwauqAD6urq6APoAigKKiIgAAAADCQIICgMHAEQRRBFEAxAA/6qqAIoAqgqKAigqCgADBgIAAAsKACoAKgAqKgAiAiIAIgAKCgAAAQQFBAEEBQQBBAUEoaQFBAEEBQQBBABAEUQDCgAKACoAKQGJoKoAqgACgoKgoCiKAKIDBKgAqADoqgCqAKoAqKIIoqCKAD8MiIgIAEBAAEBAQABAQEAIQEhIAEhAQABAQEAAABFEAwoArgCrAHFQUQCqADIArq6uALgAqgC6AAMErACsAiIgIiAiALgCuKoAqgAjAKioAABQRBREUEQURFBEFERQRBREUEQURFBEAAARRAMKAIAAoADgAIsvvgCqAAIKCioooooAKgMEqgKoAL6qALoArwCvL4AqKooA8sCKioAABAUEAQQFBIEEhYQBhAUEAQQFBAEEBQAAEUQDCQC4uAAgICAA/6qoAooAqoCKAKCiggMEAgACAgAAgoICogKiAKCiAiICIAIgCoiKAgJAAEBAQABAQE4KQEBAAEBAQABAQEAAAQQRRAMQAI8qqKOLK6sAugCovgMF6gC6uqgAAwauqAADBK4AqwACAAICAgAAAAMFgDCgAwsARBFEEUQDEACAALADBKADHgCAgIADFwBEEUQRRANPAEAAQABAAAAFHQEMBAwABh0BOBAYAP8ABR0CAwEDAAYdAQUEBQD/',
    65: 'ARALYzcADgAtAAAAAAAFwQMKNwQDNwQTNwQCowQFowQBowQBowQBNwQUwQP/DLAEBbIEHLIE/wABEAYA/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AAAA/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/ADzCsoKACoAAMIC8gLyCMoKwgDEBcUFxQArKgAFwArABcUFxQXFBfEB/AD/AP8A/wD/AP8A/wD/AAAA/wD/AP8A/wD/APwA8wDwAPAA8wD/APwAKOioqKKKKKABBYCCoqCioiCCgogKCkIAAACoqABQAOgABgRAAFRVVVFUFRUA8AD/AP8A/wD/AP8AAAD/AP8A/ADAAAAAqgD/AMAAAPwPMwQVEBWFgICAgQUUUEIKKKKKKqiiCqqoAqqqoAABACoAKgAKAMICwiIgBgQoSgAKSgYECgArACIgIiDKCgAA/wD/AAAADAAAAKoC8AYGDPAAVFRXXACqAEEgCqCqgCqqoAqqqqAKqqCPCAIMSgqIAqgAqgCqq6uqqqoqCgYGAMDAwACjAOAAgADgoAAA/wD/AD8A8PAAAACAoCAoysLM8AYEwgooIIAAUAiwD6oC/KsK8K+qCvKsKsqCAMCFgIoAqgCqAKqooAYFogYEAPwA/AD8APIA8AD8APICAAD/AP8A/wD/AD8ADwAACCCADwAPBgUAQEBERFEUBcHwvCvKsqwqyqCqqgqgqqoKQACvAL4A+gCqAKigjioqiqCoAAYFrKACugCyoKKgC6oAAP8A/wD/AP8A/wD/AP8A/wD/AP8AA4CLioqKIigKAgBAUhIC4qIAoKgAoKCAAICCAAMDgwOACooAAwMTEwMjIyMDAyAKAAYFAwCBgQABAIGBAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8AA8CwuLi4AL4AALi4uLCLK6iggQUVBQUAgADLysDAAKGhBcAGBsghIcUEpADg4+Dj4APg4wDjAOPgAAD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AD8ADwA/AD8APwAPAA9AQ0BDQA8ADwCDgAMADwADQENAQ0BDQENADwA/AP8A/wD/AP8A/wD/AP8AAADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAAAADGwEDAAMdAQwAAx8BDAADIQEMAAMjAQwABBUBAwAEFwEwAAQZAcAABBsBgAAEHQHAAAQiAfM/NhQABCcBFRAEAAUcAwIPAwQMjOzPQAFRAggABhUBMAAGGwGAIIDo4ggCBDjOzpqCAAcbARAABx0BBygDAP8AAx8BAwADIQEDAAQVAgEABBcBCAAEGQEwAAQbAeAABB0B8BjwYGBvAAQkARrVEAQECQAFIgH8JywEAAUnAUQABSkCAQAGFQEMAAYbASio0sTMxMbOxPAMCxNYaAAHHQEIgCyAMAAHIwEwAP8ABScBDBQABSoBFQD/AP8ABTMCAQAFNgIBAAU6AgEABi8BQAAGNwIBAAY7AQQABj0BQAAGRwIBAAcxAkAQAQAHNQEQBAAHOAFAAAdDAREAB0UBRAAHRwEQAAg0AUAA/w==',
    66: 'ARALYzkADgAYACIAMgABgwIBowIBzQL/CQgDAwoDBgoD/wUIAwFHAwVcAwFcAwFHA/8MCAMJbQP/AAEQBgYIAP///z8MBg4AAQcRBRccHBcFBgwAP3/88vLw8MAGJACAwODwOIygKAkBBgoAwBBA0Hd30EAGCgABBckooIAGDwAVVQAAFRUVACoAqwCrAKoGEwBAUBQFAQYIABEGBFFFBgQFBAEABRVUUEABBgsAFUBAAEBEAFFQAQFRUVEBqADqAKoAqgYUAAEBBQVEREVFBQVFQVBQVAYGVRVFUQYEEUEFFRVVBVAVBREEBQEAAEBAAFBRAFUAVQYFVAAAqACoAKgGEAAFFQYFVQD/PwBVVVFVUVUVAAAqAEpASkBQVVVVVFRRUVFUVFUAVVVVAFRTTw9PT08PTw9HQwEAVFFBRUQFAQYHAP//P6+vrKAABgRAAFQGBlUA//8AVVURVRFVVQAAugDqAOoAAVVFEVREEREREBAREBEBKSgpKSkoKcnx+Pn4+fn5+Hk5QBQEFFAGFgBAQFBQVBTkxBQGBFRQQQUVFZUVVVVVVAYFUVAUFRVVVVQBVVRRBFRQQABAQEABUQBVQBUFBgRFQAAKAAoACgYUAAEFFBBAQEAAAEBAUAYEUQYEVBREUAAUFQUBEBAAQEAAQAYHABVAQABARABRAVBQUVFRUAoAqgCqAKoGEAACCghDQAYKAAEAQV1dQUAGCABAUFQQAgIMDw8DBgcAQEAAQEAAVVUAAFVVVQC6AK4ArgCqBgwAAw8Pj48///8GCQAQfBFUfcfHfVQGDACAoKgqw///Pw8GCwBABggAgACAAIAGCwAGB8CABiQAgMDAwAYbAAAFSQIBBhoPGhoaDxoPEhYBAAZMARgY+MABB8hICAD/AAZHBAEDAgICGxI+Dg8ODw4ODgwNAQAHRwFQEJCgsPCwsLDwoMCQQAD/AAVJAgEGGg8aGhoPGg8SFgEABkcEAQMCAgIDCsbOx8bHxsbGxEUJAAdHAVAQkKCw8LCwsPCgwJBAAP8A/wAIHwEEBRQVVQRQAAkYAQICCggrIKKKCENAAAoRAQcPHz9//z+/Pv/374+PP///AAsRAQEHwIABB8CAAP8AARgB/z8PAwIAAhgBgMDg8DgMAP8AARsBzPzy/P8/AAIgAcAA/wABQAE/f/zy8vDzzz////8AAj4CAQXJKaKKKKMO/PjwwAADOgIBBRRRVVRVEIAABDoBQAAEPgFAAP8=',
    67: 'ARALYz0ADgAhAAAAAAABMgIBgQIB0QIB0QIBgQIBMgL/AzADATIDAT8DAU0DBHsDAXsDAU0DAT8DATID/wABEAYABiWqq6qrqquqqwYmqgAABh+qq667rrvuuOGx4bHguO677ruuuwYgqgAABheqr6GhBgSgrrvugBUAFE0M/D8wcRQAFQCF4LvuuwYSqqCjoKOgBgeqAAAGC6oGBKgGCKrwBgRVFRUFBeGxLTkNAUFAwUEBEVFRAQEAsMioqqqqoICHhYUBPD8ABQCFgAEUFFQAVBQAAAYFFAAAqKChgIWAFRUVAI8AVVATEwYEEBUVBQEBQEBPQE9AT0BTUFNQU1ABVVVBQUBQUVBREAEAFQAVABUAxVBRUBEARQVRAVABAQBAQFBQUAYFUgAACkJyAFwAV1dXAPwDVQYHAVVVVFBQAAD8APwA/ADyAvIC8gJQVVVQUAABcQFxAXAAdQB1AHUAdAHRAdEA1FRRUAFQUEBAQAEBgQYFoQAABgWqBgUqqspKSgoGCCoPKgYHqqgGBqAABgZQUlJKCgoKKioqAgA01FRTTz8AVABUAFAFBQVARUVAQAYFRQAABheq/KiooKCAgAAEAQABgYCBhYSFhIWEhYSFhAYFhYCjgIWAhQATEAUAEwWAryoqAnICcgIGByoAAAYgqioKSkoKUlJUVFVVUE9QUE9QVFRTTzzyAlIKSgoqKkoKKkoKKgYOqgAABimqBgQqBgfKKgYdqgAABlKAAAABMgIBAAE3AQQAATkBBAACMAEQQAACMwFAAAJBAUAAAkMBBAADLwFOAAM2AXw8w8M8PAADRAIBAAQzAQwABDUBDAAEOQGAAARDAWBAAP8AATcBBAABOwEEAAFAAgEAAjACAUQAAjMBQAACOgIBAAJAARBAAAMvAQwAAzYBMPdDwjuMAANEARAABDEBwDAABDQBOAAEQgEQAAREAUAA/wABMgIBAAE4AgEEAQABPwIBAQACMAERAAIyARBAAAI1AUAAAjoCAQACPwFAEAACQwIEAQADLwFMCAADNgFY34PBL9gAA0ICAUQAA0UBEAAEMQEgAARBATAABEMBQAD/AP8ABREBAgAGEQGgQAD/AAUSAQoLAAYSAajYAP8ABRQBKi8ABRcBlQAFGgEVjwAGFAGq9gAGFwFXAAYaAVf8AAcWAYAABxsBgAD/AAUWASoqlZUABRsBFQAGFgGqqldXAAYbAVcABxcBgIAA/w==',
    68: 'ARALY1oADgAbADEASgABOwMBaQMBaQMkOwP/CpwDAZ4DAZ4DAZ4DBJ4DAZ4DFJ4D/wicAwG8AwnEAwzMAwLTAxTTAwPTAwrTA/8InAMB3AMB8wMB8wMP3AP/AAEQBgDuu+677rvuu+677rvuu+6/7r/vu++/77/vu+6777vuu+677rvuu+677rvuu+677rvuu+677rjsuO677rvsuO677rvuu+677rvuu+677rvuu+67AADuu+6777vvv++/////vwYP/7////+////vv+677rvuu+y47LjsuOy47ACDDgqAwiKAAA477rvuu+677rvuu+677rvuu+67AADv++8GBP/8/Pz4+AYF8Pjg4MDAgIDg8PD8/P4GCf+//7AUEEUVFABAQEIKKqqiiiqqqqigAw47DgMAgMCD4LDisO247Lvuu+67AAD//PDwwAYLAFRBTVQGCgCAgIDA8AYG/z8DUFRUEooqqKMGBKqooIIAAACAwIDguO4LAIDsu+67DktSFBGE4bgGJgDw4MDAwAADDjroqoo66KKIgIAAAAGBoCgGBgDAgOAAALvuu+677rsuSxFEBh8AAQEEBRAFAQAACgoKioqKKqijjiiggAEhBRVVVUUBBgsA7rvuu+677rvuuxFEAAA/Dw8DAwMGEgABAQEGBFFVEQUFVVUVBQGAgKOOOOCABBUVBgVVVFRFBFFFBAYHADDsuOy44LDggMCAEUQAAAYP/z8PAAEEABUGBFVUFBERBQUVBgZVBCAAgqAgIAAAAFBUBgRVFVVEEFAGEAABBBRQEEAAAO777vv////7/v////7////ABBEEAUBRUBAQUVBRREBEQEQGBAACCCCABgQAAUQBAFBUVFVVVFUAUAYIAAQABBAAEEAAQAYIAO677rvuu+777vvu+/677rsCRBBAAQQRRBFEEUQQAKGgoKAhICGAASCgICAAAAQARAFAEEQRBBEEEQQRRAYMABEEAQAABBFEEUQAAMCAwIDAgMCAwIDAgMCAwIDAgABAAEAAQABAAEAAQAAAAEAAQABAAEAGBQBAAAAAQAAAAEAAQABAAEAGBQBAAEAAAABAAEAAQAAAAEAAQAAAAj0BAgMCAwIDAgMAAzkBB1HVlISU1ICAwIAABDkC/H8GBQEcEIAABTwBQAD/AAM5AQYdITUhMSAwIDAABDkBAxBEQAAEPgEYAARNAcAABE8BIDAMAAU7AUAABVMBwAD/AP8AAy0BAgADLwIBAAQvAYCAAAQyAUAwDwAFNQHwAP8ABCIBVEwA/wAEIgFUMAD/AAQjAXwA/wAEIQEQDAwA/wAFSAIBAAVKAgEABkcBQAAGSQEQQAD/AAVIAgEBAAZEAQgkUAAGSAEEQAD/',
    69: 'ARALY1IADgA5AAAAAAAB9gEBJgIBJgIC9gEKYAIBYAIB9gEI9gEB9gEDJgIBJgIC9gEPYAITYAL/D4YCAYgCCpUCGaICAbQCEdACFIgCDIgC/wABEAMAAxCqAwSooAAooICAiAMbACAIAggCCAIDBwACAwcAAggiCCKIAAADDKqoqKgAICADJwCAIIgiiCKIIggCAAAAIAAgACIAIgAgCACIAAADBqqooKCggAAgAykABQQRBAEAAIAAgCCIIogqAACAIAgCgCCIIogiiAAAAwWqgAMoAAEBBAQUERERFVUVVQUVBQEBAwQAgKAAAogCAACAIggCgCKAAAADBaooAx8ABBAABAQBEVEQREUFFQMFVVRUUFBAQEEDBQEDBACIIogCAACAIIgiiAAAAwWqIAMZAAMEAUUVRVEDDVVQQAMEABRVVVUDBlQCCioKAoAggCAIIggCgAAAAwWqKgoKAgMTABAEQERRVVVQQFVFQFdSVFVUAwVVVEEFAwQA4AAKSioqAwyqAwQqCgoCAAADCaqKigoqCgACAxQAAQBBQAEFEBBSUhIDBFISUlJSCioqAxiqAAADEaoqCigiAgICAwkAAgACAAAACAACKAMnqgAAAxSqCgMFqioKiqIoKioCiKqiqioqCgKCAiiKogMjqgAAA1KAAAAFSQEEAAVLARAABU0CAUAABVMCBAEABkoCAQQFAQAGTwIBBAIEBlAAB0wBoGAA/wAFRwIBAAVKARAABU0BQAAFUgEEAAZGAUAABksCUBIGAQAGUAEVAgAGVgEIIAAHTQGAgAAHUAGAAP8ABkoCBQEABk4CAQAGVAEGCCAAB0QBQAAHSgHgQEBgAAdPAYAA/wD/AAc5AwECAAg7AYAA/wAHOQEGAAg6AcCAAP8ABzYCAQAIMwJAQBAEQEABAP8ABzYCARAFAQAIMwFAQBAEQEBRgBQACD4BAgD/AAc3ARAFBgIACDkBUEAUAAg+AQIA/w==',
    70: 'ARALY0sADgAhADEAQQABSAMCfwMBfwMEfwMBfwMJSAP/DqsDAa0DGa0DA60DE60D/wWrAwK5AxS5AwG5AxO5A/8BqwMB0wMB0wP/AAEQBgYrAAYWqoCFhQEQFAAUABEBEICoBgSqAAACCAIIAggCCwILDgsOCw4LDgsOCw4LDgsOCw4LDgsOCw4LDgsOCw4LDguOi46LjouOi46LjoCqqqqCgISNoIEH3TdBRBUXXXddd1RRFAGAoACAAADiuC6LIosiiOKLIrvuuOGA4YUABQUQARQdNwAMAJzUheW04bnsuu677rvuu+677rvuu+677gAGBaoK0HMdccx01FAAQMB33TddF00TRQUBAAAAIogiiOK77rsuu+4wAERRRB03QTQdRBFHHXcAx1BX0QAVQQCAYH8cjOy05LTksOC77rvuu+4AqqqooIEEVRRAQAYFAAMNd90BBVTcdBxUUAAAAC6LIoguiy677rvuCAFDQBAUQRRUFAQRRNBEFQQVdNVVERRRNMDAQEBAAOC47LjsuOy44LDhAYwHHTQcMwEDAAEEEQRRVRQQQAYMACK47ovuu+677rsOA8Bw0AUAEQREEEAAQQREEEAAQAYEAAEAAQcdBwAAABAAUFBQEABBQEVATQcdNM1HHXAFRFBQQAYHAAICAgoKKioqAAAiiO677rvuu+677rvuOw4AEEFEFRBBBRRQAAUQBVUFRQFHEUMAQcAAABUAVAA3HUdQBFEUBUABQBBQEEAGDAAIIaGgoKOMgx03AAAiiO677rvuu+677rvuuOEDEEFEEEFBFAANd1133VVVVdV03XXVVFQQAAAVQAx30AVAN103QFUQQQQBFQUQBRQUUFNNR01HTQdNNBFz3HHEccQQAAAiiCKIIrvuu+677rsCINh03DEBBRAFUFTVdcFABQUEQQVBAAEAE0AAEEARURFABFAAdNAMUAAARFQDUFRANNx00EEEQNx3zRPEccQURFBABgUAIogiiOKI4rjuuO647rsuCw4LBhAAQADAQAAAwEDAAAAAEEDQcBAEHDQcBw0DDQcMBA0DQUAQQBAAEAYOAIAAgACAAIAAgACAAIAAgACABicAQMBAwAAAAMBABhEAAAMwAgEBAQAEMQFAQQAENAH/fHOQIAgABD0BBAsOAAUwAUAABTIBUIHkAAU2AYAABTkBQKAA/wADMgMBCAUCAQAEMQFBVX9jEIBgGAAEPAEEDgAFMgFAgBCAAAU4AUDgEAD/AP8AAywBDAAELAEHAP8AAkkBCiIhJyQAAk8CAQADSwGAAANPAcAA/wAHWgEIAAdfAQwEkCAACE0CAQEHBRMeeVo6GjobOiUWPwEFFQQQQAAJTQFA5KykkUQUQayr+V/UtdREVBBAAApRAUBAUEBQAApXAVAA/w==',
    71: 'ARALYzUADgAbACsAAAAFfgIDfgIEfgISfgL/CcECBcMCD8MCCsMCFMMC/wTBAhQBAx4BA/8AARAGBhUABgQCAAQFBQQEBgQUBgYQAAYFQKggCAYFAIEhAQEFBRQUFBBTBgRAADAPDA8+w8AGFQABAAEEAQCAgJAQVBUVBQUBAQEGCgACAgAEFBUUFFRQUFJSQEAAAgIGBAADwzw8M8DABgQAwHAeAwYLAAIKCgIQQBFAAUAGDABAQFBQUFQUFRUFBQEBgaCghAQVFQUBAACgAACAIAgCjKwwMMwDAAAAwDwDBgcAgPAcBwYKAICAAEAAQABAAEAQQBBAEEQQBBAAEQABBAEEEQQRBBEEEQQRBBEEAUBQVFUVBQAIIICAwHgPAAAAwDwDAAAAwDAPBggAgAYbAAUVVRVVFVUVBgVVVFQUUBFBEUUERAUFBURDSAoKKioGBigICALwDwYEAPAPAAAGBQMGGgAGB1VUUlJKSioqqoAVxDMARBXEBBVVVQTA8zOAgAYEAAgoCggIMDA/8DAwwP/AwMAGHwAGB1UVFYWFoaGhqAhAUBAUVBTFBRVVVQTwyCiqKgoGCAIIAMAAAAD/BiQAVFVUBg9VVFUUERQQAAABBRVVFAAGBICCgIAAA/wGBAA/wAYIAAMGHQBAAEAQRFBEUURRRBFEEEQQQBBAAQUVVVRQQEAAAAICAgqoAAAAD/AGBAA/wAYIAB/wBhwAAQABBAEEEAQRAQUFFRRUUFEFFVRQUEAAAAgCAAAKKICAwMDDzPDwMDAwDwz8DAwGBQMAfsAGHABAAEAAQAAABgVABgQAQEAGCgCAoKAGBADgBgYA4AYJAAYFwAAABE4BAwAFRQEDDwQIKCgqKirqWioKCAIABkcBgCAgAQmAsBAAB0QDATE0BAKCoqoDBioiKI/AAAhKAQEEgIgggAD/AP8AAUcDAQEJAQUFFBQVEVIDBEEBAQIAAj8BEAACQQIBAAJDAUAEAAJGAQICEBABBFABBECAIAACVQFAwMAA/wAIQQIBBAAIRAIBBBAACEgCAQAJPwERRBBAQAQQEEAACjsCAQQQQQQACkUBAgAKSAMKCAMEAQIBAQALOgFAAAs8AUBAAAtGAcDg4EBAQAALTQHAAP8=',
    72: 'ARALY0cADgAnADcAAAABjwMBjwMBjwMCjwMDjwMBjwMBjwMJjwP/BqMDAaUDDKUDAaUDHqUD/wijAwfEAw/EAwrEAxnEA/8AARAGAP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wDwCMoC8AD8APICygIAKK4uDkIQVFBRQAQRRBBVFVRQQAYHAA8//////PDAAAAA/wD/AP8A/wD8APwA/AD8APMAxQXwAPwA/wD8AP8A8A46KqKqAKoGBAABoYUFFBABhaGoqCoqCkBAEBBAAA8wMDAPAAADDz//PMDAwAYHAP8A/ADACiAA/wA8PDwGBADAME8AUFUVBVUVFQUAqCiiIooooAAAAAICCghDCgoqKgIoBgQqCoCoow8//PPPw8APP/z88MIIIKCoCgYHAMAGBACqAgDwDAPDBgUDDzzwAABUUURRRBBAAgqCgAAAAAoqAqyrqqoqyvK8r6qqKoqgoIMPP/zwwADD888/8MwyyiijjwAVFQWgAQYMAICgKAgICAoKAwICBgQMA08ATAxMDIyAqKCEAQAAgYCgqirKsK+rqqoqwI8zDDz88Mw8DwA///zyygKgoYEFwAEFUVRVVQVVVVEBFQAA/wADAAAwAwMGBwDAsK8qAPDACiqqqqiggAAEFRAEQBVVAACrqqqqAvy/qqqqKsrKwAijjw88///8MICAAABAEEVVQRVUFFEURURRQFVEAAD/AP8ADwDAwAYHAAIK6KAACiigoIAAABBEAQEFBRVUUAICAuIGBKIA8Kiqqqigjz//88M8PMAAAAIABRUAEURBRUQRRRRRBBFEFFAQQAAA/wD/AP8A/wAPAAgICCijgAAFAAAAUAYIVFBSSiqooKKCiooqKioKioIgCgAAAMAGBDDMPAM/AKoqQlBUFAVFBQVFBUUFBRQQBgYA/wD/AP8A/wD/AP8A/wD/AABRBRUVFAEFACA4Pi+ooKKCDi+LqqqKqqgqqqqqogqgAAACKigCCigAAQQAgaGgrL76OgYGKigoIKAGBwD/AP8A/wD/AP8A/wD/AP8APwA/AABQRAYFFASAoKCoKqrq+j6+vKquuuiggAoqKqqqoAWAqqoqAFEUBUFRVBQGBRUUBg0AwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAAAAgIAAgIAGBQAGBYAAAACAgIAAQAAAQEAGFAAAAykBwFBAAAMtARAFAAQuAUAA/wD/AARaARQQAARdAgUBAAVZAUQABV0BQEAABlcBEFAA/wABOQEEAAE8AwgIAiiGgCBMUkQEARFEFVVURUBBBBBAAAI7AaEkgBEEEYQkCQACRQGCAAJHASBKAAJKAVAAAkwBUEAAAz0BQAD/',
    73: 'ARALYzIADgAVAB8AAAABqAIBqAL/AfACAfICAfIC/wnwAgH7AgELAwEpAwNHAw9eA/8AARAGAAYXqqgGBKGoBimqqKgGCqoAAAYUqoCEBEQERARERASEgAYgqqigoaGAFVADjjgBBgQxAIyGAAAGFaooQUVBRUVBRUEoBhSqBgSoqgYEqKqqqipKAlJQAFUAPwBAUVQUVFBAAQQAAAYSqoiIiIAEBAAVFQAEBICIiIgGBaqooKGgqgYEqKqihABVVQCgAFREVAEVgKoAFRQRAFUAPwAAVFEBUQBQBFEAAAYFqqiooYA/Pz+AoaGoqqqKioAARUUAVVUARUUAhYCIBgSqKkoAVAQVAFVVVQCBgQBVVQAAAAVERVBVAAAAVVQRAFUAPwAQVFVFVVQQAAEAAKqqqIEAUABUAMTAxABQQAAEgKioAABQUQVERAFQVABUAACAgIKCgoCAgAEBBUUVEURERABRUQEAAFVEVQBVAAUAVVQRAFUAPwAAVRQAFAAUQRQAAKqqAlQAUAABUFEAUVBRAFBQUlICAFRUVQFURBEGCBAGBBJSBgRQUVFRUFBQABUVAAAAQEREFVUAUgBVVBEAVQA/AAQVVVFVFQQAQAAAqqqqKipKAlICUgJSAkpKKiqqqoAVAVQUQEVFEBRUAVUAAIaQhpCGkIYAVFQAUlJSAgpKAlJSAqoAVERUAkoKqgJSUBAAVQA/AAAVRUBFAAUQRQAABhKqAhJCAFBQUAAAUFBQAEAICKgGC6oGCqiqBgWohYUBEABVAFUAPwABRRUUFQUBQBAAAAYVqgJUBKSkRFRAREQQREQSAgYGEgISEgIGClQCVABUAFRVVQEQAFUAVQA/AABFUVBRQAEEEQAABj6AQEAAAABAAEAGBABAQABAAEAAQAAAAlkBDgACWwEwAAJeATAAAmABMAACYgEGAANYAcwABFgBzAAFWAHMAAZYAcwAB1gBzAAIWAHMAAlYAcwAClgBzAALWAHAAP8A/wAIMgEBCAYA/wAFIwE4ODAABTABMDA4AP8ABCMBAwMDAAQwAQMDAwAFIwG4uLAABTABsLCwAP8ABCMBOzs7AAQwATs7OwAFIwGAgIAABTABgICIAP8AASkBAQRQAAQjATg4OAAEMAE4ODgA/wABKQEBBFAA/w==',
    74: 'ARALY2AADgAnADoASgAHBQIPBQIBMAIFVgIBVgIUVgIKVgIDMAL/AXoCAXwCAZsCAbwCAbwCAdYC/wF6AgH2AgEJAwEWAwErA/8BegICQQMFTQMCWQMDZQMDcQMChwP/AAEQBgAGSaoGCwAGGKqAlVACqqoCUJWABieqBgsABhiqKkpSEISEEFJKKgYcqqijgIyNgYyMgY2MAwYKAAYIqqCFgISFoAYHqICFoYCFAMfFBQUFgISBoKCEgYSAoKOgqKgGCKqooYUVAAQRAM8AAAYIVQA8BgkABgaqgBUAVQBURQBVAKpVqgBVADpOUxQFQFXdVUQxRBEAAEQRRAD/PzPMAwCAqqigg4wPAFVVVQBEEQA8AAAGCFUA8wYJAAYGqgBVAFUAVEUAVQC6VboAVQCqqKH1VABV3VUE8wQVAABFFUUA////zDMAAKoKMgDM/ABVVVUPRREAwDMMA0NAAwNAQwMMMwYJAAYHqioCVABURABKCopKigpKABRSQBQAXFTUVFQAVFQCAtRUVADCMsIKCioGBqoqClJUVQBVVQAA8AX9/QH9/QH9/ADwBgkABhqqKsDFBQAqBhmqBgUqADwAPz8APz8APz8APwYJAAYYqoAVUEIKCkJQFYAGHaoqKsrKCsrKCsrKBgsABhiqKkpSAqqqAlJKKgYnqgYLAAZJgAYKAAAIKgQCAwQEAQMCAAkpAYBAEUogIEoRQIAACikBgGAYCAAKLwEIGGCAAP8ACC0BFBQACSkBIJDEUkhIUsSQIAAKKQEgGEaCAAovAYJGGCAA/wAJKAEKBREEEggIEgQRBQoACigBoFhGlCoACi8BKpRGWKAA/wD/AAQ7AQMABTsBwAzAMAAGPAHAMAPMAAc6ATDwwMAA/wAEOgEDAAU6AcAABT0B8z8zAAY8AcDDw8AABzoBMDAA/wAFOgHAwAMwMz8ABj0Bw8DAAAc6ATDAwAD/AAQ6AQMDAAU6AcDADDMPMwAGPQHzwAwABzsBwMDAAP8ABUUBAzMABkMB8DAABkYBAwD/AAVGATMABkUBMAwA/wAFQwEDAAVFAQMwAAZDAfDAMM8A/wAFQwEDAAVGATAABkQB8AAGRgHAAP8ABiEBEQAGIwERAP8ABiECAQAGIwIBAP8ABSEBQAAFIwFAAP8ABSEBRAAFIwFEAP8ABSEBBAAFIwEEAAYhAUAABiMBQAD/AAYhAVAABiMBUAD/',
    75: 'ARALY10ADgAeACsAQQAFrQMC4gMH/gMCIwQPrQP/FEwEAU4EA3oEDKkE/wFMBAHYBAHpBAPwBAHwBAHpBAHYBP8BTAQC+AQC+AQC+AQC+AQCBAUC+AQCBAUB+AT/AAEQBgAGD1VXXXddd11XVVdVVVVXXXfdd91/33fff99/33ffd91XVVddV9133Xffd99333ddV11XXXddd9133Xffd99/33ffd993AAAGBVVXVVdVV1V33X9df91/3Xfdd91/3f/ff93////88PH8/MAREcHx8Pz8fPx8/Hz/fAYF/P/8/Pzw8fDx8PHw/PHx8PHx8PHx8Pz8/P8AAFVVVVfdd91/3f/d/9//3//f//3/3f/f/90GBv8PUwBVAFIABAQEVAAGBFQAVAASAAYESAgAREQAoASgBKAEUFFUBIAUFAAUFABERAAUAADdd99/3//f/Pzx8MDFwAYF8fwGBP/88vwGBP/88ABVFQAAgKGFFBABFRQQARUUEAEVFBACwPD88MAAFBQBRRUUEkAFBQAVFQUhIQEhARUAAP///PDBEAFQAVABEEEQQSgqKkoQEQAIwAQUAMLw8QREEQBVUQUVUUEFFVFBBRVRQQUVUUAAKiAFFRBSEFIQAlBQQSEhASgIElQAAFRUACoAFEUAAP//A1BUUFRQVFBUUFRQVAK6uroAVFBSUFFRAKwAVAEBVAAFBAVVVARVVQRUVQVUVAVVVACgCgBVBbCoALgAuAAAVAQEVFICuKEAsAGxAAoAAQUAAN33/f8/Tw9TA1QAQBVAFISEhBRATw8/PwNIAz///w8TQABVVQBAUBQFQVAUBUFQFAVBUBQFgYAIQEBTQFBAAVFUFYWBCIAFRVAFBVVUBIQERBUAAN133Xfd9/33/f/9Pz0////9/93//f/dBgX//f////wAVUAIACGhIUFAAUFBQQBBQEgAQkJCAjLw8fEwAAFAARBBQEQRAQABQUABgYABgQBBAADdVdV13Xfdd9113ffd/93/3ffd99333ffd/93//f//D1MAVANTAAQEBFQABgRTA1MDTwMGBBMDDxMTA6AEoASgBFBTVAQgREQAREQAExMPDwAABgVVddUGBlV11VVVVdV13XfVVdV13ffd9933/QYE/z9PTz/////99/33/ff99/3////9//0GE//9//3/AAAGGkDAQMBAwEDAQMBABgfAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEAGBcBAwEDAQAAAAloBNQACXAI1NQENAAJhAQMAA04B8AADUAHwAANSAfAAA1gBwAADWwHAwAADXwFAQMAA/wACWwEw1Ncy4u8wAANbAcCERMAUFAADYgEQAP8AAlgBNOEH0wPT0wPcMAADRQEBBQwAA1cBBFQQRFBQEIxcLAD/AAJYATThB+PXBOHhMwADRQEBBQwAA1cBBFQQRJDUVExIOAADYgEQAP8A/wAJUAHwAAlSAfAACVgBMAUFAAlcAQkJAAlfAQYQAApZAcDAAApcAcDAwAD/AAhZAQQEAAhcAgEBAAlOAfAACVgBE0UFBB1ODyo8MDAAClkBwMAAClwBwMDAAP8ACFkBBAQACFwCAQEACU4B8AAJUAHwAAlSAfAACVgBI0AACVsBBBRHDywsMDAA/wAFTwEDAAZNARAABk8BaAD/AAZNAXwA/wAGSgFgfAD/AAQqAgEAByoBBAD/AAQqAgEABSwBAwAGLAHwAAcqAQQA/w==',
    76: 'ARALY2AADgAbADcARwABogIBxgIBxgIDogL/BdYCAdgCBfMCAfMCB9gCAdgCB/MCAfMCENgC/wXWAggPAwUPAwkuAwEuA/8P1gIDTAMDewMHjwMHjwMMjwMFoQMMTAP/AAEQBgYoAAYFAQYjAAMNNAYOAAMDAwYXAFUAPj4+VUkUFBSqFBQAAAAqCgIABQAVAK6oAQAFAAUAKwYEKiIiAtJCCioGDQDAMDwwwAYUAAoKAgYFQgIAAACAoCgKCgrioqiiKgACAqICEBEBERERgQYLgAYKAAICCgAKyggCCgoVICoAACqqq6sGBKoqCkBVBJGRgJWEgJSVhaEoBgQCgqGgIKICKioqBgWqKkpQRQAqAFUAVQAVACoKAAUGBgALKqqqqIIqqqqgB6WlpEApqAEBuK7r66qqqqiggBRUAEFBQAVFRQAVACEIiICFoKpcVBTEhKCgBgaoqqgAVAC6AF0AXQBVAKqoAFEGBgDLysoCsKyLinJQB1VVAXBUAFRUUAICUlJSAqioAKwARBFFAFVVVQBdAFUAVABdAAJcRBBMEEwQTBBMVFQQAgBUVAASABEQEQAROBJEAEUGBgDA8KyoqyrK8L4qAigqKhWMqgAAq6qvrwYEqioKUFUABwUEwUREAFEBIYCKCkoqql1UUEpKKioGCKoAVQCuAFcAVQBVAKurABUGDACAAICzgACAgACAgAAA4LisrAYEqKCABNxAEhICUkICUlJCCqgAAQQEFQArAOCioqKgBgSqqKGFFUUBoQBUANAAQACggABABg0AMMzMzDAGFACgoAYHgAAAAMAwEFQAACuqqiihAAEAKgARARABERARAAYGCgYECAY4AOCAAABAAFAAuCgAQABAQABAAPioqKgoKMhISEgGVQAAAh0BAwACHwEDAAMcAcDwAAMfAfDAAAkcATD8AAkfAfwwAP8AAx0BwMDAAAkdATAwMAD/AP8ABUABDQAFQgEEAAZAAQMABkIBCAAHQgFAAP8ABT4CBAgEAQAGPgECAAZAAQJVAAc+AUCAgAD/AAE3AgECBAUAAjgBBcvLywVMBAADNwFAkBAQEEAA/wABNwIBAgQEAQACOAFQaWlpUBkQAAM3AUABBFAA/wABXwEDDjk0AAJWAisBAAJbAQgAAl0BINCQSCAqAANSARAQAANWAYAAA2IBgAD/AAFfAQMNNAACWwEKCi72dhj4AP8AAl0CAQkZP/8AA10BAQWAAP8AAV8BAw00AAJbAQoKL/9vJwcAA10BAQWAAP8=',
    77: 'ARALY0UADgAAAAAAAAABggIBlAIBrAIBggIBlAIBrAIBggIBlAIBrAIBggIBlAIBrAIDxAIB3AIBCwMBdwMJNwQBsAT/AAEQCQkoAAMAPwAIAOsACAAqAAIACgAAAAIJCgAJBlVUUEEAEEQRRQkpAP8A/wAIAL8ACACqAAIAqgCAAKoAIACqAAgACgACUFRVVEAAEQAARAFEEVUJFgAJBgEAAAAFBQkEAAMFBQD8AMAJBwCAAAAAoACAAKgAIACqAAgAqgCqACoJBwBEAEQRVAkQAA4EdFQEBMQJBUQAAP9VVAAAEBD9VAAXFxUVAAQAFV9VAAAaGgAfAAgKAgABCQUAgACgAqgJBAARAAFAAFURVQkFAAEAAAUQBRBAT0NDEBUFQEUAcFEGloUGBgUAER8VFQM4EhASEBIDFQARABRARAABEQEcFAAACGIAVaoJBQAggAkFAAQAAABAEVUVVQkFAMAAgHAEcATBwfEBBFRQAVEAB0WQkFCQkFAARP9VVfAOhASEBIT9VQBEAElAScBQEVAFRUBAIIoAVaoJBgAIAgAABAAEEAARABFVVVUJEAAwEBERCQQQEZGREAAAAAUHAQAHBQAHAAURBBAQEADEBcUAAEQEABQAkJAQAECACQQAAgAKAKoAABAAEQARBBFVVVUJHwBAQAAAQEAAQAAAMwAMCQcAAgAAAAoAAgAqAAgAqgAgAKoAqgCoCQUABAFEEVRVVQkpAP8A/wAwAP4AIACqAIAAqgACAKoACACqACAAoACABRVVVQVBAEQRRBFEUVUJKQDwAP8ADAC6ACAAqACAAKAAAACACQoACQdVFQVAEEQRVAlGAAkKQAAAAEAAAAUbAQMMDAMABhsBwDAwwAD/AAUbAQ0ABR0BDAYABhsBYDAABh4BsAD/AAUbAQ4MAAUeAQUABhsBoAAGHQEwcAD/AAUaAQMHEBwEAwAGGQGg4DA8DPDggAD/AAQiAQcIAAUYAcAwDwgYGAgMbeAABhgBBZe4CAwMCBjbAwAHGAHAAAchAcAgAP8ABBYCAgQDAgUPAQsDBAsDAAURAQMMM8zwMMAABRkB8AwPBwcPD20ggIAwgIwxCAIABhEB8AzzDAMDAAYYAQU3WPjw8Pj4WwMABiQBAwAGJgEIYwygAAcUAcDAMPAw8AEFPAwsIMDgIMDAAP8AAxkBAwMAAx4BAwADIQEDAAQQAQwMMAAEFAHAAAQWAgPDAwMCBQ8BCwODw8MABCYBgDAABCkBCAgABCwBAwAFEQEDDDPM8DDAwMAABSEBwICAMICMMQgCAAUtAcAsAAUwAgEABhEB8AzzDAMDAAYkAQMABiYBCGMMoAAGLgEH/AAHEAEMDAAHFAHAwDDw8PABBTwMLODg4CDAwAICDAwwMMAACBQBwAAIFgHAwAAIGQEwAAgcATAwAAgfATAwAP8AAxkBAwMAAx4BAwADIQEDAAQQAQwMMAAEFAHAAAQXAcAABCIBgMDAAAQmAYAwAAQpAQgIAAQsAQMABS0BwCwABTACAQAGLgEH/AAHEAEMDAAHJwECAgwMMDDAAAgUAcAACBYBwMAACBkBMAAIHAEwMAAIHwEwMAD/AAUcAQ8DAwAGGwHAwPAA/w==',
    78: 'ARALYykADgAVAB8AAAAZMAISMAL/BUwCFE4CCE4C/wFMAgGNAgGNAv8AARAGBoUAIKyrKggAAgIKyqIo8AYGYODQUDBw8PDw4NDQ0FBw8AYwAAEAAggrKqqqKouiqKqqKgoCAAEBBQUVFQYFVRUVFQUBBgoAAQMDBwcHDQ8NDw0ACgoAAAEDAQMBAwEBBgoAAQUVFRVVJaWlpSXFsawriuK4LouiqKqqKkpCBgRQUVBRUVBRUFRVFVUGBgBc/93/3wYF/93/3T8AoAoxoPz//93/3f/d/10/HA8FAwFUBg5VFcWwqCqK4rgui6KoqqoqClJUBfDczw9DEQRAUAYFAAICAt3/3f/d/93/3f/d/9z83f799/333f8Bw93/wAAPAP//3/8dQE1HTU9RU1QGBlXVNYUFhbGsK4riuC+KoKioogqKIsL8/9//Hf8AAAIooIoqIN133ffd99333f/QwgogDAgd////3//d/93//T8N/93/3fzRB9133f/d/90/QAYLVRXFsayrqgD/BgaqKsLc/93/AACgAAqqoADA8tBw0HDcdN13KautPx3//ff999133Xfdd99z33/PP99/3//f/93/3f/d/wAGD1UVxQH8BgaqqKEhxdH8BgQAqKoAAKqABgYADT89//3//fzcfNBAwEAGC8DFwczc/Nzx0cXFFQYTVVEUhKWFFRUGBlUGKgBAUAYZVQYEFQUAT01PTU9NTw0/Bi0ABh5AAAYIwAAABCMBAgAFIgHADyAKAAYjAQMAByEBDzLIIAD/AP8ABTABgGIhAwAFNQMCBAIBAQAGMQFAHg42fwAGNwEgIuJdDQAHMQGAMJDIoCAgISXW2AAIMgEEAAg1ARBAAP8AATwBwPD86zoK/g8DAAI9AcDAsLygJIAAAkUBAQQCCsiQAAJNAfpceHh8bGz4yEQkfOzMzBAgMAACYAGAoKAAA0ACAQMIKeAggAADSAIBAAQ/AXDsjAwMDAAERwGAAARTARAABFUBBAQEBQQFBQQFBAAFSQIBBAAFVwJQQFCliJ9cEAEABWECAQAGSAGAQIgkBBAABlMDAQECAAZXAQIIIsggwgwABl8BIKgK+AAHUwGAQKr/lYAAB10BgMgsCCKIAAhVAbD8VQAIXQECC4nNIIgACVkBBCy0kNBAAP8=',
  };
  // The ending's three pictures. They are not in the picture directory: module 4 reads each from
  // its own sectors and unpacks it into the map's buffer at $3400 (module-4 $CCE5), and these are
  // the bytes found there in VICE when the picture starts ($CCE2), up to the last byte the picture
  // code reads. Base Cochise and the figure of a Ranger killed in the blast are drawn in the
  // picture window; the hilltop covers columns 1 to 32, pixel rows 8 to 135, on the colours of
  // the title ($86 over matrix rows 1-16, columns 1-36), and module 4 has set its last column, header
  // byte 2, to $20 by then ($CCD7). cue: the channel switches ($5BFB-$5BFE) module 4 sets for
  // Base Cochise: channel 1 held still while the dome stands ($CA27), then channel 0 stopped and
  // channel 1 let run ($CA54). The game makes the change after a wait and the screen's shake; here
  // it falls after eight passes, when channel 0 has been through its seven entries once.
  const ENDING_BYTES = {
    e0: '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',
    e1: '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',
    e2: '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',
  };
  const ENDING = [
    { id: 'end-base', n: 'e0', part: 'module-4', name: 'The ending: Base Cochise', at: 0x3400, cue: { first: [1, 0, 1, 1], at: 8, then: [0, 1, 1, 1] } },
    { id: 'end-killed', n: 'e1', part: 'module-4', name: 'The ending: a Ranger killed in the blast', at: 0x3400 },
    { id: 'end-hilltop', n: 'e2', part: 'module-4', name: 'The ending: the hilltop', at: 0x3400, wide: 0x86 },
  ];
  const ENDING_SIZE = 0x1200;
  const PICTURES = [{ id: 'title', name: 'The title picture', part: 'startup', label: 'title_picture', at: 0x8A00 }]
    .concat(PORTRAITS.map(([n, at, who]) => ({
      id: 'p' + n, n, name: 'Portrait ' + n + (who ? ': ' + who : ''), who, at }))).concat(ENDING);
  const PORTRAIT_BUFFER = 0xCA00, PORTRAIT_BUFFER_HI = 0xE000;

  // An address in a listing image by its label, or the address it had when this page was made.
  function addressOf(img, label, at) {
    if (img && img.byName && img.byName.has(label)) return img.byName.get(label);
    return at;
  }

  // colour_picture_area ($836C, startup): matrix rows 1-16, columns 1-36 = the byte its LDA #
  // loads at $8375 ($86: %01 orange, %10 blue).
  function colourTitleArea(m, img) {
    const c = img[0x8375] === 0xA9 ? img[0x8376] : 0x86;
    for (let r = 1; r <= 16; r++) for (let x = 1; x <= 36; x++) m[MATRIX + 40 * r + x] = c;
  }

  // The logo, as startup_main prints it ($7FA7-$7FD7): the logo font ($CA00-$CBFF) swapped in
  // for the font's glyphs $20-$5F ($838B), then the glyph block at $83AD printed from column 33,
  // row 1 in colour $86 ($7FB7), $0D starting the next row at column 33. Each glyph is drawn by
  // draw_glyph ($2217, engine): its eight bytes copied into the bitmap cell, the cell's matrix
  // byte set to the colour.
  function printLogo(m, img, fontAt, blockAt) {
    const colour = img[0x7FB7] === 0xA9 ? img[0x7FB8] : 0x86;
    let col = 33, row = 1;
    for (let a = blockAt; a < blockAt + 0x100; a++) {
      const code = img[a];
      if (code === 0) break;
      if (code === 0x0D) { row++; col = 33; continue; }
      const g = fontAt + ((code - 0x20) & 0x7F) * 8, cell = BITMAP + 320 * row + 8 * col;
      for (let i = 0; i < 8; i++) m[cell + i] = img[g + i];
      m[MATRIX + 40 * row + col] = colour;
      col++;
    }
  }

  // The colour the engine clears the picture window with: picture_window_open ($12CF) loads it
  // with the LDA # at $12F3 into text_colour before window_clear (engine part); $26 in the
  // engine's listing, %01 red and %10 blue. engine: the engine's rebuilt listing image.
  function windowColour(engine) {
    if (!engine || engine.ram[0x12F3] !== 0xA9) throw new Error('engine $12F3 is not the LDA # of the window colour');
    return engine.ram[0x12F4];
  }

  // The picture window's colours as picture_window_open ($12CF) leaves them: matrix rows 2-12
  // (the portrait's pixel rows 16-99), columns 1-11, = the window colour.
  function colourWindow(m, colour) {
    for (let r = 2; r <= 12; r++) for (let x = 1; x <= 11; x++) m[MATRIX + 40 * r + x] = colour;
  }

  // A 64 KB machine image ready for start(): the picture in its buffer, the bitmap clear, the
  // colours set. listing is the title's part's rebuilt listing image (C64.load's ram and byName),
  // or a portrait's bytes in place ({ ram }, portraitImage), and engine the engine's, which a
  // portrait needs for its colours.
  function prepare(pic, listing, engine) {
    const img = listing.ram, m = new Uint8Array(0x10000);
    const at = addressOf(listing, pic.label, pic.at);
    if (pic.part === 'startup') {
      m.set(img.subarray(at, 0xA300), at);
      colourTitleArea(m, img);
      printLogo(m, img, addressOf(listing, 'logo_font', 0xCA00), addressOf(listing, 'logo_glyph_block', 0x83AD));
      return { m, base: at, show: { c0: 1, c1: 36, r0: 8, r1: 135 } };
    }
    if (pic.part === 'module-4') {
      m.set(img.subarray(at, at + ENDING_SIZE), at);
      if (pic.wide) { for (let r = 1; r <= 16; r++) for (let x = 1; x <= 36; x++) m[MATRIX + 40 * r + x] = pic.wide; }
      else colourWindow(m, windowColour(engine));
      return { m, base: at, show: null, size: ENDING_SIZE, cue: pic.cue || null };
    }
    // the buffer: $CA00-$CFFF, or $E000-$EFFF for bit 7 (set_unpack_limit $2687)
    m.set(img.subarray(at, at + (at === PORTRAIT_BUFFER_HI ? 0x1000 : 0x600)), at);
    colourWindow(m, windowColour(engine));
    return { m, base: at, show: null };
  }

  // The scripts of a picture as the engine would read them: entries of a delay and a frame
  // offset, up to the $FF (for the readout; the engine itself reads them only as it goes).
  function scripts(m, base) {
    const out = [];
    for (let x = 0; x < 4; x++) {
      const lo = m[base + 6 + 2 * x], hi = m[base + 7 + 2 * x];
      if (!(lo | hi)) { out.push(null); continue; }
      const start = (base + (hi << 8 | lo)) & 0xFFFF, entries = [];
      for (let a = start; m[a] !== 0xFF && entries.length < 256; a += 3) {
        entries.push({ at: a, delay: m[a], frame: (base + (m[a + 1] | m[a + 2] << 8)) & 0xFFFF });
      }
      out.push({ start, entries });
    }
    return out;
  }

  // ---- drawing ------------------------------------------------------------------------------
  // The colour of pixel pair p (0-3 from the left) of bitmap byte b in a cell whose matrix byte is mat.
  function pairColour(b, p, mat) {
    const v = b >> (6 - 2 * p) & 3;
    return v === 0 ? BACKGROUND : v === 1 ? mat >> 4 : v === 2 ? mat & 15 : COLOUR_RAM;
  }

  // The area's pixels as RGBA, s canvas pixels a hires pixel (a multicolour pixel is two wide).
  // mask: an optional 8000-byte array XORed onto the bitmap as it is drawn (the hidden channels).
  function render(m, area, s, rgb, mask, img) {
    const W = (area.c1 - area.c0 + 1) * 8 * s, H = (area.r1 - area.r0 + 1) * s;
    const d = img.data;
    for (let y = area.r0; y <= area.r1; y++) {
      for (let x = area.c0; x <= area.c1; x++) {
        const a = bitmapAddress(x, y), b = mask ? m[a] ^ mask[a - BITMAP] : m[a];
        const mat = m[MATRIX + 40 * (y >> 3) + x];
        for (let p = 0; p < 4; p++) {
          const c = rgb[pairColour(b, p, mat)];
          const px0 = ((x - area.c0) * 8 + p * 2) * s, py0 = (y - area.r0) * s;
          for (let dy = 0; dy < s; dy++) {
            let o = ((py0 + dy) * W + px0) * 4;
            for (let dx = 0; dx < 2 * s; dx++) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; o += 4; }
          }
        }
      }
    }
    return { W, H };
  }

  // ---- the widget ---------------------------------------------------------------------------
  // How often the channels move on the title, in passes a second. read_key ($2514) ticks the
  // animation once a call, and the title's waits call it 255 times a unit (wait_with_menu $8156,
  // poll_menu $8164). On the kit's Machine (kit/c64/machine.js), with the raster interrupt, a
  // pass comes every 134,560 cycles: 7.3 a second at the PAL clock (985,248 Hz). The Machine
  // takes no cycles for the video chip, and the machine is slower: in the emulator, while the
  // title's picture moved, the tick ran 3,508 to 3,553 times every 50 frames, 6.9 passes a second.
  const PASSES_PER_SECOND = 6.9;
  const CH_COLOURS = ['#ffd60a', '#32d74b', '#ff375f', '#64d2ff'];

  // ---- a GIF of a picture -------------------------------------------------------------------
  // GIF89a, written here: the C64's 16 colours (c64.js's palette) as the global table, LZW codes
  // of 5 to 12 bits, and after the first image only the rectangle that changed, left in place
  // for the next (disposal 1). It runs from the base frame to the first step from GIF_MIN_STEPS
  // on (about 15 seconds at PASSES_PER_SECOND) where the picture looks exactly as the base frame
  // drew it, so it loops without a jump; a picture that has not come back to it by
  // GIF_MAX_STEPS stops at GIF_MIN_STEPS and jumps back to the start. The switches of the page's
  // table do not reach it: it is the picture as the game shows it.
  const GIF_MIN_STEPS = 100, GIF_MAX_STEPS = 600;

  function lzw(px, minCode) {
    const out = [], clear = 1 << minCode, eoi = clear + 1;
    let cur = 0, nbits = 0, size = minCode + 1, next = eoi + 1, dict = new Map();
    const emit = c => { cur |= c << nbits; nbits += size; while (nbits >= 8) { out.push(cur & 255); cur >>>= 8; nbits -= 8; } };
    emit(clear);
    let prefix = px[0];
    for (let i = 1; i < px.length; i++) {
      const k = px[i], key = prefix * 4096 + k;
      if (dict.has(key)) { prefix = dict.get(key); continue; }
      emit(prefix);
      if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
      else { emit(clear); dict = new Map(); size = minCode + 1; next = eoi + 1; }
      prefix = k;
    }
    emit(prefix); emit(eoi);
    if (nbits) out.push(cur & 255);
    return out;
  }

  // frames: { x, y, w, h, px (palette indices), delay (hundredths of a second) }
  function gifFile(W, H, frames) {
    const b = [], s = t => { for (const c of t) b.push(c.charCodeAt(0)); }, w16 = v => b.push(v & 255, v >> 8);
    s('GIF89a'); w16(W); w16(H); b.push(0xF3, 0, 0);                    // a global table of 16
    for (const h of C64.PAL) b.push(...[1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
    b.push(0x21, 0xFF, 11); s('NETSCAPE2.0'); b.push(3, 1, 0, 0, 0);    // loop for ever
    for (const f of frames) {
      b.push(0x21, 0xF9, 4, 1 << 2, f.delay & 255, f.delay >> 8, 0, 0);
      b.push(0x2C); w16(f.x); w16(f.y); w16(f.w); w16(f.h); b.push(0, 4);
      const d = lzw(f.px, 4);
      for (let i = 0; i < d.length; i += 255) { const n = Math.min(255, d.length - i); b.push(n); for (let j = 0; j < n; j++) b.push(d[i + j]); }
      b.push(0);
    }
    b.push(0x3B);
    return Uint8Array.from(b);
  }

  // The area's pixels as palette indices, s pixels a hires pixel, as render() draws them.
  function indices(m, area, s) {
    const W = (area.c1 - area.c0 + 1) * 8 * s, H = (area.r1 - area.r0 + 1) * s, out = new Uint8Array(W * H);
    for (let y = area.r0; y <= area.r1; y++) for (let x = area.c0; x <= area.c1; x++) {
      const b = m[bitmapAddress(x, y)], mat = m[MATRIX + 40 * (y >> 3) + x];
      for (let p = 0; p < 4; p++) {
        const c = pairColour(b, p, mat);
        for (let dy = 0; dy < s; dy++) out.fill(c, ((y - area.r0) * s + dy) * W + ((x - area.c0) * 8 + p * 2) * s, ((y - area.r0) * s + dy) * W + ((x - area.c0) * 8 + p * 2 + 2) * s);
      }
    }
    return { W, H, px: out };
  }

  // The scale a picture is shown at: 2 for one 200 or more hires pixels wide, else 3.
  const scaleOf = area => (area.c1 - area.c0 + 1) * 8 >= 200 ? 2 : 3;

  // Returns { bytes, steps, seamless, W, H }.
  function gif(pic, listing, engine) {
    const p = prepare(pic, listing, engine), eng = new Engine(p.m);
    eng.cue = p.cue || null;
    eng.start(p.base);
    const area = p.show || { c0: eng.left, c1: eng.right, r0: eng.top, r1: eng.bottom }, s = scaleOf(area);
    const first = indices(p.m, area, s), W = first.W;
    const frames = [{ x: 0, y: 0, w: W, h: first.H, px: first.px, steps: 0 }];
    let prev = first.px, n = 0, seamless = false, atMin = null;
    for (;;) {
      eng.step(); n++;
      const cur = indices(p.m, area, s).px;
      frames[frames.length - 1].steps++;
      if (n >= GIF_MIN_STEPS && cur.every((v, j) => v === first.px[j])) { seamless = true; break; }  // the first image again
      if (n === GIF_MIN_STEPS) atMin = { length: frames.length, steps: frames[frames.length - 1].steps };
      if (n >= GIF_MAX_STEPS) { frames.length = atMin.length; frames[atMin.length - 1].steps = atMin.steps; n = GIF_MIN_STEPS; break; }
      let x0 = W, y0 = first.H, x1 = -1, y1 = -1;
      for (let j = 0; j < cur.length; j++) if (cur[j] !== prev[j]) {
        const x = j % W, y = j / W | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      prev = cur;
      if (x1 < 0) continue;
      const w = x1 - x0 + 1, h = y1 - y0 + 1, px = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) px.set(cur.subarray((y0 + y) * W + x0, (y0 + y) * W + x0 + w), y * w);
      frames.push({ x: x0, y: y0, w, h, px, steps: 0 });
    }
    // each frame lasts its steps at PASSES_PER_SECOND, rounded so that the times add up
    let t = 0, done = 0;
    for (const f of frames) { t += f.steps * 100 / PASSES_PER_SECOND; f.delay = Math.round(t) - done; done += f.delay; }
    return { bytes: gifFile(W, first.H, frames), steps: n, seamless, W, H: first.H };
  }

  // The base frame alone, drawn into a new canvas at scale s (for a row of small pictures).
  function still(pic, listing, engine, s) {
    const p = prepare(pic, listing, engine), eng = new Engine(p.m);
    eng.cue = p.cue || null;
    eng.start(p.base);
    const area = p.show || { c0: eng.left, c1: eng.right, r0: eng.top, r1: eng.bottom };
    const rgb = C64.PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
    const cv = document.createElement('canvas');
    cv.width = (area.c1 - area.c0 + 1) * 8 * s; cv.height = (area.r1 - area.r0 + 1) * s;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(cv.width, cv.height);
    render(p.m, area, s, rgb, null, img);
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  // The listings, each fetched once a page.
  const listingCache = new Map();
  function loadPart(base, part) {
    const url = base + 'parts/' + part + '/listing.json';
    if (!listingCache.has(url)) listingCache.set(url, C64.load(url).catch(e => { listingCache.delete(url); throw e; }));
    return listingCache.get(url);
  }

  // A portrait's bytes in a 64 KB image, at its buffer, made once a page.
  const imageCache = new Map();
  function portraitImage(pic) {
    if (!imageCache.has(pic.n)) {
      const b = atob((pic.part === 'module-4' ? ENDING_BYTES : PORTRAIT_BYTES)[pic.n]), ram = new Uint8Array(0x10000);
      for (let i = 0; i < b.length; i++) ram[pic.at + i] = b.charCodeAt(i);
      imageCache.set(pic.n, { ram });
    }
    return imageCache.get(pic.n);
  }

  // [listing, engine] for prepare(): the start-up's listing for the title; for a portrait its
  // bytes and the engine's listing, whose window colour it is drawn in.
  async function sources(base, pic) {
    if (pic.part === 'startup') return [await loadPart(base, 'startup'), null];
    return [portraitImage(pic), await loadPart(base, 'engine')];
  }

  // The widget in root, by the ids of its parts: the canvas wl-pic-cv and the select
  // wl-pic-select, and as the page has them wl-pic-prev/-next, -play, -step, -restart, -mark,
  // -clock, -rows (the channels' table), -note and -gif (Download GIF). opts.pictures: the list
  // to choose from (default every picture); opts.picture: the first one's id. Returns
  // { choose(id), setPictures(list, id) }.
  function mount(root, opts = {}) {
    const base = opts.base || '';
    const $ = id => root.querySelector('#' + id);
    const cv = $('wl-pic-cv'), sel = $('wl-pic-select'), rows = $('wl-pic-rows');
    const playB = $('wl-pic-play'), stepB = $('wl-pic-step'), restartB = $('wl-pic-restart');
    const markC = $('wl-pic-mark'), clock = $('wl-pic-clock'), note = $('wl-pic-note');
    const prevB = $('wl-pic-prev'), nextB = $('wl-pic-next'), gifB = $('wl-pic-gif');
    if (!globalThis.C64) { if (note) note.textContent = 'This widget needs the site\'s c64.js, which did not load.'; return null; }
    const rgb = C64.PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
    let list = opts.pictures || PICTURES;

    let cur = null;               // { pic, eng, m, area, s, layers, scr, hidden }
    let playing = true, acc = 0, lastT = 0, visible = true, token = 0;
    const ctx = cv.getContext('2d');

    function build(pic, L, E) {
      const p = prepare(pic, L, E);
      const eng = new Engine(p.m), layers = new Layers(eng);
      eng.cue = p.cue || null;
      const st = { pic, eng, m: p.m, layers, hidden: [false, false, false, false] };
      layers.record(eng.start(p.base));
      const area = p.show || { c0: eng.left, c1: eng.right, r0: eng.top, r1: eng.bottom };
      st.area = area;
      st.s = scaleOf(area);
      st.scr = scripts(p.m, p.base);
      if (note) note.textContent = '';
      return st;
    }

    // The picture from its base frame again. The counts start again too, and so does the
    // prescaler, which the game leaves running (start_picture does not set $B1).
    function restart() {
      const eng = cur.eng;
      eng.ticks = 0; eng.steps = 0; eng.pre = 0;
      cur.layers.reset();
      cur.layers.record(eng.start(eng.base));
      draw();
    }

    function draw() {
      const st = cur;
      if (!st) return;
      const { area, s } = st;
      const W = (area.c1 - area.c0 + 1) * 8 * s, H = (area.r1 - area.r0 + 1) * s;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; cv.style.width = W + 'px'; }
      const img = ctx.createImageData(W, H);
      render(st.m, area, s, rgb, st.layers.mask(st.hidden), img);
      ctx.putImageData(img, 0, 0);
      if (markC && markC.checked) {
        ctx.lineWidth = Math.max(1, s - 1);
        st.layers.last.forEach((cells0, ch) => {
          if (st.hidden[ch]) return;
          ctx.strokeStyle = CH_COLOURS[ch];
          const cells = new Set(cells0.map(a => { const o = a - BITMAP; return (o / 320 | 0) * 40 + ((o % 320) >> 3); }));
          for (const c of cells) {
            const row = c / 40 | 0, col = c % 40;
            const x = (col - area.c0) * 8 * s, y = (row * 8 - area.r0) * s;
            ctx.strokeRect(x + 0.5, y + 0.5, 8 * s - 1, 8 * s - 1);
          }
        });
      }
      readout();
    }

    // Per channel: the script entry it last read (its pointer less one entry), the passes its
    // delay still has to run ($DA+X), and the frame that entry named.
    function readout() {
      const st = cur, eng = st.eng, title = st.pic.part === 'startup';
      if (clock) clock.textContent = 'step ' + eng.steps.toLocaleString('en-GB') + ' · tick ' + eng.ticks.toLocaleString('en-GB');
      if (!rows) return;
      const where = a => title ? hex(a) : '+' + hex((a - eng.base) & 0xFFFF, 2);
      for (let ch = 0; ch < 4; ch++) {
        const tr = rows.children[ch], sc = st.scr[ch], cells = tr.children;
        const box = cells[0].querySelector('input');
        box.disabled = !sc; box.checked = !!sc && !st.hidden[ch];
        tr.classList.toggle('wl-pic-off', !sc);
        if (!sc) { cells[1].textContent = 'no script'; cells[2].textContent = ''; cells[3].textContent = ''; continue; }
        const k = Math.round((eng.ptr[ch] - sc.start) / 3);
        cells[1].textContent = '';
        if (k <= 0) cells[1].textContent = 'not started';
        else {
          cells[1].append(k + ' of ' + sc.entries.length + ' ');
          const s = document.createElement('span'); s.className = 'wl-pic-at'; s.textContent = where(eng.ptr[ch] - 3);
          cells[1].appendChild(s);
        }
        cells[2].textContent = String(eng.delay[ch]);
        const f = st.layers.frames[ch];
        cells[3].textContent = '';
        if (f < 0) cells[3].textContent = 'none yet';
        else if (title) {             // the title's bytes are in the start-up's listing; a portrait's only here
          const a = document.createElement('a');
          a.href = `${base}source-startup.html#${hex(f).slice(1)}`;
          a.textContent = hex(f);
          cells[3].appendChild(a);
        } else cells[3].textContent = where(f);
      }
    }

    function buildRows() {
      if (!rows) return;
      rows.textContent = '';
      for (let ch = 0; ch < 4; ch++) {
        const tr = document.createElement('tr');
        const td0 = document.createElement('td');
        const lab = document.createElement('label');
        const box = document.createElement('input');
        box.type = 'checkbox'; box.checked = true;
        box.setAttribute('aria-label', 'Show channel ' + ch + '\'s frames');
        box.addEventListener('change', () => { if (cur) { cur.hidden[ch] = !box.checked; draw(); } });
        const sw = document.createElement('span');
        sw.className = 'wl-pic-sw'; sw.style.background = CH_COLOURS[ch];
        lab.append(box, sw, document.createTextNode(' ' + ch));
        td0.appendChild(lab);
        tr.appendChild(td0);
        for (let i = 0; i < 3; i++) tr.appendChild(document.createElement('td'));
        rows.appendChild(tr);
      }
    }

    function arrows() {
      const i = list.findIndex(p => p.id === sel.value);
      if (prevB) prevB.classList.toggle('off', i <= 0);
      if (nextB) nextB.classList.toggle('off', i < 0 || i === list.length - 1);
    }

    async function choose(id) {
      const pic = list.find(p => p.id === id) || list[0];
      const my = ++token;
      if (!pic) { cur = null; cv.width = 0; return; }
      const part = pic.part === 'startup' ? 'startup' : 'engine';
      if (note) note.textContent = 'Loading the ' + part + ' listing…';
      let L, E;
      try { [L, E] = await sources(base, pic); } catch (e) {
        if (note && my === token) note.textContent = 'Could not load a listing (parts/' + part + '/listing.json): ' + e.message;
        return;
      }
      if (my !== token) return;
      try { cur = build(pic, L, E); } catch (e) {
        if (note) note.textContent = 'Could not draw ' + pic.name + ': ' + e.message;
        return;
      }
      sel.value = pic.id;
      arrows();
      if (opts.onChoose) opts.onChoose(pic);
      draw();
    }

    function fill() {
      sel.textContent = '';
      for (const p of list) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sel.appendChild(o); }
    }

    function setPictures(next, id) {
      list = next;
      fill();
      return choose(id || (list[0] && list[0].id));
    }

    function setPlaying(p) {
      playing = p;
      if (playB) playB.textContent = p ? 'Pause' : 'Play';
    }

    function frame(t) {
      requestAnimationFrame(frame);
      if (!lastT) lastT = t;
      const dt = Math.min(500, t - lastT); lastT = t;
      if (!playing || !visible || !cur) return;
      acc += dt * PASSES_PER_SECOND / 1000;
      let moved = false;
      while (acc >= 1) { acc--; cur.layers.record(cur.eng.step()); moved = true; }
      if (moved) draw();
    }

    // Download GIF: the picture from its base frame, made here and saved as a file.
    async function download() {
      if (!cur) return;
      const pic = cur.pic, label = gifB.textContent;
      gifB.disabled = true; gifB.textContent = 'Making the GIF…';
      try {
        await new Promise(r => setTimeout(r, 20));                     // let the button change first
        const [L, E] = await sources(base, pic);
        const g = gif(pic, L, E);
        const url = URL.createObjectURL(new Blob([g.bytes], { type: 'image/gif' }));
        const a = document.createElement('a');
        a.href = url; a.download = 'wasteland-' + (pic.part === 'startup' ? 'title' : pic.part === 'module-4' ? pic.id : 'portrait-' + pic.n) + '.gif';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (e) {
        if (note) note.textContent = 'Could not make the GIF: ' + e.message;
      }
      gifB.disabled = false; gifB.textContent = label;
    }

    buildRows();
    fill();
    sel.addEventListener('change', () => choose(sel.value));
    const by = d => () => { const i = list.findIndex(p => p.id === sel.value); if (list[i + d]) choose(list[i + d].id); };
    if (prevB) prevB.addEventListener('click', by(-1));
    if (nextB) nextB.addEventListener('click', by(1));
    if (playB) playB.addEventListener('click', () => setPlaying(!playing));
    if (stepB) stepB.addEventListener('click', () => { setPlaying(false); if (cur) { cur.layers.record(cur.eng.step()); draw(); } });
    if (restartB) restartB.addEventListener('click', () => { if (cur) restart(); });
    if (markC) markC.addEventListener('change', draw);
    if (gifB) gifB.addEventListener('click', download);
    if ('IntersectionObserver' in globalThis) {
      new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); }).observe(cv);
    }
    setPlaying(true);
    requestAnimationFrame(frame);
    if (list.length) choose(opts.picture || list[0].id);
    return { choose, setPictures };
  }

  return { Engine, Layers, bitmapAddress, prepare, scripts, colourTitleArea, printLogo, windowColour, colourWindow, render,
           gif, still, loadPart, portraitImage, sources, scaleOf, PICTURES, PORTRAITS, ENDING, PORTRAIT_BUFFER, PORTRAIT_BUFFER_HI, BITMAP, MATRIX,
           BACKGROUND, COLOUR_RAM, PASSES_PER_SECOND, GIF_MIN_STEPS, GIF_MAX_STEPS, mount };
})();
