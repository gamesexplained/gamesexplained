# Explorer — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The instructions, as Spectrum Computing keeps them:
  https://spectrumcomputing.co.uk/pub/sinclair/games-info/e/Explorer.txt,
  read 31 October 2026. One text for the Spectrum, Amstrad and C64
  releases; its key tables are for the Spectrum and the Amstrad only, and
  its only C64 lines are the loading instructions.
- Graham Relf's own history of his games, "The Forest - history",
  https://www.grelf.net/foresthistory.html, and his account of the terrain
  method, https://www.grelf.net/forest_terrain.html, read 31 October 2026.
  Both describe The Forest, the game Explorer was built from; Relf says
  Explorer used "the same core of program".
- regvault.org's catalogue page, https://regvault.org/game/c64/explorer,
  read 31 October 2026: publisher, developer and year only.
- A web search on 31 October 2026, second-hand through its result
  summaries: Spectrum Computing credits Graham T. Relf (code), Simon
  Dunstan (graphics) and David John Rowe (inlay art), and Crash gave the
  Spectrum release 32 % in March 1987.
- MobyGames and the ZZAP!64 archive refused the fetch (HTTP 403) and
  C64-Wiki has no page for the game, so no published screenshots were
  saved; every picture in `reference/` is from the emulator.
- The game's own screens: the title, the menus and their strings, and the
  credits behind X in the menu.

## Features

| Feature | Status | Where |
|---|---|---|
| A jet pack: U goes up about a thousand feet, again for another thousand; D comes down | confirmed | U on the ground takes off to height 8 (`take_off` `$1728`); in the air U goes from 8 to 9, the map cells twice as far apart (`go_up` `$2879`), D from 9 to 8 and at 8 lands (`go_down` `$28A4`). Live: the game's own landing after the opening pass |
| Above the planet the stick moves north, south, east and west, whatever the compass says | confirmed | `fly_loop` `$2847`: 8 east, 7 north, 6 south, 5 west, each scrolling the map one cell; `joy_codes` `$0BE5` turns the stick into those keys |
| "Watch landing on the trees: they're pointed" | live | `land` `$28DE`: open ground (kinds 4, 6 and 8) is safe, jungle (0, 2) and water a crash (`crash` `$2C03`). Live: the opening landing came down on water, the screen went black on white and shook, 500 came off the energy and the destination prompt followed (`reference/crash.png`, `reference/crash-prompt.png`) |
| On the ground the stick forward walks along the compass bearing; fire or any key stops | confirmed | `ground_loop` `$14F9` and `walk_loop` `$152B`; 7 (stick up) walks, any other key stops |
| Left and right alter the bearing; back turns about | live | 8 turns right and 5 left two steps of 64 (`turn_right` `$1578`, `turn_left` `$1584`), 6 turns 32 (`turn_about` `$1590`). Live: 8 took the heading from 16 to 14 and the compass from 0 to 10 |
| A compass | live | `draw_compass` `$0FF8`: three digits at the top right of the ground view. It reads about 1 % short of the true angle: west reads 267 |
| Object sonar: a sounding gives a bearing and a distance by the echo's delay, and "out of range" past a civilised walk | live | `echo_nearest` `$19A8`: a ping, then the nearest fragment; within 1,279 units the echo comes back after a quarter of the distance in interrupts. Live: "178 degrees / Out of range" for a fragment 1,344 units away a little east of south (`reference/sonar-echo.png`) |
| Nine radio beacons, popped down anywhere | live | `drop_beacon` `$1B9C`, `pick_up_beacon` `$1BD8`, the records at `beacons` `$21DD`; "Carried:012345678" loses a digit for each beacon down. Live: D dropped beacon 0 and drew it (`reference/beacon-dropped.png`) |
| A radio direction finder: bearing and range to the beacons, for triangulation | live | `fix_beacons` `$1BFD`, "Fix 3 nearest": the three nearest beacons down, each with its distance (east plus north) and bearing. Live, with beacons poked 1,000 north, 200 west and 640 south, and 480 east and 320 north: "1000m. 1 degrees", "840m. 252 degrees", "800m. 56 degrees". The second should read 197: see `bearing_of` in Beyond the documentation |
| Nine anti-grav drones send bits of the craft to beacons | live | `send_to_beacon` `$1A53`: the fragment in the explorer's cell takes the chosen beacon's position, for 1,000 energy, if the beacon is down and less than 16,384 units away. Live: fragment 2, poked onto the explorer's cell, moved to beacon 0's position and the energy fell by 1,000 |
| A laser pulse gun, fired in weapons mode | live | `weapons` `$2350`, `fire_laser` `$2437`: the sight moves with 5, 8, 7 and 6, F (or fire) shoots, 500 energy a shot. Live: a bug was hit with one shot and weapons mode ended (`reference/laser.png`) |
| One or two robotic bugs; kill them | live | `maybe_new_bug` `$1436`: never more than one at a time; it appears more often as the score rises and traps the explorer in weapons mode until it is hit. Live, with the score poked to 250 (`reference/bug.png`) |
| Swirling patches of colour in the jungle invite you to enter, and take you to any place you name | live | `scenery_doorway` `$1183`, `doorway_prompt` `$0D32`, `name_destination` `$0E23`. Live: a doorway one cell away, "Enter doorway", E, the name HOME, arrival at 48,356 east and 48,609 north (`reference/doorway.png`, `reference/destination-prompt.png`) |
| Watch your energy: if it gets too low things go wrong | differs | Nothing tests the energy until it would go below zero (`energy_spend` `$22F7`): then "Energy gone", the energy is set to 2,000 and the destination prompt comes up (`energy_gone` `$231A`). Four instructions read the energy, and none compares it with a threshold |
| "There's a way of restoring it" | differs | The doorway works out an energy change, (letters in the name − 8) × 512 less a quarter of the distance travelled, so a long name to a near place would add energy; both branches after the sum jump past the store at `$0F42`, and the trip leaves the energy as it was. Live: HOME cost nothing beyond the 15 every view costs. The crash and running out are the only other writes, and both take energy away or reset it |
| Break or space brings up the menu; the first letter of a word chooses it | live | `menu` `$1899`: any key on the ground but the moves; O, B, W and X, then E, S, D, P and F in the menus below (`reference/menu.png`, `reference/menu-objects.png`, `reference/menu-beacons.png`) |
| Forty billion mappable locations, nine of them holding fragments | differs | Positions are two 16-bit numbers, 65,536 × 65,536, about 4.3 billion places, which wrap round at the edges; the explorer steps 16 units at a time. Nine fragments (`fragments` `$2213`), eight at the same places in every game and one 160 east and 144 north of the start |

