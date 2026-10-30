# Resident: the disk operating system and the episode loader: facts

The episode loader at `$0800`, read from the sectors no file holds, and
the OS, `XXXMYOS1`, which copies itself to `$EB00`-`$FFFF`. Listed from
episode one's hand-over, where both are in place. Every fact names the
routine or table it comes from, in this part's listing.

## The boot and the episode loader

- `GAME` is `SYS 3584`. Its code at `$0E00` reads track 1, sectors 0 to
  4, into `$C000`-`$C4FF` with the drive's block commands, three tries
  each, and the second stage decodes itself (`EOR #$FF` from `$C071`) and
  fetches the episode loader into `$0800` (`orientation.md`). The
  loader's own sectors were not decoded further.
- `episode_loader` (`$080E`): on the first run (`$99` = `$2C`) it points
  the NMI at an RTI, so RESTORE does nothing, loads `XXXMYOS1` with the
  KERNAL and runs its installer at `$8000` (`install_os`). Then it runs
  `XXXCOPY` (`run_protection`) and the title (`run_title`), and loads and
  starts the episode the title returns.
- `episode_file_names` (`$0884`) holds eight-character names:
  `XXXMYOS2`, `XXXPART1`, `XXXICONS`, `XXXPART2`, `XXXPART3` (which
  nothing loads and the disk does not have), and the title's.
- `irqs_off` (`$092E`) writes to `$DC1A` and `$DD1A`, which the CIAs
  decode as register `$0A`, the time-of-day clock's hours, so the CIAs'
  interrupts are not touched there.

## The OS

The KERNAL is banked out (`$01` = `$15`) and the OS runs in the RAM under
it.

- `os_call` (`$EC00`): `JSR $EC00` with a function number in A, `$00` to
  `$56`, through `os_function_table`; X and Y pass through. Functions
  `$10`, `$11`, `$2D`, `$2E`, `$35`, `$38`, `$3F`, `$4D`, `$54` and `$55`
  read arguments from the bytes after the caller's JSR
  (`os_inline_args`). `$EC03`, `$EC06`, `$EC09` and `$EC0C` print a
  character or the string after the call, in the current window or in
  window X.
- Of the 87 numbers, `$07`, `$16`, `$17`, `$1B`, `$3A`-`$3D` and
  `$41`-`$45` are zero, so a call jumps to `$0000`, and `$0A`,
  `$18`-`$1A`, `$1C`-`$1F`, `$21`, `$23` and `$39` lead to `JMP $FC00`,
  which lands inside an instruction. A second bitmap at `$C000` was
  planned (`draw_to_second_bitmap`, `clear_second_screen`) and never
  finished.
- The screen: a hi-res bitmap at `$2000` with its cell colours at `$0C00`
  (`video_setup`), the background a pattern of white and black stripes
  (`clear_screen`).
- 16 windows (`window_table`, `$0200`): 0-7 plain, 8-14 keep what they
  cover in a stack that starts at `$C810` (`open_window_saved`,
  `close_window`). Each has a double frame, black outside and white
  inside (`draw_frame`).
- 32 icons (`icon_table`, `$0300`): a picture of rows of pixels, one bit
  a pixel, in a rectangle of cells within a window, with a colour byte
  (`add_icon`, `erase_icon`). While the KERNAL is in for the disk, page 3
  is swapped with the KERNAL's own (`swap_page3`).
- The pointer is sprites 0 and 1, a shape and its outline, with a hot
  spot (`pointer_shape`, `pointer_move`); the OS's own is a yellow arrow
  (`arrow_shapes`).
- Text: `font` (`$FDB2`), the space to `$61` in cells five pixels wide
  and seven high, `$60` a pound sign and `$61` a solid block. Control
  codes 9 (tab to X), 10, 12 (clear the window) and 13 do something; the
  others return (`control_codes`). Lines wrap at the window's edge, with a
  hyphen when a word is broken (`wrap_check`).
- Input: `read_key` scans the keyboard matrix itself and `key_codes` maps
  it to ASCII; SHIFT changes nothing, as both branches of `key_code` read
  the same table. `input_line` (`$F102`) flashes a block cursor every 19
  calls and takes printable keys and DEL until RETURN.
- The disk: `save_file` and `load_file` copy 256 bytes of disk code to
  `$0700` (`install_disk_code`), keep zero page at `$0413` and the
  KERNAL's page 3 at `$0600`, bank the KERNAL in and call its SAVE or
  LOAD on drive 8. Errors are the KERNAL's numbers: 4 FILE NOT FOUND, 5
  DRIVE NOT CONNECTED (the episodes' `disk_error`).
- `wait_x` (function `$09`): X times 256 loops, about 1.3 ms each on
  a PAL machine.
