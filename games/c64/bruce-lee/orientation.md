# Bruce Lee — orientation

## The image

`Bruce Lee.d64`, a standard 35-track sector image (174,848 bytes) with the disk name `WWW.C64HQ.COM`, id `00`. `disk.py` reads it: 683 sectors, none with a bad checksum, and one file, `BRUCE LEE+2 /REM` (a PRG of 160 blocks, 40,472 bytes, loads at `$0801`). No sector is in use that the file does not hold.

This is a crack by the group Remember, not the original release. The directory name says it carries two trainer options. Its parts, in the order they run:

1. A one-line BASIC stub, `SYS 2059`, then a short loader at `$080B`. The loader copies 256 bytes from `$A548` to `$00F0` and jumps to `$014E`, where a depacker unpacks the rest. Nothing of the packed file appears at its load address afterwards; the unpacked program lives elsewhere.
2. A Remember intro with a scrolling greetings text, left by pressing fire.
3. A text page that reads like a manual (features, story), paged with SPACE and left with RUN/STOP. It tests `$DC01` for `$EF` (SPACE) and `$7F` (RUN/STOP) with column 7 selected through `$DC00`.
4. The game's own loading picture (Bruce Lee's face, "Programmed by Ron J Fortier, Graphic art by Kelly Day, Datasoft Inc."), left by pressing fire.
5. Two trainer questions in the crack's own text, answered with `Y` or `N` from the keyboard through the KERNAL: "Unlimited lives ??" and "Opponents can't hit you ??".
6. A copy loop at `$C60C` that copies `$C000`-`$C8FF` down to `$0400`-`$0CFF` and jumps to `$0400`. That is the first instruction of the game's own code, the hand-over.

Whether the code the trainers change differs from the original release is not checked here; no other release was available. Everything below the hand-over is read as the game's, with the crackers' changes unmarked (open question in `features.md`).

## From power-on to play

1. Hard reset, then `vice_autostart` the d64 (the first file loads and runs by itself). Wait about 22 seconds: the Remember intro is on screen.
2. Tap fire on joystick port 2 (10 frames). Wait 6 seconds: the text page appears.
3. Hold RUN/STOP for 1.5 seconds. Wait about 26 seconds: the loading picture appears, the game decompressing behind it.
4. Tap fire on joystick port 2. The trainer asks "Unlimited lives ??". Press `N` for each question (two, in this order: lives, opponents), a second apart. **Choice: no trainer options, the plain game.**
5. The game's menu appears: `F3` toggles one or two players, `F5` computer or opponent, `F7` begins. Press `F7`.
6. Play begins in room one after about 6 seconds, with `000000 TOP 000000 FALLS 04` on the status line. The joystick is read from port 2.

Snapshots, all in `work/` (gitignored): `entry.vsf` at the hand-over (a stopping checkpoint on `$0400`), `menu.vsf` (menu), `play-room1.vsf` (first frames of play), `title-picture.vsf` and `trainer-prompt.vsf`. `play-room1.vsf` is the one the listing is built from; it and `entry.vsf` agree on all the program's code (they differ in zero page, `$0200`-`$03A0` and the screens, tile and bitmap data the game writes as it starts).

## Steady state

- Processor port `$01` = `$35` in play: BASIC and KERNAL ROMs banked out, I/O visible. The hardware vectors at `$FFFA`-`$FFFF` are RAM: NMI and reset point to `$1116` (an `RTI`), IRQ to `$1103`, which saves the registers and jumps through the pointer in `$0408`-`$0409`; the KERNAL's `$0314` vector is not used (reads `$0101`).
- VIC: video bank 2 (`$DD00` = `$C1`, so `$8000`-`$BFFF`), bitmap mode with `$D018` = `$78` (screen RAM at `$9C00`, bitmap at `$A000`), multicolour on (`$D016` = `$D8`).
- Music and sound: the sound routines identify themselves in a string at `$E314` as the "Micropearl Music Player, copyright 1983 John A. Fitzpatrick"; code around `$EB00`-`$F100` writes SID voices 1, 2 and 3.
- Nothing is reloaded from disk during play: the whole game is in the single file.

## The loader, in a paragraph

The BASIC stub's loader moves a 256-byte stub to zero page and the stack, which unpacks the file; then the crack's own code shows its intro, page and trainer questions, patches or leaves alone the game according to the answers, and copies the game's start-up block down to `$0400`. The game's own title picture is drawn by the crack's code before the trainer questions. Not annotated further, by policy.

## Tools

Emulator: VICE with vice-mcp v3.14.0, release `v3.14.0-linux-x86_64-gui.zip`; `check-emulator` passed 57 of 57 on 10 November 2026 in a Linux x86_64 container (Ubuntu 24.04), six runtime libraries kept inside `tools/vice-libs`. Disassembler: regenerator2000 0.9.20. The test run, the order of keys and the waits above were all done in that setup.

## Disk file against memory

The file does not land in memory at its load address or anywhere else: of its 16-byte pieces, only 4 to 7 are found in the play snapshot, all of them the short stub at `$0109`-`$01B9` that came from the file's tail. The file is packed.
