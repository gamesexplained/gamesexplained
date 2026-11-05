# Zak McKracken and the Alien Mindbenders — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The manual for the Commodore 64, Apple II and IBM versions (one book
  with a column per machine), scanned at the Internet Archive as
  "Zak McKracken Manual",
  https://archive.org/details/game_manual_Zak_McKracken_Manual, its OCR
  text read 5 November 2026. The Commodore column of its key table gives
  the keys below; the OCR loses some cells of the table, which are left
  open here.
- C64-Wiki, "Zak McKracken and the Alien Mindbenders",
  https://www.c64-wiki.com/wiki/Zak_McKracken_and_the_Alien_Mindbenders,
  read 5 November 2026: credits, joystick port, keys, hints and gags. Its
  screenshots of the German release are saved in `reference/` as
  `wiki-de-*`; its two maze maps as `wiki-mexico-temple-route.gif` and
  `wiki-mars-maze-map.gif`.
- Wikipedia, "Zak McKracken and the Alien Mindbenders",
  https://en.wikipedia.org/wiki/Zak_McKracken_and_the_Alien_Mindbenders,
  read 5 November 2026: the engine (SCUMM, the second game to use it),
  the release (October 1988, C64 first), the copy protection's codes.
- The Amiga manual (archive.org item
  `Zak_McKracken_and_the_Alien_Mindbenders_1988_Lucasfilm`), read
  5 November 2026, only to compare: its keys are the Amiga's.
- The game itself, in the emulator, 5 November 2026 (`reference/`).

## Features

| Feature | Status | Where |
|---|---|---|
| Boots from its own boot disk with `LOAD"*",8,1`, then asks "Put in side 1 and push joystick button." | live | the boot file `BOOT` loads `AA` at `$0400` and jumps there (`orientation.md`); the prompt's text is at `$309E` |
| Joystick in port 1 moves the cursor; its button clicks | live | the cursor moves on port 1 and not on port 2 (5 November 2026) |
| Game disk sides swapped at a prompt, "Put in side 2 and push joystick button." | live | |
| The opening title sequence: Zak dreams, the title over his bed, credits | live | `reference/` |
| Screen in four bands: two message lines at the top, the animation window, the sentence line, the verbs and the inventory | live | message text at `$CC00`-`$CC4F`, the sentence line at row 18, verbs rows 19-21, inventory rows 22-23 of the screen at `$CC00` |
| Verbs chosen from the list below the sentence line: Push, Pull, Give, Open, Close, Read, Walk to, Pick up, What is, Put on, Take off, Use, Turn on, Turn off | live | |
| New verbs appear as the game goes on; "Switch" appears once Zak has met Annie | open | |
| A sentence is a verb and one or two objects; "with", "on" and "to" are put in by the program | open | |
| A second click on the last word, or one on the sentence line, carries the sentence out | open | |
| "What is" names whatever is under the cursor as it moves | live | the sentence line shows each object's name while the cursor passes over it |
| "Walk to" comes back on the sentence line after every sentence | live | |
| An inventory for each character, four shown at a time, arrows to scroll when there are more | open | |
| Four characters to control: Zak, Annie, Melissa and Leslie, switched with F1, F3, F5 and F7 | open | manual, Commodore column |
| Cut-scenes, during which the verbs and inventory disappear; RETURN bypasses one, and on an airliner takes you straight to your destination | open | manual |
| Save and load with SHIFT and F1, on a blank formatted disk; not during cut-scenes | open | manual |
| Restart with SHIFT and F7 | open | manual |
| Pause with the space bar; the game pauses by itself after five minutes with no input | open | manual |
| A snail replaces the cursor while the disk is read or the game is paused | open | manual |
| Message line speed: `+` faster, `-` slower | open | manual (the OCR shows `+` and `-` in the Commodore column) |
| Sound off and on | open | manual: the Commodore cell of the table did not survive the OCR |
| The room "irises" to black while the next room is loaded from disk | open | manual |
| Rooms wider than the screen scroll left and right | open | C64-Wiki, "graphics are often scrolled to the right or left" |
| The copy protection: a security code from the code sheet when flying out of the USA, asked again on later flights; five wrong codes is a gag | open | Wikipedia; C64-Wiki, Gags |
| Money on Zak's CashCard, spent on flights; the lottery numbers on the alien ship win the lottery in San Francisco | open | C64-Wiki, Cheats |
| Characters can be "killed" only with difficulty | open | manual, "Our Game Design Philosophy" |
| Mazes on Earth and Mars (the Mexican temple, the Sphinx, the Mars chambers) | open | C64-Wiki, "The labyrinths" |
| Music by Matthew Kane; sound effects by Matthew Kane, Chris Grigg and David Warhol | open | manual credits |
| The National Inquisitor newspaper in the box carries hints | open | the manual and the wiki; not in the program |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions
