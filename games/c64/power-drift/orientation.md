# Power Drift — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`power_drift[activision_1989](pal).g64`, 317,884 bytes, from the C64
Preservation Project's collection on archive.org: an original Activision
disk, not a crack, with no trainer or intro. The header reads `GCR-1541`,
version 0, 84 half-tracks: a bit-level image of the disk, so it needs the
drive's own processor, which VICE runs by default. The directory, read with
`kit/c64/disk.py`:

- disk name `POWERDRIFT`, id `$00 $00`;
- `AS`, PRG, loads at `$02A7`, 103 bytes;
- `GM1`, PRG, loads at `$0334`, 1,417 bytes;
- six SEQ entries of "257 blocks" whose chains loop at track 1 sector 1:
  decoys, not files;
- 656 sectors marked in use that no file holds: the game itself, read by
  the loader's own code rather than through the directory.

The same collection holds a second original, `power_drift[activision_1989](rl7).g64`
(a Rapidlok 7 disk, directory `JEFF`, thirteen files: `LOADER`, `MUSIC0`,
`MUSIC1`, `BLOCK0` to `BLOCK3`, `LOGO`, `ACTIVISION`, `X`, `JASON`,
`EMILY`, `JERONIMO`). On VICE v3.14.0 with its default settings it did not
reach the game: after six minutes of warp from a cold boot the screen was
blank blue and the processor sat at `$A005`. It was not analysed, so the
two releases have not been compared.

## From power-on to play

1. Power-cycle the emulator (a hard reset), attach the PAL image and
   autostart it. VICE types `LOAD"*",8,1` and `RUN`.
2. The first file, `AS`, loads over the BASIC vectors at `$0300` and
   points six of them at its own code at `$02C4`, so BASIC runs it as soon
   as the load ends. That code fills colour RAM with the background
   colour, loads `GM1` by name and jumps to `$0334`: the loader (below). With warp on, the
   game was running eight seconds of host time after the autostart.
3. The loader's last instruction, `JMP $0834` at `$03F5`, is the hand-over.
   `work/entry.vsf` is saved stopped on `$0834` (a stopping execute
   checkpoint armed two seconds after the autostart, `work/entry.py`), with
   `$01` = `$37`.
4. The game shows the course and driver select screen (twelve drivers'
   faces along the top, five course pictures, the high-score table, the
   copyright line). `work/select.vsf` is saved there. The highlight starts
   on the third course.
5. Joystick in port 2. Left and right move between courses; fire starts the
   race at once, with no further load. `work/play-a1.vsf` is saved a few
   seconds into a race on course B, stage 1 (`$53E4` = 1): left twice from
   the start, then fire, then up held for four seconds. Only one of the two
   presses moved the highlight, which answers the stick on one frame in 32
   (`driver_cursor_loop`).

## Steady state

- `$01` = `$35` in play: RAM everywhere but the I/O area at
  `$D000`-`$DFFF`; the BASIC and KERNAL ROMs are banked out.
- Interrupt vectors in RAM: IRQ `$FFFE` = `$507F`, NMI `$FFFA` = `$507E`
  (a lone `RTI`). The KERNAL's own vectors at `$0314` hold the defaults the
  loader copied back from the ROM.
- The IRQ handler at `$507F` serves two sources. A raster interrupt
  (bit 0 of `$D019`) jumps through the pointer at `$08`/`$09`, which the
  game rewrites to chain handlers down the screen (`$51CC` is the first).
  CIA 1's timer A sets the background colour from `$26`; timer B steps a
  table of positions, colours and pointers for sprites 0 to 3.
- The video chip's sprite pointers are written at `$E3F8`, `$EBF8` and
  `$EFF8`: screens at `$E000`, `$E800` and `$EC00` in the top video bank.
- Nothing is reloaded: with the disk detached at the select screen, a race
  on the first course started and ran. A cold boot to the select screen,
  compared with the hand-over, differs only in zero page, the stack, the
  variables at `$5151`-`$515D` and `$5370`-`$53EB`, buffers at
  `$54C8`-`$57D9` and `$C057`-`$C0D2`, and the screens at `$E3F8` and
  `$EBF8`-`$EFFF`. No page of memory is filled with one value at the
  hand-over: the game occupies the whole 64 KB.

## The loader, in a paragraph

`GM1` (`$0334`) is a fast loader for the drive: it sets `$01` to `$37`,
resets the stack, and loads six blocks in turn through the KERNAL's `LOAD`
(`JSR $FFD5`) with a file name it builds from a table at `$02C8`
(`$03F9`/`$0402`). After block 0 it calls `$C800` and after block 1 `$6800`,
code the blocks have just brought in (the loading screen). After block 5 it
copies the KERNAL's default vectors from `$FD30` back to `$0314`, clears the
SID's registers, closes the channels (`$FFE7`, `$FFCC`), calls `$06D5` with
a value it kept on the stack, sets `$D011` to `$9B` and jumps to `$0834`.
While a block loads it waits in `BNE $03AA` for a CIA 2 timer NMI. Not
annotated further, by policy.
