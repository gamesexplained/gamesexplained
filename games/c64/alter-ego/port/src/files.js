'use strict';
// The C library's files ($5F44-$6B4F, $6C0B-$6E32) and the game's saves built on them ($4D05-
// $511C). Ten file slots of seven bytes from $7FD3: the mode ($FF free, 0 read, 1 write), the
// secondary address, the device (or the console binding's number), the type ('P', 'S', 'L', or 0
// for a binding), a relative file's record number (two bytes) and the place in its record. A name
// is a CBM file spec, "0:NAME,type"; one that matches a binding in the table at $6B75 ("KB:", the
// console) goes to that binding's handlers instead of the drive. The status of the last call is
// kept at $8043: the stage that failed in its high byte (1 opening, 2 the KERNAL's status, 3 the
// drive's) and the code in its low byte.
(function (root) {
  const AEPort = root.AEPort || (root.AEPort = {});
  const groups = AEPort.groups || (AEPort.groups = []);

  groups.push(function (P) {
    const M = P.M;
    const STATUS = 0x8043, READST = 0x8019, SLOTS = 0x7FD3;
    const status = () => P.ramw(STATUS);
    const setStatus = v => P.ww(STATUS, v);
    const b = a => P.rb(a & 0xFFFF);
    const setb = (a, v) => P.wb(a & 0xFFFF, v);

    // ---- the KERNAL wrappers ($6D9A-$6E32): the arguments from the p-code's stack into the
    // registers; most leave the KERNAL's error (carry set) or 0 as their value, and READST's byte
    // at $8019
    const result = r => { P.wb(READST, P.kernal('READST').a); return r & 255; };
    const withCarry = r => result(r.c ? r.a : 0);
    P.kernal_untlk_tail_wrapper = () => { P.kernal('UNTLK'); return null; };
    P.kernal_talk_tail_wrapper = a => { P.kernal('TALK', { a }); return null; };
    P.kernal_tksa_tail_wrapper = a => { P.kernal('TKSA', { a }); return null; };
    P.kernal_acptr_tail_wrapper = () => { P.kernal('ACPTR'); return null; };
    P.kernal_unlsn_tail_wrapper = () => { P.kernal('UNLSN'); return null; };
    P.kernal_second_tail_wrapper = a => { P.kernal('SECOND', { a }); return null; };
    P.kernal_listen_tail_wrapper = a => { P.kernal('LISTEN', { a }); return null; };
    P.kernal_ciout_tail_wrapper = a => { P.kernal('CIOUT', { a }); return null; };
    P.kernal_setlfs_wrapper = function (la, dev, sa) {
      P.zp(0x0E, la);
      P.kernal('SETLFS', { a: la & 255, x: dev & 255, y: sa & 255 });
      return null;
    };
    // $6DC7: the name's length counted up to its 0, the pointer kept at $24
    P.kernal_setnam_wrapper = function (name) {
      P.zp(0x24, name); P.zp(0x25, name >> 8);
      let n = 0;
      while (P.rb((name + n) & 0xFFFF)) n = (n + 1) & 255;
      P.kernal('SETNAM', { a: n, x: name & 255, y: (name >> 8) & 255 });
      return null;
    };
    P.kernal_open_wrapper = () => withCarry(P.kernal('OPEN'));
    P.kernal_clrchn_wrapper = () => { P.kernal('CLRCHN'); return null; };
    P.kernal_chkin_wrapper = la => withCarry(P.kernal('CHKIN', { x: la & 255 }));
    P.kernal_chrin_wrapper = () => result(P.kernal('CHRIN').a);
    // $6DFA: GETIN, the call every wait for a key goes through: a checkpoint, and the pass the
    // lockstep and the page take input at
    // and the p-code's registers stand as the game's do there: its stack pointer (temps words
    // under the port's, the caller's pending pushes) and its frame pointer
    P.kernal_getin_wrapper = function* (temps = 0) {
      P.setw(0x04, P.sp - 2 * temps); P.setw(0x06, P.fp);
      yield { cp: 0x6DFA, cycles: P.due() };
      return result(P.kernal('GETIN').a);
    };
    P.kernal_chkout_wrapper = la => withCarry(P.kernal('CHKOUT', { x: la & 255 }));
    P.kernal_chrout_wrapper = c => withCarry(P.kernal('CHROUT', { a: c & 255 }));
    P.kernal_clall_wrapper = () => { P.kernal('CLALL'); return null; };
    P.kernal_close_wrapper = la => withCarry(P.kernal('CLOSE', { a: la & 255 }));
    P.kernal_status_to_vm_primary = (a, carry) => result(carry ? a : 0);
    P.kernal_result_zero_and_capture_status = a => result(a);

    // ---- the console's binding ("KB:", $6B75): a 16-byte record of a name and four handlers,
    // for open, write, read and close (0 where it has none)
    // $687D: the binding's handler for op called with the two arguments after op, on the p-code's
    // stack where they lie. Opening for writing needs a write handler, for reading a read
    // handler (-1 without); no handler gives 0
    P.dispatch_record_callback = function* (n, op, a, c) {
      const rec = (((n - 1) & 255) * 16 + 0x6B75) & 0xFFFF;
      const word = o => P.rb(rec + o) | P.rb(rec + o + 1) << 8;
      if ((op & 255) === 0) {
        if ((a & 255) && !word(8)) return 0xFFFF;
        if (!(a & 1) && !word(10)) return 0xFFFF;
      }
      const h = word(((op & 255) << 1) + 6);
      if (!h) return 0;
      return yield* P.jump_record_callback(h, a, c);
    };
    // $68F5: the jump through $10
    P.jump_record_callback = function* (h, a, c) {
      P.zp(0x10, h); P.zp(0x11, h >> 8);
      return yield* P.callAt(h, [a, c]);
    };

    // $6C0B: the console's read: n keys from the keyboard into buf, each shown as typed after a
    // cursor (CHROUT $E0, then left, space, left), the letters made ASCII and a few graphics keys
    // the C library's brackets; RETURN gives 10
    P.keyboard_binding_handler_6c0b = function* (buf, n) {
      const f = P.enter([buf, n], 4);
      try {
        let left = n;
        P.kernal_clrchn_wrapper();
        for (;;) {
          left = (left - 1) & 0xFFFF;
          if (!((left + 1) & 0xFFFF)) return n;
          P.kernal_chrout_wrapper(224);
          let c;
          do { c = yield* P.kernal_getin_wrapper(); } while (!c);
          P.kernal_chrout_wrapper(157); P.kernal_chrout_wrapper(32); P.kernal_chrout_wrapper(157);
          if (c >= 65 && c <= 90) c += 32;
          else if (c >= 193 && c <= 218) c -= 128;
          else c = { 27: 123, 29: 125, 31: 96, 34: 223, 92: 92, 129: 124, 144: 124, 222: 126 }[c] || c;
          P.kernal_chrout_wrapper(c);
          if (c === 13) c = 10;
          if (c === 223) c = 34;
          P.wb(buf, c); buf = (buf + 1) & 0xFFFF;
        }
      } finally { P.leave(f); }
    };
    // $6CF0: the console's write: n bytes of buf to the screen, 10 as RETURN, 8 as cursor left,
    // 9 as two cursor rights, 7 a beep
    P.keyboard_binding_handler_6cf0 = function* (buf, n) {
      const f = P.enter([buf, n], 4);
      try {
        let left = n;
        P.kernal_clrchn_wrapper();
        for (;;) {
          left = (left - 1) & 0xFFFF;
          if (!((left + 1) & 0xFFFF)) return n;
          let c = P.rb(buf); buf = (buf + 1) & 0xFFFF;
          if (c === 7) P.initialize_sid_feedback_tone();
          else if (c === 8) c = 157;
          else if (c === 9) { c = 29; P.kernal_chrout_wrapper(c); P.kernal_chrout_wrapper(c); }
          else if (c === 10) c = 13;
          P.kernal_chrout_wrapper(c);
        }
      } finally { P.leave(f); }
    };
    // $6D59: the SID cleared from $D418 down, then voice 1 set for a short beep
    P.initialize_sid_feedback_tone = function () {
      const f = P.enter([], 2);
      try {
        for (let a = 0xD418; a >= 0xD400; a--) P.wb(a, 0);
        P.wb(0xD401, 84); P.wb(0xD405, 55); P.wb(0xD406, 12); P.wb(0xD418, 15); P.wb(0xD404, 17);
        return 17;
      } finally { P.leave(f); }
    };

    // ---- file names
    // $6A20: a CBM file spec parsed: the drive and name into $801A as "0:NAME" (upper case),
    // then ",type" ($8038, P by default), ",D" a device ($7FD1, 8 by default) and ",C" a channel
    // ($7FCA, $FF for none); $8039 the drive's number. 0, or -1 (status 9) for anything else
    P.parse_cbm_file_spec = function (spec) {
      const f = P.enter([spec], 2);
      try {
        setStatus(0);
        P.wb(0x8038, 80);
        P.wb(0x7FCA, 255);
        if (!b(spec)) return 0xFFFF;
        P.ww(0x8039, 0);
        P.ww(0x7FD1, 8);
        let d = 0x801A;
        if (b(spec + 1) === 58) {
          setb(d++, b(spec)); spec++;
          setb(d++, b(spec)); spec++;
        } else { setb(d++, 48); setb(d++, 58); }
        while (b(spec) && b(spec) !== 44) { const c = P.ascii_to_upper(b(spec)); spec++; setb(d++, c); }
        setb(d, 0);
        while (b(spec) === 44) {
          spec++;
          const c = P.ascii_to_upper(b(spec));
          if (c === 67) {
            P.wb(0x7FCA, 0);
            for (;;) {
              spec++;
              if (!P.ascii_is_digit(b(spec))) break;
              P.wb(0x7FCA, P.rb(0x7FCA) * 10 + b(spec) - 48);
            }
          } else if (c === 68) {
            P.ww(0x7FD1, 0);
            for (;;) {
              spec++;
              if (!P.ascii_is_digit(b(spec))) break;
              P.ww(0x7FD1, b(spec) + P.ramw(0x7FD1) * 10 - 48);
            }
          } else if (c === 76 || c === 80 || c === 83 || c === 85) {
            spec++;
            P.wb(0x8038, P.ascii_to_upper(b(spec - 1)));
          } else { setStatus(9); return 0xFFFF; }
        }
        if (b(spec)) { setStatus(9); return 0xFFFF; }
        P.ww(0x8039, P.rb(0x801A) - 48);
        return 0;
      } finally { P.leave(f); }
    };
    // $6B4F: binding n (1-), 0 when its name is not the spec's, n when it is, -1 past the table
    P.find_keyboard_binding_record = function (n) {
      const f = P.enter([n], 2);
      try {
        const rec = ((((n - 1) & 0xFFFF) << 4) + 0x6B75) & 0xFFFF;
        if (!b(rec)) return 0xFFFF;
        return P.compare_zero_terminated_strings(0x801C, rec) ? 0 : n;
      } finally { P.leave(f); }
    };
    // $6977: the spec parsed into slot record rec: a binding's number, or the device, the
    // channel and the type, with ",type" (and ",\xFE" for a relative file) added to the name
    P.parse_file_spec_and_allocate_slot = function (spec, rec) {
      const f = P.enter([spec, rec], 6);
      try {
        if (P.s(P.parse_cbm_file_spec(spec)) < 0 || !P.rb(0x801C)) return 0xFFFF;
        for (let n = 1; n <= 10; n++) {
          const r = P.find_keyboard_binding_record(n);
          if (r) {
            if (r === 0xFFFF) break;
            setb(rec + 3, 0); setb(rec + 2, n);
            return n;
          }
        }
        let d = (P.measure_zero_terminated_string(0x801A) + 0x801A) & 0xFFFF;
        setb(d++, 44);
        setb(d++, P.rb(0x8038));
        if (P.rb(0x8038) === 76) { setb(d++, 44); setb(d++, 254); }
        setb(d++, 0);
        setb(rec + 3, P.rb(0x8038));
        setb(rec + 2, P.ramw(0x7FD1));
        setb(rec + 1, P.rb(0x7FCA));
        return P.ramw(0x7FD1);
      } finally { P.leave(f); }
    };

    // ---- the slots
    // $66DB: a free slot opened on spec for mode (0 read, 1 write, 2 the console's): OPEN with
    // logical file slot + 1 and secondary address slot + 2 unless the spec gave one, and the
    // drive's status read. The slot, or -1
    P.open_file_slot = function* (spec, mode) {
      const f = P.enter([spec, mode], 6);
      try {
        setStatus(0);
        let rec = SLOTS;
        for (; rec < 0x8019; rec += 7) if (b(rec) === 255) break;
        if (rec >= 0x8019) { setStatus(10); return 0xFFFF; }
        const slot = ((rec - SLOTS) / 7) | 0;
        if (P.s(P.parse_file_spec_and_allocate_slot(spec, rec)) < 0) return 0xFFFF;
        const dev = b(rec + 2);
        if (!b(rec + 3)) {
          if (P.s(yield* P.dispatch_record_callback(dev, 0, mode)) < 0) return 0xFFFF;
          setb(rec, mode);
          return slot;
        }
        if (b(rec + 1) === 255) setb(rec + 1, slot + 2);
        if (mode === 1) P.append_zero_terminated_string(0x801A, 0x67DF);
        P.kernal_setlfs_wrapper(slot + 1, dev, b(rec + 1));
        P.kernal_setnam_wrapper(0x801A);
        setStatus(P.kernal_open_wrapper());
        if (status()) { setStatus(status() | 256); return 0xFFFF; }
        if (P.rb(READST)) { setStatus(P.rb(READST) + 512); return 0xFFFF; }
        setStatus(P.enter_inline_native_67e8_adjust_minus2(dev));
        if (status()) {
          P.kernal_clrchn_wrapper();
          P.kernal_close_wrapper(slot + 1);
          setStatus(status() | 768);
          return 0xFFFF;
        }
        setb(rec + 6, 2); setb(rec + 4, 1); setb(rec + 5, 0); setb(rec, mode);
        return slot;
      } finally { P.leave(f); }
    };
    // $6691: the slot closed and freed; 0, or -1 for a slot not open
    P.close_file_slot = function* (slot) {
      const f = P.enter([slot], 2);
      try {
        if (P.s(slot) < 0 || P.s(slot) >= 10) return 0xFFFF;
        const rec = (slot * 7 + SLOTS) & 0xFFFF;
        if (b(rec) === 255) return 0xFFFF;
        if (!b(rec + 3)) yield* P.dispatch_record_callback(b(rec + 2), 3);
        else { P.kernal_clrchn_wrapper(); P.kernal_close_wrapper(slot + 1); }
        setb(rec, 255);
        return 0;
      } finally { P.leave(f); }
    };
    // $6605: every open slot closed, the cleanup the runtime runs at its end
    P.close_all_open_file_slots = function* () {
      const f = P.enter([], 2);
      try {
        let r = 0;
        for (let i = 0; i < 10; i++) if (b(i * 7 + SLOTS) !== 255) r = yield* P.close_file_slot(i);
        return r;
      } finally { P.leave(f); }
    };

    // $6489: a relative file's place sent to the drive: "P", the channel, the record and the
    // place in it, twice, and the drive's status read
    P.send_file_control_record = function (rec) {
      const f = P.enter([rec], 5);
      try {
        const buf = (P.fp - 5) & 0xFFFF;
        P.wb(buf, 80); P.wb(buf + 1, b(rec + 1)); P.wb(buf + 2, b(rec + 4)); P.wb(buf + 3, b(rec + 5)); P.wb(buf + 4, b(rec + 6));
        P.serial_send_buffer_with_cr(b(rec + 2), buf, 5);
        P.serial_send_buffer_with_cr(b(rec + 2), buf, 5);
        setStatus(P.enter_inline_native_67e8_adjust_minus2(b(rec + 2)));
        if (status()) { setStatus(status() | 768); return 0xFFFF; }
        P.kernal_clrchn_wrapper();
        return 0;
      } finally { P.leave(f); }
    };

    // $607C: n bytes from the slot's file into buf, a GETIN each; a relative file's records
    // stepped through. n, the bytes read when the file ended, or -1
    P.read_exact_file_bytes = function* (slot, buf, n) {
      const f = P.enter([slot, buf, n], 5);
      try {
        let rel = 0;
        setStatus(0);
        const rec = (slot * 7 + SLOTS) & 0xFFFF;
        if (P.s(slot) < 0 || P.s(slot) > 10 || b(rec) === 255) { setStatus(13); return 0xFFFF; }
        if (b(rec) === 1) { setStatus(14); return 0xFFFF; }
        if (!b(rec + 3)) return yield* P.dispatch_record_callback(b(rec + 2), 2, buf, n);
        P.kernal_clrchn_wrapper();
        setStatus(P.kernal_chkin_wrapper(slot + 1));
        if (status()) { setStatus(status() | 256); return 0xFFFF; }
        setStatus(P.rb(READST));
        if (status()) { setStatus(status() | 512); return 0xFFFF; }
        if (b(rec + 3) === 76) rel = 1;
        let left = n;
        for (;;) {
          left = (left - 1) & 0xFFFF;
          if (!((left + 1) & 0xFFFF)) break;
          if (rel) {
            if (P.s(P.send_file_control_record(rec)) < 0) {
              if (b(rec + 6) === 2 && status() === 818) return (n - left - 1) & 0xFFFF;
              return 0xFFFF;
            }
            P.kernal_clrchn_wrapper();
            setStatus(P.kernal_chkin_wrapper(slot + 1));
            if (status()) { setStatus(status() | 256); return 0xFFFF; }
            rel = 0;
          }
          buf = (buf + 1) & 0xFFFF;
          P.wb(buf - 1, yield* P.kernal_getin_wrapper(1));
          if (b(rec + 3) === 76) {
            const at = b(rec + 6) + 1;
            setb(rec + 6, at);
            if (at > 253) {
              setb(rec + 6, 2);
              setb(rec + 4, b(rec + 4) + 1);
              if (!b(rec + 4)) setb(rec + 5, b(rec + 5) + 1);
              if (P.rb(READST) & 64) P.wb(READST, 0);
              rel = (rel + 1) & 255;
            }
          }
          if (P.rb(READST) === 64) return (n - left) & 0xFFFF;
          if (P.rb(READST) & 64) return 0;
          setStatus(P.rb(READST));
          if (status()) { setStatus(status() | 512); return 0xFFFF; }
        }
        setStatus(P.enter_inline_native_67e8_adjust_minus2(b(rec + 2)));
        if (status()) { setStatus(status() | 768); return 0xFFFF; }
        return n;
      } finally { P.leave(f); }
    };

    // $6209: n bytes from buf to the slot's file, a CHROUT each; a relative file's records
    // written whole, a part one read back first and merged. n, or -1
    P.write_exact_file_bytes = function* (slot, buf, n) {
      const f = P.enter([slot, buf, n], 265);
      try {
        const L = k => (P.fp - k) & 0xFFFF;
        const rec = (slot * 7 + SLOTS) & 0xFFFF;
        if (P.s(slot) < 0 || P.s(slot) >= 10 || b(rec) === 255) { setStatus(13); return 0xFFFF; }
        if (!b(rec)) { setStatus(14); return 0xFFFF; }
        if (!n) return 0;
        if (!b(rec + 3)) return yield* P.dispatch_record_callback(b(rec + 2), 1, buf, n);
        const failOut = () => { setStatus(status() | 256); return 0xFFFF; };
        P.kernal_clrchn_wrapper();
        setStatus(P.kernal_chkout_wrapper(slot + 1));
        if (status()) return failOut();
        setStatus(P.rb(READST));
        if (status()) { setStatus(status() | 512); return 0xFFFF; }
        let left = n;
        if (b(rec + 3) === 76) {
          while (left) {
            if (b(rec + 6) === 2 && P.s(left) >= 252) {
              setb(rec + 6, 1);
              P.send_file_control_record(rec);
              P.kernal_clrchn_wrapper();
              setStatus(P.kernal_chkout_wrapper(slot + 1));
              if (status()) return failOut();
              setStatus(P.kernal_chrout_wrapper(58));
              if (status()) return failOut();
              for (;;) {
                const at = b(rec + 6) + 1;
                setb(rec + 6, at);
                if (!(at <= 253)) break;
                buf = (buf + 1) & 0xFFFF;
                setStatus(P.kernal_chrout_wrapper(P.rb(buf - 1)));
                if (status()) return failOut();
                left = (left - 1) & 0xFFFF;
              }
              setStatus(P.kernal_chrout_wrapper(58));
              if (status()) return failOut();
              setb(rec + 4, b(rec + 4) + 1);
              if (!b(rec + 4)) setb(rec + 5, b(rec + 5) + 1);
              setb(rec + 6, 2);
            } else {
              let keep = b(rec + 6);
              setb(rec + 6, 2);
              P.send_file_control_record(rec);
              P.kernal_clrchn_wrapper();
              P.kernal_chkin_wrapper(slot + 1);
              let p = L(265);
              P.wb(p, 58); p++;
              while (p < L(12)) { p++; P.wb(p - 1, yield* P.kernal_getin_wrapper(1)); }
              P.wb(p, 58);
              setb(rec + 6, keep);
              p = (b(rec + 6) + L(266)) & 0xFFFF;
              while (p < L(12)) {
                left = (left - 1) & 0xFFFF;
                if (!((left + 1) & 0xFFFF)) break;
                p++; buf = (buf + 1) & 0xFFFF;
                P.wb(p - 1, P.rb(buf - 1));
                setb(rec + 6, b(rec + 6) + 1);
              }
              if (P.s(left) < 0) left = (left + 1) & 0xFFFF;
              keep = b(rec + 6);
              setb(rec + 6, 1);
              P.send_file_control_record(rec);
              P.kernal_clrchn_wrapper();
              P.kernal_chkout_wrapper(slot + 1);
              for (p = L(265); p < L(11);) {
                p++;
                setStatus(P.kernal_chrout_wrapper(P.rb(p - 1)));
                if (status()) return failOut();
              }
              setb(rec + 6, keep);
              if (b(rec + 6) > 253) {
                setb(rec + 4, b(rec + 4) + 1);
                if (!b(rec + 4)) setb(rec + 5, b(rec + 5) + 1);
                setb(rec + 6, 2);
              }
            }
          }
        } else {
          for (;;) {
            left = (left - 1) & 0xFFFF;
            if (!((left + 1) & 0xFFFF)) break;
            buf = (buf + 1) & 0xFFFF;
            setStatus(P.kernal_chrout_wrapper(P.rb(buf - 1)));
            if (status()) return failOut();
            setStatus(P.rb(READST));
            if (status()) { setStatus(status() | 512); return 0xFFFF; }
          }
        }
        P.kernal_clrchn_wrapper();
        setStatus(P.enter_inline_native_67e8_adjust_minus2(b(rec + 2)));
        if (status()) { setStatus(status() | 768); return 0xFFFF; }
        return n;
      } finally { P.leave(f); }
    };

    // $600F: the file scratched ("S" and the parsed name, which ends in its type), the drive's
    // status kept; 0 when it is 01, FILES SCRATCHED, or the spec names a binding
    P.scratch_existing_disk_file = function (name) {
      const f = P.enter([name], 47);
      try {
        const L = k => (P.fp - k) & 0xFFFF;
        setStatus(0);
        if (P.s(P.parse_file_spec_and_allocate_slot(name, L(47))) < 0) return 0xFFFF;
        if (!P.rb(L(44))) return 0;
        P.wb(L(40), 83);
        P.copy_zero_terminated_string(L(39), 0x801A);
        const len = P.measure_zero_terminated_string(L(40));
        P.serial_send_buffer_with_cr(P.rb(L(45)), L(40), len);
        setStatus(P.enter_inline_native_67e8_adjust_minus2(P.rb(L(45))));
        if (status() !== 1) { setStatus(status() | 768); return 0xFFFF; }
        return 0;
      } finally { P.leave(f); }
    };
    // $5FEA: the file scratched (a failure there other than status $34A stops it) and opened to
    // write. The game passes a second argument, which the routine does not read
    P.open_replacement_file_for_write = function* (name, extra) {
      const f = P.enter([name, extra], 2);
      try {
        if (P.s(P.scratch_existing_disk_file(name)) < 0 && status() !== 842) return 0xFFFF;
        return yield* P.open_file_slot(name, 1);
      } finally { P.leave(f); }
    };
    // $5F44: a file of code (its name and the suffix at $5FE5) read whole into the heap at the
    // address its first word gives and run there
    P.load_entire_named_file = function* (name) {
      const f = P.enter([name], 40);
      try {
        const L = k => (P.fp - k) & 0xFFFF;
        P.copy_zero_terminated_string(L(40), name);
        P.append_zero_terminated_string(L(40), 0x5FE5);
        const slot = yield* P.open_file_slot(L(40), 0);
        if (P.s(slot) < 0) return 0xFFFF;
        const fail = function* () { yield* P.close_file_slot(slot); return 0xFFFF; };
        if (P.s(yield* P.read_exact_file_bytes(slot, L(6), 2)) <= 0) return yield* fail();
        if (P.s(yield* P.read_exact_file_bytes(slot, L(8), 2)) <= 0) return yield* fail();
        const at = P.ramw(L(6)), len = P.ramw(L(8));
        const top = P.AllocateVmHeapBlock(0);
        if (top < ((at + len) & 0xFFFF) && !P.AllocateVmHeapBlock((at + len - top) & 0xFFFF)) { setStatus(0xFFFA); return yield* fail(); }
        if ((yield* P.read_exact_file_bytes(slot, at, len)) < len) {
          if (!status()) setStatus(0xFFFB);
          return yield* fail();
        }
        yield* P.close_file_slot(slot);
        return yield* P.callAt(at, []);
      } finally { P.leave(f); }
    };

    // ---- the saves: AESD, the directory of five 32-byte entries (160 bytes), and AES0-AES4,
    // the games
    // $4D05: the directory read into buf, asking for the disk until it opens; 0, or -1 when it
    // was short
    P.read_save_directory_aesd = function* (buf) {
      const f = P.enter([buf], 4);
      try {
        let slot;
        for (;;) {
          slot = yield* P.open_file_slot(0x4D43, 0);
          if (slot !== 0xFFFF) break;
          yield* P.prompt_retry_after_disk_error(0);
        }
        const n = yield* P.read_exact_file_bytes(slot, buf, 160);
        yield* P.close_file_slot(slot);
        return n === 160 ? 0 : 0xFFFF;
      } finally { P.leave(f); }
    };
    // $4D48: the directory written from buf; 0 or -1
    P.write_save_directory_aesd = function* (buf) {
      const f = P.enter([buf], 4);
      try {
        const slot = yield* P.open_replacement_file_for_write(0x4D81, 0);
        if (slot === 0xFFFF) return 0xFFFF;
        const n = yield* P.write_exact_file_bytes(slot, buf, 160);
        yield* P.close_file_slot(slot);
        return n === 160 ? 0 : 0xFFFF;
      } finally { P.leave(f); }
    };
    // $4D86: a directory entry: the text at $4DE5, the player's name (16 at most) cut at 20,
    // the text at $4DEA and the age in two places
    P.format_save_directory_entry = function (dst) {
      const f = P.enter([dst], 2);
      try {
        P.copy_zero_terminated_string(dst, 0x4DE5);
        P.append_bounded_zero_terminated_string(dst, 0x82CB, 16);
        P.wb(dst + 20, 0);
        P.append_zero_terminated_string(dst, 0x4DEA);
        do { dst = (dst + 1) & 0xFFFF; } while (P.rb(dst));
        const age = P.ramw(0x7F74);
        dst = (dst + 1) & 0xFFFF;
        P.wb(dst - 1, P.s(age) > 9 ? P.divs(age, 10) + 48 : 32);
        dst = (dst + 1) & 0xFFFF;
        P.wb(dst - 1, P.rems(age, 10) + 48);
        P.wb(dst, 0);
        return 0;
      } finally { P.leave(f); }
    };
    // $4DF1 and $4E00: save slot n read or written
    P.read_save_slot_state = function* (n) {
      const f = P.enter([n], 0);
      try { return yield* P.transfer_save_slot_state(n, 0x607C); } finally { P.leave(f); }
    };
    P.write_save_slot_state = function* (n) {
      const f = P.enter([n], 0);
      try { return yield* P.transfer_save_slot_state(n, 0x6209); } finally { P.leave(f); }
    };
    // $4E0F: AES<n> opened (to write, scratched first) and the game's state moved through fn:
    // the 64 shared words, the phase's choices, the life map's 30 x 3 words, the name, the
    // phase, the acquisitions and the family episodes used. 0, or -1 when any part fell short
    P.transfer_save_slot_state = function* (n, fn) {
      const f = P.enter([n, fn], 36);
      try {
        const name = (P.fp - 36) & 0xFFFF;
        P.copy_zero_terminated_string(name, 0x4EE4);
        P.wb(name + 3, P.rb(name + 3) + n);
        const slot = fn === 0x607C ? yield* P.open_file_slot(name, 0) : yield* P.open_replacement_file_for_write(name, 0);
        if (slot === 0xFFFF) return 0xFFFF;
        let short = 0;
        for (const [at, len] of [[0x7F40, 128], [0x81C5, 48], [0x81F7, 180], [0x82CB, 16], [0x82BD, 2], [0x82AB, 2], [0x7FC0, 4]]) {
          short = (short + len - (yield* P.callAt(fn, [slot, at, len]))) & 0xFFFF;
        }
        yield* P.close_file_slot(slot);
        return short ? 0xFFFF : 0;
      } finally { P.leave(f); }
    };
    // $4EF4: the saved games offered; the one chosen read in. 1, 0 for none, -1 when it failed
    P.resume_saved_game_menu = function* () {
      const f = P.enter([], 162);
      try {
        P.ww(0x7E4C, 0x4F30);
        const r = yield* P.build_save_directory_menu((P.fp - 160) & 0xFFFF, 1);
        if (P.s(r) <= 0) return 0;
        if (yield* P.read_save_slot_state(r - 1)) { yield* P.report_packed_runtime_error(0x4F4F); return 0xFFFF; }
        return 1;
      } finally { P.leave(f); }
    };
    // $4F65: the slots offered for a save; the game written to the one chosen with its entry,
    // and a dialog and the menu again when that failed
    P.save_current_game_menu = function* () {
      const f = P.enter([], 162);
      try {
        const dir = (P.fp - 160) & 0xFFFF;
        for (;;) {
          P.ww(0x7E4C, 0x4FCD);
          const r = yield* P.build_save_directory_menu(dir, 0);
          if (P.s(r) <= 0) return 0;
          P.format_save_directory_entry((((r - 1) << 5) + dir) & 0xFFFF);
          if (!(yield* P.write_save_directory_aesd(dir)) && !(yield* P.write_save_slot_state(r - 1))) return 0;
          P.ww(0x82E5, 0x4FEB);
          P.ww(0x82E9, 0x500C);
          P.ww(0x82E1, P.ramw(0x82E9));
          yield* P.run_modal_selection_dialog(0x82DD, 0);
        }
      } finally { P.leave(f); }
    };
    // $500D: the directory read and its entries put in the menu at $7E48 (with "empty slot",
    // $50CF, after them when saving); the entry chosen (1-), or 0
    P.build_save_directory_menu = function* (buf, resume) {
      const f = P.enter([buf, resume], 2);
      try {
        yield* P.query_drive_status_line();
        if (yield* P.read_save_directory_aesd(buf)) { yield* P.report_packed_runtime_error(0x5092); return 0xFFFF; }
        if (resume && !P.rb(buf)) {
          yield* P.EditMenuTextOrSelectEntry(0x50AC, (P.fp - 2) & 0xFFFF, 0);
          return 0;
        }
        let i = 0;
        for (; i < 5; i++) {
          if (!P.rb(buf)) {
            if (!resume) { P.ww(((i + 3) << 2) + 0x7E48, 0x50CF); i++; }
            break;
          }
          P.ww(((i + 3) << 2) + 0x7E48, buf);
          buf = (buf + 32) & 0xFFFF;
        }
        P.ww(0x7E4A, i + 1);
        return yield* P.run_modal_selection_dialog(0x7E48, 0);
      } finally { P.leave(f); }
    };
    // $50E7: the drive's state found: "U;" and its status; anything but 73 (a drive just
    // reset) and "UJ" resets it. Its status
    P.query_drive_status_line = function* () {
      const f = P.enter([], 0);
      try {
        P.serial_send_buffer_with_cr(8, 0x5116, 2);
        if (P.enter_inline_native_67e8_adjust_minus2(8) !== 73) {
          P.serial_send_buffer_with_cr(8, 0x5119, 2);
          return P.enter_inline_native_67e8_adjust_minus2(8);
        }
        return 73;
      } finally { P.leave(f); }
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
