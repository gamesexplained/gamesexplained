# R-Type: the ending (file Y) — facts

One file, Y, loaded to `$6800-$8701` after stage 8 and run at `$8000`
(`ending_start`) by the crackers' loader (game, `load_next` `$0A4E`, then
`$5FB1`).

- `$6800-$71CF`: the stages' music driver moved up by `$490`, with the
  same entry table; `ending_start` points it at the music data at `$71D0`
  (49 patterns, 25 sequences, 13 instruments).
- `ending_layout` (`$80D6`) lays the text at `ending_text` (`$8251`) into
  a buffer from `$B400`, ASCII less `$40`, one 40-byte line per text line;
  `ending_irq` (`$81C1`) scrolls it up every 3 frames and plays the music.
- `ending_stars_init` (`$8134`) and `ending_stars_move` (`$816F`) move a
  field of star sprites (shape `$84C2` copied to `$CBC0`, pointer `$2F`).
- The main loop fades the music's volume (`$680F`) once the scroll count
  (`$8250`) reaches `$43`, then waits for space; space copies
  `ending_reset` (`$80BE`) to `$0100`, which zeroes `$0200-$FFFF`, sets
  `$01 = $37` and jumps to the KERNAL's reset at `$FCE2`.
- The text thanks the player and names the staff: coding and game
  design Manfred Trenz, graphics Andreas Escher and Manfred Trenz, music
  and sound effects Ramiro Vaca and Chris Huelsbeck, fast loading by
  Heureka Teachware, and "REALIZED IN ONLY 6 WEEKS" (*live*, seen
  scrolling on 10 November 2026).
