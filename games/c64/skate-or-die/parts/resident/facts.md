# Skate or Die!: the loader and the event manager - verified technical facts

The code that stays in memory from Rodney's shop onwards: the disk loader
at `$F230` and the event manager at `$F730`, which the shop loads as side-1
file `$0B` to `$C000` and copies up (`$0FD2` in the shop, `$08C8` bytes).
Every event part is loaded over it and owns only `$0000`-`$F22F`. The
facts come from reading the High Jump snapshot (`parts/highjump/work/play.vsf`),
where these bytes are the same as in the shop's, except the self-modified
operands at `$F4B3` and `$F4B5`.

## The loader

- **One file system, no directory.** The resident loader `load_file`
  (`$F230`) takes A = a file number and X/Y = the load address, and returns
  X/Y = the end address plus one, carry set on error. Files are found
  through `file_table` (`$F2F9`): 49 entries of four bytes (start track,
  start sector index, length low, length high). A sector index becomes a
  physical sector as index × 11 mod the track's sector count (`$F2E4`), and
  `next_sector` (`$F2C6`) steps by 11 on most tracks. Files `$00`-`$1A` are
  on side 1 and `$1B`-`$30` on side 2. Files `$0B`, `$0C`, `$0E`, `$0F`,
  `$11` and `$12` read from `side1.g64` with this table equal the snapshot
  byte for byte.
- **The drive runs EA's own server.** The 1541's RAM at `$0400`-`$07D0`
  holds a command server that takes three-byte commands (command, track,
  sector) over CIA 2 port A (`send_drive_command` `$F4B7`,
  `receive_bytes` `$F598`). Before every file the loader sends command
  `$0B` with `$45 $41`, "EA", which the drive stores as the expected disk
  ID (`load_setup` `$F295`). The boot loader has the drive load the server from
  track 1 (`parts/boot/facts.md`); High Jump and the other events find it
  already running.
- **Disk sides.** The event manager loads three bytes from track 18
  sector 18 (file `$0C`) and compares them with the side it wants
  (`side_check` `$FA69`, `side_table` `$F8D1`): side 1 holds `01 01 01`,
  side 2 `02 02 02`. A mismatch or a failed read shows INSERT SIDE n AND
  PRESS BUTTON and waits for fire.

## The event manager

- The resident manager (`$F730`-`$FFF7`, side-1 file `$0B`) runs between
  events. Its load table (`$F8A0`-`$F8D7`) has seven rows: shop, RAMP,
  HIGH JUMP, DOWNHILL, JAM, POOL JOUST and the side check, with their
  files, addresses, entries and sides.
- **The interface block** `$FE00`-`$FE12`: slot A (name pointer `$FE00`,
  attribute `$FE02`, result `$FE03`-`$FE05`), `$FE06` `JMP event_done`,
  slot B (`$FE09`-`$FE0E`), `$FE0F` set when slot B is LESTER, `$FE10` the
  sound flag, `$FE11` practice, `$FE12` quit. High Jump reads slot A and
  `$FE10`, writes the result and `$FE12`, and never touches slot B.
- **`event_done`** (`$FE13`): in practice it shows PRACTICE AGAIN? YES NO;
  YES re-enters the event at `$F93E` without loading. In a competition it
  stores the result, shows NEXT SKATER, and at the end sorts the scores
  (`$F743`, `$F766`) and awards 5, 3 and 1 points (`$F7E0`). High Jump's
  results column is printed in feet and inches (`$FC1D`).
- The roster holds eight 16-byte names (`$FCDA`).
