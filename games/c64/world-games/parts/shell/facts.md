# The shell: facts

File `L` of side 1, loaded at `$0900` by the boot and resident for the
whole game, with the world records (file `R`, `$0E00`) and the unpacker
(file `C`, run at `$D000`). Every fact names the routine or table it
comes from, in this part's listing.

## Memory

| Range | What |
|---|---|
| `$02A7`-`$0303` | the boot, file `WORLD GAMES` (`boot`): over BASIC's main-loop vector at `$0302`, so it starts itself after the load; loads `L` and jumps to `cold_start` (`$0C44`) through `$0909` |
| `$0800`-`$08FF` | the page the parts share (`shared_vars`): eight records of 32 bytes, one a player, and the shell's variables in the records' spare bytes |
| `$0900`-`$0D30` | the shell's code: the jump table at `$0900`, the loader, the disk prompt, the reset between parts |
| `$0CA8`-`$0D17` | the files' tables, by part number times two: sides of the disk (`file_sides`), names (`file_names`), load addresses (`file_addrs`), entry addresses (`part_entry`) |
| `$0E00`-`$0EFF` | the world records (`records`) |
| `$0F00`-`$0FFF` | file `C` as loaded (`unpacker_file`), copied to `$D000` |
| `$D000`-`$D0FF` | the unpacker (`unpacker`), run with all RAM in view |

## The shared page

- Each player's record is 32 bytes at `$0800` + 32 × player: the name
  as typed at `+$00`, the event's result as text at `+$10`-`+$15`, its
  score at `+$16`-`+$18`, compared as a number by the menu's awards.
- The records' spare bytes hold the shell's variables: `practice`
  (`$081D`, bit 7 for practice), `players` (`$081E`, 1 to 8), `event`
  (`$081F`, 0 weightlifting to 7 sumo), `menu_gone` (`$083D`), `resume`
  (`$085D`-`$085E`, where the menu carries on), `force_load` (`$085F`),
  `joysticks` (`$087D`, 1 or 2), `travelogue_off` (`$087F`), `event_mask`
  (`$089D`, the competition's events, weightlifting bit 7 to sumo bit 0),
  `part_in_memory` (`$089F`) and the menu's random generator
  `random_state` (`$08FD`-`$08FF`).
- The jump table at `$0900` is the same for every part: `$0900` back to
  the menu, `$0903` load and run part X-1, `$0906` save the world
  records, `$0909` the cold start, `$090C` run the part just unpacked.

## Loading and unpacking

- `load_and_run` (`$09C4`) loads a part unless it is already at `$1000`
  (`part_in_memory`). Before an event, unless the travelogue is off, it
  loads and runs the travelogue first (`$09E6`). Slalom loads a second
  file, `J`, to `$A000` and copies its 31 pages to `$E000`-`$FEFF`
  under the KERNAL (`$0A03`).
- `load_file` (`$0A60`) loads through the KERNAL (`kernal_load`,
  `$0BF9`) with RESTORE off. The KERNAL's STOP routine is replaced by
  `never_stop` (`$0B51`) for the whole game, so RUN/STOP never breaks a
  load.
- `check_side` (`$0AA4`) tells the sides apart by loading file `R`:
  if that fails, side 2 is in the drive. When the file wanted is not on
  that side (`file_sides`), it writes "INSERT WORLD GAMES SIDE n" and
  "THEN PRESS JOYSTICK BUTTON" straight into the screen and waits for
  the button.
- The unpacker (`$D000`) expands the file in place. The header at
  `$1000` lists five-byte entries, one for each chunk of up to 1 KB,
  read last first from `$10FF`: the chunk's pair table, its packed data
  and its destination page. A pair table gives up to 255 byte values a
  meaning as a pair of other bytes; `expand_chunk` (`$D06D`) writes each
  packed byte out, replacing a byte that has a pair by its two halves,
  with the second half waiting on the stack. Three 1 KB buffers at
  `$D400`, `$D800` and `$DC00` take the chunks in turn, and a buffer is
  copied to its destination only when it is needed again
  (`flush_buffer`, `$D0D6`), never to `$CE00` or above.
- `reset_chips` (`$0B54`) puts the machine back between parts: the
  vectors from `saved_vectors` (`$0D31`), `$01` = `$36`, CIA interrupts
  off, the SID's voices silenced with the test bit, zero page `$80`-`$FF`
  cleared.

## RESTORE

The NMI handler (`nmi`, `$091A`, also at `$FFFA` for parts that switch
the KERNAL out) abandons the games when RUN/STOP is held with RESTORE:
sprites off, every colour black, back to the menu (`restart`,
`$09B5`). Without RUN/STOP it only puts CIA 1's port directions back.

## The world records

`records` (`$0E00`): one record of 20 bytes for each event, the name
(10 characters), a space, the result as shown (6 characters) and three
bytes of the result as a number. The disk image's file is not blank:
its eight entries carry names such as FREDDE and POLIZEI, left by
whoever played it. `save_records` (`$0A51`) writes the page back as
`@0:R` (`kernal_save`, `$0C1B`), asking for side 1 first.

## The SID at the start

`cold_start` (`$0C44`) sets all three voices to noise at frequency
`$0F0F` with the volume at 0 (`sid_start`, `$0D18`), and leaves voice 3
running: the parts read its oscillator, `$D41B`, as random numbers.

## Registers

The processor port (`$00`-`$01`); the VIC-II's raster read while
waiting to start a part (`run_part`, `$0991`), the screen blanked, the
sprites switched off and every colour made black by the RESTORE handler
and the reset, and the character set at `$1800` before an event
(`$09F9`); CIA 1's ports and interrupt control for the keyboard and
RUN/STOP; CIA 2's port A, timer A and interrupt control around a load;
the SID's voices, filter and volume at the cold start and the reset.

## Strings

"INSERT WORLD GAMES SIDE #" (`$0B1D`) and "THEN PRESS JOYSTICK BUTTON"
(`$0B37`), in screen codes; the world records' names and results in
PETSCII.
