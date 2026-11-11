## 0.0.337 · 2026-11-11 · Shadowfire (C64) · air with Claude

- **Bytes a medium carries beside what the loader uses can be the
  mastering computer's memory, and a count of equal bytes will not show
  it.** Shadowfire's tape loads 3,072 bytes below its loading picture's
  bitmap that nothing shows or runs. Against the game's bytes at the same
  addresses only 365 were equal, which read as chance, and the ledger
  kept them as a question. Counted a bit at a time they are the game's
  own font and music driver: bits 0-4 and 7 agree 91 % of the time, and
  at most 64 % when the two are slid a byte or a page apart. Bit 6 was
  set almost everywhere and bit 5 followed the address's lowest bit,
  which is how the dynamic memory of the time fades when its power is
  cut for a moment, one chip to a bit. So before an item is answered
  "not known", compare it with the listing at its own load address bit
  by bit, then slide it over the whole game with the damaged bits left
  out: the same search found a copy of a sound routine from another
  build in the 192 bytes after the bitmap
  (`games/c64/shadowfire/facts.md`, "The tape's leftover memory";
  `games/c64/shadowfire/test_tape_leftover.py`).
