# Labyrinth — kit feedback

## Skill text that changed what I did

- `tool-vice-mcp`: "Protected originals (`.g64`) need the drive's own processor.": tried the installed full-drive defaults before changing resources; the original loader reached playable text adventure without a config override.
- `10-orient`: "A game whose interrupt handlers chain": captured a frame instead of treating the first IRQ-vector read as the complete display engine.
- `c64-reference`: "RAM the CPU cannot see": rendered the RAM font beneath I/O and checked the $DE12 caller’s banking before describing that routine.
- `tool-regen2000`: "The flow tracer can wander into text.": kept the mixed code/text overlay split into inspected regions rather than typing the whole file as text.

- `70-minisite`: "A widget that runs a mechanic is a claim too.": compared the dialogue explorer with the original parser in the kit’s 6502 simulator before publishing its behavior; the passage stepper also checks every displayed prefix against that parser.

## What was changed in the kit

None. No kit or shared site file changed.

## Candidates

None. Existing instructions covered the banking, mixed text, protected-disk, and misleading wait-loop cases. The continuation’s mistaken wait-loop interpretation was corrected by controlled input and a trace; `10-orient` already requires sampling the program counter and proving that play advances.

## Maintainer asks

None. The contributor reserved opening the pull request; no issues were filed.

## What cost the most time

A faster frame-capture transport would have saved the most time; both complete captures succeeded, and no new correctness rule was needed. During the continuation, following the requested disk side and sending Space resolved a modal disk prompt; this game-specific behavior is recorded in orientation.md and agent-history.md. The split-pointer alias problem was caught by check_listing.py, so it needs no new skill rule. The character test encountered the lib helper’s side-effect-only return; its source and header describe globalThis, and this visible error needs no new rule.

## Environment

macOS arm64; installed VICE MCP release v3.13.2 GUI, 57 of 57 emulator checks; existing regenerator2000 0.9.20; Python 3.9 with Pillow 11.3.0 for the glyph sheet. Tools were started through the kit launcher. No software installation was needed. The actual snapshot, copied disks, extraction output, and disassembler project stay under ignored `work/` folders.

## Word-wheel continuation

The coverage pass kept the quantity formatter’s colon boundary as an open reachability question, following `50-coverage`’s instruction to note inputs the player was never meant to supply. Direct simulator cases corrected the carry-dependent highlight description and single-byte quantity arithmetic before completion. These are covered by the existing boundary-checking and reachability rules; no kit change or maintainer ask is needed. The live probe preserved and restored the emulator state, and all raw state remained in ignored work files.

## Opening response continuation

The listing-backed GO HOME test caught missing bytes in an incompletely typed table before the viewer could ship. Naming and typing both halves made the full mixed destination/message records explicit. The failure was visible and existing table-typing guidance covers it; no shared-kit change is needed.

The dictionary regression also caught regenerated colour-RAM aliases cutting through the hidden-RAM pointer table after the new data typing. The existing tool skill describes this alias behavior; clearing those aliases after typing restored the complete table. This is another visible regression caught by an existing test, not a reason for a new skill rule.
