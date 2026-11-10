# Popeye — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The run did not look the game up online: the contributor dismissed
  the question when it was put on 9 November 2026, so the run kept to
  the unit itself. The
  documentation is the unit's own screen (MAME's SVG of the LCD, its
  72 named segments), the face of the unit as the SVG draws it (GAME A,
  GAME B, MISS, AM, PM), and MAME 0.289's driver block for PP-23
  (`src/mame/handheld/hh_sm510.cpp`): the buttons and their pins, the
  "Infinite Lives" test pad, and the note that "the controls still work
  after game over, this happens on the real thing too".

## Features

| Feature | Status | Where |
|---|---|---|
| A clock with AM and PM, shown at rest | live | timekeep $0200, time_digits $06C0 |
| An alarm, set and shown with Alarm, on and off with Alarm, a bell lit when on | live | key_pressed $0540, clock_prep $0624 |
| The alarm rings at its time | live | minute_tick $0580, ring $05A9, alarm_buzz $0293 |
| Setting the time after ACL (all segments lit) | live | pad_moved $02C6, read_pad $03D6 |
| Game A and Game B, chosen with their buttons | live | key_pressed $0540, mode_setup $05C0 |
| Olive Oyl throws bottles, pineapples and cans down three lanes | live | throw_or_not $00CA, lanes $012B |
| Popeye moves left and right in three places and catches what falls in front of him | live | move_popeye $0300, catch_check $030C |
| A point for each catch, the score in three digits | live | add_point $0040 |
| An item that falls into the sea is a miss (MISS marks) | differs | lost_item $0192: it takes two items in the sea to count one mark |
| Bluto with a mallet on the left, a fist on the right, knocks Popeye into the sea | live | mallet_swing $014B, fist_swing $0380, popeye_hit $0373 |
| Three misses end the game | live | miss_sequence $019A, skip_if_over $042D |
| The game speeds up as the score rises | live | set_difficulty $0080 |
| Controls still work after game over (MAME's note) | differs | Popeye moves after a game over from items, but after one Bluto's blow ended he stays in the sea and left and right do nothing (knocked stays at 3, $0100, $02E2) |
| "Infinite Lives" cheat, a test pad on R2.K1 (MAME's driver) | live | miss_sequence $019A: any key of the R2 row stops the count |

## Beyond the documentation

Found in the code, not in the manual.

- Holding Time in the clock shows the alarm's time (time_digits, $06C0).
- Holding Game A or Game B shows that game's best score; the game starts
  when the key is let go (game_prep $0680, key_pressed $0540).
- At 200 and 500 points with a miss mark lit, the game pauses while the
  marks blink ten times, then clears them (add_point $0040, bonus
  $0719).
- The level, and with it the speed and how many items may fall at once,
  is the score's hundreds plus tens digit, so it drops at every new
  hundred (set_difficulty $0080).
- Olive throws no extra item while the clock's seconds end in 8 or 9
  (throw_or_not $00CA).
- Bluto changes boats in Game B, never in Game A (bluto_switch $0395).
- Bluto starts a swing on the count of seconds since a button last
  changed and on whether the number of falling items is even
  (bluto_ready $03C4).
- In the clock the game plays itself: Olive throws, Popeye walks toward
  each item, Bluto swings (clock_step $00C5, demo_watch $0340).
- The R2 test row also rings the alarm (K4), returns to the time setting
  (K3), and after ACL shows 888 (any key) (test_row $05A3, display_test
  $06DC).
- 256 seconds without a button after a game is over return the unit to
  the clock (timekeep $0200).

## Open questions

- What the real unit does at the 200 and 500 point bonus with no miss
  lit: the code does nothing then ($005C), and a manual might describe a
  bonus the code does not have. Searched: every reader of the score's
  hundreds ($0080, $0050-$0062); none does more.
- Whether the half-miss for an item in the sea is how Nintendo's manual
  describes the rule. The code is clear (lost_item, $0192); the manual
  was not read.
