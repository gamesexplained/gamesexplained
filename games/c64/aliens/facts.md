# Aliens — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshots named in `orientation.md`: the
engine in `work/trainer-menu.vsf`, each stage in `parts/<id>/work/play.vsf`.

## Build

US Activision disk, cracked: a Remember cracktro and trainer (a 22 KB
BASIC file at `$0801`) holds the game's engine, and ten packed files
`A0`-`A9` hold the stages. See `orientation.md`. The trainer's patches
(`trainer_patch`, `$2C06`) are the cracker's, not Activision's.

## Memory layout

| Thing | Where |
|---|---|
| Engine: stage loop, text screens, music and effects, shared routines | `$0800`-`$3CFF`, `$C000`-`$C1FF` |
| Story and prompt text (PETSCII, printed into the bitmap) | `$13BE`-`$2210` |
| Workspace the engine clears for each stage | `$0200`-`$07FF` |
| A stage's code and data (one file each, `A2` added for stages 3 and 6) | from `$8000`, with pictures packed for `unpack_inline` (`$129D`) in `$8000`-`$BFFF` and `$E000`-`$FFFF` |
| Bitmap screen of most stages | screen `$5C00`, bitmap `$6000`, VIC-II bank 1 |
| Sprite shapes of a stage | from `$4000` |
| Hardware vectors in RAM | NMI `$0952`, IRQ `$0934`; `$01` = `$35` in play |

## Stages and files

`stage_files` (`$3B53`) gives each stage's file: stage 0 `A9`, 1 `A3`,
2 `A5`, 3 `A6`, 4 `A7`, 5 `A0`, 6 `A4`, 7 `A8`, 8 `A1`. `load_stage`
(`$2BC0`) also loads `A2` for stages 3 and 6 (the APC and the complex,
which share their room graphics), and for stages 0, 1 and 7 copies the
engine's sprites at `$C000`-`$C1FF` to `$4000`-`$41FF` (the gloves of
the equipment check among them).

| Stage | Part | What it is |
|---|---|---|
| 0 | `title` | the title screen and credits |
| 1 | `intro` | four pages of story, the briefing on the Sulaco, the equipment identification |
| 2 | `level1` | level 1, the drop-ship descent |
| 3 | `level2` | level 2, the APC rescue |
| 4 | `level3` | level 3, the operations room |
| 5 | `level4` | level 4, the air duct maze |
| 6 | `level5` | level 5, the Newt rescue |
| 7 | `level6` | the power loader's lift ride, a short scene |
| 8 | `queen` | level 6, the fight with the Queen, and the ending |

Each stage file starts at `$8000` with 20 little-endian words: start and
restart entry points, then 18 object-table addresses that
`link_object_tables` (`$0DC1`) copies into the engine's sprite-object
code. Only levels 2 and 5 use engine objects.

`main_new_game` (`$086E`) loads each stage, applies the trainer's
patches, shows the stage's briefing and status screen and jumps in
through `$8000`. A stage ends at `stage_complete` (`$089C`) with the
result in `$0203` (0 lost); the lift scene ends at `stage_skip`
(`$08D8`), so the Queen fight follows with no briefing.

## Codes and the marines

`$0204` holds the eight marines, one bit each. After a
stage the status screen prints a five-character code: the marines byte
XOR the stage's key from `code_keys` (`$1730`), with the stage. Typed at
the start (stage 0), `apply_code` undoes it and starts at that stage
with those marines. *Live:* the codes 2727H and 1506E were accepted.

## The title (stage 0)

The credits and the logo follow tune2. Command `$F4` in the tune calls
`count_marker` (`$2A54`), which adds one to `$057B`; `title_loop`
(`$8085`) looks up the credit (`credit_steps`, `$8295`) and the logo
step (`logo_steps`, `$82B9`) for each of the 30 markers. *Live:* one
cycle lasts about 57 seconds, and RETURN is ignored until the fifth
marker of the first cycle (`$825D`).

## The briefing and the equipment check (stage 1)

Four pages of text, then 14 speech balloons over a picture of the
marines (`scene_balloons`, `$88C5`), then the equipment identification
(`equip_loop`, `$8FD4`): for each of seven pieces the glove must be over
the piece's box in `equip_boxes` (`$90AD`) when fire is pressed. A wrong
piece prints IMPROPER IDENTIFICATION and asks for the same piece again;
there is no limit on tries (`equip_improper`, `$9088`).

## Level 1: the drop-ship

