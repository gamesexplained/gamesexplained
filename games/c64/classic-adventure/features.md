# Classic Adventure — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The game's own screens: the welcome text, `INSTRUCTIONS`, `INFO` and
  `HELP`, read in the emulator on 8 October 2026 (`reference/`).
- The Commodore 64 inlay, two scanned pages as a PDF from REG-Vault,
  https://api.regvault.org/api/v1/game/c64/43a65b08db41c678d5635e3efa913159/manual,
  linked from https://regvault.org/game/c64/43a65b08db41c678d5635e3efa913159
  ("Classic Adventure (1984, Commodore 64) — REG-Vault"), read 8 October
  2026. It credits "© 1983 John Jones-Steele" and "Artwork by Steiner
  Lund", and says the tape uses the Pavloda loader.
- Wikipedia, "Classic Adventure", https://en.wikipedia.org/wiki/Classic_Adventure,
  read 8 October 2026: Abersoft, first released as *Adventure 1* on the
  ZX Spectrum in 1982, a remake of *Colossal Cave Adventure* (both of
  the last claims marked "citation needed" there).
- The Internet Archive item `Classic_Adventure_1984_Melbourne_House`,
  read 8 October 2026, for the directory of the circulated disk transfer.
- C64-Wiki has no page for the game (`https://www.c64-wiki.com/wiki/Classic_Adventure`
  answered 404 on 8 October 2026).

## Features

| Feature | Status | Where |
|---|---|---|
| Commands of one or two words, typed and ended with RETURN ("Direct me with commands of 1 or 2 words") | live | line input `$1194`, parser `$11F7`-`$12B4` |
| Only the first four letters of a word count ("TAKE SILV" for "TAKE SILVER") | live | the vocabulary at `$47DF` holds four letters a word; `TAKE JEWELLERY` and `TAKE JEWE` both work |
| Directions abbreviate to one letter, and the diagonals to two (`N`, `NE`) | live | vocabulary entries `N`, `E`, `NE`, `SW`, `U`, `D` |
| `INSTRUCTIONS`, `INFO` and `HELP` print the help texts | live | rules at `$564D`, `$5653` and `$5659` (messages 1, 142 and 51) |
| `INVENT` lists what you carry | live | action 0 at `$17F0` |
| `SCORE` gives the score and the turns | live | action 15 at `$19E4` |
| `QUIT` asks "Are you sure?", then gives the score and offers another game | live | action 11 at `$1980` |
| `SAVE` writes the game to a blank tape; `RESTORE` reads it back | confirmed | actions 18 and 19 at `$1A5D` and `$1AA4` call the KERNAL's `SAVE` and `LOAD` on device 1; the tape prompts appear live and RUN/STOP returns to the game, but no tape was attached, so the data written was not checked |
| Treasures count only when left in the building | live | `$19FB`-`$1A25` adds 10 for each treasure whose location is room 3; three treasures dropped there scored 30 |
| "You lose points for getting killed" (`INFO`) | differs | the score is counted afresh from the treasures in the building at every `SCORE`; the death routine at `$1B35` never touches it. Died once, then scored 30 for three treasures |
| "If you think you have found all the treasure, just keep exploring" | live | at a `SCORE` with exactly 15 objects in the building, flag 12 is set (`$1A27`); entering the hall of mists then closes the cave (status rules 11 and 12) |
| Magic words (the debris room's note "Magic word XYZY") | live | travel entries for `XYZY` in rooms 3 and 11 |
| The rod scares the bird (`HELP`) | live | rule at `$56C5`: "as you approach it becomes disturbed and you cannot catch it" |
| Cave passages twist: going north and then south need not bring you back (inlay, `HELP`) | confirmed | each room has its own one-way exit list at `$4C49`/`$4D63`; the forest rooms 5 and 6 and the two mazes are built that way |
| A lamp to light, darkness, and pits in the dark | live | `ON` lights the lamp; with it off, "It is now pitch dark" four times and the fifth move kills |
| Slay dragons, bribe trolls (inlay blurb) | traced | `KILL DRAGON` rules at `$59D1`-`$59DD`, `THROW <treasure>` at the troll at `$5A3D`-`$5AEB`; the run never reached the chasm |
| "Shady and often unfriendly characters lurking in the dark" | live | the dwarf in the east/west canyon throws an axe (status rule 22) |
| The tape loads in under three minutes with the Pavloda loader | open | this image is a disk transfer: the one file is loaded by the KERNAL and carries only a relocating wrapper (`orientation.md`). The tape and its loader were not seen |

## Beyond the documentation

- **The score cannot reach the 210 it promises.** The score message
  always says "out of a possible 210". The score is 10 for each object
  in the building whose flags byte has bit 4 set, and only 15 objects
  that can be carried have it (objects 57, 59-66, 69-72, 75 and 77). With
  all 15 poked into the building the score read 150 (live). Objects 67
  (the vase resting on the pillow) and 76 (the bear's chain on the wall)
  have the bit too; 67 replaces the vase when it is dropped on the pillow,
  so it does not add to the 15.
- **The cave closes on a count of objects, not of treasures.** Flag 12
  is set when a `SCORE` finds exactly 15 objects of any kind in the
  building (`$1A27`). With 18 there it stayed clear; with 15 it was set,
  and the next visit to the hall of mists moved the player to the
  repository (live).
- **The winning blast cannot be reached.** In the repository, `BLAST`
  at the north-east end floods the room with lava (message 134); at the
  south-west end it kills you if the rod with the rusty mark (object 10)
  is there or carried (message 135), and wins only if it is not (message
  133). The cave's closing puts that rod at the south-west end. `DROP
  ROD`, when you are not holding the other rod, runs `get` on object 10
  instead of `drop` (rule at `$5833`), so the rod can be picked up but
  never put down: "You have it already" (live). The winning text appeared
  only after poking the player into room 116 in a new game.
- **Seven objects at most.** `get` refuses an eighth with "You can't
  carry any more" (`$185F`, live). The count is kept in flag 2.
- **The dwarf comes back for his axe.** Each time you enter the east/west
  canyon while the axe is neither there nor carried, the axe is moved
  there and the dwarf throws it again (live: it was dropped at the west
  side of the fissure and reappeared in the canyon).
- **Death.** The lamp goes back to the road, everything else you carried
  is left in the room you came from, not the one you died in, and you
  wake in the building with three turns of darkness to spare instead of
  four. Five lives in all (`$1B35`-`$1BA7`; one death live).
- **`ON` with no lamp** prints "You have no source of light." and then
  "Okay" (live).
- **The second `N` from the forest** and other repeated exits are chance
  exits: the jiffy clock's low byte against a threshold out of 128
  (condition 2, `$16BE`). The snake can be slipped past to the south-west
  with a chance of 35 in 128.
- **`Another game (y or n)?` answered N** resets the machine through the
  KERNAL's reset vector (`$195A`, live).
- **Words that never match.** The rule for `DOWNSTREAM` in room 38 and
  the travel entries that use word 5 can never run, because no entry in
  the vocabulary carries word 5 (traced: the 226 entries at `$47DF` were
  listed). `THROW AXE` at a dwarf needs flag 11, which no rule sets.
- **`GET CHAIN`** while the bear is still chained prints "Your feet are
  now wet." (rule at `$57FD` prints message 70; message 169, "The bear is still
  chained to the wall.", is the one `GET BEAR` uses).

## Open questions

- Was "a possible 210" carried over from a version with 21 treasures?
  Only this build was examined.
- The Pavloda tape and its loader: not in this image.
