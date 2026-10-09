# IK+ — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "IK+", https://www.c64-wiki.com/wiki/IK%2B, read 9 October 2026: infobox (Archer MacLean, System 3, Rob Hubbard, 1987, joystick port 2), description, controls, keys, belt table, cheat, easter eggs.
- Wikipedia, "International Karate +", https://en.wikipedia.org/wiki/International_Karate_%2B, read 9 October 2026: credits, the C64 version's single bonus game, the background antics, the trousers.
- No manual scan was found: an Internet Archive search on 9 October 2026 found none, and the Wayback copy of Lemon64 did not answer.
- The game's own screens in the emulator, 9 October 2026 (`reference/`).

## Features

| Feature | Status | Where |
|---|---|---|
| Three karateka fight at once in one arena; the first to six points wins the round | confirmed | `round_over` (`$13CB`) ends the round at six dots or when TIME runs out; `round_end` (`$11E3`) ranks by dots, then the round's points |
| The fighter with the fewest points drops out | confirmed | only a human placed last alone drops out; a tie for last drops nobody (`round_result`, `$11AC`); the computer fighters always fight on |
| One player against two computer fighters (F1/F2) | live | F1 (the same key as F2) or fire in port 2 (`$18D2`); the white fighter is the player |
| Two players, against each other or as a team, against one computer fighter (F3/F4) | confirmed | F3 or fire in port 1 (`$18C2`); there is no team setting: each fighter scores alone, and a computer fighter attacks the leader of the other two (`choose_target`, `$29BE`) |
| Eight joystick directions give eight moves, and eight more with fire; the moves mirror with the fighter's facing | confirmed | `joy_moves` (`$1BBB`) and its mirror (`$1BDB`); forward becomes move `$14` near an opponent |
| Moves listed on the wiki: jump up; high punch backward with a turn; punch; walk back or block; walk forward; low punch; shin kick; foot sweep; flying kick; high double kick; head butt; back flip; stomach kick; turning back kick to the face; high face kick; turned foot sweep backward | traced | sixteen move numbers in `joy_moves`; each move's frames in the script at `$1F41`; the wiki's names were not matched to move numbers |
| Holding a direction carries the move through; a quick next direction chains moves without a pause | confirmed | frame flags (`$211D`): bit 3 holds a frame while the move is still requested, bit 4 lets a new request break in (`fighter_anim`, `$1D06`) |
| Each round is timed (`TIME` counts down from 30) | live | `$011C`, BCD, one off every 50 frames (measured) |
| A bonus round after every two rounds: deflect bouncing balls with a shield; all of them deflected gives a 5,000-point survival bonus | live | round 3 was the bonus round (`bonus_round`, `$F2AB`); 100 points a deflection; the 5,000 comes for surviving all 64 balls, whether deflected or dodged |
| Belt colour by score: white 0, yellow 8,000, green 16,000, purple 25,000, brown 35,000, black 50,000 | confirmed | `belt_scores` (`$262F`), shown under TIME by `belt` (`$263E`) |
| Level counter (`LV`) on the score line | live | `LV 01` at the start; `$010C`, one up a round |
| F5/F6 music on and off | confirmed | `$186C` (F5; F6 is the same key) |
| F7/F8 samples (the digitised shouts) on and off | confirmed | `$18A1`, `$FD51`; it also silences the bonus round's sound effects |
| RUN/STOP pauses | live | `pause` (`$10BB`) |
| Keys 1 to 5 set the speed; 3 is normal | live | 3 to 7 frames a game step on PAL, 5 for key 3 (`step_frames`, `$15FE`, measured) |
| Cheat: pressing RUN/STOP twice when knocked down stands you up again | live | `pause` clears every fighter's move and does not restore it |
| Easter egg: E and S together drop the fighters' trousers | live | `start_move` (`$1C40`) starts move `$20` for a fighter with no move to make, on the first two levels only |
| Easter egg: `*` changes the sun's reflection | live | four colour sets (`reflection_colours`, `$178B`) |
| Easter egg: D, O and M change the water and sky colours | live | eight sets (`sky_water_colours`, `$179B`) |
| The untouched high-score table's names spell a hint: "WHY NOT TRY PRESSING THE ASTERISK KEY OR THE S AND E KEYS TOGETHER AND OTHERS" | live | the initials at `$BE80`, copied to the table by `game_init` |
| Background antics: a fish jumps, a spider lets itself down, a bird flies by, the sun glints on the water | live | the antics module (`$71C0`-`$7CFF`); each creature put on screen in `work/shots/antics-sheet.png`; a fourth, a worm, is in "Beyond the documentation" |
| Digitised fighting cries | confirmed | six 4-bit shouts at `$BF00`-`$CFFF`, played by `sample_play` (`$0934`) |
| Music by Rob Hubbard | confirmed | a three-voice tune and its driver at `$E000`-`$ECE1`; the program does not name its composer |
| An attract mode with a demo fight and the TOP 30 SCORES table | live | |
| Gold Edition for three players with a four-player interface | differs | not this release: the code reads two joysticks and has two human flags (`$45`, `$46`) |

