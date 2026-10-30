# The Fourth Protocol — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The Fourth Protocol, Commodore 64 Playing Instructions (Bantam
  Software), https://mocagh.org/miscgame/4thprotocol-alt3-manual.pdf,
  read 29 October 2026
- Gordon Paterson and John Lambshead, *The Fourth Protocol: Playing the
  Game* (Century Communications, 1986), the official hint book,
  https://www.mocagh.org/miscgame/4thprotocol-hintbook.pdf, read
  29 October 2026. It describes the UK Commodore version and says the
  US software "is identical except for the font"
- Wikipedia, "The Fourth Protocol (video game)",
  https://en.wikipedia.org/wiki/The_Fourth_Protocol_(video_game), read
  29 October 2026
- The game's own screens, in VICE v3.14.0, 29 October 2026. C64-Wiki has
  no page for the game (checked 30 October 2026).

## Features

| Feature | Status | Where |
|---|---|---|
| Title picture with a tune ("the haunting melody", David Dunn), `PRESS <SPACE> TO CONTINUE` | live | title `title_program`, `tune_play` |
| Episode menu: `1) NATO DOCUMENTS`, `2) THE BOMB`, `3) THE SAS ASSAULT`, `SELECT NUMBER:`, typed digit and RETURN | live | title `episode_menu` (`$409F`) |
| Each episode loads in about 90 seconds and needs no further disk access | live | resident `episode_loader`; only saving and loading a game reads the disk again |
| Code words from each episode open the next ("the episodes must be solved in order") | confirmed | episode three asks for TIPTREE, which episode two's estate guard gives (live); episode two's first lift takes ASPEN, and episode one's winning memo gives a five-number password (traced). Any episode can be chosen from the menu, and episodes one and two ask nothing when they start |
| Icons chosen with a pointing hand: SPACE moves it clockwise, cursor up/down anticlockwise, RETURN selects | live | episode one `choose_icon`, episode two `choose_icon`: SPACE to the next icon of the menu's list, the cursor key to the one before |
| Episode one, Cencom main menu of nine icons: filing system, surveillance, utilities, assessment, telephone, calendar, sitreps, reports, memos | live (screen) | nato-documents `cencom_menu`, `cencom_actions` |
| Memos, reports and sitreps: read, file (permanent copy in Cencom), delete; new items stack below; a blank screen icon means nothing waiting | traced | nato-documents `tray_window`, `file_this`, `take_item`, `close_tray` (`pic_tray_empty`) |
| Telephone: rings for incoming calls, the caller hangs up if not answered promptly; telephone-in, telephone-out (dial a number), hold call | traced | nato-documents `ring_tick`, `call_timer` (1,920 frames of ringing), `phone_actions` |
| Cencom filing system: read, save and delete files; up to 14 personal files; Blenheim files released by phoning Blenheim with the code of the week from the one-time pads | traced | nato-documents `file_this` (14), `call_blenheim`, `code_word_choices` |
| Surveillance: assign and recall watchers by surname; 100 watchers at the start, at most 25 on one case; more or fewer as prestige rises or falls | traced | nato-documents `add_watchers` (25), `watcher_allowance` (prestige / 10 + 50) |
| Assessment: prestige rating and percentage of the episode solved (100 % the maximum) | traced | nato-documents `assessment` |
| Calendar: 40 days, a day every two minutes; ADVANCE DATE (Y/N)? moves it on by hand | differs | a day is 14,400 frames, 4 minutes 48 seconds on a PAL machine (live); ADVANCE DATE is there (nato-documents `calendar`) |
| Utilities: freeze game, start new game (abandon), save and load game to a data disk under a three-character name | traced | nato-documents `utilities_actions`, `ask_save_name` |
| Story-lines on a loose schedule, partly random and partly driven by what the player does (hint book) | traced | nato-documents `init_stories` and the four event lists |
| Multiple-choice decisions in memos, with an OTHER SUGGESTION answer typed as a word (and WHO?) | differs | the C64's options are fixed lists (`ask_options`); some answers then take a typed name, such as SUGGEST DEFECTION and STANISTAV (`abbs_advice`). No option reads OTHER SUGGESTION |
| Building 17: place security locks on the doors of a building plan with icons (an EYE cursor, LOCK, floors by G), then rank six computer-security measures (C64 only) | differs | the locks as described (`judge_locks`); the ranking is of four measures, and four orders are accepted (`computer_security`) |
| Voice analysis (hint book figure 8) | traced | nato-documents `voice_analysis` |
| Episode two main menu: assessment, utilities, manipulate, look, communicate, move, wait; two text windows give the location ("GORDON'S", "YOUR OFFICE") | live | the-bomb `main_menu` |
| Look: look around, examine objects in the room, examine objects held, inventory | live | the-bomb `look_actions`; LOOK AROUND used |
| Manipulate: take, discard, use an object | live | the-bomb `manipulate_actions`; USE used |
| Communicate: talk to someone, use a telephone | live | the-bomb `communicate_actions`; the telephone used |
| Move: compass directions (sets the needle for north, east, south, west), enter and leave a building, call a taxi, walk upstairs and downstairs | live | the-bomb `move_actions`; the taxi used |
| Wait / pass time (`TIME PASSES`) | traced | the-bomb `pass_time` |
| Submenu options not available are shown in red | differs | brown (colour 9) where an available one is black: the-bomb `draw_icons_coloured` with `$F9` and `$F0` (live, the move window) |
| Getting around London by tube (Circle, Central and Northern lines, a £1 ticket), taxis, trains to Bristol and Dover, buses and cars; money | differs | the tube's lines are the Circle, Victoria and Piccadilly (`tube_lines`); the rest as described (`train`, `bus`, `taxi`, `car_pickups`) |
| Lifts that ask for a password typed in (`USE THE LIFT? (Y/N)`, `ENTER CODE:`, `*** INCORRECT CODE ***`) | traced | the-bomb `lift`: ASPEN at Gordon's, 42431282 or EPC at Sentinel House |
| Spy efficiency rating, 100 % the maximum | differs | the-bomb `add_efficiency` has no cap |
| Save and load a game to a formatted data disk, three-character name; messages `SAVING GAME`, `LOADING GAME`, `FILE NOT FOUND`, `DRIVE NOT CONNECTED`, `DISK ERROR`, `INSERT DATA DISK` | traced | resident `save_file`, `load_file`; the-bomb `save_or_load`, `disk_message` |
| Episode three: a room with the bomb (a filing cabinet), a door, a window and an alarm above the cabinet; KGB agents pass the window and come in through the door | live | sas-assault `room_events` |
| A submachine gun aimed with the joystick in port 2 or the cursor keys, fired with fire or CTRL; cross-hairs while it moves; one magazine | differs | the shoot-out is in the file and never called (`shootout`); SHOOT answers YOU HAVEN'T A GUN OLD BOY! |
| Commands typed as VERB, VERB NOUN or VERB ADJECTIVE NOUN, from a vocabulary of 51 words (manual, page 16) | differs | 18 verbs and 28 nouns, 46 words; colours are nouns (sas-assault `parse`) |
| Touching the cabinet sets off the alarm unless it has been shot | differs | the alarm sounds when the drawer opens, for the number with no keypad chosen, and for ATTACK CABLE (sas-assault `raise_alarm`) |
| Agents wear flak jackets and fall only to a shot in the head; HIDE makes them leave unless the bomb is open; LISTEN hears footsteps; too many behind the player overpower him | differs | HIDE and LISTEN as described (sas-assault `hide`, `guard_looks`, `listen`); the more guards in the room, the likelier death (`attack_chances`); no shooting (`shootout` is never called) |
| The defusing: PRESS SECOND PAD, a number (12051987), buttons red, yellow, green, wires red, yellow, green | live | sas-assault `choose_keypad`, `type_number`, `push_red`, `cut_red` |
| Winning and losing epilogues (hint book, "Winners and losers") | live | episode three's three epilogues (live); episode one's two memos (traced); episode two has no winning ending |

