# Way of the Exploding Fist — TODO

Current tier: **Silver** (2 October 2026). Coverage 100 % of 56,996
tracked bytes; every feature in `features.md` confirmed, traced or open
with its search described; the minisite built and checked in a browser;
copy `agent-draft`.

## For Gold

A human curates the How it works page section by section (`kit/START.md`):
cut what is dull, expand what is interesting, rewrite what reads as
agent-written, and set `copy` in `game.json` honestly.

## Open questions worth a look

- Which named kick or punch each fire move is: the page names only the
  moves judged from screenshots (jump, flying kick, somersaults, high
  punch). A frame-by-frame look at each animation would settle the rest.
- Why `blow_reaction` tests CIA 2's timer A (`$2CAE`).
- Whether a gap of exactly `$15` lines between the fighters makes a
  sprite row a frame late (`$32EA`, `$32FD`).
- What `m.tsound` and `m.spchtbl` are: not in the game's memory as they
  stand on disk; perhaps the loader's shout.
- What the sprite images at `$D200`-`$D3BF` and `$E5C0`-`$E63F` are for;
  nothing found points at them.
- Keyboard controls were traced, not typed live.

## Article ideas

- A Play tab: the fight loop is small enough to port, and the computer
  opponent's tables are all read.
- The bull round as a stepper: the bull's distance frame by frame, with
  the one window where move 7 lands.
