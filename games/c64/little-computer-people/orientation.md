# Little Computer People — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

- `Little_Computer_People_1985_Activision.d64`, 174,848 bytes: 35 tracks,
  no error bytes. SHA-1 `acfce1997fe8a7c0c4198c91a62562d247dbd911`.
- Directory: disk name `LCP`, id `00`, one file, `COMPUTER PEOPLE`, a
  192-block PRG; 472 blocks free.
- **Not the original disk.** It is a single-file crack: the one program is
  compressed, and when it runs it shows a raster-bar screen reading
  "CRACKED BY MR Z...". There are no error bytes and no second file on the
  image. Any copy protection or per-disk data the original carried is not
  here. Whether the crack changed the game's own code beyond its loader is
  unknown.
- The working copy the emulator uses is `work/lcp.d64`. The contributor's
  file is kept read-only beside it. After two boots and several minutes
  of play, the working copy's SHA-1 was still the original's: nothing had
  been written to the disk.

## Emulator

- Build line from `tools.py status`: `own build at
  /Users/air/dev/vice-mcp-fixed/install (git 8a07b08d5c on fixed)`. That
  commit is branch `fixed` of https://github.com/air/vice-mcp: VICE 3.10
  with vice-mcp v3.11.0, plus barryw/vice-mcp pull requests #6, #7, #11
  and #14 to #24. It is the macOS arm64 GTK3 build.
- `tools.py check-emulator`: 56 passed, 0 failed. No failed checks, so
  `workarounds.md` does not apply.
- The machine was PAL: 6569 VIC-II, 6581 SID, `MachineVideoStandard` 1.

## From power-on to play

1. `python3 kit/scripts/tools.py vice`, then hard reset, then
   `vice_autostart` the image, which has a single file (index 0). Autostart
   loads with warp on and types `RUN`.
2. The program unpacks itself in a few seconds. Then the crack screen
   appears: raster bars and "CRACKED BY MR Z...", 10 to 17 s after
   autostart in two boots. It has no trainer and no options. It waits at least seven
   seconds, or until any key or fire on port 1 is pressed, then hands over
   by itself. No input is needed. Snapshot: `work/crack-screen.vsf`.
3. The game draws the house and asks, on the top line, "Enter time of day
   (HH:MM am/pm)". Snapshot at the prompt, before typing:
   `work/time-prompt.vsf`. The game scans the keyboard matrix itself.
   Text typed into the KERNAL buffer with `vice_keyboard_type` lands in
   `$0277` and is never read. Type with `vice_keyboard_matrix`, holding
   each key for 4 frames: `1`, `0`, `:` (row 5, column 5), `0`, `0`,
   `SPACE`, `A`, `M`, `RETURN`. The line then reads "10:00 am".
4. After `RETURN` the prompt line clears. Within about two seconds a
   little person is at the front door, bottom right, and starts walking
   through the house. A dog wanders on its own.
5. Steady-state snapshots, both taken with the machine stopped by
   `vice_execution_pause` at a screen that had been looked at:
   - `work/play-01.vsf`, about a minute after `RETURN`. The person is out
     of sight beyond the attic door, and the dog is in the attic.
   - `work/play-02.vsf`, a little later. The person is sitting in the attic
     chair and the dog is in the kitchen. **This is the snapshot the
     disassembler reads.**

## Steady state

- `$00`/`$01` = `$2F`/`$35`: BASIC and KERNAL ROM are banked out and I/O
  is in. The RAM image in the snapshots starts at file offset 209
  (checked against the code at `$082B` and `$0713`).
- The game owns the hardware vectors in RAM:
  - IRQ: `$FFFE` → `$082B`, a shim that pushes A, X and Y as the KERNAL
    does and jumps through `$0314` → `$0713`, the game's handler.
  - NMI: `$FFFA` → `$0833` → `JMP ($0318)` → `$082A`, an `RTI`. RESTORE
    does nothing.
  - RESET: `$FFFC` → `$0340` → `JMP $0434`, the cold start. The cold
    start copies these six bytes from `$46BD`.
- Measured with non-stopping checkpoints over 2 s of play: `$082B` and
  `$0713` 285 hits each, about 2.85 a frame. `$0833`, `$082A`, `$EA31`
  and `$FF48` got 0 hits. The handler tests `$D019` bit 0: raster
  interrupts go to the sprite work, and any other source calls `$8018`.
- Video: VIC bank 1, `$4000`–`$7FFF` (`$DD00` = `$96`). Bitmap mode
  (`$D011` = `$3B`). `$D018` = `$79`, which puts the bitmap at `$6000`,
  the colour matrix at `$5C00` and the sprite pointers at `$5FF8`. The
  raster handler multiplexes the sprites: across one-second samples the
  eight hardware sprites were reassigned among the person (four sprites:
  two colour layers, top half and bottom half), the dog (two layers) and
  two sprites at fixed positions low on the screen. `$D011`, `$D016` and
  `$D018` are rewritten by the raster handler, so a sampled value belongs
  to whichever band last wrote it.
- Memory: the unpacked program uses nearly every page from `$0200` to
  `$FFFF`. The only exceptions in `play-02` are `$4C00`–`$4FFF` and
  `$DE00`–`$DFFF` (zero) and two bitmap pages (`$6000`–`$61FF`) that
  hold nothing but `$55`. `$0340`–`$03FF` is a jump table followed
  by game variables.
- No overlays. The disk has one file and nothing was loaded after the
  unpack. Whether the game ever reads or writes the disk later (to save,
  say) is open. The sweep looks for serial-bus and KERNAL I/O calls.

## The loader, in a paragraph

The one file loads at `$0801`–`$C595` behind the BASIC line `SYS 2066
C.C.S.`. The code at `$0812` raises `$01` to `$38` (all RAM), copies an
unpacker into zero page and the stack page (from `$00FB`) and 256 bytes of
the file's tail to `$FF00`, and unpacks the game over the whole of memory.
While it runs, the program counter samples in `$0106`–`$018F` and
`$0831`–`$0845`. The unpacked image carries Mr Z's crack screen at
`$4800`–`$4BFF`, with its raster interrupt at `$4A10`. That screen polls
the keyboard and control port 1 for 6 × 65,536 passes of a 19-cycle loop
(at least 7.6 s on PAL) or until a key or fire is pressed. It then calls
`CINT` (`$FF81`), `IOINIT` (`$FF84`) and `$E518`, puts `$0314` back to
`$EA31` and blanks the screen. It copies `$4B40`–`$4BFF` to
`$0340`–`$03FF`, calls `$4861` twice (with `$044C` and `$D8CC`, a screen
and a colour-RAM address) and jumps to `$0340`. That is the game's jump
table and reset vector, and it leads to the cold start at `$0434`. Not
annotated further, by policy.
