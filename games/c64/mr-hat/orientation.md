# Mr. Hat — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`mr hat (original).D64` (174,848 bytes, a 35-track disk without error
bytes; SHA-256
`49d5f88c98dff47d0a18055f3072a62c773499d51a2f0ec7b1d8c9e41d314d61`,
MD5 `7059c4b03ecfe42cf2db70eb72c79c96`), the contributor's own copy, in
`work/original.d64`. The disk is named `COMMODORE CLUB`, ID `64`, and its
directory holds seven programs: three loaders of 5 blocks, `MR HAT`,
`HAWK MISSION` and `DALTO`, the 7-block `SPRITE SCANNER`, and the three
games they load, `HM` (189 blocks), `MH` (114) and `DA` (109). That is
the side B of *Commodore 64 Club* issue 14 that the German C64-Wiki lists
(read 4 October 2026: "Seite B: Mr Hat, Hawk Mission, Dalto, Sprite
Scanner"), the magazine's second printing of the game; issue 6, the
first (September 1988), was a disk with a `COVER` menu and other
programs, and no copy of it was examined.

`MR HAT` loads at `$0801` (1,253 bytes, `SYS 3223`). It blacks out the
screen, installs a fast loader (drive code kept under the I/O area at
`$D000`, the KERNAL's LOAD vector `$0330` pointed at `$0144`), prints
`"MH",8:` at the top of the screen behind four spaces, and puts HOME and
shifted RUN/STOP (`$13`, `$83`) in the keyboard buffer: back at BASIC, the
cursor goes home, shifted RUN/STOP types `LOAD` over the spaces with a
RETURN and then `RUN`. The three loaders are the same file but for the
two letters of the name (`$0CCA`-`$0CCB`).

`MH` loads at `$0801`-`$78F9` (28,921 bytes); its BASIC line is
`1001 SYS2066`. It is a **freezer backup**
(`kit/skills/c64/c64-reference`, "Freezer-cartridge backups"): a packed
image of the running game, saved while it sat on its title screen and
repacked with a depacker of its own. So the magazine shipped the game as
a frozen image. The original program is still inside it: at `$0801` the
unpacked image holds the game's own BASIC line, `10 SYS 2157` followed by
the text `SYSTEM EDITOR<<<E **`, and `SYS 2157` is `$086D`, the game's
entry (below). Who froze it is unknown; no intro, trainer or credit
appears on screen. `DA` starts with the same depacker (its first 43
bytes are `MH`'s), `HM` with another.

The analysis was first made from `mrhat.t64` (29,017 bytes, SHA-256
`1825d07c0490dd00191599178e403336a0048749c751a45bbe1599ab0c5f875b`), a
T64 tape archive that the contributor took from the GameBase collection, whose name field reads
`ASS PRESENTS:`. Its one program, `MR. HAT`, is `MH` byte for byte, and
the two give the same memory: started from the disk and stopped at
`$1773`, the machine's RAM equals `handover.vsf`'s in all 65,536 bytes,
so the listing, built from that snapshot, is the disk's. Everything below holds for both.

## From power-on to play

1. Power-cycle the emulator (`vice_machine_reset`, `mode: hard`), resume
   it, and wait for `READY.`.
2. `vice_autostart` `work/original.d64` (the first program, `MR HAT`; the
   directory's first entry is an empty separator).
   The loader runs, `LOAD "MH",8` and `RUN` follow by themselves, and the
   depacker starts. Autostart turns warp mode on; turn it off
   (`vice_machine_config_set`, `WarpMode` 0). `work/mrhat.t64` gives the
   same machine: VICE loads the tape file through its traps and types
   `RUN`.
3. After about fifteen seconds of unpacking, the title appears: "SYSTEMS
   PRESENTS A NEW GAME WITH" over the cast (Mr Hat, Octopus, Snaily,
   Dinky, Kniffy, "and all others") with music.
4. **Fire on joystick port 2** starts play. The title waits in a loop at
   `$1770` for `$DC00` to read exactly `$6F` (fire alone). Room 1 of
   stage 1 appears at once, in bitmap mode, with SCORE, ROOM and STAGE on
   the bottom line and a LIFE panel on the right. The stick moves Mr Hat
   (hardware sprite 4) along the bottom floor.

`work/versions/bootcmp.py` does steps 1 and 2 for any of the three copies and stops at the game's first instruction (`$1773` for the disk and the tape, `$086D` for botowrap's fixed version, which starts cold); `work/boot.py` is the tape's. Snapshots in `work/`, each saved
without ROMs:

| File | State |
|---|---|
| `handover.vsf` | a stopping checkpoint on `$1770`-`$1776` after the freezer's resume, from a power-cycled machine: the game's first instruction, `$1773`, with the stack it was frozen with. **The disassembler and the listing are built from this one.** |
| `restart-title.vsf` | despite its name, not a restart: a stop at `$1773` that never passed the title set-up `$CDC0` (a real restart copies the damaged font to `$2848`; here `$2848` is clean), differing from `handover.vsf` only in `$00A2` and `$C438`, two counters |
| `versions/d64-restart.vsf` | the real restart: the disk's machine, PC set to `$086D` and SP to `$F6`, stopped again at `$1773` after the title set-up ran; differs from `handover.vsf` in `$2848`-`$2855` (the damaged font, copied) and `$C436` (a music counter) only, outside zero page, the stack and the RAM under I/O |
| `versions/d64-entry.vsf` | the same stop, reached from the disk: identical to `handover.vsf` in all 65,536 bytes of RAM |
| `title.vsf` | the title screen, running |
| `play-room1.vsf` | room 1 of stage 1, a second of play |
| `entry.vsf`, `entry2.vsf`, `resume.vsf` | the depacker at `$0690`, the freezer restore at `$0948`, and the first IRQ after the resume; for the loader only |

The emulator was vice-mcp v3.13.1 (release zip, Linux x86_64, under
`xvfb-run`), PAL, 6581 SID. `check-emulator` on 30 September 2026: 56 of
57 passed; `warp` failed (78 passes a second in warp against 51 at normal
speed, where the check wants over 100). Nothing below depends on warp.

## Steady state

The game keeps the KERNAL and I/O banked in: `$01` reads `$36` in the
title and in play (RAM at `$A000`-`$BFFF`, I/O at `$D000`, KERNAL at
`$E000`), and it hooks the KERNAL's IRQ vector. On the title `$0314`
holds `$C0AF` (the music), in play `$1C00`, which jumps to `$AAB2`. The
RAM copies of the hardware vectors at `$FFFA`-`$FFFF` are zero, which is
harmless with the KERNAL banked in. The video chip uses bank 0
(`$DD00` = `$C7`): on the title, text mode with the screen at `$0400` and
characters at `$2800` (`$D018` = `$1B`); in play, bitmap mode (`$D011` =
`$3B`) with the bitmap at `$2000` and colours at `$0400`.

Compared byte for byte with `handover.vsf`, `play-room1.vsf` differs in
the screen (`$0400`-`$07FF`), the bitmap and the title's character set
(`$2000`-`$3F4A`, redrawn by the room), zero page, the stack, and a few
scattered variables (`$100C`, `$1371`-`$1383`, `$1C12`, `$1E06`,
`$41DD`-`$4261`, `$4ACD`, `$64F0`-`$64F9`, `$8C58`-`$8C64`, `$C434`-`$C438`).
The program is not reloaded: the game is one file, and no `JSR` or
`JMP` to the KERNAL's `LOAD` (`$FFD5`), `SETLFS` or `SETNAM` is in the
image. Because play overwrites the title's character
set, the hand-over is the image to read, not a play snapshot.

No page of `handover.vsf` holds VICE's `$00`/`$FF` power-up pattern. The
all-zero ranges are `$2000`-`$27FF` and `$2A00`-`$3EFF` (the bitmap,
filled by play), `$A000`-`$A0FF`, and `$D100`-`$FFFF`, which lies under
I/O and the KERNAL. A restart from `$086D` (`versions/d64-restart.vsf`)
rebuilt the same memory but for the font's copy and a music counter, so
the freezer lost nothing the start-up needs; whether it lost anything
the game reads later is checked with store and execute checkpoints on
those ranges during play (`features.md`).

## The loader, in a paragraph

`SYS 2066` runs `$0812`, which copies a depacker to `$00FA`-`$01A0` and
`$0334`-`$03D9` and runs it, unpacking the image upwards from `$0801` to
`$A231`. A stub at `$A220` sets the STOP vector's low byte (`$0328` =
`$E1`, so RUN/STOP is ignored), prints CHR$(142) and CHR$(8) (upper case,
case switch locked) and jumps to `$081B`, a second depacker that banks
everything to RAM (`$01` = `$34`) and runs a byte-stream decoder in zero
page (`$0008`-`$00B4`, bytes XORed with `$12`). The stream calls out to
`$0690` (in what becomes screen memory), which checks two marker bytes on
the stack and goes on to `$0948`: the freezer's restore. It copies
`$0200`-`$05FF` into colour RAM, `$0607`-`$0635` into the VIC registers,
`$0637`-`$0653` into the SID and `$0660`-`$067F` into the two CIAs,
restarts the decoder for the rest of memory, and ends in a routine on
the stack page (`$01C4`-`$01EA`) that copies zero page back from the RAM
under the I/O area, sets `$00` = `$2F` and `$01` = `$36`, and returns with
`RTI` to `$1773` with A = `$7F`, X = `$50`. The game resumes in its
title's fire loop, called from `$16EE` in the title routine `$16A3`,
which `$0876` calls from the entry `$086D`, which BASIC's `SYS` called.
