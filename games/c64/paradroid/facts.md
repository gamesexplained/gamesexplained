# Paradroid — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

Hewson Consultants' UK disk of 1985, as the C64 Preservation Project
dumped it, booted through the collection's patched copy, whose game data
is the same byte for byte (`orientation.md`). One load: the loader reads
tracks 1-8 in its own format and starts the game at `$1000`, which puts
five staged blocks in place (`entry`) and runs on into the cold start
(`cold_start`, `$1078`), which is also the reset vector. Nothing is read
from the disk after that. Hewson's disk of 1986 is a different build: in
play its memory agrees with this one everywhere but the working areas and
a few code bytes (`explosion_step`, `$1830` and `$1841`).

## Memory layout

| Thing | Where |
|---|---|
| Zero page: the game's variables, the sound channels' state at `$C0`-`$DE` | `$02`-`$DE` |
| The robot slots, 13 arrays of 16 bytes (slot 0 the player) | `$0330`-`$03FF` |
| The population table, 16 places for each of the 16 decks | `$0400`-`$04FF` |
| The sound driver and its effect player | `$0500`-`$0767` |
| The colour table: a group for each character of the deck's set | `$0800`-`$08FF` |
| Code, with the memory editor nothing calls at `$0D63`-`$0F0A` | `$0900`-`$3EF3` |
| The blank character set of the band above the deck, and the dictionary index | `$4000`-`$45FF` |
| The screen, and its sprite pointers | `$4800`-`$4BFF` |
| Sprite shapes: shots, explosions, console pictures, menu pictures | `$4C00`-`$50FF`, `$5400`-`$68FF` |
| Status words, console strings, lifts, collision rules, colours, the version mark | `$6900`-`$6E9B` |
| The play screen's four raster interrupts | `$6EC0`-`$6FE9` |
| The text font; the deck's character set | `$7000`-`$77FF`; `$7800`-`$7FFF` |
| The deck map, 64 rows of 256 cells, built for each deck | `$8000`-`$BFFF` |
| The dictionary (249 words) and the 31 sound effects | `$C000`-`$C7FF` |
| The waypoints of the 16 decks (239 in all) | `$C800`-`$CB0C` |
| The title picture | `$CC00`-`$CFFF` |
| The five title pages, in the RAM under the I/O | `$D000`-`$DEDC` |
| The transfer board's code and rows, the score check and the day's scores | `$E000`-`$E75C` |
| The 32 map blocks | `$E800`-`$E9FF` |
| The droid tables, the twelve instruments, the 24 droid records | `$EA00`-`$F0FF` |
| The decks' tables, the side view and the 16 deck plans | `$F100`-`$FFF7` |

Banking: the start-up runs with `$01` = `$24` (all RAM). The cold start
writes `$25` (RAM, with the I/O at `$D000`), which the game keeps in play;
read back, `$01` shows `$35`, bit 4 being the cassette sense line. The
game switches to `$24` to reach the title pages and the day's score lines
under the I/O (`title_screen`, `score_line`), and keeps the cassette
motor bit in step with the cassette keys (`cassette_motor`). The game owns
the hardware vectors at `$FFFA`-`$FFFF` (`cold_start`).

## Timing

- The play screen's raster interrupts are a chain of four, recorded in
  one frame of play (`work/frame-play.json`): `irq_bottom` at line 254
  (the status line's text font), `irq_top` at 91 (the deck's scroll,
  its text mode and a blank band), `irq_deck` at 118 (the deck's character
  set, the sprite pointers, the sound driver) and `irq_collide` at 246, or
  earlier when two sprites first touch. The title and the transfer board
  use one interrupt, `irq_screen`, every half frame.
- One pass of the main loop (`main_loop`, `$13DA`) waits on the frame
  flag `$4B` five times (clear, set, clear, set, clear: `irq_deck` clears
  it at line 118, `irq_bottom` sets it at 254), so it takes at least two
  frames. *Live*: 66
  passes in 200 frames from a snapshot of play, and 67 in the energiser
  test below: about three frames a pass, so a little over 16 passes a
  second. `$4A` counts the passes, and every timer of play counts passes.
