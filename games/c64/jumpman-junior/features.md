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
| Fire jumps: with the stick left or right a long jump that way, with up straight up | open | |
| Twelve levels with names, played in order | live | name table at `$9D93`, headers at `$BC00` |
| After level 12, levels are picked at random from the twelve | traced | `$9B1C`: when the counter reaches 12 a flag at `$09C5` is set and a random number below 12 is drawn |
| A bomb is defused by touching it and scores 100 points | open | |
| Bonus at the end of a level for each Jumpman left: 25 × level number, 25 on level 1 to 300 on level 12 | open | a table of 25, 50 … 300 at `$9EA1` |
| A time bonus counting down while the level is played | live (BONUS on the status bar falls) | |
| Four lives at the start; an extra one every 7,500 points | open (the status bar reads JUMPMEN = 05 at the start) | |
| Falling lower than where a jump started, or off the screen, kills | open | |
| Up ropes (only climb up) and down ropes (only climb down), climbed automatically | open | |
| Bullets that fly in straight and turn once toward Jumpman when lined up with him | open | |
| Level 3 SREDDAL ("ladders" backwards): ladders appear and vanish | live (two cyan ladders appear) | `reference/level-03-play.png` |
| Level 9 BLACKOUT: the level is invisible, and appears near Jumpman | live | `reference/level-09-play.png` |
| Level 12 HURRICANE: a wind blows Jumpman to the right; he can leave on the right and come back on the left | open | |
| Each level has its own border colour and name-bar colour | live | header byte `$0C69` goes to `$D020` |
| Status bar: JUMPMEN, LEVEL, RUN SPEED, SCORE, PLAYER, BONUS | live | |
| PLAYER # GET READY! between turns with several players | open | text at `$9E8C` |
| High score table of 20 entries with a name typed after the game | live | `reference/high-scores-entry.png` |
| Sound effects for running, jumping, bullets and bombs; a tune on losing a life, finishing a level and the end of the game | open | sound routine `$88F2` |
| Attract mode that previews the twelve levels after two minutes (Atari manual) | open (not seen in three minutes at the title on the C64) | |

## Beyond the documentation

Found in the code, not in the manual.

- The disk version carries the 16 KB cartridge image and runs it from
  RAM with a patched copy of the KERNAL (`orientation.md`).

## Open questions

- After a game over with a score of 0, the high-score screen stopped
  with one name entered and never moved on: the main loop waits at
  `$A914` for the sound flags at `$5F` to clear, and the sound routine
  was not being called (`work/stall-highscores.vsf`). A bug of the
  game's, or a state the random input produced?
- What does each level's own code do (pointers in each level header)?
- Does run speed slow the enemies as well as Jumpman (C64-Wiki says so)?
