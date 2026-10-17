# Where Time Stood Still — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

The game is one load cut into six parts by RAM bank (`orientation.md`,
"The parts"): `main` is what the CPU sees at the hand-over, banks 5, 2
and 0 at `$4000`, `$8000` and `$C000`, and each of banks 1, 3, 4, 6 and 7
is a part of its own at `$C000`. What is true of one part is in that
part's `parts/<id>/facts.md`, with that part's addresses. This file holds
what spans the parts, and names the part beside every address it gives:
"bank 3 `$FB7C`" is the routine at `$FB7C` with bank 3 paged in; an
address below `$C000` with no part named is `main`'s.

## Build

- Ocean's 128K release of 1988, from the TOSEC set (`orientation.md`).
  The loading screen reads DENTON DESIGNS' above the title and
  "MCMLXXXVIII" with Ocean's logo at the foot. Spectrum Computing names
  John Heap and Fred Gray as its creators.
- No version number, build date or credit was found in the program's
  texts; the control selection screen shows only the logo and the
  options (`$B0E0`).

## The machine and its banks

- The game needs a Spectrum 128: everything below `$C000` is the program
  and its buffers, and the five other banks are paged in at `$C000` as
  they are needed, by the entries at `$8C75`-`$8CB5`. `$8D1E` keeps the
  last value written to port `$7FFD`, and every paging keeps its screen
  and ROM bits.
- Bank 3 holds most of the game's logic and is paged in for most of a
  pass; bank 0 holds the status panel's code and Clive's sprites; banks
  1, 4, 6 and 7 hold data only. In the sessions recorded with
  `kit/spectrum/bankmap.py`, code ran at `$C000`-`$FFFF` from banks 3 and
  0 and from no other.
- Two screens: bank 5 (`$4000`) and bank 7. The view is drawn into the
  one not shown and the two swap at the end of a pass (`$9987`). Bank 7's
  first `$1B00` bytes are its screen; the rest holds the areas' scenery.
- The plateau is sixteen areas, four by four (bank 3 `$DB0B`). One is in
  memory at a time: `$87CF` unpacks its ground into bank 1 `$C000`
  (from bank 1 `$D000`), its scenery pieces into bank 4 `$C000` and the
  boxes the actors walk round into bank 3 `$C000` (from bank 7 `$DB00`
  and bank 6 `$C76A`), and its map of blocks into bank 0 `$C000`.

## Memory layout

