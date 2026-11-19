# Jumpman Junior — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Jumpman Junior", https://www.c64-wiki.com/wiki/Jumpman_Junior, read 17 November 2026
- Wikipedia, "Jumpman Junior", https://en.wikipedia.org/wiki/Jumpman_Junior, read 17 November 2026
- The instruction text, typed in by Scott Wozniak on 17 March 1999, https://ctrl-alt-rees.com/archive/www.cyou.com-~richard/JUMPMNJR.TXT, read 17 November 2026. It is the Atari cartridge's manual: it names the SELECT, OPTION and START keys and joystick port 1, which the C64 version does not use.
- sashanan, "Jumpman Junior (Commodore 64) review", HonestGamers, 19 June 2009, https://www.honestgamers.com/8119/commodore-64/jumpman-junior/review.html, read 17 November 2026
- The game's own screens, in VICE (reference/), 17 November 2026

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen: EPYX PRESENTS, JUMPMAN JUNIOR on a rainbow bar a small Jumpman runs along, (C) 1983 BY EPYX, DESIGNED BY RANDY GLOVER | live | `reference/title.png` |
| 1 to 4 players, chosen with the number keys at NUMBER OF PLAYERS (1-4) ? | live | keyboard read by the game itself; `vice_keyboard_type` is ignored |
| A run speed per player, 1 (fastest) to 8 (slowest), fixed for the game | live (asked and shown as RUN SPEED) | status bar |
| Joystick in control port 2 (the code reads `$DC00` only) | confirmed | `$86AD`, `$86CF` |
| Up and down climb ladders; left and right walk | live | |
| Fire jumps: with the stick left or right a long jump that way, with up straight up | confirmed | `start_jump` `$A3B8`, `jump_path` `$A494`: 22 steps, 52 pixels across |
| Twelve levels with names, played in order | live | name table at `$9D93`, headers at `$BC00` |
| After level 12, levels are picked at random from the twelve | traced | `$9B1C`: when the counter reaches 12 a flag at `$09C5` is set and a random number below 12 is drawn |
| A bomb is defused by touching it and scores 100 points | confirmed | `bomb_check` `$A600`, header byte `$11` (100 on every level) |
| Bonus at the end of a level for each Jumpman left: 25 × level number, 25 on level 1 to 300 on level 12 | confirmed | `level_bonus` `$9EA2`, read by `level_done` `$9C7B`, for each Jumpman left plus the one in play |
| A time bonus counting down while the level is played | live (BONUS on the status bar falls) | |
| Four lives at the start; an extra one every 7,500 points | confirmed (the status bar reads JUMPMEN = 05 at the start: lives + 1) | `player_init` `$996C`, `score_check` `$9FCD` |
| Falling lower than where a jump started, or off the screen, kills | differs | `jumpman_task` `$A23A`: any fall of more than one 2-pixel move kills; a jump ends after 22 steps wherever he is, 14 lines below its start, and the same rule applies; below line `$DE` kills |
| Up ropes (only climb up) and down ropes (only climb down), climbed automatically | confirmed | `rise` `$A398` (green in his body lifts him), `slide_rope` `$A363` |
| Bullets that fly in straight and turn once toward Jumpman when lined up with him | confirmed | `bullet_task` `$A0F1` |
| Level 3 SREDDAL ("ladders" backwards): ladders appear and vanish | live (two cyan ladders appear) | `reference/level-03-play.png` |
| Level 9 BLACKOUT: the level is invisible, and appears near Jumpman | live | `reference/level-09-play.png` |
| Level 12 HURRICANE: a wind blows Jumpman to the right; he can leave on the right and come back on the left | confirmed | `l12_wind_task` `$BB04` |
| Each level has its own border colour and name-bar colour | live | header byte `$0C69` goes to `$D020` |
| Status bar: JUMPMEN, LEVEL, RUN SPEED, SCORE, PLAYER, BONUS | live | |
| PLAYER # GET READY! between turns with several players | confirmed | `next_turn` `$9974`, text at `$9E8C` |
| High score table of 20 entries with a name typed after the game | live | `reference/high-scores-entry.png` |
| Sound effects for running, jumping, bullets and bombs; a tune on losing a life, finishing a level and the end of the game | confirmed | `sound_task` `$88F2`; ten tunes and nineteen effects run on the kit's 6502 (`test_music.js`) |
| Attract mode that previews the twelve levels after two minutes (Atari manual) | open (not seen in three minutes at the title on the C64) | the interrupt reads a demo's input from `$0930` when one is set (`$863C`); what would set it was not traced |

## Beyond the documentation

Found in the code, not in the manual.

- The disk version carries the 16 KB cartridge image and runs it from
  RAM with a patched copy of the KERNAL (`orientation.md`).
- Level 10 writes 0 over the cartridge signature at `$8004` (live).
- A check on the tape buffer pointer at each turn (`$9974`, traced).
- Level 10 at run speed 8: bullets cannot kill (`$B7A0`, traced).
- No extra Jumpmen after the score wraps at a million (`$9FCD`, traced).
- Level 11 writes `$D208`, the VIC-II's `$D008` (live).

## Open questions

- After a game over with a score of 0, the high-score screen stopped
  with one name entered and never moved on: the main loop waits at
  `$A914` for the sound flags at `$5F` to clear, and the sound routine
  was not being called (`work/stall-highscores.vsf`). A bug of the
  game's, or a state the random input produced?
- Answered: each level's own code is in `facts.md` (Mechanics) and on the Maps tab.
- Answered: run speed slows the enemies too: `$09B7`, the enemies' speed, is set to the run speed at each new life (`$9AFC`).
