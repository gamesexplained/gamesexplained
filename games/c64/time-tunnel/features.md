# Time Tunnel — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Wikipedia, "Time Tunnel (1985 video game)",
  https://en.wikipedia.org/wiki/Time_Tunnel_(1985_video_game), read 31 October 2026:
  credits, the list of eras, the reviews.
- LaunchBox Games Database, "Time Tunnel",
  https://gamesdb.launchbox-app.com/games/details/113801-time-tunnel, read 31 October 2026:
  the premise, the closet, the controls.
- Zzap!64 issue 12 (April 1986), pages 17-18, review of Time Tunnel, the
  Internet Archive's OCR text of `zzap64-magazine-012`, read 31 October 2026.
- Martin Fernandez, "Time Tunnel" solution, textfiles.com
  (`http://www.textfiles.com/games/SOLUTIONS/timetunnel.sol`), read 31 October 2026:
  how each era's puzzle is solved.
- C64-Wiki has no page for the game (31 October 2026). Lemon64 refused the
  fetch (HTTP 403). No manual or instruction sheet was found; Zzap!64 says
  the game came with a poster of instructions with clues for each era, and
  that US Gold sold a hint sheet.
- The game's own screens and stored text.

## Features

| Feature | Status | Where |
|---|---|---|
| You are a gnome who wants to be King of the Gnomes; the document that says how is in seven pieces, one in each era | confirmed | the pieces are objects `$04`-`$0A`, one in each era but the mansion; all seven at the black hole show the message (`hole_pass`, `$184E`), and the staff it names ends the game in the throne room, era 9 (`persia_cave`, `$1E9E`; `throne_room_entry`, `$1F99`) |
| Play starts in the living room of Gnome Mansion, in the present | live | the start-up sets era 1, room 1 |
| A time machine in the mansion, missing a part that must be found in the house before it works | confirmed | the part is object `$15`; it appears on the living room's table when a bolt lights the log in the fireplace (`living_room_pass`, `$11F3`), and the machine runs once it sits at x `$6F`, y `$4B` (`machine_button`, `$1311`) |
| Seven eras besides the present: Stone Age 9600 BC, Magical Persia 893 BC, Mythological Greece 86 BC, Colonial Salem 1692, California Gold Rush 1849, Intergalactic Spaceship 3456, The Black Hole 9999 | confirmed | era names `era1_name` ... `era8_name` (`$0BC2`); the controls' screen shows the same seven years; the year chosen plus 2 is the era (`machine_countdown_over`, `$10E4`) |
| A time machine control room: select a new year with the joystick, RETURN goes back to the mansion | differs | each press of the button lights the next year and the stick pulled down leaves (`controls_pass`, `$11C1`); the room's own text says so: "FIRE BUTTON SELECTS NEW YEAR / DOWN JOYSTICK RETURNS TO MANSION" (`controls_screen`, `$40AA`); nothing reads RETURN |
| One puzzle in each era, solved by bringing the right objects, some carried from another era | confirmed | each era's per-pass routine tests where objects lie: the gold rush `$138D`, the black hole `$1801`, Persia `$1927`, the stone age `$1FEE`, Greece `$22ED`, the spaceship `$27D8`, Salem `$2C7A` |
| The gnome carries one object at a time | confirmed | one carried slot and object, `$74` and `$75`; picking up needs empty hands (`play_button`, `$361D`) |
| Objects can be picked up, dropped, set in motion, and things such as doors and lifts moved when he stands near them | confirmed | pick up and drop (`play_button`), the mansion's doors (`door_check`, `door_use`), the gold rush's lift and the spaceship's levers in their eras' routines |
| A lightning bolt (the box says lasers) fired with the button when facing left or right | confirmed | object `$11`, fired by `play_button` when there is nothing to drop or pick up and the gnome faces left or right |
| A closet, entered by holding the button for a few seconds, from anywhere in time; it stores up to eight objects | differs | held for 128 passes (2.56 seconds) the button takes him to era 2, room 9 (`play_state`, `$34B0`), but he cannot leave while five or more objects lie there, and each piece of the scripture counts five (`closet_pass`, `$116A`): it holds four objects, and never a piece |
| Flick-screen rooms seen from a raised angle | live | |
| Joystick control | live | the main loop reads both control ports, `$DC00` and `$DC01`, ANDed together |
| A pause key | live | F7 toggles `$AF` (`keys_read`, `$38FF`); while paused only the clocks `$23` and `$BD` count |
| One game lasts until it is solved; there are no lives (Zzap!64) | confirmed | hazards (the scorpion, the stalactites, the bats, the snake, Medusa's shot, the cave's pit, the moon's air) send the gnome home, or back into the ship (`gnome_hurt`, `$3378`; `persia_cave`, `$1E9E`); no variable counts lives |
| Credits screen: "U.S. GOLD, LTD. PRESENTS TIME TUNNEL BY APPLIED SYSTEMS ENGINEERING, INC. (WITH HELP FROM ON-TIME SOFTWARE) SAN JOSE, CA COPYRIGHT 1985" | live | text at `$0FA9` |

## Beyond the documentation

Found in the code, not in the manual.

- The scripture's message, "The Daimyo Carries The Staff", is drawn in
  mirror writing in the black hole's own characters
  (`hole_message_screen`).
- The black hole's first room is an empty screen: the room-drawing code
  fills it with character 0 on black, so only the sprites show.
- The controls' packed screen runs 11 cells past the visible 24 rows; the
  border hides them.
- Persia's basket lid (`persia_lid`, `$1CA1`), set on the basket, writes
  its new x and y to the stored position of object 4 + its sprite slot
  (one of objects 5-`$0B`, most of them pieces of the scripture) rather
  than to its own.
- Leftovers in the program: a fragment of Z80 code for CP/M and a line of
  source comment ("ments if he will move outside entire screen") at
  `$C5A8`, a cartridge header (`CBM80`) at `$0900`, and the words
  "Bytes/sector:" in the throne room's character set.
- The sound effects play on voice 1 only, one at a time; commands 9 and
  `$A` are the same code. Voice 3 is set up for noise, but nothing reads
  its output (`$D41B`).
- Drawn but never shown: objects `$46` and `$47`, Medusa's fourth frames,
  the dynamite's fifth frame and the basket lid's third row.
- Code nothing reaches: `$1EEE` (one of the ten jumps to `go_home`) and
  `$1BE5`; two tests of `$B6` at `$2D97` whose branches both lead on.

## Open questions

- Salem room 3 entered on foot after the broom was parked with the piece
  carried: whether the gnome is moved 24 to the right through slot 0
  (`salem_broom_park`, `$2CA5`). Read from the code and not tried.
- How the poster of instructions and the hint sheet described each era's
  puzzle; neither was found.
