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
