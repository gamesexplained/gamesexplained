# Creatures — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Creatures", https://www.c64-wiki.com/wiki/Creatures (revision
  43636, last edited 27 November 2025), read 13 October 2026.
- The original Thalamus instructions, "Creatures (1990 Thalamus) [1695]
  Instructions" on the Internet Archive,
  https://archive.org/details/Creatures_1990_Thalamus_1695_Instructions
  (its OCR text), read 13 October 2026.
- Screenshots on the C64-Wiki page (torture chambers, the witch's hut, the
  title and ending animations), saved to `reference/wiki-*.png` on 14
  October 2026.

## Features

| Feature | Status | Where |
|---|---|---|
| Disk version loads from side A with `LOAD"*",8,1`; a multi-load that asks for side B | live | `reference/loading-insert-side-b.png` |
| Title with credits and a scroller; fire to start | live | `reference/title.png` |
| High-score table ("Todays top heros") and attract sequence on side B | live | `reference/attract-high-scores.png` |
| Three levels of two stages each, a torture chamber after every second stage, then the ending | live | stage table, files `LA` `LB` `TC` `LD` `LE` `TF` `LG` `LH` `TI` `CJ` |
| Get Ready screen names the stage and shows the Magic Potion Creatures to collect | live | `reference/get-ready-1-1.png` |
| Get Ready: joystick left or right turns the music on or off | live | right set the music option $12B4 to 1 and drew the on icon (characters $EE/$EF at $47E4), left set it back to 0 and the off icon ($EC/$ED); engine `raster_ready_icons` |
| RUN/STOP pauses; moving the joystick resumes | live | RUN/STOP set $123D, and the scroll position and timer stood still for 100 frames; a push to the right cleared it; engine `raster_bottom`. The pause needs the joystick centred |
| Q while paused quits the game | live | quitting returned to the attract sequence |
| Up makes Clyde jump | live | Clyde's y went from 93 up to 72 and back in 17 frames on level 1.1; engine `player_control` |
| Fire fires the current weapon | live | a short press left one shot in the air ($123F = 1); engine `player_fire` |
| Fire held for a second and released breathes a large flame | live | the charge ($1236) stops at 36 frames, about three quarters of a second; released then, both shot sprites became the flame for 24 frames ($1238); engine `player_fire`, `flame_draw` |
| Down then fire shows the weapons tablet; left and right with fire held pick a weapon, releasing fire selects it | live | `reference/weapons-tablet.png` |
| A weapon's grade is its colour on the tablet: red 1, green 2, blue 3 | traced | each grade's icon flashes through a six-colour cycle: grade 1 black, red, light red, yellow, light red, red; grade 2 the greens; grade 3 the blues (engine `grade_colour_lo`/`hi`, cycles at $B42D, `tablet_icon_colour`) |
| Only weapons bought in the shop appear on the tablet | traced | the tablet turns through `owned_weapons` ($2592): a new game leaves Droopy alone in it (`player_reset`), and only the shop adds to it (shop `shop_buy`, `shop_leave`) |
| After each stage Clyde enters the witch's hut (the shop) | live | `reference/witch-shop.png` |
| Shop: left and right view the weapons, fire buys at the shown grade if there are enough Magic Potion Creatures and the weapon is below its top grade (grey) | traced | shop `shop_buy`: each of the three potion counts must reach the item's cost, a weapon at grade C is refused and its costs are blanked (`shop_show_item`); in the shop the tablet turns without fire held |
| Shop: the I icon buys up to three clues for the next torture chamber | traced | INFORMATION costs 6/6/6; the counter $CFED goes from 2 to 5, one clue each, and is set back to 2 at each chamber (shop `shop_buy`, engine `a_CFED`) |
| Shop: the E icon (EXIT) leaves the shop | live | used to reach each stage |
| Weapon prices in the three kinds of Magic Potion Creature: Droopy 0/1/1, Super Droopy 2/0/1, Fireball 2/1/2, Fall Up 3/1/2, Wiggler 2/1/2, Curly Wurly 3/2/1, Flamer 6/3/4, Scatter Ball 3/5/5 (C64-Wiki) | traced | the same in the shop's cost tables (shop `item_cost_1`-`3`), which add INFORMATION at 6/6/6 |
| Magic Potion Creatures are collected during each stage | traced | engine `player_hit_object`: touching a creature showing frames $B6-$BB adds 1 to its kind's count (5 when its sprite is double height) and to the total; each level's spawn records place them (`potion_add`) |
| An enemy dies only if it flashes white when hit | traced | engine `object_flash_one`: a hit that does damage turns the object white for three frames; an object with hit points $FF flashes without turning white and cannot be killed (`shot_hit_object`) |
| Some enemies are linked: hitting one hits the others | traced | spawn record byte 8 bits 4-6 name a linked group, and a kill takes the whole group with it (engine `object_kill_linked`); the levels' end creatures and hidden prizes use it |
| A torture chamber holds a captured Fuzzy who must be saved to go on, a puzzle against a time limit | live | chamber 1: with the boulder falling and the fuse lit the cannon fired, the demon was carried off and the WELL DONE screen followed; climbing the jack brought the chainsaw demon, who sawed the Fuzzy and cost a life (part `torture-1`); `reference/torture-1.png`. A time limit as such was not looked for |
| Underwater sections with an oxygen supply (C64-Wiki) | live | level 2.1's ponds: Clyde swims and an OXYGEN bar under the score empties; rising bubbles fill it (part `level-2-1`); `reference/play-2-1-swimming.png` |
| End-of-level demons (C64-Wiki) | traced | each level's last spawn record in its end slot ($8F0C) is a creature asleep until the scroll reaches the end; killing it within three columns of the end starts the stage-complete countdown (engine `object_kill`): the green dragon (1.1), a double frog (1.2), a crescent that splatters (2.1), a flipping stone (2.2), a patterned block (3.1), a waving ghost (3.2) |
| Hidden extras (C64-Wiki) | traced | objects of type 55 show a blank sprite, cannot be touched or shot, and die only with their linked group, turning into potion creatures or an extra life: 21 spawn records in levels 1.1, 1.2, 2.2, 3.1 and 3.2 hide ten potion creatures and nine extra lives; of the other two, level 1.1's dies as a puff of smoke and level 3.1's is in no group, so nothing kills it |
| Parallax scrolling (C64-Wiki) | traced | done with characters: while the landscape scrolls, the background's characters have their bit patterns rotated at their own rates, so grass, woods and graves move past more slowly (levels 2.1 and 3.1's frame routines) |
| Stage timer and lives in the status panel | live | `reference/play-1-1.png` |
| Cheat: once the title music stops and the high-score table shows, holding CTRL and 2 gives infinite lives (C64-Wiki, marked not tested). Live: the high-score fuzzies turn grey (the wiki says Clyde) and the instruction that takes a life becomes three NOPs (title_cheat_step) | live | `reference/cheat-grey-fuzzies.png` |
| Poke 15596,60: invulnerability (C64-Wiki, not tested) | traced | $3CEC holds LDA $24F0 in `player_hurt`; 60 ($3C) makes it a three-byte NOP, so the BEQ after it always returns, except on the path the time-out takes ($1215 set): Clyde still dies when the timer runs out |
| Poke 44183,173: unlimited shields (C64-Wiki, not tested) | traced | $AC97 holds the DEC $12A0 that uses up Clyde's spare hit (`player_dying_wait`); 173 ($AD) makes it LDA, so the spare hit is never used up |
| Poke 7328,208: unlimited lives in the main game (C64-Wiki, not tested) | differs | live: $1CA0 holds DEC $B7BF, and 208 ($D0) turns it into a branch that is not taken, after which the bytes run as other instructions with interrupts off; at the first lost life the game hung on a blank panel. 7328,173 (LDA) kept the lives at 4 and went on to the Get Ready screen |
| Pokes 33734, 33952 and 33505 to 173: unlimited lives in torture chambers 1, 2 and 3 (C64-Wiki, not tested) | traced | each address holds the chamber's own DEC $B7BF ($83C6, $84A0, $82E1 in files TC, TF and TI); 173 makes it LDA |
| The high-score table is not saved to disk (C64-Wiki review) | traced | the only disk traffic is loading: every file is opened with secondary address 0 (engine `kernal_open_file`), and the drive commands sent are the fast loader's M-W and M-E (`fast_loader`); no part's code calls SAVE or sends a write command |
| An ending sequence | live | file `CJ` (part `ending`): a text screen, then three animated scenes; `reference/ending-text.png`, `reference/ending-village.png`, `reference/ending-rave.png`, `reference/ending-hearts.png` |

