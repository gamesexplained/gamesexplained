# The Spy Who Loved Me — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

- Tier: silver. Both parts at 100 %; sample seed 2617 found 14 of 60
  comments wrong in a detail (estimate 23 %, all fixed with their
  siblings): an audit of the whole listing on a proven model is
  recommended before the Source tab can call it checked.
- Gold: a human pass over every page, section by section.
- Platinum: a Play tab porting the game.
- From the reader review, left for a later pass:
  - Graphics: draw each named frame in its row and animate the car, the
    boat, a diver and an explosion side by side; name every frame.
  - Maps: mark the spawn entries (tokens, the Q-truck, ramps, the boss)
    and the loop-back orders on the strips; add jump buttons.
  - Gameplay: draw the speed bands of `set_speed` (`$341F`) on a
    screenshot.
  - Discoveries: play buttons for tunes 6 and 7; a chart of the armour
    price against the DAM bar.
  - A section on how the screen is built (the blanked strip, the panel's
    charset in its own screen, the multiplexer's 38-line rule, the
    dissolve, the ripples).
- Leads that need a live test before a page claims them:
  - An off-centre ramp sets `$40` (`hit_ramp`, `$3289`, `$329C`): the
    car shows frame `$6E` or `$11` and scores from the second half of
    `speed_score`, maybe two-wheel driving as in the film.
  - `draw_hud` gives a life when the hundred-thousands digit changes
    either way (`$2985`), so the 500 penalty may give a life when it
    crosses a boundary downwards.
- The Commodore Format 6 cassette cheat patches the loader; which patch
  gives which effect is not settled.
- Link Licence To Kill from the Overview once its pages are on main.
