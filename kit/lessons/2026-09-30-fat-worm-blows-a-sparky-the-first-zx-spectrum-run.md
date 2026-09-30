## next · 30 September 2026 · Fat Worm Blows a Sparky, the first ZX Spectrum run · yozlet with Pi (DeepSeek 4.1 Flash)

**A control file is not a flow tracer.** The kit's first Spectrum game
annotated through a SkoolKit control file, and `sna2skool.py` disassembles
only the bytes a `c` block tells it to. With no disassembler walking the
code and minting block starts, the code had to be separated from the data
before any block could be typed. Two cheap sources did it: the emulator's
executed-address map (ZEsarUX's `cpu-code-coverage get`), which finds the
code that runs including everything reached by `jp (hl)`; and a recursive
trace from the entry points, which adds what a static walk can reach.
Everything neither found is data, unless `refs` says a routine reads it as
a table. `50-coverage` now has the step, and the ZEsarUX skill has the
command and its traps.

**When the game overwrites its own screen, the hand-over snapshot is the
disassembly base.** This game's play snapshot differed from its entry
snapshot in 10424 bytes: over the entry stub, the loader and the init code
the game had written its variables, so the play image disassembled as
data. `10-orient` says to take the hand-over snapshot; what this run adds
is that where the two disagree, it is the hand-over image to build the
listing from, with the play image passed as the second (`--entry`) image —
not merely a cross-check on the play one.
