'use strict';
// The life object's 6502 routines (MAP1, read into the heap at $8466 after the start object): the
// choices' experiences ($8DD0), the years and the money they move on ($91CD), finding a scene's
// block in the stage's file ($982A), the decoder that unpacks a scene from its LZW-packed block
// ($A457-$AA8F), the object's entry and exit ($B392, $B3B5) and the arithmetic its compiled C calls
// ($B408-$B55F). Each takes the arguments the p-code pushes, first first, and returns what the
// routine leaves in $0A/$0B. The routines work in zero page ($12-$1D) as the game's do, since the
// 32-bit arithmetic of the resident program ($6E9F-$6F4B) leaves its operands at $6E97, which the
// game keeps.
(function (root) {
  const AEPort = root.AEPort || (root.AEPort = {});
  const groups = AEPort.groups || (AEPort.groups = []);

  groups.push(function (P) {
    const M = P.M;
    const rd32 = a => (M[a] | M[a + 1] << 8 | M[a + 2] << 16 | M[a + 3] << 24) >>> 0;
    const wr32 = (a, v) => { M[a] = v & 255; M[a + 1] = (v >>> 8) & 255; M[a + 2] = (v >>> 16) & 255; M[a + 3] = (v >>> 24) & 255; };
    const sext = v => ((v & 0x8000) ? (v | 0xFFFF0000) : (v & 0xFFFF)) >>> 0;
    const s32 = v => v | 0;
    const zw = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
    const zr = a => M[a] | M[a + 1] << 8;
    // a signed 16-bit "a >= b" as the compiled C tests it (a - b, then the overflow flag and the
    // sign): a wrong answer only when the subtraction overflows, where it takes the sign as it is
    const ge16 = (a, b) => { const r = (a - b) & 0xFFFF; const v = ((a ^ b) & (a ^ r) & 0x8000) !== 0; return !v && !(r & 0x8000); };
    const gt0 = n => !ge16(0, n);                          // 0 - n negative (or overflowing): n > 0

    // ---- the arithmetic the life object's compiled C calls ($B408-$B55F). X and Y in the 6502
    // hold the zero-page addresses of their operands; each leaves its result over the operand
    // that Y named
    // $B408: [y] (32 bits) shifted right by the count at [x], copying the sign in; the count is
    // counted down to -1 in its place
    P.arithmetic_shift_i32_buffer_right_by_count_buffer = function (xz, yz) {
      let n = s32(rd32(xz)), v = s32(rd32(yz));
      for (;;) {
        n = (n - 1) | 0;
        if (n < 0) break;
        v >>= 1;
      }
      wr32(xz, n >>> 0); wr32(yz, v >>> 0);
      return null;
    };
    // $B43A: the word at [y] times the word in A (low) and X (high); the product's low word over
    // [y], its high word in $02-$03
    P.multiply_u16_buffer_by_ax_in_place = function (ax, yz) {
      const p = (zr(yz) * (ax & 0xFFFF)) >>> 0;
      zw(yz, p & 0xFFFF); M[0x02] = (p >>> 16) & 255; M[0x03] = (p >>> 24) & 255;
      M[0x24] = ax & 255; M[0x25] = (ax >> 8) & 255;
      return null;
    };
    // $B50C: the word at [y] shifted left by A + 256 X
    P.shift_u16_buffer_left_by_ax = function (ax, yz) {
      zw(yz, (ax & 0xFFFF) >= 16 ? 0 : (zr(yz) << (ax & 0xFFFF)) & 0xFFFF);
      return null;
    };
    // $B529: the word at [y] shifted right by A + 256 X, its sign copied in
    P.shift_i16_buffer_right_by_ax = function (ax, yz) {
      const v = zr(yz), n = ax & 0xFFFF;
      zw(yz, n >= 16 ? ((v & 0x8000) ? 0xFFFF : 0) : (P.s(v) >> n) & 0xFFFF);
      return null;
    };
    // $B54B: the same with 0s coming in
    P.shift_u16_buffer_right_by_ax = function (ax, yz) {
      const n = ax & 0xFFFF;
      zw(yz, n >= 16 ? 0 : zr(yz) >>> n);
      return null;
    };

    // ---- the entry and the exit
    // $B392: the object's entry, which call_vm_function_pointer reaches through the stub at $8466:
    // it keeps that call's frame pointer at $C29A and runs the life object's main procedure in
    // its place (runtime.js does both)
    // $B3B5: the way out from any depth, back through the frame kept at $C29A with the value on
    // the stack, as if call_vm_function_pointer had returned it
    P.gameplay_object_longjmp_exit = function (v) { throw new P.Exit(v); };

    // ---- a choice's experiences
    // $8DD0: choice idx's next experience: the choice's word at $81C5 says where its scenes are in
    // the stage's table (its low byte, the first) and its type; the 32 bits at $81D5 + 4 idx say
    // which are left (a type-6 choice's, less those the bits at $7FC0 say were had). The first
    // left is played; when it plays (its value is not -3) its block's length goes to out and it is
    // crossed off, then its value is the routine's. With none left, flag set gives -3; clear, the
    // panel says the choice has nothing more for now (or ever), out is 0 and the value $FE
    P.run_stage_choice_experience = function* (idx, out, flag) {
      const f = P.enterNative([idx, out, flag], 0, -16);
      try {
        const at = ((idx << 1) + 0x81C5) & 0xFFFF;
        let ep = (P.rb(at) + 1) & 0xFFFF;
        const maskAt = (0x81D5 + (idx << 2)) & 0xFFFF;
        let mask = (P.rb(maskAt) | P.rb(maskAt + 1) << 8 | P.rb(maskAt + 2) << 16 | P.rb(maskAt + 3) << 24) >>> 0;
        if ((P.rw(at) & 0x0F00) === 0x0600) mask = (mask - rd32ram(0x7FC0)) >>> 0;
        let bit = 1;
        while (s32(mask) >= s32(bit)) {
          if (mask & bit) {
            const rec = yield* P.locate_scene_block(ep);
            if (rec) {
              const r = yield* P.execute_scene_chunk_chain();
              if (r !== 0xFFFD) {
                P.ww(out, rec);
                if ((P.rw(at) & 0x0F00) === 0x0600) wr32ram(0x7FC0, (rd32ram(0x7FC0) + bit) >>> 0);
                else {
                  mask = (mask - bit) >>> 0;
                  P.wb(maskAt, mask); P.wb(maskAt + 1, mask >>> 8); P.wb(maskAt + 2, mask >>> 16); P.wb(maskAt + 3, mask >>> 24);
                }
                return r;
              }
            }
          }
          // the bit doubled with the resident program's 32-bit multiply, as the routine does
          wr32(0x1A, bit); wr32(0x16, 2);
          P.multiply_i32_low32(0x16, 0x1A);
          bit = rd32(0x1A);
          ep = (ep + 1) & 0xFFFF;
        }
        if (flag) return 0xFFFD;
        if (mask) yield* P.show_profile_and_acquisitions_menu(0, 0x9122, 0x913F, 0x915B);
        else yield* P.show_profile_and_acquisitions_menu(0, 0x9179, 0x9197, 0x91B5);
        P.ww(out, 0);
        return 0x00FE;
      } finally { P.leaveNative(f); }
    };
    const rd32ram = a => (P.rb(a) | P.rb(a + 1) << 8 | P.rb(a + 2) << 16 | P.rb(a + 3) << 24) >>> 0;
    const wr32ram = (a, v) => { P.wb(a, v); P.wb(a + 1, v >>> 8); P.wb(a + 2, v >>> 16); P.wb(a + 3, v >>> 24); };

    // $91CD: the years and the money a scene's block of the given length moves on. The block's
    // length times the stage's years per unit ($803F), rounded, in 1024ths of a year, goes on the
    // year's fraction ($7FC4); whole years carried go on the age ($7F74) and $7F8C. Cash
    // ($7F78 thousands and $7F76) and debt ($7F84, $7F82) are worked in whole units: cash below 0
    // goes onto the debt. A salary ($7F8A, while $7F58 is set) adds the years' pay, less a tax
    // from $7F52 and the stage ($8041); without one, the stages up to the sixth take a cost of
    // living (a fifth of the years' worth of cash). An acquisition waiting at $7F88 goes onto the
    // bits at $82AB
    P.advance_age_and_finances = function (n) {
      const f = P.enterNative([n], 0, -16);
      try {
        const asr = (v, by) => { wr32(0x1A, v >>> 0); wr32(0x16, by); P.arithmetic_shift_i32_buffer_right_by_count_buffer(0x16, 0x1A); return rd32(0x1A); };
        // the fraction of a year, in 1024ths
        wr32(0x1A, sext(P.rw(0x803F))); wr32(0x16, sext(n));
        P.multiply_i32_low32(0x16, 0x1A);
        wr32(0x16, (rd32(0x1A) + 0x200) >>> 0); wr32(0x1A, 10);
        P.arithmetic_shift_i32_buffer_right_by_count_buffer(0x1A, 0x16);
        let part = rd32(0x16);
        let years = ((P.rw(0x7FC4) + part) >>> 0) & 0x7FFF0000;
        years = asr(years, 16);
        P.ww(0x7F74, P.rw(0x7F74) + years);
        P.ww(0x7F8C, P.rw(0x7F8C) + years);
        P.ww(0x7FC4, P.rw(0x7FC4) + part);
        // cash and debt in units
        wr32(0x1A, sext(P.rw(0x7F76))); wr32(0x16, sext(P.rw(0x7F78))); wr32(0x12, 1000);
        P.multiply_i32_low32(0x12, 0x16);
        let cash = (rd32(0x1A) + rd32(0x16)) >>> 0;
        wr32(0x1A, sext(P.rw(0x7F82))); wr32(0x16, sext(P.rw(0x7F84))); wr32(0x12, 1000);
        P.multiply_i32_low32(0x12, 0x16);
        let debt = (rd32(0x1A) + rd32(0x16)) >>> 0;
        if (s32(cash) < 0) { debt = (debt - cash) >>> 0; cash = 0; }
        if (!P.rw(0x7F58)) P.ww(0x7F8A, 0);
        if (P.rw(0x7F8A)) {
          wr32(0x1A, sext(P.rw(0x7F8A))); wr32(0x16, part);
          P.multiply_i32_low32(0x1A, 0x16);
          part = rd32(0x16);
          zw(0x1A, 100 - P.rw(0x7F52)); P.shift_i16_buffer_right_by_ax(1, 0x1A);
          zw(0x16, 6 - P.rw(0x8041)); P.multiply_u16_buffer_by_ax_in_place(5, 0x16);
          const tax = sext((zr(0x1A) + zr(0x16)) & 0xFFFF);
          wr32(0x12, tax);
          wr32(0x1A, (100 - tax) >>> 0); wr32(0x16, part);
          P.multiply_i32_low32(0x1A, 0x16);
          part = rd32(0x16);
          wr32(0x1A, part); wr32(0x16, 10);
          P.multiply_i32_low32(0x16, 0x1A);
          part = rd32(0x1A);
          part = asr((part + 0x8000) >>> 0, 16) & 0xFFFF;
          cash = (cash + part) >>> 0;
        } else if (ge16(5, P.rw(0x8041))) {
          wr32(0x1A, part); wr32(0x16, cash);
          P.multiply_i32_low32(0x16, 0x1A);
          part = rd32(0x1A);
          wr32(0x1A, part); wr32(0x16, 5);
          P.divide_i32_quotient_nonzero_contract(0x16, 0x1A);
          part = rd32(0x1A);
          part = asr((part + 0x8000) >>> 0, 16) & 0xFFFF;
          cash = (cash - part) >>> 0;
        }
        const div = (v, op) => { wr32(0x1A, v); wr32(0x16, 1000); op(0x16, 0x1A); return zr(0x1A); };
        P.ww(0x7F78, div(cash, P.divide_i32_quotient_nonzero_contract));
        P.ww(0x7F76, div(cash, P.divide_i32_remainder_nonzero_contract));
        P.ww(0x7F84, div(debt, P.divide_i32_quotient_nonzero_contract));
        P.ww(0x7F82, div(debt, P.divide_i32_remainder_nonzero_contract));
        if (P.rw(0x7F88)) {
          zw(0x1A, 1);
          P.shift_u16_buffer_left_by_ax(P.rw(0x7F88), 0x1A);
          P.ww(0x82AB, P.rw(0x82AB) | zr(0x1A));
          P.ww(0x7F88, 0);
        }
        return null;
      } finally { P.leaveNative(f); }
    };

    // $982A: block n (1-) of the stage's scene table at $82FB, a word of its length each: its
    // place in the file (the table's start at $82F7 and the lengths before it) to $CC65, its
    // header read (load_scene_block_header). Its length, or 0 for none (n 0 or 255, a block of no
    // length, or the header not read)
    P.locate_scene_block = function* (n) {
      const f = P.enterNative([n], 4, -30);
      try {
        zw(0x30, n);
        if (!(n & 0xFFFF) || (n & 0xFFFF) === 0xFF) return 0;
        for (let i = 0; i < 4; i++) P.wb(0xCC65 + i, P.rb(0x82F7 + i));
        let p = 0x82FB;
        zw(0x32, p);
        for (;;) {
          n = (n - 1) & 0xFFFF; zw(0x30, n);
          if (!gt0(n)) break;
          wr32ram(0xCC65, (rd32ram(0xCC65) + sext(P.rw(p))) >>> 0);
          p = (p + 2) & 0xFFFF; zw(0x32, p);
        }
        if (!P.rw(p)) return 0;
        if ((yield* P.load_scene_block_header()) === 0xFFFF) return 0;
        return P.rw(p);
      } finally { P.leaveNative(f); }
    };

    // ---- the scene decoder. A scene's block is LZW-packed: codes of 9 bits growing to 10 (the
    // width at $B569 and the code past which it grows at $B56B), each phrase a code for an
    // earlier phrase ($B57B, a word each) and its last byte ($BD7B), spelled backwards onto a
    // stack of 200 bytes ($C17B, its top at $C246). The codes are read n_bits bytes at a time from
    // the stream into $B56D, high bit first
    const PREFIX = 0xB57B, SUFFIX = 0xBD7B, STACK = 0xC17B;
    const W = { bits: 0xB569, grow: 0xB56B, buf: 0xB56D, pos: 0xB577, lim: 0xB579, free: 0xC243, ready: 0xC245,
      top: 0xC246, code: 0xC248, old: 0xC24A, inc: 0xC24C, fin: 0xC24E, masks: 0xC250 };

    // $A457 and $A45D: the tables cleared, each single byte its own phrase, the next code 256
    P.enter_inline_native_a45d_save2 = function () {
      const f = P.enterNative([], 2, 0);
      try { return P.initialize_grouped_lzw_decoder(); } finally { P.leaveNative(f); }
    };
    P.initialize_grouped_lzw_decoder = function () {
      P.ww(W.pos, 0);
      P.wb(W.ready, 1);
      P.ww(W.grow, 0x0100);
      P.ww(W.bits, 9);
      P.fill_memory_range(PREFIX, 0x800, 0);
      P.fill_memory_range(SUFFIX, 0x400, 0);
      for (P.ww(W.free, 0); !ge16(P.rw(W.free), 0x100); P.ww(W.free, P.rw(W.free) + 1)) P.wb(SUFFIX + P.rw(W.free), P.rw(W.free));
      return null;
    };
    // $A4DB and $A4E1: the decoder made to start again at its next call
    P.enter_inline_native_a4e1_adjust_0 = function () {
      const f = P.enterNative([], 0, 0);
      try { return P.reset_grouped_lzw_block_cursor(); } finally { P.leaveNative(f); }
    };
    P.reset_grouped_lzw_block_cursor = function () {
      P.ww(W.pos, 0); P.ww(W.lim, 0); P.wb(W.ready, 0);
      return null;
    };
    // $A4F1 and $A4F7: from the stream, the bytes skip to skip + count of what it unpacks to (the
    // first call after a reset starting from the block's first byte, a later one going on from
    // where the last stopped) written to dst. 0, or how many were still wanted when the stream
    // ran out
    P.enter_inline_native_a4f7_adjust_0 = function (stream, dst, skip, count) {
      const f = P.enterNative([stream, dst, skip, count], 0, 0);
      try { return P.decompress_grouped_lzw_slice(stream, dst, skip, count); } finally { P.leaveNative(f); }
    };
    P.decompress_grouped_lzw_slice = function (stream, dst, skip, count) {
      if (!(skip & 0xFFFF) && !(count & 0xFFFF)) return 0;
      const left = () => (skip + count) & 0xFFFF;
      const pushStack = b => { P.ww(W.top, P.rw(W.top) - 1); P.wb(STACK + P.rw(W.top), b); };
      let flush = !!P.rb(W.ready);
      if (!flush) {
        P.enter_inline_native_a45d_save2();
        P.ww(W.top, 200);
        const c = P.enter_inline_native_a850_save2(stream);
        P.ww(W.old, c); P.ww(W.fin, c);
        if (P.rw(W.fin) === 0xFFFF) return left();
        if (gt0(skip)) skip = (skip - 1) & 0xFFFF;
        else if (gt0(count)) {
          count = (count - 1) & 0xFFFF;
          P.wb(dst, P.rw(W.fin)); dst = (dst + 1) & 0xFFFF;
        }
      }
      for (;;) {
        if (!flush) {
          P.ww(W.code, P.enter_inline_native_a850_save2(stream));
          if (P.rw(W.code) === 0xFFFF) return left();
          P.ww(W.inc, P.rw(W.code));
          if (P.s(P.rw(W.code)) >= P.s(P.rw(W.free))) {
            pushStack(P.rw(W.fin));
            P.ww(W.code, P.rw(W.old));
          }
          while (P.rw(W.code) & 0xFF00) {
            pushStack(P.rb(SUFFIX + P.rw(W.code)));
            P.ww(W.code, P.rw(PREFIX + (P.rw(W.code) << 1)));
          }
          P.ww(W.top, P.rw(W.top) - 1);
          P.ww(W.fin, P.rb(SUFFIX + P.rw(W.code)));
          P.wb(STACK + P.rw(W.top), P.rw(W.fin));
        }
        flush = false;
        // what is on the stack: first the bytes to skip, then the ones wanted
        while (gt0(skip) && !ge16(P.rw(W.top), 200)) { skip = (skip - 1) & 0xFFFF; P.ww(W.top, P.rw(W.top) + 1); }
        while (gt0(count) && !ge16(P.rw(W.top), 200)) {
          const t = P.rw(W.top);
          P.ww(W.top, t + 1);
          P.wb(dst, P.rb(STACK + t)); dst = (dst + 1) & 0xFFFF;
          count = (count - 1) & 0xFFFF;
        }
        if (!left()) return 0;
        // a new phrase: the last one and this one's first byte
        P.ww(W.code, P.rw(W.free));
        if (!ge16(P.rw(W.code), 0x400)) {
          P.ww(PREFIX + (P.rw(W.code) << 1), P.rw(W.old));
          P.wb(SUFFIX + P.rw(W.code), P.rw(W.fin));
          P.ww(W.free, P.rw(W.code) + 1);
        }
        P.ww(W.old, P.rw(W.inc));
      }
    };
    // $A84A and $A850: the next code, the group of n_bits bytes read first when the last is used
    // up or the width grows; -1 when the stream has no more
    P.enter_inline_native_a850_save2 = function (stream) {
      const f = P.enterNative([stream], 2, 0);
      try { return P.FetchGroupedLzwCodeBody(stream); } finally { P.leaveNative(f); }
    };
    P.FetchGroupedLzwCodeBody = function () {
      const pos = P.rw(W.pos), lim = P.rw(W.lim);
      const grows = () => P.s(P.rw(W.grow)) < P.s(P.rw(W.free));   // the next code past the width
      if (P.s(pos) < P.s(lim) && !grows()) return readCode();
      if (grows()) {
        P.ww(W.bits, P.rw(W.bits) + 1);
        if (P.rw(W.bits) === 10) P.ww(W.grow, 0x400);
        else {
          zw(0x1A, 1);
          P.shift_u16_buffer_left_by_ax(P.rw(W.bits), 0x1A);
          P.ww(W.grow, zr(0x1A) - 1);
        }
      }
      P.ww(W.lim, P.enter_inline_native_5ce6_save4_adjust_minus2(W.buf, P.rw(W.bits)));
      if (ge16(0, P.rw(W.lim))) return 0xFFFF;
      P.ww(W.pos, 0);
      // the group's bits, less the last code's worth that would run past its end
      zw(0x1A, P.rw(W.lim));
      P.shift_u16_buffer_left_by_ax(3, 0x1A);
      P.ww(W.lim, zr(0x1A) - (P.rw(W.bits) - 1));
      return readCode();
    };
    function readCode() {
      const c = P.enter_inline_native_a974_save10();
      zw(0x30, c);
      P.ww(W.pos, P.rw(W.pos) + P.rw(W.bits));
      return c;
    }
    // $A96E and $A974: the code at the group's bit position: n_bits bits, the first byte's
    // highest first, masked with $C250's word for the width
    P.enter_inline_native_a974_save10 = function () {
      const f = P.enterNative([], 10, 0);
      try { return P.ReadGroupedLzwCodeBody(); } finally { P.leaveNative(f); }
    };
    P.ReadGroupedLzwCodeBody = function () {
      const pos = P.rw(W.pos), bits = P.rw(W.bits);
      zw(0x30, pos); zw(0x32, bits);
      zw(0x1A, pos); P.shift_i16_buffer_right_by_ax(3, 0x1A);
      let at = zr(0x1A);
      zw(0x36, at);
      zw(0x30, pos & 7);
      let k = (bits + (pos & 7)) & 0xFFFF;
      let code = 0;
      zw(0x38, 0);
      for (;;) {
        k = (k - 8) & 0xFFFF; zw(0x34, k);
        if (gt0(k)) {
          zw(0x1A, P.rb(W.buf + at)); at = (at + 1) & 0xFFFF; zw(0x36, at);
          P.shift_u16_buffer_left_by_ax(k, 0x1A);
          code |= zr(0x1A); zw(0x38, code);
          continue;
        }
        zw(0x12, P.rb(W.buf + at)); at = (at + 1) & 0xFFFF; zw(0x36, at);
        P.shift_i16_buffer_right_by_ax((0 - k) & 0xFFFF, 0x12);
        code |= zr(0x12); zw(0x38, code);
        break;
      }
      code &= P.rw(W.masks + (bits << 1));
      zw(0x38, code);
      return code & 0xFFFF;
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
