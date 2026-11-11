# Icicle Works: kit feedback

## Skill text that changed what I did

- `10-orient`: "Save the hand-over too": saved the unpacked entry before the title and room loader reused lower RAM, and built the listing from that stable source.
- `50-coverage`: "Know how far a description reaches": removed internal automatic aliases from typed data blocks so the ledger measured the intended complete spans.
- `60-verify`: "A test must contain cases that have to succeed": included successful water replacements and both magic-grid outputs in the original-code tests.
- `70-minisite`: "Draw from the memory the game draws from": used the live charset and screen for the rebuilt frame and compared all 64,000 pixels with plus4emu.
- `20-features`: "Read the manual, box copy": wrote the feature checklist from the original leaflet before annotating; this exposed the five-letter name limit and completed-room time differences.

## What was changed in the kit

- `kit/scripts/build.py`: a C16-platform listing with bytes above 16 KB gets a 64 KB memory diagram, so the supplied Plus/4 game's authored upper RAM appears. Stock C16 listings keep the 16 KB diagram.
- `kit/scripts/test_build_c16_span.py`: checks stock C16, upper Plus/4 RAM, and a listing record crossing the 16 KB boundary.

Visible tool failures are recorded in `agent-history.md`: the combined C64
footprint command requires VICE; the disassembler JSON batch rejects an
empty label; a snapshot argument needs its repository-relative game path.
These errors stopped their commands and needed no new silent-failure rule.

Ubuntu 24.04 x86_64 was already covered by the install notes. Reused local
tools, rebuilt plus4emu 1.2.11 (939e652) with the kit's patch, and used
regenerator2000 0.9.20. The C16 footprint was clean; all 46 emulator
capability checks passed. Cached Chromium was used for the browser checks.

## Candidates

None.

## Maintainer asks

None.

## What cost the most time

Allowing the disassembler's JSON batch to clear generated labels would have saved the repeated cleanup of aliases inside large typed data blocks.
