# The witch's shop — verified technical facts

The block at `$E000-$F1FF` that arrives with level 1.2's file at
`$9A00-$ABFF` and is swapped into `$E000` (the game's `facts.md`, "How the
parts connect"). Every address here is the shop's; routines named with
an address outside it are the engine's (`parts/engine`), and the
messages and clues the shop prints are in the level files. Unless marked
*live*, a fact comes from the code in `work/shop-entry.vsf`; the shop's
own screen is `reference/witch-shop.png`.

## Entry and exit

- The engine jumps to `$E500` (`shop_start`) once a level's file has
  loaded, so the shop comes before levels 1.2, 2.1, 2.2, 3.1 and 3.2.
  `shop_init` (`$EABF`) swaps in the shop's sprites (memory swap 2,
  to `$7B00`), moves the level's character set to `$D000` (swap 6) and
  brings the shop's own from `$D800` (swap 1), draws seven panels of
  characters from their layouts, each character with its own colour,
  and plays the shop's tune, which is in the engine at `$F300`
  (`shop_tune_start`, `$EF2F`).
- EXIT leaves (`shop_leave`, `$EC33`): the swaps are undone, the weapons
  bought rebuild engine `owned_weapons`, and engine `level_begin` starts
  the level.

## The screen

- Five raster routines a frame (`shop_raster_top`, `$E8FB`, at line 0,
  `shop_raster_witch_top` at `$5A`, `shop_raster_witch_low` at `$8A`,
  `shop_raster_tablet` at `$CA`, `shop_raster_frame` at `$F4`) show 30
  sprites: the three potion creatures of the top panel, two sprites each
  in the level's own frames `$B6-$BB`; the witch, sixteen sprites in two
  bands of eight; and the weapons tablet's eight.
- The digits `$30-$39` are inverted (`digits_invert`, `$E7CB`) at line
  `$5A` and back at `$CA`, so the costs in between show in inverse and
  the counts above them do not.
- The gargoyles' eyes, two cells each side on row 2, play five frames at
  random intervals (`shop_eye_step`, `$EEA2`).
- The witch's messages print one character every third frame, in boxes
  that grow to size (`shop_box_step`, `$EEE8`; `shop_print_step`,
  `$F0F8`). The third message, "INGREDIENTS:", opens the weapons tablet as
  it prints (its leading `$FE`, `text_ingredients`, `$F15D`).

## The greeting

`shop_init` picks the greeting from the level's six message addresses
(level `shop_text_lo`, `$8EEF`) by the lives (engine `$B7BF`, read at
`$EB50`): message 0 with 0 lives, message 2 ("YOU BETTER BE MORE
CAREFUL") below the level's `shop_lives_mark`, message 1 otherwise; then
the level's message 3 as a second line. Message 0 ("OH BUCK UP LITTLE
TROOPER") is never seen: engine `loader_hand_over` adds a life (`$BE36`)
before it jumps to the shop, and a game whose lives have gone below zero
reloads the title instead, so the shop always sees at least 1.

- The marks: 6 in level 1.2's file, 7 in 2.1's, 3 in 2.2's, 3.1's and
  3.2's. Clyde has 4 lives at a new game and the hand-over adds one, so
  a player who has lost none and collected no extra life meets the first
  shop with 5 and is told to be more careful. *Live*, 14 October 2026:
  the shop before level 1.2, entered with 5 lives, printed message 2.
- The level's message 4 is not read. `shop_init` copies the level's
  message 3 and message 5 into its own slots (`$EB01-$EB16`), reads 0-2
  by X at `$EB5F`, and no code in any part reads `$8EF3` or `$8EF9`. In
  worlds 1 and 2 it points at message 3's text; in world 3 at `$9A04`,
  "LET ME HELP YOU CLYDE", world 2's message 3, which world 3's file
  still holds.
- *Live*, 14 October 2026: the message box's cells, read where each pass
  of `shop_loop` ends (`$ED86`) through the greeting before level 1.2 and
  four presses of INFORMATION (the fourth refused), change on the same
  passes as the page's run of this code (`test_shop.js`). The loop made
  one pass a frame throughout. Read at the end of the emulator's frame
  instead, a box that grows past six rows is caught half drawn: the main
  loop starts its step at line `$F4`, and the step is still running when
  the frame ends.

## Buying

- Left and right turn the tablet through the ten items, without fire
  held: the shop rewrites the engine's test at `$1E21`. Fire buys the
  middle one (`shop_buy`, `$EDAA`), once per press.
- Each of the three potion counts (engine `$B8A0-$B8A2`) must reach the
  item's cost, compared in decimal (`item_cost_1-3`, `$EA61`, `$EA6A`,
  `$EA73`); the total (engine `potions_total`) goes down by the sum.

| Item | Costs |
|---|---|
| Droopy | 0 / 1 / 1 |
| Super Droopy | 2 / 0 / 1 |
| Fireball | 2 / 1 / 2 |
| Fall Up | 3 / 1 / 2 |
| Wiggler | 2 / 1 / 2 |
| Curly Wurly | 3 / 2 / 1 |
| Flamer | 6 / 3 / 4 |
| Scatter Ball | 3 / 5 / 5 |
| Information | 6 / 6 / 6 |

- A weapon is bought a grade at a time, A to C (engine `weapons_flags`,
  `$CFE3`): its name shows the grade on offer, and at C the costs are
  blanked and a fourth is refused (`buy_weapon`, `$EDDD`). Droopy starts
  at A, so it is sold from B.
- INFORMATION buys the next clue for the next torture chamber, three at
  most: engine `$CFED` goes from 2 to 5, and is set back to 2 at each
  chamber and each new game. A clue is refused, at no charge, while a
  message is still printing (`message_done`, `$F0D2`). The clues are the
  loaded level's: the first at `$8F0D`, the second at `$9880` (`$9908`
  from stage 7), the third the level's message 5 (`message_lo`,
  `$F0B9`).
