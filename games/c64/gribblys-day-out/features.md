# Gribbly's Day Out — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The cassette inlay, Hewson Consultants 1985: scans `Extras/Inlay.jpg` and
  `Extras/Inlay_back.jpg` in https://archive.org/details/uta_Gribblys_Day_Out_1985_Hewson_Consultants_206, read 9 October 2026. The manual; it outranks the rest.
- C64-Wiki, https://www.c64-wiki.com/wiki/Gribbly%27s_Day_Out, read 9 October 2026.
- Wikipedia, https://en.wikipedia.org/wiki/Gribbly%27s_Day_Out, read 9 October 2026.
- MobyGames' description, as quoted in the Internet Archive item
  `Gribblys_Day_Out_1985_Hewson`, read 9 October 2026.
- The game's own attract screens (Scenario and Controls).

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in port 2; left or right passes the intro screens, fire starts the game (inlay) | live | `read_joystick` `$6E9C`, `title_scenario` `$4407`, `title_controls` `$448E`; fire started every game in this run |
| On the ground: left/right bounces, up levitates, fire picks up or drops a Gribblet or blows bubbles (inlay) | confirmed | `gribbly_physics` `$68F5` with the bounce constants; `draw_view` `$6702` takes off on up; `gribblet_fire` `$6098`, `blow_bubble` `$6429` |
| In the air: any direction levitates that way; fire blows bubbles or switches the web controls (inlay) | confirmed | the flight constants `$7DDF`; `press_control` `$6B8B` looks in the three cells above Gribbly and his own |
| Gribbly materialises beneath the cave; Gribblets are put on a ledge in the cave with fire (inlay) | live | `level_start` `$4573` plays the materialisation; level 0 began with Gribbly under the cave (`reference/level1-play.png`); a Gribblet put down on cave-ledge tile `$37` is saved (`gribblet_fire`) |
| "The music will play if you have found a safe ledge" (inlay) | traced | saving a Gribblet requests effect `$94` (`gribblet_fire`); the title tune never plays in play, where the driver stays in effects mode (`sound` `$7554`) |
| Psi energy, shown as the Psi bar; a pulsating psi-grub boosts it (inlay, status panel) | confirmed | `psi_bar` `$5F02`; eating a psi-grub gives 3-6 (`bounce_tiles` `$61A5`); `animate_chars` `$6651` pulses it |
| Bank bar in the status panel | confirmed | `bank_bar` `$5F5A`; `transfer_stage` `$5FC1` moves energy between bank and psi to 40 before every level |
| At most eight Gribblets per screen; some can be carried off irretrievably (inlay) | live | all 16 levels built with 8 Gribblets in the table (`facts.md`, Live tests); one still inside a Flyer when the level restarts is lost (`reset_gribblets` `$629B`) |
| Saving the last but one Gribblet powers the psi web down, and Seon comes for the last one (inlay, Wikipedia) | differs | the power-down starts when 7 are saved, lost or inside a Flyer (`web_power_down` `$4E6D`); Seon then steers towards Gribbly, not the Gribblet (`seon_move` `$49AF`) |
| "New screens are selected partly in relation to your previous performance" (inlay); levels other than the first and last come in a random order (MobyGames) | confirmed | `level_result` `$64F3`: highest undone level at or below min(random 0-15, performance), else the first undone from 1; level 0 first, level 15 last. The port on the How it works page matches the routine run in a 6502 simulator in 674,325 cases (`test_level.js`) |
| 16 levels (C64-Wiki, MobyGames) | live | sixteen scene lists, web layouts and names (`$E010`-`$E07F`); all built live |
| The web is arranged in triangles; most hold three cross-shaped controls that switch a section on or off when Gribbly hovers over one and presses fire (inlay) | confirmed | `web_band_a` `$684D`, `web_tri_up` `$7C3F`: up to six control places per triangle, some removed by each level's layout (`web_block_a` `$6D64`); a control switches a slope or a base row |
| Bubbling near a control while levitating can put a web up in front of Gribbly (inlay) | confirmed | a fresh press of fire both blows a bubble and tries a control (`fire_button` `$6CA5`) |
| Life cycle: seed pods fall and become Topsies; Topsies flip Gribblets onto their backs; chrysalises hatch into Stompers; a Stomper that reaches a flipped Gribblet absorbs it and becomes a Flyer; a Flyer killed drops its Gribblet (Wikipedia, C64-Wiki) | confirmed | `seed_pod_move` `$5BF8`, `topsy_move` `$5213`, `chrysalis_move` `$538A`, `stomper_move` `$4C8B`, `flyer_drop` `$576F` |
| Bubbles kill seed pods, Topsies, chrysalises and Flyers, not Stompers; Stompers drown in water (Wikipedia) | differs | a bubble turns a Stomper round and kills a Topsy only from behind, turning it from the front; a bubbled Flyer becomes its falling Gribblet (`collide_table` `$1000`, `apply_collision` `$56A8`); a Stomper falls where there is no ground, through water to the map's bottom, and is removed (`stomper_move`) |
| A Gribblet falling from a Flyer must land on flat ground or be caught (Wikipedia, C64-Wiki) | confirmed | safe only on two cells of empty ledge or of the cave's ledge, lost on any other ground or off the map (`fall_gribblet_move` `$4F04`); caught in `sprite_collisions` `$5604` |
| Scoring: seed pod 20, Topsy 40, chrysalis 60, Stomper nothing, winged creature 100, pick up a Gribblet 20, drop one −20, place one in the cave 100, catch a falling one 100, switch web off −10, on +10, collision in flight −5 each, collision with Seon −10 each, bubbling Seon nothing, excess energy bonus points (inlay) | confirmed | every value as the inlay says (`facts.md`, Mechanics); also −100 for a Gribblet that falls off the map, and the excess energy is psi above 64, times 8 (`add_psi` `$604D`) |
| Best score table: letters chosen with up/down and fire, END finishes (inlay) | confirmed | `check_best_score` `$5470`; left and right step the letters too |
| Real-time clock: f1 set, f2 start; after f1, f3/f4 hours, f5/f6 minutes, f7/f8 50 Hz or 60 Hz mains (inlay); the Controls screen says "f1: set and start" | live | `clock_keys` `$70A7`: f1 both sets and starts, as the Controls screen says |
| Game clock, shown as Gametime in tenths of a second (status panel) | live | CIA 2's time-of-day clock from 1:00:00.0 (`new_game` `$4504`, `show_gametime` `$726A`); the pause stops it |
| f5/f6 music volume, f7/f8 colour or black-and-white video; some adjustments only while the theme tune plays (inlay) | live | `volume_keys` `$59D5`, `colour_keys` `$59AF`, on the title pages only; the volume reaches the tune alone, as effects set `$D418` to full volume |
| Pause on RUN/STOP; while paused f7 freezes the animation, f8 returns to pause, CLEAR/HOME abandons the game, f1 resets the clock, RUN/STOP or fire restarts (inlay) | live | `pause` `$72E5`, `freeze_keys` `$73C9`; RUN/STOP and CLR/HOME tested live |
| Smooth multi-directional, multi-speed scrolling (inlay) | confirmed | `scroll_x` `$65D8`, `scroll_y` `$6605`, fine scroll in `irq_top` `$745A` |
| Interrupts synchronised to mix hi-res and character screens (inlay) | confirmed | a multicolour character screen above a hi-res character screen, with a blank line between made by an invalid mode (`irq_blank` `$7424`); no bitmap |
| Action-linked three-voice sound effects (inlay) | differs | effects play on voices 1 and 2; voice 3 is the noise source for random numbers (`effects_step` `$75F2`) |
| Full facial animation (inlay) | confirmed | `animate_face` `$6AAD`, `eyes` `$6B36`: head patterns, blinks, looks, smiles and frowns drawn into the sprite shapes |
| Hardware and software sprites, integrated (inlay) | confirmed | Gribblets sit in the map as tiles and become hardware sprites only while they hop, fall or ride a Flyer (`gribblet_hop` `$62E5`, `hop_gribblet_move` `$58F2`) |
| A best score of 6809 on the Controls screen, credited "© ST Software 1985" (attract screen) | live | `start_game` `$42C0` sets the best score to 6809; `best_line` `$7FCC`; `reference/title-controls.png` |
| "Psi~energy Transfer Stage", "Hide the Gribblets in the Cave" and "Eight Gribblets to rescue" before level 0 | live | the first is printed before every level (`transfer_stage`), the second is level 0's name (`level_names` `$E060`), the third comes from `level_start`; `reference/level1-intro.png` |
| A one-word message field in the status panel ("Scenario", "Controls", "Game On!", "Bounce") | live | `status_words` `$7B22`; "Bounce" and "Flight" as Gribbly lands and takes off (`draw_view`) |

