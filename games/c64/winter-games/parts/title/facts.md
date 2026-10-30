# The title screen — verified technical facts

File `T`, `$3F00`-`$67D0`, the loader's first load. Every address here
is this part's. Unless marked *live*, a fact comes from the code in
`work/entry.vsf`.

- `title_start` (`$3F00`) copies the picture's colours to colour RAM,
  selects video bank 1 through CIA 2 and shows the multicolour bitmap at
  `$4000` with its screen at `$6000` and colours from `$63E8`.
- `title_wait` (`$3F67`) runs three times, each about four seconds on a
  PAL machine; a stick, the button or a key cuts it short
  (`title_poll`, `$3F75`), and the title leaves through `$0900` to the
  loader, which loads the opening ceremony.
- The picture: "EPYX presents WINTER GAMES by Action Graphics" and
  "© 1985 Epyx, Inc." (*live*, `reference/title.png`).
- `title_gap` (`$3F97`) and `title_gap_2` (`$5F40`) are bytes nothing
  reads, from the authors' memory saved with the file.
