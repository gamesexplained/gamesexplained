# Doctor Who And The Mines Of Terror — TODO

Tier: **Gold**, steward unorig (100 % coverage, 56,515 tracked bytes; facts, features,
minisite; copy `human-edited`). The listing is built from the original
disk (DWMT DISK MASTER). Every tab had a Gold pass on 2 November 2026:
headings and summary lines now state findings, and the Maps and Music
pictures no longer rely on colour alone.

For Diamond, a Play tab like Mercenary's that ports the whole game
(Platinum), on top of this Gold.

Worth doing, found in the run and not done:

- The Maps tab could mark the five security gates (block `$20`), the
  eight save booths (block `$23`), every zone's own glyph set (`$ABCF`,
  `$2E00`), and the lift and carrier stops.
- Live tests not run: the madrag; oxygen outside; what happens at `$E8` = 8
  (rising level); a real end of the game and its bonus. Euan has missed the lift and the
  carrier in play and boarded after a jump (2 November 2026). Euan played the Solution route through
  (2 November 2026).
- The C64 manual was not found online; check the story and controls
  against it when a scan turns up.
- The sound effects (`$C677`, `$C7C7`) are not playable on the Music tab.
- A Play tab, like Mercenary's, is optional.
- The symbol labels for the Doctor's frame tables at `$CC16`-`$CC3F` call
  object 0 the upper sprite and object 1 the lower; the code (`$CB48`)
  puts object 1 eight pixels above object 0 and the images show object 1
  is the head and arms. Rename them and re-export.
- The dissolve order comment at `$09A0` says it holds the numbers 0-$43;
  it holds 68 byte offsets of 0-63.
- The comment on `$4E` says which event sets it was not traced: the code
  lock's success path sets it (`$BF59`).
