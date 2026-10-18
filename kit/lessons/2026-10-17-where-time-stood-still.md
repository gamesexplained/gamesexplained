## 0.0.190 · 2026-10-17 · Where Time Stood Still (ZX Spectrum 128K) · air with Claude

- **On a banked machine, record the bank with every address that ran.**
  An executed list of bare addresses cannot say whose code ran at
  `$C000`: this game pages five banks in there, two of them with code
  and three with data at the same addresses. Recording the bank from the
  emulator's transaction log (`kit/spectrum/bankmap.py`) showed code from
  banks 3 and 0 only, which made the other banks data parts with no code
  to trace, and let the static trace follow a call into `$C000` only into
  the bank that was paged in when it ran.
- **A value read off the snapshot is the last one stored, operands
  included.** The view's block tables split at a number the code compares
  with, `CP $80` in the snapshot. The area loader rewrites that operand
  for each area, from `$2B` to `$86`, and the annotation called it a
  constant. Running the game's own area loader and view drawer on the
  kit's Z80 for every area and comparing the view buffer byte for byte
  with the page's renderer found it on the first area tried. Before
  building on a constant you read in an instruction, search for stores to
  its address.
- **Check the emulator's frame against the machine before stepping
  input.** The client stepped the 48K's 69,888 T-states on a 128K, whose
  frame is 70,908: each "frame" ended 1,020 T-states early, so input held
  for a count of frames drifted against the game's interrupt, with
  nothing to say so. The client now asks the machine; on a machine new to
  the kit, read the frame the client steps and the reference's figure
  side by side.
- **Hold a sound driver to the emulator register by register.** The
  game's driver run on the kit's Z80, once a call, matched ZEsarUX's AY
  registers in 3,949 of 3,950 frames, once two things were allowed for: a
  frame step can stop while the driver is part way through writing the
  chip, and a request poked in the emulator lands one call later than the
  same poke in the recorder. The comparison also corrected the tune's
  section numbers in the listing and showed the music climbing a
  semitone after its first time round.
