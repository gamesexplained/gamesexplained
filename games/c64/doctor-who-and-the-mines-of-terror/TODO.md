# Doctor Who And The Mines Of Terror — TODO

Tier: **Silver (claimed)**, steward unorig (100 % coverage, 56,533 tracked bytes; facts, features,
minisite; copy `agent-draft`).

For Gold, a human pass over every tab (Overview, Gameplay, Maps,
Solution, Graphics, Music, Discoveries), section by section. The tabs
follow the Fist II layout.

Worth doing, found in the run and not done:

- The Maps / levels tab draws the whole mine and the restart points. It
  could add every zone's own glyph set (`$ABCF`, `$2E00`), the lift and
  carrier stops and the objects' start positions.
- Live tests not run: the lift and carrier exact-match boarding (`$A395`,
  `$A294`); the code lock; the madrag; oxygen outside; what happens at
  `$E8` = 8 (rising level); a real end of the game and its bonus.
- Who object `$0C` is (the Master?), and where tile `$23`, the only floor
  that allows the save menu, is in the map.
- The C64 manual was not found online; check the story and controls
  against it when a scan turns up. Who converted the game to the C64 is
  not recorded in the sources read.
- The sound effects (`$C677`, `$C7C7`) are not playable on the Music tab.

- The symbol labels for the Doctor's frame tables at `$CC16`-`$CC3F` call object 0 the upper sprite and object 1 the lower; the code (`$CB48`) puts object 1 eight pixels above object 0 and the images show object 1 is the head and arms. Rename them in the disassembler project and re-export.
- The dissolve order comment at `$09A0` says it holds the numbers 0-$43; it holds 68 byte offsets of 0-63.
