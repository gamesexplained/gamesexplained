# The Sacred Armour of Antiriad — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A widget that runs a mechanic is a claim too": I ported `build_room`, `place_room_sprites`, `draw_title_screen` and the sound driver into the pages and wrote `test_rooms.js` and `test_music.js`, which hold them against the game's own routines on the kit's 6502 for all 69 rooms and every button of both sound players.
- `60-verify`: "every other comment that says the same thing": the sample found one generated sentence wrong in one room's sprite list, and I corrected it in all seven room lists that put creatures after a striped one; its other generated finding, in one splash's animation, I corrected in all three splashes.

## What was changed in the kit

- `kit/c64/frame.py`: `-h` or `--help` after a subcommand prints the usage. Before, `frame.py capture -h` captured the running game's frame into files named `-h` and `-h.png` in the current folder. `kit/c64/test_frame_help.py` holds it, and fails on the old code.
- `kit/c64/frame.py`: its usage says a register's value is as the chip reads it back, unused bits set, and that a note quotes what the game stores. The lesson is `kit/lessons/2026-10-24-the-sacred-armour-of-antiriad.md`.
- `kit/skills/c64/c64-reference`, "VIC-II essentials": lists the VIC bits that read back as 1 and says to take a register's value from the instruction that stores it. It would have mattered in `games/c64/shadowfire` and `games/c64/spy-vs-spy`, whose orientation notes both say `$D01A` = `$F1` where the game stores `$01`. The lesson is `kit/lessons/2026-10-24-the-sacred-armour-of-antiriad.md`.
- `kit/c64/INSTALL.md`, Linux, "The release zip": a machine without `sudo`, such as a cloud container, can unpack the packages it lacks into `tools/vice-libs` with `apt-get download` and `dpkg-deb -x`, and the nine this container needed are named. The notes said only that the contributor runs `sudo apt-get install`, which an unattended run cannot do; the launcher already read `tools/vice-libs` for the Ubuntu 26.04 case.

## Candidates

None.

## Maintainer asks

- #535: Correct the `$D01A` value in Shadowfire's and Spy vs Spy's orientation notes

## Where the kit cost time

- **`frame.py capture -h`** wrote a frame of the running game into `-h` and `-h.png` at the repository's root instead of printing the usage. Fixed above.
- **The first recorded frame** differed from the emulator's picture in 163 pixels, all in the animated tiles, whose characters the game rewrites while the beam draws. The usage of `frame.py capture` already says what to do: `--watch '$7000-$7FFF'` brought it to 0.
- **Full-page screenshots of the built pages** came out blank below the first few sections, because the pages skip drawing a section that is off the screen (`content-visibility`). Scrolling each section into view and taking a screenshot of it alone showed every widget drawn. The failure shows itself, so no skill was changed.
- **The emulator release in a cloud container** lacked nine libraries and there was no `sudo`. Unpacking the packages into `tools/vice-libs` worked; the install notes now say so.
- **Auto symbols on the high bytes of pointer tables.** The game reads each pointer table at `table,y` and `table+1,y`, so the disassembler made an auto data symbol one byte into each table, and the ledger counted its 64-byte reach as the end of the table's comment. `coverage.py` named each one ("past f_B4A7's 64-byte reach"), and naming them as user labels (`..._hi`) fixed it.
- **A checkpoint on `$8109`** (the first part of the title tune) loaded from the hand-over snapshot did not stop within 60 seconds, though the title starts that tune within a second. Left unexplained; the music check used a state recorded another way.

## What cost the most time

A sentence in `70-minisite`'s "Check it in a browser" saying that sections off the screen are not drawn, so each section is screenshotted after it is scrolled into view, would have saved the most.

## Operating system and tools

Ubuntu 24.04.5 x86_64 in a cloud container with no display. VICE v3.13.2 (`v3.13.2-linux-x86_64-gui.zip`), with nine runtime libraries unpacked into `tools/vice-libs`; `check-emulator` passed 57 of 57. regenerator2000 0.9.20. Chromium and Playwright as the container provides them, for the browser check.
