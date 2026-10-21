# The intro — verified technical facts

Files IA and IB, entered at `$4750`. Every address here is this part's.
Unless marked *live*, a fact comes from the code in `work/entry.vsf`,
stopped on `$4750`.

- `intro_start` (`$4750`): its own raster interrupt (`$48E2`), the tune on
  three voices (sequences 1-3 of the intro's driver at `$4000`), then five
  scenes, each run by `run_scene` (`$54BF`) until an actor's script ends,
  then `intro_end` (`$48B4`), which gives the machine back to the KERNAL
  and jumps to the resident's fresh start.
- Pictures: five, each three packed streams (bitmap to `$2000`, screen
  colours to `$0C00`, colour RAM through `$0C00`), described at
  `picture_streams` (`$4D32`).
- Actors: six records of 39 bytes from `$5A50`, each with a script
  (`read_script`, `$5554`: `$F0` jump, `$F1`/`$F2` speeds, `$F3`/`$F4`
  position, `$F5` end, else a frame command).
- Sprites: eight pairs, a black hires sprite over a multicolour one;
  pairs 0-3 written straight to the chip (`sprites_upper`, `$57D9`), pairs
  4-7 sorted by height (`sort_lower`, `$59BE`) and set by four raster
  bands (`build_bands`, `$581B`; `$58DE`, `$5916`, `$594E`, `$5986`).
- Images: 148 packed streams from `$5B40`, unpacked into one of two
  buffers per pair, cached by image (`show_image`, `$4EAA`).
- A step every fourth frame (`step_divider`, `$5722`); fire on port 2 ends
  the intro (`intro_irq_main`, `$48F4`).
