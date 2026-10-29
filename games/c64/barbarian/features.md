# Barbarian — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Barbarian - The Ultimate Warrior",
  https://www.c64-wiki.com/wiki/Barbarian_-_The_Ultimate_Warrior (last
  edited 22 May 2022), read 29 October 2026: infobox, controls, solution,
  cheats, screenshots (saved as `reference/wiki-*`).
- The Kixx re-release's instructions (ZX Spectrum cassette), as text at
  https://games.speccy.cz/data/info/Barbarian1.txt, read 29 October 2026:
  the story, the two sides, the joystick diagrams, strength and score.
  The keys there are the Spectrum's; the moves and rules are the game's.
- Wikipedia, "Barbarian: The Ultimate Warrior", read 29 October 2026, for
  the background (design, models, controversy). Not a source for any
  C64-specific claim.
- No C64 manual scan was found (an archive.org search for "barbarian
  palace" on 29 October 2026 found only game images, which were not
  downloaded).

## Features

The joystick moves are given, as the manual does, for a fighter facing
right; facing left, left and right swap.

| Feature | Status | Where |
|---|---|---|
| Two parts on the two sides of the disk, loaded on their own, in any order: side 1 combat practice (one or two players), side 2 the fight to the death against Drax's warriors and Drax | live | `orientation.md`; side 1 demo in the wastes, side 2 in Drax's hall |
| A demo fight plays after loading, `DEMO` in the panel | live | `reference/practice-demo-volcano.png` |
| F1: one or two players | live | `1PLR` / `2PLR` in the panel; key scan `$9246` on side 1 |
| F3: music or sound effects | live | `read_keys` toggles `sound_mode` (`$B8`); `work/keys.py` |
| F5: pause | live | `read_keys`; `work/keys.py`: a second press held past the next pass pauses the game again |
| F7: start the game | live | key scan `$9246`; needs F1 first |
| Q: quit to the demo | live | key scan `$9246` (row 7, Q) |
| Player 1 on joystick port 2, player 2 on port 1 | confirmed | `lda $DC00,x` at `$84E9` (side 1) |
| Stick without fire: up jump, down crouch, forward and back walk, up-back protect head, up-forward protect body, down-forward roll forward, down-back roll back | confirmed | `move_rows` row 0; down starts move `$97`, crouch down, whose row gives the crouch; `test_rules.js`, `test_fighter.js` |
| Stick with fire: up neck chop, down leg chop, forward body chop, back flying neck chop, up-back web of death, up-forward head butt, down-forward kick, down-back overhead chop | confirmed | `move_rows` row 8; down with fire goes through crouch down to the leg chop; `test_rules.js`, `test_fighter.js` |
| Sixteen moves in all | confirmed | the 18 stick positions with and without fire start 16 moves besides standing; `move_frames` has 30 moves, the rest started by the game |
| Strength: six blows shown as dots at the top, player 1 on the left; a hit takes a half or a whole point by its strength (wiki); twelve life points as six circles (Wikipedia) | differs | twelve points as six half-circle pairs (`show_strength`); every blow that lands takes one point, half a circle, whatever its record says (`hit_effect`). *Live*: 16 drops in a fight, each of 1 point (`facts.md`, "Live tests") |
| A neck chop at the right time takes the head off and ends the fight at once | live | `reference/practice-demo-decapitation.png`, the demo; the flying neck chop's records 4 and 5 (`hit_lists` entry 4) |
| A goblin comes on, kicks the head away and drags the body off | live | `reference/practice-demo-goblin.png`; `goblin_kicks_head`, `goblin_drags` |
| Score: points by the difficulty of the move, player 1 on the left | confirmed | `hit_points`: 500, 200, 100 or 50 by the hit record. *Live*: 200, 100 and 50 seen added |
| Two-player mode: a time limit for each duel; when it runs out with both alive, strength is restored and a new fight begins | confirmed | `clock_out`: both walk back, strengths restored, and the arena changes; the clock live (`reference/practice-2plr-clock.png`) |
| One-player mode: no time limit; the clock's place shows the opponent's skill level | live (shows `00`) | `reference/practice-1plr-start.png` |
| The computer's opponents get better level by level | confirmed | `ai_level_picks`: level 7 attacks on all 32 of its picks, level 0 stands still on 14; `test_rules.js` holds the page's port to `computer_moves` |
| Fight to the death: Drax's warriors one after another, then Drax, who throws shurikens; the barbarian dodges by jumping and crouching | live | eight bouts, levels 0 to 7; Drax throws stars high or low; a crouch, a leg chop or a roll passes under a high one, a jump over a low one (`work/ending4.py`) |
| After Drax is killed, Mariana comes to the hero ("THANKS BIG BOY" in the wiki's screenshots) | differs | Drax is never fought: he vanishes when the barbarian reaches column 28 (`reach_drax`), then Mariana comes down and THANKS BIG BOY is printed. *Live* (`reference/tournament-ending-thanks.png`) |
| Idle fighters face the player, shrug and say "C'mon" (Wikipedia, which does not say which version) | traced | a fighter left idle long enough starts move `$9A`, the taunt (`idle_taunt`); not seen in VICE |
| Several backdrops: the wastes with a volcano, a forest, Drax's hall | live | four: side 1 the volcano and the forest, side 2 the throne room and the hall of arches, changing with every win (`swap_backdrop`); `test_levels.js` holds the page's pictures to VICE's screenshots |
| Music by Richard Joseph, a long title tune (wiki: "6-minute game-music") | confirmed | sequences `$80`-`$82`, a loop of 6 minutes 16 seconds on the kit's 6502 through the game's own driver (`test_music.js`); F3 plays it (live) |
| An unused picture of Mariana in the tournament's data, shown by a cracker's cheat (wiki, "Easter egg") | confirmed | scene record 3 swaps her middle for shape `$36`; nothing sets `scene_number` to 3. Not shown in VICE |
| No high score table (wiki review) | confirmed | a score is kept only as the five digits of its panel message (`msg_87`, `msg_88`), which `reset_fighters` sets back to `00000` at every restart and every F1; none of the 24 messages is a table (`reference/tournament-1plr-start.png`) |

## Beyond the documentation

Found in the code, not in the manual.

- CTRL and V held together print `V 05 10 87` and `HELLO CLAIRE` in the
  arena (`read_keys`, message `$81`). *Live* (`work/claire.py`).
- When a blow's list names the victim's pose twice and the first record
  misses, the second record is read from the wrong address, in the music
  or in I/O 2 (`hit_record_at`, `hit_test`). *Live* (`work/bug2.py`,
  `work/bug4.py`).
- The computer reads its 32 picks in order, so it fights in a cycle of
  6.4 seconds (`computer_moves`); the demo picks at random.
- Unused: frames `$27` and `$2A`, body pieces `$44` and `$4D`, move `$95`,
  scene record 3 (`facts.md`).
- The note table is tuned for an NTSC clock; a PAL machine plays 65 cents
  flat (`note_freqs`).
- Side 2's file at `$E000` ends with Commodore 128 code at `$FFD0`-`$FFEF`
  that nothing runs.
- The CBM80 signature at `$8004` sends a reset or RESTORE back into the
  game at `$8009`.

## Open questions

- Who Claire is, and what `V 05 10 87` stands for (perhaps a date, 5
  October 1987): the game does not say.