- The alert (`alert`, `$3E32`) acts every 16 passes, about once a second.
- A host's maximum energy falls by one every 128 passes for the 001
  (class 0), 64 for classes 1-4, 32 for 5-8 and 16 for the 999
  (`burn_masks`, `$6DDE`). *Live*: the 001's fell from 60 to 58 in 800
  frames, a 999's from 60 to 51 in 400 frames (133 passes).
- The sound driver (`sound_frame`, `$0500`) runs once a frame from
  `irq_deck`; the title calls it itself, once a frame of its own loop.
- An energiser gives a point of energy every fourth pass (`floor_cell`,
  `$2E7B`). *Live*: 17 points in 67 passes.

## Controls

- Joystick in port 2 (`read_stick`, `$091A`). Fire with the stick pushed
  shoots in that direction, eight ways (`shoot`, `$33B5`); fire held with
  the stick centred for 8 passes is transfer mode (`fire_state`, `$31B9`,
  the 8 at `$3836`), and releasing fire leaves it. Status words: Mobile,
  Weapon, Transfer.
- Fire held over a console for 5 passes opens the console, over a lift
  for 5 passes the lift (`floor_cell`).
- RUN/STOP pauses (`pause`, `$3B7C`): fire or RUN/STOP goes on, CLR/HOME
  ends the game, F7 freezes the animation ("Cheese") and F8 (SHIFT and
  F7) goes back to the pause (`cheese`, `$0B8A`); F1 and F2 colour and
  black and white work during the pause too. *Live*: each key's status
  word and effect.
- On the title pages: F1 colour, F2 black and white (`colour_key`), F5
  volume up and F6 (SHIFT and F5) down, 0-15 (`volume_keys`), the stick
  down skips a page's wait and scrolls faster, up holds it
  (`attract_page`). *Live*: "Colour", "Blk-Whte", "Volume 7".
- In the console menu, up and down choose and fire takes the item; in the
  robot enquiry up and down step through the types up to the host's own,
  left or right turns the page (`enquiry_pick`, `enquiry_more`). In the
  lift, up and down move along the shaft and fire leaves (`lift_move`).
- The transfer board: the stick chooses a side while "Colour?" counts
  down, then up and down move the pulser and fire plants it
  (`transfer_setup`, `pulser`).

## Graphics

- The video chip sees bank 1, `$4000`-`$7FFF` (`cold_start`). The screen
  is at `$4800`; `$D018` is `$2D` (the text font at `$7000`) for the
  status line, `$21` (a blank set at `$4000`) for the band above the deck
  and `$2F` (the deck's set at `$7800`) for the deck (`irq_bottom`,
  `irq_top`, `irq_deck`). The console's pages show the text font in the
  deck's window by rewriting `irq_deck`'s operand (`deck_charset`,
  `$6F55`).
- The deck is one-colour text with a hardware scroll (`irq_top`, the
  operand at `$6F1C`, and the fine scroll `$48`/`$49`): `$6F1C` is `$C0`
  on the deck, the title pages and the console's text pages, written by
  `restart`, `back_to_play`, `lift` and `text_page`. Only the side view and
  the transfer board turn multicolour on, with `$D0` (`draw_side`,
  `transfer`). Those two set the shared colours they need, `$D022` white
  and `$D023` black on the side view, `$D023` black on the board
  (`draw_side`, `transfer_setup`), and put the old values back afterwards
  (`restore_sprites`). *Live*: in a frame of play recorded in VICE,
  `$D016` is `$C4` over the deck.
- Colours: every character of the deck's set belongs to one of 16
  groups, the high four bits of its entry in the colour table at `$0800`
  (`colour_table`). A deck's colour scheme gives each group a colour
  (`recolour`, `$3577`): eight schemes of 12 bytes at `$6A44`
  (`colour_schemes`); each deck has one (`deck_schemes`, `$F160`), black
  and white mode is scheme 0, the title pages take one of 2-5 at random and
  a cleared deck takes scheme 7, its lights out.
- The deck map is 64 rows of 256 cells at `$8000` (`build_deck`, `$3590`).
  A deck's plan, 16 rows of 64 cells, is run-length packed (a byte with
  bit 7 set is a cell repeated the number of times the next byte gives);
  each cell picks one of 32 blocks of 4 by 4 characters at `$E800`
  (`map_blocks`). A character with bit 7 set is a wall.