| Thing | Where |
|---|---|
| Screen, and the loading screen at the hand-over | `$4000`-`$5AFF` (bank 5) |
| Menu and conversation window contents | `$5B00`-`$64A4` |
| The frame and panel as 768 cell numbers | `$6505`-`$6804` |
| The keys chosen and the input routine copied from the title | `$6805`-`$6857` |
| Area 8's scenery record | `$6859`-`$6902` |
| Shimmering light | `$6903`-`$69B3` |
| Records of 40 scenery shapes | `$69B4`-`$6FFF` |
| Sound driver and the tunes | `$7000`-`$7B67` |
| Scenery shape 56's record | `$7B68`-`$7B7C` |
| Conversation messages, names and exclamations | `$7B7D`-`$7FE2` |
| Bit-reversal and sprite outline tables | `$8000`-`$82FF` |
| Eight actor records of 32 bytes | `$8300`-`$83FF` |
| Interrupt table (IM 2) | `$8400`-`$8500` |
| Start-up, main loop, areas, actors, the view, sprites, windows | `$8521`-`$AE0F` |
| View buffer, 152 rows of 28 bytes (the title's code before play) | `$AE10`-`$BEAF` |
| Interrupt and clock | `$BEBE`-`$BF30` |
| Stack | down from `$BFF0` |
| Area map, block definitions, panel tiles and code, Clive's sprites, starting values | bank 0 |
| Ground, animations; Jarret's, Dirk's and two kinds of creature's sprites | bank 1 |
| The game's logic and its tables | bank 3 |
| Scenery pieces and the characters they are drawn from | bank 4 |
| Gloria's and five kinds of creature's sprites, scenery objects, the objects' pictures | bank 6 |
| Second screen; each area's scenery record and map | bank 7 |

## Timing

- The interrupt (IM 2, I = `$84`, every entry `$BE`, so `$BEBE`) runs the
  clock (`$BEEF`) and a pass of the sound driver (`$7000`).
- The main loop (`$86A2`) makes one pass for each view drawn, and a pass
  waits for the interrupt before it shows the view (`$9987`). *Live*:
  558 passes in 3,000 frames standing at the start of play, one pass in
  5.4 frames; 46 in 300 frames while walking, one in 6.5.
- The view is copied to the screen with interrupts off (`$963B`), which
  makes the CPU miss about one interrupt in five; the copy then calls the
  sound driver itself before it enables interrupts again. *Live*: in the
  same 3,000 frames the clock counted 2,441 interrupts, and 2,441
  interrupts plus 558 copies make 2,999 calls of the driver, so the music
  keeps time while the clock loses about a fifth. On the title screen
  the clock counted 1,000 in 1,000 frames.
- A day is `$3000` (12,288) of the clock's ticks (`$BEEF`), so about
  15,000 frames, five minutes of play. The hour is the count's high byte
  halved; day breaks at the sixth hour and night falls at the twentieth,
  when the view's colour changes over two passes (`$8C47`).
- The party's needs change every 32 passes (bank 3 `$D603`).
- The calendar's day is `$8D14` and its month `$8D15`, which bank 3 also
  uses as the altar ceremony's count (bank 0 `$F465`, bank 3 `$FEC8`). Play
  starts on MAY 1 with `$8D15` at `$FF`, so the month after May is May
  again. *Live*, below.

## Controls

- The control selection screen (`$AE10`) offers keys the player defines
  (`$AFEC`), Kempston, Sinclair (Interface 2) and cursor; the routine for
  the choice is copied to `$6811` and called once a pass (`$8B81`). A
  fifth routine, for a joystick on port `$7F` (`$B622`), is offered by no
  option.
- The eight directions fold onto four walks (`$8D3B`): up and up-left
  walk north, right and up-right east, down and down-right south, left and
  down-left west, as the manual's figure shows. With fire they are runs;
  fire alone shoots the way the leader faces (bank 1's animations `$10`
  to `$13`, which end in bank 3 `$C75A`).
- SPACE opens the menus (`$8B8A`); while a menu is open the controls
  move its pointer (bank 3 `$CA49`). CAPS SHIFT would reset the machine
  through `$BEE0`, which no code calls.

## Graphics

- The view is 28 characters by 18 (`$9630`), built from a map of 64 by
  32 blocks in bank 0, each block 4 by 4 characters drawn from bank 4's
  `$CD40` (`$9A6D`, `$9C10`). Each area has a split, a block number
  that `$87CF` writes into the CP at `$9C12` (from the first byte of
  the area's list, bank 0 `$E8A3`): a block numbered over it takes its
  definition 256 further on and its characters' base from bank 0
  `$E864` rather than `$E840`. The splits run from `$2B` (area 0) to `$86` (area 5).
  *Tested*: `test_maps.js` runs `$87CF` for each of the 14 areas that
  have scenery and then the game's `$A012` on the kit's Z80, and the
  pages' renderer gives the same 4,256 bytes of view buffer as `$A012`
  at 15 places, the start of play among them. It scrolls a pixel row at a time up and down
  and half a character across, following the leader's animation
  (`$98FF`).
- Actors and objects are sprites 16 or 24 pixels wide, drawn back to
  front (`$A6F4`, `$A802`) with a visibility mask cut by the scenery pieces
  that stand in front of them (`$A879`, bank 4 `$C000`). Each class of
  actor has its frames in one bank (bank 3 `$EAC8`): Jarret, Dirk and two
  creatures in bank 1, Gloria and five kinds of creature in bank 6, Clive
  and one kind of creature in bank 0.
- The status panel is drawn from tiles in bank 0 (`$F2AB`).

## Mechanics

- The party is four records, Jarret, Gloria, Dirk and Clive (bank 3
  `$EB05`); `$8D0A` is the leader. Up to eight actors are in play at once
  (`$8300`), drawn from 46 records of the plateau's people and creatures
  as they come near the view (bank 3 `$DC0B`).
- Each character has eight need bytes (bank 3 `$D5C3`): strength, energy,
  water, food, ammunition and patience among them. They fall as the party
  walks and rise as it rests (`$D603`); each character has limits that
  decide when he or she complains, must rest, or leaves the party
  (`$D5E3`, `$D70A`).
- The score is the percentage of the game done, five digits from `$8D04`
  with two after the point (bank 3 `$E4A0`). It goes up for a kill (bank
  3 `$C7B6`), the tribe's welcome and a gift to it (`$FCF0`), feeding actor
  `$2D` the ham (`$FE01`), a capture (`$FE5B`), the jewel on the altar
  (`$FEC8`), Clive hauled up the rope (`$E576`) and the dynamite in its
  place (`$FBED`).
- At the end (bank 3 `$E910`, ground `$72` in area 5) the whole percent is
  raised to 60 if below, and each character still within hailing distance
  adds a quarter of what is left to 100.
- Nine zones start events when the leader stands in them (bank 3
  `$FB1E`): the tribe's welcome, actor `$2D`, the capture, the altar, the
  dynamite's place and three rivers.

## Data tables

- Areas: bank 1 `$D000` (ground), bank 7 `$DB00` (scenery records and
  maps), bank 6 `$C76A` (scenery objects), bank 0 `$E8A3` (block lists).
- People and creatures: bank 3 `$EB05` (46 records), `$EAC8` (twelve
  classes), `$ED68` and `$EDB0` (routes); starting values bank 0 `$FE05`.
- Objects: bank 3 `$ECD8` (17 objects and three more records), `$F866`
  (use handlers), bank 6 `$F1B1` (their pictures).
- Messages: `$7B7D` (37), in the game's alphabet: 0 to 9, A to N and P to
  Z, the zero standing for O (`$AEEB`).

## Sound

- The AY driver (`$7000`) plays tunes as chains of numbered sections
  (`$70BF`): a request in `$7002` starts one. 14 is the title and in-game
  music, and loops; 4 turns the music off and leaves sound effects, which
  bank 3 requests through each channel's byte at `$7006`, `$701F` and
  `$7038`.
- A second tune of 192 steps (sections 1 to 3, `$7117`) is complete in
  the driver and is never requested: no instruction writes 1 to `$7002`.
  Section 3 flips the transposition (`$7992`) between 0 and 1 and plays
  section 2 again, so the tune alternates a semitone up and back.
- The title music climbs a semitone after its first time round: section
  23 (`$72DF`) sets `$7992` from its notes' high nibbles and leaves it at
  1, section 26 (`$7339`) goes back to 14 without clearing it, and only a
  new request clears it (`$708B`), so sections 15 to 21 play a semitone
  higher every time after the first.
- *Live*: the AY's registers read once a frame in ZEsarUX 13.0
  (`get-io-ports`) matched the driver run on the kit's Z80 in 3,949 of
  3,950 frames of tune 14 from the hand-over, with one slip of the
  emulator's frame step (frame 800), and in 3,949 of 3,950 frames with 1
  poked into `$7002` at frame 50. The last hundred frames of the first
  recording are the second time round's section 15, a semitone up.
- The driver is called 50.02 times a second on a 128 (70,908 T-states a
  frame) and the AY runs at half the CPU's clock, 1.7734 MHz, so a tone
  period P sounds at 110,840/P Hz, 433.0 Hz for 256. *Live*: ZEsarUX played period 256 at
  430.7 Hz (`kit/spectrum/test_ay.js` holds `site/lib/ay.js` to it).

## The listing's error rate

The listing's comments were written by one agent (`claude-opus-5-5[1m]`)
and checked by another model that wrote none of them: `gpt-6-astra`,
through OpenAI's Codex CLI, at high reasoning effort.

- Sample, seed 20261017, 60 comments drawn from the 610 of `main` and
  bank 3, the parts annotated by then (31 from `main`, 29 from bank 3);
  the four data banks' comments were written after the draw and are not
  in it. The checker marked 16 wrong in a detail, one wrong and one
  doubtful. Settled against the code, all 17 held and the doubtful one
  was a unit left unsaid (`near_leader`, bank 3 `$E2B4`, made explicit).
  One more of the 60 was wrong and passed: `main` `$6DB4` called the
  scenery shapes' records unnamed bytes, which bank 4's word table names.
  That makes 18 wrong, 30 % (Wilson 95 % interval 19.9–42.5 %), and a
  lower bound, since a checker misses some.
- What was wrong: amounts and ranges stated without the adjustment the
  code makes (the scroll steps' rows, which `$9693` and `$96D9` make one
  more or fewer; the watch's hour, 0 to 23 made 1 to 12; the bottle's
  search for water along one row), the first of several where the code
  takes the last (`next_shot`), a pointer's offset (`object_screen`,
  `use_item`), a test that never fails (`grabber_ai`'s second type test,
  so types `$1C` to `$27` all make effect 5), a route said to be unused
  that a new leader can take (route 0), and one wrong in its main claim:
  `drop_on_icon` (bank 3 `$CC78`) handles an object dropped on the bag's
  icon, not on a portrait.
- All 18 were corrected, with the comments that said the same thing:
  every scroll step, `fetch_object`, `state_fetch`, `routes`, the bag's
  flag in `menu_vars`, `main` `$6858` and `$7B68` (area 8's scenery
  record and shape 56's), and the same claims in `features.md` and the
  parts' facts.
- The rate means about one comment in three or four may be wrong in a
  detail. An audit of every comment is recommended (`TODO.md`).

## Live tests

- The clock and the main loop, from `work/play-start.sna`: 3,000 frames
  standing still gave 558 passes (`$8D1C`) and 2,441 ticks (`$BF2A`); 300
  frames walking right gave 46 passes and 253 ticks. Control: 1,000
  frames on the title screen from `work/entry.sna` gave 1,000 ticks.
- From the hand-over to play: the control selection screen, 4 and 0 to
  choose cursor, Y to confirm, and play starts at the wreck with the four
  characters, 000·00 and MAY 1 on the panel.
- SPACE in play opens menu 1 over the view; a portrait opens menu 2.
- The calendar, from `work/play-start.sna` with the day (`$8D14`) poked
  to 31 and the clock (`$BF2A`) to `$2FF0`: within 100 frames the panel
  showed MAY 1, the day was 1 and the month (`$8D15`) 0 (`work/calendar_test.py`).
