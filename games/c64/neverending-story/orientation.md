# The NeverEnding Story — orientation

## Route and captures

Ocean disk release. Hard reset and autostart the first entry, NEVERENDING. Space leaves the title and starts loading Part 1. Allow the load to finish, then disable warp. Space dismisses the opening narrative and reaches the command prompt in the Great Forest.

`work/part1.vsf` is the opening narrative: all 4,277 imported code bytes and 142 word bytes match the supplied RAM image; 29 byte-data bytes differ as state. `work/part1-command.vsf` is the Source snapshot after dismissing the narrative. C64MEM RAM starts at offset 209. `reference/part1-command.png` records that state.

## Machine and scope

Processor port $36, direction $2F; IRQ $0314 points to $A7E0, NMI $0318 to $FE47. $DD00=$C4 selects VIC bank $C000. Picture phase $A7E3 uses screen $CC00 and bitmap $E000 with $D018=$38. Text phase $A80A uses $D018=$3E and authored charset $F800-$FFFF, which matches neither character-ROM half.

The wrapper $03A0-$03E0 exchanges $CC00-$CFFF with hidden RAM $DC00-$DFFF, calls the loader at $CC00, then exchanges back. Non-fill page $D000-$D0FF is unresolved. The game is in four parts (`kit/scripts/parts.py`): the title, then Part 1, Part 2 and Part 3, each loaded from disk. One is analysed, `parts/part-1`; the title, Part 2 and Part 3 have a folder and nothing in it but their name. The route above passes through the title to Part 1. Part 2 and Part 3 are separate loads outside the capture, and this file gives no route to them.

## Rebuild

Part 1's snapshots go in `parts/part-1/work/`. Use `symbols_import.py games/c64/neverending-story/parts/part-1 <snapshot>` on the Part-1 command-prompt snapshot, start its private project through `tools.py`, export with `symbols_export.py games/c64/neverending-story/parts/part-1`, and generate Source with `listing.py games/c64/neverending-story/parts/part-1 <snapshot>` on the same snapshot. The Ghidra export supplies annotations; it does not generate Source directly. No binary or snapshot is published.

## Review capture, 3 October 2026

VICE MCP v3.13.2 macOS arm64 passed 57/57 emulator checks, then ran with
`-console -sounddev dummy` through `tools.py vice x64sc-review`. The fresh
private `work/part1-review.vsf` supplies the rebuilt Source listing. The
three reviewed code spans and ICON_17 match the preceding listing.
The preceding code differs only at the already documented self-modified
capitalization byte $0AFF and action-handler operands $169A/$169B.
Seven data bytes differ; facts.md identifies them. Wait for each named
screen rather than relying on fixed loading batches. The earlier Linux
captures and their measurements above remain the original run's record.
