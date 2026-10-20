# Balloon Fight — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The NES instruction booklet, Nintendo of America, ©1986, the scan in
  the Internet Archive's "Nintendo Entertainment System Manuals" item
  (`archive.org/download/NESManuals/Balloon Fight (USA)_text.pdf`,
  pages 2 to 9), read 19 October 2026. The scoring table and the rules
  below are from it unless another source is named.
- Wikipedia, "Balloon Fight" (`en.wikipedia.org/wiki/Balloon_Fight`), read
  19 October 2026: the credits and the release dates.
- StrategyWiki, "Balloon Fight", its "Gameplay" and "Walkthrough" pages
  (`strategywiki.org/wiki/Balloon_Fight`, read through the site's API on
  19 October 2026, since the pages themselves refuse an agent's fetch):
  the three enemy colours and the scoring by colour, the bumpers, the
  sparks' limit of two, the Balloon Trip ranks.
- Data Crystal, "Balloon Fight (NES)" with its RAM map, ROM map and text
  table (`datacrystal.tcrf.net/wiki/Balloon_Fight_(NES)`), read 19 October
  2026. Leads, not facts: each entry is unchecked and was written for the
  Japanese release. Every one taken up is marked where it was checked.
- The Nintendo Wiki, "Balloon Fight" (`nintendo.miraheze.org/wiki/Balloon_Fight`),
  read 19 October 2026: the bonus stage's twenty balloons and the second
  balloon's return there, the name "Propellor" in the North American
  manual against "Flipper" elsewhere.
- The Cutting Room Floor's page for the game could not be read on
  19 October 2026 (the site answers an agent's fetch with a decoy page);
  what is cited from it below comes second hand, from a web search's
  quotations of the page, dated the same day.
- NesCartDB could not be read on 19 October 2026 (the site's bot check
  refuses the fetch), so the image's CRC32 of the PRG and CHR, `401349A8`,
  is not matched to a release there. The Internet Archive's record of a
  manual scan names the North American catalogue number `NES-BF-USA`.
- Snowbro's disassembly of the game (about 2003), which Data Crystal links
  through the Web Archive, could not be fetched from this session. It was
  not used.
- With the lookup allowed, the game's own screens are the source for
  everything the booklet does not say; `reference/` has them.

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen with three options, A 1-player game, B 2-player game, C Balloon Trip, a balloon as the cursor; Select moves it, Start begins; both work on controller 1 only | live | `reference/title.png`, `reference/title-balloon-trip.png`; Select and Start checked from `work/title.json.gz` |
| The title screen starts a demonstration game by itself after a while; Select or Start during it recalls the menu | live | `reference/demo.png` (the demo after the title, with both scores and `TOP`); the code's timer is open (Data Crystal says `$19` wrapping) |
| Control pad left and right move the balloonist: he runs on the ground, accelerates in the air; up and down do nothing | confirmed | `actor_controls` reads bits 0 and 1 of `buttons` only; up and down are never read (`read_joypads`, `actor_move_control`) |
| A flaps once; B flaps continuously; the flap is the only lift | confirmed | `actor_controls` (`$EC38`): one flap per press through `flap_latch`, repeated while B is held; `flap_strength` by type |
| The player has two balloons; an enemy hit pops one and the second makes rising harder; with both gone the player falls into the water and loses a life | live | `reference/one-balloon.png` (one balloon left, phase 1) |
| Flying off one side of the screen brings the player back on the other | confirmed | `actor_move_x` lets X wrap; only Balloon Trip clamps it (`actor_physics`) |
| Enemies on the ground blow up a balloon, take off and fly around; hit from above, the balloon pops and the enemy parachutes down; hit again on the way down he drops into the water | confirmed | `actor_think` (`$EBC4`) pumps and launches; `resolve_hit` pops and `hit_next_type` puts the bird on its parachute, then falling |
| A parachuting enemy that reaches land blows up another balloon and comes back "even stronger": three colours, pink, green, white, from slowest to fastest (StrategyWiki); a white one does not improve further | confirmed | `actor_ground_state` lands it; `actor_think` relaunches one colour faster from `relaunch_types`; the three speeds are the physics tables by type |
| Kicking an enemy on the ground while he inflates boots him into the water | confirmed | `resolve_hit` with the bird's action 2 up: `hit_scores` |
| A bubble floats up from the water when an enemy sinks; popping it scores | confirmed | `actor_physics` turns a sunk bird into a bubble (`actor_balloons` `$80`); `actor_bubble_update` scores 500 |
| The fish in the water eats a player, or an enemy, who flies too close to it | confirmed | `fish_update` and its routines (`$C5C3-$C716`); the fish fanfare |
| When a round goes on too long a thunder cloud throws lightning: a spark that bounces diagonally until it meets the water; at most two sparks at once (StrategyWiki) | live | `reference/lightning.png` at 30 s in phase 1; `lightning_countdown`, two slots in `spark_state` |
| Propellers (the booklet's name; "Flipper" in other sources) appear from later rounds: a spinning bar that throws whoever touches it; up to four in a stage (StrategyWiki) | live | none before phase 7 (`phase_layout_7`), four in phase 10; `propeller_touch`, `propeller_push`; up to 10 slots |
| A round is cleared when every enemy is gone; rounds add enemies and platforms | confirmed | `phase_loop` (`$F327`); the phase table in `facts.md` |
| After every three rounds a bonus round: balloons rise from chimneys at the bottom, twenty of them; popping all twenty gives the perfect bonus; a popped player balloon comes back for the bonus round; falling there costs no life (two players) | live | `reference/bonus-round.png`; `bonus_layout` at every fourth index; `bonus_round_play`; the second balloon comes back through `actor_physics` (`$EB62`) |
| Phase number shown at the start of a round (`PHASE-01`) | live | `reference/play-phase1.png`, taken as the words fade |
| 2-player game: both players on screen, cooperation or competition; a player can pop the other's balloon | live | `reference/two-player.png`; the popping is open |
| Balloon Trip: one life, the scene drifts from left to right, balloons to pop and sparks to avoid; the rank out of 50 is shown at the top right; twenty balloons in succession give a "super high score", which StrategyWiki describes as the balloons' value rising a rank, up to three ranks | live | `reference/balloon-trip.png` (`RANK-47`); the ranking and the streak are open |
| Lives: three in games A and B, one in C; lost by sinking, the fish, lightning, or both balloons popped | confirmed | `start_game` gives 2 spare (`lives`), the third is the one in play; Balloon Trip sets 0; `phase_loop` respawns and `game_over` ends |
| Start pauses with a tone; the sprites are hidden while paused | live | `reference/pause.png` |
| Top score resets to 10,000 (games A and B) or 25,000 (game C) at power-on | live | `TOP-010000` on `reference/play-phase1.png`, `TOP-025000` on `reference/balloon-trip.png` |
| Scoring, games A and B: enemy balloon 500, 750 or 1,000 by colour; parachute 1,000, 1,500 or 2,000; kick 750, 1,000 or 1,500 (the colours' order from StrategyWiki, the ranges from the booklet); the other player's balloon 1,000; a bubble 500; a bonus-round balloon 300 to 700; the perfect bonus 10,000 to 30,000 | confirmed | `hit_scores`, `hit_scores_kicked`, `bonus_values`, `perfect_tens_table`: the table in `facts.md`; the colours match StrategyWiki's |
| Scoring, Balloon Trip: a balloon 300 to 700, a bubble 500, twenty in succession "? points" (the booklet's own text) | confirmed | `set_balloon_value` (300, 500, 700 by `bonus_round`), 500 a bubble (`actor_bubble_update`), 10,000 for 20 in succession (`trip_loop`, `$C348`) |
| Extra lives: the booklet says nothing; a search found no documented threshold | confirmed | there is none: nothing reads the score but `add_score`'s top-score compare and the ranking; `lives` is only ever decremented after `start_game` |
| Game over text | live | `reference/game-over.png`; `show_game_over` |

## Beyond the documentation

Found in the code, not in the manual.

- Data Crystal's RAM map (leads to check): `$02` the frame flag the main
  loop waits on; `$03-$07` player 1's score, `$0D-$10` the top score, the
  second lowest digit first; `$16` the mode, 0 for Balloon Fight and 1 for
  Balloon Trip; `$19` the frame counter; `$31` controller 1's bits; `$3F`
  the title screen's option; `$78-$7F` each actor's state (1 rising, 0 no
  thrust, 2 walking, 3 on the floor, 4 braking); `$90` player 2's X, `$91`
  player 1's X, `$92-$99` the others'; `$9B` player 1's Y, `$9C-$A3` the
  others'; `$D0-$FF` the sound driver; `$0200-$02FF` the sprite table;
  `$0300-$03FF` a circular list of tiles to draw; `$0400-$0435` the
  fractional and integer parts of the actors' positions and velocities;
  `$0490-$0491` and `$04A4-$04A5` the sparks' positions, `$051C-$051D`
  their speeds, `$0530-$0531` their images.
- Data Crystal's ROM map (leads): the NMI at `$C08A` by its count (ours
  reads `$C094` from the vector; the page is for another dump), `$D78E`
  the status bar writer to PPU `$2043`, `$D7FB` the lives, `$D831` the
  game-over text, `$D603` the stars, `$EB84` and `$EB96` the position
  updates, `$F758` the per-frame routine `$FFF7` jumps to.
- The Cutting Room Floor (second hand): graphics kept from the arcade
  game and never drawn, an `END` card for the last bonus balloon, large
  clouds, the arrow that chased a slow player in the arcade; unused font
  characters (a comma, a period with a comma in one tile, a question
  mark); an unused sound effect; a title-screen difference between
  revisions.
- Observed: after a Balloon Trip ends, the demonstration that follows the
  title shows the Trip's top score, 25,000 (`reference/demo.png`): the
  demonstration keeps the title option's top score pointer.
- The reset button never keeps the scores, and the sound driver's
  variables lie inside the Balloon Trip ranking table (`facts.md`,
  "Quirks and bugs").
- Phase 9 reuses phase 4's birds and platforms with two propellers added;
  phase 12 is phase 6 again; from phase 13 the layouts of 4 to 12 repeat.

## Open questions

- Which release is this image? The file is named as the North American
  cartridge and the title screen says ©1984, but no checksum database
  could be read.
- The three bird speeds in frames: the physics tables are known
  (`facts.md`); a timed run of each colour across the screen was not
  made.
