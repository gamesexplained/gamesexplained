# Hunter Patrol: verified technical facts

Current truth for this game. Unless marked *live*, a fact comes from reading the code in `work/play-start.vsf` (see `orientation.md`), through the listing.

## Build

A Remember crack: `HUNTER PATROL+`, a packed program loaded at `$0801`, and the highscore file `H.PATROL HI /REM` at `$0C00`. The unpacker expands the game to `$0C00-$BFFF` while the cracker's loading picture is up. The game's own code is `$1170-$2FA8`; the cracker's code is `$0C55-$0CEF` (highscore saver), `$0D03` (the level-skip trainer), the menu in RAM under the KERNAL (`$F142` was where it waited, *live*) and the documents at `$C000`.

## Memory layout

| Thing | Where |
|---|---|
| Unused second tune player, its sound settings and notes | `$1000-$116F`, `$8010`, `$8200-$8368` |
| Engine: title, input, scroll, objects, hits, sound effects | `$1170-$2FA8` |
| Target sprite sets for levels 1-4, 32 shapes each | `$3000`, `$3800`, `$9800`, `$9000` (table at `$8B80`) |
| Title screen `$4000`, play screen `$4400`, character set `$4800` (video bank 1) | `$4000-$4FFF` |
| Sprite shapes (pointer x 64 + `$4000`) | `$5000-$7FFF`; the level's target is copied to `$7800` |
| Cartridge signature "CBM80", pointing RESTORE at `$2F30` | `$8000` |
| Video chip image loaded at start and after each game | `$8030` |
| Sprite register images of the sky and ground bands | `$8060`, `$8090` (47 bytes each); pointers `$8520`, `$8528` |
| Ground object records, four of sixteen bytes | `$80C0` |
| Colour of each character | `$8100` |
| Ground object templates (twelve used) | `$8400` |
| Enemy aircraft records and templates | `$8530`, `$8570` |
| Shot records and templates | `$8670`, `$86A0` |
| Ground stripe records, twelve of three bytes | `$87A0` |
| Engine sound settings | `$8850` |
| Flak record and templates | `$8880`, `$88A0` |
| Crash sound settings, texts, result messages | `$8B00-$8C1F` |
| Hill panorama | `$8D00` |
| Rob Hubbard's music driver and tune data | `$A000-$AE3F` |

## Timing

- The raster interrupt `$13AB` runs three times a frame; `$20` counts the band (0 sky, 1 ground, 2 status panel). The ground band's registers are copied from `$D008`, so sprites 0-3 keep their sky positions.
- The main loop at `$1466` has no wait; `$1E` counts its passes. *Live*, 13 November 2026: 67 to 88 passes in 50 frames, about 75 a second.
- The stick is acted on every 8th pass (`$193C`), the hills scroll every 8th (`$1720`), a ground stripe starts every 32nd (`$2900`).
- Title music: CIA 1 timer A latch `$4800`, a call every 18,433 cycles, 53.45 a second on PAL (`$ADD0`). One time through the tune is 10,801 calls. The unused player would use latch `$3000`, 12,289 cycles, and its tune is 2,241 calls long.

## Controls

The stick is read at `$DC01` (port one) by `$0D14`. Every 8th pass `$193C` moves the climb rate `$37` one step (up to `$FF`, down to 1) and the scroll speed `$22` one step between −2 and 2 (left down, right up); the rates stay where the stick leaves them. A climb rate of `$FF` moves the plane down the screen. *Live*, 13 November 2026, from `work/play-start.vsf`: up held 40 frames took `$37` to `$FF` and the plane's y `$8061` from `$51` to `$67`, and it went on to `$88` with the stick released. The plane's x `$8060` stays `$A0`: nothing writes it. RESTORE restarts the game through the "CBM80" signature at `$8000` (*live*, 13 November 2026: a press in play reached `$2F30`).

## Mechanics

| Variable | Meaning |
|---|---|
| `$13-$17` | score, five decimal digits |
| `$40` | lives, 4 at the start, at most 9; the game ends when it goes negative |
| `$41` | kind of defence on the ground, 0 to 3 (tanks, lorries, guns, buildings); `$80` during the strafing runs |
| `$42` | hits still needed for this kind: 5, 10, 20, 20 by level (`$0F60`) |
| `$43` | the strafing run's plane number, from the lives down to 0 (`$2A4C`) |
| `$44` | level, 0 to 3, then round to 0 |
| `$45` | hits on the target; 16 or more gives a life and the next level (`$2EA1`) |
| `$3F` | crash counter; non-zero while the plane explodes, a life goes at `$A0` |
| `$3D`, `$3E` | sprite collision latches of the sky and ground bands |

