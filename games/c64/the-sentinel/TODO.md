# The Sentinel — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Where it stands

Silver, 26 September 2026: 100 % of the 29,350 bytes the game uses are
described (`coverage.py`), `facts.md` states what was traced and tested,
every row of `features.md` is settled, and the minisite is built. The copy
is `agent-draft`: no human has read it yet.

## For Gold

A human pass over `index.html`, section by section, under `kit/style.md`:
cut what is dull, expand what is interesting, add what the agent missed.
Set `tier` to `silver-claimed` and `steward` to your GitHub login when the
pass begins, and `copy` to what the pass did when it ends.

Sections the page could gain:

- **The objects, drawn from their shape tables.** Points at `$9DE0`,
  `$9F20` and `$A060`, polygons at `$A1A0` and the point lists at
  `$A560`-`$A79F` are enough to draw the robot, the sentry, the Sentinel,
  the tree, the boulder, the meanie and the tower in any pose.
- **How the view is drawn.** Tile rows from the back (`$295D`), the angle
  table at `$BC00` (`$3700`), the polygon filler (`$22AA`), the order that
  lets near tiles cover far ones.
- **The enemies' decisions.** Tactics (`$16E6`), sight (`$1887`), the
  meanie search (`$1986`), as a stepper on a generated landscape.
- **The gaze.** How the sights pick a tile and the height under them
  (`$1C10`-`$1EAE`), and why a boulder can be taken by its side.
- **A Play tab.** The generator is ported and tested; the rest of the game
  is not.

## Open

- `$B000`-`$B5FF` is missing from this copy (`orientation.md`). A clean
  image of the original disk would settle what the pan code does; the
  track-level image tried here is damaged on track 25.
- The drain interval: 2.6 s measured against 2.2 s from the timers read
  (`facts.md`, "Timing").
- Live tests not yet made: absorbing a sentry (3 units by the table);
  quitting while paused; the 9999 carry, by poking a landscape number and
  winning.
- `$897F` writes `$64` to `$D019`; possibly a slip for `$D012`.

## For Platinum

A listing that reassembles byte for byte to the analysed image, and a
build that boots. With `$B000`-`$B5FF` missing, that needs a clean copy of
the release first.
