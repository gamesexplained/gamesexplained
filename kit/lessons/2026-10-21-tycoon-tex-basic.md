## next · 2026-10-21 · Tycoon Tex (Commodore 16) · air with Claude

- **Two bytes at BASIC's start can be BASIC's, not the game's.** Tycoon
  Tex loads its graphics at $1000, and a C16's BASIC program starts at
  $1001. The authors' own source, which survives, draws the first
  skyline character there; the game has $1009 in its first two bytes
  instead, which the tape already carries. That is the link a BASIC line
  at $1001 has: Commodore's BASIC re-chains a program's lines itself,
  pointing each line's first two bytes one past the zero that ends it.
  The listing had called the two bytes part of the drawing, and nothing
  in a reading of the graphics could tell. `check_listing.py` now
  computes the link at BASIC's start and asks that the listing say so
  where the bytes hold it; it found one more, a BASIC line inside a C64
  game's driver state that the listing had not named.
