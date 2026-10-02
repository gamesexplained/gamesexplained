## 0.0.28 · 26 September 2026 · The Sentinel and Mercenary · air with Claude

**A pause is not always a stop.** In both games a frame recorded with
`frame.py capture` matched the emulator's picture of it only one raster
line lower, while an earlier frame of the same session matched exactly.
Reproduced with the kit's own test program, the offset comes from
vice-mcp's `vice_execution_pause`, which asks for a stop at the next
instruction and also raises VICE's own pause, which takes hold at the
next vertical sync. When the call lands as a frame ends, the sync wins
(four to seven pauses in thirty on the v3.13.1 release under Linux), and
the machine stops part way through an instruction. There the registers
read as they were some time before, a register set is lost, and a
snapshot loaded keeps the old registers. A snapshot saved there holds the
video chip between two frames; loaded later, it runs the last line twice,
and from then on the emulator draws every line one row low and ends each
frame on line 311, which is what both runs saw. Mercenary's state came
from its play snapshot; The Sentinel's record does not say how its state
was reached. The same pause was behind the determinism checks that came
and went on Linux: each loaded a snapshot straight after one.

So agents stop the machine with `pause()` in `kit/c64/vice.py`, the pause
and then a one-frame advance, before they read or set registers, step,
or save or load a snapshot. `check-emulator` measures the pause as
`pause-at-instruction`, `frame.py capture` records how far the emulator's
picture sits off (`picture_lines_low`), and `compare` allows for it. The
fix in vice-mcp itself is barryw/vice-mcp#30, listed in
`kit/c64/vice-prs.json` for `get-vice build --prs` until a release has it.
