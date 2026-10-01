# Impossible Mission — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`impossible_missionepyx_1984pal.d64` as uploaded by the contributor
(325,814 bytes, SHA-256
`c394df35280f6cd4ec542c7035f3e99dcbeeaa656cf2560591feccdd0891e4ff`).
Despite the `.d64` in its name it is a **G64**, a GCR-level copy of the
disk (its header reads `GCR-1541`, 42 tracks), and it was renamed to
`work/impossible_mission.g64` so that VICE treats it as one. A G64 keeps
the original's copy protection, and this one needs it: the loader checks
the disk (below).

The directory, as VICE's `c1541` lists it (every entry reports 0 blocks):

```
0 ". imposs.miss." im 2a
0    ""                 prg
0    "5im-cass        " prg
0    "bpage"            prg
0    "col"              prg
0    "im..."            prg
0    "load-0800"        prg
0    "loader2"          prg
0    "main0800"         prg
0    "scr"              prg
0    "words"            prg
462 blocks free.
```

`c1541` could read seven of the files through the standard DOS chain:
`col` (`$D800`-`$DBFF`), `scr` (`$0400`-`$07FF`), `im...`
(`$0334`-`$03FE`), `load-0800` (`$0800`-`$08EC`), `loader2`
(`$C000`-`$C3FF`), `bpage` (`$B000`-`$B1FF`) and `words` (`$E000`-`$F77F`).
`main0800` reads as a single block (`$0800`-`$08FF`); the rest of the
program is fetched by the fast loader. `""` and `5im-cass` did not read.
No trainer, intro or cracker's credit appears anywhere: the screens are
Epyx's own, and the image behaves like the original disk.

## From power-on to play

1. Power-cycle the emulator (`vice_machine_reset`, `mode: hard`), resume
   it and let it reach `READY.`.
2. Autostart `work/impossible_mission.g64` (VICE loads `*`, the first
   file). The machine is PAL (`MachineVideoStandard` 1). With VICE's
   default drive settings (true drive emulation on) it loads with no
   `vicerc` changes.
3. Three framed panels appear: "EPYX PRESENTS", "IMPOSSIBLE MISSION",
   "LOADING". With warp mode on, the loader reaches the game's start
   (`$3855`) in about two minutes of host time (136 s to the last loader
   stage at `$C02D`, measured 1 October 2026); with warp off it is much
   slower. Turn warp off again once the game's screen is up.
4. The title state: the agent stands in a lift in a red shaft, the pocket
   computer below shows an empty green display. **Fire on joystick port 2**
   starts the game: the pocket computer shows `SNOOZES:0 LIFT INITS:0`,
   `PSW:` and a clock (`12:14:06` the first time; it runs).
5. The joystick now drives a hand pointer over the pocket computer's
   buttons. Move it to the right-hand block of nine buttons, top-left
   button, then one down (the left button of the middle row) and press
   fire: the pocket computer switches off and the display shows the map
   view. The joystick now moves the agent.
6. Hold **left** for about four seconds: the agent leaves the lift and
   the first room is drawn, with four robots, a bookcase pair, a desk,
   a sofa, a lamp and terminals. That is play.

Snapshots in `work/`, each saved without ROMs:

| File | State |
|---|---|
| `loader-b000.vsf` | a stopping checkpoint on `$B000`, from a power-cycled machine: the loader's `jmp $B000` at `$C317`, the first instruction of the `bpage` unpacker, before the program is moved and unpacked |
| `entry.vsf` (also kept as `gamestart.vsf`) | from `loader-b000.vsf`, a stopping checkpoint on `$3855`: the unpacked game's first instruction, `$01` = `$25`. This is the hand-over `listing.py` compares the play snapshot with |
| `title.vsf` | the title state of step 4, before fire |
| `play-room1.vsf` | step 6: the agent has just entered the first room. **The disassembler and the listing are built from this one** (why, below) |

## Steady state

In play: `$01` = `$35` (RAM at `$A000` and `$E000`, I/O at `$D000`). The
hardware IRQ vector `$FFFE` = `$82F4` and the NMI vector `$FFFA` =
`$388C`; the KERNAL's RAM vectors at `$0314` still hold their defaults
and nothing goes through them with the KERNAL banked out. The IRQ
handler at `$82F4` acknowledges `$D019` and splits the screen by raster
line (it compares `$D012` with `$F0` and reprograms `$D012` to `$AA`),
which is the boundary between the room above and the pocket computer
below. The video chip looks at bank 1 (`$DD00` = `$C6`, bits 0-1 `%10`,
`$4000`-`$7FFF`).

Compared byte for byte with `entry.vsf`, the play image differs in:

- `$3855`-`$3865`: the start-up clears these 17 bytes, its own first
  instructions, in the same loop that clears the sprite registers
  (`sta $D002,x / sta $3855,x` at `$389C`). The bytes as the loader left
  them are in `entry.vsf`: `lda #$60 / sta $DD03 / nop / nop /
  lda #$54 / sta $0318 / lda #$38 / sta $0319 / sei / cld`.
- `$C000`-`$D7FF` and `$F800`-`$FFFF`: tables and graphics the start-up
  builds or moves there (at `$3855` the block that ends up at `$D000` is
  still at `$C800`).
- `$0800`-`$08FF`: loader code at the start, game data in play.
- the screen and character areas in bank 1, zero page, and scattered
  working storage.

The rest of `$0900`-`$BFFF` is unchanged between the two, so nothing is
reloaded: once the game runs, the image in memory is the whole game. The
play image is the one to read, because it holds everything the running
game uses; the only code it lacks is those 17 bytes, recorded above.

Snapshot `title.vsf` and `play-room1.vsf` differ only in variables, the
screen and `$C100`-`$C4FF`.

## The loader, in a paragraph

The first file loads over the KERNAL's vectors and takes the `CHROUT`
vector (`$0326`) to `$02A7`, which clears the screen and loads `col`,
`scr` and `im...` with the KERNAL: the three framed panels. `im...`
(`$0334`) opens the command channel, loads `bpage` (`$B000`) and
`load-0800`, and jumps to `$0810`, which loads `loader2` at `$C000`.
That loads `words` (the speech samples, `$E000`-`$F77F`) and `main0800`,
sets `$01` to `$36` and jumps to `$C300`. `$C300` first calls `$C31A`, which
opens the command channel and a data channel on the drive and reads
characters back; what exactly it asks the drive was not traced, since
the loader is not the subject. Only if `$C3DA` is then non-zero does it
write three bytes into `bpage`: `$38` to `$B0B9`, `$B0` to `$B0C6` and
`$60` to `$B143`. The `bpage` file on the disk holds `$55`, `$E0` and
`$78` there, which make the final jump `jmp $5555`, the self-copy read
from `$E000` instead of `$B000`, and the unpacker's `rts` a `sei`. So the
program on the disk is broken on purpose, and the drive check is what
repairs it: a copy that fails the check crashes after loading. With
this image `$C3DA` was `$FF` and the three bytes were repaired (read in
`loader-b000.vsf` and in the file, 1 October 2026). `$B000` copies
itself to `$0400`, moves `$0800`-`$AEFF` up by `$2800` to `$3000`-`$D6FF`, top page first,
unpacks it with a run-length decoder (`$BF` *n*: *n* zeros; `$CF` *n*
*b*: *n* copies of *b*), and jumps to `$3855`, the game.

Emulator: release v3.13.1, `v3.13.1-linux-x86_64-gui.zip`.
`check-emulator` passed 56 of 57; failed: `pause-at-instruction`
(stops are made with `pause()` in `kit/c64/vice.py`).