- A ground object starts when the noise voice's random byte `$33` has its low seven bits clear (`$1670`); an aircraft when `$33` is zero (`$1A10`).
- A hit on a ground object scores 100, on an aircraft 50, and both count off `$42` (`$22D0`). In a strafing run each hit on a target part counts one in `$45` and scores 100 (`$2CD0`).
- The plane crashes on touching the flak, a near aircraft (`$0F00`), or, while low, a ground object with its shadow.
- `$2C00` writes black to sprite 5's colour (`$80BC`) whichever target part is hit; `$2BCF` reads `$8000` + level and loads 1 over it, so every target is white.
- Result messages by `$45`: 64 or more, 48, 16, fewer (`$2E41`). The texts misspell "STRAFFING" (`$8B20`) and "TARTARGET" (`$8C00`).

## Graphics

- Ground objects: picture `$5D-$66` from the template plus 10 per kind; a hit one shows `$C0` + 2 x (picture − `$5D`) and the next, alternating every 4 passes (`$17A3`).
- Aircraft: `$49` (near) to `$52`, plus 10 heading left; a hit sets the picture to `$4D` and shows `$A2`/`$A3` (`$1C00`, `$22D0`).
- Plane `$42` + scroll speed; shadow `$87` + 5 x ((`$A0` − y) / 16) + scroll speed (`$22B0`); crash `$9E` + high nibble of `$3F` (`$2400`).
- Shot `$A8-$B1`; flak `$45`, bursts `$46-$48`, 32 passes a step (`$2700`).
- Target part n: `$E0` + 3 x (picture − `$5D`) + n, from the level's set copied to `$7800` (`$2B00`, `$2C00`).
- `$B2-$BF` and `$D2-$DF` are filled blocks no routine shows in normal play.
- Loading picture: multicolour bitmap at `$E000`, screen `$DC00`, background black, in memory while the unpacker waits (*live*, 13 November 2026); drawn on the Graphics tab from those 10,000 bytes.

## Sound

Voice 3 runs as noise for random numbers (`$1900`, `$1920`). The engine note on voice 1 follows the plane's height (`$25A0`); the shot plays on voice 2 (`$2600`). The music driver is started before each title screen (`$14F0` calls `$A000`) and stops when `$1370` turns off the timer's interrupt at the start of play; its stop entry `$A003` is never called. The flak sets `$09` and nothing reads it. The Music tab runs both players on the kit's 6502; `test_music.js` matched every sound chip write against the code run through its interrupts, 12,000 calls a tune.

## The listing's error rate

Sample of seed 2611: 60 of the 396 comments, checked by one checker on claude-opus-5-5 that wrote none of them. Five were wrong (8.3 %, 95 % interval 3.6 % to 18.1 %): one wrong, a byte said to be read by a sort's shift that the shift only uses as its base address (`$850E`, with the same belief at `$84FE` and `$8506`), and four wrong in a detail: a pointer's list of uses missing the target sets (`$26`), a title-screen block's text stopping a row early (`$426B`), the ground band said to keep only the plane sprites' x when it keeps their y too (`$8090`), and a music byte's uses missing the pitch drop (`$A41B`). All five, and the two other comments holding the same belief, were corrected. Building the Music tab's player showed one more wrong comment (`$AE09`, the driver's stop entry, which leaves the volume at 15), corrected.

## Live tests

- Controls, 13 November 2026: as above.
- Interrupt vector `$0314`: `$AE03` on the title screen, `$13AB` in play.
- RESTORE in play, 13 November 2026: reached `$2F30`.
- Main loop rate, 13 November 2026: `$1E` advanced 70, 67, 79, 79, 73 and 88 in six runs of 50 frames.
- Hit ground objects, 13 November 2026: with byte 15 bit 6 set on records at picture `$60`, the pointers shown were `$C6-$D1`, alternating in pairs; `$D2` never appeared in 1,500 frames.
