# A Nightmare on Elm Street — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from, with the part it is in (resident,
street, or house). Unless marked *live*, a fact comes from reading the code
in the snapshots named in `orientation.md`.

## Build

- Two disk sides as G64 images, and three more copies of side 2 that differ
  only in the saved games on them (`SAVE.DAT`, `Dn.CUR`). Every file is
  listed and answered in `media.json`.
- Side 1: `FREDDY` (one block, loads over BASIC's vectors at `$02C5` and
  starts itself through `$0302`), `MAIN.OBJ`, the loader `DOS` (`$0C50`),
  the fast loader `WWDOS.O` (`$7BA8`), the sound effects `SOUND` (`$0400`),
  the panel's characters `ALTCH.CHA` (`$A000`), the sprite shapes `MON`
  (`$E800`), and the street part `INIT` (`$1390`). *live*: boots in VICE.
- Side 2: the house part `MAIN` (`$1390`), ten levels' maps `D1` to `DA`,
  objects and scripts `SC1.DAT` to `SCA.DAT`, art `ART1.ICN` to `ART5.ICN`,
  and the pictures `VENDING.SRT` and `HOUSE`, the death shapes `DEATH` and
  `DEAT1`, the ending texts `MSG`, the manual questions `COPY`, and `SONG`.
- No crack: no intro, no trainer, and the original loader in place.

## How the parts follow one another

| Step | Part | What happens |
|---|---|---|
| 1 | resident | `FREDDY` loads `MAIN.OBJ`, which loads the resident files and `INIT` |
| 2 | street | `street_start` (street `$1E0D`): title pictures and tune, `start_menu` (`$3894`) |
| 3 | street | `character_select` (`$225E`), `street_new_game` (`$378B`), the walk |
| 4 | street | `freddys_house_touch` (`$35D4`) then `street_to_house` (`$1EC1`) passes character, health, and sound switch at `$0C4F`, `$0C4E`, `$0C4C`, and loads `MAIN` |
| 5 | house | `init_party` (house `$1843`), `enter_level` (`$5814`), `main_loop` (`$1401`) |
| 6 | house | game over or a new game: `house_quit` (`$1429`) loads `INIT` again |

A saved game loaded from the first menu goes from step 2 to step 4 through
`load_saved_game` (street `$1E66`). *live*: loading side 2's `SAVE.DAT`
reaches level 2 as Nancy.

## Memory layout

| Thing | Where |
|---|---|
| Both parts' code | `$1390` up |
| Level map, 64 by 64 cells | `$B000` (`Dn`) |
| Level objects and scripts | `$8000` (`SCn.DAT`) |
| Level art: character set, then cell pictures at `+$800`, 18 bytes each | `$A000` (`ARTn.ICN`) |
| Screen | `$CC00`, video bank `$C000` |
| Play area's character set | `$D000`, RAM under the I/O |
| Sprite shapes | `$E800` (`MON`), the player's at `$C000` and `$E400` |
| Save buffer | `$9C00` (house `save_game` `$42EF`) |

## Timing

- The interrupt is the Kernal's CIA timer, latch `$4025` (a PAL machine's
  value): every 16,422 cycles. The game never writes `$DC04` or `$D01A`.
  Each part's handler steps the sound player first (house `$669A`).
- The main loop has no fixed rate: one pass per round of play (house
  `main_loop` `$1401`). Monsters and the clock step by fractions: 23 is
  taken from a fraction byte each pass (house `game_clock` `$1495`,
  `move_monsters` `$2590`).
- Freddy's attacks on the friends: every 240 wraps of the clock's
  fraction (house `freddy_attacks_friend` `$152B`).
- Level 10's clock: 120 wraps to an hour; at 12 the final fight starts
  (house `game_clock` `$1495`).

## Controls

- House keys at `action_keys` (house `$396A`): I O L . , M J U the eight
  directions clockwise from up; space, RETURN, and K use; D and Q drop; A and
  Z previous and next item; / ? and left arrow the save menu; HOME sound; E
  leaves the vending machine. Keys 1 to 7 and shifted 2 to 7 are handled
  first (house `read_action` `$392D`).
- Joystick in port 2 and the cursor keys are turned into the same keys
  (house `read_key` `$625D`).
- The street also knows F3, action 31, which fills the health (street
  `street_player_turn` `$267A`).

## Graphics

- The play area is characters: each map cell is 3 by 3 characters, its nine
  codes then nine colours at the art's `$800 + cell × 18` (house
  `draw_big_icon` `$1A45`). A colour with bit 3 set is multicolour.
