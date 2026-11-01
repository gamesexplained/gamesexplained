# The Detective — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The game itself: its title screen and play screens, in the emulator,
  1 November 2026 (`reference/`), and its own bytes, such as the icon
  pictures at `$FA00`, drawn on the How it works page.
- The original instructions were not found. On 1 November 2026 GB64
  (https://gb64.com/game.php?id=2140) listed "Documentation" for the game
  but hosted none; Lemon64, MobyGames and BoardGameGeek refused the fetch
  (HTTP 403, a BoardGameGeek entry is said to quote the inlay); the
  Internet Archive held disk images and screenshots only; the Wayback
  Machine was offline. The box pictures in the Nintendo DS remake's
  repository are the remake's, not the original's.
- Not used as a source: `DETECTIVE DOX`, the second program on the
  contributor's tape, the crackers' retyping of the instructions
  ("Danish Gold Ltd. presents instructions as read from original",
  1987). It is full of typing mistakes and could not be checked against
  the original, so nothing below rests on it alone; where it says
  something the game shows otherwise, the game is what is written here.
- Wikipedia, "The Detective (video game)",
  https://en.wikipedia.org/wiki/The_Detective_(video_game), read
  1 November 2026.
- Commodore Format Archive, interview with Sam Manthorpe,
  https://commodoreformatarchive.com/sam-manthorpe-i-made-the-detective-game-for-the-commodore-64/,
  read 1 November 2026.
- Zzap!64 issue 27 review, reproduced at
  https://everygamegoing.com/larticle/The-Detective-000/28385, read
  1 November 2026.
- The C64-Wiki has no page under "The Detective" (HTTP 404 on
  1 November 2026). Lemon64 and MobyGames refused the fetch (HTTP 403),
  so no outside screenshots were saved.

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in port 2: fire on the title screen starts the game | live | `orientation.md`; `reference/play-hall.png` |
| Inspector Snide walks the mansion with the stick, the rooms drawn at an angle (Zzap: "3D ... Ultimate-style") | live | four directions tested from `work/play-hall.vsf`; `work/sheet.png` |
| Controls with momentum: the author calls them "Newtonian physics" | traced | the menu pointer, not Snide's walking: `$315F` changes the pointer's speed with the stick and lets it coast and bounce (Zzap's reviewer: "the inertial cursor"); Snide steps at a fixed rate (`$34FE`) |
| Fire opens the investigation menu: icons, chosen with an arrow (a pointing hand) moved by the stick, fire again to activate | live | `reference/investigation-menu.png`; `$34E9`, `$86EE`, `$87D9`; about one press in three is lost, measured (`facts.md`, "Live tests"; Discoveries) |
| Fire with nothing near answers "NOTHING HERE" | live | `reference/nothing-here.png`; `$8118` |
| The border flashes when Snide is near something to investigate (Zzap, the author) | traced | the border, once on arrival: objects whose flag at `$E880` has bit 0 set (`$3845`) and doors (`$3E32`), not a closed secret passage |
| The icons: 18 pictures, each with its action | traced | pictures drawn from the game's bytes (`$FA00`, 48 bytes each) and matched by number to the handlers at `$87ED`: 0 open box = open (list the contents), 1 magnifying glass = look, 2 notepad = inventory, 3 a red shape on a blue foot (perhaps a microscope) = put the chosen object into the furniture at hand, 6 gun = use the gun, 7 handcuffs = accuse, 8 and 9 arrows up and down through a line = open or close the door, 10 key = unlock, 11 "Q" = question, 12 open book = read, 13 knife and fork = consume, 14 cross = use, 15 clock face = time and pause, 16 box and envelope = put one carried object in another; 4, 5 and 17 have pictures and do nothing (`$883A`). The How it works page draws all 18 |
| The icons offered depend on the situation | traced | each menu is built from a list or a mask for the situation (`$86EE`); questions need a character within 22 pixels across and 9 in depth (`$B2E1`) |
| Accuse | traced | icon 7 (`$BB50`), in the icon lists of menus 0, 1 and 4 at `$8789` |
| Inventory of six items, more with something to carry them in (Zzap) | differs | five: with five objects carried a sixth is refused, "YOU CAN/T CARRY ANY MORE!" (`$30CF`); an object or piece of furniture holds five more (`$8856`) |
| Ten pieces of evidence, put in envelopes, before the accusation (the author) | confirmed | `$BB17` lists the ten; `$BB76` needs all in place `$C0` and Dingle accused. Live: refused without them; with them put in place `$C0` by hand, the arrest scene, the blanks, the escape and the win all ran (`facts.md`, "Live tests"). No win was played from the start |
| Real time, with a time limit; lose the case if it runs out | live | the clock starts at `09:10` (`$2153`);  one minute per 3,000 frames, measured; the limit `11:03` ends the game (`$2592`), tried by setting the clock (`facts.md`, "Live tests") |
| Pause, through the clock icon | traced | `$A1E0`: shows the time and waits for fire with the clock stopped |
| Characters walk the house on their own: the Major, the Reverend Wrinklebottom, the cook Hilda Crumble, a butler, a professor, Cynthia Sludgebucket and others; Angus McFungus is the first victim | live | Bentley walks up and speaks at the start (`reference/`); the nine scripts at `$A904`-`$B18C`; the vicar is "REVERAND WRINKLEBUM" in the game; McFungus is not one of the cast |
| Characters answer questions about McFungus, objects and each other; each drops a clue about the killer (the author) | traced | `$B2E1`, answers at `$B3AF`, `$B682` and `$B895` |
| More murders as time passes: strangling, stabbing, a piano falling on Cynthia Sludgebucket on the landing | differs | Dingle fakes his own strangling; Cynthia's body is put in the hall (room 9), not on the landing (`$AC96`); the Doctor is killed in room 27 with the knife put down (`$B19E`); Gabriel in her room (`$ACEC`); each when the player is elsewhere |
| Secret passages (Zzap) | traced | six doors of types 8 and 10, invisible when closed (`$3B8B`, `$3B97`), "A SECRET PASSAGE!" (`$892A`); drawn on the Maps tab, which test_rooms.js holds against the game's room builder |
| Safe codes, originally part of the copy protection (the author) | traced | the combination is "210319" (`$8AFB`), McFungus's birthday, which the game itself shows (`$9B90`) |
| Rain and thunder on the sound chip; a title tune (Zzap) | traced | the storm `$BF4D`/`$BF7A` (rain on voice 2, thunder at random); two tunes in the player at `$945E`, one played at start-up |
| RESTORE restarts the game when a flag allows it | traced | NMI handler `$294A`; `orientation.md`, "Steady state" |
| Status line of text under the room ("YOU ARE IN THE HALL") and a picture panel to its right | live | `reference/play-hall.png` |

## Beyond the documentation

Found in the code, not in the manual.

- The engine's jump table at `$2000` has 24 entries and the module's at
  `$8009` 38; every call and jump from one half to the other goes through
  them (a search of every instruction's operand on 1 November 2026: the
  only other cross-references are the flip flags at `$3FF0`-`$3FF9`, which
  the module reads, and the operands of BIT instructions that skip a
  LDA).
- A library where the player types a book's name (`$BDE8`): "101
  DETECTIVE STORIES" at the bookcase where the hardback book is hands it
  over. (traced)
- 52 objects (`$8151`) and the furniture they sit in (`$8401`), with a
  line for Examine (`$9A47`) and for Read (`$9EA1`); among them a bomb that
  ends the game when opened (`$C066`), an elephant gun, bullets and blank
  bullets. (traced)
- Characters say things on their own as they move about ("AWFUL
  WEATHER", "HAS ANYONE SEEN MY SCALPELS?") from their scripts, and the
  Major mutters one of four lines at random while the player is with him
  (`$99C8`). (traced)
- A cast of ten, with a biography each, on the title screen
  ("INTRODUCING THE CAST..", `$2161`; the biographies at `$8E65`). (live:
  `work/shots/attract*.png`)
- Endings: the time limit, the poison in the small bottle, the bomb,
  being shot at the arrest with real bullets, Dingle's escape after the
  blanks, and the promotion (`facts.md`, "Winning"). (traced)
- The win needs a swap made beforehand: the blank bullets put where
  Dingle takes his ammunition (place `$18`) in place of the real ones.
  (traced, `$B1E6`, `$BC5E`; live from a state set by hand: with the
  blanks there the gun clicks and Snide can make the arrest, with the
  bullets the game ends)

## Open questions

- Is the release analysed the original game with only the crackers'
  packer in front of it? Two other cracked releases were compared
  (`orientation.md`, "Other releases compared"): the game's code and data
  are the same in all three, apart from runtime state and seven bytes of
  text spoiled in one of them. No uncracked original was compared, so a
  change all three cracks inherited from one source cannot be ruled out.
- Release year: the title screen says 1986; the interview says it was
  coded in 1986 and released in 1987.
