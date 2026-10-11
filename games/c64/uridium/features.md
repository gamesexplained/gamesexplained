# Uridium — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The Hewson manual, as printed in the Uridium / Paradroid Double Value
  Pack (Hewson, 1987), cassette inlay scan
  https://archive.org/details/Uridium_Paradroid_Double_Value_Pack_1987_Hewson_compilation,
  read from the PDF on 10 October 2026 (the item's OCR text is
  unreadable: the scan is rotated). It is the cassette release's text
  ("Loading the Tape"); this run's image is a disk. It outranks the rest.
- C64-Wiki, https://www.c64-wiki.com/wiki/Uridium, read 10 October 2026.
  Its infobox picture is a cracker's loading picture ("by m.b.s. '86"),
  kept as `reference/wiki-loading-picture-other-release.png`; it is not
  this release's.
- The game's own screens, recorded from the image in this run
  (`reference/`).

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick only, in either port (manual); fire starts the game | live | `read_stick` `$B019` ANDs both ports; fire on port 2 started every game in this run |
| Title-sequence options: F1 one player one joystick, F2 two players sharing one joystick, F3 two players two joysticks, F5/F6 music volume up/down, F7 colour, F8 monochrome (manual, C64-Wiki) | live | `option_keys` `$2342`, `volume_keys` `$B31B`, `colour_keys` `$23B5`; every key tried in the recorded session (icons, "Volume 15", "Colour", "Blck-Whte"); F3 makes `next_turn` give each player a port |
| Run/stop pauses; fire or run/stop restarts; run/stop then clr/home abandons the game (manual) | confirmed | `pause_check` `$2B6D`; the pause shown live in a two-player game (`reference/paused-two-players.png`); CLR/HOME jumps to `title` |
| Up/down sets the Manta's position above the Super-Dreadnought; left/right accelerate and decelerate (manual) | live | `manta_vertical` `$2576`, `manta_speed` `$2635`; vertical speed -3 to +3, speed -8 to +8 (`manta_limits_table`) |
| Below a minimum speed the Manta half-loops and half-rolls to face the other way; the manoeuvre lifts it above the surface for a while, over missiles and mines (manual, C64-Wiki) | live | `manta_limits` `$268C` asks for it below speed 2; height `$3D` rose from `$10` to `$1E` and back, frames `$60`-`$66` and `$51`-`$59`, out facing left; bullets and mines hit only below height `$14` (`bullet_move`, `mine_move`) |
| Fire held with up or down rolls the Manta 90 degrees to pass narrow gaps (manual) | live | after seven frames of fire (`fire_control`), up rolled it from frame `$41` to edge-on `$4D`; edge-on frames test only the Manta's own row of characters, level frames the rows above and below its middle too (`collide_shapes`) |
| The Manta reverses out of its transporter at the start of each Dreadnought (manual) | live | `launch_sequence` `$2839`; `reference/play-level1-launch.png` |
| Fifteen Dreadnoughts, one per planet, each after a different metal (manual) | confirmed | fifteen map lists, wave lists and names: Zinc, Lead, Copper, Silver, Iron, Gold, Platinum, Tungsten, Iridon, Kallisto, Tri-alloy, Quadmium, Ergonite, Galactium, Uridium (`level_names_a` `$E070`, `level_names_b` `$EF55`); after the fifteenth the game goes back to the first, harder (`life_over`) |
| Meteor shields and communications aerials must be avoided (manual) | traced | flying into a wall character `$80`-`$8F` destroys the Manta (`manta_collide` `$27D5`); which drawn obstacles are the shields and aerials was not matched character by character |
| Fighters attack in waves; a bonus when every ship of a wave is destroyed, 100 per wave (manual) | live | `new_wave` `$1A98`, `wave_control` `$1A75` counts a formation only if every fighter was shot; paid at 100 each at the end (*live*: three formations, 300) |
| Homing mines materialise over flashing generator ports (manual) | confirmed | `spawn_mine` `$1F7F`, `mine_appear` `$1F62`, `mine_move` `$2021`; ports `$59`-`$5B` flash through `port_colours` (`draw_ports`) |
| Score table: small explodable surface feature 10, large 25, enemy ship on runway 100, enemy fighter 100-1000 (manual) | confirmed | `feature_score` `$3486`: single characters 10, 2 x 2 targets 25, 3 x 3 targets 100; fighters 100-1000 by wave type (`type_score`) |
| A bonus Manta every 10,000 points (manual) | live | `add_score` `$19F5`: 9,900 + 1,300 took the lives from 3 to 4 |
| "Land now" appears when the defences are cleared; land by flying flat left to right over the master runway at the right-hand end (manual) | live | "Land now!" when the level's wave list is used up (`landing_check` `$166D`); landed over the runway's end `$6F` facing right and level, not facing left |
| Fuel rod chamber after landing: fire at the right moment selects a bonus or "Quit"; it must be quit before the countdown at the top reaches zero (manual); first step worth 900 + 100 x level, each later step 100 x the time left (C64-Wiki) | live | `fuel_rod_chamber` `$114E`: the first offer was 1000 at level 1; each offer is the countdown plus the bonus so far, in hundreds; a countdown run out costs a life (`out_of_time`) |
| After take-off, the Dreadnought vapourises and its remaining surface can still be strafed (manual, C64-Wiki) | live | `vaporise_column` `$16D2` (`reference/dreadnought-vaporising.png`); fire works during the flight (`frame_autopilot` calls `fire_control`) |
| Two players take turns (C64-Wiki) | live | `next_turn` `$0BA1`; a two-player game in the recorded session, each with its own score, lives and level |
| A hall of fame of eight scores with initials (C64-Wiki screenshot) | confirmed | `hall_of_fame` `$35F0`, `enter_hiscore` `$17F8`, `enter_letter` `$191A`; the table shown live (`reference/hall-of-fame.png`); entering initials not reached live |
| Three-voice music by Steve Turner and sound effects (manual) | confirmed | `sound_frame` `$0E23`: one song (`song`), 46 effects (`effects`); the music plays on the title page |
| Fifty frames a second scrolling to single-pixel resolution (manual, "Technical Data") | live | the raster chain runs every frame; `scroll_step` and `irq_playfield` scroll by pixel; the play loop drops about one frame in twenty (382 passes in 400 frames) |
| Hardware and software sprites (manual, "Technical Data") | confirmed | hardware: the Manta, its shadow and six enemy slots; software: the shots, drawn into the character set (`draw_bullets`) |
| Attract mode: title page, a giant scrolling message, a demo flight with "Demo" in the status line | live | `title` `$0A20`: `title_page`, `message_page` (level 0, a map built of letters), the hall of fame, `demo` |

## Beyond the documentation

Found in the code, not in the manual.

- The giant scrolling message is a Dreadnought: level 0's map list is
  built from letter pieces (`build_message`), and the same scroll and
  map code shows it.
- The Manta's shadow is its own frame thickened into multicolour at every
  restart (`thicken_shapes`), placed lower and further right the higher
  the Manta flies.
- After "Land now!" the waves keep coming, but as filler waves whose
  fighters score nothing (`filler_wave`).
- The random numbers come from voice 3's noise, the sound chip's own
  generator, and the random table at `$0800` starts as a copy of the
  sound driver's code.
- No collision register is read: every collision is worked out from the
  map's characters and from boxes.
- The extra-life count stops at 99 lives.

## Open questions

- Which of the Dreadnoughts' characters the manual calls meteor shields
  and communications aerials: all walls `$80`-`$8F` are fatal, and the
  drawings were not matched to the names.
- Entering initials in the hall of fame was read in the code, not
  played to.
