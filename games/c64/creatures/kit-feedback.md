# Creatures — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/core/10-orient`: "Code that is the same at the same address in every part is resident: make it a part of its own": the engine became a part of its own, and every stage's load lies over it.
- `kit/skills/core/10-orient`: "A load can also lie over a part that has ranges of its own and write some of them again": the attract and shop blocks lie over the engine's $E000-$F1FF, and the second level of each world over the first level's $8700-$99FF.
- `kit/skills/core/70-minisite`: "A widget that runs a mechanic is a claim too": the creature gallery and the music player are ports, and both are checked against the engine's own code in the simulator (`test_gallery.js`, `test_music.js`) rather than by eye.
- `kit/skills/core/50-coverage`: "A data span also stops at the fixed edges of the memory map": a run of untracked bytes at $8000 was a table crossing that edge, and got a second label there rather than a range left bare.

## What was changed in the kit

- `kit/scripts/listing.py`: a listing built from the hand-over snapshot itself now lists the loaded data no label reaches, as one built from a play snapshot does. It compared the snapshot with a hand-over only when the two were different files, so a build from `work/entry.vsf` printed nothing; this game's parts reached 100 % with about 60 KB of their data outside the count and the listing, found late in coverage by running the comparison against each part's play snapshot by hand. With the change, the picture, which has no play snapshot, and eight bytes of the engine that play rewrites came up in four stretches that comparison had not shown; each `part.json` now says what they are. Other games build their listings from `work/entry.vsf` too (games/c64/armalyte, games/c64/commando, games/c64/mayhem-in-monsterland). Test: `kit/scripts/test_listing_handover.py`.
- `kit/skills/core/50-coverage`: "Data the ledger cannot see" says what that list holds for a listing built from the hand-over, and that `--entry` with the play snapshot narrows it; games/c64/mercenary's feedback describes the same case.
- `kit/scripts/listing.py`: a run of fewer than eight untracked bytes between two data records is named at build time. Such a hole is usually a table's or a script's last bytes past its label's reach, and nothing reported it: the coverage report names only stretches of eight bytes or more, and the ledger counts neither the bytes nor their absence. Here they were the last bytes of three animation scripts the gallery reads; the committed listings of other games hold 79 such holes (games/c64/chiller 18, games/c64/gauntlet 7). Test: `kit/scripts/test_listing_data_gaps.py`.
- `kit/scripts/listing.py`: the warning that a part's snapshot does not hold the part beneath now asks to widen `"ranges"` only when three or more instructions in a row differ, as when a load replaces code. Code that rewrites itself changes operands and single instructions, and every part of this game printed the warning for 109 to 160 bytes of the engine's self-modified operands and flipped branches, so the one part where a load does replace code read as more of the same. Those differences are now one line saying so. Test: `kit/scripts/test_parts.py`.
- `kit/skills/core/70-minisite`: "Start each case where the game starts it, and feed it what the page feeds it", from games/c64/uridium's candidate on its sound test and this game's gallery; lesson `kit/lessons/2026-10-14-creatures.md`.
- `kit/c64/frame.py`: a frame captured with the KERNAL banked out (`$01` = `$35`) and no cartridge was taken for an Ultimax cartridge. VICE's cart bank reads what the processor sees there, the RAM, so the check that the processor's `$F000-$FFFF` matches the cart bank and differs from the KERNAL ROM passed, and the page's drawing took the game's RAM at `$F000` for the video chip's `$3000-$3FFF`: the shop's 16 witch sprites at `$7B00` were drawn from `$FB00`. The check now also asks that it differ from the RAM. Test: `kit/c64/test_frame_ultimax.py`.
- `kit/c64/frame.py`: `capture --watch $lo-$hi` records the writes to a range of RAM during the frame, as the sprite pointers' are. The shop inverts the digits of its character set at line `$5A` and back at `$CA`; the capture held the character set only as the frame ended, so the drawing showed the digits between those lines the wrong way round, and `compare` put the error in that band of lines.

## What the run met

- VICE's `snapshot_load` refuses a second file under a name it has already loaded ("a different snapshot with the name 'play'"). `kit/c64/vice.py` raises on it; a capture script of my own that called the server directly went on after the refusal and recorded the same machine three times. Copying each snapshot to a name of its own fixed it.
- Two disassembler sessions started at the same moment took the same port, and the second failed with "Address already in use". Started one after another, each part got its own.
- A scratch script named `typing.py` in the working folder shadowed Python's own module, and every later script that imported PIL failed.
- Routes that jumped to the game's stage loader from a play snapshot sometimes hung in the KERNAL; restarting VICE (`tools.py stop vice`, then `tools.py vice`) cleared it. A route that skips a torture chamber's exit leaves the engine branches the chamber flips (`orientation.md`); a capture of the next chamber from such a route drew a broken panel, and the chamber's own Get Ready snapshot did not.
- Skipping chamber 1's exit the same way left the engine settings it puts back, and every stage after it ran its main loop at one pass every two frames, so its spawn records fell behind the landscape. Nothing looked wrong on the screen; it showed only when a run counted the records read against the scrolling (`orientation.md`).

## Candidates

- `kit/skills/core/50-coverage`, a long reach that takes in the next table: a label of my own on a table of tile addresses reached 1024 bytes, through a block of strings and the weapons tablet's shapes after it, so all of them counted as explained under the tile table's description. It was found while reading the listing for the page, not by any report. The rule under "Know how far a description reaches" would add: after labelling the last table in a typed block, check where the next label is, and give each table after it a label of its own. Only this game shows it so far.

- `site/lib`, a machine for pages that run a game's own code: the shop and the ending widgets here each needed a 6502 with the video chip around it, and the ending's copies `kit/c64/machine.js`'s raster interrupt and its model of the cycles the video chip takes (the `cr-end` block), because `machine.js` is for node and `site/lib/c64.js` only draws. Without those cycles the ending's colour splits came up to 33 cycles early. A small machine in `site/lib` beside `renderFrame` would give the next page both. Only this game shows it so far.

## Maintainer asks

- **Give `accuracy` a row for comments a widget's check corrects.** The stage maps' check against the emulator compared the game's band colours at every spawn record with the map's, and so showed that five of the engine's comments on those colours (`$12BE`-`$12C2`) named the wrong VIC register and ten more (`$12C4`-`$12CE`) named none. The run corrected all 15, but `game.json`'s `accuracy` has no step for it: `play` is a port of the whole game for the Play tab, and the other steps are research, annotation, samples, audits and maintainers' checks, so the ledger does not show the fix. Letting `play` cover any port a page checks against the game, or adding a step for it with `fixed`, in `kit/scripts/accuracy.py` and `kit/skills/core/60-verify`, would let a run record it.

## What cost the most time

The hand-over check in `listing.py`, fixed here: with it, the data outside the count would have shown up part by part as each was annotated, rather than at the end, when every part had to be labelled, exported and listed again.

## Operating system and tools

Linux x86_64 (Ubuntu 24.04 container, no display); VICE vice-mcp v3.13.2 (all 57 `check-emulator` checks passed); regenerator2000 0.9.20; node 22; Chromium from Playwright for the browser check.
