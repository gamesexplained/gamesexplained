## 0.0.332 · 2026-11-11 · Aztec Challenge (C64) · Nico-van-der-Zijden's run; air with Claude

- **A tape's files are read from its pulses before anything is loaded.**
  The run wrote a 70-line decoder of its own, which found both files and
  their addresses in seconds where the emulator took ten minutes in warp
  to load them, and showed the boot program before it ran (#832).
  `kit/c64/tap.py` is that tool for every tape: it lists each file in the
  KERNAL's own format with its type, its addresses and its length, checks
  every block's checksum and takes the copy when the first writing is
  damaged, and `extract` writes the programs into `work/`. A header whose
  171 spare bytes hold anything but spaces is listed on its own, at
  `$033C`, because that is where a loader hides its start.
- **The format was held to the machine, not to a tape written by the
  test.** VICE's datasette recorded the C64's own KERNAL saving a one-line
  BASIC program and 700 made-up bytes (vice-mcp v3.14.0). The shorts came
  out at 352 to 392 cycles, the mediums at 512 to 544 and the longs at 688
  to 712, and each block ends with a long and a short. The reader gives
  both files back byte for byte, as a TAP of version 1 and of version 0;
  the pulses are `kit/c64/fixtures/tape-kernal-save.json`. No real
  cassette's dump was read: a worn tape's pulses wander more than an
  emulator's, and the reader splits the three lengths halfway between
  them.
- **A C64 tape is in the media ledger.** `media.py scan` lists a TAP's
  KERNAL files, and every other stretch of 32 pulses or more that is not a
  tone as an item with no bytes, to be answered by hand: on most tapes
  that is the game, in its loader's fast format, which the kit does not
  decode. The C16's reader now takes its KERNAL blocks from the same code
  with its own pulse lengths.