- Robots, shots and explosions are sprites 1-6 (`find_sprite`), the
  player sprite 7 and the player's shot sprite 0. Each droid's sprite has
  its three-digit number drawn into it (`sprite_number`, `$3C77`) and a
  symbol that turns faster as its energy falls (`energy_symbols`,
  `$3CFB`).
- Console pictures are eight sprites, four rows of two, from the shapes
  each droid's record names, the right half mirrored from the left
  (`droid_picture`, `$3629`; `mirror_shape`, `$3AE8`).

## Mechanics

- The droids: 24 types (`type_class` `$EA00`, `type_number` `$EA20`,
  `type_speed` `$EA40`, `type_weapon` `$EA80`), the 001 and 23 robots of
  classes 1-9. A type's class is the first digit of its number. Weapons:
  none for 16 types (the 001 fires the twin laser as the player), gun 1
  for 476, 614, 615, 751, 834 and 883, gun 2 for 629, 821 and 999, the
  disruptor for 711 and 742.
- A new ship (`build_ship`, `$15E8`): the ship number goes up by one, to
  8 at most. Each deck's base type is `deck_lowest` (`$C830`) plus the
  ship number, at most 19, and the deck fills one fewer places than
  `deck_places` (`$F170`), 12 at most: places 12 down to 6 get the base
  type plus a random 0-3, the rest half a random 0-15, halved again until
  it is below the base plus 3, which gives types 1-7 on most decks, or
  nothing when it comes to 0. Place 13 of
  deck 1, the bridge, is always the 999. *Live*: `$041D` is `$17` in play,
  and the first ship held 121 robots.
- The player starts each ship on a random deck from 4 to 7, at the deck's
  first waypoint, with energy and maximum energy 64 (`ship_start`).
- Robots walk between waypoints (`droid_step`, `choose_way`): at each one
  they choose among the first three of the ways the waypoint allows, a
  third of the time each, and stand still for 8 passes when the waypoint
  has fewer. Walls stop a robot for 2 passes (`cell_check`). Robots
  regain a point of energy every fourth pass, the 999 doubles its
  (`regen`).
- A robot is drawn, and can fire, only while the player can see it, by a
  line of sight through the deck map (`line_of_sight`, `$24AE`). A robot
  that comes into view when sprites 1-6 are all in use is taken off the
  ship (`droid_step`). *Live*: with all six marked in use, two robots
  left the ship in 400 frames and the score did not change; without, none
  did.
- Shooting: the player's shot does (weapon + 2) × 4 + 8 − type, times 4,
  plus 16, and nothing when the first part is negative, so the 001's
  laser cannot hurt types 17 and up (`player_shot_damage`, `$1C0F`). A
  robot's shot or an explosion takes 2 × (40 − type) from a robot
  (`damage`); a robot's shot takes 8 or 16 from the player, an explosion
  the ship number a pass (`shot_hits_player`, `blast_hits_player`). The
  disruptor flash hits every droid on screen but the 420, 711, 742, 821
  and 999 (`disruptor`, `immune_types` `$6E5B`), and the player's host
  too unless the player's slot is the only one in use (`$59` = 1). It hits explosions and
  robots' shots as well, and the subtraction wraps: an explosion (type and
  energy `$40`) is left `$70` by one flash and destroyed by a second,
  which starts it again and, when the player fired that flash, scores the
  points read with the class at `$EA40`, 100. A player's disruptor waits
  18 passes between flashes (`shoot`, `$3431`) and an explosion lasts 11,
  so the second flash has to be a robot's first and the player's second.
  Not tested live.
- Ramming (`ram`, `$1A6A`): damage is host type + 2 − robot type. When it
  is 0 or more the robot loses twice that; when it is less the player
  loses half the difference. Robots bounce off one another, and a robot's
  shot that meets the player's shot explodes (`pair_rules`, `$1B51`;
  `collide_rules`, `$6D6D`).
- Burn-out: a host's maximum energy falls at the class's rate (Timing),
  and energy is held at it. When the 001's maximum reaches 0 its energy is
  set to 0 and the game ends. *Live*: with the 001's maximum set to 1, the
  next fall emptied its energy and the game ended ("Game over", then
  "Lowest Score of the Day!"). From the 64 it starts with, that is
  64 × 128 passes, a little over 8 minutes. A host other than the 001
  burns out to the 001, with energy 7 (`burnt_out`, `$1573`).