A script of 58 timed steps (`script_tick`, `$847C`; tables at `$8654`,
`$868E`, `$86C8`, `$8702`). Rings of the pipe come nearer in sprites 3-7.
The drop-ship crashes when the nearest ring's distance from the centre,
measured as twice the larger plus the smaller of the two offsets, is
`$50` or more (`deviation_check`, `$8363`).

## Level 2: the APC rescue

Four marines in a complex of 16 by 16 rooms (`room_map`); F1, F3, F5 and
F7 switch between them (`marine_switch`, `$899F`). Each marine's timer
sets off attacks: 16 aliens to kill (`marines_timers`, `$8A16`). The
level ends when every marine is dead, caught or in the APC room `$BE`,
held for 55 passes (`end_check`, `$80B4`).

## Level 3: the operations room

Five lanes with two aliens each; the flame thrower burns aliens within
36 pixels, and a touched alien is pushed back for less time with each
push (`lane_hit`, `$8721`). The level is won when the fuse reaches step
39 (`fuse_tick`, `$83F8`); an alien that gets past takes a marine, the
highest bit of `$0204` first (`grab_marine`, `$8522`).

## Level 4: the air duct maze

The maze map is 32 by 8 cells at `$9430`; direction bits are 1 down,
2 left, 4 up and 8 right. The exit is at x `$0740`, y `$BE`. A hand
grenade costs a marine (`marine_lose`, `$8EB8`), and an alien that holds
on for 90 passes takes one.

## Level 5: the Newt rescue

The rooms use level 2's map; the lift room is `$56`, Newt's room `$C1`,
the Queen's chamber `$C3`. The clock starts at 17:00 and loses a second
every three ticks of `$0209`, faster than real time. Explosions come at
16:43, 12:52, 8:25, 5:37 and 2:11, and the station blows at 0:00. Ripley
has 99 rounds and 8 flares (space bar). The range locator measures in
rooms of ten units, each unit nine pixels.

## Level 6: the Queen

The loader's x is `$0602`, its arms' heights `$0600` and `$0601`, its
claws `$0603`; the Queen's x and y are `$0604` and `$0605`. An arm that
meets her as it moves towards her strikes her: she slows (`$0497`,
`$0499`) and reels back (`strike`, `$8851`), then recovers over time
(`queen_recover`, `$889A`). She wins by reaching y `$74` at full speed
(`$0497` = `$27`). Fire grips her; holding fire opens the airlock, and
letting go with her over x `$30`-`$7F` drops her in (`grip_tick`,
`$846E`). The ending (`$88DA`) shows Bishop's picture, the hypersleep
text and "The End", unless a stage was skipped with the trainer's key
(`$0202`), when it goes straight to the wait for RETURN.

## Sound

The music player (`music_tick`, `$249E`) runs from CIA 1's timer A; the
sound effects (`effects_frame`, `$2B0F`) run once a frame. Two tunes are
stored in the engine: the briefing tune (`$28DF`), started by every text
screen (`$225F`), and tune2 (`$345A`), which the title and the ending
play. Level 1 has its own tune. The effects are 12-byte records started
by `start_effect` (`$2A79`) with a priority; `sfx_rumble` (`$3A74`) is
started by none of the stages.

## The listing's error rate

Sample of seed 2611: 80 comments drawn from 2,301 across the engine and
the stage parts as they stood on 10 November 2026, in two strata: 20
from the 350 comments a script wrote from templates (object-table words,
inline arguments, trainer pokes) and 60 from the 1,951 written by hand.
The checker ran on claude-opus-5-5. It found none of the 20 generated
comments wrong and 12 of the 60 written ones wrong in a detail: 15.0 %
of the 80 (95 % interval 8.8 % to 24.4 %), 17.0 % weighted by the
strata's sizes. The details were a branch to a routine missed, a value
off by one, a stage-result test misread as marines left, starter lists
missing a stage, a split line placed below the view rather than inside
it, units given as rows rather than position units, a printed character
read as a code, a partner table's address, a colour band's extent, a
table's index, and a turn at x `$10` that comes only below it. All 12
were corrected, with the other comments that said the same (two partner
addresses, `grab_marine`'s bit, the rounds text, every effect's list of
starters, and the briefing tune once called the title tune). The title
and the briefing stages were annotated after the draw. The rate is a
lower bound: a checker misses some.

## Live tests

- The title screen: `$057B` counted 0 to 29 over about 57 seconds and
  started again, and the credits appeared in the order of `credit_steps`
  (screenshots on 10 November 2026).
- The equipment check: a wrong piece printed IMPROPER IDENTIFICATION and
  the same piece was asked again.
