# Darkman — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 13 October 2026, Bronze (claude-opus-5-5[1m], one agent)

The G64 booted with VICE's default drive emulation, no `vicerc`. With
warp still on after the load, the first press of fire started level 1
and the game was over within seconds; the play snapshot was taken with
warp off. The directory showed the level files at once: each level is
two unpacked files loaded to $0A20 and $BF00 (or $E000), which set the
parts up before any code was read. C64-Wiki and every other page were
refused by the network policy, so the features come from search-result
summaries and the game's own text. The disassembler's text search caps
its results at 50, so the register census was made with a short script
over the code blocks and `opcodes.decode`.

## 13 October 2026, continued (same model, one agent)

Saved the hand-over at $0424, which showed $9400-$BEFF empty there: the
sound driver is copied in by level 1, not loaded. Level 2 was reached by
setting the PC to the loader loop at $0407 in the level 1 snapshot, and
its snapshots settled that $9A00-$BEFF survives the load and that level 2
calls the driver. A first try passed the register as `{"PC": ...}` and
was refused; `vice_registers_set` takes `register` and `value`. The
moves were tested by sprite positions from the play snapshot. The
coverage round annotated the four interrupts and the subsystems they
call; two first readings were wrong and corrected: $1FA4 selects the
screen matrix, not the character set, and the panel interrupt's $D018
write sets the screen bits.

## 22 to 24 October 2026, Silver run (Sonnet 5.5 leading, Opus 5.5 checking)

Levels 3 to 6 were snapshotted with `dm.py level N` (it attaches the disk side;
without it the load stops at DISC ERROR). Each level was seeded from the code
reachable from its raster handlers, then annotated by cold-briefed Sonnet
agents, one at a time, from the routines of finished parts (carried by address)
and `dump_part.py` disassembly dumps. Wrong turns: a table address was seeded as
code; one root was mid-instruction (a skip option, `-XXXX`, now exists in
`seed_part.py`); charset bytes under the I/O area were typed as sprite shapes in
level 6; a comment about the dissolve routine was wrong in levels 3 and 5.

The 60-comment sample (Opus 5.5) found 8 comments wrong in a detail. Seven were
readers or writers missing from a list or a flag set at the wrong moment; one
(`climb_frame_down` in level 6) said the frame was written every other call
when it is written every call, and the same sentence stood in ten comments of
levels 2, 4 and 6, which were corrected.

The pages: the music player runs the title and effect drivers on the kit's
simulator and was compared write for write (539,221 writes); the levels page
draws the maps from the files and was compared with the emulator's first screen
of each level; the rebuilt frame was compared with the emulator's picture
(2,467 of 104,448 pixels differ, all explained). The cheat BABY AXE MAN was
found in `cheat_check` and typed live.
