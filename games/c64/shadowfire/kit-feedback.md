# Shadowfire — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `10-orient`: "Save the hand-over too": the listing is built from `work/entry.vsf`, stopped on `$4000`, because the start-up then copies `$CA00`-`$CFFF` under the I/O chips and fills `$0400`-`$07FF` with spaces, so the play snapshot no longer shows those bytes as the tape loaded them.
- `50-coverage`: "Is the picture loaded or drawn?": comparing the hand-over with play showed the whole command panel already in the bitmap before the game runs, so rows 0-12 and their colours went in as authored data (`coverage.include`) and only the windows the game draws into were excluded.
- `50-coverage`: "Make the template choose its sentence from the record's own bytes": the generators for the 164 locations, 30 patrol scripts and 83 pictures write each comment from that record's exits, times and sizes; the sample found 1 of 20 generated comments wrong against 13 of 60 written by hand.
- `70-minisite`: "Porting a routine means reading every instruction of it, and the lockstep shows where that reading was wrong": the port was read against all 283 comments on the code it covers, and the 15 it showed wrong were corrected in `symbols.json` and counted in the `play` row of `accuracy`.
- `70-minisite`: "on thousands of random states made from real moments of play": `port/test/check.js` ran each routine that way before the lockstep met it, and most of the port's own mistakes showed there first.

## What was changed in the kit

- `kit/skills/c64/c64-reference`, "SID essentials": now says that `$D400`-`$D418` read back the data bus, points at the measurements in `kit/c64/sid_bus.py`, and says to test a driver that reads its own registers with `createBus`. The fact was measured for the kit before (#194) but the reference, where an agent porting a sound driver looks, did not say it. It would have mattered in `games/c64/jumpman` and `games/c64/castle-master`, whose drivers read SID registers back too; this game's driver sets each note's gate with an `INC` of the control register (`$1662`), and a first probe that answered SID reads with 0 played every note silent.
- `kit/c64/lockstep.js`: a byte an interrupt read and wrote back unchanged (the 24 zero-page bytes Shadowfire's handler saves and restores) goes back to the port's value after the replay, so the port's drawing keeps its own pointers. Test 19 in `kit/c64/test_lockstep.js`.
- `kit/c64/lockstep.js`: a raster wait's exit counts only when the main program has read `$D011`, `$D012` or `$D019` since its last stop, so an exit that also heads the loop after the wait (the portrait roll's copy at `$49AE`) is one stop a wait, in the run and in the copy of the machine it runs on ahead for `irqBytes`. Test 20.
- `kit/c64/lockstep.js`: a `{ cycles: 0 }` yield is a place where a page's clock may stop inside a long routine, and is passed over: the game is not run on, and its input waits for the next stop. Without it, each such yield in Shadowfire's drawing ran the game a stretch ahead with the joystick of that moment. Test 21.

## Candidates

- **A comment on a table describes its writer; the bug is in its reader.** Three of the sample's findings were bugs that the hand-written comments described as working: an eight-entry damage table of which the reader only ever uses entry 0, a search for enemies that runs eight records past the end of its table, and a portrait roll that never copies line 0 of each cell. In each case the comment said what the writing routine meant, and the checker found the bug by running the reading routine on the simulator. A rule in `50-coverage` would say: when a routine fills a table for several cases, read the code that reads it and check the index reaches every entry before writing what the table is for. No other game folder could be named where this happened, so it stays here.
- **Pay a long routine's cost only up to the end of the frame.** The Play page's clock charged what a routine had cost so far whenever it called another, all at once, so one long routine (the iris opening, 34,000 cycles) ran the clock past the frame's end, and the next frame's interrupt read the joystick late. Paying up to the frame's end and carrying the rest fixed it. A rule in `70-minisite/play.md`, "The page's clock", would say so; no other game folder could be named where this happened, so it stays here.
- **Fit an interrupt's once-a-frame routines into its base.** Fitting each of the interrupt's routines its own cost by least squares gave nonsense for those called once every frame, since their counts never vary apart from the base; folding them into the base, and timing the rest alone, gave costs within 4,000 cycles. The same rule would go in `play.md` beside the last one, with the same bar.

## Maintainer asks

None.

## What cost the most time

The annotation's hand-written comments, 13 of 60 sampled wrong, cost a round of fourteen corrections plus fifteen siblings, and the change that would have saved the most is running each routine that fills or reads a table on the simulator while annotating it, as the checker did, instead of only reading it.

For the Play tab, the page's pace cost the most: fitting each routine's cost to the game's and finding why the clock ran late took longer than porting the routines.

## Operating system and tools

- Linux x86_64, Ubuntu 24.04.5, in a cloud container. VICE v3.13.2 (`v3.13.2-linux-x86_64-gui.zip`) under the kit's virtual display passed 57 of 57 checks; regenerator2000 0.9.20.
- The tape (`Shadowfire.tap`, `C64-TAPE-RAW` version 1) loads in about 240 seconds with warp on. Its turbo blocks are not a format the kit decodes: the run wrote its own decoder in `work/` (pulses of about 272 cycles for 0 and 528 for 1, least significant bit first; a pilot of `$E3`, sync `$ED`, start, end exclusive, data, and a `$44` trailer). The game then reads nothing more from tape, so the hand-over snapshot was enough and the decoder only mapped the blocks onto memory.
