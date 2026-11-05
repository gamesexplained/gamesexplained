'use strict';
// The scene stream: the MAP files read a record at a time through the game's fast loader
// ($5B72-$5F2F). Each MAP file is a relative file of 254-byte records, [':', 252 bytes, ':'],
// and the drive code the game starts with M-E $07AF sends a record as 256 bytes into the buffer at
// $8045: a status byte, the number of the MAP file on the disk, then the record. The game reads the
// file as one stream of payload bytes: record index at $7E95, the next byte's place in the buffer
// at $7E97 (3 to 254, $FF when the record is used up), offsets 32 bits.
//
// The drive itself is not the game's: AEPort.drive({ maps }) holds the MAP files' records by
// number ({ 1: Uint8Array, 2: ... }, 2 being MAP27, which serves the second and seventh phases), and
// AEPort.receiveRecord is what it puts in the buffer, shared by the port and the tests that run the
// game's own code with the fast loader stood in for. The drive here holds every disk at once, so
// the game never has to ask for one.
(function (root) {
  const AEPort = root.AEPort || (root.AEPort = {});
  const groups = AEPort.groups || (AEPort.groups = []);

  AEPort.drive = function (o = {}) { return { maps: o.maps || {}, status: o.status || 0 }; };

  // The drive's answer to M-E: record index of MAP file id into the buffer at $8045. Returns
  // false when the drive holds no such record (the game then tries four times more and gives up).
  AEPort.receiveRecord = function (M, drive, id, index) {
    const map = drive && drive.maps[id];
    if (!map || (index + 1) * 254 > map.length) return false;
    M[0x8045] = 0;
    M[0x8046] = id;
    M.set(map.subarray(index * 254, index * 254 + 254), 0x8047);
    return true;
  };

  groups.push(function (P) {
    const M = P.M;
    P.drive = P.opts.drive || AEPort.drive();
    const idx = () => M[0x7E95] | M[0x7E96] << 8;
    const setIdx = v => { M[0x7E95] = v & 255; M[0x7E96] = (v >> 8) & 255; };

    // $5DAF: the record at $7E95 into the buffer, with the arrow off meanwhile; 0, or -1 with the
    // buffer's status and file number in $8043 when the drive could not give it
    P.receive_map_record_fast_serial = function () {
      M[0x7E9B] = 0;
      M[0x7E9D] = M[0x7E95]; M[0x7E9E] = M[0x7E96];
      const sprites = P.rb(0xD015);
      P.wb(0xD015, 0);
      const ok = AEPort.receiveRecord(M, P.drive, M[0x7E93], idx());
      P.wb(0xD015, sprites);
      if (ok && M[0x7E94] === 0) return 0;
      M[0x8043] = M[0x8045]; M[0x8044] = M[0x8046];
      return 0xFFFF;
    };

    // $5B72: the stream opened on MAP file `map` of drive `device`: the drive initialised (its
    // status kept at $8043), the fast loader started, record 0 read. 0, or -1
    P.prepare_map_record_stream = function (device, map) {
      M[0x7E91] = device & 255; M[0x7E92] = (device >> 8) & 255;
      M[0x7E93] = map & 255; M[0x7E94] = (map >> 8) & 255;
      M[0x8043] = P.drive.status & 255; M[0x8044] = 0;
      if (P.drive.status && P.drive.status !== 0x49) return 0xFFFF;
      M[0x7E97] = 3;
      setIdx(0);
      if (P.receive_map_record_fast_serial() === 0xFFFF) { M[0x7E93] = M[0x7E94] = 0xFF; return 0xFFFF; }
      return 0;
    };

    // $5C3D: the stream moved to the 32-bit payload offset at ptr: record offset / 252, the byte
    // offset mod 252 + 3 in it, worked out with the 32-bit division in zero page as the routine
    // does. What the record's read returns
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
      return P.receive_map_record_fast_serial();
    };

    // $5CE6: n bytes of the stream to dst, a record at a time; n, or -1 when a record could not be
    // read (the place left at the end of the last one)
    P.read_map_payload_bytes = function (dst, n) {
      let left = P.s(n);
      const want = n & 0xFFFF;
      while (left > 0) {
        if (M[0x7E97] >= 0xFF) {
          setIdx(idx() + 1);
          if (P.receive_map_record_fast_serial() === 0xFFFF) {
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

    // $5EAD: the stream's place as a 32-bit payload offset at ptr: index x 252 + cursor - 3,
    // multiplied in zero page as the routine does
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

    // $5F27: the stream closed, so that the next read finds no file it expects
    P.invalidate_expected_map_record_id = function () { M[0x7E93] = M[0x7E94] = 0xFF; return null; };

    // $5F36: the arrow taken off the screen at the top of a frame
    P.wait_for_raster_zero_and_disable_sprite0 = function* () {
      yield* P.waitRasterLow(0);
      P.wb(0xD015, P.rb(0xD015) & 0xFE);
      return null;
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
