# Spy vs Spy — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`spy_vs_spyfirst_star_1984m4.g64` as uploaded by the contributor (294,094
bytes, SHA-256
`570a673aea977cc8639b41ef12fad42eee945fdc2ab1f1d389e1c172bab3c3d8`),
copied to `work/spy_vs_spy.g64`. Its header reads `GCR-1541` with 42
tracks: a GCR-level copy of First Star Software's 1984 disk, which keeps
the original's copy protection (below). Nothing on the disk or on screen
belongs to a cracker or trainer: the title picture is First Star's, and the
protection check still runs and passes.

The directory, as VICE's `c1541` lists it:

```
0 "spy vs spy      " m4 2a
3    "spy"              prg
3    "s0"               prg
41   "s1"               prg
33   "s2"               prg
6    "s3"               prg
91   "s4"               prg
38   "s6"               prg
17   "s5"               prg
432 blocks free.
```

Every file reads through the standard DOS chain (`c1541 -read`).

**The game runs only on an NTSC machine.** On a PAL C64 (VICE's default)
it loads, then hangs on a garbled screen with the program counter in a
loop at `$8E4F`-`$8E5E`. That loop waits for ten raster interrupts in a row
and gives up, starting again, if 1,536 polls of `$D019` pass without one.
At about 12 cycles a poll that is some 18,400 cycles: longer than an NTSC
frame (17,095 cycles, 263 lines of 65), shorter than a PAL one (19,656
cycles, 312 of 63). The disk is the North American release, and the game
never reads the KERNAL's PAL flag `$02A6`.

## From power-on to play

1. Set the emulator to NTSC before anything else
   (`vice_machine_config_set`, `MachineVideoStandard` 2; the video chip
   becomes the 6567). Then power-cycle (`vice_machine_reset`, `mode: hard`).
   VICE's default drive settings (true drive emulation on) load the G64
   with no `vicerc`.
2. Autostart `work/spy_vs_spy.g64` (the first file, `SPY`). The KERNAL
   loads `SPY` and `S0`; the title picture (MAD Magazine's Official Spy vs
   Spy, by Mike Riedel, First Star Software, 1984) appears after about a
   minute at normal speed, and the rest loads with the picture up. With
   warp on, everything is in after about another 30 seconds of host time.
3. The screen goes white with `LOADING "SPY VS SPY" ....ITS WORTH THE
   WAIT !!`, and then, about 20 seconds of machine time after the
   hand-over (1,300 frames), the options screen: two monitors, the upper
   listing `NUMBER OF PLAYERS`, `LEVEL OF DIFFICULTY`, `COMPUTER IQ (1
   PLAYER)`, `HIDE AIRPORT TILL END`, with the level's rooms (06), traps
   (12) and minutes (07); the lower giving the controls.
4. **Fire on joystick port 2** starts a one-player game with the defaults
   (one player, level 1, IQ 1). Both spies start in the same room, so the
   game opens in hand-to-hand combat, with the black spy's monitor blank.
5. Play used for the snapshot: from the start, hold the stick right for
   150 frames, then left for 250, then let go for 300. The white spy had
   lost a fight by then, and the two were in different rooms, both monitors
   showing a room.
6. Snapshots in `work/`, all saved without ROMs, NTSC:
   - `entry.vsf`: the hand-over, stopped on `$6600` (the loader's `jmp
     $6600` at `$60DB` stepped once), `$01` = `$37`.
   - `options.vsf`: the options screen, before fire.
   - `play.vsf`: steady-state play as in step 5. **The listing is built
     from this one** (below, "Steady state").

## Steady state

Measured on the play snapshot. `$01` = `$35`: BASIC and KERNAL banked out,
I/O in. The game's own hardware vectors are in the RAM under the KERNAL:
NMI `$8FA5`, reset `$8F98`, IRQ `$8FA6` (written by `$8E6C`, which also
stops CIA 1's timer A). `$0314` still holds the KERNAL's `$EA31` and is not
used while the KERNAL is out.

The video chip is in bank 1 (`$DD00` = `$3E`, `$4000`-`$7FFF`), in
multicolour bitmap mode (`$D011` = `$3B`, `$D016` = `$D8`), with `$D018` =
`$81`: the bitmap at `$4000`-`$5F3F` and the screen matrix at
`$6000`-`$63E7`, over the loader's own code. Sprites 0-3 and 6 are on
(`$D015` = `$4F`). The raster interrupt is the only source enabled
(`$D01A` = `$F1`). One recorded frame (`kit/c64/frame.py capture`, NTSC)
saw two writes, both to the background colour `$D021`: `$F2` on line 51
(the white spy's half) and `$F5` on line 151 (the black spy's).
`frame.py compare` refuses an NTSC frame: the site's renderer models only
the PAL chip.

The hand-over and play snapshots hold the same program. `S4`
(`$6600`-`$BFFF`) differs in 390 bytes, all variables and two buffers
(`$AD47`-`$AE0D`, `$B290`-`$B36B`), `S5` (`$C000`-`$CFFF`) in 3 and `S6`
(`$0900`-`$2DFF`) and `S3` (at `$F700`) in none. What play adds is built at
run time: the bitmap, the screen matrix, `$2E00`-`$3FFF` and the tables in
`$E000`-`$EFFF`. Nothing is reloaded during play.

## The disk's files in memory

Each file's bytes searched in 16-byte pieces in the hand-over and play
snapshots (`work/scripts/filemap.py`).

| File | Loads to | Size | Hand-over | Play |
|---|---|---|---|---|
| `SPY` | `$00DF`-`$0368` | 650 | at its address, 602 bytes equal (the KERNAL's work area) | 482 equal |
| `S0` | `$6000`-`$624F` | 592 | whole | gone (screen matrix) |
| `S1` | `$2000`-`$4800` | 10,241 | 4,861 equal: the title bitmap, partly overwritten | gone |
| `S2` | `$4000`-`$5FFF` | 8,192 | whole: the title's colours | 4,636 equal (the play bitmap is drawn over it) |
| `S3` | **`$F700`**-`$FBFF` | 1,280 | whole | whole |
| `S4` | `$6600`-`$BFFF` | 23,040 | whole | 22,650 equal |
| `S5` | `$C000`-`$CFFF` | 4,096 | whole | 4,093 equal |
| `S6` | `$0900`-`$2DFF` | 9,472 | whole | whole |

`S3`'s file says `$3000`, but the loader asks the KERNAL for `$F700`
(secondary address 0, `X`/`Y` = `$00`/`$F7`), so it lands in the RAM under
the KERNAL.

## The loader, in a paragraph

`SPY` loads over the KERNAL's work area from `$00DF` to `$0368` and takes
the BASIC output vector at `$0326`, so that when the `LOAD` returns, the
next character BASIC prints runs `$032C` instead. That code loads `S0`,
puts the vectors back and jumps to `$6000`. `S0` loads `S1` (the title
bitmap, `$2000`) and `S2` (its colours, which it copies to the screen and
colour RAM), turns the picture on, and loads `S3` to `$F700`. Then comes
the protection: it opens a buffer and the command channel, sends two
block reads (`U1: 2 8 05 0` and `U1: 2 8 30 5`: channel 2, `8` where the drive
number goes, track 5 sector 0 and track 30 sector 5) and after each reads the
drive's error message, which must be `21` (no sync found) and then `23`
(checksum error): the original disk carries both faults on purpose. On a
mismatch it sends `N:ILLEGAL COPY,MR` to the drive (a format command) and
fills memory with `$CC` from `$6230` upward. On this image it passes, and
`S0` loads `S4`, `S5` and `S6`, prints the loading message and jumps to the
game at `$6600`. Not annotated further, by policy.