- Transfer (`transfer`, `$229D`): the board deals each row a piece at two
  places on each side (`place_piece`, `$E222`): auto-pulser, terminator,
  colour changer, splitter or joiner one time in 16 each, plain wire the
  rest. Each side gets pulsers: the player's host's class plus 3, the
  target's class plus 4 (`show_pulsers`). A pulse lasts 80 steps; the
  middle column takes the colour of the row's last powered segment, and
  7 or more of the 12 in one colour leads, 6 each is a draw ("Deadlock",
  a new board) (`count_middle`). The robot's side aims at a random row
  with rows 5-8 twice as likely (`opponent`). On the passes its cursor
  moves, it leaves the fire byte `$18` as the player's stick last set it,
  so while the player holds fire the robot's side fires too. Won: the player takes the
  robot's type and energy. Lost: back to the 001, or the end of the game
  when the player was the 001. Either way the target is taken off the ship
  (`transfer_done`). *Live*: a transfer lost from a 139 host took the
  player back to the 001 and the target's place in the population table
  was cleared; one lost as the 001 ended the game.
- The console (`console`, `$2C04`): the robot enquiry shows the types up
  to the host's own (`enquiry_pick`). A droid's height prints as "1." and
  the two digits of its record's byte 8, so every height reads 1.00 to
  1.99 m (`field_value`, `word_height` `$6C15`). *Live*: the 001's entry
  shows "Entry: 01", "Height: 1.00 m", "Weight: 027 kg".
- Lifts: 31 entries in eight shafts (`lift_decks` `$6CC8`, `lift_shafts`
  `$6CE7`); entry 31 is made of the next tables' first bytes and matches
  no cell (`find_lift`).
- Scoring (`kill_points` `$6DEC`, `ram_points` `$6DF6`, `alert_points`
  `$6DE8`): a robot shot or won in a transfer scores 25 × its class, 250
  for class 9; one rammed to destruction 10 × its class, 200 for class 9;
  a transfer lost from a host takes the host's ram points off. A cleared
  deck scores 500, a cleared ship 2000. The alert scores 0, 5, 10 or 25
  every 16 passes. An energiser costs 5 points for each point of energy it
  gives. The score counts up a point a call of `score_tick`, about once a
  pass. *Live*: on an energiser for 200 frames, 17 points of energy cost
  85 points; at red alert, 9 awards in 133 passes paid 225.
- The alert count (`alert_count`, `$64`): a robot destroyed adds its type,
  it falls by one every 16 passes, and its top two bits are green, yellow,
  amber or red. *Live*: from 255 it fell to 246 in 133 passes.
- Day's scores (`score_check`, `$E4E5`): the top score starts at 6809
  ("AEB") and the worst at 6502 ("TSO") (`top_score`, `worst_score`). A
  game below the worst score is greeted "Lowest Score of the Day!" and
  asked for initials. *Live*: games ending on 0 and 50 were both asked.

## Data tables

| Table | Where | What |
|---|---|---|
| `type_class`, `type_number`, `type_speed`, `type_colours`, `type_weapon` | `$EA00`-`$EA97` | 24 bytes each, by type |
| `droid_records` | `$EB00`-`$F0FF` | 64 bytes a type: picture shapes, height, weight, six dictionary words, the notes |
| `top_speeds` | `$6D97` | a host's top speed by its type's speed 1, 2, 4, 8: 5, 6, 7, 7 |
| `kill_points`, `ram_points` | `$6DEC`, `$6DF6` | by class: 0, 25 … 250; 0, 10 … 80, 200 |
| `burn_masks` | `$6DDE` | by class: `$7F`, `$3F` ×4, `$1F` ×4, `$0F` |
| `deck_lowest`, `deck_places` | `$C830`, `$F170` | by deck |
| `way_counts`, `way_lists` | `$C800`, `$C810` | waypoints by deck, 3 bytes each |
| `plan_ptrs` | `$F100` | each deck's plan |
| `colour_schemes`, `deck_schemes` | `$6A44`, `$F160` | 8 schemes of 12 colours; a scheme for each deck |
| `effects`, `instruments` | `$C610`, `$EAA0` | 31 effects of 16 bytes; 12 instruments of 8 |

## Sound

