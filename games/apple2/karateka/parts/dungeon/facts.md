# The dungeon (stage 3) — verified technical facts

Stage 3: Mariko in her cell, the stairs down, then rooms one screen each,
a guard in each of rooms 1 to 4, and the hawk. Every address here is
this part's unless it is named as the engine's. Unless marked *live*, a
fact comes from the code in `work/entry.json` (stopped at $BFFA).

## The stage

- `dungeon_start` ($B700): no door behind the hero, the scroll at 0 (the
  stairs), one room open ($C5 = 1), 10 arrows for the hero ($B0) and 18
  for the guards ($B1), headgear 2, which the first guard's setup makes 3,
  the hawk in the stage ($98 = 1), and the first guard coming on. Then
  Mariko in her cell (`mariko_cell`, $B23B: six frames, two poses and
  three tunes), and the main loop: `dungeon_frame` ($B7CF) and the
  engine's frame end.
- `rooms` ($B306): the first screen ($44 = 0) scrolls between the stairs
  and its right end; rooms 1 onwards are single screens. A hero at column
  2 or less goes back a room ($B34B), at $21 or more on into the next
  ($B362), and everyone moves 30 columns.
- A room not opened yet ($44 at or above $C5) has its doorway shut ($84 =
  5), and the hero bounces off it until he kicks it open (engine $73E4),
  which counts a room in $C5. Rooms 1 to 4 each have one: $C5 goes from 1
  to 5.
- In room 1, once he is seven columns in, a door shuts behind him ($ED =
  5) and he cannot go further left than column 7 ($B874, $BA47).

## The guards

- A room entered for the first time brings a new guard (`new_guard`,
  $B472) with the next headgear, 3 to 6 in rooms 1 to 4, and its chances
  (`chance_kick`, `chance_punch`, `chance_step`, $B499-$B4A4). Each
  guard beaten takes one from the hero's most arrows and gives one more
  to the next guard, with no floor ($B820).
- The guards move on the frames drawn on page 1, or when their legs are
  past position $0D of a sequence ($B8B8), and their blows are tested
  only on page 1's ($B8DE).

## The hawk

- Kicking open room 4's doorway brings the hawk in as the opponent
  (`hawk_comes`, $BA62: $4D = 5). Beating the guard in headgear 6 has
  already set the hero's most arrows to 23 and the hawk's to 5, which never
  come back ($B820). While the hawk lives the hero cannot leave room 4
  ($B362).
- It flies as the palace's does: from the right edge at one of three
  heights, struck three to five columns off by a kick or a full-stretch
  punch at its height, pecking at one column or less (`hawk_move`,
  $A806). Each strike costs it an arrow; with the last it falls as a burst
  of feathers, three pictures ($A876, `hawk_draw` $A9D7), and then no
  hawk is left ($98 = 0).
- With the hawk gone and no tune asked for, the stage ends on a frame
  drawn on page 2 (`dungeon_end`, $BB14): the beaten tune, the hero's
  most arrows 8, and stage 4 loaded.

## The scenery

- The stairs on the first screen ($B000-$B046), the first screen's wall
  and doorway (`room0_vectors`, $B100), and the rooms from the engine's
  pieces and the stage's (engine $7800).

## Tunes

`stage_tunes` ($1000), six JMPs to entries that set up a tune for the
player at $1012: the four notes as Akuma's chamber is shown ($1000), the
hero's death ($1003), a guard beaten and the stage's end ($1006),
Mariko's two tunes in her cell ($1009, $100F), and Akuma raising his arm,
also at the end of the cell scene ($100C).
