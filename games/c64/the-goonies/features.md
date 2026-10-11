# The Goonies — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "The Goonies", https://www.c64-wiki.com/wiki/The_Goonies,
  read 7 October 2026: credits, controls, scoring, the eight scenes and
  their solutions, the differences it lists between the Datasoft and the
  US Gold releases, and review scores.
- The game's own screens: the title, the score line, the messages at
  `$84C0`.

The wiki describes more than one release. Where it says "the standard
game" or "the original", it means the Datasoft release, which is the build
analysed here (`orientation.md`); several of its US Gold notes turn out to
be true of this build too.

## Features

| Feature | Status | Where |
|---|---|---|
| Two Goonies on screen; fire swaps which one the stick moves (one player) | confirmed | `goonie_waiting` `$0B62` swaps the two types |
| Joystick: left and right walk, down climbs down, up jumps or climbs, up-left and up-right jump diagonally | confirmed | `goonie_active` `$0AF9` copies up onto the fire bit; `move_object` `$0CFD` |
| Title: F1 back to the title, F3 one or two players, F7 or fire starts | confirmed | `handle_keys` `$1634` |
| In game: space pauses, S music on and off, F1 quits to the title, F7 restarts at scene 1 | confirmed | `handle_keys` `$1634`; `new_game` `$0868` |
| Two players take turns | differs | there are no turns: F3 sets two players at once, the second Goonie on the joystick in port 2 (`$08D0`, `read_stick` `$172B`). The wiki gives this mode to the US Gold release only |
| Eight single-screen scenes; in scenes 1 to 7 both Goonies must reach the exit | confirmed | each scene's exit routine tests both Goonies (`s1_exit` `$8013` and the rest) |
| Scene 8: both Goonies reach the treasure | confirmed | `s8_exit` `$9DBE`, at the top of the ship by the chest |
| 1,000 points per scene solved | confirmed | every exit adds 1 to the thousands digit |
| 5,000 points for each Goonie left at the end | differs | 5,000 for each life left and one more (`ending_start` `$A4E1`); live: the ending entered with 5 lives shows 30000 (`reference/ending.png`) |
| Points for tasks within a scene | confirmed | `facts.md`, "Scoring" |
| Scene 4 gives three extra Goonies | confirmed | `s4_exit` `$181B`, at most nine |
| Starts with 8 lives (the wiki's standard game; 5 in US Gold) | differs | this build starts with 5 (`new_game` `$0868`); live: LIVES 5 on every scene snapshot |
| US Gold: F7 skips ahead a scene per press | differs | here F7 always starts at scene 1: `$12BC`, the scene `new_game` starts at, is written only at the cold start (`$0846`, to 0), the one writer `opcodes.py --refs $12BC` finds (the indexed stores that could reach it keep their indexes to 0-5) |
| US Gold: the life counter is not capped | differs | here the only award, scene 4's, stops at nine (`s4_exit`) |
| Scene 1: the money press distracts Mama Fratelli; tipping the water tank puts out the fire and opens the tunnel | confirmed | `s1_press` `$7D41`, `fratelli_s1` `$7B09`, `s1_tank` `$7E6C`, `s1_fire` `$7CF3` |
| Scene 1: push the armchair under the attic ladder | confirmed | the crate the Goonies push along the top floor, `s1_crate` `$7C05` |
| Scene 2: take the key, ride the float across the lake, exit lower left | confirmed | `s2_key` `$774E`, `s2_float` `$76A4`, `s2_exit` `$763F` |
| Scene 2: rocks, pots and bats | confirmed | the weights that drop onto the top ledge (`s2_frame` `$7313`), their drips (`s2_drip_hit`), and the flier (`s2_spawn_flier` `$869A`) |
| Scene 3: close two vents to burst the pipe; shots and acid drops | confirmed | `s3_vents` `$8E53`, `gunman_type7` `$8AEA`, `s3_acid` `$8CBD` |
| Scene 4: open the floors so rolling rocks reach the lever; three planks; the bell releases bats | confirmed | `s4_frame` `$17A3`, `s4_rock_steer` `$1A41`, `s4_planks` `$1948`, `s4_bell` `$18E9` |
| Scene 5: pile five eggs; the bird drops them; bones open and shut the lava bridges; trampoline | confirmed | `s5_egg_pile` `$E08A`, `bird_type9` `$8845`, `s5_bones` `$E0B7`; the trampoline is not a routine of its own: it is in the scene's rectangles |
| Scene 6: dissolving red platforms, levers that open doors | confirmed | `s6_pads` `$F16E` and `s6_platforms` `$F413` (the pads choose which platforms are solid), `s6_door` `$F32B` |
| Scene 7: the flipper drains the pond and pulls the octopus down; the box under the flipper | confirmed | `s7_flipper` `$96EE`, `s7_octopus` `$962A`, `s7_crate_rect` `$97D6`, `crate_type13` `$9823` |
| Scene 8: porthole levers, ropes, the lift; Mama Fratelli leaves her post for the coins | confirmed | `s8_portholes` `$A0B6`, `s8_lift` `$A049`, `s8_chest` `$9F0B`, `mama_type14` `$9E62` |
| Scene 8: the tasks are fixed to one Goonie each | open | no routine tests which Goonie does what: the levers, the lift and the chest accept either. In scene 8 the second Goonie is a different, taller figure (shapes 49-56, `s8_start` `$9D63`); whether the fixed roles come from that, through the scene's rectangles, has not been checked |
| Music: a conversion of "The Goonies 'R' Good Enough" | open | the four tunes are in memory (`$C02E`); which is the song has not been established by ear or by note |

## Beyond the documentation

- **Keys the wiki does not list**: V prints the version line "V 1 BY
  SES"; L turns player 1's joystick a quarter turn and shift L player 2's,
  marked 1L or 2L on the status line (`handle_keys` `$1634`, `read_stick`
  `$172B`).
- **Two checks on the loader.** At the hand-over a check compares eleven
  bytes sixteen times and crashes if they ever agree (`game_start`
  `$0800`). Then, every pass, the active Goonie's routine reads the CPU
  port's direction register and wrecks the game unless it holds `$EF`, the
  value the copy-protected loader leaves there (`goonie_active`, `$0B2D`).
  Live: with `$00` set to `$2F` the screen was corrupted within four
  passes.
- **RESTORE does nothing**: the NMI vector points at an `RTI` (`setup_scene`
  `$1098`).
- **The attract mode replays recorded stick input**, 31 steps per scene,
  with a fixed random table so each demonstration plays out the same way
  (`demo_read` `$F7DF`, `make_random_table` `$880D`).
- **Leftovers**: a stretch of the developers' assembler source
  (`dev_source`, `$F84D`), unused routines (`unused_handler` `$0BF5`,
  `unused_near_goonie` `$0C04`), and 166 bytes nothing reaches
  (`unused_7F63`).

## Open questions

- The tasks the wiki assigns to a particular Goonie in scene 8 (above).
- Which tune is the film's song.
- Why the start-up check at `$0800` compares `$CF79` with `$CF99`: in an
  untouched load they differ, and nothing else reads either.
