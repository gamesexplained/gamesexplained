# Paris: facts

File 2 of the copy studied. Every fact names the routine or table it
comes from, in this part's listing.

## Memory

| Range | What |
|---|---|
| `$0800`-`$0FFF` | not the game's: an earlier crack's BASIC line (`SYS 2067`, "MAGIC") and depacker, which ends by jumping to `$43B0`, and the tail of its packed data; the game reuses `$0D09`-`$0E36` as the 3D view's buffer |
| `$1000`-`$1FA2` | `play_speech` and three speech samples, at `$1090`, `$1225` and `$190A`, each opening with its length |
| `$2000`-`$2BFF` | sprites: the car in eight headings (`$80`-`$87`), the police car (`$88`-`$8F`), May Day's parachute (`$90`-`$97`), the steering-wheel halves (`$A0`-`$A3`), the bullet (`$AC`), a shot police car blinking (`$AD`, `$AE`) |
| `$3000`-`$37FF` | the character set of the cockpit and the text |
| `$3800`-`$3FFF` | the map's multicolour character set; `$3C00`-`$3FFF` repeats `$3800`-`$3BFF` |
| `$4000`-`$5FFF` | the code |
| `$5500`-`$577F` | the instruction page, 16 lines of 40 screen codes in the game's own alphabet |
| `$6000`-`$67FF`, `$7000`-`$741F` | the 3D view's column graphics |
| `$6800`-`$6FFF` | object templates (copied to the live table at `$6900`) and the 3D view's tables |
| `$7A40`-`$7BC7` | the theme tune's player |
| `$8000`-`$8008` | a cartridge header: cold start `$5A00`, warm start `$6015`, "CBM80" |
| `$8028`-`$81B7` | the telex shown on success, 10 lines of 40 |
| `$8334`-`$83FF` | start values for the variables `$0334`-`$03FF` |
| `$8B28`-`$92F7` | the cockpit picture: 1000 screen codes, then 1000 colours |
| `$92F8`-`$CFFF` | the town map, 124 rows of 126 cells |
| `$E000`-`$FFFF` | the tune's notes, in the RAM under the KERNAL (the same bytes as the mine's) |

## Starting and restarting

- `part_entry` (`$43B0`) points the BRK and NMI vectors at itself, so RESTORE
  brings back the instruction page, and shows it (`title_page`, `$4F30`).
  Up and down on the stick choose the sound: `$02E0` is 1 for the tune
  only, 2 for effects only, 3 for both (the start). Bit 0 turns on the
  music, bit 1 the effects and the locator's beep.
- Fire starts the game with `JMP $FCE2`, the KERNAL's own reset (`$4FBB`).
  The reset finds the cartridge signature "CBM80" at `$8004` and jumps
  through `$8000` to `game_start` (`$5A00`), as it would into a cartridge.
- The main loop (`main_loop`, `$5A30`) runs free of the raster: it updates
  the world every pass, speed and fire every 16th pass, steering every
  32nd. The interrupt (`game_irq`, `$5026`) splits the screen:

  | Line | What changes |
  |---|---|
  | `$8B`/`$8D` | the map's band: character set `$3800`, fine scroll |
  | `$9A` | the map's colours; collision interrupts on |
  | `$FB` | the cockpit: character set `$3000`; the per-frame work runs here |

## Driving

- Speed is a delay, `$0340`, from 1 (fastest) to `$3F`; the car moves two
  pixels every delay/4 + 1 frames (`car_move_tick`, `$5DA0`). Pulling
  back past the slowest speed changes gear: `$03A4` is 0 forward, 8 reverse
  (`$5B59`-`$5B8F`).
- Eight headings (`$03A0`, 0 up, then clockwise). Holding the stick to one
  side turns to the next straight heading and stops there (`$5AE0`;
  checked in the simulator: holding right from heading 0 gives 0, 1, 2, 2).
- Fire in reverse with a delay below `$15` is the handbrake turn, four
  steps anticlockwise (`$5B9B`); otherwise fire shoots one bullet along the
  heading (`fire_bullet`, `$4570`).
