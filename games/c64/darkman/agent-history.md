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
