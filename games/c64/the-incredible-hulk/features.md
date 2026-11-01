# The Incredible Hulk — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Commodore's manual for the C64 disk (C6460), https://mocagh.org/ai/hulk-c64-manual.pdf, read 31 October 2026
- "Questprobe featuring The Hulk", Wikipedia, https://en.wikipedia.org/wiki/Questprobe_featuring_The_Hulk, read 31 October 2026 (credits, year, platforms)
- GameBase64's Game of the Week page, https://gb64.com/oldsite/gameofweek/17/gotw_incrediblehulk.htm, read 31 October 2026 (ZZAP!64's review of the Americana tape, and the screenshots in `reference/gb64-*.png`)
- Ira Goldklang's TRS-80 walkthrough, https://www.trs-80.com/sub-adventures-saqp1.htm, read 31 October 2026 (the same adventure's text on the TRS-80)
- C64-Wiki has no page for the game under "Questprobe 1: The Hulk", "The Incredible Hulk" or "Questprobe featuring The Incredible Hulk" (searched 31 October 2026)

## Features

| Feature | Status | Where |
|---|---|---|
| Commands of one or two words, a verb and then a noun | live | `command_line` ($6CDB): a third word gets "Use 1 or 2 words only!" |
| A vocabulary of "120-plus" words | confirmed | 42 verbs and 81 nouns in their own right (AUTO, verb 0, names the automatic actions, and ANY is noun 0), 133 more spellings that stand for one of them, and two empty verb entries, in the lists at $8307 and $8082 |
| Only the first four letters of a word count | confirmed | `find_word` ($6975) compares the database's word length, 4 ($8066) |
| One-letter commands: N, S, E, W, U, D move | confirmed | the direction letters at $6D6C |
| One-letter command I: inventory | confirmed | $6D57 turns I into INVE |
| One-letter command L: look | confirmed | $6D44 turns L into LOOK |
| Z turns the pictures off and on | live | $6D1F; `picture_flag` ($1F22) |
| SAVE GAME asks for an area, A to D | live | action 100 runs command 71, `save_game` ($646F); the file is saved as "@0:" (replace), the area's letter, "." and "S", both letters shifted |
| A saved game is restored before a new one starts ("Do you want to restore a previously saved game?") | confirmed | `restore_prompt` ($6F7A): Y asks for the area and loads it; a file whose last byte is not the database's check byte is refused with "BAD SAVE FILE" |
| QUIT ends the game; save first to continue later | live | action 122: "O.K.", the score, then command 63's "Now Hit-Y" |
| HELP may give help, depending on where you are and what you carry | differs | action 219 answers HELP the same way everywhere: "Sorry, I can't do that" and "But ask for a Scott Adams Hint Book at your favorite store!" |
| A light is needed where it is too dark to see | traced | the darkness test ($7560) and the light's countdown ($6C55) are there, but the light is item 9, which starts in room 0 and which no action brings out, and no action refills it (command 69). It is dark only with the eyes closed (action 137, CLOSE EYES) |
| The tester: T or P turns it on, X off | live (T) | $6D0B-$6D42: P prints each action that fits ("PSBL:") and each that runs ("DID:"), T only each that runs |
| The graphics mode pictures every location | live | `draw_room` ($759E); the pictures and the items' pieces are files on the disk, loaded as they are needed by the game's own fast loader ($7777) |
| Treasures are scored when left in one room | confirmed | `act_score` ($5836): the 17 items whose names start with '*' in room 16, the fuzzy area ($807B) |
| Becoming the Hulk, and back to Bruce Banner | live | item 1, "Rage", carried is the Hulk; BITE TONGUE in the first room gives it (actions 108, 11 and 13) |
| Marvel characters: Ant-Man, Doctor Strange, Ultron, Nightmare, the Chief Examiner | confirmed | items 20, 26 and 45, room 19, and the action REMEMBER NIGHTMARE (action 72) |

## Beyond the documentation

Found in the code, not in the manual.

- **A demonstration.** D at the restore question starts a scripted game
  that types its own commands ($7D64, script at $7DAD). live
- **Close-ups.** LOOK at the dome, the bio gem, the egg, the ants, the
  bees, the ring, the cage, the gas outlet or a gem shows a picture of it
  when it is here (`close_up`, $6A51; pictures 90 to 97). live (LOOK RING
  loads picture 95)
- **The carried items as a picture.** The inventory draws room 98's
  picture with the piece of each carried item over it ($75F7). traced
- **V passes a turn.** The automatic actions run twice, once as the
  turn's command and once at its end ($6D72). live
- **A line is at most 14 characters.** The fourteenth ends it ($688D).
  live
- **A double quote is printed as a hyphen** by PUT ($66A5). live
- **A way out to BASIC.** Character $FF ends the game with a BRK and
  BASIC's READY. ($6844); no key on the C64 makes it. live, through the
  keyboard queue
- **The C64's colour test.** The first screen asks you to adjust the TV
  to four bars of colour ($6B8B). live
- **A winning password.** SCORE typed in the fuzzy area with every
  treasure there has the Chief Examiner say "Save this password: ARIA"
  (actions 202 to 208). live. The manual does not mention it; search
  results on 31 October 2026 (Wikipedia's article among them) name the
  password. Typed in another room it still wins, without him: command 80
  never moves the player to the fuzzy area (facts.md).
- **Saved games already on the disk.** Commodore's 1984 disk holds four
  saved games, and areas A and D are the same three blocks, which the
  disk's block map lists as free: the first game saved, in any area, goes
  into them. live
- **The last piece drawn colours the room.** Each item's piece sets the
  picture's four colours again ($7A9A), and pieces are drawn from item 0
  up, so the dome takes the sign's red where its own picture has orange.
  live
- **"ADVENTURE over!"** is in the program but never printed ($5805).
  live (QUIT shows no such line)

## Open questions

- Command 89 shows room 80's picture, and no file `R01080` is on the
  disk; no action uses the command (searched every action's four
  command columns).
- What the three header bytes at $807F-$8081 were for: nothing in the
  program reads them.