- A crash is the car (sprite 7) touching scenery, or a police car that
  has not been shot (`car_crash`, `$51A2`): the gear flips so the car
  bounces back, the delay grows by 3, damage by 1, and `$0346` locks the
  stick until the car next moves (`scroll_map` clears it at `$5CB2`). `$0346`
  also starts at 1 at every start (its template byte `$8346`).
- Damage (`$03A1`) runs from 0 to 39; at 40 the chase is lost (`add_damage`,
  `$49A0`).

## May Day

- She is object 0, sprite 3. She starts at (`$01FA`, `$01FA`) and circles
  outward until her radius reaches a limit, then heads for one of eight
  landing points, chosen with the SID's noise (`$4F00`, tables
  `$4FC0`-`$4FE7`, `mayday_update` at `$5200`).
- The altimeter starts at 900 (drawn in the cockpit picture) and drops by
  one every 20 of her steps (`altimeter_tick`, `$5315`). Below 060 a catch
  is possible (`$02E1`); at 000 the chase is lost (`$0313` = `$40`).
- A catch is the car touching her sprite while `$02E1` is set
  (`$5142`-`$514F`, `$0313` = `$80`).
- The locator beeps at an interval of (|dx| + |dy|) / 40 to her position
  (`mayday_distance`, `$4850`), flashing the lamp at colour RAM `$D803`
  (`locator_beep`, `$4A50`).

## Police and roadblocks

- Fourteen police cars (objects 1 to 14) share sprites 0 to 2, each moving
  one pixel every three to seven passes (`$6860`).
- On a junction cell (`$12`-`$19`) a police car takes its heading from the
  cell (`$4C9D`), and when the player's car leaves a junction the game
  writes the way it went into that cell (`$4E80`-`$4E95`). The police
  follow the player's route.
- Leaving any other cell raises a pursuit counter, `$03A2` (`$4EA0`); at 20
  a roadblock appears at one of 32 sites, chosen by the frame counter
  (`place_roadblock`, `$4900`), and the counter drops to 18. The police
  start moving once the counter is 1 or more. Driving into a roadblock
  clears it and adds 1 damage (`roadblock_check`, `$4940`).

## The screen

- The 3D view is 22 × 8 characters at rows 0-7, columns 9-30, built from 33
  map cells picked for the heading (`build_3d_view`, `$4600`, tables at
  `$6D00`) and copied to the screen in the interrupt (`copy_3d_view`,
  `$47FC`).
- The map window is 13 × 40 cells at rows 12-24 (`$5D52`).
- The clock starts at 10:18:00 (`$8390`) and counts one "second" every 60
  frames, 1.2 s on PAL (`update_clock`, `$4170`).

## Sound

- The theme tune has three voices, noise, sawtooth and pulse, read from
  under the KERNAL with `$01` = 0 (`$7B73`); its notes step every third and
  then every second frame (`music_tick`, `$7AAB`).
- `play_speech` (`$1000`) plays one bit at a time by switching the SID's
  volume between 0 and 15, with interrupts off.

## The endings

- Won: `mission_complete` (`$5800`) plays the speech at `$1225` and types
  the telex. Its line at `$8140` reads "CCPHJ.....STOP", after "YOUR CODE
  FOR CITY HALL IS.....": fixed text, the code City Hall checks. The part
  then loops at `$5879`.
- Lost: back to the instruction page, which plays the speech at `$190A`
  when the altimeter reached 000, and `$1090` then `$190A` when the damage
  was full (`speak_result`, `$4BA0`).
- There is no score, no pause and no keyboard control: only `$DC00` is
  read, and both CIAs' timer A is stopped, so the KERNAL never scans the
  keys.

## Open

- `$436F` reads an object's "reset from template" flag with the sprite
  number where the object's index was meant.
- `$4A50` compares a colour RAM read with `#$04` without masking its top
  four bits, which are undefined on a real C64.
- `$02FF` is tested (`$502E`, `$5DA0`) and never set.
- `patch_map` (`$4140`) rewrites two short stretches of the map at every
  start; why is not known.