- Two effect channels, on SID voices 1 and 2; voice 3 is noise at the
  highest frequency with its output off, the game's random numbers, read
  from `$D41B` (`sound_frame`, `$0500`).
- An effect (`start_effect`, `$069B`) is 16 bytes at
  `$C610` + 16 × (number − 1): an instrument from `$EAA0` (frequency,
  pulse width, waveform, envelope and a gate time), then a frequency, a
  pitch slide, a slide period, a count of periods, a pulse width and its
  slide, a mode (a siren that reverses or a slide that restarts) and a
  follow-on effect. The driver adds the slides each frame
  (`play_channels`).
- The title's sound is made up as it plays (`title_sound`, `$054A`):
  every 128 frames effect `$1D`, `$1E` or `$1F` at random, effect `$10` on
  the second channel twice in every 64 frames, and every 16 frames a random
  change to the first channel's slide.
- Each deck has its own hum, effect `$18` with three bytes set from
  `hum_count`, `hum_period` and `hum_length` (`deck_start`).

## The listing's error rate

One sample, seed 20261024, of 60 comments drawn from the listing's 740,
checked by one checker on claude-opus-5-5[1m] with
`kit/skills/core/60-verify/checker.md`. Every verdict of wrong was read
against the code, and all fourteen held: 14 of 60, 23.3 % (95 % interval
14.4 % to 35.4 %), over the mark and a lower bound on the true rate. None
was wrong about what its routine or table is for; each was wrong in a
detail. Readers or callers left out (`$0013`, `$003D`, `$003F`, `$0058`);
an index register misread (`$06F7`, `,y` taken for `,x`); a count of
waits (`$13DA`, five, not four); a path missed (`$2109`, the robot's side
firing with the player's button; `$231E`, the host spared when it is the
only slot, and the flash's subtraction that wraps; `$29C1`, the left and
up walls acting when the player stands still); a column test misread
(`$30A0`); a sprite record misread (`$6880`, one colour at double width);
a status word's cause (`$69A4`, a draw); a table's meaning (`$6D26`, the
view's top row, not the lift's); and a name that claimed too much
(`$C830`, the base type, not the lowest). All fourteen were corrected,
with the four other comments that said the same (`$6840`, `$6B89`,
`$6D07`, `$15E8`).

Drawing the deck from the listing and comparing it with a recorded frame
of play showed three more comments wrong (`$6F04`, `$6F1C`, `$7800`,
which called the deck multicolour); they were corrected.

## Live tests

All in VICE 3.10 (vice-mcp v3.13.2) from the snapshots in `work/`, with
the frame advance stopping the machine between steps.

- Passes per frame: `$4A` read 200 frames apart in play, 66 passes.
- The console: the 001 driven onto the console of deck 7 (cell 53, 10),
  fire held: the menu after 15 frames; the robot enquiry, the deck plan
  and the side view each shown (`reference/console-menu.png`,
  `reference/enquiry-001.png`, `reference/deck-plan.png`,
  `reference/side-view.png`).
- The energiser: the view moved onto deck 7's energiser, energy set to
  16, score to 1000: after 200 frames, +17 energy, −85 points (64 paid,
  21 owed).
- The alert: `$64` set to 255; 133 passes later 246, 225 points paid or
  owed.
- Burn-out: host type set to 23 (999): maximum 60 → 51 in 133 passes;
  the 001 over 800 frames: 60 → 58; the 001 with maximum 1: game over at
  the next fall.
- Sprites: `spr_table` `$0206`-`$020B` all marked in use: the ship's
  robots 121 → 119 in 400 frames, score 0 throughout; the same 400 frames
  without the mark: 121.
- Transfer: started by setting `$6B` to a robot's slot in transfer mode,
  no input from the player: lost as the 001, the game ended; lost from a
  139 host, back to the 001 with the target's place cleared and the
  ship's robots 121 → 120.
- The C64-Wiki's POKE 8410,0 (`$20DA`): it puts a BRK at the start of
  `countdown`, the countdown stays at 99 and the transfer never ends (4,000
  frames watched); the same transfer without it ended after 1,775 frames.
- Earlier, by hand: every pause key, F1, F2, F5 and F6 on the title,
  "Lowest Score of the Day!" after games of 0 and 50 points, and the
  briefing naming the first ship "Paradroid".
