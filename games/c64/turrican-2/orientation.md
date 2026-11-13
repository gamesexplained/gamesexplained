# Turrican 2 — orientation

The selected release is the Triangle disk pair from the C64Games archive.
No trainer or crack menu appeared during boot.

## The image

The archive was downloaded from
`https://www.c64games.de/hugo.php?Dateiname=%2Ft%2Fturrican_2.zip&art=d&fil=282`.
The selected images are `Turrican_II_-_The_Final_Fight_(Triangle)_S1.d64`
and `Turrican_II_-_The_Final_Fight_(Triangle)_S2.d64`, kept in
`work/media/`. Each is a 174848-byte sector image, rather than a GCR image
with a misleading extension. The directory reader reports 683 sectors,
no bad sector checksums and no allocated sectors outside files on side one.
`media.json` inventories the selected disk pair. Other releases in the ZIP
are comparison material, rather than additional parts of this release.

## From power-on to play

1. Start VICE through the kit launcher. This run uses the official
   v3.14.0 macOS ARM64 **headless** ZIP with `-sound -sounddev dummy`.
   Its missing shared libraries are supplied by the already installed
   v3.14.0 GUI release's bundled library directory. The executable and
   a small launch wrapper remain under `tools/`; no Homebrew package was
   installed. The launcher reports this manually selected release as an
   own build, so its inferred repository revision is not the emulator's
   provenance.
2. Hard reset, then autostart side one. The first directory program is
   `TURRICAN II/3532`, loading at `$0801`. Allow the story intro to appear.
   A fire press in joystick port 2 advances to the title loading screen.
3. At the title, hold and release port-2 fire. The game shows
   `LOADING LEVEL 1-1`. Warp may be used for loading, then disabled before
   measurement.
4. A stopping read watchpoint on `$DC00` catches `$2DE0` reading fire and
   stops at `$2DE3` after the load. This is gameplay, with the playfield
   and status panel visible. The first snapshot is
   `parts/level-1-1/work/play-level1.vsf`.
5. For a load hand-over, load the saved title state, attach side one,
   arm an execution checkpoint at `$551B`, hold port-2 fire and resume.
   Release fire at the stop. This produces
   `parts/level-1-1/work/entry.vsf`, immediately after the level file
   returns from the loader and before level initialization. The first
   initialized capture is retained as `work/initialized.vsf`;
   `work/play-steady.vsf` is a later gameplay state.

## The parts

Snapshots obtained through the game's own disk loader cover levels
1-1, 1-2, 2-1, 2-2, 3-1, 3-2, 3-3, 4-1, 4-2, 5-1 and 5-2, followed by
the ending. Their disk filenames are `11`, `12`, `21`, `22`, `31`, `32`,
`33`, `41`, `42`, `51`, `52` and `EX`. The file `23` therefore remains
an open media question rather than being assumed to be another level.

The targeted trace in `work/next_level.trace.json` follows the stage
dispatcher from `$0A49` into `$544A`. That routine increments `$03EF`,
takes the next filename from `$8FEC/$8FED`, and passes its characters in
X and Y to the fast loader. To reach each next level without playing
through it, stop at the stage dispatcher, set `$03E4` to four and resume
at `$0A49`, stopping at `$551B` before initialization. At index four,
attach side two when `TURN THE DISK !` appears and press port-2 fire.
At index eleven, the loaded ending is also captured at `$551B`; its
program subsequently begins at `$7A01` instead of initializing a level. This is a controlled loader route, not a playthrough.

Across the eleven level snapshots, `$0C00-$5FFF` and `$6400-$67FF` match
byte for byte. Changes below `$6C00` are concentrated in state, pointers
and self-modified operands. The resident engine is counted separately;
each overlay owns `$6C00-$FF7F`. The title and ending also replace this
upper region. An intro snapshot and complete load-to-memory attribution
remain to be added before this orientation is complete.

## Steady state

The processor port is `$35`, with direction register `$2F`. The hardware
IRQ vector is `$0A2F`; the NMI vector is `$0A3F`. The IRQ entry saves
registers, acknowledges the VIC through `DEC $D019` and jumps through
`$06D1`. A frame capture watching that pointer records the scheduling
chain as well as the bank and display-mode changes. The status panel
uses a different video bank from the playfield. RAM vectors at
`$0314-$0319` are zero in the saved gameplay state; this game uses the
hardware vectors with the ROMs banked out.

The headless capability check on 13 November 2026 reported 56 passes
and two failures: host-key input, and a checkpoint-list error during the
final server-quirk probe. Matrix-key input, exact stopping checkpoints,
single-instruction stepping, stopping load/store watchpoints, frame
advance and snapshot determinism passed. Use matrix keys, rather than
host key names. The headless build's measured exact stops supersede the
kit's older warning that its pause implementation does not halt the CPU.
Dummy audio is the contributor's requested configuration; SID-dependent
reads must be investigated before relying on their values.

## The loader, in a paragraph

The boot program presents the story intro and title, then the resident
engine loads named level and auxiliary files with a custom fast loader.
Each level's header provides its successor's two-character filename.
Some transitions also load an `S`-prefixed auxiliary file and copy its
buffer into RAM beneath I/O, temporarily selecting `$34` through the
processor port. The game asks for the second disk before world three.
The loader itself is outside the explanatory subject; its files, the
pictures and music it presents, and all gameplay loads remain in the
media inventory.
