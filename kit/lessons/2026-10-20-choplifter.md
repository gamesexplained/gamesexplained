## next · 2026-10-20 · Choplifter (Apple II) · air with Claude

- **Run the game's code from the listing and compare it with the
  emulator.** Coverage read 100 % and every check passed while the
  listing held none of the bytes after 138 calls to the graphics
  library, the arguments those calls read. Each was typed as data with
  no label, so the ledger did not track it and the listing kept a gap
  there. Reading the listing showed nothing wrong. Running the attract
  mode from it on the kit's 6502 and comparing its frames with the
  emulator's went wrong at once. Once the arguments had labels, and the
  loading screen the game draws over was put in place first, every
  frame was the same, byte for byte. A short run of code from the
  listing, held to the emulator, tests what the listing holds as no
  reading of it can (#442).
- **Read a routine's callers before naming what it is for.** The noise
  routine was called an explosion's in two comments, because noise is
  what an explosion makes. A tank firing and a jet firing are its only
  callers. The sample of 80 did not draw either comment; playing each
  sound from its call site showed it.
