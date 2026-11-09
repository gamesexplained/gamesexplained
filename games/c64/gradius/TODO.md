# Gradius — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage on a proven model, `facts.md`, a checker sample,
the minisite built.

## Recommended: a full audit of the listing

The checker sample (seed 1109, 60 comments) found 14 with a wrong detail,
23 % (95 % interval 14 % to 35 %), over the mark. All 14 were corrected,
with every comment that shared the same belief, but the rest of the
listing has not been audited. An audit (`kit/CHECKING.md`) should come
before the Gold pass leans on the listing.

## For Gold

- A human pass over every page (`kit/START.md`).
- The game was not looked up online: no manual, reviews or links. The
  loading screen says KONAMI 1986 and the disk image's name 1987; settle
  the year and fill `links`.
- Graphics tab: the sprites are drawn in generic colours (white, or grey
  and white in multicolour); draw each in the colour its mover gives it.
- A section on how a frame is built (the four interrupt phases and the two
  NMI splits) was not written.
- Play tab: not started.

## Open questions

- Whether the published game was meant to play music.
- What "NEM" in the file name OBJNEMMAIN3 stands for, and who "STU" on the
  loading screen is.
