# Labyrinth — kit feedback

## Skill text that changed what I did

- `tool-vice-mcp`: "Protected originals (`.g64`) need the drive's own processor.": tried the installed full-drive defaults before changing resources; the original loader reached playable text adventure without a config override.
- `10-orient`: "A game whose interrupt handlers chain": captured a frame instead of treating the first IRQ-vector read as the complete display engine.
- `c64-reference`: "RAM the CPU cannot see": rendered the RAM font beneath I/O and checked the $DE12 caller’s banking before describing that routine.
- `tool-regen2000`: "The flow tracer can wander into text.": kept the mixed code/text overlay split into inspected regions rather than typing the whole file as text.

## What was changed in the kit

None. No kit or shared site file changed.

## Candidates

None. Existing instructions covered the banking, mixed text, and protected-disk cases.

## Maintainer asks

None. The contributor reserved opening the pull request; no issues were filed.

## What cost the most time

A faster frame-capture transport would have saved the most time; the complete capture succeeded, and no new correctness rule was needed.

## Environment

macOS arm64; installed VICE MCP release v3.13.2 GUI, 57 of 57 emulator checks; existing regenerator2000 0.9.20; Python 3.9 with Pillow 11.3.0 for the glyph sheet. Tools were started through the kit launcher. No software installation was needed. The actual snapshot, copied disks, extraction output, and disassembler project stay under ignored `work/` folders.
