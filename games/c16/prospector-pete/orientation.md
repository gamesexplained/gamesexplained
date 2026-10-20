# Prospector Pete — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Prospector Pete (1986)(British Soft).tap`, from the TOSEC set of
11 November 2016 for the Commodore C16, C116 and Plus/4 (Games, [TAP]),
on archive.org as `tosec-20161111-commodore-c16`. It is the Mastertronic
cassette, recorded as a raw tape file: 155,311 bytes, SHA-256
`4ecce75f77d4fa69d9cd424f81016d0f7fe19e8fc16691222e41fdc4238e63e1`,
header `C16-TAPE-RAW` version 1, machine 2, PAL, 79 seconds long. It
carries the original Novaload turbo loader (Plus/4 World gives the
release Novaload serial N103131) and no trainer or menu. Kept as
`work/prospector-pete.tap`.

## From power-on to play

On the kit's plus4emu server (`tools.py plus4emu`, a 16 KB C16, PAL),
through `kit/c16/plus4emu.py`:

1. `reset()`, then 150 frames for BASIC's READY.
2. `tape("games/c16/prospector-pete/work/prospector-pete.tap")`, then
   type `LOAD` and RETURN. The KERNAL finds `PETE`, and the Novaload
   screen comes up while the turbo block loads, about 80 seconds in all.
3. A checkpoint on execution at $1800-$1800 stops at the game's first
   instruction (the loader's `JSR $1800`). Eject the tape
   (`call("tape", eject=True)`) and save `work/entry.p4emu`: the
   hand-over, the snapshot the listing is built from. Saved after the
   eject the file says it is not exact (a few cycles off); loaded again
   it gives the same registers, cycle count and RAM.
4. Run on: the title screen comes up at once with the scroller. Fire on
   the joystick in port 2 starts the game at the level shown (left and
   right choose it; RETURN switches to the keyboard). The screen stays
   black for about a second while the level is built, then shows the
   mine for two seconds before Pete, at the top of the shaft, can move.
   `work/title.p4emu` is the title, `work/play-level1.p4emu` the first
   moment of play on level 1.

## Steady state

- No ROM paging and no bank switching: $FF3E/$FF3F are never written,
  nor $FF14 (the screen stays at $0800, colours, and $0C00, characters).
- The character set is the game's own, 256 characters at $1000-$17FF
  ($FF13 = $11, bit 7 of $FF07 set), multicolour ($FF07 bit 4).
- The interrupt runs through the KERNAL's vector at $0314: $3080 on the
  title screen (`irq_title`), $1991 in play (`irq_play`), which chains
  four raster interrupts a frame ($FF0B: 0, $1A, $AC, $BA).
- Everything is in one load: code from $1800 to $37E7, data and text
  between, the character set below it, and the map at $37EA-$3FFF, whose
  first three rows (the surface) are loaded and whose other twenty rows
  (the mine) are rebuilt for every level. Nothing is loaded again.
- Below $1000 everything is the game's working memory: zero page, the
  water list at $0200, the dynamite list at $0700, and the moving
  figures' shifted frames at $0400-$06FF, built once at start-up.

## The loader, in a paragraph

The tape's first file is a KERNAL header named `PETE` whose 192 bytes,
loaded into the tape buffer at $0333, carry the turbo loader. The KERNAL
program file after it loads into $0140-$023E, over the stack, so that
the KERNAL's own return runs it: at $0203 it calls the I/O set-up, clears
the screen and jumps to $0140, which draws the NOVALOAD screen, copies
the loader into $0333, points the KERNAL's load vector there and calls
it at $033C. The loader reads one turbo block, named `NOVA`, from a $AA
sync byte: a header giving $1000 as its start, $3FFF as its end and 48
pages, then each page with a checksum, flashing the border with the page
count. When the last page is in it sets BASIC's end of program to $3FFF
and calls $1800. The block is $1000-$3FFE, 12,287 bytes, and loads in
about 44 seconds.
