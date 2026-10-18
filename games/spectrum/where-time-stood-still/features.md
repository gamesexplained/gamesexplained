# Where Time Stood Still — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Spectrum Computing, entry 5671,
  https://spectrumcomputing.co.uk/entry/5671/ZX-Spectrum/Where_Time_Stood_Still,
  read 17 October 2026: creators John Heap and Fred Gray, contributor Bob
  Wakelin (the loading screen says DENTON DESIGNS'), Ocean 1988, 128K only, AY sound, isometric 3D,
  multi-directional scrolling, controls (cursor, Interface 2, Kempston,
  redefinable keys), and the remark that Parry's "Jerusalem" is in the
  game, unused.
- The instructions as typed in by Paul Thompson (2003),
  https://spectrumcomputing.co.uk/pub/sinclair/games-info/w/WhereTimeStoodStill.txt,
  read 17 October 2026: the story, the controls, the three menus, the
  status display and the hints.
- A fan map of the whole plateau with a legend of items, enemies and cast,
  https://spectrumcomputing.co.uk/pub/sinclair/games-maps/w/WhereTimeStoodStill_4.png,
  read 17 October 2026. Its notes on what each item is for are a player's
  findings, not the manual's.
- Reference pictures in `reference/`: the loading screen and a picture of
  play from the Spectrum Computing entry (`*-spectrumcomputing.png`), read
  17 October 2026; the others were taken in ZEsarUX from the TOSEC image
  (`orientation.md`).

## Features

| Feature | Status | Where |
|---|---|---|
| Four characters: Jarret (the player at the start), Gloria, Dirk and Clive; the others follow the leader | confirmed | records 0 to 3 at bank 3 `$EB05`; the leader is `$8D0A`, 0 (Jarret) at new game; state 1 follows him (bank 3 `$DF8B`). Live: the four stand at the wreck when play starts |
| Joystick or keys move the leader in eight directions; with fire held he runs | confirmed | `$8D3B`: the eight directions fold onto four walks exactly as the manual's figure labels them (up and up-left north, up-right and right east, down-right and down south, down-left and left west); with fire they become the runs 6 to 9 (`$8B81`) |
| Kempston, Sinclair (Interface 2) and cursor joysticks, and keys the player defines | live | the control selection screen (`$AE10`, `$B0D7`); keys chosen on CHOOSE KEYS (`$AFEC`), SPACE refused because it calls the menus (`$6805`). Live: cursor chosen with 4, 0 and Y |
| SPACE calls up the menus; play goes on while a menu is shown | live | `$8B8A` reads SPACE and opens menu 1 (bank 3 `$CE77`); the main loop (`$86A2`) keeps running the party and the creatures with a menu up |
| Menu 1 (cyan): an inventory icon for each character, Quit menu, Pause, Sound effects or music, New game | live | bank 3 `$D088` (eight icons), `$CD0F` (their actions), `$CEDC` (cyan in play) |
| A character's inventory icon works only when that character is within hailing distance of the leader | traced | bank 3 `$C913` lights or dims each portrait by `$FB7C`: within hailing distance means in play (an actor near the view) in a state of 7 or less; menu 2 closes when its character leaves it (`$C983`) |
| Menu 2 (red): the inventory, four items carried and the objects on the ground nearby | live | bank 3 `$D0B0`, `$C983`: four slots for what the character carries and three for objects on the ground in the area |
| Picking up and dropping by dragging an object's icon to the top or bottom half of the menu | traced | bank 3 `$CE13` (the icon becomes the pointer), `$CCD0` (bottom half drops, top half takes); the character walks to an object taken from the ground (`$E082`) |
| Each character carries four items; the bag holds four more | traced | bank 3 `$C894` (four slots), `$CCB7` (message `$21` when full); objects in the bag have owner `$24` and fill the same four slots when the bag is opened (`$F8A5`) |
| Use item: select USE ITEM, then the object | traced | bank 3 `$CD83`, `$F84B`; each object's handler from `$F866`. A character who is moving is told to stop instead |
| A menu can be dragged out of the way by holding fire on an empty spot | traced | bank 3 `$CAF4`: fire with a direction off the icons moves the window (`$CC1A`-`$CC4E`), and the view behind is redrawn (`$C8EE`) |
| Menu 3 (magenta) replaces menu 1 when the leader dies: the player picks one of the living characters to lead | traced | bank 3 `$CEC1` (portrait actions 12 to 15 once `$8D09` is set), `$C913` (magenta), `$F51D` (the new leader takes slot 0) |
| Status display: the leader's portrait, strength, hunger/thirst and ammunition bars, the score as the percentage of the game completed, a calendar of days since the crash, a day/night indicator | confirmed | bank 0 `$F2AB` (portrait `$F2EA`, five digits `$F32D`, three bars `$F3C2`, light `$F37C`, calendar `$F465`); the score is five digits at `$8D04`, two after the point. Live at the start: 000·00, MAY 1, the sun |
| The other characters speak in conversation windows that open from the top of the screen: tired, thirsty, hungry, frustrated | traced | bank 3 `$D603` queues messages `$15` to `$1C` as needs fall; `$D7B9` and `$D7EC` open and fill the window |
| Clive is the first to complain | traced | bank 3 `$D5E3`: Clive's need limits are `$A0`, the highest, so his complaints come first |
| Clive wants anything valuable | open | no code found that sends Clive after an object of his own accord |
| Gloria rarely complains | open | her limits (`$80`) sit above Dirk's (`$70`) and Jarret's (`$60`), which by `$D69A` makes her complain sooner than either at the same need; whether her needs fall more slowly was not established |
| Dirk stays near Gloria and loses heart if she dies | open | not found in the code |
| A party disillusioned by slow progress leaves the leader and goes its own way | traced | bank 3 `$D603` (patience falls while the leader rests), `$D70A` (more than two below its limit: `$D795`, message 6, the character heads off along a route) |
| Places of mystical significance are safe places to rest | open | three rectangles shimmer with light in areas 1, 5 and 10 (bank 0 `$F5DD`, `$6903`); nothing found that keeps creatures out of them |
| Resting when characters are tired | traced | after 65 passes with no input the leader sits down (`$8B81`); the others sit with him (bank 3 `$DF8B`), and energy rises twice as fast while resting (`$D603`) |
| Enemies (fan map): swamp tentacle, tyrannosaur, the Hand, ankylosaur, pteranodon that carries a character off, wild boars in packs, pygmy tribes (one trades, the other is cannibal) | traced | by behaviour, and by the frames each class draws (the cast sheet on the How it works page, `test_cast.js`): types `$10`-`$13` are a tentacle that lives in swamp ground and pulls a victim under (`$F1D6`, `$F2F5`); `$14`-`$17` a pteranodon that chases, seizes what it catches and flies off with it (`$F202`; event 6, `$F26E`, ends only animations in its list at bank 1 `$E412`); `$18`-`$1B` a tyrannosaur, `$1C`-`$1F` a black, shaggy beast on four legs whose four records share route 27, and `$20`-`$27` a beast with a spotted, armoured back: these three seize a victim within three units and hold it (`$F14A`); `$28`-`$2C` are rocks that roll along their routes, with a sound every fourth pass (`$D6BA`); the tribe the party meets are types 4 to 7 (`$FFDE`, `$EFEE`); `$2D` stays put and holds the leader (`$FE17`). The tentacle, the pteranodon and the tyrannosaur are plain in the pictures; so is `$2D`, an arm that reaches out of a rock, which fits the fan map's Hand; that the shaggy beasts are the boars and the armoured ones the ankylosaur is inferred from the fan map |
| Items (fan map): ham, supplies, can opener, dynamite, mystical ball, knife, bottle, first aid kit, bag, rope, compact, watch | traced | bank 3 `$ECD8`, 17 objects: the bag, four tins, the bottle, the knife, the can opener, the ammunition, the ham, the jewel, the compact, the watch, the rope, the first aid kit, object 15 (no handler) and the dynamite; names from what each handler does (`$F866`) and the messages |
| The ham given to the Hand; Gloria's compact traded to the pygmies for the ham (fan map) | traced | bank 3 `$FCF0`: the compact dropped at the tribe's welcome earns 5% more and the ham; `$FDA5`: the ham dropped by actor `$2D` feeds it, 10% (`$FE01`) |
| Rope rescues Clive on the bridge; dynamite blows up rocks (fan map) | traced | Clive falls through ground `$74` (area 10) and hangs there, shouting HELP and then HURRY UP HURRY UP (`$E609`); the rope (`$FAA1`) starts states 4, 6 and 5 (`$E4C2`, `$E535`, `$E576`), 10%. Dynamite placed in zone 5 (area 7) moves records `$2B` and `$2C` off along route `$17`, 10% (`$FBED`, `$FF96`) |
| Music on the AY chip; "Jerusalem" in the game and unused (Spectrum Computing) | live | the driver at `$7000`; tune 14 is the music. A second tune of 192 steps (sections 1 to 3, `$7117`) is never requested: no instruction writes 1 to `$7002`. Live: in ZEsarUX, with 1 poked into `$7002`, the AY's registers in 3,949 of 3,950 frames were the driver's on the kit's Z80, and the How it works page plays both tunes from the listing. Aaron recognised the second tune as "Jerusalem" by ear (17 October 2026), and channel B's first eight notes are the hymn's first line |
| The way out: a pass through the mountains on the far side of the plateau | traced | ground `$72`, which only the leader may step on (`$9283`), lies in area 5; reaching it ends the game (bank 3 `$E910`): YOU ARE ON YOUR WAY HOME |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| Dirk translates the tribe's speech: a tribesman's words come out with every letter mirrored in the alphabet (A for Z), and when Dirk is within hailing distance the same message follows from him, beginning HE SAID. The manual only hints that his "studies on obscure eastern dialects may come in useful" | traced | bank 3 `$FD95`, `$D7EC`, `$D84C`, `$D8BF`. The mirror takes each code from `$2C`; the alphabet has no O (the digit 0 stands for it), so M stays M, L and N swap, and O becomes `$2C`, past the alphabet. What the font draws for `$2C` was not checked |
| The title music comes back a semitone higher: from its second time round, sections 15 to 21 play a semitone above the first | live | section 23 (`$72DF`) sets the transposition `$7992` from its notes and leaves it at one semitone; section 26 (`$7339`) goes back to 14 without clearing it, and only a new request does (`$708B`). Live: ZEsarUX's AY registers matched the driver's in 3,949 of 3,950 frames from the hand-over, the last hundred of them the second time round's section 15, a semitone up |
| The seizing creatures' sound check compares the wrong number: every creature that reaches it makes effect 5 | traced | bank 3 `$F150`: A is loaded with `$0F` between the compare with `$9C` and the compare with `$A0`, so the second compares the `$0F` |
| Effect 1 makes no sound, and effects 6, `$0C`, `$0D` and `$13` to `$16` are never asked for | traced | each effect run on the kit's Z80 through the driver (`test_music.js`): effect 1 leaves every volume at 0. The requests are the stores to the channels' bytes `$7006`, `$701F` and `$7038` found in every part's code; none stores those numbers |
| Fire alone makes the leader shoot the way he faces, using two units of ammunition | traced | `$8D3B` (action 5), bank 1's animations `$10`-`$13` end in event 1, bank 3 `$C75A` |
| A captured character, a ceremony at the altar and a sacrifice: the tribe asks for "the sacred jewel" and dropping it on the altar ends the ceremony, 10% | traced | bank 3 `$FE5B`, `$FEC8`, `$FF50`, `$FF7F` |
| The jewel glints: its picture cycles through three frames | traced | bank 3 `$FAFF`, bank 6 `$F25B` |
| At the end, everyone still with the leader earns a share of what is left to 100%, and the end screen says PITY ABOUT whoever was left behind | traced | bank 3 `$E910`, `$EA0B` |
| A day is 12,288 interrupts; in play about one in five is missed while the view is copied, so a day lasts about five minutes. Night falls at the twentieth hour and day breaks at the sixth | live | `$BEEF`, `$963B`; 2,441 ticks in 3,000 frames standing at the start of play, 1,000 in 1,000 on the title screen |
| The game's random numbers are its own code: a pointer steps through bank 3's bytes | traced | bank 3 `$E481` |
| CAPS SHIFT held resets the machine, in a routine no code calls | traced | `$BEE0` |
| A fifth input routine reads a joystick on port `$7F`, and no option offers it | traced | `$B622` |
| A river's current stops the leader crossing in some directions: THE CURRENT IS TOO STRONG | traced | bank 3 `$FCBD`, zones 6 to 8 |
| Two of the sixteen areas, 12 and 15, have no scenery record of their own: bank 7's words for them point into the ROM | traced | bank 7 `$DB00` |
| The calendar shows May twice. Play starts on MAY 1 with the month byte at `$FF`, so the month after 31 May is month 0, May again, before June, July and August. The same byte is the altar ceremony's count, so a month's end restarts a ceremony's count and a ceremony's end sets the month back to `$FF` | live | `$F465` (bank 0), `$865E`, bank 3 `$FEC8`, `$FF7F`. Live: from the start of play with the day poked to 31 and the clock to just before midnight, the panel turned to MAY 1 |

## Open questions

- Does a second game keep the changes the first made to the creatures? New game resets records 0 to 7, `$2B` and `$2C` and the objects, but not records 8 to `$2A` or `$2D` (`$85E2`).
- What happens when the leader stands close to actor `$2D` without dropping anything: the count reaches `$7B` and `$FE01` writes `$1C` into the routes' points at `$EDD2`, which looks like a bug. Traced, not observed.
- Can areas 12 and 15 be reached? They sit at two corners of the four by four plateau.
- Object 15 has no use handler and no name in the messages.
- What a month's end does with no capture: it leaves the ceremony's count at 0 to 3, so the altar's routine (bank 3 `$FEC8`) runs when the leader stands there, and it takes character 0, Jarret, as the captive, because `$8D0C` is 0 from new game. Traced, not observed.
