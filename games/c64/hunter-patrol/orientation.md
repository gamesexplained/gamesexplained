# Hunter Patrol: orientation

## The image

`HUNTERPA.D64`, a 35-track disk image of 174,848 bytes with two files, from the zip `Hunter-Patrol_C64_EN`, whose `VERSION.NFO` says: Mastertronic 1985, programmer Steve Lee, music Rob Hubbard, cracked by Remember (REM), "Trainers: 3", "High Score Saver: Yes", loading screen and documents included. It is a crack, not the original disk. The directory:

| File | Type | Load address | Bytes |
|---|---|---|---|
| `HUNTER PATROL+` | PRG | `$0801` | 24,498 |
| `H.PATROL HI /REM` | PRG | `$0C00` | 85 |

`HUNTER PATROL+` is a BASIC program that starts a packed program. Its bytes do not appear in memory as they are on disk: 16-byte pieces of the file found 4 times in the machine at one offset, so the file is crunched and the game exists only after the cracker's depacker has run. `H.PATROL HI /REM` is the highscore file the cracker's saver loads and saves: 85 bytes at `$0C00` (`media.json`).

## From power-on to play

1. `kit/c64/vice.py`: `reset(rpc)`, then `autostart(rpc, "work/HUNTERPA.D64")`, warp off after 45 seconds.
2. The Remember cracktro ("Hunter Patrol +3 and highscoresaver") scrolls its text. Holding SPACE for five seconds pages through the cracker's documents (they are text screens kept at `$C000`); the game text says to use joystick port one (the NFO says port 2, the documents say port 1, and the stick works on port 1: `$1F` follows it when `vice_joystick_set` port 1 is used).
3. Holding RUN/STOP (the key named `STOP` in the emulator) leaves the documents and shows the loading picture. The picture stays up while the game unpacks. It waits for fire (a joystick press on port 1 for two seconds).
4. The menu "[H]ighscore or [T]rainers": H, then "[L]oad or [R]eset Highscorelist": R. No trainer was turned on. `work/entry.vsf` is the machine waiting at the R prompt with the game already unpacked, the last state before the game's own start-up (the cracker's code at `$F142` is waiting for the key).
5. The title screen appears at once, reached from `$1450` after R. Fire on port 1 starts play. `work/play-start.vsf` was taken three and a half seconds after the first fire, in steady play: `$3F` is 0 (the plane is not exploding), `$40` is 4 lives.

`work/boot_full.py` makes `work/menu-load-reset.vsf` from power-on. The same five steps, with a codemap recording taken from the menu snapshot on, are in `work/play1.py`.

## Steady state

- Processor port `$01` is `$36` in play: BASIC out, KERNAL in and I/O in. The game's code and data lie from `$1170` up to `$2FA8`, tables from `$4000` to `$8FFF` and the music driver and its data at `$A000-$AFFF` under BASIC.
- The IRQ vector `$0314` points at `$13AB`, the game's raster handler. The NMI and hardware vectors are the KERNAL's.
- The play snapshot is the one the listing is built from. The hand-over `entry.vsf` holds the same program with the same tables.

## The loader, in a paragraph

The cracker's BASIC line starts a depacker and the Remember intro. When the depacker has finished, the whole game is in memory, and the cracker's own code (`$F142` and the trainer and highscore-saver menu) sits between that and the game's start at `$1450`. The saver code at `$0C55` loads `H.PATROL HI /REM` through the KERNAL, and the game's high-score routines at `$1210` and `$12D0` keep the table on screen at `$4122`. Not annotated further, by policy.

## The emulator

VICE 3.10 as reported by the server, vice-mcp release v3.14.0, `v3.14.0-linux-x86_64-gui.zip`. `check-emulator`: 57 of 57 passed, no failed checks.
