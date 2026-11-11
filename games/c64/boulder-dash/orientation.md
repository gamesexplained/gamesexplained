# Boulder Dash — orientation

How to get from the contributor's own copy to the analysed state.

## The image

`Boulder Dash.d64`, a 35-track disk image named `C64.COM`. Its directory holds one program, `BOULDER DASH`, 65 blocks (16,499 bytes with the load address `$0801`). It is a re-packaged copy, not the publisher's own disk: the program starts with a BASIC line `SYS 2088` (`$0828`), a short copier that moves the game from `$0870`-`$4870` to `$5000`-`$8FFF` and jumps to `$8E69`. The title screen reads "(C)1984 First Star Software Inc."

## From power-on to play

1. Attach the image to drive 8 in VICE and load with `LOAD"*",8,1` then `RUN` (autostart does the same).
2. The copier runs for a moment and the title screen appears. The title steps through a demonstration of play by itself (`demo_play`, `$8CAA`) until a key or the fire button is pressed.
3. Joystick port 1 is the one the game reads. Fire must be held about half a second to register, and the F1, F3 and SPACE keys likewise need a held press (`key_down`, half a second, `key_up`).
4. Fire at the title starts cave A, level 1. Two snapshots were taken: `work/entry.vsf` at the hand-over to `$8E69`, and `work/play-cave-a.vsf` a few seconds into cave A, level 1. The listing is built from the play snapshot, with the entry snapshot to show what the copier left behind.

## The parts

The game is one load. Nothing is read from disk after the copier has run.

## Steady state

The game's code and tables occupy `$5000`-`$8FFF`; the cave's map is the 40 by 22 bytes from `$0850`, the cave's header and records are copied to `$2400`, the VIC reads two character sets at `$2000` (text) and `$3000` (tiles), two screens at `$0C00` and `$2C00` are filled in turn from the scroll buffer at `$4000`, and the variables are at `$9800`-`$9DFF`. The raster interrupt at `$8A0C` runs the title animation or the frame update. Nothing is reloaded for later caves: the caves are all in the table at `$582E`.

## The loader, in a paragraph

The BASIC stub and the copier at `$0828` are the packager's, not the game's. The copier moves 16,384 bytes in a loop with two zero-page pointers and jumps to the game's real start. It is not annotated further. The same entry point, `program_entry` at `$8E69`, is also the target of the NMI vector the game sets, so the RESTORE key restarts the program (traced in the code, not tried).