## Beyond the documentation

Found in the code, not in the manual.

- A disk file named `KIE` that nothing loads (`orientation.md`).
- `XXXPART3` in the episode loader's table of names, with no file of that
  name on the disk.
- Episode two's taxi takes BOMB as a destination and drives to the
  Faslane estate (the-bomb `taxi_destinations`; live).
- Episode two's telephone takes 28 words where it has five numbers;
  SVETOFOR halts the machine (the-bomb `telephone`; live).
- Episode two's notice board is A PIECE OF NOTICE BOARD, its article read
  from past the end of its table (the-bomb `object_articles`; live).
- Episode two's money is one byte, and the Treasury's £200 wraps it
  (the-bomb `use_authorization`; live).
- Episode two makes no sound and runs no interrupt (register census;
  live).
- Episode three's epilogue after an explosion depends on whether an odd
  or an even number of lines has been typed (sas-assault
  `bomb_explodes`; live).
- Episode three's shoot-out, with a cross-hair, 192 rounds and three
  targets, is in the file and never called (sas-assault `shootout`).
- Episode three's files carry an earlier build of episode two and a tape
  writer for the whole program (sas-assault facts, "Leftovers").

## Open questions

- Which word episode one's five-number password spells: the one-time
  pads that turn numbers into letters are not in the program.
- What `XXXCOPY` checks: it was run and returned, and not read further.
- What the 43 sectors no file holds contain beyond the boot's second
  stage and the episode loader.
