# Into the Eagle's Nest — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The cassette inlay the game came with, scanned by the contributor
  (`work/inlay.jpg`), read 26 October 2026. It carries the controls, the
  briefing and the objectives, and credits "Written by: ANDREW CHALLIS &
  ROBIN CHAPMAN. Produced by: RICHARD PAUL JONES", © 1986 Pandora, on a
  Commodore 64/128 cassette. Its four screenshots are labelled "AMSTRAD
  SCREENS", so they are not this machine's.
- The Mindscape manual for the American release, 8 scanned pages with no
  text layer, also the contributor's (`work/manual.pdf`, pages pulled out
  as JPEGs by `work/pdfjpg.py`), read 26 October 2026. It is the disk
  release's book: "Documentation copyright © 1987 Mindscape, Inc.
  Software copyright © 1987 Pandora. V-Max! copyright © 1987 Harald
  Seeley." Where it disagrees with the tape in front of us, the tape
  wins, and the row says so.
- C64-Wiki, `https://www.c64-wiki.com/wiki/Into_the_Eagle's_Nest`, read
  26 October 2026. It credits the music to "Mirai", calls the alternate
  title "Castle Maze", and says the soldiers never fire back.
- The game's own screens, read in the emulator on 26 October 2026: the
  attract loop's four screens, the mission select, the briefing, the
  status panel and the message line (`reference/`).

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in control port 2 steers the player: up, down, left, right | **live** | Held on `work/play-mission1.vsf` with nothing else moving: each direction moves the player's sprites 8 pixels every 4 frames (`work/controls.py`), which is the four-frame count at `$42AC` |
| The player is drawn as four sprites in a 2×2 block | **live** | Sprites 0 to 3, placed round `$02DF` and `$02E0` by the interrupt's second band |
| Fire shoots in the direction of travel | **live** | Fire alone put a bullet at (147,158), to the player's right; left and fire together put it at (112,167), at the player's left edge (`work/fire.py`). `$45BD` takes the direction from the facing in `$02B0` |
| Two shots can be in the air at once | **confirmed** | `$463F` fires the second once the first has taken eight steps of 8 pixels; each has its own direction, position and distance, in bits 0 and 4 of `$02AF` |
| A shot costs one round of ammunition | **live** | The panel's ammunition digit went from 9 to 8 on the frame the bullet appeared; `$4659` takes one off `$02BD` in decimal mode |
| SPACE pauses, and SPACE, the stick or fire resumes | **live** | A tap stops the counter at `$02B4`; the next tap starts it again (`work/pause4.py`). The paused game shows "...PAUSING..." on the message line (`work/t_hits.py`). `$5FCB` scans one key, row 7 column 4 |
| RESTORE abandons the game and restarts it | **live** | `vice_keyboard_restore` in play put the machine in the attract loop within two seconds (`work/restore.py`). The `CBM80` signature at `$8004` sends the NMI to `$8031` |
| Four missions in a castle: rescue each of three captives, then blow the castle up | **confirmed** | `$0836` holds 1 to 4; `$4010` is the floor the prisoner is on for three of them and `$FF` for the fourth |
| The mission the screen calls 1 is the demolition | **differs** | The manual (page 4) says mission four blows the castle up. The digit drawn at `$1DBE` is five minus `$0836`, and stepping the screen to 1 gave the briefing "MISSION 1 / BLOW UP THE CASTLE" (`work/t_mission2.py`) |
| A second castle, harder, after the first is destroyed | open | Manual, page 4. Nothing in the code chooses a second set of floor descriptions: the map builder always reads `$D000` plus a kilobyte a floor. The only other tile-shaped data, 999 bytes at `$8C00`, is reached by no instruction, by name, as a pointer or through an index (the references search) |
| Four floors, named BASEMENT, GROUND FLOOR, FIRST FLOOR and SECOND FLOOR | **confirmed** | The four names, 13 characters and a `$00` each, at `$1A78`, drawn by the floor-select screen at `$1AB2`; the message line names the same four at `$5808` |
| An elevator pass is needed to work the elevators | **confirmed** | The lift is tiles `$54` and `$55`. `$5040` reads `$02C8`, which `$5002` sets when a pass is picked up: with one it says "YOU ARE ENTERING THE LIFT." and the main loop takes the player to the floor select, and without one it says "YOU NEED A LIFT PASS !". Not exercised: no lift was reached in play |
| Four detonators, one per floor, for the demolition mission | **confirmed** | `$5F9A` to `$5F9D`, one byte a floor, set by `$5386` when a shot reaches a charge, and all four tested at `$5F75` |
| Keys open steel doors; a key is spent on each | **traced** | `$50F7` opens a steel door and `$02AC` counts the keys. Not exercised in play |
| Wooden doors are opened by shooting them | **traced** | Tiles `$47` and `$48` go to `$5192` through `$54F3` and `$5508` |
| Doors that were opened are locked again while the player is on another floor | **confirmed** | Taking the lift rebuilds the whole floor from its description at `$6A4B`, so nothing a mission changed in the map survives |
| Nazi soldiers take two shots each to kill | **confirmed** | `$6EAA` sets bit 6 of the figure's kind byte on the first hit and clears its tiles only on the second |
| The soldiers shoot back and do great damage | **differs** | They do not shoot at all. `$639F` is the only routine that adds to the hit count, its four callers are all the "the tile ahead holds the player" branches of the figures' movement, and the other writes to `$02C6` the references search finds clear the count or take hits off it (`$4058`, `$4077`, `$4F23`, `$4FA2`). C64-Wiki is right and the manual (page 4) is wrong for this version |
| 50 hits kill the player | **live** | `$5BC8` compares the hits with `$50`, and the count is binary-coded decimal: poked to `$49` the game played on, poked to `$50` it ended (`work/t_death.py`) |
| The player flashes as the limit nears | open | Nothing found that changes the player with the hit count: the sprite colour registers are written only at `$424D`, `$4C51` and `$4CB2`, neither of which reads `$02C6`, and the references search lists every reader of the hit count as the panel, the save between missions, the nags and the death test |
| First aid and cold food heal hits | **confirmed** | `$4F08` takes `$10` off the hits in decimal mode, which is ten, and `$4F90` clears them altogether |
| Drunken officers are harmless, and worth points when shot | open | The figures are tiles `$76` to `$C0`, and a shot that hits one goes to `$6EAA`, which finds it on the figure list: the first hit sets bit 6 of its kind in `$8500`, and a second asks for sound 8, sets bit 5, clears its sixteen tiles from the map and scores 100. Whether one of the four kinds leaves the player alone has not been traced. Tiles `$5E` to `$6D`, once read as officers, are the chests |
| Chests are shot open; shooting an open chest can destroy what is in it | **confirmed** | A closed chest is tiles `$5E` to `$61`, and a shot sends it to `$5528`, which opens it. Jewels showing in an open chest (`$66` to `$69`) are taken by walking into them (`$5CB9`, `$5DA6`), and shooting them instead (`$55F0`) says `YOU HAVE SHOT SOME JEWELS.` and loses them. Both seen in the game (`work/t_chest.py`). The chest of ammunition is a different thing, tile `$12` in the grid, which `$4F62` gives when the player walks onto it and `$53BF` empties when it is shot |
| Shooting a closed chest opens it on jewels about one time in seven, and on explosives about one time in ten | **confirmed** | `$5598` takes a random number and only one in four is `$C0` or more; on that it takes the next and splits it at `$80` between jewels, worth 4000 when walked into, and explosives. The two are neighbouring bytes, which the noise makes alike, so jewels win more often; counted on ten tables built with the sound chip running (`work/dice_real.py`). The other three times it says `EMPTY!`. Opening a chest never hurts the player |
| Some chests hold explosives, which are fatal when shot | **confirmed** | Only when shot once the chest is open on them: `$55D5` says `FOOL!....EXPLOSIVES.` and sets `$02D3` to 1, which is the explosion at `$5BDD`: the border and background run through seventeen colours five times over and the game then ends. Walking into them does nothing. Seen in the game (`work/t_chest.py`) |
| Art treasures (paintings, vases, pendants, gemstones) score points | **confirmed** | 2500 for a painting, 1500 for a vase, 4000 for a pendant and 4000 for a pile of jewels, each queued in `$02C5` and paid out a hundred at a time by `$5AA0` |
| Ammunition boxes hold 7 rounds each | **differs** | A box gives ten: `$4F62` adds `$10` in decimal mode, and sets 99 when that would pass it. The manual (page 6) says 7 |
| A mission starts with 99 rounds | **live** | `$02BD` reads `$99` and the panel's two cells both hold `$F9` (`work/t_ammo.py`); `$405E` writes `$99`. The manual says 99 too. C64-Wiki's "maximum is 100 shots" is wrong: the ceiling is 99, and `$4F6A` says so when a box would carry past it |
| Captives are escorted back to the starting point, and move more slowly than the player | **confirmed** | `$6C3B` gives the prisoner a step every other frame, half the player's rate, and only when he is within ten blocks of the window |
| A dazed captive is moved on by firing a warning shot in his direction | **confirmed** | A shot that reaches tiles `$D4` to `$E3` goes to `$6E21`, which turns the prisoner the way the bullet came |
| A high score table, "TODAYS REAL HEROES", ten entries | **live** | The attract loop shows it, filled with ten PANDORA entries from 10000 down to 1000 (`reference/attract-hiscores.png`), kept at `$0D51` |
| The player types a name on a high score | **confirmed** | `$0BC1` builds the screen, `$09AB` scrolls a strip of 48 characters from `$0B48`, and `$0CE7` reads the ten typed characters back off the screen into `$081F` |
| A hidden cheat: the name `%MAGGOTS!&` | **live** | `$6F3B` compares the typed name with `$6F31` and sets `$603F`; with it a mission starts with no hits taken, a key in hand and the ammunition refilled on two frames in three (`work/cheattest.py`). `cheats.md` has it in full. No source mentions it |
| A message line at the bottom of the screen | **live** | Rows 23 and 24 of the screen, drawn in the second alphabet; the raster split at line 228 switches the character set for them (`work/frame-play.json`) |
| The two kinds of mission are `RESCUE THE PRISONER` and `BLOW UP THE CASTLE` | **live** | Stored at `$1E18` and `$1E2C`; the briefing was read on screen (`work/t_mission2.py`) |
| The game nags a player who stands still, and one who wastes ammunition | **confirmed** | `$5A33` counts the still frames and says "COME ON ! GET ON WITH IT....." at fourteen, and "LETS GET DOWN TO SOME SERIOUS DESTRUCTION !" after seven counts of fire held without moving |
| A hint when a prisoner is near | **confirmed** | `$6CB4` says "THE PRISONER IS VERY CLOSE." once a floor, when the prisoner comes within ten blocks of the window |
| An empty chest says so | **traced** | `EMPTY!` is message 26 at `$5889` |
| Music in the attract loop | **live** | 173 writes to `$D400`-`$D418` in three seconds of the attract loop, and none in three seconds of play with nothing pressed (`work/sidwrites.py`). The driver at `$1947` plays three streams of note numbers and runs on every third frame |
| Nine sound effects in play, and footsteps | **confirmed** | `$6404` starts one of nine on voice 1, chosen by `$02D5`, and `$6790` plays the footsteps on voice 2 at two alternating pitches |

## Beyond the documentation

Found in the code, not in the manual.

- **The cheat word `%MAGGOTS!&`**, typed as a high score name, which no
  source mentions. `cheats.md` has it.
- **The loader signs itself.** `$033C`, in the loader's own work space,
  holds "WILD SAVE (C) INTERCEPTOR MICROS 1987   WRITTEN BY ANDREW
  CHALLIS JANUARY 1987  HELLO HACKER I HOPE YOU HAVE FUN WITH   THIS
  LOADER". So the author wrote the tape loader as well as the game, and
  it is Interceptor's Wild Save.
- **The mission is chosen before play**, which neither the inlay nor the
  manual mentions: "SELECT MISSION" with a number from 1 to 4, stepped by
  the stick and taken with fire.
- **The castle is built from blocks.** A floor is a kilobyte of
  description and the blocks it names are four tiles square, so sixteen
  kilobytes of map come out of a kilobyte of data (`facts.md`).
- **The game's dice are the sound chip.** `$67CA` runs voice 3 as noise
  and reads its own oscillator 256 times into a table at `$8700`.
- **The player is in the map as well as in front of it**, stamped as tile
  `$55` while the figures take their turn, which is how walking into him
  is noticed.
- **The tape switches its own title picture on.** The bytes at `$8C00`
  are the picture's screen colours, and five of the tape's blocks are one
  byte each, written into the video chip and CIA 2 (`orientation.md`, "The
  loader"). No instruction reads `$8C00`; the video chip does.

## Open questions

- Where the way out is drawn in a room. Tile `$E4`, which `$5F27` tests
  to end a mission, stands in a gap of nineteen tiles in the ground
  floor's outer wall on the map's last row, and the test was run by
  writing it under the player (`facts.md`, "Live tests"); the room it is
  in has not been walked to.
- Whether the second castle the manual promises exists in this version.
  Nothing reads a second set of floor descriptions.
- Whether the game has a two-player mode. No source mentions one, and the
  only read of `$DC01`, where control port 1 would be, is the keyboard
  scan at `$5FD0`.
- Who "Mirai", whom C64-Wiki credits with the music, is. The tune is
  three streams of note numbers at `$15E2`, `$1680` and `$1768`, and the
  game itself names nobody but Challis and Chapman.
