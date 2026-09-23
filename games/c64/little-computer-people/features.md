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
- Own screenshots in `reference/`. No external screenshots were
  downloaded.

## Features

| Feature | Status | Where |
|---|---|---|
| Start-up asks for the time of day, "Enter time of day (HH:MM am/pm)", on the top line | live | prompt text at `$0905`; `reference/time-prompt.png` |
| The manual's guestbook: name, date (MM/DD/YY) and time before the visit | open | this build asked only the time; no name or date prompt seen |
| Move-in: the house starts empty, the person is shy, takes several minutes to come in, inspects for 5 to 10 minutes, fetches a suitcase and returns with the dog; keyboard commands are disabled meanwhile | open | seen instead: the dog is in the house from the first frame and the person is at the front door within 2 s of the time being entered (`reference/arrival.png`) |
| The house: three floors, furnished rooms, the person walks between them by the stairs | live | `reference/play.png` |
| A pet dog that wanders the house by itself | live | two-sprite figure moving between floors |
| Daily routine: cooking, television, newspaper in the easy chair, piano, records, exercise, the computer | open | seen: sitting in the attic chair, standing at the green instrument in the attic |
| CTRL F: food delivered to the front door | open | the key reaches the game (`$31` = `$06`); nothing seen at the door within 30 s |
| CTRL W: fills the water tank, about a glass a press | open | |
| CTRL A: rings the alarm clock | open | |
| CTRL D: dog food at the front door; the person feeds the dog | open | |
| CTRL C: the telephone rings; a call cheers him unless constant | open | |
| CTRL P: petting; he must be in the easy chair, and the key calls him there | open | |
| CTRL R: a record left at the front door for the stereo | open | |
| CTRL B: a book left at the front door (Commodore only) | open | |
| Moods shown on his face: happy, content, sad, and sick (green, stays in bed) | open | |
| Illness from too little food or water | open | |
| Too much sleep lowers his mood | open | |
| Typed sentences: he answers questions, suggestions and requests, and responds to good manners ("please", "thank you") | live | "please type a letter to me" typed on the top line was carried out (`reference/typed-request.png`) |
| He may refuse a request, by mood and personality | open | |
| Letters: he types a letter about his feelings and needs | live | on request: typed into the top band, "Dear Friend, Thank you for keeping me well stocked with food and water. Thank You, Your Friend" (`reference/letter.png`) |
| The vocabulary the wiki lists (about 150 words, from "add" to "whats") | traced | a word list in ASCII with flag bytes after each word, `$C240` onwards; decoded in `30-text` |
| Requests the wiki and manual name: type a letter, build or light a fire, play the piano, play another song, dance, "logon please" | open | the letter works; the rest untried |
| Games: he knocks on the glass to ask for a game; the player picks one by number | open | |
| Anagrams: unscramble his word; 8 or 9 guesses; F3 moves one letter to its place; F7 quits | open | "ANAGRAMS" in the word list |
| Card War: 26 cards each; F1 shows your card; ties go to war (four face down, then a showdown); ends when one side holds all 52 | open | the quit key reads as "F10" in the OCR text, which a C64 does not have |
| Five-card draw poker: 400 chips each, bets up to 20; F1 ante or draw or see or raise, F3 bet or stay or fold, F5 pass or call, 1 to 5 mark discards | open | |
| Hangman | open | named in the wiki's vocabulary; "HANGMAN" in the word list; the manual as read gives no rules |
| He builds a fire in the fireplace on request | open | |
| Piano: plays pieces from classical to jazz | open | |
| Records on the stereo; he dances or does aerobics | open | |
| Music: 17 pieces, seasonal ones such as Jingle Bells at Christmas, some shared with Master of the Lamps (Russell Lieblich) | open | |
| Every copy is a different person: one of 256 names, looks and personality from the disk's serial number | open | a name, "Billy Bob Binkle", is in RAM at `$03FC` |
| The house-on-a-disk memory: his data saved to the disk, a session count, time passing between visits | open | this image has one file and no data files; the disk was not written in several minutes of play |
| Dates: the original stores century and weekday names on the disk and does not handle 2000 | open | this build asks for no date |
| A day in the house runs to a real-time schedule (Wikipedia: six hours) | open | |

## Beyond the documentation

Found in the code, not in the manual.

- The game scans the keyboard matrix itself, with the KERNAL banked out.
  Its own 64-entry key table at `$0691` is column by column; codes `$23`
  and `$24` in it mark SHIFT and CTRL, and `$21` marks keys it ignores.
  CTRL with a letter gives the control code (`AND #$1F`). The scanner
  (`$05C7`) is called from the main loop rather than once a frame, and
  skips the scan while `$037B` is non-zero.
- The typed line and the letters both use the band at the top of the
  screen, above the roof.
- The sprites are multiplexed by the raster interrupt: the person is four
  sprites, the dog two.

## Open questions

- Which release was this crack made from? Typed requests and letters
  work, which Wikipedia says the cassette version lacks, but there is no
  guestbook and no move-in, which the disk version has.
- Is "Billy Bob Binkle" the person's name, and where does it come from?
- The letter is signed "Your Friend", not with a name. Is the name used
  anywhere on screen?
- What CTRL F does in this build, since nothing reached the door in 30 s.
