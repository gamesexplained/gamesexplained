# Impossible Mission — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The contributor said yes to looking the game up, but this run's
  network refused every page it tried on 1 October 2026: C64-Wiki
  (`https://www.c64-wiki.com/wiki/Impossible_Mission`, over HTTPS and plain
  HTTP), Wikipedia, the Internet Archive and its Wayback Machine, Lemon64
  (game page and manual, `https://www.lemon64.com/doc/impossible-mission/301`),
  MobyGames, GameFAQs, StrategyWiki, manualzz and the fan site
  `impossible-mission.krissz.hu`. What could be read were the result
  summaries of a web search engine, 1 October 2026, which quote or
  paraphrase those pages and the manual. Everything below marked
  "(search)" comes from those summaries: second-hand, and each row is
  to be checked against the code like any other claim.
- Web search summaries, 4 October 2026, for the Overview's "The release" and "Reception": the environment's network refused the pages themselves (Wikipedia, C64-Wiki, MobyGames, Lemon64, The Digital Antiquarian at filfre.net, the Dennis Caswell interviews at mayhem64.co.uk and AtariAge, gb64.com's Zzap!64 ratings, archive.org). Only facts that several summaries agreed on were used. Zzap!64's score for the game was left out, because the summaries disagreed (95 % against Elite as that issue's only 95 %), and so were the Zzap!64 poll placings (readers first against editors second). To be checked against the pages when they can be read.
- The game's own screens, read in the emulator, and its stored text, decoded in `30-text` (`facts.md`, Text alphabets), 1 October 2026.

## Features

| Feature | Status | Where |
|---|---|---|
| Loading screen: three framed panels, EPYX PRESENTS / IMPOSSIBLE MISSION / LOADING | live | loader, `orientation.md` |
| Title state: the agent stands in a lift; fire on joystick port 2 starts the game | live | `lift_loop` `$39CF` |
| Speech: "Another visitor. Stay a while, stay forever!" at the start (search) | traced | voice lines 2 and 3 are spoken by the start-up after the load and after every restart (`$39AE`); the words were not heard in this run. *Live:* no line is spoken when fire starts a game |
| Speech: "Destroy him, my robots!" and other lines, six in all, two of them a scream as the agent falls and Elvin's laugh (search) | differs | the data holds eight voice lines and the code speaks seven: 1 entering a room after a game hour, 7 a fall, 5 time up, 4 the end picture, 0 the end screen, 2 and 3 the greeting; line 6 is never called (`say_line` `$BED9`). Which words each holds was not checked |
| Speech data is digitised samples by Electronic Speech Systems, played without extra hardware (search) | confirmed | file `words` at `$E000`; the driver at `$0880` plays 4-bit levels through the SID volume register from CIA 2 timer NMIs. The company's name is not in the image |
| Six hours of game time to finish; the clock runs on the pocket computer (search); the pocket computer shows a clock, `12:14:06` at the first start of this run | live | `game_clock` `$83A2`: from 12:00:00 to six o'clock, 60 ticks a second (7 h 12 min of real time on PAL). The clock also runs in the title state |
| Each death costs ten minutes (search) | live | `agent_death` `$95E4`: 12:24:47 became 12:34:47 |
| When the six hours run out, Elvin laughs and the game ends (search) | traced | `wait_tick_or_end` `$83F4`: shaking screen, voice line 5, the end screen with MISSION TERMINATED. The laugh's words were not heard |
| The agent walks, and somersaults to cross gaps (search) | confirmed | `agent_animate` `$8817`, `agent_move` `$8859`; fire starts the somersault (frames `$10`-`$1B`) |
| The stronghold: rooms joined by lifts and tunnels; 31 or 32 rooms, sources differ (search) | confirmed | 32 room records (`$0E70`), two of them the code rooms; placed on a 9 × 6 grid of shafts and corridors (`make_map` `$B2BD`) |
| Rooms, lifts, the placement of puzzle pieces and the robots' abilities are chosen at random for each game (search) | confirmed | `new_game_setup` `$7236` (facts.md, "A new stronghold every game"); the room layouts themselves are fixed |
| Furniture can be searched; a search yields a puzzle piece, a snooze password, a lift-init password, or nothing (search) | confirmed | `search_object` `$97FB`, `search_result` `$98FB`; 36 pieces, 9 snoozes and 9 lift inits hidden among 128 pieces of furniture (`hide_items` `$B26D`) |
| Lifting platforms (striped) in rooms, moved up and down by the agent (search) | confirmed | `lift_platforms` `$AC88` |
| 36 puzzle pieces, nine sets of four; each set makes one letter of a nine-letter password (search) | confirmed | `make_pieces` `$B180`, `check_solution` `$80C3` |
| Pieces overlap, so three can be assembled before the player finds they must start again; pieces may need flipping horizontally or vertically (search) | differs | the four pieces of one puzzle divide its picture exactly: the first mask and its complement, each split by a second mask (`make_pieces` `$B180`, `build_piece` `$9C47`; the port on the page matches the game's routine on all 36 pieces). Only the frame drawn on every piece is shared, and the overlap test (`$8037`) allows that and nothing else. Flips: confirmed, random per piece |
| A piece's colour depends on the room it was found in; four pieces must share a colour to fit, and colour keys change a piece's colour (search) | confirmed | the room's background colour becomes the piece's (`$98FB`); COLORS MUST MATCH (`pc_select_slot` `$3B4D`); colour keys (`recolour_piece` `$7A29`) |
| Pocket computer: map of the rooms and tunnels entered; memory window with two pieces; arrow keys; flip keys; colour keys; password area; phone key "dials out for help" (search) | live | `pocket_computer` `$3A80`; screenshots `reference/pocket-computer.png`, `phone-menu.png`, `pocket-computer-map.png` |
| Pocket computer usable only in a lift or a corridor (search) | confirmed | only `lift_loop` opens it on fire; in a room fire starts a somersault |
| Pocket computer readout `SNOOZES:` and `LIFT INITS:` counters and `PSW:` | live | status text at `$3431` |
| Security terminals: stand in front and push up to use a snooze (robots in the room stop for a while) or a lift init (platforms return to their start) (search) | live | `security_terminal` `$9D16`, `terminal_select` `$A0DE`; screenshot `reference/security-terminal.png`; the snooze stopped the robots for 764 ticks |
| Robots: electrified bodies, some fire a short-range ray; each is a mix of can/can't shoot, can/can't turn, and detects the agent at some distance or not; some patrol, some follow, some react only when close, some stay put (search) | confirmed | the behaviours are scripts (`robots_run` `$8ECC`, `tbl_robot_scripts` `$2112`) chosen at random per game from 32 starts; touching a robot or its zap kills (`agent_hit_check` `$9504`) |
| A black floating ball in some rooms (six, by one source) kills on touch and follows the agent (search) | confirmed | six room records have a ball; `ball_run` `$92CB` homes in on the agent's centre in some scripts |
| Two code rooms: a terminal with a large chequered screen plays a tone sequence; pointing at the squares in ascending pitch earns a password (search) | traced | rooms `$11` and `$1B`, `code_room_puzzle` `$A771`; not played live in this run |
| The end: reach Elvin's control room with the full password; an ending with more speech, in a female voice (search) | live | `elvin_terminal` `$AA40`: Elvin's face in close-up, talking (voice line 4); forced live, `reference/end-elvin.png`. The voice was not heard |
| Score: points for puzzle pieces found and assembled, and for reaching the control room with time left (search) | live | `compute_score` `$BA08`: 100 a piece, 100 a password, 500 a puzzle, 1 a second left and 1,000 for the mission; 21,113 in the forced win |
| Security terminal menu (game text): SECURITY TERMINAL, SELECT FUNCTION, RESET LIFTING PLATFORMS IN THIS ROOM., TEMPORARILY DISABLE ROBOTS IN THIS ROOM., LOG OFF.; PASSWORD REQUIRED / PASSWORD ACCEPTED | live | text `$A01E`, `$A229`; the number after SECURITY TERMINAL is the room's |
| Pocket computer messages (game text): PUSH BUTTON, COLORS MUST MATCH, IMAGES CAN'T OVERLAP, NO IMAGE SELECTED, END OF MEMORY, CAN'T UNDO, TIME IS SUSPENDED, WE JUST DID THIS ONE, NOTHING IN MEMORY, and a confirmation that the orientation has been put right (its exact wording is in the listing at `$7D22`) | confirmed | `show_message` `$81C5`; each message traced to the routine that prints it |
| The phone (game text): HAVE WE ENOUGH PIECES TO SOLVE THE UPPER LEFT PUZZLE, A SOLUTION EXISTS / NEED MORE PIECES, CORRECT ORIENTATIONS OF LEFTMOST PIECES, HANG UP | live | the menu was shown live; the answers are traced (`phone_answer_enough` `$7FD7`, `phone_answer_orient` `$7F8D`); a call costs two minutes |
| End of game tally (game text): PUZZLE PIECES FOUND, PASSWORDS FOUND, PUZZLES SOLVED, SECONDS REMAINING, MISSION COMPLETE or MISSION TERMINATED, TOTAL SCORE, THIS SURPASSES THE PREVIOUS HIGH SCORE OF, HALL OF FAME | live | `end_of_game` `$B786`; `reference/end-tally.png` |
| High-score name entry (game text): ENTER YOUR I.D. CODE ON THE KEYBOARD; HIT RESTORE OR RUN/STOP FOR NEW GAME | live | `hall_of_fame` `$BC04` |
| A list of nine-letter words in the code (SWORDFISH, ASPARAGUS, ARTICHOKE, CROCODILE, ALLIGATOR, ALBATROSS, BUTTERFLY, CORMORANT): candidates for the password | live | `choose_password` `$B0CD` picks one per game; SWORDFISH in this run |
| Cheat POKEs listed by one cheat site: "Cheat mode: POKE 26831,169" and "No opponents: POKE 27028,0, POKE 31005,12, POKE 21006,221" (search). Those addresses are for some unknown version and may not match this image | differs | in this image 26831 (`$68CF`) and 27028 (`$6994`) are inside the agent's sprites, 31005 (`$791D`) is in `flip_piece_v`, 21006 (`$520E`) in the room character set: none of them is a sensible cheat here, so the pokes are for another version or another loader |

## Beyond the documentation

Found in the code, not in the manual.

- The program on the disk is deliberately broken in three bytes, and the
  loader's drive check is what mends them (`orientation.md`).
- Two more protection checks in the running game: the delay routine
  executes a CIA register as an `rts`, and the interrupt jams the
  processor unless `$D024` still holds the loader's value (facts.md,
  "Copy protection"). Both tested live.
- The start-up code clears its own first 17 bytes (`orientation.md`).
- The game is timed for NTSC; on PAL only the end picture's lip-sync is
  adjusted, so the game clock runs at five sixths of real speed.
- The phone dials 767-8900 or 555-4213 in touch tones.
- The end picture is Professor Elvin Atombender's face, his mouth
  animated over the speech.
- The agent's sprite frames are stored once and mirrored in place.
- A hall of fame of 15 names survives until the machine is switched off.

## Open questions

- The words of the eight voice lines: the Sound and speech tab plays them, and nobody has transcribed them.
- The code rooms' puzzle was not played live.
