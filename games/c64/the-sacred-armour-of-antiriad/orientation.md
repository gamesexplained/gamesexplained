# The Sacred Armour of Antiriad — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Sacred_Armour_of_Antiriad_The_1986_Palace_Software.d64` from the
archive.org item `d64_Sacred_Armour_of_Antiriad_The_1986_Palace_Software`
(174,848 bytes, MD5 `dadadbe50ae657af3f5441497c44d6de`), kept as
`work/antiriad.d64`. The header is a plain 35-track sector image with no
error bytes; `kit/c64/disk.py` reads its 683 sectors with no bad checksum.
The disk is named `ANTIRIAD.D64`, id `E9`, and holds one file:

| File | Type | Blocks | Bytes | Loads at |
|---|---|---|---|---|
| `ANTIRIAD` | PRG | 184 | 46,635 | `$0801` |

It is not the original disk. The original loaded with its own loader; this
is a one-file crack, the whole game packed into one program behind a BASIC
line, `1986 SYS2080 SCI 666`, and four more packer stages (below). The
game's own code is reached through the KERNAL's reset routine and a
cartridge signature the last stage leaves at `$8000`. No trainer or menu
appears.

Emulator: release v3.13.2, `v3.13.2-linux-x86_64-gui.zip`, PAL. Its
`check-emulator` passed 57 of 57 on 24 October 2026, so no workaround
applies.

## From power-on to play

1. Hard reset (power cycle), then autostart `work/antiriad.d64` (the first
   file). The load and the five unpacking stages take about 50 seconds of
   warp from power-on to the game's first instruction.
2. No loader screen to answer: the border flashes while the stages unpack,
   then the title appears (the ANTIRIAD logo between two statues, Tal in
   his armour on the floor and a flying drone).
3. Press fire on joystick port 2 (held about a second) at the title. Play
   starts at once on the first forest screen: Tal on foot, no armour, the
   status panel drawn at the bottom of the screen.
4. Snapshots, in VICE's `.vsf` format, saved without ROMs:
   - `work/entry.vsf`: the hand-over, stopped on `$8009`, the game's first
     instruction, with a stopping checkpoint armed on `$8009` before the
     autostart (it is RAM through the whole load). The listing is built
     from this one (below).
   - `work/play-start.vsf`: the first screen of play, saved a few seconds
     after the fire press, the moment shown in the screenshot taken with
     it.

The hand-over and the first screen of play differ in 3,880 bytes: zero
page and the stack, `$0200`-`$03FF`, `$0461`-`$0699`, `$4000`-`$43FF`,
`$7740`-`$7FFF` and the hardware vectors. At the hand-over `$0400`-`$07E7`
still holds the KERNAL's start-up screen and `$7740`-`$7FFF` is fill; in
play both hold the game's working data. `$4000`-`$43E7` holds bytes at the
hand-over that become the screen in play, but nothing reads them first: a
load watch on the range from the hand-over stayed silent for ten seconds,
while a store watch stopped at once on the clear at `$8D51`. So the two
images agree except in working state and in bytes nobody reads, and the
hand-over is used for the listing because it holds every variable at the
value the program starts with.

## Steady state

- Processor port `$01` = `$05` (read `$15`, the cassette sense bit set):
  all RAM, with the I/O chips at `$D000`-`$DFFF`. Neither ROM is visible;
  the game replaces the KERNAL entirely.
- Hardware vectors in RAM, written by the entry routine: IRQ `$FFFE` =
  `$AE41`, NMI `$FFFA` = `$AFC4`.
- Video bank 1, `$4000`-`$7FFF` (`$DD00` low bits `%10`). One frame of
  play recorded with `kit/c64/frame.py capture` (`work/frame-play.json`)
  shows six writes to the video chip and none to the interrupt vectors:
  at line 179 `$D01A` = `$F3` and at line 180 `$D018` = `$0D` (screen
  `$4000`, characters `$7000`, the status panel); at line 251 `$D01A` =
  `$F7` and `$D018` = `$0F` (characters `$7800`, the playfield), then the
  first two sprites' Y position and X position (`$D00F`, `$D00D`). One
  handler, `$AE41`, serves the frame. Those register values are as the
  recording reads them back from the chip, whose unused bits read as 1:
  the game writes `$03` and `$0C` at the panel's line and `$07` and `$0E`
  (`zp_d018`) at the playfield's (`raster_bands`).
- The game's code starts at `$8009`, the cold-start address of the
  cartridge-style header at `$8000` (`09 80 09 80 C3 C2 CD 38 30`, "CBM80").

## The loader, in a paragraph

The program is five unpacking stages, each copying its routine into the
stack page or the cassette buffer and running it from there. Stage one
(`$0820`, the BASIC line's SYS target) copies a bit-stream decruncher to
`$00FA`-`$01CB` and `$0334`-`$03A6` and runs it from `$0100`; it ends by
banking the ROMs back in and jumping to `$0810`. Stage two moves the data
again and runs a run-length decoder from `$0100`, which calls `$CF00` (it
points BASIC's start and end at `$0801`-`$C236`) and jumps into BASIC's
interpreter at `$A7AE`, so the new BASIC line `1986 SYS2073 MIAMI BEACH`
runs. Stage three (`$0819`) moves the data to the top of memory and runs
a decruncher from `$0500`, which writes its output upward from `$0814` and
jumps there. Stage four (`$0814`) moves it down again and runs another
decoder from `$0100`. That one ends with `lda #$37 / sta $01 / cli / jmp
($00FD)`, and `$00FD` holds `$FCE2`, the KERNAL's reset routine. The reset
finds the "CBM80" signature the stages have left at `$8004` and jumps
through `$8000` to `$8009`. None of the stages is the game's; they are not
annotated further.

The disk's one file, searched for in 16-byte pieces, is found in neither
snapshot except for 15 pieces of the first stage's own code: everything
else in memory is built by the unpacking.
