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

## Gold pass 2 (26 October 2026): the stages as parts

- **A game whose loader writes one set of addresses five times is five parts, and the snapshot of the first one hides it.** Toki was listed as one image with stage 1 in play. The stage loader writes a character set at $C000, code at $BD76 and a block at $0C01 for each stage; comparing the five play snapshots showed the same table at $B382 reaching different code in each. `15-parts` says this in general ("Resident code ... add each load with --over"), but it takes the directory entries to know the ranges, and the ranges are not the same for any two stages.
- **A patch routine named by the stage variable puts the patched bytes in the wrong stage.** The patcher at $4DDB counts stages from 0, so the routine that patches the second stage was named `stage1_patch`, and every byte it wrote was documented as part of stage 1's data (script words, animation entries, path data). Only the five snapshots, each read after its own patch, showed that most of them were section-record fields of Stages 3 and 4 and the timed-step tables of Stage 2; the rest are state bytes in the stage code area ($BF22-$BF25 for Stage 4, $BFFE-$C007 for Stage 3), map row 19 of Stage 3, and animation-data bytes ($2D32 and $2E87 for Stage 2, $30CA-$30DA for Stage 3). The names now follow the player's numbers.
- **Splitting a game into parts drops every bare address link in the hand-written pages.** `site.js` sends a bare `<code>$XXXX</code>` to the page named by the nearest `data-part`; with none it goes to `source.html`, which a game of parts does not have as a listing. Adding `data-part="resident"` to `<main>` restored them. The build said nothing about it.
- **Hosted sessions need no cartridge image for this.** The five snapshots (made with the stage-skip cheat) were enough to find every range; the directory's destinations and lengths came from the earlier static read.

## What was changed in the kit

None.

## Candidates

- `15-parts`: when stages or levels are loaded by the game's own loader over the same addresses, read the loader's destination and length table first and give each load its `ranges` from it, not from a byte comparison of the snapshots (the comparison also finds run-time state, which is about three times larger). Seen in Toki only.
- `10-orient`: a hand-over from the stage-skip cheat gives a snapshot of every stage, which is what `15-parts` step 2 asks for. Toki only so far.
- `70-minisite`: say that a hand-written page of a game with parts needs `data-part` on its container for address links. Toki only so far; Lemmings' pages carry it already.

## Maintainer asks

- **Say how a bank-switched cartridge is analysed.** `c64-reference` covers a 16 KB cartridge dump and freezer backups, but nothing says what to do with an Ocean-style cartridge whose banks are copied into RAM on demand: whether each bank is a part, how text that stays in a bank reaches the listing, and that the play snapshot's RAM is the image while the cartridge is hidden. Toki needed this decided before coverage can go further; a section in `kit/skills/c64/c64-reference` would settle it.
- **Let a game folder build without a listing.** `build.py` exits on a game folder with no `listing.json`, so even a page with nothing analysed needs the emulator and a snapshot. A tier-none page could build with no Source tab instead.

## What cost the most time

Compiling the disassembler with cargo; a prebuilt release would have saved it.
