# The title and the demo (stage 0) — verified technical facts

Stage 0, loaded at the boot over $1000-$1FFF and $A000-$BFFF and again
whenever the game goes back to the title. It shows the credits, the logo
and the prologue, plays Akuma's chamber as a scene, and then a demo fight
on the cliff that plays itself. Every address here is this part's unless
it is named as the engine's. Unless marked *live*, a fact comes from the
code in `work/entry.json` (stopped at $BFFA).

## The title

- The entry at $BFFA jumps to `title_vectors` ($B760): $B760 the title,
  $B763 the check for a key or a button, which the engine also calls
  between the frames of its cutscenes (engine $7C47), $B766 back to the
  title after the demo.
- `title` ($B779) shows, a page at a time, the Brøderbund crown and name
  with "presents", "a game by jordan mechner", the logo, the logo with
  the copyright line, then scrolls the prologue (`prologue`, $B833) and
  starts the demo. Each page is drawn while the other is shown, with a
  pause of $50 or $A0 times 256 key checks after it ($B823). A button
  already held when the title starts does not start a game ($B7EA).
- The logo is eleven pictures placed by tables of columns, rows and dot
  offsets (`logo_lo`, $B926): the k's, the a's, the r, the t, the e, the
  tops of the k's and a small piece where the r meets the a. The
  copyright line and "the end" are pictures, not text.
- The words are in the game's own alphabet, drawn by engine $0700 from
  the lines `text_lo` and `text_hi` point at ($BB9F, $BBB5): line 0 is
  "presents" ($B96B), the prologue starts at line 4 ($B993).
- `prologue` ($B833) scrolls the screen up two rows at a time (engine
  $0780) and draws each new line at the bottom, seven steps a line; the
  last lines are blank and carry the text off the top.

## The demo

- `demo_start` ($B400) sets up the cliff, with 14 arrows for
  each fighter, headgear 0, the guard's chances all $FF, and the distance
  at which the hero stops running and takes the stance, 15-22 columns at
  random ($B711). Then the engine's scene in Akuma's chamber and Mariko's
  cell (engine $79A3), and the fight.
- The demo's hero is played by a brain of its own (`demo_brain`, $A000):
  he runs at the guard and takes the stance, and nearer than 12 columns a
  random byte and the distance (7-11) choose no blow, a kick, a punch, a
  step forward or a step back, from four tables at $A08E-$A0A1, aimed
  high or middle at random ($A0AF: 0 below $55, otherwise $FF). Its test
  for a low blow is reached only with a number that always fails it, so
  the demo's hero never aims low; the guards' brain aims a third of its
  blows at each height (engine $6C71). The guards' brain has no step back. Its random
  numbers are its own ($A0A2: $59 = $59 × 5 + $13).
- The demo guard is played by the engine's brain with the title's
  thresholds (`demo_guard_brain`, $BFE8) and every chance at $FF.
- The demo ends when the hero dies (the death tune, then the title
  again), when the guard is beaten and the hero runs on off the first
  screen ($B260 sets $AF, $B766), or when a key starts a game. The hero
  can fall off the cliff's edge here as in stage 1 ($B69A, $B52F).
- The demo has no second screen: nothing in the title sets $30, the flag
  that a guard is coming on, so the scroll never takes the scene there
  ($B260).

## Tunes

`stage_tunes` ($1000), eight JMPs: the four notes as Mariko's cell door
shuts ($1000), the hero's death ($1003), a guard beaten ($1006), the tune
after the climb ($1009), Akuma raising his arm ($100C), the end of the
cell scene ($100F), a game starting ($1012, which the engine plays after
the castle picture) and Mariko turning in her cell ($1015). The tunes
follow, from $105B.

## Left in memory

`old_gate_5_end` ($A200) is the end of a picture of the cliff's gate,
whose start the publisher's name covers; the 33 bytes after `text_hi`
($BBB5) are lines in the same form that nothing reads.
