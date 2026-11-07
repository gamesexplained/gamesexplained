'use strict';
// The resident program's start and its runtime: the native start-up at $6557, the C runtime's
// set-up at $65A7, the game's top level at $4003 that runs the start and life objects one after
// the other, the heap, the loader of objects from the MAP stream, the error dialogs and the exits.
//
// The start and life objects are code and data the game reads from MAP1 into the heap at $8466
// and calls through a pointer (call_vm_function_pointer). The page carries their data but not
// their code, so the port knows each by where it was read from (P.objects: the stream's place when
// read_length_prefixed_stream_object began) and calls its JavaScript: the start object's entry is
// run_new_or_resume_personality_setup ($8D5E), the life object's play_life_stage ($84DC). Each object leaves by its
// exit routine ($936B, $B3B5) from any depth, which the port throws (P.Exit) and catches here.
(function (root) {
  const AEPort = root.AEPort || (root.AEPort = {});
  const groups = AEPort.groups || (AEPort.groups = []);

  // the objects the port runs, by MAP file and the payload offset of their four-byte header
  const OBJECTS = { '1:6104': 'start', '1:11528': 'life' };
  // where each object's entry keeps the frame it returns through: $9990 (start), $C29A (life)
  const SAVED_FP = { start: 0x9990, life: 0xC29A };

  class Exit { constructor(value) { this.value = value & 0xFFFF; } }
  class Reset { constructor() { this.message = 'the game called the KERNAL\'s reset ($FCE2)'; } }
  class Basic { constructor(v) { this.value = v; this.message = 'the game returned to BASIC'; } }
  AEPort.Exit = Exit; AEPort.Reset = Reset; AEPort.Basic = Basic;

  groups.push(function (P) {
    const M = P.M;
    P.Exit = Exit;
    P.objects = {};

    // $6557, the program's 6502 start, where the loader's JMP at $4000 lands: BASIC banked out,
    // the p-code's stack at $CFFF, the heap from $8465 (the end of the resident program, kept at
    // $7FCB, and $7FCD cleared) and the runtime started at $65A7. The page enters here
    P.native_startup_enter_vm = function* () {
      P.wb(0x01, P.rb(0x01) & 0xFE);
      P.setw(0x04, 0xCFFF);
      P.sp = 0xCFFF; P.fp = P.ramw(0x06);
      P.setw(0x7FCB, 0x8465); P.setw(0x7FCD, 0);
      return yield* P.vm_proc_65a7();
    };

    // $65A7: the C runtime's set-up: every channel closed (CLALL), the ten file slots free ($FF
    // at each 7-byte record from $7FD3), the cleanup run at the end set to close them, the
    // console's three slots opened on the keyboard and screen handlers, then the game; its value
    // goes to BASIC
    P.vm_proc_65a7 = function* () {
      const f = P.enter([], 2);
      try {
        P.kernal_clall_wrapper();
        P.ww(0x7FCF, 0x6605);                       // termination_cleanup_callback
        for (let i = 0; i < 10; i++) P.wb(0x7FD3 + i * 7, 0xFF);
        yield* P.open_file_slot(0x65F9, 2);
        yield* P.open_file_slot(0x65FD, 2);
        yield* P.open_file_slot(0x6601, 2);
        const r = yield* P.initialize_alter_ego_runtime(0, 0);
        return yield* P.terminate_to_basic_with_status(r);
      } finally { P.leave(f); }
    };

    // (*$7FC8)(), the KERNAL's reset at $FCE2, which the game reaches from its top level's frame:
    // the p-code's registers are left in $04-$07 as they stand there, and the port stops
    P.reset = function () {
      P.setw(0x04, P.sp); P.setw(0x06, P.fp);
      throw new Reset();
    };

    // $4003, the game's top level. The heap starts after the program (at $4000's own address, the
    // end of the code), the interrupt vectors under the KERNAL and the arrow's interrupt go in,
    // the 64 words the start and life objects share are cleared, and MAP1's first three objects
    // are read: the life map's graphics ($81F5), the scene strings ($8463) and the start object,
    // which is run. Its value (the phase chosen) goes to the life object, read from where the
    // start object ended; the life object returning 2 starts it all again.
    P.initialize_alter_ego_runtime = function* (a8, a10) {
      const f = P.enter([a8, a10], 8);
      const L6 = (P.fp - 6) & 0xFFFF;               // the stream's place after the start object
      try {
        P.AllocateVmHeapBlock(0x4000);
        P.install_under_rom_hardware_vectors();
        P.initialize_display_and_sprite_irq(22);
        P.wb(0xD027, 0);
        for (;;) {
          for (let i = 0; i < 64; i++) P.ww(0x7F40 + 2 * i, 0);
          while (P.s(yield* P.enter_inline_native_5b72_adjust_0(8, 1)) < 0) yield* P.prompt_retry_after_disk_error(1);
          P.enter_inline_native_5ce6_save4_adjust_minus2(L6, 4);
          let obj = 0;
          const gfx = P.read_length_prefixed_stream_object(0);
          P.ww(0x81F5, gfx);
          if (gfx) {
            const strings = P.read_length_prefixed_stream_object(0);
            P.ww(0x8463, strings);
            if (strings) obj = P.read_length_prefixed_stream_object(1);
          }
          if (!obj) {
            yield* P.report_packed_runtime_error(0x40E1);       // startup_load_error_text_pool
            P.reset();
          }
          P.enter_inline_native_5ead_adjust_0(L6);
          const phase = yield* P.call_vm_function_pointer(obj, 0);
          while (P.s(yield* P.enter_inline_native_5b72_adjust_0(8, 1)) < 0) yield* P.prompt_retry_after_disk_error(1);
          P.enter_inline_native_5c3d_adjust_minus4(L6);
          const life = P.read_length_prefixed_stream_object(1);
          if (!life) {
            yield* P.report_packed_runtime_error(0x40F4);
            P.reset();
          }
          if ((yield* P.call_vm_function_pointer(life, phase)) !== 2) P.reset();
        }
      } finally { P.leave(f); }
    };

    // $4AEE: an object from the stream: a word of its address, a word of its length, then its
    // bytes there. With grow set, the heap is first taken up to its end (0 when it cannot be:
    // status -6). Its address, or 0 when the stream ran short
    P.read_length_prefixed_stream_object = function (grow) {
      const f = P.enter([grow], 6);
      try {
        const L2 = (P.fp - 2) & 0xFFFF, L4 = (P.fp - 4) & 0xFFFF;
        const from = (M[0x7E95] | M[0x7E96] << 8) * 252 + M[0x7E97] - 3;
        if (P.s(P.enter_inline_native_5ce6_save4_adjust_minus2(L2, 2)) <= 0) return 0;
        if (P.s(P.enter_inline_native_5ce6_save4_adjust_minus2(L4, 2)) <= 0) return 0;
        const at = P.ramw(L2), n = P.ramw(L4);
        if (grow) {
          const top = P.AllocateVmHeapBlock(0);
          if (top < ((at + n) & 0xFFFF)) {
            if (!P.AllocateVmHeapBlock((at + n - top) & 0xFFFF)) { P.ww(0x8043, 0xFFFA); return 0; }
          }
        }
        P.objects[at] = OBJECTS[M[0x7E93] + ':' + from] || null;
        if (P.s(P.enter_inline_native_5ce6_save4_adjust_minus2(at, n)) < P.s(n)) return 0;
        return at;
      } finally { P.leave(f); }
    };

    // $4B4F: a call through a pointer, with one argument. The start and life objects are entered
    // so: their entry stub ($8466, a JMP to $9348 or $B392) keeps this call's frame pointer and
    // takes this frame over, so that the object's main procedure runs as if called with these two
    // arguments in its place, and its exit returns from here
    P.call_vm_function_pointer = function* (ptr, arg) {
      const obj = P.objects[ptr];
      if (obj) {
        const f = P.enter([ptr, arg], 0);
        P.setw(SAVED_FP[obj], P.fp);
        P.leave(f);
        try {
          return obj === 'start' ? yield* P.run_new_or_resume_personality_setup(ptr, arg) : yield* P.play_life_stage(ptr, arg);
        } catch (e) {
          if (e instanceof Exit) return e.value;
          throw e;
        }
      }
      const f = P.enter([ptr, arg], 0);
      try { return yield* P.callAt(ptr, []); } finally { P.leave(f); }
    };

    // ---- the port's functions by the address the game's pointers hold
    P.callAt = function* (addr, args) {
      const fn = P.byAddress[addr & 0xFFFF];
      if (!fn) throw new Error('the game called through a pointer to $' + (addr & 0xFFFF).toString(16) + ', which the port has no function for');
      const r = P[fn](...args);
      return r && typeof r.next === 'function' ? yield* r : r;
    };
    P.byAddress = {
      0x6605: 'close_all_open_file_slots', 0x607C: 'read_exact_file_bytes', 0x6209: 'write_exact_file_bytes',
      0x6C0B: 'keyboard_binding_handler_6c0b', 0x6CF0: 'keyboard_binding_handler_6cf0',
    };

    // $6E70: n bytes from the heap, which grows up from $7FCB's pointer towards the p-code's stack
    // (256 bytes kept between): their address, or 0 when they do not fit. 0 bytes gives the top
    P.AllocateVmHeapBlock = function (n) {
      const f = P.enter([n], 2);
      try {
        const heap = P.ramw(0x7FCB);
        if (((heap + n) & 0xFFFF) > ((P.ramw(0x04) + 0xFF00) & 0xFFFF)) return 0;
        P.ww(0x7FCB, heap + n);
        return heap;
      } finally { P.leave(f); }
    };

    // $4109: the NMI, reset and IRQ vectors in the RAM under the KERNAL, for while it is banked
    // out: the bridges at $4128 and $414A, and $4174 for a reset
    P.install_under_rom_hardware_vectors = function () {
      P.setw(0xFFFA, 0x4128); P.setw(0xFFFC, 0x4174); P.setw(0xFFFE, 0x414A);
      return null;
    };

    // $4C12: a message of up to two 40-character lines and a signed number (as " 1234" or
    // "-1234") in the error dialog ($82DD), the lines and the number kept in this call's frame
    P.format_and_show_error_message = function* (text, num) {
      const f = P.enter([text, num], 104);
      try {
        const L = n => (P.fp - n) & 0xFFFF;
        const len = P.measure_zero_terminated_string(text);
        P.copy_bounded_zero_terminated_string(L(102), text, 40);
        P.wb(L(62), 0);
        P.ww(0x82E1, L(102));
        if (P.s(len) > 40) {
          P.copy_bounded_zero_terminated_string(L(61), text + 40, 40);
          P.wb(L(21), 0);
        } else P.wb(L(61), 0);
        P.ww(0x82E5, L(61));
        let n = num;
        if (P.s(n) < 0) { P.wb(L(20), 45); n = (-n) & 0xFFFF; } else P.wb(L(20), 32);
        P.format_word_as_three_decimal_digits(P.divs(n, 1000), L(19));
        P.format_word_as_three_decimal_digits(P.rems(n, 1000), L(16));
        P.ww(0x82E9, L(20));
        return yield* P.run_modal_selection_dialog(0x82DD, 0);
      } finally { P.leave(f); }
    };

    // $4CA1: a message and the status kept at $8043: its high byte (the stage that failed, as a
    // signed number) and then its low byte (the drive's or the library's code)
    P.report_packed_runtime_error = function* (text) {
      const f = P.enter([text], 0);
      try {
        const st = P.ramw(0x8043);
        yield* P.format_and_show_error_message(text, P.sar(st, 8));
        return yield* P.format_and_show_error_message(0x4CC3, st & 255);
      } finally { P.leave(f); }
    };

    // $5677: "insert disk X" with the disk named by the table at $7E6C (its letter, and U for
    // the upper side), in the dialog at $7E7D
    P.prompt_retry_after_disk_error = function* (disk) {
      const f = P.enter([disk], 40);
      try {
        const buf = (P.fp - 40) & 0xFFFF;
        P.copy_zero_terminated_string(buf, 0x56D2);
        const x = P.find_byte_in_zero_terminated_buffer(buf, 88);
        const d = disk & 255;
        P.wb(x, P.rb(0x7E6C + 2 * d));
        P.append_zero_terminated_string(buf, P.rb(0x7E6C + 2 * d + 1) === 85 ? 0x56F5 : 0x56F9);
        P.ww(0x7E81, buf);
        return yield* P.run_modal_selection_dialog(0x7E7D, 0);
      } finally { P.leave(f); }
    };

    // $545B: a busy loop of n / 16 turns of the p-code's own loop (a page times a turn by its cost: cost.json's turn)
    P.delay_scaled_iterations = function* (n) {
      const f = P.enter([n], 2);
      try {
        const turns = P.divs(n, 16);
        if (P.s(turns) > 0) yield { cycles: 0, delay: P.s(turns) };
        return 0;
      } finally { P.leave(f); }
    };

    // $6E33: the cleanup ($7FCF) run, then BASIC
    P.terminate_to_basic_with_status = function* (v) {
      const f = P.enter([v], 0);
      try {
        yield* P.callAt(P.ramw(0x7FCF), []);
        return P.enter_basic_warm_start(v);
      } finally { P.leave(f); }
    };
    // $6E43: the value in $02AA, BASIC banked in, and BASIC's warm start through $A002
    P.enter_basic_warm_start = function (v) {
      P.wb(0x02AA, v); P.wb(0x02AB, v >> 8);
      P.wb(0x01, P.rb(0x01) | 1);
      throw new Basic(v);
    };

    // $6E59, $6BD9, $6BF2: the C library's character tests
    P.ascii_is_digit = function (c) {
      const f = P.enter([c], 0);
      try { return (c <= 57 && c >= 48) ? 1 : 0; } finally { P.leave(f); }
    };
    P.ascii_to_upper = function (c) {
      const f = P.enter([c], 0);
      try { return (P.s(c) >= 97 && P.s(c) <= 122) ? (c - 32) & 0xFFFF : c; } finally { P.leave(f); }
    };
    P.ascii_to_lower = function (c) {
      const f = P.enter([c], 0);
      try { return (P.s(c) >= 65 && P.s(c) <= 90) ? (c + 32) & 0xFFFF : c; } finally { P.leave(f); }
    };

    // ---- the interrupts. With the KERNAL banked in, its entry takes the IRQ straight to $0314's
    // $4229; with it banked out, the vector under it takes the IRQ to the bridge at $414A, which
    // keeps A at $417E and the processor port at $4180, banks the KERNAL in and goes through the
    // KERNAL's entry, and $416C puts the port back. A is the main program's, which the port does
    // not keep: $417E is left out of the comparison.
    P.irq_sprite = function () { P.sprite0_motion_irq_hook(); };
    P.irq_dispatch_bridge = function () {
      const port = P.rb(0x01);
      M[0x4180] = port;
      P.wb(0x01, port | 3);
      P.sprite0_motion_irq_hook();
      P.wb(0x01, M[0x4180]);
    };
    // $EA31, the KERNAL's own interrupt, before the arrow's is hooked in front of it
    P.irq_kernal = function () { root.AEKernal.irq(P.kIrq); };
    // the KERNAL's interrupt that $4229 ends in, through the vector it kept at $4194
    P.kernal_irq = function () {
      if (P.ramw(0x4194) !== 0xEA31) throw new Error('the arrow\'s interrupt went on to $' + P.ramw(0x4194).toString(16));
      root.AEKernal.irq(P.kIrq);
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
