# Into the Eagle's Nest — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite/play.md`: "Run the page's runtime in node from the cold start before opening a browser": the first such run stopped at once, the clock never moving with no costs measured, and the pace check built on the same run then found the page reaching play 28 frames early, neither of which a browser would have said anything about.
- `30-text`: "First rule out an offset": searching for the differences between the letters of a word the game shows found its stored text in one pass, in plain ASCII, after a search for screen codes had found nothing.
- `60-verify`: "When you measure with breakpoints, put one on a routine you know runs": the checkpoint on the interrupt proved the instrument was alive while the one on the damage routine stayed at zero, which is what let "nothing but a guard's step hurts the player" stay a measurement rather than a guess.
- `70-minisite`: "Port the routine, then test the port against the game itself": the test caught the music driver taking the tune's first notes a tick late, after 1,802 calls that matched.
- `c64-reference`: "Multicolour character mode uses bit 3 of the colour nibble": in the second pass it explained what the contributor saw wrong on the pages, walls and panel letters drawn as multicolour, and gave the rule every drawing on the pages now follows, checked against the recorded frame's colour RAM, where all 588 play-area cells take their colour from the tile table.

## What was changed in the kit

- `kit/skills/core/30-text`: the note on inverted fonts now says to render such a set to a picture and never to a text dump of 8×8 cells, because the dump draws the set pixels and an inverted letter then reads as a block of dither. `games/c64/the-goonies` stores its font inverted too, and `kit/lessons/2026-10-26-into-the-eagles-nest.md` has the case.
- `kit/skills/c64/steps`: the `snapshot` row said the hand-over is "`work/entry.vsf`, which `listing.py` takes by default", which reads as though the snapshot argument could be left out. It cannot: only `--entry` defaults. The row now says which argument defaults and shows the call.
- `kit/skills/core/50-coverage`: a new bullet, "Bytes no instruction reads may still be read", says to check what reaches the video chip's pointers, the loader's writes included, before calling a range unused. This game's 1,000 bytes at `$8C00` were described as spare tiles because no instruction reads them; they are the title picture's screen colours, and the tape itself writes the registers that point the chip at them. `games/c64/fist-ii-the-legend-continues` keeps data at `$D000`-`$DFFF` that only the video chip reads, the same case.
- `kit/scripts/build.py`: the tab bar now always closes with Source code and About. This game's `tabs` listed only three pages, and the build dropped the Source and About tabs from the bar without a word, so the listing and the record of its sample could not be reached; the minisite skill says the bar always closes with them. `test_build_next_tab.py` has the case.
- `kit/c64/INSTALL.md`: the note that recommends `Sound=0` in VICE's `vicerc` for speed now says what sound off breaks. With it off, VICE answers `$D41B` and `$D41C` with the low byte of its cycle counter, which `kit/c64/tools.py` already said, so a game that takes its dice from voice 3's noise gets a ramp. This game's table of random numbers was a ramp in every snapshot, and on it a chest never opens on explosives; the page's chest widget showed that, and the contributor questioned it. A snapshot saved with sound off also fails to restore the SID with sound on ("Cannot initialize SID engine", VICE v3.13.2).
- `kit/skills/c64/c64-reference`, "SID essentials": a paragraph on `$D41B` as dice. The noise steps every 2^20 / frequency cycles, so a table filled by a tight loop has neighbours that are alike, and odds that combine two neighbouring bytes are not what the code reads as; work them out from a table read with the chip running. This game's chests read as one in eight jewels and one in eight explosives and measure about one in seven and one in ten.
- `kit/c64/lockstep.js`, for the Play tab's port: a stand-in (the game's own code run for a routine no group has ported) now runs on the banking the port keeps in `P.cpuPort` and writes back what it changes; this game moves `$01` between `$37`, `$36`, `$26`, `$30` and `$00`, and a stand-in fixed at `$35` read the chips where the game read RAM. `standIn` passes `kernal` and `hooks` through, for a handler the KERNAL's entry at `$FF48` reaches, and `standInGen` takes `until`, the addresses where a stretch that goes on by JMP (an attract loop that jumps into the game) is stopped. `test_lockstep.js` has the cases.
- `kit/c64/lockstep.js`: a replayed interrupt handler gets the SID values the game's handler read, as it already did for the raster, the interrupt flags and the collisions. A write-only SID register reads the data bus, which fades with time and halves with each read, so a replay that reads later reads something else: here a shot that flies off the end of the map reads the SID as tiles, and the game saw air where the port saw a wall, which the explorer's lockstep found. `test_lockstep.js` has a handler that reads the bus after it has faded, and fails without the change.


## Candidates

The next run that meets one of these can make the edit; this run could
name only its own game for each.