## Beyond the documentation

Found in the code, not in the sources above.

- **A fourth creature, a worm**, which arches and stretches across the
  near shore (`worm_step`, `$794E`), besides the bird (sometimes two on
  one route), the spider and the fish with its splash.
- **Reflections in the floor**: each fighter's feet, upside down as a
  one-colour silhouette (`sprite_reflections`, `$F150`;
  `char_fighter_reflection`, `$F1F9`), and the bonus round's balls,
  whose reflections move down as they rise (`refl_offsets`, `$F79A`).
- **The third fighter is drawn in characters**, not sprites, and moves
  two pixels at a time with the floor's fine scroll; the pause's five
  fighters are two copies of it in other colours.
- **The judge talks**: 29 speech-bubble messages, among them "IK+ /
  COPYRIGHT 1987 / ARCHER MACLEAN", "DO YOU FEEL LIKE / A LOST NINJA!!!!
  / TRY IK+ FOR ACTION" and three "SPARE BUBBLE"s the game never shows.
  He stands in the widest gap between the fighters and taps his foot.
- **Another three-key combination** (`$1855`): a key from each of R/I/P,
  T/O/@ and X/N/, together changes how the sun's reflection ripples, in
  four patterns (`drift_set`, `$7665`).
- **The trousers also fall on their own**: a fighter left idle for 128
  steps has a 1 in 32 chance each step (`start_move`).
- **Copy protection inside the game**: three checks that the original
  loader ran, through the stack pointer it leaves and bytes on the stack
  page; one decrypts part of the pose layouts. A failed check jams the
  processor (facts.md, "Protection").
- **The shouts change pitch**: each plays at a random sample rate within
  about 3.9-4.4 kHz on PAL (`sample_start`, `$0EE3`).
- **NTSC**: the game step is one frame longer and the music skips every
  sixth frame, so the speed and the tune match a PAL machine.
- **Bonus-round detail**: in the third, fifth and seventh bonus rounds
  of every eight, the balls of one, two and then four of the six slots
  flash and bounce low and high in turn (`flash_slot`, `$F71D`), each ball has a rolling spot, the
  balls come faster and heavier as the round goes on, and a ball that
  hits the player knocks the shield out of their hands.
- **Two attacks paint half their points**: the number painted on a
  fallen fighter is half the points scored for the punch on joystick up
  and forward and for the low kick from a crouch (`knock_marks`,
  `$3BA3`; live).
- **The computer's skill** is set by a difficulty step that rises at
  each bonus round, and some levels override it (`level_defend`,
  `$2980`; `level_attack`, `$2988`).

## Open questions

- How the original disk passed its track-41 check every time on a real
  drive (`orientation.md`).
- Which letters the second three-key combination was meant to be.
- Which of the sixteen joystick moves is which of the wiki's names
  (two are matched by their pose: the punch, pose `$14`, and the low
  kick, pose `$20`).
- Whether the painted points or the scored points of attacks 3 and 6
  are the ones Archer Maclean meant.
- What each of the six shouts says.
- What the five shapes from code `$39` in the top rows' character set
  are for: no traced code puts them on the screen.
