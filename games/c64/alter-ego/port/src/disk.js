'use strict';
// The disk: the MAP files read a record at a time through the game's fast loader ($5B72-$5F2F),
// and the serial bus routines under it ($64E9, $67E8, $6840). Each MAP file is a relative file of
// 254-byte records, [':', 252 bytes, ':']. The game starts its drive code with M-E $07AF, and for
// each record sends M-E $0300 with the record's number; the drive code then clocks 256 bytes over
// CIA 2 into the buffer at $8045: a status, the MAP file's number, then the record. The game reads
// a file as one stream of payload bytes: the record's number at $7E95, the next byte's place in
// the buffer at $7E97 (3 to 254, $FF when the record is used up), offsets 32 bits.
//
// The drive is the machine's (port/src/kernal.js, AEKernal.drive, in P.drive): the commands go to
// it over the KERNAL's bus routines, and AEKernal.fastRecord is what its drive code sends, which
// the tests give the game's own code too. The transfer's handshake and timing are the drive's half
// of it and are not ported: the record is in the buffer at once.
//
// The routines with a native frame ($7059) are entered through stubs six bytes before them: each
// stub is the function the p-code calls, and the frame's saved workspace ($30-) is not touched by
// these bodies, so the stubs call the bodies alone.
(function (root) {
  const AEPort = root.AEPort || (root.AEPort = {});
  const groups = AEPort.groups || (AEPort.groups = []);

  groups.push(function (P) {
    const M = P.M;
    const idx = () => M[0x7E95] | M[0x7E96] << 8;
    const setIdx = v => { M[0x7E95] = v & 255; M[0x7E96] = (v >> 8) & 255; };

    // ---- the serial bus
    // $64E9: n bytes from ptr (256 for 0) and a carriage return to the drive's command channel:
    // UNLSN, LISTEN, SECOND $6F, CIOUT each byte, UNLSN
    P.serial_send_buffer_with_cr = function (device, ptr, n) {
      P.kernal('UNLSN');
      P.wb(0xBA, device);
      P.kernal('LISTEN', { a: device & 255 });
      P.wb(0xB9, 0x6F);
      P.kernal('SECOND', { a: 0x6F });
      let k = n & 255, y = 0;
      do { P.kernal('CIOUT', { a: P.rb((ptr + y) & 0xFFFF), y }); y = (y + 1) & 255; k = (k - 1) & 255; } while (k);
      P.kernal('CIOUT', { a: 0x0D });
      P.kernal('UNLSN');
      return 0;
    };
    // $6840: the drive's status, the two digits it sends first on its command channel, as a
    // number (0 for a device below 4): UNTLK, TALK, TKSA $6F, ACPTR twice, UNTLK
    P.read_iec_drive_status_code = function (device) {
      if ((device & 255) < 4) return 0;
      P.kernal('UNTLK');
      P.wb(0xBA, device);
      P.kernal('TALK', { a: device & 255 });
      P.wb(0xB9, 0x6F);
      P.kernal('TKSA', { a: 0x6F });
      const tens = P.kernal('ACPTR').a & 15;
      const units = P.kernal('ACPTR').a & 15;
      P.kernal('UNTLK');
      return (units + 10 * tens) & 255;
    };
    // $67E2 and $67E8: the status read, then (from a disk drive) M-E $E6BF, the 1541 ROM's routine
    // that puts its error channel back to 00, OK
    P.enter_inline_native_67e8_adjust_minus2 = function (device) {
      const f = P.enterNative([device], 0, -2);
      try { return P.read_status_and_restart_drive_fastloader(device); } finally { P.leaveNative(f); }
    };
    P.read_status_and_restart_drive_fastloader = function (device) {
      const st = P.read_iec_drive_status_code(device);
      if (P.s(4 - device) < 0) P.serial_send_buffer_with_cr(device, 0x683A, 5);
      return st;
    };

    // ---- the stream
    // $5B6C and $5B72: the stream opened on MAP file `map` of drive `device`: the drive
    // initialised ("I0") and its status kept at $8043 (00, or 73 after a reset, lets it go on),
    // the drive code started (M-E $07AF) and record 0 read. 0, or -1
    P.enter_inline_native_5b72_adjust_0 = function* (device, map) {
      const f = P.enterNative([device, map], 0, 0);
      try { return P.prepare_map_record_stream(device, map); } finally { P.leaveNative(f); }
    };
    P.prepare_map_record_stream = function (device, map) {
      P.setw(0x7E91, device); P.setw(0x7E93, map);
      P.serial_send_buffer_with_cr(P.ramw(0x7E91), 0x5C2E, 2);
      const st = P.enter_inline_native_67e8_adjust_minus2(8);
      P.setw(0x8043, st);
      if (st !== 0 && st !== 0x49) return 0xFFFF;
      P.serial_send_buffer_with_cr(P.ramw(0x7E91), 0x5C31, 5);
      M[0x7E97] = 3;
      setIdx(0);
      if (P.enter_inline_native_5daf_adjust_minus3() === 0xFFFF) { M[0x7E93] = M[0x7E94] = 0xFF; return 0xFFFF; }
      return 0;
    };

    // $5DA9 and $5DAF: the record at $7E95 into the buffer, asked for with M-E $0300 and its
    // number (the command kept at $7E98), the sprites off while it comes; up to five tries until
    // it comes with status 0, this MAP file's number and its two ':'. 0, or -1 with the buffer's
    // status and file number in $8043
    P.enter_inline_native_5daf_adjust_minus3 = function () {
      const f = P.enterNative([], 0, -3);
      try { return P.receive_map_record_fast_serial(); } finally { P.leaveNative(f); }
    };
    P.receive_map_record_fast_serial = function () {
      M[0x7E9B] = 0;
      M[0x7E9D] = M[0x7E95]; M[0x7E9E] = M[0x7E96];
      const sprites = P.rb(0xD015);
      for (let tries = 5; tries > 0;) {
        P.wb(0xD015, 0);
        P.serial_send_buffer_with_cr(P.ramw(0x7E91), 0x7E98, 7);
        M.set(root.AEKernal.fastRecord(P.drive, M[0x7E93]), 0x8045);
        P.wb(0xDD00, 0xC7);
        P.wb(0xD015, sprites);
        if (M[0x8045] === 0 && M[0x8046] === M[0x7E93] && M[0x7E94] === 0 && M[0x8047] === 0x3A && M[0x8144] === 0x3A) return 0;
        tries--;
        M[0x1A] = tries; M[0x1B] = 0;               // the count, through zero page
      }
      M[0x8043] = M[0x8045]; M[0x8044] = M[0x8046];
      return 0xFFFF;
    };

    // $5C37 and $5C3D: the stream moved to the 32-bit payload offset at ptr: record offset / 252,
    // the byte offset mod 252 + 3 in it, worked out with the 32-bit division in zero page as the
    // routine does. What the record's read returns
    P.enter_inline_native_5c3d_adjust_minus4 = function (ptr) {
      const f = P.enterNative([ptr], 0, -4);
      try { return P.seek_map_payload_offset(ptr); } finally { P.leaveNative(f); }
    };
    P.seek_map_payload_offset = function (ptr) {
      M[0x1A] = ptr & 255; M[0x1B] = (ptr >> 8) & 255;
      const off = P.ram(ptr) | P.ram(ptr + 1) << 8 | P.ram(ptr + 2) << 16 | P.ram(ptr + 3) << 24;
      P.wr32(0x1A, off >>> 0); P.wr32(0x16, 252);
      P.divide_i32_remainder_nonzero_contract(0x16, 0x1A);
      P.wr32(0x16, (P.rd32(0x1A) + 3) >>> 0);
      M[0x7E97] = M[0x16];
      P.wr32(0x1A, off >>> 0); P.wr32(0x16, 252);
      P.divide_i32_quotient_nonzero_contract(0x16, 0x1A);
      M[0x7E95] = M[0x1A]; M[0x7E96] = M[0x1B];
      return P.enter_inline_native_5daf_adjust_minus3();
    };

    // $5CE0 and $5CE6: n bytes of the stream to dst, a record at a time; n, or -1 when a record
    // could not be read (the place left at the end of the last one)
    P.enter_inline_native_5ce6_save4_adjust_minus2 = function (dst, n) {
      const f = P.enterNative([dst, n], 4, -2);
      try { return P.read_map_payload_bytes(dst, n); } finally { P.leaveNative(f); }
    };
    P.read_map_payload_bytes = function (dst, n) {
      let left = P.s(n);
      const want = n & 0xFFFF;
      while (left > 0) {
        if (M[0x7E97] >= 0xFF) {
          setIdx(idx() + 1);
          if (P.enter_inline_native_5daf_adjust_minus3() === 0xFFFF) {
            setIdx(idx() - 1);
            M[0x7E97] = 0xFF;
            return 0xFFFF;
          }
          M[0x7E97] = 3;
          continue;
        }
        // the byte copied through zero page as the routine does: $16 the cursor, $1A the place
        M[0x1A] = dst & 255; M[0x1B] = dst >> 8; M[0x16] = M[0x7E97]; M[0x17] = 0;
        P.wb(dst, M[0x8045 + M[0x7E97]]);
        M[0x7E97] = (M[0x7E97] + 1) & 255;
        dst = (dst + 1) & 0xFFFF;
        left--;
      }
      return want;
    };

    // $5EA7 and $5EAD: the stream's place as a 32-bit payload offset at ptr: index x 252 + cursor
    // - 3, multiplied in zero page as the routine does
    P.enter_inline_native_5ead_adjust_0 = function (ptr) {
      const f = P.enterNative([ptr], 0, 0);
      try { return P.tell_map_payload_offset(ptr); } finally { P.leaveNative(f); }
    };
    P.tell_map_payload_offset = function (ptr) {
      M[0x1A] = ptr & 255; M[0x1B] = (ptr >> 8) & 255;
      M[0x16] = M[0x7E95]; M[0x17] = M[0x7E96];
      M[0x18] = M[0x19] = (M[0x7E96] & 0x80) ? 0xFF : 0;
      P.wr32(0x12, 252);
      P.multiply_i32_low32(0x12, 0x16);
      P.wr32(0x12, M[0x7E97]);
      const v = (P.rd32(0x16) + P.rd32(0x12)) >>> 0;
      P.wr32(0x0E, v);
      const o = (v + 0xFFFFFFFD) >>> 0;
      P.wb(ptr, o); P.wb(ptr + 1, o >>> 8); P.wb(ptr + 2, o >>> 16); P.wb(ptr + 3, o >>> 24);
      return 0;
    };

    // $5F21 and $5F27: the stream closed, so that the next read finds no file it expects
    P.enter_inline_native_5f27_adjust_0 = function () {
      const f = P.enterNative([], 0, 0);
      try { return P.invalidate_expected_map_record_id(); } finally { P.leaveNative(f); }
    };
    P.invalidate_expected_map_record_id = function () { M[0x7E93] = M[0x7E94] = 0xFF; return null; };

    // $5F30 and $5F36: the arrow taken off the screen at the top of a frame
    P.enter_inline_native_5f36_adjust_0 = function* () {
      const f = P.enterNative([], 0, 0);
      try { return yield* P.wait_for_raster_zero_and_disable_sprite0(); } finally { P.leaveNative(f); }
    };
    P.wait_for_raster_zero_and_disable_sprite0 = function* () {
      yield* P.pollRasterLow(0);
      P.wb(0xD015, P.rb(0xD015) & 0xFE);
      return null;
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
