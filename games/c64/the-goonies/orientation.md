# The Goonies — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Two G64 images, both from the contributor:

| File in `work/` | Uploaded as | Directory |
|---|---|---|
| `goonies-original.g64` | `the_gooniesdatasoft_1985original_music.g64` | `"goonies" 64 2a`: `goonies` (1 block), `?`, `firstblock`, `secondblock` (5 blocks each), 392 blocks free |
| `goonies-usgold.g64` | `the_gooniesus_gold_1985new_music.g64` | `"the goonies" 64 2a`: `booter` (1 block), `?`, `firstblock`, `secondblock`, 392 blocks free |

The analysed build is `goonies-original.g64`, the Datasoft release. It
prints its own version line on the V key: "V 1 BY SES" (`messages`,
`$84E8`). Both disks are 42-track G64 images and keep the game outside
the directory: of the four files only the boot file reads through the
1541's DOS (`c1541 -read` fails on the other three, "Cannot find track:
17 sector: 3"). The boot file `goonies` is 130 bytes with load address
`$00AC`, so it lands over the end of zero page and the stack page.

The US Gold disk was taken to its own hand-over (`work/usgold-entry.vsf`)
and compared with the Datasoft one there: about 23,000 bytes between
`$0800` and `$FFFF` differ, spread over the whole program. It is a
different build, not analysed further. The C64-Wiki lists its known
differences (`features.md`).

## From power-on to play

1. Hard reset, attach `goonies-original.g64` and autostart it (VICE
   `x64sc`, PAL, true drive emulation on: the loader talks to its own
   drive program).
2. The boot file runs in the stack page (an execute checkpoint on
   `$0100`-`$01FF` counts some 10,000 hits in the first 20 seconds) and
   loads the game with a custom transfer. About 25 seconds after
   autostart the computer executes `$0800` for the first time.
3. Stop at that first execution of `$0800` (an execute checkpoint with
   stop): this is the hand-over. Saved as `work/entry.vsf`.
4. Let it run. The title picture loads and the attract mode starts
   demonstrating scenes. F7 (or fire in port 1) starts a game at scene 1;
   the scene's picture loads from disk (the screen is blanked meanwhile).
   Saved once both Goonies stand on the top floor at the left:
   `work/play-scene1.vsf`.
5. Any other scene: poke its scene index into `$12BC` (the first scene
   of a new game) and press F7 (`new_game`, `$0868`). Saved this way:
   `work/scene0.vsf` to `work/scene8.vsf`, by scene index. The play order
   differs from the index for two scenes:

   | Scene (play order) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | ending |
   |---|---|---|---|---|---|---|---|---|---|
   | Index (`$12B9`) | 0 | 2 | 1 | 3 | 4 | 5 | 6 | 7 | 8 |

   Index 9 is the title picture.

The disassembler session runs on `work/entry.vsf`, which still holds the
start-up check at `$0800` that the game wipes before play. The listing is
built from `work/play-scene1.vsf`.

## Steady state

- Processor port `$01` = `$35`: RAM everywhere except the I/O area; the
  KERNAL and BASIC ROMs are out for the whole game.
- Vectors in RAM under the KERNAL: IRQ `$FFFE` = `$0A03` (the raster
  interrupt at line `$FB`, once a frame), NMI `$FFFA` = `$0A76` (an
  `RTI`, so RESTORE does nothing). The KERNAL's `$0314` is not used.
- Two screens and two bitmaps, drawn alternately: bank 0 with the screen
  at `$0400` and the bitmap at `$2000`, bank 1 with the screen at `$6000`
  and the bitmap at `$4000` (`irq`, `$0A03`).
- The game is one load. Only the pictures are read from disk while it
  runs: each scene's background, unpacked into the bitmap when the scene
  starts (`load_scene_graphics`, `$6F7A`). Everything else, the code for
  all eight scenes, their collision maps, the shapes and the music, stays
  in memory from the hand-over on.

## The loader, in a paragraph

The 130-byte boot file loads over the stack page, so the KERNAL's `LOAD`
returns into it, and it starts the copy-protected load from tracks the
directory does not list. The game it leaves in memory carries its own
scene loader (`$2000`-`$21AB`), which talks to a program in the drive: it
sends command `$69` with the scene number, then fetches the picture in
blocks with command `$78`, each byte sent two bits at a time over the
serial bus's clock and data lines and decoded with a sixteen-entry table
(`load_scene_picture`, `$2132`; `decode_byte`, `$2193`). Between loads the
loader's 2 KB is kept under the I/O area at `$D800`, because the space it
runs in is bitmap the rest of the time (`save_loader`, `$6800`). The boot
stages before `$0800` were not annotated, by policy.