## Beyond the documentation

Found in the code, not in the manual.

- A hidden memory editor, `$4000`-`$42BF`: `monitor_init` sets it up at
  start-up, but nothing calls `monitor_step` `$4011`. It would show
  "( ABMON : address ~ byte )" in the panel and edit memory with A, D, J,
  M, comma and full stop. ABMON most likely stands for the author's
  monitor, Andrew Braybrook's development tool left in the game (Aaron
  Bell's reading of the name; nothing in the code says so).
- Level 4, "Wot, no ground?", has a Mr Chad drawn at each end of its
  name, the wartime doodle whose caption that is.
- RESTORE does nothing: the NMI vector points at a bare `RTI` (`$7412`).
- In the pause, f7 freezes the screen and prints "Cheese" (`freeze_keys`).
- A best-score signature overwrites "(c) ST Software 1985." on the
  Controls page until the machine is switched off (`check_best_score`).
- A Gribblet falling off the map costs 100 points (`fall_gribblet_move`).
- A web line switched off vanishes: its characters + `$80` are blank, so
  nothing collides with it (`web_diag_left` `$6C5B`).
- Seon can switch the web too, with a chance of performance in 32 for
  each step he spends on a control (`seon_web` `$4B10`), and waits
  (28 - level) x 512 frames before he moves at all (`level_start`).
- Saving exactly six Gribblets every time plays the levels in order, 0
  to 15 (`level_result`).
- The title tune's note table is tuned for an NTSC clock, so a PAL
  machine plays it about 65 cents flat (`note_freqs` `$FD00`).
- A Topsy bubbled from the front turns round, but the second copy of
  the test compares `$05` where the first compares `$06`, so a
  right-walking Topsy holding the lower sprite number of the pair is
  killed whichever side the bubble comes from (`apply_collision`).
- Holding a key on the datasette runs its motor, on the title and in
  play (`tape_motor` `$73AD`).
- A string "Level ??" at `$0DD8` is never printed, and 896 bytes of
  another program's code sit unused at `$1C80` (`stray_code`).
