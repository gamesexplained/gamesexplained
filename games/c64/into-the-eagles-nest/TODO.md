# Into the Eagle's Nest — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## For the next tier

The game is Platinum. Its listing was first written on `claude-opus-5`,
which `kit/models.json` has not declared proven, and it counts as checked
through the contributor's own two audits of every comment on
`claude-opus-5-5`, each sampled again afterwards: the contributor is
listed in `kit/contributors.json` (`kit/CHECKING.md`, "A known
contributor's audit"). The Play tab is the whole game.

The next tier is Diamond, which needs Gold: a person's pass over every
section of the copy, with `steward` set to their login when it starts.

The samples after the two audits found 5 and 4 of 60 wrong, over the
mark of 2, so a further audit on a proven model would still be worth a
run (`facts.md`, "The listing's error rate").

Left open by the audit:

- What the object is that a shot turns into other tiles for 2500 points
  and sound 8 (`$67FD`, reached from `$529B` for tiles `$30` to `$3E`,
  `$C1` to `$CB` and `$E7` to `$EE`). It has not been seen in the game.
- What `$02C9` does: set when explosives go off and by the main loop's
  hand-overs, and read at `$4B5F` to skip the flash and the player's
  sprites.
- How long the explosion takes. A live run saw `$02D3` reach `$FF` about a
  second and a half after the shot; the code gives 90 frames, 1.8 seconds.
- What filter routing `$63B7`'s write of 2 to `$D417` sets, which the C64
  reference does not cover.

## The Play tab

The Play tab is the whole game, ported routine by routine (`reference/en-g*.js`), with no
stand-ins left. `test_play.js` holds the published page in lockstep with the game's own code,
with SPACE's pause and each of the four ends of a mission, and against its pace; it then runs the
page alone with SPACE, RESTORE and every end, which must never stop. `test_screen.js` holds the
scrolling message line. Open in the port:

- `figure_turn_to_player` (`$630B`) throws where the game would go round two branches for good
  inside its interrupt: a guard level with the player on both axes. The guard and the player both
  stamp their squares into the map, which should keep them apart, so it is believed unreachable;
  no run has met it.
- The explorer never rides a lift in normal play, and the name entry, the floor select and the
  YOU ARE DEAD screen are reached only through the test's forced ends of a mission and the attract
  loop's own input. A recorded route through a mission (`kit/skills/core/65-inputs`) would hold
  them with input a player gives.
- RESTORE runs only on the page: the lockstep has no way to give it to both.
- In the pace check the page's main loop goes round up to 2 % fewer times a frame in play than
  the game's. It only waits there for the interrupt, which moves everything once a frame, so play
  keeps the C64's time; the rest of the fit's error is in the interrupts' costs.

## Questions only a player can answer

- What the way out looks like in its own room. Tile `$E4`, a gap of
  nineteen tiles in the ground floor's outer wall, ends a mission when the
  player stands on it (`facts.md`, "Live tests"); the room has not been
  walked to.
- Whether the second castle the manual promises exists. Nothing reads a
  second set of floor descriptions, and the tape carries none: every block
  it loads is accounted for (`orientation.md`, "The loader"). The bytes at
  `$8C00` that looked like its tiles are the title picture's colours.
- Who "Mirai" is, whom C64-Wiki credits with the music.

## Ideas for a later run

- **A route through a mission**, recorded with `kit/skills/core/65-inputs`
  and replayed on the page, which would also settle the two questions
  above.
- **The guards' own rule.** The run explains how a guard moves and how it
  turns, but not how it chooses where to go. A stepper that let the reader
  watch a floor's 116 guards take their turns would show whether they
  patrol or wander.
- **The screens the run never saw**: the castle's own destruction, if it
  has one beyond `THE CASTLE IS NOW DESTROYED.` and the success screen,
  and the name entry with a real high score.
- **The chests in order.** The dice restart at every mission (`$4058`
  clears `$02E1`), so within one game the chests should open the same way
  each mission when they are shot in the same order. That is read from the
  code; a recorded route through two missions would show it.
