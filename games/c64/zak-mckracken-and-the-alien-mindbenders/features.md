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
| Boots from its own boot disk with `LOAD"*",8,1`, then asks "Put in side 1 and push joystick button." | live | the boot file `BOOT` loads `AA` at main `$0400` and jumps there (`orientation.md`); the prompt's text is at main `$309E` |
| Joystick in port 1 moves the cursor; its button clicks | live | the cursor moves on port 1 and not on port 2 (5 November 2026); read_joystick main `$1CE0` reads port 1 alone |
| Game disk sides swapped at a prompt, "Put in side 2 and push joystick button." | live | ask_for_side main `$300B` reads the side's number from track 1, sector 0 |
| The opening title sequence: Zak dreams, the title over his bed, credits | live | `reference/`; its tune, sound 95, starts 7,780 frames in |
| Screen in four bands: two message lines at the top, the animation window, the sentence line, the verbs and the inventory | live | message text at main `$CC00`-`$CC4F`, the sentence line at row 18, verbs rows 19-21, inventory rows 22-23 of the screen at main `$CC00`; the raster interrupts switch from multicolour to hires text at line `$C3` (raster_interface main `$1102`) |
| Verbs chosen from the list below the sentence line: Push, Pull, Give, Open, Close, Read, Walk to, Pick up, What is, Put on, Take off, Use, Turn on, Turn off | live | 20 verb slots in the interface's table (main `$F0D9`); the verbs are placed by the scripts (verbOps main `$5F86`) |
| New verbs appear as the game goes on; "Switch" appears once Zak has met Annie | traced | a verb is added or deleted by verbOps (main `$5F86`) from a script; when "Switch" is added is in the scripts, which are not decoded, and was not played to |
| A sentence is a verb and one or two objects; "with", "on" and "to" are put in by the program | traced | each verb keeps a preposition (main `$F165`, set by verbOps) that the sentence line puts between the objects (append_name main `$07FC`, object_preposition main `$0825`); not exercised with a two-object verb |
| A second click on the last word, or one on the sentence line, carries the sentence out | traced | a click is passed to the scripts with where it came from in variable 32 (click_room main `$F2EE`, click_sentence main `$F314`, start_input_script main `$067D`); the scripts decide when a sentence is complete; not exercised |
| "What is" names whatever is under the cursor as it moves | live | the sentence line shows each object's name while the cursor passes over it |
| "Walk to" comes back on the sentence line after every sentence | live | |
| An inventory for each character, four shown at a time, arrows to scroll when there are more | traced | redraw_inventory main `$F380` and draw_arrow main `$F3C6` show four items from the scroll; click_arrow main `$F34E` scrolls by two, a row, so with an odd number of items the last scroll shows three and a blank |
| Four characters to control: Zak, Annie, Melissa and Leslie, switched with F1, F3, F5 and F7 | traced | F1, F3, F5 and F7 reach the scripts as 1 to 4 in variable 39 (key_table main `$1CF8`, handle_key main `$234D`); the switch itself is done by the scripts |
| Cut-scenes, during which the verbs and inventory disappear; RETURN bypasses one, and on an airliner takes you straight to your destination | traced | op_cutscene main `$5AE3` hides the verbs, the inventory and the cursor; the cut-scene key, variable 40 (13, RETURN, in the bedroom), sends the script to its override when it set one (handle_key main `$234D`); which cut-scenes have one, the flights among them, is in the scripts |
| Save and load with SHIFT and F1, on a blank formatted disk; not during cut-scenes | traced | save_game main `$0A53` refuses one of the game's own disks and writes tracks 1 and 5 on, load_game main `$0AD5` reads them back (`parts/main/facts.md`, "Saving"); the key reaches the scripts, which call saveLoadGame main `$5E6F`; not exercised |
| Restart with SHIFT and F7 | traced | op_restart main `$5F5A` goes back into the start-up at main `$0418`; the key is the scripts' |
| Pause with the space bar; the game pauses by itself after five minutes with no input | live | handle_key main `$234D` pauses on space; read_keys main `$1BAF` files a space when the idle count, 18,000 frames, runs out; joystick input resets it and keys do not (`parts/main/facts.md`, "Timing") |
| A snail replaces the cursor while the disk is read or the game is paused | traced | busy_cursor main `$13DA` shows the snail (main `$F080`) around every load (load_resource main `$D4BE`); the cursor during the pause was not looked at |
| Message line speed: `+` faster, `-` slower | live | change_message_speed main `$23D0`: the speed, 6 at the start, goes from 0 to 10; three presses of `+` took it from 6 to 3 |
| Sound off and on | open | the Commodore cell of the manual's table did not survive the OCR; the program's own keys (handle_key main `$234D`) are space, `+`, `-` and the cut-scene key, so any key for the sound would be the scripts', which are not decoded |
| The room "irises" to black while the next room is loaded from disk | traced | close_room main `$D61E` closes the iris (main `$D60C`) and open_room main `$D645` opens it from the middle (main `$D615`) |
| Rooms wider than the screen scroll left and right | traced | draw_room main `$3610` shifts the room a column and decodes the new one; move_camera main `$CAD0` follows the actor when it comes within 10 columns of an edge |
| The copy protection: a security code from the code sheet when flying out of the USA, asked again on later flights; five wrong codes is a gag | open | nothing in the 6502 program asks for a code; it is in the scripts, which are not decoded |
| Money on Zak's CashCard, spent on flights; the lottery numbers on the alien ship win the lottery in San Francisco | open | in the scripts, which are not decoded |
| Characters can be "killed" only with difficulty | open | in the scripts, which are not decoded |
| Mazes on Earth and Mars (the Mexican temple, the Sphinx, the Mars chambers) | open | the mazes are rooms and scripts on the disk; the rooms were not matched to places |
| Music by Matthew Kane; sound effects by Matthew Kane, Chris Grigg and David Warhol | live | four tunes, sounds 95, 102, 103 and 104, played by the player in sound 1, music `$C304` (`parts/music/facts.md`); tune 95 heard in the opening |
| The National Inquisitor newspaper in the box carries hints | open | printed in the box; nothing on the disks was looked for |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| The music keeps playing through a change of room: video_off, which turns the picture and the interrupts off while a room loads, does nothing while the music plays | live | video_off main `$13F3`, the check of main `$43E8`; three changes of room in the 3,000 frames after tune 95 starts, with the frame interrupt in every frame (`parts/main/facts.md`, "Live tests") |
| The cursor has weight: it speeds up as the joystick is held and slides to a stop, more slowly over some kinds of slot | traced | move_cursor main `$F5F5`, set_cursor_feel main `$F5AE` |
| At most four actors can be on the screen at once, one sprite column each; a fifth stops the game | traced | assign_sprites main `$3491`, fatal error 13 |
| The cursor's colour pulses through six greys, a step every seventh frame | traced | main `$1163`-`$1167`, frame_irq main `$117C` |
| An object in someone's inventory sends a walk to the wrong place: walkActorToObject and two other opcodes check the wrong register | traced | `parts/main/facts.md`, "Bugs in the program" |
| A disk that will not take a write is never noticed when saving | traced | disk_write main `$3AD1`, bus_write_sector main `$3BCB` |

## Open questions

- Which scenes the tunes 102, 103 and 104 play over: the scripts that
  start them are known by a search of their bytes (`parts/main/facts.md`, "Sound"),
  and the rooms are not matched to places.
- Whether anything uses the entries for scripts 56, 57 and 154, which
  point at bytes that are no script's header.
