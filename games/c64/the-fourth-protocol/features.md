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
| Title picture with a tune ("the haunting melody", David Dunn), `PRESS <SPACE> TO CONTINUE` | live | title part; `XXXTPAGE`, `XXXTITLE`, `XXXMUSIC` |
| Episode menu: `1) NATO DOCUMENTS`, `2) THE BOMB`, `3) THE SAS ASSAULT`, `SELECT NUMBER:`, typed digit and RETURN | live | title part, `$409F` |
| Each episode loads in about 90 seconds and needs no further disk access | live | episode loader `$080E` |
| Code words from each episode open the next ("the episodes must be solved in order") | open | episode three asks `WHAT IS THE CODENAME FOR THIS MISSION?` (live); episode two loaded without asking, so where its code is asked is open |
| Icons chosen with a pointing hand: SPACE moves it clockwise, cursor up/down anticlockwise, RETURN selects | open | episodes one and two |
| Episode one, Cencom main menu of nine icons: filing system, surveillance, utilities, assessment, telephone, calendar, sitreps, reports, memos | live (screen) | nato-documents |
| Memos, reports and sitreps: read, file (permanent copy in Cencom), delete; new items stack below; a blank screen icon means nothing waiting | open | nato-documents |
| Telephone: rings for incoming calls, the caller hangs up if not answered promptly; telephone-in, telephone-out (dial a number), hold call | open | nato-documents |
| Cencom filing system: read, save and delete files; up to 14 personal files; Blenheim files released by phoning Blenheim with the code of the week from the one-time pads | open | nato-documents |
| Surveillance: assign and recall watchers by surname; 100 watchers at the start, at most 25 on one case; more or fewer as prestige rises or falls | open | nato-documents |
| Assessment: prestige rating and percentage of the episode solved (100 % the maximum) | open | nato-documents |
| Calendar: 40 days, a day every two minutes; ADVANCE DATE (Y/N)? moves it on by hand | open | nato-documents |
| Utilities: freeze game, start new game (abandon), save and load game to a data disk under a three-character name | open | nato-documents |
| Story-lines on a loose schedule, partly random and partly driven by what the player does: the Abbs affair, the stolen papers, an unusual meeting place, who will watch the watchers, Building 17, the vanished official, plugging the leaks, the Dr Zhivago caper, the loony assistant secretary, an affair in passing, Buzby to the rescue, package tour, the moment of truth, finale (hint book) | open | nato-documents |
| Multiple-choice decisions in memos, with an OTHER SUGGESTION answer typed as a word (and WHO?) | open | nato-documents |
| Building 17: place security locks on the doors of a building plan with icons (an EYE cursor, LOCK, floors by G), then rank six computer-security measures (C64 only) | open | nato-documents |
| Voice analysis (hint book figure 8) | open | nato-documents |
| Episode two main menu: assessment, utilities, manipulate, look, communicate, move, wait; two text windows give the location ("GORDON'S", "YOUR OFFICE") | live (screen) | the-bomb |
| Look: look around, examine objects in the room, examine objects held, inventory | open | the-bomb |
| Manipulate: take, discard, use an object | open | the-bomb |
| Communicate: talk to someone, use a telephone | open | the-bomb |
| Move: compass directions (sets the needle for north, east, south, west), enter and leave a building, call a taxi, walk upstairs and downstairs | open | the-bomb |
| Wait / pass time (`TIME PASSES`) | open | the-bomb, string at `$41B0` |
| Submenu options not available are shown in red | open | the-bomb |
| Getting around London by tube (Circle, Central and Northern lines, a £1 ticket), taxis, trains to Bristol and Dover, buses and cars; money | open | the-bomb |
| Lifts that ask for a password typed in (`USE THE LIFT? (Y/N)`, `ENTER CODE:`, `*** INCORRECT CODE ***`) | open | the strings are in `XXXF1`, which episode three loads |
| Spy efficiency rating, 100 % the maximum | open | the-bomb |
| Save and load a game to a formatted data disk, three-character name; messages `SAVING GAME`, `LOADING GAME`, `FILE NOT FOUND`, `DRIVE NOT CONNECTED`, `DISK ERROR`, `INSERT DATA DISK` | open | resident disk operating system; strings in episode two at `$4318`-`$43C2` |
| Episode three: a room with the bomb (a filing cabinet), a door, a window and an alarm above the cabinet; KGB agents pass the window and come in through the door | live (codename screen only) | sas-assault |
| A submachine gun aimed with the joystick in port 2 or the cursor keys, fired with fire or CTRL; cross-hairs while it moves; one magazine | open | sas-assault |
| Commands typed as VERB, VERB NOUN or VERB ADJECTIVE NOUN, from a vocabulary of 51 words (manual, page 16) | open | sas-assault |
| Touching the cabinet sets off the alarm unless it has been shot | open | sas-assault |
| Agents wear flak jackets and fall only to a shot in the head; HIDE makes them leave unless the bomb is open; LISTEN hears footsteps; too many behind the player overpower him | open | sas-assault |
| The defusing: PRESS SECOND PAD, a number (12051987), buttons red, yellow, green, wires red, yellow, green | open | sas-assault |
| Winning and losing epilogues (hint book, "Winners and losers") | open | all episodes |

## Beyond the documentation

Found in the code, not in the manual.

- A disk file named `KIE` that nothing loads (orientation.md).
- `XXXPART3` in the episode loader's table of names, with no file of that
  name on the disk.

## Open questions

- Where does episode two ask for episode one's code word, if it does?
- Does episode three use the resident disk operating system at all? It
  restarts the KERNAL and loads its files through it.
