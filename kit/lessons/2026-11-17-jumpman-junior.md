## next · 2026-11-17 · Jumpman Junior (C64) · unorig with Claude

- **A cartridge game run from RAM turns its stores to ROM into real
  writes.** Jumpman Junior's disk release loads the 16 KB cartridge
  image to `$8000` and runs it there. Level 10's bomb routine ends with
  `STA $8004`, which on the cartridge hit ROM and did nothing; from disk
  it writes 0 over the C of `CBM80`, so a reset afterwards goes to BASIC.
  The store read as a harmless leftover until it was tested in VICE
  (17 November 2026: `$8004`-`$8008` read `00 C2 CD 38 30` after a bomb).
  When a game is a cartridge image loaded into RAM, search for every
  store whose target is inside the image's own range
  (`kit/cpu/opcodes.py --refs`), and test each one live.
- **The sample found lists of uses, not wrong claims.** Of 80 comments,
  15 were wrong in a detail and none in its main claim; six of the 15
  were a variable's list of users with one or more missing. A comment
  that lists where a byte is used is checked by a references search
  over the whole image, not by memory of the routines read so far.