**Cost an interrupt by the routines it calls, not by its state.** For
`kit/skills/core/70-minisite/play.md`, "Pace it by the machine's clock".
A handler whose work follows the play (the figures it steps, the shots it
follows) costs differently in one state from one session to the next, so
a cost per state runs the page at the pace of the sessions it was
measured on: here 5.6 % slow with medians and 7.9 % with averages, and
1.8 % after a fit of a base per state and a cost per routine over the
port's calls inside each handler. In the same paragraph, a stretch that
ends at a delay's own cycles is charged what the game took beyond them,
or the work before the delay's first turn is lost (22,399 cycles of the
briefing here).

**Yield before a call that starts something.** For the same file. The
page charges a stretch after the port has run all of it, so an interrupt
installed after a long build in one stretch runs through the build's
cycles. Here the wipe was shut before the game's had begun and the page
reached play 28 frames early; a checkpoint at the `JSR` that installs
it put the page 2 frames from the game.

**Read a number out of memory, not off the emulator's picture.** This
game's font draws a 9 with a flat top, and at the emulator's 384 pixels it
reads as a 5. The ammunition a mission starts with was written down as 59
three times, in `features.md` and in two comments, before the byte at
`$02BD` settled it at `$99`. It was caught by reading the panel's two
cells, which both held the same code, so the two digits could not have
been different. A line in `60-verify` under "Measuring without fooling
yourself" would say that a number a page is going to quote is read from
the variable or the screen's own cells, and that a screenshot is for
seeing which screen it is.

**A helper script must not take a standard library module's name.** A
`dis.py` written into the game's `work/` shadowed Python's own `dis`, and
the failure surfaced in unrelated scripts, through `traceback`'s import,
as an error naming the wrong file. `python3 -I` does not help, since it
also drops the path the kit's own modules are found on. It cost a
confusing ten minutes. A line where the skills first tell an agent to
write helper scripts, in `50-coverage` or in `tool-regen2000`, would say
to keep away from the standard library's names.

**A correction is a new reading, and needs checking as one.** The
sample found that tiles `$5E` to `$6D` were chests, not soldiers, and the
correction was written from the one routine that opens a chest. It gave
the page a one-in-eight chance of an explosion that ends the game, which
the rest of the code rules out: the explosives in a chest go off only when
the open chest is shot again. The contributor noticed, having never once
been blown up. A line in `60-verify`, after "A wrong comment is usually
one belief written down more than once", would say that a correction
reads every routine that touches what it describes, and is seen in the
game when it reaches a page.

**Draw in the mode the chip draws in.** The page's own tile drawing drew
every cell in multicolour, so the walls, which the game draws hires, came
out as stripes, and so did the panel's letters. The machine reference has
the rule (bit 3 of the colour nibble picks the mode per cell), and the
page's rebuilt frame, drawn by the site's renderer, was right all along;
nothing compared the one with the other. A line in `70-minisite` beside
"Draw from the memory the game draws from" would say to take each cell's
mode from the colour memory the chip reads, and to compare one widget's
drawing with the recorded frame.

- **`forCycles` runs the game too far while interrupts come (open).** A port's routine that yields
  `{ cycles: n }` for a long delay (here the 1.3-second `short_delay` at `$5FDA`, 255 yields while
  the play interrupt ran 138 times) had the lockstep run the game 13,856 cycles past the 1,302,037
  of its own work, about 100 cycles an interrupt, on into the routine after; the replay then fell
  in the wrong place and a byte differed three delays later. The lockstep's own counters give the
  game's work inside the delay as 1,302,031 cycles, so the overrun is in `forCycles`' count while
  interrupts run through the KERNAL's entry, which reading the code did not explain. The port works
  round it by yielding `{ cp, cycles }` with a checkpoint at the delay loop's head. A test that runs
  a long `{ cycles }` yield on a machine whose interrupts go through `$FF48` would show it.

## Maintainer asks

None. Both gaps this run met are in "Candidates" above, waiting for a
second game to justify the edit.

## What cost the most time

Reading an inverted character set as a text dump instead of as a picture,
which is the change made to `kit/skills/core/30-text` above.

In the second pass, on claude-opus-5-5 after the contributor's review,
putting an open chest in front of the player: the map address the first
attempt used was a guess and landed elsewhere, and the chest was found
only by stopping the machine where the game itself computes the address
of the tiles round the player (`$5C6A`).

## Tools and the operating system

Windows 11 Pro with the repository in a WSL2 Ubuntu clone, as the earlier
C64 games on this machine were done. The emulator is an own build of
vice-mcp v3.13.2, commit 1e83aab134, which passed all 57 of
`check-emulator`'s checks. `kit/c64/INSTALL.md` needed nothing.

Two notes for anyone driving the kit from Windows through `wsl.exe`:

- `wsl.exe -d Ubuntu -- bash -lc "..."` is parsed by the Windows shell
  first, which eats `$VAR`, backticks and even `\$`. Anything with a
  dollar sign, a backtick or a loop in it goes in a script file, run as
  `wsl.exe -d Ubuntu -- bash <path>`.
- The `vice` MCP server is down at the start of such a session, as
  `tool-vice-mcp` says it will be, because the emulator is started later.
  `python3 kit/c64/vice.py` drove the emulator for the whole run instead,
  and did everything this run needed.
