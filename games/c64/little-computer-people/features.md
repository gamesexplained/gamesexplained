# Little Computer People — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, https://www.c64-wiki.com/wiki/Little_Computer_People, read
  2026-09-22. Infobox, control keys, typed requests, vocabulary list,
  music, the disk format of the original and its Y2K note.
- Wikipedia, https://en.wikipedia.org/wiki/Little_Computer_People, read
  2026-09-22. Credits, release date, disk and cassette differences.
- The manual, "A Computer Owner's Guide to the Care and Communication with
  Little Computer People" (Apple II and Commodore 64), Internet Archive,
  https://archive.org/details/LittleComputerPeopleManual1986AppleIIC64,
  OCR text read 2026-09-22. The Lemon64 copy
  (https://www.lemon64.com/doc/little-computer-people/354) refused an
  automated read (HTTP 403).
- The contributor, watching the emulator during the run: the TV's
  flickering screen, the record player's music and its spinning record,
  and the squawks whenever he talks.
- Own screenshots in `reference/`. No external screenshots were
  downloaded.

## Features

| Feature | Status | Where |
|---|---|---|
| Start-up asks for the time of day, "Enter time of day (HH:MM am/pm)", on the top line | confirmed | `$04F8`, text at `$0905`; `reference/time-prompt.png`. The time only sets the wall clock; the house keeps its own hour (facts.md, "Timing") |
| The manual's guestbook: name, date (MM/DD/YY) and time before the visit | differs | only the time is asked (`$04F8`); there is no name or date prompt in the code, and the name "Billy Bob Binkle" at `$03FC` is read by nothing |
| Move-in: the house starts empty, the person is shy, takes several minutes to come in, inspects for 5 to 10 minutes, fetches a suitcase and returns with the dog; keyboard commands are disabled meanwhile | differs | the first activity is 122, coming in through the front door, forced by `$037B` = `$7A`, which also locks the keyboard until the chooser takes it. The dog is in the house from the first frame; he is at the door two seconds after the time is typed (`reference/arrival.png`) |
| The house: three floors, furnished rooms, the person walks between them by the stairs | confirmed | walking `$19A8`, stairs `$1B32`, 55 places `$1D36`; `reference/play.png` |
| A pet dog that wanders the house by itself | confirmed | `$173C`, 21 places at `$180C`; its bowl `$2A62` |
| Daily routine: cooking, television, newspaper in the easy chair, piano, records, exercise, the computer | confirmed | the chooser `$E13F`: timed activities and random lists by time of day and weekday. Cooking 48–49, TV 5 and 16, the easy chair with a white object 24 (the newspaper is likely, not proven), piano 79, records 9 and 120, exercise 27, the computer 20. Live: nine unprompted minutes of TV, piano, exercise and more |
| CTRL F: food delivered to the front door | confirmed | activity 44 (`$3028`) puts the food in the kitchen cupboard; ignored while the cupboard is full (`$30B4` = `$0F`), which it is at start. Live: nothing with it full, activity 44 at once with `$30B4` = `$07` |
| CTRL W: fills the water tank, about a glass a press | confirmed | `$2B54`: one line a press, up to 11 of the tank's 12. Live: 5 to 11 and no further |
| CTRL A: rings the alarm clock | confirmed | `$2B4E`, the bell drawn at `$7079`; ignored while a record plays. Live: the bell's two cells (row 13, columns 7–8) animate and the SID rings; his activity does not change |
| CTRL D: dog food at the front door; the person feeds the dog | confirmed | activity 33 fetches it, 34 feeds the dog, the bowl is filled to 6 (`$2A63`). Live: 33 started at once |
| CTRL C: the telephone rings; a call cheers him unless constant | differs | the ringing and the answer are there: activity 25, he sits in the easy chair and talks until a timer runs out, and the phone also rings by itself every 32–63 ticks (`$09EA`). Live: 25 started at once (`reference/phone-call.png`). The cheering is not: the only instructions that store to the mood `$035F` are the two-day cycle (`$0A76`–`$0A90`), illness (`$0B47`) and petting (`$2C39`) |
| CTRL P: petting; he must be in the easy chair, and the key calls him there | confirmed | at place `$2B` the arm and hand pat him and the mood becomes happy (`$2C39`); elsewhere activity 6 walks him there. Live: 6 started at once |
| CTRL R: a record left at the front door for the stereo | confirmed | activity 50 carries it to the stereo; the record count `$042B` starts at 4. Live: 50 started at once |
| CTRL B: a book left at the front door (Commodore only) | confirmed | activity 51 carries it to the study. Live: 51 started at once |
| Moods shown on his face: happy, content, sad | live | three sets of 15 head images (`$0D65`), picked by `$035F`; `reference/moods.png` |
| Sick: green, stays in bed | live | illness `$0365` turns sprite multicolour 1 green; at level 3 the chooser sends him to bed (activity 30). `reference/sick-in-bed.png` |
| Illness from too little food or water | confirmed | a need rising from level 2 starts it (`$0B91`); it ends when both needs are below 3 (`$392F`). Live: with food and water to hand he drank, ate and recovered; without, he got worse each house hour and went to bed |
| Too much sleep lowers his mood | open | the only instructions that store to the mood are the two-day cycle (`$0A76`–`$0A90`), illness (`$0B47`) and petting (`$2C39`); none of them looks at sleep |
| Typed sentences: he answers questions, suggestions and requests, and responds to good manners ("please", "thank you") | confirmed | the parser (`$C040`): PLEASE is worth 4 on the score, and a request scoring 8 or more is done at once. "thank you" does nothing: THANK is not in the word lists. Live: several requests, and the manners test in facts.md |
| He may refuse a request, by mood and personality | confirmed | the score adds 3, 1 or 0 for the mood and 0–3 at random; below 8 a request waits for the chooser. Live: sad and without "please", "light a fire" was not done in 25 s |
| Letters: he types a letter about his feelings and needs | confirmed | activity 22; the thank-you or the complaint, chosen by the food and water supplies, "Dear Friend" to "Your Friend". Live: both bodies (`reference/letter.png`, `reference/letter-complaint.png`) |
| The vocabulary the wiki lists (140 words, from "add" to "whats") | confirmed | two word lists at `$C234`–`$C969`, 156 distinct words, each with five bytes of concept bits (facts.md). Every word the wiki lists is there except "quit", and "ored", which reads like a cut-off "stored". WHAT'S can never match, because the apostrophe ends a word |
| He builds a fire in the fireplace on request | confirmed | rules for "light/start/make/burn/ignite + fire", "use fire" and "you look cold" start activity 7 (`$AEEA`): he fetches a log from outside and feeds the fire. Live: logs in the fireplace at 50 s, burning at 80 s (`reference/fire-building.png`, `reference/fire-lit.png`) |
| He plays the piano on request | confirmed | "play the piano", "play a song" (any song word) and "tickle the ivories" start activity 21: the stereo off, a piece picked (78), played (79). Live: the piano played |
| He answers a greeting | confirmed | HELLO, HEY, ATTENTION, EXCUSE and PARDON start activity 52: he turns towards the player and holds it. Live |
| He dances on request | confirmed | DANCE, MOON or SHOW puts on a record (9) and then dances (53, 3 to 15 moves). Live: the activities; the dance itself was not looked at |
| "play another song" | confirmed | PLAY with any song word is the piano rule (activity 21) |
| "logon please" and the Name Changer | differs | LOGON, PROGRAM, UTILITIES, MATH, HOMEWORK and the arithmetic words have concept bits but no rule uses them; the sentence does nothing |
| Games: he knocks on the glass to ask for a game; the player picks one by number | open | every byte of the image is described (100 % coverage) and none of it is a game, a card, a game menu or a knock; typed game words (GAME, CARDS, POKER, WAR, CARD, ANAGRAMS, HANGMAN) make activity 126, which is the chooser, and nothing starts; no knock in nine unprompted minutes. The game names are only in the word list |
| Anagrams: unscramble his word; 8 or 9 guesses; F3 moves one letter to its place; F7 quits | open | as for the games; and the keyboard table gives F1, F3, F5 and F7 no character (`$5C` in `key_ascii`), so the game cannot see them |
| Card War | open | as for the games |
| Five-card draw poker | open | as for the games |
| Hangman | open | as for the games |
| Piano: plays pieces from classical to jazz | confirmed | four pieces (`$8020`–`$8D98`): Mozart's K. 545, Für Elise, Bach's fugue in C minor BWV 847, and one not identified. Live: each forced and its opening notes read off the SID |
| Records on the stereo; he dances or does aerobics | confirmed | four tunes made of two pieces (`$3A03`), the turntable animating in the attic while one plays; the dance (53) runs to them; exercise is a separate activity (27). Live: the turntable and the music, which the contributor also saw and heard |
| Music: 17 pieces, seasonal ones such as Jingle Bells at Christmas, some shared with Master of the Lamps (Russell Lieblich) | open | this build has four piano pieces and four record tunes. The effects driver's 27-entry sound table (`$D764`) was not checked entry by entry for further music; there is no date, so nothing seasonal can be chosen |
| Every copy is a different person: one of 256 names, looks and personality from the disk's serial number | differs | one fixed person: the settings in `$0340`–`$03FF`, among them the personality byte `$0369` (`$2D`, which nothing stores to), come with the image; only the clothes colours are picked at random at start (`$B9BE`); the name in the image is read by nothing |
| The house-on-a-disk memory: his data saved to the disk, a session count, time passing between visits | differs | nothing touches the disk: the KERNAL stays banked out, CIA2's port is written only to set the VIC bank, and six of the ten driver entries at `$8000` are uncalled `RTS` stubs |
| Dates: the original stores century and weekday names on the disk and does not handle 2000 | differs | no date is asked for or kept; there is only a weekday counter (`$0377`) |
| A day in the house runs to a real-time schedule (Wikipedia: six hours) | differs | a house day is 12 × 24 ticks of 2304 frames: 3.68 hours on PAL (a tick measured live), 3.07 hours at NTSC's 60 frames |

## Beyond the documentation

Found in the code, not in the manual.

- **The talking.** Whenever his mouth opens wide, a sound request makes a
  squawk: a random syllable of filtered noise, then a phrase of gliding
  notes (slot 18, sound `$15`). Live: 24 requests during one phone call.
  A quarter of one channel's phrases play from uninitialised memory.
- **The TV and the turntable** are drawn straight into the house picture
  while they run: the TV screen's two cells flicker, and the record on the
  turntable turns through four frames.
- **Housekeeping he does by himself:** a bath (activities 84 and 102),
  changing clothes colour in the closet or the bathroom (107–110), cooking
  at the stove (48, 49), tidying up (19), looking inside the cupboards,
  closets and drawers, and using the computer, whose screen shows
  scrolling dots, a bar chart, a wandering dot or a scribble (20).
- **The phone rings by itself** every 32 to 63 ticks.
- **Footsteps** sound only on the tiled floors of the kitchen and the
  bathroom.
- **A sick person walks at half speed.**
- **The dog's bowl** empties a unit at a time while it eats.
- **The screen blanks** after about 3.6 hours without a key press.
- **The music is tuned for NTSC,** so on a PAL machine every piece plays
  about two-thirds of a semitone flat.
- **Record tune 2** is piece A played with every interval turned upside
  down, in three octaves at once. Live: the recorded steps are an exact
  mirror of tune 0's.

## Open questions

- What the chooser requires before it carries out a request that scored
  4 to 7 (facts.md, "Open questions and oddities").
- Whether a sentence that matches no rule, which queues the previous
  request again, can ever make him act on it.
- Which piece the fourth piano piece (`$838D`) is.
- What activity 113 depicts, and whether activity 24's white object is
  the newspaper.
- Which cassette or disk release this crack was made from: it has typed
  requests and letters (the cassette is said to lack them) and neither a
  guestbook, a move-in, card games nor disk memory (the disk has them).
