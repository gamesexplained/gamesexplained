# Explorer — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`work/explorer.d64`, a 35-track D64 of 174,848 bytes (MD5
`858dc180d51b1b905e6f0277c61672db`), the TOSEC image "Explorer
(1987)(Electric Dreams)" from the Internet Archive's item
`Explorer_1987_Electric_Dreams`. Its header is blank with the ID `64`, and
it holds one file, `EXPLORER`, 102 blocks (25,785 bytes) loading at
`$0801`. GameBase64 lists the same length for its copy.

This is not the release as Electric Dreams sold it but a **freezer
backup** (`kit/skills/c64/c64-reference`, "Freezer-cartridge backups"):
the file is a `SYS 2049` line and an unpacker that copies itself to
`$00FA`-`$01F9`, banks everything to RAM, unpacks the whole of memory and
ends with an `RTI` at `$01EF` into the middle of the running game, at
`$08F7`, with the registers A `$70`, X `$03`, Y `$4E`. The screen memory
at `$0400` still holds the freezing machine's `DOLPHINDOS 2.0` start-up
text and its `LOAD`.

The backup kept the release's own loader, a 93-byte program at
`$C400`-`$C45C` with the names of the two files it loaded at
`$C49D`-`$C4BC`: `EXPLORER     PIC`, then `EXPLORER    GAME`. It loads the
picture, copies its bitmap (`$2000`-`$3F3F`) to `$E000` and its screen
colours (`$3F40`-`$4327`) to `$C000`, sets the border from `$4328`, shows
it in VIC bank 3, loads the game over the picture's old copy and jumps to
`$0803`, the game's own entry. That `JMP $0803` and the stack the backup
resumes with agree: the return addresses on it are `$383D`, `$099D` and
`$0808`, a chain from the `JSR $0993` at `$0806`.

`work/explorer-triad.d64` (MD5 `b11f059caf2e728b627e7add5f08bcba`) is
Triad's crack of the same release, "compacted 11-Feb-87 by Skydive", from
the Internet Archive's item `Explorer_1987_Electric_Dreams_cr_Triad`. At
the title its memory agrees with the backup's from `$0800` to `$3FFF`,
from `$4400` to `$49FF` and from `$8000` to `$BFFF`, apart from the BASIC
line's two bytes at `$0801` and one byte at `$9712` (`$E0` in the
backup, `$20` in the crack). Two releases that agree on every byte of the
code are the best evidence that the code is the original.

## From power-on to play

1. Start VICE with `python3 kit/scripts/tools.py vice`, hard-reset, and
   arm a stopping execution checkpoint on `$08F7` (`arm` in
   `kit/c64/vice.py`). Autostart file 1 of `work/explorer.d64`. After
   about ten seconds the unpacker's `RTI` lands on `$08F7` and the machine
   stops there with the frozen registers.
2. Set PC to `$0803` and SP to `$FA` (the stack depth the chain above
   implies), and save without ROMs. That is `work/entry.vsf`, the game's
   own hand-over and the snapshot the listing is built from. Its RAM is
   the backup's, byte for byte.
3. Run it. The start-up initialises the machine and shows the title, which
   was loaded as a picture, not drawn. Run from `entry.vsf` to the first
   pass of `$08F7` (0.1 seconds), the machine's memory matches the frozen
   backup's in all but eight bytes: six in zero page (the loop counters of
   the routine it was frozen in) and two on the stack page below the
   stack pointer. The backup lost nothing the start-up needs.
4. Fire on joystick port 2 starts a game. The planet comes up in a
   zoom, then the view from above. `work/fly1.vsf` was saved there.
   Three presses of D (each held half a second) landed, and Space
   brought up the menu: `work/ground-menu.vsf`, then `work/ground.vsf`.
   The start position is drawn from the raster line read at `$080C`,
   after the title, so each game starts somewhere else.

## Steady state

The processor port reads `$35` from the start-up on: RAM everywhere but
the I/O area, the BASIC and KERNAL ROMs banked out. The interrupt vector
is the RAM one at `$FFFE`, which the start-up sets to `$0B11`, and CIA 1's
timer drives it (the handler reads `$DC0D`); the NMI vector at `$FFFA`
points at an `RTI` at `$0B24`, so RESTORE does nothing.

The video chip is double-buffered between two banks: bank 1, with its
screen at `$4000` and its bitmap at `$6000`, and bank 3, with its screen
at `$C000` and its bitmap at `$E000`. The routine at `$31A4` waits for
raster line 250, swaps the banks through `$DD00` and sets the display
mode for the view: extended-colour text with the character set at
`$0800` in the bank for the view from above, a hires bitmap for the view
on the ground. The character set is kept twice, at `$4800` and `$C800`,
because each bank needs its own.

Nothing is loaded during play: the disk is used only by the release's
loader.

## Emulator checks

`check-emulator` on the v3.14.0 Linux release passed 57 of 57 on
31 October 2026; no workaround was needed.

## The loader, in a paragraph

Not part of the game, by policy. The backup's unpacker is described
above. The release's own loader at `$C400` loads two files with the
KERNAL, copies the picture into place and jumps to `$0803`.
