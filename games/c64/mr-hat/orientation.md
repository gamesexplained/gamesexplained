# Mr. Hat — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`mrhat.t64` (29,017 bytes, SHA-256
`1825d07c0490dd00191599178e403336a0048749c751a45bbe1599ab0c5f875b`,
MD5 `9288be04679c4137e38abdbd27dfa7ca`), the contributor's own copy: a
T64 tape archive whose name field reads `ASS PRESENTS:` and which holds
one program, `MR. HAT`, loading at `$0801`-`$78F9` (28,921 bytes). Its
BASIC line is `1001 SYS2066`.

It is not the magazine's own tape. The program is a **freezer backup**
(`kit/skills/c64/c64-reference`, "Freezer-cartridge backups"): a packed
image of the running game, saved while it sat on its title screen and
repacked with a depacker of its own. Who made it is unknown; `ASS` is the
only name in the file, and no intro, trainer or credit appears on screen.
The original program is still inside it: at `$0801` the unpacked image
holds the game's own BASIC line, `10 SYS 2157` followed by the text
`SYSTEM EDITOR<<<E **`, and `SYS 2157` is `$086D`, the game's entry
(below). The magazine's publisher was Systems Editoriale, which the text
matches.

## From power-on to play

1. Power-cycle the emulator (`vice_machine_reset`, `mode: hard`), resume
   it, and wait for `READY.`.
2. `vice_autostart` `work/mrhat.t64`. VICE loads the tape file through its
   traps in a second or two and types `RUN`. Autostart turns warp mode on;
   turn it off (`vice_machine_config_set`, `WarpMode` 0).
3. After about fifteen seconds of unpacking, the title appears: "SYSTEMS
   PRESENTS A NEW GAME WITH" over the cast (Mr Hat, Octopus, Snaily,
   Dinky, Kniffy, "and all others") with music.
4. **Fire on joystick port 2** starts play. The title waits in a loop at
   `$1770` for `$DC00` to read exactly `$6F` (fire alone). Room 1 of
   stage 1 appears at once, in bitmap mode, with SCORE, ROOM and STAGE on
   the bottom line and a LIFE panel on the right. The stick moves Mr Hat
   (hardware sprite 4) along the bottom floor.

`work/boot.py` does steps 1 and 2. Snapshots in `work/`, each saved
without ROMs:

| File | State |
|---|---|
| `handover.vsf` | a stopping checkpoint on `$1770`-`$1776` after the freezer's resume, from a power-cycled machine: the game's first instruction, `$1773`, with the stack it was frozen with. **The disassembler and the listing are built from this one.** |
| `restart-title.vsf` | the same machine, restarted at the game's own entry `$086D` (PC `$086D`, SP `$F6`) and stopped again at `$1773`: identical to `handover.vsf` but for `$00A2` and `$C438`, two counters |
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
The program is not reloaded: the tape holds one file, and no `JSR` or
`JMP` to the KERNAL's `LOAD` (`$FFD5`), `SETLFS` or `SETNAM` is in the
image. Because play overwrites the title's character
set, the hand-over is the image to read, not a play snapshot.

No page of `handover.vsf` holds VICE's `$00`/`$FF` power-up pattern. The
all-zero ranges are `$2000`-`$27FF` and `$2A00`-`$3EFF` (the bitmap,
filled by play), `$A000`-`$A0FF`, and `$D100`-`$FFFF`, which lies under
I/O and the KERNAL. The restart from `$086D` rebuilt the same memory,
so the freezer lost nothing the start-up needs; whether it lost anything
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
