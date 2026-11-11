## 0.0.323 · 2026-11-10 · Karateka (Apple II) · air with Claude

- **A disk in the game's own format is read by letting the game read
  it.** None of the three Apple II games had a catalog, and two had no
  track `disk.py` could read as sectors, so the ledger had nothing to list.
  `reads` on the kit's Apple2TS server now keeps every run of bytes the
  processor stores within 64 cycles of reading the drive, with the track
  the head was on; `kit/apple2/readlog.py` keeps the runs beside the
  image and `kit/apple2/media.py` lists a disk track by track, from its
  sectors where DOS could read them and from the log where not.
  Karateka's 26 tracks of game came out as 3,072 bytes each, equal to
  the listings byte for byte; Choplifter's boot gave one clean run a
  track, half tracks included. Zork I's tracks are DOS's sectors with
  another mark on the data, and read without a log.
- **The window is what separates a loader's stores from the rest.** DOS
  and the boot ROM read a sector's nibbles into a buffer and decode them
  when the reading is over, so the log holds only the buffer. That is
  the right failure: such a track has sectors the kit reads from the
  image. `check-emulator`'s `disk-read-log` holds the log to exactly what
  the boot ROM stores while it reads.
- **Parts that share code each count the shared bytes.** The ledger
  looked for an item in one place. A track's runs go to two places in
  memory, and Karateka's title and cliff hold the same 1,024 bytes at
  `$1C00`, as do its palace and dungeon, so the cliff's run was found in
  the title and the track stayed open at 2,048 of 3,072 bytes. An item
  may now come in `pieces`, each counted in every part that holds it.
- **Scanning the other side told what it is.** Side B, the game upside
  down, was "not analysed". With both sides in the ledger, 24 of its 35
  tracks folded into side A's. The rest are the loader's, three
  neighbouring tracks that each have one damaged sector in this copy,
  and two differences in the game: the two tables of screen row
  addresses run bottom to top (384 bytes at `$0800`), and the castle
  picture is stored upside down. A sector the game reads and throws
  away holds a piece of a patched DOS 3.3.
- **A truncated row in a skill is easy to miss.** The Apple II `steps`
  row for `media` ended in the middle of a sentence about ProDOS. It is
  finished here.