- Floor colour `$D022` from `$7775`, indexed by the level type less 7:
  `[12, 13, 12, 12, 14, 1]` (house `enter_setup` `$583C`).
- Monster shapes: kind's first shape plus facing plus frame × the kind's
  step, the facing doubled for Freddy (house `monster_frame` `$1D4E`).
- The player is two sprites, a black outline and a multicolour fill.
- Death animations from `DEATH` (shapes 0 to 29), loaded to `$9080`, or
  `DEAT1` on level 10 (house `death_animation` `$47D3`, `death_frame_draw`
  `$480E`).

## Mechanics

- Characters: most health 70, 60, 50, 70, 50, most power 50, 60, 80, 50, 90,
  power cost 5, 5, 5, 30, 5 for Kincaid, Kristen, Will, Nancy, Taryn (house
  `health_tops` `$7363`, `power_tops` `$7359`, `power_costs` `$735E`).
- Joey's select place is skipped (street `select_loop` `$2286`).
- Freddy's house: one of nine places at random (street `$3882`, `$388B`).
- Friends: four, given one of ten hiding places at random (house
  `init_party` `$1843`; tables `$190E`, `$1918`, `$1922`). Freddy's
  attack takes 11 to 20 soul from a random friend not yet rescued or lost.
- Monster damage, chance to hit, speed, and weakness: house tables `$7422` to
  `$7489`. Weak damage 28, 50, 19, 19 for kinds 1 to 4 (`$7452`).
- Weapon damage `$45F0` (types 0 to 5) and shot damage `$45F6` (kinds 0 to
  13); special power damage `$45EB`.
- Chests: treasure when a roll below 100 is above five times the level
  (house `open_chest` `$519F`).
- Floors: damage 5, 0, 10, 2, 20, 10, 20 for groups 0 to 6 (`$74B0`), halved
  for groups 4 and 6 with the JUMP ROPE (house `hurt_floor` `$38F3`).
- Haunted items: 25 health every 16 passes, unless the CRUCIFIX is carried
  (house `haunted_items` `$1439`).
- Tunnels only on a level whose growth flag is set: level 1 from the table
  `$77AD`, others by script operation `$DE` (house `add_room` `$35AA`).
- Manual question on the way into level 4; a second wrong answer loops for
  ever at house `$5B65` (house `manual_question` `$5AF4`).
- Final fight: Freddy with 1,000 hit points, one or two rescued friends
  copying the player's shots (house `final_fight` `$60EC`).
- Saving: `save_level` (house `$4167`) writes the level's difference from
  its map file to `Dn.CUR`; `save_game` (`$42EF`) writes `SAVE.DAT`.

## Data tables

- Vending machine: items `$7A22`, prices in tens `$7A19`: BULLETS 20, PICK
  40, GRENADE 100, BATTERIES 30, KEY 50, CHAIN SAW 200, COFFEE 30, HYPNOCIL
  50, MAP 500.
- Level types `$776A`: 6, 7, 7, 8, 8, 9, 9, 8, 11, 11, 10 for levels 0 to 10.
- Messages: 50 at house `$39DF`; item `n`'s name is message `n - $30`.
- Level script operations `$FF` down to `$DA`, through house `$5B84`.

## Sound

- One tune, the title tune, at street `$13F9`, about 3,061 interrupts
  long. `SONG` on side 2 is the same tune built for `$B000`, played at the
  end (house `game_won` `$4604`).
- 36 sound effects in `SOUND` (resident `$0400`), started by street
  `start_effect` `$48DB` and stepped by `effect_tick` `$4993`. Effects 7
  and 16 to 19 loop.

## The listing's error rate

A sample of 60 comments across the three parts (seed 1611), checked by a
reader that wrote none of them, found 8 wrong: 13.3 %, with a 95 %
interval of 6.9 % to 24.2 %. All 8 were corrected, and the comments
around them reread. An audit of every comment is recommended before the
listing is relied on.

## Live tests

- Boot to the title, the menu, the character select, and the street
  (`work/play-street.vsf`).
- Loading side 2's save: level 2 as Nancy, beside a ladder
  (`work/play-house-ladder.vsf`).
- The maps on the Maps tab were drawn by running the house's own
  `shape_walls` (`$3F16`) on the kit's 6502 over each level's files.
- The tune and effects on the Music tab are the game's own player run on
  the kit's 6502.
