# Last Ninja Remix — TODO

Current tier and what is missing for the next one.

## Tier

Silver: 100 % coverage in all sixteen parts, `facts.md`, every feature
traced, observed or explicitly open, the minisite built with a player
for every tune, and the listing measured. The maintainer's check (air)
audited every comment and every claim in the facts files, and a second
sample of 60 comments, seed 25956, found 1 wrong, within the mark
(`facts.md`, "The listing's error rate").

## For Gold

A human pass over the copy, section by section, on all three pages
(`index.html`, `discoveries.html`, `levels.html`), setting `copy` in
`game.json` to what the pass did.

## For Platinum

A Play tab that is the whole game, ported routine by routine and run in
lockstep with the game's code (`kit/skills/core/70-minisite/play.md`).
The pieces already ported and tested are a start: the title cards, the
sprite unpacker, the area painter, the level-skip reader, the enemy's
energy and the music players. Still to port: the player's movement and
fighting, the enemy's steering, the scripts the walls carry, the
objects, the projectiles and the level loader's hand-over between
levels.

## Open questions

- Three features stay open in `features.md`: picking an item up, the
  somersaults, and the table from stick to fighting move.
- Who wrote the intro's tune: its driver is not the levels' and it
  carries no credit.
- The 15 bytes at intro `$1797`, which nothing reads.
- The pokes in `cheats.md` have not been tried in the emulator.
