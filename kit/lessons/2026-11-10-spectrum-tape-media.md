## next · 2026-11-10 · Driller (ZX Spectrum) · air with Claude

- **A tape's blocks go in the media ledger, and the parity test for the
  ROM's form holds only for standard and turbo blocks.** The Spectrum had
  no reader, so its games had no `media.json`: `kit/spectrum/media.py`
  now lists a `.tzx` or `.tap`, a header and its block as one file and
  every other block that carries bytes as an item of its own, numbered as
  SkoolKit's `tapinfo.py` numbers them. Driller's tape came out as two
  files and three blocks, the game and its screen found whole in the
  listing at `$6B12` and `$4000`. The first draft took any block whose
  bytes come to zero under exclusive or to be a flag, the bytes and a
  parity, and left the two out. Tried on a 128K SpeedLock tape of 18
  pure data blocks, it cut two bytes from a 16,384-byte bank that came to
  zero by chance, and so put its address one too high. Pure data blocks
  are now listed whole. The test tape has a block of every kind the
  format has, and SkoolKit's parser checks the numbering and the bytes.
- **List the tape's BASIC to its last line.** Driller's program stops
  being run at line 30, and lines 40 to 80 are the ones that saved the
  tape's first two files and then load `mast0`, a file the tape does not
  have. The run's notes said only that they are never reached.