## Beyond the documentation

Found in the code, not in the manual.

- Clyde has a spare hit in each life: `stage_start` sets $12A0 to 1, the
  first touch only stops him for about 40 frames and leaves him
  invulnerable for a while (`player_dying_wait` uses it up), and the second
  touch kills him; in water a touch kills whatever (live, 14
  October 2026: walking into level 1.1's creatures, the first touch took
  $12A0 to 0 with the lives still 4, the second cost a life).
- The title is its own program, side A's `MENU` (part `intro`): THALAMUS
  PRESENTS dissolves in and out, the Creatures logo rises from the bottom
  of the screen by flexible line distance, sinks back and rises again, then
  credits and a scroller. Its NMI handler, an RTI, is also the "@" in front
  of a message nothing prints, "FUZZIES RULE OK!" and a quote from Clyde,
  and unused sprite blocks hold an Apex message announcing the follow-up
  to Retrograde.
- Side A holds a separate program, "uncle clyde", that the game never
  loads: a packed multicolour bitmap of Clyde pointing at the player under
  "CLYDE NEEDS YOUR HELP!" (part `picture`;
  `reference/clyde-needs-your-help.png`).
- Side B's file `1@` is a copy of the attract sequence and high-score code
  ($E000-$F1FF, the GAME file's $9800-$A9FF, byte for byte). The shop
  arrives with level 1.2's file and is swapped into $E000 over it, so after
  a game over or the ending the game reloads `1@` (stage 0) and swaps it
  back into place before loading level 1.1 (engine `loader_hand_over`).
- Every level and chamber file starts at $8000 with the KERNAL's CBM80
  cartridge signature, pointing both reset vectors at `memory_wipe`: a reset
  while one is in memory erases the game (tested from chamber 1 with a VICE
  reset).
- Level 1.1's file carries a message nothing prints, thanking Ablex "for
  their hospitality and support (and all the free food)" (part
  `level-1-1`, `hidden_message`).