## Beyond the documentation

Found in the code, not in the manual.

- **How the game ends** (`check_win` `$0DBA`): after every step, if all
  nine fragments lie exactly on the explorer's grid cell, a window says
  "WOW, YOU DID IT!" and the program stops in a jump to itself
  (`game_won_halt` `$0E0E`). The way to get nine fragments onto one cell is
  to send them to one beacon and stand on its cell. Live, with the
  fragments poked onto the explorer's cell (`reference/win.png`).
- **The score** is the number of fragments seen, shown in the menu with
  the energy; it also makes bugs come more often (`maybe_new_bug`).
- **The opening**: after the title the planet zooms in, the map flies
  north for 80 cells with a shake halfway, and the game lands the
  explorer where the pass ends, crashing if that is jungle or water.
- **The terrain is computed, never stored**: four layers of five terms
  over one 256-byte profile and 40 coefficient bytes (`terrain_at`
  `$32D6`), Graham Relf's method from The Forest.
- **Doorways** are where the last layer's sum has the low byte 12; a
  doorway two cells away is drawn too, but only one whose patch still
  shows at the middle of the view when the explorer steps opens.
- **A destination is a hash of its name**: east is worked out over the
  letters forwards and north over them backwards from the zero after the
  name to the second letter, so every name goes to the same place in
  every game.
- **Bearings in the south-west quarter are wrong** (`bearing_of`
  `$383F`): the game reads 270 less the angle where it should
  read 180 plus it, so a beacon at 197° reads 252.
- **Credits**: X in the menu shows "graphics: Simon Dunstan" and
  "program: Graham Relf" (`show_credits` `$1D4D`, `reference/credits.png`).
- **Unused pictures**: objects 20, 41 and 42 have records but no list
  draws them, and the pictures at `$986A` and `$9AFE` belong to no
  record.

## Open questions

- Who wrote the C64 version's 6502 code. The game's own credit says
  "program: Graham Relf" and Relf writes that the programming of Explorer
  was all his, on the Spectrum; GameBase64 names Brian O'Shaughnessy as
  the programmer. The code keeps Spectrum attribute bytes throughout,
  which says it is a conversion, not by whom.
- Whether the Spectrum release stores the doorway's energy change, and so
  whether the jumps past `$0F42` were the converter's choice or a slip.
