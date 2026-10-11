# Toki — kit feedback

A Bronze run on a bank-switched cartridge, kept cheap at the contributor's
request (one agent, no subagents).

## Skill text that changed what I did

- `kit/skills/core/10-orient`: "Save the hand-over too": an execute checkpoint over $0200-$7FFF found the game's first RAM code at $51FB, and the comparison showed the play snapshot is the fuller image.
- `kit/skills/core/20-features`: "A hosted session's network policy can refuse every page fetch, on every site": features rest on search summaries, marked second-hand.
- `kit/skills/core/40-sweep`: "Registers *never* touched are as informative as those hammered": the SID writes by name stop at voice 1 because the driver indexes by voice, which the census table says.

## What was changed in the kit

None.

## Candidates

None.

## Maintainer asks

- **Say how a bank-switched cartridge is analysed.** `c64-reference` covers a 16 KB cartridge dump and freezer backups, but nothing says what to do with an Ocean-style cartridge whose banks are copied into RAM on demand: whether each bank is a part, how text that stays in a bank reaches the listing, and that the play snapshot's RAM is the image while the cartridge is hidden. Toki needed this decided before coverage can go further; a section in `kit/skills/c64/c64-reference` would settle it.
- **Let a game folder build without a listing.** `build.py` exits on a game folder with no `listing.json`, so even a page with nothing analysed needs the emulator and a snapshot. A tier-none page could build with no Source tab instead.

## What cost the most time

Compiling the disassembler with cargo; a prebuilt release would have saved it.
