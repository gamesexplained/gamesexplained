# Toki — kit feedback

A Bronze run on a bank-switched cartridge, kept cheap at the contributor's
request (one agent, no subagents).

## Skill text that changed what I did

- `kit/skills/core/10-orient`: "Save the hand-over too": an execute checkpoint over $0200-$7FFF found the game's first RAM code at $51FB, and the comparison showed the play snapshot is the fuller image.
- `kit/skills/core/20-features`: "A hosted session's network policy can refuse every page fetch, on every site": features rest on search summaries, marked second-hand.
- `kit/skills/core/40-sweep`: "Registers *never* touched are as informative as those hammered": the SID writes by name stop at voice 1 because the driver indexes by voice, which the census table says.

## Gold pass (25 October 2026)

- **Page prose written by a model that is not proven needs an independent check before it is pushed.** The first draft of the Controls, Gameplay, Music, Discoveries, and frame sections had 16 wrong claims when a checker on another model read it against the code. Examples: a table offset read as the third tune set when it was the second, a lives count that left out the life each round takes, and a counter named a power level. A script that compares each `<code>$XXXX</code>` cite with `symbols.json` caught only the cites that were not symbol starts.
- **A stage-skip cheat gives the other stages for free.** `kit/skills/core/50-coverage` does not say that a game with a skip can reach later stages with a joystick script, which gives screenshots, snapshots, and maps for every stage in minutes. This pass reached all five that way.
- **The emulator needs libraries outside the repository in a fresh container.** `get-vice download` names them, and `kit/c64/INSTALL.md` gives the apt line. A virtual display (Xvfb) is also needed before `tools.py vice` starts the GUI build. The install worked on Ubuntu 24.04 in a container.
- **Map pages follow from the game's own tables.** A game that scrolls over a block map (row pointer tables, a block table of characters, a character colour table) can have every stage drawn from a snapshot with about 60 lines, and the result is the most useful picture the page has. `kit/skills/core/70-minisite` lists a Maps / levels tab but not how to find the tables.

## What was changed in the kit

None.

## Candidates

None.

## Maintainer asks

- **Say how a bank-switched cartridge is analysed.** `c64-reference` covers a 16 KB cartridge dump and freezer backups, but nothing says what to do with an Ocean-style cartridge whose banks are copied into RAM on demand: whether each bank is a part, how text that stays in a bank reaches the listing, and that the play snapshot's RAM is the image while the cartridge is hidden. Toki needed this decided before coverage can go further; a section in `kit/skills/c64/c64-reference` would settle it.
- **Let a game folder build without a listing.** `build.py` exits on a game folder with no `listing.json`, so even a page with nothing analysed needs the emulator and a snapshot. A tier-none page could build with no Source tab instead.

## What cost the most time

Compiling the disassembler with cargo; a prebuilt release would have saved it.
