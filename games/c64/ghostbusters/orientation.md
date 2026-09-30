# Ghostbusters — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Ghostbusters_OneLoad64_J1.prg` (64,750 bytes, SHA-256
`6f74b24dc06ce9aec13bd35d677eef196aadd348ad9758d924ae18950acb5bda`,
MD5 `a7504f10a17e5bbd15301b9934b47b20`), the contributor's own copy, a
single program file. Its load address is `$0314` and it runs to `$FFFF`:
64,748 bytes, the whole of memory above the KERNAL's vectors.

It is not Activision's own disk. The name says it is from OneLoad64, a
collection that turns C64 games into one file each, and the file behaves
like one: there is no BASIC line and no `SYS`. The first two bytes loaded
overwrite the IRQ vector at `$0314` with `$033C`, so the first interrupt
after the load has finished runs the program. What the conversion changed
in the game is unknown: no original disk was available to compare with,
and the stub at `$C800` (below) is the only code found that is plainly not
Activision's. No intro, trainer or credit to a converter appears on screen.

## From power-on to play

1. Power-cycle the emulator (`vice_machine_reset`, `mode: hard`) and let
   it reach `READY.`.
2. **Do not autostart the file.** VICE's autostart loads it through the
   drive, slowly, with interrupts running: as soon as `$0314`-`$0315` are
   loaded, the next IRQ jumps to `$033C` before the code there has
   arrived, hits a `BRK` in the power-on pattern, and BASIC's warm start
   puts `READY.` back on the screen (seen three times, 29 September 2026;
   VICE's log says `Autostart: Left ROM for $033c`). The file is made for
   a loader that writes memory in one go, as a cartridge or a DMA loader
   does. `work/inject.py` does the same through the emulator: it stops the
   machine at `READY.`, writes `$0314`-`$CFFF` and `$E000`-`$FFFF` with
   `vice_memory_write`, sets `$01` to `$34` to write `$D000`-`$DFFF` into
   the RAM under the I/O chips, puts `$01` back to `$37`, checks all 64,748
   bytes against the file, and resumes. The next raster IRQ enters `$033C`.
3. The title screen follows at once: the GHOSTBUSTERS logo, the no-ghost
   sign, the Activision logo and a bouncing-ball sing-along of the theme
   song ("PRESS F1 OR F3 TO START"). **F1** starts the game.
4. A typed interview follows. Name: `SPENGLER`, RETURN. "DO YOU HAVE AN
   ACCOUNT?": `N`, RETURN. The bank advances $10,000. Vehicle selection:
   `2` (the 1963 hearse, $4,800), RETURN.
5. The equipment shop: three pages (keys `1`-`3`), a forklift driven with
   the **joystick in control port 1** picks an item up (fire), carries it
   right to the car and drops it (fire). Bought on page 2: three traps,
   one ghost bait, one ghost vacuum ($2,700). `E` ends shopping.
6. The city map appears, with CITY'S PK ENERGY counting up from 000 and
   $2500 in the account. That is play.

Snapshots in `work/`, each saved without ROMs:

| File | State |
|---|---|
| `entry.vsf` | a stopping checkpoint on `$6000`, the game's first instruction, from a power-cycled machine and `inject.py`. **The disassembler and the listing are built from this one.** |
| `title.vsf` | the title screen and sing-along, about 12 s after `$6000` |
| `account-q.vsf` | after the name, at "DO YOU HAVE AN ACCOUNT?" |
| `vehicle.vsf` | the vehicle selection page |
| `shop.vsf`, `shop-bought.vsf` | the equipment shop before and after buying |
| `play-map.vsf` | the city map, PK energy rising |

## Steady state

On the city map: `$01` = `$35` (RAM at `$A000` and `$E000`, I/O at
`$D000`); the hardware IRQ vector `$FFFE` = `$8E76` and NMI `$FFFA` =
`$6425`, both written by the start-up at `$6000`. The page at `$0300`,
the KERNAL's vectors included, holds what `$C800` copied there (`$0314`
reads `$0A00`), and nothing goes through it once the KERNAL is banked out. The video chip looks at bank 1 (`$4000`-`$7FFF`;
`$DD00` bits 0-1 set to `%10` at `$6033`).

Compared byte for byte with `entry.vsf`, `play-map.vsf` differs in
`$4000`-`$5FFF` (the video bank's screen and graphics, rebuilt), one byte
at `$6328`, and scattered working storage at `$E000`-`$F4E5`. Everything
else between `$0314` and `$FFFF` is unchanged, so the program is not
reloaded or unpacked while it runs: the image holds the whole game.

## The loader, in a paragraph

There is none of Activision's in the file. The stub at `$033C` (in the
cassette buffer) acknowledges the raster interrupt, blanks the screen,
paints the border, the background and colour RAM black, resets the stack
to `$FB`, copies the KERNAL's default vectors from ROM (`$FD30`, 20 bytes)
back to `$0314`, waits 25 frames, calls the KERNAL's `IOINIT` (`$FDA3`),
turns the screen back on and calls `$C800`. That routine masks every CIA
interrupt, copies 256 bytes from `$C830` to `$0300`, clears `$0200`-`$02FF`
and jumps to `$6000`, never returning to the stub: it puts back pages
`$0200` and `$0300`, which the one-file load had to overwrite, as the
conversion found them. `$6000` is the game's cold start (`SEI`, stack to `$FF`,
vectors at `$FFFA`/`$FFFE`, `$01` = `$35`).
