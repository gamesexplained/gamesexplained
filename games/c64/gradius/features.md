# Gradius — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The game's own screens: the loading screen, the title, the power-up bar
  and the ending text, seen in VICE on 9 November 2026. The run did not
  look the game up online, so no manual or review is listed here.

## Features

| Feature | Status | Where |
|---|---|---|
| One to four players taking turns; SPACE on the title steps the count | live | `title_keys` $1881, `start` $1688; scores per player at $0200, lives at $0258 |
| Joystick in port 2, or the keyboard: Z, X, ; and / to move, RETURN to fire | traced | `read_keys` $4DED |
| Power-up bar: SPEEDUP, MISSILE, DOUBLE, LASER, MULTI and ?, lit one box further by each capsule | live | `bar_text` $41E6, `capsule_power` $5777 |
| Taking the lit power-up with right SHIFT (the joystick has no way to take it) | traced | `take_powerup` $5200, called only from `read_keys` at $4E35 |
| SPEEDUP up to four steps; MISSILE, and a second for faster missiles; DOUBLE or LASER, each replacing the other; MULTI, up to two Options; ? a shield worth four hits | traced | `take_powerup` $5200, `speed_up` $52E8 |
| Every seventh capsule is blue and destroys the enemies on screen | traced | `drop_capsule` $5630, `blue_capsule` $5D3D |
| Eight stages; when the scenery runs out the Big Core comes, with five walls to shoot away, and leaves if its timer runs out first | live | `boss_phase` $7768, `core_hits` $4667; screenshots of all eight stages in `reference/` |
| Checkpoints: a lost life past the stage's checkpoint restarts there | traced | `death_checkpoint` $FC90, `checkpoint_restart` $FF65 |
| An extra Vic Viper every 100,000 points | live | `extra_life` $6B8B |
| High score, starting at 10,000 | live | `high_score` $FE15, `check_high` $FE25 |
| The ending: "YOU HAVE SAVED THE PEOPLE OF NEMESIS", then play goes back to stage 1 | traced | `ending` $CE66 |
| Q gives up the game | traced | `quit_key` $6B02 |

## Beyond the documentation

Found in the code, not on any screen.

| Feature | Status | Where |
|---|---|---|
| A music driver with two tunes that never plays: the play frame calls a lone RTS where `JMP music_key` belongs, and nothing calls the routine that steps the tune | live | `jmp_music_key` $6AA6, `music_key` $6AB9, tunes from $1CA1 |
| A cheat switched off by one byte: four players and left SHIFT on the title, "C" on screen, no hits | live | `cheat_switch` $18D0, `cheat_key` $18D1, `cheat_mode` $6ED2 |
| A pause on P that nothing calls, left in a state that would not run | traced | $6B29 |
| Screen splits timed for an American (NTSC) machine: on a European (PAL) one the split wanders and the playfield is drawn in the power-up bar's mode | live | `start_split_timers` $FD50, `nmi_split` $0840 |
| Stage 4 is stage 1's map drawn from the bottom up with a flipped character set; stage 6 reuses stage 2's map | confirmed | `map_column_up` $54DF, `map_starts` $50B4 |
| The hatch scores 1000 points when it scrolls off the left edge, and nothing when it is destroyed | traced | `move_hatch` $64FD |
| Leftovers from the developer's disk: a BASIC stub, the file name OBJNEMMAIN3, scraps of assembler source | confirmed | `basic_stub` $0801, $9FD0, $B5C5, $BBDD |

## Open questions

- Whether the published game was meant to play music: the driver and its
  two tunes are complete, but two links to them are missing.
- What the developer's disk name "NEM" stands for in full: the file name
  reads OBJNEMMAIN3, and Nemesis is the game's name in Europe.
