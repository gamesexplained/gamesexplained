# Aliens — orientation

## The image

`Aliens [Activision].d64`, 174,848 bytes, a plain 35-track sector image (683 sectors, none with a bad checksum). It is a cracked copy, not the original: the first file, `ALIENS+9&P /REM`, is a Remember cracktro with a trainer ("+9", "+passwords"), a 22,336-byte program loading at `$0801`. Behind it stand ten files named `A1`..`A9` and `A0` (5 to 17 KB each) that the cracker's loader reads. Their load addresses (`$0049`, `$005C`, `$00AD`, ...) are not real; they are packed data, and none of their bytes appears unchanged in memory.

Emulator: release v3.14.0 (`v3.14.0-linux-x86_64-gui.zip`), `check-emulator` 57 of 57, no failed checks.

## From power-on to play

1. Hard reset, autostart the d64. The cracktro runs about 40 s (it loads while it scrolls). Hold SPACE for 2 s.
2. RUN/STOP opens the cracker's "ALIENS DOCUMENTS", a copy of the manual's text. RUN/STOP again opens the trainer menu. **Choice: every cheat left at N** (the plain game), then SPACE. The trainer menu also lists the six mission status codes (below).
3. About 40 s of loading, then credits (music, producer, James Cameron) and "PRESS RETURN TO START". RETURN.
4. "COLONIAL MARINES STATUS UPDATE": type a code and RETURN (it answers "MISSION STATUS CODE...VALID.") or RETURN alone to start at level 1. The game scans the keyboard matrix, so type with key presses, not the KERNAL buffer.
5. RETURN through the briefing text and the speech-balloon scenes. Level 1 first asks for the seven pieces of equipment to be identified with the glove cursor (joystick port 2 worked, the manual says port 1): pistol, flame thrower, locator band, smart-gun, pulse rifle, motion tracker, camera.
6. A RETURN after play has begun ends the level, so the route stops pressing it.

Mission status codes (from the trainer's list; the game accepted `2727H` and `1506E`): level 1 `7324G`, 2 `2727H`, 3 `1506E`, 4 `5761H`, 5 `0640C`, 6 `0663F`.

Scripts that replay all of this are in `work/` (gitignored: `route.py` to level 1, `lvl.py N` to level N from the trainer-menu snapshot).

## The parts

| Part | Route | Snapshot |
|---|---|---|
| engine | the resident program (`$0800`-`$3CFF`, `$C000`-`$C1FF`, with the story text, code entry and shared routines) | `play.vsf` taken in level 3 play |
| level1 .. level6 | status code for the level, RETURNs to the play screen (levels 3, 4, 6: 5 RETURNs; level 2: 8; level 5: 9; level 1: via the equipment check) | `play.vsf`, one per level |

Each level's snapshot is taken in play; a hand-over snapshot (the instant the loader gives control to the level) was not captured, so `entry.vsf` in each part is a copy of `play.vsf`. Levels write mostly `$4000`-`$BFFF`, `$C200`-`$C6FF` and `$E000`-`$FFFF`; their `ranges` in each `part.json` are the pages holding data in that level's snapshot, not measured from the load.

## Steady state

In play `$01` is `$35`: the game runs with the ROMs out. The hardware vectors in RAM are NMI `$0952` and IRQ `$0934` (`$FFFA`, `$FFFE`); the RESET vector reads `$0000`. The machine is PAL.

## The loader, in a paragraph

The cracker's program stays resident and sends commands to the drive 157 times in the loading phase (`$ED40` is the KERNAL's byte send), with 24 calls to SETNAM; it calls LOAD only once, for the autostart. So the game files are fetched by the cracker's own routines, not the KERNAL's `LOAD`, and `loads.py` sees nothing past the first. The game files are packed. This is not analysed further.
