# The loader — verified technical facts

The boot file at `$02A7`-`$030B`, the fast loader at `$0900`-`$0DFF` with
its first copy at `$C000`, the shared page at `$0800` and the world
records at `$0E00`. Every address here is this part's. Unless marked
*live*, a fact comes from the code in `work/menu.vsf`.

## The boot

- The boot file loads over the BASIC vectors (`boot_vectors`, `$0300`),
  every one set to `boot_load_loader` (`$02C4`), so the KERNAL's LOAD ends
  by jumping in. It loads `CO*` to `$C000` and jumps to `loader_boot`.
- Its first twelve bytes are a BASIC line, `10 SYS2061`, so that the file
  also starts when it is loaded to `$0801`; `boot_copy_down` (`$02B3`)
  then moves it where it belongs.
- `boot_leftover` (`$02E3`), 29 bytes nothing runs, is another form of
  the PAL patch `loader_boot` makes.

## The loader

- `loader_boot` (`$C000`) silences the SID, copies the loader to
  `$0900`-`$0DFF`, clears `$0800`-`$08FF`, sets two joysticks (`$087D`),
  points the NMI vector at `ldr_nmi` and the STOP vector at
  `ldr_stop_never` (`$0B15`, which tells the KERNAL RUN/STOP is never
  pressed), and reads the world records from track 18 sector 13 into
  `$0E00`.
- Three entries at fixed addresses (`ldr_jump_table`, `$0900`): `$0900`
  back to the menu (`ldr_restart`, `$0AD0`), `$0903` load and run file X
  (`ldr_run_file`, `$0ADD`), `$0934` save the world records
  (`ldr_save_records`).
- `ldr_files` (`$0CC3`): twelve-byte records, a file's name, load address,
  end, entry point and side. File 2's record is named `?`.
- A load is skipped when the file is still in memory (`$089F`), and
  repeated when the last one was cut short (`$085F`).
- `ldr_check_side` (`$0958`) reads byte `$97` of the disk's header sector,
  1 on side 1 and 2 on side 2; `ldr_insert_side` (`$0976`) prints "INSERT
  WINTER GAMES SIDE n" and "THEN PRESS JOYSTICK BUTTON" (*live*).
- `ldr_nmi` (`$0906`): with RUN/STOP held, back to the main menu from
  anywhere; while a file loads its first byte is an RTI, so RESTORE does
  nothing then (*live*: RUN/STOP and RESTORE from an event reloads the
  menu).
- `ldr_reset_machine` (`$0B18`) puts back the KERNAL's vectors, the port
  (`$01` = `$36`) and the video chip's registers before every part.
- `ldr_get_block` (`$0C35`) and `ldr_unpack` (`$0A5B`) are an earlier
  build's block receiver and unpacker, which nothing runs.

## The world records

20 bytes for each of eight events at `$0E00`: the holder's name and
country, and the score as text from offset 11 (menu `record_offsets`).
On this disk the sector is zero but for one byte in each record.
