# Balloon Fight — TODO

The game is Platinum: Silver, with a Play tab that is the whole game,
held to the game's code by `test_play.js`. Diamond needs Gold as well, a
human's pass over every section of the copy. What is below is what a
later run could add.

- **An audit of the listing's comments.** The one sample (seed 1985)
  found 13 of 60 wrong in a detail, over the mark of 2; the kinds of
  error are in `facts.md`, "The listing's error rate". A later run should
  audit every comment and sample again.
- The Play tab's rewind saves only at the top of the phase and Balloon
  Trip loops; the bonus round's loop is inline in `bonus_round_play`,
  and resuming there needs the round's tail written as a routine of its
  own in the page.
- Replay the seven recorded games on MesenCE and on jsnes with its RAM
  cleared (`route/check_emulator.py`, with `--port 6857`, and with
  `--port 6855 --clear-ram`). Only the earlier single recording was
  replayed there.
- The recorded games (Watch) end at phase 4. A longer one, through the
  later phases with their propellers, or a Balloon Trip, would need
  `route/find_route.js` to look further ahead: its lookahead loses
  nothing in phases 1 to 3 and has not been tried past them.
- The Play tab's controller 2 is on the keyboard only; a gamepad through
  the browser's Gamepad API, and a second on-screen pad, would let two
  people play on a phone.
- `test_play.js` starts every session at the reset vector. The play
  snapshots in `work/` (phase 3, the bonus round, Balloon Trip, two
  players) could start sessions too, when a run has them.
- The bird speeds in pixels a frame for each colour, timed across the
  screen, beside the physics tables.
- The 2-player game's cooperative and competitive scoring, exercised
  live.