- Level 3.1 and 3.2 have a broomstick that Clyde rides for about 31 seconds,
  flying in four directions, and level 3.2's castle has spikes that kill at
  once, past the spare hit (parts `level-3-1`, `level-3-2`;
  `reference/play-3-1-broom.png`).
- The ending's text screen adds "WHY NOT USE THE CHEAT MODE NEXT TIME"
  only when the game was finished without the cheat (part `ending`,
  $7DE6, which tests for the cheat's NOPs at $1CA0).
- After the ending the game reloads from stage 0 and goes to the
  high-score check, as after the last life (`ending_exit`, $7E6B).
- The cheat lasts one game: the title's set-up writes DEC $B7BF back over
  the NOPs (attract block, $E771).
- A rescue pays six potion creatures, two of each kind, at the worth of
  the last pickup: thirty in all when the last potion creature collected
  before the chamber was double height (traced: chamber `potion_award`
  adds through engine `potion_add`, whose amount only a pickup writes).
- Some creatures animate only when shot, a script byte a hit: world 2's
  swelling balls and level 2.1's end creature (traced: engine
  `object_spawn` at $20EE, `hit_response_3`).

## Open questions

- None about documented behaviour. The C64-Wiki's poke for unlimited lives
  in the main game hangs the game (see the table); whether it was written
  for another release of the game is not known.
