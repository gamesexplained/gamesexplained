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

## Ticket continuation

The reference scan exposed that the table-dispatched handlers had not been typed as code. Explicit disassembly from the verified command pointers recovered them. Existing `50-coverage` guidance on following computed dispatch already covers this case; no new rule is needed. The lower recalculated percentage is retained, with the newly exposed code left in scope.

The game’s ticket test now checks the recovered command entries are listed as code as well as executing their bytes, making that regression visible without a new shared rule.

## Popcorn continuation

The verification skill’s instruction to test cheap claims led to executing the shared debit rather than stopping at the local subtraction. The existing passage test supplied the correct instruction-hook pattern for newlines. The failure was caught during the test; no kit rule or maintainer ask is needed.

## Dialogue coverage continuation

The coverage skill’s instruction to take the largest undescribed run led to the bounded text records rather than many small command branches. Its warning about `$A000` cutting a data description required a continuation label, and its rule that a generated comment is a repeated claim led to checking all 54 outputs against the original parser. Existing guidance covers the work; there is no shared-kit edit or maintainer ask.


## Opening-only completion

`50-coverage`’s “Is the picture loaded or drawn?” required a fresh pre-setup snapshot and explicit producer checks for generated memory. Its loaded-data audit prevented the unreferenced retained extents from disappearing from scope. The instruction to follow patched/computed targets recovered the remaining API and raster entries. `60-verify`’s “a negative result is a claim about your search” kept the opaque ranges visible with qualified results rather than inventing a use or excluding them. `70-minisite` kept the complete 127-record reply viewer tied to the original parser.

The tests caught an event-state field-name reversal, readonly constants described as mutable state, and a tenth colour-match entry whose success flag needs the caller’s range check. These corrections follow existing instructions. No shared-kit change or maintainer ask is needed. All new helper and test fixtures hold annotations, selected data or digests; machine images and tool state stay ignored. The listing has no independent accuracy sample, and the purpose of the explicitly opaque bytes remains open.


## Popcorn-change continuation

`60-verify`’s “A negative result is a claim about your search” led to re-reading the phase and quarter bytes instead of accepting their existing no-reference comments; the comments were wrong and have been corrected in place. `70-minisite`’s “A widget that runs a mechanic is a claim too” led to comparing the page’s actual transition function with the original handlers over 7,995 cases and with twelve live observations. The existing rules cover both failures; no shared-kit change or maintainer ask is needed. The later popcorn-offer test isolates the branch and leaves complete transition timing explicit.


## Workflow-diagram continuation

`70-minisite`’s “A widget that runs a mechanic is a claim too” kept the map tied to original direction and purchase decisions. Checking the diagram’s proposed paths corrected the draft’s implied direct trip from the popcorn counter into the theater. Existing guidance covers this; no kit change or maintainer ask is needed.


## Gate continuation

`60-verify` required positive controls for the negative breakpoint result; movement checkpoints fired while the hypothesised generic exit did not. A store watch identified the real deferred transition. `70-minisite` required the diagram to execute a checked mechanic, leading to exhaustive classifier/threshold comparisons and original delay/dispatch tests. Existing guidance covers these findings; no shared-kit change or maintainer ask is needed. The missing natural hand-over remains explicit.


## Introduction sequence continuation

`60-verify`’s distinction between isolated execution and player reachability prevented stored speech from being presented as a fully observed gate conversation. `70-minisite`’s widget-check rule led to original-parser comparisons and exhaustive phase/countdown cases. Existing guidance covers this; no kit change or maintainer ask is needed.
