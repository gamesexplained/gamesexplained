# The Armageddon Man — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`armageddon_man[martech_1987](cyan2)(pal).g64` from the C64 Preservation
Project's G64 collection on archive.org, copied to `work/armageddon-man.g64`
(SHA-256 `8f2cf80d2e4e23847b4866dc70d7eaafab4f9e48829edee6d92e5d113ac8a2dd`,
317,884 bytes). The header reads `GCR-1541`, version 0, 84 half-tracks,
longest track 7,928 bytes: a bit-level image of Martech's original PAL disk,
not a crack. The directory is disk name `DISK`, ID `D1`, and one file, `*`,
three blocks, that loads at `$0302`. Tracks 1 to 17 are formatted normally;
tracks 36 to 40 hold unformatted noise as the mastering tool captured it.

## From power-on to play

The disk's copy protection fails in VICE on this image (below), so the boot
needs one assist, done by `work/assist.py`:

1. Start the emulator fresh (`tools.py vice`), hard reset, attach the G64 as
   drive 8. Do not autostart: VICE's autostart sees the loader leave the
   ROM for `$0330`, gives up ("Autostart: aborting" in `tools/logs/vice.log`)
   and, on v3.14.0, left the keyboard ignoring every key, typed or by matrix,
   until the emulator was restarted.
2. Type `LOAD"*",8,1` and RETURN. The file loads over the BASIC vectors, so
   BASIC's main loop jumps through `$0302` to `$0330` when the load ends.
3. Put a stopping checkpoint on `$1092`. When it fires, the drive has sent
   its verdict page into `$0330`-`$042F`. If those 256 bytes are track 5
   sector 7 XORed with `$98` (the fail page), write track 2 sector 0 XORed
   with `$98` (the pass page) over them, delete the checkpoint and run on.
4. Warp on. The fast load takes about 27 seconds of warp and ends at the
   hand-over, `jmp $4E96` from `$03F3`, with `$01` = `$14` (RAM everywhere).
   `work/entry.vsf` is saved on a stopping checkpoint at `$4E96`.
5. The game shows its options panel over the world map (`reference/`):
   `F1` chooses the keyboard (A up, Z down, N left, M right, SPACE fire),
   `F3` joystick in port 2. This run pressed `F3`.
6. The U.N.N. Council communique for week 1 appears with a menu (CARRY ON,
   RAMSAVE GAME, RAMLOAD GAME, QUIT GAME); `work/week1-menu.vsf` is saved
   there. Fire on CARRY ON gives the first memo and then the main screen.

Snapshots, all in `work/` and saved without ROMs:

| File | State |
|---|---|
| `entry.vsf` | the hand-over, stopped at `$4E96`, before the game's first instruction |
| `options.vsf` | the options panel |
| `week1-menu.vsf` | week 1 communique with its menu |
| `am-main1.vsf` | the main screen, week 1, after the first memo |

## Steady state

Interrupt vectors in play are the hardware ones in RAM: NMI `$62CB`, IRQ
`$624C` (`$FFFA`-`$FFFF`, written by the start-up at `$6306`-`$631A`); the
KERNAL's `$0314` is left at `$EA31` and unused, since the ROMs stay banked
out. In play `$01` holds `$15` (RAM, the I/O area, RAM) and the start-up
runs with `$14` (RAM everywhere). The video chip uses bank 3
(`$DD00` = `$C4`): bitmap at `$E000`, screen at `$DC00`, under the I/O
area. The raster interrupt's line is `$EB` at start-up (`$6329`).

Nothing is loaded after the hand-over: the game is one image from `$0800`
to `$FFFF`.

## The disk's files onto memory

| What | Where on the disk | Where in memory |
|---|---|---|
| `*`, the boot file | track 17 sector 0 | `$0302`-`$0552` |
| drive program 1 (reads the protection track) | track 5 sector 5, run with `B-E` | the drive's `$0300` |
| drive program 2 (the protection test) | track 3 sector 0 | the drive's `$0400` |
| the verdict pages | track 2 sector 0 (pass), track 5 sector 7 (fail) | `$0330`-`$042F`, XORed with `$98` |
| the game | a chain from track 17 sector 1, 254 bytes a sector, tracks 17 down to 5 | `$0800`-`$FFFF`, whole: every sector holding bytes other than zero was found at one address in `entry.vsf`, 15 of its 16-byte pieces agreeing |

## The loader, in a paragraph

`*` loads over the BASIC vectors so that BASIC's idle loop jumps to `$0330`.
That blanks the screen, copies the KERNAL into the RAM beneath it and
decrypts itself in three nested passes (each keyed on the bytes of the pass
before and on the stack). It then sends `B-E:2 0 5 5`, which has the drive
read track 5 sector 5 into its buffer at `$0300` and run it. That program
(XORed with the drive's block-ID bytes, `$07` and `$08`) reads track 3
sector 0 into `$0400` and runs it: it steps to track 32 and reads sector 1's
data block on past its end, eight times in pairs, comparing the three bytes
it finds in the gap after the block. On the original disk those bytes read
differently each time; the drive then loads track 2 sector 0 (the pass page)
into buffer 1, and if every pair agrees it loads track 5 sector 7 (the fail
page). The C64 reads the page with `B-P` and XORs it with the BRK vector's
bytes (`$66` and `$FE`) into `$0330`. The fail page fills memory with
spaces and jumps to the KERNAL's reset. The pass page has the drive run
five more pages (track 2, sectors 2 to 6, counted by `$03F5`), and what they
set up reads the game over a two-bit fast transfer: its C64 side is at
`$02A6`-`$03F5` when the game starts. The game streams in from `$0800` to
`$FFFF`. In the
G64 the gap after track 32 sector 1 holds fixed bits, so in VICE every read
agrees and the boot fails; the assist above gives the C64 the page the
original disk would have given it. Not annotated further, by policy.
