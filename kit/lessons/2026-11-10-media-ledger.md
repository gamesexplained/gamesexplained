## next · 2026-11-10 · Pool of Radiance (C64) · air with Claude

- **Coverage counts memory, so the disks need a list of their own.**
  Pool of Radiance reached 100 % over 17 parts while code the game runs
  was outside all of them: its spell-effects files take turns in one slot
  at `$A700`, and each part's snapshot holds only the one loaded when it
  was taken. A reader's question found them, not the kit: `10-orient`
  step 7 called a file found in no snapshot "the loader's, or built
  from" and nothing checked it. A scan of 46 C64 disk games against
  their listings on 9 November 2026 found the same in two more, Fist
  II's training program and Impossible Mission's 41,359-byte
  `5IM-CASS`. The kit now lists every file, every run of sectors no
  file holds and every cartridge bank into `media.json`
  (`kit/scripts/media.py`, `kit/c64/media.py`), each with one answer:
  in a part, data the game loads, the loader, saved by the game, never
  loaded, or open. A game at Silver needs nothing open; a game made
  before keeps its tier and its About tab names what is open.
- **Matching the bytes answers most of it at once.** On Pool's eight
  sides, 596 different items, the scan found 36 files whole in a part's
  listing, and two spell files more held all but the kilobyte the next
  file loads over. Families the engine loads by a stem and a number (its
  `load_resource` builds twenty such names) took one answer each. What
  was left said something: ten monster files no script loads, the
  developers' own load-and-save program, a saved character, PENDRAGON,
  on side 3 of the copy the run used, and the temple's code, which no
  part holds.
